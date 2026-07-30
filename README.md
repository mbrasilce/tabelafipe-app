# tabelafipe.site — starter

## Estrutura

```
api/
  index.js             -> renderiza a home no servidor (não é estático — ver seção própria)
  fipe-lookup.js       -> cache Supabase + fallback entre fontes
  fipe-options.js      -> catálogo (marcas/modelos/anos) via Parallelum
  lib/sources.js       -> adapters de cada fonte externa (Parallelum, fipeapi, fipe.online)
supabase/
  schema.sql                        -> tabelas: veiculos_cache, buscas_log, fontes_quota,
                                        anuncios, interessados (+ view anuncios_publicos)
  functions/gerar-anuncio/          -> Edge Function: gera o texto via Gemini, publica em
                                        anuncios e convida o vendedor (Supabase Auth)
  functions/solicitar-contato/      -> Edge Function: registra o interessado e manda os
                                        emails (Resend) — pro interessado e pro vendedor
consultar.html         -> chat guiado (pesquisa de preço + fluxo de venda)
anuncio.html           -> mostra o texto gerado do SEU anúncio (espaço p/ Google Ads futuramente)
anuncios.html          -> listagem pública de anúncios (lê a view anuncios_publicos)
vendedor-login.html    -> login do vendedor (email/senha) + recuperar senha
definir-senha.html     -> landing dos links de convite/recuperação do Supabase Auth
vendedor.html          -> painel do vendedor: CRUD do próprio anúncio + lista de interessados
vercel.json
package.json
```

## Passo a passo

1. **Supabase**: criar projeto, rodar `supabase/schema.sql` no SQL Editor.
   Copiar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

2. **GitHub**: criar repositório, subir este conteúdo:
   ```bash
   git init
   git add .
   git commit -m "scaffold inicial"
   git branch -M main
   git remote add origin <url-do-seu-repo>
   git push -u origin main
   ```

3. **Vercel**: importar o repositório, adicionar variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (depois) `RESEND_API_KEY`
   - (depois) `CALLMEBOT_API_KEY` / número configurado

4. **Testar o endpoint** (depois do deploy):
   ```bash
   curl -X POST https://SEU-PROJETO.vercel.app/api/fipe-lookup \
     -H "Content-Type: application/json" \
     -d '{"tipo":"carros","marca":"VW - VolksWagen","modelo":"Gol","anoModelo":2020}'
   ```

## Anúncio de venda (Gemini + Edge Function)

Ao final da pesquisa de preço, o chat (`consultar.html`) pergunta se o
usuário quer vender ou comprar. Se escolher vender e aceitar gerar o
anúncio, o texto é adaptado ao tipo de veículo (carro/moto/caminhão) e o
chat coleta, nessa ordem: valor desejado, estado, cidade, telefone/WhatsApp,
email, cor, quilometragem, estado dos pneus e dos estofados (3 opções cada),
e por fim pergunta se o usuário quer **publicar** o anúncio na página
pública. Os dados vão pro `sessionStorage` e o usuário é redirecionado pra
`anuncio.html`, que chama a Edge Function `gerar-anuncio` pra gerar o texto
com o Gemini — se `publicar` for true, ela também grava o anúncio na tabela
`anuncios`, que alimenta a listagem pública em `anuncios.html`.

**Privacidade do contato**: o texto gerado pela IA nunca inclui telefone ou
email (instrução explícita no prompt). O contato do vendedor **não é mais
exposto na página pública** de jeito nenhum (nem como link de WhatsApp) — o
interessado usa o botão "Entrar em contato" em `anuncios.html`, informa
nome/email/telefone, e a Edge Function `solicitar-contato` manda o contato
do vendedor por email pra ele, além de registrar o lead em `interessados` e
avisar o vendedor por email. Telefone/email do vendedor só existem na tabela
base `anuncios`/`interessados`, protegidas por RLS sem policy pra
`anon`/`authenticated` — só a service_role (dentro das Edge Functions) lê. A
página pública lê de uma view (`anuncios_publicos`) que nem sequer inclui
essas colunas.

1. **Deploy das functions**:
   ```bash
   supabase link --project-ref SEU-PROJETO
   supabase secrets set GEMINI_API_KEY=sua-chave-da-generative-language-api
   supabase secrets set RESEND_API_KEY=sua-chave-do-resend
   supabase functions deploy gerar-anuncio
   supabase functions deploy solicitar-contato
   ```
2. **Frontend**: em `anuncio.html`, `anuncios.html`, `vendedor-login.html`,
   `definir-senha.html` e `vendedor.html`, preencher `SUPABASE_URL` e
   `SUPABASE_ANON_KEY` (Project Settings > API — a chave anon é pública por
   design; o que fica secreto são `GEMINI_API_KEY` e `RESEND_API_KEY`, usadas
   só dentro das functions).

## Home renderizada no servidor (SEO)

`index.html` não existe como arquivo estático — a home é a Edge Function
`api/index.js` (Node, roda no servidor a cada request), com o HTML embutido
no próprio arquivo (não lido de outro `.html`, pra não depender do bundler
da Vercel incluir um arquivo extra — isso já causou um deploy travado, ver
histórico do commit). O `vercel.json` tem `rewrites` mapeando `/` e
`/index.html` pra `/api/index`.

