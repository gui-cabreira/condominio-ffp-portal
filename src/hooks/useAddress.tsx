import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Address {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface UseAddressReturn {
  address: Address | null;
  loading: boolean;
  error: string | null;
  fetchAddress: (cep: string) => Promise<Address | null>;
  clearAddress: () => void;
}

/**
 * Hook para buscar endereço via CEP usando a API ViaCEP
 */
export const useAddress = (): UseAddressReturn => {
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = async (cep: string): Promise<Address | null> => {
    const cleanedCep = cep.replace(/\D/g, '');
    
    if (cleanedCep.length !== 8) {
      setError('CEP inválido');
      toast({
        title: 'CEP inválido',
        description: 'Por favor, digite um CEP válido com 8 dígitos.',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }

      const data = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      setAddress(data);
      setLoading(false);
      
      toast({
        title: 'Endereço encontrado',
        description: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar CEP';
      setError(errorMessage);
      setLoading(false);
      
      toast({
        title: 'Erro ao buscar CEP',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  };

  const clearAddress = () => {
    setAddress(null);
    setError(null);
  };

  return {
    address,
    loading,
    error,
    fetchAddress,
    clearAddress,
  };
};
