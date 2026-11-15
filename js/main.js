import { createAudio } from "./audio.js";
import {
  DIRS,
  SAVE_KEY,
  UPGRADES,
  applySwipe,
  buyUpgrade,
  comboWindowMs,
  createState,
  expectedMult,
  formatSigned,
  formatYen,
  hydrate,
  offlineGain,
  prestige,
  prestigeRequirement,
  secretaryDirection,
  secretaryIntervalMs,
  takeMilestone,
  toSave,
  upgradeCost,
  upgradeEffect,
} from "./economy.js";

const stage = document.querySelector("#stage");
const stackEl = document.querySelector("#stack");
const yenEl = document.querySelector("#yen");
const lifetimeEl = document.querySelector("#lifetime");
const swipesEl = document.querySelector("#swipes");
const comboEl = document.querySelector("#combo");
const comboFill = document.querySelector("#combo-fill");
const lastEl = document.querySelector("#last-action");
const vestingEl = document.querySelector("#vesting");
const ledgerEl = document.querySelector("#ledger");
const statsEl = document.querySelector("#stats");
const fameEl = document.querySelector("#fame");
const hintEl = document.querySelector("#hint");
const bannerEl = document.querySelector("#banner");
const floatsEl = document.querySelector("#floats");
const shopEl = document.querySelector("#shop");
const upgradeList = document.querySelector("#upgrade-list");
const prestigeBox = document.querySelector("#prestige-box");
const soundBtn = document.querySelector("#sound-btn");
const canvas = document.querySelector("#fx");
const ctx = canvas.getContext("2d");
const zones = [...document.querySelectorAll(".zone")];

const audio = createAudio();
const params = new URLSearchParams(location.search);
if (params.has("reset")) localStorage.removeItem(SAVE_KEY);

const loaded = loadState();
let state = loaded.state;
let shownYen = state.yen;
let busy = false;
let queue = null;
let drag = null;
let armed = null;
let bannerTimer = 0;
let secretaryAcc = 0;
let hiddenAt = 0;
const particles = [];

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function loadState() {
  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  } catch {
    parsed = null;
  }
  const next = hydrate(parsed);
  if (!next.lastSwipeAt || Date.now() - next.lastSwipeAt > comboWindowMs(next.upgrades.sense)) next.combo = 0;
  let offline = 0;
  if (parsed && parsed.v === 1) {
    offline = offlineGain(next, Date.now() - (Number(parsed.lastSavedAt) || Date.now()));
    if (offline > 0) {
      next.yen += offline;
      next.lifetime += offline;
      takeMilestone(next);
    }
  }
  next.lastSavedAt = Date.now();
  return { state: next, offline };
}

function save() {
  state.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(toSave(state)));
}

function renderCards() {
  stackEl.replaceChildren();
  state.deck.forEach((card, index) => {
    const article = document.createElement("article");
    article.className = `card kind-${card.kind}${index === 0 ? " top" : ""}`;
    article.dataset.i = String(index);
    article.dataset.kind = card.kind;
    if (index === 0) article.setAttribute("aria-live", "off");

    const head = document.createElement("header");
    const kind = document.createElement("p");
    kind.className = "kind";
    kind.textContent = card.kindName;
    const value = document.createElement("p");
    value.className = "value";
    value.textContent = formatYen(card.base);
    head.append(kind, value);

    const title = document.createElement("h2");
    title.textContent = card.title;
    const blurb = document.createElement("p");
    blurb.className = "blurb";
    blurb.textContent = card.blurb;
    const hanko = document.createElement("p");
    hanko.className = "hanko";
    hanko.textContent = card.hanko;
    const hint = document.createElement("p");
    hint.className = "card-hint";
    hint.textContent = card.hint;

    article.append(head, title, blurb, hanko, hint);
    if (index === 0) article.setAttribute("aria-label", `${card.title} ${formatYen(card.base)}。${card.hint}`);
    stackEl.append(article);
  });
}

