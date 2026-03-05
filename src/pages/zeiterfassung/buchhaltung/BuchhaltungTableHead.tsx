import SfnTooltipHeader from "@/components/zeiterfassung/SfnTooltipHeader";
import type { SfnMode } from "@/hooks/useSfnMode";

interface Props {
  sfnMode?: SfnMode;
  showSfn?: boolean;
}

export default function BuchhaltungTableHead({ sfnMode = "simple", showSfn = true }: Props) {
  const isExtended = sfnMode === "extended";

  return (
    <>
      <colgroup>
        <col className="w-[320px]" />
        <col className="w-[75px]" />
        <col className="w-[75px]" />
        {showSfn && <col className="w-[75px]" />}
        {showSfn && <col className="w-[60px]" />}
        {showSfn && (isExtended ? (
          <>
            <col className="w-[60px]" />
            <col className="w-[60px]" />
          </>
        ) : (
          <col className="w-[60px]" />
        ))}
        <col className="w-[45px]" />
        <col className="w-[40px]" />
        <col className="w-[85px]" />
        <col className="min-w-[180px]" />
      </colgroup>
      <thead>
        <tr className="bg-muted sticky top-0 z-10">
          <th className="text-left px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground">Mitarbeiter</th>
          <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground border-l border-border">Gesamt</th>
          <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground">Schichten</th>
          {showSfn && <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground"><SfnTooltipHeader column="evening" label="20–24" /></th>}
          {showSfn && <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground"><SfnTooltipHeader column="night" label="24–x" /></th>}
          {showSfn && (isExtended ? (
            <>
              <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground"><SfnTooltipHeader column="sonntag" label="So" /></th>
              <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground"><SfnTooltipHeader column="feiertag" label="Fei" /></th>
            </>
          ) : (
            <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground"><SfnTooltipHeader column="soFei" label="So/Fei" /></th>
          ))}
          <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground border-l border-border">U</th>
          <th className="text-center px-2 py-2.5 font-semibold text-xs uppercase text-muted-foreground">K</th>
          <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground border-l border-border">Vorschuss</th>
          <th className="text-left px-2 py-2.5 font-semibold text-xs text-muted-foreground">Besonderheiten</th>
        </tr>
      </thead>
    </>
  );
}
