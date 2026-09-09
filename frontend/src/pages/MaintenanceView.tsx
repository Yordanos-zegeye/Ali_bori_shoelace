import React, { useState, useEffect } from 'react';
import { 
  Wrench, CheckCircle2, AlertTriangle, Clock, Search, 
  RefreshCw, Cpu, Calendar, DollarSign, Package
} from 'lucide-react';
import { api } from '../api/client';

export const MaintenanceView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/assets/maintenance-logs/');
      setLogs(res.results || res);
    } catch (err) {
      console.error('Failed to load maintenance logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      (log.machine_code && log.machine_code.toLowerCase().includes(term)) ||
      (log.technician_name && log.technician_name.toLowerCase().includes(term)) ||
      (log.action_taken && log.action_taken.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-amber/10 text-factory-amber">
              <Wrench className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Service & Maintenance Work Orders
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Historical ledger of machine repairs, component overhauls, technician actions, and spare parts consumed.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors self-end sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
        <input
          type="text"
          placeholder="Search by Machine Code, Technician, or Action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Machine Code</th>
                <th className="py-3 px-4">Maintenance Type</th>
                <th className="py-3 px-4">Action Taken</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Status Result</th>
                <th className="py-3 px-4 text-right">Cost (ETB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading maintenance logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-factory-muted">
                    No maintenance records logged yet. Use the Machine Fleet Registry to log service actions.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-factory-muted text-[11px]">
                      {log.service_date ? new Date(log.service_date).toLocaleDateString() : 'Today'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                      {log.machine_code || 'MB1-001'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-factory-dark border border-factory-darkBorder font-mono text-[10px] text-factory-paper">
                        {log.maintenance_type || 'PREVENTATIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-factory-paper">
                      {log.action_taken || 'Replaced parts and tested speed'}
                    </td>
                    <td className="py-3.5 px-4 text-factory-muted">
                      {log.technician_name || 'Workshop Mechanic'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        RESOLVED
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-factory-paper">
                      {parseFloat(log.cost || '0').toFixed(2)} ETB
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
