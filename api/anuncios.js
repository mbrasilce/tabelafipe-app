// api/anuncios.js
// Listagem pública de anúncios, renderizada no servidor — precisa ser
// assim pro Google (busca e o analisador de "In-feed ads" do AdSense)
// enxergar a grade de cards de cara, sem depender de fetch no navegador.
// Lê da view anuncios_publicos (nunca traz telefone/email cru). Filtro
// por tipo é um link real (?tipo=carros), não precisa de JS pra navegar.
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TIPO_LABEL = { carros: "🚗 Carro", motos: "🏍️ Moto", caminhoes: "🚚 Caminhão" };
const ANUNCIO_A_CADA = 4; // 1 anúncio in-feed a cada N cards

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

function urlAnuncio(a) {
  const slug = slugify([a.marca, a.modelo, a.ano_modelo, a.cidade].filter(Boolean).join(" "));
  return `/anuncio/${a.id}${slug ? "-" + slug : ""}`;
}

function montarCard(a) {
  return `<div class="card">
    <div class="card-head">
      <div class="card-title">${escapeHtml(a.marca)} ${escapeHtml(a.modelo)} ${a.ano_modelo ? `· ${a.ano_modelo}` : ""}</div>
      <span class="card-tipo">${TIPO_LABEL[a.tipo] || escapeHtml(a.tipo)}</span>
    </div>
    <div class="card-local">${escapeHtml([a.cidade, a.estado].filter(Boolean).join(" - ")) || "localização não informada"}</div>
    <div class="card-precos">
      ${a.valor_desejado ? `<span class="preco-desejado">${escapeHtml(a.valor_desejado)}</span>` : ""}
      ${a.valor_fipe ? `<span class="preco-fipe">FIPE: ${escapeHtml(a.valor_fipe)}</span>` : ""}
    </div>
    <div class="card-badges">
      ${a.cor ? `<span class="badge">🎨 ${escapeHtml(a.cor)}</span>` : ""}
      ${a.quilometragem ? `<span class="badge">🛣️ ${escapeHtml(a.quilometragem)}</span>` : ""}
      ${a.pneus ? `<span class="badge">🛞 pneus: ${escapeHtml(a.pneus)}</span>` : ""}
      ${a.estofados ? `<span class="badge">🪑 estofados: ${escapeHtml(a.estofados)}</span>` : ""}
    </div>
    <div class="card-texto">${escapeHtml(a.texto)}</div>
    <div class="card-acoes">
      <a class="ver-mais" href="${urlAnuncio(a)}">Ver mais →</a>
    </div>
  </div>`;
}

// TODO: quando criar a unidade "Anúncio in-feed" no AdSense, cole aqui os
// atributos EXATOS que o Google gerar (data-ad-slot e data-ad-layout-key
// são específicos daquela unidade — não dá pra inventar).
function montarCardAds() {
  return `<ins class="adsbygoogle card" style="display:block"
    data-ad-client="ca-pub-9655532802163165"
    data-ad-slot="SEU_AD_SLOT_INFEED_AQUI"
    data-ad-format="fluid"
    data-ad-layout-key="SEU_LAYOUT_KEY_AQUI"></ins>`;
}

module.exports = async (req, res) => {
  const tipoValido = ["carros", "motos", "caminhoes"];
  const tipo = tipoValido.includes(req.query.tipo) ? req.query.tipo : "";

  let query = supabase.from("anuncios_publicos").select("*").limit(60);
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query;
  const lista = data || [];

  let gridHtml = "";
  let quantosAds = 0;
  lista.forEach((a, i) => {
    gridHtml += montarCard(a);
    if ((i + 1) % ANUNCIO_A_CADA === 0) {
      gridHtml += montarCardAds();
      quantosAds++;
    }
  });

  const conteudoHtml = error
    ? `<div class="vazio">😕 Não consegui carregar os anúncios agora. Tenta recarregar a página.</div>`
    : lista.length
      ? `<div class="grid">${gridHtml}</div>`
      : `<div class="vazio">Ainda não há anúncios por aqui. Seja o primeiro a anunciar! 🚀</div>`;

  const pushAds = Array.from({ length: quantosAds }, () =>
    `(window.adsbygoogle = window.adsbygoogle || []).push({});`
  ).join("\n");

  const filtro = (valor, label) => {
    const href = valor ? `/anuncios.html?tipo=${valor}` : `/anuncios.html`;
    const ativo = tipo === valor ? " ativo" : "";
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
<link rel="canonical" href="https://tabelafipe.site/anuncios.html${tipo ? "?tipo=" + tipo : ""}">
<title>Anúncios de veículos${tipo ? " — " + (TIPO_LABEL[tipo] || tipo) : ""} | tabelafipe.site</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F2F4F7; --surface:#FFFFFF; --surface-2:#EAF1F7; --border:#D3DCE4;
    --blue:#33A9F4; --blue-2:#20A1FA; --green:#25D366; --text:#2D2D2D; --muted:#758A9C;
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
  .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;}
  .card{
    background:var(--surface); border:1px solid var(--border); border-radius:16px;
    padding:18px; display:flex; flex-direction:column; gap:10px;
  }
  .card-head{display:flex; justify-content:space-between; align-items:flex-start; gap:8px;}
  .card-title{font-family:'Oswald',sans-serif; font-weight:600; font-size:16px;}
  .card-tipo{font-size:11px; padding:3px 9px; border-radius:8px; border:1px solid var(--border); color:var(--muted); flex-shrink:0;}
  .card-local{font-size:12.5px; color:var(--muted);}
  .card-precos{display:flex; gap:14px; align-items:baseline; flex-wrap:wrap;}
  .preco-desejado{font-family:'JetBrains Mono', monospace; font-size:19px; font-weight:600; color:var(--blue);}
  .preco-fipe{font-size:11.5px; color:var(--muted);}
  .card-badges{display:flex; gap:6px; flex-wrap:wrap;}
  .badge{font-size:11px; padding:3px 9px; border-radius:8px; background:var(--surface-2); border:1px solid var(--border); color:var(--muted);}
  .card-texto{
    font-size:13px; line-height:1.5; color:var(--text); white-space:pre-wrap;
    max-height:110px; overflow:hidden; position:relative;
  }
  .card-texto::after{
    content:""; position:absolute; bottom:0; left:0; right:0; height:32px;
    background:linear-gradient(180deg, transparent, var(--surface));
  }
  .card-acoes{margin-top:4px;}
  .ver-mais{
    display:inline-flex; align-items:center; gap:6px; align-self:flex-start;
    background:var(--surface-2); border:1px solid var(--border); color:var(--text);
    padding:8px 16px; border-radius:20px; font-size:13px; font-weight:600;
    cursor:pointer; font-family:'Inter',sans-serif; text-decoration:none;
  }
  .ver-mais:hover{border-color:var(--blue); color:var(--blue);}
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
      <div class="sub">anúncios</div>
    </div>
    <div class="topbar-right">
      <a href="/consultar.html">consultar preço</a>
    </div>
  </div>

  <div class="filtros">
    ${filtro("", "Todos")}
    ${filtro("carros", "🚗 Carros")}
    ${filtro("motos", "🏍️ Motos")}
    ${filtro("caminhoes", "🚚 Caminhões")}
  </div>

  ${conteudoHtml}

  <div class="anunciar-cta">
    Quer vender o seu? <a href="/consultar.html">Consulte o preço e crie seu anúncio com IA →</a>
  </div>
</div>

<script>${pushAds}</script>

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
  res.setHeader("Cache-Control", "public, max-age=90, stale-while-revalidate=300");
  res.status(200).send(html);
};
