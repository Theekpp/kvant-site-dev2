import { useState, useEffect, useRef } from "react";
import { botLink, BOT_URL } from "@/lib/bot";

function AtomIcon({ animated = false }: { animated?: boolean }) {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 8px 28px rgba(99,102,241,0.3))" }}>
      <style>{`
        @keyframes orbit1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit2 { from { transform: rotate(120deg); } to { transform: rotate(480deg); } }
        @keyframes orbit3 { from { transform: rotate(240deg); } to { transform: rotate(600deg); } }
      `}</style>
      <circle cx="65" cy="65" r="12" fill="#6366f1" />
      <circle cx="65" cy="65" r="8" fill="#818cf8" />
      <circle cx="61" cy="61" r="3" fill="white" opacity="0.5" />
      <ellipse cx="65" cy="65" rx="44" ry="16" stroke="#6366f1" strokeWidth="2" fill="none" opacity="0.4" />
      <ellipse cx="65" cy="65" rx="44" ry="16" stroke="#818cf8" strokeWidth="2" fill="none" opacity="0.4" transform="rotate(60 65 65)" />
      <ellipse cx="65" cy="65" rx="44" ry="16" stroke="#a5b4fc" strokeWidth="2" fill="none" opacity="0.4" transform="rotate(120 65 65)" />
      <g style={animated ? { transformOrigin: "65px 65px", animation: "orbit1 3s linear infinite" } : {}}>
        <circle cx="109" cy="65" r="5" fill="#f59e0b" /><circle cx="107" cy="63" r="2" fill="white" opacity="0.6" />
      </g>
      <g style={animated ? { transformOrigin: "65px 65px", animation: "orbit2 3s linear infinite" } : {}}>
        <circle cx="109" cy="65" r="5" fill="#34d399" /><circle cx="107" cy="63" r="2" fill="white" opacity="0.6" />
      </g>
      <g style={animated ? { transformOrigin: "65px 65px", animation: "orbit3 3s linear infinite" } : {}}>
        <circle cx="109" cy="65" r="5" fill="#f472b6" /><circle cx="107" cy="63" r="2" fill="white" opacity="0.6" />
      </g>
      <text x="65" y="118" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6366f1" fontFamily="monospace" opacity="0.8">E = hν</text>
    </svg>
  );
}

