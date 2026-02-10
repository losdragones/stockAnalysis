/* 个人炒股工作台（前端）
 * - 前端展示与交互
 * - 真实数据通过后端 API 获取（TuShare Pro），不可用时降级到示例
 */

const LS_KEYS = {
  watchlist: "sa_watchlist_v1",
  layoutLocked: "sa_layout_locked_v1",
};

const API_BASE = "/api";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtNum(n, digits = 2) {
  if (typeof n !== "number" || Number.isNaN(n)) return "--";
  return n.toFixed(digits);
}

function fmtPct(n, digits = 2) {
  if (typeof n !== "number" || Number.isNaN(n)) return "--";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtMoneyYi(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "--";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}亿`;
}

function nowHHMM() {
  const d = new Date();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

function toast(title, desc) {
  const host = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="toast__title">${escapeHtml(title)}</div>
    <div class="toast__desc">${escapeHtml(desc)}</div>
  `;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "200ms ease";
  }, 2600);
  setTimeout(() => el.remove(), 3000);
}

function escapeHtml(s) {
  return `${s}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadJson(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

async function fetchJSON(path, { method = "GET", body } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function seededRng(seed) {
  // xorshift32
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

// ------------------ 降级示例数据（后端不可用时兜底） ------------------
const FALLBACK_STOCKS = [
  { ts_code: "600519.SH", name: "贵州茅台", industry: "白酒" },
  { ts_code: "300750.SZ", name: "宁德时代", industry: "新能源" },
  { ts_code: "688981.SH", name: "中芯国际", industry: "半导体" },
  { ts_code: "002230.SZ", name: "科大讯飞", industry: "AI应用" },
  { ts_code: "601318.SH", name: "中国平安", industry: "保险" },
];

function makeMarketSnapshot(seed) {
  const rnd = seededRng(seed);
  const base = {
    indices: [
      { name: "上证", value: 3120 + (rnd() - 0.5) * 40, chgPct: (rnd() - 0.48) * 1.2 },
      { name: "深成", value: 9820 + (rnd() - 0.5) * 120, chgPct: (rnd() - 0.5) * 1.6 },
      { name: "创业板", value: 1980 + (rnd() - 0.5) * 60, chgPct: (rnd() - 0.5) * 2.2 },
    ],
    turnoverYi: 8200 + (rnd() - 0.5) * 2200,
    turnoverDeltaPct: (rnd() - 0.4) * 16,
    northYi: (rnd() - 0.5) * 120,
    mainForceYi: (rnd() - 0.5) * 180,
    adv: Math.round(900 + rnd() * 2300),
    decl: Math.round(700 + rnd() * 2000),
    volChangePct: (rnd() - 0.5) * 24,
    upLimit: Math.round(20 + rnd() * 90),
    downLimit: Math.round(3 + rnd() * 28),
    sectors: [
      { name: "AI应用", gainPct: 0.6 + rnd() * 5.8, moneyYi: (rnd() - 0.35) * 90 },
      { name: "半导体", gainPct: (rnd() - 0.2) * 5.0, moneyYi: (rnd() - 0.3) * 80 },
      { name: "医药", gainPct: (rnd() - 0.45) * 4.0, moneyYi: (rnd() - 0.5) * 60 },
      { name: "新能源", gainPct: (rnd() - 0.55) * 5.0, moneyYi: (rnd() - 0.4) * 85 },
      { name: "券商", gainPct: (rnd() - 0.2) * 6.2, moneyYi: (rnd() - 0.2) * 110 },
      { name: "消费", gainPct: (rnd() - 0.55) * 3.0, moneyYi: (rnd() - 0.5) * 55 },
      { name: "军工", gainPct: (rnd() - 0.35) * 5.2, moneyYi: (rnd() - 0.45) * 70 },
    ],
  };

  // 波动强度：用指数涨跌幅与量能变化的组合，0~100
  const vol =
    Math.abs(base.indices[0].chgPct) * 18 +
    Math.abs(base.indices[2].chgPct) * 14 +
    Math.abs(base.volChangePct) * 1.2;
  base.volIntensity = clamp(Math.round(vol), 6, 99);

  // 情绪分：涨跌家数比、量能变化、涨停与跌停
  const ratio = base.adv / Math.max(1, base.decl);
  const ratioScore = clamp((Math.log(ratio) / Math.log(1.5)) * 40 + 50, 0, 100);
  const volScore = clamp(50 + base.volChangePct * 1.3, 0, 100);
  const limitScore = clamp(50 + (base.upLimit - base.downLimit) * 0.35, 0, 100);
  base.sentimentScore = clamp(Math.round(ratioScore * 0.55 + volScore * 0.25 + limitScore * 0.2), 0, 100);
  base.advDeclRatio = ratio;

  return base;
}

// ------------------ 状态 ------------------

const state = {
  market: null,
  sectorView: "gainers",
  strategies: [],
  watchlist: loadJson(LS_KEYS.watchlist, []),
  layoutLocked: loadJson(LS_KEYS.layoutLocked, true),
  activeStrategyId: null,
  activeStockCode: null,
  draft: null,
  cmdk: { open: false, q: "", idx: 0 },
  stocks: [],
  charts: { kline: null },
};

// ------------------ 大盘解读渲染 ------------------

async function renderMarket() {
  try {
    const data = await fetchJSON("/market/overview");
    state.market = {
      indices: (data.indices || []).map((i) => ({
        name: i.name,
        value: i.close,
        chgPct: (i.pct_chg ?? 0) / 100,
      })),
      turnoverYi: data.turnover_yi ?? null,
      turnoverDeltaPct: null,
      northYi: null,
      mainForceYi: null,
      adv: data.sentiment?.adv ?? 0,
      decl: data.sentiment?.decl ?? 0,
      volChangePct: data.sentiment?.volume_change_pct ?? 0,
      upLimit: data.sentiment?.limit_up ?? 0,
      downLimit: data.sentiment?.limit_down ?? 0,
      sectors: (data.sectors || []).map((s) => ({ name: s.name, gainPct: s.gain_pct ?? 0, moneyYi: s.money_yi ?? 0 })),
      volIntensity: data.vol_intensity ?? 50,
      sentimentScore: data.sentiment?.score ?? 50,
    };
  } catch (e) {
    state.market = makeMarketSnapshot(1234567);
    toast("后端未就绪", "暂时使用示例大盘数据（请启动 FastAPI 并配置 TUSHARE_TOKEN）。");
  }

  const indicesEl = document.getElementById("indices");
  indicesEl.innerHTML = state.market.indices
    .map((i) => {
      const cls = i.chgPct > 0.01 ? "pos" : i.chgPct < -0.01 ? "neg" : "neu";
      return `
        <div class="index">
          <div class="index__name">${escapeHtml(i.name)}</div>
          <div class="index__val">${fmtNum(i.value, 2)}</div>
          <div class="index__chg ${cls}">${fmtPct(i.chgPct, 2)}</div>
        </div>
      `;
    })
    .join("");

  document.getElementById("turnover").textContent = state.market.turnoverYi == null ? "--" : `${fmtMoneyYi(state.market.turnoverYi)}`;
  document.getElementById("turnoverDelta").textContent =
    state.market.turnoverDeltaPct == null ? "" : `较昨日 ${fmtPct(state.market.turnoverDeltaPct, 1)}`;
  document.getElementById("north").textContent = state.market.northYi == null ? "--" : fmtMoneyYi(state.market.northYi);
  document.getElementById("mainForce").textContent = state.market.mainForceYi == null ? "" : `主力净额 ${fmtMoneyYi(state.market.mainForceYi)}`;
  document.getElementById("volIntensity").textContent = `${state.market.volIntensity}/100`;

  const ratio = state.market.decl ? state.market.adv / Math.max(1, state.market.decl) : null;
  document.getElementById("advDecl").textContent = state.market.adv && state.market.decl ? `${state.market.adv} / ${state.market.decl}` : "--";
  document.getElementById("advDeclRatio").textContent = ratio == null ? "--" : fmtNum(ratio, 2);
  document.getElementById("volumeChange").textContent = state.market.volChangePct ? fmtPct(state.market.volChangePct, 1) : "--";
  document.getElementById("limitStats").textContent =
    state.market.upLimit || state.market.downLimit ? `${state.market.upLimit} / ${state.market.downLimit}` : "--";

  const ring = document.getElementById("sentimentRing");
  const score = state.market.sentimentScore ?? 50;
  ring.style.filter = score >= 66 ? "saturate(1.15)" : score <= 38 ? "saturate(.95)" : "saturate(1)";
  document.getElementById("sentimentScore").textContent = `${score}`;
  document.getElementById("sentimentText").textContent = sentimentLabel(score);

  document.getElementById("marketNote").innerHTML = buildMarketNote(state.market);

  renderSectors();
  renderPulse();
}

function sentimentLabel(score) {
  if (score >= 78) return "高亢：追随主线，别逆势";
  if (score >= 60) return "偏暖：可择强而上";
  if (score >= 45) return "中性：等确认再加仓";
  if (score >= 28) return "偏冷：控仓等机会";
  return "冰点：以防守为主";
}

function buildMarketNote(m) {
  const bias =
    m.sentimentScore >= 66 ? "倾向顺势做强势主线" : m.sentimentScore <= 38 ? "倾向防守与低风险试错" : "倾向观察与小仓试错";
  const vol =
    m.volIntensity >= 70 ? "波动较大：单笔仓位更小，止损更硬" : m.volIntensity <= 35 ? "波动较小：更适合趋势跟随" : "波动中等：控节奏";
  const liquidity = m.turnoverDeltaPct >= 4 ? "量能上行：更容易走出合力" : m.turnoverDeltaPct <= -4 ? "量能下行：谨慎追高" : "量能平稳：注意分化";
  return `
    <b>今日操作倾向：</b>${escapeHtml(bias)}。<br/>
    <b>风险提示：</b>${escapeHtml(vol)}。<br/>
    ${m.turnoverDeltaPct == null ? "" : `<b>量能判断：</b>${escapeHtml(liquidity)}。`}
  `;
}

function renderSectors() {
  const list = document.getElementById("sectorList");
  let sectors = [...state.market.sectors];
  if (state.sectorView === "gainers") sectors.sort((a, b) => b.gainPct - a.gainPct);
  else sectors.sort((a, b) => b.moneyYi - a.moneyYi);

  const maxGain = Math.max(...sectors.map((s) => Math.abs(s.gainPct)));
  const maxMoney = Math.max(...sectors.map((s) => Math.abs(s.moneyYi)));

  list.innerHTML = sectors
    .map((s) => {
      const heat =
        state.sectorView === "gainers"
          ? clamp((Math.abs(s.gainPct) / Math.max(0.1, maxGain)) * 100, 0, 100)
          : clamp((Math.abs(s.moneyYi) / Math.max(0.1, maxMoney)) * 100, 0, 100);
      const gainCls = s.gainPct > 0.05 ? "pos" : s.gainPct < -0.05 ? "neg" : "neu";
      const moneyCls = s.moneyYi > 0.1 ? "pos" : s.moneyYi < -0.1 ? "neg" : "neu";
      const barCls = state.sectorView === "money" ? "bar money" : "bar";
      return `
        <div class="sector">
          <div class="sector__top">
            <div class="sector__name">${escapeHtml(s.name)}</div>
            <div class="sector__tags">
              <span class="tag ${gainCls}">涨跌 ${fmtPct(s.gainPct, 2)}</span>
              <span class="tag ${moneyCls}">资金 ${fmtMoneyYi(s.moneyYi)}</span>
            </div>
          </div>
          <div class="${barCls}"><div style="width:${heat.toFixed(0)}%"></div></div>
        </div>
      `;
    })
    .join("");
}

function renderPulse() {
  const m = state.market;
  const bestSector = [...m.sectors].sort((a, b) => b.gainPct - a.gainPct)[0];
  const moneySector = [...m.sectors].sort((a, b) => b.moneyYi - a.moneyYi)[0];

  const bullets = [];
  bullets.push({
    title: `主线优先级：${bestSector.name}`,
    sub: `涨幅领先 ${fmtPct(bestSector.gainPct, 2)}，适合优先观察强势股的“回踩承接”。`,
  });
  bullets.push({
    title: `资金偏好：${moneySector.name}`,
    sub: `资金净流 ${fmtMoneyYi(moneySector.moneyYi)}，若情绪不差，可考虑“顺资金”而非猜题材。`,
  });
  bullets.push({
    title: `仓位建议：${sentimentLabel(m.sentimentScore).split("：")[0]}`,
    sub:
      m.sentimentScore >= 66
        ? `可以用“分批试错→确认加仓”的节奏，止损线更清晰。`
        : m.sentimentScore <= 38
          ? `先保命：减少追涨，更多用“低位试错+快止损”。`
          : `等待分化后的确定性：把出手变成“规则触发”。`,
  });

  document.getElementById("pulse").innerHTML = bullets
    .map(
      (b) => `
      <li>
        <div class="pulse__strong">${escapeHtml(b.title)}</div>
        <div class="pulse__sub">${escapeHtml(b.sub)}</div>
      </li>
    `,
    )
    .join("");
}

// ------------------ 策略管理 ------------------

function defaultStrategyDraft() {
  return {
    id: null,
    name: "",
    createdAt: Date.now(),
    filters: { peMax: null, mcapMaxYi: null, turnMinPct: null, tech: "", note: "" },
    exits: { takeProfitPct: null, stopLossPct: null, exitPattern: "" },
    tags: [],
    nl: "",
  };
}

function draftFromForm() {
  const d = defaultStrategyDraft();
  d.name = (document.getElementById("fName").value || "").trim();
  d.filters.peMax = toNumOrNull(document.getElementById("fPeMax").value);
  d.filters.mcapMaxYi = toNumOrNull(document.getElementById("fMcapMax").value);
  d.filters.turnMinPct = toNumOrNull(document.getElementById("fTurnMin").value);
  d.filters.tech = document.getElementById("fTech").value || "";
  d.filters.note = (document.getElementById("fNote").value || "").trim();

  d.exits.takeProfitPct = toNumOrNull(document.getElementById("fTakeProfit").value);
  d.exits.stopLossPct = toNumOrNull(document.getElementById("fStopLoss").value);
  d.exits.exitPattern = document.getElementById("fExit").value || "";

  d.nl = (document.getElementById("nlStrategy").value || "").trim();
  d.tags = inferTags(d);
  return d;
}

function applyDraftToForm(d) {
  document.getElementById("fName").value = d.name || "";
  document.getElementById("fPeMax").value = d.filters.peMax ?? "";
  document.getElementById("fMcapMax").value = d.filters.mcapMaxYi ?? "";
  document.getElementById("fTurnMin").value = d.filters.turnMinPct ?? "";
  document.getElementById("fTech").value = d.filters.tech || "";
  document.getElementById("fNote").value = d.filters.note || "";

  document.getElementById("fTakeProfit").value = d.exits.takeProfitPct ?? "";
  document.getElementById("fStopLoss").value = d.exits.stopLossPct ?? "";
  document.getElementById("fExit").value = d.exits.exitPattern || "";
  document.getElementById("nlStrategy").value = d.nl || "";
}

function toNumOrNull(v) {
  const s = `${v}`.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function inferTags(d) {
  const t = [];
  if (d.filters.peMax != null) t.push("估值");
  if (d.filters.tech) t.push("技术");
  if (d.filters.turnMinPct != null) t.push("活跃");
  if (d.exits.takeProfitPct != null || d.exits.stopLossPct != null || d.exits.exitPattern) t.push("风控");
  return t;
}

function strategySummary(s) {
  const parts = [];
  const f = s.filters || {};
  const e = s.exits || {};
  if (f.peMax != null) parts.push(`PE≤${f.peMax}`);
  if (f.mcapMaxYi != null) parts.push(`市值≤${f.mcapMaxYi}亿`);
  if (f.turnMinPct != null) parts.push(`换手≥${f.turnMinPct}%`);
  if (f.tech) parts.push(`技术：${techLabel(f.tech)}`);
  if (e.takeProfitPct != null) parts.push(`止盈${e.takeProfitPct}%`);
  if (e.stopLossPct != null) parts.push(`止损${e.stopLossPct}%`);
  if (e.exitPattern) parts.push(`形态：${exitLabel(e.exitPattern)}`);
  if (parts.length === 0) return "（空策略：仅用于手动观察/记录）";
  return parts.join(" · ");
}

function techLabel(k) {
  return (
    {
      ma_up_5: "5日均线上行",
      break_20d: "突破20日高点",
      rsi_oversold: "RSI超卖回升",
    }[k] || k
  );
}

function exitLabel(k) {
  return (
    {
      close_below_ma10: "跌破10日线",
      bearish_engulfing: "看跌吞没",
      volume_breakdown: "放量下破",
    }[k] || k
  );
}

function renderStrategies() {
  const q = (document.getElementById("strategySearch").value || "").trim().toLowerCase();
  const list = document.getElementById("strategyList");

  const items = state.strategies
    .filter((s) => {
      if (!q) return true;
      const blob = `${s.name} ${strategySummary(s)} ${(s.tags || []).join(" ")}`.toLowerCase();
      return blob.includes(q);
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (items.length === 0) {
    list.innerHTML = `<div class="empty">还没有策略。右侧可以用自然语言或表单快速创建。</div>`;
    return;
  }

  list.innerHTML = items
    .map((s) => {
      const active = s.id === state.activeStrategyId ? "is-active" : "";
      const tagHtml = (s.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      return `
        <div class="item ${active}" data-strategy-id="${escapeHtml(s.id)}">
          <div class="item__top">
            <div class="item__title">${escapeHtml(s.name || "未命名策略")}</div>
            <div class="item__meta">${tagHtml}</div>
          </div>
          <div class="item__sub">${escapeHtml(strategySummary(s))}</div>
        </div>
      `;
    })
    .join("");
}

async function refreshStrategies() {
  try {
    const data = await fetchJSON("/strategies");
    state.strategies = data.items || [];
  } catch {
    state.strategies = [];
  }
  renderStrategies();
  renderCmdk();
}

async function saveStrategyFromDraft() {
  const d = draftFromForm();
  if (!d.name) {
    toast("缺少策略名称", "为了便于复用，请给策略起个名字（也可以很短）。");
    return;
  }
  const payload = {
    name: d.name,
    dsl: {
      version: 1,
      universe: "A",
      filters: { peMax: d.filters.peMax, mcapMaxYi: d.filters.mcapMaxYi, turnMinPct: d.filters.turnMinPct, tech: d.filters.tech, note: d.filters.note },
      exits: { takeProfitPct: d.exits.takeProfitPct, stopLossPct: d.exits.stopLossPct, exitPattern: d.exits.exitPattern },
    },
  };
  try {
    const created = await fetchJSON("/strategies", { method: "POST", body: payload });
    toast("已保存策略", `“${created.name}”`);
    await refreshStrategies();
    state.activeStrategyId = created.id;
    renderStrategies();
    runScreen({ id: created.id });
  } catch (e) {
    toast("保存失败", "请确认后端已启动且已配置 TUSHARE_TOKEN。");
  }
}

function parseNLIntoDraft(text, draft) {
  const t = (text || "").trim();
  if (!t) return draft;
  const d = structuredClone(draft || defaultStrategyDraft());
  d.nl = t;

  // 规则：尽量“宽松解析”，允许缺省；不追求NLP完美
  const pe = t.match(/(?:pe|市盈率)\s*(?:小于|低于|<=|≤|不超过|<)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (pe) d.filters.peMax = Number(pe[1]);

  const mcap = t.match(/(?:市值)\s*(?:小于|低于|<=|≤|不超过|<)\s*([0-9]+(?:\.[0-9]+)?)\s*(亿|亿元)?/);
  if (mcap) d.filters.mcapMaxYi = Number(mcap[1]);

  const turn = t.match(/(?:换手)\s*(?:大于|高于|>=|≥|不少于|>)\s*([0-9]+(?:\.[0-9]+)?)\s*%?/);
  if (turn) d.filters.turnMinPct = Number(turn[1]);

  if (/(5日|五日).*(均线|ma).*(向上|上行)/.test(t)) d.filters.tech = "ma_up_5";
  if (/(突破).*(20日|二十日).*(高点|新高)/.test(t)) d.filters.tech = "break_20d";
  if (/(rsi|超卖).*(回升|反弹)/i.test(t)) d.filters.tech = "rsi_oversold";

  const tp = t.match(/(?:止盈)\s*([+\-]?\d+(?:\.\d+)?)\s*%?/);
  if (tp) d.exits.takeProfitPct = Number(tp[1]);

  const sl = t.match(/(?:止损)\s*([+\-]?\d+(?:\.\d+)?)\s*%?/);
  if (sl) d.exits.stopLossPct = Number(sl[1]);

  if (/(跌破).*(10日|十日).*(线|均线)/.test(t)) d.exits.exitPattern = "close_below_ma10";
  if (/(看跌吞没|吞没形态)/.test(t)) d.exits.exitPattern = "bearish_engulfing";
  if (/(放量).*(下破|破位)/.test(t)) d.exits.exitPattern = "volume_breakdown";

  // 名称：若未填，尝试自动生成一个短名
  if (!d.name) d.name = suggestName(d);
  d.tags = inferTags(d);
  return d;
}

function suggestName(d) {
  const f = d.filters || {};
  const e = d.exits || {};
  const bits = [];
  if (f.peMax != null) bits.push("低估值");
  if (f.tech === "ma_up_5") bits.push("趋势");
  if (f.tech === "break_20d") bits.push("突破");
  if (f.tech === "rsi_oversold") bits.push("反转");
  if (f.mcapMaxYi != null && f.mcapMaxYi <= 300) bits.push("小盘");
  if (e.stopLossPct != null) bits.push("硬止损");
  return bits.length ? `${bits.slice(0, 3).join("")}策略` : "自定义策略";
}

function runScreen(strategyLike) {
  if (strategyLike && strategyLike.id) {
    runScreenById(strategyLike.id);
    return;
  }
  runDraftScreen();
}

async function runScreenById(id) {
  try {
    const data = await fetchJSON(`/strategies/${encodeURIComponent(id)}/run`, { method: "POST" });
    const res = data.result;
    renderActiveFiltersFromDraft(draftFromForm());
    renderScreenTableFromAPI(res.items || []);
  } catch {
    toast("运行失败", "请确认后端已启动且 TuShare token 可用。");
  }
}

async function runDraftScreen() {
  const d = draftFromForm();
  renderActiveFiltersFromDraft(d);
  try {
    const payload = {
      version: 1,
      universe: "A",
      filters: { peMax: d.filters.peMax, mcapMaxYi: d.filters.mcapMaxYi, turnMinPct: d.filters.turnMinPct, tech: d.filters.tech, note: d.filters.note },
      exits: { takeProfitPct: d.exits.takeProfitPct, stopLossPct: d.exits.stopLossPct, exitPattern: d.exits.exitPattern },
    };
    const data = await fetchJSON("/strategies/run_draft", { method: "POST", body: payload });
    renderScreenTableFromAPI(data.result.items || []);
  } catch {
    renderScreenTableFromAPI([]);
  }
}

function renderActiveFiltersFromDraft(d) {
  const host = document.getElementById("activeFilters");
  const f = d.filters || {};
  const e = d.exits || {};
  const chips = [];
  if (f.peMax != null) chips.push({ k: "PE", v: `≤${f.peMax}` });
  if (f.mcapMaxYi != null) chips.push({ k: "市值", v: `≤${f.mcapMaxYi}亿` });
  if (f.turnMinPct != null) chips.push({ k: "换手", v: `≥${f.turnMinPct}%` });
  if (f.tech) chips.push({ k: "技术", v: techLabel(f.tech) });
  if (e.takeProfitPct != null) chips.push({ k: "止盈", v: `${e.takeProfitPct}%` });
  if (e.stopLossPct != null) chips.push({ k: "止损", v: `${e.stopLossPct}%` });
  if (e.exitPattern) chips.push({ k: "形态", v: exitLabel(e.exitPattern) });
  if (chips.length === 0) {
    host.innerHTML = `<span class="chip"><b>提示</b>：草稿为空，等于不过滤（用于观察全市场样本）</span>`;
    return;
  }
  host.innerHTML = chips.map((c) => `<span class="chip"><b>${escapeHtml(c.k)}</b>${escapeHtml(c.v)}</span>`).join("");
}

function renderScreenTableFromAPI(rows) {
  const host = document.getElementById("screenTable");
  if (!rows.length) {
    host.innerHTML = `<div class="empty" style="padding:14px;">没有符合条件的样本股票。你可以放宽条件或留空某些条件。</div>`;
    return;
  }
  host.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>代码</th>
          <th>名称</th>
          <th>行业</th>
          <th>价格</th>
          <th>涨跌</th>
          <th>PE</th>
          <th>市值(亿)</th>
          <th>换手%</th>
          <th>动作</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((r) => {
            const pct = Number(r.pct_chg ?? r.pct_change ?? 0);
            const cls = pct > 0.01 ? "pos" : pct < -0.01 ? "neg" : "neu";
            return `
              <tr>
                <td>${escapeHtml(r.ts_code || "")}</td>
                <td style="font-family:var(--sans);font-weight:900;">${escapeHtml(r.name || "")}</td>
                <td style="font-family:var(--sans);">${escapeHtml(r.industry || "")}</td>
                <td>${r.close != null ? fmtNum(Number(r.close), 2) : "--"}</td>
                <td class="${cls}">${r.pct_chg != null ? fmtPct(Number(r.pct_chg), 2) : "--"}</td>
                <td>${r.pe != null ? fmtNum(Number(r.pe), 1) : "--"}</td>
                <td>${r.mcap_yi != null ? fmtNum(Number(r.mcap_yi), 0) : "--"}</td>
                <td>${r.turnover_rate != null ? fmtNum(Number(r.turnover_rate), 1) : "--"}</td>
                <td style="font-family:var(--sans);">
                  <button class="btn btn--ghost" data-open-stock="${escapeHtml(r.ts_code)}">查看个股</button>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

// ------------------ 股票管理 ------------------

function allStocks() {
  const base = [...(state.stocks.length ? state.stocks : FALLBACK_STOCKS)];
  const inWatch = new Set(state.watchlist);
  base.sort((a, b) => Number(inWatch.has(b.ts_code)) - Number(inWatch.has(a.ts_code)));
  return base;
}

async function renderStockList() {
  const q = (document.getElementById("stockSearch").value || "").trim().toLowerCase();
  const list = document.getElementById("stockList");
  const watch = new Set(state.watchlist);
  if (q) {
    try {
      const data = await fetchJSON(`/stocks/search?q=${encodeURIComponent(q)}`);
      state.stocks = data.items || [];
    } catch {
      // ignore
    }
  } else if (!state.stocks.length) {
    // initial hint list
    state.stocks = FALLBACK_STOCKS;
  }
  const rows = allStocks();
  if (!rows.length) {
    list.innerHTML = `<div class="empty">没有匹配结果。试试输入“行业/概念/代码前缀”。</div>`;
    return;
  }
  list.innerHTML = rows
    .map((s) => {
      const active = s.ts_code === state.activeStockCode ? "is-active" : "";
      const cls = "neu";
      const inW = watch.has(s.ts_code);
      return `
        <div class="item ${active}" data-stock-code="${escapeHtml(s.ts_code)}">
          <div class="item__top">
            <div class="item__title"><span class="code">${escapeHtml(s.ts_code)}</span> ${escapeHtml(s.name || "")}</div>
            <div class="item__meta">
              <span class="tag">${escapeHtml(s.industry || "")}</span>
              <span class="tag">${inW ? "自选✓" : "未自选"}</span>
            </div>
          </div>
          <div class="item__sub">${escapeHtml(s.area || "")}${s.market ? ` · ${escapeHtml(s.market)}` : ""}</div>
        </div>
      `;
    })
    .join("");
}

function setActiveStock(code) {
  state.activeStockCode = code;
  renderStockList();
  renderStockDetail();
  renderCmdk();
}

async function renderStockDetail() {
  const host = document.getElementById("stockDetail");
  if (!state.activeStockCode) {
    host.classList.add("is-empty");
    host.innerHTML = `<div class="empty">先在左侧选择一只股票。</div>`;
    return;
  }
  let s;
  try {
    s = await fetchJSON(`/stocks/${encodeURIComponent(state.activeStockCode)}/profile`);
  } catch {
    s = (state.stocks || []).find((x) => x.ts_code === state.activeStockCode) || null;
  }
  if (!s) {
    host.classList.add("is-empty");
    host.innerHTML = `<div class="empty">股票信息获取失败。</div>`;
    return;
  }
  host.classList.remove("is-empty");
  const watch = new Set(state.watchlist);
  const cls = "neu";
  const concepts = "";

  const analysis = `- ${escapeHtml("已加载真实基础信息；解读模块后续接入真实行情/因子后增强。")}`;
  const strategies = state.strategies.slice(0, 6);
  const strategyOptions = strategies
    .map((st) => `<option value="${escapeHtml(st.id)}">${escapeHtml(st.name || "未命名策略")}</option>`)
    .join("");

  host.innerHTML = `
    <div class="detailHeader">
      <div>
        <div class="detailTitle">${escapeHtml(s.name || "")} <span class="code">${escapeHtml(s.ts_code)}</span></div>
        <div class="detailSub">行业：${escapeHtml(s.industry || "—")} · 地区：${escapeHtml(s.area || "—")}</div>
        <div class="pillRow">
          <span class="pill">市场 ${escapeHtml(s.market || "—")}</span>
          ${concepts}
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn btn--ghost" id="btnToggleWatch">${watch.has(s.ts_code) ? "移出自选" : "加入自选"}</button>
        <button class="btn" id="btnQuickRun">运行策略回放</button>
      </div>
    </div>

    <div class="analysis">
      <b>自动解读（示例规则生成）：</b><br/>
      ${analysis}
    </div>

    <div class="timeline">
      <div class="timeline__top">
        <div class="timeline__title">K线</div>
        <div class="timeline__controls">
          <span class="tag" id="klineTag">日线</span>
        </div>
      </div>
      <div id="klineChart" style="height:260px;"></div>
    </div>

    <div class="timeline">
      <div class="timeline__top">
        <div class="timeline__title">策略回放时间轴</div>
        <div class="timeline__controls">
          <select class="select" id="selStrategyRun">
            <option value="">选择一个策略（或留空用“空策略”）</option>
            ${strategyOptions}
          </select>
          <input class="range" id="rngDays" type="range" min="20" max="120" value="60" />
          <span class="tag" id="daysTag">60天</span>
        </div>
      </div>
      <div class="events" id="events"></div>
    </div>
  `;

  document.getElementById("btnToggleWatch").addEventListener("click", () => toggleWatch(s.ts_code));
  document.getElementById("btnQuickRun").addEventListener("click", () => {
    const sel = document.getElementById("selStrategyRun");
    if (!sel.value && state.activeStrategyId) sel.value = state.activeStrategyId;
    runStrategyOnStock();
  });
  document.getElementById("selStrategyRun").addEventListener("change", runStrategyOnStock);
  const rng = document.getElementById("rngDays");
  rng.addEventListener("input", () => {
    document.getElementById("daysTag").textContent = `${rng.value}天`;
  });
  rng.addEventListener("change", runStrategyOnStock);

  // 默认跑一次
  runStrategyOnStock();
  renderKlineChart(s.ts_code);
}

function toggleWatch(code) {
  const set = new Set(state.watchlist);
  if (set.has(code)) set.delete(code);
  else set.add(code);
  state.watchlist = [...set];
  saveJson(LS_KEYS.watchlist, state.watchlist);
  toast("自选已更新", set.has(code) ? "已加入自选。" : "已移出自选。");
  renderStockList();
  renderStockDetail();
  renderCmdk();
}

async function renderKlineChart(ts_code) {
  const el = document.getElementById("klineChart");
  if (!el || typeof LightweightCharts === "undefined") return;

  // dispose old
  el.innerHTML = "";
  const chart = LightweightCharts.createChart(el, {
    layout: { background: { color: "transparent" }, textColor: "rgba(15,23,42,.85)" },
    grid: { vertLines: { color: "rgba(15,23,42,.06)" }, horzLines: { color: "rgba(15,23,42,.06)" } },
    rightPriceScale: { borderColor: "rgba(15,23,42,.10)" },
    timeScale: { borderColor: "rgba(15,23,42,.10)" },
    height: 260,
  });
  const series = chart.addCandlestickSeries({
    upColor: "#0f9d6a",
    downColor: "#e11d48",
    borderDownColor: "#e11d48",
    borderUpColor: "#0f9d6a",
    wickDownColor: "#e11d48",
    wickUpColor: "#0f9d6a",
  });

  // last 180 days
  const end = new Date();
  const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 240);
  const fmt = (d) => `${d.getFullYear()}${`${d.getMonth() + 1}`.padStart(2, "0")}${`${d.getDate()}`.padStart(2, "0")}`;

  try {
    const data = await fetchJSON(`/stocks/${encodeURIComponent(ts_code)}/kline?start=${fmt(start)}&end=${fmt(end)}&adj=qfq`);
    const bars = (data.bars || []).map((b) => ({
      time: `${b.t.slice(0, 4)}-${b.t.slice(4, 6)}-${b.t.slice(6, 8)}`,
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
    }));
    series.setData(bars);
    chart.timeScale().fitContent();
  } catch {
    // ignore
  }
}

