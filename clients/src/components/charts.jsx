// SmartAid — SVG charts. Ported verbatim from the design bundle (screens-core.jsx).
import React from "react";

export const LineChart = ({data, months}) => {
  const w = 720;
  const h = 240;
  const padL = 56;
  const padR = 24;
  const padT = 20;
  const padB = 36;
  const max = Math.max(...data, 1) * 1.15;
  const yTicks = 4;
  const x = (i) => padL + (i / (data.length - 1 || 1)) * (w - padL - padR);
  const y = (v) => padT + (1 - v / max) * (h - padT - padB);
  const pts = data.map((v, i) => [x(i), y(v)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - padB} L${pts[0][0]},${h - padB} Z`;
  const fmt = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width: "100%", height: "auto", display: "block"}}>
      {Array.from({length: yTicks + 1}, (_, i) => {
        const v = (max / yTicks) * i;
        const yy = padT + (1 - v / max) * (h - padT - padB);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#eef2f7" strokeWidth="1" />
            <text x={padL - 10} y={yy + 4} textAnchor="end" fontSize="10.5" fill="#7b88a3" fontFamily="JetBrains Mono, monospace">
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {months.map((m, i) => (
        <text key={m + i} x={x(i)} y={h - 14} textAnchor="middle" fontSize="11" fill="#7b88a3" fontWeight="600">
          {m}
        </text>
      ))}
      <path d={area} fill="#008afe" opacity="0.08" />
      <path d={path} fill="none" stroke="#008afe" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#008afe" strokeWidth="2" />
          {i === pts.length - 1 && (
            <g>
              <rect x={p[0] - 36} y={p[1] - 32} width="72" height="22" rx="6" fill="#001f49" />
              <text x={p[0]} y={p[1] - 17} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
                {fmt(data[i])}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
};

export const DonutChart = ({data, size = 200, thickness = 28}) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = size / 2;
  let acc = 0;
  const segs = data.map((d) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = c + r * Math.cos(start);
    const y1 = c + r * Math.sin(start);
    const x2 = c + r * Math.cos(end);
    const y2 = c + r * Math.sin(end);
    return {d: `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`, color: d.color};
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
      {segs.map((s, i) => (
        <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={thickness} strokeLinecap="butt" />
      ))}
      <text x={c} y={c - 4} textAnchor="middle" fontSize="13" fill="#7b88a3" fontWeight="600">
        Total deployed
      </text>
      <text x={c} y={c + 18} textAnchor="middle" fontSize="22" fill="#001f49" fontWeight="800" fontFamily="JetBrains Mono, monospace">
        ${(total / 1000).toFixed(0)}k
      </text>
    </svg>
  );
};
