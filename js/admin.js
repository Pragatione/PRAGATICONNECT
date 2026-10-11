/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Admin Dashboard Controller
 * 
 * Features:
 * 1. Admin authentication check (admin@pragaticonnect.in / role == 'admin')
 * 2. Overview statistics (Total Contractors, Total Companies, Work Postings, Enquiries)
 * 3. Recent registrations table (last 20 users with filters, verify/unverify, spam deletion)
 * 4. Work postings moderation table (filters by trade & status, spam deletion)
 * 5. Verify / unverify toggle for contractors and companies
 * 6. Spam profile and posting deletion
 * 7. Chart.js analytics:
 *    - Registrations per month (bar chart)
 *    - Contractor vs Company ratio (pie chart)
 *    - Top 10 cities by registration (horizontal bar chart)
 *    - Work postings by trade (doughnut chart)
 * 8. Firestore rules & security compliance
 */

import { auth, db, isFirebaseLive } from './firebase-config.js';
import { 
  getCurrentUser, 
  setCurrentUser, 
  getCollection, 
  getDocument, 
  updateDocument, 
  deleteDocument, 
  showToast 
} from './common.js';
import { loginUser } from './auth.js';
import { renderStarRatingHtml, recalculateAndUpdateRating } from './reviews.js';

const ADMIN_EMAIL = 'admin@pragaticonnect.in';

// Global state cache for admin view
let adminState = {
  users: [],
  contractors: [],
  companies: [],
  workPostings: [],
  enquiries: [],
  applications: [],
  reviews: [],
  charts: {
    monthly: null,
    ratio: null,
    cities: null,
    trades: null
  }
};

/**
 * Check if the user is an authorized admin
 */
export function isUserAdmin(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  return email === ADMIN_EMAIL || user.role === 'admin' || user.userType === 'admin';
}

/**
 * Initialize the Admin Portal
 */