async function runStrategyOnStock() {
  const host = document.getElementById("events");
  if (!state.activeStockCode) return;
  const sel = document.getElementById("selStrategyRun");
  const days = Number(document.getElementById("rngDays").value || 60);

  let dsl;
  const picked = state.strategies.find((x) => x.id === sel.value);
  if (picked && picked.dsl) {
    dsl = picked.dsl;
  } else {
    const d = draftFromForm();
    dsl = {
      version: 1,
      universe: "A",
      filters: { peMax: d.filters.peMax, mcapMaxYi: d.filters.mcapMaxYi, turnMinPct: d.filters.turnMinPct, tech: d.filters.tech, note: d.filters.note },
      exits: { takeProfitPct: d.exits.takeProfitPct, stopLossPct: d.exits.stopLossPct, exitPattern: d.exits.exitPattern },
    };
  }

  try {
    const data = await fetchJSON(`/stocks/${encodeURIComponent(state.activeStockCode)}/signals?days=${encodeURIComponent(days)}`, {
      method: "POST",
      body: dsl,
    });
    const events = data.events || [];
    if (!events.length) {
      host.innerHTML = `<div class="empty">这段时间没有触发事件。</div>`;
      return;
    }
    host.innerHTML = events
      .map((e) => {
        const dotCls = e.type === "buy" ? "dot buy" : e.type === "sell" ? "dot sell" : "dot note";
        return `
          <div class="event">
            <div class="${dotCls}"></div>
            <div class="event__body">
              <div class="event__top">
                <div class="event__time">${escapeHtml(e.date)}</div>
                <div class="event__title">${escapeHtml(e.title)}</div>
                <div class="tag">${escapeHtml((e.type || "").toUpperCase())}</div>
              </div>
              <div class="event__desc">${escapeHtml(`${e.desc || ""}${e.price != null ? ` 价:${e.price}` : ""}`)}</div>
            </div>
          </div>
        `;
      })
      .join("");
  } catch {
    host.innerHTML = `<div class="empty">信号获取失败（请确认后端已启动且 TuShare token 可用）。</div>`;
  }
}

