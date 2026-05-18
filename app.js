/**
 * app.js — UI controller (SOLID: orchestrates, doesn't own data or rendering)
 * Depends on: DB (data.js), Charts (charts.js)
 */

const App = (() => {

  // ── State ─────────────────────────────────────────────────
  let currentView    = 'log';
  let currentPeriod  = 'week';
  let selectedTags   = new Set();
  let selectedBaseline = null;
  let selectedAfter    = null;
  let baselineSkipped  = false;

  // ── DOM refs ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ── Init ──────────────────────────────────────────────────
  function init() {
    setDate();
    updateOrb();
    renderTags();
    bindNav();
    bindLog();
    bindDashboard();
    bindPeople();
    bindExport();
    bindTheme();
    applyTheme();
  }

  // ── Date display ──────────────────────────────────────────
  function setDate() {
    const now = new Date();
    $('currentDay').textContent   = now.getDate();
    $('currentMonth').textContent = now.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
    $('currentYear').textContent  = now.getFullYear();
  }

  // ── Energy Orb ────────────────────────────────────────────
  function updateOrb() {
    const orb   = $('energyOrb');
    const label = $('energyOrbLabel');
    if (!orb) return;

    const all     = DB.getEntries();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
    const todayEntries = all.filter(e => e.ts >= todayStart && e.ts <= todayEnd);
    const avg = DB.avgDelta(todayEntries);

    // Pick colour based on average delta
    let color1, color2, labelText;
    if (avg === null) {
      // No entries today — neutral grey
      color1 = 'var(--text-3)';
      color2 = 'var(--border-2)';
      labelText = 'no data today';
    } else if (avg > 1) {
      color1 = 'var(--recharge)';
      color2 = '#6DCFA0';
      labelText = `+${avg.toFixed(1)} today`;
    } else if (avg < -1) {
      color1 = 'var(--drain)';
      color2 = '#E07070';
      labelText = `${avg.toFixed(1)} today`;
    } else {
      color1 = 'var(--neutral)';
      color2 = '#8A8AAA';
      labelText = `${avg >= 0 ? '+' : ''}${avg.toFixed(1)} today`;
    }

    orb.style.background = `
      radial-gradient(circle at 38% 32%,
        ${color2} 0%,
        ${color1} 55%,
        color-mix(in srgb, ${color1} 70%, #000) 100%
      )`;
    orb.style.boxShadow = `
      0 6px 24px color-mix(in srgb, ${color1} 30%, transparent),
      inset 0 -4px 12px color-mix(in srgb, ${color1} 40%, #000)`;

    if (label) label.textContent = labelText;
  }

  // ── Navigation ────────────────────────────────────────────
  function bindNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const view = link.dataset.view;
        switchView(view);
      });
    });
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', l.dataset.view === view)
    );
    document.querySelectorAll('.view').forEach(v =>
      v.classList.toggle('active', v.id === `view-${view}`)
    );
    if (view === 'dashboard') renderDashboard();
    if (view === 'people')    renderPeople();
    if (view === 'patterns')  renderPatterns();
  }

  // ── Log Form ──────────────────────────────────────────────
  function bindLog() {
    // Baseline pills
    document.querySelector('[data-group="baseline"]').addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      selectedBaseline = Number(pill.dataset.value);
      baselineSkipped  = false;
      highlightPills('baseline', pill);
    });

    // After pills
    document.querySelector('[data-group="after"]').addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      selectedAfter = Number(pill.dataset.value);
      highlightPills('after', pill);
    });

    // Skip baseline
    $('skipBaseline').addEventListener('click', () => {
      baselineSkipped  = true;
      selectedBaseline = null;
      document.querySelectorAll('[data-group="baseline"] .pill')
        .forEach(p => p.classList.remove('selected'));
      $('baselineBlock').style.opacity = '0.4';
      $('skipBaseline').textContent = 'Baseline skipped';
    });

    // Autocomplete
    $('personInput').addEventListener('input', handleAutocomplete);
    $('personInput').addEventListener('blur', () => {
      setTimeout(() => $('autocompleteList').classList.remove('open'), 150);
    });

    // Save
    $('saveBtn').addEventListener('click', handleSave);
  }

  function highlightPills(group, activePill) {
    document.querySelectorAll(`[data-group="${group}"] .pill`)
      .forEach(p => p.classList.toggle('selected', p === activePill));
  }

  function handleAutocomplete() {
    const val = $('personInput').value.toLowerCase().trim();
    const list = $('autocompleteList');
    if (!val) { list.classList.remove('open'); return; }

    const entries = DB.getEntries();
    const people  = [...new Set(entries.map(e => e.person))]
      .filter(p => p.toLowerCase().includes(val))
      .slice(0, 6);

    if (!people.length) { list.classList.remove('open'); return; }

    list.innerHTML = people.map(p =>
      `<li data-name="${p}">${p}</li>`
    ).join('');
    list.classList.add('open');

    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('mousedown', () => {
        $('personInput').value = li.dataset.name;
        list.classList.remove('open');
      });
    });
  }

  function handleSave() {
    const person  = $('personInput').value.trim();
    const context = [...selectedTags][0] || null;
    const note    = $('noteInput').value;

    // Validation
    if (!person) {
      showFeedback("Please enter a person's name.", true); return;
    }
    if (!context) {
      showFeedback('Please select a context tag.', true); return;
    }
    if (selectedAfter === null) {
      showFeedback('Please rate your energy after the interaction.', true); return;
    }
    if (!baselineSkipped && selectedBaseline === null) {
      showFeedback('Please rate your baseline energy (or skip it).', true); return;
    }

    DB.saveEntry({ person, context, baseline: selectedBaseline, after: selectedAfter, note });
    resetForm();
    showFeedback('Saved.');
    updateOrb();
  }

  function resetForm() {
    $('personInput').value = '';
    $('noteInput').value   = '';
    selectedBaseline = null;
    selectedAfter    = null;
    baselineSkipped  = false;
    selectedTags.clear();

    document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
    document.querySelectorAll('.tag').forEach(t  => t.classList.remove('selected'));
    $('baselineBlock').style.opacity = '1';
    $('skipBaseline').textContent = 'Skip baseline';
  }

  function showFeedback(msg, isError = false) {
    const el = $('saveFeedback');
    el.textContent = msg;
    el.style.color = isError ? 'var(--drain)' : 'var(--recharge)';
    setTimeout(() => { el.textContent = ''; }, 3000);
  }

  // ── Tags ──────────────────────────────────────────────────
  function renderTags() {
    const tags = DB.getTags();
    const container = $('contextTags');
    container.innerHTML = '';
    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag' + (selectedTags.has(tag) ? ' selected' : '');
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        // Single select
        selectedTags.clear();
        selectedTags.add(tag);
        container.querySelectorAll('.tag').forEach(t =>
          t.classList.toggle('selected', t.textContent === tag)
        );
      });
      container.appendChild(btn);
    });
  }

  function bindLog2_addTag() {
    $('addTagBtn').addEventListener('click', () => {
      const val = $('newTagInput').value.trim();
      if (!val) return;
      DB.addTag(val);
      $('newTagInput').value = '';
      renderTags();
    });
    $('newTagInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('addTagBtn').click();
    });
  }

  // ── Dashboard ─────────────────────────────────────────────
  function bindDashboard() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPeriod = btn.dataset.period;
        document.querySelectorAll('.period-btn').forEach(b =>
          b.classList.toggle('active', b === btn)
        );
        renderDashboard();
      });
    });
  }

  function renderDashboard() {
    const all     = DB.getEntries();
    const entries = DB.filterByPeriod(all, currentPeriod);

    // Stat cards
    const avg = DB.avgDelta(entries);
    const ps  = DB.peopleStats(entries);

    $('statTotal').textContent = entries.length || '—';
    $('statAvg').textContent   = avg !== null ? (avg >= 0 ? '+' : '') + avg.toFixed(1) : '—';
    $('statBest').textContent  = ps[0]?.person || '—';
    $('statDrain').textContent = ps[ps.length - 1]?.person || '—';

    // Insight
    const insight = DB.insightText(entries, currentPeriod);
    const insightEl = $('insightCard');
    if (insight) {
      insightEl.textContent = insight;
      insightEl.classList.add('visible');
    } else {
      insightEl.classList.remove('visible');
    }

    // Charts — defer to next frame for layout
    requestAnimationFrame(() => {
      Charts.drawTrend($('trendChart'), DB.trendData(entries, currentPeriod));
      Charts.drawContextBars($('contextChart'), DB.contextStats(entries));
      Charts.drawDistribution($('distChart'), entries);
    });
  }

  // ── People ────────────────────────────────────────────────
  function bindPeople() {
    $('peopleSearch').addEventListener('input', () => renderPeople());
  }

  function renderPeople() {
    const query   = $('peopleSearch').value.toLowerCase();
    const entries = DB.getEntries();
    const ps      = DB.peopleStats(entries)
      .filter(p => p.person.toLowerCase().includes(query));

    const grid = $('peopleGrid');
    grid.innerHTML = '';

    if (!ps.length) {
      grid.innerHTML = `<div class="empty-state"><strong>No interactions yet</strong>Log your first interaction to see people appear here.</div>`;
      return;
    }

    ps.forEach(p => {
      const card = document.createElement('div');
      card.className = 'person-card';

      const avg     = p.avg;
      const avgSign = avg === null ? '' : avg >= 0 ? '+' : '';
      const avgStr  = avg === null ? 'No delta data' : `${avgSign}${avg.toFixed(1)} avg delta`;
      const cls     = avg === null ? 'neutral' : avg > 0.5 ? 'positive' : avg < -0.5 ? 'negative' : 'neutral';
      const barPct  = avg === null ? 0 : Math.min(Math.abs(avg) / 5 * 100, 100);

      card.innerHTML = `
        <div class="person-name">${p.person}</div>
        <div class="person-meta">
          <span>${p.count} interaction${p.count !== 1 ? 's' : ''}</span>
        </div>
        <div class="person-bar-wrap">
          <div class="person-bar ${cls}" style="width:${barPct}%"></div>
        </div>
        <div class="person-avg ${cls}">${avgStr}</div>
        <div class="person-tags">
          ${p.tags.map(t => `<span class="person-tag">${t}</span>`).join('')}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ── Patterns ──────────────────────────────────────────────
  function renderPatterns() {
    const entries = DB.getEntries();
    requestAnimationFrame(() => {
      Charts.drawDOW($('dowChart'),   DB.dowStats(entries));
      Charts.drawTOD($('todChart'),   DB.todStats(entries));
      Charts.drawCorrelation($('corrChart'), DB.correlationData(entries));
      Charts.drawHeatmap($('heatmapGrid'),   DB.heatmapData());
    });
  }

  // ── Export / Import ───────────────────────────────────────
  function bindExport() {
    $('exportJson').addEventListener('click', DB.exportJson);
    $('exportCsv').addEventListener('click',  DB.exportCsv);
    $('importBtn').addEventListener('click',  () => $('importFile').click());
    $('importFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const added = DB.importJson(ev.target.result);
          alert(`Import complete. ${added} new entries added.`);
          if (currentView !== 'log') switchView(currentView);
        } catch {
          alert('Import failed: invalid JSON format.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // ── Theme ─────────────────────────────────────────────────
  function bindTheme() {
    $('themeToggle').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      localStorage.setItem('set_theme', dark ? 'light' : 'dark');
      $('themeIcon').textContent = dark ? '◑' : '●';
      // Redraw charts with new colors
      if (currentView === 'dashboard') renderDashboard();
      if (currentView === 'patterns')  renderPatterns();
    });
  }

  function applyTheme() {
    const saved = localStorage.getItem('set_theme');
    if (saved) {
      document.documentElement.dataset.theme = saved;
      $('themeIcon').textContent  = saved === 'dark' ? '●' : '◑';
    }
  }

  // ── Resize: redraw charts ─────────────────────────────────
  window.addEventListener('resize', () => {
    if (currentView === 'dashboard') renderDashboard();
    if (currentView === 'patterns')  renderPatterns();
  });

  // ── Run ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    init();
    // Bind the add-tag handler after DOM ready
    bindLog2_addTag();
  });

})();