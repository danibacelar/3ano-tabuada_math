/* ==========================================================================
   DATA.JS — Configuração central do jogo
   Aqui ficam: as 11 fases, posições no mapa, geração de perguntas,
   repetição adaptativa e leitura/escrita do progresso salvo.
   Edite este arquivo para mudar textos, posições, tabuadas ou critérios.
   ========================================================================== */

/* ---------- 1. FASES ------------------------------------------------------
   left/top = posição do marcador sobre a imagem do mapa (map.jpg), em %.
   table = 1..10 para fases normais, 'challenge' para a fase final.
   motion = estilo de movimento dos itens ('rise','bob','sway','flutter','swim','fall','static')
   shape  = estilo visual do item (usado pelo CSS)
--------------------------------------------------------------------------- */
const PHASES = [
  {
    id: 1, table: 1,
    name: "Vila do Começo",
    subtitle: "Tabuada do 1",
    mapPos: { left: 17.1, top: 94.0 },
    motion: "rise", shape: "balloon", icon: "🎈",
    palette: ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6C5CE7"],
    bg: ["#BFE6B0", "#EAF6D8"],
    mechanicLabel: "Estoure o balão certo!"
  },
  {
    id: 2, table: 2,
    name: "Trilha dos Passarinhos",
    subtitle: "Tabuada do 2",
    mapPos: { left: 19.3, top: 59.9 },
    motion: "flutterSlow", shape: "bird", icon: "🐦",
    interaction: "drag", targetIcon: "🪱", moverBare: true, optionVisual: "emoji",
    moverImage: "fase2_bird_cutout.png",
    moverHome: { left: 50, top: 18 },
    targetGrid: [
      { left: 24, top: 58 }, { left: 76, top: 58 },
      { left: 24, top: 84 }, { left: 76, top: 84 }
    ],
    dragHint: "Arraste o passarinho até o resultado correto",
    palette: ["#FFB4A2", "#B5838D", "#8D99AE", "#E5989B"],
    bg: ["#CDE7B0", "#A8D8B9"],
    bgImage: "fase2_tabuada.jpeg",
    mechanicLabel: "Arraste o passarinho até a minhoca certa!"
  },
  {
    id: 3, table: 3,
    name: "Jardim das Flores",
    subtitle: "Tabuada do 3",
    mapPos: { left: 30.2, top: 41.9 },
    motion: "flutter", shape: "butterfly", icon: "🦋",
    interaction: "drag", moverBare: true, treeDecor: true, optionVisual: "flower",
    palette: ["#B983FF", "#FF9F9F", "#5AC8FA", "#FF7EB6"],
    bg: ["#FDE2E4", "#DCEEDD"],
    mechanicLabel: "Arraste a borboleta até a flor certa!"
  },
  {
    id: 4, table: 4,
    name: "Floresta Encantada",
    subtitle: "Tabuada do 4",
    mapPos: { left: 10.5, top: 23.4 },
    motion: "bob", shape: "monster", icon: "🧌",
    interaction: "drag", moverBare: true, targetIcon: "🍄", retargetDelay: 5000,
    palette: ["#E63946", "#F4A261", "#E9C46A", "#52B788"],
    bg: ["#1B4332", "#40916C"],
    mechanicLabel: "Arraste o monstro até o cogumelo certo!"
  },
  {
    id: 5, table: 5,
    name: "Pomar Mágico",
    subtitle: "Tabuada do 5",
    mapPos: { left: 30.2, top: 24.1 },
    motion: "static", shape: "fruit", icon: "🍎",
    orchardDecor: true, harvestBasket: true, optionVisual: "fruit",
    palette: ["#FF6F59", "#FFB627", "#8AC926", "#FF4D6D"],
    bg: ["#FFF3B0", "#D8E9A8"],
    mechanicLabel: "Toque na maçã certa e veja ela cair na cesta!"
  },
  {
    id: 6, table: 6,
    name: "Montanha Nevada",
    subtitle: "Tabuada do 6",
    mapPos: { left: 54.1, top: 21.2 },
    motion: "fall", shape: "snow", icon: "❄️",
    optionVisual: "emoji", snowmanBuild: true,
    palette: ["#A2D2FF", "#CDB4DB", "#90E0EF", "#CAF0F8"],
    bg: ["#CAF0F8", "#8ECAE6"],
    mechanicLabel: "Clique no floco certo e ajude a construir o boneco de neve!"
  },
  {
    id: 7, table: 7,
    name: "Geleira Brilhante",
    subtitle: "Tabuada do 7",
    mapPos: { left: 58.5, top: 37.8 },
    motion: "bob", shape: "skier", icon: "⛷️",
    interaction: "drag", moverBare: true, moverFlip: true, targetIcon: "🧊",
    moverHome: { left: 14, top: 50 },
    targetGrid: [
      { left: 80, top: 16 }, { left: 80, top: 40 },
      { left: 80, top: 64 }, { left: 80, top: 88 }
    ],
    retargetDelay: 5000, retargetWithinGrid: true,
    palette: ["#90E0EF", "#ADE8F4", "#CAF0F8", "#48CAE4"],
    bg: ["#90E0EF", "#CAF0F8"],
    mechanicLabel: "Arraste o esquiador até o número certo! Se demorar, os números trocam de lugar."
  },
  {
    id: 8, table: 8,
    name: "Castelo Real",
    subtitle: "Tabuada do 8",
    mapPos: { left: 65.8, top: 61.2 },
    motion: "fall", shape: "flag", icon: "🚩", optionVisual: "emoji",
    palette: ["#7209B7", "#3A0CA3", "#4361EE", "#F72585"],
    bg: ["#B8C0FF", "#E7ECFF"],
    mechanicLabel: "Toque na bandeira certa!"
  },
  {
    id: 9, table: 9,
    name: "Deserto Escaldante",
    subtitle: "Tabuada do 9",
    mapPos: { left: 73.0, top: 83.3 },
    motion: "fall", shape: "chest", icon: "🌵", optionVisual: "emoji",
    palette: ["#C9A227", "#E6B655", "#B08968", "#DDB892"],
    bg: ["#F4A261", "#F9DC8F"],
    mechanicLabel: "Toque no cacto certo!"
  },
  {
    id: 10, table: 10,
    name: "Vulcão em Fúria",
    subtitle: "Tabuada do 10",
    mapPos: { left: 90.8, top: 58.6 },
    icon: "🔥",
    interaction: "dragInto", volcanoDecor: true,
    palette: ["#E85D04", "#F48C06", "#DC2F02", "#FFBA08"],
    bg: ["#3A0CA3", "#7B2CBF"],
    mechanicLabel: "Arraste o resultado certo para dentro do vulcão!"
  },
  {
    id: 11, table: "challenge",
    name: "Templo de Cristal",
    subtitle: "⭐ CHALLENGE",
    mapPos: { left: 89.8, top: 24.7 },
    motion: "fallFast", shape: "crystal", icon: "🔮",
    palette: ["#7B2CBF", "#9D4EDD", "#C77DFF", "#E0AAFF"],
    bg: ["#10002B", "#3C096C"],
    mechanicLabel: "Toque no cristal certo!"
  }
];

