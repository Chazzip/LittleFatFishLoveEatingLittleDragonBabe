const budgetPools = [
  { budget: 100, items: ["均衡之刃", "薰风"] },
  { budget: 150, items: ["薰风", "520pro", "胜利9500", "小铁锤"] },
  { budget: 200, items: ["胜利大铁锤", "李宁小钢炮"] },
  { budget: 250, items: ["川崎十里桃花", "胜利TK-220"] },
  { budget: 300, items: ["李宁WS74", "国伦2300", "胜利TK-220"] },
  { budget: 350, items: ["胜利纳米6/7", "极速12TDF", "李宁WS79"] },
  { budget: 400, items: ["李宁WS72", "胜利驭7SP"] },
  { budget: 450, items: ["胜利神速50", "李宁风刃500", "雷霆50", "胜利小猎鹰", "霜降青蛇PRO"] },
  { budget: 500, items: ["胜利极速9TK-15", "李宁战戟5000", "Yonex黑切", "白切"] },
  { budget: 600, items: ["李宁雷霆60", "胜利极速11", "胜利神速", "胜利尖峰80"] },
  { budget: 700, items: ["胜利大鬼斩", "李宁锋影700", "雷霆70", "胜利神速80X", "胜利神速功夫"] },
  { budget: 800, items: ["胜利极速12-2", "胜利神速90K-2", "龙牙之刃-2", "李宁锋影800"] },
  {
    budget: 900,
    items: ["胜利龙牙之刃-1", "李宁战戟7000/战戟8000", "胜利极速12F", "李宁雷霆80", "胜利神速90F", "Yonex天斧70", "疾光70"],
  },
  { budget: 1000, items: ["胜利神速100X", "胜利黑金隼", "李宁雷霆100", "李宁战戟9000"] },
];

const rarityMap = [
  { min: 1000, label: "EX", className: "tier-ex", copy: "赤金信标", signal: "CRIMSON STAR" },
  { min: 800, label: "UR", className: "tier-ur", copy: "橙焰归档", signal: "ORANGE BURST" },
  { min: 450, label: "SSR", className: "tier-ssr", copy: "金辉签发", signal: "GOLD FLARE" },
  { min: 250, label: "SR", className: "tier-sr", copy: "蓝光入列", signal: "AZURE TRACE" },
  { min: 0, label: "R", className: "tier-r", copy: "绿线确认", signal: "EMERALD TRACE" },
];

const $ = (selector) => document.querySelector(selector);
const modeToggle = $("#modeToggle");
const poolList = $("#poolList");
const historyList = $("#historyList");
const poolModeLabel = $("#poolModeLabel");
const poolTierLabel = $("#poolTierLabel");
const protocolPoolCount = $("#protocolPoolCount");
const sequenceState = $("#sequenceState");
const stage = $("#summonStage");
const stageCode = $("#stageCode");
const stageState = $("#stageState");
const drawButton = $("#drawButton");
const redrawButton = $("#redrawButton");
const copyResult = $("#copyResult");
const clearHistory = $("#clearHistory");
const soundToggle = $("#soundToggle");
const revealBoard = $("#revealBoard");
const rarityBadge = $("#rarityBadge");
const resultSerial = $("#resultSerial");
const resultKicker = $("#resultKicker");
const resultName = $("#resultName");
const resultMeta = $("#resultMeta");
const resultSignal = $("#resultSignal");
const multiResults = $("#multiResults");
const poolCount = $("#poolCount");
const canvas = $("#field");
const ctx = canvas.getContext("2d");
const allItems = buildEqualPool(budgetPools);
const defaultClassName = "tier-ssr";

let drawMode = "single";
let isDrawing = false;
let soundEnabled = true;
let lastResult = null;
let particles = [];
let history = readHistory();

function rarityForBudget(budget) {
  return rarityMap.find((entry) => budget >= entry.min);
}

