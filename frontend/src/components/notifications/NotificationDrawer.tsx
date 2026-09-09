import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertOctagon, Info, Bell, CheckCheck } from 'lucide-react';
import { Notification } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateToRecord?: (model?: string, id?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigateToRecord,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL' | 'STOCK' | 'MAINTENANCE' | 'CREDIT'>('ALL');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL';
    if (filter === 'STOCK') return n.notification_type.includes('STOCK');
    if (filter === 'MAINTENANCE') return n.notification_type.includes('MAINTENANCE') || n.notification_type.includes('MACHINE');
    if (filter === 'CREDIT') return n.notification_type.includes('CREDIT');
    return true;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/15 border-red-500/30 text-red-700 dark:bg-red-950/60 dark:border-red-800/80 dark:text-red-300';
      case 'WARNING':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800/80 dark:text-amber-300';
      default:
        return 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:bg-sky-950/60 dark:border-sky-800/80 dark:text-sky-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-factory-darkCard border-l border-factory-darkBorder h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-factory-darkBorder flex items-center justify-between bg-factory-dark/60">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-factory-secondary" />
            <h2 className="font-bold text-sm text-factory-cream font-['Outfit']">Operation Notifications</h2>
            <span className="text-xs px-2 py-0.5 bg-factory-dark rounded-full text-factory-muted border border-factory-darkBorder font-mono">
              {notifications.filter(n => !n.is_read).length} unread
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-factory-secondary hover:text-factory-cream flex items-center gap-1 transition-colors px-2 py-1 rounded bg-factory-primary/20 border border-factory-secondary/30"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-factory-muted hover:text-factory-cream hover:bg-factory-dark transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-factory-darkBorder bg-factory-dark/40 overflow-x-auto text-[11px] font-medium select-none">
          {(['ALL', 'UNREAD', 'CRITICAL', 'STOCK', 'MAINTENANCE', 'CREDIT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                filter === tab
                  ? 'bg-factory-primary text-factory-cream font-semibold border border-factory-secondary/50'
                  : 'text-factory-muted hover:text-factory-cream hover:bg-factory-dark'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 text-factory-muted text-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-factory-muted/40" />
              <p>No notifications in this view.</p>
              <p className="text-[10px] text-factory-muted/60 mt-1">Operational events will appear here.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border transition-all ${
                  n.is_read
                    ? 'bg-factory-dark/30 border-factory-darkBorder/60 opacity-75'
                    : 'bg-factory-dark border-factory-darkBorder shadow-sm'
                } hover:border-factory-secondary/40`}
              >
                <div className="flex items-start gap-2.5">
                  {getSeverityIcon(n.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-semibold text-factory-cream truncate">
                        {n.title}
                      </h4>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getSeverityBadgeClass(n.severity)}`}>
                        {n.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-factory-cream/80 leading-relaxed break-words">
                      {n.message}
                    </p>
                    <div className="mt-2 pt-2 border-t border-factory-darkBorder/40 flex items-center justify-between text-[10px] text-factory-muted">
                      <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <button
                            onClick={() => onMarkRead(n.id)}
                            className="text-factory-secondary hover:underline"
                          >
                            Mark Read
                          </button>
                        )}
                        {onNavigateToRecord && n.related_model && (
                          <button
                            onClick={() => onNavigateToRecord(n.related_model, n.related_object_id)}
                            className="text-sky-400 hover:underline"
                          >
                            Open Record →
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
