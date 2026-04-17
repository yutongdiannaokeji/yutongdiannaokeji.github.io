const ANTE = 2;
const BLIND_STAKES = [2, 5, 10, 20];
const DEFAULT_CONFIG = {
  playerName: "南场玩家",
  startingScore: 100,
  difficulty: "normal",
  speed: "normal",
};

const SPEED_MAP = {
  fast: 550,
  normal: 900,
  slow: 1250,
};

const SPEED_LABELS = {
  fast: "快速节奏",
  normal: "标准节奏",
  slow: "沉浸节奏",
};

const DIFFICULTY_LABELS = {
  casual: "悠闲 AI",
  normal: "标准 AI",
  sharp: "认真 AI",
};

const DIFFICULTY_PROFILES = {
  casual: {
    lookBase: 0.28,
    lookHeadsUp: 0.6,
    compareThreshold: 116,
    compareChance: 0.4,
    raiseThreshold: 95,
    raiseChance: 0.36,
    weakFoldThreshold: 29,
    foldChance: 0.68,
    pressureFoldChance: 0.58,
    blindRaiseThreshold: 118,
    blindRaiseChance: 0.32,
    bluffRaiseChance: 0.06,
  },
  normal: {
    lookBase: 0.44,
    lookHeadsUp: 0.82,
    compareThreshold: 104,
    compareChance: 0.58,
    raiseThreshold: 86,
    raiseChance: 0.55,
    weakFoldThreshold: 34,
    foldChance: 0.62,
    pressureFoldChance: 0.48,
    blindRaiseThreshold: 123,
    blindRaiseChance: 0.4,
    bluffRaiseChance: 0.14,
  },
  sharp: {
    lookBase: 0.62,
    lookHeadsUp: 0.95,
    compareThreshold: 92,
    compareChance: 0.7,
    raiseThreshold: 78,
    raiseChance: 0.68,
    weakFoldThreshold: 38,
    foldChance: 0.7,
    pressureFoldChance: 0.55,
    blindRaiseThreshold: 114,
    blindRaiseChance: 0.48,
    bluffRaiseChance: 0.22,
  },
};

const SUITS = [
  { key: "spade", symbol: "♠", weight: 4, red: false },
  { key: "heart", symbol: "♥", weight: 3, red: true },
  { key: "club", symbol: "♣", weight: 2, red: false },
  { key: "diamond", symbol: "♦", weight: 1, red: true },
];

const RANKS = [
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
  { label: "A", value: 14 },
];

const ui = {
  lobbyScene: document.getElementById("lobbyScene"),
  tableScene: document.getElementById("tableScene"),
  playerNameInput: document.getElementById("playerNameInput"),
  startingScoreSelect: document.getElementById("startingScoreSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  speedSelect: document.getElementById("speedSelect"),
  themeToggleButtons: [...document.querySelectorAll("[data-theme-toggle]")],
  startGameBtn: document.getElementById("startGameBtn"),
  backToLobbyBtn: document.getElementById("backToLobbyBtn"),
  newRoundBtn: document.getElementById("newRoundBtn"),
  resetMatchBtn: document.getElementById("resetMatchBtn"),
  tableMetaLabel: document.getElementById("tableMetaLabel"),
  roundLabel: document.getElementById("roundLabel"),
  stakeLabel: document.getElementById("stakeLabel"),
  potLabel: document.getElementById("potLabel"),
  centerPotValue: document.getElementById("centerPotValue"),
  turnLabel: document.getElementById("turnLabel"),
  roundBanner: document.getElementById("roundBanner"),
  compareTarget: document.getElementById("compareTarget"),
  logList: document.getElementById("logList"),
  callCostLabel: document.getElementById("callCostLabel"),
  raiseCostLabel: document.getElementById("raiseCostLabel"),
  compareCostLabel: document.getElementById("compareCostLabel"),
  handHint: document.getElementById("handHint"),
  costHint: document.getElementById("costHint"),
  lookBtn: document.getElementById("lookBtn"),
  callBtn: document.getElementById("callBtn"),
  raiseBtn: document.getElementById("raiseBtn"),
  compareBtn: document.getElementById("compareBtn"),
  foldBtn: document.getElementById("foldBtn"),
};

const state = {
  scene: "lobby",
  theme: "dark",
  config: { ...DEFAULT_CONFIG },
  round: 1,
  dealerId: "human",
  stakeIndex: 0,
  pot: 0,
  currentActorId: null,
  roundActive: false,
  busy: false,
  winner: null,
  bannerText: "准备好后开始第一回合",
  players: [],
  timers: new Set(),
};

function loadThemePreference() {
  try {
    const storedTheme = window.localStorage.getItem("zjh-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
  } catch (error) {
    // Ignore theme persistence errors and fall back to the default theme.
  }
  return "dark";
}

function syncThemeButtons() {
  const nextLabel = state.theme === "dark" ? "切换浅色" : "切换深色";
  ui.themeToggleButtons.forEach((button) => {
    button.textContent = nextLabel;
  });
}

function setTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = state.theme;
  syncThemeButtons();
  try {
    window.localStorage.setItem("zjh-theme", state.theme);
  } catch (error) {
    // Ignore persistence errors in restricted environments.
  }
}

function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function schedule(callback, delay) {
  const timerId = window.setTimeout(() => {
    state.timers.delete(timerId);
    callback();
  }, delay);
  state.timers.add(timerId);
  return timerId;
}

function clearScheduledTasks() {
  state.timers.forEach((timerId) => window.clearTimeout(timerId));
  state.timers.clear();
}

function getActionDelay() {
  return SPEED_MAP[state.config.speed] || SPEED_MAP.normal;
}

function sanitizeName(name) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 10) || DEFAULT_CONFIG.playerName;
}