// ------------------ 指令面板（创新交互） ------------------

function openCmdk() {
  state.cmdk.open = true;
  state.cmdk.q = "";
  state.cmdk.idx = 0;
  const root = document.getElementById("cmdk");
  root.classList.remove("is-hidden");
  document.getElementById("cmdkInput").value = "";
  renderCmdk();
  setTimeout(() => document.getElementById("cmdkInput").focus(), 0);
}

function closeCmdk() {
  state.cmdk.open = false;
  document.getElementById("cmdk").classList.add("is-hidden");
}

function cmdkItems() {
  const items = [
    { title: "切换到：大盘解读", hint: "查看指数、情绪、板块热度与脉冲", run: () => setTab("market") },
    { title: "切换到：策略管理", hint: "创建/管理策略并实时筛选", run: () => setTab("strategy") },
    { title: "切换到：股票管理", hint: "搜索个股并运行策略回放", run: () => setTab("stocks") },
    { title: "新建策略（清空草稿）", hint: "开始一个新的策略草稿", run: () => newStrategyDraft() },
    {
      title: "刷新大盘示例数据",
      hint: "改变种子，模拟不同行情日的面板反馈",
      run: () => {
        state.marketSeed = Math.floor(Math.random() * 1e9);
        renderMarket();
        toast("已刷新示例大盘", "本原型未接入实时行情，先用示例数据演示体验。");
      },
    },
  ];

  // 快速运行某个策略筛选
  for (const s of state.strategies.slice(0, 8)) {
    items.push({
      title: `运行策略筛选：${s.name || "未命名策略"}`,
      hint: strategySummary(s),
      run: () => {
        setTab("strategy");
        state.activeStrategyId = s.id;
        renderStrategies();
        runScreen(s);
      },
    });
  }

  // 快速打开某只股票
  for (const stk of (state.stocks.length ? state.stocks : FALLBACK_STOCKS).slice(0, 8)) {
    items.push({
      title: `打开个股：${stk.name || ""} ${stk.ts_code}`,
      hint: `行业 ${stk.industry || ""}`,
      run: () => {
        setTab("stocks");
        setActiveStock(stk.ts_code);
      },
    });
  }
  return items;
}

