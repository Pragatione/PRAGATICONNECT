/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Search, Filtering, Sorting & Pagination for Contractors and Work Postings
 */

import { getCollection, openEnquiryModal, openApplyModal, getCurrentUser } from './common.js';
import { applyTranslations, translateStatus, translateTrade } from './i18n.js';
import { renderStarRatingHtml } from './reviews.js';

// --- Browse Contractors Logic ---
export async function initContractorSearch() {
  const container = document.getElementById('contractorsList');
  const countEl = document.getElementById('resultsCount');
  if (!container) return;

  const contractors = await getCollection('contractors');
  let currentFiltered = [...contractors];

  // Read URL query parameters for trade pre-selection
  const urlParams = new URLSearchParams(window.location.search);
  const tradeParam = urlParams.get('trade');
  if (tradeParam) {
    const tradeBox = document.querySelector(`input[name="tradeFilter"][value="${tradeParam}"]`);
    if (tradeBox) tradeBox.checked = true;
  }

  function applyFilters() {
    const searchVal = (document.getElementById('searchQuery')?.value || '').toLowerCase().trim();
    const stateVal = document.getElementById('stateFilter')?.value || '';
    const minExp = Number(document.getElementById('experienceFilter')?.value || 0);
    const availableOnly = document.getElementById('availableOnlyFilter')?.checked || false;
    const sortVal = document.getElementById('sortBy')?.value || 'relevance';

    // Collect checked trades
    const checkedTrades = Array.from(document.querySelectorAll('input[name="tradeFilter"]:checked')).map(cb => cb.value.toLowerCase());

    // Collect checked certifications
    const checkedCerts = Array.from(document.querySelectorAll('input[name="certFilter"]:checked')).map(cb => cb.value.toLowerCase());

    currentFiltered = contractors.filter(c => {
      // Search query
      if (searchVal) {
        const text = `${c.firmName} ${c.ownerName} ${c.city} ${c.state} ${(c.trades || []).join(' ')} ${c.aboutUs || ''}`.toLowerCase();
        if (!text.includes(searchVal)) return false;
      }

      // State filter
      if (stateVal && c.state !== stateVal) return false;

      // Experience filter
      if (minExp > 0 && (c.yearsOfExperience || 0) < minExp) return false;

      // Availability filter
      if (availableOnly && !c.availableForWork) return false;

      // Trade filter
      if (checkedTrades.length > 0) {
        const hasTrade = (c.trades || []).some(t => checkedTrades.includes(t.toLowerCase()));
        if (!hasTrade) return false;
      }

      // Certifications filter
      if (checkedCerts.length > 0) {
        const hasCert = (c.certifications || []).some(cert => checkedCerts.includes(cert.toLowerCase()));
        if (!hasCert) return false;
      }

      return true;
    });

    // Sort
    if (sortVal === 'exp_desc') {
      currentFiltered.sort((a, b) => (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0));
    } else if (sortVal === 'rating_desc') {
      currentFiltered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortVal === 'projects_desc') {
      currentFiltered.sort((a, b) => (b.projectsCompleted || 0) - (a.projectsCompleted || 0));
    }

    renderCards(currentFiltered);
  }

  function renderCards(items) {
    if (countEl) countEl.textContent = `${items.length} Contractors Found`;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <i class="bi bi-search empty-state-icon"></i>
            <h5>No Contractors Match Your Criteria</h5>
            <p class="text-secondary small mb-3">Try adjusting your trade filters, location, or experience criteria.</p>
            <button class="btn btn-outline-secondary btn-sm" id="resetContractorFiltersBtn">Reset All Filters</button>
          </div>
        </div>
      `;
      document.getElementById('resetContractorFiltersBtn')?.addEventListener('click', resetFilters);
      return;
    }

    container.innerHTML = items.map(c => `
      <div class="col-md-6 mb-4">
        <div class="custom-card custom-card-hover h-100 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 class="fw-bold text-primary mb-0">${c.firmName}</h5>
              <div class="small text-secondary"><i class="bi bi-person-fill"></i> ${c.ownerName}</div>
            </div>
            <div class="text-end">
              <span class="badge badge-verified"><i class="bi bi-shield-check"></i> <span data-i18n="status_verified">Verified</span></span>
              <div class="small mt-1">
                ${renderStarRatingHtml(c.rating || 4.8, true, c.reviewCount || 0, 'small')}
              </div>
            </div>
          </div>

          <div class="small text-muted mb-2">
            <i class="bi bi-geo-alt-fill text-danger me-1"></i> ${c.city}, ${c.state} • 
            <span class="text-dark fw-semibold">${c.yearsOfExperience || 5}+ Yrs Exp</span>
          </div>

          <!-- Trades -->
          <div class="mb-3">
            ${(c.trades || []).slice(0, 4).map(t => `<span class="badge-trade">${translateTrade(t)}</span>`).join('')}
            ${(c.trades || []).length > 4 ? `<span class="badge bg-light text-muted border">+${c.trades.length - 4} more</span>` : ''}
          </div>

          <!-- Capacity Highlights -->
          <div class="bg-light p-2 rounded small mb-3">
            <div class="row g-1 text-secondary">
              <div class="col-6"><i class="bi bi-people me-1 text-primary"></i> Workers: <strong>${c.totalWorkers || 20}</strong></div>
              <div class="col-6"><i class="bi bi-truck me-1 text-warning"></i> Fleet: <strong>${(c.machinery || []).length} Types</strong></div>
              <div class="col-12 mt-1"><i class="bi bi-briefcase me-1 text-success"></i> Max Project: <strong>${c.largestProjectValue || '₹10 Cr+'}</strong></div>
            </div>
          </div>

          <p class="small text-muted mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${c.aboutUs || 'Reliable construction subcontractor equipped with machinery and skilled workforce ready for mobilization.'}
          </p>

          <div class="d-flex gap-2 pt-2 border-top mt-auto">
            <a href="profile-contractor.html?id=${c.uid}" class="btn btn-outline-primary btn-sm flex-grow-1" data-i18n="btn_view_profile">
              <i class="bi bi-eye me-1"></i> View Profile
            </a>
            <button class="btn btn-orange btn-sm flex-grow-1 send-contractor-enquiry-btn" 
              data-uid="${c.uid}" 
              data-name="${c.firmName}"
              data-i18n="btn_send_enquiry">
              <i class="bi bi-envelope me-1"></i> Send Enquiry
            </button>
          </div>
        </div>
      </div>
    `).join('');

    applyTranslations(container);

    // Bind Enquiry buttons
    container.querySelectorAll('.send-contractor-enquiry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toUid = e.currentTarget.getAttribute('data-uid');
        const toName = e.currentTarget.getAttribute('data-name');
        openEnquiryModal({
          toUid,
          toName,
          toType: 'contractor',
          defaultSubject: 'Subcontracting Enquiry from Pragati Connect'
        });
      });
    });
  }

  function resetFilters() {
    if (document.getElementById('searchQuery')) document.getElementById('searchQuery').value = '';
    if (document.getElementById('stateFilter')) document.getElementById('stateFilter').value = '';
    if (document.getElementById('experienceFilter')) document.getElementById('experienceFilter').value = '0';
    if (document.getElementById('availableOnlyFilter')) document.getElementById('availableOnlyFilter').checked = false;
    document.querySelectorAll('input[name="tradeFilter"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="certFilter"]').forEach(cb => cb.checked = false);
    applyFilters();
  }

  // Event Listeners
  document.getElementById('searchQuery')?.addEventListener('input', applyFilters);
  document.getElementById('stateFilter')?.addEventListener('change', applyFilters);
  document.getElementById('experienceFilter')?.addEventListener('change', applyFilters);
  document.getElementById('availableOnlyFilter')?.addEventListener('change', applyFilters);
  document.getElementById('sortBy')?.addEventListener('change', applyFilters);
  document.querySelectorAll('input[name="tradeFilter"]').forEach(cb => cb.addEventListener('change', applyFilters));
  document.querySelectorAll('input[name="certFilter"]').forEach(cb => cb.addEventListener('change', applyFilters));
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);

  window.addEventListener('languageChanged', () => {
    applyFilters();
  });

  // Initial render
  applyFilters();
}

// --- Browse Work Postings Logic ---
export async function initWorkSearch() {
  const container = document.getElementById('workPostingsList');
  const countEl = document.getElementById('workResultsCount');
  if (!container) return;

  const postings = await getCollection('workPostings');
  let currentFiltered = [...postings];

  // Read URL query parameters for trade or id
  const urlParams = new URLSearchParams(window.location.search);
  const tradeParam = urlParams.get('trade');
  if (tradeParam) {
    const tradeBox = document.querySelector(`input[name="workTradeFilter"][value="${tradeParam}"]`);
    if (tradeBox) tradeBox.checked = true;
  }

  function applyWorkFilters() {
    const searchVal = (document.getElementById('workSearchQuery')?.value || '').toLowerCase().trim();
    const stateVal = document.getElementById('workStateFilter')?.value || '';
    const budgetVal = document.getElementById('workBudgetFilter')?.value || '';
    const sortVal = document.getElementById('workSortBy')?.value || 'newest';
    const activeOnly = document.getElementById('workActiveOnlyFilter')?.checked || true;

    const checkedTrades = Array.from(document.querySelectorAll('input[name="workTradeFilter"]:checked')).map(cb => cb.value.toLowerCase());

    currentFiltered = postings.filter(p => {
      // Active toggle
      if (activeOnly && p.status !== 'active') return false;

      // Text query
      if (searchVal) {
        const text = `${p.projectName} ${p.companyName} ${p.city} ${p.state} ${p.tradeRequired} ${p.scopeOfWork}`.toLowerCase();
        if (!text.includes(searchVal)) return false;
      }

      // State filter
      if (stateVal && p.state !== stateVal) return false;

      // Budget filter
      if (budgetVal && p.estimatedBudget !== budgetVal) return false;

      // Trade filter
      if (checkedTrades.length > 0 && !checkedTrades.includes((p.tradeRequired || '').toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortVal === 'deadline_soon') {
      currentFiltered.sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline));
    } else if (sortVal === 'newest') {
      currentFiltered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderWorkCards(currentFiltered);
  }

  function renderWorkCards(items) {
    if (countEl) countEl.textContent = `${items.length} Active Work Requirements`;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <i class="bi bi-briefcase empty-state-icon"></i>
            <h5>No Work Postings Match Your Search</h5>
            <p class="text-secondary small mb-3">Try adjusting your filters or checking back as new EPC packages are posted daily.</p>
            <button class="btn btn-outline-secondary btn-sm" id="resetWorkFiltersBtn">Reset Filters</button>
          </div>
        </div>
      `;
      document.getElementById('resetWorkFiltersBtn')?.addEventListener('click', resetWorkFilters);
      return;
    }

    container.innerHTML = items.map(p => `
      <div class="card mb-3 border custom-card-hover">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-2 mb-2">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge-trade"><i class="bi bi-hammer me-1"></i> ${translateTrade(p.tradeRequired)}</span>
                <span class="badge badge-status ${p.status === 'active' ? 'active' : 'closed'}">${translateStatus(p.status)}</span>
                <span class="badge bg-secondary-subtle text-dark border"><i class="bi bi-clock me-1"></i> ${p.duration}</span>
              </div>
              <h4 class="fw-bold text-primary mb-1">${p.projectName}</h4>
              <div class="text-secondary fw-semibold small">
                <i class="bi bi-building me-1 text-primary"></i> ${p.companyName}
              </div>
            </div>
            <div class="text-md-end bg-light p-2 rounded border">
              <div class="small text-muted">Estimated Budget</div>
              <div class="fs-5 fw-bold text-success">${p.estimatedBudget}</div>
            </div>
          </div>

          <div class="row g-2 my-2 py-2 border-top border-bottom small text-secondary">
            <div class="col-sm-4"><i class="bi bi-geo-alt-fill text-danger me-1"></i> Location: <strong>${p.city}, ${p.state}</strong></div>
            <div class="col-sm-4"><i class="bi bi-calendar-event text-primary me-1"></i> Start Date: <strong>${new Date(p.startDate).toLocaleDateString()}</strong></div>
            <div class="col-sm-4"><i class="bi bi-hourglass-split text-warning me-1"></i> Deadline: <strong>${new Date(p.applicationDeadline).toLocaleDateString()}</strong></div>
          </div>

          <p class="text-secondary mb-3">${p.scopeOfWork}</p>

          <!-- Requirements snippet -->
          <div class="bg-light p-3 rounded mb-3 small">
            <div class="row g-2">
              <div class="col-md-6">
                <strong><i class="bi bi-truck me-1 text-warning"></i> Machinery:</strong> 
                <span class="text-muted">${p.machineryRequired || 'Standard site tools'}</span>
              </div>
              <div class="col-md-6">
                <strong><i class="bi bi-people me-1 text-primary"></i> Manpower:</strong> 
                <span class="text-muted">${p.manpowerRequired || 'As per work volume'}</span>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2">
            <span class="small text-muted"><i class="bi bi-person-check me-1"></i> ${p.applicationsCount || 0} contractors already applied</span>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm send-work-enquiry-btn" 
                data-company-uid="${p.companyUid}" 
                data-company-name="${p.companyName}" 
                data-posting-id="${p.id}"
                data-project-name="${p.projectName}"
                data-i18n="btn_ask_question">
                <i class="bi bi-chat-left-dots me-1"></i> Ask Question
              </button>
              <button class="btn btn-orange btn-sm apply-work-posting-btn" 
                data-posting-id="${p.id}" 
                data-project="${p.projectName}" 
                data-company="${p.companyName}"
                data-i18n="btn_apply_bid">
                <i class="bi bi-send me-1"></i> Apply / Submit Bid
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    applyTranslations(container);

    // Bind Apply & Enquiry buttons
    container.querySelectorAll('.apply-work-posting-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postingId = e.currentTarget.getAttribute('data-posting-id');
        const projectName = e.currentTarget.getAttribute('data-project');
        const companyName = e.currentTarget.getAttribute('data-company');
        openApplyModal({ postingId, projectName, companyName });
      });
    });

    container.querySelectorAll('.send-work-enquiry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toUid = e.currentTarget.getAttribute('data-company-uid');
        const toName = e.currentTarget.getAttribute('data-company-name');
        const postingId = e.currentTarget.getAttribute('data-posting-id');
        const projectName = e.currentTarget.getAttribute('data-project-name');
        openEnquiryModal({
          toUid,
          toName,
          toType: 'company',
          relatedPostingId: postingId,
          defaultSubject: `Clarification for ${projectName}`
        });
      });
    });
  }

  function resetWorkFilters() {
    if (document.getElementById('workSearchQuery')) document.getElementById('workSearchQuery').value = '';
    if (document.getElementById('workStateFilter')) document.getElementById('workStateFilter').value = '';
    if (document.getElementById('workBudgetFilter')) document.getElementById('workBudgetFilter').value = '';
    document.querySelectorAll('input[name="workTradeFilter"]').forEach(cb => cb.checked = false);
    applyWorkFilters();
  }

  // Bind Listeners
  document.getElementById('workSearchQuery')?.addEventListener('input', applyWorkFilters);
  document.getElementById('workStateFilter')?.addEventListener('change', applyWorkFilters);
  document.getElementById('workBudgetFilter')?.addEventListener('change', applyWorkFilters);
  document.getElementById('workSortBy')?.addEventListener('change', applyWorkFilters);
  document.getElementById('workActiveOnlyFilter')?.addEventListener('change', applyWorkFilters);
  document.querySelectorAll('input[name="workTradeFilter"]').forEach(cb => cb.addEventListener('change', applyWorkFilters));
  document.getElementById('resetWorkFiltersBtn')?.addEventListener('click', resetWorkFilters);

  window.addEventListener('languageChanged', () => {
    applyWorkFilters();
  });

  applyWorkFilters();
}
