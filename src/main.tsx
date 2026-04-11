import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  RouterProvider,
  Outlet
} from '@tanstack/react-router';
import App from './App.tsx';
import WellMasterScreen from './features/wells/WellMasterScreen';
import './index.css';
import { initNetworkListeners, useAppStore } from './stores/appStore';

import TemplateBuilderScreen from './features/templates/TemplateBuilderScreen';
import InspectionScreen from './features/inspection/InspectionScreen';
import HistoryScreen from './features/history/HistoryScreen';
import LoginScreen from './features/auth/LoginScreen';
import DashboardScreen from './features/dashboard/DashboardScreen';

// Initialize network listeners
initNetworkListeners();

// --- Root Component with Auth Protection ---
const RootComponent = () => {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <LoginScreen />;
  return <Outlet />;
};

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginScreen,
});

const wellsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wells',
  component: WellMasterScreen,
});

const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: TemplateBuilderScreen,
});

const inspectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspect/$wellId',
  component: InspectionScreen,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history/$wellId',
  component: HistoryScreen,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute, 
  loginRoute,
  wellsRoute, 
  templatesRoute, 
  inspectionRoute,
  historyRoute,
  dashboardRoute
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const Main = () => {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
};

createRoot(document.getElementById('root')!).render(<Main />);
