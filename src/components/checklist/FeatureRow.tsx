import { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PriorityButton } from './PriorityButton';
import { WorkedOnButton } from './WorkedOnButton';
import {
  type ChecklistPriorityRow,
  type Priority,
  useUpsertPriority,
  useToggleWorkedOn,
  useUpdateFeatureNotes,
} from '@/hooks/useChecklist';
import { cn } from '@/lib/utils';

interface Props {
  category: string;
  featureKey: string;
  label: string;
  row?: ChecklistPriorityRow;
}

export function FeatureRow({ category, featureKey, label, row }: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(row?.notes ?? '');
  const upsert = useUpsertPriority();
  const toggle = useToggleWorkedOn();
  const updateNotes = useUpdateFeatureNotes();

  useEffect(() => {
    setNotesDraft(row?.notes ?? '');
  }, [row?.notes]);

  const setPriority = (p: Priority) => {
    const next = row?.priority === p ? null : p;
    upsert.mutate({ category, feature_key: featureKey, priority: next });
  };

  return (
    <div className="border-b last:border-b-0 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <PriorityButton value="green" active={row?.priority === 'green'} onClick={() => setPriority('green')} />
          <PriorityButton value="yellow" active={row?.priority === 'yellow'} onClick={() => setPriority('yellow')} />
          <PriorityButton value="red" active={row?.priority === 'red'} onClick={() => setPriority('red')} />
          <span className="w-2" />
          <WorkedOnButton
            active={!!row?.is_worked_on}
            onClick={() =>
              toggle.mutate({
                category,
                feature_key: featureKey,
                is_worked_on: !row?.is_worked_on,
              })
            }
          />
        </div>
        <span className="flex-1 text-sm">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotes((v) => !v)}
          className={cn('h-7 px-2', row?.notes && 'text-primary')}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
      </div>
      {showNotes && (
        <div className="pt-2 pl-1">
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              if (notesDraft !== (row?.notes ?? '')) {
                updateNotes.mutate({ category, feature_key: featureKey, notes: notesDraft });
              }
            }}
            placeholder="Notiz…"
            className="min-h-[60px] text-sm"
          />
        </div>
      )}
    </div>
  );
}