function TrajectoryIcon({ animated = false }: { animated?: boolean }) {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 8px 28px rgba(16,185,129,0.3))" }}>
      <style>{`
        @keyframes dash-grow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
        @keyframes arrow-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
      <path d="M18 100 L112 100" stroke="#d1fae5" strokeWidth="2" strokeLinecap="round" />
      <path d="M108 96 L114 100 L108 104" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 100 L18 22" stroke="#d1fae5" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 26 L18 20 L22 26" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {[40,60,80].map(y=><path key={y} d={`M22 ${y} L110 ${y}`} stroke="#d1fae5" strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>)}
      {[40,65,90].map(x=><path key={x} d={`M${x} 20 L${x} 96`} stroke="#d1fae5" strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>)}
      <path d="M22 98 Q45 22 90 46" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="200"
        style={animated ? { animation: "dash-grow 2s ease-out infinite" } : {}} />
      <circle cx="22" cy="98" r="4" fill="#10b981" />
      <circle cx="40" cy="54" r="3" fill="#6ee7b7" opacity="0.7" />
      <circle cx="60" cy="34" r="3" fill="#6ee7b7" opacity="0.7" />
      <g style={animated ? { animation: "arrow-bounce 2s ease-in-out infinite" } : {}}>
        <circle cx="90" cy="46" r="9" fill="#f59e0b" /><circle cx="87" cy="43" r="3.5" fill="white" opacity="0.5" />
        <path d="M100 40 L108 36" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M100 46 L110 44" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M100 52 L107 52" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </g>
      <text x="116" y="104" fontSize="10" fontWeight="bold" fill="#10b981" fontFamily="monospace">x</text>
      <text x="12" y="18" fontSize="10" fontWeight="bold" fill="#10b981" fontFamily="monospace">y</text>
      <text x="30" y="115" fontSize="9" fontWeight="bold" fill="#059669" fontFamily="monospace" opacity="0.8">y=v₀t−gt²/2</text>
    </svg>
  );
}

function RocketIcon({ animated = false }: { animated?: boolean }) {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 8px 28px rgba(239,68,68,0.25))" }}>
      <style>{`
        @keyframes flame { 0%,100%{transform:scaleY(1) scaleX(1)} 33%{transform:scaleY(1.15) scaleX(0.92)} 66%{transform:scaleY(0.9) scaleX(1.08)} }
        @keyframes rocket-lift { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes star-twinkle { 0%,100%{opacity:0.9} 50%{opacity:0.3} }
      `}</style>
      {[[20,22],[105,18],[15,55],[112,60],[25,85],[108,88]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2.5" fill="#fde68a"
          style={animated ? { animation: `star-twinkle ${1.5+i*0.3}s ease-in-out infinite ${i*0.2}s` } : {}} />
      ))}
      <g style={animated ? { transformOrigin:"65px 65px", animation:"rocket-lift 2s ease-in-out infinite" } : {}}>
        <g style={animated ? { transformOrigin:"65px 90px", animation:"flame 0.3s ease-in-out infinite" } : {}}>
          <path d="M55 90 Q60 110 65 118 Q70 110 75 90 Z" fill="#f97316" opacity="0.9" />
          <path d="M58 90 Q62 104 65 112 Q68 104 72 90 Z" fill="#fbbf24" />
          <path d="M61 90 Q63 100 65 106 Q67 100 69 90 Z" fill="white" opacity="0.7" />
        </g>
        <path d="M47 82 L55 72 L55 90 Z" fill="#dc2626" />
        <path d="M83 82 L75 72 L75 90 Z" fill="#dc2626" />
        <rect x="52" y="40" width="26" height="52" rx="5" fill="#f87171" />
        <rect x="54" y="40" width="22" height="52" rx="4" fill="#fca5a5" />
        <path d="M52 40 Q52 16 65 10 Q78 16 78 40 Z" fill="#ef4444" />
        <path d="M54 38 Q54 18 65 12 Q76 18 76 38 Z" fill="#f87171" />
        <circle cx="65" cy="64" r="10" fill="#bfdbfe" />
        <circle cx="65" cy="64" r="7" fill="#dbeafe" />
        <circle cx="62" cy="61" r="3" fill="white" opacity="0.7" />
        <path d="M52 54 L78 54" stroke="white" strokeWidth="2.5" opacity="0.5" />
        <path d="M52 76 L78 76" stroke="white" strokeWidth="2.5" opacity="0.5" />
        <text x="65" y="46" textAnchor="middle" fontSize="7" fontWeight="900" fill="white" fontFamily="sans-serif" opacity="0.9">ОГЭ</text>
        <circle cx="82" cy="40" r="10" fill="#22c55e" />
        <path d="M77 40 L81 44 L87 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function MagnetIcon({ animated = false }: { animated?: boolean }) {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 8px 28px rgba(139,92,246,0.3))" }}>
      <style>{`
        @keyframes attract { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-5px)} }
        @keyframes attract-r { 0%,100%{transform:translateX(0)} 50%{transform:translateX(5px)} }
        @keyframes magnet-pulse { 0%,100%{filter:drop-shadow(0 0 4px rgba(139,92,246,0.5))} 50%{filter:drop-shadow(0 0 14px rgba(139,92,246,1))} }
        @keyframes spark { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
      <g style={animated ? { animation:"magnet-pulse 2s ease-in-out infinite" } : {}}>
        <path d="M30 30 L30 76 Q30 100 65 100 Q100 100 100 76 L100 30" stroke="#7c3aed" strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d="M30 30 L30 76 Q30 100 65 100 Q100 100 100 76 L100 30" stroke="#8b5cf6" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M30 30 L30 76 Q30 100 65 100 Q100 100 100 76 L100 30" stroke="#a78bfa" strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="22" y="24" width="16" height="20" rx="4" fill="#ef4444" />
        <text x="30" y="38" textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="sans-serif">N</text>
        <rect x="92" y="24" width="16" height="20" rx="4" fill="#3b82f6" />
        <text x="100" y="38" textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="sans-serif">S</text>
      </g>
      <g style={animated ? { animation:"attract 1.8s ease-in-out infinite" } : {}}>
        <path d="M10 35 Q16 35 22 35" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" opacity="0.7" />
        <path d="M6 44 Q14 44 22 44" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" opacity="0.5" />
        <path d="M8 53 Q15 53 22 53" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" opacity="0.3" />
      </g>
      <g style={animated ? { animation:"attract-r 1.8s ease-in-out infinite" } : {}}>
        <path d="M108 35 Q114 35 120 35" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" opacity="0.7" />
        <path d="M108 44 Q116 44 124 44" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" opacity="0.5" />
        <path d="M108 53 Q115 53 122 53" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" opacity="0.3" />
      </g>
      <g style={animated ? { animation:"spark 1s ease-in-out infinite 0.5s" } : {}}>
        <path d="M45 28 L50 22 L52 28 L57 21" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <g style={animated ? { animation:"spark 1s ease-in-out infinite" } : {}}>
        <path d="M73 28 L78 22 L80 28 L85 21" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <g style={animated ? { animation:"attract 1.8s ease-in-out infinite 0.3s" } : {}}>
        <circle cx="12" cy="76" r="6" fill="#c4b5fd" />
        <path d="M6 82 Q6 92 12 92 Q18 92 18 82" fill="#8b5cf6" />
      </g>
      <g style={animated ? { animation:"attract-r 1.8s ease-in-out infinite 0.3s" } : {}}>
        <circle cx="118" cy="76" r="6" fill="#c4b5fd" />
        <path d="M112 82 Q112 92 118 92 Q124 92 124 82" fill="#8b5cf6" />
      </g>
      <circle cx="65" cy="110" r="6" fill="#7c3aed" />
      <path d="M59 116 Q59 125 65 125 Q71 125 71 116" fill="#5b21b6" />
      <text x="65" y="9" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7c3aed" fontFamily="monospace" opacity="0.8">F = qvB</text>
    </svg>
  );
}

function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeIn3(t: number) { return t * t * t; }
function easeOut5(t: number) { return 1 - Math.pow(1 - t, 5); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function useAnimLoop(active: boolean, period = 4000) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    if (!active) { setT(0); start.current = null; return; }
    const tick = (now: number) => {
      if (!activeRef.current) { setT(0); start.current = null; return; }
      if (start.current === null) start.current = now;
      setT(((now - start.current) % period) / period);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [active, period]);

  return t;
}

