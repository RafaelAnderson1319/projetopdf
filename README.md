# WonderLearn — loja de PDFs educativos

Loja em português para materiais de Educação Infantil, Fundamental I e II, Ensino Médio, EJA e outros temas. O administrador publica PDFs com preço em `/admin`; a vitrine oferece busca, filtros e carrinho. O pagamento usa o Checkout hospedado da Stripe. O download só é liberado depois que a Stripe confirma o pagamento.

## Rodar localmente

Requer Node.js 20 ou superior. Na pasta do projeto, execute `npm start` e abra `http://localhost:3000`. A senha inicial da dashboard é gerada na primeira execução e mostrada no terminal. Também fica em `private/admin.json`, que não deve ser enviado ao GitHub. Para definir outra senha, configure `WONDERLEARN_ADMIN_PASSWORD` no ambiente antes de iniciar o servidor.

## Stripe

Configure `STRIPE_SECRET_KEY` no servidor para habilitar o checkout. Use uma chave de teste para validar o fluxo antes de usar uma chave real. Para receber confirmação automática de pagamento, configure um webhook da Stripe apontando para `https://SEU-DOMINIO/api/stripe/webhook`, ou para o endereço público de desenvolvimento, e defina `STRIPE_WEBHOOK_SECRET`. Escute `checkout.session.completed` e `checkout.session.async_payment_succeeded`. A página de retorno também consulta a sessão diretamente na Stripe para atualizar o pedido quando o cliente volta à loja.

Defina `PUBLIC_BASE_URL` com a URL pública HTTPS usada nos retornos do Checkout. `HOST=0.0.0.0` e `PORT` permitem rodar em uma plataforma de hospedagem. Não coloque chaves secretas em arquivos públicos ou no código do navegador.

## Dados e operação

Produtos, pedidos, a senha inicial e PDFs ficam em `private/`, criado automaticamente na primeira execução. Essa pasta está ignorada pelo Git. Use armazenamento persistente e backup ao hospedar a loja. A senha e as sessões atuais são adequadas ao protótipo local; para uma operação pública, é necessário reforçar autenticação, monitoramento, proteção contra abuso e tratamento de dados dos compradores.

Produtos retirados da vitrine ficam arquivados para manter os downloads de compras anteriores. Sem `STRIPE_SECRET_KEY`, o carrinho pode ser testado, mas o botão de pagamento permanece desativado.

