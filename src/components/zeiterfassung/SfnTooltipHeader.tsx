import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SfnColumn = "soFei" | "evening" | "night";

const TOOLTIP_TEXT: Record<SfnColumn, string> = {
  soFei: "50 % Sonn- und Feiertagszuschlag",
  evening: "25 % Nachtzuschlag",
  night: "40 % Nachtzuschlag",
};

interface Props {
  column: SfnColumn;
  label: string;
  className?: string;
}

export default function SfnTooltipHeader({ column, label, className }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help underline decoration-dotted underline-offset-4 ${className ?? ""}`}>{label}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-50">
          <p className="text-xs">{TOOLTIP_TEXT[column]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