export async function initAdminDashboard() {
  const currentUser = getCurrentUser();
  const authSection = document.getElementById('adminAuthSection');
  const dashSection = document.getElementById('adminDashboardSection');

  if (!isUserAdmin(currentUser)) {
    // Show Admin Login View
    if (authSection) authSection.classList.remove('d-none');
    if (dashSection) dashSection.classList.add('d-none');
    setupAdminLoginForm();
    return;
  }

  // User is Admin: display dashboard
  if (authSection) authSection.classList.add('d-none');
  if (dashSection) dashSection.classList.remove('d-none');

  // Display admin details in header
  const adminEmailDisplay = document.getElementById('adminEmailDisplay');
  if (adminEmailDisplay) adminEmailDisplay.textContent = currentUser.email;

  // Bind top actions (Logout, Refresh)
  document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
    setCurrentUser(null);
    showToast('Admin logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
  });

  document.getElementById('refreshAdminDataBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshAdminDataBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refreshing...`;
    await loadAdminData();
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i> Refresh Data`;
    showToast('Admin data refreshed!', 'success');
  });

  // Load all data and render
  await loadAdminData();
  setupFilterListeners();
  setupModals();
}

/**
 * Setup Admin Login Form & One-Click Demo
 */
function setupAdminLoginForm() {
  const form = document.getElementById('adminLoginForm');
  const alertEl = document.getElementById('adminLoginAlert');
  const submitBtn = document.getElementById('adminLoginSubmitBtn');
  const spinner = document.getElementById('adminLoginSpinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alertEl) alertEl.classList.add('d-none');
    if (spinner) spinner.classList.remove('d-none');
    if (submitBtn) submitBtn.disabled = true;

    const email = document.getElementById('adminLoginEmail').value.trim();
    const password = document.getElementById('adminLoginPassword').value;

    if (email.toLowerCase() !== ADMIN_EMAIL) {
      if (spinner) spinner.classList.add('d-none');
      if (submitBtn) submitBtn.disabled = false;
      if (alertEl) {
        alertEl.textContent = `Access denied. Only the authorized administrator account (${ADMIN_EMAIL}) has access to this portal.`;
        alertEl.classList.remove('d-none');
      }
      return;
    }

    const result = await loginUser(email, password);

    if (spinner) spinner.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = false;

    if (result.success && isUserAdmin(result.user)) {
      showToast('Admin authenticated successfully!', 'success');
      setTimeout(() => {
        initAdminDashboard();
      }, 500);
    } else {
      if (alertEl) {
        alertEl.textContent = result.error || 'Authentication failed. Please verify credentials.';
        alertEl.classList.remove('d-none');
      }
    }
  });

  // One-click demo admin button
  document.getElementById('demoAdminQuickBtn')?.addEventListener('click', async () => {
    const emailInput = document.getElementById('adminLoginEmail');
    const passInput = document.getElementById('adminLoginPassword');
    if (emailInput) emailInput.value = ADMIN_EMAIL;
    if (passInput) passInput.value = 'Admin@12345';
    const result = await loginUser(ADMIN_EMAIL, 'Admin@12345');
    if (result.success) {
      showToast('Logged in as System Administrator!', 'success');
      setTimeout(() => {
        initAdminDashboard();
      }, 400);
    }
  });
}

/**
 * Load all collections and trigger renders
 */
export async function loadAdminData() {
  try {
    const [users, contractors, companies, workPostings, enquiries, applications, reviews] = await Promise.all([
      getCollection('users'),
      getCollection('contractors'),
      getCollection('companies'),
      getCollection('workPostings'),
      getCollection('enquiries'),
      getCollection('applications'),
      getCollection('reviews')
    ]);

    adminState.users = users;
    adminState.contractors = contractors;
    adminState.companies = companies;
    adminState.workPostings = workPostings;
    adminState.enquiries = enquiries;
    adminState.applications = applications;
    adminState.reviews = reviews;

    renderOverviewStats();
    renderAnalyticsCharts();
    renderRecentRegistrations();
    renderWorkPostingsTable();
    renderAdminReviewsTable();
  } catch (err) {
    console.error("Failed to load admin dataset:", err);
    showToast('Failed to load some admin data', 'error');
  }
}

/**
 * Requirement 2: Overview Statistics
 */
function renderOverviewStats() {
  const { users, contractors, companies, workPostings, enquiries } = adminState;

  // Contractor metrics
  const totalContractors = users.filter(u => u.userType === 'contractor').length;
  const verifiedContractors = users.filter(u => u.userType === 'contractor' && u.verified).length;

  // Company metrics
  const totalCompanies = users.filter(u => u.userType === 'company').length;
  const verifiedCompanies = users.filter(u => u.userType === 'company' && u.verified).length;

  // Work Postings metrics
  const totalWork = workPostings.length;
  const activeWork = workPostings.filter(p => p.status === 'active').length;

  // Enquiries metrics
  const totalEnquiries = enquiries.length;
  const pendingEnquiries = enquiries.filter(e => e.status === 'pending').length;

  // Set DOM text
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('statTotalContractors', totalContractors);
  setEl('statVerifiedContractors', `${verifiedContractors} verified`);

  setEl('statTotalCompanies', totalCompanies);
  setEl('statVerifiedCompanies', `${verifiedCompanies} verified`);

  setEl('statTotalWorkPostings', totalWork);
  setEl('statActiveWorkPostings', `${activeWork} active`);

  setEl('statTotalEnquiries', totalEnquiries);
  setEl('statPendingEnquiries', `${pendingEnquiries} pending action`);
}

/**
 * Requirement 7: Simple Analytics Charts (Chart.js)
 */
function renderAnalyticsCharts() {
  if (typeof window.Chart === 'undefined') {
    console.warn("Chart.js is not loaded yet.");
    return;
  }

  const { users, workPostings } = adminState;

  // Destroy previous charts if re-rendering
  Object.keys(adminState.charts).forEach(key => {
    if (adminState.charts[key]) {
      try {
        adminState.charts[key].destroy();
      } catch (e) {
        console.warn("Error destroying chart:", e);
      }
      adminState.charts[key] = null;
    }
  });

  // Chart 1: Registrations per month (bar chart)
  renderMonthlyRegistrationsChart(users);

  // Chart 2: Contractor vs Company ratio (pie chart)
  renderUserRatioChart(users);

  // Chart 3: Top 10 cities by registration (horizontal bar chart)
  renderTopCitiesChart(users);

  // Chart 4: Work postings by trade (doughnut chart)
  renderTradesDoughnutChart(workPostings);
}

/**
 * 7.1 Registrations per month (bar chart)
 */
function renderMonthlyRegistrationsChart(users) {
  const canvas = document.getElementById('chartRegistrationsMonthly');
  if (!canvas) return;

  // Group registrations by month (last 7 months)
  const monthNames = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'];
  const monthCounts = {
    'Oct 2025': 0,
    'Nov 2025': 0,
    'Dec 2025': 0,
    'Jan 2026': 0,
    'Feb 2026': 0,
    'Mar 2026': 0,
    'Apr 2026': 0
  };

  users.forEach(u => {
    if (!u.createdAt) return;
    const d = new Date(u.createdAt);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (monthCounts[key] !== undefined) {
      monthCounts[key]++;
    } else {
      // If outside the preset window, map to closest or latest
      const m = d.getMonth();
      if (m === 3) monthCounts['Apr 2026']++;
      else if (m === 2) monthCounts['Mar 2026']++;
      else if (m === 1) monthCounts['Feb 2026']++;
      else if (m === 0) monthCounts['Jan 2026']++;
      else monthCounts['Oct 2025']++;
    }
  });

  const labels = Object.keys(monthCounts);
  const data = Object.values(monthCounts);

  adminState.charts.monthly = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'New Registrations',
        data,
        backgroundColor: 'rgba(230, 81, 0, 0.85)',
        hoverBackgroundColor: '#e65100',
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#64748b' },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { color: '#64748b' },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * 7.2 Contractor vs Company ratio (pie chart)
 */
function renderUserRatioChart(users) {
  const canvas = document.getElementById('chartUserRatio');
  if (!canvas) return;

  const contractorsCount = users.filter(u => u.userType === 'contractor').length;
  const companiesCount = users.filter(u => u.userType === 'company').length;

  adminState.charts.ratio = new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['Contractors', 'EPC Companies'],
      datasets: [{
        data: [contractorsCount, companiesCount],
        backgroundColor: ['#e65100', '#1e40af'],
        hoverBackgroundColor: ['#f97316', '#2563eb'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 15,
            font: { size: 12, weight: '600' },
            color: '#334155'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = contractorsCount + companiesCount;
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return ` ${label}: ${value} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * 7.3 Top 10 cities by registration (horizontal bar)
 */
function renderTopCitiesChart(users) {
  const canvas = document.getElementById('chartTopCities');
  if (!canvas) return;

  const cityMap = {};
  users.forEach(u => {
    if (u.userType === 'admin') return;
    const city = (u.city || 'Pan India').trim();
    cityMap[city] = (cityMap[city] || 0) + 1;
  });

  const sortedCities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = sortedCities.map(item => item[0]);
  const data = sortedCities.map(item => item[1]);

  adminState.charts.cities = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Registrations',
        data,
        backgroundColor: 'rgba(30, 64, 175, 0.82)',
        hoverBackgroundColor: '#1e40af',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#0f172a' }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#64748b' },
          grid: { color: '#f1f5f9' }
        },
        y: {
          ticks: { color: '#334155', font: { weight: '600' } },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * 7.4 Work postings by trade (doughnut chart)
 */
function renderTradesDoughnutChart(workPostings) {
  const canvas = document.getElementById('chartTradesDoughnut');
  if (!canvas) return;

  const tradeMap = {};
  workPostings.forEach(p => {
    const trade = p.tradeRequired || 'General Civil';
    tradeMap[trade] = (tradeMap[trade] || 0) + 1;
  });

  const labels = Object.keys(tradeMap);
  const data = Object.values(tradeMap);
  const colors = [
    '#e65100', // Deep Orange
    '#0284c7', // Sky Blue
    '#16a34a', // Emerald Green
    '#d97706', // Amber
    '#7c3aed', // Purple
    '#dc2626', // Red
    '#059669', // Teal
    '#475569'  // Slate
  ];

  adminState.charts.trades = new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 12,
            font: { size: 11 },
            color: '#334155'
          }
        },
        tooltip: { backgroundColor: '#0f172a' }
      },
      cutout: '62%'
    }
  });
}