function readConfigFromControls() {
  const nextConfig = {
    playerName: sanitizeName(ui.playerNameInput.value),
    startingScore: Number(ui.startingScoreSelect.value) || DEFAULT_CONFIG.startingScore,
    difficulty: ui.difficultySelect.value || DEFAULT_CONFIG.difficulty,
    speed: ui.speedSelect.value || DEFAULT_CONFIG.speed,
  };
  ui.playerNameInput.value = nextConfig.playerName;
  state.config = nextConfig;
}

function writeConfigToControls() {
  ui.playerNameInput.value = state.config.playerName;
  ui.startingScoreSelect.value = String(state.config.startingScore);
  ui.difficultySelect.value = state.config.difficulty;
  ui.speedSelect.value = state.config.speed;
}

function describeConfig() {
  return `${state.config.playerName} · ${DIFFICULTY_LABELS[state.config.difficulty]} · ${SPEED_LABELS[state.config.speed]}`;
}

function createPlayer(id, name, type) {
  return {
    id,
    name,
    type,
    score: state.config.startingScore,
    hand: [],
    seen: false,
    folded: false,
    eliminated: false,
    currentAction: "等待发牌",
    evaluation: null,
  };
}

function createPlayers() {
  return [
    createPlayer("ai1", "北场玩家", "ai"),
    createPlayer("ai2", "东场玩家", "ai"),
    createPlayer("human", state.config.playerName, "human"),
  ];
}

function initializeMatch() {
  clearScheduledTasks();
  state.round = 1;
  state.dealerId = "human";
  state.stakeIndex = 0;
  state.pot = 0;
  state.currentActorId = null;
  state.roundActive = false;
  state.busy = false;
  state.winner = null;
  state.bannerText = "准备好后开始第一回合";
  state.players = createPlayers();
  ui.logList.innerHTML = "";
  addLog(`本局已设置为 ${state.config.startingScore} 起始积分，${DIFFICULTY_LABELS[state.config.difficulty]}。`);
  renderBoard();
}

function setScene(scene) {
  state.scene = scene;
  document.body.dataset.scene = scene;
  ui.lobbyScene.classList.toggle("is-hidden", scene !== "lobby");
  ui.tableScene.classList.toggle("is-hidden", scene !== "table");
}

function getPlayerById(id) {
  return state.players.find((player) => player.id === id) || null;
}

function seatedPlayers() {
  return state.players.filter((player) => !player.eliminated);
}

function activePlayers() {
  return state.players.filter((player) => !player.eliminated && !player.folded);
}

function getDealerPlayer() {
  const dealer = getPlayerById(state.dealerId);
  if (dealer && !dealer.eliminated) {
    return dealer;
  }
  const fallback = seatedPlayers()[0] || null;
  if (fallback) {
    state.dealerId = fallback.id;
  }
  return fallback;
}

