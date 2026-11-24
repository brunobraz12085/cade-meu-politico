// Cadê Meu Político? — busca os dados oficiais e gera os arquivos do site.
// Roda com: node scripts/atualizar.mjs   (Node 20 ou mais novo)
// Fontes: Dados Abertos da Câmara dos Deputados e do Senado Federal.

import { mkdir, writeFile } from "node:fs/promises";

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const SAIDA = "site/dados";
const ANO = new Date().getFullYear();
const DIAS_VOTACOES = 60;      // votações dos últimos 60 dias
const MAX_VOTACOES = 40;       // no máximo 40 votações nominais
const PARALELO = 4;            // pedidos ao mesmo tempo (educado com o servidor)

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const espera = ms => new Promise(r => setTimeout(r, ms));

async function pegar(url, tentativas = 4) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      if (!r.ok) { console.warn("Ignorado", r.status, url); return null; }
      return await r.json();
    } catch (e) {
      if (i === tentativas) { console.warn("Falhou:", url, e.message); return null; }
      await espera(1500 * i);
    }
  }
}

// Busca todas as páginas de um endpoint da Câmara
async function todasPaginas(url) {
  const itens = [];
  for (let p = 1; p < 200; p++) {
    const sep = url.includes("?") ? "&" : "?";
    const j = await pegar(`${url}${sep}itens=100&pagina=${p}`);
    const d = j?.dados ?? [];
    itens.push(...d);
    if (d.length < 100) break;
  }
  return itens;
}

// Executa tarefas com limite de paralelismo
async function emLotes(lista, fn) {
  const res = new Array(lista.length);
  let i = 0;
  await Promise.all(Array.from({ length: PARALELO }, async () => {
    while (i < lista.length) { const k = i++; res[k] = await fn(lista[k], k); }
  }));
  return res;
}

const isoDia = d => d.toISOString().slice(0, 10);
const arred = v => Math.round(v * 100) / 100;

async function main() {
  console.log("1/5 Deputados federais...");
  const deps = (await pegar(`${CAMARA}/deputados?itens=1000&ordem=ASC&ordenarPor=nome`))?.dados ?? [];
  if (!deps.length) throw new Error("Não veio nenhum deputado. Abortando para não publicar site vazio.");
  console.log("   ", deps.length, "deputados");

  console.log("2/5 Senadores...");
  const senJ = await pegar(`${SENADO}/senador/lista/atual.json`);
  const senLista = senJ?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
  const senadores = (Array.isArray(senLista) ? senLista : [senLista]).map(s => {
    const id = s.IdentificacaoParlamentar || {};
    return { id: id.CodigoParlamentar, nome: id.NomeParlamentar, partido: id.SiglaPartidoParlamentar, uf: id.UfParlamentar, foto: id.UrlFotoParlamentar };
  }).filter(s => s.uf);
  console.log("   ", senadores.length, "senadores");

  console.log("3/5 Votações do plenário...");
  const fim = new Date(), ini = new Date(Date.now() - DIAS_VOTACOES * 864e5);
  const listaVot = await todasPaginas(`${CAMARA}/votacoes?idOrgao=180&dataInicio=${isoDia(ini)}&dataFim=${isoDia(fim)}&ordem=DESC&ordenarPor=dataHoraRegistro`);
  const votacoes = [];
  const votosPorDep = {}; // idDeputado -> { idVotacao: "Sim" | "Não" | ... }
  for (const v of listaVot) {
    if (votacoes.length >= MAX_VOTACOES) break;
    const votos = (await pegar(`${CAMARA}/votacoes/${v.id}/votos`))?.dados ?? [];
    if (!votos.length) continue; // votação simbólica, sem voto nominal
    const det = (await pegar(`${CAMARA}/votacoes/${v.id}`))?.dados ?? {};
    const prop = (det.proposicoesAfetadas ?? [])[0];
    const placar = {};
    for (const x of votos) {
      placar[x.tipoVoto] = (placar[x.tipoVoto] ?? 0) + 1;
      const id = x.deputado_?.id; if (!id) continue;
      (votosPorDep[id] ??= {})[v.id] = x.tipoVoto;
    }
    votacoes.push({
      id: v.id,
      data: v.dataHoraRegistro || v.data,
      projeto: prop ? `${prop.siglaTipo} ${prop.numero}/${prop.ano}` : (v.proposicaoObjeto || "Votação no plenário"),
      ementa: prop?.ementa || "",
      descricao: v.descricao || "",
      aprovada: v.aprovacao,
      placar
    });
  }
  console.log("   ", votacoes.length, "votações nominais");

  console.log(`4/5 Gastos da cota em ${ANO} (demora alguns minutos)...`);
  const gastos = {};
  await emLotes(deps, async (d, k) => {
    const itens = await todasPaginas(`${CAMARA}/deputados/${d.id}/despesas?ano=${ANO}&ordem=DESC&ordenarPor=mes`);
    const porTipo = {}, porMes = {};
    let total = 0;
    const maiores = [];
    for (const it of itens) {
      const v = Number(it.valorLiquido) || 0;
      total += v;
      const tipo = (it.tipoDespesa || "OUTROS").replace(/\.$/, "");
      porTipo[tipo] = (porTipo[tipo] ?? 0) + v;
      porMes[it.mes] = (porMes[it.mes] ?? 0) + v;
      maiores.push({ v: arred(v), tipo, forn: it.nomeFornecedor, mes: it.mes, doc: it.urlDocumento || "" });
    }
    maiores.sort((a, b) => b.v - a.v);
    gastos[d.id] = {
      total: arred(total),
      porTipo: Object.fromEntries(Object.entries(porTipo).map(([a, b]) => [a, arred(b)]).sort((a, b) => b[1] - a[1])),
      porMes: Object.fromEntries(Object.entries(porMes).map(([a, b]) => [a, arred(b)])),
      maiores: maiores.slice(0, 10)
    };
    if (k % 50 === 0) console.log(`    ${k}/${deps.length}`);
  });

  console.log("5/5 Gravando arquivos...");
  await mkdir(`${SAIDA}/uf`, { recursive: true });
  const resumo = { atualizado: new Date().toISOString(), ano: ANO, estados: {} };
  for (const uf of UFS) {
    const dUF = deps.filter(d => d.siglaUf === uf).map(d => ({
      id: d.id, nome: d.nome, partido: d.siglaPartido, foto: d.urlFoto,
      votos: votosPorDep[d.id] ?? {}, gastos: gastos[d.id] ?? { total: 0, porTipo: {}, porMes: {}, maiores: [] }
    }));
    const sUF = senadores.filter(s => s.uf === uf);
    resumo.estados[uf] = { deputados: dUF.length, senadores: sUF.length };
    await writeFile(`${SAIDA}/uf/${uf}.json`, JSON.stringify({ uf, atualizado: resumo.atualizado, ano: ANO, deputados: dUF, senadores: sUF }));
  }
  await writeFile(`${SAIDA}/votacoes.json`, JSON.stringify(votacoes));
  await writeFile(`${SAIDA}/resumo.json`, JSON.stringify(resumo));
  console.log("Pronto!");
}

main().catch(e => { console.error(e); process.exit(1); });