function renderCmdk() {
  if (!state.cmdk.open) return;
  const q = (document.getElementById("cmdkInput").value || "").trim().toLowerCase();
  state.cmdk.q = q;
  const list = document.getElementById("cmdkList");
  const items = cmdkItems().filter((it) => {
    if (!q) return true;
    const blob = `${it.title} ${it.hint}`.toLowerCase();
    return blob.includes(q) || (q.startsWith("/") && blob.includes(q.slice(1)));
  });

  state.cmdk.idx = clamp(state.cmdk.idx, 0, Math.max(0, items.length - 1));
  if (!items.length) {
    list.innerHTML = `<div class="empty" style="padding:12px;">没有匹配项。试试输入“大盘/策略/股票/运行”。</div>`;
    return;
  }
  list.innerHTML = items
    .map((it, idx) => {
      const active = idx === state.cmdk.idx ? "is-active" : "";
      return `
        <div class="cmdkItem ${active}" data-cmdk-idx="${idx}">
          <div class="cmdkItem__title">${escapeHtml(it.title)}</div>
          <div class="cmdkItem__hint">${escapeHtml(it.hint)}</div>
        </div>
      `;
    })
    .join("");

  // 事件绑定（每次渲染简单绑定，体量小）
  list.querySelectorAll(".cmdkItem").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.getAttribute("data-cmdk-idx"));
      const it = items[idx];
      if (it) it.run();
      closeCmdk();
    });
  });
}

