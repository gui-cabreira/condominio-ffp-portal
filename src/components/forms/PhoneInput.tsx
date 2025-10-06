import * as React from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { phoneMask } from "@/lib/masks";
import { validatePhone } from "@/lib/validators";

export interface PhoneInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'type'> {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (unmaskedValue: string) => void;
  showIcon?: boolean;
  validate?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, onValueChange, showIcon = true, validate = false, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(phoneMask(value));
    const [isValid, setIsValid] = React.useState(true);

    React.useEffect(() => {
      setDisplayValue(phoneMask(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const maskedValue = phoneMask(inputValue);
      const unmaskedValue = inputValue.replace(/\D/g, '');
      
      setDisplayValue(maskedValue);
      
      if (validate) {
        setIsValid(unmaskedValue.length === 0 || validatePhone(maskedValue));
      }
      
      if (onChange) {
        onChange(maskedValue);
      }
      
      if (onValueChange) {
        onValueChange(unmaskedValue);
      }
    };

    return (
      <div className="relative">
        {showIcon && (
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          className={cn(
            showIcon && "pl-10",
            !isValid && "border-destructive focus-visible:ring-destructive",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          placeholder="(00) 00000-0000"
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
