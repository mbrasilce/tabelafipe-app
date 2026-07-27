// supabase/functions/gerar-anuncio/index.ts
// POST { tipo, marca, modelo, anoModelo, valorFipe, cor, quilometragem,
//        pneus, estofados, extra?, nome, telefone }
// Gera o texto de um anúncio de venda usando a API nativa do Gemini
// (generativelanguage.googleapis.com). A chave fica só aqui no servidor,
// nunca é exposta ao navegador.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

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
  return `Você é um redator especialista em anúncios de veículos usados para sites como OLX e Webmotors.
Escreva um texto de anúncio curto (até 120 palavras), atrativo e confiável, para vender o veículo abaixo.
Use frases curtas, no máximo 2 emojis, destaque os pontos fortes e termine com uma chamada para contato.
Não invente nenhum dado que não foi informado abaixo, nem prometa garantias ou revisões não mencionadas.

Dados do veículo:
- Tipo: ${d.tipo ?? "não informado"}
- Marca: ${d.marca}
- Modelo: ${d.modelo}
- Ano modelo: ${d.anoModelo}
- Valor de referência FIPE: ${d.valorFipe ?? "não informado"}
- Cor: ${d.cor ?? "não informada"}
- Quilometragem: ${d.quilometragem ?? "não informada"}
- Pneus: ${d.pneus ?? "não informado"}
- Estofados/bancos: ${d.estofados ?? "não informado"}
- Outras informações: ${d.extra || "nenhuma"}

Dados de contato (inclua ao final do anúncio):
- Nome: ${d.nome}
- Telefone/WhatsApp: ${d.telefone}`;
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

  const obrigatorios = ["marca", "modelo", "anoModelo", "nome", "telefone"];
  const faltando = obrigatorios.filter((k) => !dados[k]);
  if (faltando.length) {
    return jsonResponse({ erro: `parâmetros obrigatórios faltando: ${faltando.join(", ")}` }, 400);
  }

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
    const texto = json.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";

    if (!texto) {
      return jsonResponse({ erro: "Gemini não retornou texto" }, 502);
    }

    return jsonResponse({ texto });
  } catch (err) {
    return jsonResponse({ erro: "falha inesperada ao gerar o anúncio", detalhe: String(err) }, 500);
  }
});