function advanceDealer() {
  const currentDealer = getDealerPlayer();
  if (!currentDealer) {
    return;
  }
  let index = state.players.findIndex((player) => player.id === currentDealer.id);
  do {
    index = (index + 1) % state.players.length;
  } while (state.players[index].eliminated);
  state.dealerId = state.players[index].id;
}

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[randomIndex]] = [deck[randomIndex], deck[i]];
  }
  return deck;
}

function isSequence(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const regular = sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
  const lowAce = sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14;
  if (regular) {
    return { ok: true, high: sorted[2] };
  }
  if (lowAce) {
    return { ok: true, high: 3 };
  }
  return { ok: false, high: 0 };
}

function sortedCardWeights(cards) {
  return [...cards]
    .sort((a, b) => {
      if (b.rank.value !== a.rank.value) {
        return b.rank.value - a.rank.value;
      }
      return b.suit.weight - a.suit.weight;
    })
    .flatMap((card) => [card.rank.value, card.suit.weight]);
}

function evaluateHand(cards) {
  const values = cards.map((card) => card.rank.value);
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  const isFlush = cards.every((card) => card.suit.key === cards[0].suit.key);
  const sequence = isSequence(values);
  const sortedCounts = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return b[0] - a[0];
  });

  let category = 1;
  let name = "单张";
  let tieBreak = [];

  if (sortedCounts[0][1] === 3) {
    category = 6;
    name = "豹子";
    tieBreak = [sortedCounts[0][0]];
  } else if (isFlush && sequence.ok) {
    category = 5;
    name = "同花顺";
    tieBreak = [sequence.high];
  } else if (isFlush) {
    category = 4;
    name = "同花";
    tieBreak = sortedCardWeights(cards);
  } else if (sequence.ok) {
    category = 3;
    name = "顺子";
    tieBreak = [sequence.high];
  } else if (sortedCounts[0][1] === 2) {
    category = 2;
    name = "对子";
    const pairRank = sortedCounts[0][0];
    const kicker = sortedCounts[1][0];
    const kickerSuit = cards.find((card) => card.rank.value === kicker)?.suit.weight || 0;
    tieBreak = [pairRank, kicker, kickerSuit];
  } else {
    tieBreak = sortedCardWeights(cards);
  }

  return { category, name, tieBreak };
}

function compareHands(handA, handB) {
  if (handA.category !== handB.category) {
    return handA.category - handB.category;
  }
  const maxLength = Math.max(handA.tieBreak.length, handB.tieBreak.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = handA.tieBreak[index] || 0;
    const right = handB.tieBreak[index] || 0;
    if (left !== right) {
      return left - right;
    }
  }
  return 0;
}

function getBlindStake() {
  return BLIND_STAKES[state.stakeIndex];
}

function getActionCost(player, action) {
  const blindStake = getBlindStake();
  switch (action) {
    case "call":
      return player.seen ? blindStake * 2 : blindStake;
    case "raise": {
      const nextStake = BLIND_STAKES[Math.min(state.stakeIndex + 1, BLIND_STAKES.length - 1)];
      return player.seen ? nextStake * 2 : nextStake;
    }
    case "compare":
      return player.seen ? blindStake * 4 : blindStake * 2;
    default:
      return 0;
  }
}

function canAfford(player, action) {
  return player.score >= getActionCost(player, action);
}

function addLog(message) {
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const item = document.createElement("article");
  item.className = "log-item";
  item.innerHTML = `<time>${stamp}</time><p>${message}</p>`;
  ui.logList.prepend(item);
  while (ui.logList.children.length > 28) {
    ui.logList.removeChild(ui.logList.lastChild);
  }
}

function payToPot(player, amount) {
  const paid = Math.min(player.score, amount);
  player.score -= paid;
  state.pot += paid;
  return paid;
}

function getNextActiveIndex(fromIndex) {
  for (let step = 1; step <= state.players.length; step += 1) {
    const nextIndex = (fromIndex + step) % state.players.length;
    const candidate = state.players[nextIndex];
    if (!candidate.eliminated && !candidate.folded) {
      return nextIndex;
    }
  }
  return fromIndex;
}

function currentPlayer() {
  return getPlayerById(state.currentActorId);
}

