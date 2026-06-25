const STORAGE_KEY = 'fifa2026_collection_v1';
const STORAGE_PREFILL_KEY = 'fifa2026_prefill_applied_v1';
const STORAGE_PREFILL_V2_KEY = 'fifa2026_prefill_applied_v2';
const STORAGE_PREFILL_V3_KEY = 'fifa2026_prefill_applied_v3';
const STORAGE_PREFILL_V4_KEY = 'fifa2026_prefill_applied_v4';
const STORAGE_PREFILL_V5_KEY = 'fifa2026_prefill_applied_v5';
const STORAGE_PREFILL_V6_KEY = 'fifa2026_prefill_applied_v6';
const STORAGE_PREFILL_V7_KEY = 'fifa2026_prefill_applied_v7';
const STORAGE_PREFILL_V8_KEY = 'fifa2026_prefill_applied_v8';
const STORAGE_PREFILL_V9_KEY = 'fifa2026_prefill_applied_v9';
const STORAGE_PREFILL_V10_KEY = 'fifa2026_prefill_applied_v10';
const STORAGE_PREFILL_V11_KEY = 'fifa2026_prefill_applied_v11';
const STORAGE_UI_KEY = 'fifa2026_ui_v1';
const STORAGE_SNAPSHOTS_KEY = 'fifa2026_snapshots_v1';
const SNAPSHOT_RETENTION = 60; // keep last 60 daily snapshots

const IS_VIEW_MODE = new URLSearchParams(location.search).has('view') ||
  /[?&]viewer\b/.test(location.search) ||
  location.pathname.endsWith('/viewer.html');

let state = {
  collected: {},
  filter: 'all',
  group: 'all',
  search: '',
  compactCollected: true,
  hideCollected: false,
  collapsedGroups: {},
  collapsedTeams: {},
  readOnly: IS_VIEW_MODE,
  activeTab: 'collection',
};

function loadState() {
  // View mode: don't touch localStorage, load embedded snapshot
  if (state.readOnly) {
    if (typeof VIEW_STATE !== 'undefined' && VIEW_STATE.collected) {
      state.collected = { ...VIEW_STATE.collected };
    }
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.collected = JSON.parse(raw);
  } catch (e) { console.warn('Failed to load collection', e); }

  try {
    const rawUi = localStorage.getItem(STORAGE_UI_KEY);
    if (rawUi) {
      const ui = JSON.parse(rawUi);
      if (typeof ui.compactCollected === 'boolean') state.compactCollected = ui.compactCollected;
      if (typeof ui.hideCollected === 'boolean') state.hideCollected = ui.hideCollected;
      if (ui.collapsedGroups) state.collapsedGroups = ui.collapsedGroups;
      if (ui.collapsedTeams) state.collapsedTeams = ui.collapsedTeams;
      if (ui.activeTab) state.activeTab = ui.activeTab;
    }
  } catch (e) { console.warn('Failed to load ui', e); }

  if (!localStorage.getItem(STORAGE_PREFILL_KEY)) {
    applyPrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_KEY, '1');
  }

  if (!localStorage.getItem(STORAGE_PREFILL_V2_KEY)) {
    applyPrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V2_KEY, '1');
  }

  // V3 migration: paper-list corrections (~170 new stickers). REPLACES team/specials
  // state with the new PREFILL so old extra "have" entries get cleared too.
  // CC stickers are NOT touched so user's CC progress is preserved.
  if (!localStorage.getItem(STORAGE_PREFILL_V3_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V3_KEY, '1');
  }

  // V4 migration: swap batches received (+collected) and dups sent (-duplicates).
  // Replaces team/specials state with current PREFILL (CC preserved).
  if (!localStorage.getItem(STORAGE_PREFILL_V4_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V4_KEY, '1');
  }

  // V5 migration: swap batch 7 received (+24).
  if (!localStorage.getItem(STORAGE_PREFILL_V5_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V5_KEY, '1');
  }

  // V6 migration: swap batch 8 received (+29).
  if (!localStorage.getItem(STORAGE_PREFILL_V6_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V6_KEY, '1');
  }

  // V7 migration: swap batch 9 received (+14, +IRN2 dup) and Panini logo (00).
  if (!localStorage.getItem(STORAGE_PREFILL_V7_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V7_KEY, '1');
  }

  // V8 migration: full sync from user's export 2026-06-22 (916/992).
  if (!localStorage.getItem(STORAGE_PREFILL_V8_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V8_KEY, '1');
  }

  // V9 migration: swap batch 10 received (+12 new, +8 dups, incl. FWC13).
  if (!localStorage.getItem(STORAGE_PREFILL_V9_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V9_KEY, '1');
  }

  // V10 migration: swap batch 11 received (+COD9, +SEN1 foil, +NZL18 dup).
  if (!localStorage.getItem(STORAGE_PREFILL_V10_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V10_KEY, '1');
  }

  // V11 migration: swap batch 12 received (+15 new, +8 dups).
  if (!localStorage.getItem(STORAGE_PREFILL_V11_KEY)) {
    replacePrefill();
    saveState();
    localStorage.setItem(STORAGE_PREFILL_V11_KEY, '1');
  }
}

function replacePrefill() {
  // Drop existing team stickers and specials, then re-apply PREFILL
  for (const k of Object.keys(state.collected)) {
    if (k.startsWith('CC')) continue; // keep Coca-Cola
    delete state.collected[k];
  }
  applyPrefill();
}

