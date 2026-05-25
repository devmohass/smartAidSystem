// SmartAid — Icons + wordmark. Single-stroke line icons, currentColor.
// Ported verbatim from the design bundle (components.jsx).
import React from "react";

export const Icon = ({d, size = 16, stroke = 1.6, fill, className}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill || "none"}
    stroke={fill ? "none" : "currentColor"}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

export const Icons = {
  Dashboard: (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>} />,
  Users: (p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.7-3.6 3.4-6 6.5-6s5.8 2.4 6.5 6" /><circle cx="17" cy="6.5" r="2.5" /><path d="M15.5 13.5c2.9 0 5.3 1.7 6 4.5" /></>} />,
  Megaphone: (p) => <Icon {...p} d={<><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5h2l-2-5h2l8 4V5L11 9H5a2 2 0 0 0-2 2z" /></>} />,
  Exchange: (p) => <Icon {...p} d={<><path d="M4 7h13M14 4l3 3-3 3M20 17H7M10 20l-3-3 3-3" /></>} />,
  Shop: (p) => <Icon {...p} d={<><path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M8 13h5" /></>} />,
  Wallet: (p) => <Icon {...p} d={<><path d="M3 7a2 2 0 0 1 2-2h11l1.5 3H5a2 2 0 0 0-2 2v0M3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z" /><circle cx="17" cy="14" r="1.2" /></>} />,
  Reports: (p) => <Icon {...p} d={<><path d="M5 21V8l5-5h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><path d="M10 3v5H5" /><path d="M9 14l2 2 4-4" /></>} />,
  Settings: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>} />,
  Search: (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>} />,
  Bell: (p) => <Icon {...p} d={<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>} />,
  Plus: (p) => <Icon {...p} d={<><path d="M12 5v14M5 12h14" /></>} />,
  Filter: (p) => <Icon {...p} d={<><path d="M3 5h18l-7 9v6l-4-2v-4z" /></>} />,
  Download: (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>} />,
  Chevron: (p) => <Icon {...p} d={<><path d="M6 9l6 6 6-6" /></>} />,
  ChevronR: (p) => <Icon {...p} d={<><path d="M9 6l6 6-6 6" /></>} />,
  ChevronL: (p) => <Icon {...p} d={<><path d="M15 18l-6-6 6-6" /></>} />,
  Edit: (p) => <Icon {...p} d={<><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></>} />,
  Trash: (p) => <Icon {...p} d={<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>} />,
  More: (p) => <Icon {...p} d={<><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>} />,
  Phone: (p) => <Icon {...p} d={<><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.4z" /></>} />,
  Mail: (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>} />,
  Lock: (p) => <Icon {...p} d={<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></>} />,
  Pin: (p) => <Icon {...p} d={<><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></>} />,
  Calendar: (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>} />,
  QR: (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M20 14v3M14 20h3M17 17h4v4" /></>} />,
  Eye: (p) => <Icon {...p} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>} />,
  Camera: (p) => <Icon {...p} d={<><path d="M3 7h4l2-3h6l2 3h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="4" /></>} />,
  Upload: (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></>} />,
  Logout: (p) => <Icon {...p} d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>} />,
  Coin: (p) => <Icon {...p} d={<><ellipse cx="12" cy="6" rx="9" ry="3" /><path d="M3 6v6c0 1.7 4 3 9 3s9-1.3 9-3V6M3 12v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" /></>} />,
  ArrowUp: (p) => <Icon {...p} d={<><path d="M7 14l5-5 5 5" /></>} />,
  ArrowDown: (p) => <Icon {...p} d={<><path d="M7 10l5 5 5-5" /></>} />,
  Check: (p) => <Icon {...p} d={<><path d="M5 12l5 5L20 7" /></>} />,
  X: (p) => <Icon {...p} d={<><path d="M6 6l12 12M18 6L6 18" /></>} />,
  Help: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2" /><circle cx="12" cy="17" r="0.8" fill="currentColor" /></>} />,
};

export const Wordmark = ({size = 22, className = ""}) => (
  <span className={`wordmark ${className}`} style={{fontSize: size}}>
    <span className="w-smart">Smart</span>
    <span className="w-aid">Aid</span>
  </span>
);

export const LogoMark = ({size = 28}) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#008afe" />
    <path
      d="M21 11.4c-1.1-.9-2.6-1.4-4.5-1.4-3 0-5.2 1.4-5.2 3.5 0 1.7 1.4 2.7 4.1 3.2l1.6.3c2 .4 2.6.8 2.6 1.6 0 1-1.1 1.6-2.8 1.6-1.6 0-3-.5-4.3-1.4l-1.5 2.3c1.6 1.1 3.6 1.7 5.7 1.7 3.4 0 5.7-1.5 5.7-3.9 0-1.9-1.4-2.9-4.4-3.5l-1.6-.3c-1.6-.3-2.3-.7-2.3-1.4 0-.9 1-1.4 2.5-1.4 1.3 0 2.5.4 3.5 1.1z"
      fill="#fff"
    />
  </svg>
);
