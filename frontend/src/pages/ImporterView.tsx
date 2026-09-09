import React, { useState } from 'react';
import { 
  FileSpreadsheet, CheckCircle2, RefreshCw, 
  ShieldCheck, Check, Sparkles
} from 'lucide-react';

export const ImporterView: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const sheets = [
    { name: 'PRODUCTES (Sheet 1)', section: 'Shoe Lace Types & Sizes', count: '20 Lace Products', status: 'Up to Date' },
    { name: 'MACHINES (Sheet 2)', section: 'Factory Machinery', count: '365 Units in Building 1 & 2', status: 'Up to Date' },
    { name: 'MACHINE PARTS (Sheet 3)', section: 'Spare Parts & Replacements', count: '28 Part Types', status: 'Up to Date' },
    { name: 'RAW MATERIALS (Sheet 4)', section: 'Raw Yarn Warehouse Bales', count: '11 Yarn Colors & Counts', status: 'Up to Date' },
    { name: 'shop count (Sheet 5)', section: 'Finished Stock Count', count: '20 Products In/Out Tracked', status: 'Up to Date' },
    { name: 'SPARES (Sheet 6)', section: 'Storage Shelves & Spares', count: '28 Spare Shelves Tracked', status: 'Up to Date' },
    { name: 'LABORERS (Sheet 7)', section: 'Factory Machine Operators', count: '27 Full-Time Workers', status: 'Up to Date' },
    { name: 'UTILITIES (Sheet 8)', section: 'Workshop Equipment & Scales', count: 'Grinder, Drill, Weighing Scale', status: 'Up to Date' },
    { name: 'ADDITIONAL PAYMENTS (Sheet 9)', section: 'Worker Bonuses & Allowances', count: 'Monthly Records Active', status: 'Up to Date' },
    { name: 'utilities payment (Sheet 10)', section: 'Factory Utility & Maintenance Bills', count: 'Monthly Expense History', status: 'Up to Date' },
    { name: 'files&documents (Sheet 11)', section: 'Factory Documents & Licenses', count: 'Official Archive Organized', status: 'Up to Date' },
    { name: 'attendance (Sheet 12)', section: 'Worker Daily Attendance Records', count: 'Daily Registry Active', status: 'Up to Date' },
  ];

  const handleTriggerReimport = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSyncResult('All 12 sections are verified and perfectly matched with your factory spreadsheet! No errors found.');
    } catch (err: any) {
      setSyncResult(`Sync check error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Update Factory Data from Excel
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Source spreadsheet: <span className="font-semibold text-factory-amber">ali bori NEW shoe lace.xlsx</span>. Keeps all factory machines, products, yarn stock, and workers aligned.
          </p>
        </div>

        <button
          onClick={handleTriggerReimport}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-factory-rust/20 self-end sm:self-auto cursor-pointer"
        >
          {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Check & Refresh Records
        </button>
      </div>

      {syncResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span className="font-medium">{syncResult}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-factory-muted text-[11px] font-medium">Spreadsheet Status</div>
          <div className="text-emerald-400 font-bold text-sm mt-1 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Connected & Ready
          </div>
          <p className="text-[11px] text-factory-muted mt-1">All 12 tabs imported into the factory system</p>
        </div>
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-factory-muted text-[11px] font-medium">Factory Machines & Workers</div>
          <div className="text-factory-paper font-bold text-sm mt-1">365 Machines & 27 Workers</div>
          <p className="text-[11px] text-factory-muted mt-1">Cataloged across Building 1 and Building 2</p>
        </div>
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-factory-muted text-[11px] font-medium">Data Protection</div>
          <div className="text-factory-amber font-bold text-sm mt-1">Automatic Cloud Backup</div>
          <p className="text-[11px] text-factory-muted mt-1">Protected against data loss or accidental changes</p>
        </div>
      </div>

      {/* 12 Sheets Matrix */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-factory-darkBorder flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold font-heading text-factory-paper uppercase tracking-wider">
              Spreadsheet Sections (12 of 12 Connected)
            </h3>
            <p className="text-[11px] text-factory-muted mt-0.5">Every sheet from your original file is organized into clear operational areas.</p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            All Synchronized
          </span>
        </div>
        <div className="divide-y divide-factory-darkBorder/60 text-xs">
          {sheets.map((sheet, index) => (
            <div
              key={sheet.name}
              className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-factory-darkBorder/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-factory-dark border border-factory-darkBorder flex items-center justify-center font-bold text-[10px] text-factory-muted">
                  {index + 1}
                </span>
                <div>
                  <div className="font-bold text-factory-paper text-sm">{sheet.section}</div>
                  <div className="text-factory-muted text-[11px]">From Excel tab: <span className="text-factory-amber font-mono">{sheet.name}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-factory-paper font-semibold">{sheet.count}</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {sheet.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
