// SmartAid — NGO wallet. Ported from screens-core.jsx, wired to:
//   GET /dashboard          (real account aggregates)
//   GET /reports/campaigns  (per-campaign budget deductions)
// API gap: the per-entry ledger (ngo_account_transactions) has no list
// endpoint yet, so deposit history and itemized refunds are shown as notes.
import React from "react";
import {Icons} from "../components/icons.jsx";
import {Loading, ErrorState, EmptyState} from "../components/ui.jsx";
import useFetch from "../lib/useFetch.js";
import {money, moneyShort, dateShort} from "../lib/format.js";
import {dashboardApi, reportsApi} from "../api/endpoints.js";

export default function Wallet() {
  const {data, loading, error, reload} = useFetch(
    () => Promise.all([dashboardApi.get(), reportsApi.campaigns()]).then(([dash, campaigns]) => ({dash, campaigns})),
    []
  );

  if (loading) return <Loading label="Loading wallet…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const {dash, campaigns} = data;
  const acct = dash.ngo_accounts;
  const deductions = campaigns.filter((c) => c.status !== "draft");
  const closed = campaigns.filter((c) => c.status === "closed");

  return (
    <div className="h-stack">
      <div className="wallet-hero">
        <div>
          <div className="wh-label">Available balance</div>
          <div className="wh-value">{money(acct.total_balance)}</div>
          <div className="wh-meta">NGO virtual account · USD denominated</div>
        </div>
        <div className="wh-actions">
          <button className="wh-btn ghost">Reconcile</button>
          <button className="wh-btn">
            <Icons.Plus size={14} style={{verticalAlign: -2}} /> Record deposit
          </button>
        </div>
      </div>

      <div className="h-grid-3">
        <div className="stat">
          <div className="stat-label">
            <Icons.ArrowDown size={14} className="stat-icon" /> Total deposits
          </div>
          <div className="stat-value">{moneyShort(acct.total_deposits)}</div>
          <div className="stat-meta">Funding received into the account</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Icons.ArrowUp size={14} className="stat-icon" /> Allocated to campaigns
          </div>
          <div className="stat-value">{moneyShort(acct.total_funded)}</div>
          <div className="stat-meta">{deductions.length} funded campaigns</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Icons.Exchange size={14} className="stat-icon" /> Returned (unspent)
          </div>
          <div className="stat-value">{moneyShort(acct.total_refunded)}</div>
          <div className="stat-meta">{closed.length} closed campaigns reconciled</div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <div>
            <div className="card-title">Deposit history</div>
            <div className="card-sub">All funding received into the operating account</div>
          </div>
        </div>
        <div style={{padding: 20}}>
          <div className="banner banner-note">
            <Icons.Help size={16} />
            <span>
              The deposit ledger isn’t exposed by the API yet (no <span className="td-mono">GET /ngo-account/transactions</span> endpoint).
              Total deposited to date: <strong>{money(acct.total_deposits)}</strong>.
            </span>
          </div>
        </div>
      </div>

      <div className="h-grid-2">
        <div className="card card-flush">
          <div className="card-header">
            <div>
              <div className="card-title">Campaign budget deductions</div>
              <div className="card-sub">Funds allocated from the wallet at activation</div>
            </div>
          </div>
          {deductions.length === 0 ? (
            <EmptyState title="No allocations yet" sub="Activating a campaign deducts its budget here." />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th style={{textAlign: "right"}}>Allocated</th>
                    <th>Period start</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="td-strong">{c.title}</div>
                        <div className="id" style={{fontSize: 11, color: "var(--ink-50)", fontFamily: "JetBrains Mono, monospace"}}>
                          CMP-{String(c.id).padStart(4, "0")}
                        </div>
                      </td>
                      <td className="td-mono" style={{textAlign: "right", fontWeight: 700, color: "var(--ink)"}}>
                        −{money(c.budget).slice(1)}
                      </td>
                      <td className="td-muted">{dateShort(c.start_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-flush">
          <div className="card-header">
            <div>
              <div className="card-title">Returned balances</div>
              <div className="card-sub">Unspent funds from closed campaigns</div>
            </div>
          </div>
          {closed.length === 0 ? (
            <EmptyState title="No closed campaigns" sub="Closing an active campaign refunds unspent wallet balances." />
          ) : (
            <div style={{padding: 6}}>
              {closed.map((c, i) => (
                <div
                  key={c.id}
                  style={{padding: "14px 14px", borderBottom: i < closed.length - 1 ? "1px solid var(--line-soft)" : "none"}}
                >
                  <div className="h-row between">
                    <div>
                      <div className="td-strong" style={{fontSize: 13.5}}>{c.title}</div>
                      <div style={{fontSize: 11.5, color: "var(--ink-50)", marginTop: 2}}>
                        Closed · budget {moneyShort(c.budget)}
                      </div>
                    </div>
                    <div className="td-mono" style={{fontWeight: 700, color: "var(--ink-50)", fontSize: 13}}>
                      see total above
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
