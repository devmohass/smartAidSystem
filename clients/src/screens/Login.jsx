// SmartAid — Login. Ported from the design (screens-core.jsx) and wired to
// POST /api/auth/login. The role segmented control prefills demo credentials;
// the actual role comes from the authenticated user record (the JWT).
import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Icons, Wordmark} from "../components/icons.jsx";
import {useAuth} from "../auth/AuthContext.jsx";

const DEMO = {
  admin: {email: "admin@smartaid.com", password: "admin123"},
  donor: {email: "", password: ""},
};

export default function Login() {
  const {login} = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState(DEMO.admin.email);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickRole = (r) => {
    setRole(r);
    setEmail(DEMO[r].email);
    setPw(DEMO[r].password);
    setError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), pw);
      navigate("/", {replace: true});
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <Wordmark size={32} />
          <div className="login-tag">Humanitarian voucher platform</div>
        </div>
        <div className="login-title">Sign in to your workspace</div>
        <div className="login-sub">Securely manage aid distribution across Somalia.</div>

        <form className="login-form" onSubmit={onSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label>Sign in as</label>
            <div className="seg">
              <button type="button" className={role === "admin" ? "on" : ""} onClick={() => pickRole("admin")}>
                <Icons.Users size={14} /> NGO Admin
              </button>
              <button type="button" className={role === "donor" ? "on" : ""} onClick={() => pickRole("donor")}>
                <Icons.Coin size={14} /> Donor
              </button>
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg"
            type="submit"
            style={{width: "100%", marginTop: 6}}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"} <Icons.ChevronR size={14} />
          </button>
        </form>
        <div className="login-foot">
          Demo admin: <span className="td-mono">admin@smartaid.com / admin123</span>
        </div>
      </div>
    </div>
  );
}
