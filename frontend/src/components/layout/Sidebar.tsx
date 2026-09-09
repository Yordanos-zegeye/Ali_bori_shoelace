import React from 'react';
import {
  LayoutDashboard, Factory, ArrowRightLeft, ClipboardList, Package,
  Layers, ShoppingBag, Wrench, Cpu, DollarSign, Users,
  CalendarCheck, FileText, Sliders, Database, ArrowUpRight
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Factory Overview', icon: LayoutDashboard },
      ],
    },
    {
      title: 'MAKING SHOE LACES',
      items: [
        { id: 'production', label: '1. Make Laces (Production)', icon: Factory },
        { id: 'transfers', label: '2. Move Laces (B1 to B2)', icon: ArrowRightLeft },
        { id: 'store_bags', label: '3. Finished Sacks (Store)', icon: Package },
        { id: 'stock_requests', label: 'Request Yarn from Store', icon: ClipboardList },
      ],
    },
    {
      title: 'WAREHOUSE & MATERIALS',
      items: [
        { id: 'raw_materials', label: 'Raw Yarn Warehouse', icon: Layers },
        { id: 'finished_goods', label: 'Shoe Lace Products', icon: ShoppingBag },
        { id: 'spare_parts', label: 'Machine Spare Parts', icon: Wrench },
      ],
    },
    {
      title: 'SALES & CUSTOMERS',
      items: [
        { id: 'dispatch', label: 'Send Orders (Dispatch)', icon: ArrowUpRight },
        { id: 'customers', label: 'Customer Accounts & Credit', icon: Users },
        { id: 'receivables', label: 'Collect Payments', icon: DollarSign },
      ],
    },
    {
      title: 'FACTORY MACHINES & TOOLS',
      items: [
        { id: 'machines', label: 'All 365 Machines', icon: Cpu },
        { id: 'maintenance', label: 'Repairs & Service Log', icon: Wrench },
        { id: 'utilities', label: 'Workshop Tools & Scales', icon: Sliders },
      ],
    },
    {
      title: 'WORKERS & SALARIES',
      items: [
        { id: 'employees', label: 'Factory Workers', icon: Users },
        { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
        { id: 'payroll', label: 'Monthly Salaries & Payslips', icon: DollarSign },
      ],
    },
    {
      title: 'MANAGEMENT & SETTINGS',
      items: [
        { id: 'documents', label: 'Company Documents', icon: FileText },
        { id: 'settings', label: 'Factory Rules & Theme', icon: Sliders },
        { id: 'importer', label: 'Update from Excel Sheet', icon: Database },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-factory-darkCard border-r border-factory-darkBorder flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0 overflow-y-auto">
      <div className="py-3 px-3 space-y-5">
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
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
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
                      <span className="text-[10px] px-1.5 py-0.5 bg-factory-dark text-factory-secondary rounded border border-factory-darkBorder">
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

      {/* Footer Info */}
      <div className="mt-auto p-3 border-t border-factory-darkBorder text-[11px] text-factory-muted bg-factory-dark/40">
        <div className="font-semibold text-factory-cream/90 flex items-center justify-between">
          <span>Ali Bori Factory</span>
          <span className="text-emerald-500 font-medium text-[10px]">● Connected</span>
        </div>
        <div className="text-[10px] text-factory-muted/80 mt-0.5">
          All Factory Data Up to Date
        </div>
      </div>
    </aside>
  );
};
