// SmartAid — Shop management. Server-paginated + searched. Wired to:
//   GET    /shops?q&limit&offset   (rows include tx_count + total_disbursed)
//   GET    /shops/:id/managers     (assigned manager per shop on the page)
//   GET    /dashboard              (stable headline stats)
//   POST   /shops, PUT /shops/:id, DELETE /shops/:id
// The row drawer runs in three modes: view (read-only), edit, create.
import React, {useEffect, useState} from "react";
import {Icons} from "../components/icons.jsx";
import {StatusBadge, Loading, ErrorState, EmptyState, Toast} from "../components/ui.jsx";
import Drawer from "../components/Drawer.jsx";
import Pager from "../components/Pager.jsx";
import useFetch from "../lib/useFetch.js";
import useToast from "../lib/useToast.js";
import {money, num, dateShort} from "../lib/format.js";
import {shopsApi, dashboardApi} from "../api/endpoints.js";

const PAGE_SIZE = 12;
const shopCode = (id) => `SHP-${String(id).padStart(3, "0")}`;
const initials = (s = "") => s.split(/\W+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase() || "?";
const toForm = (s) => ({name: s?.name ?? "", location: s?.location ?? "", owner_name: s?.owner_name ?? ""});

export default function Shops() {
  const {toast, show} = useToast();
  const stats = useFetch(() => dashboardApi.get(), []);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(id);
  }, [qInput]);
  useEffect(() => setPage(0), [q]);

  const {data, loading, error, reload} = useFetch(async () => {
    const res = await shopsApi.list({q: q || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE});
    const shops = res.data;
    const managerLists = await Promise.all(shops.map((s) => shopsApi.managers(s.id).catch(() => [])));
    const managersByShop = new Map();
    shops.forEach((s, i) => managersByShop.set(s.id, managerLists[i]));
    return {shops, pagination: res.pagination, managersByShop};
  }, [q, page]);

  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(toForm(null));
  const [formErr, setFormErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const setField = (k) => (e) => setForm((f) => ({...f, [k]: e.target.value}));

  const openCreate = () => {
    setForm(toForm(null));
    setFormErr(null);
    setDrawer({mode: "create", row: null});
  };
  const openView = (s) => {
    setForm(toForm(s));
    setFormErr(null);
    setDrawer({mode: "view", row: s});
  };
  const openEdit = (s) => {
    setForm(toForm(s));
    setFormErr(null);
    setDrawer({mode: "edit", row: s});
  };
  const close = () => {
    setDrawer(null);
    setFormErr(null);
  };

  const onDelete = async (s) => {
    if (!window.confirm(`Remove ${s.name} from active shops? Its transaction history is retained for audit.`)) return;
    setDeletingId(s.id);
    try {
      await shopsApi.remove(s.id);
      show(`Removed ${s.name}`);
      reload();
    } catch (err) {
      show(err.message || "Could not remove shop.", "err");
    } finally {
      setDeletingId(null);
    }
  };

  const submit = async () => {
    setFormErr(null);
    if (!form.name.trim()) {
      setFormErr("Shop name is required.");
      return;
    }
    setSaving(true);
    try {
      if (drawer.mode === "edit") {
        const updated = await shopsApi.update(drawer.row.id, {
          name: form.name.trim(),
          location: form.location.trim() || null,
          owner_name: form.owner_name.trim() || null,
        });
        show(`Updated ${updated.name}`);
      } else {
        const body = {name: form.name.trim()};
        if (form.location.trim()) body.location = form.location.trim();
        if (form.owner_name.trim()) body.owner_name = form.owner_name.trim();
        const created = await shopsApi.create(body);
        show(`Added ${created.name}`);
      }
      close();
      reload();
    } catch (err) {
      setFormErr(err.message || "Could not save shop.");
    } finally {
      setSaving(false);
    }
  };

  const shops = data?.shops || [];
  const total = data?.pagination?.total || 0;
  const managersByShop = data?.managersByShop || new Map();
  const dash = stats.data;

  const mode = drawer?.mode;
  const isView = mode === "view";
  const drawerTitle = mode === "edit" ? "Edit shop" : mode === "view" ? drawer.row.name : "Add new shop";
  const drawerSub =
    mode === "edit" || mode === "view"
      ? shopCode(drawer.row.id)
      : "Register a vendor partner. Assign a shop manager from the Users area.";
  const viewMgrs = isView ? managersByShop.get(drawer.row.id) || [] : [];

  return (
    <div className="h-stack">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-search">
            <Icons.Search size={16} className="search-icon" />
            <input placeholder="Search shops, owners, or locations…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </div>
        </div>
        <div className="h-row">
          <button className="btn btn-primary" onClick={openCreate}>
            <Icons.Plus size={14} /> Add shop
          </button>
        </div>
      </div>

      <div className="h-grid-3">
        <div className="stat">
          <div className="stat-label">Partner shops</div>
          <div className="stat-value">{dash ? num(dash.totals.shops) : "—"}</div>
          <div className="stat-meta">Vendor partners accepting vouchers</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total redemptions</div>
          <div className="stat-value">{dash ? num(dash.totals.transactions) : "—"}</div>
          <div className="stat-meta">Across all shops</div>
        </div>
        <div className="stat">
          <div className="stat-label">Disbursed to shops</div>
          <div className="stat-value">{dash ? money(dash.totals.transaction_volume) : "—"}</div>
          <div className="stat-meta">Total voucher value redeemed</div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <div>
            <div className="card-title">Registered shops</div>
            <div className="card-sub">Vendor partners accepting SmartAid vouchers</div>
          </div>
        </div>
        {loading ? (
          <Loading label="Loading shops…" inline />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : shops.length === 0 ? (
          <EmptyState
            title={q ? "No matches" : "No shops yet"}
            sub={q ? "Try a different search." : "Add a vendor partner to start accepting vouchers."}
          />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Location</th>
                    <th>Owner</th>
                    <th>Assigned manager</th>
                    <th style={{textAlign: "right"}}>Total transactions</th>
                    <th>Status</th>
                    <th style={{width: 80}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((s) => {
                    const mgrs = managersByShop.get(s.id) || [];
                    const mgr = mgrs[0];
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="name-cell">
                            <div className="photo-cell" style={{borderRadius: 8}}>
                              <Icons.Shop size={16} />
                            </div>
                            <div>
                              <div className="nm">{s.name}</div>
                              <div className="id">{shopCode(s.id)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="it">
                            <Icons.Pin size={12} style={{color: "var(--ink-50)"}} /> {s.location || "—"}
                          </span>
                        </td>
                        <td className="td-strong">{s.owner_name || "—"}</td>
                        <td>
                          {mgr ? (
                            <div className="h-row" style={{gap: 8}}>
                              <div className="photo-cell" style={{width: 22, height: 22, fontSize: 10}}>{initials(mgr.name)}</div>
                              <span>{mgr.name}{mgrs.length > 1 ? ` +${mgrs.length - 1}` : ""}</span>
                            </div>
                          ) : (
                            <span className="td-muted">Unassigned</span>
                          )}
                        </td>
                        <td className="td-mono td-strong" style={{textAlign: "right"}}>{num(s.tx_count)}</td>
                        <td>
                          <StatusBadge status="active" />
                        </td>
                        <td>
                          <div className="row-actions">
                            <button title="View" onClick={() => openView(s)}>
                              <Icons.Eye size={14} />
                            </button>
                            <button title="Edit" onClick={() => openEdit(s)}>
                              <Icons.Edit size={14} />
                            </button>
                            <button className="danger" title="Delete" disabled={deletingId === s.id} onClick={() => onDelete(s)}>
                              <Icons.Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} noun="shops" />
          </>
        )}
      </div>

      <Drawer
        open={!!drawer}
        onClose={close}
        title={drawerTitle}
        sub={drawerSub}
        footer={
          isView ? (
            <>
              <button className="btn btn-ghost" onClick={close}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => setDrawer({mode: "edit", row: drawer.row})}>
                <Icons.Edit size={14} /> Edit
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={close} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                <Icons.Check size={14} /> {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add shop"}
              </button>
            </>
          )
        }
      >
        {formErr && <div className="form-error">{formErr}</div>}

        {isView ? (
          <>
            <div className="field">
              <label>Location</label>
              <input readOnly value={drawer.row.location || "—"} />
            </div>
            <div className="field">
              <label>Owner</label>
              <input readOnly value={drawer.row.owner_name || "—"} />
            </div>
            <div className="field">
              <label>Assigned manager{viewMgrs.length > 1 ? "s" : ""}</label>
              <input readOnly value={viewMgrs.length ? viewMgrs.map((m) => m.name).join(", ") : "Unassigned"} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Total transactions</label>
                <input readOnly value={num(drawer.row.tx_count)} />
              </div>
              <div className="field">
                <label>Registered</label>
                <input readOnly value={dateShort(drawer.row.created_at)} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Shop name</label>
              <input placeholder="e.g. Bariis & Basto Co." value={form.name} onChange={setField("name")} />
            </div>
            <div className="field">
              <label>Location</label>
              <input placeholder="e.g. Hodan, Mogadishu" value={form.location} onChange={setField("location")} />
            </div>
            <div className="field">
              <label>Owner full name</label>
              <input placeholder="e.g. Saido Mohamed" value={form.owner_name} onChange={setField("owner_name")} />
            </div>
          </>
        )}
      </Drawer>

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
