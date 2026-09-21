/* ==========================================================================
   GAME.JS — Motor do jogo
   Controla as telas (início, mapa, intro de fase, jogo, resultado),
   a renderização dos mini-games e a integração com data.js
   ========================================================================== */

let SAVE = loadSave();

let state = {
  phase: null,
  facts: [],
  index: 0,
  question: null,
  score: 0,
  combo: 0,
  bestComboRound: 0,
  correctFirstTry: 0,
  mistakes: 0,
  hadMistakeThisQuestion: false,
  flutterTimers: []
};

/* ---------------------------------------------------------------------- */
/* UTIL                                                                    */
/* ---------------------------------------------------------------------- */
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
function showScreen(id) {
  $all(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function totalStars() {
  return PHASES.reduce((sum, p) => sum + (SAVE.phaseStars[p.id] || 0), 0);
}

/* ---------------------------------------------------------------------- */
/* HOME SCREEN                                                             */
/* ---------------------------------------------------------------------- */
function renderHome() {
  const hasProgress = totalStars() > 0;
  $("#btn-start").textContent = hasProgress ? "Continuar Jornada" : "Começar Aventura";
  $("#home-reset-link").style.display = hasProgress ? "inline-block" : "none";
  showScreen("screen-home");
}

/* ---------------------------------------------------------------------- */
/* MAP SCREEN                                                              */
/* ---------------------------------------------------------------------- */
let justUnlockedId = null;

function renderMapPaths() {
  const svg = $("#map-path-svg");
  const NS = "http://www.w3.org/2000/svg";
  svg.innerHTML = "";
  for (let i = 0; i < PHASES.length - 1; i++) {
    const from = PHASES[i], to = PHASES[i + 1];
    const open = SAVE.unlockedPhases.includes(to.id);
    const isNew = to.id === justUnlockedId;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", from.mapPos.left);
    line.setAttribute("y1", from.mapPos.top);
    line.setAttribute("x2", to.mapPos.left);
    line.setAttribute("y2", to.mapPos.top);
    line.setAttribute("class", "map-path-segment " + (open ? "map-path-open" : "map-path-locked") + (isNew ? " map-path-new" : ""));
    svg.appendChild(line);
  }
}

function renderMap() {
  renderMapPaths();
  const container = $("#map-nodes");
  container.innerHTML = "";
  PHASES.forEach(phase => {
    const unlocked = SAVE.unlockedPhases.includes(phase.id);
    const stars = SAVE.phaseStars[phase.id] || 0;

    const node = document.createElement("button");
    node.className = "map-node" + (unlocked ? "" : " locked") + (phase.id === justUnlockedId ? " unlocked-new" : "");
    node.style.left = phase.mapPos.left + "%";
    node.style.top = phase.mapPos.top + "%";

    const circle = document.createElement("div");
    circle.className = "node-circle";
    circle.textContent = unlocked ? (phase.table === "challenge" ? "⭐" : phase.id) : "🔒";
    if (phase.id === justUnlockedId) {
      const pulse = document.createElement("div");
      pulse.className = "node-pulse";
      circle.appendChild(pulse);
    }
    node.appendChild(circle);

    const label = document.createElement("div");
    label.className = "node-label";
    label.textContent = phase.table === "challenge" ? "Challenge" : "Fase " + phase.id;
    node.appendChild(label);

    if (unlocked) {
      const starsRow = document.createElement("div");
      starsRow.className = "node-stars";
      for (let i = 1; i <= 3; i++) {
        const s = document.createElement("span");
        s.textContent = "⭐";
        if (i > stars) s.classList.add("node-star-empty");
        starsRow.appendChild(s);
      }
      node.appendChild(starsRow);
    }

    node.addEventListener("click", () => {
      if (!unlocked) {
        showLockedToast();
        node.classList.add("shake");
        setTimeout(() => node.classList.remove("shake"), 400);
        return;
      }
      openIntro(phase);
    });

    container.appendChild(node);
  });

  $("#total-stars-label").textContent = "⭐ " + totalStars() + " / 33";
  showScreen("screen-map");
  justUnlockedId = null;

  if (lastRoundSummary) {
    showRoundSummaryToast(lastRoundSummary);
    lastRoundSummary = null;
  }
}

let lockedToastTimer = null;
function showLockedToast() {
  const toast = $("#locked-toast");
  const msgs = ["Ainda trancada! Jogue todas as outras fases primeiro. 🔒", "Complete todas as fases pra destrancar o desafio final! 🏆"];
  toast.textContent = pick(msgs);
  toast.classList.add("show");
  clearTimeout(lockedToastTimer);
  lockedToastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

/* ---------------------------------------------------------------------- */
/* INTRO OVERLAY                                                           */
/* ---------------------------------------------------------------------- */
let introPhase = null;
function openIntro(phase) {
  introPhase = phase;
  $("#intro-icon").textContent = phase.icon;
  $("#intro-name").textContent = phase.name;
  $("#intro-subtitle").textContent = phase.subtitle;
  $("#intro-mechanic").textContent = phase.mechanicLabel;
  const stars = SAVE.phaseStars[phase.id] || 0;
  $("#intro-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  renderIntroDemo(phase);
  showScreen("screen-intro");
}

function renderIntroDemo(phase) {
  const demo = $("#intro-demo");
  demo.innerHTML = "";
  demo.style.background = `linear-gradient(160deg, ${phase.bg[0]}, ${phase.bg[1]})`;
  const item = document.createElement("div");
  item.className = `intro-demo-item shape-${phase.shape}`;
  const color = phase.palette[0];
  item.style.background = `radial-gradient(circle at 32% 28%, ${lighten(color)}, ${color} 75%)`;
  item.textContent = phase.icon;
  demo.appendChild(item);
}

/* ---------------------------------------------------------------------- */
/* PLAY SCREEN — RODADA                                                    */
/* ---------------------------------------------------------------------- */
function startRound(phase) {
  clearFlutterTimers();
  state.phase = phase;
  state.facts = factsForPhase(phase);
  const length = phase.table === "challenge" ? ROUND_LENGTH.challenge : ROUND_LENGTH.normal;
  state.roundLength = length;
  // Fases normais: tabuada completa (1 a 10), cada fato uma única vez, em ordem sorteada a cada rodada.
  // Fase challenge: mantém a seleção adaptativa (foca nos fatos que a criança mais erra).
  state.roundFacts = phase.table === "challenge"
    ? pickFactsForRound(state.facts, SAVE.factStats, length)
    : shuffle(state.facts);
  state.index = 0;
  state.score = 0;
  state.combo = 0;
  state.bestComboRound = 0;
  state.correctFirstTry = 0;
  state.mistakes = 0;

  $("#play-bg").style.background = `linear-gradient(160deg, ${phase.bg[0]}, ${phase.bg[1]})`;
  renderPlayDecor(phase);
  $("#hud-score").textContent = "⭐ 0";
  $("#hud-combo").textContent = "";
  const hint = $("#play-hint");
  if (phase.dragHint) {
    hint.textContent = phase.dragHint;
    hint.hidden = false;
  } else {
    hint.hidden = true;
  }
  renderProgressDots();
  showScreen("screen-play");
  nextQuestion();
}

const TREE_DECO_SPOTS = [
  { l: 8, t: 6, r: -12 }, { l: 28, t: 2, r: 10 }, { l: 50, t: 4, r: -8 }, { l: 70, t: 8, r: 14 },
  { l: 88, t: 16, r: -14 }, { l: 16, t: 26, r: 8 }, { l: 42, t: 22, r: -10 }, { l: 62, t: 28, r: 12 },
  { l: 84, t: 34, r: -6 }, { l: 22, t: 46, r: 10 }, { l: 56, t: 40, r: -12 }, { l: 78, t: 48, r: 8 }
];

// Monta uma árvore (copa + tronco + frutinhas/flores decorativas). `styleCss`
// posiciona/dimensiona a árvore dentro do campo (uma só árvore grande ou
// várias menores lado a lado, conforme a fase).
function buildTreeNode(emojis, styleCss) {
  const tree = document.createElement("div");
  tree.className = "tree-scene";
  tree.style.cssText = styleCss;
  tree.innerHTML =
    '<div class="tree-trunk"></div>' +
    '<div class="tree-canopy tree-canopy-a"></div>' +
    '<div class="tree-canopy tree-canopy-b"></div>' +
    '<div class="tree-canopy tree-canopy-c"></div>';

  TREE_DECO_SPOTS.forEach((spot, i) => {
    const f = document.createElement("span");
    f.className = "tree-flower-deco";
    f.textContent = emojis[i % emojis.length];
    f.style.left = spot.l + "%";
    f.style.top = spot.t + "%";
    f.style.transform = `rotate(${spot.r}deg)`;
    tree.appendChild(f);
  });
  return tree;
}

// Monta o vulcão grande (fase 10) — a cratera (#volcano-crater) é o alvo
// real onde o arraste é conferido, o resto é só decoração.
function buildVolcanoNode() {
  const volcano = document.createElement("div");
  volcano.className = "volcano-scene";
  volcano.innerHTML =
    '<div class="volcano-body"></div>' +
    '<div class="volcano-smoke">💨</div>' +
    '<div class="volcano-crater" id="volcano-crater"></div>';
  return volcano;
}

// Cenário decorativo por fase (árvore florida da fase 3, pomar da fase 5,
// cesta de colheita da fase 5, vulcão da fase 10...). Roda uma vez por
// rodada — os alvos/mensageiro é que trocam a cada pergunta.
function renderPlayDecor(phase) {
  const field = $("#play-field");
  field.querySelectorAll(".tree-scene").forEach(el => el.remove());
  field.querySelectorAll(".volcano-scene").forEach(el => el.remove());

  if (phase.treeDecor) {
    field.insertBefore(buildTreeNode(FLOWER_EMOJIS, "left:0; top:0; width:100%; height:100%;"), field.firstChild);
  } else if (phase.orchardDecor) {
    const fruitEmojis = ["🍎", "🍏"];
    field.insertBefore(buildTreeNode(fruitEmojis, "left:-4%; top:0; width:62%; height:100%;"), field.firstChild);
    field.insertBefore(buildTreeNode(fruitEmojis, "left:42%; top:0; width:62%; height:100%; transform:scaleX(-1);"), field.firstChild);
  } else if (phase.volcanoDecor) {
    field.insertBefore(buildVolcanoNode(), field.firstChild);
  }

  const basket = $("#harvest-basket");
  if (phase.harvestBasket) {
    basket.hidden = false;
    $("#basket-apples").innerHTML = "";
  } else {
    basket.hidden = true;
  }

  const snowman = $("#snowman-build");
  if (phase.snowmanBuild) {
    snowman.hidden = false;
    snowman.querySelectorAll(".sm-part").forEach(p => p.classList.remove("sm-visible"));
  } else {
    snowman.hidden = true;
  }
}

// Fase 6: cada pergunta respondida corretamente revela mais uma peça do
// boneco de neve (na ordem: base, meio, cabeça, braços, cachecol, botões,
// olhos, nariz, boca, cartola) — fica pronto exatamente na 10ª e última
// pergunta da rodada.
const SNOWMAN_PARTS = [
  "sm-base", "sm-mid", "sm-head", "sm-arms", "sm-scarf",
  "sm-buttons", "sm-eyes", "sm-nose", "sm-mouth", "sm-hat"
];

function revealSnowmanPart(questionIndex) {
  const partClass = SNOWMAN_PARTS[questionIndex];
  if (!partClass) return;
  const el = document.querySelector("#snowman-build ." + partClass);
  if (el) el.classList.add("sm-visible");
}

function renderProgressDots() {
  const wrap = $("#progress-dots");
  wrap.innerHTML = "";
  for (let i = 0; i < state.roundLength; i++) {
    const dot = document.createElement("div");
    dot.className = "progress-dot" + (i < state.index ? " done" : "") + (i === state.index ? " current" : "");
    wrap.appendChild(dot);
  }
}

function nextQuestion() {
  if (state.index >= state.roundLength) { endRound(); return; }
  clearFlutterTimers();
  state.hadMistakeThisQuestion = false;
  const fact = state.roundFacts[state.index];
  state.question = buildQuestion(fact, state.phase);
  $("#hud-question").textContent = `${state.question.a} × ${state.question.b} = ?`;
  renderProgressDots();
  spawnItems(state.question, state.phase);
}

/* ------------------------- Renderização dos itens ----------------------- */
function spawnItems(question, phase) {
  const field = $("#play-field");
  field.querySelectorAll(".item").forEach(el => el.remove());
  const rect = field.getBoundingClientRect();

  if (phase.interaction === "drag") {
    spawnDragRound(question, phase, field, rect);
    return;
  }
  if (phase.interaction === "dragInto") {
    spawnDragIntoRound(question, phase, field, rect);
    return;
  }

  const n = question.options.length;

  question.options.forEach((value, i) => {
    const item = document.createElement("div");
    item.dataset.value = value;

    if (phase.optionVisual) {
      const bigPx = Math.round(currentItemSize() * 1.5);
      item.className = `item item-emoji-style motion-${phase.motion}`;
      item.style.width = bigPx + "px";
      item.style.height = bigPx + "px";

      const emoji = document.createElement("span");
      emoji.className = "item-emoji-visual";
      emoji.textContent = phase.optionVisual === "flower" ? FLOWER_EMOJIS[i % FLOWER_EMOJIS.length] : phase.icon;
      emoji.style.fontSize = Math.round(bigPx * 0.92) + "px";
      item.appendChild(emoji);

      const number = document.createElement("span");
      number.className = "item-emoji-number";
      number.textContent = value;
      item.appendChild(number);

      positionItem(item, phase.motion, i, n, rect, bigPx);
    } else {
      item.className = `item shape-${phase.shape} motion-${phase.motion}`;
      const color = phase.palette[i % phase.palette.length];
      item.style.background = `radial-gradient(circle at 32% 28%, ${lighten(color)}, ${color} 75%)`;

      const badge = document.createElement("span");
      badge.className = "item-badge";
      badge.textContent = phase.icon;
      item.appendChild(badge);

      const label = document.createElement("span");
      label.textContent = value;
      item.appendChild(label);

      positionItem(item, phase.motion, i, n, rect);
    }

    item.addEventListener("click", () => handleAnswer(item, value, question.correct));
    field.appendChild(item);

    if (phase.motion === "flutter" || phase.motion === "flutterSlow") {
      startFlutter(item, rect, phase.motion === "flutterSlow" ? 2600 : 1800);
    }
  });
}

/* ------------------------- Mini-game de arrastar (drag & drop) ----------
   Usado pelas fases com phase.interaction === "drag": um "mensageiro"
   (passarinho, borboleta, brasa) parado no campo que a criança arrasta até
   o alvo parado (minhoca, flor, pedra) com o resultado certo. Os alvos
   ficam fixos em 4 cantos do campo — sem movimento rápido — para dar tempo
   de ler e mirar o arraste. ------------------------------------------- */
const DRAG_TARGET_GRID = [
  { left: 26, top: 32 }, { left: 74, top: 32 },
  { left: 26, top: 68 }, { left: 74, top: 68 }
];
// Grade para fases com árvore de fundo (flores na copa) — mais alta e
// espalhada, para as flores caírem dentro da copa desenhada em CSS.
const TREE_TARGET_GRID = [
  { left: 24, top: 18 }, { left: 76, top: 16 },
  { left: 30, top: 44 }, { left: 72, top: 44 }
];
const FLOWER_EMOJIS = ["🌸", "🌺", "🌷", "🌼"];

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function spawnDragRound(question, phase, field, rect) {
  const w = Math.max(rect.width, 300);
  const h = Math.max(rect.height, 320);
  const itemPx = currentItemSize();
  const isEmojiStyle = !!phase.optionVisual;
  const targetPx = isEmojiStyle ? Math.round(itemPx * 1.55) : itemPx;
  const grid = phase.targetGrid || (phase.treeDecor ? TREE_TARGET_GRID : DRAG_TARGET_GRID);
  const targets = [];

  question.options.forEach((value, i) => {
    const spot = grid[i % grid.length];
    const target = document.createElement("div");
    target.dataset.value = value;
    target.style.width = targetPx + "px";
    target.style.height = targetPx + "px";
    target.style.left = clampedLeftPx(spot.left, w, targetPx) + "px";
    target.style.top = clamp((h * spot.top / 100) - targetPx / 2, 6, h - targetPx - 6) + "px";

    if (isEmojiStyle) {
      target.className = "item item-target item-emoji-style";
      const emoji = document.createElement("span");
      emoji.className = "item-emoji-visual";
      emoji.textContent = phase.optionVisual === "flower" ? FLOWER_EMOJIS[i % FLOWER_EMOJIS.length] : (phase.targetIcon || phase.icon);
      emoji.style.fontSize = Math.round(targetPx * 0.92) + "px";
      target.appendChild(emoji);

      const number = document.createElement("span");
      number.className = "item-emoji-number";
      number.textContent = value;
      target.appendChild(number);
    } else {
      target.className = "item item-target shape-target";
      const color = phase.palette[i % phase.palette.length];
      target.style.background = `radial-gradient(circle at 32% 28%, ${lighten(color)}, ${color} 75%)`;

      const badge = document.createElement("span");
      badge.className = "item-badge";
      badge.textContent = phase.targetIcon || "🎯";
      target.appendChild(badge);

      const label = document.createElement("span");
      label.textContent = value;
      target.appendChild(label);
    }

    field.appendChild(target);
    targets.push(target);
  });

  const mover = document.createElement("div");
  mover.className = `item item-mover shape-${phase.shape}` + (phase.moverBare ? " mover-bare" : "") + (phase.moverFlip ? " mover-flip" : "");
  const moverPx = phase.moverBare ? Math.round(itemPx * 1.7) : itemPx;
  mover.style.width = moverPx + "px";
  mover.style.height = moverPx + "px";
  if (phase.moverBare) {
    mover.style.fontSize = Math.round(moverPx * 0.8) + "px";
  } else {
    const moverColor = phase.palette[0];
    mover.style.background = `radial-gradient(circle at 32% 28%, ${lighten(moverColor)}, ${moverColor} 75%)`;
    mover.style.fontSize = "34px";
  }
  mover.textContent = phase.icon;

  const homeLeft = phase.moverHome
    ? clamp((w * phase.moverHome.left / 100) - moverPx / 2, 6, w - moverPx - 6)
    : clamp(w / 2 - moverPx / 2, 6, w - moverPx - 6);
  const homeTop = phase.moverHome
    ? clamp((h * phase.moverHome.top / 100) - moverPx / 2, 6, h - moverPx - 6)
    : clamp(h - moverPx - 26, 6, h - moverPx - 6);
  mover.style.left = homeLeft + "px";
  mover.style.top = homeTop + "px";
  field.appendChild(mover);

  setupDragMover(mover, targets, homeLeft, homeTop, rect, question.correct);

  if (phase.retargetDelay) {
    const pool = phase.retargetWithinGrid ? grid : RETARGET_SPOTS;
    startTargetRelocation(targets, phase.retargetDelay, w, h, targetPx, pool);
  }
}

// Se a criança demorar demais numa fase com "retargetDelay", os alvos
// ainda não respondidos somem e reaparecem em outro lugar do campo — os
// que já foram marcados como errados ficam parados onde estão.
const RETARGET_SPOTS = [
  { left: 16, top: 14 }, { left: 50, top: 10 }, { left: 84, top: 14 },
  { left: 14, top: 40 }, { left: 50, top: 42 }, { left: 86, top: 40 },
  { left: 22, top: 64 }, { left: 78, top: 64 }
];

function startTargetRelocation(targets, delay, w, h, targetPx, pool) {
  const spotsPool = pool || RETARGET_SPOTS;
  const timer = setInterval(() => {
    const active = targets.filter(t => !t.classList.contains("wrong-disabled") && !t.dataset.locked);
    if (active.length === 0) { clearInterval(timer); return; }
    const spots = shuffle(spotsPool).slice(0, active.length);
    active.forEach((t, i) => {
      t.classList.add("target-hide");
      const moveTimer = setTimeout(() => {
        const spot = spots[i];
        t.style.left = clampedLeftPx(spot.left, w, targetPx) + "px";
        t.style.top = clamp((h * spot.top / 100) - targetPx / 2, 6, h - targetPx - 6) + "px";
        t.classList.remove("target-hide");
      }, 260);
      state.flutterTimers.push(moveTimer);
    });
  }, delay);
  state.flutterTimers.push(timer);
}

function setupDragMover(mover, targets, homeLeft, homeTop, rect, correct) {
  let dragging = false;
  let locked = false;
  let startX = 0, startY = 0, originLeft = homeLeft, originTop = homeTop;
  const w = rect.width, h = rect.height;
  const itemPx = mover.offsetWidth || currentItemSize();

  function snapTo(left, top, done) {
    mover.style.transition = "left 0.28s ease, top 0.28s ease";
    mover.style.left = left + "px";
    mover.style.top = top + "px";
    setTimeout(() => { mover.style.transition = ""; if (done) done(); }, 290);
  }

  function findDropTarget() {
    const mRect = mover.getBoundingClientRect();
    const cx = mRect.left + mRect.width / 2;
    const cy = mRect.top + mRect.height / 2;
    const margin = 16;
    return targets.find(t => {
      if (t.classList.contains("wrong-disabled") || t.dataset.locked) return false;
      const r = t.getBoundingClientRect();
      return cx >= r.left - margin && cx <= r.right + margin && cy >= r.top - margin && cy <= r.bottom + margin;
    });
  }

  function onPointerDown(e) {
    if (locked) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    originLeft = parseFloat(mover.style.left) || homeLeft;
    originTop = parseFloat(mover.style.top) || homeTop;
    mover.style.transition = "";
    mover.classList.add("dragging");
    mover.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const left = clamp(originLeft + dx, 0, Math.max(0, w - itemPx));
    const top = clamp(originTop + dy, 0, Math.max(0, h - itemPx));
    mover.style.left = left + "px";
    mover.style.top = top + "px";
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    mover.classList.remove("dragging");
    const target = findDropTarget();
    if (!target) { snapTo(homeLeft, homeTop); return; }
    const value = Number(target.dataset.value);
    if (value === correct) {
      locked = true;
      mover.style.transition = "left 0.22s ease, top 0.22s ease";
      mover.style.left = target.style.left;
      mover.style.top = target.style.top;
    }
    handleAnswer(target, value, correct);
    if (value !== correct) snapTo(homeLeft, homeTop);
  }

  mover.addEventListener("pointerdown", onPointerDown);
  mover.addEventListener("pointermove", onPointerMove);
  mover.addEventListener("pointerup", onPointerUp);
  mover.addEventListener("pointercancel", onPointerUp);
}

/* ------------------------- Mini-game do vulcão (fase 10) -----------------
   Usado por phase.interaction === "dragInto": aqui é o CONTRÁRIO das outras
   fases de arrastar — os 4 resultados é que são arrastáveis, e existe um
   único alvo fixo (a cratera do vulcão, #volcano-crater). A criança arrasta
   o número que acha certo pra dentro da cratera. -------------------------- */
function spawnDragIntoRound(question, phase, field, rect) {
  const w = Math.max(rect.width, 300);
  const h = Math.max(rect.height, 320);
  const itemPx = currentItemSize();
  const n = question.options.length;
  const colW = 100 / n;

  question.options.forEach((value, i) => {
    const mover = document.createElement("div");
    mover.className = "item item-mover";
    mover.dataset.value = value;
    const color = phase.palette[i % phase.palette.length];
    mover.style.background = `radial-gradient(circle at 32% 28%, ${lighten(color)}, ${color} 75%)`;
    mover.style.width = itemPx + "px";
    mover.style.height = itemPx + "px";

    const badge = document.createElement("span");
    badge.className = "item-badge";
    badge.textContent = phase.icon;
    mover.appendChild(badge);

    const label = document.createElement("span");
    label.textContent = value;
    mover.appendChild(label);

    const centerPct = colW * i + colW / 2;
    const homeLeft = clampedLeftPx(centerPct, w, itemPx);
    const homeTop = clamp(20, 6, h - itemPx - 6);
    mover.style.left = homeLeft + "px";
    mover.style.top = homeTop + "px";
    field.appendChild(mover);

    setupDragIntoMover(mover, homeLeft, homeTop, rect, value, question.correct);
  });
}

function setupDragIntoMover(mover, homeLeft, homeTop, rect, value, correct) {
  let dragging = false;
  let locked = false;
  let startX = 0, startY = 0, originLeft = homeLeft, originTop = homeTop;
  const w = rect.width, h = rect.height;
  const itemPx = mover.offsetWidth || currentItemSize();

  function snapTo(left, top) {
    mover.style.transition = "left 0.28s ease, top 0.28s ease";
    mover.style.left = left + "px";
    mover.style.top = top + "px";
    setTimeout(() => { mover.style.transition = ""; }, 290);
  }

  function isOverCrater() {
    const crater = document.getElementById("volcano-crater");
    if (!crater) return false;
    const mRect = mover.getBoundingClientRect();
    const cx = mRect.left + mRect.width / 2;
    const cy = mRect.top + mRect.height / 2;
    const margin = 12;
    const r = crater.getBoundingClientRect();
    return cx >= r.left - margin && cx <= r.right + margin && cy >= r.top - margin && cy <= r.bottom + margin;
  }

  function onPointerDown(e) {
    if (locked || mover.classList.contains("wrong-disabled")) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    originLeft = parseFloat(mover.style.left) || homeLeft;
    originTop = parseFloat(mover.style.top) || homeTop;
    mover.style.transition = "";
    mover.classList.add("dragging");
    mover.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const left = clamp(originLeft + dx, 0, Math.max(0, w - itemPx));
    const top = clamp(originTop + dy, 0, Math.max(0, h - itemPx));
    mover.style.left = left + "px";
    mover.style.top = top + "px";
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    mover.classList.remove("dragging");
    if (!isOverCrater()) { snapTo(homeLeft, homeTop); return; }
    if (value === correct) {
      locked = true;
      const crater = document.getElementById("volcano-crater");
      const craterRect = crater.getBoundingClientRect();
      const fieldRect = $("#play-field").getBoundingClientRect();
      mover.style.transition = "left 0.22s ease, top 0.22s ease, transform 0.25s ease, opacity 0.25s ease 0.1s";
      mover.style.left = (craterRect.left - fieldRect.left + craterRect.width / 2 - itemPx / 2) + "px";
      mover.style.top = (craterRect.top - fieldRect.top + craterRect.height / 2 - itemPx / 2) + "px";
      mover.style.transform = "scale(0.25)";
      mover.style.opacity = "0";
    }
    handleAnswer(mover, value, correct);
    if (value !== correct) snapTo(homeLeft, homeTop);
  }

  mover.addEventListener("pointerdown", onPointerDown);
  mover.addEventListener("pointermove", onPointerMove);
  mover.addEventListener("pointerup", onPointerUp);
  mover.addEventListener("pointercancel", onPointerUp);
}

function lighten(hex) {
  try {
    const c = hex.replace("#", "");
    const r = Math.min(255, parseInt(c.substr(0, 2), 16) + 60);
    const g = Math.min(255, parseInt(c.substr(2, 2), 16) + 60);
    const b = Math.min(255, parseInt(c.substr(4, 2), 16) + 60);
    return `rgb(${r},${g},${b})`;
  } catch (e) { return "#fff"; }
}

// Tamanho do item precisa bater com o CSS (.item / @media max-width:640px)
// para o cálculo de posição em px não deixar nada vazando da tela.
function currentItemSize() {
  return window.matchMedia("(max-width: 640px)").matches ? 76 : 96;
}

// Converte uma posição horizontal "central" em % para um left em px,
// já centralizando o item nesse ponto e garantindo que ele não passe
// das bordas do campo de jogo (o antigo cálculo só em % jogava os itens
// das pontas para fora da tela em telas estreitas de celular).
function clampedLeftPx(centerPct, containerWidth, itemPx) {
  const margin = 6;
  const left = (containerWidth * centerPct / 100) - itemPx / 2;
  const maxLeft = Math.max(margin, containerWidth - itemPx - margin);
  return Math.min(Math.max(left, margin), maxLeft);
}

function positionItem(item, motion, i, n, rect, sizeOverride) {
  const colW = 100 / n;
  const jitter = (Math.random() - 0.5) * (colW * 0.4);
  const leftPct = colW * i + colW / 2 + jitter;
  const w = Math.max(rect.width, 300);
  const h = Math.max(rect.height, 320);
  const itemPx = sizeOverride || currentItemSize();
  const leftPx = clampedLeftPx(leftPct, w, itemPx);

  if (motion === "rise" || motion === "fall" || motion === "fallFast") {
    item.style.left = leftPx + "px";
    item.style.top = "0";
    const duration = motion === "fallFast" ? (3.2 + Math.random() * 1.2) : (4.5 + Math.random() * 2);
    item.style.animationDuration = duration.toFixed(2) + "s";
    item.style.animationDelay = (Math.random() * -duration).toFixed(2) + "s";
    if (motion === "rise") {
      // Nasce já dentro da área visível (perto da base) e sobe até sumir
      // por cima — antes usava vh cheio da tela, então em campos de jogo
      // mais baixos que a viewport o balão passava boa parte do tempo
      // fora da área visível antes de "aparecer".
      item.style.setProperty("--rise-y0", (h * 0.55) + "px");
      item.style.setProperty("--rise-y1", (-(itemPx + 30)) + "px");
    } else {
      item.style.setProperty("--fall-y0", (-(itemPx + 20)) + "px");
      item.style.setProperty("--fall-y1", (h * 0.7) + "px");
    }
  } else if (motion === "bob" || motion === "sway" || motion === "static") {
    const top = 18 + Math.random() * 55;
    item.style.left = leftPx + "px";
    item.style.top = top + "%";
    item.style.animationDuration = (1.6 + Math.random() * 1.2).toFixed(2) + "s";
    item.style.animationDelay = (Math.random() * -2).toFixed(2) + "s";
  } else if (motion === "swim") {
    const top = 15 + (i * (65 / Math.max(1, n - 1 || 1))) + Math.random() * 6;
    const fromLeft = i % 2 === 0;
    item.style.top = top + "%";
    item.style.left = fromLeft ? "-6%" : "auto";
    item.style.right = fromLeft ? "auto" : "-6%";
    item.style.setProperty("--swim-dist", (w * 0.88 * (fromLeft ? 1 : -1)) + "px");
    item.style.animationDuration = (4.5 + Math.random() * 2).toFixed(2) + "s";
    item.style.animationDelay = (Math.random() * -3).toFixed(2) + "s";
  } else if (motion === "flutter" || motion === "flutterSlow") {
    item.style.left = leftPx + "px";
    item.style.top = (20 + Math.random() * 50) + "%";
    item.style.transitionDuration = (motion === "flutterSlow" ? 2.2 : 1.5) + "s";
  }
}

function startFlutter(item, rect, interval) {
  const itemPx = currentItemSize();
  const move = () => {
    if (!document.body.contains(item)) return;
    const leftPct = 8 + Math.random() * 78;
    const top = 14 + Math.random() * 62;
    item.style.left = clampedLeftPx(leftPct, Math.max(rect.width, 300), itemPx) + "px";
    item.style.top = top + "%";
  };
  move();
  const t = setInterval(move, interval);
  state.flutterTimers.push(t);
}

function clearFlutterTimers() {
  state.flutterTimers.forEach(t => clearInterval(t));
  state.flutterTimers = [];
}

/* ------------------------- Resposta -------------------------------------- */
function handleAnswer(itemEl, value, correct) {
  if (itemEl.classList.contains("wrong-disabled") || itemEl.dataset.locked) return;

  if (value === correct) {
    itemEl.dataset.locked = "1";
    const points = state.hadMistakeThisQuestion ? 5 : 10;
    state.score += points;
    if (!state.hadMistakeThisQuestion) {
      state.correctFirstTry++;
      state.combo++;
      registerFactResult(SAVE, state.question.key, true);
    } else {
      state.combo = 0;
    }
    state.bestComboRound = Math.max(state.bestComboRound, state.combo);

    if (state.phase.harvestBasket) {
      flyToBasket(itemEl);
    } else if (!state.phase.volcanoDecor) {
      itemEl.classList.add("correct-pop");
    }
    if (state.phase.snowmanBuild) {
      revealSnowmanPart(state.index);
    }
    showScorePopup(itemEl, points);
    showPraise();
    maybeShowCombo();
    $("#hud-score").textContent = "⭐ " + state.score;

    clearFlutterTimers();
    setTimeout(() => {
      state.index++;
      nextQuestion();
    }, state.phase.harvestBasket ? 750 : 620);
  } else {
    if (!state.hadMistakeThisQuestion) {
      state.hadMistakeThisQuestion = true;
      state.mistakes++;
      state.combo = 0;
      registerFactResult(SAVE, state.question.key, false);
      $("#hud-combo").textContent = "";
    }
    itemEl.classList.add("shake", "wrong-disabled");
    setTimeout(() => itemEl.classList.remove("shake"), 400);
    showRetry();
  }
}

let praiseTimer = null;
function showPraise() {
  const el = $("#praise-toast");
  el.textContent = pick(PRAISE_MESSAGES);
  el.classList.add("show");
  clearTimeout(praiseTimer);
  praiseTimer = setTimeout(() => el.classList.remove("show"), 700);
}
let retryTimer = null;
function showRetry() {
  const el = $("#retry-toast");
  el.textContent = pick(RETRY_MESSAGES);
  el.classList.add("show");
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => el.classList.remove("show"), 800);
}
function maybeShowCombo() {
  let msg = null;
  if (COMBO_MESSAGES[state.combo]) msg = COMBO_MESSAGES[state.combo];
  else if (state.combo > 8 && state.combo % 4 === 0) msg = COMBO_MESSAGES[8];
  $("#hud-combo").textContent = state.combo >= 2 ? `combo x${state.combo}` : "";
  if (msg) {
    const el = $("#combo-toast");
    el.textContent = msg;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }
}

function showScorePopup(sourceEl, points) {
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = `+${points} ⭐`;
  document.body.appendChild(popup);
  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = $("#hud-score").getBoundingClientRect();
  popup.style.left = (sourceRect.left + sourceRect.width / 2 - 20) + "px";
  popup.style.top = sourceRect.top + "px";
  popup.style.opacity = "1";
  requestAnimationFrame(() => {
    popup.style.transform = `translate(${targetRect.left - sourceRect.left}px, ${targetRect.top - sourceRect.top}px) scale(0.5)`;
    popup.style.opacity = "0";
  });
  setTimeout(() => popup.remove(), 720);
}

// Fase 5: a maçã acertada "cai" da árvore até a cesta, em vez do pop padrão.
function flyToBasket(itemEl) {
  const basket = $("#harvest-basket");
  if (!basket) { itemEl.classList.add("correct-pop"); return; }
  const field = $("#play-field");
  const fieldRect = field.getBoundingClientRect();
  const basketRect = basket.getBoundingClientRect();
  const itemRect = itemEl.getBoundingClientRect();

  itemEl.style.animation = "none";
  itemEl.style.transition = "left 0.5s ease-in, top 0.5s ease-in, transform 0.5s ease-in, opacity 0.4s ease-in 0.3s";
  itemEl.style.left = (basketRect.left - fieldRect.left + basketRect.width / 2 - itemRect.width / 2) + "px";
  itemEl.style.top = (basketRect.top - fieldRect.top) + "px";
  itemEl.style.transform = "scale(0.35)";
  itemEl.style.opacity = "0";
  setTimeout(addAppleToBasket, 480);
}

function addAppleToBasket() {
  const wrap = $("#basket-apples");
  if (!wrap) return;
  const apple = document.createElement("span");
  apple.textContent = "🍎";
  wrap.appendChild(apple);
}

/* ---------------------------------------------------------------------- */
/* FIM DE RODADA — vai direto pro mapa, sem tela intermediária             */
/* ---------------------------------------------------------------------- */
let lastRoundSummary = null;

function endRound() {
  clearFlutterTimers();
  const phase = state.phase;
  const stars = starsForResult(state.correctFirstTry, state.roundLength);
  const prevStars = SAVE.phaseStars[phase.id] || 0;
  const improvedStars = Math.max(prevStars, stars);
  SAVE.phaseStars[phase.id] = improvedStars;
  SAVE.phaseBestScore[phase.id] = Math.max(SAVE.phaseBestScore[phase.id] || 0, state.score);
  SAVE.phaseBestCombo[phase.id] = Math.max(SAVE.phaseBestCombo[phase.id] || 0, state.bestComboRound);
  SAVE.bestComboOverall = Math.max(SAVE.bestComboOverall, state.bestComboRound);

  // Todas as fases normais já ficam destrancadas desde o início — o Challenge
  // é a única que precisa ser desbloqueada, e só abre depois que a criança
  // já tiver jogado (pelo menos 1 estrela) todas as fases normais.
  let unlockedPhaseObj = null;
  const challengePhase = PHASES.find(p => p.table === "challenge");
  if (phase.table !== "challenge" && challengePhase && !SAVE.unlockedPhases.includes(challengePhase.id)) {
    const allPlayed = normalPhaseIds().every(id => (SAVE.phaseStars[id] || 0) > 0);
    if (allPlayed) {
      SAVE.unlockedPhases.push(challengePhase.id);
      unlockedPhaseObj = challengePhase;
      justUnlockedId = challengePhase.id;
    }
  }

  writeSave(SAVE);

  lastRoundSummary = {
    stars, points: state.score,
    unlockedPhaseName: unlockedPhaseObj ? unlockedPhaseObj.name : null
  };
  renderMap();

  if (phase.table === "challenge") {
    showChallengeCompleteModal(stars, state.score, state.correctFirstTry, state.roundLength);
  }
}

// Acha, entre as fases normais (1 a 10), a que tem a pior taxa de acerto
// nos fatos da tabuada (usando o histórico salvo em factStats). Ignora
// fases que a criança nunca tentou.
function findWeakestPhase() {
  let weakest = null, weakestAcc = Infinity;
  PHASES.forEach(phase => {
    if (phase.table === "challenge") return;
    const facts = factsForPhase(phase);
    let correct = 0, wrong = 0;
    facts.forEach(f => {
      const s = SAVE.factStats[f.key];
      if (s) { correct += s.correct; wrong += s.wrong; }
    });
    const total = correct + wrong;
    if (total === 0) return;
    const acc = correct / total;
    if (acc < weakestAcc) { weakestAcc = acc; weakest = phase; }
  });
  return weakest;
}

function showChallengeCompleteModal(stars, score, correctFirstTry, roundLength) {
  const root = $("#modal-root");
  root.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const starsStr = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  const accuracyPct = Math.round((correctFirstTry / roundLength) * 100);
  const phrase = pick(CHALLENGE_MOTIVATION);
  const weakest = findWeakestPhase();

  const improveHtml = weakest ? `
    <div class="challenge-improve">
      <div class="challenge-improve-label">Área para praticar mais:</div>
      <div class="challenge-improve-phase">${weakest.icon} ${weakest.subtitle}</div>
    </div>` : "";

  overlay.innerHTML = `
    <div class="modal-box challenge-modal">
      <div class="challenge-modal-emoji">🏆</div>
      <h3>${phrase}</h3>
      <div class="challenge-modal-stars">${starsStr}</div>
      <p>Você completou o Templo de Cristal com <strong>${score} pontos</strong> e <strong>${accuracyPct}%</strong> de acerto de primeira!</p>
      ${improveHtml}
      <div class="modal-actions">
        ${weakest ? `<button class="btn-cancel" id="challenge-practice">Praticar mais ${weakest.subtitle.toLowerCase()}</button>` : ""}
        <button class="btn-continue" id="challenge-close">Continuar</button>
      </div>
    </div>`;
  root.appendChild(overlay);
  $("#challenge-close").addEventListener("click", () => { root.innerHTML = ""; });
  if (weakest) {
    $("#challenge-practice").addEventListener("click", () => {
      root.innerHTML = "";
      openIntro(weakest);
    });
  }
}

let roundToastTimer = null;
function showRoundSummaryToast(summary) {
  const el = $("#round-toast");
  const starsStr = "⭐".repeat(summary.stars) + "☆".repeat(3 - summary.stars);
  let html = `<span class="round-toast-stars">${starsStr}</span><span class="round-toast-points">+${summary.points} pontos</span>`;
  if (summary.unlockedPhaseName) {
    html += `<span class="round-toast-unlock">✨ Nova área desbloqueada: ${summary.unlockedPhaseName}!</span>`;
  }
  el.innerHTML = html;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(roundToastTimer);
  roundToastTimer = setTimeout(() => el.classList.remove("show"), summary.unlockedPhaseName ? 3400 : 2400);
}

/* ---------------------------------------------------------------------- */
/* RESET DE PROGRESSO (discreto, com dupla confirmação)                    */
/* ---------------------------------------------------------------------- */
function openResetModal() {
  const root = $("#modal-root");
  root.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Reiniciar progresso?</h3>
      <p>Isso vai apagar todas as fases desbloqueadas, estrelas e pontuações salvas. Essa ação não pode ser desfeita.</p>
      <div class="modal-actions">
        <button class="btn-cancel" id="modal-cancel">Cancelar</button>
        <button class="btn-danger" id="modal-confirm">Reiniciar</button>
      </div>
    </div>`;
  root.appendChild(overlay);
  $("#modal-cancel").addEventListener("click", () => { root.innerHTML = ""; });
  $("#modal-confirm").addEventListener("click", () => confirmResetStep2());
}
function confirmResetStep2() {
  const root = $("#modal-root");
  root.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Tem certeza mesmo?</h3>
      <p>Última confirmação: todo o progresso será perdido para sempre.</p>
      <div class="modal-actions">
        <button class="btn-cancel" id="modal-cancel2">Cancelar</button>
        <button class="btn-danger" id="modal-confirm2">Sim, apagar tudo</button>
      </div>
    </div>`;
  root.appendChild(overlay);
  $("#modal-cancel2").addEventListener("click", () => { root.innerHTML = ""; });
  $("#modal-confirm2").addEventListener("click", () => {
    SAVE = resetSave();
    root.innerHTML = "";
    renderHome();
  });
}

/* ---------------------------------------------------------------------- */
/* EVENTOS GERAIS                                                          */
/* ---------------------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  renderHome();

  $("#btn-start").addEventListener("click", renderMap);
  $("#home-reset-link").addEventListener("click", openResetModal);
  $("#map-reset-link").addEventListener("click", openResetModal);

  $("#btn-play").addEventListener("click", () => startRound(introPhase));
  $("#btn-intro-back").addEventListener("click", renderMap);

  $("#btn-quit").addEventListener("click", () => { clearFlutterTimers(); renderMap(); });

  window.addEventListener("resize", () => {
    if ($("#screen-play").classList.contains("active") && state.question) {
      spawnItems(state.question, state.phase);
    }
  });
});
