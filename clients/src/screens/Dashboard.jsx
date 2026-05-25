// SmartAid — NGO Admin Dashboard. Ported from screens-core.jsx, wired to:
//   GET /dashboard            (headline totals)
//   GET /reports/campaigns    (active-campaign budget consumption)
//   GET /transactions         (recent redemptions + monthly utilization)
//   GET /beneficiaries, /shops (name resolution for the recent table)
import React from "react";
import {Icons} from "../components/icons.jsx";
import {StatusBadge, Progress, Sparkline, Avatar, Loading, ErrorState, EmptyState} from "../components/ui.jsx";
import {LineChart} from "../components/charts.jsx";
import useFetch from "../lib/useFetch.js";
import {money, moneyShort, num, dateTime} from "../lib/format.js";
import {dashboardApi, reportsApi, transactionsApi} from "../api/endpoints.js";

const StatCard = ({label, value, meta, icon: I, spark}) => (
  <div className="stat">
    <div className="stat-label">
      <I size={14} className="stat-icon" />
      {label}
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-meta">{meta}</div>
    {spark && <Sparkline values={spark} />}
  </div>
);

export default function Dashboard() {
  const {data, loading, error, reload} = useFetch(
    () =>
      Promise.all([
        dashboardApi.get(),
        reportsApi.campaigns(),
        transactionsApi.list({limit: 5}),
      ]).then(([dash, campaigns, recentTxns]) => ({dash, campaigns, recent: recentTxns.data})),
    []
  );

  if (loading) return <Loading label="Loading dashboard…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const {dash, campaigns, recent} = data;
  // 6-month series computed server-side so we don't pull the whole ledger.
  const util = {
    months: dash.utilization.map((u) => u.label),
    values: dash.utilization.map((u) => u.total),
  };
  const activeCamps = campaigns.filter((c) => c.status === "active").slice(0, 4);

  return (
    <div className="h-stack">
      <div className="stat-grid">
        <StatCard label="Total beneficiaries" value={num(dash.totals.beneficiaries)} meta="Enrolled households" icon={Icons.Users} />
        <StatCard
          label="Active campaigns"
          value={num(dash.campaigns.active)}
          meta={`${dash.campaigns.draft} draft · ${dash.campaigns.closed} closed`}
          icon={Icons.Megaphone}
        />
        <StatCard
          label="Funds distributed"
          value={money(dash.totals.transaction_volume)}
          meta={`${num(dash.totals.transactions)} voucher redemptions`}
          icon={Icons.Coin}
          spark={util.values.some((v) => v > 0) ? util.values : null}
        />
        <StatCard label="Registered shops" value={num(dash.totals.shops)} meta="Vendor partners" icon={Icons.Shop} />
      </div>

      <div className="h-grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly fund utilization</div>
              <div className="card-sub">Voucher value redeemed across all campaigns</div>
            </div>
            <div className="h-row">
              <button className="chip-select">
                <span className="label">Range</span> Last 6 months <Icons.Chevron className="chevron" size={14} />
              </button>
            </div>
          </div>
          <div className="chart-box">
            <LineChart data={util.values} months={util.months} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Active campaigns</div>
              <div className="card-sub">Budget consumption to date</div>
            </div>
          </div>
          <div style={{padding: "6px 20px 20px"}}>
            {activeCamps.length === 0 && (
              <EmptyState title="No active campaigns" sub="Activate a draft campaign to start distributing vouchers." />
            )}
            {activeCamps.map((c, i) => (
              <div
                key={c.id}
                style={{padding: "14px 0", borderBottom: i < activeCamps.length - 1 ? "1px solid var(--line-soft)" : "none"}}
              >
                <div className="h-row between" style={{marginBottom: 10, alignItems: "flex-start", gap: 10}}>
                  <div style={{minWidth: 0}}>
                    <div style={{fontWeight: 600, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.3}}>{c.title}</div>
                    <div style={{fontSize: 11.5, color: "var(--ink-50)", marginTop: 4, lineHeight: 1.3}}>{c.location || "—"}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <Progress
                  value={c.total_spent}
                  max={c.budget}
                  labelLeft={
                    <span>
                      <span className="td-mono" style={{color: "var(--ink)"}}>{moneyShort(c.total_spent)}</span> / {moneyShort(c.budget)}
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
            <div className="card-title">Recent transactions</div>
            <div className="card-sub">Latest voucher redemptions across all shops</div>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Beneficiary</th>
                <th>Shop</th>
                <th>Campaign</th>
                <th style={{textAlign: "right"}}>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No transactions yet" sub="Redemptions will appear here once shops process vouchers." />
                  </td>
                </tr>
              )}
              {recent.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="name-cell">
                      <Avatar name={t.beneficiary_name || "?"} />
                      <div>
                        <div className="nm">{t.beneficiary_name || `#${t.beneficiary_id}`}</div>
                        <div className="id">{t.receipt_code || `TX-${t.id}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td-strong">{t.shop_name || `#${t.shop_id}`}</td>
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
      </div>
    </div>
  );
}
