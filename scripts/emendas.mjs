// Emendas parlamentares individuais (Portal da Transparência / CGU), por parlamentar e município.
// Uso: node scripts/emendas.mjs /tmp/emendas.zip
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, writeFile, rm } from "node:fs/promises";

const ZIP = process.argv[2] || "/tmp/emendas.zip";
const SAIDA = process.argv[3] || "site/dados/emendas";
const DESDE = 2023; // mandato atual
const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
const num = t => +String(t || "0").replace(/\./g, "").replace(",", ".") || 0;

async function pegar(url) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { headers: { Accept: "application/json" } }); if (r.ok) return r.json(); } catch (e) {}
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}

// 1) quem são os parlamentares de hoje
const deps = (await pegar("https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1000&ordem=ASC&ordenarPor=nome"))?.dados ?? [];
const senJ = await pegar("https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json");
let sens = senJ?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
if (!Array.isArray(sens)) sens = [sens];
if (!deps.length) throw new Error("Não veio a lista de deputados");
const quem = new Map(); // nome normalizado -> chave
for (const d of deps) quem.set(norm(d.nome), "d" + d.id);
for (const s of sens) { const id = s.IdentificacaoParlamentar || {}; if (id.NomeParlamentar) quem.set(norm(id.NomeParlamentar), "s" + id.CodigoParlamentar); }
console.log(deps.length, "deputados,", sens.length, "senadores");

// 2) acha o CSV certo dentro do zip
const arquivos = execFileSync("unzip", ["-Z1", ZIP]).toString().split("\n").filter(Boolean);
console.log("No zip:", arquivos.join(" | "));
const csv = arquivos.find(a => /\.csv$/i.test(a) && !/conv|favorec|document/i.test(a)) || arquivos.find(a => /\.csv$/i.test(a));
if (!csv) throw new Error("Sem CSV no zip");

// 3) lê linha a linha (latin1, separado por ;)
const campos = l => { const out = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === ";" && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
async function lerCSV(nome, cadaLinha) {
  const proc = spawn("unzip", ["-p", ZIP, nome]);
  const rl = createInterface({ input: proc.stdout.setEncoding("latin1"), crlfDelay: Infinity });
  let cab = null, n = 0;
  for await (const linha of rl) {
    if (!cab) { cab = campos(linha.replace(/^\uFEFF/, "")).map(norm); console.log(nome, "colunas:", cab.join(" | ")); continue; }
    n++; const f = campos(linha);
    const g = (...nomes) => { for (const x of nomes) { const k = cab.indexOf(norm(x)); if (k >= 0) return f[k] || ""; } return ""; };
    cadaLinha(g);
  }
  console.log(nome, n, "linhas");
}
const naoAchei = new Map();
const quemE = g => { const autor = norm(g("Nome do Autor da Emenda")); const k = quem.get(autor); if (!k) naoAchei.set(autor, (naoAchei.get(autor) || 0) + 1); return k; };
const individual = g => /individual/i.test(g("Tipo de Emenda", "Tipo da Emenda"));
const anoDe = t => +(String(t).match(/(20\d\d)/)?.[1] || 0);

// 3a) totais por parlamentar (empenhado e pago)
const TOT = {};
await lerCSV(csv, g => {
  if (anoDe(g("Ano da Emenda")) < DESDE || !individual(g)) return;
  const k = quemE(g); if (!k) return;
  const o = (TOT[k] ??= { e: 0, p: 0, areas: {} });
  o.e += num(g("Valor Empenhado")); o.p += num(g("Valor Pago")) + num(g("Valor Restos A Pagar Pagos"));
  const fn = g("Nome Função").trim(); if (fn) o.areas[fn] = (o.areas[fn] || 0) + num(g("Valor Empenhado"));
});
// 3b) quanto cada cidade recebeu de fato (arquivo por favorecido)
const R = {};
const fav = arquivos.find(a => /favorec/i.test(a) && /\.csv$/i.test(a));
if (fav) await lerCSV(fav, g => {
  if (anoDe(g("Ano/Mês", "Ano Mes", "Mes Ano")) < DESDE || !individual(g)) return;
  const k = quemE(g); if (!k) return;
  const m = g("Município Favorecido").trim() || "Sem cidade informada", uf = g("UF Favorecido").trim();
  const o = ((R[k] ??= {})[m + "|" + uf] ??= { m, uf, p: 0, quem: {} });
  const v = num(g("Valor Recebido")); o.p += v;
  const fv = g("Favorecido").trim(); if (fv) o.quem[fv] = (o.quem[fv] || 0) + v;
});
else console.log("Sem arquivo por favorecido no zip");
console.log("Autores sem correspondência (mais comuns):", [...naoAchei].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([n, q]) => `${n}(${q})`).join(", "));

// UF: o CSV traz o nome do estado; o app usa a sigla
const UFS = { ACRE: "AC", ALAGOAS: "AL", AMAPA: "AP", AMAZONAS: "AM", BAHIA: "BA", CEARA: "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", GOIAS: "GO", MARANHAO: "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG", PARA: "PA", PARAIBA: "PB", PARANA: "PR", PERNAMBUCO: "PE", PIAUI: "PI", "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", RONDONIA: "RO", RORAIMA: "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP", SERGIPE: "SE", TOCANTINS: "TO" };
await rm(SAIDA, { recursive: true, force: true });
await mkdir(SAIDA, { recursive: true });
let n = 0;
const cap = t => t.toLowerCase().replace(/^./, c => c.toUpperCase());
for (const k of new Set([...Object.keys(TOT), ...Object.keys(R)])) {
  const t = TOT[k] || { e: 0, p: 0, areas: {} };
  const cidades = Object.values(R[k] || {}).map(o => ({ m: o.m, uf: UFS[norm(o.uf)] || o.uf, p: Math.round(o.p), quem: Object.entries(o.quem).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([q]) => q) })).filter(c => c.p > 0).sort((a, b) => b.p - a.p);
  const areas = Object.entries(t.areas).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => cap(a));
  await writeFile(`${SAIDA}/${k}.json`, JSON.stringify({ periodo: `${DESDE} a ${new Date().getFullYear()}`, atualizado: new Date().toISOString(), empenhado: Math.round(t.e), pago: Math.round(t.p), areas, cidades }));
  n++;
}
console.log(n, "parlamentares com emendas gravados");
if (n < 100) throw new Error("Poucos parlamentares encontrados — conferir nomes/colunas antes de publicar");
