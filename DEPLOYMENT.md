# Ativar a loja e a biblioteca

O código foi atualizado neste chat, mas ainda precisa ser publicado. O banco Supabase Pequenos Brincantes já recebeu as tabelas e a função de confirmação de compras.

## Variáveis na Vercel

Em Settings → Environment Variables do projeto pequenosbrincantes, configure:

| Variável | Valor |
| --- | --- |
| SUPABASE_URL | https://vfivcxxxuelexpkintiq.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | sb_publishable_Jb3jpTc_7ctuCX018_emjA_mp0qhceE |
| SUPABASE_SECRET_KEY | Chave secreta em Supabase → Project Settings → API Keys |
| PUBLIC_BASE_URL | https://pequenosbrincantes.vercel.app |
| WONDERLEARN_ADMIN_PASSWORD (somente desenvolvimento local) | Senha forte para o painel |
| STRIPE_SECRET_KEY | Chave secreta de teste da Stripe durante a validação |
| STRIPE_WEBHOOK_SECRET | Segredo de assinatura do webhook, iniciado por whsec_ |

A chave legada service_role também é aceita em SUPABASE_SERVICE_ROLE_KEY, no lugar de SUPABASE_SECRET_KEY. Segredos ficam apenas nas variáveis do servidor, sem prefixos públicos. Não envie segredos ao chat ou ao GitHub.

## Supabase Auth

Em Authentication → URL Configuration, configure Site URL e Redirect URLs com:

https://pequenosbrincantes.vercel.app/account

Mantenha o provedor e-mail habilitado. Se a confirmação estiver ativa, o cliente deve confirmar o e-mail antes do login. Configure SMTP próprio para enviar e-mails a clientes em produção.

Para Google, ative o provedor e informe suas credenciais OAuth. No Google Cloud, o callback autorizado é:

https://vfivcxxxuelexpkintiq.supabase.co/auth/v1/callback

Para desenvolvimento, adicione http://localhost:3000/account às URLs permitidas e use PUBLIC_BASE_URL=http://localhost:3000 no ambiente local.

## Stripe e publicação

Cadastre na Stripe um webhook para https://pequenosbrincantes.vercel.app/api/stripe/webhook com os eventos checkout.session.completed e checkout.session.async_payment_succeeded. Use o segredo do mesmo ambiente das chaves.

Publique o código atualizado depois de salvar as variáveis. Deployments antigos não recebem as novas variáveis automaticamente.

Teste uma compra em modo de teste: cadastre um PDF em /painel_admin, crie uma conta, compre, confira a entrega do webhook e baixe em /account. Saia e entre novamente para conferir a persistência. Outra conta deve permanecer sem acesso ao arquivo.

Os testes locais e SQL passaram; pagamento Stripe, e-mail, Google e deploy ainda precisam de validação com essas configurações.

O upload usa uma Vercel Function e está sujeito ao limite de corpo de requisição da plataforma. PDFs maiores exigem um fluxo de upload direto autorizado; o limite local de 30 MB não altera o limite da Vercel.

A dashboard publicada usa somente a conta Google verificada faelanderson03@gmail.com. O login por senha compartilhada foi desativado na integração Supabase. As páginas e scripts administrativos antigos não são publicados.
