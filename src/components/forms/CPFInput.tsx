import { Input } from '@/components/ui/input';
import { formatCPF } from '@/lib/formatters';

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

export const CPFInput = ({ value, onChange, placeholder = "000.000.000-00", id, required }: CPFInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      onChange(cleaned);
    }
  };

  return (
    <Input
      id={id}
      value={formatCPF(value)}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={14}
      required={required}
    />
  );
};
