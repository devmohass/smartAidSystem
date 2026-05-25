// SmartAid — Donor portal (read-only). Wired to:
//   GET /dashboard          (impact headline numbers)
//   GET /reports/campaigns  (fund utilization donut + impact summary)
//   GET /transactions       (paginated read-only audit log; names come on the row)
import React, {useState} from "react";
import {StatusBadge, Progress, Loading, ErrorState, EmptyState} from "../components/ui.jsx";
import {DonutChart} from "../components/charts.jsx";
import Pager from "../components/Pager.jsx";
import useFetch from "../lib/useFetch.js";
import {money, moneyShort, num, dateTime} from "../lib/format.js";
import {dashboardApi, reportsApi, transactionsApi} from "../api/endpoints.js";

const PALETTE = ["#008afe", "#001f49", "#7da9e6", "#b6becf"];
const PAGE_SIZE = 10;

export default function DonorDashboard() {
  // Headline + campaign data load once; the transaction log pages independently.
  const summary = useFetch(
    () => Promise.all([dashboardApi.get(), reportsApi.campaigns()]).then(([dash, campaigns]) => ({dash, campaigns})),
    []
  );
  const [page, setPage] = useState(0);
  const log = useFetch(() => transactionsApi.list({limit: PAGE_SIZE, offset: page * PAGE_SIZE}), [page]);

  if (summary.loading) return <Loading label="Loading donor portal…" />;
  if (summary.error) return <ErrorState message={summary.error.message} onRetry={summary.reload} />;

  const {dash, campaigns} = summary.data;

  const allocation = campaigns
    .filter((c) => c.total_spent > 0)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 4)
    .map((c, i) => ({label: c.title, value: c.total_spent, color: PALETTE[i % PALETTE.length]}));
  const totalDeployed = allocation.reduce((s, a) => s + a.value, 0);
  const impactCamps = campaigns.filter((c) => c.status !== "draft").slice(0, 4);

  const txns = log.data?.data || [];
  const total = log.data?.pagination?.total || 0;

  return (
    <div className="h-stack">
      <div className="donor-impact">
        <div className="impact-card">
          <div className="impact-k">Beneficiaries reached</div>
          <div className="impact-v">{num(dash.totals.beneficiaries)}</div>
          <div className="impact-meta">Enrolled households across Somalia</div>
        </div>
        <div className="impact-card">
          <div className="impact-k">Funds deployed</div>
          <div className="impact-v">{moneyShort(dash.totals.transaction_volume)}</div>
          <div className="impact-meta">Redeemed across {campaigns.length} campaigns</div>
        </div>
        <div className="impact-card">
          <div className="impact-k">Voucher transactions</div>
          <div className="impact-v">{num(dash.totals.transactions)}</div>
          <div className="impact-meta">Redemptions recorded to date</div>
        </div>
      </div>

      <div className="h-grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Fund utilization by campaign</div>
              <div className="card-sub">How contributed funds have been deployed</div>
            </div>
          </div>
          {allocation.length === 0 ? (
            <EmptyState title="No funds deployed yet" sub="Utilization appears once vouchers are redeemed." />
          ) : (
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", padding: "16px 20px 20px", gap: 12}}>
              <div style={{display: "grid", placeItems: "center"}}>
                <DonutChart data={allocation} />
              </div>
              <div className="donut-legend">
                {allocation.map((a) => (
                  <div className="legend-row" key={a.label}>
                    <div className="legend-sw" style={{background: a.color}}></div>
                    <span style={{minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{a.label}</span>
                    <span className="v">{moneyShort(a.value)}</span>
                  </div>
                ))}
                <div className="legend-row" style={{borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 2}}>
                  <span style={{fontWeight: 700}}>Total</span>
                  <span className="v">{moneyShort(totalDeployed)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Campaign impact summary</div>
              <div className="card-sub">Top initiatives by funds deployed</div>
            </div>
          </div>
          <div style={{padding: "6px 20px 20px"}}>
            {impactCamps.length === 0 && <EmptyState title="No campaigns yet" />}
            {impactCamps.map((c, i, arr) => (
              <div key={c.id} style={{padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none"}}>
                <div className="h-row between" style={{marginBottom: 10, alignItems: "flex-start", gap: 10}}>
                  <div style={{minWidth: 0}}>
                    <div style={{fontWeight: 600, fontSize: 13.5, lineHeight: 1.3}}>{c.title}</div>
                    <div style={{fontSize: 11.5, color: "var(--ink-50)", marginTop: 4, lineHeight: 1.3}}>
                      {num(c.beneficiary_count)} reached · {c.location || "—"}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <Progress
                  value={c.total_spent}
                  max={c.budget}
                  labelLeft={
                    <span>
                      <span className="td-mono" style={{color: "var(--ink)"}}>{moneyShort(c.total_spent)}</span> of {moneyShort(c.budget)} deployed
                    </span>
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <div>
            <div className="card-title">Full transaction log</div>
            <div className="card-sub">Read-only audit trail of every voucher redemption</div>
          </div>
        </div>
        {log.loading ? (
          <Loading label="Loading transactions…" inline />
        ) : log.error ? (
          <ErrorState message={log.error.message} onRetry={log.reload} />
        ) : txns.length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>TX ID</th>
                    <th>Beneficiary</th>
                    <th>Campaign</th>
                    <th style={{textAlign: "right"}}>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id}>
                      <td className="td-mono td-muted">{t.receipt_code || `TX-${t.id}`}</td>
                      <td className="td-muted">{t.beneficiary_name || `Beneficiary #${t.beneficiary_id}`}</td>
                      <td className="td-muted">{t.campaign_title || `#${t.campaign_id}`}</td>
                      <td className="td-mono" style={{textAlign: "right", fontWeight: 600}}>{money(t.amount)}</td>
                      <td className="td-muted">{dateTime(t.transaction_at)}</td>
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