/**
 * Requirement 3: Recent Registrations Table (last 20 users)
 */
function renderRecentRegistrations() {
  const tbody = document.getElementById('recentRegistrationsTableBody');
  const countBadge = document.getElementById('registrationsCountBadge');
  if (!tbody) return;

  let users = [...adminState.users];

  // Exclude current admin from spam deletion self-harm, but keep in view or sort
  // Sort by date newest first
  users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Apply filters
  const typeFilter = document.getElementById('userTypeFilter')?.value || 'all';
  const searchQuery = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();

  let filtered = users.filter(u => {
    if (typeFilter !== 'all' && u.userType !== typeFilter) return false;
    if (searchQuery) {
      const matchName = (u.displayName || u.firmName || u.companyName || '').toLowerCase().includes(searchQuery);
      const matchEmail = (u.email || '').toLowerCase().includes(searchQuery);
      const matchCity = (u.city || '').toLowerCase().includes(searchQuery);
      const matchState = (u.state || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchEmail && !matchCity && !matchState) return false;
    }
    return true;
  });

  // Requirement: Last 20 users
  const displayUsers = filtered.slice(0, 20);

  if (countBadge) {
    countBadge.textContent = `${displayUsers.length} shown (of ${users.length})`;
  }

  if (displayUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
          No registrations match the selected criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = displayUsers.map(user => {
    const isContractor = user.userType === 'contractor';
    const isCompany = user.userType === 'company';
    const isAdmin = user.userType === 'admin';
    const isVerified = !!user.verified;
    const name = user.displayName || user.firmName || user.companyName || 'Anonymous';
    const city = user.city || '—';
    const state = user.state || '';
    const dateStr = user.createdAt 
      ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Recent';

    let typeBadge = `<span class="badge bg-secondary">User</span>`;
    if (isContractor) {
      typeBadge = `<span class="badge bg-warning text-dark"><i class="bi bi-hammer me-1"></i> Contractor</span>`;
    } else if (isCompany) {
      typeBadge = `<span class="badge bg-primary"><i class="bi bi-building me-1"></i> EPC Company</span>`;
    } else if (isAdmin) {
      typeBadge = `<span class="badge bg-danger"><i class="bi bi-shield-lock me-1"></i> Admin</span>`;
    }

    const verifiedBadge = isVerified
      ? `<span class="badge bg-success-subtle text-success border border-success-subtle py-1 px-2"><i class="bi bi-patch-check-fill me-1"></i> Verified</span>`
      : `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle py-1 px-2"><i class="bi bi-exclamation-circle me-1"></i> Unverified</span>`;

    return `
      <tr data-user-id="${user.uid}">
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="rounded-circle ${isContractor ? 'bg-orange-subtle text-orange' : isCompany ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'} d-flex align-items-center justify-content-center fw-bold" style="width: 36px; height: 36px;">
              ${name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="fw-bold text-dark">${name}</div>
              <div class="small text-muted">${user.email}</div>
            </div>
          </div>
        </td>
        <td>${typeBadge}</td>
        <td>
          <div class="small fw-semibold text-secondary">${city}${state ? `, ${state}` : ''}</div>
          <div class="small text-muted">${user.phone || 'No phone'}</div>
        </td>
        <td><span class="small text-muted">${dateStr}</span></td>
        <td>${verifiedBadge}</td>
        <td>
          <div class="btn-group btn-group-sm">
            ${!isAdmin ? `
              <button class="btn ${isVerified ? 'btn-outline-warning' : 'btn-outline-success'} toggle-verify-btn" 
                      data-uid="${user.uid}" 
                      data-current="${isVerified}"
                      title="${isVerified ? 'Unverify this user' : 'Verify this user'}">
                <i class="bi ${isVerified ? 'bi-x-circle' : 'bi-check2-circle'} me-1"></i>
                ${isVerified ? 'Unverify' : 'Verify'}
              </button>
              <button class="btn btn-outline-danger delete-user-btn" 
                      data-uid="${user.uid}" 
                      data-name="${name}"
                      title="Delete Spam Profile">
                <i class="bi bi-trash3"></i>
              </button>
            ` : `
              <span class="badge bg-light text-muted border py-1 px-2">Protected</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind verify/unverify toggle
  tbody.querySelectorAll('.toggle-verify-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const uid = e.currentTarget.getAttribute('data-uid');
      const current = e.currentTarget.getAttribute('data-current') === 'true';
      await toggleUserVerification(uid, !current);
    });
  });

  // Bind spam deletion
  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = e.currentTarget.getAttribute('data-uid');
      const name = e.currentTarget.getAttribute('data-name');
      promptDeleteUser(uid, name);
    });
  });
}