function AtomAnim({ t, W, H, cx, cy }: { t: number; W: number; H: number; cx: number; cy: number }) {
  const maxR = Math.max(W, H) * 0.7;
  const orbitTilts = [0, 60, 120];
  const orbitColors = ["#818cf8", "#a78bfa", "#c4b5fd"];
  const electronColors = ["#f59e0b", "#34d399", "#f472b6"];
  const phase = t;
  let expand = 0;
  if (phase < 0.45) expand = easeOut5(phase / 0.45);
  else if (phase < 0.55) expand = 1;
  else expand = 1 - easeIn3((phase - 0.55) / 0.45);
  const orbitRx = maxR * 0.72 * expand;
  const orbitRy = maxR * 0.26 * expand;
  const photonCount = 8;
  return (
    <g>
      <defs>
        <radialGradient id="atom-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={expand * 0.35} />
          <stop offset="60%" stopColor="#818cf8" stopOpacity={expand * 0.08} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={orbitRx * 0.9} ry={orbitRy * 0.9 + (H - orbitRy * 0.9) * expand * 0.6}
        fill="url(#atom-glow)" />
      {orbitTilts.map((tilt, i) => {
        const delay = i * 0.1;
        const localT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
        let lExpand = 0;
        if (localT < 0.45) lExpand = easeOut5(localT / 0.45);
        else if (localT < 0.55) lExpand = 1;
        else lExpand = 1 - easeIn3((localT - 0.55) / 0.45);
        const lRx = maxR * 0.72 * lExpand;
        const lRy = maxR * 0.26 * lExpand;
        const alpha = lExpand > 0 ? Math.min(lExpand * 1.5, 0.55) * (lExpand > 0.9 ? (1 - lExpand) / 0.1 : 1) : 0;
        const electronAngle = t * Math.PI * 2 * (i % 2 === 0 ? 1 : -1) + (i * Math.PI * 2) / 3;
        const eRad = ((tilt + 0) * Math.PI) / 180;
        const ex_local = lRx * Math.cos(electronAngle);
        const ey_local = lRy * Math.sin(electronAngle);
        const sinT = Math.sin(eRad);
        const cosT = Math.cos(eRad);
        const ex = cx + ex_local * cosT - ey_local * sinT;
        const ey = cy + ex_local * sinT + ey_local * cosT;
        const trailDots = Array.from({ length: 5 }, (_, ti) => {
          const ta = electronAngle - (ti + 1) * 0.22;
          const tx_l = lRx * Math.cos(ta);
          const ty_l = lRy * Math.sin(ta);
          const tx = cx + tx_l * cosT - ty_l * sinT;
          const ty = cy + tx_l * sinT + ty_l * cosT;
          return { tx, ty, a: (1 - (ti + 1) / 6) * alpha * 0.6 };
        });
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={lRx} ry={lRy}
              stroke={orbitColors[i]} strokeWidth="1.2" fill="none" opacity={alpha * 0.7}
              transform={`rotate(${tilt} ${cx} ${cy})`} />
            {trailDots.map((d, di) => (
              <circle key={di} cx={d.tx} cy={d.ty} r={2.5 - di * 0.4} fill={electronColors[i]} opacity={d.a} />
            ))}
            {lExpand > 0.05 && (
              <circle cx={ex} cy={ey} r={4.5} fill={electronColors[i]} opacity={alpha * 1.1 > 1 ? 1 : alpha * 1.1} />
            )}
          </g>
        );
      })}
      {Array.from({ length: photonCount }, (_, i) => {
        const angle = (i / photonCount) * Math.PI * 2 + t * Math.PI * 0.3;
        const phaseOff = (i / photonCount);
        const pT = (t * 2 + phaseOff) % 1;
        const headD = maxR * easeOut3(pT);
        const tailD = Math.max(0, headD - maxR * 0.18);
        const alpha = pT < 0.6 ? pT / 0.6 * 0.4 : (1 - pT) / 0.4 * 0.4;
        return (
          <line key={i}
            x1={cx + Math.cos(angle) * tailD} y1={cy + Math.sin(angle) * tailD}
            x2={cx + Math.cos(angle) * headD} y2={cy + Math.sin(angle) * headD}
            stroke="#818cf8" strokeWidth="1" strokeLinecap="round" opacity={alpha * expand} />
        );
      })}
      {[0.3, 0.55, 0.8].map((rFrac, i) => {
        const pOff = i * 0.2;
        const rT = (t + pOff) % 1;
        const r = maxR * rFrac * easeOut3(rT < 0.5 ? rT / 0.5 : 1);
        const al = rT < 0.5 ? easeOut3(rT / 0.5) * 0.3 : (1 - easeIn3((rT - 0.5) / 0.5)) * 0.3;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke="#6366f1" strokeWidth="0.8" opacity={al * expand} />
        );
      })}
      <circle cx={cx} cy={cy} r={16 + expand * 8} fill="#6366f1" opacity={0.12 + expand * 0.1} />
      <circle cx={cx} cy={cy} r={10} fill="#818cf8" opacity={0.2 + expand * 0.15} />
    </g>
  );
}

