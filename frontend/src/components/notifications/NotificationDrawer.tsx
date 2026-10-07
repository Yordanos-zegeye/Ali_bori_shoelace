import React, { useState } from 'react';
import {
  X, CheckCircle2, AlertTriangle, AlertOctagon, Info, Bell,
  CheckCheck, Trash2, Plus, Send, Search, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { Notification } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAllRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onCreateNotification?: (notification: {
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    recipient: string;
    notification_type?: string;
    related_model?: string;
  }) => Promise<void>;
  onNavigateToRecord?: (model?: string, id?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAllRead,
  onDeleteNotification,
  onCreateNotification,
  onNavigateToRecord,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL' | 'MACHINES' | 'STOCK' | 'PRODUCTION' | 'CREDIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compose Broadcast State
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newSeverity, setNewSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');
  const [newRecipient, setNewRecipient] = useState('all');

  if (!isOpen) return null;

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => !n.is_read).length;
  const criticalCount = safeNotifications.filter((n) => n.severity === 'CRITICAL' && !n.is_read).length;

  const filteredNotifications = safeNotifications.filter((n) => {
    // Category filter
    if (filter === 'UNREAD' && n.is_read) return false;
    if (filter === 'CRITICAL' && n.severity !== 'CRITICAL') return false;
    if (filter === 'MACHINES' && !n.notification_type?.includes('MACHINE') && !n.notification_type?.includes('MAINTENANCE') && n.related_model !== 'machines') return false;
    if (filter === 'STOCK' && !n.notification_type?.includes('STOCK') && n.related_model !== 'raw_materials' && n.related_model !== 'stock_requests') return false;
    if (filter === 'PRODUCTION' && !n.notification_type?.includes('PRODUCTION') && n.related_model !== 'production') return false;
    if (filter === 'CREDIT' && !n.notification_type?.includes('CREDIT') && n.related_model !== 'receivables') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchType = n.notification_type?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchType;
    }

    return true;
  });

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim() || !onCreateNotification) return;

    try {
      setIsSubmitting(true);
      await onCreateNotification({
        title: newTitle.trim(),
        message: newMessage.trim(),
        severity: newSeverity,
        recipient: newRecipient,
        notification_type: 'ANNOUNCEMENT'
      });
      setNewTitle('');
      setNewMessage('');
      setNewSeverity('INFO');
      setNewRecipient('all');
      setShowCompose(false);
    } catch (err) {
      console.error('Failed to post broadcast notification', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-factory-secondary shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-factory-muted shrink-0 mt-0.5" />;
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/10 border-red-500/30 text-red-400 font-bold';
      case 'WARNING':
        return 'bg-factory-primary/20 border-factory-secondary/30 text-factory-cream font-medium';
      default:
        return 'bg-factory-dark border-factory-darkBorder text-factory-muted font-medium';
    }
  };

  const getContainerBorder = (severity: string, isRead: boolean) => {
    if (severity === 'CRITICAL') {
      return isRead
        ? 'border-l-4 border-l-red-500/40 bg-factory-dark/70 border-factory-darkBorder opacity-80'
        : 'border-l-4 border-l-red-500 bg-red-950/20 border-red-500/30 shadow-sm';
    }
    if (severity === 'WARNING') {
      return isRead
        ? 'border-l-4 border-l-factory-secondary/40 bg-factory-dark/50 border-factory-darkBorder opacity-75'
        : 'border-l-4 border-l-factory-secondary bg-factory-dark border-factory-darkBorder shadow-sm';
    }
    return isRead
      ? 'border-l-4 border-l-factory-darkBorder bg-factory-dark/40 border-factory-darkBorder opacity-70'
      : 'border-l-4 border-l-factory-muted/50 bg-factory-dark border-factory-darkBorder shadow-sm';
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-factory-darkCard border-l border-factory-darkBorder h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 cursor-default"
      >
        {/* Header */}
        <div className="p-4 border-b border-factory-darkBorder bg-factory-dark/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-factory-dark border border-factory-darkBorder text-factory-secondary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-factory-cream font-heading">Factory Operations & Alerts</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-factory-muted font-mono">
                    {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
                  </span>
                  {criticalCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500/10 border border-red-500/40 text-red-500 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      {criticalCount} Critical
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onCreateNotification && (
                <button
                  type="button"
                  onClick={() => setShowCompose(!showCompose)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 border cursor-pointer ${
                    showCompose
                      ? 'bg-factory-secondary text-factory-dark font-bold border-factory-secondary'
                      : 'bg-factory-primary/20 text-factory-cream border-factory-secondary/30 hover:bg-factory-primary/40'
                  }`}
                  title="Broadcast operational notice"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Broadcast</span>
                </button>
              )}

              <button
                type="button"
                onClick={onMarkAllRead}
                className="p-1.5 rounded-lg text-factory-muted hover:text-factory-cream hover:bg-factory-dark border border-transparent hover:border-factory-darkBorder transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>

              {onClearAllRead && (
                <button
                  type="button"
                  onClick={onClearAllRead}
                  className="p-1.5 rounded-lg text-factory-muted hover:text-red-400 hover:bg-factory-dark border border-transparent hover:border-factory-darkBorder transition-colors cursor-pointer"
                  title="Clear all read notifications"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-factory-muted hover:text-factory-cream hover:bg-factory-dark border border-transparent hover:border-factory-darkBorder transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-factory-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications, batches, machines..."
              className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg pl-8 pr-3 py-1.5 text-xs text-factory-cream placeholder-factory-muted focus:outline-none focus:border-factory-secondary font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-factory-muted hover:text-factory-cream text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Compose Broadcast Notice Form */}
        {showCompose && (
          <form onSubmit={handleComposeSubmit} className="p-3.5 bg-factory-dark/95 border-b border-factory-darkBorder space-y-2.5 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-factory-cream font-heading flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-factory-secondary" />
                Post Factory Notice / Broadcast
              </span>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="text-[11px] text-factory-muted hover:text-factory-cream"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Notice title (e.g. Scheduled Maintenance, Shift Handover)"
              className="w-full bg-factory-darkCard border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-xs text-factory-cream placeholder-factory-muted focus:outline-none focus:border-factory-secondary font-medium"
              required
            />

            <textarea
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message details or instructions for workers..."
              className="w-full bg-factory-darkCard border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-xs text-factory-cream placeholder-factory-muted focus:outline-none focus:border-factory-secondary resize-none"
              required
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs">
                {/* Severity Buttons */}
                <div className="inline-flex rounded-lg border border-factory-darkBorder p-0.5 bg-factory-darkCard">
                  {(['INFO', 'WARNING', 'CRITICAL'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setNewSeverity(sev)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded cursor-pointer transition-colors ${
                        newSeverity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-factory-secondary text-factory-dark shadow-xs'
                          : 'text-factory-muted hover:text-factory-cream'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                {/* Target Recipient Selector */}
                <select
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  className="bg-factory-darkCard border border-factory-darkBorder rounded px-2 py-1 text-[11px] text-factory-cream focus:outline-none focus:border-factory-secondary font-mono"
                >
                  <option value="all">To: All Staff</option>
                  <option value="production_manager">To: Production Floor</option>
                  <option value="store">To: Store / Dispatch</option>
                  <option value="super_admin">To: Management Only</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim() || !newMessage.trim()}
                className="px-3 py-1 bg-factory-secondary text-factory-dark font-bold rounded-lg text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{isSubmitting ? 'Posting...' : 'Post Notice'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-factory-darkBorder bg-factory-dark/40 overflow-x-auto text-[11px] font-medium select-none no-scrollbar">
          {(
            [
              { key: 'ALL', label: 'All', count: safeNotifications.length },
              { key: 'UNREAD', label: 'Unread', count: unreadCount },
              { key: 'CRITICAL', label: 'Critical', count: criticalCount, isCritical: true },
              { key: 'MACHINES', label: 'Machines' },
              { key: 'STOCK', label: 'Stock' },
              { key: 'PRODUCTION', label: 'Production' },
              { key: 'CREDIT', label: 'Credit' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                filter === tab.key
                  ? 'bg-factory-primary text-factory-cream font-semibold border border-factory-secondary/50 shadow-xs'
                  : 'text-factory-muted hover:text-factory-cream hover:bg-factory-dark'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`text-[9px] font-mono px-1 rounded-full ${
                    tab.isCritical
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold'
                      : 'bg-factory-dark border border-factory-darkBorder text-factory-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-20 text-factory-muted text-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-factory-muted/30" />
              <p className="font-medium text-factory-cream">No notifications found.</p>
              <p className="text-[11px] text-factory-muted/70 max-w-xs mx-auto">
                {searchQuery ? 'No alerts match your search filter.' : 'All operational systems and workflows are running normally.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-all ${getContainerBorder(n.severity, n.is_read)} hover:border-factory-secondary/40`}
              >
                <div className="flex items-start gap-2.5">
                  {getSeverityIcon(n.severity)}

                  <div className="flex-1 min-w-0">
                    {/* Title & Severity Header */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-factory-cream truncate font-heading">
                        {n.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(n.severity)}`}>
                          {n.severity}
                        </span>
                        {onDeleteNotification && (
                          <button
                            type="button"
                            onClick={() => onDeleteNotification(n.id)}
                            className="text-factory-muted hover:text-red-400 p-0.5 rounded transition-colors"
                            title="Dismiss notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <p className="text-[11px] text-factory-paper/90 leading-relaxed break-words font-sans">
                      {n.message}
                    </p>

                    {/* Footer with Timestamp, Recipient, and Action buttons */}
                    <div className="mt-2.5 pt-2 border-t border-factory-darkBorder/40 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-2 text-factory-muted font-mono">
                        <span>{formatRelativeTime(n.created_at)}</span>
                        {n.recipient && n.recipient !== 'all' && (
                          <span className="px-1.5 py-0.2 rounded bg-factory-dark text-factory-muted border border-factory-darkBorder">
                            {n.recipient.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onMarkRead(n.id)}
                          className="text-factory-secondary hover:text-factory-cream hover:underline font-medium transition-colors cursor-pointer"
                        >
                          {n.is_read ? 'Mark Unread' : 'Mark Read'}
                        </button>

                        {onNavigateToRecord && n.related_model && (
                          <button
                            type="button"
                            onClick={() => onNavigateToRecord(n.related_model, n.related_object_id)}
                            className="text-factory-cream font-semibold hover:text-factory-secondary hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Take Action</span>
                            <ArrowRight className="w-3 h-3 text-factory-secondary" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
