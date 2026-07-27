// api/fipe-lookup.js
// POST { tipo, marca, modelo, anoModelo, combustivel? }
// Fluxo: 1) cache no Supabase -> 2) fontes externas em ordem, pulando
// qualquer uma que já estourou a quota do período, até uma responder.

const { createClient } = require("@supabase/supabase-js");
const { FONTES } = require("./lib/sources");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function periodoAtual(tipoPeriodo) {
  const agora = new Date().toISOString();
  return tipoPeriodo === "mensal" ? agora.slice(0, 7) : agora.slice(0, 10);
}

async function fonteDisponivel(fonte) {
  const periodo = periodoAtual(fonte.periodo);
  const { data } = await supabase
    .from("fontes_quota")
    .select("requisicoes")
    .eq("fonte", fonte.nome)
    .eq("periodo", periodo)
    .maybeSingle();

  return !data || data.requisicoes < fonte.limite;
}

async function registrarUso(fonte) {
  const periodo = periodoAtual(fonte.periodo);
  await supabase.rpc("incrementar_quota", {
    p_fonte: fonte.nome,
    p_periodo: periodo,
    p_limite: fonte.limite,
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { tipo, marca, modelo, anoModelo, combustivel } = req.body;
  if (!tipo || !marca || !modelo || !anoModelo) {
    return res.status(400).json({ erro: "parâmetros obrigatórios faltando" });
  }

  // 1) verifica cache
  const { data: cache } = await supabase
    .from("veiculos_cache")
    .select("*")
    .eq("tipo", tipo)
    .ilike("marca", marca)
    .ilike("modelo", modelo)
    .eq("ano_modelo", anoModelo)
    .maybeSingle();

  if (cache) {
    await supabase.from("buscas_log").insert({
      tipo, marca, modelo, ano_modelo: anoModelo,
      veio_do_cache: true, fonte_usada: cache.fonte,
    });
    return res.status(200).json({ ...cache, veioDoCache: true });
  }

  // 2) percorre as fontes em ordem, pulando as sem quota
  let resultado = null;
  let erroFinal = null;

  for (const fonte of FONTES) {
    if (!(await fonteDisponivel(fonte))) continue;

    try {
      resultado = await fonte.buscarValor({ tipo, marca, modelo, anoModelo, combustivel });
      await registrarUso(fonte);
      break;
    } catch (err) {
      erroFinal = err;
      continue; // tenta a próxima fonte
    }
  }

  if (!resultado) {
    return res.status(502).json({
      erro: "nenhuma fonte conseguiu responder",
      detalhe: erroFinal?.message,
    });
  }

  // 3) grava no cache para as próximas buscas
  await supabase.from("veiculos_cache").upsert({
    tipo,
    marca: resultado.marca,
    modelo: resultado.modelo,
    ano_modelo: resultado.anoModelo,
    combustivel: resultado.combustivel,
    codigo_fipe: resultado.codigoFipe,
    valor: resultado.valor,
    mes_referencia: resultado.mesReferencia,
    fonte: resultado.fonte,
    atualizado_em: new Date().toISOString(),
  });

  await supabase.from("buscas_log").insert({
    tipo, marca, modelo, ano_modelo: anoModelo,
    veio_do_cache: false, fonte_usada: resultado.fonte,
  });

  return res.status(200).json({ ...resultado, veioDoCache: false });
};