const ROUND_LENGTH = { normal: 10, challenge: 10 };
const SAVE_KEY = "tabuadaAdventureSave_v1";

/* ---------- 2. FRASES DE FEEDBACK ---------------------------------------- */
const PRAISE_MESSAGES = ["Isso aí!", "Mandou bem!", "Show de bola!", "Incrível!", "Perfeito!", "Arrasou!", "Muito bem!", "Excelente!"];
const RETRY_MESSAGES = ["Quase!", "Tenta de novo!", "Você consegue!", "Foi por pouco!"];
const COMBO_MESSAGES = { 3: "🔥 combo x3!", 5: "🔥🔥 combo x5!", 8: "🔥🔥🔥 combo incrível!" };
const CHALLENGE_MOTIVATION = [
  "Uau, olha só o que você conquistou! Você é incrível! 🌟",
  "Você é um verdadeiro mestre da tabuada! Parabéns! 🏆",
  "Seu cérebro está cada dia mais forte — que orgulho de você! 🧠✨",
  "Você completou o desafio final! Isso é muito impressionante! 🎉",
  "Você é imparável! Continue brilhando desse jeito! 🚀",
  "Fantástico! A multiplicação já não tem mais segredos pra você! 🔮",
  "Que jornada incrível! Você merece comemorar bastante! 🎊"
];

/* ---------- 3. GERAÇÃO DE FATOS DA TABUADA -------------------------------- */
function canonicalKey(a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return lo + "x" + hi;
}

function factsForPhase(phase) {
  const facts = [];
  if (phase.table === "challenge") {
    for (let a = 1; a <= 10; a++) {
      for (let b = a; b <= 10; b++) {
        facts.push({ a, b, key: canonicalKey(a, b) });
      }
    }
  } else {
    const t = phase.table;
    for (let k = 1; k <= 10; k++) {
      facts.push({ a: t, b: k, key: canonicalKey(t, k) });
    }
  }
  return facts;
}

/* ---------- 4. REPETIÇÃO ADAPTATIVA --------------------------------------- */
function factWeight(stat) {
  if (!stat || (stat.correct === 0 && stat.wrong === 0)) return 1.3; // fato novo: leve prioridade
  const total = stat.correct + stat.wrong;
  const accuracy = stat.correct / total;
  let w = 0.3 + (1 - accuracy) * 2.4;
  if (stat.streak >= 3) w *= 0.35;      // dominado recentemente -> aparece menos
  if (stat.wrongStreak >= 1) w *= 1.7;  // errou recentemente -> aparece mais
  return Math.max(0.2, w);
}

