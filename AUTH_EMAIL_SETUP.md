# Configuração de Emails de Autenticação via Resend

Este guia explica como configurar o sistema para enviar emails de autenticação (reset de senha, confirmação de email, etc.) usando Resend ao invés dos emails padrão do Supabase.

## 1. Configurar Webhook no Supabase

### 1.1 Acessar Configurações de Auth

1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/auth/url-configuration
2. No menu lateral, clique em **Authentication** → **Email Templates**

### 1.2 Configurar URL do Webhook

Na seção **Auth Hooks**, configure:

**Hook URL:**
```
https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/auth-email
```

**Events a habilitar:**
- ✅ Password Recovery
- ✅ Email Confirmation
- ✅ Email Change
- ✅ Magic Link

### 1.3 Desabilitar Templates Padrão (Opcional)

Para evitar envio duplicado, você pode:
1. Ir em **Email Templates**
2. Desabilitar os templates padrão que você substituiu pelo Resend
3. OU manter habilitados caso queira fallback

## 2. Configurar Domínio no Resend

### 2.1 Adicionar Domínio

1. Acesse https://resend.com/domains
2. Clique em **Add Domain**
3. Digite: `ffpadvogados.com.br`
4. Configure os registros DNS conforme instruído

### 2.2 Registros DNS Necessários

Adicione estes registros no seu provedor de DNS:

**SPF (TXT):**
```
v=spf1 include:_spf.resend.com ~all
```

**DKIM (TXT):**
```
(Copiar valor fornecido pelo Resend)
```

**DMARC (TXT):**
```
v=DMARC1; p=none; rua=mailto:dmarc@ffpadvogados.com.br
```

### 2.3 Verificar Domínio

1. Aguarde propagação DNS (pode levar até 48h)
2. Clique em **Verify** no painel do Resend
3. Status deve mudar para ✅ **Verified**

## 3. Testar Sistema

### 3.1 Teste de Reset de Senha

1. Acesse a landing page do sistema
2. Clique em "Esqueci a Senha"
3. Digite um email cadastrado
4. Verifique se recebeu o email via Resend

### 3.2 Verificar Logs

**Logs da Edge Function:**
```
https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/functions/auth-email/logs
```

**Dashboard Resend:**
```
https://resend.com/emails
```

## 4. Tipos de Email Configurados

### 🔐 Password Recovery
- **Trigger:** Usuário clica em "Esqueci a Senha"
- **Template:** Email com botão de redefinição de senha
- **Validade:** Link válido por 1 hora

### ✉️ Email Confirmation
- **Trigger:** Novo usuário se cadastra
- **Template:** Email de boas-vindas com confirmação
- **Ação:** Ativa a conta do usuário

### 📧 Email Change
- **Trigger:** Usuário altera email no perfil
- **Template:** Confirmação do novo email
- **Segurança:** Requer confirmação em ambos os emails

### ✨ Magic Link
- **Trigger:** Login sem senha (se habilitado)
- **Template:** Link de acesso direto
- **Validade:** Link de uso único

## 5. Personalização dos Templates

Os templates estão em `supabase/functions/auth-email/index.ts`:

```typescript
const getEmailTemplate = (type: string, data: AuthEmailData) => {
  // Edite aqui para personalizar cada tipo de email
}
```

### Elementos personalizáveis:
- ✏️ Cores e estilos CSS
- 📝 Textos e mensagens
- 🎨 Logo e branding
- 🔗 URLs de redirecionamento

## 6. Troubleshooting

### Email não chega

1. **Verificar logs da edge function**
   - Acessar logs e procurar por erros
   - Verificar se a função foi invocada

2. **Verificar domínio no Resend**
   - Status deve estar "Verified"
   - DNS configurado corretamente

3. **Verificar API Key**
   - Confirmar que `RESEND_API_KEY` está configurada
   - Testar com outro email

### Link de reset não funciona

1. **Verificar URL de redirecionamento**
   - Deve apontar para `/redefinir-senha`
   - Configurado em Auth > URL Configuration

2. **Verificar expiração**
   - Links são válidos por 1 hora
   - Solicitar novo link se expirado

### Emails vão para spam

1. **Configurar SPF/DKIM/DMARC**
   - Todos devem estar configurados
   - Aguardar reputação do domínio melhorar

2. **Melhorar conteúdo do email**
   - Evitar palavras spam
   - Incluir link de unsubscribe

## 7. Monitoramento

### Métricas Importantes

**No Resend Dashboard:**
- Taxa de entrega
- Taxa de abertura  
- Bounces e reclamações

**Nos Logs Supabase:**
- Erros de envio
- Tempo de resposta
- Volume de emails

## 8. URLs Importantes

- 🔧 Configuração Auth: https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/auth/url-configuration
- 📧 Resend Dashboard: https://resend.com/emails
- 📊 Logs Edge Function: https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/functions/auth-email/logs
- 🌐 Domínios Resend: https://resend.com/domains

## 9. Segurança

⚠️ **Importante:**
- Nunca compartilhe a `RESEND_API_KEY`
- Monitore logs para detectar abuso
- Configure rate limiting se necessário
- Mantenha templates atualizados

## 10. Próximos Passos

- [ ] Configurar domínio personalizado
- [ ] Adicionar logo da empresa nos emails
- [ ] Configurar notificações de bounces
- [ ] Implementar tracking de aberturas (opcional)
- [ ] A/B testing de templates (opcional)
