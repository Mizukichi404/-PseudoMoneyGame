import { CARDS } from "./content.js";

export const SAVE_KEY = "swipe-narikin-v1";

export const DIRS = ["left", "right", "up", "down"];

export const DIR_NAME = {
  right: "即金",
  left: "交渉",
  up: "長期",
  down: "見送り",
};

/** Qualitative outcomes. `mult` is applied to the printed price. */
export const KINDS = {
  gig: {
    name: "日銭",
    hanko: "日銭",
    hint: "右で即金。左は交渉。上はあとで大きく。",
    right: { type: "now", mult: 1, label: "即金" },
    left: { type: "gamble", p: 0.62, win: 1.75, lose: 0.4, winLabel: "交渉成功", loseLabel: "値切られた" },
    up: { type: "vest", mult: 2.35, after: 5, label: "後払い" },
    down: { type: "now", mult: 0.16, combo: "hold", label: "見送り" },
  },
  shop: {
    name: "商売",
    hanko: "商売",
    hint: "右はやや厚い。左は博打。上は仕込み。",
    right: { type: "now", mult: 1.15, label: "即金" },
    left: { type: "gamble", p: 0.58, win: 2.3, lose: 0.35, winLabel: "高値で売れた", loseLabel: "在庫が残った" },
    up: { type: "vest", mult: 2.7, after: 6, label: "仕込み" },
    down: { type: "now", mult: 0.2, combo: "hold", label: "見送り" },
  },
  invest: {
    name: "投資",
    hanko: "投資",
    hint: "上に置くほど跳ねる。右に売ると薄い。",
    right: { type: "now", mult: 0.72, label: "早売り" },
    left: { type: "gamble", p: 0.5, win: 2.8, lose: 0.25, winLabel: "出口が見えた", loseLabel: "含み損" },
    up: { type: "vest", mult: 3.4, after: 7, label: "長期" },
    down: { type: "now", mult: 0.22, combo: "hold", label: "見送り" },
  },
  gold: {
    name: "極上",
    hanko: "極上",
    hint: "どれでも厚い。いちばん手堅いのは右。",
    right: { type: "now", mult: 1.85, label: "即金" },
    left: { type: "now", mult: 1.45, label: "鑑定勝ち" },
    up: { type: "vest", mult: 2.8, after: 4, label: "預かり" },
    down: { type: "now", mult: 0.6, combo: "hold", label: "見送り" },
  },
  trap: {
    name: "話術",
    hanko: "特価",
    hint: "話がうますぎる。右で掴むと損。下なら避けられる。",
    right: { type: "now", mult: -0.45, combo: "reset", label: "掴まされた" },
    left: { type: "now", mult: 0.95, label: "嘘を見破った" },
    up: { type: "now", mult: -0.3, combo: "reset", label: "塩漬け" },
    down: { type: "now", mult: 0.28, combo: "hold", label: "見送って正解" },
  },
  jackpot: {
    name: "大穴",
    hanko: "大穴",
    hint: "今すぐ弾け。上に置くとさらに大きい。",
    right: { type: "now", mult: 2.1, label: "大穴" },
    left: { type: "now", mult: 1.9, label: "大穴" },
    up: { type: "vest", mult: 3.6, after: 3, label: "特大の後払い" },
    down: { type: "now", mult: 0.8, combo: "hold", label: "見送り" },
  },
};

const RANGES = {
  gig: [80, 170],
  shop: [160, 460],
  invest: [240, 760],
  gold: [900, 2600],
  trap: [700, 1800],
  jackpot: [4200, 12000],
};

export const UPGRADES = {
  finger: { name: "指さばき", blurb: "弾いた札の収入が増える。", base: 80, growth: 1.55, max: 25 },
  sense: { name: "商才", blurb: "コンボが太くなり、途切れにくくなる。", base: 150, growth: 1.62, max: 25 },
  luck: { name: "眼力", blurb: "極上と大穴が増え、罠が減る。会心が出る。", base: 220, growth: 1.7, max: 20 },
  secretary: {
    name: "敏腕秘書",
    blurb: "自動で札をさばく。Lv4で罠を避け、Lv8で最善の方向を選ぶ。",
    base: 400,
    growth: 1.85,
    max: 12,
  },
  brand: { name: "看板", blurb: "出てくる札の単価が上がる。", base: 180, growth: 1.6, max: 25 },
};

