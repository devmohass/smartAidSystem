// Pagination footer matching the design's .pagination/.pager markup.
// `page` is 0-based; onPage receives a 0-based page index.
import React from "react";
import {Icons} from "./icons.jsx";

function pageList(current, totalPages) {
  const wanted = new Set([1, totalPages, current, current - 1, current + 1]);
  const arr = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of arr) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pager({page, pageSize, total, onPage, noun = "items"}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = page + 1; // 1-based for display
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const go = (p1) => onPage(Math.min(totalPages, Math.max(1, p1)) - 1);

  return (
    <div className="pagination">
      <span>
        Showing <strong style={{color: "var(--ink)"}}>{from}–{to}</strong> of {total.toLocaleString()} {noun}
      </span>
      <div className="pager">
        <button onClick={() => go(cur - 1)} disabled={cur <= 1}>
          <Icons.ChevronL size={12} />
        </button>
        {pageList(cur, totalPages).map((p, i) =>
          p === "…" ? (
            <button key={`e${i}`} disabled>
              …
            </button>
          ) : (
            <button key={p} className={p === cur ? "on" : ""} onClick={() => go(p)}>
              {p}
            </button>
          )
        )}
        <button onClick={() => go(cur + 1)} disabled={cur >= totalPages}>
          <Icons.ChevronR size={12} />
        </button>
      </div>
    </div>
  );
}
