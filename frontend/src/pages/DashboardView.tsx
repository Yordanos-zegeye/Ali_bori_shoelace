import React from 'react';
import {
  Layers, Factory, Package, DollarSign, Cpu, Users,
  AlertTriangle, ShieldAlert, ArrowUpRight, TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { DashboardMetrics } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ metrics, isLoading, onNavigate }) => {
  const { isDark } = useTheme();

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-factory-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-factory-muted font-mono">Loading factory overview...</p>
        </div>
      </div>
    );
  }

  const machineChartData = [
    { name: 'Normal', value: metrics.machines.normal, color: '#10B981' },
    { name: 'Needs Service', value: metrics.machines.needs_service, color: '#F59E0B' },
    { name: 'Critical', value: metrics.machines.critical, color: '#EF4444' },
  ];

  const yieldData = [
    { name: 'Input KG', value: metrics.production.today_input_kg || 100 },
    { name: 'Braided Output', value: (metrics.production.today_input_kg || 100) * 0.94 },
    { name: 'Finished Output', value: metrics.production.today_output_kg || 88 },
    { name: 'Total Waste', value: metrics.production.today_waste_kg || 12 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Alert if Critical issues exist */}
      {(metrics.alerts.critical_count > 0 || metrics.machines.critical > 0) && (
        <div className="bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 dark:border-red-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm text-red-800 dark:text-red-200 font-heading">Attention Required</h3>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                {metrics.machines.critical > 0 && `${metrics.machines.critical} Machine(s) in CRITICAL state. `}
                {metrics.alerts.critical_count > 0 && `${metrics.alerts.critical_count} urgent message(s) pending.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('machines')}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 dark:bg-red-800 dark:hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            Check Machines →
          </button>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Raw Materials */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-factory-secondary/50 transition-all">
          <div className="flex items-center justify-between text-factory-muted mb-2">
            <span className="text-xs font-medium uppercase font-mono">Raw Yarn in Warehouse</span>
            <Layers className="w-4 h-4 text-factory-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-factory-cream">
              {metrics.raw_materials.total_kg.toLocaleString()}
            </span>
            <span className="text-xs text-factory-secondary font-mono">KG</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-factory-darkBorder">
            <span className="text-factory-muted">Low Stock Items:</span>
            <span className={`font-semibold ${metrics.raw_materials.low_stock_count > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {metrics.raw_materials.low_stock_count} items
            </span>
          </div>
        </div>

        {/* Card 2: Production Today */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-factory-secondary/50 transition-all">
          <div className="flex items-center justify-between text-factory-muted mb-2">
            <span className="text-xs font-medium uppercase font-mono">Today's Production</span>
            <Factory className="w-4 h-4 text-factory-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-factory-cream">
              {metrics.production.yield_percentage}%
            </span>
            <span className="text-xs text-emerald-500 font-medium">Efficiency</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-factory-darkBorder">
            <span className="text-factory-muted">Material Waste:</span>
            <span className="text-factory-cream font-mono font-medium">
              {metrics.production.waste_percentage}% ({metrics.production.today_waste_kg} KG)
            </span>
          </div>
        </div>

        {/* Card 3: Finished Store Sacks */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-factory-secondary/50 transition-all">
          <div className="flex items-center justify-between text-factory-muted mb-2">
            <span className="text-xs font-medium uppercase font-mono">Finished Sacks in Store</span>
            <Package className="w-4 h-4 text-factory-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-factory-cream">
              {metrics.finished_goods.available_bags}
            </span>
            <span className="text-xs text-factory-secondary font-mono">Sacks (25–40 KG)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-factory-darkBorder">
            <span className="text-factory-muted">Total Weight:</span>
            <span className="text-factory-cream font-mono font-medium">
              {metrics.finished_goods.available_kg.toLocaleString()} KG
            </span>
          </div>
        </div>

        {/* Card 4: Customer Balances */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-factory-secondary/50 transition-all">
          <div className="flex items-center justify-between text-factory-muted mb-2">
            <span className="text-xs font-medium uppercase font-mono">Uncollected Customer Money</span>
            <DollarSign className="w-4 h-4 text-factory-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-factory-cream">
              {metrics.credit.total_receivables_etb.toLocaleString()}
            </span>
            <span className="text-xs text-factory-secondary font-mono">ETB</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-factory-darkBorder">
            <span className="text-factory-muted">Overdue Payments:</span>
            <span className={`font-semibold ${metrics.credit.overdue_etb > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {metrics.credit.overdue_etb.toLocaleString()} ETB
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Manufacturing Flow */}
        <div className="lg:col-span-2 bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-factory-cream font-heading">Shoe Lace Production Flow</h3>
              <p className="text-xs text-factory-muted">Yarn Input → Braided Cords → Finished Laces</p>
            </div>
            <button
              onClick={() => onNavigate('production')}
              className="text-xs text-factory-secondary hover:underline flex items-center gap-1 font-medium"
            >
              Make Laces <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldData}>
                <XAxis dataKey="name" stroke={isDark ? "#8D7B70" : "#6C5B50"} fontSize={11} />
                <YAxis stroke={isDark ? "#8D7B70" : "#6C5B50"} fontSize={11} unit=" kg" />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(200, 122, 56, 0.12)' : 'rgba(139, 70, 30, 0.08)' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E130D' : '#FFFFFF',
                    borderColor: isDark ? '#362418' : '#E5DDD0',
                    color: isDark ? '#FAF8F5' : '#1A120C',
                    borderRadius: '8px',
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  formatter={(val: any) => [`${val} KG`, 'Weight']}
                />
                <Bar dataKey="value" fill="#8B461E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Fleet Health Donut */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-factory-cream font-heading">Machine Fleet Health</h3>
              <span className="text-xs font-mono text-factory-secondary">{metrics.machines.total} Machines</span>
            </div>
            <p className="text-xs text-factory-muted mb-4">Real-time status of 365 factory machines</p>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={machineChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {machineChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E130D' : '#FFFFFF',
                    borderColor: isDark ? '#362418' : '#E5DDD0',
                    color: isDark ? '#FAF8F5' : '#1A120C',
                    borderRadius: '8px',
                    boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-factory-darkBorder text-xs">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-lg border border-emerald-500/20 dark:border-emerald-900/40">
              <div className="font-bold text-emerald-700 dark:text-emerald-400">{metrics.machines.normal}</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Normal</div>
            </div>
            <div className="p-2 bg-amber-500/10 dark:bg-amber-950/30 rounded-lg border border-amber-500/20 dark:border-amber-900/40">
              <div className="font-bold text-amber-700 dark:text-amber-400">{metrics.machines.needs_service}</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Service</div>
            </div>
            <div className="p-2 bg-red-500/10 dark:bg-red-950/30 rounded-lg border border-red-500/20 dark:border-red-900/40">
              <div className="font-bold text-red-700 dark:text-red-400">{metrics.machines.critical}</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Critical</div>
            </div>
          </div>
        </div>
      </div>

      {/* Workforce & Fast Operational Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workforce Overview */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-factory-secondary" />
              <h3 className="font-bold text-sm text-factory-cream font-['Outfit']">Workforce & Attendance</h3>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs text-factory-secondary hover:underline"
            >
              Mark Today →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <span className="text-factory-muted">Total Active Laborers:</span>
              <span className="font-bold font-mono text-factory-cream">{metrics.workforce.total_employees}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <span className="text-factory-muted">Present Today:</span>
              <span className="font-bold font-mono text-emerald-400">{metrics.workforce.present_today}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <span className="text-factory-muted">Absent:</span>
              <span className={`font-bold font-mono ${metrics.workforce.absent_today > 0 ? 'text-amber-400' : 'text-factory-cream'}`}>
                {metrics.workforce.absent_today}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <span className="text-factory-muted">Overtime Hours Logged:</span>
              <span className="font-bold font-mono text-factory-secondary">{metrics.workforce.overtime_hours} hrs</span>
            </div>
          </div>
        </div>

        {/* Quick Operational Actions */}
        <div className="lg:col-span-2 bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-factory-cream font-['Outfit'] mb-3">Quick Factory Operations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('production')}
              className="p-3.5 bg-factory-dark hover:bg-factory-primary/20 border border-factory-darkBorder hover:border-factory-secondary rounded-xl text-left transition-all group"
            >
              <Factory className="w-5 h-5 text-factory-secondary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-xs text-factory-cream">New Batch</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Start Braiding / Stepper</div>
            </button>

            <button
              onClick={() => onNavigate('dispatch')}
              className="p-3.5 bg-factory-dark hover:bg-factory-primary/20 border border-factory-darkBorder hover:border-factory-secondary rounded-xl text-left transition-all group"
            >
              <Package className="w-5 h-5 text-factory-secondary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-xs text-factory-cream">Dispatch Order</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Select bags & client</div>
            </button>

            <button
              onClick={() => onNavigate('stock_requests')}
              className="p-3.5 bg-factory-dark hover:bg-factory-primary/20 border border-factory-darkBorder hover:border-factory-secondary rounded-xl text-left transition-all group"
            >
              <Layers className="w-5 h-5 text-factory-secondary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-xs text-factory-cream">Stock Request</div>
              <div className="text-[10px] text-factory-muted mt-0.5">{metrics.alerts.pending_stock_requests} Pending approval</div>
            </button>

            <button
              onClick={() => onNavigate('attendance')}
              className="p-3.5 bg-factory-dark hover:bg-factory-primary/20 border border-factory-darkBorder hover:border-factory-secondary rounded-xl text-left transition-all group"
            >
              <Clock className="w-5 h-5 text-factory-secondary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-xs text-factory-cream">Attendance Grid</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Check-in daily laborers</div>
            </button>

            <button
              onClick={() => onNavigate('payroll')}
              className="p-3.5 bg-factory-dark hover:bg-factory-primary/20 border border-factory-darkBorder hover:border-factory-secondary rounded-xl text-left transition-all group"
            >
              <DollarSign className="w-5 h-5 text-factory-secondary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-xs text-factory-cream">Run Payroll</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Deduction rules & slips</div>
            </button>

            <button
              onClick={() => onNavigate('machines')}
              className="p-3.5 bg-factory-dark hover:bg-factory-primary/20 border border-factory-darkBorder hover:border-factory-secondary rounded-xl text-left transition-all group"
            >
              <Cpu className="w-5 h-5 text-factory-secondary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-xs text-factory-cream">Machines Fleet</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Inspect 365 machines</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
