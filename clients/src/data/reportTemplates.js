// Report templates for the Reports screen. `run` names the backend source the
// CSV is built from (null = no endpoint yet). `roles` limits visibility, since
// donors cannot read /beneficiaries or /shops.
import {Icons} from "../components/icons.jsx";

export const REPORT_TEMPLATES = [
  {
    id: "donor",
    icon: Icons.Coin,
    title: "Donor impact report",
    desc: "Funds deployed, beneficiaries reached, and spend per campaign.",
    format: "CSV",
    run: "campaigns",
    roles: ["admin", "donor"],
  },
  {
    id: "audit",
    icon: Icons.Reports,
    title: "Transaction audit log",
    desc: "Every voucher redemption with balances and timestamps.",
    format: "CSV",
    run: "transactions",
    roles: ["admin", "donor"],
  },
  {
    id: "finance",
    icon: Icons.Wallet,
    title: "Financial reconciliation",
    desc: "Per-campaign budget, allocated, spent and remaining balances.",
    format: "CSV",
    run: "campaigns",
    roles: ["admin", "donor"],
  },
  {
    id: "beneficiary",
    icon: Icons.Users,
    title: "Beneficiary registry",
    desc: "Enrolled households with phone, family size and location.",
    format: "CSV",
    run: "beneficiaries",
    roles: ["admin"],
  },
  {
    id: "shop",
    icon: Icons.Shop,
    title: "Shop directory",
    desc: "Registered vendor partners with owner and location.",
    format: "CSV",
    run: "shops",
    roles: ["admin"],
  },
  {
    id: "compliance",
    icon: Icons.Check,
    title: "Compliance summary",
    desc: "KYC status, duplicate detection and fraud flags.",
    format: "PDF",
    run: null, // No backend endpoint yet.
    roles: ["admin"],
  },
];

// Illustrative only — the backend doesn't persist report schedules yet.
export const SCHEDULED = [
  {id: "SCH-04", name: "Monthly donor digest", cadence: "Monthly · 1st at 08:00 EAT", recipients: "donors@smartaid.so", next: "Jun 01, 2025", type: "Donor report"},
  {id: "SCH-03", name: "Weekly audit log", cadence: "Weekly · Monday 06:00 EAT", recipients: "audit@smartaid.so", next: "May 26, 2025", type: "Audit"},
  {id: "SCH-02", name: "Quarterly board summary", cadence: "Quarterly · 5th at 10:00 EAT", recipients: "board@smartaid.so", next: "Jul 05, 2025", type: "Finance"},
];
