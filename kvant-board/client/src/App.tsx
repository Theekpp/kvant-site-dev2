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

  // Request initial scene from any peer once API ready
  useEffect(() => {
    if (!api || !socketRef.current) return;
    socketRef.current.emit("request-scene", { roomId });
    const handler = ({ requesterId }: { requesterId: string }) => {
      const elements = api.getSceneElementsIncludingDeleted();
      socketRef.current?.emit("scene-snapshot", {
        toId: requesterId,
        elements,
      });
    };
    socketRef.current.on("scene-request", handler);
    socketRef.current.on(
      "scene-snapshot",
      (payload: { elements: ExcalidrawElement[] }) => {
        const remote = payload.elements || [];
        const local = api.getSceneElementsIncludingDeleted();
        const reconciled = reconcileElements(
          local,
          remote as any,
          api.getAppState(),
        );
        api.updateScene({ elements: reconciled });
      },
    );
    return () => {
      socketRef.current?.off("scene-request", handler);
    };
  }, [api, roomId]);

  const handleChange = (elements: readonly ExcalidrawElement[]) => {
    if (!socketRef.current) return;
    if (readOnly) return;
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
