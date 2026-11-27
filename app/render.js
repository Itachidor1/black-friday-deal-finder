// Renders deal cards, the list page and the single-deal page as plain HTML strings.
// No framework, no templating library: every string below is built here.

import { CATEGORIES, CHECKED_ON, VERDICTS, deals, discountPct, dollarsSaved, money } from './deals.js';

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function verdictPill(d) {
  const v = VERDICTS[d.verdict];
  return `<span class="verdict ${d.verdict}">${esc(v.label)}</span>`;
}

function priceLine(d) {
  const pct = discountPct(d);
  if (pct <= 0) {
    return `<div class="prices"><span class="sale">${money(d.sale)}</span>` +
      `<span class="was">usual ${money(d.usual)}</span>` +
      `<span class="off none">no discount</span></div>`;
  }
  return `<div class="prices"><span class="sale">${money(d.sale)}</span>` +
    `<span class="was">${money(d.usual)}</span>` +
    `<span class="off">${pct}% off</span></div>`;
}

export function cardHtml(d) {
  return `<article class="card" data-id="${esc(d.id)}">` +
    `<div class="eyebrow"><span>${esc(d.store)}</span><span>${esc(categoryLabel(d.category))}</span></div>` +
    `<h3><a href="#/deal/${esc(d.id)}">${esc(d.product)}</a></h3>` +
    priceLine(d) +
    verdictPill(d) +
    `<p class="evidence">${esc(d.evidence)}</p>` +
    `<p class="meta">Price checked ${esc(CHECKED_ON)} · Source: ${esc(d.source)}</p>` +
    (d.note ? `<p class="note">${esc(d.note)}</p>` : '') +
    `<p class="cta"><a href="${esc(d.url)}" target="_blank" rel="noopener">View at ${esc(d.store)} &rarr;</a></p>` +
    `</article>`;
}

export function categoryLabel(id) {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? found.label : id;
}

export function listHtml(list) {
  if (list.length === 0) {
    return `<div class="empty"><p><b>No deals match that search.</b></p>` +
      `<p>Try a different word, or clear the filters to see all ${deals.length} deals.</p></div>`;
  }
  return list.map(cardHtml).join('');
}

// The five best verdicts first: new lows, then strongest cuts, by money saved.
export function bestFive() {
  const rank = { 'new-low': 0, strong: 1, routine: 2, inflated: 3 };
  return [...deals]
    .filter((d) => d.verdict !== 'inflated')
    .sort((a, b) => rank[a.verdict] - rank[b.verdict] || dollarsSaved(b) - dollarsSaved(a))
    .slice(0, 5);
}

export function bestHtml() {
  const top = bestFive();
  const items = top
    .map((d) => `<li><a href="#/deal/${esc(d.id)}">${esc(d.product)}</a> — ` +
      `<b>${money(d.sale)}</b> at ${esc(d.store)} ` +
      `(${discountPct(d)}% off, was ${money(d.usual)})</li>`)
    .join('');
  return `<section class="best"><h2>Best of Black Friday — our top 5</h2>` +
    `<p>New lows first, then the biggest real savings. Every price checked ${esc(CHECKED_ON)}.</p>` +
    `<ol>${items}</ol></section>`;
}

export function detailHtml(d) {
  const pct = discountPct(d);
  const siblings = d.compare
    ? deals.filter((x) => x.compare === d.compare && x.id !== d.id)
    : [];
  const compare = siblings.length
    ? `<div class="compare"><b>Same product, another store:</b> ` +
      siblings.map((s) => `${esc(s.store)} — <b>${money(s.sale)}</b> ` +
        `(<a href="#/deal/${esc(s.id)}">see it</a>)`).join('; ') +
      `. Same price, so pick the store you trust most.</div>`
    : '';
  const rows = [
    ['Store', esc(d.store)],
    ['Sale price', money(d.sale)],
    ['Usual price', money(d.usual)],
    ['You save', pct > 0 ? `${money(dollarsSaved(d))} (${pct}%)` : 'Nothing — it costs more than usual'],
    ['Verdict', `${VERDICTS[d.verdict].label} — ${VERDICTS[d.verdict].blurb}`],
    ['Price checked', `${CHECKED_ON} (Black Friday)`],
    ['Price source', esc(d.source)],
  ];
  const facts = rows.map(([k, v]) => `<li><b>${k}</b> ${v}</li>`).join('');
  return `<section class="detail"><p class="back"><a href="#/">&larr; All deals</a></p>` +
    `<article class="card"><div class="eyebrow"><span>${esc(d.store)}</span>` +
    `<span>${esc(d.category)}</span></div>` +
    `<h2>${esc(d.product)}</h2>` +
    priceLine(d) + verdictPill(d) +
    `<p class="evidence">${esc(d.evidence)}</p>` +
    `<ul class="facts">${facts}</ul>` +
    (d.note ? `<p class="note">${esc(d.note)}</p>` : '') +
    `<p class="cta"><a href="${esc(d.url)}" target="_blank" rel="noopener">View at ${esc(d.store)} &rarr;</a></p>` +
    `</article>${compare}</section>`;
}
