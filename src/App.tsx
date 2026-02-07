import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import WaiterCashUp from "./pages/WaiterCashUp";
import WaiterMobile from "./pages/WaiterMobile";
import ManagerDashboard from "./pages/ManagerDashboard";
import KitchenTipSplit from "./pages/KitchenTipSplit";
import DailySummary from "./pages/DailySummary";
import Statistics from "./pages/Statistics";
import History from "./pages/History";
import StaffManagement from "./pages/StaffManagement";
import WaiterQRPoster from "./pages/WaiterQRPoster";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><WaiterCashUp /></ProtectedRoute>} />
            <Route path="/waiter" element={<ProtectedRoute><WaiterMobile /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/kitchen" element={<ProtectedRoute><KitchenTipSplit /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><DailySummary /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            <Route path="/qr-poster" element={<WaiterQRPoster />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
