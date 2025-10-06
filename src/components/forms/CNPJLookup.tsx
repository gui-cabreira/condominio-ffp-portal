import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCNPJ, CNPJData } from '@/hooks/useCNPJ';
import { Search, Loader2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CNPJLookupProps {
  onDataFound: (data: CNPJData) => void;
  initialCNPJ?: string;
}

export const CNPJLookup = ({ onDataFound, initialCNPJ = '' }: CNPJLookupProps) => {
  const [cnpj, setCNPJ] = useState(initialCNPJ);
  const { lookup, loading, data } = useCNPJ();

  const handleLookup = async () => {
    const result = await lookup(cnpj);
    if (result) {
      onDataFound(result);
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCNPJ(value);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="cnpj-lookup">CNPJ</Label>
          <Input
            id="cnpj-lookup"
            value={formatCNPJ(cnpj)}
            onChange={handleCNPJChange}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </div>
        <Button
          type="button"
          onClick={handleLookup}
          disabled={loading || cnpj.length !== 14}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Buscar
            </>
          )}
        </Button>
      </div>

      {data && (
        <div className="space-y-3 p-3 bg-background rounded-md border border-green-200">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium text-sm">Dados encontrados</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Razão Social:</span>
              <p className="font-medium">{data.legalName}</p>
            </div>
            
            {data.fantasyName && (
              <div>
                <span className="text-muted-foreground">Nome Fantasia:</span>
                <p className="font-medium">{data.fantasyName}</p>
              </div>
            )}
            
            {data.status && (
              <div>
                <span className="text-muted-foreground">Situação:</span>
                <Badge variant={data.status === 'ATIVA' ? 'default' : 'secondary'}>
                  {data.status}
                </Badge>
              </div>
            )}
            
            {data.openingDate && (
              <div>
                <span className="text-muted-foreground">Abertura:</span>
                <p className="font-medium">{data.openingDate}</p>
              </div>
            )}
          </div>

          {data.address.fullAddress && (
            <div className="text-sm">
              <span className="text-muted-foreground">Endereço:</span>
              <p className="font-medium">{data.address.fullAddress}</p>
            </div>
          )}

          {data.phone && (
            <div className="text-sm">
              <span className="text-muted-foreground">Telefone:</span>
              <p className="font-medium">{data.phone}</p>
            </div>
          )}

          {data.email && (
            <div className="text-sm">
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{data.email}</p>
            </div>
          )}

          {data.activity && (
            <div className="text-sm">
              <span className="text-muted-foreground">Atividade:</span>
              <p className="font-medium text-xs">{data.activity}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
