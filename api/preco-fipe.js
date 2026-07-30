// api/preco-fipe.js
// Página SEO de um veículo já pesquisado no chat (tabela veiculos_cache),
// renderizada no servidor — alvo de buscas de cauda longa tipo "tabela
// fipe honda cg 160 2021". Rota amigável /preco-fipe/:id -> aqui, via
// rewrite no vercel.json. Os itens do marquee da home linkam pra cá.
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = "https://tabelafipe.site";

const TIPO_LABEL = { carros: "🚗 Carro", motos: "🏍️ Moto", caminhoes: "🚚 Caminhão" };

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function urlPrecoFipe(v) {
  const slug = slugify([v.marca, v.modelo, v.ano_modelo].filter(Boolean).join(" "));
  return `${SITE_URL}/preco-fipe/${v.id}${slug ? "-" + slug : ""}`;
}

function paginaNaoEncontrada(res) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Veículo não encontrado — tabelafipe.site</title>
<link rel="icon" href="/favicon/favicon.ico" sizes="any">
<style>
  body{margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    flex-direction:column; gap:14px; font-family:system-ui,sans-serif; background:#F2F4F7; color:#2D2D2D; padding:24px; text-align:center;}
  a{color:#33A9F4; font-weight:600; text-decoration:none;}
</style>
</head>
<body>
  <div>😕 Não encontrei o preço FIPE desse veículo.</div>
  <a href="/consultar.html">← Fazer uma nova consulta</a>
</body>
</html>`;
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

module.exports = async (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!id) return paginaNaoEncontrada(res);

  const { data: v, error } = await supabase
    .from("veiculos_cache")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !v) return paginaNaoEncontrada(res);

  const veiculo = TIPO_LABEL[v.tipo] || v.tipo;
  const titulo = `${v.marca} ${v.modelo} ${v.ano_modelo || ""}`.trim();
  const dataAtualizacao = v.atualizado_em
    ? new Date(v.atualizado_em).toLocaleDateString("pt-BR")
    : null;
  const descricao = `Preço FIPE do ${titulo}: ${v.valor}${v.mes_referencia ? ` (referência ${v.mes_referencia})` : ""}. Consulte grátis no tabelafipe.site.`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>(function(){var v=localStorage.getItem('tf_zoom');if(v)document.documentElement.style.zoom=v+'%';})();</script>
<!-- Consentimento de cookies (Google Consent Mode v2) — nega por padrão até o
     visitante decidir no banner; aplica a escolha salva se já existir. -->
<script>
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  if (localStorage.getItem('tf_consent') === 'aceito') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }
})();
</script>
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
<link rel="canonical" href="${urlPrecoFipe(v)}">
<meta name="description" content="${escapeHtml(descricao)}">
<meta property="og:type" content="website">
<meta property="og:title" content="Tabela FIPE ${escapeHtml(titulo)} — tabelafipe.site">
<meta property="og:description" content="${escapeHtml(descricao)}">
<meta property="og:url" content="${urlPrecoFipe(v)}">
<title>Tabela FIPE ${escapeHtml(titulo)} — preço atualizado | tabelafipe.site</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
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
  .page{width:100%; max-width:640px;}
  .topbar{display:flex; align-items:center; gap:12px; margin-bottom:18px;}
  .brand-logo{height:34px; width:auto; flex-shrink:0; display:block;}
  .topbar .name{font-family:'Oswald',sans-serif; font-weight:600; font-size:15px;}
  .topbar-right{margin-left:auto;}
  .topbar-right a{color:var(--muted); font-size:13px; text-decoration:none;}
  .topbar-right a:hover{color:var(--blue);}

  .card{
    background:var(--surface); border:1px solid var(--border); border-radius:16px;
    padding:22px; display:flex; flex-direction:column; gap:12px;
    box-shadow:0 20px 40px -20px rgba(45,45,45,0.18);
  }
  .card-head{display:flex; justify-content:space-between; align-items:flex-start; gap:8px;}
  .card-title{font-family:'Oswald',sans-serif; font-weight:600; font-size:22px;}
  .card-tipo{font-size:11px; padding:3px 9px; border-radius:8px; border:1px solid var(--border); color:var(--muted); flex-shrink:0;}
  .preco-desejado{font-family:'JetBrains Mono', monospace; font-size:30px; font-weight:600; color:var(--blue);}
  .card-badges{display:flex; gap:6px; flex-wrap:wrap;}
  .badge{font-size:12px; padding:4px 10px; border-radius:8px; background:var(--surface-2); border:1px solid var(--border); color:var(--muted);}

  .cta{
    display:inline-flex; align-items:center; gap:6px; align-self:flex-start;
    background:linear-gradient(135deg, var(--blue), var(--blue-2)); color:#ffffff;
    padding:11px 20px; border-radius:20px; font-size:14px; font-weight:600;
    text-decoration:none;
  }

  .voltar{display:inline-block; margin-top:18px; color:var(--muted); font-size:13px; text-decoration:none;}
  .voltar:hover{color:var(--blue);}

  .ad-slot{margin-top:22px; min-height:0;}

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

  .cookie-banner{
    position:fixed; right:14px; bottom:14px; z-index:1000; max-width:300px;
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    padding:14px 16px; box-shadow:0 10px 24px -10px rgba(45,45,45,0.25);
    font-size:12.5px; line-height:1.5; color:var(--text);
  }
  .cookie-banner a{ color:var(--blue); }
  .cookie-banner-botoes{ display:flex; gap:8px; margin-top:10px; }
  .cookie-banner-botoes button{
    flex:1; border:none; border-radius:14px; padding:8px 10px; font-size:12.5px; font-weight:600;
    cursor:pointer; font-family:'Inter',sans-serif;
  }
  #cookieAceitar{ background:linear-gradient(135deg, var(--blue), var(--blue-2)); color:#fff; }
  #cookieRecusar{ background:var(--surface-2); color:var(--text); border:1px solid var(--border); }
  @media (max-width:480px){
    .cookie-banner{ left:14px; right:14px; max-width:none; bottom:70px; }
  }
</style>
</head>
<body>

<div class="page">
  <div class="topbar">
    <a href="/index.html"><img class="brand-logo" src="/logo_tabela_fipe_site_transparente.png" alt="TabelaFipe.Site"></a>
    <div class="name">tabelafipe.site</div>
    <div class="topbar-right"><a href="/consultar.html">nova consulta</a></div>
  </div>

  <div class="card">
    <div class="card-head">
      <div class="card-title">Tabela FIPE ${escapeHtml(titulo)}</div>
      <span class="card-tipo">${veiculo}</span>
    </div>
    <div class="preco-desejado">${escapeHtml(v.valor)}</div>
    <div class="card-badges">
      ${v.codigo_fipe ? `<span class="badge">Código FIPE: ${escapeHtml(v.codigo_fipe)}</span>` : ""}
      ${v.combustivel ? `<span class="badge">⛽ ${escapeHtml(v.combustivel)}</span>` : ""}
      ${v.mes_referencia ? `<span class="badge">Referência: ${escapeHtml(v.mes_referencia)}</span>` : ""}
      ${dataAtualizacao ? `<span class="badge">Atualizado em ${dataAtualizacao}</span>` : ""}
    </div>
    <a class="cta" href="/consultar.html">Quer vender esse veículo? Consulte o preço e anuncie →</a>
  </div>

  <div class="ad-slot">
    <ins class="adsbygoogle"
         style="display:block; text-align:center;"
         data-ad-layout="in-article"
         data-ad-format="fluid"
         data-ad-client="ca-pub-9655532802163165"
         data-ad-slot="1896219339"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <a class="voltar" href="/anuncios.html">← Ver anúncios de ${escapeHtml(v.marca)}</a>
</div>

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

<div class="cookie-banner" id="cookieBanner" hidden>
  <p>Usamos cookies para estatísticas e anúncios. Você pode aceitar ou recusar — isso não afeta o uso do site. <a href="/privacidade.html">Saiba mais</a>.</p>
  <div class="cookie-banner-botoes">
    <button type="button" id="cookieRecusar">Recusar</button>
    <button type="button" id="cookieAceitar">Aceitar</button>
  </div>
</div>
<script>
(function(){
  var banner = document.getElementById('cookieBanner');
  if (!localStorage.getItem('tf_consent')) banner.hidden = false;
  function decidir(valor){
    localStorage.setItem('tf_consent', valor);
    banner.hidden = true;
    if (valor === 'aceito' && window.gtag) {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted'
      });
    }
  }
  document.getElementById('cookieAceitar').addEventListener('click', function(){ decidir('aceito'); });
  document.getElementById('cookieRecusar').addEventListener('click', function(){ decidir('recusado'); });
})();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
  res.status(200).send(html);
};
