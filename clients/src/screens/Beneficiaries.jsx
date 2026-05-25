// SmartAid — Beneficiary management. Server-paginated + searched. Wired to:
//   GET    /beneficiaries?q&limit&offset   (table)
//   POST   /beneficiaries                  (register; qr_code generated server-side)
//   PUT    /beneficiaries/:id               (edit)
//   DELETE /beneficiaries/:id               (soft delete)
// The row drawer runs in three modes: view (read-only), edit, create.
import React, {useEffect, useState} from "react";
import {Icons} from "../components/icons.jsx";
import {Avatar, Loading, ErrorState, EmptyState, Toast} from "../components/ui.jsx";
import Drawer from "../components/Drawer.jsx";
import Pager from "../components/Pager.jsx";
import useFetch from "../lib/useFetch.js";
import useToast from "../lib/useToast.js";
import {dateShort} from "../lib/format.js";
import {beneficiariesApi} from "../api/endpoints.js";

const PAGE_SIZE = 12;
const benCode = (id) => `BEN-${String(id).padStart(5, "0")}`;
const toForm = (b) => ({
  name: b?.name ?? "",
  phone_number: b?.phone_number ?? "",
  family_size: b?.family_size != null ? String(b.family_size) : "",
  location: b?.location ?? "",
});

