import React from 'react';
import { Bell, ShieldAlert, Sun, Moon, Menu, X } from 'lucide-react';
import { Notification } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  notifications: Notification[];
  onOpenNotifications: () => void;
  activeView: string;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  notifications,
  onOpenNotifications,
  activeView,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => !n.is_read && n.severity === 'CRITICAL').length;

  return (
    <header className="h-16 bg-factory-darkCard border-b border-factory-darkBorder px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md transition-colors duration-200">
      {/* Brand & Factory Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Menu Toggle Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-lg lg:hidden bg-factory-dark border border-factory-darkBorder hover:border-factory-secondary/50 text-factory-cream hover:text-factory-secondary transition-colors cursor-pointer shrink-0"
            title={isMobileMenuOpen ? "Close navigation menu" : "Open factory navigation menu"}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-factory-secondary" />
            ) : (
              <Menu className="w-5 h-5 text-factory-cream" />
            )}
          </button>
        )}

        <div className="relative group shrink-0 hidden xs:block">
          <img
            src="/logo.png"
            alt="Ali Bori Shoe Lace Factory Logo"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-contain bg-factory-canvas p-0.5 border border-factory-secondary shadow-sm transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-bold text-xs sm:text-sm md:text-base text-factory-cream tracking-wide font-heading truncate">
              ALI BORI SHOE LACE
            </h1>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-factory-primary/20 text-factory-secondary border border-factory-secondary/30 rounded shrink-0">
              Factory Manager
            </span>
          </div>
          <p className="text-[11px] text-factory-muted hidden md:block truncate">
            Daily Factory Operations, Manufacturing & Inventory
          </p>
        </div>
      </div>

      {/* Quick Status Badges, Theme Toggle & Notification Bell */}
      <div className="flex items-center gap-3 sm:gap-4">
        {criticalCount > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-xs rounded-md animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-factory-crimson" />
            <span>{criticalCount} Urgent Attention</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-factory-dark border border-factory-darkBorder hover:border-factory-secondary/50 text-factory-cream hover:text-factory-secondary transition-all shadow-sm"
          title={isDark ? "Switch to Light View (Daytime)" : "Switch to Dark View (Night)"}
          aria-label="Toggle visual theme"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
          ) : (
            <Moon className="w-4 h-4 text-factory-secondary" />
          )}
          <span className="text-xs font-mono font-medium hidden sm:inline">
            {isDark ? "Light" : "Dark"}
          </span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg bg-factory-dark border border-factory-darkBorder hover:border-factory-secondary/50 text-factory-cream hover:text-factory-secondary transition-all shadow-sm"
          title="Factory Alerts & Messages"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-factory-crimson text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center border-2 border-factory-darkCard">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-3 border-l border-factory-darkBorder">
          <div className="w-8 h-8 rounded-full bg-factory-primary/80 flex items-center justify-center font-bold text-xs text-white border border-factory-secondary/40 shadow-sm">
            AB
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-semibold text-factory-cream">Factory Manager</div>
            <div className="text-[10px] text-factory-muted">Operations</div>
          </div>
        </div>
      </div>
    </header>
  );
};
