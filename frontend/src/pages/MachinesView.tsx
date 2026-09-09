import React, { useState, useEffect } from 'react';
import { 
  Cpu, Search, Wrench, RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { Machine, MachineType, SparePart } from '../types';

export const MachinesView: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [types, setTypes] = useState<MachineType[]>([]);
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [buildingFilter, setBuildingFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'NORMAL' | 'NEEDS_SERVICE' | 'CRITICAL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Maintenance Modal
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    technician_name: 'Lead Mechanic',
    action_taken: 'Replaced needle & lubricated bearings',
    new_health: 'NORMAL',
    new_status: 'ACTIVE',
    spare_part_id: '',
    spare_quantity: '1',
    cost: '0.00'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machinesRes, typesRes, sparesRes] = await Promise.all([
        api.get<any>('/assets/machines/'),
        api.get<any>('/assets/types/'),
        api.get<any>('/assets/spares/')
      ]);
      setMachines(machinesRes.results || machinesRes);
      setTypes(typesRes.results || typesRes);
      setSpares(sparesRes.results || sparesRes);
    } catch (err) {
      console.error('Failed to load machines data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    try {
      setSubmitting(true);
      // Update machine health & status
      await api.patch(`/assets/machines/${selectedMachine.id}/`, {
        health: maintenanceForm.new_health,
        status: maintenanceForm.new_status,
        last_service_date: new Date().toISOString().split('T')[0]
      });

      // If spare part used, deduct inventory
      if (maintenanceForm.spare_part_id) {
        await api.post('/assets/spare-transactions/', {
          spare_part: Number(maintenanceForm.spare_part_id),
          transaction_type: 'USAGE',
          quantity: maintenanceForm.spare_quantity,
          reference: `Service on Machine ${selectedMachine.machine_code}`,
          notes: maintenanceForm.action_taken
        });
      }

      setSelectedMachine(null);
      alert(`Service record saved successfully for Machine ${selectedMachine.machine_code}!`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMachines = machines.filter((m) => {
    const matchesBuilding = 
      buildingFilter === 'ALL' || 
      m.building === buildingFilter || 
      m.building === `Building ${buildingFilter}` ||
      m.building === `B${buildingFilter}`;
    const matchesHealth = healthFilter === 'ALL' || m.health === healthFilter;
    const matchesType = typeFilter === 'ALL' || String(m.machine_type) === typeFilter;
    const matchesSearch = 
      m.machine_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.room && m.room.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesBuilding && matchesHealth && matchesType && matchesSearch;
  });

  const totalCount = machines.length;
  const normalCount = machines.filter((m) => m.health === 'NORMAL').length;
  const serviceCount = machines.filter((m) => m.health === 'NEEDS_SERVICE').length;
  const criticalCount = machines.filter((m) => m.health === 'CRITICAL').length;
  const activeCount = machines.filter((m) => m.status === 'ACTIVE').length;
  const activePercent = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-rust/10 text-factory-amber">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              All 365 Factory Machines
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Catalog of braiding and tipping machines in Building 1 and Building 2, with machine condition and service records.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors self-end sm:self-auto cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[10px] font-bold text-factory-muted uppercase tracking-wider">
            Total Machines
          </div>
          <div className="text-2xl font-bold text-factory-paper mt-1">
            {totalCount}
          </div>
          <div className="text-[11px] text-factory-muted mt-0.5">365 factory units</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[10px] font-bold text-factory-muted uppercase tracking-wider">
            Good Condition
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {normalCount}
          </div>
          <div className="text-[11px] text-factory-muted mt-0.5">Working properly</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[10px] font-bold text-factory-muted uppercase tracking-wider">
            Needs Service Soon
          </div>
          <div className="text-2xl font-bold text-factory-amber mt-1">
            {serviceCount}
          </div>
          <div className="text-[11px] text-factory-muted mt-0.5">Routine oiling & check</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[10px] font-bold text-factory-muted uppercase tracking-wider">
            Urgent Repair
          </div>
          <div className="text-2xl font-bold text-factory-crimson mt-1">
            {criticalCount}
          </div>
          <div className="text-[11px] text-factory-muted mt-0.5">Immediate repair needed</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[10px] font-bold text-factory-muted uppercase tracking-wider">
            Running Rate
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {activePercent}%
          </div>
          <div className="text-[11px] text-factory-muted mt-0.5">{activeCount} / {totalCount} operating</div>
        </div>
      </div>

      {/* Building Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Building selector */}
        <div className="flex bg-factory-darkCard p-1 rounded-xl border border-factory-darkBorder overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Buildings' },
            { id: '1', label: 'Building 1 (Braiding Floor)' },
            { id: '2', label: 'Building 2 (Tipping & Store)' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setBuildingFilter(b.id as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                buildingFilter === b.id
                  ? 'bg-factory-rust text-white shadow font-semibold'
                  : 'text-factory-muted hover:text-factory-paper'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Health filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Condition' },
            { id: 'NORMAL', label: 'Good' },
            { id: 'NEEDS_SERVICE', label: 'Needs Service' },
            { id: 'CRITICAL', label: 'Urgent Repair' },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => setHealthFilter(h.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                healthFilter === h.id
                  ? 'bg-factory-amber/20 text-factory-amber border border-factory-amber/40 font-semibold'
                  : 'bg-factory-darkCard border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search code (e.g. MB1-001), room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>
      </div>

      {/* Machines Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider border-b border-factory-darkBorder">
                <th className="py-3 px-4">Machine Code</th>
                <th className="py-3 px-4">Type & Purpose</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Running Health</th>
                <th className="py-3 px-4">Last Service</th>
                <th className="py-3 px-4">Running Status</th>
                <th className="py-3 px-4 text-right">Record Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading factory machines...
                  </td>
                </tr>
              ) : filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No machines found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMachines.slice(0, 100).map((m) => {
                  const score = parseFloat(m.performance_score || '0');
                  return (
                    <tr key={m.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-factory-amber shrink-0" />
                          <span className="font-semibold text-factory-paper text-sm">
                            {m.machine_code}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-factory-paper">{m.machine_type_name || m.name}</div>
                        <div className="text-[10px] text-factory-muted">{m.product_type || 'Braiding Lace'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted">
                        <div>{m.building}</div>
                        <div className="text-[10px] text-factory-paper">{m.room || 'Shop Floor'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider ${
                            m.health === 'NORMAL'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : m.health === 'CRITICAL'
                              ? 'bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/30'
                              : 'bg-factory-amber/20 text-factory-amber border border-factory-amber/30'
                          }`}
                        >
                          {m.health === 'NORMAL' ? 'GOOD' : m.health === 'CRITICAL' ? 'URGENT REPAIR' : 'NEEDS SERVICE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-factory-dark rounded-full overflow-hidden border border-factory-darkBorder">
                            <div
                              className={`h-full ${
                                score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-factory-amber' : 'bg-factory-crimson'
                              }`}
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                          <span className="text-factory-paper font-semibold text-[11px]">{score}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted text-[11px]">
                        {m.service_time || m.last_service_date || 'Standard'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.status === 'ACTIVE'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-factory-amber bg-factory-amber/10'
                          }`}
                        >
                          {m.status === 'ACTIVE' ? 'RUNNING' : m.status === 'MAINTENANCE' ? 'UNDER SERVICE' : 'STOPPED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedMachine(m);
                            setMaintenanceForm({
                              technician_name: 'Lead Mechanic',
                              action_taken: `Service on ${m.machine_code}`,
                              new_health: 'NORMAL',
                              new_status: 'ACTIVE',
                              spare_part_id: '',
                              spare_quantity: '1',
                              cost: '0.00'
                            });
                          }}
                          className="px-2.5 py-1 bg-factory-rust/20 hover:bg-factory-rust/30 text-factory-amber rounded border border-factory-rust/40 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" />
                          Record Service
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredMachines.length > 100 && (
          <div className="p-3 text-center text-xs text-factory-muted bg-factory-dark/40 border-t border-factory-darkBorder">
            Showing first 100 of {filteredMachines.length} machines. Use the search box above to find a specific machine code.
          </div>
        )}
      </div>

      {/* MODAL: Log Service / Maintenance */}
      {selectedMachine && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Wrench className="w-4 h-4 text-factory-amber" />
                Record Service for Machine {selectedMachine.machine_code}
              </h2>
              <button
                onClick={() => setSelectedMachine(null)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-factory-muted">Location:</span>
                <span className="text-factory-paper font-semibold">{selectedMachine.building} - {selectedMachine.room}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-factory-muted">Current Condition:</span>
                <span className="font-semibold text-factory-amber">{selectedMachine.health === 'NORMAL' ? 'Good' : selectedMachine.health === 'CRITICAL' ? 'Urgent Repair' : 'Needs Service'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-factory-muted">Common Issue:</span>
                <span className="text-factory-paper">{selectedMachine.most_frequent_issue || 'None reported'}</span>
              </div>
            </div>

            <form onSubmit={handleLogMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Technician / Mechanic Name</label>
                <input
                  type="text"
                  value={maintenanceForm.technician_name}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technician_name: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Work Done / Action Taken</label>
                <textarea
                  value={maintenanceForm.action_taken}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, action_taken: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper h-16 focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Updated Condition</label>
                  <select
                    value={maintenanceForm.new_health}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, new_health: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  >
                    <option value="NORMAL">Good (Working Well)</option>
                    <option value="NEEDS_SERVICE">Needs Service Soon</option>
                    <option value="CRITICAL">Urgent Repair Needed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Running Status</label>
                  <select
                    value={maintenanceForm.new_status}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, new_status: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  >
                    <option value="ACTIVE">Running</option>
                    <option value="MAINTENANCE">Under Service</option>
                    <option value="OFFLINE">Stopped / Turned Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">
                  Spare Part Used (Automatically updates spare parts shelf)
                </label>
                <select
                  value={maintenanceForm.spare_part_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, spare_part_id: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                >
                  <option value="">-- No spare parts used --</option>
                  {spares.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.part_code} - {sp.name} (On Shelf: {sp.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {maintenanceForm.spare_part_id && (
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Quantity Used</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={maintenanceForm.spare_quantity}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, spare_quantity: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold focus:outline-none focus:border-factory-amber"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMachine(null)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Service Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