function renderCards(player) {
  const container = document.getElementById(`cards-${player.id}`);
  container.innerHTML = "";

  const cardsToRender = player.hand.length ? player.hand : [{}, {}, {}];
  cardsToRender.forEach((card, index) => {
    const hidden = !player.hand.length || (!player.seen && state.roundActive);
    const cardElement = document.createElement("div");
    cardElement.className = `card ${card.suit?.red ? "red" : ""} ${hidden ? "hidden" : ""}`;
    cardElement.style.setProperty("--rotation", `${(index - 1) * 5}deg`);
    cardElement.style.animationDelay = `${index * 80}ms`;
    if (!hidden && card.rank && card.suit) {
      cardElement.innerHTML = `
        <span class="card-rank">${card.rank.label}</span>
        <span class="card-suit">${card.suit.symbol}</span>
        <span class="card-mini">${card.rank.label}${card.suit.symbol}</span>
      `;
    }
    container.appendChild(cardElement);
  });
}

function renderPlayer(player) {
  const seat = document.getElementById(`player-${player.id}`);
  document.getElementById(`name-${player.id}`).textContent = player.name;
  document.getElementById(`score-${player.id}`).textContent = `竞技积分 ${player.score}`;
  document.getElementById(`state-${player.id}`).textContent = player.eliminated
    ? "已出局"
    : player.folded
      ? "本轮弃牌"
      : player.seen
        ? `已看牌 · ${player.evaluation?.name || ""}`
        : "未看牌";
  document.getElementById(`action-${player.id}`).textContent = player.currentAction;

  seat.classList.toggle("active-turn", player.id === state.currentActorId && state.roundActive);
  seat.classList.toggle("folded", player.folded);
  seat.classList.toggle("out", player.eliminated);

  const dealerBadge = document.querySelector(`[data-dealer-for="${player.id}"]`);
  dealerBadge.classList.toggle("active", state.dealerId === player.id && !player.eliminated);

  renderCards(player);
}

function renderCompareTargets() {
  const options = activePlayers().filter((player) => player.id !== "human");
  ui.compareTarget.innerHTML = "";

  if (!options.length) {
    const option = document.createElement("option");
    option.textContent = "暂无可比牌目标";
    option.value = "";
    ui.compareTarget.appendChild(option);
  } else {
    options.forEach((player) => {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = `${player.name} · ${player.seen ? "已看牌" : "未看牌"}`;
      ui.compareTarget.appendChild(option);
    });
  }

  const humanTurn = state.roundActive && state.currentActorId === "human" && !state.busy;
  ui.compareTarget.disabled = !humanTurn || !options.length;
}

function updateCostLabels() {
  const human = getPlayerById("human");
  if (!human) {
    return;
  }

  ui.callCostLabel.textContent = `${getActionCost(human, "call")} 积分`;
  ui.raiseCostLabel.textContent = `${getActionCost(human, "raise")} 积分`;
  ui.compareCostLabel.textContent = `${getActionCost(human, "compare")} 积分`;

  if (human.eliminated) {
    ui.handHint.textContent = "已出局";
    ui.costHint.textContent = "本局已结束，可以重新开局或返回大厅修改配置。";
    return;
  }

  if (human.seen && human.evaluation) {
    ui.handHint.textContent = human.evaluation.name;
    ui.costHint.textContent = "你已看牌，后续跟注、加注和比牌都会更贵。";
    return;
  }

  if (human.folded) {
    ui.handHint.textContent = "已弃牌";
    ui.costHint.textContent = "等待其余玩家完成本轮。";
    return;
  }

  ui.handHint.textContent = "未看牌";
  ui.costHint.textContent = "盲牌状态下你的行动消耗更低。";
}

function updateButtons() {
  const human = getPlayerById("human");
  const isHumanTurn = state.scene === "table" && state.roundActive && state.currentActorId === "human" && !state.busy;
  const compareAvailable = activePlayers().some((player) => player.id !== "human");

  ui.lookBtn.disabled = !isHumanTurn || !human || human.seen || human.folded || human.eliminated;
  ui.callBtn.disabled = !isHumanTurn || !human || !canAfford(human, "call");
  ui.raiseBtn.disabled = !isHumanTurn || !human || state.stakeIndex >= BLIND_STAKES.length - 1 || !canAfford(human, "raise");
  ui.compareBtn.disabled = !isHumanTurn || !human || !compareAvailable || !canAfford(human, "compare");
  ui.foldBtn.disabled = !isHumanTurn || !human;
  ui.newRoundBtn.disabled = state.roundActive || state.busy || Boolean(state.winner);
}

