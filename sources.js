// api/lib/sources.js
// Cada fonte tem: nome, limite de requisições, e funções que buscam
// marcas/modelos/anos/valor SEMPRE por nome (texto), nunca por ID interno,
// porque os IDs não são compatíveis entre fontes diferentes.
//
// Toda função de "valor" deve devolver um objeto normalizado:
// { marca, modelo, anoModelo, combustivel, valor, mesReferencia, codigoFipe, fonte }

const TIPO_PATH = {
  carros: "cars",
  motos: "motorcycles",
  caminhoes: "trucks",
};

async function parallelumBuscarValor({ tipo, marca, modelo, anoModelo }) {
  const base = "https://fipe.parallelum.com.br/api/v2";
  const tipoPath = TIPO_PATH[tipo];

  // 1) acha o id da marca pelo nome
  const marcas = await fetch(`${base}/${tipoPath}/brands`).then((r) => r.json());
  const marcaObj = marcas.find(
    (m) => m.name.toLowerCase() === marca.toLowerCase()
  );
  if (!marcaObj) throw new Error("marca não encontrada na Parallelum");

  // 2) acha o id do modelo pelo nome
  const modelos = await fetch(
    `${base}/${tipoPath}/brands/${marcaObj.code}/models`
  ).then((r) => r.json());
  const modeloObj = modelos.find(
    (m) => m.name.toLowerCase() === modelo.toLowerCase()
  );
  if (!modeloObj) throw new Error("modelo não encontrado na Parallelum");

  // 3) acha o ano/combustível compatível
  const anos = await fetch(
    `${base}/${tipoPath}/brands/${marcaObj.code}/models/${modeloObj.code}/years`
  ).then((r) => r.json());
  const anoObj = anos.find((a) => a.name.includes(String(anoModelo)));
  if (!anoObj) throw new Error("ano não encontrado na Parallelum");

  // 4) busca o valor final
  const valor = await fetch(
    `${base}/${tipoPath}/brands/${marcaObj.code}/models/${modeloObj.code}/years/${anoObj.code}`
  ).then((r) => r.json());

  return {
    marca: valor.brand,
    modelo: valor.model,
    anoModelo: valor.modelYear,
    combustivel: valor.fuel,
    valor: valor.price,
    mesReferencia: valor.referenceMonth,
    codigoFipe: valor.codeFipe,
    fonte: "parallelum",
  };
}

// TODO: implementar da mesma forma para fipeapi.com.br (precisa de token)
async function fipeapiBuscarValor(params) {
  throw new Error("fonte fipeapi ainda não implementada");
}

// TODO: implementar da mesma forma para fipe.online (precisa de token)
async function fipeOnlineBuscarValor(params) {
  throw new Error("fonte fipe.online ainda não implementada");
}

// Ordem de prioridade do fallback. O primeiro é o mais barato/estável;
// os seguintes só são chamados se o anterior falhar ou estourar quota.
const FONTES = [
  {
    nome: "parallelum",
    limite: 500,
    periodo: "diario",
    buscarValor: parallelumBuscarValor,
  },
  {
    nome: "fipeapi",
    limite: 1000,
    periodo: "diario",
    buscarValor: fipeapiBuscarValor,
  },
  {
    nome: "fipeonline",
    limite: 1000,
    periodo: "mensal",
    buscarValor: fipeOnlineBuscarValor,
  },
];

module.exports = { FONTES };
