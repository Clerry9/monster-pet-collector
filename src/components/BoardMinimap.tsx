import { useMemo } from "react";

// Mirror of generatePath() from IsometricBoard, but in 2D for the minimap.
// Returns array of [x, z] in world units; we'll normalize for SVG.
function generatePath2D(tileCount: number, levelId: number) {
  const shape = ((levelId - 1) % 8) + 1;
  const pts: [number, number][] = [];
  for (let i = 0; i < tileCount; i++) {
    const t = i / tileCount;
    let x = 0, z = 0;
    switch (shape) {
      case 1: { const a = t * Math.PI * 2.5; const r = (4 + i * 0.35) * 0.65; x = Math.cos(a) * r; z = Math.sin(a) * r; break; }
      case 2: { const a = t * Math.PI * 2; const r = 4.5; x = Math.sin(a * 2) * r * 0.7; z = Math.sin(a) * r; break; }
      case 3: { const row = i; x = (row % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 0.2); z = -row * 0.45 + 6; break; }
      case 4: { const a = -t * Math.PI * 2.5; const r = (8 - i * 0.22) * 0.65; x = Math.cos(a) * r; z = Math.sin(a) * r; break; }
      case 5: {
        const seg = Math.floor(t * 4); const f = (t * 4) - seg;
        const corners: [number, number][] = [[0, 6], [6, 0], [0, -6], [-6, 0]];
        const [x1, z1] = corners[seg]; const [x2, z2] = corners[(seg + 1) % 4];
        x = x1 + (x2 - x1) * f; z = z1 + (z2 - z1) * f; break;
      }
      case 6: { const a = t * Math.PI * 3; x = Math.sin(a) * 4.5; z = -t * 12 + 6; break; }
      case 7: {
        const half = i < tileCount / 2;
        const a = (half ? t * 2 : (t - 0.5) * 2) * Math.PI;
        const r = half ? 5.5 : 3.2;
        x = Math.cos(a) * r; z = Math.sin(a) * r * (half ? 1 : -1); break;
      }
      case 8: { const a = t * Math.PI * 2; const r = 4 + Math.sin(t * Math.PI) * 2; x = Math.cos(a) * r * 0.7; z = Math.sin(a) * r * 0.7; break; }
    }
    pts.push([x, z]);
  }
  return pts;
}

interface BoardMinimapProps {
  levelId: number;
  tileCount: number;
  position: number;
  accentColor?: string; // CSS color (e.g. hsl from level theme)
}

export function BoardMinimap({ levelId, tileCount, position, accentColor = "hsl(var(--primary))" }: BoardMinimapProps) {
  const { d, dot } = useMemo(() => {
    const pts = generatePath2D(tileCount, levelId);
    const xs = pts.map(p => p[0]);
    const zs = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const w = maxX - minX || 1;
    const h = maxZ - minZ || 1;
    const pad = 6;
    const size = 64;
    const norm = (x: number, z: number): [number, number] => [
      pad + ((x - minX) / w) * (size - pad * 2),
      pad + ((z - minZ) / h) * (size - pad * 2),
    ];
    const path = pts.map((p, i) => {
      const [nx, nz] = norm(p[0], p[1]);
      return `${i === 0 ? "M" : "L"}${nx.toFixed(2)},${nz.toFixed(2)}`;
    }).join(" ") + " Z";
    const cur = pts[position] ?? pts[0];
    const [cx, cy] = norm(cur[0], cur[1]);
    return { d: path, dot: { cx, cy } };
  }, [levelId, tileCount, position]);

  return (
    <div
      className="absolute bottom-3 left-3 z-20 w-20 h-20 rounded-xl bg-card/85 backdrop-blur-sm border-2 border-wood-dark shadow-chunky-sm overflow-hidden"
      role="img"
      aria-label={`Minimap — Level ${levelId}, position ${position + 1} of ${tileCount}`}
    >
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <path d={d} fill="none" stroke={accentColor} strokeOpacity={0.35} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke={accentColor} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2 3" />
        <circle cx={dot.cx} cy={dot.cy} r={3.5} fill={accentColor} stroke="white" strokeWidth={1}>
          <animate attributeName="r" values="3;4.2;3" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="absolute bottom-0 inset-x-0 text-[9px] font-display text-center text-foreground/80 bg-card/70 leading-tight">
        L{levelId}
      </div>
    </div>
  );
}
