import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CNPJData {
  cnpj: string;
  name: string;
  fantasyName?: string;
  legalName?: string;
  phone?: string;
  email?: string;
  address: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    fullAddress?: string;
  };
  activity?: string;
  status?: string;
  openingDate?: string;
  legalNature?: string;
  capital?: string;
  size?: string;
}

export const useCNPJ = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CNPJData | null>(null);

  const lookup = async (cnpj: string): Promise<CNPJData | null> => {
    setLoading(true);
    setData(null);

    try {
      // Remove any non-numeric characters
      const cleanCNPJ = cnpj.replace(/\D/g, '');

      if (cleanCNPJ.length !== 14) {
        toast.error('CNPJ deve conter 14 dígitos');
        return null;
      }

      console.log('Consultando CNPJ:', cleanCNPJ);

      const { data: response, error } = await supabase.functions.invoke('lookup-cnpj', {
        body: { cnpj: cleanCNPJ }
      });

      if (error) {
        console.error('Erro ao consultar CNPJ:', error);
        toast.error('Erro ao consultar CNPJ');
        return null;
      }

      if (!response.success) {
        toast.error(response.error || 'Erro ao consultar CNPJ');
        return null;
      }

      console.log('Dados do CNPJ:', response.data);
      setData(response.data);
      toast.success('CNPJ encontrado!');
      
      return response.data;

    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setData(null);
  };

  return {
    lookup,
    clear,
    loading,
    data
  };
};
