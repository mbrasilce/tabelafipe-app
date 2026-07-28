// supabase/functions/solicitar-contato/index.ts
// POST { anuncioId, nome, email, telefone }
// Registra um interessado num anúncio e envia por email (via Resend):
// pro interessado, o contato do vendedor; pro vendedor, um aviso do lead.
// O telefone/email reais do vendedor nunca voltam na resposta HTTP —
// só saem por email, e só depois que o interessado se identifica.

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const REMETENTE = "tabelafipe.site <contato@tabelafipe.site>";

// TODO: trocar para https://tabelafipe.site quando o domínio estiver 100% propagado.
const SITE_URL = "https://tabelafipe-app-psi.vercel.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TIPO_SINGULAR: Record<string, string> = {
  carros: "carro",
  motos: "moto",
  caminhoes: "caminhão",
};

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

async function enviarEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return; // sem a chave configurada, só não envia (não derruba o fluxo)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: REMETENTE, to: [to], subject, html }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ erro: "método não permitido" }, 405);
  }

  let dados: Record<string, unknown>;
  try {
    dados = await req.json();
  } catch {
    return jsonResponse({ erro: "corpo da requisição inválido" }, 400);
  }

  const obrigatorios = ["anuncioId", "nome", "email", "telefone"];
  const faltando = obrigatorios.filter((k) => !dados[k]);
  if (faltando.length) {
    return jsonResponse({ erro: `parâmetros obrigatórios faltando: ${faltando.join(", ")}` }, 400);
  }

  const { data: anuncio, error: erroBusca } = await supabase
    .from("anuncios")
    .select("marca, modelo, ano_modelo, tipo, telefone, email, status")
    .eq("id", dados.anuncioId)
    .maybeSingle();

  if (erroBusca || !anuncio || anuncio.status !== "ativo") {
    return jsonResponse({ erro: "anúncio não encontrado ou não está mais ativo" }, 404);
  }

  const { error: erroInsert } = await supabase.from("interessados").insert({
    anuncio_id: dados.anuncioId,
    nome: dados.nome,
    email: dados.email,
    telefone: dados.telefone,
  });
  if (erroInsert) {
    return jsonResponse({ erro: "falha ao registrar interesse", detalhe: erroInsert.message }, 500);
  }

  const veiculo = TIPO_SINGULAR[anuncio.tipo] ?? "veículo";
  const descricaoVeiculo = `${anuncio.marca} ${anuncio.modelo} ${anuncio.ano_modelo}`;
  const whatsappLink = `https://wa.me/55${String(anuncio.telefone).replace(/\D/g, "")}`;

  await enviarEmail(
    String(dados.email),
    `Contato do vendedor — ${descricaoVeiculo}`,
    `<p>Olá, ${dados.nome}!</p>
     <p>Você demonstrou interesse no ${veiculo} <b>${descricaoVeiculo}</b> anunciado no tabelafipe.site.</p>
     <p>Contato do vendedor: <b>${anuncio.telefone}</b></p>
     <p><a href="${whatsappLink}">Falar no WhatsApp</a></p>`,
  );

  if (anuncio.email) {
    await enviarEmail(
      String(anuncio.email),
      `Novo interessado no seu anúncio — ${descricaoVeiculo}`,
      `<p>Alguém se interessou pelo seu anúncio do ${veiculo} <b>${descricaoVeiculo}</b>!</p>
       <p>Nome: <b>${dados.nome}</b><br>
       Telefone: <b>${dados.telefone}</b><br>
       Email: <b>${dados.email}</b></p>
       <p>Veja todos os interessados no seu painel: <a href="${SITE_URL}/vendedor.html">${SITE_URL}/vendedor.html</a></p>`,
    );
  }

  return jsonResponse({ ok: true });
});
