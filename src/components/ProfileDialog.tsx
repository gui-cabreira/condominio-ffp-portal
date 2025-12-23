import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';
import { CPFInput } from '@/components/forms/CPFInput';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { AddressForm } from '@/components/forms/AddressForm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id: string;
    user_id?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    cpf?: string;
    rg?: string;
    phone?: string;
    birth_date?: string;
    zip_code?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  onProfileUpdate: () => void;
}

export function ProfileDialog({ open, onOpenChange, profile, onProfileUpdate }: ProfileDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    rg: '',
    phone: '',
    birth_date: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  // Atualizar formData quando profile mudar ou dialog abrir
  useEffect(() => {
    if (profile && open) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        cpf: profile.cpf || '',
        rg: profile.rg || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        zip_code: profile.zip_code || '',
        street: profile.street || '',
        number: profile.number || '',
        complement: profile.complement || '',
        neighborhood: profile.neighborhood || '',
        city: profile.city || '',
        state: profile.state || '',
      });
    }
  }, [profile, open]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setCrop({ unit: '%', width: 90, x: 0, y: 0, height: 90 });
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCroppedImg = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!completedCrop || !imgRef.current) {
        reject(new Error('Crop not completed'));
        return;
      }

      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }, [completedCrop]);

  const uploadAvatar = async () => {
    if (!profile || !completedCrop) return;

    const userId = profile.user_id || profile.id;

    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg();
      
      const fileExt = 'jpg';
      const fileName = `${userId}/avatar.${fileExt}`;

      // Deletar avatar antigo se existir
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada',
      });

      setImgSrc('');
      onProfileUpdate();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload da foto',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddressChange = (data: any) => {
    setFormData(prev => ({
      ...prev,
      zip_code: data.cep || prev.zip_code,
      street: data.street || prev.street,
      number: data.number || prev.number,
      complement: data.complement || prev.complement,
      neighborhood: data.neighborhood || prev.neighborhood,
      city: data.city || prev.city,
      state: data.state || prev.state
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const userId = profile.user_id || profile.id;

    try {
      setSaving(true);
      
      // Converter strings vazias para null para campos opcionais
      const cleanedData = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        zip_code: formData.zip_code || null,
        street: formData.street || null,
        number: formData.number || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(cleanedData)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado',
      });

      onProfileUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais e foto de perfil
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label>Foto de Perfil</Label>
              <div className="flex flex-col gap-4">
                {imgSrc ? (
                  <div className="space-y-2">
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      circularCrop
                    >
                      <img
                        ref={imgRef}
                        src={imgSrc}
                        alt="Crop preview"
                        className="max-h-96 w-full object-contain"
                      />
                    </ReactCrop>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={uploadAvatar}
                        disabled={uploading || !completedCrop}
                        className="flex-1"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          'Salvar Foto'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setImgSrc('')}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={onSelectFile}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Label
                      htmlFor="avatar-upload"
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Escolher foto</span>
                    </Label>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Informações Pessoais</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nome</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input value={profile?.email} disabled className="bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <CPFInput
                    value={formData.cpf}
                    onChange={(value) => setFormData({ ...formData, cpf: value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="00.000.000-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Endereço</h3>
              
              <AddressForm
                value={{
                  cep: formData.zip_code,
                  street: formData.street,
                  number: formData.number,
                  complement: formData.complement,
                  neighborhood: formData.neighborhood,
                  city: formData.city,
                  state: formData.state
                }}
                onChange={handleAddressChange}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
