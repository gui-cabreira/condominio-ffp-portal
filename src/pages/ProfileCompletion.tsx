import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CPFInput } from '@/components/forms/CPFInput';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { AddressForm } from '@/components/forms/AddressForm';
import { MaskedInput } from '@/components/forms/MaskedInput';
import { rgMask } from '@/lib/masks';

export default function ProfileCompletion() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [step, setStep] = useState(1);
  const [userRole, setUserRole] = useState<string>('');
  const isForced = searchParams.get('force') === 'true';
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    rg: '',
    phone: '',
    birth_date: '',
    avatar_url: '',
    zip_code: '',
    street: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/portal/corporativo/login');
      return;
    }
    fetchUserData();
  }, [user, navigate]);

  // Bloquear navegação se for obrigatório
  useEffect(() => {
    if (isForced) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isForced]);

  const fetchUserData = async () => {
    if (!user) return;
    
    // Buscar dados existentes do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setFormData(prev => ({
        ...prev,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        avatar_url: profile.avatar_url || '',
        cpf: profile.cpf || '',
        rg: profile.rg || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        zip_code: profile.zip_code || '',
        street: profile.street || '',
        neighborhood: profile.neighborhood || '',
        city: profile.city || '',
        state: profile.state || ''
      }));
      
      // Buscar role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleData) {
        setUserRole(roleData.role);
      }
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;
    
    const file = event.target.files[0];
    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: 'Sucesso',
        description: 'Foto enviada com sucesso!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar foto: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddressChange = (data: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      zip_code: data.cep || prev.zip_code,
      street: data.street || prev.street,
      neighborhood: data.neighborhood || prev.neighborhood,
      city: data.city || prev.city,
      state: data.state || prev.state
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          profile_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil completado com sucesso!'
      });
      
      // Aguardar um pouco para garantir que o perfil foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate('/portal/corporativo/dashboard');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar perfil: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.first_name || !formData.last_name)) {
      toast({
        title: 'Atenção',
        description: 'Por favor, preencha seu nome completo',
        variant: 'destructive'
      });
      return;
    }
    if (step === 2 && (!formData.cpf || !formData.phone)) {
      toast({
        title: 'Atenção',
        description: 'Por favor, preencha CPF e telefone',
        variant: 'destructive'
      });
      return;
    }
    setStep(step + 1);
  };

  const getInitials = () => {
    if (!formData.first_name && !formData.last_name) return 'U';
    return `${formData.first_name.charAt(0)}${formData.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ffp-navy via-ffp-navy-dark to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl animate-fade-in border-ffp-gold/20 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-ffp-gold animate-scale-in">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="bg-ffp-navy text-white text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {step === 3 && (
                <label className="absolute bottom-0 right-0 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                  <div className="bg-ffp-gold hover:bg-ffp-gold-dark text-white p-2 rounded-full shadow-lg transition-all hover:scale-110">
                    <Upload className="h-4 w-4" />
                  </div>
                </label>
              )}
            </div>
          </div>

          <CardTitle className="text-3xl font-bold text-ffp-navy">Complete seu Perfil</CardTitle>
          <CardDescription className="text-gray-600">
            {isForced ? 'Complete seu perfil para acessar o sistema FFP' : 'Preencha suas informações pessoais'}
          </CardDescription>

          {isForced && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Atenção:</strong> Você precisa completar seu perfil para ter acesso ao sistema FFP Advogados.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-2 flex-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    s <= step ? 'bg-ffp-gold' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-4">Etapa {step} de 3</span>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Etapa 1: Dados Pessoais */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-ffp-navy mb-4">
                  <User className="h-5 w-5" />
                  <h3 className="font-semibold text-lg">Dados Pessoais</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nome *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">Sobrenome *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Etapa 2: Contato e Documentos */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-ffp-navy mb-4">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-semibold text-lg">Contato e Documentos</h3>
                </div>

                <CPFInput
                  value={formData.cpf}
                  onChange={(value) => setFormData({ ...formData, cpf: value })}
                  required
                />

                <div>
                  <Label htmlFor="rg">RG</Label>
                  <MaskedInput
                    id="rg"
                    mask={rgMask}
                    value={formData.rg}
                    onChange={(value) => setFormData({ ...formData, rg: value })}
                    placeholder="00.000.000-0"
                    className="mt-1"
                  />
                </div>

                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                />
              </div>
            )}

            {/* Etapa 3: Endereço e Foto */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-ffp-navy mb-4">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-semibold text-lg">Endereço e Foto</h3>
                </div>

                <AddressForm
                  value={{
                    cep: formData.zip_code,
                    street: formData.street,
                    neighborhood: formData.neighborhood,
                    city: formData.city,
                    state: formData.state,
                    number: '',
                    complement: ''
                  }}
                  onChange={handleAddressChange}
                />

                <div className="pt-4 border-t">
                  <Label className="text-sm text-gray-600">
                    Foto de Perfil (opcional)
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Clique no ícone acima para fazer upload de uma foto
                  </p>
                </div>
              </div>
            )}

            {/* Botões de Navegação */}
            <div className="flex justify-between gap-4 pt-6 border-t">
              {step > 1 && !isForced && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="border-ffp-navy text-ffp-navy hover:bg-ffp-navy/10"
                >
                  Voltar
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy font-semibold"
                >
                  Próxima Etapa
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="ml-auto bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ffp-navy mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
