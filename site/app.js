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

// estilo extra das novas telas
document.head.insertAdjacentHTML("beforeend", `<style>
.previa{background:var(--hi);color:#141414;border-radius:12px;padding:12px 14px;font-size:14px;margin:4px 0 14px}
.previa b{display:block;font-size:15px}
.tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 14px;margin-bottom:4px;border-bottom:1px solid var(--line)}
.tabs a{flex:none;text-decoration:none;font:700 15px Archivo;padding:10px 14px;border-radius:999px;min-height:44px;display:flex;align-items:center}
.tabs a.on{background:var(--ink);color:var(--bg)}
.sec{font-weight:900;font-size:13px;text-transform:none;color:var(--mute);margin:22px 0 8px;letter-spacing:.02em}
.news{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}
.news h3{font-weight:900;font-size:20px;line-height:1.15;margin:4px 0 8px}
.news p{margin:0 0 10px}
.lbl{font-weight:800;font-size:13px;color:var(--mute);display:block;margin-bottom:2px}
.porque{background:light-dark(#f3f0e6,#262420);border-radius:12px;padding:12px;margin:10px 0}
.fonte{font-size:13px;color:var(--mute)}
.proj{display:block;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px;text-decoration:none}
.proj:hover{border-color:var(--ink)}
.proj h3{font-weight:900;font-size:19px;line-height:1.15;margin:4px 0 6px}
.mini{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--line);margin:10px 0 6px}
.mini i{display:block;height:100%}
.muda{background:light-dark(#eef3ff,#1b2233);border-left:4px solid var(--sim);border-radius:10px;padding:12px 14px;margin:12px 0}
.oficial{font-size:14px;color:var(--mute)}
details{margin-top:14px}summary{cursor:pointer;font-weight:700;padding:8px 0}
.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.vazio{color:var(--mute);padding:14px;border:1px dashed var(--line);border-radius:12px}
</style>`);

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

function topo(uf, aba) {
  return `<a class="back" href="#inicio">← Trocar estado</a><h1>${NOMES[uf]}</h1>
  <div class="previa"><b>Versão de prévia</b>Os novos deputados e senadores eleitos em 2026 tomam posse em 1º de fevereiro de 2027 e vão aparecer aqui automaticamente. Até lá, você vê o mandato atual.</div>
  <nav class="tabs">${ABAS.map(([k, t]) => `<a href="#${uf}/${k}" class="${k === aba ? "on" : ""}">${t}</a>`).join("")}</nav>`;
}

function home() {
  $("app").innerHTML = `<h1>Qual é o seu estado?</h1>
  <p class="lead">O que está acontecendo na política, explicado de um jeito simples: o que muda na sua vida, como votaram e quanto gastaram os políticos que representam você.</p>
  <div class="ufs">${Object.keys(NOMES).map(u => `<a class="uf" href="#${u}/noticias" aria-label="${NOMES[u]}">${u}</a>`).join("")}</div>`;
}

function cartaoNoticia(n) {
  return `<article class="news"><div class="kick">${dataBR(n.data)}</div><h3>${esc(n.titulo)}</h3>
  <span class="lbl">O que aconteceu</span><p>${esc(n.aconteceu)}</p>
  ${n.porque ? `<div class="porque"><span class="lbl">Por que isso chega em você</span>${esc(n.porque)}</div>` : ""}
  <div class="fonte">Fonte: ${(n.fontes || []).map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(", ")}</div></article>`;
}

async function abaNoticias(uf) {
  const est = NOT.estados?.[uf] || [];
  return `<div class="sec">BRASIL · o que pesa no bolso de todo mundo</div>
  ${NOT.brasil?.length ? NOT.brasil.map(cartaoNoticia).join("") : '<div class="vazio">As notícias do dia chegam em breve.</div>'}
  <div class="sec">${NOMES[uf].toUpperCase()} · o que pesa só aqui</div>
  ${est.length ? est.map(cartaoNoticia).join("") : `<div class="vazio">Sem novidade importante em ${NOMES[uf]} nos últimos dias. Quando acontecer algo que mexa com o seu bolso ou a sua rotina, aparece aqui.</div>`}
  <p class="note">Só entram notícias que mexem com o bolso ou a rotina das pessoas. Os resumos são nossos; a notícia completa está na fonte.</p>`;
}

