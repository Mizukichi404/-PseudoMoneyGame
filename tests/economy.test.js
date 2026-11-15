import assert from "node:assert/strict";
import test from "node:test";
import {
  applySwipe,
  bestDirection,
  buyUpgrade,
  createState,
  formatYen,
  hydrate,
  offlineGain,
  prestige,
  prestigeRequirement,
  secretaryDirection,
  toSave,
  upgradeCost,
} from "../js/economy.js";

const calm = () => 0.99;

test("the first card is a scripted gig you can cash right away", () => {
  const state = createState(1_000, calm);
  assert.equal(state.deck[0].title, "まかないの深夜バイト");
  assert.equal(state.deck[0].base, 120);
  assert.equal(state.deck.length, 3);
  const entry = applySwipe(state, "right", 0.5, 1_000, calm);
  assert.equal(entry.delta, 120);
  assert.equal(state.yen, 120);
  assert.equal(state.lifetime, 120);
  assert.equal(state.swipes, 1);
  assert.equal(state.deck.length, 3);
});

test("a sharp flick pays more than a slow drag", () => {
  const slow = createState(0, calm);
  const fast = createState(0, calm);
  applySwipe(slow, "right", 0.5, 1_000, calm);
  applySwipe(fast, "right", 0.95, 1_000, calm);
  assert.equal(slow.yen, 120);
  assert.equal(fast.yen, 180);
  assert.equal(fast.stats.perfects, 1);
});

test("combo builds inside the window and breaks when you wait", () => {
  const state = createState(0, calm);
  applySwipe(state, "right", 0.5, 1_000, calm);
  applySwipe(state, "right", 0.5, 1_500, calm);
  applySwipe(state, "right", 0.5, 2_000, calm);
  assert.equal(state.combo, 3);
  assert.equal(state.bestCombo, 3);
  applySwipe(state, "right", 0.5, 2_000 + 1_200, calm);
  assert.equal(state.combo, 1);
});

test("looking away holds a combo, and a trap snaps it", () => {
  const state = createState(0, calm);
  applySwipe(state, "right", 0.5, 1_000, calm);
  applySwipe(state, "right", 0.5, 1_400, calm);
  assert.equal(state.combo, 2);
  applySwipe(state, "down", 0.5, 1_800, calm);
  assert.equal(state.combo, 2);
  state.deck[0] = { ...state.deck[0], kind: "trap", base: 1000, title: "罠" };
  state.yen = 5000;
  const before = state.yen;
  const entry = applySwipe(state, "right", 0.5, 2_000, calm);
  assert.ok(entry.delta < 0);
  assert.ok(state.yen < before);
  assert.equal(state.combo, 0);
  assert.ok(state.yen >= 0);
});

test("passing on a trap keeps the combo and pays a finder's fee when negotiated", () => {
  const state = createState(0, calm);
  state.deck[0] = { ...state.deck[0], kind: "trap", base: 1000, title: "罠" };
  state.combo = 4;
  state.lastSwipeAt = 5_000;
  applySwipe(state, "down", 0.5, 5_400, calm);
  assert.equal(state.combo, 4);
  assert.ok(state.yen > 0);

  const negotiated = createState(0, calm);
  negotiated.deck[0] = { ...negotiated.deck[0], kind: "trap", base: 1000, title: "罠" };
  const entry = applySwipe(negotiated, "left", 0.5, 1_000, calm);
  assert.equal(entry.label, "嘘を見破った");
  assert.equal(entry.delta, 950);
});

test("a long deal pays several swipes later", () => {
  const state = createState(0, calm);
  const opened = applySwipe(state, "up", 0.5, 1_000, calm);
  assert.equal(opened.delta, 0);
  assert.equal(state.vesting.length, 1);
  assert.equal(state.vesting[0].left, 5);
  assert.equal(state.yen, 0);
  for (let i = 0; i < 4; i += 1) applySwipe(state, "down", 0.5, 2_000 + i * 100, calm);
  assert.equal(state.vesting.length, 1);
  applySwipe(state, "down", 0.5, 3_000, calm);
  assert.equal(state.vesting.length, 0);
  assert.ok(state.yen > opened.vested.amount);
});

