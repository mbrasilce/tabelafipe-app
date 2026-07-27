# tabelafipe.site — starter

## Estrutura

```
api/
  fipe-lookup.js     -> cache Supabase + fallback entre fontes
  lib/sources.js      -> adapters de cada fonte externa (Parallelum, fipeapi, fipe.online)
supabase/
  schema.sql          -> tabelas: veiculos_cache, buscas_log, fontes_quota
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

## Pendências conhecidas

- `fipeapiBuscarValor` e `fipeOnlineBuscarValor` em `api/lib/sources.js` ainda
  são só o esqueleto — precisam de token de cada serviço (cadastro gratuito).
- O frontend (chat) ainda não foi criado — é o próximo passo.
- Domínio `tabelafipe.site` ainda precisa apontar para a Vercel (nameservers
  ou registro A/CNAME, dependendo de onde está registrado).
