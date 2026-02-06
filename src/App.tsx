import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WaiterCashUp from "./pages/WaiterCashUp";
import ManagerDashboard from "./pages/ManagerDashboard";
import KitchenTipSplit from "./pages/KitchenTipSplit";
import DailySummary from "./pages/DailySummary";
import Statistics from "./pages/Statistics";
import History from "./pages/History";
import StaffManagement from "./pages/StaffManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WaiterCashUp />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/kitchen" element={<KitchenTipSplit />} />
          <Route path="/summary" element={<DailySummary />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/history" element={<History />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
