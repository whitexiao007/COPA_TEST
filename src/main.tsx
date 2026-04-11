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
import { seedDatabase } from './db/seed';
import { initNetworkListeners } from './stores/appStore';

import TemplateBuilderScreen from './features/templates/TemplateBuilderScreen';
import InspectionScreen from './features/inspection/InspectionScreen';
import HistoryScreen from './features/history/HistoryScreen';

// Initialize network listeners
initNetworkListeners();

// --- Placeholder Router Setup ---
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
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

const routeTree = rootRoute.addChildren([
  indexRoute, 
  wellsRoute, 
  templatesRoute, 
  inspectionRoute,
  historyRoute
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
// --- End Placeholder Router Setup ---

const Main = () => {
  useEffect(() => {
    // Seed database on startup
    seedDatabase().catch(err => console.error('Failed to seed database:', err));
  }, []);

  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
};

createRoot(document.getElementById('root')!).render(<Main />);
