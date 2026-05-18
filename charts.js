/**
 * charts.js — Lightweight canvas chart renderer (no dependencies)
 * Follows SOLID: each function renders one chart type.
 * Follows KISS: no animation loops, no config objects — just draw.
 */

const Charts = (() => {

  // ── Helpers ───────────────────────────────────────────────
  function getCSSVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }

  function colors() {
    return {
      text:     getCSSVar('--text'),
      text2:    getCSSVar('--text-2'),
      text3:    getCSSVar('--text-3'),
      border:   getCSSVar('--border'),
      bg2:      getCSSVar('--bg-2'),
      bg3:      getCSSVar('--bg-3'),
      accent:   getCSSVar('--accent'),
      recharge: getCSSVar('--recharge'),
      drain:    getCSSVar('--drain'),
      neutral:  getCSSVar('--neutral'),
      surface:  getCSSVar('--surface'),
    };
  }

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width  || canvas.parentElement.clientWidth;
    const h = rect.height || 200;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function energyColor(val, c) {
    if (val === null || val === undefined) return c.border;
    if (val > 1)  return c.recharge;
    if (val < -1) return c.drain;
    return c.neutral;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Trend Line Chart ──────────────────────────────────────
  function drawTrend(canvas, data) {
    clearCanvas(canvas);
    const { ctx, w, h } = setupCanvas(canvas);
    const c = colors();
    const PAD = { top: 20, right: 20, bottom: 36, left: 40 };
    const innerW = w - PAD.left - PAD.right;
    const innerH = h - PAD.top - PAD.bottom;

    // Grid lines at -5, 0, +5
    const levels = [-5, -2, 0, 2, 5];
    const yScale = v => PAD.top + innerH - ((v + 5) / 10) * innerH;

    ctx.font = `11px 'DM Mono', monospace`;
    ctx.fillStyle = c.text3;
    ctx.textAlign = 'right';

    levels.forEach(level => {
      const y = yScale(level);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + innerW, y);
      ctx.strokeStyle = level === 0 ? c.border : c.bg3;
      ctx.lineWidth = level === 0 ? 1.5 : 1;
      ctx.setLineDash(level === 0 ? [] : [3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(level > 0 ? `+${level}` : level, PAD.left - 6, y + 4);
    });

    // X labels (show every N-th)
    const points = data.filter(d => d.value !== null);
    const allData = data;
    const step = Math.ceil(allData.length / 8);

    ctx.fillStyle = c.text3;
    ctx.textAlign = 'center';
    ctx.font = `10px 'DM Mono', monospace`;

    allData.forEach((d, i) => {
      if (i % step !== 0) return;
      const x = PAD.left + (i / (allData.length - 1 || 1)) * innerW;
      ctx.fillText(d.label, x, h - 8);
    });

    if (points.length < 2) {
      // Not enough data
      ctx.fillStyle = c.text3;
      ctx.textAlign = 'center';
      ctx.font = `13px 'Instrument Sans', sans-serif`;
      ctx.fillText('Log more interactions to see trends', w / 2, h / 2);
      return;
    }

    // Filled area under curve
    ctx.beginPath();
    const firstIdx = allData.findIndex(d => d.value !== null);
    allData.forEach((d, i) => {
      if (d.value === null) return;
      const x = PAD.left + (i / (allData.length - 1)) * innerW;
      const y = yScale(d.value);
      if (i === firstIdx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    // Close to baseline
    const lastIdx = allData.reduce((li, d, i) => d.value !== null ? i : li, firstIdx);
    const x0 = PAD.left + (firstIdx / (allData.length - 1)) * innerW;
    const xN = PAD.left + (lastIdx  / (allData.length - 1)) * innerW;
    ctx.lineTo(xN, yScale(0));
    ctx.lineTo(x0, yScale(0));
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + innerH);
    grad.addColorStop(0, c.recharge + '44');
    grad.addColorStop(0.5, c.neutral + '22');
    grad.addColorStop(1, c.drain + '44');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    let first = true;
    allData.forEach((d, i) => {
      if (d.value === null) { first = true; return; }
      const x = PAD.left + (i / (allData.length - 1)) * innerW;
      const y = yScale(d.value);
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots on data points
    allData.forEach((d, i) => {
      if (d.value === null || d.count === 0) return;
      const x = PAD.left + (i / (allData.length - 1)) * innerW;
      const y = yScale(d.value);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = energyColor(d.value, c);
      ctx.fill();
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // ── Context Bar Chart ─────────────────────────────────────
  function drawContextBars(canvas, data) {
    clearCanvas(canvas);
    if (!data.length) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const c = colors();
    const PAD = { top: 16, right: 16, bottom: 16, left: 8 };
    const innerW = w - PAD.left - PAD.right;

    const barH = 22;
    const gap  = 10;
    const totalH = data.length * (barH + gap);
    canvas.style.height = (totalH + PAD.top + PAD.bottom) + 'px';
    canvas.height = (totalH + PAD.top + PAD.bottom) * (window.devicePixelRatio || 1);
    const ctx2 = canvas.getContext('2d');
    ctx2.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    data.sort((a, b) => b.avg - a.avg);

    data.forEach((d, i) => {
      const y = PAD.top + i * (barH + gap);
      const maxVal = 5;
      const pct = Math.abs(d.avg) / maxVal;
      const barW = pct * (innerW * 0.55);

      // Label
      ctx2.fillStyle = c.text2;
      ctx2.font = `12px 'Instrument Sans', sans-serif`;
      ctx2.textAlign = 'left';
      ctx2.fillText(d.context, PAD.left, y + barH / 2 + 4);

      // Bar background
      const barX = PAD.left + 110;
      roundRect(ctx2, barX, y + 4, innerW - 110 - 50, barH - 8, 3);
      ctx2.fillStyle = c.bg3;
      ctx2.fill();

      // Bar fill
      roundRect(ctx2, barX, y + 4, barW, barH - 8, 3);
      ctx2.fillStyle = energyColor(d.avg, c);
      ctx2.fill();

      // Value
      ctx2.fillStyle = energyColor(d.avg, c);
      ctx2.font = `500 11px 'DM Mono', monospace`;
      ctx2.textAlign = 'right';
      ctx2.fillText(
        (d.avg >= 0 ? '+' : '') + d.avg.toFixed(1),
        w - PAD.right, y + barH / 2 + 4
      );
    });
  }

  // ── Delta Distribution (histogram) ───────────────────────
  function drawDistribution(canvas, entries) {
    clearCanvas(canvas);
    const { ctx, w, h } = setupCanvas(canvas);
    const c = colors();

    const buckets = { '-5': 0, '-2': 0, '0': 0, '2': 0, '5': 0 };
    entries.forEach(e => {
      if (e.delta !== null && e.delta !== undefined) {
        // Round to nearest rating
        const rounded = [-5,-2,0,2,5].reduce((prev,curr) =>
          Math.abs(curr - e.delta) < Math.abs(prev - e.delta) ? curr : prev
        );
        buckets[rounded]++;
      }
    });

    const vals = Object.values(buckets);
    const maxV = Math.max(...vals, 1);
    const labels = ['Drained', 'Low', 'Neutral', 'Good', 'Energised'];
    const PAD = { top: 16, right: 16, bottom: 48, left: 16 };
    const innerW = w - PAD.left - PAD.right;
    const innerH = h - PAD.top - PAD.bottom;
    const barW = innerW / 5 - 8;

    Object.entries(buckets).forEach(([val, count], i) => {
      const x = PAD.left + i * (innerW / 5) + 4;
      const bH = (count / maxV) * innerH;
      const y  = PAD.top + innerH - bH;
      const numVal = Number(val);

      roundRect(ctx, x, y, barW, bH, 3);
      ctx.fillStyle = energyColor(numVal, c);
      ctx.fill();

      // Count label above bar
      if (count > 0) {
        ctx.fillStyle = c.text2;
        ctx.font = `500 11px 'DM Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(count, x + barW / 2, y - 5);
      }

      // X label
      ctx.fillStyle = c.text3;
      ctx.font = `10px 'Instrument Sans', sans-serif`;
      ctx.textAlign = 'center';
      // Word wrap
      const words = labels[i].split(' ');
      words.forEach((word, wi) => {
        ctx.fillText(word, x + barW / 2, h - PAD.bottom + 16 + wi * 13);
      });
    });
  }

  // ── Day of Week Bar Chart ─────────────────────────────────
  function drawDOW(canvas, data) {
    clearCanvas(canvas);
    const { ctx, w, h } = setupCanvas(canvas);
    const c = colors();
    const PAD = { top: 20, right: 16, bottom: 36, left: 38 };
    const innerW = w - PAD.left - PAD.right;
    const innerH = h - PAD.top - PAD.bottom;
    const barW = innerW / 7 - 6;

    const yScale = v => PAD.top + innerH / 2 - (v / 5) * (innerH / 2);

    // Zero line
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top + innerH / 2);
    ctx.lineTo(PAD.left + innerW, PAD.top + innerH / 2);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Y axis labels
    ctx.font = `10px 'DM Mono', monospace`;
    ctx.fillStyle = c.text3;
    ctx.textAlign = 'right';
    [5, 0, -5].forEach(v => {
      ctx.fillText(v > 0 ? `+${v}` : v, PAD.left - 4, yScale(v) + 4);
    });

    data.forEach((d, i) => {
      if (d.avg === null) return;
      const x  = PAD.left + i * (innerW / 7) + 3;
      const y0 = PAD.top + innerH / 2;
      const y1 = yScale(d.avg);
      const bH = Math.abs(y1 - y0);

      roundRect(ctx, x, Math.min(y0, y1), barW, Math.max(bH, 2), 3);
      ctx.fillStyle = energyColor(d.avg, c);
      ctx.fill();

      ctx.fillStyle = c.text3;
      ctx.font = `10px 'Instrument Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, h - 8);
    });
  }

  // ── Time of Day Horizontal Bar ────────────────────────────
  function drawTOD(canvas, data) {
    clearCanvas(canvas);
    const { ctx, w, h } = setupCanvas(canvas);
    const c = colors();
    const PAD = { top: 16, right: 60, bottom: 16, left: 140 };
    const innerW = w - PAD.left - PAD.right;
    const barH = 20;
    const gap  = 14;

    data.forEach((d, i) => {
      if (d.avg === null) return;
      const y = PAD.top + i * (barH + gap);
      const pct = Math.abs(d.avg) / 5;
      const barW = pct * innerW;

      ctx.fillStyle = c.text2;
      ctx.font = `11px 'Instrument Sans', sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(d.label, PAD.left - 8, y + barH / 2 + 4);

      roundRect(ctx, PAD.left, y, innerW, barH, 3);
      ctx.fillStyle = c.bg3;
      ctx.fill();

      roundRect(ctx, PAD.left, y, barW, barH, 3);
      ctx.fillStyle = energyColor(d.avg, c);
      ctx.fill();

      ctx.fillStyle = energyColor(d.avg, c);
      ctx.font = `500 11px 'DM Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(
        (d.avg >= 0 ? '+' : '') + d.avg.toFixed(1) + ` (${d.count})`,
        PAD.left + innerW + 6, y + barH / 2 + 4
      );
    });
  }

  // ── Correlation Scatter ───────────────────────────────────
  function drawCorrelation(canvas, data) {
    clearCanvas(canvas);
    const { ctx, w, h } = setupCanvas(canvas);
    const c = colors();
    const PAD = { top: 20, right: 20, bottom: 36, left: 40 };
    const innerW = w - PAD.left - PAD.right;
    const innerH = h - PAD.top - PAD.bottom;

    const xScale = v => PAD.left + ((v + 5) / 10) * innerW;
    const yScale = v => PAD.top + innerH - ((v + 10) / 20) * innerH;

    // Axes
    [[-5,0],[0,0],[5,0]].forEach(([v]) => {
      const x = xScale(v);
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, PAD.top + innerH);
      ctx.strokeStyle = v === 0 ? c.border : c.bg3;
      ctx.lineWidth = v === 0 ? 1.5 : 1;
      ctx.stroke();
      ctx.fillStyle = c.text3;
      ctx.font = `10px 'DM Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(v > 0 ? `+${v}` : v, x, h - 8);
    });

    ctx.fillStyle = c.text3;
    ctx.font = `10px 'DM Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('Baseline →', PAD.left + innerW / 2, h - 0);

    if (!data.length) {
      ctx.fillStyle = c.text3;
      ctx.font = `12px 'Instrument Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Need baseline data to plot', w / 2, h / 2);
      return;
    }

    // Best fit line
    if (data.length >= 3) {
      const n = data.length;
      const sx  = data.reduce((a,d) => a+d.x, 0);
      const sy  = data.reduce((a,d) => a+d.y, 0);
      const sxy = data.reduce((a,d) => a+d.x*d.y, 0);
      const sx2 = data.reduce((a,d) => a+d.x*d.x, 0);
      const m = (n*sxy - sx*sy) / (n*sx2 - sx*sx || 1);
      const b = (sy - m*sx) / n;
      ctx.beginPath();
      ctx.moveTo(xScale(-5), yScale(m*-5+b));
      ctx.lineTo(xScale(5),  yScale(m*5+b));
      ctx.strokeStyle = c.accent + '66';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Points
    data.forEach(d => {
      ctx.beginPath();
      ctx.arc(xScale(d.x), yScale(d.y), 5, 0, Math.PI * 2);
      ctx.fillStyle = energyColor(d.y, c) + 'CC';
      ctx.fill();
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // ── Heatmap (DOM-based) ───────────────────────────────────
  function drawHeatmap(container, weeks) {
    container.innerHTML = '';
    const c = colors();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Header row: week labels
    const headerRow = document.createElement('div');
    headerRow.className = 'heatmap-row';
    headerRow.innerHTML = `<span class="heatmap-label"></span>`;
    weeks.forEach((_, wi) => {
      const span = document.createElement('span');
      span.className = 'heatmap-label';
      span.style.width = '18px';
      span.style.textAlign = 'center';
      span.textContent = wi % 4 === 0 ? `W${wi+1}` : '';
      headerRow.appendChild(span);
    });
    container.appendChild(headerRow);

    // Day rows
    for (let d = 0; d < 7; d++) {
      const row = document.createElement('div');
      row.className = 'heatmap-row';
      const label = document.createElement('span');
      label.className = 'heatmap-label';
      label.textContent = days[d];
      row.appendChild(label);

      weeks.forEach(week => {
        const dayData = week[6 - d]; // weeks are built newest-first per day
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-tip', `${dayData.date}: ${dayData.count} interactions`);

        if (dayData.count > 0) {
          const avg = dayData.avg;
          if (avg > 1) cell.style.background = c.recharge + 'CC';
          else if (avg < -1) cell.style.background = c.drain + 'CC';
          else cell.style.background = c.neutral + '88';
        }
        row.appendChild(cell);
      });
      container.appendChild(row);
    }
  }

  return {
    drawTrend,
    drawContextBars,
    drawDistribution,
    drawDOW,
    drawTOD,
    drawCorrelation,
    drawHeatmap
  };
})();
