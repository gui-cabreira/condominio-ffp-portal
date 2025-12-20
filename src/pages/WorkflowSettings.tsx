import React, { useState } from 'react';
import { Settings, Key, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const WorkflowSettings = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configurações do Workflow
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure as API keys e credenciais para integrações
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Funcionalidade em Desenvolvimento
          </CardTitle>
          <CardDescription>
            As configurações de workflow ainda não estão disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Esta funcionalidade será implementada em breve e incluirá:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Configuração de API keys para WhatsApp Business</li>
            <li>Configurações de SMTP para envio de e-mails</li>
            <li>Credenciais para provedores de SMS</li>
            <li>Outras integrações de workflow</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm">🔒 Segurança</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• As chaves marcadas como criptografadas serão armazenadas de forma segura</p>
          <p>• Nunca compartilhe suas API keys com terceiros</p>
          <p>• Recomendamos renovar as chaves periodicamente</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowSettings;
