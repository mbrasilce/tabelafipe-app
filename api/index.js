// api/index.js
// Renderiza a home no servidor (não é um arquivo estático) só pra poder
// injetar as últimas pesquisas reais no HTML antes de responder — assim
// o texto já está lá pros crawlers de SEO, sem depender de fetch no
// navegador (que o Google trata como sinal fraco e outros nem executam).
//
// O HTML fica embutido aqui (em vez de lido de um arquivo à parte) pra
// não depender do bundler da Vercel incluir um arquivo extra no deploy.
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEMPLATE = `<!DOCTYPE html>
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
<link rel="canonical" href="https://tabelafipe.site/">
<title>tabelafipe.site</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F2F4F7;
    --surface:#FFFFFF;
    --surface-2:#EAF1F7;
    --border:#D3DCE4;
    --blue:#33A9F4;
    --blue-2:#20A1FA;
    --text:#2D2D2D;
    --muted:#758A9C;
  }
  *{box-sizing:border-box;}
  html{height:100%;}
  body{
    margin:0;
    background:radial-gradient(circle at 50% 0%, #ffffff 0%, var(--bg) 60%);
    color:var(--text);
    font-family:'Inter',system-ui,sans-serif;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:24px;
  }
  /* em telas baixas o conteúdo passa de 1 viewport de altura — centralizar
     nesse caso corta topo/fundo (ex: logo e o marquee do rodapé) */
  @media (max-width:480px){
    body{ justify-content:flex-start; padding-top:36px; }
  }

  .hero{text-align:center; max-width:480px; margin-bottom:34px;}
  .hero a.logo-link{display:inline-block;}
  .hero .logo-img{width:240px; max-width:80vw; height:auto; margin-bottom:12px;}
  h1{
    position:absolute; width:1px; height:1px; padding:0; margin:-1px;
    overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
  }
  .hero p{color:var(--muted); font-size:14.5px; line-height:1.5; margin:0;}

  .cards{display:flex; flex-wrap:wrap; gap:16px; justify-content:center; max-width:640px; width:100%;}
  .card{
    flex:1 1 240px; max-width:280px;
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:18px;
    padding:26px 22px;
    text-decoration:none;
    color:var(--text);
    display:flex; flex-direction:column; gap:8px;
    transition:transform .15s ease, border-color .15s ease;
    box-shadow:0 20px 40px -20px rgba(45,45,45,0.18);
  }
  .card:hover{transform:translateY(-3px); border-color:var(--blue);}
  .card .icon{font-size:30px;}
  .card .title{font-family:'Oswald',sans-serif; font-weight:600; font-size:17px;}
  .card .desc{color:var(--muted); font-size:13px; line-height:1.5;}
  .card .cta{margin-top:6px; font-size:13px; font-weight:600; color:var(--blue);}

  .marquee-wrap{
    width:100%; max-width:640px; margin-top:26px; padding-top:14px;
    border-top:1px solid var(--border); overflow:hidden;
  }
  .marquee-track{
    display:flex; gap:56px; width:max-content; white-space:nowrap;
    font-size:12.5px; color:var(--muted);
    animation:marquee-scroll 22s linear infinite;
  }
  .marquee-track a{ color:inherit; text-decoration:none; }
  .marquee-track a:hover{ text-decoration:underline; }
  @keyframes marquee-scroll{
    from{ transform:translateX(0); }
    to{ transform:translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce){
    .marquee-track{ animation:none; overflow-x:auto; }
  }

  .noticias-wrap{ width:100%; max-width:640px; margin-top:30px; }
  .noticias-title{ font-family:'Oswald',sans-serif; font-weight:600; font-size:16px; margin-bottom:12px; text-align:center; }
  .noticias-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; }
  .noticias-card{
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    overflow:hidden; display:flex; flex-direction:column; text-decoration:none; color:var(--text);
    transition:transform .15s ease, border-color .15s ease;
    box-shadow:0 12px 24px -14px rgba(45,45,45,0.18);
  }
  .noticias-card:hover{ transform:translateY(-3px); border-color:var(--blue); }
  .noticias-card-img{ width:100%; height:88px; object-fit:cover; background:var(--surface-2); display:block; }
  .noticias-card-icon{
    width:100%; height:88px; display:flex; align-items:center; justify-content:center;
    font-size:28px; background:var(--surface-2);
  }
  .noticias-card-body{ padding:10px 12px; display:flex; flex-direction:column; gap:5px; }
  .noticias-card-titulo{
    font-size:12.5px; font-weight:600; line-height:1.35; margin:0;
    display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
  }
  .noticias-card-fonte{ font-size:10.5px; color:var(--muted); }
  .noticias-ver-todas{
    display:block; text-align:center; margin-top:14px; background:var(--surface-2);
    border:1px solid var(--border); color:var(--text); padding:11px 18px; border-radius:20px;
    font-size:13.5px; font-weight:600; text-decoration:none;
  }
  .noticias-ver-todas:hover{ border-color:var(--blue); color:var(--blue); }

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

<div class="hero">
  <a class="logo-link" href="index.html">
    <img class="logo-img" src="logo_tabela_fipe_site_transparente.png" alt="TabelaFipe.Site">
  </a>
  <h1>tabelafipe.site</h1>
  <p>Consulte o preço FIPE do seu veículo em segundos ou dê uma olhada nos anúncios de quem já está vendendo.</p>
</div>

<div class="cards">
  <a class="card" href="consultar.html">
    <div class="icon">🔍</div>
    <div class="title">Consultar preço</div>
    <div class="desc">Descubra o valor FIPE do seu carro, moto ou caminhão com o assistente guiado.</div>
    <div class="cta">Começar consulta →</div>
  </a>
  <a class="card" href="anuncios.html">
    <div class="icon">📋</div>
    <div class="title">Ver anúncios</div>
    <div class="desc">Veículos anunciados por outras pessoas, com texto gerado por IA.</div>
    <div class="cta">Ver anúncios →</div>
  </a>
</div>

<!-- anúncio manual (in-article): entre os cards de Consultar/Ver anúncios e o resto da página -->
<ins class="adsbygoogle"
     style="display:block; text-align:center; width:100%; max-width:640px; margin:24px auto 0;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-9655532802163165"
     data-ad-slot="1896219339"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>

<a href="vendedor-login.html" style="margin-top:28px; color:var(--muted); font-size:12.5px; text-decoration:none;">Sou vendedor, entrar no meu painel →</a>
<a href="privacidade.html" style="margin-top:6px; color:var(--muted); font-size:11.5px; text-decoration:none;">Privacidade e cookies</a>

<!--NOTICIAS-->

<!--RECENTES-->

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
</html>
`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
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

