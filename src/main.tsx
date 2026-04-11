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

const routeTree = rootRoute.addChildren([indexRoute, wellsRoute]);

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
