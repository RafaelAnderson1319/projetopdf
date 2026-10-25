# Pequenos Brincantes — atividades educativas

Loja de materiais educativos em PDF com vitrine, filtros, carrinho, checkout Stripe, painel administrativo e biblioteca permanente do cliente.

## Rodar localmente

Requer Node.js 20 ou superior. Na pasta do projeto, execute:

```bash
npm start
```

Abra `http://localhost:3000`. A área do cliente fica em `/account` e o painel administrativo em `/admin`.

A senha inicial do painel é criada na primeira execução e mostrada no terminal. Ela também fica em `private/admin.json`, que não deve ser enviado ao GitHub. Para definir outra senha, configure `WONDERLEARN_ADMIN_PASSWORD` antes de iniciar o servidor.

## Contas e biblioteca

O cliente cria uma conta com nome, e-mail e senha antes do pagamento. As senhas são protegidas com `scrypt` e salt individual. Cada pedido fica vinculado à conta autenticada, e os PDFs pagos aparecem em `/account` para novos downloads.

As contas, os pedidos, os produtos e os PDFs ficam em `private/`. Para usar outro volume persistente, defina `WONDERLEARN_DATA` com o caminho desejado. As sessões ficam em memória, portanto reiniciar o servidor exige um novo login.

## Stripe

Configure `STRIPE_SECRET_KEY` no servidor para habilitar o checkout. Use uma chave de teste durante a validação. Configure um webhook apontando para `https://SEU-DOMINIO/api/stripe/webhook`, defina `STRIPE_WEBHOOK_SECRET` e escute `checkout.session.completed` e `checkout.session.async_payment_succeeded`.

Para ativar os avisos de temas e as prévias de PDF, execute `supabase/theme_alerts.sql` e `supabase/material_previews.sql` no SQL Editor do projeto Supabase e configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env` do servidor. A chave `service_role` deve permanecer somente no servidor. O bucket `pdf-previews` guarda apenas imagens WebP com marca d'água; os PDFs originais permanecem em `private/pdfs/`. Sem as variáveis, o servidor mantém as prévias localmente e os avisos informam que o Supabase ainda não está configurado.

Defina `PUBLIC_BASE_URL` com a URL pública HTTPS usada nos retornos do Checkout. `HOST=0.0.0.0` e `PORT` permitem rodar em uma plataforma de hospedagem. Nunca coloque chaves secretas em arquivos públicos ou no código do navegador.

## Publicação na Vercel

O adaptador em `api/dispatch.js` encaminha as rotas do servidor Node para as Vercel Functions. Configure as variáveis no projeto Vercel antes de habilitar login Google e checkout: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_BASE_URL` e `WONDERLEARN_ADMIN_PASSWORD`. Cadastre a URL pública `/account` na allowlist de redirecionamentos do Supabase e configure o webhook da Stripe para `/api/stripe/webhook`.

As Vercel Functions têm disco temporário; os dados em `/tmp` não substituem banco ou armazenamento persistente. Este adaptador permite publicar a interface e atender rotas, mas produtos, PDFs, pedidos e contas precisam ser persistidos em Supabase antes de usar a loja como serviço de produção.

## Verificação

```bash
npm run check
npm test
```

Os testes cobrem cadastro, login, logout, isolamento entre bibliotecas e autorização dos downloads.
