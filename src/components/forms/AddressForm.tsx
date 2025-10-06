import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "./MaskedInput";
import { cepMask } from "@/lib/masks";
import { useAddress } from "@/hooks/useAddress";
import { cn } from "@/lib/utils";

export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AddressFormProps {
  value?: Partial<AddressData>;
  onChange?: (data: AddressData) => void;
  onFieldChange?: (field: keyof AddressData, value: string) => void;
  className?: string;
  disabled?: boolean;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const AddressForm = React.forwardRef<HTMLDivElement, AddressFormProps>(
  ({ value = {}, onChange, onFieldChange, className, disabled = false }, ref) => {
    const [formData, setFormData] = React.useState<AddressData>({
      cep: value.cep || '',
      street: value.street || '',
      number: value.number || '',
      complement: value.complement || '',
      neighborhood: value.neighborhood || '',
      city: value.city || '',
      state: value.state || '',
    });

    const { fetchAddress, loading } = useAddress();

    React.useEffect(() => {
      setFormData({
        cep: value.cep || '',
        street: value.street || '',
        number: value.number || '',
        complement: value.complement || '',
        neighborhood: value.neighborhood || '',
        city: value.city || '',
        state: value.state || '',
      });
    }, [value]);

    const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
      const newData = { ...formData, [field]: fieldValue };
      setFormData(newData);

      if (onFieldChange) {
        onFieldChange(field, fieldValue);
      }

      if (onChange) {
        onChange(newData);
      }
    };

    const handleCEPSearch = async () => {
      const address = await fetchAddress(formData.cep);
      
      if (address) {
        const newData = {
          ...formData,
          street: address.logradouro || formData.street,
          neighborhood: address.bairro || formData.neighborhood,
          city: address.localidade || formData.city,
          state: address.uf || formData.state,
        };
        
        setFormData(newData);

        if (onChange) {
          onChange(newData);
        }
      }
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* CEP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="flex gap-2">
              <MaskedInput
                id="cep"
                mask={cepMask}
                value={formData.cep}
                onChange={(val) => handleFieldChange('cep', val)}
                placeholder="00000-000"
                disabled={disabled}
                inputMode="numeric"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCEPSearch}
                disabled={loading || disabled || formData.cep.replace(/\D/g, '').length !== 8}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Rua e Número */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => handleFieldChange('street', e.target.value)}
              placeholder="Nome da rua"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => handleFieldChange('number', e.target.value)}
              placeholder="123"
              disabled={disabled}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Complemento */}
        <div className="space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={formData.complement}
            onChange={(e) => handleFieldChange('complement', e.target.value)}
            placeholder="Apartamento, bloco, etc. (opcional)"
            disabled={disabled}
          />
        </div>

        {/* Bairro, Cidade e Estado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood}
              onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
              placeholder="Nome do bairro"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="Nome da cidade"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <select
              id="state"
              value={formData.state}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              disabled={disabled}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione</option>
              {BRAZILIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }
);

AddressForm.displayName = "AddressForm";
