# 📧 Configuração do Webhook Resend

## 🎯 Objetivo
Este guia mostra como configurar o webhook do Resend para receber notificações em tempo real sobre os emails enviados (entregues, abertos, clicados, etc.).

---

## 📋 Pré-requisitos

✅ Conta no Resend com domínio verificado (`ffpadvogados.com.br`)
✅ Edge function `resend-webhook` já implementada e deployada

---

## 🔧 Passo a Passo

### 1. Acessar o Painel do Resend

1. Faça login em: https://resend.com/webhooks
2. Clique em **"Add Webhook"**

---

### 2. Configurar a URL do Webhook

**URL do Webhook:**
```
https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/resend-webhook
```

📌 **Importante:** Esta URL é pública e não requer autenticação JWT.

---

### 3. Selecionar Eventos

Marque os seguintes eventos para receber notificações:

#### ✅ Eventos Obrigatórios:
- [x] `email.sent` - Quando o email é enviado
- [x] `email.delivered` - Quando o email é entregue
- [x] `email.delivery_delayed` - Quando a entrega está atrasada
- [x] `email.bounced` - Quando o email retorna (bounce)
- [x] `email.complained` - Quando marcado como spam
- [x] `email.opened` - Quando o usuário abre o email
- [x] `email.clicked` - Quando o usuário clica em um link

---

### 4. Copiar o Signing Secret

Após criar o webhook, o Resend vai fornecer um **Signing Secret**.

**Exemplo:**
```
whsec_abc123def456...
```

📌 **Guarde este valor!** Você vai precisar dele no próximo passo.

---

### 5. Adicionar o Secret no Supabase

⚠️ **IMPORTANTE:** O Signing Secret NÃO deve ser compartilhado ou commitado no código!

Para adicionar o secret de forma segura:

1. Acesse: https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/settings/functions
2. Na seção **"Secrets"**, clique em **"Add new secret"**
3. Preencha:
   - **Name:** `RESEND_WEBHOOK_SECRET`
   - **Value:** Cole o Signing Secret copiado do Resend
4. Clique em **"Save"**

---

### 6. Testar o Webhook

Para testar se o webhook está funcionando:

1. **Envie um convite de teste:**
   - Vá para: `/portal/corporativo/usuarios`
   - Clique em **"Convidar Usuário"**
   - Preencha com um email de teste
   - Clique em **"Enviar Convite"**

2. **Verifique os logs:**
   - Acesse: https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/functions/resend-webhook/logs
   - Procure por: `"Webhook recebido do Resend"`
   - Se aparecer, o webhook está funcionando! ✅

3. **Verifique o tracking:**
   - Volte para `/portal/corporativo/usuarios`
   - Clique na aba **"Convites"**
   - Clique em **"Detalhes"** do convite enviado
   - Você deve ver a timeline com os eventos recebidos

---

## 🔍 O que Acontece no Webhook?

Quando um evento ocorre no Resend (ex: email aberto), o webhook:

1. ✅ Recebe a notificação do Resend
2. ✅ Valida o evento
3. ✅ Busca o convite pelo `email_id`
4. ✅ Atualiza os timestamps:
   - `sent_at`
   - `delivered_at`
   - `opened_at`
   - `clicked_at`
   - `bounced_at`
   - `complained_at`
5. ✅ Registra o evento completo em `tracking_events`
6. ✅ Cria log no `system_logs`

---

## 📊 Dados Rastreados

### Timestamps Registrados:
| Campo | Descrição |
|-------|-----------|
| `sent_at` | Quando o email foi enviado pelo Resend |
| `delivered_at` | Quando chegou na caixa de entrada |
| `opened_at` | Primeira vez que o email foi aberto |
| `clicked_at` | Primeira vez que clicaram em um link |
| `bounced_at` | Se o email retornou (erro) |
| `complained_at` | Se foi marcado como spam |

### Eventos Armazenados:
Todos os eventos são salvos em `tracking_events` (JSONB) para análise futura.

---

## ⚠️ Troubleshooting

### O webhook não está recebendo eventos:

1. **Verifique a URL:**
   - URL deve ser exatamente: `https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/resend-webhook`
   - Sem `/` no final

2. **Verifique os logs do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/functions/resend-webhook/logs
   - Procure por erros

3. **Verifique os eventos selecionados:**
   - No painel do Resend, certifique-se que todos os eventos estão marcados

4. **Teste manualmente:**
   - No painel do Resend, use a opção **"Send Test Event"**
   - Verifique se aparece nos logs do Supabase

---

## 📈 Benefícios do Tracking

Com o webhook configurado, você terá:

✅ **Visibilidade total** do ciclo de vida dos emails
✅ **Métricas de engajamento** (taxa de abertura, tempo médio, etc.)
✅ **Detecção de problemas** (bounces, spam)
✅ **Timeline completa** de cada convite
✅ **Dados para otimização** (melhores horários, templates, etc.)

---

## 🔗 Links Úteis

- [Documentação de Webhooks do Resend](https://resend.com/docs/dashboard/webhooks/introduction)
- [Logs do Webhook](https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/functions/resend-webhook/logs)
- [Painel de Webhooks do Resend](https://resend.com/webhooks)
- [Dashboard de Emails do Resend](https://resend.com/emails)

---

## ✅ Checklist Final

- [ ] Webhook criado no painel do Resend
- [ ] URL configurada: `https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/resend-webhook`
- [ ] Todos os eventos selecionados
- [ ] Signing Secret adicionado como `RESEND_WEBHOOK_SECRET` no Supabase
- [ ] Teste enviado e funcionando
- [ ] Timeline aparecendo nos detalhes do convite

---

**🎉 Pronto!** Seu sistema de tracking de emails está completo e funcionando!
