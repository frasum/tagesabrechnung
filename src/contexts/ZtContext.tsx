import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { ensurePeriodsExist } from "@/lib/periodUtils";
import { format } from "date-fns";

type Period = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  restaurant_id: string | null;
};

type Week = {
  id: string;
  period_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
};

interface ZtContextType {
  selectedPeriodId: string;
  setSelectedPeriodId: (id: string) => void;
  selectedWeekId: string;
  setSelectedWeekId: (id: string) => void;
  periods: Period[] | undefined;
  weeks: Week[] | undefined;
  isPeriodsLoading: boolean;
  isPeriodLocked: boolean;
}

const ZtContext = createContext<ZtContextType | null>(null);

export function ZtProvider({ children }: { children: React.ReactNode }) {
  const { restaurantId } = useRestaurant();
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");

  const { data: periods, isLoading: isPeriodsLoading } = useQuery({
    queryKey: ["zt-periods", restaurantId],
    queryFn: async () => {
      await ensurePeriodsExist(restaurantId);
      const { data, error } = await supabase
        .from("scheduling_periods")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Period[];
    },
    enabled: !!restaurantId,
  });

  const { data: weeks } = useQuery({
    queryKey: ["zt-weeks", selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriodId) return [];
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .eq("period_id", selectedPeriodId)
        .order("week_number");
      if (error) throw error;
      return data as Week[];
    },
    enabled: !!selectedPeriodId,
  });

  // Reset when restaurant changes
  useEffect(() => {
    setSelectedPeriodId("");
    setSelectedWeekId("");
  }, [restaurantId]);

  // Auto-select current period
  useEffect(() => {
    if (!periods?.length || selectedPeriodId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const current = periods.find(p => p.start_date <= today && p.end_date >= today);
    setSelectedPeriodId(current?.id ?? periods[0].id);
  }, [periods, selectedPeriodId]);

  // Auto-select current week
  useEffect(() => {
    if (!weeks?.length || selectedWeekId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const current = weeks.find(w => w.start_date <= today && w.end_date >= today);
    setSelectedWeekId(current?.id ?? weeks[0].id);
  }, [weeks, selectedWeekId]);

  // Reset week when period changes
  useEffect(() => {
    setSelectedWeekId("");
  }, [selectedPeriodId]);

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
  const isPeriodLocked = selectedPeriod?.status === "locked";

  return (
    <ZtContext.Provider value={{
      selectedPeriodId,
      setSelectedPeriodId,
      selectedWeekId,
      setSelectedWeekId,
      periods,
      weeks,
      isPeriodsLoading,
      isPeriodLocked,
    }}>
      {children}
    </ZtContext.Provider>
  );
}

export function useZt() {
  const ctx = useContext(ZtContext);
  if (!ctx) throw new Error("useZt must be used within ZtProvider");
  return ctx;
}