function renderHud() {
  lifetimeEl.textContent = `生涯 ${formatYen(state.lifetime)}`;
  swipesEl.textContent = `${state.swipes.toLocaleString("ja-JP")} 枚`;
  comboEl.textContent = state.combo > 1 ? `コンボ ×${state.combo}` : "コンボ —";
  comboEl.dataset.hot = state.combo >= 12 ? "2" : state.combo >= 5 ? "1" : "0";
  fameEl.textContent = `名声 ${state.fame}`;
  hintEl.hidden = state.swipes >= 3;
  lastEl.textContent = describe(state.history[0]);
  renderVesting();
  renderLedger();
  renderStats();
  soundBtn.textContent = state.sound ? "音 オン" : "音 オフ";
  soundBtn.setAttribute("aria-pressed", String(state.sound));
  stage.classList.toggle("hot", state.combo >= 8);
}

function renderVesting() {
  vestingEl.replaceChildren();
  vestingEl.hidden = state.vesting.length === 0;
  for (const lot of state.vesting) {
    const li = document.createElement("li");
    li.textContent = `${lot.title} · ${formatYen(lot.amount)} · あと${lot.left}枚`;
    vestingEl.append(li);
  }
}

function renderLedger() {
  ledgerEl.replaceChildren();
  if (state.history.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ一枚も弾いていない";
    ledgerEl.append(li);
    return;
  }
  for (const entry of state.history) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = entry.title;
    const money = document.createElement("span");
    const amount = entry.vested ? entry.vested.amount : entry.delta;
    money.textContent = entry.vested ? `預 ${formatYen(amount)}` : formatSigned(amount);
    money.className = amount < 0 ? "down" : "up";
    li.append(name, money);
    ledgerEl.append(li);
  }
}

function renderStats() {
  const rows = [
    ["最高コンボ", `×${state.bestCombo}`],
    ["鋭い弾き", String(state.stats.perfects)],
    ["会心", String(state.stats.crits)],
    ["見破った罠", String(state.stats.traps)],
    ["大穴", String(state.stats.jackpots)],
  ];
  statsEl.replaceChildren();
  for (const [label, value] of rows) {
    const li = document.createElement("li");
    const a = document.createElement("span");
    a.textContent = label;
    const b = document.createElement("span");
    b.textContent = value;
    li.append(a, b);
    statsEl.append(li);
  }
}

function renderShop() {
  upgradeList.replaceChildren();
  for (const [id, spec] of Object.entries(UPGRADES)) {
    const level = state.upgrades[id];
    const maxed = level >= spec.max;
    const cost = maxed ? 0 : upgradeCost(id, level);
    const row = document.createElement("article");
    row.className = "upgrade";
    const title = document.createElement("h3");
    title.textContent = `${spec.name}  Lv ${level} / ${spec.max}`;
    const blurb = document.createElement("p");
    blurb.textContent = spec.blurb;
    const now = document.createElement("p");
    now.className = "effect";
    now.textContent = `いま ${upgradeEffect(id, level)}`;
    const actions = document.createElement("div");
    actions.className = "buy-row";
    const buy = document.createElement("button");
    buy.type = "button";
    buy.textContent = maxed ? "極めた" : `${formatYen(cost)} で上げる`;
    buy.disabled = maxed || state.yen < cost;
    buy.addEventListener("click", () => purchase(id, 1));
    const max = document.createElement("button");
    max.type = "button";
    max.textContent = "最大";
    max.disabled = maxed || state.yen < cost;
    max.addEventListener("click", () => purchase(id, 99));
    actions.append(buy, max);
    row.append(title, blurb, now, actions);
    upgradeList.append(row);
  }

  prestigeBox.replaceChildren();
  const req = prestigeRequirement(state.fame);
  const heading = document.createElement("h3");
  heading.textContent = "伝説入り";
  const copy = document.createElement("p");
  copy.textContent = `手元の ${formatYen(req)} を名声に変える。収入は永続で底上げされ、金と店の強化、仕込みはリセットされる。いまの名声は ${state.fame}（×${(1 + state.fame * 0.15).toFixed(2)}）。`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prestige";
  const ready = state.yen >= req;
  button.disabled = !ready;
  button.textContent = !ready ? `あと ${formatYen(req - state.yen)}` : armed === "prestige" ? "もう一度押すと伝説になる" : "伝説入りする";
  button.addEventListener("click", () => {
    if (armed !== "prestige") {
      armed = "prestige";
      renderShop();
      return;
    }
    const result = prestige(state);
    armed = null;
    if (!result.ok) return;
    audio.jackpot();
    showBanner(`名声 ${result.fame}。稼ぎの底が上がった。`);
    secretaryAcc = 0;
    renderCards();
    renderHud();
    renderShop();
    save();
  });
  prestigeBox.append(heading, copy, button);
}

