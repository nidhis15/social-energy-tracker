/**
 * data.js — Storage layer (KISS/SOLID: single responsibility)
 * All data lives in localStorage under key 'set_entries' and 'set_tags'.
 *
 * Entry schema:
 * {
 *   id:        string (timestamp-based),
 *   ts:        number (Date.now()),
 *   person:    string,
 *   context:   string,
 *   baseline:  number|null  (-5,-2,0,2,5 or null if skipped),
 *   after:     number       (-5,-2,0,2,5),
 *   delta:     number       (after - baseline, null if baseline skipped),
 *   note:      string
 * }
 */

const DB = (() => {
  const ENTRIES_KEY = 'set_entries';
  const TAGS_KEY    = 'set_tags';

  const DEFAULT_TAGS = ['Work', 'Family', 'Friends', 'Romantic', 'Acquaintance'];

  // ── Read ──────────────────────────────────────────────────
  function getEntries() {
    try {
      return JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    } catch { return []; }
  }

  function getTags() {
    try {
      const saved = JSON.parse(localStorage.getItem(TAGS_KEY));
      if (!saved) return [...DEFAULT_TAGS];
      // Merge defaults with saved custom tags, preserve order
      const custom = saved.filter(t => !DEFAULT_TAGS.includes(t));
      return [...DEFAULT_TAGS, ...custom];
    } catch { return [...DEFAULT_TAGS]; }
  }

  // ── Write ─────────────────────────────────────────────────
  function saveEntry(raw) {
    const entries = getEntries();
    const delta = raw.baseline !== null ? raw.after - raw.baseline : null;
    const entry = {
      id:       `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      ts:       Date.now(),
      person:   raw.person.trim(),
      context:  raw.context,
      baseline: raw.baseline,
      after:    raw.after,
      delta:    delta,
      note:     raw.note.trim()
    };
    entries.push(entry);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    return entry;
  }

  function addTag(tag) {
    const tags = getTags();
    const clean = tag.trim();
    if (!clean || tags.includes(clean)) return tags;
    tags.push(clean);
    // Only persist non-default tags
    const custom = tags.filter(t => !DEFAULT_TAGS.includes(t));
    localStorage.setItem(TAGS_KEY, JSON.stringify([...DEFAULT_TAGS, ...custom]));
    return tags;
  }

  // ── Export ────────────────────────────────────────────────
  function exportJson() {
    const data = { version: 1, exported: new Date().toISOString(), entries: getEntries() };
    _download(JSON.stringify(data, null, 2), 'social-energy-export.json', 'application/json');
  }

  function exportCsv() {
    const entries = getEntries();
    if (!entries.length) { alert('No entries to export.'); return; }
    const headers = ['id','timestamp','person','context','baseline','after','delta','note'];
    const rows = entries.map(e => [
      e.id,
      new Date(e.ts).toISOString(),
      _csvEscape(e.person),
      _csvEscape(e.context),
      e.baseline ?? '',
      e.after,
      e.delta ?? '',
      _csvEscape(e.note)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    _download(csv, 'social-energy-export.csv', 'text/csv');
  }

  function importJson(jsonString) {
    const parsed = JSON.parse(jsonString);
    const incoming = parsed.entries || parsed; // support raw array too
    if (!Array.isArray(incoming)) throw new Error('Invalid format');
    const existing = getEntries();
    const existingIds = new Set(existing.map(e => e.id));
    const merged = [...existing, ...incoming.filter(e => !existingIds.has(e.id))];
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(merged));
    return merged.length - existing.length; // returns count of added
  }

  // ── Analytics helpers ─────────────────────────────────────
  function filterByPeriod(entries, period) {
    const now = Date.now();
    if (period === 'week')  return entries.filter(e => now - e.ts < 7  * 86400000);
    if (period === 'month') return entries.filter(e => now - e.ts < 30 * 86400000);
    return entries;
  }

  function avgDelta(entries) {
    const withDelta = entries.filter(e => e.delta !== null && e.delta !== undefined);
    if (!withDelta.length) return null;
    return withDelta.reduce((s, e) => s + e.delta, 0) / withDelta.length;
  }

  function peopleStats(entries) {
    // Returns array of { person, count, avg, tags }
    const map = {};
    entries.forEach(e => {
      if (!map[e.person]) map[e.person] = { person: e.person, deltas: [], tags: new Set() };
      if (e.delta !== null && e.delta !== undefined) map[e.person].deltas.push(e.delta);
      map[e.person].tags.add(e.context);
    });
    return Object.values(map).map(p => ({
      person: p.person,
      count:  entries.filter(e => e.person === p.person).length,
      avg:    p.deltas.length ? p.deltas.reduce((a,b) => a+b,0) / p.deltas.length : null,
      tags:   [...p.tags]
    })).sort((a,b) => (b.avg ?? 0) - (a.avg ?? 0));
  }

  function contextStats(entries) {
    const map = {};
    entries.forEach(e => {
      if (!map[e.context]) map[e.context] = [];
      if (e.delta !== null && e.delta !== undefined) map[e.context].push(e.delta);
    });
    return Object.entries(map).map(([ctx, deltas]) => ({
      context: ctx,
      count:   deltas.length,
      avg:     deltas.length ? deltas.reduce((a,b)=>a+b,0)/deltas.length : 0
    }));
  }

  function trendData(entries, period) {
    // Group by day, return { labels, values }
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const now = new Date(); now.setHours(23,59,59,999);
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
      const dayEnd   = new Date(d); dayEnd.setHours(23,59,59,999);
      const dayEntries = entries.filter(e => e.ts >= dayStart && e.ts <= dayEnd);
      const avg = avgDelta(dayEntries);
      result.push({
        label: d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
        value: avg,
        count: dayEntries.length
      });
    }
    return result;
  }

  function dowStats(entries) {
    // Average delta per day of week (0=Sun..6=Sat)
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const buckets = days.map(d => ({ label: d, deltas: [] }));
    entries.forEach(e => {
      const dow = new Date(e.ts).getDay();
      if (e.delta !== null && e.delta !== undefined) buckets[dow].deltas.push(e.delta);
    });
    return buckets.map(b => ({
      label: b.label,
      avg: b.deltas.length ? b.deltas.reduce((a,c)=>a+c,0)/b.deltas.length : null,
      count: b.deltas.length
    }));
  }

  function todStats(entries) {
    // Bucket by hour into Morning/Afternoon/Evening/Night
    const buckets = {
      'Morning (6–12)':   [],
      'Afternoon (12–17)':[],
      'Evening (17–21)':  [],
      'Night (21–6)':     []
    };
    entries.forEach(e => {
      const h = new Date(e.ts).getHours();
      const key = h >= 6 && h < 12 ? 'Morning (6–12)'
                : h >= 12 && h < 17 ? 'Afternoon (12–17)'
                : h >= 17 && h < 21 ? 'Evening (17–21)'
                : 'Night (21–6)';
      if (e.delta !== null && e.delta !== undefined) buckets[key].push(e.delta);
    });
    return Object.entries(buckets).map(([label, deltas]) => ({
      label,
      avg: deltas.length ? deltas.reduce((a,b)=>a+b,0)/deltas.length : null,
      count: deltas.length
    }));
  }

  function heatmapData() {
    // Last 12 weeks: { weekLabel, days: [{ date, count, avg }] }
    const entries = getEntries();
    const now = new Date(); now.setHours(23,59,59,999);
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
      const week = [];
      for (let d = 6; d >= 0; d--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (w * 7 + d));
        const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
        const dayEnd   = new Date(date); dayEnd.setHours(23,59,59,999);
        const dayE = entries.filter(e => e.ts >= dayStart && e.ts <= dayEnd);
        week.push({
          date:  date.toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
          count: dayE.length,
          avg:   avgDelta(dayE)
        });
      }
      weeks.push(week);
    }
    return weeks;
  }

  function correlationData(entries) {
    // Scatter: baseline vs delta
    return entries
      .filter(e => e.baseline !== null && e.delta !== null)
      .map(e => ({ x: e.baseline, y: e.delta, person: e.person }));
  }

  function insightText(entries, period) {
    if (entries.length < 3) return null;
    const ps = peopleStats(entries);
    const top = ps[0];
    const bot = ps[ps.length - 1];
    const draining = entries.filter(e => (e.delta ?? 0) < -1);
    const recent = entries.slice(-3);
    const recentAvg = avgDelta(recent);

    if (recentAvg !== null && recentAvg < -2)
      return `Your last 3 interactions have been draining. Consider some recharge time.`;
    if (draining.length >= 3 && period !== 'all')
      return `${draining.length} draining interactions logged this ${period}. ${bot?.person ? `${bot.person} has the most impact.` : ''}`;
    if (top?.avg > 2)
      return `${top.person} consistently recharges you (avg +${top.avg.toFixed(1)}). More of that.`;
    return `${entries.length} interactions logged. Keep tracking to reveal patterns.`;
  }

  // ── Private ───────────────────────────────────────────────
  function _download(content, filename, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function _csvEscape(str) {
    if (!str) return '';
    const s = String(str).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    getEntries, getTags, saveEntry, addTag,
    exportJson, exportCsv, importJson,
    filterByPeriod, avgDelta, peopleStats,
    contextStats, trendData, dowStats,
    todStats, heatmapData, correlationData, insightText
  };
})();
