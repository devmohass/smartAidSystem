// Catches render-time errors in any screen so one broken component doesn't
// blank the whole app. Class component because hooks can't implement this.
import React from "react";
import {Wordmark} from "./icons.jsx";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error) {
    return {error};
  }

  componentDidCatch(error, info) {
    // Surface for debugging; in production this would go to a logging service.
    console.error("Render error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="login-page">
        <div className="login-card" style={{textAlign: "center"}}>
          <div className="login-brand">
            <Wordmark size={30} />
          </div>
          <div className="login-title">Something went wrong</div>
          <div className="login-sub">
            This screen hit an unexpected error. Reloading usually clears it.
          </div>
          <button className="btn btn-primary btn-lg" style={{width: "100%"}} onClick={() => window.location.reload()}>
            Reload SmartAid
          </button>
        </div>
      </div>
    );
  }
}