function purchase(id, count) {
  const bought = buyUpgrade(state, id, count);
  if (!bought) return;
  audio.buy();
  armed = null;
  renderHud();
  renderShop();
  save();
}

function describe(entry) {
  if (!entry) return "札は尽きない。はじけば、財布が鳴る。";
  const bits = [];
  if (entry.perfect) bits.push("鋭い弾き");
  if (entry.crit) bits.push("会心");
  if (entry.vested) bits.push(`${entry.label} ${formatYen(entry.vested.amount)} を預けた`);
  else bits.push(`${entry.label} ${formatSigned(entry.delta)}`);
  if (entry.paid?.length) {
    const sum = entry.paid.reduce((total, lot) => total + lot.amount, 0);
    bits.push(`後払い ${formatSigned(sum)}`);
  }
  bits.push(entry.combo > 1 ? `コンボ ×${entry.combo}` : "コンボ開始");
  return `${entry.title} · ${bits.join(" · ")}`;
}

function showBanner(text) {
  bannerEl.textContent = text;
  bannerEl.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    bannerEl.hidden = true;
  }, 2400);
}

function floater(text, tone) {
  const el = document.createElement("p");
  el.className = `floater tone-${tone}`;
  el.textContent = text;
  el.style.left = `${42 + Math.random() * 16}%`;
  floatsEl.append(el);
  setTimeout(() => el.remove(), 900);
}

function burst(tone) {
  const rect = stackEl.getBoundingClientRect();
  const host = stage.getBoundingClientRect();
  const x = rect.left - host.left + rect.width / 2;
  const y = rect.top - host.top + rect.height / 2;
  const count = tone === "jackpot" ? 36 : tone === "loss" ? 14 : 16;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (tone === "jackpot" ? 180 : 90) + Math.random() * 220;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      age: 0,
      life: 0.55 + Math.random() * 0.45,
      r: tone === "jackpot" ? 2 + Math.random() * 3.4 : 1.6 + Math.random() * 2.4,
      color: tone === "loss" ? "#d84a32" : tone === "vest" ? "#7d9a78" : "#e2b340",
    });
  }
}

function present(entry) {
  const tone = entry.kind === "jackpot" ? "jackpot" : entry.delta < 0 ? "loss" : entry.vested ? "vest" : "gain";
  if (entry.vested) floater(`預 ${formatYen(entry.vested.amount)}`, "vest");
  else floater(formatSigned(entry.delta), tone === "loss" ? "loss" : "gain");
  for (const lot of entry.paid) floater(`後払い ${formatSigned(lot.amount)}`, "gain");
  burst(tone);
  if (tone === "jackpot") audio.jackpot();
  else if (tone === "loss") audio.loss();
  else if (tone === "vest") audio.vest();
  else audio.coin(entry.perfect);
  audio.swipe();
  stage.classList.toggle("flash-gold", tone === "jackpot");
  stage.classList.toggle("flash-loss", tone === "loss");
  stage.classList.toggle("hot", state.combo >= 8);
  if (entry.milestone && tone === "jackpot") showBanner(`${entry.milestone.label} · 大穴`);
  else if (entry.milestone) showBanner(entry.milestone.label);
  else if (tone === "jackpot") showBanner("大穴だ。");
}