async function abaVotacoes(uf, D) {
  const ps = projetos();
  if (!ps.length) return '<div class="vazio">Nenhuma votação com voto nominal nos últimos 60 dias.</div>';
  return `<p class="lead" style="margin-top:12px">Os projetos que os deputados votaram por último. Toque em um para ver o que muda na sua vida e como votou cada deputado de ${NOMES[uf]}.</p>
  ${ps.map(p => {
    const v = p.principal, {s, n, tot} = placarUF(v, D.deputados), S = v.placar.Sim ?? 0, N = v.placar["Não"] ?? 0;
    return `<a class="proj" href="#${uf}/p/${slug(p.nome)}"><div class="kick">${dataBR(v.data)} · ${esc(p.nome)}</div>
    <h3>${esc(p.info?.apelido || limpa(v.ementa || v.descricao).slice(0, 120))}</h3>
    ${p.info?.muda ? `<p class="pt" style="margin:0">${esc(p.info.muda)}</p>` : ""}
    <div class="mini"><i style="width:${S / (S + N || 1) * 100}%;background:var(--sim)"></i><i style="width:${N / (S + N || 1) * 100}%;background:var(--nao)"></i></div>
    <div class="pt">Câmara: ${S} sim, ${N} não · ${NOMES[uf]}: ${s} sim, ${n} não</div></a>`;
  }).join("")}`;
}

async function paginaProjeto(uf, nome) {
  const D = await json(`dados/uf/${uf}.json`);
  const p = projetos().find(x => x.nome === nome);
  if (!p) return render(uf, "votacoes");
  const v = p.principal, {s, n, tot} = placarUF(v, D.deputados), S = v.placar.Sim ?? 0, N = v.placar["Não"] ?? 0;
  const deps = D.deputados.filter(d => filtroVoto === "todos" || (d.votos[v.id] || "Não votou") === filtroVoto);
  $("app").innerHTML = `<a class="back" href="#${uf}/votacoes">← Votações</a>
  <div class="kick">${esc(p.nome)} · votado em ${dataBR(v.data)}</div>
  <h1 style="font-size:clamp(26px,6vw,36px)">${esc(p.info?.apelido || p.nome)}</h1>
  ${GLOS[siglaDe(p.nome)] ? `<p class="pt" style="margin:0"><b>O que é ${esc(siglaDe(p.nome))}?</b> ${esc(GLOS[siglaDe(p.nome)])}</p>` : ""}
  <div class="muda"><span class="lbl">O que muda na sua vida</span>${p.info ? esc(p.info.muda) : "A explicação simples deste projeto chega em breve."}
  ${p.info?.detalhe ? `<p style="margin:8px 0 0">${esc(p.info.detalhe)}</p>` : ""}</div>
  <p class="oficial"><b>Texto oficial:</b> ${esc(limpa(v.ementa || v.descricao))}</p>
  <div class="hero"><div class="kick">Resultado na Câmara</div>
  <div class="bar"><div class="s" style="width:${S / (S + N || 1) * 100}%">${S} sim</div><div class="n" style="width:${N / (S + N || 1) * 100}%">${N} não</div></div>
  <div class="legend"><span>${esc(v.descricao.split(".")[0])}</span></div></div>
  ${blocoMeuVoto(uf, v, D)}
  <button class="cta" data-share="${esc(p.nome)}" style="margin-top:14px">Compartilhar resultado</button>
  <h2>Como votaram os deputados de ${NOMES[uf]}</h2>
  <p class="pt">${s} votaram sim, ${n} votaram não, ${tot - s - n} não votaram ou se abstiveram.</p>
  <div class="chips">${["todos", "Sim", "Não", "Não votou"].map(f => `<button class="chip" aria-selected="${f === filtroVoto}" data-voto="${f}">${f === "todos" ? "Todos" : f}</button>`).join("")}</div>
  <div class="list">${deps.map(d => `<a class="dep" href="#${uf}/d/${d.id}">${foto(d)}<span><span class="nm">${esc(d.nome)}</span><br><span class="pt">${esc(d.partido)}</span></span>${votoTag(d.votos[v.id])}</a>`).join("") || '<div class="vazio">Ninguém neste filtro.</div>'}</div>
  ${p.vs.length > 1 ? `<details><summary>Outras ${p.vs.length - 1} votações deste projeto (mudanças no texto)</summary>${p.vs.filter(x => x !== v).map(x => `<div class="row"><span class="pt">${dataBR(x.data)} · ${esc(x.descricao)}</span></div>`).join("")}</details>` : ""}
  ${p.info?.fontes ? `<p class="fonte">Fontes da explicação: ${p.info.fontes.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(", ")}</p>` : ""}
  <p class="note">A explicação é um resumo neutro, sem opinião. Na dúvida, vale o texto oficial. Não entendeu alguma palavra? <a href="#${uf}/glossario">Veja o dicionário</a>.</p>`;
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
  return `<div class="sec">SENADORES · ${D.senadores.length}</div>
  <div class="list">${D.senadores.map(s => `<a class="dep" href="#${uf}/s/${s.id}">${foto(s)}<span><span class="nm">${esc(s.nome)}</span><br><span class="pt">${esc(s.partido)} · Senado</span></span><span class="v tag">Ver</span></a>`).join("")}</div>
  <div class="sec">DEPUTADOS FEDERAIS · ${D.deputados.length}</div>
  <input type="search" id="q" value="${esc(busca)}" placeholder="Buscar nome ou partido" aria-label="Buscar">
  <div class="list">${r.map(d => `<a class="dep" href="#${uf}/d/${d.id}">${foto(d)}<span><span class="nm">${esc(d.nome)}</span><br><span class="pt">${esc(d.partido)} · Câmara</span></span><span class="v tag">Ver</span></a>`).join("") || '<div class="vazio">Ninguém encontrado.</div>'}</div>
  <div class="sec">DEPUTADOS ESTADUAIS</div><div class="vazio">Entram estado por estado, começando por Goiás.</div>`;
}

