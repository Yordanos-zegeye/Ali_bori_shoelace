import React from 'react';
import {
  LayoutDashboard, Factory, ArrowRightLeft, ClipboardList, Package,
  Layers, ShoppingBag, Wrench, Cpu, DollarSign, Users,
  CalendarCheck, FileText, Sliders, Database, ArrowUpRight, X,
  ShieldCheck, Store
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  roles?: UserRole[]; // If undefined, accessible to everyone
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user, role, isSuperAdmin } = useAuth();

  const allSections: NavSection[] = role === 'store' ? [
    {
      title: 'WAREHOUSE',
      items: [
        { id: 'store_bags', label: 'Warehouse Finished Sacks', icon: Package, roles: ['store'] },
        { id: 'finished_goods', label: 'Shoe Lace Catalog', icon: ShoppingBag, roles: ['store'] },
      ],
    },
    {
      title: 'SALES & ACCOUNT',
      items: [
        { id: 'dispatch', label: 'My Orders & Dispatches', icon: ArrowUpRight, roles: ['store'] },
        { id: 'customers', label: 'My Customer Account & Credit', icon: Users, roles: ['store'] },
      ],
    },
  ] : [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Factory Overview', icon: LayoutDashboard, roles: ['super_admin', 'factory_monitor'] },
      ],
    },
    {
      title: 'MAKING SHOE LACES',
      items: [
        { id: 'production', label: '1. Make Laces (Production)', icon: Factory, roles: ['super_admin', 'factory_monitor'] },
        { id: 'transfers', label: '2. Move Laces (B1 to B2)', icon: ArrowRightLeft, roles: ['super_admin', 'factory_monitor'] },
        { id: 'store_bags', label: '3. Finished Sacks (Store)', icon: Package, roles: ['super_admin', 'factory_monitor', 'store'] },
        { id: 'stock_requests', label: 'Request Yarn from Store', icon: ClipboardList, roles: ['super_admin', 'factory_monitor'] },
      ],
    },
    {
      title: 'WAREHOUSE & MATERIALS',
      items: [
        { id: 'raw_materials', label: 'Raw Yarn Warehouse', icon: Layers, roles: ['super_admin', 'factory_monitor'] },
        { id: 'finished_goods', label: 'Shoe Lace Products', icon: ShoppingBag, roles: ['super_admin', 'factory_monitor', 'store'] },
        { id: 'spare_parts', label: 'Machine Spare Parts', icon: Wrench, roles: ['super_admin', 'factory_monitor'] },
      ],
    },
    {
      title: 'SALES & CUSTOMERS',
      items: [
        { id: 'dispatch', label: 'Send Orders (Dispatch)', icon: ArrowUpRight, roles: ['super_admin', 'factory_monitor', 'store'] },
        { id: 'customers', label: 'Customer Accounts & Credit', icon: Users, roles: ['super_admin', 'factory_monitor', 'store'] },
        { id: 'receivables', label: 'Collect Payments', icon: DollarSign, roles: ['super_admin'] },
      ],
    },
    {
      title: 'FACTORY MACHINES & TOOLS',
      items: [
        { id: 'machines', label: 'All 365 Machines', icon: Cpu, roles: ['super_admin', 'factory_monitor'] },
        { id: 'maintenance', label: 'Repairs & Service Log', icon: Wrench, roles: ['super_admin', 'factory_monitor'] },
        { id: 'utilities', label: 'Workshop Tools & Scales', icon: Sliders, roles: ['super_admin', 'factory_monitor'] },
      ],
    },
    {
      title: 'WORKERS & SALARIES',
      items: [
        { id: 'employees', label: 'Factory Workers', icon: Users, roles: ['super_admin'] },
        { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck, roles: ['super_admin'] },
        { id: 'payroll', label: 'Monthly Salaries & Payslips', icon: DollarSign, roles: ['super_admin'] },
      ],
    },
    {
      title: 'MANAGEMENT & SETTINGS',
      items: [
        { id: 'users', label: 'User Management & Roles', icon: ShieldCheck, badge: 'Admin', roles: ['super_admin'] },
        { id: 'documents', label: 'Company Documents', icon: FileText, roles: ['super_admin'] },
        { id: 'settings', label: 'Factory Rules & Theme', icon: Sliders, roles: ['super_admin'] },
        { id: 'importer', label: 'Update from Excel Sheet', icon: Database, roles: ['super_admin'] },
      ],
    },
  ];

  // Filter sections and items based on role
  const sections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (isSuperAdmin) return true;
        if (!item.roles) return true;
        return role && item.roles.includes(role);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const handleItemClick = (id: string) => {
    setActiveView(id);
    onCloseMobile?.();
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', desc: 'Full Access Granted', color: 'text-purple-400' };
      case 'factory_monitor':
        return { label: 'Factory Monitor', desc: 'Production & Dispatches', color: 'text-amber-400' };
      case 'store':
      default:
        return {
          label: user?.customer_name || 'Customer / Shop',
          desc: user?.customer_code ? `Account: ${user.customer_code}` : (user?.store_name || 'Retail Wholesale Client'),
          color: 'text-emerald-400'
        };
    }
  };

  const roleMeta = getRoleLabel();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-factory-darkCard border-r border-factory-darkBorder flex flex-col transition-transform duration-200 ease-in-out
          lg:static lg:w-64 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 lg:translate-x-0 lg:z-auto
          ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          select-none shrink-0 overflow-y-auto
        `}
      >
        {/* Mobile-Only Drawer Header with Close Button */}
        <div className="flex items-center justify-between p-3.5 border-b border-factory-darkBorder lg:hidden bg-factory-dark/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs font-heading text-factory-cream">Factory Navigation</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-factory-muted hover:text-factory-cream hover:bg-factory-dark transition-colors cursor-pointer"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="py-3 px-3 space-y-5 flex-1">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="text-[10px] font-bold text-factory-muted tracking-wider uppercase px-3 mb-1.5 font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-factory-primary text-factory-cream font-semibold shadow-sm border border-factory-secondary/40'
                          : 'text-factory-cream/80 hover:bg-factory-dark hover:text-factory-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-factory-secondary' : 'text-factory-muted'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-factory-dark text-factory-secondary rounded border border-factory-darkBorder font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info with Active Role */}
        <div className="mt-auto p-3 border-t border-factory-darkBorder text-[11px] text-factory-muted bg-factory-dark/40">
          <div className="font-semibold text-factory-cream/90 flex items-center justify-between">
            <span>Ali Bori Factory</span>
            <span className={`text-[10px] font-bold font-mono ${roleMeta.color}`}>{roleMeta.label}</span>
          </div>
          <div className="text-[10px] text-factory-muted/80 mt-0.5">
            {roleMeta.desc}
          </div>
        </div>
      </aside>
    </>
  );
};
