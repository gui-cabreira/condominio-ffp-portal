import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CPFInput } from '@/components/forms/CPFInput';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { AddressForm } from '@/components/forms/AddressForm';

export default function ProfileCompletion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [step, setStep] = useState(1);
  const [userRole, setUserRole] = useState<string>('');
  
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
    fetchUserRole();
  }, [user, navigate]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
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
      toast.success('Foto enviada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddressChange = (data: any) => {
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

      toast.success('Perfil completado com sucesso!');
      navigate('/portal/corporativo/dashboard');
    } catch (error: any) {
      toast.error('Erro ao salvar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.first_name || !formData.last_name)) {
      toast.error('Por favor, preencha seu nome completo');
      return;
    }
    if (step === 2 && (!formData.cpf || !formData.phone)) {
      toast.error('Por favor, preencha CPF e telefone');
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
          
          <CardTitle className="text-2xl text-ffp-navy">
            Bem-vindo ao FFP Portal! 🎉
          </CardTitle>
          <CardDescription>
            Complete seu perfil para começar a usar a plataforma
          </CardDescription>
          
          <div className="flex justify-center gap-2 pt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'bg-ffp-gold scale-110'
                    : s < step
                    ? 'bg-ffp-navy'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nome *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Sobrenome *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Seu sobrenome"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                  />
                </div>

                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-ffp-navy hover:bg-ffp-navy-dark"
                >
                  Próximo
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <CPFInput
                    value={formData.cpf}
                    onChange={(value) => setFormData(prev => ({ ...prev, cpf: value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                    placeholder="00.000.000-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 bg-ffp-navy hover:bg-ffp-navy-dark"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {formData.avatar_url ? (
                      <span className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Foto adicionada! Você pode alterá-la clicando no ícone acima.
                      </span>
                    ) : (
                      'Clique no ícone acima para adicionar sua foto (opcional)'
                    )}
                  </p>
                </div>

                <AddressForm
                  value={{
                    cep: formData.zip_code,
                    street: formData.street,
                    number: '',
                    complement: '',
                    neighborhood: formData.neighborhood,
                    city: formData.city,
                    state: formData.state
                  }}
                  onChange={handleAddressChange}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-ffp-gold hover:bg-ffp-gold-dark text-white"
                  >
                    {loading ? 'Salvando...' : 'Finalizar'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
