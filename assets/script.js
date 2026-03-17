let opportunities = JSON.parse(localStorage.getItem('osr-opps') || '[]');
let editingId = null;

// Cache before any render can remove it from the DOM via innerHTML = ''
const emptyEl = document.getElementById('empty-state');

const painSlider   = document.getElementById('pain');
const freqSlider   = document.getElementById('frequency');
const buildSlider  = document.getElementById('buildCost');
const timeSlider   = document.getElementById('timeToBuild');
const effortSlider = document.getElementById('userEffort');

const painVal   = document.getElementById('pain-val');
const freqVal   = document.getElementById('freq-val');
const buildVal  = document.getElementById('build-val');
const timeVal   = document.getElementById('time-val');
const effortVal = document.getElementById('effort-val');
const previewNum = document.getElementById('preview-num');

function calcScore(pain, freq, build, time, effort) {
  return (pain * freq) / (build * time * effort);
}

function formatScore(s) {
  if (s >= 10) return s.toFixed(1);
  return s.toFixed(2);
}

function scoreColor(s) {
  if (s > 5)  return 'var(--teal)';
  if (s > 1)  return 'var(--yellow)';
  return 'var(--neg)';
}

function updatePreview() {
  const pain   = +painSlider.value;
  const freq   = +freqSlider.value;
  const build  = +buildSlider.value;
  const time   = +timeSlider.value;
  const effort = +effortSlider.value;

  painVal.textContent   = pain;
  freqVal.textContent   = freq;
  buildVal.textContent  = build;
  timeVal.textContent   = time;
  effortVal.textContent = effort;

  const s = calcScore(pain, freq, build, time, effort);
  previewNum.textContent = formatScore(s);
  previewNum.style.color = scoreColor(s);
}

[painSlider, freqSlider, buildSlider, timeSlider, effortSlider].forEach(sl => {
  sl.addEventListener('input', updatePreview);
});
updatePreview();

document.getElementById('opp-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addOpportunity();
});

function addOpportunity() {
  const nameEl = document.getElementById('opp-name');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  const pain   = +painSlider.value;
  const freq   = +freqSlider.value;
  const build  = +buildSlider.value;
  const time   = +timeSlider.value;
  const effort = +effortSlider.value;
  const score  = calcScore(pain, freq, build, time, effort);

  if (editingId !== null) {
    const opp = opportunities.find(o => o.id === editingId);
    if (opp) { opp.name = name; opp.pain = pain; opp.freq = freq; opp.build = build; opp.time = time; opp.effort = effort; opp.score = score; }
    opportunities.sort((a, b) => b.score - a.score);
    exitEditMode();
  } else {
    opportunities.push({ id: Date.now(), name, pain, freq, build, time, effort, score });
    opportunities.sort((a, b) => b.score - a.score);
    nameEl.value = '';
    nameEl.focus();
  }
  save();
  render();
}

function editOpportunity(id) {
  const opp = opportunities.find(o => o.id === id);
  if (!opp) return;
  document.getElementById('opp-name').value = opp.name;
  painSlider.value   = opp.pain;
  freqSlider.value   = opp.freq;
  buildSlider.value  = opp.build;
  timeSlider.value   = opp.time;
  effortSlider.value = opp.effort;
  updatePreview();
  editingId = id;
  document.getElementById('btn-add').textContent = '✓ Update Opportunity';
  document.getElementById('btn-cancel').style.display = 'block';
  document.getElementById('opp-name').focus();
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  render(); // re-render to highlight the edited card
}

function cancelEdit() {
  exitEditMode();
  render();
}

function exitEditMode() {
  editingId = null;
  document.getElementById('btn-add').textContent = '+ Add Opportunity';
  document.getElementById('btn-cancel').style.display = 'none';
  document.getElementById('opp-name').value = '';
  [painSlider, freqSlider, buildSlider, timeSlider, effortSlider].forEach(s => s.value = 5);
  updatePreview();
}

function deleteOpportunity(id) {
  opportunities = opportunities.filter(o => o.id !== id);
  save();
  render();
}