export const MILESTONES = [
  [1_000, "千円の感触"],
  [10_000, "一万円の束"],
  [100_000, "十万成金"],
  [1_000_000, "百万成金"],
  [10_000_000, "千万の景色"],
  [100_000_000, "億の扉"],
  [1_000_000_000, "十億の噂"],
  [10_000_000_000, "伝説のその先"],
  [1_000_000_000_000, "兆の部屋"],
];

const emptyUpgrades = () => ({ finger: 0, sense: 0, luck: 0, secretary: 0, brand: 0 });

export function fingerMult(level) {
  return 1 + level * 0.22;
}

export function fameMult(fame) {
  return 1 + fame * 0.15;
}

export function comboMult(combo, sense) {
  const steps = Math.max(0, Math.min(combo, 50) - 1);
  return 1 + steps * (0.06 + sense * 0.01);
}

export function earningsMult(state) {
  return fingerMult(state.upgrades.finger) * fameMult(state.fame) * comboMult(state.combo, state.upgrades.sense);
}

export function comboWindowMs(sense) {
  return Math.min(2200, 1050 + sense * 70);
}

export function critChance(luck) {
  return Math.min(0.25, 0.03 + luck * 0.012);
}

export function upgradeCost(id, level) {
  const spec = UPGRADES[id];
  return Math.floor(spec.base * spec.growth ** level);
}

export function upgradeEffect(id, level) {
  switch (id) {
    case "finger":
      return `収入 ×${fingerMult(level).toFixed(2)}`;
    case "sense":
      return `1段ごとに +${((0.06 + level * 0.01) * 100).toFixed(0)}% · 受付 ${(comboWindowMs(level) / 1000).toFixed(2)}秒`;
    case "luck":
      return `会心 ${(critChance(level) * 100).toFixed(1)}% · 良い札が増える`;
    case "secretary":
      if (level <= 0) return "まだ雇っていない";
      return `${(secretaryIntervalMs(level) / 1000).toFixed(2)}秒ごと · ${secretaryStyle(level)}`;
    case "brand":
      return `札単価 ×${(1 + level * 0.18).toFixed(2)}`;
    default:
      return "";
  }
}

export function secretaryStyle(level) {
  if (level >= 8) return "最善の方向";
  if (level >= 4) return "罠だけ避ける";
  return "右へ即金";
}

export function secretaryIntervalMs(level) {
  if (level <= 0) return Infinity;
  return Math.max(360, 2400 - (level - 1) * 180);
}

export function prestigeRequirement(fame) {
  return Math.floor(200_000 * 2.35 ** fame);
}

