// Cadê Meu Político? — telas do site. Lê os arquivos gerados por scripts/atualizar.mjs
{
const NOMES = {AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl = v => (v ?? 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
const dataBR = s => s ? new Date(s).toLocaleDateString("pt-BR") : "";
const MESES = ["","jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const cache = {};
let VOT = null, aba = "dep", busca = "";

async function json(url) {
  if (cache[url]) return cache[url];
  const r = await fetch(url, {cache: "no-cache"});
  if (!r.ok) throw new Error(url);
  return cache[url] = await r.json();
}

const foto = (p, cls = "av") => p.foto ? `<img class="${cls}" src="${esc(p.foto)}" alt="" loading="lazy">` : `<span class="${cls}"></span>`;
const votoTag = t => t ? `<span class="v ${esc(t)}">${esc(t)}</span>` : `<span class="v tag">Não votou</span>`;

function home() {
  aba = "dep"; busca = "";
  $("app").innerHTML = `<h1>Qual é o seu estado?</h1>
  <p class="lead">Veja como votaram, quanto gastaram e o que fizeram os políticos que representam você.</p>
  <div class="ufs">${Object.keys(NOMES).map(u => `<a class="uf" href="#${u}" aria-label="${NOMES[u]}">${u}</a>`).join("")}</div>`;
}

function placarUF(v, deps) {
  let s = 0, n = 0;
  for (const d of deps) { const t = d.votos[v.id]; if (t === "Sim") s++; else if (t === "Não") n++; }
  return {s, n};
}

async function estado(uf) {
  const D = await json(`dados/uf/${uf}.json`);
  const v = VOT[0];
  let hero = "";
  if (v) {
    const {s, n} = placarUF(v, D.deputados), tot = D.deputados.length || 1;
    hero = `<div class="hero"><div class="kick">Última votação nominal na Câmara · ${dataBR(v.data)}</div>
      <h3>${esc(v.projeto)}</h3><p class="ementa">${esc(v.ementa || v.descricao)}</p>
      <div class="bar"><div class="s" style="width:${s/tot*100}%">${s ? s + " sim" : ""}</div><div class="n" style="width:${n/tot*100}%">${n || ""}</div></div>
      <div class="legend"><span>${NOMES[uf]}: ${s} sim, ${n} não, ${tot - s - n} ausentes ou outros</span><span>Câmara toda: ${v.placar.Sim ?? 0} sim, ${v.placar["Não"] ?? 0} não</span></div></div>`;
  }
  const abas = [["dep", `Deputados federais (${D.deputados.length})`], ["sen", `Senadores (${D.senadores.length})`], ["rank", "Ranking de gastos"], ["est", "Deputados estaduais"]];
  let corpo = "";
  if (aba === "dep") {
    const k = busca.toLowerCase();
    const r = D.deputados.filter(d => (d.nome + d.partido).toLowerCase().includes(k));
    corpo = `<input type="search" id="q" value="${esc(busca)}" placeholder="Buscar nome ou partido" aria-label="Buscar">
      <div class="list">${r.map(d => `<a class="dep" href="#${uf}/d/${d.id}">${foto(d)}<span><span class="nm">${esc(d.nome)}</span><br><span class="pt">${esc(d.partido)} · ${uf}</span></span>${v ? votoTag(d.votos[v.id]) : ""}</a>`).join("") || '<p class="pt">Ninguém encontrado.</p>'}</div>`;
  } else if (aba === "sen") {
    corpo = `<div class="list">${D.senadores.map(s => `<a class="dep" href="#${uf}/s/${s.id}">${foto(s)}<span><span class="nm">${esc(s.nome)}</span><br><span class="pt">${esc(s.partido)} · ${uf}</span></span><span class="v tag">Ver</span></a>`).join("")}</div>`;
  } else if (aba === "rank") {
    const r = [...D.deputados].sort((a, b) => b.gastos.total - a.gastos.total), max = r[0]?.gastos.total || 1;
    corpo = `<p class="pt">Gastos da cota parlamentar em ${D.ano}, do maior para o menor.</p>
      ${r.map((d, i) => `<a class="rk" href="#${uf}/d/${d.id}"><b>${i + 1}º</b><span><span class="nm" style="font-size:15px">${esc(d.nome)}</span> <span class="pt">${esc(d.partido)}</span><div class="t"><i style="width:${d.gastos.total / max * 100}%"></i></div></span><span>${brl(d.gastos.total)}</span></a>`).join("")}`;
  } else {
    corpo = `<div class="soon"><b>Assembleia Legislativa</b>Os deputados estaduais entram estado por estado, começando por Goiás.</div>`;
  }
  $("app").innerHTML = `<a class="back" href="#">← Trocar estado</a><h1>${NOMES[uf]}</h1>${hero}
    <h2>Seus representantes</h2>
    <div class="chips" role="tablist">${abas.map(([k, t]) => `<button class="chip" role="tab" aria-selected="${k === aba}" data-aba="${k}">${t}</button>`).join("")}</div>${corpo}`;
  const q = $("q");
  if (q) q.addEventListener("input", e => { busca = e.target.value; const p = e.target.selectionStart; estado(uf).then(() => { const n = $("q"); n.focus(); n.setSelectionRange(p, p); }); });
}

async function deputado(uf, id) {
  const D = await json(`dados/uf/${uf}.json`);
  const d = D.deputados.find(x => String(x.id) === id);
  if (!d) return estado(uf);
  const g = d.gastos, maxT = Math.max(1, ...Object.values(g.porTipo));
  const votou = VOT.filter(v => d.votos[v.id]);
  $("app").innerHTML = `<a class="back" href="#${uf}">← ${NOMES[uf]}</a>
  <div class="ph">${foto(d)}<div><div class="nm" style="font-size:24px">${esc(d.nome)}</div><div class="pt">Deputado(a) federal · ${esc(d.partido)} · ${uf}</div></div></div>
  <h2>Gastos da cota em ${D.ano}</h2>
  <div class="big">${brl(g.total)}</div>
  ${Object.entries(g.porTipo).map(([t, v]) => `<div class="rk"><span></span><span><span class="pt">${esc(t.toLowerCase())}</span><div class="t"><i style="width:${v / maxT * 100}%"></i></div></span><span>${brl(v)}</span></div>`).join("")}
  <h2>Maiores gastos</h2>
  ${g.maiores.map(m => `<div class="row"><span><b style="white-space:normal">${esc(m.forn)}</b><br><span class="pt">${esc(m.tipo.toLowerCase())} · ${MESES[m.mes] ?? ""}${m.doc ? ` · <a href="${esc(m.doc)}" target="_blank" rel="noopener">ver nota</a>` : ""}</span></span><b>${brl(m.v)}</b></div>`).join("") || '<p class="pt">Nenhum gasto registrado ainda.</p>'}
  <h2>Como votou (últimos ${VOT.length} votos nominais)</h2>
  <p class="pt">Votou em ${votou.length} de ${VOT.length}.</p>
  ${VOT.map(v => `<div class="row"><span><b style="white-space:normal">${esc(v.projeto)}</b><br><span class="pt">${dataBR(v.data)} · ${esc(v.descricao).slice(0, 140)}</span></span>${votoTag(d.votos[v.id])}</div>`).join("")}
  <h2>Em breve</h2>
  <div class="soon"><b>Presença, emendas, projetos e campanha</b>E alertas no seu celular a cada votação de quem você segue.</div>`;
  scrollTo(0, 0);
}

async function senador(uf, id) {
  const D = await json(`dados/uf/${uf}.json`);
  const s = D.senadores.find(x => String(x.id) === id);
  if (!s) return estado(uf);
  $("app").innerHTML = `<a class="back" href="#${uf}">← ${NOMES[uf]}</a>
  <div class="ph">${foto(s)}<div><div class="nm" style="font-size:24px">${esc(s.nome)}</div><div class="pt">Senador(a) · ${esc(s.partido)} · ${uf}</div></div></div>
  <div class="soon"><b>Votações e gastos do Senado</b>Entram na próxima atualização do app.</div>`;
  scrollTo(0, 0);
}

async function rota() {
  try {
    VOT ??= await json("dados/votacoes.json");
    const [uf, tipo, id] = location.hash.slice(1).split("/");
    if (!NOMES[uf]) return home();
    if (tipo === "d") return deputado(uf, id);
    if (tipo === "s") return senador(uf, id);
    await estado(uf);
  } catch (e) {
    $("app").innerHTML = `<div class="err">Não consegui carregar os dados agora. Tente de novo em alguns minutos.</div>`;
  }
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-aba]");
  if (b) { aba = b.dataset.aba; rota(); }
});
addEventListener("hashchange", () => { if (!location.hash.includes("/")) { busca = ""; } rota(); });
json("dados/resumo.json").then(r => { $("upd").textContent = "Última atualização: " + new Date(r.atualizado).toLocaleString("pt-BR") + "."; }).catch(() => {});
rota();
}
