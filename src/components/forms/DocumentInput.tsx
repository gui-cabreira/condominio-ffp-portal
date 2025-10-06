import * as React from "react";
import { FileText, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cpfMask, cnpjMask } from "@/lib/masks";
import { validateCPF, validateCNPJ } from "@/lib/validators";

export type DocumentType = 'cpf' | 'cnpj' | 'both';

export interface DocumentInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'type'> {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (unmaskedValue: string) => void;
  documentType?: DocumentType;
  showIcon?: boolean;
  showValidation?: boolean;
}

const DocumentInput = React.forwardRef<HTMLInputElement, DocumentInputProps>(
  ({ 
    value = '', 
    onChange, 
    onValueChange, 
    documentType = 'both',
    showIcon = true,
    showValidation = true,
    className, 
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isValid, setIsValid] = React.useState<boolean | null>(null);

    React.useEffect(() => {
      const cleaned = value.replace(/\D/g, '');
      let masked = '';
      
      if (documentType === 'cpf') {
        masked = cpfMask(value);
      } else if (documentType === 'cnpj') {
        masked = cnpjMask(value);
      } else {
        // Auto-detecta CPF ou CNPJ baseado no tamanho
        masked = cleaned.length <= 11 ? cpfMask(value) : cnpjMask(value);
      }
      
      setDisplayValue(masked);
    }, [value, documentType]);

    const validateDocument = (val: string) => {
      const cleaned = val.replace(/\D/g, '');
      
      if (cleaned.length === 0) {
        setIsValid(null);
        return;
      }
      
      if (documentType === 'cpf') {
        setIsValid(validateCPF(val));
      } else if (documentType === 'cnpj') {
        setIsValid(validateCNPJ(val));
      } else {
        // Valida baseado no tamanho
        if (cleaned.length <= 11) {
          setIsValid(cleaned.length === 11 ? validateCPF(val) : null);
        } else {
          setIsValid(cleaned.length === 14 ? validateCNPJ(val) : null);
        }
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cleaned = inputValue.replace(/\D/g, '');
      
      let maskedValue = '';
      
      if (documentType === 'cpf') {
        maskedValue = cpfMask(inputValue);
      } else if (documentType === 'cnpj') {
        maskedValue = cnpjMask(inputValue);
      } else {
        maskedValue = cleaned.length <= 11 ? cpfMask(inputValue) : cnpjMask(inputValue);
      }
      
      setDisplayValue(maskedValue);
      
      if (showValidation) {
        validateDocument(maskedValue);
      }
      
      if (onChange) {
        onChange(maskedValue);
      }
      
      if (onValueChange) {
        onValueChange(cleaned);
      }
    };

    const getPlaceholder = () => {
      if (documentType === 'cpf') return '000.000.000-00';
      if (documentType === 'cnpj') return '00.000.000/0000-00';
      return 'CPF ou CNPJ';
    };

    const getMaxLength = () => {
      if (documentType === 'cpf') return 14; // 000.000.000-00
      if (documentType === 'cnpj') return 18; // 00.000.000/0000-00
      return 18;
    };

    return (
      <div className="relative">
        {showIcon && (
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(
            showIcon && "pl-10",
            showValidation && isValid !== null && (isValid ? "pr-10" : "pr-10 border-destructive focus-visible:ring-destructive"),
            className
          )}
          value={displayValue}
          onChange={handleChange}
          placeholder={getPlaceholder()}
          maxLength={getMaxLength()}
          {...props}
        />
        {showValidation && isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>
    );
  }
);

DocumentInput.displayName = "DocumentInput";

export { DocumentInput };
