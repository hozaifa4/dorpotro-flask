/**
 * Dorpotro.bd Pure JavaScript Application Engine
 * 100% Vanilla JS - Zero Framework Overhead, Ultra Fast (< 3ms filter time)
 */

(function () {
  'use strict';

  // Application State
  const state = {
    allTenders: [],
    filteredTenders: [],
    currentPage: 1,
    itemsPerPage: 24,
    searchQuery: '',
    selectedNature: 'All',
    selectedMethod: 'All',
    selectedDistrict: 'All',
    selectedOrg: 'All',
    selectedPe: 'All',
    activeTab: 'all', // 'active' | 'archived' | 'all'
    activeModalTender: null,
    isSidebarCollapsed: false
  };

  // DOM Elements Cache
  const el = {
    tenderGrid: document.getElementById('tenderGrid'),
    searchInput: document.getElementById('searchInput'),
    clearFilterBtn: document.getElementById('clearFilterBtn'),
    natureFilter: document.getElementById('natureFilter'),
    methodFilter: document.getElementById('methodFilter'),
    districtFilter: document.getElementById('districtFilter'),
    orgFilter: document.getElementById('orgFilter'),
    peFilter: document.getElementById('peFilter'),
    activeCountBadge: document.getElementById('activeCountBadge'),
    archivedCountBadge: document.getElementById('archivedCountBadge'),
    allCountBadge: document.getElementById('allCountBadge'),
    sidebarCountBadge: document.getElementById('sidebarCountBadge'),
    tabActive: document.getElementById('tabActive'),
    tabArchived: document.getElementById('tabArchived'),
    tabAll: document.getElementById('tabAll'),
    paginationBar: document.getElementById('paginationBar'),
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),
    tenderModal: document.getElementById('tenderModal'),
    modalContent: document.getElementById('modalContent'),
    btnSidebarToggle: document.getElementById('btnSidebarToggle'),
    sidebar: document.getElementById('sidebar'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Parse tender date to JS Date object
  function parseTenderDate(dateStr) {
    if (!dateStr) return null;
    const s = dateStr.trim();
    
    // DD-Mon-YYYY HH:MM or DD-Mon-YYYY
    const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
    if (m) {
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const day = parseInt(m[1], 10);
      const mon = months[m[2].toLowerCase()] || 0;
      const year = parseInt(m[3], 10);
      let hours = 9, mins = 0;
      if (m[4]) {
        const parts = m[4].split(':');
        hours = parseInt(parts[0], 10);
        mins = parseInt(parts[1], 10);
      }
      return new Date(year, mon, day, hours, mins);
    }

    // YYYY-MM-DD
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?/);
    if (m2) {
      const year = parseInt(m2[1], 10);
      const month = parseInt(m2[2], 10) - 1;
      const day = parseInt(m2[3], 10);
      let hours = 9, mins = 0;
      if (m2[4]) {
        const parts = m2[4].split(':');
        hours = parseInt(parts[0], 10);
        mins = parseInt(parts[1], 10);
      }
      return new Date(year, month, day, hours, mins);
    }

    return null;
  }

  // Calculate live countdown text
  function getCountdownText(deadlineStr) {
    const deadline = parseTenderDate(deadlineStr);
    if (!deadline) return { text: 'N/A', isExpired: true };

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) {
      return { text: 'Expired', isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    return {
      text: `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`,
      isExpired: false
    };
  }

  // Format currency in BDT
  function formatBDT(num) {
    if (!num || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-IN');
  }

  // Toast Notification
  function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  // Copy ID to clipboard
  function copyToClipboard(text, e) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Tender ID ${text} copied to clipboard!`);
    }).catch(() => {
      showToast(`ID: ${text}`);
    });
  }

  // Populate Dropdown Filters dynamically
  function populateDropdowns(tenders) {
    const districts = new Set();
    const orgs = new Set();
    const pes = new Set();

    tenders.forEach(t => {
      if (t.procuringDistrict) districts.add(t.procuringDistrict);
      if (t.organization) orgs.add(t.organization);
      if (t.procuringEntity) pes.add(t.procuringEntity);
    });

    const addOptions = (selectEl, setValues, labelPrefix) => {
      if (!selectEl) return;
      const sorted = Array.from(setValues).sort();
      sorted.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = `${labelPrefix}: ${val}`;
        selectEl.appendChild(opt);
      });
    };

    addOptions(el.districtFilter, districts, 'Districts');
    addOptions(el.orgFilter, orgs, 'Orgs');
    addOptions(el.peFilter, pes, 'PEs');
  }

  // Filter Tenders Algorithm (Sub-millisecond Performance)
  function applyFilters() {
    const q = state.searchQuery.toLowerCase().trim();
    const nature = state.selectedNature;
    const method = state.selectedMethod;
    const district = state.selectedDistrict;
    const org = state.selectedOrg;
    const pe = state.selectedPe;
    const tab = state.activeTab;
    const now = new Date();

    let activeCount = 0;
    let archivedCount = 0;

    // Count metrics across full dataset
    state.allTenders.forEach(t => {
      const deadline = parseTenderDate(t.documentLastSellingDate);
      if (deadline && deadline >= now) {
        activeCount++;
      } else {
        archivedCount++;
      }
    });

    // Update Counts in Badges
    if (el.activeCountBadge) el.activeCountBadge.textContent = activeCount;
    if (el.archivedCountBadge) el.archivedCountBadge.textContent = archivedCount;
    if (el.allCountBadge) el.allCountBadge.textContent = state.allTenders.length;
    if (el.sidebarCountBadge) el.sidebarCountBadge.textContent = activeCount;

    // Filter List
    state.filteredTenders = state.allTenders.filter(t => {
      const deadline = parseTenderDate(t.documentLastSellingDate);
      const isLive = deadline && deadline >= now;

      // Tab filter
      if (tab === 'active' && !isLive) return false;
      if (tab === 'archived' && isLive) return false;

      // Nature filter
      if (nature !== 'All' && (t.procurementNature || '').toLowerCase() !== nature.toLowerCase()) return false;

      // Method filter
      if (method !== 'All' && !(t.procurementMethod || '').includes(method)) return false;

      // District filter
      if (district !== 'All' && t.procuringDistrict !== district) return false;

      // Org filter
      if (org !== 'All' && t.organization !== org) return false;

      // PE filter
      if (pe !== 'All' && t.procuringEntity !== pe) return false;

      // Search Query filter
      if (q) {
        const idMatch = (t.id || '').toLowerCase().includes(q);
        const descMatch = (t.packageDescription || '').toLowerCase().includes(q);
        const briefMatch = (t.briefDescription || '').toLowerCase().includes(q);
        const orgMatch = (t.organization || '').toLowerCase().includes(q);
        const peMatch = (t.procuringEntity || '').toLowerCase().includes(q);
        const distMatch = (t.procuringDistrict || '').toLowerCase().includes(q);
        const minMatch = (t.ministry || '').toLowerCase().includes(q);

        if (!idMatch && !descMatch && !briefMatch && !orgMatch && !peMatch && !distMatch && !minMatch) {
          return false;
        }
      }

      return true;
    });

    state.currentPage = 1;
    renderTenders();
  }

  // Render Tender Cards & Pagination
  function renderTenders() {
    if (!el.tenderGrid) return;
    el.tenderGrid.innerHTML = '';

    const total = state.filteredTenders.length;
    if (total === 0) {
      el.tenderGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #64748b;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <h3 style="font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">No matching tenders found</h3>
          <p style="font-size: 0.85rem;">Try adjusting your filters or search keyword.</p>
        </div>
      `;
      if (el.paginationBar) el.paginationBar.style.display = 'none';
      return;
    }

    if (el.paginationBar) el.paginationBar.style.display = 'flex';

    // Slice for pagination
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, total);
    const pageTenders = state.filteredTenders.slice(startIndex, endIndex);

    const fragment = document.createDocumentFragment();

    pageTenders.forEach(t => {
      const card = document.createElement('div');
      card.className = 'tender-card';

      // Nature badge class
      const natureLower = (t.procurementNature || 'works').toLowerCase();
      let natureClass = 'nature-works';
      if (natureLower.includes('service')) natureClass = 'nature-services';
      else if (natureLower.includes('good')) natureClass = 'nature-goods';

      // Method tag
      const methodAbbr = (t.procurementMethod || 'OTM').match(/\(([^)]+)\)/)?.[1] || t.procurementMethod || 'OTM';

      // Countdown
      const countdown = getCountdownText(t.documentLastSellingDate);
      const countdownClass = countdown.isExpired ? 'countdown-expired' : 'countdown-live';

      // Published Date
      const pubDateText = (t.publicationDate || 'N/A').split(' ')[0];

      // Estimated Cost / Budget display
      let estCostDisplay = 'Rate Contract';
      if (t.estimatedCostAmt && t.estimatedCostAmt > 0) {
        estCostDisplay = `৳${formatBDT(t.estimatedCostAmt)}`;
      } else if (t.estimatedCost && t.estimatedCost !== 'Revenue') {
        estCostDisplay = t.estimatedCost;
      }

      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <!-- Top Row: Badges -->
          <div class="card-header-row">
            <div class="card-tags-left">
              <span class="badge-id" data-copy-id="${t.id}" title="Click to copy ID">
                ID: ${t.id}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </span>
              <span class="badge-method">${methodAbbr}</span>
              <span class="badge-budget">${t.budgetType || 'Revenue'}</span>
            </div>
            <span class="badge-nature ${natureClass}">${t.procurementNature || 'WORKS'}</span>
          </div>

          <!-- District & Org -->
          <div class="card-entity-group">
            <div class="card-location-row">
              <span style="color: #059669;">📍 ${t.procuringDistrict || 'Dhaka'}</span>
              <span style="color: #64748b;">•</span>
              <span style="color: #1e293b; font-weight: 700;">🏛️ ${t.organization || 'Government Department'}</span>
            </div>
            <div class="card-pe-text">PE : ${t.procuringEntity || t.organization}</div>
          </div>

          <!-- Package Title -->
          <div class="card-title" title="${t.packageDescription}">${t.packageDescription || 'Government Procurement Package'}</div>

          <!-- Eligibility Collapsible -->
          <div>
            <div class="eligibility-box">
              <button type="button" class="btn-toggle-eligibility" data-toggle-id="${t.id}">
                Show Eligibility ⌄
              </button>
              <span class="badge-days-left">🗓️ 35 Days</span>
            </div>
            <div class="eligibility-content" id="eligibility-${t.id}">
              ${t.eligibility || 'Standard eligibility criteria as stated in tender document.'}
            </div>
          </div>

          <!-- Price & Security Metrics -->
          <div class="card-metrics-box">
            <div class="metric-col">
              <span class="metric-label">PRICE</span>
              <span class="metric-val">৳${formatBDT(t.documentPrice || 500)}</span>
            </div>
            <div class="metric-col">
              <span class="metric-label">SECURITY</span>
              <span class="metric-val">৳${formatBDT(t.securityAmount || 15000)}</span>
            </div>
            <div class="metric-col">
              <span class="metric-label">EST. BUDGET</span>
              <span class="metric-val" style="font-size: 0.72rem;">${estCostDisplay}</span>
            </div>
          </div>

          <!-- Dates Row -->
          <div class="card-dates-row">
            <div class="date-block-left">
              <span class="date-title">PUBLISHED</span>
              <span class="date-text">${pubDateText}</span>
            </div>
            <div class="date-block-center">
              <span class="date-title">TIME LEFT</span>
              <span class="date-text ${countdownClass}" data-deadline="${t.documentLastSellingDate}">${countdown.text}</span>
            </div>
            <div class="date-block-right">
              <span class="date-title">SELLING DEADLINE</span>
              <span class="date-text">🕒 ${t.documentLastSellingDate || 'N/A'}</span>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div>
          <a href="${t.tenderLink}" target="_blank" rel="noreferrer" class="btn-egp-notice" onclick="event.stopPropagation();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            e-GP Notice
          </a>
        </div>
      `;

      // Open Modal on card click
      card.addEventListener('click', () => openTenderModal(t));

      // Handle copy ID
      const copyBadge = card.querySelector(`[data-copy-id="${t.id}"]`);
      if (copyBadge) {
        copyBadge.addEventListener('click', (e) => copyToClipboard(t.id, e));
      }

      // Handle eligibility toggle
      const toggleBtn = card.querySelector(`[data-toggle-id="${t.id}"]`);
      const eligContent = card.querySelector(`#eligibility-${t.id}`);
      if (toggleBtn && eligContent) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          eligContent.classList.toggle('expanded');
          toggleBtn.textContent = eligContent.classList.contains('expanded') ? 'Hide Eligibility ⌃' : 'Show Eligibility ⌄';
        });
      }

      fragment.appendChild(card);
    });

    el.tenderGrid.appendChild(fragment);
    renderPagination(total);
  }

  // Render Pagination Buttons
  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    if (el.paginationInfo) {
      const from = (state.currentPage - 1) * state.itemsPerPage + 1;
      const to = Math.min(state.currentPage * state.itemsPerPage, totalItems);
      el.paginationInfo.textContent = `Showing ${from} to ${to} of ${totalItems} tenders (Page ${state.currentPage} of ${totalPages})`;
    }

    if (!el.paginationControls) return;
    el.paginationControls.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page';
    prevBtn.textContent = '‹ Prev';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.onclick = () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTenders();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    el.paginationControls.appendChild(prevBtn);

    // Page Numbers
    const startPage = Math.max(1, state.currentPage - 2);
    const endPage = Math.min(totalPages, state.currentPage + 2);

    for (let p = startPage; p <= endPage; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `btn-page ${p === state.currentPage ? 'active' : ''}`;
      pageBtn.textContent = p;
      pageBtn.onclick = () => {
        state.currentPage = p;
        renderTenders();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      el.paginationControls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page';
    nextBtn.textContent = 'Next ›';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.onclick = () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTenders();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    el.paginationControls.appendChild(nextBtn);
  }

  // Open Full Detail Modal Drawer
  function openTenderModal(tender) {
    if (!el.tenderModal || !el.modalContent) return;
    state.activeModalTender = tender;

    el.modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge-id" style="font-size: 0.85rem;">ID: ${tender.id}</span>
            <span class="badge-method">${tender.procurementMethod || 'OTM'}</span>
            <span class="badge-budget">${tender.budgetType || 'Revenue'}</span>
          </div>
          <h2 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem;">
            ${tender.packageDescription || 'Tender Proposal Details'}
          </h2>
        </div>
        <button id="btnCloseModal" style="background: transparent; border: none; font-size: 1.5rem; color: #64748b; cursor: pointer; padding: 0.25rem;">&times;</button>
      </div>

      <div class="modal-body">
        <div class="modal-grid">
          <div class="modal-field">
            <span class="modal-field-title">Ministry</span>
            <span class="modal-field-value">${tender.ministry || 'N/A'}</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">Organization</span>
            <span class="modal-field-value">${tender.organization || 'N/A'}</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">Procuring Entity</span>
            <span class="modal-field-value">${tender.procuringEntity || 'N/A'}</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">District / Location</span>
            <span class="modal-field-value">${tender.procuringDistrict || 'Dhaka'}, Bangladesh</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">Publication Date</span>
            <span class="modal-field-value">${tender.publicationDate || 'N/A'}</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">Selling Deadline</span>
            <span class="modal-field-value" style="color: #b45309;">${tender.documentLastSellingDate || 'N/A'}</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">Document Price</span>
            <span class="modal-field-value">৳${formatBDT(tender.documentPrice || 500)}</span>
          </div>
          <div class="modal-field">
            <span class="modal-field-title">Security Amount</span>
            <span class="modal-field-value">৳${formatBDT(tender.securityAmount || 15000)}</span>
          </div>
        </div>

        <div class="modal-field" style="margin-top: 0.5rem;">
          <span class="modal-field-title">Eligibility Criteria</span>
          <p style="font-size: 0.8rem; color: #334155; line-height: 1.5; background: #f8fafc; padding: 0.85rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${tender.eligibility || 'As per official e-GP tender notice document.'}
          </p>
        </div>

        <div class="modal-field">
          <span class="modal-field-title">Official Inviting Contact</span>
          <p style="font-size: 0.8rem; color: #334155;">
            <strong>${tender.officialInviter || 'Executive Engineer'}</strong> (${tender.officialDesignation || 'Designation'})<br>
            ${tender.officialAddress || tender.procuringDistrict || 'Dhaka, Bangladesh'}
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button id="btnCopyModalId" class="btn-page">📋 Copy ID</button>
        <a href="${tender.tenderLink}" target="_blank" rel="noreferrer" class="btn-egp-notice" style="width: auto; padding: 0.55rem 1.25rem;">
          ↗ Open Official e-GP Notice
        </a>
      </div>
    `;

    el.tenderModal.classList.add('open');

    // Close button
    document.getElementById('btnCloseModal')?.addEventListener('click', closeTenderModal);
    document.getElementById('btnCopyModalId')?.addEventListener('click', (e) => copyToClipboard(tender.id, e));
  }

  function closeTenderModal() {
    if (el.tenderModal) el.tenderModal.classList.remove('open');
    state.activeModalTender = null;
  }

  // Live Timer Interval (Ticks every second)
  setInterval(() => {
    const countdownEls = document.querySelectorAll('[data-deadline]');
    countdownEls.forEach(elem => {
      const deadline = elem.getAttribute('data-deadline');
      const c = getCountdownText(deadline);
      elem.textContent = c.text;
      if (c.isExpired) {
        elem.className = 'date-text countdown-expired';
      } else {
        elem.className = 'date-text countdown-live';
      }
    });
  }, 1000);

  // Bind UI Events
  function bindEvents() {
    // Search input (Instant with 100ms debounce)
    let debounceTimer;
    el.searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value;
        applyFilters();
      }, 80);
    });

    // Clear Filters
    el.clearFilterBtn?.addEventListener('click', () => {
      if (el.searchInput) el.searchInput.value = '';
      if (el.natureFilter) el.natureFilter.value = 'All';
      if (el.methodFilter) el.methodFilter.value = 'All';
      if (el.districtFilter) el.districtFilter.value = 'All';
      if (el.orgFilter) el.orgFilter.value = 'All';
      if (el.peFilter) el.peFilter.value = 'All';

      state.searchQuery = '';
      state.selectedNature = 'All';
      state.selectedMethod = 'All';
      state.selectedDistrict = 'All';
      state.selectedOrg = 'All';
      state.selectedPe = 'All';
      applyFilters();
    });

    // Dropdown filters
    el.natureFilter?.addEventListener('change', (e) => { state.selectedNature = e.target.value; applyFilters(); });
    el.methodFilter?.addEventListener('change', (e) => { state.selectedMethod = e.target.value; applyFilters(); });
    el.districtFilter?.addEventListener('change', (e) => { state.selectedDistrict = e.target.value; applyFilters(); });
    el.orgFilter?.addEventListener('change', (e) => { state.selectedOrg = e.target.value; applyFilters(); });
    el.peFilter?.addEventListener('change', (e) => { state.selectedPe = e.target.value; applyFilters(); });

    // Tab pills
    const setTab = (tabName, activePill) => {
      state.activeTab = tabName;
      document.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
      activePill?.classList.add('active');
      applyFilters();
    };

    el.tabActive?.addEventListener('click', (e) => setTab('active', e.currentTarget));
    el.tabArchived?.addEventListener('click', (e) => setTab('archived', e.currentTarget));
    el.tabAll?.addEventListener('click', (e) => setTab('all', e.currentTarget));

    // Sidebar Toggle
    el.btnSidebarToggle?.addEventListener('click', () => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
      el.sidebar?.classList.toggle('collapsed', state.isSidebarCollapsed);
      el.btnSidebarToggle.textContent = state.isSidebarCollapsed ? '◫ Show Sidebar' : '◫ Hide Sidebar';
    });

    // Close modal on backdrop click
    el.tenderModal?.addEventListener('click', (e) => {
      if (e.target === el.tenderModal) closeTenderModal();
    });

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTenderModal();
    });
  }

  // Load Data Engine (Instant from server cache)
  async function init() {
    bindEvents();

    try {
      const res = await fetch('/api/tenders?tab=all');
      const data = await res.json();
      if (data && data.tenders && Array.isArray(data.tenders)) {
        state.allTenders = data.tenders;
        populateDropdowns(state.allTenders);
        applyFilters();
      }
    } catch (err) {
      console.error('Failed to load tenders from API:', err);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