function exportCSV() {
  if (!opportunities.length) return;
  const date = new Date().toISOString().slice(0, 10);
  const header = 'Rank,Opportunity,Pain,Frequency,Build Cost,Time to Build,User Effort,Score';
  const rows = opportunities.map((opp, i) =>
    [i + 1, `"${opp.name.replace(/"/g, '""')}"`, opp.pain, opp.freq, opp.build, opp.time, opp.effort, formatScore(opp.score)].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `osr-${date}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importCSV(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be re-imported
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;
    // skip header row (index 0)
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      // parse CSV respecting quoted fields
      const cols = [];
      let cur = '', inQ = false;
      for (let c = 0; c < lines[i].length; c++) {
        const ch = lines[i][c];
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
        cur += ch;
      }
      cols.push(cur);
      // Rank,Opportunity,Pain,Frequency,Build Cost,Time to Build,User Effort,Score
      if (cols.length < 7) continue;
      const name   = cols[1].trim();
      const pain   = Math.min(10, Math.max(1, parseInt(cols[2])  || 5));
      const freq   = Math.min(10, Math.max(1, parseInt(cols[3])  || 5));
      const build  = Math.min(10, Math.max(1, parseInt(cols[4])  || 5));
      const time   = Math.min(10, Math.max(1, parseInt(cols[5])  || 5));
      const effort = Math.min(10, Math.max(1, parseInt(cols[6])  || 5));
      if (!name) continue;
      const score = calcScore(pain, freq, build, time, effort);
      opportunities.push({ id: Date.now() + i, name, pain, freq, build, time, effort, score });
      imported++;
    }
    if (imported) {
      opportunities.sort((a, b) => b.score - a.score);
      save();
      render();
    }
  };
  reader.readAsText(file);
}

function exportMarkdown() {
  if (!opportunities.length) return;
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Opportunity Solution Rate',
    `_Exported: ${date}_`,
    '',
    '> **Formula:** Score = (Pain Value × Frequency) / (Build Cost × Time to Build × User Effort)',
    '',
    '| # | Opportunity | Pain | Freq | Build | Time | Effort | Score |',
    '|---|-------------|:----:|:----:|:-----:|:----:|:------:|------:|',
  ];

  opportunities.forEach((opp, i) => {
    lines.push(
      `| ${i + 1} | ${opp.name} | ${opp.pain} | ${opp.freq} | ${opp.build} | ${opp.time} | ${opp.effort} | **${formatScore(opp.score)}** |`
    );
  });

  const topScore  = formatScore(opportunities[0].score);
  const avgScore  = formatScore(opportunities.reduce((s, o) => s + o.score, 0) / opportunities.length);
  lines.push('', '---', '', `- **Top score:** ${topScore}`, `- **Avg score:** ${avgScore}`, `- **Total:** ${opportunities.length} opportunities`);

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `osr-${date}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearAll() {
  if (!opportunities.length) return;
  opportunities = [];
  save();
  render();
}

function save() {
  localStorage.setItem('osr-opps', JSON.stringify(opportunities));
}

function render() {
  const list  = document.getElementById('opp-list');
  const strip = document.getElementById('stat-strip');
  const count = document.getElementById('results-count');

  count.textContent = `${opportunities.length} item${opportunities.length !== 1 ? 's' : ''}`;

  const exportBtn    = document.getElementById('btn-export');
  const exportCsvBtn = document.getElementById('btn-export-csv');

  if (!opportunities.length) {
    list.innerHTML = '';
    list.appendChild(emptyEl);
    emptyEl.style.display = 'flex';
    strip.style.display = 'none';
    exportBtn.style.display = 'none';
    exportCsvBtn.style.display = 'none';
    return;
  }

  exportBtn.style.display = 'inline-block';
  exportCsvBtn.style.display = 'inline-block';

  emptyEl.style.display = 'none';
  strip.style.display = 'grid';

  // Stats
  const topScore = opportunities[0].score;
  const avgScore = opportunities.reduce((s, o) => s + o.score, 0) / opportunities.length;
  document.getElementById('stat-top').textContent   = formatScore(topScore);
  document.getElementById('stat-avg').textContent   = formatScore(avgScore);
  document.getElementById('stat-count').textContent = opportunities.length;

  // Cards — bar normalized as % of max possible score (100)
  list.innerHTML = '';

  opportunities.forEach((opp, i) => {
    const color = scoreColor(opp.score);
    const barW  = Math.min(100, (opp.score / 100) * 100).toFixed(2);

    const card = document.createElement('div');
    card.className = 'opp-card';
    card.style.setProperty('--score-color', color);
    card.style.animationDelay = `${i * 40}ms`;
    if (opp.id === editingId) card.classList.add('is-editing');

    card.innerHTML = `
      <div class="opp-main">
        <div class="opp-name">${escHtml(opp.name)}</div>
        <div class="opp-meta">
          <div class="meta-item">
            <div class="meta-dot pain"></div>
            Pain&nbsp;<strong style="color:var(--text)">${opp.pain}</strong>
          </div>
          <div class="meta-item">
            <div class="meta-dot freq"></div>
            Freq&nbsp;<strong style="color:var(--text)">${opp.freq}</strong>
          </div>
          <div class="meta-sep">/</div>
          <div class="meta-item">
            <div class="meta-dot denom"></div>
            Build&nbsp;<strong style="color:var(--text)">${opp.build}</strong>
          </div>
          <div class="meta-item">
            <div class="meta-dot denom"></div>
            Time&nbsp;<strong style="color:var(--text)">${opp.time}</strong>
          </div>
          <div class="meta-item">
            <div class="meta-dot denom"></div>
            Effort&nbsp;<strong style="color:var(--text)">${opp.effort}</strong>
          </div>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar-track">
            <div class="score-bar-fill" data-w="${barW}"></div>
          </div>
        </div>
      </div>
      <div class="score-badge">
        <span class="score-num">${formatScore(opp.score)}</span>
        <span class="rank-badge">#${i + 1}</span>
        <span class="score-label">score</span>
      </div>
      <div class="opp-actions">
        <button class="btn-edit" onclick="editOpportunity(${opp.id})" title="Edit">✎</button>
        <button class="btn-del" onclick="deleteOpportunity(${opp.id})" title="Remove">×</button>
      </div>
    `;

    list.appendChild(card);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.querySelectorAll('.score-bar-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

render();
