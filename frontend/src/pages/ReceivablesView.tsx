import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, CheckCircle2, AlertTriangle, 
  Calendar, CreditCard, RefreshCw, ArrowDownLeft
} from 'lucide-react';
import { api } from '../api/client';
import { Receivable } from '../types';

export const ReceivablesView: React.FC = () => {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect Payment Modal
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('1000.00');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHECK'>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('CBE-TXN-');
  const [submitting, setSubmitting] = useState(false);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/sales/receivables/');
      setReceivables(res.results || res);
    } catch (err) {
      console.error('Failed to load receivables', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      // Call the collect-payment custom action on the dispatch order endpoint
      // We pass the dispatch order ID associated with this receivable
      await api.post(`/sales/orders/${(selectedReceivable as any).dispatch_order || selectedReceivable.id}/collect-payment/`, {
        amount: amountNum.toFixed(2),
        payment_method: paymentMethod,
        reference: paymentReference
      });
      setSelectedReceivable(null);
      alert('Payment collected and customer outstanding balance credited successfully!');
      fetchReceivables();
    } catch (err: any) {
      alert(err.message || 'Payment collection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReceivables = receivables.filter((rec) => {
    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      rec.customer_name.toLowerCase().includes(term) ||
      rec.order_number.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const totalOutstanding = receivables
    .filter((r) => r.status !== 'SETTLED')
    .reduce((sum, r) => sum + parseFloat(r.remaining_amount || '0'), 0);
  const totalSettled = receivables.reduce((sum, r) => sum + parseFloat(r.amount_paid || '0'), 0);
  const overdueCount = receivables.filter((r) => r.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Receivables Ledger & Payment Collections
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Track customer credit debts, overdue invoices, and record partial or full settlements directly updating credit limits.
          </p>
        </div>

        <button
          onClick={fetchReceivables}
          className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors self-end sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Unpaid Receivables Balance
          </div>
          <div className="text-2xl font-bold font-mono text-factory-crimson mt-1">
            {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Total pending cash collection</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Collected Settlements
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalSettled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Total payments received to date</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Overdue Accounts
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${overdueCount > 0 ? 'text-factory-amber' : 'text-emerald-400'}`}>
            {overdueCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Invoices past agreed credit terms</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search customer name or order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'PARTIAL', 'SETTLED', 'OVERDUE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-factory-amber/20 text-factory-amber border border-factory-amber/40'
                  : 'bg-factory-darkCard border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Invoice / Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Original Amount</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Collect Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading receivables ledger...
                  </td>
                </tr>
              ) : filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No receivables found for this filter.
                  </td>
                </tr>
              ) : (
                filteredReceivables.map((rec) => {
                  const rem = parseFloat(rec.remaining_amount || '0');
                  return (
                    <tr key={rec.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                        {rec.order_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        {rec.customer_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-paper">
                        {parseFloat(rec.original_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">
                        {parseFloat(rec.amount_paid || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        <span className={rem > 0 ? 'text-factory-crimson' : 'text-emerald-400'}>
                          {rem.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-muted text-[11px]">
                        {rec.due_date ? new Date(rec.due_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                            rec.status === 'SETTLED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : rec.status === 'PARTIAL'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : rec.status === 'OVERDUE'
                              ? 'bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/30'
                              : 'bg-factory-amber/20 text-factory-amber border border-factory-amber/30'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {rec.status !== 'SETTLED' && (
                          <button
                            onClick={() => {
                              setSelectedReceivable(rec);
                              setPaymentAmount(rem.toFixed(2));
                              setPaymentReference(`CBE-${Date.now().toString().slice(-6)}`);
                            }}
                            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Collect Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Collect Payment */}
      {selectedReceivable && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Collect Customer Payment
              </h2>
              <button
                onClick={() => setSelectedReceivable(null)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1">
              <div className="text-factory-muted">Customer:</div>
              <div className="font-bold text-factory-paper text-sm">{selectedReceivable.customer_name}</div>
              <div className="text-factory-amber font-mono">Invoice Order: {selectedReceivable.order_number}</div>
              <div className="text-factory-crimson font-mono font-bold mt-1">
                Outstanding Balance: {parseFloat(selectedReceivable.remaining_amount).toFixed(2)} ETB
              </div>
            </div>

            <form onSubmit={handleCollectPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Payment Amount (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(selectedReceivable.remaining_amount)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                  required
                />
                <p className="text-[11px] text-factory-muted mt-1">
                  Enter partial or full payment amount.
                </p>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-emerald-400"
                  required
                >
                  <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash / Telebirr)</option>
                  <option value="CASH">Direct Cash</option>
                  <option value="CHECK">Certified Bank Check</option>
                </select>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceivable(null)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
