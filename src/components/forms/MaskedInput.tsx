import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MaskFunction } from "@/lib/masks";

export interface MaskedInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  mask: MaskFunction;
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (unmaskedValue: string) => void;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value = '', onChange, onValueChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(mask(value));

    React.useEffect(() => {
      setDisplayValue(mask(value));
    }, [value, mask]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const maskedValue = mask(inputValue);
      const unmaskedValue = inputValue.replace(/\D/g, '');
      
      setDisplayValue(maskedValue);
      
      if (onChange) {
        onChange(maskedValue);
      }
      
      if (onValueChange) {
        onValueChange(unmaskedValue);
      }
    };

    return (
      <Input
        ref={ref}
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
