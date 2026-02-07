import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, suffix = '€', className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Sync display value with external value when not focused
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value === 0 ? '' : value.toFixed(2).replace('.', ','));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow typing freely - only filter invalid characters
      const rawValue = e.target.value.replace(/[^0-9.,]/g, '');
      setDisplayValue(rawValue);
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Clear field if it shows "0,00" for easier input
      if (displayValue === '0,00' || displayValue === '') {
        setDisplayValue('');
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Parse and format the value on blur
      const normalizedValue = displayValue.replace(',', '.');
      const numValue = parseFloat(normalizedValue) || 0;
      onChange(numValue);
      setDisplayValue(numValue === 0 ? '' : numValue.toFixed(2).replace('.', ','));
    };


    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
