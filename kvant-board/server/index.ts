import express from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import path from "path";
import fs from "fs";

const PORT = parseInt(process.env.PORT || "8082", 10);
const HOST = "0.0.0.0";
const isDev = process.env.NODE_ENV !== "production";

function log(msg: string, source = "board") {
  const t = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${t} [${source}] ${msg}`);
}

async function main() {
  const app = express();
  const httpServer = createServer(app);

  // Health check
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "kvant-board" });
  });

  // Socket.IO collaboration server
  const io = new IOServer(httpServer, {
    path: "/board-ws",
    cors: {
      origin: true,
      credentials: true,
    },
    maxHttpBufferSize: 8 * 1024 * 1024, // 8 MB for big scenes
  });

  type ClientInfo = { id: string; name: string };
  const roomMembers = new Map<string, Map<string /* socketId */, ClientInfo>>();

  // ---------- Persistent per-room scene storage ----------
  // Each room's latest scene is kept in memory and mirrored to disk
  // so that a page refresh (or even a server restart) does not wipe
  // the whiteboard.
  const dataDir = path.resolve(import.meta.dirname, "..", "data", "rooms");
  fs.mkdirSync(dataDir, { recursive: true });

  const roomScenes = new Map<string, unknown[]>();
  const safeRoomId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const sceneFileFor = (id: string) =>
    path.join(dataDir, `${safeRoomId(id)}.json`);

  // Load existing rooms from disk on startup
  try {
    for (const f of fs.readdirSync(dataDir)) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = fs.readFileSync(path.join(dataDir, f), "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.elements)) {
          const id = f.replace(/\.json$/, "");
          roomScenes.set(id, parsed.elements);
        }
      } catch (err) {
        log(`failed to load scene ${f}: ${(err as Error).message}`);
      }
    }
    log(`loaded ${roomScenes.size} persisted room scene(s)`);
  } catch (err) {
    log(`scene load skipped: ${(err as Error).message}`);
  }

  // Debounced disk writer to avoid hammering FS on every tiny edit.
  const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const SCENE_PERSIST_DEBOUNCE_MS = 750;
  function persistRoom(roomId: string) {
    const existing = writeTimers.get(roomId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      const elements = roomScenes.get(roomId);
      if (!elements) return;
      try {
        fs.writeFileSync(
          sceneFileFor(roomId),
          JSON.stringify({ elements, savedAt: Date.now() }),
          "utf-8",
        );
      } catch (err) {
        log(`persist room ${roomId} failed: ${(err as Error).message}`);
      }
    }, SCENE_PERSIST_DEBOUNCE_MS);
    writeTimers.set(roomId, timer);
  }

  io.on("connection", (socket) => {
    let joinedRoom: string | null = null;
    let myInfo: ClientInfo | null = null;

    socket.on(
      "join-room",
      ({ roomId, name, id }: { roomId: string; name?: string; id?: string }) => {
        if (!roomId || typeof roomId !== "string") return;
        if (joinedRoom) socket.leave(joinedRoom);
        joinedRoom = roomId;
        myInfo = {
          id: id || socket.id,
          name: name || "Гость",
        };
        socket.join(roomId);

        if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Map());
        roomMembers.get(roomId)!.set(socket.id, myInfo);

        // Send the persisted scene to the freshly joined client so a page
        // refresh (or first-ever join) restores the whiteboard immediately.
        const stored = roomScenes.get(roomId);
        socket.emit("scene-init", { elements: stored ?? [] });

        log(
          `socket ${socket.id} joined room ${roomId} as ${myInfo.name} (${roomMembers.get(roomId)!.size} in room, ${stored?.length ?? 0} stored elements)`,
        );
      },
    );

    socket.on(
      "scene-update",
      (payload: { roomId: string; elements: unknown[] }) => {
        if (!payload?.roomId || joinedRoom !== payload.roomId) return;
        if (!Array.isArray(payload.elements)) return;
        // Persist the latest scene so refreshes / restarts don't wipe it.
        roomScenes.set(payload.roomId, payload.elements);
        persistRoom(payload.roomId);
        socket.to(payload.roomId).emit("scene-update", {
          elements: payload.elements,
        });
      },
    );

    socket.on(
      "pointer-update",
      (payload: {
        roomId: string;
        id: string;
        name: string;
        x: number;
        y: number;
        button?: "down" | "up";
      }) => {
        if (!payload?.roomId || joinedRoom !== payload.roomId) return;
        socket.to(payload.roomId).emit("pointer-update", payload);
      },
    );

    socket.on("request-scene", ({ roomId }: { roomId: string }) => {
      if (!roomId || joinedRoom !== roomId) return;
      // Ask another client in the room to send a snapshot
      const members = roomMembers.get(roomId);
      if (!members) return;
      for (const [sid] of members) {
        if (sid !== socket.id) {
          io.to(sid).emit("scene-request", { requesterId: socket.id });
          return;
        }
      }
    });

    socket.on(
      "scene-snapshot",
      ({ toId, elements }: { toId: string; elements: unknown[] }) => {
        if (!toId) return;
        io.to(toId).emit("scene-snapshot", { elements });
      },
    );

    socket.on("disconnect", () => {
      if (joinedRoom && myInfo) {
        const members = roomMembers.get(joinedRoom);
        if (members) {
          members.delete(socket.id);
          if (members.size === 0) roomMembers.delete(joinedRoom);
        }
        socket.to(joinedRoom).emit("user-left", { id: myInfo.id });
      }
    });
  });

  if (isDev) {
    // Vite middleware in dev
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
      configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    });
    app.use(vite.middlewares);
    log("vite middleware mounted (dev)");
  } else {
    // Production: serve static build
    const distDir = path.resolve(import.meta.dirname, "..", "dist", "public");
    if (!fs.existsSync(distDir)) {
      throw new Error(
        `Build directory not found: ${distDir}. Run "pnpm build" first.`,
      );
    }
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
    log("serving static build");
  }

  httpServer.listen(PORT, HOST, () => {
    log(`listening on http://${HOST}:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
