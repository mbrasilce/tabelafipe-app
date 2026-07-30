// supabase/functions/atualizar-noticias/index.ts
// Busca RSS de sites de imprensa (carros/motos/caminhões), extrai os itens
// e grava/atualiza na tabela `noticias` (upsert por link, que é a chave de
// dedupe). Chamada periodicamente por um agendamento pg_cron+pg_net (ver
// supabase/schema.sql), mas também pode ser chamada manualmente via POST
// pra testar ou forçar uma atualização.
// Nunca guarda o texto completo do artigo — só título + resumo curto +
// link pra fonte original (evita risco de direitos autorais/duplicidade).

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FEEDS: { url: string; categoria: string; fonte: string; filtroTitulo?: RegExp }[] = [
  { url: "https://quatrorodas.abril.com.br/feed/", categoria: "carros", fonte: "Quatro Rodas" },
  { url: "https://motor1.uol.com.br/rss/articles/all/", categoria: "carros", fonte: "Motor1 Brasil" },
  { url: "https://motociclismoonline.com.br/feed/", categoria: "motos", fonte: "Motociclismo Online" },
  // AutoData cobre a indústria automotiva em geral (carros, ônibus, mercado)
  // — só aproveitamos os itens que falam de caminhão/caminhões pra essa categoria.
  { url: "https://www.autodata.com.br/feed/", categoria: "caminhoes", fonte: "AutoData", filtroTitulo: /caminh/i },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripCdata(s: string) {
  return s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(s: string) {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decodeEntities(stripCdata(m[1])) : null;
}

interface ItemFeed {
  titulo: string;
  link: string;
  publicado_em: string | null;
  resumo: string | null;
  imagem_url: string | null;
}

function parseFeed(xml: string): ItemFeed[] {
  const blocos = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  return blocos
    .slice(0, 30)
    .map((block) => {
      const titulo = tag(block, "title");
      const link = tag(block, "link");
      const pubDateRaw = tag(block, "pubDate");
      const resumoRaw = tag(block, "description");
      const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
      const dataParsed = pubDateRaw ? new Date(pubDateRaw) : null;
      return {
        titulo: titulo ?? "",
        link: link ?? "",
        publicado_em: dataParsed && !isNaN(dataParsed.getTime()) ? dataParsed.toISOString() : null,
        resumo: resumoRaw ? stripTags(resumoRaw).slice(0, 240) : null,
        imagem_url: enclosure ? enclosure[1] : null,
      };
    })
    .filter((it) => it.titulo && it.link);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const resultados: Record<string, unknown>[] = [];
  let totalUpserted = 0;

  for (const feed of FEEDS) {
    try {
      const resp = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; tabelafipe-bot/1.0; +https://tabelafipe.site)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (!resp.ok) {
        resultados.push({ url: feed.url, ok: false, erro: `HTTP ${resp.status}` });
        continue;
      }
      const xml = await resp.text();
      let itens = parseFeed(xml);
      if (feed.filtroTitulo) {
        itens = itens.filter((it) => feed.filtroTitulo!.test(it.titulo));
      }

      const linhas = itens.map((it) => ({
        categoria: feed.categoria,
        titulo: it.titulo,
        resumo: it.resumo,
        link: it.link,
        imagem_url: it.imagem_url,
        fonte: feed.fonte,
        publicado_em: it.publicado_em,
      }));

      if (!linhas.length) {
        resultados.push({ url: feed.url, ok: false, erro: "nenhum item extraído do XML", amostra: xml.slice(0, 200) });
        continue;
      }

      const { error } = await supabase.from("noticias").upsert(linhas, { onConflict: "link" });
      if (error) {
        resultados.push({ url: feed.url, ok: false, erro: error.message });
        continue;
      }

      totalUpserted += linhas.length;
      resultados.push({ url: feed.url, ok: true, itens: linhas.length });
    } catch (err) {
      // um feed fora do ar não derruba os outros
      resultados.push({ url: feed.url, ok: false, erro: String(err) });
    }
  }

  // limpeza: notícias antigas não precisam ficar acumulando pra sempre
  const cutoff = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString();
  const { count: apagadasComData } = await supabase
    .from("noticias")
    .delete({ count: "exact" })
    .lt("publicado_em", cutoff);
  const { count: apagadasSemData } = await supabase
    .from("noticias")
    .delete({ count: "exact" })
    .is("publicado_em", null)
    .lt("criado_em", cutoff);

  return jsonResponse({
    ok: true,
    totalUpserted,
    apagadas: (apagadasComData ?? 0) + (apagadasSemData ?? 0),
    resultados,
  });
});
