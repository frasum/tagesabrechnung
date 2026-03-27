import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmployeeSearchFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function EmployeeSearchFilter({ value, onChange }: EmployeeSearchFilterProps) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder="Mitarbeiter suchen…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-8 pr-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function filterEmployeesBySearch<T extends { nickname?: string | null; name?: string; first_name?: string | null; last_name?: string | null }>(
  employees: T[],
  searchTerm: string
): T[] {
  if (!searchTerm.trim()) return employees;
  const term = searchTerm.toLowerCase().trim();
  const isShort = term.length <= 2;

  return employees.filter(emp => {
    const nickname = (emp.nickname || "").toLowerCase();
    const firstName = (emp.first_name || "").toLowerCase();
    const lastName = (emp.last_name || "").toLowerCase();
    const name = (emp.name || "").toLowerCase();

    if (isShort) {
      // Exact nickname match or startsWith on name parts
      return nickname === term ||
        firstName.startsWith(term) ||
        lastName.startsWith(term) ||
        name.startsWith(term);
    }

    // 3+ chars: broad substring search
    return nickname.includes(term) ||
      firstName.includes(term) ||
      lastName.includes(term) ||
      name.includes(term);
  });
}
