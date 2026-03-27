import { Badge } from "@/components/ui/badge";

interface RestaurantBadgeProps {
  restaurantName?: string;
  department?: string;
  show: boolean;
}

export default function RestaurantBadge({ restaurantName, department, show }: RestaurantBadgeProps) {
  if (!show || !restaurantName) return null;
  return (
    <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
      {restaurantName}{department ? ` · ${department}` : ""}
    </Badge>
  );
}
