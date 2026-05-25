// SmartAid app shell — sidebar + topbar + routed content. Ported from the
// design's app.jsx, with real nav state (React Router) and the signed-in user.
import React from "react";
import {NavLink, Outlet, useLocation} from "react-router-dom";
import {Icons, Wordmark} from "./icons.jsx";
import {useAuth} from "../auth/AuthContext.jsx";
import {NAV, PAGE_META, ROLE_LABELS, initialsOf} from "../lib/nav.js";

function Sidebar({role}) {
  const sections = NAV[role] || NAV.admin;
  const {user, logout} = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Wordmark size={22} />
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-50)",
            marginTop: 6,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Somalia · Workspace
        </div>
      </div>
      <nav className="sidebar-nav">
        {sections.map((sec) => (
          <div key={sec.label}>
            <div className="sidebar-section-label">{sec.label}</div>
            {sec.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}
              >
                <it.icon className="nav-icon" size={18} />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="user-avatar">{initialsOf(user?.name)}</div>
        <div className="user-info">
          <div className="user-name">{user?.name || "—"}</div>
          <div className="user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
        </div>
        <button className="icon-btn" style={{width: 30, height: 30}} title="Sign out" onClick={logout}>
          <Icons.Logout size={14} />
        </button>
      </div>
    </aside>
  );
}

function Topbar({role}) {
  const {pathname} = useLocation();
  const {user} = useAuth();
  const meta = PAGE_META[pathname] || {t: "", s: ""};
  const pt = meta.admin || meta.donor ? meta[role] || meta.admin : meta;
  return (
    <header className="topbar">
      <div style={{minWidth: 0, flexShrink: 0, maxWidth: 360}}>
        <div className="page-title">{pt.t}</div>
        <div className="page-sub">{pt.s}</div>
      </div>
      <div className="topbar-search">
        <Icons.Search size={16} className="search-icon" />
        <input placeholder="Search beneficiaries, campaigns, transactions…" />
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" title="Help">
          <Icons.Help size={16} />
        </button>
        <button className="icon-btn" title="Notifications">
          <Icons.Bell size={16} />
          <span className="dot"></span>
        </button>
        <div className="topbar-avatar">{initialsOf(user?.name)}</div>
      </div>
    </header>
  );
}

export default function AppShell() {
  const {user} = useAuth();
  const role = user?.role === "donor" ? "donor" : "admin";
  return (
    <div className="app">
      <Sidebar role={role} />
      <main className="main">
        <Topbar role={role} />
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
