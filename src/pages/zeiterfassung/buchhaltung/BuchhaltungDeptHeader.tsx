import { getDeptBorderClass } from "./utils";
import { getDepartmentBgClass } from "@/lib/shiftCalculations";

interface BuchhaltungDeptHeaderProps {
  department: string;
}

export default function BuchhaltungDeptHeader({ department }: BuchhaltungDeptHeaderProps) {
  return (
    <tr>
      <td
        colSpan={10}
        className={`px-3 py-2.5 font-bold text-sm uppercase tracking-wide border-l-4 ${getDeptBorderClass(department)} ${getDepartmentBgClass(department)}`}
      >
        {department}
      </td>
    </tr>
  );
}
