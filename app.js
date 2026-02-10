/* 个人炒股工作台（前端原型）
 * - 无外部依赖；示例数据用于演示交互与布局
 * - 数据持久化：localStorage
 */

const LS_KEYS = {
  strategies: "sa_strategies_v1",
  watchlist: "sa_watchlist_v1",
  layoutLocked: "sa_layout_locked_v1",
  marketSeed: "sa_market_seed_v1",
};

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

// ------------------ 示例数据 ------------------

const SAMPLE_STOCKS = [
  {
    code: "600519",
    name: "贵州茅台",
    industry: "白酒",
    mcapYi: 22000,
    pe: 30.5,
    turnPct: 0.8,
    price: 1688.2,
    chgPct: 1.12,
    tech: { ma5Up: true, break20d: false, rsiRebound: false },
    profile: { region: "贵州", concept: ["消费", "高端"] },
  },
  {
    code: "300750",
    name: "宁德时代",
    industry: "新能源",
    mcapYi: 7200,
    pe: 21.8,
    turnPct: 2.3,
    price: 178.6,
    chgPct: -0.85,
    tech: { ma5Up: false, break20d: false, rsiRebound: true },
    profile: { region: "福建", concept: ["电池", "储能"] },
  },
  {
    code: "688981",
    name: "中芯国际",
    industry: "半导体",
    mcapYi: 5400,
    pe: 42.2,
    turnPct: 3.8,
    price: 48.32,
    chgPct: 3.26,
    tech: { ma5Up: true, break20d: true, rsiRebound: false },
    profile: { region: "上海", concept: ["芯片", "国产替代"] },
  },
  {
    code: "002230",
    name: "科大讯飞",
    industry: "AI应用",
    mcapYi: 1600,
    pe: 95.4,
    turnPct: 6.1,
    price: 46.8,
    chgPct: 5.88,
    tech: { ma5Up: true, break20d: true, rsiRebound: false },
    profile: { region: "安徽", concept: ["AI", "教育"] },
  },
  {
    code: "601318",
    name: "中国平安",
    industry: "保险",
    mcapYi: 7400,
    pe: 8.6,
    turnPct: 1.4,
    price: 41.22,
    chgPct: 0.32,
    tech: { ma5Up: false, break20d: false, rsiRebound: false },
    profile: { region: "深圳", concept: ["金融", "红利"] },
  },
  {
    code: "000858",
    name: "五粮液",
    industry: "白酒",
    mcapYi: 5400,
    pe: 24.2,
    turnPct: 1.2,
    price: 132.6,
    chgPct: -1.42,
    tech: { ma5Up: false, break20d: false, rsiRebound: true },
    profile: { region: "四川", concept: ["消费"] },
  },
  {
    code: "600036",
    name: "招商银行",
    industry: "银行",
    mcapYi: 9000,
    pe: 6.8,
    turnPct: 1.1,
    price: 33.48,
    chgPct: 0.62,
    tech: { ma5Up: true, break20d: false, rsiRebound: false },
    profile: { region: "深圳", concept: ["红利", "金融"] },
  },
  {
    code: "300059",
    name: "东方财富",
    industry: "券商科技",
    mcapYi: 2300,
    pe: 35.5,
    turnPct: 4.9,
    price: 16.92,
    chgPct: 2.04,
    tech: { ma5Up: true, break20d: false, rsiRebound: false },
    profile: { region: "上海", concept: ["券商", "互联网金融"] },
  },
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
  marketSeed: loadJson(LS_KEYS.marketSeed, 1234567),
  market: null,
  sectorView: "gainers",
  strategies: loadJson(LS_KEYS.strategies, []),
  watchlist: loadJson(LS_KEYS.watchlist, []),
  layoutLocked: loadJson(LS_KEYS.layoutLocked, true),
  activeStrategyId: null,
  activeStockCode: null,
  draft: null,
  cmdk: { open: false, q: "", idx: 0 },
};

// ------------------ 大盘解读渲染 ------------------