function renderBoard() {
  ui.tableMetaLabel.textContent = describeConfig();
  ui.roundLabel.textContent = `第 ${state.round} 回合`;
  ui.stakeLabel.textContent = `${getBlindStake()} 积分`;
  ui.potLabel.textContent = String(state.pot);
  ui.centerPotValue.textContent = String(state.pot);
  ui.roundBanner.textContent = state.bannerText;

  const actor = currentPlayer();
  if (state.winner) {
    ui.turnLabel.textContent = `${state.winner.name} 赢得整局`;
  } else if (state.roundActive && actor) {
    ui.turnLabel.textContent = `${actor.name} 行动中`;
  } else {
    ui.turnLabel.textContent = "等待下一回合";
  }

  state.players.forEach(renderPlayer);
  renderCompareTargets();
  updateCostLabels();
  updateButtons();
}

function revealAllHands() {
  state.players.forEach((player) => {
    if (!player.eliminated && player.hand.length) {
      player.seen = true;
    }
  });
}

function settleRound(winner, reason) {
  state.roundActive = false;
  state.busy = false;
  revealAllHands();

  const winnings = state.pot;
  winner.score += winnings;
  winner.currentAction = `赢得本轮 +${winnings}`;
  state.pot = 0;
  state.bannerText = `${winner.name} 胜出，点击“开始下一回合”继续。`;
  addLog(`${winner.name}${reason}，收下本轮 ${winnings} 点竞技积分。`);

  state.players.forEach((player) => {
    if (!player.eliminated && player.score <= 0) {
      player.eliminated = true;
      player.currentAction = "积分耗尽";
      addLog(`${player.name} 积分耗尽，离开这张牌桌。`);
    }
  });

  const alive = seatedPlayers();
  if (alive.length === 1) {
    state.winner = alive[0];
    state.bannerText = `${alive[0].name} 成为整局冠军。`;
    addLog(`${alive[0].name} 成为整局冠军。`);
  } else {
    advanceDealer();
    state.round += 1;
  }

  renderBoard();
}

function startRound() {
  if (state.roundActive || state.busy || state.winner) {
    return;
  }

  const alive = seatedPlayers();
  if (alive.length <= 1) {
    state.winner = alive[0] || null;
    state.bannerText = state.winner ? `${state.winner.name} 已经赢下整局。` : "暂无可继续的玩家。";
    renderBoard();
    return;
  }

  clearScheduledTasks();
  state.pot = 0;
  state.stakeIndex = 0;
  state.roundActive = true;
  state.busy = true;
  state.bannerText = "荷官正在洗牌并发牌...";

  const deck = buildDeck();
  state.players.forEach((player) => {
    player.folded = player.eliminated;
    player.seen = false;
    player.hand = [];
    player.evaluation = null;
    player.currentAction = player.eliminated ? "已出局" : "等待行动";
  });

  state.players.forEach((player) => {
    if (!player.eliminated) {
      player.hand = [deck.pop(), deck.pop(), deck.pop()];
      player.evaluation = evaluateHand(player.hand);
      const paid = payToPot(player, Math.min(ANTE, player.score));
      player.currentAction = `投入底分 ${paid}`;
    }
  });

  const dealer = getDealerPlayer();
  const dealerIndex = state.players.findIndex((player) => player.id === dealer.id);
  state.currentActorId = state.players[getNextActiveIndex(dealerIndex)].id;

  addLog(`第 ${state.round} 回合开始，底分 ${ANTE}，牌桌开始发牌。`);
  renderBoard();

  schedule(() => {
    state.busy = false;
    state.bannerText = "发牌完成。";
    renderBoard();
    processTurnIfNeeded();
  }, Math.max(260, Math.round(getActionDelay() * 0.42)));
}

function proceedToNextTurn() {
  if (!state.roundActive) {
    renderBoard();
    return;
  }

  const alive = activePlayers();
  if (alive.length === 1) {
    settleRound(alive[0], "坚持到最后");
    return;
  }

  const currentIndex = state.players.findIndex((player) => player.id === state.currentActorId);
  state.currentActorId = state.players[getNextActiveIndex(currentIndex)].id;
  renderBoard();
  processTurnIfNeeded();
}

