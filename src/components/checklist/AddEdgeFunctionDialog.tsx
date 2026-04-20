import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAddEdgeFunction } from '@/hooks/useChecklist';

export function AddEdgeFunctionDialog() {
  const [open, setOpen] = useState(false);
  const [functionName, setFunctionName] = useState('');
  const [label, setLabel] = useState('');
  const add = useAddEdgeFunction();

  const submit = async () => {
    if (!functionName.trim() || !label.trim()) return;
    await add.mutateAsync({ function_name: functionName.trim(), label: label.trim() });
    setFunctionName('');
    setLabel('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Function hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edge Function hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Function-Name (technisch)</Label>
            <Input
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
              placeholder="z.B. my-function"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Anzeige-Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z.B. My Function"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={add.isPending}>
            Hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
