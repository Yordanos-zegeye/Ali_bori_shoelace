import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, DollarSign, AlertTriangle, 
  CheckCircle2, RefreshCw, Phone, MapPin, ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { Customer } from '../types';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    customer_code: '',
    customer_type: 'WHOLESALER',
    phone: '',
    address: 'Merkato, Addis Ababa',
    credit_limit: '100000.00'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/sales/customers/');
      setCustomers(res.results || res);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/sales/customers/', newCustomer);
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        customer_code: '',
        customer_type: 'WHOLESALER',
        phone: '',
        address: 'Merkato, Addis Ababa',
        credit_limit: '100000.00'
      });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.customer_code.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term))
    );
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + parseFloat(c.current_outstanding || '0'), 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + parseFloat(c.credit_limit || '0'), 0);
  const highRiskCustomers = customers.filter((c) => (c.credit_utilization_percent || 0) >= 80);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-rust/10 text-factory-amber">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Customer Accounts & Credit Control
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Track customer wholesale accounts, contact numbers, credit limits, and unpaid balances.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchCustomers}
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
            + Register New Customer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Active Accounts
          </div>
          <div className="text-2xl font-bold text-factory-paper mt-1">
            {customers.length}
          </div>
          <div className="text-xs text-factory-muted mt-1">Trading wholesale clients</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Total Unpaid Balance
          </div>
          <div className="text-2xl font-bold text-factory-crimson mt-1">
            {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Money to collect from customers</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Near Credit Limit (&gt;80%)
          </div>
          <div className={`text-2xl font-bold mt-1 ${highRiskCustomers.length > 0 ? 'text-factory-amber' : 'text-emerald-400'}`}>
            {highRiskCustomers.length}
          </div>
          <div className="text-xs text-factory-muted mt-1">High credit risk accounts</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
        <input
          type="text"
          placeholder="Search customer name, code, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Customer Code</th>
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Contact & Location</th>
                <th className="py-3 px-4">Credit Limit</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Credit Utilization</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading customer accounts...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const limit = parseFloat(c.credit_limit || '0');
                  const outstanding = parseFloat(c.current_outstanding || '0');
                  const util = c.credit_utilization_percent || (limit > 0 ? (outstanding / limit) * 100 : 0);
                  return (
                    <tr key={c.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                        {c.customer_code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-muted text-[11px]">
                        {c.customer_type}
                      </td>
                      <td className="py-3.5 px-4 text-factory-muted text-[11px]">
                        <div>{c.phone || 'No phone'}</div>
                        <div className="text-factory-paper">{c.address || 'Addis Ababa'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-factory-paper">
                        {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={outstanding > 0 ? 'text-factory-crimson' : 'text-emerald-400'}>
                          {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-factory-dark rounded-full overflow-hidden border border-factory-darkBorder">
                            <div
                              className={`h-full ${
                                util >= 90 ? 'bg-factory-crimson' : util >= 60 ? 'bg-factory-amber' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, util)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-factory-paper font-bold">{util.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Register Customer */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Users className="w-4 h-4 text-factory-amber" />
                Register New Customer
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Customer Code (e.g. CUST-001)</label>
                <input
                  type="text"
                  value={newCustomer.customer_code}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customer_code: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Customer / Business Name</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Customer Type</label>
                  <select
                    value={newCustomer.customer_type}
                    onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  >
                    <option value="WHOLESALER">WHOLESALER</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    <option value="RETAILER">RETAILER</option>
                    <option value="DIRECT_FACTORY">DIRECT FACTORY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Credit Limit (ETB)</label>
                  <input
                    type="number"
                    step="1000"
                    value={newCustomer.credit_limit}
                    onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Phone Number</label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Address / Market Location</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                />
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
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
