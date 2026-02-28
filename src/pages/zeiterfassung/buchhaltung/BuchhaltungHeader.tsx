import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface BuchhaltungHeaderProps {
  selectedPeriodId: string;
  setSelectedPeriodId: (id: string) => void;
  periods: { id: string; label: string }[] | undefined;
  viewMode: string;
  setViewMode: (mode: string) => void;
  showRestaurantFilter: boolean;
  matchingPeriods: { id: string; restaurant_id: string | null }[];
  restaurants: { id: string; name: string }[];
  onExportPdf: () => void;
}

export default function BuchhaltungHeader({
  selectedPeriodId,
  setSelectedPeriodId,
  periods,
  viewMode,
  setViewMode,
  showRestaurantFilter,
  matchingPeriods,
  restaurants,
  onExportPdf,
}: BuchhaltungHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Buchhaltung</h1>

        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Periode wählen" />
          </SelectTrigger>
          <SelectContent>
            {periods?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showRestaurantFilter && (
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kumuliert ({matchingPeriods.length} Restaurants)</SelectItem>
              {matchingPeriods.map((p) => {
                const name = restaurants.find((r) => r.id === p.restaurant_id)?.name ?? p.restaurant_id;
                return <SelectItem key={p.id} value={p.restaurant_id!}>{name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onExportPdf} disabled={!selectedPeriodId}>
        <Download className="mr-1 h-4 w-4" /> PDF Export
      </Button>
    </div>
  );
}
