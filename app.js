const SESSIONS_BIN_ID = "6aa3ad3effd5d16053f93f83";
const TAXONOMY_BIN_ID = "6aa3b7b5ac6210605abfc74b";
const JSONBIN_KEY = "$2a$10$x6Mp3TxHosGGv/2kG9fyge7/f1iH.6Mq4chu36uxGX2VXHS7WqzyO";
const SESSIONS_BASE = `https://api.jsonbin.io/v3/b/${SESSIONS_BIN_ID}`;
const TAXONOMY_BASE = `https://api.jsonbin.io/v3/b/${TAXONOMY_BIN_ID}`;
const UNIT = "kg";
const SET_COUNT_OPTIONS = [1, 2, 3, 4];
const PROGRESSION_OPTIONS = [
  ["stay", "Stay"],
  ["up", "Go up"],
  ["down", "Go down"],
];

let currentExercises = []; // entries staged for the session being built
let MUSCLE_EXERCISES = {}; // muscle -> exercise list, loaded from the taxonomy bin
let selectedMuscles = []; // muscles picked for the day, e.g. Chest + Arms
let selectedSetCount = 3;
let selectedProgression = "stay";

const $ = (sel) => document.querySelector(sel);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function renderMuscleChips() {
  const container = $("#muscleChips");
  container.innerHTML = "";
  Object.keys(MUSCLE_EXERCISES).forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (selectedMuscles.includes(m) ? " active" : "");
    btn.textContent = m;
    btn.addEventListener("click", () => toggleMuscle(m, btn));
    container.appendChild(btn);
  });
}

function toggleMuscle(muscle, btn) {
  const idx = selectedMuscles.indexOf(muscle);
  if (idx === -1) {
    selectedMuscles.push(muscle);
    btn.classList.add("active");
  } else {
    selectedMuscles.splice(idx, 1);
    btn.classList.remove("active");
  }
  populateExerciseDropdown(selectedMuscles);
}

function resetMuscleSelection() {
  selectedMuscles = [];
  renderMuscleChips();
  populateExerciseDropdown(selectedMuscles);
}

function populateExerciseDropdown(muscles) {
  const sel = $("#exercise");
  sel.innerHTML = '<option value="" disabled selected>Select exercise</option>';
  muscles.forEach((m) => {
    const group = document.createElement("optgroup");
    group.label = m;
    (MUSCLE_EXERCISES[m] || []).forEach((ex) => {
      const opt = document.createElement("option");
      opt.value = ex;
      opt.textContent = ex;
      opt.dataset.muscle = m;
      group.appendChild(opt);
    });
    sel.appendChild(group);
  });
  const other = document.createElement("option");
  other.value = "__other__";
  other.textContent = "Other…";
  sel.appendChild(other);
  sel.disabled = muscles.length === 0;
}

function populateManageMuscleDropdown() {
  const sel = $("#manageMuscle");
  const prev = sel.value;
  sel.innerHTML = "";
  Object.keys(MUSCLE_EXERCISES).forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
  if (prev && MUSCLE_EXERCISES[prev]) sel.value = prev;
  renderManageList();
}

