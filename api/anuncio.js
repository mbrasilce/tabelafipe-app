// api/anuncio.js
// Página única de um anúncio, renderizada no servidor (indexável pelo
// Google, com meta tags próprias por veículo) — é aqui que o AdSense tem
// conteúdo de verdade pra colocar anúncio ao lado. Rota amigável
// /anuncio/:id -> aqui, via rewrite no vercel.json.
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = "https://tabelafipe.site";
const SUPABASE_URL = "https://cklgxrebbjddhybbkzpn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGd4cmViYmpkZGh5YmJrenBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjEwNTcsImV4cCI6MjEwMDczNzA1N30.jGM0GPbNIFuAYQqVd4_Ikk21JK6jLOW5pCjg7909BSk";

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

function urlAnuncio(a) {
  const slug = slugify([a.marca, a.modelo, a.ano_modelo, a.cidade].filter(Boolean).join(" "));
  return `${SITE_URL}/anuncio/${a.id}${slug ? "-" + slug : ""}`;
}

function paginaNaoEncontrada(res) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Anúncio não encontrado — tabelafipe.site</title>
<link rel="icon" href="/favicon/favicon.ico" sizes="any">
<style>
  body{margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    flex-direction:column; gap:14px; font-family:system-ui,sans-serif; background:#F2F4F7; color:#2D2D2D; padding:24px; text-align:center;}
  a{color:#33A9F4; font-weight:600; text-decoration:none;}
</style>
</head>
<body>
  <div>😕 Esse anúncio não existe mais ou já foi vendido.</div>
  <a href="/anuncios.html">← Ver outros anúncios</a>
</body>
</html>`;
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

module.exports = async (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!id) return paginaNaoEncontrada(res);

  const { data: a, error } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !a) return paginaNaoEncontrada(res);

  const veiculo = TIPO_LABEL[a.tipo] || a.tipo;
  const titulo = `${a.marca} ${a.modelo} ${a.ano_modelo || ""}`.trim();
  const local = [a.cidade, a.estado].filter(Boolean).join(" - ");
  const descricao = `${titulo}${local ? ` em ${local}` : ""}${a.valor_desejado ? ` por ${a.valor_desejado}` : ""}. Anúncio no tabelafipe.site.`;

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
<link rel="canonical" href="${urlAnuncio(a)}">
<meta name="description" content="${escapeHtml(descricao)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(titulo)} — tabelafipe.site">
<meta property="og:description" content="${escapeHtml(descricao)}">
<meta property="og:url" content="${urlAnuncio(a)}">
<title>${escapeHtml(titulo)}${local ? ` — ${escapeHtml(local)}` : ""} | tabelafipe.site</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F2F4F7; --surface:#FFFFFF; --surface-2:#EAF1F7; --border:#D3DCE4;
    --blue:#33A9F4; --blue-2:#20A1FA; --red:#E14545; --text:#2D2D2D; --muted:#758A9C;
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
  .card-local{font-size:13px; color:var(--muted);}
  .card-precos{display:flex; gap:14px; align-items:baseline; flex-wrap:wrap;}
  .preco-desejado{font-family:'JetBrains Mono', monospace; font-size:26px; font-weight:600; color:var(--blue);}
  .preco-fipe{font-size:12px; color:var(--muted);}
  .card-badges{display:flex; gap:6px; flex-wrap:wrap;}
  .badge{font-size:12px; padding:4px 10px; border-radius:8px; background:var(--surface-2); border:1px solid var(--border); color:var(--muted);}
  .card-texto{font-size:14.5px; line-height:1.6; color:var(--text); white-space:pre-wrap;}

  .btn-contato{
    display:inline-flex; align-items:center; gap:6px; align-self:flex-start;
    background:linear-gradient(135deg, var(--blue), var(--blue-2)); color:#ffffff;
    border:none; padding:11px 20px; border-radius:20px; font-size:14px; font-weight:600;
    cursor:pointer; font-family:'Inter',sans-serif;
  }
  .form-contato{display:flex; flex-direction:column; gap:8px; margin-top:2px; max-width:320px;}
  .form-contato input{
    background:var(--surface-2); border:1px solid var(--border); color:var(--text);
    padding:9px 12px; border-radius:10px; font-size:13.5px; font-family:'Inter',sans-serif;
  }
  .form-contato input:focus{outline:none; border-color:var(--blue);}
  .form-contato .aviso{font-size:12px; color:var(--muted);}
  .form-contato .erro-envio{font-size:12px; color:var(--red);}
  .form-contato .sucesso{font-size:13px; color:#3ecb6e;}

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
</style>
</head>
<body>

<div class="page">
  <div class="topbar">
    <a href="/index.html"><img class="brand-logo" src="/logo_tabela_fipe_site_transparente.png" alt="TabelaFipe.Site"></a>
    <div class="name">tabelafipe.site</div>
    <div class="topbar-right"><a href="/anuncios.html">← todos os anúncios</a></div>
  </div>

  <div class="card">
    <div class="card-head">
      <div class="card-title">${escapeHtml(titulo)}</div>
      <span class="card-tipo">${veiculo}</span>
    </div>
    <div class="card-local">${escapeHtml(local) || "localização não informada"}</div>
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

    <button class="btn-contato" id="btnContato">📩 Entrar em contato</button>
    <div class="form-contato" id="formContato" hidden></div>
  </div>

  <div class="ad-slot"><!-- espaço reservado para anúncio do Google --></div>
</div>

<script>
const SUPABASE_URL = "${SUPABASE_URL}";
const SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";
const CONTATO_FUNCTION_URL = SUPABASE_URL + "/functions/v1/solicitar-contato";
const ANUNCIO_ID = ${a.id};

const btnContato = document.getElementById('btnContato');
const formWrap = document.getElementById('formContato');

btnContato.onclick = function(){
  btnContato.hidden = true;
  formWrap.hidden = false;
  formWrap.innerHTML = \`
    <input class="i-nome" placeholder="Seu nome" />
    <input class="i-email" type="email" placeholder="Seu email" />
    <input class="i-telefone" placeholder="Seu telefone/WhatsApp" />
    <div class="aviso">Vamos te enviar o contato do vendedor por email.</div>
    <button class="btn-contato i-enviar">Enviar</button>
  \`;
  formWrap.querySelector('.i-enviar').onclick = async function(){
    const nome = formWrap.querySelector('.i-nome').value.trim();
    const email = formWrap.querySelector('.i-email').value.trim();
    const telefone = formWrap.querySelector('.i-telefone').value.trim();
    if(!nome || !email.includes('@') || !telefone){
      let aviso = formWrap.querySelector('.erro-envio');
      if(!aviso){ aviso = document.createElement('div'); aviso.className = 'erro-envio'; formWrap.appendChild(aviso); }
      aviso.textContent = 'Preenche nome, email válido e telefone.';
      return;
    }
    const btnEnviar = formWrap.querySelector('.i-enviar');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    try{
      const r = await fetch(CONTATO_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
        body: JSON.stringify({ anuncioId: ANUNCIO_ID, nome: nome, email: email, telefone: telefone }),
      });
      if(!r.ok) throw new Error();
      formWrap.innerHTML = '<div class="sucesso">✅ Enviamos o contato do vendedor pro seu email!</div>';
    }catch(e){
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar';
      let aviso = formWrap.querySelector('.erro-envio');
      if(!aviso){ aviso = document.createElement('div'); aviso.className = 'erro-envio'; formWrap.appendChild(aviso); }
      aviso.textContent = 'Não consegui enviar agora. Tenta de novo em instantes.';
    }
  };
};
</script>

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
  res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
  res.status(200).send(html);
};
