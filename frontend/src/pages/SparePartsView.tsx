import React, { useState, useEffect } from 'react';
import { 
  Wrench, Search, AlertTriangle, Plus, RefreshCw, 
  MapPin, DollarSign, CheckCircle2, Tag
} from 'lucide-react';
import { api } from '../api/client';
import { SparePart, MachineType } from '../types';

export const SparePartsView: React.FC = () => {
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [types, setTypes] = useState<MachineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Restock Modal
  const [selectedSpare, setSelectedSpare] = useState<SparePart | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockCost, setRestockCost] = useState('50.00');
  const [submitting, setSubmitting] = useState(false);

  // Add Spare Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpare, setNewSpare] = useState({
    part_code: '',
    name: '',
    place: 'SPARE_ROOM_SHELF_A',
    quantity: '20',
    minimum_stock: '5',
    unit_cost: '45.00'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sparesRes, typesRes] = await Promise.all([
        api.get<any>('/assets/spares/'),
        api.get<any>('/assets/types/')
      ]);
      setSpares(sparesRes.results || sparesRes);
      setTypes(typesRes.results || typesRes);
    } catch (err) {
      console.error('Failed to load spare parts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpare) return;
    try {
      setSubmitting(true);
      await api.post('/assets/spare-transactions/', {
        spare_part: selectedSpare.id,
        transaction_type: 'PURCHASE',
        quantity: restockQty,
        reference: 'Stock Replenishment',
        notes: `Replenished stock of ${selectedSpare.name}`
      });
      setSelectedSpare(null);
      alert('Spare part restocked successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to restock spare part');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSpare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/assets/spares/', newSpare);
      setShowAddModal(false);
      setNewSpare({
        part_code: '',
        name: '',
        place: 'SPARE_ROOM_SHELF_A',
        quantity: '20',
        minimum_stock: '5',
        unit_cost: '45.00'
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add spare part');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSpares = spares.filter((sp) => {
    const matchesSearch = 
      sp.part_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sp.place && sp.place.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLowStock = filterLowStock ? sp.is_low_stock : true;
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = spares.filter((s) => s.is_low_stock).length;
  const totalValue = spares.reduce(
    (sum, s) => sum + parseFloat(s.quantity || '0') * parseFloat(s.unit_cost || '0'),
    0
  );

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
              Spare Parts & Machine Components
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Preserving Excel's SPARES and MACHINE PARTS sheets: quantities, shelf locations, and machine compatibility.
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
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20"
          >
            <Plus className="w-4 h-4" />
            Add Spare Part
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Total Catalog Spares
          </div>
          <div className="text-2xl font-bold font-mono text-factory-paper mt-1">
            {spares.length}
          </div>
          <div className="text-xs text-factory-muted mt-1">Components tracked</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Low Stock Alerts
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${lowStockCount > 0 ? 'text-factory-crimson' : 'text-emerald-400'}`}>
            {lowStockCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Below minimum reorder point</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Inventory Valuation (ETB)
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Total replacement value</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search by Part Code, Name, Shelf..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>

        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
            filterLowStock
              ? 'bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/40'
              : 'bg-factory-darkCard border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock ({lowStockCount})
        </button>
      </div>

      {/* Spares Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Part Code</th>
                <th className="py-3 px-4">Part Name</th>
                <th className="py-3 px-4">Location (Shelf)</th>
                <th className="py-3 px-4">In Stock</th>
                <th className="py-3 px-4">Min. Threshold</th>
                <th className="py-3 px-4">Unit Cost (ETB)</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading spare parts...
                  </td>
                </tr>
              ) : filteredSpares.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No spare parts found.
                  </td>
                </tr>
              ) : (
                filteredSpares.map((sp) => {
                  const qty = parseFloat(sp.quantity || '0');
                  const min = parseFloat(sp.minimum_stock || '0');
                  return (
                    <tr key={sp.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                        {sp.part_code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        <div>{sp.name}</div>
                        {sp.compatible_machine_type_names && sp.compatible_machine_type_names.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sp.compatible_machine_type_names.map((t, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-factory-dark border border-factory-darkBorder text-factory-muted font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted font-mono">
                        {sp.place || sp.room || 'Workshop Shelf'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        <span className={sp.is_low_stock ? 'text-factory-crimson' : 'text-emerald-400'}>
                          {qty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-muted">
                        {min}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-paper">
                        {parseFloat(sp.unit_cost || '0').toFixed(2)} ETB
                      </td>
                      <td className="py-3.5 px-4">
                        {sp.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/30">
                            <AlertTriangle className="w-3 h-3" />
                            REORDER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            HEALTHY
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSpare(sp);
                            setRestockQty('10');
                          }}
                          className="px-2.5 py-1 bg-factory-rust/20 hover:bg-factory-rust/30 text-factory-amber rounded border border-factory-rust/40 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Restock */}
      {selectedSpare && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Plus className="w-4 h-4 text-factory-amber" />
                Restock Spare Part
              </h2>
              <button
                onClick={() => setSelectedSpare(null)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1">
              <div className="text-factory-muted">Selected Component:</div>
              <div className="font-mono font-bold text-factory-amber">{selectedSpare.part_code} - {selectedSpare.name}</div>
              <div className="text-emerald-400 font-mono">Current Quantity: {selectedSpare.quantity}</div>
            </div>

            <form onSubmit={handleRestock} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Quantity to Add</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Unit Cost (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSpare(null)}
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
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Spare Part */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Wrench className="w-4 h-4 text-factory-amber" />
                Add New Spare Part
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSpare} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Part Code (e.g. SP-NDL-01)</label>
                <input
                  type="text"
                  value={newSpare.part_code}
                  onChange={(e) => setNewSpare({ ...newSpare, part_code: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Part Name</label>
                <input
                  type="text"
                  value={newSpare.name}
                  onChange={(e) => setNewSpare({ ...newSpare, name: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Initial Quantity</label>
                  <input
                    type="number"
                    step="1"
                    value={newSpare.quantity}
                    onChange={(e) => setNewSpare({ ...newSpare, quantity: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Safety Minimum</label>
                  <input
                    type="number"
                    step="1"
                    value={newSpare.minimum_stock}
                    onChange={(e) => setNewSpare({ ...newSpare, minimum_stock: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Unit Cost (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSpare.unit_cost}
                    onChange={(e) => setNewSpare({ ...newSpare, unit_cost: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Shelf / Location</label>
                  <input
                    type="text"
                    value={newSpare.place}
                    onChange={(e) => setNewSpare({ ...newSpare, place: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  Save Spare Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
