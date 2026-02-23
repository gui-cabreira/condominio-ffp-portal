import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbMessageTemplate {
  id: string;
  name: string;
  template_type: string;
  category: string | null;
  subject: string | null;
  content: string;
  variables: string[] | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string;
}

export function useMessageTemplates(typeFilter?: string) {
  return useQuery({
    queryKey: ['message-templates', typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (typeFilter) {
        query = query.eq('template_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DbMessageTemplate[];
    },
  });
}

export function useMessageTemplatesByType() {
  const { data: allTemplates, ...rest } = useMessageTemplates();
  
  const grouped = {
    whatsapp: allTemplates?.filter(t => t.template_type === 'whatsapp') || [],
    email: allTemplates?.filter(t => t.template_type === 'email') || [],
    sms: allTemplates?.filter(t => t.template_type === 'sms') || [],
  };

  return { grouped, allTemplates, ...rest };
}