function renderMarket() {
  state.market = makeMarketSnapshot(state.marketSeed);
  saveJson(LS_KEYS.marketSeed, state.marketSeed);

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

  document.getElementById("turnover").textContent = `${fmtMoneyYi(state.market.turnoverYi)}`;
  document.getElementById("turnoverDelta").textContent = `较昨日 ${fmtPct(state.market.turnoverDeltaPct, 1)}`;
  document.getElementById("north").textContent = fmtMoneyYi(state.market.northYi);
  document.getElementById("mainForce").textContent = `主力净额 ${fmtMoneyYi(state.market.mainForceYi)}`;
  document.getElementById("volIntensity").textContent = `${state.market.volIntensity}/100`;

  document.getElementById("advDecl").textContent = `${state.market.adv} / ${state.market.decl}`;
  document.getElementById("advDeclRatio").textContent = fmtNum(state.market.advDeclRatio, 2);
  document.getElementById("volumeChange").textContent = fmtPct(state.market.volChangePct, 1);
  document.getElementById("limitStats").textContent = `${state.market.upLimit} / ${state.market.downLimit}`;

  const ring = document.getElementById("sentimentRing");
  const score = state.market.sentimentScore;
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
    <b>量能判断：</b>${escapeHtml(liquidity)}。
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

function saveStrategyFromDraft() {
  const d = draftFromForm();
  if (!d.name) {
    toast("缺少策略名称", "为了便于复用，请给策略起个名字（也可以很短）。");
    return;
  }
  const s = {
    ...d,
    id: uid("stg"),
    createdAt: Date.now(),
  };
  state.strategies.unshift(s);
  saveJson(LS_KEYS.strategies, state.strategies);
  state.activeStrategyId = s.id;
  toast("已保存策略", `“${s.name}” 已加入策略列表。`);
  renderStrategies();
  runScreen(s);
  renderCmdk();
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
  const s = strategyLike || draftFromForm();
  const rows = SAMPLE_STOCKS.filter((stk) => matchStrategy(stk, s));
  renderActiveFilters(s);
  renderScreenTable(rows);
}

function matchStrategy(stk, s) {
  const f = s.filters || {};
  if (f.peMax != null && !(stk.pe <= f.peMax)) return false;
  if (f.mcapMaxYi != null && !(stk.mcapYi <= f.mcapMaxYi)) return false;
  if (f.turnMinPct != null && !(stk.turnPct >= f.turnMinPct)) return false;
  if (f.tech) {
    if (f.tech === "ma_up_5" && !stk.tech.ma5Up) return false;
    if (f.tech === "break_20d" && !stk.tech.break20d) return false;
    if (f.tech === "rsi_oversold" && !stk.tech.rsiRebound) return false;
  }
  return true;
}

function renderActiveFilters(s) {
  const host = document.getElementById("activeFilters");
  const f = s.filters || {};
  const e = s.exits || {};
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

function renderScreenTable(rows) {
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
            const cls = r.chgPct > 0.01 ? "pos" : r.chgPct < -0.01 ? "neg" : "neu";
            return `
              <tr>
                <td>${escapeHtml(r.code)}</td>
                <td style="font-family:var(--sans);font-weight:900;">${escapeHtml(r.name)}</td>
                <td style="font-family:var(--sans);">${escapeHtml(r.industry)}</td>
                <td>${fmtNum(r.price, 2)}</td>
                <td class="${cls}">${fmtPct(r.chgPct, 2)}</td>
                <td>${fmtNum(r.pe, 1)}</td>
                <td>${fmtNum(r.mcapYi, 0)}</td>
                <td>${fmtNum(r.turnPct, 1)}</td>
                <td style="font-family:var(--sans);">
                  <button class="btn btn--ghost" data-open-stock="${escapeHtml(r.code)}">查看个股</button>
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
  // 真实项目这里是：行情接口/自选/最近访问/全市场搜索
  const base = [...SAMPLE_STOCKS];
  const inWatch = new Set(state.watchlist);
  // watchlist 优先置顶
  base.sort((a, b) => Number(inWatch.has(b.code)) - Number(inWatch.has(a.code)));
  return base;
}

function renderStockList() {
  const q = (document.getElementById("stockSearch").value || "").trim().toLowerCase();
  const list = document.getElementById("stockList");
  const watch = new Set(state.watchlist);
  const rows = allStocks().filter((s) => {
    if (!q) return true;
    const blob = `${s.code} ${s.name} ${s.industry} ${(s.profile?.concept || []).join(" ")}`.toLowerCase();
    return blob.includes(q);
  });
  if (!rows.length) {
    list.innerHTML = `<div class="empty">没有匹配结果。试试输入“行业/概念/代码前缀”。</div>`;
    return;
  }
  list.innerHTML = rows
    .map((s) => {
      const active = s.code === state.activeStockCode ? "is-active" : "";
      const cls = s.chgPct > 0.01 ? "pos" : s.chgPct < -0.01 ? "neg" : "neu";
      const inW = watch.has(s.code);
      return `
        <div class="item ${active}" data-stock-code="${escapeHtml(s.code)}">
          <div class="item__top">
            <div class="item__title"><span class="code">${escapeHtml(s.code)}</span> ${escapeHtml(s.name)}</div>
            <div class="item__meta">
              <span class="tag ${cls}">${fmtPct(s.chgPct, 2)}</span>
              <span class="tag">${escapeHtml(s.industry)}</span>
              <span class="tag">${inW ? "自选✓" : "未自选"}</span>
            </div>
          </div>
          <div class="item__sub">价格 ${fmtNum(s.price, 2)} · PE ${fmtNum(s.pe, 1)} · 市值 ${fmtNum(s.mcapYi, 0)}亿 · 换手 ${fmtNum(
            s.turnPct,
            1,
          )}%</div>
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

function renderStockDetail() {
  const host = document.getElementById("stockDetail");
  const s = SAMPLE_STOCKS.find((x) => x.code === state.activeStockCode);
  if (!s) {
    host.classList.add("is-empty");
    host.innerHTML = `<div class="empty">先在左侧选择一只股票。</div>`;
    return;
  }
  host.classList.remove("is-empty");
  const watch = new Set(state.watchlist);
  const cls = s.chgPct > 0.01 ? "pos" : s.chgPct < -0.01 ? "neg" : "neu";
  const concepts = (s.profile?.concept || []).map((c) => `<span class="pill">${escapeHtml(c)}</span>`).join("");

  const analysis = autoAnalysisForStock(s, state.market);
  const strategies = state.strategies.slice(0, 6);
  const strategyOptions = strategies
    .map((st) => `<option value="${escapeHtml(st.id)}">${escapeHtml(st.name || "未命名策略")}</option>`)
    .join("");

  host.innerHTML = `
    <div class="detailHeader">
      <div>
        <div class="detailTitle">${escapeHtml(s.name)} <span class="code">${escapeHtml(s.code)}</span></div>
        <div class="detailSub">行业：${escapeHtml(s.industry)} · 地区：${escapeHtml(s.profile?.region || "—")}</div>
        <div class="pillRow">
          <span class="pill">价格 ${fmtNum(s.price, 2)}</span>
          <span class="pill ${cls}">涨跌 ${fmtPct(s.chgPct, 2)}</span>
          <span class="pill">PE ${fmtNum(s.pe, 1)}</span>
          <span class="pill">市值 ${fmtNum(s.mcapYi, 0)}亿</span>
          <span class="pill">换手 ${fmtNum(s.turnPct, 1)}%</span>
          ${concepts}
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn btn--ghost" id="btnToggleWatch">${watch.has(s.code) ? "移出自选" : "加入自选"}</button>
        <button class="btn" id="btnQuickRun">运行策略回放</button>
      </div>
    </div>

    <div class="analysis">
      <b>自动解读（示例规则生成）：</b><br/>
      ${analysis}
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

  document.getElementById("btnToggleWatch").addEventListener("click", () => toggleWatch(s.code));
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

function autoAnalysisForStock(stk, market) {
  const bits = [];
  if (stk.chgPct >= 3) bits.push(`涨幅偏强（${fmtPct(stk.chgPct, 2)}），注意是否来自板块共振而非单独脉冲。`);
  if (stk.chgPct <= -2) bits.push(`回撤明显（${fmtPct(stk.chgPct, 2)}），若无基本面催化，优先看支撑与量能。`);
  if (stk.pe <= 12) bits.push(`估值偏低（PE ${fmtNum(stk.pe, 1)}），更适合做“低估值修复+趋势确认”。`);
  if (stk.pe >= 60) bits.push(`估值偏高（PE ${fmtNum(stk.pe, 1)}），更适合做“强趋势/题材催化”，风控更硬。`);
  if (stk.turnPct >= 5) bits.push(`换手活跃（${fmtNum(stk.turnPct, 1)}%），更容易走出短线情绪波段。`);
  if (stk.turnPct <= 1.2) bits.push(`换手偏低（${fmtNum(stk.turnPct, 1)}%），更像中线资金博弈，信号需更确认。`);

  const sector = market?.sectors?.find((x) => x.name === stk.industry) || null;
  if (market && sector) {
    bits.push(`板块参考：${stk.industry} 涨跌 ${fmtPct(sector.gainPct, 2)}，资金 ${fmtMoneyYi(sector.moneyYi)}（示例）。`);
  } else if (market) {
    const hot = [...market.sectors].sort((a, b) => b.gainPct - a.gainPct)[0];
    bits.push(`板块主线：当前领先的是 ${hot.name}（示例）。如果你做主线，优先顺着它找结构更好的标的。`);
  }

  const tech = [];
  if (stk.tech.ma5Up) tech.push("5日均线上行");
  if (stk.tech.break20d) tech.push("突破20日高点");
  if (stk.tech.rsiRebound) tech.push("RSI超卖回升");
  if (tech.length) bits.push(`技术状态：${tech.join("、")}。`);
  else bits.push(`技术状态：暂无明显触发（示例）。`);

  if (bits.length < 3) bits.push("提示：这份解读来自规则模板；接入真实行情/财务/新闻后可更个性化。");
  return bits.map((x) => `- ${escapeHtml(x)}`).join("<br/>");
}

function runStrategyOnStock() {
  const host = document.getElementById("events");
  const stk = SAMPLE_STOCKS.find((x) => x.code === state.activeStockCode);
  if (!stk) return;
  const sel = document.getElementById("selStrategyRun");
  const days = Number(document.getElementById("rngDays").value || 60);
  const stg = state.strategies.find((x) => x.id === sel.value) || defaultStrategyDraft();
  const events = simulateTimeline(stk, stg, days);
  if (!events.length) {
    host.innerHTML = `<div class="empty">这段时间没有触发事件（示例）。你可以换策略或调时间范围。</div>`;
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
              <div class="event__time">${escapeHtml(e.time)}</div>
              <div class="event__title">${escapeHtml(e.title)}</div>
              <div class="tag">${escapeHtml(e.tag)}</div>
            </div>
            <div class="event__desc">${escapeHtml(e.desc)}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function simulateTimeline(stk, stg, days) {
  // 用确定性随机生成“回放感”，用于演示“策略→信号→动作”
  const seed = hashCode(`${stk.code}_${stg.name || "draft"}_${days}_${state.marketSeed}`);
  const rnd = seededRng(seed);
  const n = clamp(Math.round(4 + rnd() * 7), 2, 12);
  const events = [];

  const shouldTrigger = matchStrategy(stk, stg);
  const baseline = shouldTrigger ? 0.72 : 0.38;

  for (let i = 0; i < n; i++) {
    const day = clamp(Math.round(rnd() * days), 1, days);
    const t = `${day}天前`;
    const p = baseline + (rnd() - 0.5) * 0.45;
    const type = p > 0.72 ? "buy" : p < 0.30 ? "sell" : "note";
    const title =
      type === "buy"
        ? "出现买点（示例）"
        : type === "sell"
          ? "触发退出（示例）"
          : "观察提示（示例）";
    const tag =
      type === "buy"
        ? "BUY"
        : type === "sell"
          ? "SELL"
          : "NOTE";
    const reason = buildReason(stk, stg, type, rnd);
    events.push({
      time: t,
      type,
      title,
      tag,
      desc: reason,
      sortKey: day,
    });
  }

  events.sort((a, b) => a.sortKey - b.sortKey);
  return events.slice(0, 10);
}

function buildReason(stk, stg, type, rnd) {
  const f = stg.filters || {};
  const e = stg.exits || {};
  const pieces = [];

  if (type === "buy") {
    if (f.tech) pieces.push(`技术触发：${techLabel(f.tech)}（示例匹配）。`);
    else if (stk.tech.break20d) pieces.push("结构偏强：疑似突破后回踩承接（示例）。");
    if (f.peMax != null) pieces.push(`估值过滤：PE ${fmtNum(stk.pe, 1)} ≤ ${f.peMax}。`);
    if (f.mcapMaxYi != null) pieces.push(`市值过滤：${fmtNum(stk.mcapYi, 0)}亿 ≤ ${f.mcapMaxYi}亿。`);
    if (f.turnMinPct != null) pieces.push(`活跃度：换手 ${fmtNum(stk.turnPct, 1)}% ≥ ${f.turnMinPct}%。`);
    if (!pieces.length) pieces.push("策略较宽：以盘面确认作为入场条件（示例）。");
    pieces.push(rnd() > 0.5 ? "建议：分批试错，止损线先设定再下单。" : "建议：等二次确认，避免追涨。");
    return pieces.join(" ");
  }

  if (type === "sell") {
    if (e.stopLossPct != null) pieces.push(`风控触发：止损 ${e.stopLossPct}%（示例）。`);
    else if (e.exitPattern) pieces.push(`形态触发：${exitLabel(e.exitPattern)}（示例）。`);
    else pieces.push("退出：情绪转弱或结构破坏（示例）。");
    pieces.push(rnd() > 0.5 ? "建议：先减仓，再看反抽。 " : "建议：果断离场，等待下一次触发。");
    return pieces.join(" ");
  }

  // note
  if (state.market) {
    const hot = [...state.market.sectors].sort((a, b) => b.gainPct - a.gainPct)[0];
    pieces.push(`主线参考：${hot.name}（示例），关注板块共振。`);
  }
  pieces.push(rnd() > 0.55 ? "注意：量能不足时少做突破。 " : "注意：强势回踩更有性价比。 ");
  if (f.tech) pieces.push(`你的策略偏向：${techLabel(f.tech)}。`);
  return pieces.join(" ");
}

function hashCode(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  for (const stk of SAMPLE_STOCKS.slice(0, 8)) {
    items.push({
      title: `打开个股：${stk.name} ${stk.code}`,
      hint: `行业 ${stk.industry} · 价格 ${fmtNum(stk.price, 2)} · 涨跌 ${fmtPct(stk.chgPct, 2)}`,
      run: () => {
        setTab("stocks");
        setActiveStock(stk.code);
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
    state.marketSeed = Math.floor(Math.random() * 1e9);
    renderMarket();
    toast("已刷新示例大盘", "用于演示不同盘面下的“快读提示”。");
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
    const text = document.getElementById("nlStrategy").value || "";
    const parsed = parseNLIntoDraft(text, draftFromForm());
    applyDraftToForm(parsed);
    toast("已解析自然语言", "已尽量宽松地映射为条件；你可以继续手动微调。");
    runScreen(parsed);
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
    const pick = SAMPLE_STOCKS[Math.floor(Math.random() * SAMPLE_STOCKS.length)];
    toggleWatch(pick.code);
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

  // 初始：若无策略，放一条示例策略
  if (!state.strategies.length) {
    state.strategies = [
      {
        id: uid("stg"),
        name: "低估值趋势（示例）",
        createdAt: Date.now() - 1000 * 60 * 7,
        filters: { peMax: 25, mcapMaxYi: 500, turnMinPct: 2, tech: "ma_up_5", note: "只做主线回踩" },
        exits: { takeProfitPct: 12, stopLossPct: -6, exitPattern: "close_below_ma10" },
        tags: ["估值", "技术", "活跃", "风控"],
        nl: "PE小于25，市值小于500亿，换手大于2%，5日均线向上，止盈12%，止损-6%，跌破10日线退出",
      },
    ];
    saveJson(LS_KEYS.strategies, state.strategies);
  }

  renderMarket();
  renderStrategies();
  applyDraftToForm(state.strategies[0] || defaultStrategyDraft());
  runScreen(state.strategies[0] || defaultStrategyDraft());
  renderStockList();

  // 默认选中第一只股票
  setActiveStock(SAMPLE_STOCKS[0].code);
}

bootstrap();

