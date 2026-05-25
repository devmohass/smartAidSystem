// SmartAid — top-level routing + auth gating.
import React from "react";
import {Routes, Route, Navigate, useLocation} from "react-router-dom";
import {useAuth} from "./auth/AuthContext.jsx";
import AppShell from "./components/AppShell.jsx";
import {Loading} from "./components/ui.jsx";
import {Wordmark, Icons} from "./components/icons.jsx";

import Login from "./screens/Login.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import DonorDashboard from "./screens/DonorDashboard.jsx";
import Beneficiaries from "./screens/Beneficiaries.jsx";
import Campaigns from "./screens/Campaigns.jsx";
import Transactions from "./screens/Transactions.jsx";
import Shops from "./screens/Shops.jsx";
import Wallet from "./screens/Wallet.jsx";
import Reports from "./screens/Reports.jsx";

function FullPageLoading() {
  return (
    <div style={{height: "100vh", display: "grid", placeItems: "center"}}>
      <Loading label="Loading SmartAid…" />
    </div>
  );
}

// Admin-only routes redirect everyone else back to the dashboard.
function AdminOnly({children}) {
  const {user} = useAuth();
  return user?.role === "admin" ? children : <Navigate to="/" replace />;
}

// The shop_manager role exists in the backend but this portal targets NGO
// admins and donors. Give shop managers a clear message instead of a broken UI.
function ShopManagerNotice() {
  const {user, logout} = useAuth();
  return (
    <div className="login-page">
      <div className="login-card" style={{textAlign: "center"}}>
        <div className="login-brand">
          <Wordmark size={30} />
        </div>
        <div className="login-title">Shop manager access</div>
        <div className="login-sub">
          Hi {user?.name}. The web portal is for NGO admins and donors. Shop managers
          process voucher redemptions through the till app, not here.
        </div>
        <button className="btn btn-ghost btn-lg" style={{width: "100%"}} onClick={logout}>
          <Icons.Logout size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const {status, user} = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoading />;

  if (status !== "authed") {
    // Guests can only see the login screen.
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace state={{from: location}} />} />
      </Routes>
    );
  }

  if (user?.role === "shop_manager") return <ShopManagerNotice />;

  const isDonor = user?.role === "donor";

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppShell />}>
        <Route index element={isDonor ? <DonorDashboard /> : <Dashboard />} />
        <Route path="/beneficiaries" element={<AdminOnly><Beneficiaries /></AdminOnly>} />
        <Route path="/campaigns" element={<AdminOnly><Campaigns /></AdminOnly>} />
        <Route path="/transactions" element={<AdminOnly><Transactions /></AdminOnly>} />
        <Route path="/shops" element={<AdminOnly><Shops /></AdminOnly>} />
        <Route path="/wallet" element={<AdminOnly><Wallet /></AdminOnly>} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