function flyClone(dir) {
  const top = stackEl.querySelector(".card.top");
  if (!top || reducedMotion) return;
  const from = top.getBoundingClientRect();
  const host = stage.getBoundingClientRect();
  const fly = top.cloneNode(true);
  fly.classList.add("flying");
  fly.style.left = `${from.left - host.left}px`;
  fly.style.top = `${from.top - host.top}px`;
  fly.style.width = `${from.width}px`;
  fly.style.height = `${from.height}px`;
  fly.style.transform = "none";
  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  stage.append(fly);
  requestAnimationFrame(() => {
    fly.style.transform = `translate(${dx * 130}%, ${dy * 140}%) rotate(${dx * 22 || dy * -8}deg)`;
    fly.style.opacity = "0";
  });
  setTimeout(() => fly.remove(), 320);
}

function commit(dir, power, fromPlayer) {
  if (!DIRS.includes(dir)) return;
  if (drag) return;
  if (busy) {
    queue = { dir, power };
    return;
  }
  busy = true;
  clearAim();
  flyClone(dir);
  const entry = applySwipe(state, dir, power, Date.now());
  renderCards();
  renderHud();
  present(entry);
  save();
  if (shopEl.open) renderShop();
  setTimeout(() => {
    busy = false;
    stage.classList.remove("flash-gold", "flash-loss");
    if (queue) {
      const next = queue;
      queue = null;
      commit(next.dir, next.power, true);
    }
  }, reducedMotion ? 40 : 280);
  if (fromPlayer) secretaryAcc = 0;
}

function clearAim() {
  for (const zone of zones) zone.classList.remove("on", "good", "bad");
  for (const button of document.querySelectorAll(".pad button")) button.classList.remove("aimed");
}

function aimAt(dir) {
  clearAim();
  if (!dir) return;
  const card = state.deck[0];
  const value = expectedMult(card.kind, dir);
  const zone = zones.find((node) => node.dataset.dir === dir);
  zone?.classList.add("on", value < 0 ? "bad" : "good");
  document.querySelector(`.pad button[data-dir="${dir}"]`)?.classList.add("aimed");
}

function dominantDir(ox, oy, vx, vy) {
  const useVelocity = Math.hypot(vx, vy) > 0.45;
  const x = useVelocity ? vx : ox;
  const y = useVelocity ? vy : oy;
  if (Math.hypot(ox, oy) < 28 && Math.hypot(vx, vy) < 0.45) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
  return y > 0 ? "down" : "up";
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  if (shopEl.open || busy) return;
  const card = event.target.closest(".card.top");
  if (!card) return;
  card.setPointerCapture(event.pointerId);
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    lx: event.clientX,
    ly: event.clientY,
    t: performance.now(),
    ox: 0,
    oy: 0,
    vx: 0,
    vy: 0,
    card,
  };
  card.style.transition = "none";
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const now = performance.now();
  const dt = Math.max(8, now - drag.t);
  drag.vx = (event.clientX - drag.lx) / dt;
  drag.vy = (event.clientY - drag.ly) / dt;
  drag.lx = event.clientX;
  drag.ly = event.clientY;
  drag.t = now;
  drag.ox = event.clientX - drag.x;
  drag.oy = event.clientY - drag.y;
  const rot = drag.ox / 18;
  drag.card.style.transform = `translate(${drag.ox}px, ${drag.oy}px) rotate(${rot}deg)`;
  aimAt(dominantDir(drag.ox, drag.oy, drag.vx, drag.vy));
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const { ox, oy, vx, vy, card } = drag;
  const dir = dominantDir(ox, oy, vx, vy);
  const speed = Math.hypot(vx, vy);
  const flung = Math.hypot(ox, oy) > 108 || speed > 0.72;
  drag = null;
  clearAim();
  if (!flung || !dir) {
    card.style.transition = "transform .34s cubic-bezier(.2,.8,.2,1)";
    card.style.transform = "";
    return;
  }
  const power = Math.max(0.45, Math.min(1, speed / 1.25));
  commit(dir, power, true);
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawParticles(dt) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.age += dt;
    const t = p.age / p.life;
    if (t >= 1) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += 420 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  shownYen += (state.yen - shownYen) * Math.min(1, dt * 9);
  if (Math.abs(state.yen - shownYen) < 1) shownYen = state.yen;
  yenEl.textContent = formatYen(shownYen);

  if (state.combo > 0 && state.lastSwipeAt) {
    const windowMs = comboWindowMs(state.upgrades.sense);
    const left = Math.max(0, windowMs - (Date.now() - state.lastSwipeAt));
    comboFill.style.transform = `scaleX(${left / windowMs})`;
  } else {
    comboFill.style.transform = "scaleX(0)";
  }

  const level = state.upgrades.secretary;
  if (level > 0 && !drag && !shopEl.open && document.visibilityState === "visible") {
    secretaryAcc += dt * 1000;
    const interval = secretaryIntervalMs(level);
    if (secretaryAcc >= interval) {
      secretaryAcc = 0;
      const dir = secretaryDirection(state.deck[0], state);
      const power = level >= 10 ? 0.86 : 0.6;
      commit(dir, power, false);
    }
  }

  drawParticles(dt);
  requestAnimationFrame(frame);
}

