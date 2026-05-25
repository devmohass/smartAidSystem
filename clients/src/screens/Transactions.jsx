// SmartAid — Transaction history. Server-paginated + filtered. Wired to:
//   GET /transactions?campaign_id&status&q&limit&offset  (names ride on each row)
//   GET /reports/campaigns                               (filter dropdown)
// Stat cards use the filtered total + summed amount from the response, so they
// stay correct across pages. CSV export pulls the whole filtered set (cap 500).
import React, {useEffect, useMemo, useState} from "react";
import {Icons} from "../components/icons.jsx";
import {StatusBadge, Avatar, Loading, ErrorState, EmptyState} from "../components/ui.jsx";
import Pager from "../components/Pager.jsx";
import useFetch from "../lib/useFetch.js";
import {money, dateTime, downloadCsv} from "../lib/format.js";
import {transactionsApi, reportsApi} from "../api/endpoints.js";

const PAGE_SIZE = 12;
const benName = (t) => t.beneficiary_name || `#${t.beneficiary_id}`;
const shopName = (t) => t.shop_name || `#${t.shop_id}`;
const campName = (t) => t.campaign_title || `#${t.campaign_id}`;

export default function Transactions() {
  // Campaign list for the filter dropdown — loaded once.
  const campaignsFetch = useFetch(() => reportsApi.campaigns(), []);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [campaignId, setCampaignId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(id);
  }, [qInput]);

  // Any filter change resets to the first page.
  useEffect(() => setPage(0), [q, campaignId, status]);

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      q: q || undefined,
      campaign_id: campaignId === "all" ? undefined : campaignId,
      status: status === "all" ? undefined : status,
    }),
    [page, q, campaignId, status]
  );

  const {data, loading, error, reload} = useFetch(() => transactionsApi.list(query), [query]);

  const campaigns = campaignsFetch.data || [];
  const rows = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalValue = data?.summary?.total_amount || 0;
  const avg = total ? totalValue / total : 0;

  const exportCsv = async () => {
    // Pull the whole filtered set (backend caps limit at 500) for the export.
    const res = await transactionsApi.list({...query, limit: 500, offset: 0});
    downloadCsv(
      "smartaid-transactions.csv",
      (res.data || []).map((t) => ({
        tx_id: t.receipt_code || `TX-${t.id}`,
        beneficiary: benName(t),
        shop: shopName(t),
        campaign: campName(t),
        goods: t.goods_description || "",
        balance_before: t.balance_before,
        amount: t.amount,
        balance_after: t.balance_after,
        date: t.transaction_at,
        status: t.status,
      }))
    );
  };

  return (
    <div className="h-stack">
      <div className="filter-bar">
        <div className="toolbar-search" style={{maxWidth: 280}}>
          <Icons.Search size={16} className="search-icon" />
          <input placeholder="Search by beneficiary or TX ID…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
        <select className="chip-select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="all">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.title}</option>
          ))}
        </select>
        <select className="chip-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <div style={{flex: 1}}></div>
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!total}>
          <Icons.Download size={14} /> Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!rows.length}>
          <Icons.Download size={14} /> Export PDF
        </button>
      </div>

      <div className="h-grid-3">
        <div className="stat">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{total.toLocaleString()}</div>
          <div className="stat-meta">Matching current filters</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total voucher value</div>
          <div className="stat-value">{money(totalValue)}</div>
          <div className="stat-meta">Across matching transactions</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg basket size</div>
          <div className="stat-value">{money(avg)}</div>
          <div className="stat-meta">Per redemption</div>
        </div>
      </div>

      <div className="card card-flush">
        {loading ? (
          <Loading label="Loading transactions…" inline />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q || campaignId !== "all" || status !== "all" ? "No matching transactions" : "No transactions yet"}
            sub={q || campaignId !== "all" || status !== "all" ? "Adjust your filters." : "Redemptions appear once shops process vouchers."}
          />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>TX ID</th>
                    <th>Beneficiary</th>
                    <th>Shop</th>
                    <th>Campaign</th>
                    <th>Goods</th>
                    <th style={{textAlign: "right"}}>Before</th>
                    <th style={{textAlign: "right"}}>Amount</th>
                    <th style={{textAlign: "right"}}>After</th>
                    <th>Date &amp; time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td className="td-mono td-muted">{t.receipt_code || `TX-${t.id}`}</td>
                      <td>
                        <div className="name-cell">
                          <Avatar name={benName(t)} />
                          <div className="nm">{benName(t)}</div>
                        </div>
                      </td>
                      <td className="td-strong">{shopName(t)}</td>
                      <td className="td-muted">{campName(t)}</td>
                      <td style={{maxWidth: 220}} className="td-muted">{t.goods_description || "—"}</td>
                      <td className="td-mono" style={{textAlign: "right", color: "var(--ink-50)"}}>{money(t.balance_before)}</td>
                      <td className="td-mono" style={{textAlign: "right", fontWeight: 700, color: "var(--blue)"}}>−{money(t.amount).slice(1)}</td>
                      <td className="td-mono" style={{textAlign: "right", fontWeight: 600}}>{money(t.balance_after)}</td>
                      <td className="td-muted" style={{whiteSpace: "nowrap"}}>{dateTime(t.transaction_at)}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} noun="transactions" />
          </>
        )}
      </div>
    </div>
  );
}
