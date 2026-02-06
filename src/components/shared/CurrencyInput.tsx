import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, suffix = '€', className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
      const numValue = parseFloat(inputValue) || 0;
      onChange(numValue);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={value === 0 ? '' : value.toFixed(2).replace('.', ',')}
          onChange={handleChange}
          className={cn("pr-8 text-right tabular-nums", className)}
          placeholder="0,00"
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {suffix}
        </span>
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
