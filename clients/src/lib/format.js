// Display formatters shared across screens.

export const num = (n) => Number(n || 0).toLocaleString();

// "$1,234.50"
export const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

// Compact: "$943k", "$12.4k", "$0"
export const moneyShort = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(Math.abs(v) >= 100000 ? 0 : 1)}k`;
  return `$${v.toFixed(0)}`;
};

// "May 24, 2025"
export const dateShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {month: "short", day: "2-digit", year: "numeric"});
};

// "May 24, 14:22"
export const dateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Index a list by id into a Map for O(1) name resolution.
export const indexById = (rows = []) => {
  const m = new Map();
  rows.forEach((r) => m.set(r.id, r));
  return m;
};

// Trigger a client-side CSV download from an array of row objects.
export const downloadCsv = (filename, rows) => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Guard against CSV formula injection: a cell starting with = + - @ (or a
    // leading tab/CR) is treated as a formula by Excel/Sheets. Neutralize it.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
