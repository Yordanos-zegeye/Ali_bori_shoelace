import React, { useState, useEffect } from 'react';
import { 
  Sliders, Search, Plus, RefreshCw, Gauge, 
  CheckCircle2, DollarSign, Wrench, Building
} from 'lucide-react';
import { api } from '../api/client';

export const UtilitiesView: React.FC = () => {
  const [utilities, setUtilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUtilities = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/assets/utilities/');
      setUtilities(res.results || res);
    } catch (err) {
      console.error('Failed to load utilities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilities();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Utilities Equipment & Scales (Mizan)
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Preserving Excel's UTILITIES and utilities payment sheets: Grinder, Drill, and precision Weighing Scales (Mizan).
          </p>
        </div>

        <button
          onClick={fetchUtilities}
          className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors self-end sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid of Utilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-factory-muted bg-factory-darkCard border border-factory-darkBorder rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
            Loading utility equipment...
          </div>
        ) : utilities.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-factory-muted bg-factory-darkCard border border-factory-darkBorder rounded-xl">
            No utility equipment registered.
          </div>
        ) : (
          utilities.map((item) => (
            <div
              key={item.id}
              className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4 hover:border-factory-darkBorder/80 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-factory-rust/10 text-factory-amber">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-factory-paper text-sm">{item.name}</h3>
                    <div className="text-[11px] text-factory-muted font-mono">{item.equipment_type}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  {item.status || 'ACTIVE'}
                </span>
              </div>

              <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-factory-muted">Location:</span>
                  <span className="text-factory-paper">{item.building} ({item.room || 'Shop Floor'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-factory-muted">Maintenance Expense:</span>
                  <span className="text-factory-amber font-bold">
                    {parseFloat(item.total_maintenance_expense || '0').toFixed(2)} ETB
                  </span>
                </div>
              </div>

              <div className="text-xs text-factory-muted">
                {item.remark || 'Standard utility equipment under periodic operational inspection.'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