function applyPrefill() {
  for (const [code, stickers] of Object.entries(PREFILL)) {
    if (code === 'SPECIALS') {
      for (const s of stickers) if (!state.collected[s]) state.collected[s] = true;
    } else {
      for (const n of stickers) {
        const k = `${code}${n}`;
        if (!state.collected[k]) state.collected[k] = true;
      }
    }
  }
}

function saveState() {
  if (state.readOnly) return;
  maybeMakeDailySnapshot();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.collected));
}

// --- Snapshots ---
function todayDate() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function loadSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function saveSnapshots(s) {
  localStorage.setItem(STORAGE_SNAPSHOTS_KEY, JSON.stringify(s));
}

function buildSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    date: todayDate(),
    stats: {
      total: totalHaveCount(),
      grand: TOTAL_STICKERS,
      pct: ((totalHaveCount() / TOTAL_STICKERS) * 100).toFixed(2),
      teams: Object.fromEntries(Object.keys(ALBUM.teams).map(c => [c, teamHaveCount(c)])),
      specials: specialsHaveCount(),
      cc: ccHaveCount(),
    },
    collected: { ...state.collected },
  };
}

// Saves a snapshot for "today" iff today's snapshot doesn't exist yet.
// Called before each state save -- captures the state right before the first change of the day.
function maybeMakeDailySnapshot() {
  const snaps = loadSnapshots();
  const today = todayDate();
  if (snaps[today]) return;
  snaps[today] = buildSnapshot();
  // Trim to retention
  const keys = Object.keys(snaps).sort();
  while (keys.length > SNAPSHOT_RETENTION) {
    const oldest = keys.shift();
    delete snaps[oldest];
  }
  saveSnapshots(snaps);
}

function restoreSnapshot(date) {
  const snaps = loadSnapshots();
  const snap = snaps[date];
  if (!snap) return false;
  // Make a snapshot of current state first, so restore is also reversible
  maybeMakeDailySnapshot();
  state.collected = { ...snap.collected };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.collected));
  rebuildAllBodies();
  refreshStats();
  return true;
}