test("the sixth deal in line is gold, and nothing early is a trap", () => {
  const state = createState(0, calm);
  for (const card of state.deck) assert.notEqual(card.kind, "trap");
  for (let i = 0; i < 4; i += 1) applySwipe(state, "right", 0.5, 1_000 + i * 100, calm);
  assert.equal(state.deck[2].kind, "gold");
  assert.ok(state.deck.every((card) => card.kind !== "trap"));
});

test("upgrades spend yen and stop at the cap", () => {
  const state = createState(0, calm);
  state.yen = 1000;
  assert.equal(upgradeCost("finger", 0), 80);
  assert.equal(buyUpgrade(state, "finger", 1), 1);
  assert.equal(state.upgrades.finger, 1);
  assert.equal(state.yen, 920);
  state.yen = 0;
  assert.equal(buyUpgrade(state, "finger", 5), 0);
  state.yen = 1e15;
  buyUpgrade(state, "finger", 100);
  assert.equal(state.upgrades.finger, 25);
});

test("prestige cashes out fame and resets the shop", () => {
  const state = createState(0, calm);
  state.yen = prestigeRequirement(0) - 1;
  assert.equal(prestige(state, calm).ok, false);
  state.yen = prestigeRequirement(0);
  state.upgrades.finger = 3;
  state.lifetime = 900000;
  const result = prestige(state, calm);
  assert.equal(result.ok, true);
  assert.equal(state.fame, 1);
  assert.equal(state.yen, 0);
  assert.equal(state.upgrades.finger, 0);
  assert.equal(state.lifetime, 900000);
  assert.equal(state.deck.length, 3);
});

test("the secretary dodges, then plays the best angle", () => {
  const trap = { kind: "trap" };
  const gold = { kind: "gold" };
  assert.equal(secretaryDirection(trap, { upgrades: { secretary: 3 } }), "right");
  assert.equal(secretaryDirection(trap, { upgrades: { secretary: 4 } }), "down");
  assert.equal(secretaryDirection(trap, { upgrades: { secretary: 8 } }), "left");
  assert.equal(bestDirection(gold), "up");
  assert.equal(secretaryDirection(gold, { upgrades: { secretary: 8 } }), "up");
});

test("offline pay needs a secretary and a real absence", () => {
  const state = createState(0, calm);
  assert.equal(offlineGain(state, 60_000), 0);
  state.upgrades.secretary = 1;
  assert.equal(offlineGain(state, 3_000), 0);
  assert.equal(offlineGain(state, 24_000), 660);
});

test("saves round-trip and garbage does not crash the deck", () => {
  const state = createState(50, calm);
  applySwipe(state, "right", 0.9, 1_000, calm);
  state.upgrades.brand = 2;
  const again = hydrate(toSave(state), 2_000, calm);
  assert.equal(again.yen, state.yen);
  assert.equal(again.swipes, state.swipes);
  assert.equal(again.upgrades.brand, 2);
  assert.equal(again.history[0].title, state.history[0].title);
  assert.equal(again.history[0].delta, state.history[0].delta);
  assert.equal(again.deck.length, 3);

  const broken = hydrate({ v: 1, yen: -50, deck: [{ kind: "nope" }], upgrades: { finger: 99 } }, 0, calm);
  assert.equal(broken.yen, 0);
  assert.equal(broken.upgrades.finger, 25);
  assert.equal(broken.deck.length, 3);
  assert.ok(broken.deck.every((card) => card.title && card.base > 0));
});

test("yen formatting stays short once the stack gets thick", () => {
  assert.equal(formatYen(0), "¥0");
  assert.equal(formatYen(1200), "¥1,200");
  assert.equal(formatYen(10000), "¥1万");
  assert.equal(formatYen(12345), "¥1.23万");
  assert.equal(formatYen(100000000), "¥1億");
  assert.equal(formatYen(-800), "−¥800");
});
