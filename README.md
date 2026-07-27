# tabelafipe.site — starter

## Estrutura

```
api/
  fipe-lookup.js       -> cache Supabase + fallback entre fontes
  fipe-options.js      -> catálogo (marcas/modelos/anos) via Parallelum
  lib/sources.js       -> adapters de cada fonte externa (Parallelum, fipeapi, fipe.online)
supabase/
  schema.sql                     -> tabelas: veiculos_cache, buscas_log, fontes_quota
  functions/gerar-anuncio/       -> Edge Function: gera o texto do anúncio via Gemini
index.html            -> chat guiado (pesquisa de preço + fluxo de venda)
anuncio.html          -> página separada que mostra o texto gerado (espaço p/ Google Ads futuramente)
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

Ao final da pesquisa de preço, o chat pergunta se o usuário quer vender ou
comprar. Se escolher vender e aceitar gerar o anúncio, coleta nome, telefone,
cor, quilometragem, estado dos pneus/estofados e observações, salva tudo em
`sessionStorage` e redireciona para `anuncio.html`, que chama a Edge Function
`gerar-anuncio` para produzir o texto com o Gemini.

1. **Deploy da function**:
   ```bash
   supabase link --project-ref SEU-PROJETO
   supabase secrets set GEMINI_API_KEY=sua-chave-da-generative-language-api
   supabase functions deploy gerar-anuncio
   ```
2. **Frontend**: em `anuncio.html`, preencher `SUPABASE_URL` e
   `SUPABASE_ANON_KEY` (Project Settings > API — a chave anon é pública por
   design, quem fica secreta é a `GEMINI_API_KEY`, usada só dentro da function).

## Pendências conhecidas

- `fipeapiBuscarValor` e `fipeOnlineBuscarValor` em `api/lib/sources.js` ainda
  são só o esqueleto — precisam de token de cada serviço (cadastro gratuito).
- Fluxo de "quero comprar" ainda é só um placeholder no chat.
- `anuncio.html` ainda não tem o slot do Google Ads implementado (só o espaço
  reservado), fica pro próximo passo.
- Domínio `tabelafipe.site` ainda precisa apontar para a Vercel (nameservers
  ou registro A/CNAME, dependendo de onde está registrado).
