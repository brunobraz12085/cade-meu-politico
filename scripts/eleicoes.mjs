// Cadê Meu Político? — resultados das eleições a partir dos arquivos do TSE.
// Uso: node scripts/eleicoes.mjs GO [pasta-com-os-zips]
// Gera site/eleicoes/{2024,2026}/UF/... (roda uma vez; os resultados não mudam mais)
// Fonte: Portal de Dados Abertos do TSE (cdn.tse.jus.br)

import { spawn, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UF = (process.argv[2] || "GO").toUpperCase();
const PASTA = process.argv[3] || "tse";
const SAIDA = "site/eleicoes";
const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const CARGOS = { 1: "presidente", 3: "governador", 5: "senador", 6: "depFederal", 7: "depEstadual", 11: "prefeito", 13: "vereador" };

function baixar(nome, url) {
  const arq = `${PASTA}/${nome}`;
  if (!existsSync(arq)) {
    console.log("Baixando", url);
    execSync(`mkdir -p ${PASTA} && curl -sSL --retry 3 -o ${arq} ${url}`, { stdio: "inherit" });
  }
  return arq;
}

const csv = l => { const o = []; let i = 0; while (i < l.length) { if (l[i] === '"') { let j = i + 1, v = ""; while (j < l.length) { if (l[j] === '"') { if (l[j + 1] === '"') { v += '"'; j += 2; continue; } break; } v += l[j++]; } o.push(v); i = j + 2; } else { let j = l.indexOf(";", i); if (j < 0) j = l.length; o.push(l.slice(i, j)); i = j + 1; } } return o; };
// Lê CSVs de dentro do zip (latin1, separador ;) linha a linha
async function lerZip(zip, padrao, cadaLinha) {
  const p = spawn("unzip", ["-p", zip, padrao, "-x", "*BRASIL*"]);
  p.stdout.setEncoding("latin1");
  const rl = createInterface({ input: p.stdout, crlfDelay: Infinity });
  let cab = null, n = 0;
  for await (const bruta of rl) {
    if (!bruta) continue;
    const campos = csv(bruta.replace(/\r$/, ""));
    if (campos[0] === "DT_GERACAO") { cab = Object.fromEntries(campos.map((c, i) => [c, i])); continue; }
    if (!cab) continue;
    cadaLinha(c => campos[cab[c]], n++);
  }
  console.log("   ", n, "linhas de", padrao);
}

const limpo = v => (!v || /^#(NULO|NE)#?$/i.test(v) || v === "-1") ? "" : v.trim();
const soma = (obj, chave, v) => { obj[chave] = (obj[chave] || 0) + v; };
const ordena = lista => lista.sort((a, b) => b.votos - a.votos);
const eleito = s => /^ELEITO/.test(s || "");

// ---------- Totais por candidato (município/zona) ----------
async function lerMunzona(ano, cargosQueQuero, ufsQueQuero) {
  const zip = baixar(`munzona_${ano}.zip`, `${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`);
  // chave: uf|cargo|turno|municipio|sq  -> {nome, partido, sit, votos}
  const porMun = new Map();
  await lerZip(zip, `votacao_candidato_munzona_${ano}_*.csv`, g => {
    const uf = g("SG_UF"), cargo = +g("CD_CARGO");
    if (!cargosQueQuero.includes(cargo)) return;
    if (ufsQueQuero && !ufsQueQuero.includes(uf) && cargo !== 1) return;
    const k = [uf, cargo, g("NR_TURNO"), g("CD_MUNICIPIO"), g("SQ_CANDIDATO")].join("|");
    let r = porMun.get(k);
    if (!r) porMun.set(k, r = { nome: g("NM_URNA_CANDIDATO"), partido: g("SG_PARTIDO"), numero: g("NR_CANDIDATO"), sit: g("DS_SIT_TOT_TURNO"), mun: g("NM_MUNICIPIO"), fed: limpo(g("SG_FEDERACAO")), fedNome: limpo(g("NM_FEDERACAO")), colig: limpo(g("DS_COMPOSICAO_COLIGACAO")), votos: 0 });
    const vv = g("QT_VOTOS_NOMINAIS_VALIDOS");
    r.votos += +(vv !== undefined ? vv : g("QT_VOTOS_NOMINAIS")) || 0;
  });
  return porMun;
}

// agrega o mapa por (uf,cargo,turno) => lista de candidatos somada, e por município
function agrupar(porMun) {
  const estado = {}, municipio = {}, nomesMun = {};
  for (const [k, r] of porMun) {
    const [uf, cargo, turno, mun, sq] = k.split("|");
    if (uf === UF) nomesMun[mun] = r.mun;
    const ke = `${uf}|${cargo}|${turno}`;
    ((estado[ke] ??= {})[sq] ??= { nome: r.nome, partido: r.partido, numero: r.numero, sit: r.sit, fed: r.fed, fedNome: r.fedNome, colig: r.colig, votos: 0 }).votos += r.votos;
    const km = `${mun}|${cargo}|${turno}`;
    ((municipio[km] ??= {})[sq] ??= { nome: r.nome, partido: r.partido, numero: r.numero, sit: r.sit, fed: r.fed, fedNome: r.fedNome, colig: r.colig, votos: 0 }).votos += r.votos;
  }
  const lista = o => ordena(Object.values(o));
  return { estado: Object.fromEntries(Object.entries(estado).map(([k, v]) => [k, lista(v)])), municipio: Object.fromEntries(Object.entries(municipio).map(([k, v]) => [k, lista(v)])), nomesMun };
}

// ---------- Resultado por local de votação (escola) ----------
async function lerSecao(ano, arquivo, cargos, ufFiltro) {
  const zip = baixar(`secao_${ano}_${arquivo}.zip`, `${CDN}/votacao_secao/votacao_secao_${ano}_${arquivo}.zip`);
  const locais = {}; // mun -> "zona|local" -> {nome, end, secoes:Set, votos: {cargo|turno: {nome: votos}}}
  await lerZip(zip, "*.csv", g => {
    if (ufFiltro && g("SG_UF") !== ufFiltro) return;
    const cargo = +g("CD_CARGO");
    if (!cargos.includes(cargo)) return;
    const mun = g("CD_MUNICIPIO"), kl = `${g("NR_ZONA")}|${g("NR_LOCAL_VOTACAO")}`;
    const L = ((locais[mun] ??= {})[kl] ??= { zona: g("NR_ZONA"), nome: g("NM_LOCAL_VOTACAO"), end: g("DS_LOCAL_VOTACAO_ENDERECO"), secoes: new Set(), votos: {} });
    L.secoes.add(g("NR_SECAO"));
    const q = +g("QT_VOTOS") || 0, kc = `${CARGOS[cargo]}|${g("NR_TURNO")}`;
    soma((L.votos[kc] ??= {}), g("NM_VOTAVEL"), q);
    if ([6, 7, 13].includes(cargo)) { const nr = String(g("NR_VOTAVEL") || ""); if (/^\d+$/.test(nr) && !["95", "96", "97"].includes(nr)) soma(((L.partidos ??= {})[kc] ??= {}), nr.slice(0, 2), q); }
  });
  // vira listas ordenadas e enxutas
  const saida = {};
  for (const [mun, ls] of Object.entries(locais)) {
    saida[mun] = Object.values(ls).map(L => ({
      zona: L.zona, nome: L.nome, end: L.end, secoes: L.secoes.size,
      votos: Object.fromEntries(Object.entries(L.votos).map(([k, o]) => [k, Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 25)])),
      partidos: L.partidos ? Object.fromEntries(Object.entries(L.partidos).map(([k, o]) => [k, Object.entries(o).sort((a, b) => b[1] - a[1])])) : undefined
    })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
  return saida;
}

// Votos de legenda (no número do partido) por município
async function lerLegenda(ano, cargos, uf) {
  const leg = {}; // mun|cargo -> {siglaPartido: votos}
  try {
    const zip = baixar(`partido_${ano}.zip`, `${CDN}/votacao_partido_munzona/votacao_partido_munzona_${ano}.zip`);
    await lerZip(zip, `votacao_partido_munzona_${ano}_${uf}.csv`, g => {
      const cargo = +g("CD_CARGO"); if (!cargos.includes(cargo) || g("NR_TURNO") !== "1") return;
      soma((leg[`${g("CD_MUNICIPIO")}|${cargo}`] ??= {}), g("SG_PARTIDO"), +g("QT_VOTOS_LEGENDA_VALIDOS") || 0);
    });
  } catch (e) { console.warn("Sem votos de legenda:", e.message); }
  return leg;
}
// Resumo por partido/federação de um cargo proporcional (vereador, deputado)
function porPartido(cands, legenda = {}) {
  const P = {};
  for (const c of cands) {
    const k = c.fed || c.partido;
    const p = (P[k] ??= { sigla: k, nome: c.fed ? (c.fedNome || c.fed) : c.partido, federacao: !!c.fed, partidos: [], nominais: 0, legenda: 0, cadeiras: 0, candidatos: 0 });
    if (!p.partidos.includes(c.partido)) p.partidos.push(c.partido);
    p.nominais += c.votos; p.candidatos++; if (eleito(c.sit)) p.cadeiras++;
  }
  const fedDe = Object.fromEntries(cands.map(c => [c.partido, c.fed || c.partido]));
  for (const [sigla, v] of Object.entries(legenda)) { const k = fedDe[sigla] || sigla; (P[k] ??= { sigla: k, nome: k, federacao: false, partidos: [sigla], nominais: 0, legenda: 0, cadeiras: 0, candidatos: 0 }).legenda += v; }
  const lista = Object.values(P).map(p => ({ ...p, total: p.nominais + p.legenda })).sort((a, b) => b.cadeiras - a.cadeiras || b.total - a.total);
  const validos = lista.reduce((t, p) => t + p.total, 0), vagas = lista.reduce((t, p) => t + p.cadeiras, 0);
  const qe = vagas ? Math.round(validos / vagas) : 0;
  return { validos, vagas, quociente: qe, lista };
}
const enxuto = c => { const o = { nome: c.nome, partido: c.partido, numero: c.numero, sit: c.sit, votos: c.votos }; if (c.fed) o.fed = c.fed; return o; };

const turnos = (fonte, chave, cargo) => {
  const t = {};
  for (const n of ["1", "2"]) { const l = fonte[`${chave}|${cargo}|${n}`]; if (l?.length) t[n] = l; }
  return t;
};
const so = (l, f) => (l || []).filter(f);

async function gravar(caminho, dados) {
  await mkdir(caminho.replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(caminho, JSON.stringify(dados));
}

// ---------- 2024: prefeito e vereador ----------
async function ano2024() {
  console.log(`2024 · ${UF}`);
  const { municipio, nomesMun } = agrupar(await lerMunzona(2024, [11, 13], [UF]));
  const locais = await lerSecao(2024, UF, [11, 13], UF);
  const legenda = await lerLegenda(2024, [13], UF);
  const indice = [];
  for (const [cd, nome] of Object.entries(nomesMun).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))) {
    const prefeito = turnos(municipio, cd, 11);
    const ver = municipio[`${cd}|13|1`] || [];
    const eleitoPref = so(prefeito[2] || prefeito[1], c => eleito(c.sit))[0];
    indice.push({ cd, nome, prefeito: eleitoPref ? `${eleitoPref.nome} (${eleitoPref.partido})` : "" });
    await gravar(`${SAIDA}/2024/${UF}/m/${cd}.json`, {
      cd, nome, ano: 2024,
      prefeito,
      vereadores: { eleitos: so(ver, c => eleito(c.sit)).map(enxuto), todos: ver.map(enxuto), partidos: porPartido(ver, legenda[`${cd}|13`]) },
      locais: locais[cd] || []
    });
  }
  await gravar(`${SAIDA}/2024/${UF}/index.json`, indice);
  console.log("   ", indice.length, "municípios");
}

// ---------- 2026: presidente, governador, senador, deputados ----------
async function ano2026() {
  console.log(`2026 · ${UF}`);
  const { estado, municipio, nomesMun } = agrupar(await lerMunzona(2026, [1, 3, 5, 6, 7], [UF]));
  // presidente no Brasil: soma de todos os estados
  const brasil = {};
  for (const [k, lista] of Object.entries(estado)) {
    const [, cargo, turno] = k.split("|");
    if (cargo !== "1") continue;
    for (const c of lista) ((brasil[turno] ??= {})[c.nome] ??= { ...c, votos: 0 }).votos += c.votos;
  }
  const brasilL = Object.fromEntries(Object.entries(brasil).map(([t, o]) => [t, ordena(Object.values(o))]));
  await gravar(`${SAIDA}/2026/brasil.json`, { presidente: brasilL });
  const legenda = await lerLegenda(2026, [6, 7], UF);
  const somaLeg = (L, cargo) => { const o = {}; for (const [k, v] of Object.entries(L)) if (k.endsWith(`|${cargo}`)) for (const [p, q] of Object.entries(v)) soma(o, p, q); return o; };

  await gravar(`${SAIDA}/2026/${UF}/estado.json`, {
    uf: UF,
    presidente: turnos(estado, UF, 1),
    governador: turnos(estado, UF, 3),
    senador: turnos(estado, UF, 5),
    depFederal: { eleitos: so(estado[`${UF}|6|1`], c => eleito(c.sit)), maisVotados: (estado[`${UF}|6|1`] || []).slice(0, 40), partidos: porPartido(estado[`${UF}|6|1`] || [], somaLeg(legenda, 6)) },
    depEstadual: { eleitos: so(estado[`${UF}|7|1`], c => eleito(c.sit)), maisVotados: (estado[`${UF}|7|1`] || []).slice(0, 60), partidos: porPartido(estado[`${UF}|7|1`] || [], somaLeg(legenda, 7)) }
  });

  const locais = await lerSecao(2026, UF, [1, 3, 5, 6, 7], UF);
  const indice = [];
  for (const [cd, nome] of Object.entries(nomesMun).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))) {
    indice.push({ cd, nome });
    await gravar(`${SAIDA}/2026/${UF}/m/${cd}.json`, {
      cd, nome, ano: 2026,
      presidente: turnos(municipio, cd, 1),
      governador: turnos(municipio, cd, 3),
      senador: turnos(municipio, cd, 5),
      depFederal: { todos: (municipio[`${cd}|6|1`] || []).map(enxuto), partidos: porPartido(municipio[`${cd}|6|1`] || [], legenda[`${cd}|6`]).lista },
      depEstadual: { todos: (municipio[`${cd}|7|1`] || []).map(enxuto), partidos: porPartido(municipio[`${cd}|7|1`] || [], legenda[`${cd}|7`]).lista },
      locais: locais[cd] || []
    });
  }
  await gravar(`${SAIDA}/2026/${UF}/index.json`, indice);
  console.log("   ", indice.length, "municípios");
}

const quais = (process.env.ANOS || "2024,2026").split(",");
if (quais.includes("2024")) await ano2024();
if (quais.includes("2026")) await ano2026();
console.log("Pronto!");
