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

        log(
          `socket ${socket.id} joined room ${roomId} as ${myInfo.name} (${roomMembers.get(roomId)!.size} in room)`,
        );
      },
    );

    socket.on(
      "scene-update",
      (payload: { roomId: string; elements: unknown[] }) => {
        if (!payload?.roomId || joinedRoom !== payload.roomId) return;
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
