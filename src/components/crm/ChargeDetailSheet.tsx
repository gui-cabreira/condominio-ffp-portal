import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, Mail, MapPin, Calendar, DollarSign, MessageSquare, 
  FileText, History, User, Building2, Send
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChargeTimeline } from '@/components/ChargeTimeline';

interface ChargeData {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  last_contact_at: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  pipeline_stage: string;
  principal_amount?: number;
  interest_amount?: number;
  fine_amount?: number;
  attorney_fees?: number;
  description?: string;
  reference_month?: string;
  unit: {
    id: string;
    unit_number: string;
    block: string | null;
    tower: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    owner_email: string | null;
    tenant_name: string | null;
    tenant_phone: string | null;
    tenant_email: string | null;
    owner_street: string | null;
    owner_city: string | null;
    owner_state: string | null;
    condominium: {
      id: string;
      name: string;
      address: string | null;
    };
  };
  negotiation_history?: {
    id: string;
    status: string;
    proposed_amount: number;
    original_amount: number;
    installments: number;
    proposed_at: string;
    notes: string | null;
  }[];
}

interface ChargeDetailSheetProps {
  charge: ChargeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendNotification: (chargeId: string, channel: 'email' | 'whatsapp') => void;
}

export function ChargeDetailSheet({ charge, open, onOpenChange, onSendNotification }: ChargeDetailSheetProps) {
  if (!charge) return null;

  const daysOverdue = differenceInDays(new Date(), new Date(charge.due_date));
  const contactName = charge.unit.tenant_name || charge.unit.owner_name || 'Sem nome';
  const contactPhone = charge.unit.tenant_phone || charge.unit.owner_phone;
  const contactEmail = charge.unit.tenant_email || charge.unit.owner_email;

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {contactName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="valores">Valores</TabsTrigger>
              <TabsTrigger value="acordos">Acordos</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              {/* Devedor */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Devedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Nome:</span>
                    <span>{contactName}</span>
                  </div>
                  {contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contactPhone}</span>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{contactEmail}</span>
                    </div>
                  )}
                  {charge.unit.owner_street && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>
                        {charge.unit.owner_street}, {charge.unit.owner_city} - {charge.unit.owner_state}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Condomínio */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Condomínio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">{charge.unit.condominium.name}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Unidade {charge.unit.unit_number}
                    {charge.unit.block && ` - Bloco ${charge.unit.block}`}
                    {charge.unit.tower && ` - Torre ${charge.unit.tower}`}
                  </div>
                  {charge.unit.condominium.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>{charge.unit.condominium.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ações rápidas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onSendNotification(charge.id, 'whatsapp')}
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onSendNotification(charge.id, 'email')}
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="valores" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Detalhamento da Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Valor Principal:</span>
                    <span className="font-medium">{formatCurrency(charge.principal_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Juros:</span>
                    <span>{formatCurrency(charge.interest_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Multa:</span>
                    <span>{formatCurrency(charge.fine_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Honorários:</span>
                    <span>{formatCurrency(charge.attorney_fees)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(charge.amount)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Vencimento:</span>
                    <span>{format(new Date(charge.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Atraso:</span>
                    <Badge variant={daysOverdue > 0 ? 'destructive' : 'secondary'}>
                      {daysOverdue > 0 ? `${daysOverdue} dias` : 'Em dia'}
                    </Badge>
                  </div>
                  {charge.reference_month && (
                    <div className="flex justify-between">
                      <span>Referência:</span>
                      <span>{charge.reference_month}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="acordos" className="space-y-4 mt-4">
              {charge.negotiation_history && charge.negotiation_history.length > 0 ? (
                charge.negotiation_history.map((neg) => (
                  <Card key={neg.id}>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <Badge variant={
                          neg.status === 'accepted' ? 'default' :
                          neg.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }>
                          {neg.status === 'accepted' ? 'Aceito' :
                           neg.status === 'rejected' ? 'Rejeitado' :
                           'Pendente'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(neg.proposed_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor original:</span>
                        <span>{formatCurrency(neg.original_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor proposto:</span>
                        <span className="font-medium">{formatCurrency(neg.proposed_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Parcelas:</span>
                        <span>{neg.installments}x</span>
                      </div>
                      {neg.notes && (
                        <div className="text-muted-foreground border-t pt-2">
                          {neg.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum acordo registrado</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <ChargeTimeline chargeId={charge.id} />
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