function playerLook(player) {
  if (player.seen || !state.roundActive) {
    return;
  }
  player.seen = true;
  player.currentAction = `看牌 · ${player.evaluation.name}`;
  addLog(`${player.name} 看了自己的手牌。`);
}

function applyCall(player) {
  const paid = payToPot(player, getActionCost(player, "call"));
  player.currentAction = `跟注 ${paid}`;
  addLog(`${player.name} 跟注 ${paid} 点。`);
}

function applyRaise(player) {
  state.stakeIndex = Math.min(state.stakeIndex + 1, BLIND_STAKES.length - 1);
  const paid = payToPot(player, player.seen ? getBlindStake() * 2 : getBlindStake());
  player.currentAction = `加注到 ${getBlindStake()} · 支付 ${paid}`;
  addLog(`${player.name} 将注级提升到 ${getBlindStake()}。`);
}

function foldPlayer(player, reason = "弃牌") {
  player.folded = true;
  player.currentAction = reason;
  addLog(`${player.name}${reason === "弃牌" ? "选择弃牌。" : `：${reason}`}`);
}

function doCompare(challenger, target) {
  if (!target || target.eliminated || target.folded) {
    return false;
  }

  const compareCost = getActionCost(challenger, "compare");
  const paid = payToPot(challenger, compareCost);
  challenger.seen = true;
  target.seen = true;

  const result = compareHands(challenger.evaluation, target.evaluation);
  const challengerWins = result >= 0;
  const winner = challengerWins ? challenger : target;
  const loser = challengerWins ? target : challenger;

  winner.currentAction = `比牌胜利 · ${winner.evaluation.name}`;
  loser.currentAction = `比牌失败 · ${loser.evaluation.name}`;
  loser.folded = true;

  state.bannerText = `${winner.name} 比牌获胜。`;
  addLog(`${challenger.name} 支付 ${paid} 点发起比牌，${winner.name} 获胜。`);
  return true;
}

function strengthBucket(player) {
  return player.evaluation.category * 20 + (player.evaluation.tieBreak[0] || 0);
}

function getDifficultyProfile(player) {
  const baseProfile = DIFFICULTY_PROFILES[state.config.difficulty] || DIFFICULTY_PROFILES.normal;
  const profile = { ...baseProfile };

  if (player.id === "ai1") {
    profile.raiseThreshold += 4;
    profile.weakFoldThreshold += 3;
    profile.bluffRaiseChance = Math.max(0, profile.bluffRaiseChance - 0.04);
  }

  if (player.id === "ai2") {
    profile.compareThreshold -= 4;
    profile.raiseThreshold -= 3;
    profile.bluffRaiseChance += 0.06;
  }

  return profile;
}

function aiShouldLook(ai, profile) {
  if (ai.seen) {
    return false;
  }
  if (getBlindStake() >= 10 || ai.score <= Math.ceil(state.config.startingScore * 0.3)) {
    return true;
  }
  if (activePlayers().length <= 2) {
    return Math.random() < profile.lookHeadsUp;
  }
  return Math.random() < profile.lookBase;
}

function chooseCompareTarget(ai) {
  const human = getPlayerById("human");
  const opponents = activePlayers().filter((player) => player.id !== ai.id);
  return opponents.sort((left, right) => {
    if (left.id === human?.id) {
      return -1;
    }
    if (right.id === human?.id) {
      return 1;
    }
    return right.score - left.score;
  })[0] || null;
}