export default function Beneficiaries() {
  const {toast, show} = useToast();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(id);
  }, [qInput]);
  useEffect(() => setPage(0), [q]);

  const {data, loading, error, reload} = useFetch(
    () => beneficiariesApi.list({q: q || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE}),
    [q, page]
  );
  const rows = data?.data || [];
  const total = data?.pagination?.total || 0;

  // drawer: null | { mode: 'create'|'edit'|'view', row }
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
  const openView = (b) => {
    setForm(toForm(b));
    setFormErr(null);
    setDrawer({mode: "view", row: b});
  };
  const openEdit = (b) => {
    setForm(toForm(b));
    setFormErr(null);
    setDrawer({mode: "edit", row: b});
  };
  const close = () => {
    setDrawer(null);
    setFormErr(null);
  };

  const onDelete = async (b) => {
    if (!window.confirm(`Remove ${b.name} from active records? Their transaction history is retained for audit.`)) return;
    setDeletingId(b.id);
    try {
      await beneficiariesApi.remove(b.id);
      show(`Removed ${b.name}`);
      reload();
    } catch (err) {
      show(err.message || "Could not remove beneficiary.", "err");
    } finally {
      setDeletingId(null);
    }
  };

  const familySize = () => {
    if (form.family_size === "") return undefined;
    const n = Number(form.family_size);
    if (!Number.isInteger(n) || n < 1) throw new Error("Family size must be a whole number of 1 or more.");
    return n;
  };

  const submit = async () => {
    setFormErr(null);
    if (!form.name.trim() || !form.phone_number.trim()) {
      setFormErr("Name and phone number are required.");
      return;
    }
    let fs;
    try {
      fs = familySize();
    } catch (e) {
      setFormErr(e.message);
      return;
    }
    setSaving(true);
    try {
      if (drawer.mode === "edit") {
        const body = {
          name: form.name.trim(),
          phone_number: form.phone_number.trim(),
          location: form.location.trim() || null,
        };
        if (fs !== undefined) body.family_size = fs;
        const updated = await beneficiariesApi.update(drawer.row.id, body);
        show(`Updated ${updated.name}`);
      } else {
        const body = {name: form.name.trim(), phone_number: form.phone_number.trim()};
        if (form.location.trim()) body.location = form.location.trim();
        if (fs !== undefined) body.family_size = fs;
        const created = await beneficiariesApi.create(body);
        show(`Registered ${created.name}`);
      }
      close();
      reload();
    } catch (err) {
      setFormErr(err.message || "Could not save beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  const mode = drawer?.mode;
  const isView = mode === "view";
  const drawerTitle =
    mode === "edit" ? "Edit beneficiary" : mode === "view" ? drawer.row.name : "Register new beneficiary";
  const drawerSub =
    mode === "edit" || mode === "view"
      ? benCode(drawer.row.id)
      : "Issue a QR voucher card — the code is generated automatically";

  return (
    <div className="h-stack">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-search">
            <Icons.Search size={16} className="search-icon" />
            <input placeholder="Search by name, phone, or location…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </div>
        </div>
        <div className="h-row">
          <button className="btn btn-primary" onClick={openCreate}>
            <Icons.Plus size={14} /> Register beneficiary
          </button>
        </div>
      </div>

      <div className="card card-flush">
        {loading ? (
          <Loading label="Loading beneficiaries…" inline />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q ? "No matches" : "No beneficiaries yet"}
            sub={q ? "Try a different search term." : "Register a household to issue its first voucher card."}
          />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>Phone</th>
                    <th style={{width: 60}}>QR</th>
                    <th>Location</th>
                    <th style={{textAlign: "center"}}>Family size</th>
                    <th style={{width: 80}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="name-cell">
                          <Avatar name={b.name} />
                          <div>
                            <div className="nm">{b.name}</div>
                            <div className="id">{benCode(b.id)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td-mono">{b.phone_number}</td>
                      <td>
                        <div className="qr-cell" title={b.qr_code}>
                          <Icons.QR size={16} />
                        </div>
                      </td>
                      <td>
                        <span className="it">
                          <Icons.Pin size={12} style={{color: "var(--ink-50)"}} /> {b.location || "—"}
                        </span>
                      </td>
                      <td style={{textAlign: "center"}} className="td-mono td-strong">
                        {b.family_size ?? "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button title="View" onClick={() => openView(b)}>
                            <Icons.Eye size={14} />
                          </button>
                          <button title="Edit" onClick={() => openEdit(b)}>
                            <Icons.Edit size={14} />
                          </button>
                          <button className="danger" title="Delete" disabled={deletingId === b.id} onClick={() => onDelete(b)}>
                            <Icons.Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} noun="beneficiaries" />
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
                <Icons.Check size={14} />{" "}
                {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Register & issue QR"}
              </button>
            </>
          )
        }
      >
        {formErr && <div className="form-error">{formErr}</div>}

        {isView ? (
          <>
            <div className="field">
              <label>QR voucher code</label>
              <input readOnly value={drawer.row.qr_code} style={{fontFamily: "JetBrains Mono, monospace"}} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Phone number</label>
                <input readOnly value={drawer.row.phone_number} />
              </div>
              <div className="field">
                <label>Family size</label>
                <input readOnly value={drawer.row.family_size ?? "—"} />
              </div>
            </div>
            <div className="field">
              <label>Location</label>
              <input readOnly value={drawer.row.location || "—"} />
            </div>
            <div className="field">
              <label>Registered</label>
              <input readOnly value={dateShort(drawer.row.created_at)} />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Full name</label>
              <input placeholder="e.g. Amina Hassan" value={form.name} onChange={setField("name")} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Phone number</label>
                <input placeholder="+252 …" value={form.phone_number} onChange={setField("phone_number")} />
              </div>
              <div className="field">
                <label>Family size</label>
                <input type="number" min="1" placeholder="6" value={form.family_size} onChange={setField("family_size")} />
              </div>
            </div>
            <div className="field">
              <label>Location</label>
              <input
                placeholder="e.g. Hodan, Mogadishu"
                value={form.location}
                onChange={setField("location")}
                list="benefic-locations"
              />
              <datalist id="benefic-locations">
                <option value="Hodan, Mogadishu" />
                <option value="Wadajir, Mogadishu" />
                <option value="Baidoa, Bay" />
                <option value="Kismayo, Lower Juba" />
                <option value="Garowe, Nugaal" />
              </datalist>
            </div>
            {mode === "create" && (
              <div className="banner banner-note">
                <Icons.Help size={16} />
                <span>A unique QR voucher code is generated automatically on registration.</span>
              </div>
            )}
          </>
        )}
      </Drawer>

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
