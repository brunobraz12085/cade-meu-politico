// Cadê Meu Político? — telas do site.
// Dados automáticos: site/dados/ (gerados por scripts/atualizar.mjs)
// Conteúdo escrito: site/conteudo/noticias.json e site/conteudo/projetos.json (ver EDITORIAL.md)
{
const NOMES = {AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
const ABAS = [["noticias","Notícias"],["votacoes","Votações"],["politicos","Seus políticos"],["gastos","Gastos"],["eleicoes","Eleições"],["glossario","O que é isso?"]];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const limpa = s => String(s ?? "").replace(/º\?/g, "º ").replace(/°\?/g, "° ").replace(/\?(?=\d)/g, " ");
const brl = v => (v ?? 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL", maximumFractionDigits: 0});
const dataBR = s => s ? new Date(s).toLocaleDateString("pt-BR") : "";
const MESES = ["","jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const cache = {};
let VOT = null, NOT = {brasil: [], estados: {}}, PROJ = {}, GLOS = {}, busca = "", filtroVoto = "todos";
const meus = () => { try { return JSON.parse(localStorage.getItem("meusVotos") || "{}"); } catch (e) { return {}; } };
const salvarMeu = (id, v) => { try { const m = meus(); m[id] = v; localStorage.setItem("meusVotos", JSON.stringify(m)); } catch (e) {} };
const TIPOS = {PL:"PL", PLP:"PLP", PEC:"PEC", PDL:"PDL", MPV:"MP"};
const siglaDe = nome => TIPOS[(nome || "").split(" ")[0]];



async function json(url, opcional) {
  if (cache[url]) return cache[url];
  try {
    const r = await fetch(url, {cache: "no-cache"});
    if (!r.ok) throw new Error(url);
    return cache[url] = await r.json();
  } catch (e) { if (opcional) return null; throw e; }
}

const foto = (p, cls = "av") => p.foto ? `<img class="${cls}" src="${esc(p.foto)}" alt="" loading="lazy">` : `<span class="${cls}"></span>`;
const votoTag = t => t ? `<span class="v ${esc(t)}">${esc(t)}</span>` : `<span class="v tag">Não votou</span>`;
const lembrar = uf => { try { localStorage.setItem("uf", uf); } catch (e) {} };
const lembrado = () => { try { return localStorage.getItem("uf"); } catch (e) { return null; } };

// Junta as várias votações de um mesmo projeto e escolhe a principal (texto-base)
function projetos() {
  const g = new Map();
  for (const v of VOT) { if (!g.has(v.projeto)) g.set(v.projeto, []); g.get(v.projeto).push(v); }
  return [...g.entries()].map(([nome, vs]) => {
    const principal = vs.find(v => /(Aprovad|Rejeitad)[oa] [oa] (Projeto|texto|Substitutivo|Proposta|Subemenda Substitutiva|Emenda Substitutiva)/i.test(v.descricao)) || vs[vs.length - 1];
    return { nome, vs, principal, info: PROJ[nome] || null };
  });
}
const slug = s => encodeURIComponent(s.replace(/\s+/g, "-"));
const unslug = s => decodeURIComponent(s).replace(/-/g, " ");

function placarUF(v, deps) {
  let s = 0, n = 0;
  for (const d of deps) { const t = d.votos[v.id]; if (t === "Sim") s++; else if (t === "Não") n++; }
  return {s, n, tot: deps.length};
}

const TITULOS = {noticias:"Notícias", votacoes:"Votações", politicos:"Seus políticos", gastos:"Gastos", eleicoes:"Eleições"};
function topo(uf, aba) {
  return `<h1>${TITULOS[aba] || ""}</h1>
  ${aba === "noticias" ? `<div class="previa"><span>⏳</span><span><b>Prévia gratuita.</b> Os eleitos em 2026 tomam posse em 1º de fevereiro de 2027 e entram aqui automaticamente. Até lá, você vê o mandato atual.</span></div>` : ""}`;
}
const ICONES = {
  noticias: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5"/>',
  votacoes: '<path d="m9 12 2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="3"/>',
  politicos: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 19"/>',
  gastos: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h3"/>',
  eleicoes: '<path d="M5 11h14l-1 9H6l-1-9Z"/><path d="M9 11V5h6v6"/><path d="M10 8h4"/>'
};
// seta de voltar fixa na faixa de cima (o "← voltar" da página some quando rola)
new MutationObserver(() => { const b = document.querySelector("#app .back"), h = $("hback"); if (!h) return; if (b) { h.href = b.getAttribute("href"); h.hidden = false; b.hidden = true; } else h.hidden = true; document.querySelector(".top")?.classList.toggle("sub", !!b); }).observe($("app"), {childList: true});
function menu(uf, aba) {
  const n = $("bnav"), pill = $("ufpill");
  if (!uf) { n.hidden = true; pill.hidden = true; return; }
  pill.hidden = false; pill.textContent = `📍 ${uf} · trocar`;
  n.hidden = false;
  n.innerHTML = `<div class="in">${Object.keys(TITULOS).map(k => `<a href="#${uf}/${k}" class="${k === aba ? "on" : ""}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[k]}</svg>${k === "politicos" ? "Políticos" : TITULOS[k]}</a>`).join("")}</div>`;
}

function home() {
  menu(null);
  $("app").innerHTML = `<h1>Política explicada de um jeito simples.</h1>
  <p class="lead">O que muda na sua vida, como votaram e quanto gastaram os políticos que representam você, e o resultado da eleição na sua cidade. Escolha o seu estado:</p>
  <div class="ufs">${Object.keys(NOMES).map(u => `<a class="uf" href="#${u}/noticias"><b>${u}</b><span>${NOMES[u]}</span></a>`).join("")}</div>`;
}

const TEMAS = {Bolso: "💰", "Preços": "🛒", Trabalho: "💼", "Saúde": "🏥", Aposentadoria: "👵", Transporte: "🚌", Impostos: "🧾", "Educação": "🎒", "Segurança": "🛡️", Moradia: "🏠"};
function cartaoNoticia(n) {
  const tema = TEMAS[n.tema] ? n.tema : "Bolso";
  return `<article class="news"><div class="impacto t-${tema.normalize("NFD").replace(/[^A-Za-z]/g, "")}"><span class="ic">${TEMAS[tema]}</span><div><span class="lbl">${esc(tema)} · o que muda pra você</span><b>${esc(n.impacto || n.porque)}</b></div></div>
  <div class="kick" style="margin-top:14px">${dataBR(n.data)}</div><h3>${esc(n.titulo)}</h3>
  <details class="mais"><summary>Ler mais</summary>
  <span class="lbl">O que aconteceu</span><p>${esc(n.aconteceu)}</p>
  ${n.porque && n.impacto ? `<div class="porque"><span class="lbl">Por que isso chega em você</span>${esc(n.porque)}</div>` : ""}
  <div class="fonte">Fonte: ${(n.fontes || []).map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(", ")}</div></details></article>`;
}

async function abaNoticias(uf) {
  const est = NOT.estados?.[uf] || [];
  return `<div class="chips"><a class="chip" href="#${uf}/glossario" style="text-decoration:none">📖 Dicionário da política</a></div><div class="sec">Brasil · o que pesa no bolso de todo mundo</div>
  ${NOT.brasil?.length ? NOT.brasil.map(cartaoNoticia).join("") : '<div class="vazio">As notícias do dia chegam em breve.</div>'}
  <div class="sec">${NOMES[uf]} · o que pesa só aqui</div>
  ${est.length ? est.map(cartaoNoticia).join("") : `<div class="vazio">Sem novidade importante em ${NOMES[uf]} nos últimos dias. Quando acontecer algo que mexa com o seu bolso ou a sua rotina, aparece aqui.</div>`}
  <p class="note">Só entram notícias que mexem com o bolso ou a rotina das pessoas. Os resumos são nossos; a notícia completa está na fonte.</p>`;
}

const caixaMuda = (txt, oficial) => `<div class="impacto t-Trabalho"><span class="ic">💡</span><div><span class="lbl">O que muda na sua vida</span><b>${txt ? esc(txt) : `<span style="font-weight:500">Explicação simples chegando. Texto oficial: ${esc(limpa(oficial).slice(0, 140))}…</span>`}</b></div></div>`;
async function blocoPauta() {
  const P = await json("dados/pauta.json", true);
  const it = (P?.itens || []).filter(x => /^(PL|PLP|PEC|PDL|MPV) /.test(x.projeto));
  if (!it.length) return "";
  const cartao = x => `<div class="proj"><span class="v tag" style="display:inline-block;margin-bottom:10px;max-width:none">⏳ Ainda vai ser votado · ${dataBR(x.data)}</span>${caixaMuda(PROJ[x.projeto]?.muda, x.ementa)}
    <h3 style="margin-top:12px">${esc(PROJ[x.projeto]?.apelido || x.projeto)}</h3><div class="kick">${esc(x.projeto)}</div>
    ${PROJ[x.projeto] ? `<details class="mais"><summary>Texto oficial</summary><p class="pt">${esc(limpa(x.ementa))}</p></details>` : ""}</div>`;
  return `<div class="sec">Vai ser votado nesta semana <span>${it.length}</span></div>
  <p class="pt" style="margin-top:0">Estão na pauta da Câmara. Quando forem votados, aparece aqui quem votou a favor e contra.</p>
  ${it.slice(0, 3).map(cartao).join("")}
  ${it.length > 3 ? `<details><summary>Ver os outros ${it.length - 3} da pauta</summary>${it.slice(3).map(cartao).join("")}</details>` : ""}`;
}

async function abaVotacoes(uf, D) {
  const ps = projetos();
  const cartaoV = p => {
    const v = p.principal, {s, n} = placarUF(v, D.deputados), S = v.placar.Sim ?? 0, N = v.placar["Não"] ?? 0;
    return `<a class="proj" href="#${uf}/p/${slug(p.nome)}"><span class="v ${v.aprovada ? "el" : "tag"}" style="display:inline-block;margin-bottom:10px;max-width:none">${v.aprovada == null ? "Votado" : v.aprovada ? "✅ Aprovado" : "❌ Rejeitado"} · ${dataBR(v.data)}</span>
    ${caixaMuda(p.info?.muda, v.ementa || v.descricao)}
    <h3 style="margin-top:12px">${esc(p.info?.apelido || p.nome)}</h3><div class="kick">${esc(p.nome)}</div>
    <div class="mini"><i style="width:${S / (S + N || 1) * 100}%;background:var(--ok)"></i><i style="width:${N / (S + N || 1) * 100}%;background:var(--nao)"></i></div>
    <div class="pt">${NOMES[uf]}: <b style="color:var(--ok)">${s} a favor</b> · <b style="color:var(--nao)">${n} contra</b> · Câmara toda: ${S} a ${N}</div>
    <div style="margin-top:10px;font-weight:700;color:var(--sim)">Ver quem votou a favor e contra →</div></a>`;
  };
  const votados = !ps.length ? '<div class="vazio">Nenhuma votação com voto nominal neste ano.</div>' : ps.slice(0, 8).map(cartaoV).join("") + (ps.length > 8 ? `<details><summary>Ver mais ${ps.length - 8} projetos votados</summary>${ps.slice(8).map(cartaoV).join("")}</details>` : "");
  return `<div class="sec">Já votados em ${new Date().getFullYear()} <span>${ps.length}</span></div>${votados}` + await blocoPauta();
}

async function paginaProjeto(uf, nome) {
  const D = await json(`dados/uf/${uf}.json`);
  const p = projetos().find(x => x.nome === nome);
  if (!p) return render(uf, "votacoes");
  const v = p.principal, {s, n, tot} = placarUF(v, D.deputados), S = v.placar.Sim ?? 0, N = v.placar["Não"] ?? 0;
  const grupo = t => D.deputados.filter(d => t === "outro" ? !["Sim", "Não"].includes(d.votos[v.id]) : d.votos[v.id] === t);
  const lista = (ds, tag) => `<div class="list">${ds.map(d => `<a class="dep" href="#${uf}/d/${d.id}">${foto(d)}<span><span class="nm">${esc(d.nome)}</span><br><span class="pt">${esc(d.partido)}</span></span>${tag(d)}</a>`).join("") || '<div class="pt" style="padding:14px 16px">Ninguém.</div>'}</div>`;
  const outros = grupo("outro");
  $("app").innerHTML = `<a class="back" href="#${uf}/votacoes">← Votações</a>
  <div class="kick" style="margin-top:10px">${esc(p.nome)} · votado em ${dataBR(v.data)}${v.aprovada == null ? "" : v.aprovada ? " · aprovado" : " · rejeitado"}</div>
  <h1 style="font-size:clamp(26px,6vw,36px)">${esc(p.info?.apelido || p.nome)}</h1>
  ${caixaMuda(p.info?.muda, v.ementa || v.descricao)}
  ${p.info?.oque || p.info?.detalhe ? `<details open style="margin-top:12px"><summary>O que é esse projeto</summary>${p.info.oque ? `<p style="margin:0 0 10px">${esc(p.info.oque)}</p>` : ""}${p.info.detalhe ? `<p class="pt" style="margin:0 0 10px">${esc(p.info.detalhe)}</p>` : ""}</details>` : ""}
  <h2>Como votaram os deputados de ${NOMES[uf]}</h2>
  <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><b style="color:var(--ok)">${s}</b><span>a favor</span></div><div class="kpi"><b style="color:var(--nao)">${n}</b><span>contra</span></div><div class="kpi"><b>${tot - s - n}</b><span>não votaram</span></div></div>
  <div class="sec" style="color:var(--ok)">✅ Votaram a favor <span>${s}</span></div>${lista(grupo("Sim"), () => '<span class="v Sim" style="background:var(--ok)">A favor</span>')}
  <div class="sec" style="color:var(--nao)">❌ Votaram contra <span>${n}</span></div>${lista(grupo("Não"), () => '<span class="v Não">Contra</span>')}
  ${outros.length ? `<details><summary>Não votaram ou se abstiveram (${outros.length})</summary>${lista(outros, d => votoTag(d.votos[v.id]))}</details>` : ""}
  <div class="hero" style="margin-top:18px"><div class="kick">Resultado na Câmara toda</div>
  <div class="bar"><div class="s" style="width:${S / (S + N || 1) * 100}%;background:var(--ok)">${S} a favor</div><div class="n" style="width:${N / (S + N || 1) * 100}%">${N} contra</div></div></div>
  ${blocoMeuVoto(uf, v, D)}
  <button class="cta" data-share="${esc(p.nome)}" style="margin-top:14px">Compartilhar resultado</button>
  <details><summary>Texto oficial e outras votações deste projeto</summary><p class="oficial">${esc(limpa(v.ementa || v.descricao))}</p>${GLOS[siglaDe(p.nome)] ? `<p class="pt"><b>O que é ${esc(siglaDe(p.nome))}?</b> ${esc(GLOS[siglaDe(p.nome)])}</p>` : ""}${p.vs.filter(x => x !== v).map(x => `<div class="row"><span class="pt">${dataBR(x.data)} · ${esc(x.descricao)}</span></div>`).join("")}</details>
  ${p.info?.fontes ? `<p class="fonte">Fontes da explicação: ${p.info.fontes.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(", ")}</p>` : ""}
  <p class="note">A explicação é um resumo neutro, sem opinião. Na dúvida, vale o texto oficial.</p>`;
  scrollTo(0, 0);
}

function blocoMeuVoto(uf, v, D) {
  const eu = meus()[v.id];
  const iguais = eu ? D.deputados.filter(d => d.votos[v.id] === eu).length : 0;
  return `<div class="hero" style="margin-top:16px"><div class="kick">E você?</div>
  <h3 style="margin:4px 0 10px">Se você fosse deputado, como votaria?</h3>
  <div class="chips">${["Sim", "Não"].map(o => `<button class="chip" aria-selected="${eu === o}" data-meu="${esc(v.id)}|${o}">Eu votaria ${o}</button>`).join("")}</div>
  ${eu ? `<p style="margin:6px 0 0"><b>${iguais} de ${D.deputados.length}</b> deputados de ${NOMES[uf]} votaram igual a você.</p>` : `<p class="pt" style="margin:6px 0 0">Seu voto fica só no seu celular. Ele serve para mostrar com quais deputados você mais concorda.</p>`}</div>`;
}

function glossario(uf) {
  $("app").innerHTML = `<a class="back" href="#${uf}/noticias">← Voltar</a><h1>O que é isso?</h1>
  <p class="lead">As palavras da política explicadas de um jeito simples.</p>
  ${Object.entries(GLOS).map(([t, d]) => `<div class="row" style="display:block"><b>${esc(t)}</b><br><span>${esc(d)}</span></div>`).join("")}`;
  scrollTo(0, 0);
}

async function compartilhar(uf, nome) {
  const D = await json(`dados/uf/${uf}.json`);
  const p = projetos().find(x => x.nome === nome); if (!p) return;
  const v = p.principal, {s, n, tot} = placarUF(v, D.deputados), S = v.placar.Sim ?? 0, N = v.placar["Não"] ?? 0;
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const g = c.getContext("2d");
  g.fillStyle = "#f6f4ef"; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = "#ffe14d"; g.fillRect(0, 0, 1080, 150);
  g.fillStyle = "#141414"; g.font = "900 54px Archivo, sans-serif"; g.fillText("Cadê Meu Político?", 70, 98);
  g.font = "600 34px Archivo, sans-serif"; g.fillStyle = "#66625a"; g.fillText(`${p.nome} · ${dataBR(v.data)}`, 70, 230);
  const quebra = (txt, x, y, larg, alt, max) => { const ps = txt.split(" "); let l = "", k = 0; for (const w of ps) { if (g.measureText(l + w).width > larg && l) { g.fillText(l.trim(), x, y + k * alt); l = ""; if (++k >= max) return y + k * alt; } l += w + " "; } g.fillText(l.trim(), x, y + k * alt); return y + (k + 1) * alt; };
  g.fillStyle = "#141414"; g.font = "900 72px Archivo, sans-serif";
  let y = quebra(p.info?.apelido || p.nome, 70, 320, 940, 82, 3);
  g.font = "400 34px Archivo, sans-serif"; g.fillStyle = "#333";
  y = quebra(p.info?.muda || "", 70, y + 20, 940, 46, 5);
  y = Math.max(y + 40, 860);
  g.fillStyle = "#141414"; g.font = "800 40px Archivo, sans-serif"; g.fillText(`Como votaram os deputados de ${NOMES[uf]}`, 70, y);
  const bw = 940, sx = s / (tot || 1) * bw, nx = n / (tot || 1) * bw;
  g.fillStyle = "#e2ded4"; g.fillRect(70, y + 30, bw, 110);
  g.fillStyle = "#1f56d6"; g.fillRect(70, y + 30, sx, 110);
  g.fillStyle = "#e0452b"; g.fillRect(70 + sx, y + 30, nx, 110);
  g.fillStyle = "#fff"; g.font = "900 52px Archivo, sans-serif";
  if (s) g.fillText(`${s} sim`, 95, y + 103);
  if (n && nx > 120) g.fillText(`${n}`, 70 + sx + 20, y + 103);
  g.fillStyle = "#66625a"; g.font = "600 32px Archivo, sans-serif";
  g.fillText(`${n} não · ${tot - s - n} não votaram · Câmara toda: ${S} sim, ${N} não`, 70, y + 200);
  g.fillStyle = "#141414"; g.font = "700 28px Archivo, sans-serif";
  g.fillText("Veja como votou o seu deputado:", 70, 1240);
  g.fillText(location.host + location.pathname.replace(/\/$/, ""), 70, 1290);
  try { await new Promise((ok, erro) => { if (window.qrcode) return ok(); const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; sc.onload = ok; sc.onerror = erro; document.head.appendChild(sc); }); const q = qrcode(0, "M"); q.addData(location.href); q.make(); const nm = q.getModuleCount(), tam = 200, px = tam / nm, qx = 1080 - 70 - tam, qy = 1350 - 60 - tam; g.fillStyle = "#fff"; g.fillRect(qx - 10, qy - 10, tam + 20, tam + 20); g.fillStyle = "#141414"; for (let r = 0; r < nm; r++) for (let k = 0; k < nm; k++) if (q.isDark(r, k)) g.fillRect(qx + k * px, qy + r * px, Math.ceil(px), Math.ceil(px)); } catch (e) {} c.toBlob(async b => {
    const f = new File([b], `cade-meu-politico-${uf}-${p.nome.replace(/\W+/g, "-")}.png`, {type: "image/png"});
    try { if (navigator.canShare && navigator.canShare({files: [f]})) { await navigator.share({files: [f], title: p.info?.apelido || p.nome, text: `${p.info?.apelido || p.nome}: veja como votou o seu deputado: ${location.href}`}); return; } } catch (e) { if (e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
  }, "image/png");
}

async function abaPoliticos(uf, D) {
  const k = busca.toLowerCase(), r = D.deputados.filter(d => (d.nome + d.partido).toLowerCase().includes(k));
  return `<div class="sec">Senadores <span>${D.senadores.length}</span></div>
  <div class="list">${D.senadores.map(s => `<a class="dep" href="#${uf}/s/${s.id}">${foto(s)}<span><span class="nm">${esc(s.nome)}</span><br><span class="pt">${esc(s.partido)} · Senado</span></span><span class="v tag">Ver</span></a>`).join("")}</div>
  <div class="sec">Deputados federais <span>${D.deputados.length}</span></div>
  <input type="search" id="q" value="${esc(busca)}" placeholder="Buscar nome ou partido" aria-label="Buscar">
  <div class="list">${r.map(d => `<a class="dep" href="#${uf}/d/${d.id}">${foto(d)}<span><span class="nm">${esc(d.nome)}</span><br><span class="pt">${esc(d.partido)} · Câmara</span></span><span class="v tag">Ver</span></a>`).join("") || '<div class="vazio">Ninguém encontrado.</div>'}</div>
  <div class="sec">Deputados estaduais</div><div class="vazio">Entram estado por estado, começando por Goiás.</div>`;
}

async function abaGastos(uf, D) {
  const r = [...D.deputados].sort((a, b) => b.gastos.total - a.gastos.total), max = r[0]?.gastos.total || 1;
  return `<p class="lead" style="margin-top:12px">Cada deputado federal recebe uma verba mensal para custos do trabalho: combustível, passagens, escritório, divulgação. Veja quanto cada um de ${NOMES[uf]} já gastou em ${D.ano}, do maior para o menor.</p>
  <div class="card">${r.map((d, i) => `<a class="rk" href="#${uf}/g/${d.id}"><b>${i + 1}º</b><span><span class="nm" style="font-size:15px">${esc(d.nome)}</span> <span class="pt">${esc(d.partido)}</span><div class="t"><i style="width:${d.gastos.total / max * 100}%"></i></div></span><span>${brl(d.gastos.total)}</span></a>`).join("")}</div>`;
}

let eleAno = "2026", cidAba = null, buscaCand = "";
const fmtN = n => (n || 0).toLocaleString("pt-BR");
const titulo = s => String(s || "").toLowerCase().replace(/(^|\s|-|\()(\S)/g, (m, a, c) => a + c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, m => m.toLowerCase());
const ehBN = n => /^VOTO (BRANCO|NULO)|^BRANCO|^NULO/i.test(n || "");
const sitTag = s => /^ELEITO POR M/i.test(s) ? '<span class="v el">Eleito por média</span>' : /^ELEITO/i.test(s) ? '<span class="v el">Eleito</span>' : /SUPLENTE/i.test(s) ? '<span class="v tag">Suplente</span>' : /2º TURNO/i.test(s) ? '<span class="v tag">Foi ao 2º turno</span>' : '<span class="v tag">Não eleito</span>';
// Lista de candidatos com barra e porcentagem (branco e nulo ficam fora da conta)
function resultado(lista, max = 99, opts = {}) {
  if (!lista?.length) return '<div class="vazio">Sem dados.</div>';
  const nm = c => c.nome ?? c[0], vt = c => c.votos ?? c[1];
  const tot = opts.tot || lista.filter(c => !ehBN(nm(c))).reduce((t, c) => t + vt(c), 0) || 1;
  let rank = opts.ini || 0;
  return `<div class="card">${lista.slice(0, max).map((c, i) => {
    const nome = nm(c), v = vt(c), bn = ehBN(nome), pos = bn ? "" : ++rank, el = /^ELEITO/.test(c.sit || "");
    const part = opts.mapa && !c.partido ? opts.mapa(nome) : c.partido;
    return `<div class="rk"><b>${pos}</b><span><span class="nm" style="font-size:15px">${esc(titulo(nome))}</span> <span class="pt">${esc(part || "")}${c.numero ? " · " + esc(c.numero) : ""}</span>
    ${c.colig ? `<div class="pt" style="font-size:12.5px">Coligação: ${esc(c.colig)}</div>` : ""}
    ${!bn ? `<div class="t"><i style="width:${v / tot * 100}%;${el ? "background:var(--ok)" : ""}"></i></div>` : ""}
    ${c.sit && opts.sit !== false ? `<div style="margin-top:6px">${sitTag(c.sit)}</div>` : ""}</span>
    <span>${bn ? "" : (v / tot * 100).toFixed(1).replace(".", ",") + "%"}<br><span class="pt" style="font-weight:400">${fmtN(v)} votos</span></span></div>`;
  }).join("")}</div>`;
}
function blocoTurnos(t, nome) {
  if (!t || !Object.keys(t).length) return "";
  return Object.keys(t).sort().reverse().map(n => `<div class="sec">${esc(nome)} · ${n}º turno</div>${resultado(t[n])}`).join("");
}
// Partidos/federações com votos e cadeiras
function blocoPartidos(P, todos, comCadeiras = true) {
  const lista = Array.isArray(P) ? P : P?.lista;
  if (!lista?.length) return '<div class="vazio">Sem dados por partido.</div>';
  return lista.filter(p => p.total > 0 || p.cadeiras).map(p => {
    const cands = (todos || []).filter(c => p.partidos.includes(c.partido));
    return `<details><summary><span class="party" style="flex:1"><span><b>${esc(p.federacao ? p.sigla : p.sigla)}</b>${p.federacao ? ` <span class="pt">· federação (${esc(p.partidos.join(", "))})</span>` : ""}<br><span class="pt">${fmtN(p.total)} votos</span></span>${comCadeiras ? `<span class="seats ${p.cadeiras ? "" : "z"}">${p.cadeiras} ${p.cadeiras === 1 ? "cadeira" : "cadeiras"}</span>` : ""}</span></summary>
    ${p.federacao && p.nome !== p.sigla ? `<p class="pt" style="margin:0 0 8px">${esc(p.nome)}</p>` : ""}
    <p class="pt" style="margin:0 0 8px">${fmtN(p.nominais)} votos nos candidatos + ${fmtN(p.legenda)} votos só no número do partido (legenda)</p>
    ${cands.length ? resultado(cands, 999, {}) : ""}</details>`;
  }).join("");
}
function kpisProp(P, vagaTxt) {
  if (!P || Array.isArray(P) || !P.vagas) return "";
  return `<div class="kpis"><div class="kpi"><b>${P.vagas}</b><span>${vagaTxt}</span></div><div class="kpi"><b>${fmtN(P.quociente)}</b><span>votos para garantir 1 cadeira (quociente)</span></div><div class="kpi"><b>${fmtN(P.validos)}</b><span>votos válidos</span></div></div>
  <p class="pt">Na eleição de vereador e deputado, primeiro conta o total do partido ou federação. Cada vez que ele bate o quociente, ganha uma cadeira, que vai para os seus candidatos mais votados.</p>`;
}
const CARGO_NOME = {prefeito: "Prefeito", vereador: "Vereador", presidente: "Presidente", governador: "Governador", senador: "Senador", depFederal: "Deputado federal", depEstadual: "Deputado estadual"};
const PROP = ["vereador", "depFederal", "depEstadual"];
let propAba = "cand";
const lerCid = (uf, ano) => { try { return localStorage.getItem(`cid${ano}${uf}`) || ""; } catch (e) { return ""; } };
const salvarCid = (uf, ano, cd) => { try { localStorage.setItem(`cid${ano}${uf}`, cd || ""); } catch (e) {} };
const opcao = (href, ic, tit, sub, off) => off ? `<div class="opcao off"><span class="ic">${ic}</span><b>${tit}</b><span>${sub}</span></div>` : `<a class="opcao" href="${href}"><span class="ic">${ic}</span><b>${tit}</b><span>${sub}</span></a>`;

async function abaEleicoes(uf) {
  return `<p class="lead">Qual eleição você quer ver?</p><div class="opc">
  ${opcao(`#${uf}/el/2026`, "🗳️", "2026", "Presidente, governador, senador e deputados")}
  ${opcao(`#${uf}/el/2024`, "🏙️", "2024", "Prefeito e vereadores da sua cidade")}</div>`;
}

function blocoLocal(C, chave, mapaNum) {
  const zonas = [...new Set((C.locais || []).filter(l => l.votos[chave]).map(l => l.zona))].sort((a, b) => a - b);
  if (!zonas.length) return "";
  return `<div class="sec">Por zona e colégio eleitoral</div>
  <select id="zsel" class="busca"><option value="">Escolha a zona eleitoral…</option>${zonas.map(z => `<option value="${esc(z)}">Zona ${esc(z)}</option>`).join("")}</select>
  <select id="lsel" class="busca" hidden></select><div id="resLocal"></div>`;
}
function ligarLocal(C, chave, mapaNum) {
  const z = $("zsel"), ls = $("lsel"); if (!z) return;
  const locs = (C.locais || []).filter(l => l.votos[chave]);
  z.addEventListener("change", () => {
    const daZona = locs.filter(l => l.zona === z.value);
    ls.hidden = !z.value; $("resLocal").innerHTML = "";
    ls.innerHTML = `<option value="">Escolha o colégio (local de votação)…</option>` + daZona.map(l => `<option value="${locs.indexOf(l)}">${esc(titulo(l.nome))}</option>`).join("");
  });
  ls.addEventListener("change", () => {
    const l = locs[ls.value]; if (!l) { $("resLocal").innerHTML = ""; return; }
    const pp = l.partidos?.[chave];
    $("resLocal").innerHTML = `<p class="pt">${esc(titulo(l.end))} · ${l.secoes} seções (urnas)</p>${resultado(l.votos[chave], 25)}
    ${pp ? `<div class="sec">Votos por partido neste colégio</div><div class="card">${pp.map(([n, v]) => `<div class="row"><span><b>${esc(mapaNum[n] || "Partido " + n)}</b> <span class="pt">· nº ${esc(n)}</span></span><b>${fmtN(v)}</b></div>`).join("")}</div>` : ""}`;
  });
}

async function eleicao(uf, partes) {
  menu(uf, "eleicoes");
  const [ano, turno, cargo] = partes;
  if (!["2024", "2026"].includes(ano)) return render(uf, "eleicoes");
  const idx = await json(`eleicoes/${ano}/${uf}/index.json`, true);
  const base = `#${uf}/el/${ano}`;
  const voltar = cargo ? [`${base}/${turno}`, `${turno}º turno`] : turno ? [base, `Eleição ${ano}`] : [`#${uf}/eleicoes`, "Eleições"];
  const cab = (tit) => `<a class="back" href="${voltar[0]}">← ${voltar[1]}</a><div class="kick" style="margin-top:10px">Eleição ${ano}${turno ? ` · ${turno}º turno` : ""}</div><h1>${tit}</h1>`;
  if (!idx) { $("app").innerHTML = cab(`Eleição ${ano}`) + `<div class="vazio">Os resultados de ${NOMES[uf]} chegam em breve. Começamos por Goiás e vamos abrindo os outros estados.</div>`; return; }
  let cd = lerCid(uf, ano); if (cd && !idx.some(m => m.cd === cd)) cd = "";
  const C = cd ? await json(`eleicoes/${ano}/${uf}/m/${cd}.json`, true) : null;
  const E = ano === "2026" ? await json(`eleicoes/2026/${uf}/estado.json`, true) : null;
  const BR = ano === "2026" && cargo === "presidente" ? await json(`eleicoes/2026/brasil.json`, true) : null;
  const onde = C ? titulo(C.nome) : NOMES[uf];
  const selCid = `<select id="cidsel" class="busca"><option value="">${ano === "2024" ? "Escolha sua cidade…" : `Todo o estado (${NOMES[uf]})`}</option>${idx.map(m => `<option value="${esc(m.cd)}"${m.cd === cd ? " selected" : ""}>${esc(titulo(m.nome))}</option>`).join("")}</select>`;
  let html = "";
  if (!turno) {
    const tem2 = ano === "2024" ? !!C?.prefeito?.[2] : true;
    html = cab(`Eleição ${ano}`) + `<div class="sec">${ano === "2024" ? "Sua cidade" : "Ver resultado de"}</div>${selCid}` +
      (ano === "2024" && !C ? `<div class="vazio">Escolha sua cidade para ver o resultado.</div>` :
      `<div class="opc">${opcao(`${base}/1`, "1º", "1º turno", ano === "2024" ? "Prefeito e vereador" : "Presidente, governador, senador e deputados")}
      ${opcao(`${base}/2`, "2º", "2º turno", tem2 ? (ano === "2024" ? "Prefeito" : "Presidente e governador") : `Não teve 2º turno em ${onde}`, !tem2)}</div>`);
  } else if (!cargo) {
    let cargos = turno === "2" ? (ano === "2024" ? ["prefeito"] : ["presidente", ...((C || E)?.governador?.[2] ? ["governador"] : [])]) : (ano === "2024" ? ["prefeito", "vereador"] : ["presidente", "governador", "senador", "depFederal", "depEstadual"]);
    const icones = {prefeito: "🏛️", vereador: "👥", presidente: "🇧🇷", governador: "🏢", senador: "⚖️", depFederal: "🏛️", depEstadual: "📋"};
    html = cab(`${turno}º turno`) + (ano === "2026" ? `<div class="sec">Ver resultado de</div>${selCid}` : `<p class="lead">${esc(onde)}</p>`) +
      `<div class="opc">${cargos.map(k => opcao(`${base}/${turno}/${k}`, icones[k], CARGO_NOME[k], esc(onde))).join("")}</div>`;
  } else if (!PROP.includes(cargo)) {
    const fonte = C ? C[cargo] : E?.[cargo];
    html = cab(`${CARGO_NOME[cargo]}`) + (ano === "2026" ? selCid : "") +
      (cargo === "presidente" && BR && !C ? `<div class="sec">Brasil</div>${resultado(BR.presidente?.[turno])}` : "") +
      `<div class="sec">${esc(onde)}</div>${resultado(fonte?.[turno])}` +
      (C ? blocoLocal(C, `${cargo}|${turno}`) : `<p class="note">Escolha uma cidade acima para ver o resultado por zona e por colégio eleitoral.</p>`);
  } else {
    const D = C ? (cargo === "vereador" ? C.vereadores : (Array.isArray(C[cargo]) ? { todos: C[cargo] } : C[cargo])) : E?.[cargo];
    const todos = D?.todos || D?.maisVotados || [];
    const eleitos = C ? todos.filter(c => /^ELEITO/.test(c.sit || "")) : (D?.eleitos || []);
    const demais = todos.filter(c => !/^ELEITO/.test(c.sit || ""));
    const comCad = !(ano === "2026" && C);
    const totV = window.__tot = (!Array.isArray(D?.partidos) && D?.partidos?.validos) || todos.reduce((t, c) => t + c.votos, 0) || 1;
    html = cab(`${CARGO_NOME[cargo]}`) + (ano === "2026" ? selCid : "") +
      `<div class="seg"><button aria-selected="${propAba === "cand"}" data-pab="cand">Candidatos</button><button aria-selected="${propAba === "part"}" data-pab="part">Por partido</button></div>` +
      (propAba === "part"
        ? (comCad ? kpisProp(D?.partidos, `vagas de ${CARGO_NOME[cargo].toLowerCase()}`) : `<p class="pt">Votos que cada partido teve em ${esc(onde)}. As cadeiras são decididas com os votos do estado todo.</p>`) + blocoPartidos(D?.partidos, todos, comCad)
        : `<div class="sec">Eleitos${ano === "2026" && C ? " (no estado) que tiveram voto aqui" : ""} <span>${eleitos.length}</span></div>${resultado(eleitos, 999, {tot: totV})}
          <div class="sec">Demais candidatos <span>${demais.length}</span></div>${demais.length ? `<input type="search" id="qc" value="${esc(buscaCand)}" placeholder="Buscar nome, partido ou número"><div id="lista">${resultado(demais, 999, {ini: eleitos.length, tot: totV})}</div>` : `<div class="vazio">${C ? "Sem outros candidatos." : "Escolha uma cidade acima para ver todos os candidatos."}</div>`}`) +
      (C ? blocoLocal(C, `${cargo}|1`) : `<p class="note">Escolha uma cidade acima para ver por zona e por colégio eleitoral.</p>`);
    window.__demais = demais;
  }
  $("app").innerHTML = html + `<p class="note">Fonte: Portal de Dados Abertos do TSE. Porcentagens sobre os votos válidos (sem brancos e nulos).</p>`;
  const cs = $("cidsel"); if (cs) cs.addEventListener("change", () => { salvarCid(uf, ano, cs.value); rota(); });
  const q = $("qc"); if (q) q.addEventListener("input", e => { buscaCand = e.target.value; const k = buscaCand.toLowerCase(), r = window.__demais.filter(c => !k || (c.nome + " " + c.partido + " " + c.numero).toLowerCase().includes(k)); $("lista").innerHTML = r.length ? resultado(r, 999, {tot: window.__tot}) : '<div class="vazio">Ninguém encontrado.</div>'; });
  if (C && cargo) { const mapaNum = {}; for (const c of [...(C.vereadores?.todos || []), ...(C.depFederal?.todos || []), ...(C.depEstadual?.todos || [])]) if (c.numero) mapaNum[String(c.numero).slice(0, 2)] = c.partido; ligarLocal(C, `${cargo}|${PROP.includes(cargo) ? 1 : turno}`, mapaNum); }
  scrollTo(0, 0);
}

function listaBusca(todos) {
  const k = buscaCand.toLowerCase();
  const r = todos.filter(c => !k || (c.nome + " " + c.partido + " " + c.numero).toLowerCase().includes(k));
  return r.length ? resultado(r, 999) : '<div class="vazio">Ninguém encontrado.</div>';
}

async function render(uf, aba) {
  lembrar(uf);
  const D = await json(`dados/uf/${uf}.json`);
  const corpo = { noticias: abaNoticias, votacoes: abaVotacoes, politicos: abaPoliticos, gastos: abaGastos, eleicoes: abaEleicoes }[aba] || abaNoticias;
  menu(uf, aba);
  $("app").innerHTML = topo(uf, aba) + await corpo(uf, D);
  const q = $("q");
  if (q) q.addEventListener("input", e => { busca = e.target.value; const p = e.target.selectionStart; render(uf, aba).then(() => { const n = $("q"); n.focus(); n.setSelectionRange(p, p); }); });
}

let buscaGasto = "";
async function paginaGastos(uf, id) {
  const D = await json(`dados/uf/${uf}.json`);
  const d = D.deputados.find(x => String(x.id) === id);
  if (!d) return render(uf, "gastos");
  const g = d.gastos, G = await json(`dados/gastos/${id}.json`, true);
  const itens = G?.itens || g.maiores.map(m => ({ ...m, data: "" }));
  const maxT = Math.max(1, ...Object.values(g.porTipo)), meses = Object.entries(g.porMes).sort((a, b) => a[0] - b[0]), maxM = Math.max(1, ...meses.map(m => m[1]));
  const media = D.deputados.reduce((t, x) => t + x.gastos.total, 0) / (D.deputados.length || 1);
  const linha = m => `<div class="row"><span><b style="white-space:normal">${esc(titulo(m.forn || "Sem nome"))}</b><br><span class="pt">${esc(m.tipo.toLowerCase())}${m.data ? " · " + dataBR(m.data) : ""}${m.doc ? ` · <a href="${esc(m.doc)}" target="_blank" rel="noopener">ver nota</a>` : ""}</span></span><b>${brl(m.v)}</b></div>`;
  const filtra = () => { const k = buscaGasto.toLowerCase(); return itens.filter(m => !k || (m.forn + " " + m.tipo).toLowerCase().includes(k)); };
  $("app").innerHTML = `<a class="back" href="#${uf}/gastos">← Gastos</a>
  <div class="ph">${foto(d)}<div><div class="nm" style="font-size:22px">${esc(d.nome)}</div><div class="pt">Deputado(a) federal · ${esc(d.partido)} · ${uf}</div></div></div>
  <div class="hero"><div class="kick">Gastou em ${D.ano}</div><div class="big" style="margin-top:6px">${brl(g.total)}</div>
  <p class="pt" style="margin:8px 0 0">da verba para custos do mandato. A média dos deputados de ${NOMES[uf]} é ${brl(media)}. <a href="#${uf}/glossario">O que é essa verba?</a></p></div>
  <h2>Com o que gastou</h2>
  <div class="card">${Object.entries(g.porTipo).map(([t, v]) => `<div class="rk"><span></span><span><span style="font-size:14px">${esc(t.charAt(0) + t.slice(1).toLowerCase())}</span><div class="t"><i style="width:${v / maxT * 100}%"></i></div></span><span>${brl(v)}</span></div>`).join("") || '<div class="pt" style="padding:14px 0">Nenhum gasto ainda.</div>'}</div>
  ${meses.length ? `<h2>Mês a mês</h2><div class="card">${meses.map(([m, v]) => `<div class="rk"><b>${MESES[m] || m}</b><span><div class="t" style="margin:0"><i style="width:${v / maxM * 100}%"></i></div></span><span>${brl(v)}</span></div>`).join("")}</div>` : ""}
  <h2>Cada gasto <span class="pt" style="font-family:Inter">(${itens.length})</span></h2>
  <input type="search" id="qg" value="${esc(buscaGasto)}" placeholder="Buscar empresa ou tipo de gasto">
  <div class="card" id="lg">${filtra().map(linha).join("") || '<div class="pt" style="padding:14px 0">Nada encontrado.</div>'}</div>
  ${G ? "" : '<p class="note">Por enquanto aparecem só os maiores gastos. A lista completa entra na próxima atualização diária.</p>'}
  <p class="note">Fonte: Dados Abertos da Câmara dos Deputados. A nota fiscal abre no site da Câmara.</p>
  <a class="cta" href="#${uf}/d/${d.id}" style="margin-top:16px;background:var(--card);color:var(--ink);border:1px solid var(--line);box-shadow:var(--sh)">Ver como ${esc(d.nome.split(" ")[0])} votou →</a>`;
  $("qg").addEventListener("input", e => { buscaGasto = e.target.value; $("lg").innerHTML = filtra().map(linha).join("") || '<div class="pt" style="padding:14px 0">Nada encontrado.</div>'; });
  scrollTo(0, 0);
}

async function deputado(uf, id) {
  const D = await json(`dados/uf/${uf}.json`);
  const d = D.deputados.find(x => String(x.id) === id);
  if (!d) return render(uf, "politicos");
  const g = d.gastos, maxT = Math.max(1, ...Object.values(g.porTipo));
  const ps = projetos(), pj = d.projetos || {total: 0, porTipo: {}, ultimos: []};
  const votou = VOT.filter(v => d.votos[v.id]).length;
  const comGov = VOT.filter(v => ["Sim", "Não"].includes(v.governo) && ["Sim", "Não"].includes(d.votos[v.id]));
  const igualGov = comGov.filter(v => v.governo === d.votos[v.id]).length;
  const eu = meus(), emComum = ps.filter(p => eu[p.principal.id] && ["Sim", "Não"].includes(d.votos[p.principal.id]));
  const concorda = emComum.filter(p => eu[p.principal.id] === d.votos[p.principal.id]).length;
  const pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "—";
  const card = (num, txt) => `<div class="stat"><div class="big" style="font-size:32px">${num}</div><div class="pt">${txt}</div></div>`;
  $("app").innerHTML = `<a class="back" href="#${uf}/politicos">← Seus políticos</a>
  <div class="ph">${foto(d)}<div><div class="nm" style="font-size:24px">${esc(d.nome)}</div><div class="pt">Deputado(a) federal · ${esc(d.partido)} · ${uf}</div></div></div>
  <div class="stats">
    ${card(pct(votou, VOT.length), `votou em ${votou} das ${VOT.length} últimas votações nominais`)}
    ${card(pct(igualGov, comGov.length), `das vezes votou igual à orientação do governo`)}
    ${card(pj.total, `projetos de lei e PECs assinados no mandato (como autor ou coautor)`)}
  </div>
  <div class="hero" style="margin-top:14px"><div class="kick">Você e ${esc(d.nome.split(" ")[0])}</div>
  ${emComum.length ? `<p style="margin:6px 0 0;font-size:18px">Vocês concordaram em <b>${concorda} de ${emComum.length}</b> projetos.</p>` : `<p style="margin:6px 0 0">Diga como você votaria nos projetos da aba Votações e veja aqui se você concorda com este deputado.</p>`}</div>
  <h2>Como votou</h2>
  <div class="card">${ps.map(p => `<a class="row" href="#${uf}/p/${slug(p.nome)}" style="text-decoration:none"><span><b style="white-space:normal">${esc(p.info?.apelido || p.nome)}</b><br><span class="pt">${dataBR(p.principal.data)} · ${esc(p.nome)}${eu[p.principal.id] ? ` · você: ${esc(eu[p.principal.id])}` : ""}</span></span>${votoTag(d.votos[p.principal.id])}</a>`).join("") || '<div class="pt" style="padding:14px 0">Sem votações recentes.</div>'}</div>
  <h2>Projetos que assinou</h2>
  <p class="pt">${Object.entries(pj.porTipo).map(([t, q]) => `${q} ${esc(t)}`).join(" · ") || "Nenhum"}. Conta também os projetos que ele só assinou junto com outros deputados (PEC precisa de muitas assinaturas).</p>
  <div class="card">${pj.ultimos.map(x => `<a class="row" style="display:block" href="https://www.camara.leg.br/propostas-legislativas/${esc(x.id)}" target="_blank" rel="noopener"><b>${esc(x.nome)}</b> <span class="pt">· ${dataBR(x.data)}</span><br><span class="pt">${esc(limpa(x.ementa).slice(0, 180))}</span></a>`).join("") || '<div class="pt" style="padding:14px 0">Nenhum projeto.</div>'}</div>
  <a class="cta" href="#${uf}/g/${d.id}" style="margin-top:22px">💸 Ver os gastos de ${esc(d.nome.split(" ")[0])} (${brl(g.total)} em ${D.ano})</a>`;
  scrollTo(0, 0);
}

async function senador(uf, id) {
  const D = await json(`dados/uf/${uf}.json`);
  const s = D.senadores.find(x => String(x.id) === id);
  if (!s) return render(uf, "politicos");
  const vs = s.votos || [];
  const tag = v => /^Sim$/i.test(v) ? '<span class="v Sim">Sim</span>' : /^N(ã|a)o$/i.test(v) ? '<span class="v Não">Não</span>' : /^Presente/i.test(v) ? '<span class="v tag">Presente</span>' : /Abst/i.test(v) ? '<span class="v tag">Absteve</span>' : /^Votou$/i.test(v) ? '<span class="v tag">Votou (secreto)</span>' : `<span class="v tag">${esc(String(v || "—").slice(0, 22))}</span>`;
  $("app").innerHTML = `<a class="back" href="#${uf}/politicos">← Seus políticos</a>
  <div class="ph">${foto(s)}<div><div class="nm" style="font-size:24px">${esc(s.nome)}</div><div class="pt">Senador(a) · ${esc(s.partido)} · ${uf}</div></div></div>
  ${s.totalVotacoes ? `<div class="stats"><div class="stat"><div class="big" style="font-size:32px">${Math.round((s.participou || 0) / s.totalVotacoes * 100)}%</div><div class="pt">votou em ${s.participou} das ${s.totalVotacoes} votações nominais do Senado em ${D.ano}</div></div></div>` : ""}
  <h2>Como votou no Senado</h2>
  <div class="card">${vs.map(v => `<div class="row"><span><b style="white-space:normal">${esc(v.materia || "Votação")}</b> <span class="pt">· ${dataBR(v.data)}${v.resultado ? " · " + esc(v.resultado.toLowerCase()) : ""}${v.secreta ? " · votação secreta" : ""}</span><br><span class="pt">${esc(limpa(v.ementa).slice(0, 160))}</span></span>${tag(v.voto)}</div>`).join("") || '<div class="pt" style="padding:14px 0">As votações deste senador aparecem na próxima atualização diária.</div>'}</div>
  <p class="note">Fonte: Dados Abertos do Senado Federal. "Votou" aparece em votações secretas, quando o voto não é divulgado.</p>`;
  scrollTo(0, 0);
}

async function rota() {
  try {
    VOT ??= await json("dados/votacoes.json");
    NOT = (await json("conteudo/noticias.json", true)) || NOT;
    PROJ = (await json("conteudo/projetos.json", true)) || PROJ;
    GLOS = (await json("conteudo/glossario.json", true)) || GLOS;
    const h = location.hash.slice(1);
    if (!h) { const u = lembrado(); if (NOMES[u]) { location.replace(`#${u}/noticias`); return; } return home(); }
    const [uf, tipo, id] = h.split("/");
    if (!NOMES[uf]) return home();
    menu(uf, tipo === "g" ? "gastos" : tipo === "d" || tipo === "s" ? "politicos" : tipo === "p" ? "votacoes" : tipo === "el" ? "eleicoes" : tipo);
    if (tipo === "d") return deputado(uf, id);
    if (tipo === "g") return paginaGastos(uf, id);
    if (tipo === "s") return senador(uf, id);
    if (tipo === "p") return paginaProjeto(uf, unslug(id));
    if (tipo === "glossario") return glossario(uf);
    if (tipo === "el") return eleicao(uf, h.split("/").slice(2));
    if (tipo === "cidade") { const [, , ano, cd] = h.split("/"); salvarCid(uf, ano, cd); location.replace(`#${uf}/el/${ano}`); return; }
    await render(uf, tipo || "noticias");
    scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    $("app").innerHTML = `<div class="err">Não consegui carregar os dados agora. Tente de novo em alguns minutos.</div>`;
  }
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-voto]");
  if (b) { const y = scrollY; filtroVoto = b.dataset.voto; rota().then(() => scrollTo(0, y)); return; }
  const m = e.target.closest("[data-meu]");
  if (m) { const y = scrollY; const [id, v] = m.dataset.meu.split("|"); salvarMeu(id, v); rota().then(() => scrollTo(0, y)); return; }
  const an = e.target.closest("[data-ano]");
  if (an) { eleAno = an.dataset.ano; rota(); return; }
  const cb = e.target.closest("[data-cab]");
  if (cb) { cidAba = cb.dataset.cab; buscaCand = ""; rota(); return; }
  const pb = e.target.closest("[data-pab]");
  if (pb) { propAba = pb.dataset.pab; buscaCand = ""; rota(); return; }
  const sh = e.target.closest("[data-share]");
  if (sh) { compartilhar(location.hash.slice(1).split("/")[0], sh.dataset.share); }
});
document.addEventListener("change", e => { if (e.target.matches("[data-ir]") && e.target.value) location.hash = e.target.value; });
addEventListener("hashchange", () => { busca = ""; buscaGasto = ""; filtroVoto = "todos"; cidAba = null; propAba = "cand"; buscaCand = ""; rota(); });
json("dados/resumo.json").then(r => { $("upd").textContent = "Última atualização: " + new Date(r.atualizado).toLocaleString("pt-BR") + "."; }).catch(() => {});
rota();
}