function downloadSnapshot(date) {
  const snaps = loadSnapshots();
  const snap = date === '__current__' ? buildSnapshot() : snaps[date];
  if (!snap) return;
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fifa2026-snapshot-${snap.date || todayDate()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function deleteSnapshot(date) {
  const snaps = loadSnapshots();
  delete snaps[date];
  saveSnapshots(snaps);
}

function saveUi() {
  localStorage.setItem(STORAGE_UI_KEY, JSON.stringify({
    compactCollected: state.compactCollected,
    hideCollected: state.hideCollected,
    collapsedGroups: state.collapsedGroups,
    collapsedTeams: state.collapsedTeams,
    activeTab: state.activeTab,
  }));
}

function isHave(key) { return !!state.collected[key]; }

function setHave(key, value) {
  if (value) state.collected[key] = true;
  else delete state.collected[key];
  saveState();
}

// --- Click handling with confirmation when removing ---
let pendingRemoveKey = null;

function onStickerClick(key, name) {
  if (state.readOnly) return;
  if (isHave(key)) {
    pendingRemoveKey = key;
    const dlg = document.getElementById('confirm-dialog');
    document.getElementById('confirm-text').textContent =
      `Вы уверены, что хотите снять отметку с «${name}»?`;
    dlg.showModal();
  } else {
    setHave(key, true);
    refreshSticker(key);
    refreshTeam(keyToTeam(key));
    refreshStats();
  }
}

function keyToTeam(key) {
  if (key === '00' || key.startsWith('FWC')) return 'specials';
  if (key.startsWith('CC')) return 'cc';
  return key.replace(/\d+$/, '');
}

function teamHaveCount(code) {
  let have = 0;
  for (let i = 1; i <= 20; i++) if (isHave(`${code}${i}`)) have++;
  return have;
}

function specialsHaveCount() {
  let have = 0;
  for (const s of ALBUM.specials) if (isHave(s.code)) have++;
  return have;
}

function ccHaveCount() {
  let have = 0;
  for (const s of ALBUM.cocaCola) if (isHave(s.code)) have++;
  return have;
}

function dupTotalCount() {
  if (typeof DUPLICATES === 'undefined') return 0;
  let n = 0;
  for (const code in DUPLICATES) {
    for (const k in DUPLICATES[code]) n += DUPLICATES[code][k];
  }
  return n;
}

function teamDupCount(code) {
  if (typeof DUPLICATES === 'undefined' || !DUPLICATES[code]) return 0;
  let n = 0;
  for (const k in DUPLICATES[code]) n += DUPLICATES[code][k];
  return n;
}

function totalHaveCount() {
  let n = 0;
  for (const k in state.collected) if (state.collected[k]) n++;
  return n;
}

function refreshStats() {
  const total = totalHaveCount();
  const specials = specialsHaveCount();
  const cc = ccHaveCount();
  const players = total - specials - cc;

  let complete = 0;
  for (const code of Object.keys(ALBUM.teams)) {
    if (teamHaveCount(code) === 20) complete++;
  }

  const pct = ((total / TOTAL_STICKERS) * 100).toFixed(1);
  document.getElementById('stat-total').textContent = `${total} / ${TOTAL_STICKERS}`;
  document.getElementById('stat-percent').textContent = `${pct}%`;
  document.getElementById('progress-total').style.width = `${pct}%`;
  document.getElementById('stat-teams').textContent = `${complete} / 48`;
  document.getElementById('stat-players').textContent = `${players} / 960`;
  document.getElementById('stat-specials').textContent = `${specials} / ${ALBUM.specials.length}`;
  document.getElementById('stat-cc').textContent = `${cc} / ${ALBUM.cocaCola.length}`;
  document.getElementById('stat-missing').textContent = `${TOTAL_STICKERS - total}`;

  refreshLeaderboards();
  refreshDupStats();
}

function refreshDupStats() {
  if (typeof DUPLICATES === 'undefined') return;
  const totalEl = document.getElementById('stat-dups-total');
  if (!totalEl) return;
  let total = 0;
  let unique = 0;
  let maxCopies = 0;
  let teamsWithDups = 0;
  let fwcDups = 0;
  for (const code in DUPLICATES) {
    const t = DUPLICATES[code];
    const keys = Object.keys(t);
    if (keys.length > 0 && code !== 'FWC') teamsWithDups++;
    for (const k of keys) {
      const c = t[k];
      total += c;
      unique++;
      if (c > maxCopies) maxCopies = c;
      if (code === 'FWC') fwcDups += c;
    }
  }
  totalEl.textContent = total;
  document.getElementById('stat-dups-unique').textContent = `${unique} уникальных`;
  document.getElementById('stat-dups-teams').textContent = `${teamsWithDups} / 48`;
  document.getElementById('stat-dups-max').textContent = `×${maxCopies}`;
  document.getElementById('stat-dups-fwc').textContent = `${fwcDups}`;

  // Dup leaderboards
  const teamList = Object.keys(ALBUM.teams).map(code => {
    const t = DUPLICATES[code] || {};
    let count = 0;
    for (const k in t) count += t[k];
    return { code, name: ALBUM.teams[code].name, flag: ALBUM.teams[code].flag, count };
  });
  const top = [...teamList].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 3);
  const bottom = [...teamList].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name)).slice(0, 3);

  const renderDupList = (id, items, dim) => {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="lb-flag">${it.flag}</span>
        <span class="lb-name">${it.name}</span>
        <span class="lb-pct ${dim ? 'dim' : ''}" style="color: ${dim ? '' : '#ffc107'}">${it.count} шт.</span>
      `;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        switchTab('dups');
        const card = document.querySelector(`[data-team-code="__dup_${it.code}__"]`);
        if (card) {
          card.classList.remove('collapsed');
          state.collapsedTeams[`__dup_${it.code}__`] = false;
          saveUi();
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      ul.appendChild(li);
    }
  };
  renderDupList('lb-dups-top', top, false);
  renderDupList('lb-dups-bottom', bottom, true);
}

function switchTab(tab) {
  state.activeTab = tab;
  saveUi();
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('stats-collection').classList.toggle('hidden', tab !== 'collection');
  document.getElementById('stats-dups').classList.toggle('hidden', tab !== 'dups');

  // Toggle card visibility
  document.querySelectorAll('.group-section').forEach(sec => {
    const isDup = sec.dataset.group === 'dups';
    if (tab === 'dups') {
      sec.classList.toggle('hidden', !isDup);
    } else {
      sec.classList.toggle('hidden', isDup);
    }
  });

  // Hide filters that don't apply to dups tab
  const collFilters = document.querySelector('.filters-row');
  const dispOpts = document.querySelector('.display-options');
  if (collFilters) collFilters.style.display = tab === 'dups' ? 'none' : '';
  if (dispOpts) dispOpts.style.display = tab === 'dups' ? 'none' : '';
}

function refreshLeaderboards() {
  const list = Object.keys(ALBUM.teams).map(code => {
    const have = teamHaveCount(code);
    return { code, name: ALBUM.teams[code].name, flag: ALBUM.teams[code].flag, have, pct: (have / 20) * 100 };
  });

  const top = [...list].sort((a, b) => b.have - a.have || a.name.localeCompare(b.name)).slice(0, 3);
  const bottom = [...list].sort((a, b) => a.have - b.have || a.name.localeCompare(b.name)).slice(0, 3);

  const renderList = (id, items, dim) => {
    const ul = document.getElementById(id);
    ul.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="lb-flag">${it.flag}</span>
        <span class="lb-name">${it.name}</span>
        <span class="lb-pct ${dim ? 'dim' : ''}">${Math.round(it.pct)}% · ${it.have}/20</span>
      `;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        document.getElementById('search-input').value = it.code;
        state.search = it.code;
        applyFilter();
        const card = document.querySelector(`[data-team-code="${it.code}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      ul.appendChild(li);
    }
  };
  renderList('lb-top', top, false);
  renderList('lb-bottom', bottom, true);
}

function refreshSticker(key) {
  document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
    el.classList.toggle('have', isHave(key));
  });
}

function refreshTeam(code) {
  // For special sections
  if (code === 'specials' || code === 'cc') {
    rebuildSection(code);
    return;
  }
  const card = document.querySelector(`[data-team-code="${code}"]`);
  if (!card) return;
  rebuildTeamBody(card, code);

  const have = teamHaveCount(code);
  const pct = (have / 20) * 100;
  card.querySelector('.team-count').innerHTML = `<span class="accent">${have}</span> / 20`;
  card.querySelector('.team-pct').textContent = `${Math.round(pct)}%`;
  card.querySelector('.team-pct').classList.toggle('dim', have === 0);
  card.querySelector('.progress-fill').style.width = `${pct}%`;
  card.classList.toggle('complete', have === 20);

  // Update group summary
  for (const [group, codes] of Object.entries(ALBUM.groups)) {
    if (codes.includes(code)) {
      refreshGroupSummary(group);
      break;
    }
  }
}

function refreshGroupSummary(group) {
  const sec = document.querySelector(`[data-group="${group}"]`);
  if (!sec) return;
  const codes = ALBUM.groups[group];
  let have = 0;
  for (const c of codes) have += teamHaveCount(c);
  const total = codes.length * 20;
  const pct = ((have / total) * 100).toFixed(0);
  sec.querySelector('.group-summary').innerHTML =
    `<span class="accent">${have}</span> / ${total} · ${pct}%`;
}

function makeSticker(code, n, kind) {
  // kind: 'team', 'special', 'cc'
  let key, label, name;
  if (kind === 'special') {
    const s = ALBUM.specials.find(x => x.code === code);
    key = code;
    label = code;
    name = s ? s.name : code;
  } else if (kind === 'cc') {
    const s = ALBUM.cocaCola.find(x => x.code === code);
    key = code;
    label = code;
    name = s ? s.name : code;
  } else {
    key = `${code}${n}`;
    label = String(n);
    name = `${code} ${n}`;
  }

  const el = document.createElement('div');
  el.className = 'sticker';
  if (kind === 'special' || kind === 'cc') el.classList.add('special');
  if (isHave(key)) el.classList.add('have');
  el.dataset.key = key;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', name);

  if (kind === 'team') {
    el.innerHTML = `<span class="sticker-prefix">${code}</span><span class="sticker-num">${label}</span>`;
  } else {
    el.innerHTML = `<span class="sticker-num">${label}</span>`;
  }

  el.addEventListener('click', () => onStickerClick(key, name));
  return el;
}

function rebuildTeamBody(card, code) {
  const body = card.querySelector('.team-body');
  body.innerHTML = '';

  const haveList = [];
  const missList = [];
  for (let i = 1; i <= 20; i++) {
    if (isHave(`${code}${i}`)) haveList.push(i);
    else missList.push(i);
  }

  if (missList.length > 0) {
    const lbl = document.createElement('div');
    lbl.className = 'sticker-section-label';
    lbl.textContent = `Нужно собрать (${missList.length})`;
    body.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'sticker-grid';
    for (const n of missList) grid.appendChild(makeSticker(code, n, 'team'));
    body.appendChild(grid);
  }

  if (haveList.length > 0 && !state.hideCollected) {
    const lbl = document.createElement('div');
    lbl.className = 'sticker-section-label';
    lbl.textContent = `Собрано (${haveList.length})`;
    body.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'sticker-grid' + (state.compactCollected ? ' compact' : '');
    for (const n of haveList) grid.appendChild(makeSticker(code, n, 'team'));
    body.appendChild(grid);
  }

  if (missList.length === 0 && (haveList.length === 0 || state.hideCollected)) {
    const empty = document.createElement('div');
    empty.className = 'sticker-section-label';
    empty.style.textAlign = 'center';
    empty.style.padding = '12px';
    empty.textContent = haveList.length === 20 ? '🎉 Команда полностью собрана' : 'Все собранные скрыты';
    body.appendChild(empty);
  }
}

function rebuildSection(kind, cardEl) {
  // kind: 'specials' or 'cc'
  const card = cardEl || document.querySelector(`[data-team-code="__${kind}__"]`);
  if (!card) return;
  const list = kind === 'specials' ? ALBUM.specials : ALBUM.cocaCola;
  const body = card.querySelector('.team-body');
  body.innerHTML = '';

  const have = [];
  const miss = [];
  for (const s of list) {
    if (isHave(s.code)) have.push(s);
    else miss.push(s);
  }

  if (miss.length > 0) {
    const lbl = document.createElement('div');
    lbl.className = 'sticker-section-label';
    lbl.textContent = `Нужно собрать (${miss.length})`;
    body.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'sticker-grid';
    for (const s of miss) grid.appendChild(makeSticker(s.code, null, kind === 'specials' ? 'special' : 'cc'));
    body.appendChild(grid);
  }

  if (have.length > 0 && !state.hideCollected) {
    const lbl = document.createElement('div');
    lbl.className = 'sticker-section-label';
    lbl.textContent = `Собрано (${have.length})`;
    body.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'sticker-grid' + (state.compactCollected ? ' compact' : '');
    for (const s of have) grid.appendChild(makeSticker(s.code, null, kind === 'specials' ? 'special' : 'cc'));
    body.appendChild(grid);
  }

  const total = list.length;
  const pct = (have.length / total) * 100;
  card.querySelector('.team-count').innerHTML = `<span class="accent">${have.length}</span> / ${total}`;
  card.querySelector('.team-pct').textContent = `${Math.round(pct)}%`;
  card.querySelector('.team-pct').classList.toggle('dim', have.length === 0);
  card.querySelector('.progress-fill').style.width = `${pct}%`;
  card.classList.toggle('complete', have.length === total);
}

function makeTeamCard(code) {
  const t = ALBUM.teams[code];
  const have = teamHaveCount(code);
  const pct = (have / 20) * 100;

  const card = document.createElement('div');
  card.className = 'team-card';
  if (have === 20) card.classList.add('complete');
  if (state.collapsedTeams[code]) card.classList.add('collapsed');
  card.dataset.teamCode = code;

  const header = document.createElement('div');
  header.className = 'team-header';
  header.innerHTML = `
    <div class="team-info">
      <div class="team-flag">${t.flag}</div>
      <div class="team-name">
        <h2>${t.name}</h2>
        <span class="team-meta">${code} · ${t.nameEn}</span>
      </div>
    </div>
    <div class="team-progress">
      <div class="team-count-row">
        <span class="team-count"><span class="accent">${have}</span> / 20</span>
        <span class="team-pct ${have === 0 ? 'dim' : ''}">${Math.round(pct)}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <span class="team-chevron">▼</span>
  `;
  header.addEventListener('click', () => {
    card.classList.toggle('collapsed');
    state.collapsedTeams[code] = card.classList.contains('collapsed');
    saveUi();
  });

  const body = document.createElement('div');
  body.className = 'team-body';

  card.appendChild(header);
  card.appendChild(body);
  rebuildTeamBody(card, code);
  return card;
}

function makeSpecialCard(kind) {
  const isSpecials = kind === 'specials';
  const list = isSpecials ? ALBUM.specials : ALBUM.cocaCola;
  const titleRu = isSpecials ? 'Спец-стикеры' : 'Coca-Cola Exclusive';
  const titleEn = isSpecials ? 'Intro + FIFA Museum' : '12 эксклюзивных от Coca-Cola';
  const flag = isSpecials ? '⚽' : '🥤';

  const have = isSpecials ? specialsHaveCount() : ccHaveCount();
  const total = list.length;
  const pct = (have / total) * 100;

  const card = document.createElement('div');
  card.className = 'team-card';
  if (have === total) card.classList.add('complete');
  const teamKey = `__${kind}__`;
  if (state.collapsedTeams[teamKey]) card.classList.add('collapsed');
  card.dataset.teamCode = teamKey;

  const header = document.createElement('div');
  header.className = 'team-header';
  header.innerHTML = `
    <div class="team-info">
      <div class="team-flag">${flag}</div>
      <div class="team-name">
        <h2>${titleRu}</h2>
        <span class="team-meta">${titleEn}</span>
      </div>
    </div>
    <div class="team-progress">
      <div class="team-count-row">
        <span class="team-count"><span class="accent">${have}</span> / ${total}</span>
        <span class="team-pct ${have === 0 ? 'dim' : ''}">${Math.round(pct)}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <span class="team-chevron">▼</span>
  `;
  header.addEventListener('click', () => {
    card.classList.toggle('collapsed');
    state.collapsedTeams[teamKey] = card.classList.contains('collapsed');
    saveUi();
  });

  const body = document.createElement('div');
  body.className = 'team-body';

  card.appendChild(header);
  card.appendChild(body);
  rebuildSection(kind, card);
  return card;
}

function makeDupCard(code) {
  const isFwc = code === 'FWC';
  const teamMeta = isFwc ? null : ALBUM.teams[code];
  const dups = DUPLICATES[code] || {};
  const nums = Object.keys(dups).map(n => parseInt(n, 10)).sort((a, b) => a - b);
  const total = nums.reduce((s, n) => s + dups[n], 0);
  if (total === 0) return null;

  const card = document.createElement('div');
  card.className = 'team-card';
  card.dataset.teamCode = `__dup_${code}__`;
  const teamKey = `__dup_${code}__`;
  if (state.collapsedTeams[teamKey]) card.classList.add('collapsed');

  const name = isFwc ? 'Спец-стикеры (FWC)' : teamMeta.name;
  const flag = isFwc ? '⭐' : teamMeta.flag;
  const meta = isFwc ? 'foil / FIFA Museum / intro' : `${code} · ${teamMeta.nameEn}`;

  const header = document.createElement('div');
  header.className = 'team-header';
  header.innerHTML = `
    <div class="team-info">
      <div class="team-flag">${flag}</div>
      <div class="team-name">
        <h2>${name}</h2>
        <span class="team-meta">${meta}</span>
      </div>
    </div>
    <div class="team-progress">
      <div class="team-count-row">
        <span class="team-count"><span class="accent">${total}</span> шт.</span>
      </div>
    </div>
    <span class="team-chevron">▼</span>
  `;
  header.addEventListener('click', () => {
    card.classList.toggle('collapsed');
    state.collapsedTeams[teamKey] = card.classList.contains('collapsed');
    saveUi();
  });

  const body = document.createElement('div');
  body.className = 'team-body';
  const grid = document.createElement('div');
  grid.className = 'sticker-grid';
  for (const n of nums) {
    const el = document.createElement('div');
    el.className = 'sticker dup';
    if (state.compactCollected) el.classList.add('mini');
    el.dataset.count = 'x' + dups[n];
    const label = isFwc ? `FWC${n}` : n;
    if (isFwc) {
      el.innerHTML = `<span class="sticker-num">FWC${n}</span>`;
      el.classList.add('special');
    } else {
      el.innerHTML = `<span class="sticker-prefix">${code}</span><span class="sticker-num">${n}</span>`;
    }
    grid.appendChild(el);
  }
  body.appendChild(grid);
  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function buildAll() {
  const container = document.getElementById('all-cards');
  container.innerHTML = '';

  // Duplicates section
  if (typeof DUPLICATES !== 'undefined' && dupTotalCount() > 0) {
    const dupSec = document.createElement('div');
    dupSec.className = 'group-section';
    dupSec.dataset.group = 'dups';
    if (state.collapsedGroups['dups']) dupSec.classList.add('collapsed');
    const total = dupTotalCount();
    dupSec.innerHTML = `
      <div class="group-header">
        <div class="group-header-left">
          <span class="group-title">Мои повторки 🔁</span>
        </div>
        <span class="group-summary"><span class="accent">${total}</span> шт. для обмена</span>
        <span class="group-chevron">▼</span>
      </div>
      <div class="group-body">
        <div class="dup-hint">Жёлтые стикеры — это карточки, которых у меня больше одной. Цифра в красном кружке — сколько копий доступно для обмена.</div>
      </div>
    `;
    dupSec.querySelector('.group-header').addEventListener('click', () => {
      dupSec.classList.toggle('collapsed');
      state.collapsedGroups['dups'] = dupSec.classList.contains('collapsed');
      saveUi();
    });
    const dupBody = dupSec.querySelector('.group-body');
    // Render teams in original group order (A-L), then FWC at end
    for (const codes of Object.values(ALBUM.groups)) {
      for (const code of codes) {
        const card = makeDupCard(code);
        if (card) dupBody.appendChild(card);
      }
    }
    const fwcCard = makeDupCard('FWC');
    if (fwcCard) dupBody.appendChild(fwcCard);
    container.appendChild(dupSec);
  }

  // Specials section
  const specSec = document.createElement('div');
  specSec.className = 'group-section';
  specSec.dataset.group = 'specials';
  if (state.collapsedGroups['specials']) specSec.classList.add('collapsed');
  const specHave = specialsHaveCount();
  specSec.innerHTML = `
    <div class="group-header">
      <div class="group-header-left">
        <span class="group-title">Intro & FIFA Museum</span>
      </div>
      <span class="group-summary"><span class="accent">${specHave}</span> / ${ALBUM.specials.length} · ${Math.round(specHave / ALBUM.specials.length * 100)}%</span>
      <span class="group-chevron">▼</span>
    </div>
    <div class="group-body"></div>
  `;
  specSec.querySelector('.group-header').addEventListener('click', () => {
    specSec.classList.toggle('collapsed');
    state.collapsedGroups['specials'] = specSec.classList.contains('collapsed');
    saveUi();
  });
  specSec.querySelector('.group-body').appendChild(makeSpecialCard('specials'));
  container.appendChild(specSec);

  // Coca-Cola section
  const ccSec = document.createElement('div');
  ccSec.className = 'group-section';
  ccSec.dataset.group = 'cc';
  if (state.collapsedGroups['cc']) ccSec.classList.add('collapsed');
  const ccHave = ccHaveCount();
  ccSec.innerHTML = `
    <div class="group-header">
      <div class="group-header-left">
        <span class="group-title">Coca-Cola Exclusive</span>
      </div>
      <span class="group-summary"><span class="accent">${ccHave}</span> / ${ALBUM.cocaCola.length} · ${Math.round(ccHave / ALBUM.cocaCola.length * 100)}%</span>
      <span class="group-chevron">▼</span>
    </div>
    <div class="group-body"></div>
  `;
  ccSec.querySelector('.group-header').addEventListener('click', () => {
    ccSec.classList.toggle('collapsed');
    state.collapsedGroups['cc'] = ccSec.classList.contains('collapsed');
    saveUi();
  });
  ccSec.querySelector('.group-body').appendChild(makeSpecialCard('cc'));
  container.appendChild(ccSec);

  // FIFA Draw groups A-L
  for (const [group, codes] of Object.entries(ALBUM.groups)) {
    const sec = document.createElement('div');
    sec.className = 'group-section';
    sec.dataset.group = group;
    if (state.collapsedGroups[group]) sec.classList.add('collapsed');

    let have = 0;
    for (const c of codes) have += teamHaveCount(c);
    const total = codes.length * 20;
    const pct = (have / total * 100).toFixed(0);
    const flags = codes.map(c => ALBUM.teams[c].flag).join('');

    sec.innerHTML = `
      <div class="group-header">
        <div class="group-header-left">
          <span class="group-title">Группа ${group}</span>
          <span class="group-flags">${flags}</span>
        </div>
        <span class="group-summary"><span class="accent">${have}</span> / ${total} · ${pct}%</span>
        <span class="group-chevron">▼</span>
      </div>
      <div class="group-body"></div>
    `;
    sec.querySelector('.group-header').addEventListener('click', () => {
      sec.classList.toggle('collapsed');
      state.collapsedGroups[group] = sec.classList.contains('collapsed');
      saveUi();
    });

    const body = sec.querySelector('.group-body');
    for (const code of codes) body.appendChild(makeTeamCard(code));
    container.appendChild(sec);
  }
}

function applyFilter() {
  const search = state.search.trim().toLowerCase();
  const filter = state.filter;
  const groupFilter = state.group;

  document.querySelectorAll('.team-card').forEach(card => {
    const code = card.dataset.teamCode;
    if (code.startsWith('__dup_')) {
      // Duplicate cards
      let visible = true;
      if (groupFilter !== 'all' && groupFilter !== 'dups') visible = false;
      if (search) {
        const teamCode = code.replace(/^__dup_(.+)__$/, '$1');
        const meta = teamCode === 'FWC'
          ? 'спец fwc foil повторки'
          : `${teamCode} ${ALBUM.teams[teamCode]?.name || ''} ${ALBUM.teams[teamCode]?.nameEn || ''}`;
        if (!meta.toLowerCase().includes(search)) visible = false;
      }
      card.classList.toggle('hidden', !visible);
      return;
    }
    if (code.startsWith('__')) {
      // specials/cc — only show if matches search/group
      const isSpec = code === '__specials__';
      const isCC = code === '__cc__';
      let visible = true;
      if (groupFilter !== 'all') {
        if (groupFilter === 'specials' && !isSpec) visible = false;
        else if (groupFilter === 'cc' && !isCC) visible = false;
        else if (groupFilter !== 'specials' && groupFilter !== 'cc') visible = false;
      }
      if (search) {
        const hay = isSpec ? 'спец fwc intro museum' : 'coca cola сс';
        if (!hay.includes(search)) visible = false;
      }
      // filter incomplete/complete
      if (filter === 'incomplete' || filter === 'complete') {
        const list = isSpec ? ALBUM.specials : ALBUM.cocaCola;
        let h = 0; for (const s of list) if (isHave(s.code)) h++;
        const full = h === list.length;
        if (filter === 'incomplete' && full) visible = false;
        if (filter === 'complete' && !full) visible = false;
      }
      card.classList.toggle('hidden', !visible);
      return;
    }

    const t = ALBUM.teams[code];
    const have = teamHaveCount(code);
    let visible = true;

    if (filter === 'incomplete' && have === 20) visible = false;
    if (filter === 'complete' && have !== 20) visible = false;

    if (groupFilter !== 'all' && groupFilter !== 'specials' && groupFilter !== 'cc' && groupFilter !== 'dups') {
      const inGroup = ALBUM.groups[groupFilter] && ALBUM.groups[groupFilter].includes(code);
      if (!inGroup) visible = false;
    } else if (groupFilter === 'specials' || groupFilter === 'cc' || groupFilter === 'dups') {
      visible = false;
    }

    if (search) {
      const haystack = `${code} ${t.name} ${t.nameEn}`.toLowerCase();
      if (!haystack.includes(search)) visible = false;
    }
    card.classList.toggle('hidden', !visible);
  });

  // Hide group sections with no visible cards
  document.querySelectorAll('.group-section').forEach(sec => {
    const visibleCards = sec.querySelectorAll('.team-card:not(.hidden)').length;
    sec.classList.toggle('hidden', visibleCards === 0);
  });
}

function parseBulk(text) {
  const tokens = text.split(/[\s,;\n]+/).map(t => t.trim()).filter(Boolean);
  const keys = [];
  for (const tok of tokens) {
    const upper = tok.toUpperCase();
    if (upper === '00') { keys.push('00'); continue; }
    if (/^FWC\d+$/i.test(upper)) { keys.push(upper); continue; }
    if (/^CC\d+$/i.test(upper)) { keys.push(upper); continue; }
    const m = upper.match(/^([A-Z]{3})\s*-?\s*(\d{1,2})$/);
    if (m) {
      const code = m[1];
      const n = parseInt(m[2], 10);
      if (ALBUM.teams[code] && n >= 1 && n <= 20) keys.push(`${code}${n}`);
    }
  }
  return keys;
}

function rebuildAllBodies() {
  rebuildSection('specials');
  rebuildSection('cc');
  for (const code of Object.keys(ALBUM.teams)) {
    const card = document.querySelector(`[data-team-code="${code}"]`);
    if (card) rebuildTeamBody(card, code);
  }
}

function setupEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      applyFilter();
    });
  });

  document.getElementById('group-filter').addEventListener('change', (e) => {
    state.group = e.target.value;
    applyFilter();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    state.search = e.target.value;
    applyFilter();
  });

  document.getElementById('compact-collected').addEventListener('change', (e) => {
    state.compactCollected = e.target.checked;
    saveUi();
    rebuildAllBodies();
  });
  document.getElementById('compact-collected').checked = state.compactCollected;

  document.getElementById('hide-collected').addEventListener('change', (e) => {
    state.hideCollected = e.target.checked;
    saveUi();
    rebuildAllBodies();
  });
  document.getElementById('hide-collected').checked = state.hideCollected;

  document.getElementById('btn-collapse-all').addEventListener('click', () => {
    document.querySelectorAll('.group-section').forEach(sec => {
      sec.classList.add('collapsed');
      state.collapsedGroups[sec.dataset.group] = true;
    });
    saveUi();
  });

  document.getElementById('btn-expand-all').addEventListener('click', () => {
    document.querySelectorAll('.group-section').forEach(sec => {
      sec.classList.remove('collapsed');
      state.collapsedGroups[sec.dataset.group] = false;
    });
    saveUi();
  });

  // Confirmation dialog
  const confirmDlg = document.getElementById('confirm-dialog');
  document.getElementById('confirm-no').addEventListener('click', () => {
    pendingRemoveKey = null;
    confirmDlg.close();
  });
  document.getElementById('confirm-yes').addEventListener('click', () => {
    if (pendingRemoveKey) {
      setHave(pendingRemoveKey, false);
      const team = keyToTeam(pendingRemoveKey);
      refreshTeam(team);
      refreshStats();
      pendingRemoveKey = null;
    }
    confirmDlg.close();
  });
  confirmDlg.addEventListener('close', () => { pendingRemoveKey = null; });

  // Bulk
  document.getElementById('btn-bulk').addEventListener('click', () => {
    document.getElementById('bulk-dialog').showModal();
  });
  document.getElementById('bulk-close').addEventListener('click', () => {
    document.getElementById('bulk-dialog').close();
  });
  document.getElementById('bulk-add').addEventListener('click', () => {
    const text = document.getElementById('bulk-input').value;
    const keys = parseBulk(text);
    keys.forEach(k => { state.collected[k] = true; });
    saveState();
    rebuildAllBodies();
    refreshStats();
    document.getElementById('bulk-input').value = '';
    document.getElementById('bulk-dialog').close();
  });
  document.getElementById('bulk-remove').addEventListener('click', () => {
    const text = document.getElementById('bulk-input').value;
    const keys = parseBulk(text);
    keys.forEach(k => { delete state.collected[k]; });
    saveState();
    rebuildAllBodies();
    refreshStats();
    document.getElementById('bulk-input').value = '';
    document.getElementById('bulk-dialog').close();
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    document.getElementById('export-output').value = JSON.stringify(state.collected, null, 2);
    document.getElementById('export-dialog').showModal();
  });
  document.getElementById('export-close').addEventListener('click', () => {
    document.getElementById('export-dialog').close();
  });
  document.getElementById('export-copy').addEventListener('click', () => {
    const t = document.getElementById('export-output');
    t.select();
    document.execCommand('copy');
    const btn = document.getElementById('export-copy');
    btn.textContent = 'Скопировано ✓';
    setTimeout(() => { btn.textContent = 'Скопировать'; }, 1500);
  });

  // History
  document.getElementById('btn-history').addEventListener('click', () => {
    renderHistory();
    document.getElementById('history-dialog').showModal();
  });
  document.getElementById('history-close').addEventListener('click', () => {
    document.getElementById('history-dialog').close();
  });

  // Download current as file
  document.getElementById('btn-download').addEventListener('click', () => {
    downloadSnapshot('__current__');
  });

  // Import
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-input').value = '';
    document.getElementById('import-dialog').showModal();
  });
  document.getElementById('import-close').addEventListener('click', () => {
    document.getElementById('import-dialog').close();
  });
  document.getElementById('import-apply').addEventListener('click', () => {
    try {
      const data = JSON.parse(document.getElementById('import-input').value);
      if (data && typeof data === 'object') {
        state.collected = data;
        saveState();
        rebuildAllBodies();
        refreshStats();
        document.getElementById('import-dialog').close();
      }
    } catch (e) {
      alert('Невалидный JSON: ' + e.message);
    }
  });
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const snaps = loadSnapshots();
  const dates = Object.keys(snaps).sort().reverse();
  list.innerHTML = '';
  if (dates.length === 0) {
    list.innerHTML = '<div class="history-empty">Снимков пока нет — они начнут сохраняться раз в день.</div>';
    return;
  }
  const today = todayDate();
  for (const date of dates) {
    const snap = snaps[date];
    const item = document.createElement('div');
    item.className = 'history-item' + (date === today ? ' today' : '');
    const s = snap.stats || {};
    const teamsComplete = s.teams
      ? Object.values(s.teams).filter(v => v === 20).length
      : '?';
    item.innerHTML = `
      <div class="history-info">
        <div class="history-date">${date}${date === today ? ' · сегодня' : ''}</div>
        <div class="history-stats">
          ${s.total ?? '?'} / ${s.grand ?? TOTAL_STICKERS} · ${s.pct ?? '?'}% ·
          команд полных ${teamsComplete}/48
        </div>
      </div>
      <div class="history-actions">
        <button data-action="download">⬇</button>
        <button data-action="restore">↩</button>
        ${date !== today ? '<button data-action="delete" class="danger">✕</button>' : ''}
      </div>
    `;
    item.querySelector('[data-action="download"]').addEventListener('click', () => {
      downloadSnapshot(date);
    });
    item.querySelector('[data-action="restore"]').addEventListener('click', () => {
      if (confirm(`Восстановить коллекцию на ${date}? Текущее состояние сначала сохранится в истории.`)) {
        restoreSnapshot(date);
        renderHistory();
      }
    });
    const delBtn = item.querySelector('[data-action="delete"]');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (confirm(`Удалить снимок от ${date}?`)) {
          deleteSnapshot(date);
          renderHistory();
        }
      });
    }
    list.appendChild(item);
  }
}

function applyViewModeUi() {
  if (!state.readOnly) return;
  document.body.classList.add('view-only');
  const banner = document.getElementById('view-banner');
  if (banner) {
    banner.classList.remove('hidden');
    const d = (typeof VIEW_STATE !== 'undefined' && VIEW_STATE.generatedAt)
      ? new Date(VIEW_STATE.generatedAt).toLocaleDateString('ru-RU')
      : null;
    const dateEl = document.getElementById('view-banner-date');
    if (dateEl && d) dateEl.textContent = `· обновлено ${d}`;
  }
  // Hide editing UI (keep display-only controls: compact/hide collected, collapse/expand)
  for (const id of ['btn-bulk', 'btn-history', 'btn-download', 'btn-export', 'btn-import']) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
  // Hide rows that ended up empty
  document.querySelectorAll('.display-options, .actions').forEach(row => {
    if (row.querySelectorAll(':scope > *:not(.hidden)').length === 0) {
      row.classList.add('hidden');
    }
  });
}

function init() {
  loadState();
  applyViewModeUi();
  // Ensure today's baseline snapshot exists even if the user makes no edits today (only in edit mode)
  if (!state.readOnly) maybeMakeDailySnapshot();
  buildAll();
  refreshStats();
  setupEvents();
  switchTab(state.activeTab || 'collection');
}

init();
