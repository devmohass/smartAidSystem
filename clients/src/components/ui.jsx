// SmartAid — shared UI atoms. Ported from the design bundle (components.jsx)
// with small additions (Loading/ErrorState/EmptyState/Toast) for live data.
import React from "react";

export const StatusBadge = ({status}) => {
  const map = {
    completed: {cls: "badge-primary", label: "Completed"},
    active: {cls: "badge-primary", label: "Active"},
    pending: {cls: "badge-outline", label: "Pending"},
    draft: {cls: "badge-outline", label: "Draft"},
    closed: {cls: "badge-outline", label: "Closed"},
    settled: {cls: "badge-soft", label: "Settled"},
    failed: {cls: "badge-outline", label: "Failed"},
  };
  const m = map[status] || {cls: "badge-outline", label: status};
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
};

export const Progress = ({value, max = 100, showLabel, labelLeft, labelRight}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      {showLabel !== false && (
        <div className="progress-row">
          <span>{labelLeft}</span>
          <span className="pct">{labelRight ?? `${Math.round(pct)}%`}</span>
        </div>
      )}
      <div className="progress">
        <div className="progress-fill" style={{width: `${pct}%`}}></div>
      </div>
    </div>
  );
};

export const Sparkline = ({values, color = "#008afe", height = 36}) => {
  const w = 200;
  const h = height;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${d} L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const Avatar = ({name, color}) => {
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="photo-cell" style={color ? {background: color, color: "#fff"} : null}>
      {initials}
    </div>
  );
};

// ---- Live-data helpers ----
export const Loading = ({label = "Loading…", inline}) => (
  <div className={`state ${inline ? "state-inline" : ""}`}>
    <div className="spinner" />
    <div className="state-sub">{label}</div>
  </div>
);

export const ErrorState = ({message, onRetry}) => (
  <div className="state">
    <div className="state-title">Couldn’t load this data</div>
    <div className="state-sub">{message || "Something went wrong talking to the server."}</div>
    {onRetry && (
      <button className="btn btn-ghost btn-sm" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

export const EmptyState = ({title, sub, action}) => (
  <div className="state">
    <div className="state-title">{title}</div>
    {sub && <div className="state-sub">{sub}</div>}
    {action}
  </div>
);

export const Toast = ({message, kind = "ok"}) => {
  if (!message) return null;
  return <div className={`toast ${kind === "err" ? "err" : ""}`}>{message}</div>;
};
