(() => {
  const UNIVERSE = window.YC_UNIVERSE;
  const state = { q:"", region:"Todas", sector:"Todos", thesis:"Todas", cap:"Todos", move:"Todas", sort:"quality", view:"table", quotes:{}, asOf:null };
  const $ = (id) => document.getElementById(id);
  const uniq = (list) => [...new Set(list)];
  const regions = ["Todas", ...uniq(UNIVERSE.map((x) => x.r))];
  const sectors = ["Todos", ...uniq(UNIVERSE.map((x) => x.sec))];
  const theses = ["Todas", ...uniq(UNIVERSE.flatMap((x) => x.thesis))];
  const caps = ["Todos", "Mega", "Large", "Mid"];
  const moves = ["Todas", "Alta", "Queda", "Lateral"];
  function money(value, currency) {
    if (value == null) return "—";
    const abs = Math.abs(value);
    const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
    const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const map = { BRL:"R$", EUR:"€", JPY:"¥", HKD:"HK$", KRW:"₩", INR:"₹", CHF:"CHF", GBP:"£" };
    return `${map[currency] || "US$"} ${formatted}`;
  }
  function capLabel(value) {
    if (value == null) return "—";
    if (value >= 1e12) return `${(value/1e12).toFixed(2)} T`;
    if (value >= 1e9) return `${(value/1e9).toFixed(1)} B`;
    if (value >= 1e6) return `${(value/1e6).toFixed(0)} M`;
    return String(value);
  }
  function pct(value) {
    if (value == null) return "—";
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
  const merge = (item) => ({ ...item, ...(state.quotes[item.s] || {}) });
  function filtered() {
    const q = state.q.trim().toLowerCase();
    return UNIVERSE.map(merge).filter((row) => {
      if (state.region !== "Todas" && row.r !== state.region) return false;
      if (state.sector !== "Todos" && row.sec !== state.sector) return false;
      if (state.thesis !== "Todas" && !row.thesis.includes(state.thesis)) return false;
      if (state.cap !== "Todos" && row.cap !== state.cap) return false;
      if (state.move === "Alta" && !(row.changePct > 0.15)) return false;
      if (state.move === "Queda" && !(row.changePct < -0.15)) return false;
      if (state.move === "Lateral" && (row.changePct == null || Math.abs(row.changePct) > 0.15)) return false;
      if (!q) return true;
      return `${row.s} ${row.n} ${row.sec} ${row.thesis.join(" ")}`.toLowerCase().includes(q);
    }).sort((a,b) => {
      if (state.sort === "changeDesc") return (b.changePct ?? -999) - (a.changePct ?? -999);
      if (state.sort === "changeAsc") return (a.changePct ?? 999) - (b.changePct ?? 999);
      if (state.sort === "capDesc") return (b.marketCap ?? 0) - (a.marketCap ?? 0);
      if (state.sort === "peAsc") return (a.pe ?? 9999) - (b.pe ?? 9999);
      if (state.sort === "yieldDesc") return (b.dividendYield ?? 0) - (a.dividendYield ?? 0);
      if (state.sort === "name") return a.n.localeCompare(b.n, "pt-BR");
      return (b.q ?? 0) - (a.q ?? 0);
    });
  }
  function renderChips(id, values, key) {
    $(id).innerHTML = values.map((value) => `<button type="button" class="chip ${state[key]===value?"on":""}" data-key="${key}" data-value="${value}">${value}</button>`).join("");
  }
  function renderKpis(rows) {
    const live = rows.filter((r) => r.price != null);
    $("kpis").innerHTML = `<article class="kpi"><span>No recorte</span><b>${rows.length}</b></article><article class="kpi"><span>Em alta</span><b class="up">${live.filter((r)=>r.changePct>0).length}</b></article><article class="kpi"><span>Em queda</span><b class="down">${live.filter((r)=>r.changePct<0).length}</b></article><article class="kpi"><span>Mega caps</span><b>${rows.filter((r)=>r.cap==="Mega").length}</b></article>`;
  }
  function spark(changePct) {
    const width = Math.min(100, Math.abs(changePct || 0) * 12);
    const color = changePct >= 0 ? "var(--up)" : "var(--down)";
    return `<div class="bar" aria-hidden="true"><i style="width:${width}%;background:${color}"></i></div>`;
  }
  function renderTable(rows) {
    if (!rows.length) { $("board").innerHTML = `<div class="empty">Nenhuma ação neste recorte.</div>`; return; }
    $("board").innerHTML = `<div style="overflow:auto"><table class="table"><thead><tr><th>Ativo</th><th>Praça / setor</th><th>Tese</th><th class="right">Preço</th><th class="right">Dia</th><th class="right">Valor de mcd.</th></tr></thead><tbody>${rows.map((row) => {
      const cls = (row.changePct ?? 0) >= 0 ? "up" : "down";
      return `<tr><td><span class="ticker">${row.s}</span><span class="name">${row.n}</span></td><td>${row.r}<span class="name">${row.sec} · ${row.cap}</span></td><td><div class="tags">${row.thesis.map((t)=>`<span class="tag">${t}</span>`).join("")}</div></td><td class="right">${money(row.price,row.currency)}</td><td class="right ${cls}">${pct(row.changePct)}</td><td class="right">${capLabel(row.marketCap)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function renderCards(rows) {
    if (!rows.length) { $("board").innerHTML = `<div class="empty">Nenhuma ação neste recorte.</div>`; return; }
    $("board").innerHTML = `<div class="cards">${rows.map((row) => {
      const cls = (row.changePct ?? 0) >= 0 ? "up" : "down";
      return `<article class="card"><header><div><span class="ticker">${row.s}</span><h3>${row.n}</h3></div><span class="${cls}">${pct(row.changePct)}</span></header><div class="price">${money(row.price,row.currency)}</div><div class="name">${row.r} · ${row.sec}</div></article>`;
    }).join("")}</div>`;
  }
  function render() {
    const rows = filtered();
    renderChips("regionFilters", regions, "region");
    renderChips("sectorFilters", sectors, "sector");
    renderChips("thesisFilters", theses, "thesis");
    renderChips("capFilters", caps, "cap");
    renderChips("moveFilters", moves, "move");
    renderKpis(rows);
    $("resultMeta").textContent = `${rows.length} ativos`;
    state.view === "cards" ? renderCards(rows) : renderTable(rows);
  }
  async function loadQuotes() {
    $("marketPulse").textContent = "Abrindo mesa";
    render();
  }
  function tick() {
    $("clock").textContent = new Date().toLocaleString("pt-BR", { hour:"2-digit", minute:"2-digit" });
  }
  document.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip) { state[chip.dataset.key] = chip.dataset.value; render(); }
  });
  $("q").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("resetFilters").addEventListener("click", () => {
    state.q=""; state.region="Todas"; state.sector="Todos"; state.thesis="Todas"; state.cap="Todos"; state.move="Todas"; $("q").value=""; render();
  });
  $("refresh").addEventListener("click", loadQuotes);
  $("toggleRail").addEventListener("click", () => $("rail").classList.toggle("open"));
  $("viewTable").addEventListener("click", () => { state.view="table"; $("viewTable").classList.add("on"); $("viewCards").classList.remove("on"); render(); });
  $("viewCards").addEventListener("click", () => { state.view="cards"; $("viewCards").classList.add("on"); $("viewTable").classList.remove("on"); render(); });
  tick(); setInterval(tick, 30000); render(); loadQuotes();
  window.setTimeout(() => document.body.classList.remove("splash-on"), 1600);
})();
