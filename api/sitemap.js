// api/sitemap.js
// Sitemap XML dinâmico: páginas estáticas + todos os anúncios públicos +
// todos os veículos já pesquisados (páginas /preco-fipe/:id). Renderizado
// no servidor, mesmo padrão de embutir o XML como template string.
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = "https://tabelafipe.site";

function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function urlAnuncio(a) {
  const slug = slugify([a.marca, a.modelo, a.ano_modelo, a.cidade].filter(Boolean).join(" "));
  return `${SITE_URL}/anuncio/${a.id}${slug ? "-" + slug : ""}`;
}

function urlPrecoFipe(v) {
  const slug = slugify([v.marca, v.modelo, v.ano_modelo].filter(Boolean).join(" "));
  return `${SITE_URL}/preco-fipe/${v.id}${slug ? "-" + slug : ""}`;
}

module.exports = async (req, res) => {
  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${SITE_URL}/consultar.html`, changefreq: "weekly", priority: "0.8" },
    { loc: `${SITE_URL}/anuncios.html`, changefreq: "daily", priority: "0.8" },
    { loc: `${SITE_URL}/noticias.html`, changefreq: "hourly", priority: "0.7" },
  ];

  const { data: anuncios } = await supabase
    .from("anuncios_publicos")
    .select("id, marca, modelo, ano_modelo, cidade, criado_em")
    .order("criado_em", { ascending: false })
    .limit(500);

  const { data: veiculos } = await supabase
    .from("veiculos_cache")
    .select("id, marca, modelo, ano_modelo, atualizado_em")
    .order("atualizado_em", { ascending: false })
    .limit(500);

  const urls = [
    ...staticUrls.map((u) => ({ loc: u.loc, lastmod: null, changefreq: u.changefreq, priority: u.priority })),
    ...(anuncios || []).map((a) => ({ loc: urlAnuncio(a), lastmod: a.criado_em, changefreq: "weekly", priority: "0.6" })),
    ...(veiculos || []).map((v) => ({ loc: urlPrecoFipe(v), lastmod: v.atualizado_em, changefreq: "monthly", priority: "0.5" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
};