function renderManageList() {
  const muscle = $("#manageMuscle").value;
  const list = $("#manageExerciseList");
  list.innerHTML = "";
  (MUSCLE_EXERCISES[muscle] || []).forEach((ex, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${ex}</span><button type="button" class="remove-set" aria-label="Remove exercise">✕</button>`;
    li.querySelector("button").addEventListener("click", () => removeExercise(muscle, idx));
    list.appendChild(li);
  });
}

function refreshMainExerciseDropdownIfNeeded(muscle) {
  if (selectedMuscles.includes(muscle)) populateExerciseDropdown(selectedMuscles);
}

async function removeExercise(muscle, idx) {
  MUSCLE_EXERCISES[muscle].splice(idx, 1);
  renderManageList();
  refreshMainExerciseDropdownIfNeeded(muscle);
  try {
    await saveTaxonomy(MUSCLE_EXERCISES);
  } catch (err) {
    setStatus(`Could not save exercise list: ${err.message}`, true);
  }
}

async function addExercise() {
  const muscle = $("#manageMuscle").value;
  const input = $("#newExerciseName");
  const name = input.value.trim();
  if (!name || !muscle) return;
  MUSCLE_EXERCISES[muscle] = MUSCLE_EXERCISES[muscle] || [];
  if (MUSCLE_EXERCISES[muscle].includes(name)) {
    input.value = "";
    return;
  }
  MUSCLE_EXERCISES[muscle].push(name);
  input.value = "";
  renderManageList();
  refreshMainExerciseDropdownIfNeeded(muscle);
  try {
    await saveTaxonomy(MUSCLE_EXERCISES);
  } catch (err) {
    setStatus(`Could not save exercise list: ${err.message}`, true);
  }
}

function renderSetCountChips() {
  const container = $("#setCountChips");
  container.innerHTML = "";
  SET_COUNT_OPTIONS.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (selectedSetCount === n ? " active" : "");
    btn.textContent = n;
    btn.addEventListener("click", () => {
      selectedSetCount = n;
      renderSetCountChips();
      buildSetRows(n);
    });
    container.appendChild(btn);
  });
}

function buildSetRows(count) {
  const list = $("#setsList");
  const existing = [...list.querySelectorAll(".set-row")].map((row) => ({
    reps: row.querySelector(".reps").value,
    weight: row.querySelector(".weight").value,
  }));
  list.innerHTML = "";
  for (let i = 0; i < count; i++) {
    addSetRow(existing[i]);
  }
}

function addSetRow(prefill) {
  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML = `
    <span class="set-index"></span>
    <input type="number" inputmode="decimal" class="weight" placeholder="Weight (kg)" min="0" step="0.5" required>
    <input type="number" inputmode="numeric" class="reps" placeholder="Reps" min="0" required>
  `;
  if (prefill) {
    row.querySelector(".reps").value = prefill.reps;
    row.querySelector(".weight").value = prefill.weight;
  }
  $("#setsList").appendChild(row);
  renumberSets();
}

function renumberSets() {
  $("#setsList").querySelectorAll(".set-row").forEach((row, i) => {
    row.querySelector(".set-index").textContent = `#${i + 1}`;
  });
}

function readSets() {
  return [...$("#setsList").querySelectorAll(".set-row")].map((row) => ({
    reps: Number(row.querySelector(".reps").value),
    weight: Number(row.querySelector(".weight").value),
    unit: UNIT,
  }));
}

function renderProgressionChips() {
  const container = $("#progressionChips");
  container.innerHTML = "";
  PROGRESSION_OPTIONS.forEach(([val, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (selectedProgression === val ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      selectedProgression = val;
      renderProgressionChips();
    });
    container.appendChild(btn);
  });
}

function renderStagedExercises() {
  const list = $("#stagedExercises");
  list.innerHTML = "";
  currentExercises.forEach((entry, idx) => {
    const card = document.createElement("div");
    card.className = "exercise-card";
    const setsHtml = entry.sets
      .map((s, i) => `<li>#${i + 1} — ${s.reps} reps × ${s.weight}${s.unit}</li>`)
      .join("");
    card.innerHTML = `
      <div class="exercise-card-head">
        <strong>${entry.exercise}</strong>
        <span class="muscle-tag">${entry.muscle || ""}</span>
        <span class="badge badge-${entry.progression}">${progressionLabel(entry.progression)}</span>
        <button type="button" class="remove-exercise" aria-label="Remove exercise">✕</button>
      </div>
      <ul class="sets-summary">${setsHtml}</ul>
    `;
    card.querySelector(".remove-exercise").addEventListener("click", () => {
      currentExercises.splice(idx, 1);
      renderStagedExercises();
    });
    list.appendChild(card);
  });
  $("#saveSession").disabled = currentExercises.length === 0;
}

function progressionLabel(p) {
  return { stay: "Stay", up: "Go up", down: "Go down" }[p] || p;
}

function handleAddExercise(e) {
  e.preventDefault();
  const exerciseSel = $("#exercise");
  let exercise = exerciseSel.value;
  let muscle = null;
  if (exercise === "__other__") {
    exercise = $("#otherExercise").value.trim();
    muscle = selectedMuscles.length === 1 ? selectedMuscles[0] : null;
  } else {
    const opt = exerciseSel.selectedOptions[0];
    muscle = opt ? opt.dataset.muscle : null;
  }
  const sets = readSets();
  const progression = selectedProgression;

  if (selectedMuscles.length === 0) {
    setStatus("Pick at least one muscle for today.", true);
    return;
  }
  if (!exercise || sets.length === 0 || !progression) {
    setStatus("Fill exercise, at least one set, and progression.", true);
    return;
  }
  if (sets.some((s) => !s.reps || s.weight === "" || Number.isNaN(s.weight))) {
    setStatus("Every set needs reps and weight.", true);
    return;
  }

  currentExercises.push({ exercise, muscle, sets, progression });
  renderStagedExercises();
  resetExerciseForm();
  setStatus("");
}

