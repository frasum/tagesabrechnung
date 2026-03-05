import { getDeptBorderClass } from "./utils";
import { getDepartmentBgClass } from "@/lib/shiftCalculations";
import type { SfnMode } from "@/hooks/useSfnMode";

interface BuchhaltungDeptHeaderProps {
  department: string;
  sfnMode?: SfnMode;
}

export default function BuchhaltungDeptHeader({ department, sfnMode = "simple" }: BuchhaltungDeptHeaderProps) {
  const colCount = sfnMode === "extended" ? 11 : 10;
  return (
    <tr>
      <td
        colSpan={colCount}
        className={`px-3 py-2.5 font-bold text-sm uppercase tracking-wide border-l-4 ${getDeptBorderClass(department)} ${getDepartmentBgClass(department)}`}
      >
        {department}
      </td>
    </tr>
  );
}
