import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Calculator, Calendar, FileText, CheckCircle2, 
  RefreshCw, Settings, User, Printer, Plus, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { PayrollPeriod, PayrollConfiguration, PayrollSlip } from '../types';

export const PayrollView: React.FC = () => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [configs, setConfigs] = useState<PayrollConfiguration[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [loading, setLoading] = useState(true);

  // New Period Modal
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    period_code: `PAY-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    working_days: 26,
  });

  // Selected Slip for Payslip Modal
  const [activeSlip, setActiveSlip] = useState<PayrollSlip | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [periodsRes, configsRes] = await Promise.all([
        api.get<any>('/workforce/payroll-periods/'),
        api.get<any>('/workforce/payroll-configs/')
      ]);
      const pList: PayrollPeriod[] = periodsRes.results || periodsRes;
      setPeriods(pList);
      setConfigs(configsRes.results || configsRes);

      if (pList.length > 0) {
        const first = pList[0];
        setSelectedPeriod(first);
        loadSlips(first.id);
      }
    } catch (err) {
      console.error('Failed to load payroll data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSlips = async (periodId: string) => {
    try {
      const res = await api.get<any>(`/workforce/payroll-slips/?payroll_period=${periodId}`);
      setSlips(res.results || res);
    } catch (err) {
      console.error('Failed to load slips', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPeriod = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    loadSlips(period.id);
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod) return;
    try {
      setCalculating(true);
      await api.post(`/workforce/payroll-periods/${selectedPeriod.id}/calculate/`);
      alert('Payroll calculated successfully based on verified attendance records!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Payroll calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post<PayrollPeriod>('/workforce/payroll-periods/', newPeriod);
      setShowCreatePeriodModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create payroll period');
    } finally {
      setSubmitting(false);
    }
  };

  const activeConfig = configs.find((c) => c.is_active) || configs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Configurable Attendance-Based Payroll Engine
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Calculates factory wages from daily attendance. Enforces deduction rules (DAILY_RATE, PERCENTAGE, FIXED) and overtime multipliers.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreatePeriodModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-darkCard border border-factory-darkBorder text-factory-paper hover:border-factory-amber rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-factory-amber" />
            New Period
          </button>
          {selectedPeriod && (
            <button
              onClick={handleCalculatePayroll}
              disabled={calculating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow shadow-emerald-600/20"
            >
              {calculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Calculate Payroll
            </button>
          )}
        </div>
      </div>

      {/* Config Overview Banner */}
      {activeConfig && (
        <div className="bg-factory-darkCard/80 border border-factory-darkBorder rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-factory-rust/10 text-factory-amber">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-factory-paper">Active Rule: {activeConfig.name}</div>
              <div className="text-factory-muted font-mono text-[11px]">
                Deduction Mode: <span className="text-factory-amber font-bold">{activeConfig.absence_deduction_method}</span> ({activeConfig.absence_deduction_rate})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <div>
              <span className="text-factory-muted">Period Days:</span>{' '}
              <span className="text-factory-paper font-bold">{activeConfig.working_days_per_period} days</span>
            </div>
            <div>
              <span className="text-factory-muted">Overtime Multiplier:</span>{' '}
              <span className="text-blue-400 font-bold">{activeConfig.overtime_hourly_multiplier}x</span>
            </div>
            <div>
              <span className="text-factory-muted">Saturday Shift:</span>{' '}
              <span className="text-emerald-400 font-bold">{activeConfig.saturday_rate} ETB/day</span>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector Tabs */}
      <div className="flex border-b border-factory-darkBorder gap-2 overflow-x-auto">
        {periods.map((p) => {
          const isSelected = selectedPeriod?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPeriod(p)}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                isSelected
                  ? 'border-factory-amber text-factory-amber bg-factory-amber/5'
                  : 'border-transparent text-factory-muted hover:text-factory-paper'
              }`}
            >
              {p.period_code} ({p.status})
            </button>
          );
        })}
      </div>

      {/* Selected Period Summary KPIs */}
      {selectedPeriod && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
            <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
              Gross Payroll
            </div>
            <div className="text-2xl font-bold font-mono text-factory-paper mt-1">
              {parseFloat(selectedPeriod.total_gross_salary || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </div>
            <div className="text-xs text-factory-muted mt-1">Base wages + overtime + Saturday</div>
          </div>

          <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
            <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
              Absence Deductions
            </div>
            <div className="text-2xl font-bold font-mono text-factory-crimson mt-1">
              {parseFloat(selectedPeriod.total_deductions || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </div>
            <div className="text-xs text-factory-muted mt-1">Daily rate deductions for missed shifts</div>
          </div>

          <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
            <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
              Net Disbursable Salary
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {parseFloat(selectedPeriod.total_net_salary || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </div>
            <div className="text-xs text-factory-muted mt-1">Total approved payout</div>
          </div>
        </div>
      )}

      {/* Payroll Slips Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Laborer Name</th>
                <th className="py-3 px-4">Base Wage</th>
                <th className="py-3 px-4">Present / Absent</th>
                <th className="py-3 px-4">Overtime Pay</th>
                <th className="py-3 px-4">Saturday Pay</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Salary</th>
                <th className="py-3 px-4 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {slips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No payroll slips calculated for this period yet. Click "Calculate Payroll" to generate slips from attendance data.
                  </td>
                </tr>
              ) : (
                slips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-factory-paper">{slip.employee_name}</div>
                      <div className="font-mono text-[10px] text-factory-muted">{slip.employee_code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-factory-paper">
                      {parseFloat(slip.base_salary).toFixed(2)} ETB
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-emerald-400 font-bold">{slip.present_days}P</span>
                      <span className="text-factory-muted mx-1">/</span>
                      <span className="text-factory-crimson font-bold">{slip.absent_days}A</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-blue-400">
                      +{parseFloat(slip.overtime_pay || '0').toFixed(2)} ETB
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      +{parseFloat(slip.saturday_pay || '0').toFixed(2)} ETB
                    </td>
                    <td className="py-3.5 px-4 font-mono text-factory-crimson">
                      -{parseFloat(slip.absence_deduction || '0').toFixed(2)} ETB
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-emerald-400">
                      {parseFloat(slip.net_salary).toFixed(2)} ETB
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveSlip(slip)}
                        className="px-2.5 py-1 bg-factory-darkCard border border-factory-darkBorder hover:border-factory-amber text-factory-paper rounded text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-factory-amber" />
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Printable Payslip */}
      {activeSlip && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-factory-amber" />
                <h2 className="text-base font-bold font-heading text-factory-paper">
                  Laborer Official Payslip
                </h2>
              </div>
              <button
                onClick={() => setActiveSlip(null)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-factory-dark p-4 rounded-xl border border-factory-darkBorder space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-factory-darkBorder/60 pb-2">
                <div>
                  <div className="font-bold text-factory-paper text-sm">{activeSlip.employee_name}</div>
                  <div className="text-factory-muted text-[11px]">{activeSlip.employee_code} • {activeSlip.work_room || 'Shop Floor'}</div>
                </div>
                <div className="text-right">
                  <div className="text-factory-amber font-bold">{selectedPeriod?.period_code}</div>
                  <div className="text-factory-muted text-[10px]">Ali Bori Factory</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-factory-muted">
                  <span>Base Monthly Salary:</span>
                  <span className="text-factory-paper">{parseFloat(activeSlip.base_salary).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-factory-muted">
                  <span>Present Working Days:</span>
                  <span className="text-emerald-400 font-bold">{activeSlip.present_days} / {activeSlip.working_days}</span>
                </div>
                <div className="flex justify-between text-factory-muted">
                  <span>Absent Missed Days:</span>
                  <span className="text-factory-crimson font-bold">{activeSlip.absent_days} days</span>
                </div>
                <div className="flex justify-between text-factory-muted">
                  <span>Overtime Pay ({activeSlip.overtime_hours || 0} hrs):</span>
                  <span className="text-blue-400">+{parseFloat(activeSlip.overtime_pay || '0').toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-factory-muted">
                  <span>Saturday Shift Bonus:</span>
                  <span className="text-emerald-400">+{parseFloat(activeSlip.saturday_pay || '0').toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-factory-muted">
                  <span>Absence Rate Deduction:</span>
                  <span className="text-factory-crimson">-{parseFloat(activeSlip.absence_deduction || '0').toFixed(2)} ETB</span>
                </div>
              </div>

              <div className="border-t border-factory-darkBorder/60 pt-3 flex justify-between items-center text-sm font-bold">
                <span className="text-factory-paper">NET SALARY PAYABLE:</span>
                <span className="text-emerald-400 text-base">{parseFloat(activeSlip.net_salary).toFixed(2)} ETB</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Voucher
              </button>
              <button
                type="button"
                onClick={() => setActiveSlip(null)}
                className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Period */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Calendar className="w-4 h-4 text-factory-amber" />
                Initialize Payroll Period
              </h2>
              <button
                onClick={() => setShowCreatePeriodModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Period Code (e.g. PAY-2026-09)</label>
                <input
                  type="text"
                  value={newPeriod.period_code}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period_code: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Start Date</label>
                  <input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">End Date</label>
                  <input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Total Working Days in Period</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newPeriod.working_days}
                  onChange={(e) => setNewPeriod({ ...newPeriod, working_days: Number(e.target.value) })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
