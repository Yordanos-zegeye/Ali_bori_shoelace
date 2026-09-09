import React from 'react';
import { Bell, ShieldAlert, Sun, Moon } from 'lucide-react';
import { Notification } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  notifications: Notification[];
  onOpenNotifications: () => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  notifications,
  onOpenNotifications,
  activeView,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => !n.is_read && n.severity === 'CRITICAL').length;

  return (
    <header className="h-16 bg-factory-darkCard border-b border-factory-darkBorder px-6 flex items-center justify-between sticky top-0 z-30 shadow-md transition-colors duration-200">
      {/* Brand & Factory Identity */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <img
            src="/logo.png"
            alt="Ali Bori Shoe Lace Factory Logo"
            className="w-11 h-11 rounded-full object-contain bg-factory-canvas p-0.5 border border-factory-secondary shadow-sm transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-factory-cream tracking-wide font-heading">
              ALI BORI SHOE LACE FACTORY
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-factory-primary/20 text-factory-secondary border border-factory-secondary/30 rounded">
              Factory Manager
            </span>
          </div>
          <p className="text-xs text-factory-muted hidden sm:block">
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

        {/* Friendly Online Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">System Online</span>
        </div>

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