function runCmdkSelected() {
  const q = state.cmdk.q;
  const items = cmdkItems().filter((it) => {
    if (!q) return true;
    const blob = `${it.title} ${it.hint}`.toLowerCase();
    return blob.includes(q) || (q.startsWith("/") && blob.includes(q.slice(1)));
  });
  const it = items[state.cmdk.idx];
  if (it) it.run();
  closeCmdk();
}

// ------------------ 布局锁定/拖拽（创新交互：工作台可按习惯重排） ------------------

function initLayoutDnD() {
  const grid = document.getElementById("marketGrid");
  let dragging = null;
  let layout = [];

  function loadLayout() {
    const saved = loadJson("sa_market_layout_v1", null);
    if (Array.isArray(saved) && saved.length) layout = saved;
    else layout = [];
  }

  function saveLayout() {
    const order = [...grid.querySelectorAll(".card")].map((c) => c.getAttribute("data-card"));
    saveJson("sa_market_layout_v1", order);
  }

  function applyLayout() {
    loadLayout();
    if (!layout.length) return;
    const map = new Map([...grid.querySelectorAll(".card")].map((c) => [c.getAttribute("data-card"), c]));
    for (const key of layout) {
      const node = map.get(key);
      if (node) grid.appendChild(node);
    }
  }

  function setDraggable(enabled) {
    grid.querySelectorAll(".card").forEach((c) => {
      c.draggable = enabled;
      c.style.cursor = enabled ? "grab" : "default";
    });
  }

  function onDragStart(e) {
    if (state.layoutLocked) return;
    const card = e.target.closest(".card");
    if (!card) return;
    dragging = card;
    card.style.opacity = ".65";
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging.style.opacity = "1";
    dragging = null;
    saveLayout();
    toast("布局已保存", "你可以按自己的扫盘习惯重新排列模块。");
  }

  function onDragOver(e) {
    if (state.layoutLocked) return;
    e.preventDefault();
    const card = e.target.closest(".card");
    if (!card || !dragging || card === dragging) return;
    const rect = card.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    if (before) grid.insertBefore(dragging, card);
    else grid.insertBefore(dragging, card.nextSibling);
  }

  applyLayout();
  setDraggable(!state.layoutLocked);

  grid.addEventListener("dragstart", onDragStart);
  grid.addEventListener("dragend", onDragEnd);
  grid.addEventListener("dragover", onDragOver);

  return { setDraggable };
}

