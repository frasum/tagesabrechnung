import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Load ALL weeks for all periods at once (not dependent on selectedPeriodId)
  const periodIds = useMemo(() => periods?.map(p => p.id) ?? [], [periods]);

  const { data: allWeeks } = useQuery({
    queryKey: ["zt-weeks-all", restaurantId],
    queryFn: async () => {
      if (!periodIds.length) return [];
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .in("period_id", periodIds)
        .order("week_number");
      if (error) throw error;
      return data as Week[];
    },
    enabled: periodIds.length > 0,
  });

  // Filter weeks for the selected period
  const weeks = useMemo(
    () => allWeeks?.filter(w => w.period_id === selectedPeriodId) ?? [],
    [allWeeks, selectedPeriodId]
  );

  // Reset when restaurant changes
  useEffect(() => {
    setSelectedPeriodId("");
    setSelectedWeekId("");
  }, [restaurantId]);

  // Handle ?date= search param navigation (e.g. from Provision page)
  useEffect(() => {
    const targetDate = searchParams.get("date");
    if (!targetDate || !periods?.length || !allWeeks?.length) return;

    const currentPeriod = periods.find(p => p.start_date <= targetDate && p.end_date >= targetDate);
    const periodId = currentPeriod?.id ?? periods[0].id;
    const periodWeeks = allWeeks.filter(w => w.period_id === periodId);
    const currentWeek = periodWeeks.find(w => w.start_date <= targetDate && w.end_date >= targetDate);
    const weekId = currentWeek?.id ?? periodWeeks[0]?.id ?? "";

    setSelectedPeriodId(periodId);
    setSelectedWeekId(weekId);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("date");
      return next;
    }, { replace: true });
  }, [searchParams, periods, allWeeks, setSearchParams]);

  // Auto-select period AND week together once both datasets are available
  useEffect(() => {
    if (!periods?.length || !allWeeks?.length || selectedPeriodId) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const currentPeriod = periods.find(p => p.start_date <= today && p.end_date >= today);
    const periodId = currentPeriod?.id ?? periods[0].id;

    const periodWeeks = allWeeks.filter(w => w.period_id === periodId);
    const currentWeek = periodWeeks.find(w => w.start_date <= today && w.end_date >= today);
    const weekId = currentWeek?.id ?? periodWeeks[0]?.id ?? "";

    setSelectedPeriodId(periodId);
    setSelectedWeekId(weekId);
  }, [periods, allWeeks, selectedPeriodId]);

  // Reset week when period changes manually (but not on initial auto-select)
  const handleSetPeriodId = (id: string) => {
    setSelectedPeriodId(id);
    // Auto-select first week of new period
    const periodWeeks = allWeeks?.filter(w => w.period_id === id) ?? [];
    const today = format(new Date(), "yyyy-MM-dd");
    const currentWeek = periodWeeks.find(w => w.start_date <= today && w.end_date >= today);
    setSelectedWeekId(currentWeek?.id ?? periodWeeks[0]?.id ?? "");
  };

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
  const isPeriodLocked = selectedPeriod?.status === "locked";

  return (
    <ZtContext.Provider value={{
      selectedPeriodId,
      setSelectedPeriodId: handleSetPeriodId,
      selectedWeekId,
      setSelectedWeekId,
      periods,
      weeks: weeks.length > 0 ? weeks : undefined,
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
