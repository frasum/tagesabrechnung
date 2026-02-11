import { useEffect, lazy, Suspense } from "react";
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
import { UpdateNotification } from "@/components/pwa/UpdateNotification";
import { Loader2 } from "lucide-react";

const Login = lazy(() => import("./pages/Login"));
const WaiterCashUp = lazy(() => import("./pages/WaiterCashUp"));
const WaiterMobile = lazy(() => import("./pages/WaiterMobile"));
const KitchenTipSplit = lazy(() => import("./pages/KitchenTipSplit"));
const DailySummary = lazy(() => import("./pages/DailySummary"));
const Statistics = lazy(() => import("./pages/Statistics"));
const History = lazy(() => import("./pages/History"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const CashBalance = lazy(() => import("./pages/CashBalance"));
const WaiterQRPoster = lazy(() => import("./pages/WaiterQRPoster"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const ConfirmLoginPage = lazy(() => import("./pages/ConfirmLoginPage").then(m => ({ default: m.ConfirmLoginPage })));
const PermissionManagement = lazy(() => import("./pages/PermissionManagement"));
const RestaurantSelect = lazy(() => import("./pages/RestaurantSelect"));
const TelegramSettings = lazy(() => import("./pages/TelegramSettings"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
    },
  },
});

// Wrapper component that provides restaurant context for restaurant-specific routes
function RestaurantRoutes() {
  return (
    <RestaurantProvider>
      <DateProvider>
        <Routes>
          <Route index element={<ProtectedRoute requiredLevel="manager"><WaiterCashUp /></ProtectedRoute>} />
          <Route path="waiter" element={<ProtectedRoute><WaiterMobile /></ProtectedRoute>} />
          <Route path="summary" element={<ProtectedRoute requiredLevel="manager"><DailySummary /></ProtectedRoute>} />
          <Route path="kitchen" element={<ProtectedRoute requiredLevel="manager"><KitchenTipSplit /></ProtectedRoute>} />
          <Route path="statistics" element={<ProtectedRoute requiredLevel="manager"><Statistics /></ProtectedRoute>} />
          <Route path="history" element={<ProtectedRoute requiredLevel="manager"><History /></ProtectedRoute>} />
          <Route path="cash-balance" element={<ProtectedRoute requiredLevel="manager"><CashBalance /></ProtectedRoute>} />
          
          <Route path="qr-poster" element={<ProtectedRoute requiredLevel="manager"><WaiterQRPoster /></ProtectedRoute>} />
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

  useInactivityTimeout();

  // OAuth Redirect: Nach erfolgreichem Login auf /select-restaurant weiterleiten
  useEffect(() => {
    if (!user) return;

    const savedRestaurant = localStorage.getItem('oauth_redirect_restaurant');
    if (!savedRestaurant) return;

    localStorage.removeItem('oauth_redirect_restaurant');

    // Wenn der User bereits im Restaurant-Kontext ist, nicht erneut umleiten.
    if (location.pathname.startsWith(`/${savedRestaurant}/`)
      || location.pathname === `/${savedRestaurant}`
      || location.pathname === '/select-restaurant') {
      return;
    }

    navigate('/select-restaurant', { replace: true });
  }, [user, navigate, location.pathname]);

  return (
    <>
      {isLocked && user && <SessionLockScreen />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Global routes (no restaurant context needed) */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/select-restaurant" element={<ProtectedRoute><RestaurantSelect /></ProtectedRoute>} />
          <Route path="/install" element={<Install />} />
          <Route path="/confirm-login/:token" element={<ConfirmLoginPage />} />
          <Route path="/staff" element={<ProtectedRoute requiredLevel="admin"><StaffManagement /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute requiredLevel="admin"><PermissionManagement /></ProtectedRoute>} />
          <Route path="/telegram" element={<ProtectedRoute requiredLevel="admin"><TelegramSettings /></ProtectedRoute>} />

          {/* Redirect root to restaurant selection */}
          <Route path="/" element={<Navigate to="/select-restaurant" replace />} />

          {/* Restaurant-specific routes */}
          <Route path="/:restaurant/*" element={<RestaurantRoutes />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdateNotification />
      
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
