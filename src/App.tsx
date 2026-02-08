import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { DateProvider } from "@/contexts/DateContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SessionLockScreen } from "@/components/auth/SessionLockScreen";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useIsMobile } from "@/hooks/use-mobile";
import Login from "./pages/Login";
import WaiterCashUp from "./pages/WaiterCashUp";
import WaiterMobile from "./pages/WaiterMobile";
import ManagerDashboard from "./pages/ManagerDashboard";
import KitchenTipSplit from "./pages/KitchenTipSplit";
import DailySummary from "./pages/DailySummary";
import Statistics from "./pages/Statistics";
import History from "./pages/History";
import StaffManagement from "./pages/StaffManagement";
import CashBalance from "./pages/CashBalance";
import WaiterQRPoster from "./pages/WaiterQRPoster";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import { ConfirmLoginPage } from "./pages/ConfirmLoginPage";
import PermissionManagement from "./pages/PermissionManagement";
import RegisterBalance from "./pages/RegisterBalance";

const queryClient = new QueryClient();

// Wrapper component that provides restaurant context for restaurant-specific routes
function RestaurantRoutes() {
  return (
    <RestaurantProvider>
      <DateProvider>
        <Routes>
          <Route index element={<ProtectedRoute><WaiterCashUp /></ProtectedRoute>} />
          <Route path="waiter" element={<ProtectedRoute><WaiterMobile /></ProtectedRoute>} />
          <Route path="manager" element={<ProtectedRoute requiredLevel="manager"><ManagerDashboard /></ProtectedRoute>} />
          <Route path="kitchen" element={<ProtectedRoute requiredLevel="manager"><KitchenTipSplit /></ProtectedRoute>} />
          <Route path="summary" element={<ProtectedRoute requiredLevel="manager"><DailySummary /></ProtectedRoute>} />
          <Route path="statistics" element={<ProtectedRoute requiredLevel="manager"><Statistics /></ProtectedRoute>} />
          <Route path="history" element={<ProtectedRoute requiredLevel="manager"><History /></ProtectedRoute>} />
          <Route path="cash-balance" element={<ProtectedRoute requiredLevel="manager"><CashBalance /></ProtectedRoute>} />
          <Route path="register-balance" element={<ProtectedRoute requiredLevel="manager"><RegisterBalance /></ProtectedRoute>} />
          <Route path="qr-poster" element={<WaiterQRPoster />} />
        </Routes>
      </DateProvider>
    </RestaurantProvider>
  );
}

// Component that handles session locking and inactivity
function AppContent() {
  const { isLocked, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  useInactivityTimeout();

  // OAuth Redirect: Nach erfolgreichem Login werden wir oft auf "/" zurückgeführt.
  // Dann leiten wir global (nicht nur in Login.tsx) in den gespeicherten Restaurant-Kontext weiter.
  useEffect(() => {
    if (!user) return;

    const savedRestaurant = localStorage.getItem('oauth_redirect_restaurant');
    if (!savedRestaurant) return;

    localStorage.removeItem('oauth_redirect_restaurant');

    // Wenn der User bereits im Restaurant-Kontext ist, nicht erneut umleiten.
    if (location.pathname.startsWith(`/${savedRestaurant}/`)
      || location.pathname === `/${savedRestaurant}`) {
      return;
    }

    const restaurant = savedRestaurant || 'spicery';
    navigate(isMobile ? `/${restaurant}/waiter` : `/${restaurant}`, { replace: true });
  }, [user, navigate, isMobile, location.pathname]);

  return (
    <>
      {isLocked && user && <SessionLockScreen />}
      <Routes>
        {/* Global routes (no restaurant context needed) */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/install" element={<Install />} />
        <Route path="/confirm-login/:token" element={<ConfirmLoginPage />} />
        <Route path="/staff" element={<ProtectedRoute requiredLevel="admin"><StaffManagement /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute requiredLevel="admin"><PermissionManagement /></ProtectedRoute>} />

        {/* Redirect root to default restaurant */}
        <Route path="/" element={<Navigate to="/spicery" replace />} />

        {/* Restaurant-specific routes */}
        <Route path="/:restaurant/*" element={<RestaurantRoutes />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