function urlPrecoFipe(b) {
  const slug = slugify([b.marca, b.modelo, b.ano_modelo].filter(Boolean).join(" "));
  return `/preco-fipe/${b.id}${slug ? "-" + slug : ""}`;
}

function formatarBusca(b) {
  const base = [b.marca, b.modelo, b.ano_modelo].filter(Boolean).join(" ");
  return b.valor ? `${base} - ${b.valor}` : base;
}

// Busca as últimas pesquisas distintas (evita mostrar a mesma repetida
// se alguém buscou o mesmo veículo duas vezes seguidas). Usa veiculos_cache
// em vez de buscas_log porque já tem o valor FIPE junto, sem precisar de join.
async function buscarRecentes() {
  try {
    const { data, error } = await supabase
      .from("veiculos_cache")
      .select("id, marca, modelo, ano_modelo, valor, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(8);
    if (error || !data) return [];

    const vistas = new Set();
    const unicas = [];
    for (const b of data) {
      const texto = formatarBusca(b);
      if (!texto || vistas.has(texto)) continue;
      vistas.add(texto);
      unicas.push({ id: b.id, texto, href: urlPrecoFipe(b) });
      if (unicas.length === 2) break;
    }
    return unicas;
  } catch {
    return [];
  }
}

function montarMarquee(itens) {
  if (!itens.length) return "";
  const links = itens
    .map((it) => `<a href="${it.href}">${escapeHtml(it.texto)}</a>`)
    .join('<span aria-hidden="true">  ·  </span>');
  const faixa = `<span>Pesquisaram: </span>${links}`;
  // o conteúdo aparece duplicado dentro da faixa pra animação rodar em loop
  // contínuo (translateX(-50%)) sem dar um "salto" visível no final.
  return `<div class="marquee-wrap">
    <div class="marquee-track">
      <span>${faixa}</span>
      <span>${faixa}</span>
    </div>
  </div>`;
}

const NOTICIA_ICONE = { carros: "🚗", motos: "🏍️", caminhoes: "🚚" };

// Últimas notícias (RSS) já processadas pela Edge Function atualizar-noticias.
async function buscarNoticias() {
  try {
    const { data, error } = await supabase
      .from("noticias")
      .select("titulo, link, fonte, imagem_url, categoria")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .limit(4);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

function montarNoticias(itens) {
  if (!itens.length) return "";
  const cards = itens
    .map(
      (n) => `<a class="noticias-card" href="${escapeHtml(n.link)}" target="_blank" rel="noopener">
      ${
        n.imagem_url
          ? `<img class="noticias-card-img" src="${escapeHtml(n.imagem_url)}" alt="" loading="lazy">`
          : `<div class="noticias-card-icon">${NOTICIA_ICONE[n.categoria] || "📰"}</div>`
      }
      <div class="noticias-card-body">
        <div class="noticias-card-titulo">${escapeHtml(n.titulo)}</div>
        <div class="noticias-card-fonte">${escapeHtml(n.fonte)}</div>
      </div>
    </a>`
    )
    .join("");
  return `<div class="noticias-wrap">
    <div class="noticias-title">📰 Notícias de carros, motos e caminhões</div>
    <div class="noticias-grid">${cards}</div>
    <a class="noticias-ver-todas" href="/noticias.html">Ver todas as notícias →</a>
  </div>`;
}

module.exports = async (req, res) => {
  const [recentes, noticias] = await Promise.all([buscarRecentes(), buscarNoticias()]);
  const html = TEMPLATE.replace("<!--NOTICIAS-->", montarNoticias(noticias)).replace(
    "<!--RECENTES-->",
    montarMarquee(recentes)
  );

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.status(200).send(html);
};
