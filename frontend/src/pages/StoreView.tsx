import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Lock, CheckCircle, 
  AlertCircle, Barcode, RefreshCw, Trash2
} from 'lucide-react';
import { api } from '../api/client';
import { FinishedProductBag, ProductVariant, ProductionBatch } from '../types';

export const StoreView: React.FC = () => {
  const [bags, setBags] = useState<FinishedProductBag[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Manual Bag Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBag, setNewBag] = useState({
    product_variant: '',
    batch: '',
    weight_kg: '32.00',
    store_location: 'MAIN_STORE_RACK_1',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchBags = async () => {
    try {
      setLoading(true);
      const [bagsRes, variantsRes, batchesRes] = await Promise.all([
        api.get<any>('/store/bags/'),
        api.get<any>('/catalog/variants/'),
        api.get<any>('/production/batches/')
      ]);
      setBags(bagsRes.results || bagsRes);
      setVariants(variantsRes.results || variantsRes);
      setBatches(batchesRes.results || batchesRes);
    } catch (err) {
      console.error('Failed to load store bags', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBags();
  }, []);

  const handleCreateBag = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const weightNum = parseFloat(newBag.weight_kg);
    if (isNaN(weightNum) || weightNum <= 0) {
      setFormError('Sack weight must be greater than 0 KG.');
      return;
    }
    if (!newBag.product_variant) {
      setFormError('Please select a shoe lace product.');
      return;
    }

    if (newBag.batch) {
      const b = batches.find(x => x.id === newBag.batch);
      if (b) {
        const remaining = parseFloat(b.remaining_unpacked_kg || '0');
        if (remaining > 0 && weightNum > remaining) {
          setFormError(`Cannot pack ${weightNum.toFixed(2)} KG. Only ${remaining.toFixed(2)} KG of unpacked finished shoelaces remain for batch ${b.batch_number}.`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await api.post('/store/bags/', {
        product_variant: Number(newBag.product_variant),
        batch: newBag.batch || null,
        weight_kg: weightNum.toFixed(2),
        store_location: newBag.store_location,
        status: 'IN_STORE'
      });
      setShowAddModal(false);
      setNewBag({
        product_variant: '',
        batch: '',
        weight_kg: '32.00',
        store_location: 'MAIN_STORE_RACK_1',
      });
      fetchBags();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create finished sack');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBag = async (bag: FinishedProductBag) => {
    if (!confirm(`Are you sure you want to remove sack ${bag.bag_id} (${bag.weight_kg} KG)? This will delete it from store inventory and restore the production run.`)) {
      return;
    }
    try {
      setLoading(true);
      await api.delete(`/store/bags/${bag.id}/`);
      fetchBags();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sack');
    } finally {
      setLoading(false);
    }
  };

  const filteredBags = bags.filter((bag) => {
    const matchesStatus = statusFilter === 'ALL' || bag.status === statusFilter;
    const matchesSearch = 
      bag.bag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bag.product_name && bag.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bag.store_location && bag.store_location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const inStoreBags = bags.filter((b) => b.status === 'IN_STORE');
  const totalInStoreKg = inStoreBags.reduce((sum, b) => sum + parseFloat(b.weight_kg || '0'), 0);
  const dispatchedBags = bags.filter((b) => b.status === 'DISPATCHED');
  const totalDispatchedKg = dispatchedBags.reduce((sum, b) => sum + parseFloat(b.weight_kg || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Finished Sacks Store
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Finished shoe lace sacks ready for customer orders. Each sack has a unique tag, can be packed flexibly from production runs, and is tracked until delivery.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchBags}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Add New Sack
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Sacks in Store
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {inStoreBags.length} <span className="text-xs font-normal text-factory-muted">sacks</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Available for customer orders</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Total Weight in Store
          </div>
          <div className="text-2xl font-bold text-factory-paper mt-1">
            {totalInStoreKg.toFixed(2)} <span className="text-xs font-normal text-factory-muted">KG</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Sum of all sacks in warehouse</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Sacks Shipped Out
          </div>
          <div className="text-2xl font-bold text-factory-amber mt-1">
            {dispatchedBags.length} <span className="text-xs font-normal text-factory-muted">sacks</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Shipped to customers</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Total Shipped Weight
          </div>
          <div className="text-2xl font-bold text-factory-paper mt-1">
            {totalDispatchedKg.toFixed(2)} <span className="text-xs font-normal text-factory-muted">KG</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Fulfilled customer orders</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search by Sack Tag, Product, or Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Sacks' },
            { id: 'IN_STORE', label: 'In Store' },
            { id: 'DISPATCHED', label: 'Shipped Out' },
            { id: 'RESERVED', label: 'Reserved' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-factory-amber/20 text-factory-amber border border-factory-amber/40 font-semibold'
                  : 'bg-factory-darkCard border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bags Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider border-b border-factory-darkBorder">
                <th className="py-3 px-4">Sack Tag #</th>
                <th className="py-3 px-4">Shoe Lace Product</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Shelf Location</th>
                <th className="py-3 px-4">Production Run</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Shipping Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading finished sacks...
                  </td>
                </tr>
              ) : filteredBags.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No finished shoe lace sacks found matching the search.
                  </td>
                </tr>
              ) : (
                filteredBags.map((bag) => {
                  const weightNum = parseFloat(bag.weight_kg);
                  const isDispatched = bag.status === 'DISPATCHED';
                  return (
                    <tr key={bag.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-factory-amber shrink-0" />
                          <span className="font-semibold text-factory-paper">
                            {bag.bag_id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        {bag.product_name}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className="px-2 py-0.5 rounded bg-factory-dark border border-factory-darkBorder text-factory-paper">
                          {weightNum.toFixed(2)} KG
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted">
                        {bag.store_location || 'Main Warehouse'}
                      </td>
                      <td className="py-3.5 px-4 text-factory-amber text-[11px] font-medium">
                        {bag.batch_number || 'Direct Entry'}
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted text-[11px]">
                        {bag.entry_date ? new Date(bag.entry_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider ${
                            bag.status === 'IN_STORE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : bag.status === 'DISPATCHED'
                              ? 'bg-factory-muted/20 text-factory-muted border border-factory-muted/30'
                              : 'bg-factory-amber/20 text-factory-amber border border-factory-amber/30'
                          }`}
                        >
                          {bag.status === 'IN_STORE' ? 'IN STORE' : bag.status === 'DISPATCHED' ? 'SHIPPED' : 'RESERVED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isDispatched ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-factory-muted bg-factory-dark px-2 py-1 rounded border border-factory-darkBorder">
                              <Lock className="w-3 h-3 text-factory-amber" />
                              Shipped (Protected)
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3" />
                                Available
                              </span>
                              <button
                                onClick={() => handleDeleteBag(bag)}
                                className="p-1 text-factory-muted hover:text-factory-crimson hover:bg-factory-crimson/10 rounded transition-colors cursor-pointer"
                                title="Delete/remove this sack from store"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Manual Finished Bag */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Package className="w-4 h-4 text-factory-amber" />
                Record Finished Shoe Lace Sack
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBag} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Source Production Run (Optional)</label>
                <select
                  value={newBag.batch}
                  onChange={(e) => {
                    const selectedBatchId = e.target.value;
                    const b = batches.find(x => x.id === selectedBatchId);
                    setNewBag(prev => ({
                      ...prev,
                      batch: selectedBatchId,
                      product_variant: b?.product_variant ? String(b.product_variant) : prev.product_variant,
                      weight_kg: b && parseFloat(b.remaining_unpacked_kg || '0') > 0 ? b.remaining_unpacked_kg! : prev.weight_kg
                    }));
                  }}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                >
                  <option value="">-- Standalone / No Linked Run --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} — {b.product_name} ({b.status}) {b.remaining_unpacked_kg ? `[${b.remaining_unpacked_kg} KG Unpacked]` : ''}
                    </option>
                  ))}
                </select>
                {newBag.batch && (() => {
                  const b = batches.find(x => x.id === newBag.batch);
                  if (!b) return null;
                  const remainingNum = parseFloat(b.remaining_unpacked_kg || '0');
                  return (
                    <div className="mt-1.5 p-2 rounded bg-factory-dark border border-factory-darkBorder flex items-center justify-between text-[11px]">
                      <span className="text-factory-muted">
                        Batch Output: <b className="text-factory-paper">{b.finished_output_kg || '0.00'} KG</b> | Packed: <b className="text-emerald-400">{b.total_packed_kg || '0.00'} KG</b>
                      </span>
                      {remainingNum > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewBag(prev => ({ ...prev, weight_kg: remainingNum.toFixed(2) }))}
                          className="text-factory-amber underline font-medium cursor-pointer"
                        >
                          Fill Remaining ({remainingNum.toFixed(2)} KG)
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Select Shoe Lace Product</label>
                <select
                  value={newBag.product_variant}
                  onChange={(e) => setNewBag({ ...newBag, product_variant: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.serial_code} - {v.color_details?.name || 'Standard'} ({v.thickness_details?.name || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-factory-muted font-medium">
                    Sack Weight (KG)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewBag(prev => ({ ...prev, weight_kg: '32.00' }))}
                      className="px-1.5 py-0.5 rounded bg-factory-dark border border-factory-darkBorder text-[10px] text-factory-amber hover:border-factory-amber cursor-pointer"
                    >
                      32 KG
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBag(prev => ({ ...prev, weight_kg: '50.00' }))}
                      className="px-1.5 py-0.5 rounded bg-factory-dark border border-factory-darkBorder text-[10px] text-factory-amber hover:border-factory-amber cursor-pointer"
                    >
                      50 KG
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newBag.weight_kg}
                  onChange={(e) => setNewBag({ ...newBag, weight_kg: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold text-sm focus:outline-none focus:border-factory-amber"
                  required
                />
                <p className="text-[11px] text-factory-muted mt-1">
                  Pack any weight into this sack (e.g. 32 KG, 50 KG, 15 KG). Counts directly from production batch and records in warehouse inventory.
                </p>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Store Shelf / Bay Location</label>
                <input
                  type="text"
                  value={newBag.store_location}
                  onChange={(e) => setNewBag({ ...newBag, store_location: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  Save Sack to Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