function buildEqualPool(pools) {
  const itemMap = new Map();
  pools.forEach((pool) => {
    pool.items.forEach((name) => {
      const existing = itemMap.get(name);
      if (!existing || pool.budget > existing.budget) {
        const rarity = rarityForBudget(pool.budget);
        itemMap.set(name, {
          name,
          budget: pool.budget,
          rarity: rarity.label,
          rarityCopy: rarity.copy,
          signal: rarity.signal,
          className: rarity.className,
        });
      }
    });
  });
  return Array.from(itemMap.values());
}

function randomIndex(length) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % length;
}

function pickFromFullPool() {
  const item = allItems[randomIndex(allItems.length)];
  return {
    ...item,
    serial: makeSerial(item),
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function makeSerial(item) {
  const suffix = String(randomIndex(10000)).padStart(4, "0");
  return `YR-${item.rarity}-${suffix}`;
}

function tenPull() {
  const results = Array.from({ length: 10 }, () => pickFromFullPool());
  results.sort((a, b) => scoreRarity(b) - scoreRarity(a) || b.budget - a.budget);
  return results;
}

function scoreRarity(result) {
  return ["R", "SR", "SSR", "UR", "EX"].indexOf(result.rarity);
}

function setTierClass(element, className) {
  element.classList.remove("tier-r", "tier-sr", "tier-ssr", "tier-ur", "tier-ex");
  element.classList.add(className);
}

function renderPool() {
  poolModeLabel.textContent = `${allItems.length} ITEMS`;
  poolTierLabel.textContent = `${allItems.length} LOCKED`;
  protocolPoolCount.textContent = `${allItems.length} LOCKED`;
  stageCode.textContent = "FULL POOL";
  poolCount.textContent = allItems.length;
  setTierClass(document.body, defaultClassName);
  setTierClass(stage, defaultClassName);
  setTierClass(poolTierLabel, defaultClassName);
  poolList.innerHTML = allItems
    .map((item) => `<div class="pool-pill ${item.className}"><span>${item.name}</span><strong>${item.rarity}</strong></div>`)
    .join("");
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = `<div class="history-empty">补给记录待签发</div>`;
    return;
  }

  historyList.innerHTML = history
    .slice(0, 16)
    .map(
      (item) => `
        <article class="history-item ${item.className}">
          <div class="history-item__top">
            <strong>${item.rarity}</strong>
            <span>${item.time}</span>
          </div>
          <p>${item.name}</p>
          <small>ARCHIVE ¥${item.budget} · ${item.signal || item.rarityCopy || "EQUAL POOL"}</small>
        </article>
      `,
    )
    .join("");
}

function readHistory() {
  try {
    const raw = localStorage.getItem("yr-history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory() {
  localStorage.setItem("yr-history", JSON.stringify(history.slice(0, 40)));
}

function pushHistory(results) {
  history = [...results, ...history].slice(0, 40);
  writeHistory();
  renderHistory();
}

function setMode(mode) {
  drawMode = mode;
  modeToggle.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  sequenceState.textContent = mode === "single" ? "SINGLE" : "TENFOLD";
  drawButton.querySelector(".draw-button__label").textContent = mode === "single" ? "启动补给" : "十连展开";
}

function showSingle(result) {
  lastResult = result;
  setTierClass(revealBoard, result.className);
  setTierClass(rarityBadge, result.className);
  rarityBadge.textContent = result.rarity;
  resultSerial.textContent = result.serial;
  resultKicker.textContent = result.rarityCopy;
  resultName.textContent = result.name;
  resultMeta.textContent = `ARCHIVE ¥${result.budget} · EQUAL POOL`;
  resultSignal.textContent = result.signal;
  multiResults.innerHTML = "";
}

function showMulti(results) {
  lastResult = results[0];
  showSingle(results[0]);
  multiResults.innerHTML = results
    .map(
      (result, index) => `
        <article class="result-card ${result.className}" style="animation-delay: ${index * 46}ms">
          <div class="result-card__top">
            <strong>${result.rarity}</strong>
            <b>${String(index + 1).padStart(2, "0")}</b>
          </div>
          <span>${result.name}</span>
          <small>ARCHIVE ¥${result.budget}</small>
        </article>
      `,
    )
    .join("");
}

function beginDraw() {
  if (isDrawing) return;

  isDrawing = true;
  drawButton.disabled = true;
  stageState.textContent = "RNG SYNC";
  stage.classList.remove("is-open");
  stage.classList.add("is-drawing");
  multiResults.innerHTML = "";
  playCharge();
  burst(22, defaultClassName);

  window.setTimeout(() => {
    stageState.textContent = "GATE OPEN";
    stage.classList.add("is-open");
    playOpen();
    burst(68, defaultClassName);
  }, 760);

  window.setTimeout(() => {
    const results = drawMode === "single" ? [pickFromFullPool()] : tenPull();
    if (drawMode === "single") showSingle(results[0]);
    else showMulti(results);
    pushHistory(results);
    stageState.textContent = `${results[0].rarity} CONFIRMED`;
    playReveal(results[0].rarity);
    burst(drawMode === "single" ? 120 : 170, results[0].className);
    isDrawing = false;
    drawButton.disabled = false;
  }, 1520);
}

function copyCurrentResult() {
  if (!lastResult) return;
  const text = `羽刃补给：${lastResult.rarity}｜${lastResult.name}｜ARCHIVE ¥${lastResult.budget}`;
  navigator.clipboard?.writeText(text);
  copyResult.textContent = "已复制";
  window.setTimeout(() => {
    copyResult.textContent = "复制结果";
  }, 1200);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle("is-on", soundEnabled);
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.textContent = soundEnabled ? "声效 ON" : "声效 OFF";
}

function soundTone(frequency, duration, type = "sine", gainValue = 0.035) {
  if (!soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration / 1000);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration / 1000 + 0.03);
}

function playCharge() {
  [220, 277, 330].forEach((frequency, index) => {
    window.setTimeout(() => soundTone(frequency, 120, "triangle", 0.025), index * 110);
  });
}

function playOpen() {
  soundTone(92, 190, "sawtooth", 0.025);
  window.setTimeout(() => soundTone(740, 160, "triangle", 0.03), 90);
}

function playReveal(rarity) {
  const notes = {
    R: [392, 494],
    SR: [392, 523, 659],
    SSR: [392, 523, 659, 988],
    UR: [494, 659, 880, 1175],
    EX: [523, 784, 1047, 1568],
  }[rarity];
  notes.forEach((frequency, index) => {
    window.setTimeout(() => soundTone(frequency, 170, "sine", 0.032), index * 80);
  });
}

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function burst(count, className) {
  const color = getComputedStyle(document.querySelector(`.${className}`)).getPropertyValue("--tier-color").trim() || "#e2bc64";
  const originX = window.innerWidth * 0.54;
  const originY = Math.min(window.innerHeight * 0.44, 420);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 6.2;
    particles.push({
      x: originX + (Math.random() - 0.5) * 120,
      y: originY + (Math.random() - 0.5) * 80,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.4,
      size: 1.4 + Math.random() * 4,
      life: 58 + Math.random() * 44,
      color,
    });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles = particles.filter((particle) => particle.life > 0);
  particles.forEach((particle) => {
    particle.life -= 1;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.04;
    const alpha = Math.max(0, particle.life / 90);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(animateParticles);
}

modeToggle.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button || isDrawing) return;
  setMode(button.dataset.mode);
});

drawButton.addEventListener("click", beginDraw);
redrawButton.addEventListener("click", beginDraw);
copyResult.addEventListener("click", copyCurrentResult);
soundToggle.addEventListener("click", toggleSound);
clearHistory.addEventListener("click", () => {
  history = [];
  writeHistory();
  renderHistory();
});
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
animateParticles();
renderPool();
renderHistory();
