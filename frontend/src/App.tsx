import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ShieldAlert, ArrowLeft, Loader2, Building2 } from 'lucide-react';
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
import { UserManagementView } from './pages/UserManagementView';
import { LoginView } from './pages/LoginView';
import { api } from './api/client';
import { DashboardMetrics, Notification, UserRole } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// View Permissions Mapping
const VIEW_ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  dashboard: ['super_admin', 'factory_monitor'], // Restricted from customer/store role
  production: ['super_admin', 'factory_monitor'],
  transfers: ['super_admin', 'factory_monitor'],
  store_bags: ['super_admin', 'factory_monitor', 'store'], // Warehouse
  raw_materials: ['super_admin', 'factory_monitor'],
  stock_requests: ['super_admin', 'factory_monitor'],
  finished_goods: ['super_admin', 'factory_monitor', 'store'], // Catalog
  spare_parts: ['super_admin', 'factory_monitor'],
  dispatch: ['super_admin', 'factory_monitor', 'store'], // Sales / Dispatches
  customers: ['super_admin', 'factory_monitor', 'store'], // Customer Account
  receivables: ['super_admin'],
  machines: ['super_admin', 'factory_monitor'],
  maintenance: ['super_admin', 'factory_monitor'],
  utilities: ['super_admin', 'factory_monitor'],
  employees: ['super_admin'],
  attendance: ['super_admin'],
  payroll: ['super_admin'],
  documents: ['super_admin'],
  settings: ['super_admin'],
  importer: ['super_admin'],
  users: ['super_admin'],
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, role, isSuperAdmin } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Auto-redirect customer role to warehouse ('store_bags') as their landing page
  React.useEffect(() => {
    if (role === 'store' && activeView === 'dashboard') {
      setActiveView('store_bags');
    }
  }, [role, activeView]);

  // Load dashboard metrics only for internal staff (super_admin / factory_monitor)
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.get<DashboardMetrics>('/analytics/dashboard/'),
    enabled: isAuthenticated && role !== 'store',
  });

  // Load notifications if authenticated
  const { data: notificationsData, refetch: refetchNotifications } = useQuery<any>({
    queryKey: ['notifications'],
    queryFn: () => api.get<any>('/notifications/items/'),
    enabled: isAuthenticated,
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

  const handleNavigateToRecord = (model?: string) => {
    if (!model) return;
    const m = model.toLowerCase();
    if (m.includes('machine') && (isSuperAdmin || role === 'factory_monitor')) setActiveView('machines');
    else if ((m.includes('stock') || m.includes('material')) && (isSuperAdmin || role === 'factory_monitor')) setActiveView('raw_materials');
    else if (m.includes('dispatch') || m.includes('order')) setActiveView('dispatch');
    else if ((m.includes('credit') || m.includes('receivable')) && isSuperAdmin) setActiveView('receivables');
    else if (m.includes('spare') && (isSuperAdmin || role === 'factory_monitor')) setActiveView('spare_parts');
    else if (m.includes('payroll') && isSuperAdmin) setActiveView('payroll');
    setIsNotificationOpen(false);
  };

  // If session is still verifying, show loading splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-factory-dark flex flex-col items-center justify-center p-4 text-factory-cream">
        <div className="p-4 bg-factory-darkCard border border-factory-secondary/30 rounded-2xl shadow-xl flex flex-col items-center gap-3">
          <Building2 className="w-10 h-10 text-factory-secondary animate-pulse" />
          <div className="flex items-center gap-2 text-xs font-mono text-factory-muted">
            <Loader2 className="w-4 h-4 animate-spin text-factory-secondary" />
            <span>Loading Ali Bori ERP...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show LoginView
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Check Role-Based Access for Active View
  const allowedRoles = VIEW_ROLE_PERMISSIONS[activeView];
  const isAuthorized = isSuperAdmin || (role && allowedRoles && allowedRoles.includes(role));

  const renderActiveView = () => {
    if (!isAuthorized) {
      return (
        <div className="p-8 max-w-lg mx-auto bg-factory-darkCard border border-red-500/30 rounded-2xl shadow-2xl text-center space-y-4 my-12 animate-fadeIn">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading text-factory-cream">
              Access Restricted
            </h2>
            <p className="text-xs text-factory-muted mt-1 leading-relaxed">
              Your assigned role <span className="font-bold text-factory-secondary uppercase">({role})</span> does not have authorization to access the <span className="font-bold text-factory-cream font-mono">[{activeView}]</span> module.
            </p>
          </div>
          <button
            onClick={() => setActiveView(role === 'store' ? 'store_bags' : 'dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-factory-secondary hover:bg-factory-secondary/90 text-factory-dark font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-factory-secondary/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to {role === 'store' ? 'Store Sacks' : 'Factory Overview'}</span>
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView metrics={metrics || null} isLoading={metricsLoading} onNavigate={setActiveView} />;
      case 'production':
        return <ProductionView initialTab="all" />;
      case 'transfers':
        return <ProductionView initialTab="transfers" />;
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
      case 'users':
        return <UserManagementView />;
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
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        onNavigate={setActiveView}
      />

      {/* Main Layout: Sidebar + View Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 w-full min-w-0">
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