// ------------------ 导航与绑定 ------------------

function setTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.getAttribute("data-tab") === tab;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("is-active", v.getAttribute("data-view") === tab);
  });
}

function newStrategyDraft() {
  const d = defaultStrategyDraft();
  applyDraftToForm(d);
  state.activeStrategyId = null;
  renderStrategies();
  runScreen(d);
  toast("已准备新草稿", "你可以只填你在意的条件，其它留空。");
}

function bindEvents(layoutCtl) {
  // Tabs
  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => setTab(t.getAttribute("data-tab")));
  });

  // Market controls
  document.querySelectorAll(".seg__btn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg__btn").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.sectorView = b.getAttribute("data-sector-view");
      renderSectors();
    });
  });
  document.getElementById("btnRefreshMarket").addEventListener("click", () => {
    renderMarket();
    toast("已刷新", "大盘数据将从后端重新拉取（或降级为示例）。");
  });

  // Strategy
  document.getElementById("strategySearch").addEventListener("input", renderStrategies);
  document.getElementById("btnNewStrategy").addEventListener("click", newStrategyDraft);
  document.getElementById("btnSaveStrategy").addEventListener("click", saveStrategyFromDraft);
  document.getElementById("btnClearDraft").addEventListener("click", () => applyDraftToForm(defaultStrategyDraft()));
  document.getElementById("btnRunDraft").addEventListener("click", () => runScreen(draftFromForm()));

  document.getElementById("btnExampleNL").addEventListener("click", () => {
    document.getElementById("nlStrategy").value = "市值小于300亿，PE小于25，换手大于2%，近5日均线向上，止损-6%，止盈12%";
  });
  document.getElementById("btnParseNL").addEventListener("click", () => {
    parseNLAndApply();
  });

  // Strategy list click
  document.getElementById("strategyList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-strategy-id]");
    if (!item) return;
    const id = item.getAttribute("data-strategy-id");
    state.activeStrategyId = id;
    renderStrategies();
    const s = state.strategies.find((x) => x.id === id);
    if (s) {
      applyDraftToForm(s);
      runScreen(s);
      toast("已加载策略", `当前筛选已切换到：${s.name}`);
    }
  });

  // Screen table open stock
  document.getElementById("screenTable").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-stock]");
    if (!btn) return;
    const code = btn.getAttribute("data-open-stock");
    setTab("stocks");
    setActiveStock(code);
  });

  // Stocks
  document.getElementById("stockSearch").addEventListener("input", renderStockList);
  document.getElementById("stockList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-stock-code]");
    if (!item) return;
    setActiveStock(item.getAttribute("data-stock-code"));
  });
  document.getElementById("btnAddRandom").addEventListener("click", () => {
    const pick = (state.stocks.length ? state.stocks : FALLBACK_STOCKS)[Math.floor(Math.random() * (state.stocks.length ? state.stocks : FALLBACK_STOCKS).length)];
    toggleWatch(pick.ts_code);
  });

  // Layout lock
  const btnLayout = document.getElementById("btnLayout");
  const refreshLayoutButton = () => {
    btnLayout.textContent = `布局：${state.layoutLocked ? "锁定" : "解锁"}`;
  };
  refreshLayoutButton();
  btnLayout.addEventListener("click", () => {
    state.layoutLocked = !state.layoutLocked;
    saveJson(LS_KEYS.layoutLocked, state.layoutLocked);
    layoutCtl.setDraggable(!state.layoutLocked);
    refreshLayoutButton();
    toast("布局模式已切换", state.layoutLocked ? "已锁定：避免误拖拽。" : "已解锁：可拖拽重排大盘模块。");
  });

  // Command palette
  document.getElementById("btnCommand").addEventListener("click", openCmdk);
  document.getElementById("cmdk").addEventListener("click", (e) => {
    if (e.target && e.target.hasAttribute("data-cmdk-close")) closeCmdk();
  });
  document.getElementById("cmdkInput").addEventListener("input", renderCmdk);

  // Keyboard
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (state.cmdk.open) closeCmdk();
      else openCmdk();
      return;
    }
    if (e.key === "Escape" && state.cmdk.open) {
      closeCmdk();
      return;
    }
    if (!state.cmdk.open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.cmdk.idx += 1;
      renderCmdk();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.cmdk.idx -= 1;
      renderCmdk();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCmdkSelected();
    }
  });
}

