import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, CheckCircle, XCircle, Clock, PackageCheck, 
  Search, RefreshCw, AlertCircle, User, Calendar
} from 'lucide-react';
import { api } from '../api/client';
import { StockRequest } from '../types';

export const StockRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action Modal State
  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'ISSUE' | 'REJECT' | null>(null);
  const [managerName, setManagerName] = useState('Store Manager');
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/inventory/stock-requests/');
      setRequests(res.results || res);
    } catch (err) {
      console.error('Failed to load stock requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleExecuteAction = async () => {
    if (!selectedRequest || !actionType) return;
    try {
      setSubmitting(true);
      if (actionType === 'APPROVE') {
        await api.patch(`/inventory/stock-requests/${selectedRequest.id}/`, {
          status: 'APPROVED',
          approved_by: managerName,
          approved_at: new Date().toISOString()
        });
      } else if (actionType === 'ISSUE') {
        await api.patch(`/inventory/stock-requests/${selectedRequest.id}/`, {
          status: 'ISSUED',
          issued_by: managerName,
          issued_at: new Date().toISOString()
        });
      } else if (actionType === 'REJECT') {
        await api.patch(`/inventory/stock-requests/${selectedRequest.id}/`, {
          status: 'REJECTED',
          notes: actionNotes ? `${selectedRequest.notes || ''} | Rejection: ${actionNotes}` : selectedRequest.notes
        });
      }
      setSelectedRequest(null);
      setActionType(null);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesSearch = 
      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const issuedCount = requests.filter((r) => r.status === 'ISSUED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Stock Requisition & Issuing
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Department material requests (Raw yarn, spare parts, consumables) with manager verification and workshop dispatch.
          </p>
        </div>

        <button
          onClick={fetchRequests}
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
            Pending Approval
          </div>
          <div className="text-2xl font-bold font-mono text-factory-amber mt-1">
            {pendingCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Awaiting manager review</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Approved (Ready to Issue)
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {approvedCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Ready for warehouse dispatch</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Fulfillments Completed
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {issuedCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Stock deducted and delivered</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search request #, requester, or section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'ISSUED', 'REJECTED'].map((st) => (
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

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-factory-muted bg-factory-darkCard border border-factory-darkBorder rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
            Loading stock requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-factory-muted bg-factory-darkCard border border-factory-darkBorder rounded-xl">
            No stock requisitions found.
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-4 hover:border-factory-darkBorder/80 transition-colors"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-factory-darkBorder pb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-factory-amber text-sm">
                      {req.request_number}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                        req.status === 'ISSUED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : req.status === 'APPROVED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : req.status === 'REJECTED'
                          ? 'bg-factory-crimson/20 text-factory-crimson border border-factory-crimson/30'
                          : 'bg-factory-amber/20 text-factory-amber border border-factory-amber/30'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-factory-muted mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {req.requester_name} ({req.department})
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {req.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setActionType('APPROVE');
                        }}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setActionType('REJECT');
                        }}
                        className="px-3 py-1.5 bg-factory-crimson/20 hover:bg-factory-crimson/30 text-factory-crimson border border-factory-crimson/30 rounded-lg text-xs font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setActionType('ISSUE');
                      }}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Issue Stock to Workshop
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-factory-paper bg-factory-dark p-3 rounded-lg border border-factory-darkBorder">
                <span className="text-factory-muted">Reason: </span>
                {req.reason}
              </div>

              {/* Items List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-factory-muted uppercase tracking-wider font-mono text-[10px] border-b border-factory-darkBorder/60">
                      <th className="py-2">Item Type</th>
                      <th className="py-2">Item Description / Name</th>
                      <th className="py-2">Requested Qty</th>
                      <th className="py-2">Approved Qty</th>
                      <th className="py-2">Issued Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-factory-darkBorder/40">
                    {req.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 font-mono text-factory-muted">{item.item_type}</td>
                        <td className="py-2 font-medium text-factory-paper">
                          {item.raw_material_name || item.spare_part_name || item.item_description || 'Factory Item'}
                        </td>
                        <td className="py-2 font-mono text-factory-amber font-bold">
                          {parseFloat(item.requested_quantity).toFixed(2)} {item.unit}
                        </td>
                        <td className="py-2 font-mono text-blue-400">
                          {parseFloat(item.approved_quantity || '0').toFixed(2)} {item.unit}
                        </td>
                        <td className="py-2 font-mono text-emerald-400">
                          {parseFloat(item.issued_quantity || '0').toFixed(2)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Manager Action */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-factory-amber" />
                {actionType === 'APPROVE' && 'Approve Stock Request'}
                {actionType === 'ISSUE' && 'Confirm Material Issuing'}
                {actionType === 'REJECT' && 'Reject Stock Request'}
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder">
                <div className="text-factory-muted">Request #: {selectedRequest.request_number}</div>
                <div className="font-semibold text-factory-paper">Requester: {selectedRequest.requester_name}</div>
                <div className="text-factory-muted mt-1">Department: {selectedRequest.department}</div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Authorized Manager Name</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              {actionType === 'REJECT' && (
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Rejection Reason</label>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper h-20 focus:outline-none focus:border-factory-crimson"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={submitting}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  actionType === 'APPROVE'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : actionType === 'ISSUE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-factory-crimson hover:bg-red-700'
                }`}
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
