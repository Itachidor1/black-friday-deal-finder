// DealHound boot: wires the controls, renders the list or one deal, and keeps
// the filter state in the URL hash so a view can be linked and screenshotted.
//
//   #/                       the full list, filters on
//   #/category/<id>         the list pre-filtered to one category
//   #/deal/<id>             one deal with its full evidence
//   #/?q=oled               the list pre-searched (used by screenshots)
//
// window.__shotReady is false while a page renders and true once it is on
// screen, so a screenshot script knows when to capture.

import { CHECKED_ON, CATEGORIES, deals, discountPct, dollarsSaved, money } from './deals.js';
import { bestHtml, detailHtml, listHtml } from './render.js';
import { SORTS, applyFilters, categoryOptions, freshState, storeList } from './filters.js';

const app = document.getElementById('app');
const state = freshState();

function readHash() {
  const raw = location.hash.slice(1);
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  return { parts, params };
}

function statsHtml() {
  const lows = deals.filter((d) => d.verdict === 'new-low').length;
  const saved = deals.reduce((sum, d) => sum + Math.max(0, dollarsSaved(d)), 0);
  const maxPct = Math.max(...deals.map(discountPct));
  return `<section class="stats" aria-label="Sale totals">` +
    `<div class="stat"><b>${deals.length}</b><span>verified deals</span></div>` +
    `<div class="stat"><b class="newlow">${lows}</b><span>at a new low price</span></div>` +
    `<div class="stat"><b>${money(saved)}</b><span>total savings on offer</span></div>` +
    `<div class="stat"><b>${maxPct}%</b><span>biggest real discount</span></div>` +
    `</section>`;
}

function controlsHtml() {
  const cats = categoryOptions()
    .map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${state.category === c.id}">${c.label}</button>`)
    .join('');
  const stores = storeList()
    .map((s) => `<option value="${s}"${state.store === s ? ' selected' : ''}>${s}</option>`)
    .join('');
  const sorts = Object.entries(SORTS)
    .map(([v, l]) => `<option value="${v}"${state.sort === v ? ' selected' : ''}>${l}</option>`)
    .join('');
  return `<div class="controls">` +
    `<div class="searchrow">` +
    `<input type="search" id="q" placeholder="Search deals — try “OLED”, “Dyson”, “Switch”…" value="${state.q.replace(/"/g, '&quot;')}" aria-label="Search deals">` +
    `<select id="store" aria-label="Filter by store"><option value="all">All stores</option>${stores}</select>` +
    `<select id="minpct" aria-label="Minimum discount"><option value="0">Any discount</option>` +
    `<option value="25"${state.minPct === 25 ? ' selected' : ''}>25% off or more</option>` +
    `<option value="40"${state.minPct === 40 ? ' selected' : ''}>40% off or more</option>` +
    `<option value="50"${state.minPct === 50 ? ' selected' : ''}>50% off or more</option></select>` +
    `<select id="verdict" aria-label="Filter by verdict"><option value="all">Any verdict</option>` +
    `<option value="new-low"${state.verdict === 'new-low' ? ' selected' : ''}>New lows only</option>` +
    `<option value="strong"${state.verdict === 'strong' ? ' selected' : ''}>Strong prices</option>` +
    `<option value="routine"${state.verdict === 'routine' ? ' selected' : ''}>Routine sales</option>` +
    `<option value="inflated"${state.verdict === 'inflated' ? ' selected' : ''}>Inflated sales</option></select>` +
    `<select id="sort" aria-label="Sort deals">${sorts}</select>` +
    `</div>` +
    `<div class="chips"><button class="chip" data-cat="all" aria-pressed="${state.category === 'all'}">All categories</button>${cats}</div>` +
    `<p class="countline" id="countline"></p>` +
    `</div>`;
}

function renderList() {
  const list = applyFilters(state);
  const showBest = state.q === '' && state.category === 'all' && state.store === 'all' &&
    state.minPct === 0 && state.verdict === 'all';
  app.innerHTML = statsHtml() + controlsHtml() + (showBest ? bestHtml() : '') +
    `<div class="deals" id="dealgrid">${listHtml(list)}</div>`;
  const line = document.getElementById('countline');
  line.textContent = `Showing ${list.length} of ${deals.length} deals · prices checked ${CHECKED_ON} · ` +
    `click a deal for its evidence and store link.`;
  wireControls();
}

function wireControls() {
  const q = document.getElementById('q');
  const grid = document.getElementById('dealgrid');
  const line = document.getElementById('countline');
  const refreshGrid = () => {
    const list = applyFilters(state);
    grid.innerHTML = listHtml(list);
    line.textContent = `Showing ${list.length} of ${deals.length} deals · prices checked ${CHECKED_ON} · ` +
      `click a deal for its evidence and store link.`;
  };
  q.addEventListener('input', () => { state.q = q.value; refreshGrid(); });
  document.getElementById('store').addEventListener('change', (e) => { state.store = e.target.value; refreshGrid(); });
  document.getElementById('minpct').addEventListener('change', (e) => { state.minPct = Number(e.target.value); refreshGrid(); });
  document.getElementById('verdict').addEventListener('change', (e) => { state.verdict = e.target.value; refreshGrid(); });
  document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; refreshGrid(); });
  app.querySelectorAll('[data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.category = chip.dataset.cat;
      app.querySelectorAll('[data-cat]').forEach((c) => {
        c.setAttribute('aria-pressed', String(c === chip));
      });
      refreshGrid();
    });
  });
}

function render() {
  window.__shotReady = false;
  const { parts, params } = readHash();
  if (parts[0] === 'deal' && parts[1]) {
    const found = deals.find((d) => d.id === decodeURIComponent(parts[1]));
    document.title = `${found ? found.product : 'Deal not found'} | DealHound`;
    app.innerHTML = found
      ? detailHtml(found)
      : `<p class="empty">That deal is not on the board. <a href="#/">Back to all deals</a>.</p>`;
  } else {
    // A plain #/ link resets the category and search; a category link or a
    // ?q= search sets them instead, so each view starts from a clean state.
    state.category = 'all';
    state.q = '';
    if (parts[0] === 'category' && parts[1]) {
      const cat = CATEGORIES.find((c) => c.id === parts[1]);
      if (cat) state.category = cat.id;
    }
    if (params.get('q')) state.q = params.get('q');
    document.title = 'DealHound — Real Black Friday deals, checked today';
    renderList();
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
