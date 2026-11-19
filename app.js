/**
 * Kliping Pocket – My Money Diary
 * Vanilla JS Personal Finance Tracker with LocalStorage & PWA Support
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kliping_pocket_data_v1';

  const CATEGORIES = {
    expense: [
      { id: 'Makanan', label: '🍽️ Makanan', icon: '🍽️' },
      { id: 'Minuman', label: '🧋 Minuman', icon: '🧋' },
      { id: 'Belanja', label: '🛍️ Belanja', icon: '🛍️' },
      { id: 'Alat Tulis & Kertas', label: '📎 Alat Tulis & Kertas', icon: '📎' },
      { id: 'Transportasi', label: '🚌 Transportasi', icon: '🚌' },
      { id: 'Kebutuhan', label: '🧺 Kebutuhan', icon: '🧺' },
      { id: 'Self-care', label: '🛁 Self-care', icon: '🛁' },
      { id: 'Skincare', label: '🧴 Skincare', icon: '🧴' },
      { id: 'Hiburan', label: '🎬 Hiburan', icon: '🎬' },
      { id: 'Pendidikan', label: '📚 Pendidikan', icon: '📚' },
      { id: 'Tagihan', label: '🧾 Tagihan', icon: '🧾' },
      { id: 'Lainnya', label: '🌸 Lainnya', icon: '🌸' }
    ],
    income: [
      { id: 'Gaji', label: '💼 Gaji', icon: '💼' },
      { id: 'Hasil jualan', label: '🧁 Hasil jualan', icon: '🧁' },
      { id: 'Hadiah', label: '🎁 Hadiah', icon: '🎁' },
      { id: 'Uang dari orang tua', label: '💌 Uang dari orang tua', icon: '💌' },
      { id: 'Bonus', label: '✨ Bonus', icon: '✨' },
      { id: 'Refund', label: '💸 Refund', icon: '💸' },
      { id: 'Lainnya', label: '🌷 Lainnya', icon: '🌷' }
    ]
  };

  const QUICK_SUGGESTIONS = {
    expense: ['Beli matcha', 'Makan siang', 'Beli stiker & kertas', 'Beli skincare', 'Ongkos transportasi', 'Jajan', 'Kebutuhan rumah'],
    income: ['Gaji', 'Hasil jualan', 'Uang dari orang tua', 'Hadiah', 'Bonus', 'Refund']
  };

  let state = {
    initialBalance: 0,
    transactions: [],
    settings: {
      currency: 'IDR',
      greetingName: 'klipingkecil'
    }
  };

  let currentModalType = 'expense';
  let currentStatsPeriod = 'daily';
  let deferredPrompt = null;

  // ==================== SECURITY & FORMATTING HELPERS ====================
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRupiah(amount) {
    const num = Number(amount) || 0;
    const isNegative = num < 0;
    const formatted = Math.abs(num).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return `${isNegative ? '-Rp ' : 'Rp '}${formatted}`;
  }

  function getTodayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  }

  function getCurrentMonthISO() {
    return getTodayISO().slice(0, 7);
  }

  function formatDateIndonesian(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatMonthIndonesian(ym) {
    if (!ym) return '';
    const [year, month] = ym.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  function formatShortDate(isoDate) {
    if (!isoDate) return 'Pilih';
    const [y, m, d] = isoDate.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d} ${months[m - 1]}`;
  }

  function syncDateButtonLabels() {
    const elDiaryStart = document.getElementById('diary-date-start');
    const elDiaryEnd = document.getElementById('diary-date-end');
    const elStatsDaily = document.getElementById('stats-input-daily');
    const elStatsWeekly = document.getElementById('stats-input-weekly');
    const elStatsMonthly = document.getElementById('stats-input-monthly');
    const elTxDate = document.getElementById('tx-date');

    const lblDiaryStart = document.getElementById('label-diary-start');
    const lblDiaryEnd = document.getElementById('label-diary-end');
    const lblStatsDaily = document.getElementById('label-stats-daily');
    const lblStatsWeekly = document.getElementById('label-stats-weekly');
    const lblStatsMonthly = document.getElementById('label-stats-monthly');
    const lblTxDate = document.getElementById('label-tx-date');

    if (lblDiaryStart && elDiaryStart) lblDiaryStart.textContent = elDiaryStart.value ? formatShortDate(elDiaryStart.value) : 'Pilih';
    if (lblDiaryEnd && elDiaryEnd) lblDiaryEnd.textContent = elDiaryEnd.value ? formatShortDate(elDiaryEnd.value) : 'Pilih';
    if (lblStatsDaily && elStatsDaily) lblStatsDaily.textContent = elStatsDaily.value ? formatShortDate(elStatsDaily.value) : 'Pilih';
    if (lblStatsWeekly && elStatsWeekly) lblStatsWeekly.textContent = elStatsWeekly.value ? formatShortDate(elStatsWeekly.value) : 'Pilih';
    if (lblStatsMonthly && elStatsMonthly) lblStatsMonthly.textContent = elStatsMonthly.value ? formatMonthIndonesian(elStatsMonthly.value) : 'Pilih';
    if (lblTxDate && elTxDate) lblTxDate.textContent = elTxDate.value ? formatDateIndonesian(elTxDate.value) : 'Pilih Tanggal';
  }

  function getCategoryIcon(type, categoryName) {
    const list = CATEGORIES[type] || [];
    const found = list.find((c) => c.id === categoryName);
    if (found) return found.icon;
    return type === 'income' ? '🌷' : '📎';
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2800);
  }

  // ==================== STORAGE MANAGEMENT ====================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.initialBalance = Number(parsed.initialBalance) || 0;
          state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
          state.settings = parsed.settings || { currency: 'IDR', greetingName: 'klipingkecil' };
        }
      }
    } catch (err) {
      console.error('Gagal memuat LocalStorage:', err);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      showToast('⚠️ Penyimpanan penuh atau diblokir browser!');
    }
  }

  // ==================== CONTINUOUS BALANCE ENGINE ====================
  function calculateBalances() {
    let totalIncome = 0;
    let totalExpense = 0;

    state.transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') totalIncome += amt;
      else if (tx.type === 'expense') totalExpense += amt;
    });

    const currentBalance = state.initialBalance + totalIncome - totalExpense;
    return {
      initialBalance: state.initialBalance,
      totalIncome,
      totalExpense,
      currentBalance
    };
  }

  // ==================== UI RENDERING: DASHBOARD ====================
  function renderDashboard() {
    const today = getTodayISO();
    const currentMonth = getCurrentMonthISO();

    document.getElementById('today-date-text').textContent = formatDateIndonesian(today);
    document.getElementById('home-chart-month-label').textContent = formatMonthIndonesian(currentMonth);

    const { currentBalance } = calculateBalances();
    document.getElementById('home-total-balance').textContent = formatRupiah(currentBalance);

    let monthIncome = 0;
    let monthExpense = 0;
    let todayIncome = 0;
    let todayExpense = 0;
    let todayCount = 0;

    state.transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.date && tx.date.startsWith(currentMonth)) {
        if (tx.type === 'income') monthIncome += amt;
        else monthExpense += amt;
      }
      if (tx.date === today) {
        todayCount++;
        if (tx.type === 'income') todayIncome += amt;
        else todayExpense += amt;
      }
    });

    const monthNet = monthIncome - monthExpense;

    document.getElementById('home-month-income').textContent = formatRupiah(monthIncome);
    document.getElementById('home-month-expense').textContent = formatRupiah(monthExpense);
    document.getElementById('home-month-net').textContent = formatRupiah(monthNet);

    document.getElementById('today-tx-count').textContent = `${todayCount} kliping`;
    document.getElementById('home-today-income').textContent = formatRupiah(todayIncome);
    document.getElementById('home-today-expense').textContent = formatRupiah(todayExpense);

    const chartBox = document.getElementById('home-chart-container');
    const maxVal = Math.max(monthIncome, monthExpense, 1);
    const inPct = Math.round((monthIncome / maxVal) * 100);
    const outPct = Math.round((monthExpense / maxVal) * 100);

    chartBox.innerHTML = `
      <div class="bar-row">
        <div class="bar-label-row">
          <span>🍀 Pemasukan</span>
          <span style="color: var(--pastel-green)">${escapeHTML(formatRupiah(monthIncome))}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill in" style="width: ${inPct}%"></div>
        </div>
      </div>
      <div class="bar-row">
        <div class="bar-label-row">
          <span>🌷 Pengeluaran</span>
          <span style="color: var(--dusty-rose)">${escapeHTML(formatRupiah(monthExpense))}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill out" style="width: ${outPct}%"></div>
        </div>
      </div>
    `;

    const sorted = [...state.transactions].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const recentList = document.getElementById('home-recent-list');
    const recentFive = sorted.slice(0, 5);

    if (recentFive.length === 0) {
      recentList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📎🗒️</div>
          <h4>Halaman kliping masih kosong</h4>
          <p>Klik tombol <strong>+ Money In</strong> atau <strong>− Money Out</strong> untuk mulai menempel catatan!</p>
        </div>
      `;
    } else {
      recentList.innerHTML = recentFive.map((tx) => createTransactionItemHTML(tx, false)).join('');
    }
  }

  function createTransactionItemHTML(tx, showActions = true) {
    const icon = getCategoryIcon(tx.type, tx.category);
    const sign = tx.type === 'income' ? '+' : '−';
    const noteHTML = tx.note ? `<div class="tx-note-preview">"${escapeHTML(tx.note)}"</div>` : '';
    const sampleBadge = tx.isSample ? ' • <span style="color:#D96B8A">[Contoh]</span>' : '';

    const actionsHTML = showActions
      ? `
        <div class="tx-actions">
          <button class="btn-icon-sm" onclick="window.KlipingApp.editTx('${escapeHTML(tx.id)}')" title="Edit">✏️</button>
          <button class="btn-icon-sm" onclick="window.KlipingApp.deleteTx('${escapeHTML(tx.id)}')" title="Hapus">🗑️</button>
        </div>
      `
      : '';

    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-emoji">${icon}</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHTML(tx.name)}</div>
            <div class="tx-meta">${escapeHTML(tx.category)} • ${escapeHTML(tx.date)}${sampleBadge}</div>
            ${noteHTML}
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${tx.type}">${sign}${escapeHTML(formatRupiah(tx.amount))}</span>
          ${actionsHTML}
        </div>
      </div>
    `;
  }

  // ==================== UI RENDERING: MONEY DIARY ====================
  function populateDiaryCategoryFilter() {
    const select = document.getElementById('diary-filter-category');
    const currentVal = select.value;
    const allCats = new Set();
    CATEGORIES.expense.forEach((c) => allCats.add(c.id));
    CATEGORIES.income.forEach((c) => allCats.add(c.id));
    state.transactions.forEach((tx) => allCats.add(tx.category));

    select.innerHTML = '<option value="ALL">Semua Kategori</option>';
    allCats.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    if ([...allCats].includes(currentVal)) {
      select.value = currentVal;
    }
  }

  function renderDiary() {
    populateDiaryCategoryFilter();

    const searchQuery = document.getElementById('diary-search').value.trim().toLowerCase();
    const catFilter = document.getElementById('diary-filter-category').value;
    const typeFilter = document.getElementById('diary-filter-type').value;
    const startDate = document.getElementById('diary-date-start').value;
    const endDate = document.getElementById('diary-date-end').value;

    const filtered = state.transactions.filter((tx) => {
      if (searchQuery && !tx.name.toLowerCase().includes(searchQuery) && !(tx.note || '').toLowerCase().includes(searchQuery)) {
        return false;
      }
      if (catFilter !== 'ALL' && tx.category !== catFilter) return false;
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });

    document.getElementById('diary-total-count').textContent = `${filtered.length} kliping`;

    const container = document.getElementById('diary-grouped-list');
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖📎</div>
          <h4>Belum ada kliping ditemukan</h4>
          <p>Coba ubah filter pencarian atau tambahkan transaksi baru di halaman Home.</p>
        </div>
      `;
      return;
    }

    filtered.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const groups = {};
    filtered.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = { date: tx.date, income: 0, expense: 0, items: [] };
      }
      groups[tx.date].items.push(tx);
      if (tx.type === 'income') groups[tx.date].income += Number(tx.amount) || 0;
      else groups[tx.date].expense += Number(tx.amount) || 0;
    });

    container.innerHTML = Object.values(groups)
      .map((group) => {
        const itemsHTML = group.items.map((tx) => createTransactionItemHTML(tx, true)).join('');
        return `
          <div class="diary-day-group">
            <div class="diary-day-header">
              <span class="diary-day-date">📅 ${escapeHTML(formatDateIndonesian(group.date))}</span>
              <div class="diary-day-totals">
                <span class="tag-in">+${escapeHTML(formatRupiah(group.income))}</span>
                <span class="tag-out">−${escapeHTML(formatRupiah(group.expense))}</span>
              </div>
            </div>
            <div class="tx-list">
              ${itemsHTML}
            </div>
          </div>
        `;
      })
      .join('');
  }

  // ==================== UI RENDERING: STATISTICS ====================
  function initStatsControls() {
    const today = getTodayISO();
    const currentMonth = getCurrentMonthISO();
    const currentYear = new Date().getFullYear();

    document.getElementById('stats-input-daily').value = today;
    document.getElementById('stats-input-weekly').value = today;
    document.getElementById('stats-input-monthly').value = currentMonth;

    const yearSelect = document.getElementById('stats-input-yearly');
    const years = new Set([currentYear, currentYear - 1, currentYear + 1]);
    state.transactions.forEach((tx) => {
      if (tx.date) years.add(Number(tx.date.slice(0, 4)));
    });
    const sortedYears = [...years].sort((a, b) => b - a);
    yearSelect.innerHTML = sortedYears
      .map((y) => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`)
      .join('');

    syncDateButtonLabels();
  }

  function renderStats() {
    const area = document.getElementById('stats-content-area');

    if (currentStatsPeriod === 'daily') {
      const selectedDate = document.getElementById('stats-input-daily').value || getTodayISO();
      const dayTxs = state.transactions.filter((tx) => tx.date === selectedDate);
      let inc = 0;
      let exp = 0;
      dayTxs.forEach((tx) => {
        if (tx.type === 'income') inc += Number(tx.amount) || 0;
        else exp += Number(tx.amount) || 0;
      });
      const net = inc - exp;

      const listHTML = dayTxs.length
        ? dayTxs.map((tx) => createTransactionItemHTML(tx, false)).join('')
        : '<p style="text-align:center;color:var(--brown-muted);padding:12px;">Tidak ada kliping pada tanggal ini 🌸</p>';

      area.innerHTML = `
        <div class="stats-summary-grid">
          <div class="stat-box">
            <small>🍀 Pemasukan Hari Ini</small>
            <strong style="color:var(--pastel-green)">${escapeHTML(formatRupiah(inc))}</strong>
          </div>
          <div class="stat-box">
            <small>🌷 Pengeluaran Hari Ini</small>
            <strong style="color:var(--dusty-rose)">${escapeHTML(formatRupiah(exp))}</strong>
          </div>
        </div>
        <div class="highlight-banner">
          <span>Saldo Bersih Hari Ini</span>
          <strong>${escapeHTML(formatRupiah(net))}</strong>
        </div>
        <div class="card">
          <h3 style="margin-bottom:10px;">🗒️ Kliping (${escapeHTML(formatDateIndonesian(selectedDate))})</h3>
          <div class="tx-list">${listHTML}</div>
        </div>
      `;
    } else if (currentStatsPeriod === 'weekly') {
      const refDateStr = document.getElementById('stats-input-weekly').value || getTodayISO();
      const [y, m, d] = refDateStr.split('-').map(Number);
      const refDate = new Date(y, m - 1, d);
      const dayOfWeek = refDate.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const monday = new Date(refDate);
      monday.setDate(refDate.getDate() + diffToMonday);

      const weekDates = [];
      const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      for (let i = 0; i < 7; i++) {
        const dt = new Date(monday);
        dt.setDate(monday.getDate() + i);
        const offset = dt.getTimezoneOffset() * 60000;
        const iso = new Date(dt.getTime() - offset).toISOString().split('T')[0];
        weekDates.push({ iso, label: dayNames[i], expense: 0, income: 0 });
      }

      const startIso = weekDates[0].iso;
      const endIso = weekDates[6].iso;
      document.getElementById('stats-week-range-label').textContent = `Periode: ${startIso} s/d ${endIso}`;

      let weekInc = 0;
      let weekExp = 0;

      state.transactions.forEach((tx) => {
        if (tx.date >= startIso && tx.date <= endIso) {
          const amt = Number(tx.amount) || 0;
          const slot = weekDates.find((w) => w.iso === tx.date);
          if (tx.type === 'income') {
            weekInc += amt;
            if (slot) slot.income += amt;
          } else {
            weekExp += amt;
            if (slot) slot.expense += amt;
          }
        }
      });

      const maxDailyExp = Math.max(...weekDates.map((w) => w.expense), 1);
      const barsHTML = weekDates
        .map((w) => {
          const heightPct = Math.round((w.expense / maxDailyExp) * 100);
          const shortVal = w.expense > 0 ? `${Math.round(w.expense / 1000)}k` : '0';
          return `
            <div class="week-col">
              <span class="week-val-label">${shortVal}</span>
              <div class="week-bar-fill" style="height: ${Math.max(heightPct, 4)}%"></div>
              <span class="week-day-label">${w.label}</span>
            </div>
          `;
        })
        .join('');

      area.innerHTML = `
        <div class="stats-summary-grid">
          <div class="stat-box">
            <small>🍀 Pemasukan Minggu Ini</small>
            <strong style="color:var(--pastel-green)">${escapeHTML(formatRupiah(weekInc))}</strong>
          </div>
          <div class="stat-box">
            <small>🌷 Pengeluaran Minggu Ini</small>
            <strong style="color:var(--dusty-rose)">${escapeHTML(formatRupiah(weekExp))}</strong>
          </div>
        </div>
        <div class="card">
          <h3>📊 Perbandingan Pengeluaran Harian</h3>
          <div class="weekly-bars">${barsHTML}</div>
        </div>
      `;
    } else if (currentStatsPeriod === 'monthly') {
      const selectedYM = document.getElementById('stats-input-monthly').value || getCurrentMonthISO();
      const monthStart = `${selectedYM}-01`;

      let priorInc = 0;
      let priorExp = 0;
      let monthInc = 0;
      let monthExp = 0;
      const categoryTotals = {};

      state.transactions.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.date < monthStart) {
          if (tx.type === 'income') priorInc += amt;
          else priorExp += amt;
        } else if (tx.date.startsWith(selectedYM)) {
          if (tx.type === 'income') {
            monthInc += amt;
          } else {
            monthExp += amt;
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
          }
        }
      });

      const openingBalance = state.initialBalance + priorInc - priorExp;
      const closingBalance = openingBalance + monthInc - monthExp;
      const monthDiff = monthInc - monthExp;

      const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const topCategoryText = sortedCats.length
        ? `${getCategoryIcon('expense', sortedCats[0][0])} ${sortedCats[0][0]} (${formatRupiah(sortedCats[0][1])})`
        : 'Belum ada pengeluaran';

      const maxBar = Math.max(monthInc, monthExp, 1);
      const catBreakdownHTML = sortedCats.length
        ? sortedCats
            .map(([cat, val]) => {
              const pct = Math.round((val / Math.max(monthExp, 1)) * 100);
              return `
                <div class="bar-row" style="margin-bottom:10px;">
                  <div class="bar-label-row">
                    <span>${getCategoryIcon('expense', cat)} ${escapeHTML(cat)} (${pct}%)</span>
                    <span style="color:var(--dusty-rose)">${escapeHTML(formatRupiah(val))}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill out" style="width:${pct}%"></div>
                  </div>
                </div>
              `;
            })
            .join('')
        : '<p style="color:var(--brown-muted);font-size:0.85rem;">Belum ada data pengeluaran bulan ini.</p>';

      area.innerHTML = `
        <div class="stats-summary-grid">
          <div class="stat-box">
            <small>🏦 Saldo Awal Bulan</small>
            <strong>${escapeHTML(formatRupiah(openingBalance))}</strong>
          </div>
          <div class="stat-box">
            <small>👛 Saldo Akhir Bulan</small>
            <strong>${escapeHTML(formatRupiah(closingBalance))}</strong>
          </div>
          <div class="stat-box">
            <small>🍀 Total Pemasukan</small>
            <strong style="color:var(--pastel-green)">${escapeHTML(formatRupiah(monthInc))}</strong>
          </div>
          <div class="stat-box">
            <small>🌷 Total Pengeluaran</small>
            <strong style="color:var(--dusty-rose)">${escapeHTML(formatRupiah(monthExp))}</strong>
          </div>
        </div>

        <div class="highlight-banner">
          <div>
            <small style="display:block;font-weight:700;">Selisih Bulan Ini</small>
            <strong>${escapeHTML(formatRupiah(monthDiff))}</strong>
          </div>
          <div style="text-align:right;">
            <small style="display:block;font-weight:700;">Pengeluaran Terbesar</small>
            <strong>${escapeHTML(topCategoryText)}</strong>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:10px;">📊 Grafik Pemasukan vs Pengeluaran</h3>
          <div class="visual-chart-box">
            <div class="bar-row">
              <div class="bar-label-row"><span>Pemasukan</span><span>${escapeHTML(formatRupiah(monthInc))}</span></div>
              <div class="bar-track"><div class="bar-fill in" style="width:${Math.round((monthInc / maxBar) * 100)}%"></div></div>
            </div>
            <div class="bar-row">
              <div class="bar-label-row"><span>Pengeluaran</span><span>${escapeHTML(formatRupiah(monthExp))}</span></div>
              <div class="bar-track"><div class="bar-fill out" style="width:${Math.round((monthExp / maxBar) * 100)}%"></div></div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:12px;">🛍️ Pengeluaran per Kategori</h3>
          ${catBreakdownHTML}
        </div>
      `;
    } else if (currentStatsPeriod === 'yearly') {
      const selectedYear = document.getElementById('stats-input-yearly').value || String(new Date().getFullYear());
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthlyData = Array.from({ length: 12 }, (_, idx) => ({
        monthIndex: idx,
        label: monthNames[idx],
        income: 0,
        expense: 0
      }));

      let yearInc = 0;
      let yearExp = 0;

      state.transactions.forEach((tx) => {
        if (tx.date && tx.date.startsWith(`${selectedYear}-`)) {
          const mIdx = Number(tx.date.slice(5, 7)) - 1;
          const amt = Number(tx.amount) || 0;
          if (tx.type === 'income') {
            yearInc += amt;
            if (monthlyData[mIdx]) monthlyData[mIdx].income += amt;
          } else {
            yearExp += amt;
            if (monthlyData[mIdx]) monthlyData[mIdx].expense += amt;
          }
        }
      });

      const maxMonthVal = Math.max(...monthlyData.map((m) => Math.max(m.income, m.expense)), 1);

      const rowsHTML = monthlyData
        .map((m) => {
          const inPct = Math.round((m.income / maxMonthVal) * 100);
          const outPct = Math.round((m.expense / maxMonthVal) * 100);
          return `
            <div style="padding:10px 0; border-bottom:1px dashed var(--border-soft);">
              <div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:700;margin-bottom:4px;">
                <span>${m.label} ${selectedYear}</span>
                <span>
                  <span style="color:var(--pastel-green)">+${escapeHTML(formatRupiah(m.income))}</span> | 
                  <span style="color:var(--dusty-rose)">−${escapeHTML(formatRupiah(m.expense))}</span>
                </span>
              </div>
              <div class="bar-track" style="height:7px;margin-bottom:4px;">
                <div class="bar-fill in" style="width:${inPct}%"></div>
              </div>
              <div class="bar-track" style="height:7px;">
                <div class="bar-fill out" style="width:${outPct}%"></div>
              </div>
            </div>
          `;
        })
        .join('');

      area.innerHTML = `
        <div class="stats-summary-grid">
          <div class="stat-box">
            <small>🍀 Pemasukan Tahun ${escapeHTML(selectedYear)}</small>
            <strong style="color:var(--pastel-green)">${escapeHTML(formatRupiah(yearInc))}</strong>
          </div>
          <div class="stat-box">
            <small>🌷 Pengeluaran Tahun ${escapeHTML(selectedYear)}</small>
            <strong style="color:var(--dusty-rose)">${escapeHTML(formatRupiah(yearExp))}</strong>
          </div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:8px;">📅 Ringkasan & Grafik Bulanan (${escapeHTML(selectedYear)})</h3>
          ${rowsHTML}
        </div>
      `;
    }
  }

  // ==================== UI RENDERING: WALLET & SETTINGS ====================
  function renderWallet() {
    document.getElementById('input-initial-balance').value = state.initialBalance;
    document.getElementById('wallet-tx-count').textContent = state.transactions.length;

    const hasSample = state.transactions.some((tx) => tx.isSample);
    const btnClearSample = document.getElementById('btn-clear-sample');
    if (hasSample) btnClearSample.classList.remove('hidden');
    else btnClearSample.classList.add('hidden');
  }

  function refreshAllViews() {
    renderDashboard();
    renderDiary();
    renderStats();
    renderWallet();
    syncDateButtonLabels();
  }

  // ==================== TRANSACTION MODAL (ADD / EDIT) ====================
  function setModalType(type) {
    currentModalType = type;
    const btnOut = document.getElementById('type-btn-expense');
    const btnIn = document.getElementById('type-btn-income');

    if (type === 'expense') {
      btnOut.classList.add('active-out');
      btnIn.classList.remove('active-in');
    } else {
      btnIn.classList.add('active-in');
      btnOut.classList.remove('active-out');
    }

    const catSelect = document.getElementById('tx-category');
    catSelect.innerHTML = CATEGORIES[type]
      .map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.label)}</option>`)
      .join('');

    const chipsBox = document.getElementById('quick-suggestions');
    chipsBox.innerHTML = QUICK_SUGGESTIONS[type]
      .map((text) => `<button type="button" class="chip-btn">${escapeHTML(text)}</button>`)
      .join('');

    chipsBox.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('tx-name').value = btn.textContent;
      });
    });
  }

  function openTxModal(type = 'expense', txToEdit = null) {
    const modal = document.getElementById('tx-modal');
    const form = document.getElementById('tx-form');
    form.reset();

    if (txToEdit) {
      document.getElementById('modal-title').textContent = '✏️ Edit Kliping Diary';
      document.getElementById('tx-id').value = txToEdit.id;
      setModalType(txToEdit.type);
      document.getElementById('tx-amount').value = txToEdit.amount;
      document.getElementById('tx-name').value = txToEdit.name;
      document.getElementById('tx-category').value = txToEdit.category;
      document.getElementById('tx-date').value = txToEdit.date;
      document.getElementById('tx-note').value = txToEdit.note || '';
    } else {
      document.getElementById('modal-title').textContent = type === 'income' ? '🍀 Catat Uang Masuk' : '🌷 Catat Uang Keluar';
      document.getElementById('tx-id').value = '';
      setModalType(type);
      document.getElementById('tx-date').value = getTodayISO();
    }

    syncDateButtonLabels();
    modal.classList.remove('hidden');
  }

  function closeTxModal() {
    document.getElementById('tx-modal').classList.add('hidden');
  }

  function handleSaveTransaction(e) {
    e.preventDefault();

    const id = document.getElementById('tx-id').value.trim();
    const amount = Number(document.getElementById('tx-amount').value);
    const name = document.getElementById('tx-name').value.trim();
    const category = document.getElementById('tx-category').value.trim();
    const date = document.getElementById('tx-date').value.trim();
    const note = document.getElementById('tx-note').value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('⚠️ Nominal harus berupa angka positif lebih dari 0!');
      return;
    }
    if (!name) {
      showToast('⚠️ Nama transaksi wajib diisi!');
      return;
    }
    if (!category) {
      showToast('⚠️ Kategori wajib dipilih!');
      return;
    }
    if (!date) {
      showToast('⚠️ Tanggal transaksi wajib diisi!');
      return;
    }

    if (id) {
      const idx = state.transactions.findIndex((t) => t.id === id);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          type: currentModalType,
          amount,
          name,
          category,
          date,
          note
        };
        showToast('✨ Kliping berhasil diperbarui!');
      }
    } else {
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        type: currentModalType,
        amount,
        name,
        category,
        date,
        note,
        isSample: false,
        createdAt: Date.now()
      };
      state.transactions.push(newTx);
      showToast('📎 Tertempel di Kliping Pocket!');
    }

    saveState();
    closeTxModal();
    initStatsControls();
    refreshAllViews();
  }

  function editTransactionById(id) {
    const tx = state.transactions.find((t) => t.id === id);
    if (tx) openTxModal(tx.type, tx);
  }

  function deleteTransactionById(id) {
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;
    const confirmed = window.confirm(`Lepas kliping "${tx.name}" (${formatRupiah(tx.amount)})?`);
    if (!confirmed) return;

    state.transactions = state.transactions.filter((t) => t.id !== id);
    saveState();
    refreshAllViews();
    showToast('🗑️ Kliping telah dihapus.');
  }

  // ==================== EXPORT, BACKUP, RESTORE & SAMPLE DATA ====================
  function exportToCSV() {
    if (state.transactions.length === 0) {
      showToast('⚠️ Belum ada kliping untuk di-export.');
      return;
    }

    const headers = ['Tanggal', 'Jenis', 'Nama Transaksi', 'Kategori', 'Nominal (Rp)', 'Catatan'];
    const rows = state.transactions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((tx) => [
        tx.date,
        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `"${String(tx.name).replace(/"/g, '""')}"`,
        `"${String(tx.category).replace(/"/g, '""')}"`,
        tx.amount,
        `"${String(tx.note || '').replace(/"/g, '""')}"`
      ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KlipingPocket_Diary_${getTodayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📊 File CSV siap dibuka di Excel!');
  }

  function exportToJSON() {
    const backupPayload = {
      app: 'Kliping Pocket – My Money Diary',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        initialBalance: state.initialBalance,
        transactions: state.transactions,
        settings: state.settings
      }
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KlipingPocket_Backup_${getTodayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('💾 File Backup JSON berhasil diunduh!');
  }

  function restoreFromJSON() {
    const fileInput = document.getElementById('input-restore-json');
    const file = fileInput.files[0];
    if (!file) {
      showToast('⚠️ Pilih file backup .json terlebih dahulu!');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = JSON.parse(event.target.result);
        if (
          !parsed ||
          (parsed.app !== 'Kliping Pocket – My Money Diary' && parsed.app !== 'Pinky Pocket – My Money Diary') ||
          !parsed.data ||
          !Array.isArray(parsed.data.transactions)
        ) {
          showToast('❌ File tidak valid! Pastikan menggunakan file backup Kliping Pocket.');
          return;
        }

        const validTransactions = parsed.data.transactions.filter(
          (tx) =>
            tx &&
            typeof tx.id === 'string' &&
            (tx.type === 'income' || tx.type === 'expense') &&
            typeof tx.name === 'string' &&
            tx.name.trim() !== '' &&
            Number.isFinite(Number(tx.amount)) &&
            Number(tx.amount) > 0 &&
            typeof tx.category === 'string' &&
            typeof tx.date === 'string'
        );

        const ok = window.confirm(
          `Ditemukan ${validTransactions.length} kliping valid dan saldo awal ${formatRupiah(
            parsed.data.initialBalance || 0
          )}. Ganti data saat ini dengan data backup?`
        );
        if (!ok) return;

        state.initialBalance = Number(parsed.data.initialBalance) || 0;
        state.transactions = validTransactions;
        state.settings = parsed.data.settings || { currency: 'IDR', greetingName: 'klipingkecil' };

        saveState();
        initStatsControls();
        refreshAllViews();
        fileInput.value = '';
        showToast('🎉 Data berhasil dipulihkan!');
      } catch (err) {
        showToast('❌ Gagal membaca file JSON. File rusak atau format salah.');
      }
    };
    reader.readAsText(file);
  }

  function loadSampleData() {
    const alreadyHasSample = state.transactions.some((tx) => tx.isSample);
    if (alreadyHasSample) {
      showToast('ℹ️ Contoh kliping sudah dimuat sebelumnya.');
      return;
    }

    const today = getTodayISO();
    const samples = [
      {
        id: 'sample_1',
        type: 'income',
        name: 'Hasil jualan stiker & paper pack',
        amount: 350000,
        category: 'Hasil jualan',
        date: today,
        note: 'Batch 1 sold out ♡',
        isSample: true,
        createdAt: Date.now() - 4000
      },
      {
        id: 'sample_2',
        type: 'expense',
        name: 'Beli kertas HVS & stiker vinyl',
        amount: 65000,
        category: 'Alat Tulis & Kertas',
        date: today,
        note: 'Restock bahan klipingkecil',
        isSample: true,
        createdAt: Date.now() - 3000
      },
      {
        id: 'sample_3',
        type: 'expense',
        name: 'Beli iced matcha latte',
        amount: 28000,
        category: 'Minuman',
        date: today,
        note: 'Teman ngedit konten',
        isSample: true,
        createdAt: Date.now() - 2000
      }
    ];

    state.transactions.push(...samples);
    saveState();
    refreshAllViews();
    showToast('✨ Contoh kliping berhasil ditambahkan!');
  }

  function clearSampleData() {
    state.transactions = state.transactions.filter((tx) => !tx.isSample);
    saveState();
    refreshAllViews();
    showToast('🧹 Semua contoh kliping telah dihapus!');
  }

  function resetAllData() {
    const step1 = window.confirm('⚠️ PERINGATAN: Semua transaksi dan pengaturan saldo awal akan dihapus permanen. Lanjutkan?');
    if (!step1) return;
    const step2 = window.confirm('Apakah kamu benar-benar yakin ingin mengosongkan seluruh Kliping Pocket?');
    if (!step2) return;

    state = {
      initialBalance: 0,
      transactions: [],
      settings: { currency: 'IDR', greetingName: 'klipingkecil' }
    };
    saveState();
    initStatsControls();
    refreshAllViews();
    showToast('🌸 Semua data telah di-reset bersih.');
  }

  // ==================== NAVIGATION & EVENT LISTENERS ====================
  function switchTab(targetId) {
    document.querySelectorAll('.view-section').forEach((sec) => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.remove('active'));

    const targetSection = document.getElementById(targetId);
    const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (targetSection) targetSection.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.target));
    });

    document.getElementById('btn-see-all-diary').addEventListener('click', () => switchTab('view-diary'));
    document.getElementById('btn-quick-in').addEventListener('click', () => openTxModal('income'));
    document.getElementById('btn-quick-out').addEventListener('click', () => openTxModal('expense'));

    document.getElementById('btn-close-modal').addEventListener('click', closeTxModal);
    document.getElementById('tx-modal').addEventListener('click', (e) => {
      if (e.target.id === 'tx-modal') closeTxModal();
    });
    document.getElementById('type-btn-expense').addEventListener('click', () => setModalType('expense'));
    document.getElementById('type-btn-income').addEventListener('click', () => setModalType('income'));
    document.getElementById('tx-date').addEventListener('change', syncDateButtonLabels);
    document.getElementById('tx-form').addEventListener('submit', handleSaveTransaction);

    document.getElementById('diary-search').addEventListener('input', renderDiary);
    document.getElementById('diary-filter-category').addEventListener('change', renderDiary);
    document.getElementById('diary-filter-type').addEventListener('change', renderDiary);
    document.getElementById('diary-date-start').addEventListener('change', () => {
      syncDateButtonLabels();
      renderDiary();
    });
    document.getElementById('diary-date-end').addEventListener('change', () => {
      syncDateButtonLabels();
      renderDiary();
    });
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
      document.getElementById('diary-search').value = '';
      document.getElementById('diary-filter-category').value = 'ALL';
      document.getElementById('diary-filter-type').value = 'ALL';
      document.getElementById('diary-date-start').value = '';
      document.getElementById('diary-date-end').value = '';
      syncDateButtonLabels();
      renderDiary();
    });

    document.querySelectorAll('.period-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.period-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentStatsPeriod = tab.dataset.period;

        document.querySelectorAll('.stats-control').forEach((ctrl) => ctrl.classList.add('hidden'));
        document.getElementById(`stats-control-${currentStatsPeriod}`).classList.remove('hidden');
        renderStats();
      });
    });

    document.getElementById('stats-input-daily').addEventListener('change', () => {
      syncDateButtonLabels();
      renderStats();
    });
    document.getElementById('stats-input-weekly').addEventListener('change', () => {
      syncDateButtonLabels();
      renderStats();
    });
    document.getElementById('stats-input-monthly').addEventListener('change', () => {
      syncDateButtonLabels();
      renderStats();
    });
    document.getElementById('stats-input-yearly').addEventListener('change', renderStats);

    document.getElementById('form-initial-balance').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = Number(document.getElementById('input-initial-balance').value);
      if (!Number.isFinite(val) || val < 0) {
        showToast('⚠️ Saldo awal tidak boleh negatif!');
        return;
      }
      state.initialBalance = val;
      saveState();
      refreshAllViews();
      showToast('💰 Saldo awal berhasil disimpan!');
    });

    document.getElementById('btn-load-sample').addEventListener('click', loadSampleData);
    document.getElementById('btn-clear-sample').addEventListener('click', clearSampleData);
    document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);
    document.getElementById('btn-export-json').addEventListener('click', exportToJSON);
    document.getElementById('btn-restore-json').addEventListener('click', restoreFromJSON);
    document.getElementById('btn-reset-all').addEventListener('click', resetAllData);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      document.getElementById('btn-install-pwa').classList.remove('hidden');
    });

    document.getElementById('btn-install-pwa').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('btn-install-pwa').classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }

  window.KlipingApp = {
    editTx: editTransactionById,
    deleteTx: deleteTransactionById
  };

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('Service Worker gagal didaftarkan:', err);
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initStatsControls();
    setupEventListeners();
    refreshAllViews();
    registerServiceWorker();
  });
})();