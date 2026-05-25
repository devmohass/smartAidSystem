// SmartAid — Campaign management. Ported from screens-mgmt.jsx, wired to:
//   GET  /reports/campaigns        (cards with budget consumption + counts)
//   POST /campaigns                (create; lands as 'draft')
//   PUT  /campaigns/:id/status     ('active' funds from NGO wallet, 'closed' refunds)
import React, {useState} from "react";
import {Icons} from "../components/icons.jsx";
import {StatusBadge, Progress, Loading, ErrorState, EmptyState, Toast} from "../components/ui.jsx";
import Drawer from "../components/Drawer.jsx";
import useFetch from "../lib/useFetch.js";
import useToast from "../lib/useToast.js";
import {moneyShort, num, dateShort} from "../lib/format.js";
import {reportsApi, campaignsApi} from "../api/endpoints.js";

const EMPTY_FORM = {title: "", location: "", start_date: "", end_date: "", budget: ""};
const FILTERS = [["all", "All"], ["active", "Active"], ["draft", "Draft"], ["closed", "Closed"]];

export default function Campaigns() {
  const {data: rows, loading, error, reload} = useFetch(() => reportsApi.campaigns(), []);
  const {toast, show} = useToast();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const setField = (k) => (e) => setForm((f) => ({...f, [k]: e.target.value}));
  const list = (rows || []).filter((c) => filter === "all" || c.status === filter);

  const closeDrawer = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setFormErr(null);
  };

  const submit = async (launch) => {
    setFormErr(null);
    if (!form.title.trim() || !form.start_date || !form.end_date || !form.budget) {
      setFormErr("Title, start date, end date and budget are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await campaignsApi.create({
        title: form.title.trim(),
        location: form.location.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        budget: Number(form.budget),
      });
      if (launch) {
        await campaignsApi.changeStatus(created.id, "active");
        show(`Launched ${created.title}`);
      } else {
        show(`Saved draft: ${created.title}`);
      }
      closeDrawer();
      reload();
    } catch (err) {
      setFormErr(err.message || "Could not create campaign.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (c, status) => {
    setBusyId(c.id);
    try {
      await campaignsApi.changeStatus(c.id, status);
      show(status === "active" ? `Activated ${c.title}` : `Closed ${c.title}`);
      reload();
    } catch (err) {
      show(err.message || "Status change failed", "err");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-stack">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="seg" style={{width: "auto", gridTemplateColumns: "repeat(4, auto)"}}>
            {FILTERS.map(([k, l]) => (
              <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)} style={{padding: "0 16px"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="h-row">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Icons.Plus size={14} /> Create campaign
          </button>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading campaigns…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            title={filter === "all" ? "No campaigns yet" : `No ${filter} campaigns`}
            sub={filter === "all" ? "Create your first budgeted voucher program." : "Try a different filter."}
          />
        </div>
      ) : (
        <div className="cards-grid">
          {list.map((c) => (
            <div key={c.id} className="card campaign-card">
              <div className="cc-head">
                <div className="h-row between" style={{alignItems: "flex-start"}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div className="cc-title">{c.title}</div>
                    <div className="cc-loc">
                      <Icons.Pin size={12} /> {c.location || "—"}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
              <div className="cc-body">
                <Progress
                  value={c.total_spent}
                  max={c.budget}
                  labelLeft={<span style={{color: "var(--ink-50)"}}>Budget used</span>}
                  labelRight={
                    <span>
                      <span style={{color: "var(--ink)"}}>{moneyShort(c.total_spent)}</span>{" "}
                      <span style={{color: "var(--ink-50)"}}>/ {moneyShort(c.budget)}</span>
                    </span>
                  }
                />
                <div className="cc-meta">
                  <div>
                    <div className="cc-meta-k">Period</div>
                    <div className="cc-meta-v" style={{fontSize: 12}}>{dateShort(c.start_date)} → {dateShort(c.end_date)}</div>
                  </div>
                  <div>
                    <div className="cc-meta-k">Beneficiaries</div>
                    <div className="cc-meta-v">{num(c.beneficiary_count)}</div>
                  </div>
                  <div>
                    <div className="cc-meta-k">Transactions</div>
                    <div className="cc-meta-v">{num(c.transaction_count)}</div>
                  </div>
                  <div>
                    <div className="cc-meta-k">Campaign ID</div>
                    <div className="cc-meta-v td-mono" style={{fontSize: 12}}>CMP-{String(c.id).padStart(4, "0")}</div>
                  </div>
                </div>
              </div>
              <div className="cc-foot">
                <span style={{fontSize: 12, color: "var(--ink-50)", fontWeight: 600}}>
                  {moneyShort(c.total_remaining_in_wallets)} in wallets
                </span>
                {c.status === "draft" && (
                  <button className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => changeStatus(c, "active")}>
                    {busyId === c.id ? "…" : "Activate"} <Icons.ChevronR size={12} />
                  </button>
                )}
                {c.status === "active" && (
                  <button className="btn btn-ghost btn-sm" disabled={busyId === c.id} onClick={() => changeStatus(c, "closed")}>
                    {busyId === c.id ? "…" : "Close"}
                  </button>
                )}
                {c.status === "closed" && <span className="badge badge-outline">Closed</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={open}
        onClose={closeDrawer}
        title="Create campaign"
        sub="Define a budgeted voucher program. Enroll beneficiaries afterwards."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => submit(false)} disabled={saving}>
              Save as draft
            </button>
            <button className="btn btn-primary" onClick={() => submit(true)} disabled={saving}>
              <Icons.Check size={14} /> {saving ? "Working…" : "Launch campaign"}
            </button>
          </>
        }
      >
        {formErr && <div className="form-error">{formErr}</div>}
        <div className="field">
          <label>Campaign title</label>
          <input placeholder="e.g. Drought Relief — Lower Shabelle" value={form.title} onChange={setField("title")} />
        </div>
        <div className="field">
          <label>Location / Region</label>
          <input placeholder="e.g. Lower Shabelle Region" value={form.location} onChange={setField("location")} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Start date</label>
            <input type="date" value={form.start_date} onChange={setField("start_date")} />
          </div>
          <div className="field">
            <label>End date</label>
            <input type="date" value={form.end_date} onChange={setField("end_date")} />
          </div>
        </div>
        <div className="field">
          <label>Total budget (USD)</label>
          <input type="number" min="1" placeholder="120000" value={form.budget} onChange={setField("budget")} />
        </div>
        <div className="banner banner-note">
          <Icons.Help size={16} />
          <span>Launching funds the budget from your NGO wallet — it must hold at least the budget amount.</span>
        </div>
      </Drawer>

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
