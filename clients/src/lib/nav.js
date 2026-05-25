// Role-aware navigation + page metadata. Matches the final design's sidebar
// (Settings was removed; Reports lives under Reporting).
import {Icons} from "../components/icons.jsx";

export const ROLE_LABELS = {
  admin: "NGO Admin",
  donor: "Donor",
  shop_manager: "Shop Manager",
};

export const NAV = {
  admin: [
    {
      label: "Operations",
      items: [
        {to: "/", label: "Dashboard", icon: Icons.Dashboard, end: true},
        {to: "/beneficiaries", label: "Beneficiaries", icon: Icons.Users},
        {to: "/campaigns", label: "Campaigns", icon: Icons.Megaphone},
        {to: "/transactions", label: "Transactions", icon: Icons.Exchange},
        {to: "/shops", label: "Shops", icon: Icons.Shop},
        {to: "/wallet", label: "Wallet", icon: Icons.Wallet},
      ],
    },
    {
      label: "Reporting",
      items: [{to: "/reports", label: "Reports", icon: Icons.Reports}],
    },
  ],
  donor: [
    {
      label: "Donor portal",
      items: [
        {to: "/", label: "Dashboard", icon: Icons.Dashboard, end: true},
        {to: "/reports", label: "Reports", icon: Icons.Reports},
      ],
    },
  ],
};

// Page title + subtitle keyed by route path.
export const PAGE_META = {
  "/": {
    admin: {t: "Dashboard overview", s: "Real-time view of your aid distribution operations"},
    donor: {t: "Donor portal", s: "Track the impact of your humanitarian contribution"},
  },
  "/beneficiaries": {t: "Beneficiary management", s: "Households enrolled in your aid programs"},
  "/campaigns": {t: "Campaigns", s: "Time-bound voucher programs across regions"},
  "/transactions": {t: "Transaction history", s: "Every voucher redemption, fully auditable"},
  "/shops": {t: "Shop management", s: "Vendor partners that accept SmartAid vouchers"},
  "/wallet": {t: "NGO wallet", s: "Operating balance, deposits and campaign allocations"},
  "/reports": {t: "Reports", s: "Generate audit-ready reports for donors and regulators"},
};

export const initialsOf = (name = "") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