/**
 * Requirement 4: All Work Postings Table with Filters
 */
function renderWorkPostingsTable() {
  const tbody = document.getElementById('adminWorkPostingsTableBody');
  const countBadge = document.getElementById('workPostingsCountBadge');
  if (!tbody) return;

  const { workPostings } = adminState;
  const tradeFilter = document.getElementById('workTradeFilter')?.value || 'all';
  const statusFilter = document.getElementById('workStatusFilter')?.value || 'all';
  const searchKeyword = (document.getElementById('workSearchInput')?.value || '').toLowerCase().trim();

  let filtered = workPostings.filter(post => {
    if (tradeFilter !== 'all' && post.tradeRequired !== tradeFilter) return false;
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (searchKeyword) {
      const matchProject = (post.projectName || '').toLowerCase().includes(searchKeyword);
      const matchCompany = (post.companyName || '').toLowerCase().includes(searchKeyword);
      const matchCity = (post.city || '').toLowerCase().includes(searchKeyword);
      const matchScope = (post.scopeOfWork || '').toLowerCase().includes(searchKeyword);
      if (!matchProject && !matchCompany && !matchCity && !matchScope) return false;
    }
    return true;
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (countBadge) {
    countBadge.textContent = `${filtered.length} postings found`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-briefcase fs-3 d-block mb-2 text-secondary"></i>
          No work postings match the current filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(post => {
    const status = post.status || 'active';
    let statusBadge = `<span class="badge bg-success">Active</span>`;
    if (status === 'closed') statusBadge = `<span class="badge bg-secondary">Closed</span>`;
    else if (status === 'awarded') statusBadge = `<span class="badge bg-primary">Awarded</span>`;
    else if (status === 'draft') statusBadge = `<span class="badge bg-warning text-dark">Draft</span>`;

    const dateStr = post.createdAt 
      ? new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : '—';

    return `
      <tr data-post-id="${post.id}">
        <td>
          <div class="fw-bold text-dark text-truncate" style="max-width: 280px;" title="${post.projectName}">
            ${post.projectName}
          </div>
          <div class="small text-muted">
            <i class="bi bi-geo-alt me-1"></i>${post.city || 'Pan India'}, ${post.state || ''}
          </div>
        </td>
        <td>
          <div class="small fw-semibold text-primary">${post.companyName || 'EPC Partner'}</div>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${post.tradeRequired || 'Civil'}</span>
        </td>
        <td>
          <div class="fw-bold text-success small">${post.estimatedBudget || '₹ Negotiable'}</div>
          <div class="small text-muted">${post.duration || 'Flexible'}</div>
        </td>
        <td>
          <span class="badge rounded-pill bg-light text-dark border">
            <i class="bi bi-people me-1"></i> ${post.applicationsCount || 0}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary view-posting-btn" data-id="${post.id}" title="View Details">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-danger delete-posting-btn" data-id="${post.id}" data-name="${post.projectName}" title="Delete Spam Posting">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind view posting
  tbody.querySelectorAll('.view-posting-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      viewPostingDetails(id);
    });
  });

  // Bind delete spam posting
  tbody.querySelectorAll('.delete-posting-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      promptDeletePosting(id, name);
    });
  });
}

/**
 * Requirement 5: Ability to verify/unverify contractors and companies
 */
export async function toggleUserVerification(uid, newStatus) {
  try {
    // 1. Update user document
    await updateDocument('users', uid, { verified: newStatus });

    // 2. Also update contractors or companies collection if matching record exists
    const user = adminState.users.find(u => u.uid === uid);
    if (user) {
      if (user.userType === 'contractor') {
        await updateDocument('contractors', uid, { verified: newStatus });
      } else if (user.userType === 'company') {
        await updateDocument('companies', uid, { verified: newStatus });
      }
    }

    // Refresh state locally
    const target = adminState.users.find(u => u.uid === uid);
    if (target) target.verified = newStatus;

    showToast(`${target?.displayName || 'User'} is now ${newStatus ? 'Verified ✓' : 'Unverified'}`, 'success');
    renderOverviewStats();
    renderRecentRegistrations();
  } catch (err) {
    console.error("Failed to toggle verification:", err);
    showToast('Failed to update verification status', 'error');
  }
}

/**
 * Requirement 6: Ability to delete spam profiles or postings
 */
let targetDeleteUserUid = null;
let targetDeletePostingId = null;

function promptDeleteUser(uid, name) {
  targetDeleteUserUid = uid;
  const nameEl = document.getElementById('deleteUserNameSpan');
  if (nameEl) nameEl.textContent = name;
  const modalEl = document.getElementById('deleteUserConfirmModal');
  if (modalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function confirmDeleteUser() {
  if (!targetDeleteUserUid) return;

  try {
    const uid = targetDeleteUserUid;
    const user = adminState.users.find(u => u.uid === uid);

    // Delete from users collection
    await deleteDocument('users', uid);

    // If contractor or company, delete from respective collections as well
    if (user?.userType === 'contractor') {
      await deleteDocument('contractors', uid);
    } else if (user?.userType === 'company') {
      await deleteDocument('companies', uid);
    }

    // Update in-memory state
    adminState.users = adminState.users.filter(u => u.uid !== uid);
    adminState.contractors = adminState.contractors.filter(c => c.uid !== uid);
    adminState.companies = adminState.companies.filter(c => c.uid !== uid);

    showToast(`Spam profile deleted permanently`, 'success');

    // Close modal
    const modalEl = document.getElementById('deleteUserConfirmModal');
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    renderOverviewStats();
    renderAnalyticsCharts();
    renderRecentRegistrations();
  } catch (err) {
    console.error("Failed to delete user profile:", err);
    showToast('Failed to delete user profile', 'error');
  } finally {
    targetDeleteUserUid = null;
  }
}

function promptDeletePosting(postingId, projectName) {
  targetDeletePostingId = postingId;
  const nameEl = document.getElementById('deletePostingNameSpan');
  if (nameEl) nameEl.textContent = projectName;
  const modalEl = document.getElementById('deletePostingConfirmModal');
  if (modalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function confirmDeletePosting() {
  if (!targetDeletePostingId) return;

  try {
    const id = targetDeletePostingId;
    await deleteDocument('workPostings', id);

    // Update state
    adminState.workPostings = adminState.workPostings.filter(p => p.id !== id);

    showToast('Work posting removed permanently', 'success');

    // Close modal
    const modalEl = document.getElementById('deletePostingConfirmModal');
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    renderOverviewStats();
    renderAnalyticsCharts();
    renderWorkPostingsTable();
  } catch (err) {
    console.error("Failed to delete posting:", err);
    showToast('Failed to delete work posting', 'error');
  } finally {
    targetDeletePostingId = null;
  }
}

/**
 * View detailed work posting modal
 */
function viewPostingDetails(postingId) {
  const posting = adminState.workPostings.find(p => p.id === postingId);
  if (!posting) return;

  const titleEl = document.getElementById('viewPostingModalTitle');
  const bodyEl = document.getElementById('viewPostingModalBody');
  if (titleEl) titleEl.textContent = posting.projectName;

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded border">
            <div class="small text-muted fw-bold">EPC Company</div>
            <div class="fs-6 fw-bold text-primary">${posting.companyName}</div>
            <div class="small text-muted mt-2">Location: ${posting.projectLocation || posting.city}</div>
            <div class="small text-muted">Trade: <span class="badge bg-secondary">${posting.tradeRequired}</span></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 bg-light rounded border">
            <div class="small text-muted fw-bold">Commercials</div>
            <div class="fs-6 fw-bold text-success">${posting.estimatedBudget}</div>
            <div class="small text-muted mt-2">Duration: ${posting.duration}</div>
            <div class="small text-muted">Status: <span class="badge bg-success">${posting.status}</span></div>
          </div>
        </div>
        <div class="col-12">
          <h6 class="fw-bold text-dark mt-2">Scope of Work</h6>
          <p class="text-secondary small bg-white p-3 rounded border">${posting.scopeOfWork || 'No scope described.'}</p>
        </div>
        <div class="col-12">
          <div class="small text-muted">
            <strong>Machinery:</strong> ${posting.machineryRequired || 'None specified'}<br>
            <strong>Manpower:</strong> ${posting.manpowerRequired || 'Standard'}<br>
            <strong>Deadline:</strong> ${posting.applicationDeadline || 'Open'}
          </div>
        </div>
      </div>
    `;
  }

  const modalEl = document.getElementById('viewPostingDetailsModal');
  if (modalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
}

/**
 * Setup Event Listeners for Filters & Search Inputs
 */
function setupFilterListeners() {
  // Registrations search & type filter
  document.getElementById('userSearchInput')?.addEventListener('input', () => {
    renderRecentRegistrations();
  });
  document.getElementById('userTypeFilter')?.addEventListener('change', () => {
    renderRecentRegistrations();
  });

  // Work postings trade & status filter
  document.getElementById('workTradeFilter')?.addEventListener('change', () => {
    renderWorkPostingsTable();
  });
  document.getElementById('workStatusFilter')?.addEventListener('change', () => {
    renderWorkPostingsTable();
  });
  document.getElementById('workSearchInput')?.addEventListener('input', () => {
    renderWorkPostingsTable();
  });

  // Reviews search & rating filter
  document.getElementById('reviewSearchInput')?.addEventListener('input', () => {
    renderAdminReviewsTable();
  });
  document.getElementById('reviewRatingFilter')?.addEventListener('change', () => {
    renderAdminReviewsTable();
  });
}

/**
 * Setup Modal Confirmations
 */
function setupModals() {
  document.getElementById('confirmDeleteUserBtn')?.addEventListener('click', confirmDeleteUser);
  document.getElementById('confirmDeletePostingBtn')?.addEventListener('click', confirmDeletePosting);
  document.getElementById('confirmDeleteReviewBtn')?.addEventListener('click', confirmDeleteReview);
}

// Review deletion state
let targetDeleteReviewId = null;
let targetDeleteReviewTargetUid = null;
let targetDeleteReviewTargetType = null;

/**
 * Render Ratings & Reviews Moderation Table in Admin Portal
 */
function renderAdminReviewsTable() {
  const tbody = document.getElementById('adminReviewsTableBody');
  const countBadge = document.getElementById('adminReviewsCountBadge');
  if (!tbody) return;

  const searchVal = (document.getElementById('reviewSearchInput')?.value || '').toLowerCase().trim();
  const ratingFilter = document.getElementById('reviewRatingFilter')?.value || 'all';

  let filtered = [...adminState.reviews];

  if (searchVal) {
    filtered = filtered.filter(r => 
      (r.reviewerName || '').toLowerCase().includes(searchVal) ||
      (r.targetName || '').toLowerCase().includes(searchVal) ||
      (r.workPostingTitle || '').toLowerCase().includes(searchVal) ||
      (r.reviewText || '').toLowerCase().includes(searchVal)
    );
  }

  if (ratingFilter !== 'all') {
    const starTarget = Number(ratingFilter);
    filtered = filtered.filter(r => Math.round(Number(r.rating)) === starTarget);
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Reviews`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-star fs-3 d-block mb-1 text-muted"></i>
          No reviews found matching the current search or rating filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const dateFormatted = new Date(r.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const reviewerBadge = r.reviewerType === 'company' 
      ? '<span class="badge bg-primary-subtle text-primary border">EPC Company</span>' 
      : '<span class="badge bg-warning-subtle text-warning-emphasis border">Contractor</span>';

    const targetBadge = r.targetType === 'company'
      ? '<span class="badge bg-primary-subtle text-primary">Company</span>'
      : '<span class="badge bg-warning-subtle text-warning-emphasis">Contractor</span>';

    return `
      <tr>
        <td>
          <div class="fw-bold text-dark">${r.reviewerName}</div>
          <div class="small">${reviewerBadge}</div>
        </td>
        <td>
          <div class="fw-semibold text-primary">${r.targetName}</div>
          <div class="small text-muted">${targetBadge}</div>
        </td>
        <td>
          <div class="small text-secondary fw-semibold text-truncate" style="max-width: 180px;" title="${r.workPostingTitle || ''}">
            ${r.workPostingTitle || 'Completed Work'}
          </div>
          <div class="text-muted" style="font-size: 0.72rem;">Ref #${r.workPostingId}</div>
        </td>
        <td>
          ${renderStarRatingHtml(r.rating, true, null, 'small')}
        </td>
        <td>
          <div class="small text-secondary text-truncate" style="max-width: 250px;" title="${r.reviewText}">
            "${r.reviewText}"
          </div>
        </td>
        <td class="text-muted small">${dateFormatted}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger admin-delete-review-btn" 
            data-id="${r.id}" 
            data-target-uid="${r.targetUid}"
            data-target-type="${r.targetType}"
            data-author="${r.reviewerName}"
            title="Delete Spam Review">
            <i class="bi bi-trash3"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Delete buttons
  tbody.querySelectorAll('.admin-delete-review-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reviewId = e.currentTarget.getAttribute('data-id');
      const author = e.currentTarget.getAttribute('data-author');
      const targetUid = e.currentTarget.getAttribute('data-target-uid');
      const targetType = e.currentTarget.getAttribute('data-target-type');
      promptDeleteReview(reviewId, author, targetUid, targetType);
    });
  });
}

function promptDeleteReview(reviewId, author, targetUid, targetType) {
  targetDeleteReviewId = reviewId;
  targetDeleteReviewTargetUid = targetUid;
  targetDeleteReviewTargetType = targetType;

  const nameSpan = document.getElementById('deleteReviewAuthorSpan');
  if (nameSpan) nameSpan.textContent = author || 'Anonymous';

  const modalEl = document.getElementById('deleteReviewConfirmModal');
  if (modalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function confirmDeleteReview() {
  if (!targetDeleteReviewId) return;

  const btn = document.getElementById('confirmDeleteReviewBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Deleting...`;
  }

  try {
    await deleteDocument('reviews', targetDeleteReviewId);
    
    // Recalculate target profile's average rating
    if (targetDeleteReviewTargetUid && targetDeleteReviewTargetType) {
      await recalculateAndUpdateRating(targetDeleteReviewTargetUid, targetDeleteReviewTargetType);
    }

    showToast('Spam review deleted and target rating recalculated successfully!', 'success');

    const modalEl = document.getElementById('deleteReviewConfirmModal');
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    // Refresh dataset
    await loadAdminData();
  } catch (err) {
    console.error("Failed to delete review:", err);
    showToast('Failed to delete review', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-trash3 me-1"></i> Delete Review`;
    }
    targetDeleteReviewId = null;
    targetDeleteReviewTargetUid = null;
    targetDeleteReviewTargetType = null;
  }
}
