import type { Role } from "../interfaces/user";

export type AppNavItem = {
  path: string;
  label: string;
  icon: string;
  action?: "logout";
  /** If set, only these roles see the link (sidebar + deep links). */
  rolesAllowed?: Role[];
};

/** Core warehouse + catalog + admin only */
export const NAV_GROUPS: { title: string; items: AppNavItem[] }[] = [
  {
    title: "Menu",
    items: [
      { path: "dashboard", label: "Dashboard", icon: "FaChartPie" },
      { path: "products", label: "Products", icon: "FaBoxOpen" },
      { path: "suppliers", label: "Suppliers", icon: "FaTruckField" },
      { path: "purchase-orders", label: "Purchase Orders", icon: "FaFileInvoice" },
      { path: "sales", label: "Sales", icon: "FaCashRegister" },
      { path: "stock-in", label: "Stock In", icon: "FaArrowDownLong" },
      { path: "stock-out", label: "Stock Out", icon: "FaArrowUpLong" },
      { path: "users", label: "Users", icon: "FaUsers", rolesAllowed: ["admin", "manager"] },
      { path: "logout", label: "Logout", icon: "FaRightFromBracket", action: "logout" },
    ],
  },
];
