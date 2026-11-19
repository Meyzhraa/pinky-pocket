/**
 * Pinky Pocket – My Money Diary
 * Vanilla JS Personal Finance Tracker with LocalStorage & PWA Support
 */

(function () {
  'use strict';

  // ==================== CONSTANTS & CATEGORIES ====================
  const STORAGE_KEY = 'pinky_pocket_data_v2';

  const CATEGORIES = {
    expense: [
      { id: 'Makanan', label: '🍽️ Makanan', icon: '🍽️' },
      { id: 'Minuman', label: '🧋 Minuman', icon: '🧋' },
      { id: 'Belanja', label: '🛍️ Belanja', icon: '🛍️' },
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
    expense: ['Beli matcha', 'Makan siang', 'Beli skincare', 'Ongkos transportasi', 'Belanja baju', 'Jajan', 'Kebutuhan rumah'],
    income: ['Gaji', 'Uang dari orang tua', 'Hasil jualan', 'Hadiah', 'Bonus', 'Refund']
  };

  // ==================== APPLICATION STATE ====================
  let state = {
    initialBalance: 0,
    transactions: [],
    settings: {
      currency: 'IDR',
      greetingName: 'pretty'
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

  // Format ringkas khusus tombol kalender agar tidak menumpuk di HP
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

    if (lblDiaryStart && elDiaryStart) {
      lblDiaryStart.textContent = elDiaryStart.value ? formatShortDate(elDiaryStart.value) : 'Pilih';
    }
    if (lblDiaryEnd && elDiaryEnd) {
      lblDiaryEnd.textContent = elDiaryEnd.value ? formatShortDate(elDiaryEnd.value) : 'Pilih';
    }
    if (lblStatsDaily && elStatsDaily) {
      lblStatsDaily.textContent = elStatsDaily.value ? formatShortDate(elStatsDaily.value) : 'Pilih';
    }
    if (lblStatsWeekly && elStatsWeekly) {
      lblStatsWeekly.textContent = elStatsWeekly.value ? formatShortDate(elStatsWeekly.value) : 'Pilih';
    }
    if (lblStatsMonthly && elStatsMonthly) {
      lblStatsMonthly.textContent = elStatsMonthly.value ? formatMonthIndonesian(elStatsMonthly.value) : 'Pilih';
    }
    if (lblTxDate && elTxDate) {
      lblTxDate.textContent = elTxDate.value ? formatDateIndonesian(elTxDate.value) : 'Pilih Tanggal';
    }
  }

  function getCategoryIcon(type, categoryName) {
    const list = CATEGORIES[type] || [];
    const found = list.find((c) => c.id === categoryName);
    if (found) return found.icon;
    return type === 'income' ? '🌷' : '🌸';
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
          state.settings = parsed.settings || { currency: 'IDR', greetingName: 'pretty' };
        }
      }
    } catch (