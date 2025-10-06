import * as React from "react";
import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { currencyMask } from "@/lib/masks";

export interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'type'> {
  value?: number | string;
  onChange?: (formattedValue: string, numericValue: number) => void;
  onValueChange?: (numericValue: number) => void;
  showIcon?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, onValueChange, showIcon = true, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('R$ 0,00');

    React.useEffect(() => {
      if (typeof value === 'number') {
        const formatted = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
        setDisplayValue(formatted);
      } else {
        setDisplayValue(currencyMask(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cleaned = inputValue.replace(/\D/g, '');
      const numericValue = parseFloat(cleaned) / 100;
      
      const maskedValue = currencyMask(inputValue);
      setDisplayValue(maskedValue);
      
      if (onChange) {
        onChange(maskedValue, numericValue);
      }
      
      if (onValueChange) {
        onValueChange(numericValue);
      }
    };

    return (
      <div className="relative">
        {showIcon && (
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          className={cn(
            showIcon && "pl-10",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          placeholder="R$ 0,00"
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