function resetExerciseForm() {
  $("#exercise").value = "";
  $("#otherExercise").value = "";
  $("#otherExercise").hidden = true;
  selectedProgression = "stay";
  renderProgressionChips();
  selectedSetCount = 3;
  renderSetCountChips();
  buildSetRows(selectedSetCount);
}

function setStatus(msg, isError = false) {
  const el = $("#status");
  el.textContent = msg;
  el.className = isError ? "status error" : "status";
}

async function fetchSessions() {
  const res = await fetch(`${SESSIONS_BASE}/latest`, {
    headers: { "X-Master-Key": JSONBIN_KEY },
  });
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  const data = await res.json();
  return data.record && Array.isArray(data.record.sessions) ? data.record : { sessions: [] };
}

async function saveSessions(record) {
  const res = await fetch(SESSIONS_BASE, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_KEY,
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
}

async function fetchTaxonomy() {
  const res = await fetch(`${TAXONOMY_BASE}/latest`, {
    headers: { "X-Master-Key": JSONBIN_KEY },
  });
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  const data = await res.json();
  return data.record && typeof data.record === "object" ? data.record : {};
}

async function saveTaxonomy(record) {
  const res = await fetch(TAXONOMY_BASE, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_KEY,
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
}

async function loadTaxonomy() {
  let record = {};
  try {
    record = await fetchTaxonomy();
  } catch (err) {
    setStatus(`Could not load exercise list: ${err.message}`, true);
  }
  const looksValid = record && typeof record === "object" && Object.values(record).some((v) => Array.isArray(v));
  if (!looksValid) {
    record = JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
    try {
      await saveTaxonomy(record);
    } catch (err) {
      setStatus(`Could not seed exercise list: ${err.message}`, true);
    }
  }
  MUSCLE_EXERCISES = record;
}

async function handleSaveSession() {
  if (currentExercises.length === 0) return;
  const session = {
    id: uid(),
    date: $("#sessionDate").value || todayISO(),
    muscleGroups: [...selectedMuscles],
    exercises: currentExercises,
  };

  $("#saveSession").disabled = true;
  setStatus("Saving…");
  try {
    const record = await fetchSessions();
    record.sessions.unshift(session);
    await saveSessions(record);
    setStatus("Saved ✓");
    currentExercises = [];
    renderStagedExercises();
    resetMuscleSelection();
    renderHistory(record.sessions);
  } catch (err) {
    setStatus(`Save failed: ${err.message}. Your entries are kept, retry.`, true);
    $("#saveSession").disabled = false;
  }
}

function renderHistory(sessions) {
  const list = $("#historyList");
  list.innerHTML = "";
  if (!sessions.length) {
    list.innerHTML = '<p class="empty">No sessions logged yet.</p>';
    return;
  }
  sessions.forEach((session) => {
    const card = document.createElement("div");
    card.className = "history-card";
    const exHtml = session.exercises
      .map((entry) => {
        const setsHtml = entry.sets.map((s) => `${s.reps}×${s.weight}${s.unit}`).join(", ");
        return `<div class="history-exercise"><strong>${entry.exercise}</strong> <span class="badge badge-${entry.progression}">${progressionLabel(entry.progression)}</span><div class="history-sets">${setsHtml}</div></div>`;
      })
      .join("");
    const muscles = (session.muscleGroups || [session.muscleGroup]).filter(Boolean).join(" + ");
    card.innerHTML = `<div class="history-head">${session.date} — ${muscles}</div>${exHtml}`;
    list.appendChild(card);
  });
}

async function loadHistory() {
  try {
    const record = await fetchSessions();
    renderHistory(record.sessions);
  } catch (err) {
    $("#historyList").innerHTML = `<p class="empty">Could not load history: ${err.message}</p>`;
  }
}

async function init() {
  $("#sessionDate").value = todayISO();
  await loadTaxonomy();
  renderMuscleChips();
  populateExerciseDropdown(selectedMuscles);
  populateManageMuscleDropdown();
  renderProgressionChips();
  renderSetCountChips();
  buildSetRows(selectedSetCount);

  $("#exercise").addEventListener("change", (e) => {
    $("#otherExercise").hidden = e.target.value !== "__other__";
  });
  $("#addExerciseForm").addEventListener("submit", handleAddExercise);
  $("#saveSession").addEventListener("click", handleSaveSession);
  $("#manageMuscle").addEventListener("change", renderManageList);
  $("#addExerciseBtn").addEventListener("click", addExercise);

  loadHistory();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