stage.addEventListener("pointerdown", onPointerDown);
stage.addEventListener("pointermove", onPointerMove);
stage.addEventListener("pointerup", onPointerUp);
stage.addEventListener("pointercancel", onPointerUp);

document.querySelectorAll(".pad button").forEach((button) => {
  button.addEventListener("click", () => {
    audio.setEnabled(state.sound);
    commit(button.dataset.dir, 0.7, true);
  });
});

document.querySelector("#shop-btn").addEventListener("click", () => {
  armed = null;
  renderShop();
  shopEl.showModal();
});

document.querySelector("#shop-close").addEventListener("click", () => shopEl.close());

document.querySelector("#reset-btn").addEventListener("click", () => {
  if (armed !== "reset") {
    armed = "reset";
    document.querySelector("#reset-btn").textContent = "本当に最初からにする";
    return;
  }
  localStorage.removeItem(SAVE_KEY);
  state = createState();
  shownYen = 0;
  secretaryAcc = 0;
  armed = null;
  document.querySelector("#reset-btn").textContent = "記録を消す";
  renderCards();
  renderHud();
  renderShop();
  save();
});

soundBtn.addEventListener("click", () => {
  state.sound = !state.sound;
  audio.setEnabled(state.sound);
  renderHud();
  save();
});

window.addEventListener("keydown", (event) => {
  if (event.repeat && busy) return;
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" };
  if (event.key === "Escape") return;
  if (event.key.toLowerCase() === "m" && !event.metaKey && !event.ctrlKey) {
    state.sound = !state.sound;
    audio.setEnabled(state.sound);
    renderHud();
    save();
    return;
  }
  if ((event.key === "b" || event.key === "Enter") && event.target === document.body) {
    if (!shopEl.open) {
      armed = null;
      renderShop();
      shopEl.showModal();
    }
    return;
  }
  const dir = map[event.key] || map[event.key.toLowerCase()];
  if (!dir || shopEl.open) return;
  event.preventDefault();
  const power = event.key.startsWith("Arrow") || "wasd".includes(event.key.toLowerCase()) ? 0.9 : 0.7;
  commit(dir, power, true);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    save();
    return;
  }
  if (!hiddenAt) return;
  const gain = offlineGain(state, Date.now() - hiddenAt);
  hiddenAt = 0;
  if (gain <= 0) return;
  state.yen += gain;
  state.lifetime += gain;
  const milestone = takeMilestone(state);
  showBanner(`留守中に秘書が ${formatYen(gain)} 稼いだ`);
  if (milestone) showBanner(milestone.label);
  renderHud();
  save();
});

window.addEventListener("resize", resizeCanvas);

if (loaded.offline > 0) showBanner(`留守中に秘書が ${formatYen(loaded.offline)} 稼いだ`);
audio.setEnabled(state.sound);
resizeCanvas();
renderCards();
renderHud();
save();
requestAnimationFrame(frame);
