// SmartAid — slide-in drawer primitive. Ported from the design (screens-mgmt.jsx).
import React from "react";
import {Icons} from "./icons.jsx";

export default function Drawer({open, onClose, title, sub, children, footer}) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{title}</div>
            {sub && <div className="drawer-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}
