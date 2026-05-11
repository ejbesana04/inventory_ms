import React from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../routes/path";
import { Icon, Button } from "../ui";
import { useAuth } from "../../contexts/AuthContext";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 z-50 w-full bg-bg-light/95 backdrop-blur border-b border-border-muted">
      <div className="px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            {/* Mobile Sidebar Toggle */}
            <span
              onClick={onMenuClick}
              className="p-2 mr-2 text-text-muted rounded-lg sm:hidden focus:outline-none hover:bg-primary/10">
              <Icon iconName="FaAlignJustify" />
            </span>
            <Link to={PATHS.APP.DASHBOARD} className="flex gap-3 items-center">
              <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Icon iconName="FaBoxesStacked" />
              </div>
              <div className="hidden sm:block">
                <p className="text-text font-black text-lg tracking-tight">Inventory MS</p>
                <p className="text-text-muted text-xs -mt-1">Stock and Sales Control</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-success/15 text-success font-semibold">
                System Online
              </span>
            </div>
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-border-muted">
                <div className="hidden sm:block text-right leading-tight max-w-[10rem] lg:max-w-xs">
                  <p className="text-xs font-semibold text-text truncate">{user.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
  
};

export default Navbar;