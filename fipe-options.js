// api/fipe-options.js
// GET /api/fipe-options?tipo=carros&campo=marcas
// GET /api/fipe-options?tipo=carros&campo=modelos&marca=VW+-+VolksWagen
// GET /api/fipe-options?tipo=carros&campo=anos&marca=...&modelo=...
//
// Usa a Parallelum direto porque isso é só listagem de catálogo (barato),
// o fallback entre fontes fica reservado pra consulta de preço mesmo
// (ver api/fipe-lookup.js).

const TIPO_PATH = { carros: "cars", motos: "motorcycles", caminhoes: "trucks" };
const BASE = "https://fipe.parallelum.com.br/api/v2";

module.exports = async (req, res) => {
  const { tipo, campo, marca, modelo } = req.query;
  const tipoPath = TIPO_PATH[tipo];
  if (!tipoPath) return res.status(400).json({ erro: "tipo inválido" });

  try {
    if (campo === "marcas") {
      const marcas = await fetch(`${BASE}/${tipoPath}/brands`).then((r) => r.json());
      return res.status(200).json(marcas.map((m) => ({ nome: m.name, codigo: m.code })));
    }

    if (campo === "modelos") {
      if (!marca) return res.status(400).json({ erro: "marca é obrigatória" });
      const marcas = await fetch(`${BASE}/${tipoPath}/brands`).then((r) => r.json());
      const marcaObj = marcas.find((m) => m.name.toLowerCase() === marca.toLowerCase());
      if (!marcaObj) return res.status(404).json({ erro: "marca não encontrada" });

      const modelos = await fetch(
        `${BASE}/${tipoPath}/brands/${marcaObj.code}/models`
      ).then((r) => r.json());
      return res.status(200).json(modelos.map((m) => ({ nome: m.name, codigo: m.code })));
    }

    if (campo === "anos") {
      if (!marca || !modelo) return res.status(400).json({ erro: "marca e modelo são obrigatórios" });
      const marcas = await fetch(`${BASE}/${tipoPath}/brands`).then((r) => r.json());
      const marcaObj = marcas.find((m) => m.name.toLowerCase() === marca.toLowerCase());
      if (!marcaObj) return res.status(404).json({ erro: "marca não encontrada" });

      const modelos = await fetch(
        `${BASE}/${tipoPath}/brands/${marcaObj.code}/models`
      ).then((r) => r.json());
      const modeloObj = modelos.find((m) => m.name.toLowerCase() === modelo.toLowerCase());
      if (!modeloObj) return res.status(404).json({ erro: "modelo não encontrado" });

      const anos = await fetch(
        `${BASE}/${tipoPath}/brands/${marcaObj.code}/models/${modeloObj.code}/years`
      ).then((r) => r.json());
      return res.status(200).json(anos.map((a) => ({ label: a.name, valor: a.code })));
    }

    return res.status(400).json({ erro: "campo inválido" });
  } catch (err) {
    return res.status(502).json({ erro: "falha ao consultar catálogo", detalhe: err.message });
  }
};
