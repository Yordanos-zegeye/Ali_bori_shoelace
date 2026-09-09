import React, { useState } from 'react';
import { 
  Sliders, Shield, Bell, 
  Save, Package, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SettingsView: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();
  const [settings, setSettings] = useState({
    minBagWeight: '25.00',
    maxBagWeight: '40.00',
    currency: 'ETB',
    defaultWorkingDays: '26',
    absenceDeductionMethod: 'DAILY_RATE',
    lowStockYarnThreshold: '50.00',
    lowStockSparesThreshold: '5',
    creditGraceDays: '15',
    autoLockDispatchedBags: true,
    preventDuplicateAttendance: true,
    enableCriticalMachineAlerts: true
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-factory-rust/10 text-factory-amber">
            <Sliders className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold font-heading text-factory-paper">
            Factory Operating Rules & Theme Settings
          </h1>
        </div>
        <p className="text-xs text-factory-muted mt-1">
          Standard sack weights, worker salary deductions, low-stock warnings, and screen appearance.
        </p>
      </div>

      {/* Visual Theme Selection Card */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-factory-darkBorder pb-3">
          {isDark ? (
            <Moon className="w-4 h-4 text-factory-secondary" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <h2 className="text-sm font-bold font-heading text-factory-paper">
            Screen Appearance & Colors
          </h2>
        </div>
        <p className="text-xs text-factory-muted">
          Choose whether you prefer working in Dark Mode or Light Mode. Both use the Ali Bori factory colors.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Dark Mode Option */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              theme === 'dark'
                ? 'border-factory-secondary bg-factory-primary/10 shadow-md ring-1 ring-factory-secondary/40'
                : 'border-factory-darkBorder bg-factory-dark/40 hover:border-factory-secondary/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#140A05] border border-[#362418] text-[#C87A38]">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-factory-paper">Dark Mode (Default)</span>
              </div>
              {theme === 'dark' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-factory-secondary/20 text-factory-secondary border border-factory-secondary/40">
                  SELECTED
                </span>
              )}
            </div>
            <p className="text-[11px] text-factory-muted leading-relaxed">
              Warm dark espresso background with golden amber highlights. Easy on the eyes for factory offices and night shifts.
            </p>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-factory-darkBorder/60">
              <span className="w-3.5 h-3.5 rounded-full bg-[#140A05] border border-white/20" title="Dark Base" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#1E130D]" title="Dark Card" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#8B461E]" title="Rust Leather" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#C87A38]" title="Amber" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#FAF8F5]" title="Paper Text" />
            </div>
          </div>

          {/* Light Mode Option */}
          <div
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              theme === 'light'
                ? 'border-factory-secondary bg-factory-secondary/10 shadow-md ring-1 ring-factory-secondary/40'
                : 'border-factory-darkBorder bg-factory-dark/40 hover:border-factory-secondary/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E4DBCB] text-[#B6631F]">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-factory-paper">Light Mode</span>
              </div>
              {theme === 'light' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-factory-secondary/20 text-factory-secondary border border-factory-secondary/40">
                  SELECTED
                </span>
              )}
            </div>
            <p className="text-[11px] text-factory-muted leading-relaxed">
              Clean warm canvas background with crisp white cards and deep espresso text. Great for bright daytime offices.
            </p>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-factory-darkBorder/60">
              <span className="w-3.5 h-3.5 rounded-full bg-[#F6F3ED] border border-black/10" title="Canvas Base" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#FFFFFF] border border-black/10" title="White Card" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#8B461E]" title="Rust Leather" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#B6631F]" title="Amber Accent" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#18100A]" title="Espresso Text" />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Finished Goods Packaging Constraints */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-factory-darkBorder pb-3">
            <Package className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-heading text-factory-paper">
              Finished Shoe Lace Sack Weight Rules
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-factory-muted mb-1 font-medium">Minimum Sack Weight (KG)</label>
              <input
                type="number"
                step="0.01"
                value={settings.minBagWeight}
                disabled
                className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold opacity-80 cursor-not-allowed"
              />
              <p className="text-[11px] text-emerald-400 mt-1">✓ Factory Rule: Sacks must weigh at least 25.00 KG</p>
            </div>
            <div>
              <label className="block text-factory-muted mb-1 font-medium">Maximum Sack Weight (KG)</label>
              <input
                type="number"
                step="0.01"
                value={settings.maxBagWeight}
                disabled
                className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold opacity-80 cursor-not-allowed"
              />
              <p className="text-[11px] text-emerald-400 mt-1">✓ Factory Rule: Sacks cannot weigh more than 40.00 KG</p>
            </div>
          </div>
        </div>

        {/* Workforce & Payroll Settings */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-factory-darkBorder pb-3">
            <Shield className="w-4 h-4 text-factory-amber" />
            <h2 className="text-sm font-bold font-heading text-factory-paper">
              Worker Attendance & Salary Deduction Rules
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-factory-muted mb-1 font-medium">Monthly Working Days</label>
              <input
                type="number"
                value={settings.defaultWorkingDays}
                onChange={(e) => setSettings({ ...settings, defaultWorkingDays: e.target.value })}
                className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
              />
              <p className="text-[11px] text-factory-muted mt-1">Standard factory days (usually 26 days per month)</p>
            </div>
            <div>
              <label className="block text-factory-muted mb-1 font-medium">How to Deduct for Absences</label>
              <select
                value={settings.absenceDeductionMethod}
                onChange={(e) => setSettings({ ...settings, absenceDeductionMethod: e.target.value })}
                className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
              >
                <option value="DAILY_RATE">Daily Rate (Monthly Salary divided by Working Days)</option>
                <option value="PERCENTAGE_OF_SALARY">Percentage of Monthly Salary</option>
                <option value="FIXED_AMOUNT">Fixed Birr Amount per Missed Shift</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & System Health */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-factory-darkBorder pb-3">
            <Bell className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold font-heading text-factory-paper">
              Low Stock Warnings & Safety Checks
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-factory-muted mb-1 font-medium">Raw Yarn Low Stock Warning (KG)</label>
              <input
                type="number"
                value={settings.lowStockYarnThreshold}
                onChange={(e) => setSettings({ ...settings, lowStockYarnThreshold: e.target.value })}
                className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
              />
              <p className="text-[11px] text-factory-muted mt-1">Alert when warehouse yarn drops below this weight</p>
            </div>
            <div>
              <label className="block text-factory-muted mb-1 font-medium">Machine Spare Parts Low Warning (Pieces)</label>
              <input
                type="number"
                value={settings.lowStockSparesThreshold}
                onChange={(e) => setSettings({ ...settings, lowStockSparesThreshold: e.target.value })}
                className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
              />
              <p className="text-[11px] text-factory-muted mt-1">Alert when spare parts on shelf drop below this number</p>
            </div>
          </div>

          <div className="pt-2 space-y-2.5 text-xs">
            <label className="flex items-center gap-2.5 text-factory-paper cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoLockDispatchedBags}
                onChange={(e) => setSettings({ ...settings, autoLockDispatchedBags: e.target.checked })}
                className="accent-factory-rust rounded w-4 h-4"
              />
              <span>Prevent Sacks from Being Dispatched Twice (Protects against double-shipping)</span>
            </label>
            <label className="flex items-center gap-2.5 text-factory-paper cursor-pointer">
              <input
                type="checkbox"
                checked={settings.preventDuplicateAttendance}
                onChange={(e) => setSettings({ ...settings, preventDuplicateAttendance: e.target.checked })}
                className="accent-factory-rust rounded w-4 h-4"
              />
              <span>Prevent Marking the Same Worker Twice on the Same Day</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-xs font-semibold shadow-lg shadow-factory-rust/20 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Settings Saved Successfully!' : 'Save Factory Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
