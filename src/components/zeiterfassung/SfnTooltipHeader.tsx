import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type SfnColumn = "soFei" | "sonntag" | "feiertag" | "evening" | "night";

const TOOLTIP_TEXT: Record<SfnColumn, string> = {
  soFei: "50 % Sonn- und Feiertagszuschlag",
  sonntag: "50 % Sonntagszuschlag",
  feiertag: "125 % / 150 % Feiertagszuschlag (§3b EStG)",
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
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <span className={`cursor-help underline decoration-dotted underline-offset-4 ${className ?? ""}`}>{label}</span>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" className="w-auto min-w-[120px] p-3 text-xs">
        <p>{TOOLTIP_TEXT[column]}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
