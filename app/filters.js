// Search, filter and sort state for the deal list. One job only: given the
// current controls, decide which deals show and in what order.

import { CATEGORIES, deals, discountPct, dollarsSaved } from './deals.js';

export const SORTS = {
  verdict: 'Best verdict first',
  pct: 'Biggest % off',
  saved: 'Biggest $ saving',
  price: 'Lowest price first',
};

export function freshState() {
  return { q: '', category: 'all', store: 'all', minPct: 0, verdict: 'all', sort: 'verdict' };
}

export function storeList() {
  return [...new Set(deals.map((d) => d.store))].sort();
}

export function applyFilters(state) {
  const q = state.q.trim().toLowerCase();
  let list = deals.filter((d) => {
    if (state.category !== 'all' && d.category !== state.category) return false;
    if (state.store !== 'all' && d.store !== state.store) return false;
    if (state.verdict !== 'all' && d.verdict !== state.verdict) return false;
    if (state.minPct > 0 && discountPct(d) < state.minPct) return false;
    if (q) {
      const hay = `${d.product} ${d.store} ${d.category} ${d.evidence}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const verdictRank = { 'new-low': 0, strong: 1, routine: 2, inflated: 3 };
  if (state.sort === 'pct') list = [...list].sort((a, b) => discountPct(b) - discountPct(a));
  else if (state.sort === 'saved') list = [...list].sort((a, b) => dollarsSaved(b) - dollarsSaved(a));
  else if (state.sort === 'price') list = [...list].sort((a, b) => a.sale - b.sale);
  else list = [...list].sort((a, b) => verdictRank[a.verdict] - verdictRank[b.verdict] || discountPct(b) - discountPct(a));
  return list;
}

export function categoryOptions() {
  return CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
}
