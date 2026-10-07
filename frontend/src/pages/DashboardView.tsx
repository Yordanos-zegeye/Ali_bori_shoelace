import React, { useState } from 'react';
import {
  Layers, Factory, Package, DollarSign, Cpu, Users,
  ShieldAlert, ArrowUpRight, Clock, BarChart3, Activity
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardMetrics } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ metrics, isLoading, onNavigate }) => {
  const { isDark } = useTheme();
  type ProductionTimeframe = 'daily' | 'weekly' | 'monthly';
  type GraphMode = 'daily' | 'weekly' | 'monthly' | 'batches' | 'flow';

  const [productionTimeframe, setProductionTimeframe] = useState<ProductionTimeframe>('daily');
  const [graphMode, setGraphMode] = useState<GraphMode>('daily');

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-factory-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-factory-muted font-mono">Loading real factory metrics...</p>
        </div>
      </div>
    );
  }

  // Machine Fleet Donut: Neutral tones for normal/service, RED exclusively for critical
  const machineChartData = [
    { name: 'Normal', value: metrics.machines.normal, color: '#8D7B70' },
    { name: 'Needs Service', value: metrics.machines.needs_service, color: '#5A483E' },
    { name: 'Critical', value: metrics.machines.critical, color: '#EF4444' },
  ];

  // Real Flow data from database (no mock fallback)
  const yieldData = [
    { name: 'Input Yarn', value: metrics.production.today_input_kg, fill: '#8B461E' },
    { name: 'Braided Cords', value: metrics.production.today_braided_output_kg || 0, fill: '#C87A38' },
    { name: 'Finished Laces', value: metrics.production.today_output_kg, fill: '#D8C39E' },
    { name: 'Total Waste', value: metrics.production.today_waste_kg, fill: '#EF4444' }, // Red for waste/loss criticality
  ];

  // Real Batches History from database for granular graph
  const batchChartData = (metrics.batches_history && metrics.batches_history.length > 0)
    ? metrics.batches_history.map((b) => ({
        name: b.batch_number.replace('BATCH-2026-', 'Run '),
        fullBatch: b.batch_number,
        'Yarn Input (KG)': b.input_kg,
        'Finished Laces (KG)': b.finished_kg,
        'Waste (KG)': b.waste_kg,
        yieldPct: b.yield_percentage,
      })).reverse()
    : [];

  // Production Averages computed from real database records
  const averages = metrics.production.averages;
  const currentAvg = averages?.[productionTimeframe] || {
    output_kg: metrics.production.today_output_kg,
    input_kg: metrics.production.today_input_kg,
    waste_kg: metrics.production.today_waste_kg,
    yield_percentage: metrics.production.yield_percentage,
    batch_count: metrics.production.today_batch_count || 1,
    active_days_count: 1,
    active_weeks_count: 1,
    active_months_count: 1,
  };

  const timeframeLabels: Record<ProductionTimeframe, { title: string; unit: string; periodLabel: string }> = {
    daily: {
      title: 'Daily Average Production',
      unit: 'day',
      periodLabel: `${averages?.daily.active_days_count || 1} active days recorded`
    },
    weekly: {
      title: 'Weekly Average Production',
      unit: 'week',
      periodLabel: `${averages?.weekly.active_weeks_count || 1} active weeks recorded`
    },
    monthly: {
      title: 'Monthly Average Production',
      unit: 'month',
      periodLabel: `${averages?.monthly.active_months_count || 1} active month recorded`
    }
  };

  // Real time-series aggregated history
  const dailyChartData = (metrics.production.daily_history && metrics.production.daily_history.length > 0)
    ? metrics.production.daily_history.map((d) => ({
        name: d.label,
        fullDate: d.date,
        'Yarn Input (KG)': d.input_kg,
        'Finished Laces (KG)': d.finished_kg,
        'Waste (KG)': d.waste_kg,
        batch_count: d.batch_count,
        yieldPct: d.yield_percentage,
      }))
    : [];

  const weeklyChartData = (metrics.production.weekly_history && metrics.production.weekly_history.length > 0)
    ? metrics.production.weekly_history.map((w) => ({
        name: w.label,
        fullWeek: w.week,
        'Yarn Input (KG)': w.input_kg,
        'Finished Laces (KG)': w.finished_kg,
        'Waste (KG)': w.waste_kg,
        batch_count: w.batch_count,
        yieldPct: w.yield_percentage,
      }))
    : [];

  const monthlyChartData = (metrics.production.monthly_history && metrics.production.monthly_history.length > 0)
    ? metrics.production.monthly_history.map((m) => ({
        name: m.label,
        fullMonth: m.month,
        'Yarn Input (KG)': m.input_kg,
        'Finished Laces (KG)': m.finished_kg,
        'Waste (KG)': m.waste_kg,
        batch_count: m.batch_count,
        yieldPct: m.yield_percentage,
      }))
    : [];

  const getGraphDetails = () => {
    switch (graphMode) {
      case 'daily':
        return {
          title: 'Daily Production Output & Daily Average',
          subtitle: `Average: ${averages?.daily.output_kg || 0} KG Finished / day (${averages?.daily.active_days_count || 1} active production days recorded)`,
          badge: `Avg: ${averages?.daily.output_kg || 0} KG/day`,
          data: dailyChartData
        };
      case 'weekly':
        return {
          title: 'Weekly Production Output & Weekly Average',
          subtitle: `Average: ${averages?.weekly.output_kg || 0} KG Finished / week (${averages?.weekly.active_weeks_count || 1} active ISO weeks recorded)`,
          badge: `Avg: ${averages?.weekly.output_kg || 0} KG/week`,
          data: weeklyChartData
        };
      case 'monthly':
        return {
          title: 'Monthly Production Output & Monthly Average',
          subtitle: `Average: ${averages?.monthly.output_kg || 0} KG Finished / month (${averages?.monthly.active_months_count || 1} active month recorded)`,
          badge: `Avg: ${averages?.monthly.output_kg || 0} KG/month`,
          data: monthlyChartData
        };
      case 'batches':
        return {
          title: 'Live Production Batches Output & Waste',
          subtitle: 'Real-time database records per production batch (Input vs Finished Laces vs Waste)',
          badge: `${metrics.batches_history?.length || 0} Batches Logged`,
          data: batchChartData
        };
      case 'flow':
        return {
          title: 'Cumulative Production Material Flow',
          subtitle: 'Total yarn converted through braiding & tipping stages (KG)',
          badge: `${metrics.production.today_output_kg} KG Finished`,
          data: yieldData
        };
    }
  };

  const currentGraph = getGraphDetails();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Alert if Critical issues exist (RED only for criticality) */}
      {(metrics.alerts.critical_count > 0 || metrics.machines.critical > 0) && (
        <div className="bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 dark:border-red-800/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0 animate-pulse" />
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-red-400 font-heading">Critical Factory Alert</h3>
              <p className="text-[11px] sm:text-xs text-red-300/90 mt-0.5">
                {metrics.machines.critical > 0 && `${metrics.machines.critical} Machine(s) in CRITICAL offline state. `}
                {metrics.raw_materials.low_stock_count > 0 && `${metrics.raw_materials.low_stock_count} yarn variants below safety stock. `}
                {metrics.alerts.pending_stock_requests > 0 && `${metrics.alerts.pending_stock_requests} pending yarn request(s).`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate(metrics.machines.critical > 0 ? 'machines' : 'raw_materials')}
            className="w-full sm:w-auto text-center px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
          >
            Review Critical Alerts →
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
            <span className="text-factory-muted">Safety Stock Alert:</span>
            <span className={`font-semibold ${metrics.raw_materials.low_stock_count > 0 ? 'text-red-500 font-bold' : 'text-factory-paper'}`}>
              {metrics.raw_materials.low_stock_count > 0 ? `${metrics.raw_materials.low_stock_count} low stock` : 'All safe'}
            </span>
          </div>
        </div>

        {/* Card 2: Production Average (Daily / Weekly / Monthly Switcher) */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-factory-secondary/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-factory-muted truncate">
                {timeframeLabels[productionTimeframe].title}
              </span>
              {/* Daily / Weekly / Monthly Pill Controls */}
              <div className="inline-flex rounded-lg border border-factory-darkBorder p-0.5 bg-factory-dark text-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => setProductionTimeframe('daily')}
                  className={`px-1.5 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer ${
                    productionTimeframe === 'daily'
                      ? 'bg-factory-secondary text-factory-dark font-bold shadow-xs'
                      : 'text-factory-muted hover:text-factory-cream'
                  }`}
                  title="Daily Average"
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setProductionTimeframe('weekly')}
                  className={`px-1.5 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer ${
                    productionTimeframe === 'weekly'
                      ? 'bg-factory-secondary text-factory-dark font-bold shadow-xs'
                      : 'text-factory-muted hover:text-factory-cream'
                  }`}
                  title="Weekly Average"
                >
                  Wk
                </button>
                <button
                  type="button"
                  onClick={() => setProductionTimeframe('monthly')}
                  className={`px-1.5 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer ${
                    productionTimeframe === 'monthly'
                      ? 'bg-factory-secondary text-factory-dark font-bold shadow-xs'
                      : 'text-factory-muted hover:text-factory-cream'
                  }`}
                  title="Monthly Average"
                >
                  Mo
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-heading text-factory-cream">
                  {currentAvg.output_kg.toLocaleString()}
                </span>
                <span className="text-xs text-factory-secondary font-mono">
                  KG / {timeframeLabels[productionTimeframe].unit}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-factory-dark border border-factory-darkBorder text-factory-cream">
                {currentAvg.yield_percentage}% Yield
              </span>
            </div>

            <div className="text-[11px] text-factory-muted mt-1.5 flex items-center justify-between">
              <span>Avg Batches: <strong className="text-factory-cream font-mono">{currentAvg.batch_count}</strong>/{timeframeLabels[productionTimeframe].unit}</span>
              <span>Input: <strong className="text-factory-cream font-mono">{currentAvg.input_kg}</strong> KG</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-factory-darkBorder flex items-center justify-between text-[11px]">
            <span className="text-factory-muted">Avg Waste Loss:</span>
            <span className="font-mono font-semibold text-red-500">
              {currentAvg.waste_kg} KG ({currentAvg.input_kg > 0 ? ((currentAvg.waste_kg / currentAvg.input_kg) * 100).toFixed(1) : 0}%)
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
            <span className="text-xs text-factory-secondary font-mono">Sacks</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-factory-darkBorder">
            <span className="text-factory-muted">Store Net Weight:</span>
            <span className="text-factory-cream font-mono font-medium">
              {metrics.finished_goods.available_kg.toLocaleString()} KG
            </span>
          </div>
        </div>

        {/* Card 4: Customer Balances */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-factory-secondary/50 transition-all">
          <div className="flex items-center justify-between text-factory-muted mb-2">
            <span className="text-xs font-medium uppercase font-mono">Receivables & Credit</span>
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
            <span className={`font-semibold ${metrics.credit.overdue_etb > 0 ? 'text-red-500 font-bold' : 'text-factory-paper'}`}>
              {metrics.credit.overdue_etb > 0 ? `${metrics.credit.overdue_etb.toLocaleString()} ETB` : 'No overdue'}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Production Graphs: Daily Avg, Weekly Avg, Monthly Avg, Batches, Flow */}
        <div className="lg:col-span-2 bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-factory-secondary" />
                <h3 className="font-bold text-sm text-factory-cream font-heading">
                  {currentGraph.title}
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-factory-dark border border-factory-darkBorder text-factory-secondary">
                  {currentGraph.badge}
                </span>
              </div>
              <p className="text-xs text-factory-muted mt-0.5">
                {currentGraph.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-factory-darkBorder p-0.5 bg-factory-dark text-xs">
                <button
                  type="button"
                  onClick={() => setGraphMode('daily')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    graphMode === 'daily'
                      ? 'bg-factory-darkCard text-factory-paper font-semibold shadow-xs'
                      : 'text-factory-muted hover:text-factory-paper'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('weekly')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    graphMode === 'weekly'
                      ? 'bg-factory-darkCard text-factory-paper font-semibold shadow-xs'
                      : 'text-factory-muted hover:text-factory-paper'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('monthly')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    graphMode === 'monthly'
                      ? 'bg-factory-darkCard text-factory-paper font-semibold shadow-xs'
                      : 'text-factory-muted hover:text-factory-paper'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('batches')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    graphMode === 'batches'
                      ? 'bg-factory-darkCard text-factory-paper font-semibold shadow-xs'
                      : 'text-factory-muted hover:text-factory-paper'
                  }`}
                >
                  Batches
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('flow')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    graphMode === 'flow'
                      ? 'bg-factory-darkCard text-factory-paper font-semibold shadow-xs'
                      : 'text-factory-muted hover:text-factory-paper'
                  }`}
                >
                  Flow
                </button>
              </div>

              <button
                onClick={() => onNavigate('production')}
                className="text-xs text-factory-secondary hover:underline flex items-center gap-1 font-medium ml-1 shrink-0"
              >
                Production View <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {graphMode !== 'flow' ? (
                <BarChart data={currentGraph.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke={isDark ? "#8D7B70" : "#6C5B50"} fontSize={11} />
                  <YAxis stroke={isDark ? "#8D7B70" : "#6C5B50"} fontSize={11} unit=" kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1E130D' : '#FFFFFF',
                      borderColor: isDark ? '#362418' : '#E5DDD0',
                      color: isDark ? '#FAF8F5' : '#1A120C',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}
                    formatter={(val: any, name: any) => [`${val} KG`, name]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                  />
                  <Bar dataKey="Yarn Input (KG)" fill="#8B461E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Finished Laces (KG)" fill="#D8C39E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Waste (KG)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke={isDark ? "#8D7B70" : "#6C5B50"} fontSize={11} />
                  <YAxis stroke={isDark ? "#8D7B70" : "#6C5B50"} fontSize={11} unit=" kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1E130D' : '#FFFFFF',
                      borderColor: isDark ? '#362418' : '#E5DDD0',
                      color: isDark ? '#FAF8F5' : '#1A120C',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}
                    formatter={(val: any) => [`${val} KG`, 'Weight']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {yieldData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Fleet Health Donut (Neutral for Normal/Service, RED for Critical only) */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-factory-secondary" />
                <h3 className="font-bold text-sm text-factory-cream font-heading">Machine Fleet Health</h3>
              </div>
              <span className="text-xs font-mono text-factory-secondary">{metrics.machines.total} Machines</span>
            </div>
            <p className="text-xs text-factory-muted mb-4">Real-time status of {metrics.machines.total} factory machines</p>
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
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Machine breakdown: Neutral for Normal/Service, Red exclusively for Critical */}
          <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-factory-darkBorder text-xs">
            <div className="p-2 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <div className="font-bold text-factory-cream font-mono">{metrics.machines.normal}</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Normal</div>
            </div>
            <div className="p-2 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <div className="font-bold text-factory-muted font-mono">{metrics.machines.needs_service}</div>
              <div className="text-[10px] text-factory-muted mt-0.5">Service</div>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="font-bold text-red-500 font-mono">{metrics.machines.critical}</div>
              <div className="text-[10px] text-red-400 mt-0.5">Critical</div>
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
              <span className="font-bold font-mono text-factory-cream">{metrics.workforce.present_today}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-factory-dark rounded-lg border border-factory-darkBorder">
              <span className="text-factory-muted">Absent:</span>
              <span className={`font-bold font-mono ${metrics.workforce.absent_today > 0 ? 'text-red-500' : 'text-factory-cream'}`}>
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
              <div className="text-[10px] text-factory-muted mt-0.5">Inspect {metrics.machines.total} machines</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
