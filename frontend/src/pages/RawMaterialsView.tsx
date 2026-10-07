import React, { useState, useEffect } from 'react';
import { 
  Layers, Search, AlertTriangle, Plus, 
  RefreshCw, ClipboardList, MapPin, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { api } from '../api/client';
import { RawMaterialVariant } from '../types';
import { useAuth } from '../context/AuthContext';

export const RawMaterialsView: React.FC = () => {
  const { user } = useAuth();
  const [variants, setVariants] = useState<RawMaterialVariant[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Stock Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<RawMaterialVariant | null>(null);
  const [requestQty, setRequestQty] = useState('50.00');
  const [requesterName, setRequesterName] = useState('Kebede Alemu');
  const [department, setDepartment] = useState('Braiding Section');
  const [reason, setReason] = useState('Production batch yarn requirement');
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Add Material Stock Modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockError, setAddStockError] = useState<string | null>(null);
  const [newStock, setNewStock] = useState({
    raw_material_variant: '',
    place: 'MAIN_YARN_STORE',
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

  useEffect(() => {
    if (user?.full_name) {
      setRequesterName(user.full_name);
    }
    if (user?.department) {
      setDepartment(user.department);
    }
  }, [user]);

  const handleCreateStockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;
    setRequestError(null);
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
      setSuccessToast(`Yarn request for ${requestQty} KG submitted successfully!`);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchData();
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit stock request');
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
        total_kg: qty.toFixed(2),
        available_kg: qty.toFixed(2),
        quantity_kg: qty.toFixed(2),
        remark: newStock.remark,
        notes: newStock.remark
      });
      setShowAddStockModal(false);
      setSuccessToast(`Yarn shipment of ${qty.toFixed(2)} KG registered successfully!`);
      setTimeout(() => setSuccessToast(null), 5000);
      setNewStock({
        raw_material_variant: '',
        place: 'MAIN_YARN_STORE',
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

  const filteredVariants = (Array.isArray(variants) ? variants : []).filter((v) => {
    const code = (v.code || '').toLowerCase();
    const matType = (v.material_type_name || (v as any).material_type?.name || '').toLowerCase();
    const color = (v.color_name || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = code.includes(search) || matType.includes(search) || color.includes(search);
    const matchesLowStock = filterLowStock ? v.is_low_stock : true;
    return matchesSearch && matchesLowStock;
  });

  const totalKg = (Array.isArray(variants) ? variants : []).reduce((sum, v) => sum + (parseFloat(String(v.total_available_kg || 0)) || 0), 0);
  const lowStockCount = (Array.isArray(variants) ? variants : []).filter((v) => v.is_low_stock).length;

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
            Add Yarn Shipment
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-xl bg-factory-darkCard border border-factory-darkBorder text-factory-paper text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-factory-secondary shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-factory-muted hover:text-factory-paper cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Total Yarn in Warehouse
          </div>
          <div className="text-2xl font-bold text-factory-paper mt-1">
            {totalKg.toFixed(2)} <span className="text-xs font-normal text-factory-muted">KG</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">
            ≈ {(totalKg / 32).toFixed(1)} standard 32 KG batches available
          </div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Yarn Colors & Types
          </div>
          <div className="text-2xl font-bold text-factory-cream mt-1">
            {variants.length} <span className="text-xs font-normal text-factory-muted">types</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">In active production use</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Low Yarn Warnings
          </div>
          <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-500' : 'text-factory-paper'}`}>
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
          <table className="w-full text-left border-collapse min-w-[850px] whitespace-nowrap">
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
                  const available = parseFloat(String(v.total_available_kg || 0)) || 0;
                  const minStock = parseFloat(String(v.minimum_stock_kg || 0)) || 0;
                  return (
                    <tr key={v.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-factory-paper">
                        {v.code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        {v.material_type_name || (v as any).material_type?.name || 'Raw Material'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-factory-dark border border-factory-darkBorder text-factory-paper text-xs">
                          <span className="w-2 h-2 rounded-full bg-factory-secondary" />
                          {v.color_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted">
                        {minStock.toFixed(2)} KG
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <div>
                          <span className={`text-sm ${v.is_low_stock ? 'text-red-500' : 'text-factory-paper'}`}>
                            {available.toFixed(2)} KG
                          </span>
                          <span className="block text-[10px] font-mono text-factory-muted font-normal mt-0.5">
                            ≈ {(available / 32).toFixed(1)} Batches (32 KG)
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {v.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-factory-dark text-factory-paper border border-factory-darkBorder">
                            <CheckCircle className="w-3 h-3 text-factory-muted" />
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
                          className="px-3 py-1 bg-factory-secondary/15 hover:bg-factory-secondary/25 text-factory-paper rounded border border-factory-secondary/30 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-factory-secondary" />
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
          <MapPin className="w-4 h-4 text-factory-secondary" />
          Yarn Warehouse Storage Locations & Bales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stocks.slice(0, 8).map((st) => (
            <div key={st.id} className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-factory-paper">{st.place_text || st.place || 'Main Shelf'}</span>
                <span className="text-factory-paper font-bold">{parseFloat(String(st.available_kg || st.quantity_kg || st.total_kg || 0)).toFixed(1)} KG</span>
              </div>
              <div className="text-factory-muted text-[11px] truncate">
                Storage: <span className="text-factory-paper">{st.place || 'Main Storage'}</span>
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
        <div
          onClick={() => setShowRequestModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-fade-in max-h-[94vh] sm:max-h-[90vh] overflow-y-auto cursor-default"
          >
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
              <div className="font-semibold text-factory-amber">{selectedVariant.code || 'RM-YARN'} - {selectedVariant.color_name || 'Natural'}</div>
              <div className="text-factory-paper">{selectedVariant.material_type_name || (selectedVariant as any).material_type?.name || 'Raw Material'}</div>
              <div className="text-factory-paper font-semibold font-mono">
                Available in Warehouse: {(parseFloat(String(selectedVariant?.total_available_kg || 0)) || 0).toFixed(2)} KG ({( (parseFloat(String(selectedVariant?.total_available_kg || 0)) || 0) / 32 ).toFixed(1)} Batches)
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-factory-dark border border-factory-darkBorder text-[11px] text-factory-muted flex items-start gap-2">
              <Info className="w-4 h-4 text-factory-secondary shrink-0 mt-0.5" />
              <span>
                Submitting this form submits an internal yarn requisition. When you start a production run in the <strong>Production View</strong>, the yarn consumed (32 KG per batch) is automatically deducted from this warehouse inventory.
              </span>
            </div>

            {requestError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{requestError}</span>
              </div>
            )}

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

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow cursor-pointer"
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
        <div
          onClick={() => setShowAddStockModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-fade-in max-h-[94vh] sm:max-h-[90vh] overflow-y-auto cursor-default"
          >
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
                      {v.code} - {v.color_name} ({v.material_type_name || (v as any).material_type?.name || 'Yarn'})
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
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold focus:outline-none focus:border-factory-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Warehouse Shelf / Bay Location</label>
                <input
                  type="text"
                  value={newStock.place}
                  onChange={(e) => setNewStock({ ...newStock, place: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Notes / Supplier Name</label>
                <input
                  type="text"
                  value={newStock.remark}
                  onChange={(e) => setNewStock({ ...newStock, remark: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-secondary"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer shadow"
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
