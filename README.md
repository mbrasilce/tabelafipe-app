# tabelafipe.site — starter

## Estrutura

```
api/
  fipe-lookup.js       -> cache Supabase + fallback entre fontes
  fipe-options.js      -> catálogo (marcas/modelos/anos) via Parallelum
  lib/sources.js       -> adapters de cada fonte externa (Parallelum, fipeapi, fipe.online)
supabase/
  schema.sql                     -> tabelas: veiculos_cache, buscas_log, fontes_quota, anuncios (+ view anuncios_publicos)
  functions/gerar-anuncio/       -> Edge Function: gera o texto do anúncio via Gemini e publica em anuncios
index.html            -> página inicial: escolher entre Consultar e Ver anúncios
consultar.html        -> chat guiado (pesquisa de preço + fluxo de venda)
anuncio.html           -> mostra o texto gerado do SEU anúncio (espaço p/ Google Ads futuramente)
anuncios.html          -> listagem pública de anúncios (lê a view anuncios_publicos)
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
email (instrução explícita no prompt). Na listagem pública, o contato
aparece só como um botão "Falar no WhatsApp" (`wa.me/...`), montado a partir
do telefone; o email nunca é exposto publicamente — ele só fica salvo na
tabela `anuncios`, que tem RLS ativo e nenhuma policy pra `anon`/`authenticated`
(só a Edge Function, com a service role, lê/escreve nela). A página pública
lê de uma view (`anuncios_publicos`) que expõe apenas os campos não
sensíveis + o link do WhatsApp.

1. **Deploy da function**:
   ```bash
   supabase link --project-ref SEU-PROJETO
   supabase secrets set GEMINI_API_KEY=sua-chave-da-generative-language-api
   supabase functions deploy gerar-anuncio
   ```
2. **Frontend**: em `anuncio.html` e `anuncios.html`, preencher `SUPABASE_URL`
   e `SUPABASE_ANON_KEY` (Project Settings > API — a chave anon é pública por
   design, quem fica secreta é a `GEMINI_API_KEY`, usada só dentro da function).

## Pendências conhecidas

- `fipeapiBuscarValor` e `fipeOnlineBuscarValor` em `api/lib/sources.js` ainda
  são só o esqueleto — precisam de token de cada serviço (cadastro gratuito).
- Fluxo de "quero comprar" ainda é só um placeholder no chat.
- `anuncio.html` ainda não tem o slot do Google Ads implementado (só o espaço
  reservado), fica pro próximo passo.
- A view `anuncios_publicos` usa `SECURITY DEFINER` (necessário pra ler
  através da tabela `anuncios`, protegida por RLS, sem expor telefone/email) —
  o linter de segurança do Supabase acusa isso como ERROR por padrão; é uma
  escolha deliberada aqui, não um descuido, mas vale revisar se o modelo de
  dados mudar.
- `veiculos_cache`, `buscas_log` e `fontes_quota` ainda estão sem RLS (só a
  service_role acessa hoje, via Vercel, então não é crítico, mas fica pendente
  de decisão).
- Domínio `tabelafipe.site` ainda precisa apontar para a Vercel (nameservers
  ou registro A/CNAME, dependendo de onde está registrado).
