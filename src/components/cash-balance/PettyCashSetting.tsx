import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Pencil, Check, X } from 'lucide-react';
import { usePettyCash } from '@/hooks/useSettings';
import { useRestaurant } from '@/hooks/useRestaurant';
import { toast } from 'sonner';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

export function PettyCashSetting() {
  const { restaurantId } = useRestaurant();
  const { pettyCash, updatePettyCash, isUpdating } = usePettyCash(restaurantId);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleEdit = () => {
    setEditValue(pettyCash.toString().replace('.', ','));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleSave = () => {
    if (!restaurantId) {
      toast.error('Restaurant nicht gefunden');
      return;
    }

    const numValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    updatePettyCash({ amount: numValue, restaurantId }, {
      onSuccess: () => {
        toast.success('Wechselgeld aktualisiert');
        setIsEditing(false);
      },
      onError: () => {
        toast.error('Fehler beim Speichern');
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Coins className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Wechselgeld -START </span>
      
      {isEditing ?
      <div className="flex items-center gap-1">
          <Input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-24 h-7 text-sm"
          autoFocus
          disabled={isUpdating} />

          <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleSave}
          disabled={isUpdating}>

            <Check className="h-3 w-3" />
          </Button>
          <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleCancel}
          disabled={isUpdating}>

            <X className="h-3 w-3" />
          </Button>
        </div> :

      <div className="flex items-center gap-1">
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(pettyCash)}
          </span>
          <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleEdit}>

            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      }
    </div>);

}