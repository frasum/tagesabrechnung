import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SessionLockScreen } from "@/components/auth/SessionLockScreen";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
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

const queryClient = new QueryClient();

// Wrapper component that provides restaurant context for restaurant-specific routes
function RestaurantRoutes() {
  return (
    <RestaurantProvider>
      <Routes>
        <Route index element={<ProtectedRoute><WaiterCashUp /></ProtectedRoute>} />
        <Route path="waiter" element={<ProtectedRoute><WaiterMobile /></ProtectedRoute>} />
        <Route path="manager" element={<ProtectedRoute requiredLevel="manager"><ManagerDashboard /></ProtectedRoute>} />
        <Route path="kitchen" element={<ProtectedRoute requiredLevel="manager"><KitchenTipSplit /></ProtectedRoute>} />
        <Route path="summary" element={<ProtectedRoute requiredLevel="manager"><DailySummary /></ProtectedRoute>} />
        <Route path="statistics" element={<ProtectedRoute requiredLevel="manager"><Statistics /></ProtectedRoute>} />
        <Route path="history" element={<ProtectedRoute requiredLevel="manager"><History /></ProtectedRoute>} />
        <Route path="cash-balance" element={<ProtectedRoute requiredLevel="manager"><CashBalance /></ProtectedRoute>} />
        <Route path="qr-poster" element={<WaiterQRPoster />} />
      </Routes>
    </RestaurantProvider>
  );
}

// Component that handles session locking and inactivity
function AppContent() {
  const { isLocked, user } = useAuth();
  useInactivityTimeout();

  return (
    <>
      {isLocked && user && <SessionLockScreen />}
      <Routes>
        {/* Global routes (no restaurant context needed) */}
        <Route path="/login" element={<Login />} />
        <Route path="/install" element={<Install />} />
        <Route path="/staff" element={<ProtectedRoute requiredLevel="admin"><StaffManagement /></ProtectedRoute>} />
        
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