export function formatYen(n) {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(Math.round(n));
  if (v >= 1e12) return `${sign}¥${trimNum(v / 1e12)}兆`;
  if (v >= 1e8) return `${sign}¥${trimNum(v / 1e8)}億`;
  if (v >= 1e4) return `${sign}¥${trimNum(v / 1e4)}万`;
  return `${sign}¥${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function formatSigned(n) {
  if (n > 0) return `+${formatYen(n)}`;
  return formatYen(n);
}

function trimNum(x) {
  if (x >= 100) return String(Math.round(x));
  const digits = x >= 10 ? 1 : 2;
  return x.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}

export function expectedMult(kind, dir) {
  const spec = KINDS[kind][dir];
  if (spec.type === "gamble") return spec.p * spec.win + (1 - spec.p) * spec.lose;
  if (spec.type === "vest") return spec.mult * 0.92;
  return spec.mult;
}

export function bestDirection(card) {
  let best = "right";
  let bestValue = -Infinity;
  for (const dir of DIRS) {
    const value = expectedMult(card.kind, dir);
    if (value > bestValue) {
      bestValue = value;
      best = dir;
    }
  }
  return best;
}

export function secretaryDirection(card, state) {
  const level = state.upgrades.secretary;
  if (level >= 8) return bestDirection(card);
  if (level >= 4 && card.kind === "trap") return "down";
  return "right";
}

function rollBase(kind, brand, rng) {
  const [lo, hi] = RANGES[kind];
  const scale = 1 + brand * 0.18;
  return Math.max(1, Math.round((lo + (hi - lo) * rng()) * scale));
}

function makeCard(kind, state, rng, fixed) {
  const meta = KINDS[kind];
  const pool = CARDS[kind];
  const picked = fixed ? null : pool[Math.floor(rng() * pool.length)];
  return {
    id: state.nextId++,
    kind,
    title: fixed?.title ?? picked.title,
    blurb: fixed?.blurb ?? picked.blurb,
    base: fixed?.base ?? rollBase(kind, state.upgrades.brand, rng),
    hanko: meta.hanko,
    kindName: meta.name,
    hint: meta.hint,
  };
}

export function drawCard(state, rng = Math.random) {
  const serial = state.swipes + state.deck.length;
  if (serial === 0) {
    return makeCard("gig", state, rng, {
      title: "まかないの深夜バイト",
      blurb: "まずはこれを弾く。右なら、そのまま日当になる。",
      base: 120,
    });
  }
  if (serial === 6) return makeCard("gold", state, rng);
  return makeCard(pickKind(serial, state.upgrades.luck, rng), state, rng);
}

function pickKind(serial, luck, rng) {
  const early = serial < 8;
  const table = [
    ["gig", 48],
    ["shop", 28],
    ["invest", 16],
    ["gold", early ? 0 : 4 + luck * 0.9],
    ["trap", early ? 0 : Math.max(2, 10 - luck * 0.65)],
    ["jackpot", early ? 0 : 0.45 + luck * 0.15],
  ];
  let total = 0;
  for (const [, weight] of table) total += weight;
  let roll = rng() * total;
  for (const [kind, weight] of table) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return "gig";
}

export function createState(now = Date.now(), rng = Math.random) {
  const state = {
    yen: 0,
    lifetime: 0,
    fame: 0,
    combo: 0,
    bestCombo: 0,
    swipes: 0,
    upgrades: emptyUpgrades(),
    vesting: [],
    deck: [],
    nextId: 1,
    lastSwipeAt: 0,
    lastSavedAt: now,
    milestones: [],
    history: [],
    sound: true,
    stats: { perfects: 0, crits: 0, traps: 0, jackpots: 0 },
  };
  while (state.deck.length < 3) state.deck.push(drawCard(state, rng));
  return state;
}

function rollSpec(spec, rng) {
  if (spec.type === "gamble") {
    const win = rng() < spec.p;
    return {
      type: "now",
      mult: win ? spec.win : spec.lose,
      label: win ? spec.winLabel : spec.loseLabel,
      combo: "up",
    };
  }
  return {
    type: spec.type,
    mult: spec.mult,
    after: spec.after,
    label: spec.label,
    combo: spec.combo || "up",
  };
}

function collectVesting(state) {
  const paid = [];
  for (const lot of state.vesting) lot.left -= 1;
  const due = state.vesting.filter((lot) => lot.left <= 0);
  state.vesting = state.vesting.filter((lot) => lot.left > 0);
  for (const lot of due) {
    state.yen += lot.amount;
    state.lifetime += lot.amount;
    paid.push(lot);
  }
  return paid;
}

export function takeMilestone(state) {
  let found = null;
  for (const [amount, label] of MILESTONES) {
    if (state.lifetime >= amount && !state.milestones.includes(amount)) {
      state.milestones.push(amount);
      found = { amount, label };
    }
  }
  return found;
}

export function applySwipe(state, dir, power = 0.7, now = Date.now(), rng = Math.random) {
  const card = state.deck[0];
  if (!card || !KINDS[card.kind]?.[dir]) throw new Error("bad swipe");

  const paid = collectVesting(state);
  const spec = rollSpec(KINDS[card.kind][dir], rng);
  const inCombo = state.lastSwipeAt > 0 && now - state.lastSwipeAt <= comboWindowMs(state.upgrades.sense) && state.combo > 0;
  const comboForPay = spec.combo === "hold" ? state.combo : spec.combo === "reset" ? state.combo : inCombo ? state.combo + 1 : 1;
  const perfect = power >= 0.82 && spec.mult > 0;
  const crit = spec.mult > 0 && rng() < critChance(state.upgrades.luck);
  const mult = earningsMult({ ...state, combo: comboForPay }) * (perfect ? 1.5 : 1) * (crit ? 3 : 1);

  let delta = 0;
  let vested = null;
  if (spec.type === "vest") {
    const amount = Math.max(1, Math.round(card.base * spec.mult * mult));
    vested = { amount, left: spec.after, title: card.title };
    state.vesting.push(vested);
  } else {
    delta = Math.round(card.base * spec.mult * mult);
    if (delta < 0) delta = -Math.min(-delta, state.yen);
    state.yen += delta;
    if (delta > 0) state.lifetime += delta;
  }

  if (spec.combo === "reset") state.combo = 0;
  else if (spec.combo !== "hold") state.combo = comboForPay;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;

  state.swipes += 1;
  state.lastSwipeAt = now;
  if (perfect) state.stats.perfects += 1;
  if (crit) state.stats.crits += 1;
  if (card.kind === "trap") state.stats.traps += 1;
  if (card.kind === "jackpot") state.stats.jackpots += 1;

  state.deck.shift();
  state.deck.push(drawCard(state, rng));
  const milestone = takeMilestone(state);

  const entry = {
    label: spec.label,
    delta,
    vested,
    paid,
    title: card.title,
    kind: card.kind,
    perfect,
    crit,
    combo: state.combo,
    dir,
    milestone,
  };
  state.history.unshift(entry);
  state.history = state.history.slice(0, 12);
  return entry;
}

export function buyUpgrade(state, id, count = 1) {
  const spec = UPGRADES[id];
  if (!spec) return 0;
  let bought = 0;
  for (let i = 0; i < count; i += 1) {
    if (state.upgrades[id] >= spec.max) break;
    const cost = upgradeCost(id, state.upgrades[id]);
    if (state.yen < cost) break;
    state.yen -= cost;
    state.upgrades[id] += 1;
    bought += 1;
  }
  return bought;
}

export function prestige(state, rng = Math.random) {
  const req = prestigeRequirement(state.fame);
  if (state.yen < req) return { ok: false, req };
  state.fame += 1;
  state.yen = 0;
  state.combo = 0;
  state.lastSwipeAt = 0;
  state.upgrades = emptyUpgrades();
  state.vesting = [];
  state.deck = [];
  state.history = [];
  while (state.deck.length < 3) state.deck.push(drawCard(state, rng));
  return { ok: true, req, fame: state.fame };
}

export function offlineGain(state, elapsedMs) {
  const level = state.upgrades.secretary;
  if (level <= 0) return 0;
  const elapsed = Math.min(Math.max(0, elapsedMs), 2 * 60 * 60 * 1000);
  if (elapsed < 8000) return 0;
  const swipes = elapsed / secretaryIntervalMs(level);
  const base = 120 * (1 + state.upgrades.brand * 0.18);
  const mult = fingerMult(state.upgrades.finger) * fameMult(state.fame);
  return Math.floor(swipes * base * mult * 0.55);
}

function clampLevel(id, value) {
  const max = UPGRADES[id].max;
  const n = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(max, Math.max(0, n));
}

function sanitizeHistory(entry) {
  if (!entry || typeof entry.title !== "string" || typeof entry.label !== "string") return null;
  const vested =
    entry.vested && Number(entry.vested.amount) > 0
      ? {
          amount: Math.round(Number(entry.vested.amount)),
          left: Math.max(0, Math.floor(Number(entry.vested.left) || 0)),
          title: String(entry.vested.title || "").slice(0, 40),
        }
      : null;
  return {
    label: entry.label.slice(0, 20),
    delta: Math.round(Number(entry.delta) || 0),
    title: entry.title.slice(0, 40),
    kind: KINDS[entry.kind] ? entry.kind : "gig",
    perfect: Boolean(entry.perfect),
    crit: Boolean(entry.crit),
    combo: Math.max(0, Math.floor(Number(entry.combo) || 0)),
    dir: DIRS.includes(entry.dir) ? entry.dir : "right",
    vested,
    paid: [],
  };
}

function sanitizeCard(card, state) {
  if (!card || !KINDS[card.kind] || typeof card.title !== "string") return null;
  const base = Number(card.base);
  if (!Number.isFinite(base) || base <= 0) return null;
  return {
    id: Number(card.id) || state.nextId++,
    kind: card.kind,
    title: card.title.slice(0, 40),
    blurb: String(card.blurb || "").slice(0, 80),
    base: Math.round(base),
    hanko: KINDS[card.kind].hanko,
    kindName: KINDS[card.kind].name,
    hint: KINDS[card.kind].hint,
  };
}

export function hydrate(raw, now = Date.now(), rng = Math.random) {
  if (!raw || raw.v !== 1 || typeof raw !== "object") return createState(now, rng);
  const state = createState(now, rng);
  state.yen = Math.max(0, Math.round(Number(raw.yen) || 0));
  state.lifetime = Math.max(0, Math.round(Number(raw.lifetime) || 0));
  state.fame = Math.max(0, Math.floor(Number(raw.fame) || 0));
  state.combo = Math.max(0, Math.floor(Number(raw.combo) || 0));
  state.bestCombo = Math.max(state.combo, Math.floor(Number(raw.bestCombo) || 0));
  state.swipes = Math.max(0, Math.floor(Number(raw.swipes) || 0));
  state.nextId = Math.max(1, Math.floor(Number(raw.nextId) || 1));
  state.lastSwipeAt = Math.max(0, Number(raw.lastSwipeAt) || 0);
  state.lastSavedAt = Math.max(0, Number(raw.lastSavedAt) || now);
  state.sound = raw.sound !== false;
  state.milestones = Array.isArray(raw.milestones) ? raw.milestones.filter((n) => MILESTONES.some(([amount]) => amount === n)) : [];
  for (const id of Object.keys(UPGRADES)) state.upgrades[id] = clampLevel(id, raw.upgrades?.[id]);
  state.stats = {
    perfects: Math.max(0, Math.floor(Number(raw.stats?.perfects) || 0)),
    crits: Math.max(0, Math.floor(Number(raw.stats?.crits) || 0)),
    traps: Math.max(0, Math.floor(Number(raw.stats?.traps) || 0)),
    jackpots: Math.max(0, Math.floor(Number(raw.stats?.jackpots) || 0)),
  };
  state.vesting = Array.isArray(raw.vesting)
    ? raw.vesting
        .map((lot) => ({
          amount: Math.max(0, Math.round(Number(lot?.amount) || 0)),
          left: Math.max(0, Math.floor(Number(lot?.left) || 0)),
          title: String(lot?.title || "仕込み").slice(0, 40),
        }))
        .filter((lot) => lot.amount > 0 && lot.left > 0)
        .slice(0, 12)
    : [];
  const deck = Array.isArray(raw.deck) ? raw.deck.map((card) => sanitizeCard(card, state)).filter(Boolean) : [];
  state.deck = deck.slice(0, 3);
  while (state.deck.length < 3) state.deck.push(drawCard(state, rng));
  state.history = Array.isArray(raw.history) ? raw.history.map(sanitizeHistory).filter(Boolean).slice(0, 12) : [];
  const maxId = state.deck.reduce((max, card) => Math.max(max, card.id), 0);
  state.nextId = Math.max(state.nextId, maxId + 1);
  return state;
}

export function toSave(state) {
  return {
    v: 1,
    yen: state.yen,
    lifetime: state.lifetime,
    fame: state.fame,
    combo: state.combo,
    bestCombo: state.bestCombo,
    swipes: state.swipes,
    upgrades: state.upgrades,
    vesting: state.vesting,
    deck: state.deck,
    nextId: state.nextId,
    lastSwipeAt: state.lastSwipeAt,
    lastSavedAt: state.lastSavedAt,
    milestones: state.milestones,
    history: state.history,
    sound: state.sound,
    stats: state.stats,
  };
}