function TrajectoryAnim({ t, W, H, cx, cy }: { t: number; W: number; H: number; cx: number; cy: number }) {
  const groundY = cy + 72;
  const originX = 16;
  const gridT = Math.min(t / 0.25, 1);
  const gridAlpha = easeOut3(gridT) * 0.25;
  const arcs = [
    { color: "#10b981", apexX: cx, apexY: cy - 60, startT: 0.1 },
    { color: "#34d399", apexX: cx + 50, apexY: cy - 30, startT: 0.25 },
    { color: "#6ee7b7", apexX: cx - 30, apexY: cy - 80, startT: 0.05 },
  ];
  function parabolaPoint(frac: number, arc: typeof arcs[0]) {
    const landX = originX + (arc.apexX - originX) * 2;
    const h = groundY - arc.apexY;
    const x = lerp(originX, landX, frac);
    const y = groundY - 4 * h * frac * (1 - frac);
    return { x, y };
  }
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => {
        const y = groundY - (i + 1) * (groundY / 7);
        const lineW = W * Math.min(gridT, 1);
        return <line key={`h${i}`} x1={originX} y1={y} x2={originX + lineW} y2={y}
          stroke="#10b981" strokeWidth="0.5" strokeDasharray="4 5" opacity={gridAlpha} />;
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const x = originX + (i + 1) * ((W - originX) / 8);
        const lineH = groundY * Math.min(gridT, 1);
        return <line key={`v${i}`} x1={x} y1={groundY} x2={x} y2={groundY - lineH}
          stroke="#10b981" strokeWidth="0.5" strokeDasharray="4 5" opacity={gridAlpha} />;
      })}
      <line x1={originX} y1={groundY} x2={originX + W * Math.min(gridT, 1)} y2={groundY}
        stroke="#10b981" strokeWidth="1.2" opacity={Math.min(gridAlpha * 2.5, 0.6)} strokeLinecap="round" />
      <line x1={originX} y1={groundY} x2={originX} y2={groundY - groundY * Math.min(gridT, 1)}
        stroke="#10b981" strokeWidth="1.2" opacity={Math.min(gridAlpha * 2.5, 0.6)} strokeLinecap="round" />
      {arcs.map((arc, ai) => {
        const arcEnd = arc.startT + 0.45;
        const localT = Math.max(0, Math.min(1, (t - arc.startT) / (arcEnd - arc.startT)));
        if (localT <= 0) return null;
        const steps = 40;
        const pts = Array.from({ length: steps + 1 }, (_, si) => {
          const f = (si / steps) * localT;
          return parabolaPoint(f, arc);
        });
        const pathD = pts.map((p, si) => `${si === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        const ballPos = parabolaPoint(localT, arc);
        const dt = 0.02;
        const p2 = parabolaPoint(Math.min(localT + dt, 1), arc);
        const vx = (p2.x - ballPos.x) / dt * 0.08;
        const vy = (p2.y - ballPos.y) / dt * 0.08;
        const vlen = Math.sqrt(vx * vx + vy * vy);
        const vnx = vx / vlen;
        const vny = vy / vlen;
        const arrowLen = 22;
        const arcAlpha = localT < 0.8 ? easeOut3(localT / 0.2) : (1 - easeIn3((localT - 0.8) / 0.2));
        return (
          <g key={ai}>
            <path d={pathD} fill="none" stroke={arc.color} strokeWidth="1.5" strokeLinecap="round" opacity={arcAlpha * 0.7} />
            <path d={pathD} fill="none" stroke={arc.color} strokeWidth="3" strokeLinecap="round" opacity={arcAlpha * 0.15} style={{ filter: "blur(2px)" }} />
            {localT > 0 && localT < 0.98 && (
              <>
                <circle cx={ballPos.x} cy={ballPos.y} r={6} fill={ai === 0 ? "#f59e0b" : arc.color} opacity={arcAlpha} />
                <circle cx={ballPos.x - 1.5} cy={ballPos.y - 1.5} r={2} fill="white" opacity={arcAlpha * 0.5} />
                <line x1={ballPos.x} y1={ballPos.y}
                  x2={ballPos.x + vnx * arrowLen} y2={ballPos.y + vny * arrowLen}
                  stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" opacity={arcAlpha * 0.7} />
                <circle cx={ballPos.x + vnx * arrowLen} cy={ballPos.y + vny * arrowLen} r={2}
                  fill="#fbbf24" opacity={arcAlpha * 0.7} />
              </>
            )}
            {localT > 0.9 && (() => {
              const flashT = (localT - 0.9) / 0.1;
              const land = parabolaPoint(1, arc);
              return (
                <g opacity={(1 - flashT) * 0.8}>
                  <circle cx={land.x} cy={land.y} r={flashT * 18} fill="none" stroke={arc.color} strokeWidth="1.5" />
                  <circle cx={land.x} cy={land.y} r={3} fill={arc.color} />
                </g>
              );
            })()}
          </g>
        );
      })}
      <text x={W - 12} y={groundY - 8} textAnchor="end" fontSize="9"
        fill="#10b981" fontFamily="monospace" opacity={Math.min(gridAlpha * 3, 0.4)}>
        Δx = v₀t
      </text>
    </g>
  );
}

const EXHAUST_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  seed: i,
  offsetX: Math.sin(i * 2.4) * 14,
  speed: 0.6 + (i % 5) * 0.1,
  size: 2.5 + (i % 4) * 1.2,
  hue: i % 3,
}));

const STARS = Array.from({ length: 16 }, (_, i) => ({
  x: 8 + (i * 37) % 85,
  speed: 0.4 + (i % 5) * 0.12,
  size: 1 + (i % 3) * 0.7,
  phaseOff: i * 0.06,
}));

function RocketAnim({ t, W, H, cx, cy }: { t: number; W: number; H: number; cx: number; cy: number }) {
  const exhaustOriginY = cy + 85;
  const launchT = Math.min(t / 0.12, 1);
  const exhColors = ["#f97316", "#fbbf24", "rgba(255,255,255,0.9)"];
  return (
    <g>
      {t < 0.35 && (() => {
        const swT = easeOut5(t / 0.35);
        const r = swT * W * 0.55;
        const al = (1 - swT) * 0.6;
        return (
          <>
            <ellipse cx={cx} cy={exhaustOriginY} rx={r} ry={r * 0.3}
              fill="none" stroke="#f97316" strokeWidth="2" opacity={al} />
            <ellipse cx={cx} cy={exhaustOriginY} rx={r * 0.6} ry={r * 0.18}
              fill="none" stroke="#fbbf24" strokeWidth="1" opacity={al * 0.5} />
          </>
        );
      })()}
      {EXHAUST_PARTICLES.map((p) => {
        const pT = ((t * p.speed + p.seed * 0.04) % 1);
        const y = exhaustOriginY + pT * (H - exhaustOriginY + 40);
        const x = cx + p.offsetX * Math.sin(pT * Math.PI * 3 + p.seed);
        const scale = 1 - pT * 0.5;
        const alpha = pT < 0.15 ? pT / 0.15 : (1 - pT) * 1.1;
        return (
          <circle key={p.seed} cx={x} cy={y} r={p.size * scale}
            fill={exhColors[p.hue]} opacity={Math.min(alpha, 1)} />
        );
      })}
      <defs>
        <radialGradient id="exh-glow" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity={launchT * 0.5} />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={exhaustOriginY} rx={20} ry={50} fill="url(#exh-glow)" opacity={0.6} />
      {STARS.map((s, i) => {
        const pT = (t * s.speed + s.phaseOff) % 1;
        const y = pT * (H + 10) - 5;
        const trailLen = 8 + s.size * 4;
        const alpha = pT < 0.1 ? pT / 0.1 : pT > 0.9 ? (1 - pT) / 0.1 : 1;
        return (
          <g key={i} opacity={alpha * 0.7}>
            <line x1={s.x} y1={y - trailLen} x2={s.x} y2={y}
              stroke="#fde68a" strokeWidth={s.size * 0.5} strokeLinecap="round" opacity={0.6} />
            <circle cx={s.x} cy={y} r={s.size} fill="#fde68a" />
          </g>
        );
      })}
      {[0.22, 0.5, 0.78].map((xf, i) => {
        const arrowX = xf * W;
        const baseY = exhaustOriginY + 30;
        const arrT = ((t * 0.8 + i * 0.33) % 1);
        const endY = baseY + arrT * 40;
        const alpha = arrT < 0.3 ? arrT / 0.3 : (1 - arrT) / 0.7;
        return (
          <g key={i} opacity={alpha * 0.45}>
            <line x1={arrowX} y1={baseY} x2={arrowX} y2={endY}
              stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" />
            <path d={`M ${arrowX - 4} ${endY - 6} L ${arrowX} ${endY} L ${arrowX + 4} ${endY - 6}`}
              fill="none" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      {launchT > 0.5 && (
        <ellipse cx={cx} cy={cy + 50} rx={35} ry={80}
          fill="none" stroke="#f97316" strokeWidth="0.5"
          opacity={(launchT - 0.5) * 0.15}
          strokeDasharray={`${4 + Math.sin(t * 20) * 2} 3`} />
      )}
    </g>
  );
}

function pointOnQuadratic(x0: number, y0: number, cx2: number, cy2: number, x1: number, y1: number, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * cx2 + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy2 + t * t * y1,
  };
}

const FIELD_LINE_CONFIGS = [
  { scale: 0.4, flip: false }, { scale: 0.75, flip: false }, { scale: 1.2, flip: false },
  { scale: 1.9, flip: false }, { scale: 2.8, flip: false },
  { scale: 0.4, flip: true }, { scale: 0.75, flip: true }, { scale: 1.2, flip: true },
  { scale: 1.9, flip: true }, { scale: 2.8, flip: true },
];

const FIELD_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  lineIndex: i % FIELD_LINE_CONFIGS.length,
  phaseOffset: i * 0.05,
  speed: 0.35 + (i % 4) * 0.08,
}));

function MagnetAnim({ t, W, H, cx, cy }: { t: number; W: number; H: number; cx: number; cy: number }) {
  const iconTop = cy - 65;
  const nX = cx - 35;
  const nY = iconTop + 30;
  const sX = cx + 35;
  const sY = iconTop + 30;
  const drawT = t < 0.4 ? easeOut3(t / 0.4) : t < 0.6 ? 1 : 1 - easeIn3((t - 0.6) / 0.4);
  const edgeFade = 32;
  return (
    <g>
      <defs>
        <radialGradient id="n-pole-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={drawT * 0.3} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s-pole-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={drawT * 0.3} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mfade-top" x1="0" y1="0" x2="0" gradientUnits="userSpaceOnUse"
          y2={edgeFade}>
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient id="mfade-left" x1="0" y1="0" y2="0" gradientUnits="userSpaceOnUse"
          x2={edgeFade}>
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient id="mfade-right" y1="0" y2="0" gradientUnits="userSpaceOnUse"
          x1={W - edgeFade} x2={W}>
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id="magnet-edge-mask">
          <rect x={0} y={0} width={W} height={H} fill="white" />
          <rect x={0} y={0} width={W} height={edgeFade} fill="url(#mfade-top)" />
          <rect x={0} y={0} width={edgeFade} height={H} fill="url(#mfade-left)" />
          <rect x={W - edgeFade} y={0} width={edgeFade} height={H} fill="url(#mfade-right)" />
        </mask>
      </defs>
      <circle cx={nX} cy={nY} r={Math.max(1, 30 * drawT)} fill="url(#n-pole-glow)" opacity={drawT} />
      <circle cx={sX} cy={sY} r={Math.max(1, 30 * drawT)} fill="url(#s-pole-glow)" opacity={drawT} />
      <g mask="url(#magnet-edge-mask)">
      {FIELD_LINE_CONFIGS.map((cfg, i) => {
        const midX = (nX + sX) / 2;
        const midY = (nY + sY) / 2;
        const dx = sX - nX;
        const dy = sY - nY;
        const perpX = -dy * cfg.scale * (cfg.flip ? -1 : 1);
        const perpY = dx * cfg.scale * (cfg.flip ? -1 : 1);
        const cpX = midX + perpX;
        const cpY = midY + perpY;
        const lineDelay = i * 0.04;
        const localT = Math.max(0, Math.min(1, (t - lineDelay) / (0.5 - lineDelay * 0.5)));
        const headT = easeOut3(Math.min(localT / 0.55, 1));
        const tailT = Math.max(0, headT - 0.4);
        const alpha = Math.min(drawT * 0.6, 0.55) * (i < 5 ? 1 : 0.7);
        const steps = 24;
        const pts = Array.from({ length: steps + 1 }, (_, si) => {
          const f = lerp(tailT, headT, si / steps);
          return pointOnQuadratic(nX, nY, cpX, cpY, sX, sY, f);
        });
        const pathD = pts.map((p, si) => `${si === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        const lineColor = cfg.flip ? "#8b5cf6" : (i < 5 ? "#a78bfa" : "#8b5cf6");
        return (
          <path key={i} d={pathD} fill="none"
            stroke={lineColor} strokeWidth={i < 2 || (i >= 5 && i < 7) ? "1.5" : "1"}
            opacity={alpha} strokeLinecap="round" />
        );
      })}
      {FIELD_PARTICLES.map((fp, i) => {
        if (drawT < 0.3) return null;
        const cfg = FIELD_LINE_CONFIGS[fp.lineIndex];
        const midX = (nX + sX) / 2;
        const midY = (nY + sY) / 2;
        const dx = sX - nX;
        const dy = sY - nY;
        const perpX = -dy * cfg.scale * (cfg.flip ? -1 : 1);
        const perpY = dx * cfg.scale * (cfg.flip ? -1 : 1);
        const cpX = midX + perpX;
        const cpY = midY + perpY;
        const pT = (t * fp.speed + fp.phaseOffset) % 1;
        const pos = pointOnQuadratic(nX, nY, cpX, cpY, sX, sY, pT);
        const alpha = pT < 0.1 ? pT / 0.1 : pT > 0.9 ? (1 - pT) / 0.1 : 1;
        return (
          <circle key={i} cx={pos.x} cy={pos.y} r={2}
            fill={fp.lineIndex % 2 === 0 ? "#c4b5fd" : "#a78bfa"}
            opacity={alpha * drawT * 0.8} />
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const isLeft = i < 6;
        const pole = isLeft ? { x: nX, y: nY } : { x: sX, y: sY };
        const startX = isLeft ? 0 : W;
        const startY = 20 + (i % 6) * ((H - 40) / 5);
        const pT = ((t * 0.5 + i * 0.08) % 1);
        const x = lerp(startX, pole.x, easeIn3(pT));
        const y = lerp(startY, pole.y, easeIn3(pT));
        const alpha = (1 - easeIn3(pT)) * drawT * 0.5;
        return (
          <circle key={i} cx={x} cy={y} r={1.5}
            fill={isLeft ? "#ef4444" : "#3b82f6"} opacity={alpha} />
        );
      })}
      {t > 0.3 && Array.from({ length: 5 }, (_, i) => {
        const frac = (i + 1) / 6;
        const x = lerp(nX, sX, frac);
        const lineAlpha = Math.min((drawT - 0.3) / 0.7 * 0.2, 0.2);
        const len = 6 + Math.sin(t * Math.PI * 4 + i) * 2;
        return (
          <line key={i} x1={x} y1={nY - len} x2={x} y2={nY + len}
            stroke="#8b5cf6" strokeWidth="1" opacity={lineAlpha} strokeLinecap="round" />
        );
      })}
      <text x={W / 2} y={H - 12} textAnchor="middle" fontSize="9"
        fill="#8b5cf6" fontFamily="monospace" opacity={drawT * 0.4}>
        B = μ₀I / 2πr
      </text>
      </g>
    </g>
  );
}

type AnimType = "atom" | "trajectory" | "rocket" | "magnet";

function CardAnim({ active, type, W, H, cx, cy }: {
  active: boolean; type: AnimType; W: number; H: number; cx: number; cy: number;
}) {
  const periods: Record<AnimType, number> = { atom: 4200, trajectory: 5000, rocket: 3800, magnet: 4500 };
  const t = useAnimLoop(active, periods[type]);
  if (!active && t === 0) return null;
  return (
    <svg
      style={{ position: "absolute", top: -1, left: -1, pointerEvents: "none" }}
      width={W + 2} height={H + 2}
      viewBox={`-1 -1 ${W + 2} ${H + 2}`}
    >
      <defs>
        <clipPath id={`cc-${type}`}><rect x="0" y="0" width={W} height={H} rx="16" /></clipPath>
      </defs>
      <g clipPath={`url(#cc-${type})`}>
        {type === "atom" && <AtomAnim t={t} W={W} H={H} cx={cx} cy={cy} />}
        {type === "trajectory" && <TrajectoryAnim t={t} W={W} H={H} cx={cx} cy={cy} />}
        {type === "rocket" && <RocketAnim t={t} W={W} H={H} cx={cx} cy={cy} />}
        {type === "magnet" && <MagnetAnim t={t} W={W} H={H} cx={cx} cy={cy} />}
      </g>
    </svg>
  );
}

const plans = [
  {
    id: "single", animType: "atom" as AnimType,
    title: "Разовое занятие", subtitle: "1 занятие",
    price: "1500₽", priceNote: "/ 60 мин",
    description: "Персональная работа над пониманием физики и решением задач. Подходит для разбора сложных тем.",
    features: ["Видеозапись урока", "Конспект занятия", "Полная обратная связь", "Разбор домашнего задания", "Рекомендации по обучению"],
    buttonText: "Записаться", gradient: "from-indigo-500 to-violet-600", featured: false,
    Icon: AtomIcon, accentColor: "text-indigo-600", badgeColor: "bg-indigo-100 text-indigo-700",
    botLink: botLink("individual"), subType: "individual", lessons: 1,
  },
  {
    id: "progress", animType: "trajectory" as AnimType,
    title: "Пакет «Прогресс»", subtitle: "4 занятия",
    price: "5700₽", priceOld: "6000₽",
    description: "Оптимальный формат для регулярной работы и повышения успеваемости по физике.",
    features: ["Видеозапись каждого урока", "Конспект занятия", "Полная обратная связь", "Общий чат вне урока", "Домашние задания с проверкой", "Разбор сложных задач"],
    buttonText: "Оформить", gradient: "from-emerald-500 to-teal-600", featured: false,
    Icon: TrajectoryIcon, accentColor: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-700",
    botLink: botLink("sub4"), subType: "individual", lessons: 4,
    cardBg: "bg-emerald-50", checkCircle: "#d1fae5", checkMark: "#059669",
  },
  {
    id: "max", animType: "rocket" as AnimType,
    title: "Пакет «Максимальный результат»", subtitle: "8 занятий",
    price: "10 800₽", priceOld: "12000₽",
    description: "Полная системная работа по физике. Подходит для подготовки к ОГЭ, повышения успеваемости.",
    features: ["Видеозапись каждого урока", "Подробный конспект", "Разбор домашнего задания", "Общий чат для вопросов", "Индивидуальный план", "Контроль прогресса", "Подготовка к ОГЭ"],
    buttonText: "Выбрать лучшее", gradient: "from-red-400 to-orange-500", featured: true,
    Icon: RocketIcon, accentColor: "text-white", badgeColor: "bg-white/20 text-white",
    botLink: botLink("sub8"), subType: "individual", lessons: 8,
  },
  {
    id: "group", animType: "magnet" as AnimType,
    title: "Групповое занятие", subtitle: "до 4 учеников",
    price: "1000₽", priceNote: "/ 90 мин",
    description: "Занятия в мини-группах. Ученики учатся объяснять решения, обсуждать задачи вместе.",
    features: ["Видеозапись урока", "Конспект занятия", "Общий чат группы для вопросов", "Совместный разбор задач", "Подготовка к контрольным и ОГЭ", "Поддержка между занятиями"],
    buttonText: "Записаться", gradient: "from-violet-500 to-purple-600", featured: false,
    Icon: MagnetIcon, accentColor: "text-violet-600", badgeColor: "bg-violet-100 text-violet-700",
    botLink: botLink("group"), subType: "group", lessons: 1,
    cardBg: "bg-amber-50", checkCircle: "#fef3c7", checkMark: "#d97706",
  },
];

function AuthModal({ plan, onClose }: { plan: typeof plans[0]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
          aria-label="Закрыть"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="10" r="5" stroke="#4F46E5" strokeWidth="2" />
            <path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Войдите в аккаунт</h3>
        <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
          Чтобы записаться на занятие, необходимо войти или создать аккаунт.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="/login"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white hover:opacity-90 transition shadow-md"
          >
            Войти через сайт
          </a>
          <a
            href={plan.botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Написать в бота
          </a>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ plan, isLoggedIn, count = 0, onAdd, onRemove }: {
  plan: typeof plans[0];
  isLoggedIn: boolean;
  count?: number;
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const [animParams, setAnimParams] = useState<{ W: number; H: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    function measure() {
      const card = cardRef.current;
      const icon = iconRef.current;
      if (!card || !icon) return;
      const cardRect = card.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const cx = iconRect.left - cardRect.left + iconRect.width / 2;
      const cy = iconRect.top - cardRect.top + iconRect.height / 2;
      setAnimParams({
        W: cardRect.width,
        H: cardRect.height,
        cx,
        cy,
      });
    }

    measure();

    const ro = new ResizeObserver(measure);
    if (cardRef.current) ro.observe(cardRef.current);
    if (iconRef.current) ro.observe(iconRef.current);
    return () => ro.disconnect();
  }, []);

  const isFeatured = plan.featured;

  const isLifted = hovered || showModal;

  return (
    <div
      ref={cardRef}
      className={`relative rounded-2xl p-6 cursor-pointer flex flex-col pc-card-lift ${
        isFeatured
          ? "bg-gradient-to-br from-indigo-600 to-blue-700 shadow-2xl"
          : `${"cardBg" in plan && plan.cardBg ? plan.cardBg : "bg-white"} shadow-lg`
      }`}
      style={isFeatured
        ? { boxShadow: "0 20px 60px rgba(79,70,229,0.4)", transform: isLifted ? "translateY(-12px) scale(1.025)" : undefined }
        : { transform: isLifted ? "translateY(-12px) scale(1.025)" : undefined }
      }
      onMouseEnter={() => { if (!showModal) setHovered(true); }}
      onMouseLeave={() => { if (!showModal) setHovered(false); }}
    >
      {animParams && (
        <CardAnim
          active={hovered}
          type={plan.animType}
          W={animParams.W}
          H={animParams.H}
          cx={animParams.cx}
          cy={animParams.cy}
        />
      )}

      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-10">
          ХИТ 🔥
        </div>
      )}

      <div
        ref={iconRef}
        className={`flex justify-center mb-3 relative z-10 ${hovered ? "pc-icon-float" : ""}`}
      >
        <plan.Icon animated={hovered} />
      </div>

      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full self-start mb-2 relative z-10 ${plan.badgeColor}`}>
        {plan.subtitle}
      </span>

      <h3 className={`font-bold text-base leading-tight mb-2 relative z-10 ${isFeatured ? "text-white" : "text-slate-800"}`}>
        {plan.title}
      </h3>

      <p className={`text-xs leading-relaxed mb-4 relative z-10 ${isFeatured ? "text-blue-100" : "text-slate-500"}`}>
        {plan.description}
      </p>

      <ul className="space-y-1.5 mb-6 flex-1 relative z-10">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill={isFeatured ? "rgba(255,255,255,0.2)" : ("checkCircle" in plan && plan.checkCircle ? plan.checkCircle : "#ede9fe")} />
              <path d="M4 7 L6.5 9.5 L10 5" stroke={isFeatured ? "white" : ("checkMark" in plan && plan.checkMark ? plan.checkMark : "#7c3aed")} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={isFeatured ? "text-blue-50" : "text-slate-600"}>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mb-4 relative z-10">
        {"priceOld" in plan && plan.priceOld && (
          <span className={`text-xs line-through mr-2 ${isFeatured ? "text-red-300" : "text-red-400"}`}>
            {plan.priceOld}
          </span>
        )}
        <span className={`text-2xl font-black ${isFeatured ? "text-white" : plan.accentColor}`}>
          {plan.price}
        </span>
        {"priceNote" in plan && plan.priceNote && (
          <span className={`text-xs ml-1 ${isFeatured ? "text-blue-200" : "text-slate-400"}`}>
            {plan.priceNote}
          </span>
        )}
      </div>

      {isLoggedIn && count > 0 ? (
        <div className="flex items-center justify-between gap-2 relative z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className={`flex-1 h-10 rounded-xl text-xl font-bold transition-all ${isFeatured ? "bg-white/20 text-white hover:bg-white/30" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >−</button>
          <span className={`text-lg font-bold min-w-[2rem] text-center ${isFeatured ? "text-white" : "text-slate-800"}`}>{count}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd?.(); }}
            className={`flex-1 h-10 rounded-xl text-xl font-bold transition-all ${isFeatured ? "bg-white/20 text-white hover:bg-white/30" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >+</button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (isLoggedIn) {
              onAdd?.();
            } else {
              setShowModal(true);
            }
          }}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all duration-200 relative z-10 cursor-pointer
            ${isFeatured
              ? "bg-white text-indigo-700 hover:bg-blue-50 shadow-lg"
              : `bg-gradient-to-r ${plan.gradient} text-white hover:opacity-90 shadow-md`
            }`}
        >
          {plan.buttonText}
        </button>
      )}

      {showModal && <AuthModal plan={plan} onClose={() => { setShowModal(false); setHovered(false); }} />}
    </div>
  );
}

