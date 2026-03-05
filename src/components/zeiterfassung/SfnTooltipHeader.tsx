import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { SfnMode } from "@/hooks/useSfnMode";

type SfnColumn = "soFei" | "sonntag" | "feiertag" | "evening" | "night";

const SIMPLE_TEXT: Record<SfnColumn, string> = {
  soFei: "50 % Sonn- und Feiertagszuschlag",
  sonntag: "50 % Sonntagszuschlag",
  feiertag: "125 % / 150 % Feiertagszuschlag (§3b EStG)",
  evening: "25 % Nachtzuschlag",
  night: "40 % Nachtzuschlag",
};

const EXTENDED_TEXT: Record<SfnColumn, string> = {
  soFei: "50 % Sonn- und Feiertagszuschlag",
  sonntag: "50 % Sonntagszuschlag (§3b EStG) — additiv zu Nachtzuschlägen",
  feiertag: "125 % Feiertag / 150 % besondere Feiertage (1. Mai, 25./26.12.) — additiv zu Nachtzuschlägen",
  evening: "25 % Nachtzuschlag (20:00–00:00) — additiv zu So/Fei-Zuschlägen",
  night: "40 % Nachtzuschlag (00:00–04:00) — additiv zu So/Fei-Zuschlägen",
};

interface Props {
  column: SfnColumn;
  label: string;
  className?: string;
  sfnMode?: SfnMode;
}

export default function SfnTooltipHeader({ column, label, className, sfnMode = "simple" }: Props) {
  const text = sfnMode === "extended" ? EXTENDED_TEXT[column] : SIMPLE_TEXT[column];

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <span className={`cursor-help underline decoration-dotted underline-offset-4 ${className ?? ""}`}>{label}</span>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" className="w-auto min-w-[120px] p-3 text-xs">
        <p>{text}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
