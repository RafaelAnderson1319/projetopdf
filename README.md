# Pequenos Brincantes — atividades educativas

Loja de materiais educativos em PDF com vitrine, filtros, carrinho, checkout Stripe, painel administrativo e biblioteca permanente do cliente.

## Rodar localmente

Requer Node.js 20 ou superior. Na pasta do projeto, execute:

```bash
npm start
```

Abra `http://localhost:3000`. A área do cliente fica em `/account` e o painel administrativo em `/dashboard`.

A senha inicial do painel é criada na primeira execução e mostrada no terminal. Ela também fica em `private/dashboard.json`, que não deve ser enviado ao GitHub. Para definir outra senha, configure `WONDERLEARN_ADMIN_PASSWORD (somente desenvolvimento local)` antes de iniciar o servidor.

## Contas e biblioteca

O cliente cria uma conta com nome, e-mail e senha antes do pagamento. As senhas são protegidas com `scrypt` e salt individual. Cada pedido fica vinculado à conta autenticada, e os PDFs pagos aparecem em `/account` para novos downloads.

Com Supabase configurado, contas usam Supabase Auth; produtos, pedidos, direitos de acesso e sessões ficam no banco; os PDFs originais ficam no bucket privado `pdfs`. Cada download verifica a sessão e a compra do cliente. Sem Supabase, apenas o modo de desenvolvimento local usa `private/` e sessões em memória. Contas locais não são migradas automaticamente para Supabase Auth.

## Stripe

Configure `STRIPE_SECRET_KEY` no servidor para habilitar o checkout. Use uma chave de teste durante a validação. Configure um webhook apontando para `https://SEU-DOMINIO/api/stripe/webhook`, defina `STRIPE_WEBHOOK_SECRET` e escute `checkout.session.completed` e `checkout.session.async_payment_succeeded`.

Para ativar os avisos de temas e as prévias de PDF, execute `supabase/theme_alerts.sql` e `supabase/material_previews.sql` no SQL Editor do projeto Supabase e configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env` do servidor. A chave `service_role` deve permanecer somente no servidor. O bucket `pdf-previews` guarda apenas imagens WebP com marca d'água; os PDFs originais ficam no bucket privado `pdfs` quando a integração Supabase está configurada. Sem as variáveis, o servidor mantém as prévias localmente e os avisos informam que o Supabase ainda não está configurado.

Defina `PUBLIC_BASE_URL` com a URL pública HTTPS usada nos retornos do Checkout. `HOST=0.0.0.0` e `PORT` permitem rodar em uma plataforma de hospedagem. Nunca coloque chaves secretas em arquivos públicos ou no código do navegador.

## Publicação na Vercel

O adaptador em `api/dispatch.js` encaminha as rotas do servidor Node para as Vercel Functions. Configure as variáveis no projeto Vercel antes de habilitar login Google e checkout: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_BASE_URL` e `WONDERLEARN_ADMIN_PASSWORD (somente desenvolvimento local)`. Cadastre a URL pública `/account` na allowlist de redirecionamentos do Supabase e configure o webhook da Stripe para `/api/stripe/webhook`.

As Vercel Functions têm disco temporário; os dados em `/tmp` não substituem banco ou armazenamento persistente. A integração em `cloud-store.cjs` persiste produtos, pedidos, contas e arquivos no Supabase. As APIs da Vercel ficam indisponíveis se faltar a configuração Supabase. Veja [DEPLOYMENT.md](DEPLOYMENT.md) para as variáveis, autenticação e webhook. O schema adicional aplicado no banco está em `supabase/store_library.sql`; esse arquivo depende das tabelas products, profiles e purchases já existentes no projeto.

## Verificação

```bash
npm run check
npm test
```

Os testes cobrem cadastro, login, logout, sessões entre instâncias, isolamento da biblioteca, autorização de downloads, produtos arquivados, preços do servidor e rejeição de webhooks inválidos. Os testes HTTP da integração usam respostas Supabase simuladas; `supabase/verify_library.sql` verifica pagamentos, carrinhos e RLS no banco real com rollback. A validação Stripe ponta a ponta exige chaves de teste e deploy configurado.

A dashboard publicada usa somente a conta Google verificada faelanderson03@gmail.com. O login por senha compartilhada foi desativado na integração Supabase. As páginas e scripts administrativos antigos não são publicados.
