// api/noticias.js
// Listagem pública de notícias de carros/motos/caminhões (RSS de sites de
// imprensa, coletadas pela Edge Function atualizar-noticias), renderizada
// no servidor pelo mesmo motivo de anuncios.js — conteúdo indexável, sem
// depender de fetch no navegador. Nunca mostra o texto completo do artigo,
// só título + resumo curto + link pra fonte original.
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORIA_LABEL = { carros: "🚗 Carros", motos: "🏍️ Motos", caminhoes: "🚚 Caminhões" };

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function montarCard(n) {
  const data = n.publicado_em ? new Date(n.publicado_em).toLocaleDateString("pt-BR") : "";
  return `<div class="card">
    ${n.imagem_url ? `<img class="card-img" src="${escapeHtml(n.imagem_url)}" alt="" loading="lazy">` : ""}
    <div class="card-title"><a href="${escapeHtml(n.link)}" target="_blank" rel="noopener">${escapeHtml(n.titulo)}</a></div>
    ${n.resumo ? `<div class="card-resumo">${escapeHtml(n.resumo)}</div>` : ""}
    <div class="card-meta">${escapeHtml(n.fonte)}${data ? ` · ${data}` : ""}</div>
  </div>`;
}

module.exports = async (req, res) => {
  const categoriaValida = ["carros", "motos", "caminhoes"];
  const categoria = categoriaValida.includes(req.query.categoria) ? req.query.categoria : "";

  let query = supabase.from("noticias").select("*").order("publicado_em", { ascending: false, nullsFirst: false }).limit(60);
  if (categoria) query = query.eq("categoria", categoria);
  const { data, error } = await query;
  const lista = data || [];

  const conteudoHtml = error
    ? `<div class="vazio">😕 Não consegui carregar as notícias agora. Tenta recarregar a página.</div>`
    : lista.length
      ? `<div class="grid">${lista.map(montarCard).join("")}</div>`
      : `<div class="vazio">Ainda não há notícias por aqui. Volte em breve! 🚀</div>`;

  const filtro = (valor, label) => {
    const href = valor ? `/noticias.html?categoria=${valor}` : `/noticias.html`;
    const ativo = categoria === valor ? " ativo" : "";
    return `<a class="filtro-btn${ativo}" href="${href}">${label}</a>`;
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>(function(){var v=localStorage.getItem('tf_zoom');if(v)document.documentElement.style.zoom=v+'%';})();</script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1QS16BMJ91"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-1QS16BMJ91');
</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9655532802163165"
     crossorigin="anonymous"></script>
<link rel="icon" href="/favicon/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-icon-180x180.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#33A9F4">
<link rel="canonical" href="https://tabelafipe.site/noticias.html${categoria ? "?categoria=" + categoria : ""}">
<meta name="description" content="Últimas notícias sobre carros, motos e caminhões, direto dos principais sites de imprensa automotiva.">
<title>Notícias sobre carros, motos e caminhões${categoria ? " — " + (CATEGORIA_LABEL[categoria] || categoria) : ""} | tabelafipe.site</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F2F4F7; --surface:#FFFFFF; --surface-2:#EAF1F7; --border:#D3DCE4;
    --blue:#33A9F4; --blue-2:#20A1FA; --text:#2D2D2D; --muted:#758A9C;
  }
  *{box-sizing:border-box;}
  html{height:100%;}
  body{
    margin:0; background:radial-gradient(circle at 50% 0%, #ffffff 0%, var(--bg) 60%);
    color:var(--text); font-family:'Inter',system-ui,sans-serif;
    min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:24px;
  }
  .page{width:100%; max-width:760px;}
  .topbar{display:flex; align-items:center; gap:12px; margin-bottom:18px;}
  .brand-logo{height:34px; width:auto; flex-shrink:0; display:block;}
  .topbar .name{font-family:'Oswald',sans-serif; font-weight:600; font-size:15px; letter-spacing:.3px;}
  .topbar .sub{font-size:12px; color:var(--muted);}
  .topbar-right{margin-left:auto; display:flex; gap:14px;}
  .topbar-right a{color:var(--muted); font-size:13px; text-decoration:none;}
  .topbar-right a:hover{color:var(--blue);}
  .filtros{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;}
  .filtro-btn{
    background:var(--surface-2); border:1px solid var(--border); color:var(--text);
    padding:7px 14px; border-radius:20px; font-size:13px; font-weight:500;
    cursor:pointer; font-family:'Inter',sans-serif; text-decoration:none; display:inline-block;
  }
  .filtro-btn:hover{border-color:var(--blue); color:var(--blue);}
  .filtro-btn.ativo{background:linear-gradient(135deg, var(--blue), var(--blue-2)); color:#ffffff; border:none; font-weight:600;}
  .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px;}
  .card{
    background:var(--surface); border:1px solid var(--border); border-radius:16px;
    padding:16px; display:flex; flex-direction:column; gap:8px;
  }
  .card-img{width:100%; height:140px; object-fit:cover; border-radius:10px; border:1px solid var(--border);}
  .card-title a{font-family:'Oswald',sans-serif; font-weight:600; font-size:15px; color:var(--text); text-decoration:none;}
  .card-title a:hover{color:var(--blue);}
  .card-resumo{font-size:13px; line-height:1.5; color:var(--text);}
  .card-meta{font-size:11.5px; color:var(--muted);}
  .vazio{color:var(--muted); font-size:14px; text-align:center; padding:40px 0;}
  .anunciar-cta{
    margin-top:28px; text-align:center; padding:20px; background:var(--surface);
    border:1px solid var(--border); border-radius:16px;
  }
  .anunciar-cta a{color:var(--blue); text-decoration:none; font-weight:600;}
  .a11y-fontctrl{
    position:fixed; bottom:14px; left:14px; z-index:999;
    display:flex; gap:4px; background:var(--surface); border:1px solid var(--border);
    border-radius:20px; padding:5px; box-shadow:0 10px 24px -10px rgba(45,45,45,0.25);
  }
  .a11y-fontctrl button{
    border:none; background:var(--surface-2); color:var(--text);
    width:30px; height:30px; border-radius:50%; font-size:12px; font-weight:700;
    cursor:pointer; font-family:'Inter',sans-serif;
  }
  .a11y-fontctrl button:hover{ background:var(--blue); color:#fff; }
</style>
</head>
<body>

<div class="page">
  <div class="topbar">
    <a href="/index.html"><img class="brand-logo" src="/logo_tabela_fipe_site_transparente.png" alt="TabelaFipe.Site"></a>
    <div>
      <div class="name">tabelafipe.site</div>
      <div class="sub">notícias</div>
    </div>
    <div class="topbar-right">
      <a href="/consultar.html">consultar preço</a>
    </div>
  </div>

  <div class="filtros">
    ${filtro("", "Todas")}
    ${filtro("carros", "🚗 Carros")}
    ${filtro("motos", "🏍️ Motos")}
    ${filtro("caminhoes", "🚚 Caminhões")}
  </div>

  ${conteudoHtml}

  <ins class="adsbygoogle"
       style="display:block; text-align:center; margin-top:20px;"
       data-ad-layout="in-article"
       data-ad-format="fluid"
       data-ad-client="ca-pub-9655532802163165"
       data-ad-slot="1896219339"></ins>

  <div class="anunciar-cta">
    Quer vender o seu? <a href="/consultar.html">Consulte o preço e crie seu anúncio com IA →</a>
  </div>
</div>

<script>(window.adsbygoogle = window.adsbygoogle || []).push({});</script>

<div class="a11y-fontctrl" role="group" aria-label="Ajustar tamanho da fonte">
  <button type="button" data-step="-1" aria-label="Diminuir fonte">A-</button>
  <button type="button" data-step="0" aria-label="Tamanho padrão de fonte">A</button>
  <button type="button" data-step="1" aria-label="Aumentar fonte">A+</button>
</div>
<script>
(function(){
  var STEPS=[90,100,110,120,130];
  var salvo=parseInt(localStorage.getItem('tf_zoom'),10);
  var i=STEPS.indexOf(salvo); if(i===-1) i=STEPS.indexOf(100);
  document.querySelectorAll('.a11y-fontctrl button').forEach(function(btn){
    btn.addEventListener('click', function(){
      var step=btn.getAttribute('data-step');
      i = step==='0' ? STEPS.indexOf(100) : Math.min(STEPS.length-1, Math.max(0, i+parseInt(step,10)));
      var novo=STEPS[i];
      document.documentElement.style.zoom = novo + '%';
      localStorage.setItem('tf_zoom', novo);
    });
  });
})();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
  res.status(200).send(html);
};
