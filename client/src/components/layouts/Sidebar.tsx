import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../ui";
import { PATHS } from "../../routes/path";
import { NAV_GROUPS, type AppNavItem } from "../../navigation/modules";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "../../interfaces/user";
import type * as FaIcons from "react-icons/fa6";

const Sidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const navItemVisible = (rolesAllowed: Role[] | undefined) => {
    if (!rolesAllowed?.length) return true;
    if (!user) return false;
    return rolesAllowed.includes(user.role);
  };

  const isActivePath = (segment: string) => {
    const target = `${PATHS.APP.ROOT}/${segment}`.replace("//", "/");
    return location.pathname === target || location.pathname.startsWith(`${target}/`);
  };

  // Find logout item (if any) to extract it
  let logoutItem: AppNavItem | null = null;
  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.action === "logout") {
        logoutItem = item;
        return false; // remove from group
      }
      return true;
    }),
  }));

  return (
    <aside
      className={`fixed top-0 left-0 z-40 w-64 h-screen bg-bg-light pt-20 transition-transform border-r border-border-muted shadow-lg
      ${isOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0 sm:shadow-md`}
    >
      <div className="h-full px-3 pb-6 overflow-y-auto flex flex-col">
        {/* Main navigation groups */}
        <div className="flex-1">
          {filteredGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <h3 className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                {group.title}
              </h3>
              <ul className="space-y-1 font-medium">
                {group.items.filter((item) => navItemVisible(item.rolesAllowed)).map((item) => {
                  const to = `${PATHS.APP.ROOT}/${item.path}`.replace("//", "/");
                  const active = isActivePath(item.path);

                  return (
                    <li key={item.path}>
                      <Link
                        to={to}
                        className={`flex items-center p-2.5 rounded-xl group relative transition-colors ${
                          active
                            ? "bg-primary text-bg-dark shadow-md"
                            : "text-text hover:bg-primary/10 hover:text-text"
                        }`}
                      >
                        <span
                          className={`absolute left-1 h-6 w-1 rounded-r transition-all ${
                            active ? "bg-bg-light opacity-100" : "opacity-0 group-hover:opacity-60 bg-primary"
                          }`}
                        />
                        <span className="ml-2">
                          <Icon
                            iconName={item.icon as keyof typeof FaIcons}
                            size={18}
                            className={active ? "text-bg-dark" : "text-text group-hover:text-primary"}
                          />
                        </span>
                        <span className={`ml-3 text-sm ${active ? "font-bold" : ""}`}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Logout button at the bottom */}
        {logoutItem && navItemVisible(logoutItem.rolesAllowed) && (
          <div className="pt-4 mt-auto border-t border-border-muted">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center p-2.5 rounded-xl text-left text-text hover:bg-danger/10 hover:text-danger border border-transparent transition-colors"
            >
              <span className="ml-2">
                <Icon iconName={logoutItem.icon as keyof typeof FaIcons} size={18} />
              </span>
              <span className="ml-3 text-sm font-semibold">{logoutItem.label}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;