export default function PricingCards({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [cart, setCart] = useState<Record<string, number>>({});

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (planId: string) =>
    setCart(c => ({ ...c, [planId]: (c[planId] || 0) + 1 }));

  const removeFromCart = (planId: string) =>
    setCart(c => {
      const n = (c[planId] || 0) - 1;
      if (n <= 0) { const { [planId]: _, ...rest } = c; return rest; }
      return { ...c, [planId]: n };
    });

  const handleCheckout = () => {
    localStorage.setItem("pricing_cart", JSON.stringify(cart));
    window.location.href = "/cabinet?tab=order";
  };

  const lessonWord = (n: number) => n === 1 ? "занятие" : n < 5 ? "занятия" : "занятий";

  return (
    <>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        .pc-icon-float { animation: float 3s ease-in-out infinite; }
        .pc-card-lift { transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease; }
      `}</style>

      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full"
          style={{ gap: 'clamp(16px, calc(1.5vw + 8px), 40px)', maxWidth: 'min(calc(100vw - 64px), 1600px)' }}
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isLoggedIn={isLoggedIn}
              count={cart[plan.id] || 0}
              onAdd={() => addToCart(plan.id)}
              onRemove={() => removeFromCart(plan.id)}
            />
          ))}
        </div>
      </div>

      {isLoggedIn && totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-indigo-500 animate-in slide-in-from-bottom-4">
          <svg className="w-5 h-5 opacity-80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-semibold whitespace-nowrap">
            В корзине: <span className="font-black">{totalItems}</span> {lessonWord(totalItems)}
          </span>
          <button
            onClick={handleCheckout}
            className="bg-white text-indigo-700 px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all whitespace-nowrap shadow-sm"
          >
            Перейти к оформлению →
          </button>
        </div>
      )}
    </>
  );
}