function weightedRandomFact(pool, factStats) {
  const weights = pool.map(f => factWeight(factStats[f.key]));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function pickFactsForRound(pool, factStats, count) {
  const picks = [];
  const recentKeys = [];
  const windowSize = Math.min(2, Math.max(1, pool.length - 2));
  for (let i = 0; i < count; i++) {
    let choice = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = weightedRandomFact(pool, factStats);
      if (!recentKeys.includes(candidate.key) || pool.length <= windowSize) {
        choice = candidate;
        break;
      }
    }
    if (!choice) choice = weightedRandomFact(pool, factStats);
    picks.push(choice);
    recentKeys.push(choice.key);
    if (recentKeys.length > windowSize) recentKeys.shift();
  }
  return picks;
}

/* ---------- 5. MONTAGEM DE UMA PERGUNTA ----------------------------------- */
function buildQuestion(fact, phase) {
  // decide ordem de exibição dos fatores (variação, mas favorecendo a tabuada em foco)
  let dispA = fact.a, dispB = fact.b;
  if (phase.table !== "challenge") {
    // fact.a é sempre a tabuada em foco; 32% de chance de inverter a exibição
    if (Math.random() < 0.32) { dispA = fact.b; dispB = fact.a; }
  } else {
    if (Math.random() < 0.5) { dispA = fact.b; dispB = fact.a; }
  }
  const correct = fact.a * fact.b;
  const options = buildOptions(dispA, dispB, correct);
  return { key: fact.key, a: dispA, b: dispB, correct, options };
}

function buildOptions(a, b, correct) {
  const candidates = new Set();
  const addIfValid = (v) => { v = Math.round(v); if (v > 0 && v !== correct && v <= 121) candidates.add(v); };
  addIfValid(a * (b + 1));
  addIfValid(a * Math.max(1, b - 1));
  addIfValid((a + 1) * b);
  addIfValid(Math.max(1, a - 1) * b);
  addIfValid(correct + a);
  addIfValid(correct - a);
  addIfValid(correct + b);
  addIfValid(correct - b);
  addIfValid(correct + 10);
  addIfValid(correct - 10);
  let guard = 0;
  while (candidates.size < 9 && guard < 40) {
    addIfValid(correct + (Math.floor(Math.random() * 21) - 10));
    guard++;
  }
  const arr = Array.from(candidates).filter(v => v !== correct);
  shuffle(arr);
  const distractors = arr.slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  return options;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- 6. ESTRELAS E DESBLOQUEIO -------------------------------------- */
function starsForResult(firstTryCorrect, totalQuestions) {
  const ratio = firstTryCorrect / totalQuestions;
  if (ratio >= 0.85) return 3;
  if (ratio >= 0.6) return 2;
  return 1; // completar já garante 1 estrela
}

/* ---------- 7. PERSISTÊNCIA (localStorage) --------------------------------- */
// Todas as fases normais (1 a 10) já começam destrancadas — só o Challenge
// (a fase "challenge") fica trancado até jogar todas elas pelo menos uma vez.
function normalPhaseIds() {
  return PHASES.filter(p => p.table !== "challenge").map(p => p.id);
}

function defaultSave() {
  const phaseStars = {}, phaseBestScore = {}, phaseBestCombo = {};
  PHASES.forEach(p => { phaseStars[p.id] = 0; phaseBestScore[p.id] = 0; phaseBestCombo[p.id] = 0; });
  return {
    unlockedPhases: normalPhaseIds(),
    phaseStars, phaseBestScore, phaseBestCombo,
    factStats: {},
    bestComboOverall: 0
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    const merged = Object.assign(base, parsed, {
      phaseStars: Object.assign(base.phaseStars, parsed.phaseStars || {}),
      phaseBestScore: Object.assign(base.phaseBestScore, parsed.phaseBestScore || {}),
      phaseBestCombo: Object.assign(base.phaseBestCombo, parsed.phaseBestCombo || {}),
      factStats: parsed.factStats || {}
    });
    // Quem já tinha progresso salvo do sistema antigo (desbloqueio linear)
    // também ganha todas as fases normais destrancadas agora.
    merged.unlockedPhases = Array.from(new Set([...(merged.unlockedPhases || []), ...normalPhaseIds()]));
    return merged;
  } catch (e) {
    return defaultSave();
  }
}

function writeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* silencioso */ }
}

function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* silencioso */ }
  return defaultSave();
}

function registerFactResult(save, key, wasCorrectFirstTry) {
  if (!save.factStats[key]) save.factStats[key] = { correct: 0, wrong: 0, streak: 0, wrongStreak: 0 };
  const s = save.factStats[key];
  if (wasCorrectFirstTry) {
    s.correct++; s.streak++; s.wrongStreak = 0;
  } else {
    s.wrong++; s.streak = 0; s.wrongStreak++;
  }
}
