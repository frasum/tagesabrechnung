import { Outlet } from "react-router-dom";
import { ZtSubNav } from "./ZtSubNav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

export default function ZtLayout() {
  return (
    <ProtectedRoute requiredLevel="manager">
      <AppLayout>
        <div className="flex flex-col min-h-0 h-full">
          <ZtSubNav />
          <div className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
