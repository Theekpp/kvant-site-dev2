import { useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  Collaborator,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { reconcileElements } from "@excalidraw/excalidraw";
import { io, Socket } from "socket.io-client";

function getRoomFromUrl(): string {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("room");
  if (fromQuery) return fromQuery;
  // Fallback: last path segment after /board/
  const m = url.pathname.match(/\/board\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  return "default";
}

function getUsernameFromUrl(): string {
  const url = new URL(window.location.href);
  return url.searchParams.get("name") || "Гость";
}

function getReadOnlyFromUrl(): boolean {
  const url = new URL(window.location.href);
  return url.searchParams.get("readonly") === "1";
}

function randomColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

const SCENE_UPDATE_DEBOUNCE_MS = 80;
const POINTER_UPDATE_THROTTLE_MS = 33;

export default function App() {
  const roomId = useMemo(() => getRoomFromUrl(), []);
  const username = useMemo(() => getUsernameFromUrl(), []);
  const readOnly = useMemo(() => getReadOnlyFromUrl(), []);
  const myId = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(
    new Map(),
  );

  const socketRef = useRef<Socket | null>(null);
  const lastSentSceneVersionRef = useRef<string>("");
  const sceneSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerSentRef = useRef<number>(0);
  // Becomes true once the server has sent us the persisted scene for this
  // room (or confirmed the room is empty). Until then we MUST NOT broadcast
  // our own (empty) scene, otherwise a refresh would wipe everyone else.
  const initialSceneLoadedRef = useRef<boolean>(false);

  // Connect socket
  useEffect(() => {
    const socket = io({
      path: "/board-ws",
      transports: ["websocket", "polling"],
      query: { room: roomId, name: username, id: myId },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { roomId, name: username, id: myId });
    });

    socket.on(
      "scene-init",
      (payload: { elements: ExcalidrawElement[] }) => {
        const remote = payload.elements || [];
        if (api) {
          const local = api.getSceneElementsIncludingDeleted();
          const reconciled = reconcileElements(
            local,
            remote as any,
            api.getAppState(),
          );
          api.updateScene({ elements: reconciled });
        }
        // Seed the version signature so we don't immediately re-broadcast
        // the same scene we just received from the server.
        const version = `${remote.length}-${remote.reduce(
          (acc: number, el: any) => acc + (el?.version || 0),
          0,
        )}`;
        lastSentSceneVersionRef.current = version;
        initialSceneLoadedRef.current = true;
      },
    );

    socket.on("scene-update", (payload: { elements: ExcalidrawElement[] }) => {
      if (!api) return;
      const remote = payload.elements || [];
      const local = api.getSceneElementsIncludingDeleted();
      const reconciled = reconcileElements(
        local,
        remote as any,
        api.getAppState(),
      );
      api.updateScene({ elements: reconciled });
    });

    socket.on(
      "pointer-update",
      (payload: {
        id: string;
        name: string;
        x: number;
        y: number;
        button?: "down" | "up";
      }) => {
        setCollaborators((prev) => {
          const next = new Map(prev);
          next.set(payload.id, {
            username: payload.name,
            color: { background: randomColor(payload.id), stroke: "#000" },
            pointer: { x: payload.x, y: payload.y, tool: "pointer" },
            button: payload.button || "up",
          } as Collaborator);
          return next;
        });
      },
    );

    socket.on("user-left", ({ id }: { id: string }) => {
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [api, roomId, username, myId]);

  // Push current collaborators map to Excalidraw
  useEffect(() => {
    if (!api) return;
    api.updateScene({ collaborators });
  }, [api, collaborators]);

  // Initial scene is now sent by the server via "scene-init" right after
  // join-room, so no per-peer snapshot dance is needed.

  const handleChange = (elements: readonly ExcalidrawElement[]) => {
    if (!socketRef.current) return;
    if (readOnly) return;
    // Don't broadcast anything until the server has hydrated us with the
    // persisted scene. Otherwise a brand-new (empty) client would race the
    // server's scene-init and wipe the room for everyone else.
    if (!initialSceneLoadedRef.current) return;
    // Compute lightweight version signature to dedupe
    const version = `${elements.length}-${elements.reduce(
      (acc, el) => acc + (el as any).version,
      0,
    )}`;
    if (version === lastSentSceneVersionRef.current) return;
    lastSentSceneVersionRef.current = version;

    if (sceneSendTimerRef.current) clearTimeout(sceneSendTimerRef.current);
    sceneSendTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("scene-update", {
        roomId,
        elements,
      });
    }, SCENE_UPDATE_DEBOUNCE_MS);
  };

  const handlePointerUpdate = (payload: {
    pointer: { x: number; y: number };
    button: "down" | "up";
  }) => {
    if (!socketRef.current) return;
    if (readOnly) return;
    const now = Date.now();
    if (now - lastPointerSentRef.current < POINTER_UPDATE_THROTTLE_MS) return;
    lastPointerSentRef.current = now;
    socketRef.current.emit("pointer-update", {
      roomId,
      id: myId,
      name: username,
      x: payload.pointer.x,
      y: payload.pointer.y,
      button: payload.button,
    });
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw
        excalidrawAPI={(a) => setApi(a)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        viewModeEnabled={readOnly}
        langCode="ru-RU"
        initialData={{
          appState: {
            gridModeEnabled: true,
            gridSize: 20,
          },
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
          },
        }}
        name={`Доска ${roomId}`}
      />
    </div>
  );
}
