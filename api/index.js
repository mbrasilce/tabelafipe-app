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
  @keyframes marquee-scroll{
    from{ transform:translateX(0); }
    to{ transform:translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce){
    .marquee-track{ animation:none; overflow-x:auto; }
  }

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

</body>
</html>
`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
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
      .select("marca, modelo, ano_modelo, valor, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(8);
    if (error || !data) return [];

    const vistas = new Set();
    const unicas = [];
    for (const b of data) {
      const texto = formatarBusca(b);
      if (!texto || vistas.has(texto)) continue;
      vistas.add(texto);
      unicas.push(texto);
      if (unicas.length === 2) break;
    }
    return unicas;
  } catch {
    return [];
  }
}

function montarMarquee(itens) {
  if (!itens.length) return "";
  const texto = escapeHtml(`Pesquisaram: ${itens.join("  ·  ")}`);
  // o texto aparece duplicado dentro da faixa pra animação rodar em loop
  // contínuo (translateX(-50%)) sem dar um "salto" visível no final.
  return `<div class="marquee-wrap">
    <div class="marquee-track">
      <span>${texto}</span>
      <span>${texto}</span>
    </div>
  </div>`;
}

module.exports = async (req, res) => {
  const recentes = await buscarRecentes();
  const html = TEMPLATE.replace("<!--RECENTES-->", montarMarquee(recentes));

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.status(200).send(html);
};
