// Emendas parlamentares individuais (Portal da Transparência / CGU), por parlamentar e município.
// Uso: node scripts/emendas.mjs /tmp/emendas.zip
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, writeFile, rm } from "node:fs/promises";

const ZIP = process.argv[2] || "/tmp/emendas.zip";
const SAIDA = "site/emendas";
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
const proc = spawn("unzip", ["-p", ZIP, csv]);
const rl = createInterface({ input: proc.stdout.setEncoding("latin1"), crlfDelay: Infinity });
let cab = null, ix = {}, linhas = 0, usadas = 0;
const naoAchei = new Map();
const R = {}; // chave -> { lugar -> {m, uf, e, p, areas:Set} }
for await (const linha of rl) {
  if (!cab) {
    cab = campos(linha.replace(/^﻿/, "")).map(norm);
    const acha = (...nomes) => cab.findIndex(c => nomes.some(n => c === norm(n)));
    ix = { ano: acha("Ano da Emenda"), tipo: acha("Tipo de Emenda", "Tipo da Emenda"), autor: acha("Nome do Autor da Emenda"), mun: acha("Município", "Nome Município"), uf: acha("UF", "Nome UF"), loc: acha("Localidade do Gasto", "Localidade de aplicação do recurso"), funcao: acha("Nome Função"), emp: acha("Valor Empenhado"), pago: acha("Valor Pago"), rpp: acha("Valor Restos A Pagar Pagos") };
    console.log("Colunas:", JSON.stringify(ix));
    if (ix.autor < 0 || ix.emp < 0) throw new Error("Colunas não encontradas: " + cab.join(" | "));
    continue;
  }
  linhas++;
  const f = campos(linha);
  if (+f[ix.ano] < DESDE) continue;
  if (ix.tipo >= 0 && !/individual/i.test(f[ix.tipo] || "")) continue;
  const autor = norm(f[ix.autor]);
  const k = quem.get(autor);
  if (!k) { naoAchei.set(autor, (naoAchei.get(autor) || 0) + 1); continue; }
  usadas++;
  let m = (f[ix.mun] || "").trim(), uf = (f[ix.uf] || "").trim();
  if (!m) m = (f[ix.loc] || "Sem local definido").trim();
  const lugar = m + "|" + uf;
  const o = ((R[k] ??= {})[lugar] ??= { m, uf, e: 0, p: 0, areas: new Set() });
  o.e += num(f[ix.emp]); o.p += num(f[ix.pago]) + (ix.rpp >= 0 ? num(f[ix.rpp]) : 0);
  if (f[ix.funcao]) o.areas.add(f[ix.funcao].trim().toLowerCase().replace(/^./, c => c.toUpperCase()));
}
console.log(linhas, "linhas lidas,", usadas, "emendas individuais de parlamentares atuais");
console.log("Autores sem correspondência (mais comuns):", [...naoAchei].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([n, q]) => `${n}(${q})`).join(", "));

// UF: o CSV traz o nome do estado; o app usa a sigla
const UFS = { ACRE: "AC", ALAGOAS: "AL", AMAPA: "AP", AMAZONAS: "AM", BAHIA: "BA", CEARA: "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", GOIAS: "GO", MARANHAO: "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG", PARA: "PA", PARAIBA: "PB", PARANA: "PR", PERNAMBUCO: "PE", PIAUI: "PI", "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", RONDONIA: "RO", RORAIMA: "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP", SERGIPE: "SE", TOCANTINS: "TO" };
await rm(SAIDA, { recursive: true, force: true });
await mkdir(SAIDA, { recursive: true });
let n = 0;
for (const [k, lugares] of Object.entries(R)) {
  const cidades = Object.values(lugares).map(o => ({ m: o.m, uf: UFS[norm(o.uf)] || o.uf, e: Math.round(o.e), p: Math.round(o.p), areas: [...o.areas].slice(0, 4) })).filter(c => c.e > 0 || c.p > 0).sort((a, b) => b.e - a.e);
  const empenhado = cidades.reduce((t, c) => t + c.e, 0), pago = cidades.reduce((t, c) => t + c.p, 0);
  await writeFile(`${SAIDA}/${k}.json`, JSON.stringify({ periodo: `${DESDE} a ${new Date().getFullYear()}`, atualizado: new Date().toISOString(), empenhado, pago, cidades }));
  n++;
}
console.log(n, "parlamentares com emendas gravados");
if (n < 100) throw new Error("Poucos parlamentares encontrados — conferir nomes/colunas antes de publicar");