O motivo de ser server-rendered: a home mostra um marquee com as duas
últimas pesquisas feitas no site ("Pesquisaram: ..."), puxando de
`buscas_log` (só marca/modelo/ano, nunca o IP). Pra isso valer alguma coisa
pra SEO, o texto precisa estar no HTML que o crawler recebe na primeira
resposta — buscar via `fetch()` no navegador depois do carregamento não
conta (Google trata como sinal fraco, outros crawlers nem executam JS).
Resposta tem `Cache-Control: public, max-age=60, stale-while-revalidate=300`
pra não bater no Supabase a cada request. Se a consulta falhar ou não
houver pesquisas ainda, o marquee simplesmente não aparece — nunca quebra a
home.

## Google Analytics e Google AdSense

O tag do GA4 (`gtag.js`, `G-1QS16BMJ91`) e o loader do AdSense
(`ca-pub-9655532802163165`) estão no `<head>` de toda página — inclusive
`api/index.js` — o mais alto possível, conforme os guias oficiais de cada
um. Tem também um `ads.txt` na raiz com a entrada padrão do Google. O
AdSense roda em modo Auto ads e também tem uma unidade manual in-article
(`data-ad-slot="1896219339"`) aplicada nas páginas de conteúdo público (home,
`anuncio.js`, `anuncios.js`, `anuncio.html`, `preco-fipe.js`, `noticias.js`) —
não em `consultar.html` (widget de chat) nem nas páginas do painel do
vendedor (área privada).

## Painel do vendedor (Supabase Auth)

Quando o vendedor publica um anúncio, `gerar-anuncio` convida o email dele
via `supabase.auth.admin.inviteUserByEmail` (cria a conta e manda um email
com link de "criar senha" — nunca uma senha pronta em texto puro). O link
cai em `definir-senha.html`, que usa o `supabase-js` no navegador pra
capturar a sessão do link e definir a senha; dali em diante o vendedor entra
por `vendedor-login.html` (com "esqueci minha senha" via
`resetPasswordForEmail`).

O painel (`vendedor.html`) não tem nenhum endpoint CRUD customizado — ele
fala direto com o Postgres via `supabase-js` + RLS (`auth.uid() = anuncios.user_id`),
então o vendedor só enxerga/edita/exclui os próprios anúncios e só vê os
interessados dos próprios anúncios.

**Expiração automática (30 dias), sem cron**: a view `anuncios_publicos`
filtra `status = 'ativo' and publicado_em > now() - interval '30 days'`.
Reativar um anúncio no painel só atualiza `publicado_em = now()`, resetando
o prazo — não existe job agendado nem coluna calculada manualmente.

**Pré-requisitos que só você pode configurar** (fora do meu alcance):
- Conta no [Resend](https://resend.com) + domínio de envio verificado (ou
  usar o remetente de teste deles no começo), pra `RESEND_API_KEY`.
- No dashboard do Supabase → Authentication → URL Configuration → Redirect
  URLs: adicionar a URL de produção de `definir-senha.html` (ex:
  `https://tabelafipe.site/definir-senha.html`) — sem isso, o Supabase
  rejeita o redirect dos links de convite/recuperação.

## Pendências conhecidas

- `fipeapiBuscarValor` e `fipeOnlineBuscarValor` em `api/lib/sources.js` ainda
  são só o esqueleto — precisam de token de cada serviço (cadastro gratuito).
- Fluxo de "quero comprar" ainda é só um placeholder no chat.
- `anuncio.html` ainda não tem o slot do Google Ads implementado (só o espaço
  reservado), fica pro próximo passo.
- `SITE_URL` está hardcoded como a URL da Vercel (`gerar-anuncio` e
  `solicitar-contato`) — trocar pra `https://tabelafipe.site` quando o
  domínio propagar de vez.
- `garantirContaVendedor` em `gerar-anuncio` busca o usuário existente via
  `auth.admin.listUsers({ perPage: 1000 })` — funciona bem na escala atual,
  mas não escala indefinidamente; se a base de vendedores crescer muito,
  vale revisar pra uma busca mais direta por email.
- Sem limite de taxa (rate limit) no "Entrar em contato" — alguém poderia
  espremer o formulário pra gerar spam de email; não é crítico agora, mas é
  candidato a hardening futuro.
- Cuidado com `"includeFiles"` no `vercel.json`: usar isso pra empacotar um
  `.html` externo junto de uma function (`api/index.js`) travou o build da
  Vercel indefinidamente (status `UNKNOWN`, nunca terminava). A solução foi
  embutir o HTML como string direto no `.js` em vez de ler de arquivo — se
  for mexer em `api/index.js`, mantenha assim.
- A view `anuncios_publicos` usa `SECURITY DEFINER` (necessário pra ler
  através da tabela `anuncios`, protegida por RLS, sem expor telefone/email) —
  o linter de segurança do Supabase acusa isso como ERROR por padrão; é uma
  escolha deliberada aqui, não um descuido, mas vale revisar se o modelo de
  dados mudar.
- `veiculos_cache`, `buscas_log` e `fontes_quota` ainda estão sem RLS (só a
  service_role acessa hoje, via Vercel, então não é crítico, mas fica pendente
  de decisão).
- Domínio `tabelafipe.site` configurado via registro A na GoDaddy
  (`@` → `216.198.79.1`, `www` → CNAME pro próprio domínio) — já validado
  com certificado ativo na Vercel.