function runAiTurn(ai) {
  if (!state.roundActive || ai.folded || ai.eliminated) {
    return;
  }

  const profile = getDifficultyProfile(ai);
  if (aiShouldLook(ai, profile)) {
    playerLook(ai);
  }

  const strength = strengthBucket(ai);
  const highPressure = getBlindStake() >= 10 || ai.score <= Math.ceil(state.config.startingScore * 0.25);
  const canCallNow = canAfford(ai, "call");
  const canRaiseNow = canAfford(ai, "raise") && state.stakeIndex < BLIND_STAKES.length - 1;
  const canCompareNow = canAfford(ai, "compare") && activePlayers().some((player) => player.id !== ai.id);

  if (!canCallNow && !canCompareNow) {
    foldPlayer(ai, "积分不足，只能弃牌");
    return;
  }

  if (ai.seen) {
    if (strength >= profile.compareThreshold && canCompareNow && Math.random() < profile.compareChance) {
      doCompare(ai, chooseCompareTarget(ai));
      return;
    }
    if (strength >= profile.raiseThreshold && canRaiseNow && Math.random() < profile.raiseChance) {
      applyRaise(ai);
      return;
    }
    if (strength <= profile.weakFoldThreshold && highPressure && Math.random() < profile.foldChance) {
      foldPlayer(ai);
      return;
    }
    applyCall(ai);
    return;
  }

  if (highPressure && strength <= profile.weakFoldThreshold - 2 && Math.random() < profile.pressureFoldChance) {
    foldPlayer(ai);
    return;
  }
  if (strength >= profile.blindRaiseThreshold && canRaiseNow && Math.random() < profile.blindRaiseChance) {
    applyRaise(ai);
    return;
  }
  if (canRaiseNow && Math.random() < profile.bluffRaiseChance) {
    applyRaise(ai);
    return;
  }
  applyCall(ai);
}

function processTurnIfNeeded() {
  if (!state.roundActive) {
    renderBoard();
    return;
  }

  const actor = currentPlayer();
  if (!actor) {
    return;
  }

  if (actor.type === "human") {
    state.bannerText = actor.seen ? "轮到你行动，判断是否跟进、加压或直接比牌。" : "轮到你行动，可以先看牌再做决定。";
    renderBoard();
    return;
  }

  state.busy = true;
  state.bannerText = `${actor.name} 正在观察牌桌...`;
  renderBoard();

  schedule(() => {
    if (!state.roundActive) {
      return;
    }
    runAiTurn(actor);
    state.busy = false;
    renderBoard();
    proceedToNextTurn();
  }, getActionDelay());
}

function humanAction(action) {
  const human = getPlayerById("human");
  if (!human || !state.roundActive || state.busy || state.currentActorId !== "human" || human.folded || human.eliminated) {
    return;
  }

  if (action === "look") {
    playerLook(human);
    state.bannerText = "已看牌，现在可以决定是否继续跟进。";
    renderBoard();
    return;
  }

  if (action === "call" && canAfford(human, "call")) {
    applyCall(human);
    proceedToNextTurn();
    return;
  }

  if (action === "raise" && canAfford(human, "raise") && state.stakeIndex < BLIND_STAKES.length - 1) {
    applyRaise(human);
    proceedToNextTurn();
    return;
  }

  if (action === "compare" && canAfford(human, "compare")) {
    const target = getPlayerById(ui.compareTarget.value);
    if (doCompare(human, target)) {
      proceedToNextTurn();
    }
    return;
  }

  if (action === "fold") {
    foldPlayer(human);
    proceedToNextTurn();
  }
}

function startGame() {
  readConfigFromControls();
  initializeMatch();
  setScene("table");
  startRound();
}

function backToLobby() {
  if (state.roundActive && !window.confirm("返回大厅会中断当前对局，继续吗？")) {
    return;
  }
  clearScheduledTasks();
  state.roundActive = false;
  state.busy = false;
  state.bannerText = "准备好后开始第一回合";
  setScene("lobby");
  writeConfigToControls();
  renderBoard();
}

function resetTableMatch() {
  const shouldConfirm = state.roundActive || state.round > 1 || Boolean(state.winner);
  if (shouldConfirm && !window.confirm("重新开局会清空当前进度，继续吗？")) {
    return;
  }
  initializeMatch();
  setScene("table");
  startRound();
}

ui.startGameBtn.addEventListener("click", startGame);
ui.backToLobbyBtn.addEventListener("click", backToLobby);
ui.newRoundBtn.addEventListener("click", startRound);
ui.resetMatchBtn.addEventListener("click", resetTableMatch);
ui.themeToggleButtons.forEach((button) => {
  button.addEventListener("click", toggleTheme);
});
ui.lookBtn.addEventListener("click", () => humanAction("look"));
ui.callBtn.addEventListener("click", () => humanAction("call"));
ui.raiseBtn.addEventListener("click", () => humanAction("raise"));
ui.compareBtn.addEventListener("click", () => humanAction("compare"));
ui.foldBtn.addEventListener("click", () => humanAction("fold"));

setTheme(loadThemePreference());
writeConfigToControls();
initializeMatch();
setScene("lobby");
