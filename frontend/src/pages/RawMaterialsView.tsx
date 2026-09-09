import React, { useState, useEffect } from 'react';
import { 
  Layers, Search, AlertTriangle, Plus, 
  RefreshCw, ClipboardList, MapPin, CheckCircle, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { RawMaterialVariant } from '../types';

export const RawMaterialsView: React.FC = () => {
  const [variants, setVariants] = useState<RawMaterialVariant[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Stock Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<RawMaterialVariant | null>(null);
  const [requestQty, setRequestQty] = useState('50.00');
  const [requesterName, setRequesterName] = useState('Kebede Alemu');
  const [department, setDepartment] = useState('Braiding Section');
  const [reason, setReason] = useState('Production batch yarn requirement');
  const [submitting, setSubmitting] = useState(false);

  // Add Material Stock Modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockError, setAddStockError] = useState<string | null>(null);
  const [newStock, setNewStock] = useState({
    raw_material_variant: '',
    place: 'MAIN_YARN_STORE',
    st_v: '0.00',
    st_n: '0.00',
    quantity_kg: '100.00',
    remark: 'New shipment reception'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [varsRes, stocksRes] = await Promise.all([
        api.get<any>('/inventory/variants/'),
        api.get<any>('/inventory/stocks/')
      ]);
      setVariants(varsRes.results || varsRes);
      setStocks(stocksRes.results || stocksRes);
    } catch (err) {
      console.error('Failed to load raw materials', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;
    try {
      setSubmitting(true);
      await api.post('/inventory/stock-requests/', {
        requester_name: requesterName,
        department,
        reason,
        items: [
          {
            item_type: 'RAW_MATERIAL',
            raw_material_variant: selectedVariant.id,
            requested_quantity: requestQty,
            unit: 'KG'
          }
        ]
      });
      setShowRequestModal(false);
      setSelectedVariant(null);
      alert('Yarn request submitted successfully to warehouse manager!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit stock request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStockError(null);
    const variantId = Number(newStock.raw_material_variant);
    if (!variantId) {
      setAddStockError('Please select a yarn type');
      return;
    }
    const qty = parseFloat(newStock.quantity_kg);
    if (isNaN(qty) || qty <= 0) {
      setAddStockError('Quantity must be greater than 0 KG');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/inventory/stocks/', {
        variant: variantId,
        raw_material_variant: variantId,
        place_text: newStock.place,
        place: newStock.place,
        st_v: newStock.st_v || '0.00',
        st_n: newStock.st_n || '0.00',
        total_kg: qty.toFixed(2),
        available_kg: qty.toFixed(2),
        quantity_kg: qty.toFixed(2),
        remark: newStock.remark,
        notes: newStock.remark
      });
      setShowAddStockModal(false);
      setNewStock({
        raw_material_variant: '',
        place: 'MAIN_YARN_STORE',
        st_v: '0.00',
        st_n: '0.00',
        quantity_kg: '100.00',
        remark: 'New shipment reception'
      });
      fetchData();
    } catch (err: any) {
      setAddStockError(err.message || 'Failed to register shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVariants = variants.filter((v) => {
    const matchesSearch = 
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.material_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.color_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = filterLowStock ? v.is_low_stock : true;
    return matchesSearch && matchesLowStock;
  });

  const totalKg = variants.reduce((sum, v) => sum + (v.total_available_kg || 0), 0);
  const lowStockCount = variants.filter((v) => v.is_low_stock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-amber/10 text-factory-amber">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Raw Yarn Warehouse (Spools & Bales)
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Track yarn warehouse inventory by color, starting volume, location, and safety stock levels.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddStockModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Add Yarn Shipment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Total Yarn in Warehouse
          </div>
          <div className="text-2xl font-bold text-factory-paper mt-1">
            {totalKg.toFixed(2)} <span className="text-xs font-normal text-factory-muted">KG</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Available across all yarn colors</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Yarn Colors & Types
          </div>
          <div className="text-2xl font-bold text-factory-amber mt-1">
            {variants.length} <span className="text-xs font-normal text-factory-muted">types</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">In active production use</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Low Yarn Warnings
          </div>
          <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-factory-crimson' : 'text-emerald-400'}`}>
            {lowStockCount} <span className="text-xs font-normal text-factory-muted">alerts</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Below safety stock level</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search yarn by code, color, or material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterLowStock
                ? 'bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/40 font-semibold'
                : 'bg-factory-darkCard border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Show Low Stock Only ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider border-b border-factory-darkBorder">
                <th className="py-3 px-4">Yarn Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Color</th>
                <th className="py-3 px-4">Safety Stock</th>
                <th className="py-3 px-4">In Warehouse</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Request Yarn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading yarn inventory...
                  </td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-factory-muted">
                    No yarn types match your search.
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => {
                  const available = v.total_available_kg || 0;
                  const minStock = parseFloat(v.minimum_stock_kg || '0');
                  return (
                    <tr key={v.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-factory-amber">
                        {v.code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        {v.material_type_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-factory-dark border border-factory-darkBorder text-factory-paper text-xs">
                          <span className="w-2 h-2 rounded-full bg-factory-amber" />
                          {v.color_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted">
                        {minStock.toFixed(2)} KG
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={`text-sm ${v.is_low_stock ? 'text-factory-crimson' : 'text-emerald-400'}`}>
                          {available.toFixed(2)} KG
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {v.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/30">
                            <AlertTriangle className="w-3 h-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            GOOD
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedVariant(v);
                            setShowRequestModal(true);
                          }}
                          className="px-3 py-1 bg-factory-rust/20 hover:bg-factory-rust/30 text-factory-amber rounded border border-factory-rust/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Request Yarn
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

      {/* Storage Locations / Sub-stocks breakdown */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold font-heading text-factory-paper flex items-center gap-2">
          <MapPin className="w-4 h-4 text-factory-amber" />
          Yarn Warehouse Storage Locations & Bales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stocks.slice(0, 8).map((st) => (
            <div key={st.id} className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-factory-amber">{st.place_text || st.place || 'Main Shelf'}</span>
                <span className="text-emerald-400 font-bold">{parseFloat(st.available_kg || st.quantity_kg || st.total_kg || '0').toFixed(1)} KG</span>
              </div>
              <div className="text-factory-muted text-[11px] truncate">
                Starting Bales: <span className="text-factory-paper">{st.st_v}</span> | Code: <span className="text-factory-paper">{st.st_n}</span>
              </div>
              <div className="text-[10px] text-factory-muted truncate">
                {st.remark || st.variant_name || 'Standard shelf allocation'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Create Stock Request */}
      {showRequestModal && selectedVariant && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-factory-amber" />
                Request Yarn for Production
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1">
              <div className="text-factory-muted">Selected Yarn:</div>
              <div className="font-semibold text-factory-amber">{selectedVariant.code} - {selectedVariant.color_name}</div>
              <div className="text-factory-paper">{selectedVariant.material_type_name}</div>
              <div className="text-emerald-400 font-semibold">
                Available in Warehouse: {selectedVariant.total_available_kg.toFixed(2)} KG
              </div>
            </div>

            <form onSubmit={handleCreateStockRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Requested Quantity (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold text-sm focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Requester Name</label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Department / Section</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Reason for Request</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper h-16 focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center gap-2 shadow cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Stock Entry */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Plus className="w-4 h-4 text-factory-amber" />
                Add New Yarn Shipment
              </h2>
              <button
                onClick={() => setShowAddStockModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addStockError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{addStockError}</span>
              </div>
            )}

            <form onSubmit={handleAddStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Yarn Type & Color</label>
                <select
                  value={newStock.raw_material_variant}
                  onChange={(e) => setNewStock({ ...newStock, raw_material_variant: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                >
                  <option value="">-- Select Yarn --</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.code} - {v.color_name} ({v.material_type_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Received Quantity (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={newStock.quantity_kg}
                  onChange={(e) => setNewStock({ ...newStock, quantity_kg: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Starting Volume / Bales (ST V)</label>
                  <input
                    type="text"
                    value={newStock.st_v}
                    onChange={(e) => setNewStock({ ...newStock, st_v: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Stock Reference Code (ST N)</label>
                  <input
                    type="text"
                    value={newStock.st_n}
                    onChange={(e) => setNewStock({ ...newStock, st_n: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
                  />
                </div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Warehouse Shelf / Bay Location</label>
                <input
                  type="text"
                  value={newStock.place}
                  onChange={(e) => setNewStock({ ...newStock, place: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Notes / Supplier Name</label>
                <input
                  type="text"
                  value={newStock.remark}
                  onChange={(e) => setNewStock({ ...newStock, remark: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
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
                  Save Yarn Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
