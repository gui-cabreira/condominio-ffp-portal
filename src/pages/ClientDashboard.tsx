
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, Download, MessageSquare, Bell, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type Charge = {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  description: string | null;
  units?: {
    unit_number: string;
    condominiums?: {
      name: string;
    };
  };
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

const ClientDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Carregar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      setProfile(profileData);

      // Carregar cobranças do cliente - ajustado para a estrutura real
      const { data: chargesData, error } = await supabase
        .from('charges')
        .select(`
          *,
          units:unit_id (
            unit_number,
            condominiums:condominium_id (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar cobranças:', error);
        setCharges([]);
      } else {
        setCharges(chargesData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/portal');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ffp-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-xl font-semibold text-ffp-navy">Área do Cliente</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">
                Olá, {profile?.first_name || user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-ffp-navy mb-2">Bem-vindo à sua área exclusiva</h2>
          <p className="text-gray-600">Acesse seus documentos, mensagens e acompanhe seus processos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cobranças */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center text-ffp-navy">
                <FileText className="w-5 h-5 mr-2" />
                Minhas Cobranças
              </CardTitle>
              <CardDescription>
                Visualize e pague suas cobranças pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {charges.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma cobrança encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {charges.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <FileText className="w-6 h-6 text-ffp-gold" />
                        <div>
                          <p className="font-medium">
                            {charge.units?.condominiums?.name || 'Condomínio'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Unidade: {charge.units?.unit_number || 'N/A'} | Vencimento: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Valor: R$ {Number(charge.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs mt-1">
                            <span className={`px-2 py-1 rounded-full ${
                              charge.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {charge.status === 'paid' ? 'Pago' : 'Pendente'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toast({
                            title: 'Em breve',
                            description: 'Link de pagamento será enviado por email.',
                          })}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Contact Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-ffp-navy">Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Nossa equipe está sempre disponível para atendê-lo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </Button>
              <a 
                href="tel:+5519999331777"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                📞 (19) 99933-1777
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
