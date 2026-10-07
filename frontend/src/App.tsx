import React, { useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SplashScreen } from './components/layout/SplashScreen';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { api } from './api/client';
import { DashboardMetrics, Notification, UserRole } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Dynamic code-split lazy imports for instantaneous initial page load
const DashboardView = lazy(() => import('./pages/DashboardView').then(m => ({ default: m.DashboardView })));
const ProductionView = lazy(() => import('./pages/ProductionView').then(m => ({ default: m.ProductionView })));
const StoreView = lazy(() => import('./pages/StoreView').then(m => ({ default: m.StoreView })));
const RawMaterialsView = lazy(() => import('./pages/RawMaterialsView').then(m => ({ default: m.RawMaterialsView })));
const StockRequestsView = lazy(() => import('./pages/StockRequestsView').then(m => ({ default: m.StockRequestsView })));
const MachinesView = lazy(() => import('./pages/MachinesView').then(m => ({ default: m.MachinesView })));
const MaintenanceView = lazy(() => import('./pages/MaintenanceView').then(m => ({ default: m.MaintenanceView })));
const SparePartsView = lazy(() => import('./pages/SparePartsView').then(m => ({ default: m.SparePartsView })));
const UtilitiesView = lazy(() => import('./pages/UtilitiesView').then(m => ({ default: m.UtilitiesView })));
const DispatchView = lazy(() => import('./pages/DispatchView').then(m => ({ default: m.DispatchView })));
const CustomersView = lazy(() => import('./pages/CustomersView').then(m => ({ default: m.CustomersView })));
const ReceivablesView = lazy(() => import('./pages/ReceivablesView').then(m => ({ default: m.ReceivablesView })));
const WorkforceView = lazy(() => import('./pages/WorkforceView').then(m => ({ default: m.WorkforceView })));
const AttendanceView = lazy(() => import('./pages/AttendanceView').then(m => ({ default: m.AttendanceView })));
const PayrollView = lazy(() => import('./pages/PayrollView').then(m => ({ default: m.PayrollView })));
const CatalogView = lazy(() => import('./pages/CatalogView').then(m => ({ default: m.CatalogView })));
const DocumentsView = lazy(() => import('./pages/DocumentsView').then(m => ({ default: m.DocumentsView })));
const SettingsView = lazy(() => import('./pages/SettingsView').then(m => ({ default: m.SettingsView })));
const ImporterView = lazy(() => import('./pages/ImporterView').then(m => ({ default: m.ImporterView })));
const UserManagementView = lazy(() => import('./pages/UserManagementView').then(m => ({ default: m.UserManagementView })));
const LoginView = lazy(() => import('./pages/LoginView').then(m => ({ default: m.LoginView })));

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
  const [isSplashDone, setIsSplashDone] = useState<boolean>(false);

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

  const notifications: Notification[] = Array.isArray(notificationsData?.results)
    ? notificationsData.results
    : (Array.isArray(notificationsData) ? notificationsData : []);

  const handleMarkRead = async (id: string) => {
    try {
      const current = notifications.find((n) => n.id === id);
      const nextReadState = current ? !current.is_read : true;
      await api.patch(`/notifications/items/${id}/`, { is_read: nextReadState });
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

  const handleClearAllRead = async () => {
    try {
      await api.post('/notifications/items/clear-all-read/');
      refetchNotifications();
    } catch (err) {
      console.error('Failed to clear read notifications', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/items/${id}/`);
      refetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleCreateNotification = async (notifData: any) => {
    try {
      await api.post('/notifications/items/', notifData);
      refetchNotifications();
    } catch (err) {
      console.error('Failed to create notification', err);
    }
  };

  const handleNavigateToRecord = (model?: string) => {
    if (!model) return;
    const m = model.toLowerCase();
    if (m.includes('machine')) setActiveView('machines');
    else if (m.includes('stock_request') || m.includes('request')) setActiveView('stock_requests');
    else if (m.includes('stock') || m.includes('material') || m.includes('yarn')) setActiveView('raw_materials');
    else if (m.includes('dispatch') || m.includes('order')) setActiveView('dispatch');
    else if (m.includes('credit') || m.includes('receivable')) setActiveView('receivables');
    else if (m.includes('production') || m.includes('batch')) setActiveView('production');
    else if (m.includes('spare')) setActiveView('spare_parts');
    else if (m.includes('store') || m.includes('finished')) setActiveView('store');
    else if (m.includes('customer')) setActiveView('customers');
    else if (m.includes('payroll')) setActiveView('payroll');
    else if (m.includes('attendance')) setActiveView('attendance');
    setIsNotificationOpen(false);
  };

  const ViewLoader: React.FC = () => (
    <div className="flex items-center justify-center min-h-[350px] w-full animate-fadeIn">
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-factory-darkCard border border-factory-darkBorder shadow-lg">
        <div className="w-8 h-8 border-2 border-factory-secondary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-factory-muted">Loading module...</span>
      </div>
    </div>
  );

  // If not authenticated, show LoginView (with splash screen overlay if not finished)
  if (!isAuthenticated) {
    return (
      <>
        {!isSplashDone && (
          <SplashScreen
            onComplete={() => setIsSplashDone(true)}
            isLoading={authLoading}
          />
        )}
        <Suspense fallback={<ViewLoader />}>
          <LoginView />
        </Suspense>
      </>
    );
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
      {!isSplashDone && (
        <SplashScreen
          onComplete={() => setIsSplashDone(true)}
          isLoading={authLoading}
        />
      )}
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
          <Suspense fallback={<ViewLoader />}>
            {renderActiveView()}
          </Suspense>
        </main>
      </div>

      {/* Slide-out Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onClearAllRead={handleClearAllRead}
        onDeleteNotification={handleDeleteNotification}
        onCreateNotification={handleCreateNotification}
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
