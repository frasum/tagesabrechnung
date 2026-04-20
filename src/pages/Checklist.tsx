import { useMemo, useState, useEffect } from 'react';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FileDown, FileJson, ClipboardCheck } from 'lucide-react';
import { CHECKLIST_CATEGORIES, EDGE_FUNCTIONS_CATEGORY } from '@/data/checklistFeatures';
import {
  useChecklistPriorities,
  useChecklistEdgeFunctions,
  useChecklistSettings,
  useUpdateGlobalNotes,
  useBulkSetCategory,
  type Priority,
  type ChecklistPriorityRow,
} from '@/hooks/useChecklist';
import { FeatureRow } from '@/components/checklist/FeatureRow';
import { AddEdgeFunctionDialog } from '@/components/checklist/AddEdgeFunctionDialog';
import { exportChecklistPdf, exportChecklistJson } from '@/lib/checklistExport';
import { cn } from '@/lib/utils';

type FilterMode = 'all' | Priority | 'worked' | 'unrated';

export default function Checklist() {
  const { data: priorities = [] } = useChecklistPriorities();
  const { data: edgeFunctions = [] } = useChecklistEdgeFunctions();
  const { data: settings } = useChecklistSettings();
  const updateGlobalNotes = useUpdateGlobalNotes();
  const bulkSet = useBulkSetCategory();

  const [filter, setFilter] = useState<FilterMode>('all');
  const [globalNotesDraft, setGlobalNotesDraft] = useState('');

  useEffect(() => {
    setGlobalNotesDraft(settings?.notes ?? '');
  }, [settings?.notes]);

  const findRow = (cat: string, key: string) =>
    priorities.find((r) => r.category === cat && r.feature_key === key);

  // Build flat list of all (category, key, label, row)
  const allItems = useMemo(() => {
    const items: Array<{ category: string; key: string; label: string; row?: ChecklistPriorityRow }> = [];
    for (const cat of CHECKLIST_CATEGORIES) {
      for (const f of cat.features) {
        items.push({ category: cat.key, key: f.key, label: f.label, row: findRow(cat.key, f.key) });
      }
    }
    for (const ef of edgeFunctions) {
      items.push({
        category: EDGE_FUNCTIONS_CATEGORY,
        key: ef.function_name,
        label: ef.label,
        row: findRow(EDGE_FUNCTIONS_CATEGORY, ef.function_name),
      });
    }
    return items;
  }, [priorities, edgeFunctions]);

  const stats = useMemo(() => {
    const total = allItems.length;
    let green = 0,
      yellow = 0,
      red = 0,
      worked = 0,
      rated = 0;
    for (const it of allItems) {
      if (it.row?.priority === 'green') green++;
      if (it.row?.priority === 'yellow') yellow++;
      if (it.row?.priority === 'red') red++;
      if (it.row?.is_worked_on) worked++;
      if (it.row?.priority) rated++;
    }
    return { total, green, yellow, red, worked, rated, unrated: total - rated };
  }, [allItems]);

  const matchesFilter = (row?: ChecklistPriorityRow) => {
    if (filter === 'all') return true;
    if (filter === 'worked') return !!row?.is_worked_on;
    if (filter === 'unrated') return !row?.priority;
    return row?.priority === filter;
  };

  const handlePdfExport = () =>
    exportChecklistPdf(priorities, edgeFunctions, globalNotesDraft);
  const handleJsonExport = () =>
    exportChecklistJson(priorities, edgeFunctions, globalNotesDraft);

  const renderCategorySection = (
    catKey: string,
    catLabel: string,
    items: Array<{ key: string; label: string }>,
    extraHeaderActions?: React.ReactNode
  ) => {
    const visibleItems = items.filter((i) => matchesFilter(findRow(catKey, i.key)));
    const counts = items.reduce(
      (acc, i) => {
        const r = findRow(catKey, i.key);
        if (r?.priority === 'green') acc.green++;
        if (r?.priority === 'yellow') acc.yellow++;
        if (r?.priority === 'red') acc.red++;
        if (r?.is_worked_on) acc.worked++;
        return acc;
      },
      { green: 0, yellow: 0, red: 0, worked: 0 }
    );

    return (
      <AccordionItem value={catKey} key={catKey}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1 pr-3">
            <span className="font-medium">{catLabel}</span>
            <div className="flex items-center gap-1.5 ml-auto text-xs">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                {counts.green}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                {counts.yellow}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
                {counts.red}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                ✓ {counts.worked}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {items.length}
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b mb-1">
            <span className="text-xs text-muted-foreground mr-1">Alle:</span>
            {(['green', 'yellow', 'red'] as Priority[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
                onClick={() =>
                  bulkSet.mutate({
                    category: catKey,
                    feature_keys: items.map((i) => i.key),
                    priority: p,
                  })
                }
                className="h-7 text-xs"
              >
                {p === 'green' ? '🟢 Kritisch' : p === 'yellow' ? '🟡 Wichtig' : '🔴 Unwichtig'}
              </Button>
            ))}
            {extraHeaderActions}
          </div>
          {visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              Keine Einträge für aktuellen Filter.
            </p>
          ) : (
            visibleItems.map((i) => (
              <FeatureRow
                key={i.key}
                category={catKey}
                featureKey={i.key}
                label={i.label}
                row={findRow(catKey, i.key)}
              />
            ))
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  const ratedPercent = stats.total ? Math.round((stats.rated / stats.total) * 100) : 0;

  return (
    <GlobalLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                  Entwickler-Checkliste
                </CardTitle>
                <CardDescription className="mt-1">
                  Priorisiere Features und Edge Functions für die Weiterentwicklung der Tagesabrechnung.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePdfExport}>
                  <FileDown className="h-4 w-4 mr-1.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleJsonExport}>
                  <FileJson className="h-4 w-4 mr-1.5" />
                  JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-muted-foreground">Bewertet</span>
                <span className="font-medium">
                  {stats.rated} / {stats.total} ({ratedPercent}%)
                </span>
              </div>
              <Progress value={ratedPercent} className="h-2" />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterBadge active={filter === 'all'} onClick={() => setFilter('all')} variant="default">
                Alle ({stats.total})
              </FilterBadge>
              <FilterBadge active={filter === 'green'} onClick={() => setFilter('green')} variant="green">
                🟢 Kritisch ({stats.green})
              </FilterBadge>
              <FilterBadge active={filter === 'yellow'} onClick={() => setFilter('yellow')} variant="yellow">
                🟡 Wichtig ({stats.yellow})
              </FilterBadge>
              <FilterBadge active={filter === 'red'} onClick={() => setFilter('red')} variant="red">
                🔴 Unwichtig ({stats.red})
              </FilterBadge>
              <FilterBadge active={filter === 'worked'} onClick={() => setFilter('worked')} variant="blue">
                ✓ Bearbeitet ({stats.worked})
              </FilterBadge>
              <FilterBadge active={filter === 'unrated'} onClick={() => setFilter('unrated')} variant="muted">
                Nicht bewertet ({stats.unrated})
              </FilterBadge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allgemeine Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={globalNotesDraft}
              onChange={(e) => setGlobalNotesDraft(e.target.value)}
              onBlur={() => {
                if (globalNotesDraft !== (settings?.notes ?? '')) {
                  updateGlobalNotes.mutate(globalNotesDraft);
                }
              }}
              placeholder="Globale Notizen zum Projektstand…"
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Accordion type="multiple" className="w-full">
              {CHECKLIST_CATEGORIES.map((cat) =>
                renderCategorySection(cat.key, cat.label, cat.features)
              )}
              {renderCategorySection(
                EDGE_FUNCTIONS_CATEGORY,
                'Edge Functions',
                edgeFunctions.map((ef) => ({ key: ef.function_name, label: ef.label })),
                <div className="ml-auto">
                  <AddEdgeFunctionDialog />
                </div>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </GlobalLayout>
  );
}

function FilterBadge({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  variant: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'muted';
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    default: active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70',
    green: active ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
    yellow: active ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
    red: active ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
    blue: active ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    muted: active ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70',
  };
  return (
    <Badge
      onClick={onClick}
      className={cn('cursor-pointer transition-colors px-3 py-1 text-xs border-0', styles[variant])}
    >
      {children}
    </Badge>
  );
}
