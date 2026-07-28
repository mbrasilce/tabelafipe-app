// supabase/functions/gerar-anuncio/index.ts
// POST { tipo, marca, modelo, anoModelo, valorFipe, valorDesejado, estado,
//        cidade, cor, quilometragem, pneus, estofados, telefone, email,
//        publicar? }
// Gera o texto de um anúncio de venda usando a API nativa do Gemini
// (generativelanguage.googleapis.com). A chave fica só aqui no servidor,
// nunca é exposta ao navegador. Se `publicar` for true, grava o anúncio
// na tabela `anuncios` (usada pela página pública /anuncios.html) e
// garante uma conta no Supabase Auth pro vendedor (convite por email
// com link de criar senha, pra ele acessar /vendedor.html).

import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// TODO: trocar para https://tabelafipe.site quando o domínio estiver 100% propagado.
const SITE_URL = "https://tabelafipe-app-psi.vercel.app";

// Injetadas automaticamente pelo Supabase em toda Edge Function.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Garante que existe uma conta pro vendedor (convite por email com link de
// criar senha) e devolve o user_id, criando ou reaproveitando a existente.
async function garantirContaVendedor(email: string): Promise<string | null> {
  const convite = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/definir-senha.html`,
  });

  if (!convite.error && convite.data.user) {
    return convite.data.user.id;
  }

  // Já tem conta (email repetido) — busca o id existente pra reaproveitar.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const existente = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return existente?.id ?? null;
}

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

function montarPrompt(d: Record<string, unknown>) {
  const veiculo = TIPO_SINGULAR[d.tipo as string] ?? "veículo";

  return `Você é um redator especialista em anúncios de ${veiculo}s usados para sites como OLX e Webmotors.
Escreva um texto de anúncio curto (até 130 palavras), atrativo e confiável, para vender o ${veiculo} abaixo.
Use frases curtas, no máximo 2 emojis, destaque os pontos fortes.
Se o valor desejado for informado, mencione-o com naturalidade (pode comparar com o valor de referência FIPE se fizer sentido, sem soar como desculpa).
Não invente nenhum dado que não foi informado abaixo, nem prometa garantias ou revisões não mencionadas.
IMPORTANTE: não inclua telefone, e-mail, WhatsApp ou qualquer forma de contato no texto — isso é exibido separadamente pela página, fora do seu texto. Termine o anúncio destacando o veículo, sem chamada para contato.

Dados do ${veiculo}:
- Marca: ${d.marca}
- Modelo: ${d.modelo}
- Ano modelo: ${d.anoModelo}
- Valor de referência FIPE: ${d.valorFipe ?? "não informado"}
- Valor desejado pelo vendedor: ${d.valorDesejado ?? "não informado"}
- Cor: ${d.cor ?? "não informada"}
- Quilometragem: ${d.quilometragem ?? "não informada"}
- Pneus: ${d.pneus ?? "não informado"}
- Estofados/bancos: ${d.estofados ?? "não informado"}
- Cidade/Estado: ${[d.cidade, d.estado].filter(Boolean).join(" - ") || "não informado"}`;
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

  const obrigatorios = ["marca", "modelo", "anoModelo", "telefone"];
  const faltando = obrigatorios.filter((k) => !dados[k]);
  if (faltando.length) {
    return jsonResponse({ erro: `parâmetros obrigatórios faltando: ${faltando.join(", ")}` }, 400);
  }

  let texto = "";
  try {
    const resp = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: montarPrompt(dados) }] }],
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      return jsonResponse({ erro: "falha ao consultar o Gemini", detalhe }, 502);
    }

    const json = await resp.json();
    texto = json.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";

    if (!texto) {
      return jsonResponse({ erro: "Gemini não retornou texto" }, 502);
    }
  } catch (err) {
    return jsonResponse({ erro: "falha inesperada ao gerar o anúncio", detalhe: String(err) }, 500);
  }

  let publicado = false;
  if (dados.publicar) {
    const userId = dados.email ? await garantirContaVendedor(String(dados.email)) : null;

    const { error } = await supabase.from("anuncios").insert({
      tipo: dados.tipo,
      marca: dados.marca,
      modelo: dados.modelo,
      ano_modelo: dados.anoModelo,
      valor_fipe: dados.valorFipe ?? null,
      valor_desejado: dados.valorDesejado ?? null,
      estado: dados.estado ?? null,
      cidade: dados.cidade ?? null,
      cor: dados.cor ?? null,
      quilometragem: dados.quilometragem ?? null,
      pneus: dados.pneus ?? null,
      estofados: dados.estofados ?? null,
      telefone: dados.telefone,
      email: dados.email ?? null,
      texto,
      user_id: userId,
      status: "ativo",
      publicado_em: new Date().toISOString(),
    });
    publicado = !error;
  }

  return jsonResponse({ texto, publicado });
});
