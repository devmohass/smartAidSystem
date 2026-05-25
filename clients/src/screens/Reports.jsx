// SmartAid — Reports. Ported from screens-admin.jsx. Templates generate real
// CSVs from the backend report endpoints:
//   GET /reports/campaigns     (donor impact, financial reconciliation)
//   GET /reports/transactions  (transaction audit log)
//   GET /beneficiaries, /shops (registry/directory — admin only)
// "Generated this session" reflects what you actually downloaded; scheduling
// is illustrative (the backend doesn't persist schedules yet).
import React, {useState} from "react";
import {Icons} from "../components/icons.jsx";
import {StatusBadge, Loading, ErrorState, EmptyState, Toast} from "../components/ui.jsx";
import Drawer from "../components/Drawer.jsx";
import useToast from "../lib/useToast.js";
import {dateTime, downloadCsv} from "../lib/format.js";
import {useAuth} from "../auth/AuthContext.jsx";
import {reportsApi, beneficiariesApi, shopsApi} from "../api/endpoints.js";
import {REPORT_TEMPLATES, SCHEDULED} from "../data/reportTemplates.js";

async function buildRows(template, {from, to}) {
  switch (template.run) {
    case "campaigns":
      return reportsApi.campaigns();
    case "transactions":
      return reportsApi.transactions({from: from || undefined, to: to || undefined, limit: 500}).then((r) => r.data);
    case "beneficiaries":
      return beneficiariesApi.list();
    case "shops":
      return shopsApi.list();
    default:
      return null;
  }
}

export default function Reports() {
  const {user} = useAuth();
  const role = user?.role || "admin";
  const templates = REPORT_TEMPLATES.filter((t) => t.roles.includes(role));
  const {toast, show} = useToast();

  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [genErr, setGenErr] = useState(null);
  const [generated, setGenerated] = useState([]);

  const openFor = (t) => {
    setPick(t);
    setGenErr(null);
    setOpen(true);
  };

  const generate = async () => {
    if (!pick) return;
    setGenErr(null);
    if (!pick.run) {
      setGenErr("This report has no data source wired yet.");
      return;
    }
    setBusy(true);
    try {
      const rows = await buildRows(pick, {from, to});
      if (!rows || rows.length === 0) {
        setGenErr("No data matched — nothing to export yet.");
        return;
      }
      downloadCsv(`smartaid-${pick.id}.csv`, rows);
      const entry = {
        id: `RPT-${Date.now().toString().slice(-6)}`,
        name: pick.title,
        type: pick.title.split(" ")[0],
        dt: new Date().toISOString(),
        rows: rows.length,
        format: "CSV",
      };
      setGenerated((g) => [entry, ...g]);
      show(`Generated ${pick.title} (${rows.length} rows)`);
      setOpen(false);
    } catch (err) {
      setGenErr(err.message || "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-stack">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Generate a report</div>
            <div className="card-sub">Pre-built templates export live data straight to CSV</div>
          </div>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: 20}}>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => openFor(t)}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: 18,
                background: "var(--white)",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            >
              <div style={{width: 36, height: 36, borderRadius: 8, background: "var(--blue-50)", color: "var(--blue)", display: "grid", placeItems: "center"}}>
                <t.icon size={18} />
              </div>
              <div style={{fontWeight: 700, fontSize: 14, color: "var(--ink)"}}>{t.title}</div>
              <div style={{fontSize: 12, color: "var(--ink-50)", lineHeight: 1.45, flex: 1}}>{t.desc}</div>
              <div className="h-row between" style={{fontSize: 11, color: "var(--ink-50)", fontWeight: 600}}>
                <span>{t.format}</span>
                <span>{t.run ? "Live data" : "Not wired"}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <div>
            <div className="card-title">Generated this session</div>
            <div className="card-sub">Reports you’ve exported since signing in</div>
          </div>
        </div>
        {generated.length === 0 ? (
          <EmptyState title="No reports yet" sub="Pick a template above to export live data as CSV." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Generated</th>
                  <th style={{textAlign: "right"}}>Rows</th>
                  <th>Format</th>
                </tr>
              </thead>
              <tbody>
                {generated.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="td-strong">{r.name}</div>
                      <div className="id" style={{fontSize: 11, color: "var(--ink-50)", fontFamily: "JetBrains Mono, monospace", marginTop: 2}}>{r.id}</div>
                    </td>
                    <td className="td-muted" style={{whiteSpace: "nowrap"}}>{dateTime(r.dt)}</td>
                    <td className="td-mono" style={{textAlign: "right"}}>{r.rows}</td>
                    <td><span className="badge badge-soft">{r.format}</span></td>
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
            <div className="card-title">Scheduled reports</div>
            <div className="card-sub">Auto-generated and emailed on a cadence</div>
          </div>
        </div>
        <div style={{padding: "0 20px"}}>
          <div className="banner banner-note" style={{margin: "16px 0"}}>
            <Icons.Help size={16} />
            <span>Illustrative — report scheduling isn’t persisted by the backend yet.</span>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Schedule</th>
                <th>Type</th>
                <th>Cadence</th>
                <th>Recipients</th>
                <th>Next run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULED.map((s) => (
                <tr key={s.id}>
                  <td className="td-strong">{s.name}</td>
                  <td className="td-muted">{s.type}</td>
                  <td>
                    <span className="it">
                      <Icons.Calendar size={12} style={{color: "var(--ink-50)"}} /> {s.cadence}
                    </span>
                  </td>
                  <td className="td-muted">{s.recipients}</td>
                  <td className="td-mono td-strong">{s.next}</td>
                  <td><StatusBadge status="active" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={pick ? `Generate: ${pick.title}` : "Generate report"}
        sub={pick?.desc}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={generate} disabled={busy}>
              <Icons.Download size={14} /> {busy ? "Generating…" : "Generate now"}
            </button>
          </>
        }
      >
        {genErr && <div className="form-error">{genErr}</div>}
        {pick?.run === "transactions" && (
          <div className="field-row">
            <div className="field">
              <label>From date</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field">
              <label>To date</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}
        <div className="banner banner-note">
          <Icons.Help size={16} />
          <span>
            {pick?.run
              ? "Generates a CSV from live data and downloads it to your device."
              : "This template isn’t backed by an API endpoint yet."}
          </span>
        </div>
      </Drawer>

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
