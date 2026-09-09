import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { DashboardView } from './pages/DashboardView';
import { ProductionView } from './pages/ProductionView';
import { StoreView } from './pages/StoreView';
import { RawMaterialsView } from './pages/RawMaterialsView';
import { StockRequestsView } from './pages/StockRequestsView';
import { MachinesView } from './pages/MachinesView';
import { MaintenanceView } from './pages/MaintenanceView';
import { SparePartsView } from './pages/SparePartsView';
import { UtilitiesView } from './pages/UtilitiesView';
import { DispatchView } from './pages/DispatchView';
import { CustomersView } from './pages/CustomersView';
import { ReceivablesView } from './pages/ReceivablesView';
import { WorkforceView } from './pages/WorkforceView';
import { AttendanceView } from './pages/AttendanceView';
import { PayrollView } from './pages/PayrollView';
import { CatalogView } from './pages/CatalogView';
import { DocumentsView } from './pages/DocumentsView';
import { SettingsView } from './pages/SettingsView';
import { ImporterView } from './pages/ImporterView';
import { api } from './api/client';
import { DashboardMetrics, Notification } from './types';
import { ThemeProvider } from './context/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes for instant page switching
      gcTime: 10 * 60 * 1000,
    },
  },
});

const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  // Load dashboard metrics with fast caching
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.get<DashboardMetrics>('/analytics/dashboard/'),
  });

  // Load notifications with fast caching
  const { data: notificationsData, refetch: refetchNotifications } = useQuery<any>({
    queryKey: ['notifications'],
    queryFn: () => api.get<any>('/notifications/items/'),
  });

  const notifications: Notification[] = notificationsData?.results || notificationsData || [];

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/items/${id}/`, { is_read: true });
      refetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/items/mark-all-read/');
      refetchNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const handleNavigateToRecord = (model?: string, id?: string) => {
    if (!model) return;
    const m = model.toLowerCase();
    if (m.includes('machine')) setActiveView('machines');
    else if (m.includes('stock') || m.includes('material')) setActiveView('raw_materials');
    else if (m.includes('dispatch') || m.includes('order')) setActiveView('dispatch');
    else if (m.includes('credit') || m.includes('receivable')) setActiveView('receivables');
    else if (m.includes('spare')) setActiveView('spare_parts');
    else if (m.includes('payroll')) setActiveView('payroll');
    setIsNotificationOpen(false);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView metrics={metrics || null} isLoading={metricsLoading} onNavigate={setActiveView} />;
      case 'production':
      case 'transfers':
        return <ProductionView />;
      case 'store_bags':
        return <StoreView />;
      case 'raw_materials':
        return <RawMaterialsView />;
      case 'stock_requests':
        return <StockRequestsView />;
      case 'finished_goods':
        return <CatalogView />;
      case 'spare_parts':
        return <SparePartsView />;
      case 'dispatch':
        return <DispatchView />;
      case 'customers':
        return <CustomersView />;
      case 'receivables':
        return <ReceivablesView />;
      case 'machines':
        return <MachinesView />;
      case 'maintenance':
        return <MaintenanceView />;
      case 'utilities':
        return <UtilitiesView />;
      case 'employees':
        return <WorkforceView />;
      case 'attendance':
        return <AttendanceView />;
      case 'payroll':
        return <PayrollView />;
      case 'documents':
        return <DocumentsView />;
      case 'settings':
        return <SettingsView />;
      case 'importer':
        return <ImporterView />;
      default:
        return <DashboardView metrics={metrics || null} isLoading={metricsLoading} onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-factory-dark text-factory-paper flex flex-col font-sans selection:bg-factory-amber selection:text-factory-dark">
      {/* Top Navbar */}
      <Navbar
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        activeView={activeView}
      />

      {/* Main Layout: Sidebar + View Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {renderActiveView()}
        </main>
      </div>

      {/* Slide-out Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onNavigateToRecord={handleNavigateToRecord}
      />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
