import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, Plus, Search, Filter, AlertTriangle, 
  DollarSign, Package, User, Calendar, CheckCircle2, RefreshCw, Lock
} from 'lucide-react';
import { api } from '../api/client';
import { DispatchOrder, Customer, FinishedProductBag } from '../types';

export const DispatchView: React.FC = () => {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableBags, setAvailableBags] = useState<FinishedProductBag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Dispatch Order Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CREDIT'>('CREDIT');
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);
  const [pricePerKg, setPricePerKg] = useState('180.00');
  const [creditAlert, setCreditAlert] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, customersRes, bagsRes] = await Promise.all([
        api.get<any>('/sales/orders/'),
        api.get<any>('/sales/customers/'),
        api.get<any>('/store/bags/?status=IN_STORE')
      ]);
      setOrders(ordersRes.results || ordersRes);
      setCustomers(customersRes.results || customersRes);
      setAvailableBags(bagsRes.results || bagsRes);
    } catch (err) {
      console.error('Failed to load dispatch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live order statistics for the modal
  const selectedBags = availableBags.filter((b) => selectedBagIds.includes(b.id));
  const totalWeightKg = selectedBags.reduce((sum, b) => sum + parseFloat(b.weight_kg || '0'), 0);
  const unitPrice = parseFloat(pricePerKg) || 0;
  const orderTotalAmount = totalWeightKg * unitPrice;

  // Real-time Credit Limit Validation
  useEffect(() => {
    if (!selectedCustomer || paymentMode === 'CASH') {
      setCreditAlert(null);
      return;
    }
    const currentOutstanding = parseFloat(selectedCustomer.current_outstanding || '0');
    const creditLimit = parseFloat(selectedCustomer.credit_limit || '0');
    const projectedTotal = currentOutstanding + orderTotalAmount;

    if (projectedTotal > creditLimit) {
      const excess = projectedTotal - creditLimit;
      setCreditAlert(
        `CREDIT LIMIT VIOLATION: Customer credit limit is ${creditLimit.toFixed(2)} ETB. Current outstanding is ${currentOutstanding.toFixed(2)} ETB. This order of ${orderTotalAmount.toFixed(2)} ETB would exceed the limit by ${excess.toFixed(2)} ETB.`
      );
    } else {
      setCreditAlert(null);
    }
  }, [selectedCustomer, paymentMode, orderTotalAmount]);

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (selectedBagIds.length === 0) {
      alert('Please select at least one finished product bag to dispatch');
      return;
    }
    if (creditAlert) {
      const confirmOverride = confirm(
        `${creditAlert}\n\nDo you have executive managerial approval to override this customer's credit limit?`
      );
      if (!confirmOverride) return;
    }

    try {
      setSubmitting(true);
      const items = selectedBags.map((b) => ({
        bag: b.id,
        price_per_kg: pricePerKg,
      }));

      await api.post('/sales/orders/', {
        customer: selectedCustomer.id,
        payment_mode: paymentMode,
        items,
        notes: `Dispatched ${selectedBags.length} bags (${totalWeightKg.toFixed(2)} KG)`
      });

      setShowCreateModal(false);
      setSelectedBagIds([]);
      setSelectedCustomer(null);
      alert('Dispatch order processed and inventory locked successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create dispatch order');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(term) ||
      o.customer_name.toLowerCase().includes(term) ||
      o.status.toLowerCase().includes(term)
    );
  });

  const totalSalesEtb = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
  const totalKgDispatched = orders.reduce((sum, o) => sum + parseFloat(o.total_kg || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-rust/10 text-factory-amber">
              <ArrowUpRight className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Send Orders (Customer Dispatches)
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Assign finished shoe lace sacks to customer orders with customer credit check and protection against double-shipping.
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
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + New Customer Dispatch
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Total Dispatches
          </div>
          <div className="text-2xl font-bold font-mono text-factory-paper mt-1">
            {orders.length}
          </div>
          <div className="text-xs text-factory-muted mt-1">Orders processed</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Total Weight Dispatched
          </div>
          <div className="text-2xl font-bold font-mono text-factory-amber mt-1">
            {totalKgDispatched.toFixed(2)} <span className="text-xs font-normal text-factory-muted">KG</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Finished shoelace volume</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Gross Sales Value
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalSalesEtb.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Revenue generated</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
        <input
          type="text"
          placeholder="Search by Order #, Customer, or Status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Bags / Weight</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid / Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading dispatch orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No dispatch orders recorded yet.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-factory-paper">
                      {order.customer_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          order.payment_mode === 'CASH'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-factory-amber/10 text-factory-amber border border-factory-amber/20'
                        }`}
                      >
                        {order.payment_mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-factory-paper font-medium">
                      {order.items?.length || 0} sacks ({parseFloat(order.total_kg || '0').toFixed(2)} KG)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-factory-paper">
                      {parseFloat(order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-emerald-400">Paid: {parseFloat(order.amount_paid || '0').toFixed(2)}</div>
                      <div className="text-factory-crimson">Bal: {parseFloat(order.outstanding_amount || '0').toFixed(2)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                          order.status === 'SETTLED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : order.status === 'PARTIAL'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-factory-amber/20 text-factory-amber border border-factory-amber/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-factory-muted text-[11px]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create Dispatch Order */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-factory-amber" />
                Process Dispatch Delivery
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            {/* Credit limit warning alert */}
            {creditAlert && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">CREDIT THRESHOLD EXCEEDED</div>
                  <div className="mt-0.5">{creditAlert}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateDispatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Select Customer</label>
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const cust = customers.find((c) => c.id === e.target.value) || null;
                      setSelectedCustomer(cust);
                    }}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Outstanding: {parseFloat(c.current_outstanding || '0').toFixed(0)} / Limit: {parseFloat(c.credit_limit || '0').toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Payment Mode</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CREDIT')}
                      className={`flex-1 py-2 rounded-lg font-mono font-medium transition-colors ${
                        paymentMode === 'CREDIT'
                          ? 'bg-factory-rust text-white shadow'
                          : 'bg-factory-dark border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
                      }`}
                    >
                      CREDIT
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`flex-1 py-2 rounded-lg font-mono font-medium transition-colors ${
                        paymentMode === 'CASH'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-factory-dark border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
                      }`}
                    >
                      CASH ON DELIVERY
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Selling Price per KG (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono font-bold focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              {/* Bag Multi-Select */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-factory-muted font-medium">
                    Select Finished Product Bags ({availableBags.length} Available in Store)
                  </label>
                  <span className="font-mono text-factory-amber text-[11px]">
                    {selectedBagIds.length} bags selected ({totalWeightKg.toFixed(2)} KG)
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-factory-darkBorder rounded-lg bg-factory-dark p-2 divide-y divide-factory-darkBorder/40">
                  {availableBags.length === 0 ? (
                    <div className="py-6 text-center text-factory-muted">
                      No finished bags available in store. Complete a production batch to pack new bags.
                    </div>
                  ) : (
                    availableBags.map((bag) => {
                      const isSelected = selectedBagIds.includes(bag.id);
                      return (
                        <div
                          key={bag.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedBagIds(selectedBagIds.filter((id) => id !== bag.id));
                            } else {
                              setSelectedBagIds([...selectedBagIds, bag.id]);
                            }
                          }}
                          className={`p-2 rounded cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-factory-rust/20 border border-factory-rust/40' : 'hover:bg-factory-darkCard'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-factory-rust rounded"
                            />
                            <span className="font-mono font-bold text-factory-paper">{bag.bag_id}</span>
                            <span className="text-factory-muted text-[11px] truncate max-w-xs">{bag.product_name}</span>
                          </div>
                          <div className="font-mono font-bold text-emerald-400">
                            {parseFloat(bag.weight_kg).toFixed(2)} KG
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Order summary card */}
              <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder font-mono space-y-1">
                <div className="flex justify-between text-factory-muted">
                  <span>Selected Weight:</span>
                  <span className="text-factory-paper">{totalWeightKg.toFixed(2)} KG</span>
                </div>
                <div className="flex justify-between text-factory-muted">
                  <span>Price per KG:</span>
                  <span className="text-factory-paper">{unitPrice.toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-base font-bold text-factory-amber pt-1 border-t border-factory-darkBorder">
                  <span>Total Order Amount:</span>
                  <span>{orderTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedBagIds.length === 0}
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center gap-2 shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Dispatch & Lock Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