// ------------------ 启动 ------------------

function initClock() {
  const el = document.getElementById("clock");
  const tick = () => (el.textContent = nowHHMM());
  tick();
  setInterval(tick, 15000);
}

function bootstrap() {
  initClock();
  const layoutCtl = initLayoutDnD();
  bindEvents(layoutCtl);

  renderMarket();
  refreshStrategies().then(() => {
    applyDraftToForm(defaultStrategyDraft());
    runDraftScreen();
  });
  renderStockList();
}

bootstrap();

async function parseNLAndApply() {
  const text = document.getElementById("nlStrategy").value || "";
  if (!text.trim()) return;
  try {
    const data = await fetchJSON("/strategies/parse_nl", { method: "POST", body: { text } });
    const dsl = data.dsl;
    const d = defaultStrategyDraft();
    d.filters.peMax = dsl.filters?.peMax ?? null;
    d.filters.mcapMaxYi = dsl.filters?.mcapMaxYi ?? null;
    d.filters.turnMinPct = dsl.filters?.turnMinPct ?? null;
    d.filters.tech = dsl.filters?.tech ?? "";
    d.filters.note = dsl.filters?.note ?? "";
    d.exits.takeProfitPct = dsl.exits?.takeProfitPct ?? null;
    d.exits.stopLossPct = dsl.exits?.stopLossPct ?? null;
    d.exits.exitPattern = dsl.exits?.exitPattern ?? "";
    if (!document.getElementById("fName").value.trim()) d.name = "新策略";
    applyDraftToForm(d);
    toast("已解析自然语言", "已映射为条件，可继续微调。");
    runDraftScreen();
  } catch {
    const parsed = parseNLIntoDraft(text, draftFromForm());
    applyDraftToForm(parsed);
    runDraftScreen();
  }
}