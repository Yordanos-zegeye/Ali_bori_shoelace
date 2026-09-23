import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, ShieldCheck, Factory, Store, CheckCircle, 
  XCircle, Search, RefreshCw, X, AlertCircle, Phone, MapPin, Building
} from 'lucide-react';
import { api } from '../api/client';
import { User, UserRole, Customer } from '../types';

export const UserManagementView: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'store' as UserRole,
    phone_number: '',
    store_name: '',
    department: '',
    customer: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Users
  const { data: usersData, isLoading, refetch } = useQuery<{ results?: User[] } | User[]>({
    queryKey: ['manage-users'],
    queryFn: () => api.get<any>('/auth/users/'),
  });

  // Fetch Customers for linking
  const { data: customersData } = useQuery<any>({
    queryKey: ['manage-customers'],
    queryFn: () => api.get<any>('/sales/customers/'),
  });
  const customers: Customer[] = Array.isArray(customersData) ? customersData : (customersData?.results || []);

  const users: User[] = Array.isArray(usersData) 
    ? usersData 
    : (usersData?.results || []);

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (newUserData: any) => api.post('/auth/users/', newUserData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
      setIsCreateModalOpen(false);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'store',
        phone_number: '',
        store_name: '',
        department: '',
        customer: '',
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.data?.email?.[0] || err.data?.detail || err.message || 'Failed to create user');
    }
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/auth/users/${userId}/toggle-active/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
    },
    onError: (err: any) => {
      alert(err.data?.detail || err.message || 'Failed to toggle user status');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setFormError('Email address is required.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setFormError(null);
    createMutation.mutate(formData);
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.store_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const superAdminCount = users.filter(u => u.role === 'super_admin' || u.is_superuser).length;
  const factoryMonitorCount = users.filter(u => u.role === 'factory_monitor').length;
  const storeCount = users.filter(u => u.role === 'store').length;

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" />
            Super Admin
          </span>
        );
      case 'factory_monitor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Factory className="w-3 h-3" />
            Factory Monitor
          </span>
        );
      case 'store':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Store className="w-3 h-3" />
            Store / Shop
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-factory-cream">
              User Management & Access Control
            </h1>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              Super Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-factory-muted mt-0.5">
            Create accounts and configure role permissions for Ali Bori Factory staff and retail stores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-factory-dark border border-factory-darkBorder hover:border-factory-secondary/50 text-factory-muted hover:text-factory-cream transition-colors cursor-pointer"
            title="Refresh user list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-factory-secondary hover:bg-factory-secondary/90 text-factory-dark font-bold text-xs rounded-lg transition-all shadow-md shadow-factory-secondary/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Role Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-factory-darkCard border border-factory-darkBorder flex items-center justify-between">
          <div>
            <div className="text-xs text-factory-muted font-medium">Total Registered Users</div>
            <div className="text-2xl font-bold text-factory-cream font-mono mt-1">{users.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-factory-darkCard border border-purple-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-300 font-medium">Super Admins</div>
            <div className="text-2xl font-bold text-purple-200 font-mono mt-1">{superAdminCount}</div>
            <div className="text-[10px] text-purple-300/70 mt-0.5">Full System Access</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-factory-darkCard border border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-300 font-medium">Factory Monitors</div>
            <div className="text-2xl font-bold text-amber-200 font-mono mt-1">{factoryMonitorCount}</div>
            <div className="text-[10px] text-amber-300/70 mt-0.5">Production & Dispatches</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 border border-amber-500/30">
            <Factory className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-factory-darkCard border border-emerald-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-300 font-medium">Store & Shop Accounts</div>
            <div className="text-2xl font-bold text-emerald-200 font-mono mt-1">{storeCount}</div>
            <div className="text-[10px] text-emerald-300/70 mt-0.5">Ordering & Stock Requisitions</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 border border-emerald-500/30">
            <Store className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-factory-darkCard border border-factory-darkBorder rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-factory-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or store..."
            className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg pl-9 pr-3 py-1.5 text-xs text-factory-cream placeholder-factory-muted focus:outline-none focus:border-factory-secondary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-factory-muted font-medium shrink-0">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="super_admin">Super Admins ({superAdminCount})</option>
            <option value="factory_monitor">Factory Monitors ({factoryMonitorCount})</option>
            <option value="store">Store / Shops ({storeCount})</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-factory-darkBorder bg-factory-dark/60 text-factory-muted uppercase tracking-wider font-mono">
                <th className="p-3.5">User</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Assigned Store / Dept</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/40 text-factory-cream">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-factory-muted">
                    {isLoading ? 'Loading system users...' : 'No users match your search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-factory-dark/40 transition-colors">
                    {/* User Info */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-factory-primary/40 border border-factory-secondary/30 flex items-center justify-center font-bold text-xs text-factory-secondary">
                          {u.first_name?.[0] || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-factory-cream">
                            {u.full_name || u.email}
                          </div>
                          <div className="text-[11px] text-factory-muted font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-3.5">
                      {renderRoleBadge(u.role)}
                    </td>

                    {/* Store or Department */}
                    <td className="p-3.5 text-factory-muted">
                      {u.customer_name ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <Store className="w-3.5 h-3.5 shrink-0" />
                          <span>{u.customer_name} ({u.customer_code || 'Client'})</span>
                        </div>
                      ) : u.store_name ? (
                        <div className="flex items-center gap-1.5 text-factory-cream">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{u.store_name}</span>
                        </div>
                      ) : u.department ? (
                        <div className="flex items-center gap-1.5 text-factory-muted">
                          <Building className="w-3.5 h-3.5 shrink-0" />
                          <span>{u.department}</span>
                        </div>
                      ) : (
                        <span className="text-factory-muted/50">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="p-3.5 text-factory-muted font-mono">
                      {u.phone_number ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-factory-muted" />
                          <span>{u.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-factory-muted/50">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                          <XCircle className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => toggleActiveMutation.mutate(u.id)}
                        disabled={toggleActiveMutation.isPending}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                          u.is_active
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-factory-darkBorder flex items-center justify-between bg-factory-dark/60">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-factory-secondary" />
                <h3 className="font-bold font-heading text-sm sm:text-base text-factory-cream">
                  Create New System User
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-factory-muted hover:text-factory-cream hover:bg-factory-dark transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Almaz"
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Desta"
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                  Email Address (Login Username) <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. almaz@alibori.com"
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                  System Role & Authorization <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary font-medium"
                >
                  <option value="super_admin">Super Admin (Full access to all factory modules)</option>
                  <option value="factory_monitor">Factory Monitor (Production, batches, warehouse & dispatches)</option>
                  <option value="store">Store / Shop (Catalog, finished goods, ordering & stock requests)</option>
                </select>
              </div>

              {formData.role === 'store' && (
                <div>
                  <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                    Link to Wholesale Customer Account
                  </label>
                  <select
                    value={formData.customer}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const c = customers.find(x => x.id === selectedId);
                      setFormData({
                        ...formData,
                        customer: selectedId,
                        store_name: c ? c.name : formData.store_name
                      });
                    }}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  >
                    <option value="">-- Auto-Match Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                    Store / Branch Location
                  </label>
                  <input
                    type="text"
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                    placeholder="e.g. Merkato Branch 2"
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-factory-muted uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+251-9..."
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-cream focus:outline-none focus:border-factory-secondary"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-factory-darkBorder flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-factory-dark hover:bg-factory-darkBorder text-factory-muted hover:text-factory-cream text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-factory-secondary hover:bg-factory-secondary/90 text-factory-dark font-bold text-xs transition-all shadow-md shadow-factory-secondary/20 cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
