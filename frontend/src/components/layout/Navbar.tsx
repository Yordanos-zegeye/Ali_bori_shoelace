import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, ShieldAlert, Sun, Moon, Menu, X, LogOut, 
  UserCheck, ShieldCheck, Factory, Store, Users, ChevronDown 
} from 'lucide-react';
import { Notification, UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  notifications: Notification[];
  onOpenNotifications: () => void;
  activeView: string;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onNavigate?: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  notifications,
  onOpenNotifications,
  activeView,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  onNavigate,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, role, logout, isSuperAdmin } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => !n.is_read && n.severity === 'CRITICAL').length;

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (userRole?: UserRole) => {
    switch (userRole) {
      case 'super_admin':
        return {
          icon: ShieldCheck,
          text: 'Super Admin',
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'factory_monitor':
        return {
          icon: Factory,
          text: 'Factory Monitor',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'store':
      default:
        return {
          icon: Store,
          text: user?.customer_name ? `Customer: ${user.customer_name}` : 'Customer / Shop',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
  };

  const roleInfo = getRoleBadge(role || undefined);
  const RoleIcon = roleInfo.icon;

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

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

        <div
          onClick={() => onNavigate && onNavigate(role === 'store' ? 'store_bags' : 'dashboard')}
          className="relative group shrink-0 hidden xs:block cursor-pointer"
        >
          <img
            src="/logo.png"
            alt="Ali Bori Shoe Lace Factory Logo"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-contain bg-factory-canvas p-0.5 border border-factory-secondary shadow-sm transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div
          onClick={() => onNavigate && onNavigate(role === 'store' ? 'store_bags' : 'dashboard')}
          className="min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-bold text-xs sm:text-sm md:text-base text-factory-cream tracking-wide font-heading truncate hover:text-factory-secondary transition-colors">
              ALI BORI SHOE LACE
            </h1>
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border shrink-0 ${roleInfo.color}`}>
              <RoleIcon className="w-3 h-3" />
              <span>{roleInfo.text}</span>
            </span>
          </div>
          <p className="text-[11px] text-factory-muted hidden md:block truncate">
            {role === 'factory_monitor' 
              ? 'Plant Floor, Production Batches & Dispatches'
              : role === 'store'
              ? (user?.customer_name ? `Wholesale Portal • ${user.customer_name} (${user?.customer_code || 'Verified Customer'})` : 'Customer & Wholesale Portal')
              : 'Daily Factory Operations, Manufacturing & Management'}
          </p>
        </div>
      </div>

      {/* Quick Status Badges, Theme Toggle, Notification Bell & User Menu */}
      <div className="flex items-center gap-2 sm:gap-4">
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

        {/* User Pill & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-factory-darkBorder hover:opacity-90 transition-opacity cursor-pointer"
            aria-label="User account menu"
          >
            <div className="w-8 h-8 rounded-full bg-factory-secondary text-factory-dark flex items-center justify-center font-bold text-xs shadow-sm font-mono">
              {initials}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-factory-cream truncate max-w-[120px]">
                {user?.full_name || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-[10px] text-factory-muted flex items-center gap-1">
                <span>{roleInfo.text}</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-factory-darkCard border border-factory-darkBorder rounded-xl shadow-2xl py-2 z-50 animate-fadeIn text-xs">
              <div className="px-3.5 py-2.5 border-b border-factory-darkBorder/60 bg-factory-dark/40">
                <div className="font-bold text-factory-cream text-xs">
                  {user?.full_name || 'Ali Bori User'}
                </div>
                <div className="text-[11px] text-factory-muted font-mono truncate mt-0.5">
                  {user?.email}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border capitalize">
                  <RoleIcon className="w-3 h-3" />
                  <span>{roleInfo.text}</span>
                  {user?.store_name && <span className="text-factory-muted">({user.store_name})</span>}
                </div>
              </div>

              <div className="py-1">
                {isSuperAdmin && onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate('users');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-factory-cream/90 hover:bg-factory-dark hover:text-factory-secondary transition-colors text-left cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Manage Users & Roles</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