async function abaGastos(uf, D) {
  const r = [...D.deputados].sort((a, b) => b.gastos.total - a.gastos.total), max = r[0]?.gastos.total || 1;
  return `<p class="lead" style="margin-top:12px">Cada deputado federal recebe uma verba mensal para custos do trabalho: combustível, passagens, escritório, divulgação. Veja quanto cada um de ${NOMES[uf]} já gastou em ${D.ano}, do maior para o menor.</p>
  ${r.map((d, i) => `<a class="rk" href="#${uf}/d/${d.id}"><b>${i + 1}º</b><span><span class="nm" style="font-size:15px">${esc(d.nome)}</span> <span class="pt">${esc(d.partido)}</span><div class="t"><i style="width:${d.gastos.total / max * 100}%"></i></div></span><span>${brl(d.gastos.total)}</span></a>`).join("")}`;
}

function abaEleicoes(uf) {
  return `<div class="vazio" style="margin-top:12px"><b>Em breve:</b> quem foi eleito em ${NOMES[uf]} em 2026 (deputados e senadores), quem é novo e quem foi reeleito, e o resultado das eleições de 2024 e 2026 por cidade.</div>`;
}

async function render(uf, aba) {
  lembrar(uf);
  const D = await json(`dados/uf/${uf}.json`);
  const corpo = { noticias: abaNoticias, votacoes: abaVotacoes, politicos: abaPoliticos, gastos: abaGastos, eleicoes: abaEleicoes }[aba] || abaNoticias;
  $("app").innerHTML = topo(uf, aba) + await corpo(uf, D);
  const q = $("q");
  if (q) q.addEventListener("input", e => { busca = e.target.value; const p = e.target.selectionStart; render(uf, aba).then(() => { const n = $("q"); n.focus(); n.setSelectionRange(p, p); }); });
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
    ${card(brl(g.total), `gastos da verba do mandato em ${D.ano}`)}
  </div>
  <div class="hero" style="margin-top:14px"><div class="kick">Você e ${esc(d.nome.split(" ")[0])}</div>
  ${emComum.length ? `<p style="margin:6px 0 0;font-size:18px">Vocês concordaram em <b>${concorda} de ${emComum.length}</b> projetos.</p>` : `<p style="margin:6px 0 0">Diga como você votaria nos projetos da aba Votações e veja aqui se você concorda com este deputado.</p>`}</div>
  <h2>Como votou</h2>
  ${ps.map(p => `<a class="row" href="#${uf}/p/${slug(p.nome)}" style="text-decoration:none"><span><b style="white-space:normal">${esc(p.info?.apelido || p.nome)}</b><br><span class="pt">${dataBR(p.principal.data)} · ${esc(p.nome)}${eu[p.principal.id] ? ` · você: ${esc(eu[p.principal.id])}` : ""}</span></span>${votoTag(d.votos[p.principal.id])}</a>`).join("") || '<div class="vazio">Sem votações recentes.</div>'}
  <h2>Projetos que assinou</h2>
  <p class="pt">${Object.entries(pj.porTipo).map(([t, q]) => `${q} ${esc(t)}`).join(" · ") || "Nenhum"}. Conta também os projetos que ele só assinou junto com outros deputados (PEC precisa de muitas assinaturas).</p>
  ${pj.ultimos.map(x => `<a class="row" style="text-decoration:none;display:block" href="https://www.camara.leg.br/propostas-legislativas/${esc(x.id)}" target="_blank" rel="noopener"><b>${esc(x.nome)}</b> <span class="pt">· ${dataBR(x.data)}</span><br><span class="pt">${esc(limpa(x.ementa).slice(0, 180))}</span></a>`).join("")}
  <h2>Quanto gastou em ${D.ano}</h2>
  <div class="big">${brl(g.total)}</div>
  <p class="pt">da verba para custos do mandato. <a href="#${uf}/glossario">O que é isso?</a></p>
  ${Object.entries(g.porTipo).map(([t, v]) => `<div class="rk"><span></span><span><span class="pt">${esc(t.toLowerCase())}</span><div class="t"><i style="width:${v / maxT * 100}%"></i></div></span><span>${brl(v)}</span></div>`).join("")}
  <h2>Maiores gastos</h2>
  ${g.maiores.map(m => `<div class="row"><span><b style="white-space:normal">${esc(m.forn)}</b><br><span class="pt">${esc(m.tipo.toLowerCase())} · ${MESES[m.mes] ?? ""}${m.doc ? ` · <a href="${esc(m.doc)}" target="_blank" rel="noopener">ver nota</a>` : ""}</span></span><b>${brl(m.v)}</b></div>`).join("") || '<div class="vazio">Nenhum gasto registrado ainda.</div>'}`;
  scrollTo(0, 0);
}

async function senador(uf, id) {
  const D = await json(`dados/uf/${uf}.json`);
  const s = D.senadores.find(x => String(x.id) === id);
  if (!s) return render(uf, "politicos");
  $("app").innerHTML = `<a class="back" href="#${uf}/politicos">← Seus políticos</a>
  <div class="ph">${foto(s)}<div><div class="nm" style="font-size:24px">${esc(s.nome)}</div><div class="pt">Senador(a) · ${esc(s.partido)} · ${uf}</div></div></div>
  <div class="vazio">As votações e os gastos dos senadores entram na próxima atualização do app.</div>`;
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
    if (tipo === "d") return deputado(uf, id);
    if (tipo === "s") return senador(uf, id);
    if (tipo === "p") return paginaProjeto(uf, unslug(id));
    if (tipo === "glossario") return glossario(uf);
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
  const sh = e.target.closest("[data-share]");
  if (sh) { compartilhar(location.hash.slice(1).split("/")[0], sh.dataset.share); }
});
addEventListener("hashchange", () => { busca = ""; filtroVoto = "todos"; rota(); });
json("dados/resumo.json").then(r => { $("upd").textContent = "Última atualização: " + new Date(r.atualizado).toLocaleString("pt-BR") + "."; }).catch(() => {});
rota();
}
