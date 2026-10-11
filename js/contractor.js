/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Contractor-Specific Logic: Dashboard Analytics, Applications Tracking, Profile Management
 */

import { getCurrentUser, getCollection, getDocument, updateDocument, openApplyModal, openEnquiryModal, showToast } from './common.js';
import { applyTranslations, translateStatus, translateTrade } from './i18n.js';
import { 
  renderReviewsSection, 
  renderStarRatingHtml, 
  openReviewModal, 
  getReviewsForUser, 
  calculateAverageRating 
} from './reviews.js';

// --- Initialize Contractor Dashboard ---
export async function initContractorDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  console.log("👷 Initializing Contractor Dashboard for:", user.displayName || user.firmName);

  // Load contractor profile
  const contractors = await getCollection('contractors');
  let contractor = contractors.find(c => c.uid === user.uid) || contractors[0];

  // 1. Update stats
  const applications = await getCollection('applications');
  const myApplications = applications.filter(a => a.contractorUid === user.uid || (contractor && a.contractorUid === contractor.uid));

  const enquiries = await getCollection('enquiries');
  const myEnquiries = enquiries.filter(e => e.toUid === user.uid || (contractor && e.toUid === contractor.uid));

  const viewsEl = document.getElementById('statProfileViews');
  if (viewsEl) viewsEl.textContent = contractor?.profileViews || 142;

  const enqEl = document.getElementById('statEnquiries');
  if (enqEl) enqEl.textContent = myEnquiries.length || contractor?.enquiriesReceived || 12;

  const appsEl = document.getElementById('statApplications');
  if (appsEl) appsEl.textContent = myApplications.length;

  const statusBadgeEl = document.getElementById('statProfileStatus');
  if (statusBadgeEl) {
    statusBadgeEl.innerHTML = `<span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-1">Verified & Active</span>`;
  }

  // 2. Render Matching Work Postings
  await renderMatchingWork(contractor?.trades || ["Civil", "Concrete", "Road/Highway"]);

  // 3. Render My Applications Table
  await renderMyApplications(myApplications);

  // 4. Render My Enquiries Table
  renderMyEnquiries(myEnquiries);

  // 5. Initialize Activity Chart
  initContractorChart();
}

// Render work postings matching contractor's trades
async function renderMatchingWork(trades = []) {
  const container = document.getElementById('matchingWorkContainer');
  if (!container) return;

  const postings = await getCollection('workPostings');
  const activePostings = postings.filter(p => p.status === 'active');

  // Filter if matching trade or take first 5
  let matched = activePostings.filter(p => trades.some(t => t.toLowerCase() === (p.tradeRequired || '').toLowerCase()));
  if (matched.length === 0) matched = activePostings.slice(0, 5);

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="empty-state text-center py-4">
        <i class="bi bi-briefcase text-muted fs-1 mb-2 d-block"></i>
        <h6 class="text-secondary">No matching work postings right now</h6>
        <p class="small text-muted">Check back later or browse all live requirements.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = matched.map(post => `
    <div class="col-md-6 col-xl-4">
      <div class="custom-card custom-card-hover h-100 d-flex flex-direction-column">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge-trade"><i class="bi bi-tools"></i> ${translateTrade(post.tradeRequired)}</span>
          <span class="badge badge-status active">${translateStatus('active')}</span>
        </div>
        <h6 class="fw-bold mb-1 text-primary text-truncate" title="${post.projectName}">${post.projectName}</h6>
        <div class="small text-secondary mb-2"><i class="bi bi-building me-1"></i> ${post.companyName}</div>
        
        <p class="small text-muted mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${post.scopeOfWork}
        </p>

        <div class="bg-light p-2 rounded mb-3 small">
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted"><i class="bi bi-cash me-1"></i> Budget:</span>
            <span class="fw-semibold text-primary">${post.estimatedBudget}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span class="text-muted"><i class="bi bi-geo-alt me-1"></i> Location:</span>
            <span class="fw-semibold">${post.city}, ${post.state}</span>
          </div>
        </div>

        <div class="d-flex gap-2 mt-auto">
          <button class="btn btn-sm btn-outline-primary flex-grow-1 apply-work-btn" 
            data-id="${post.id}" 
            data-project="${post.projectName}" 
            data-company="${post.companyName}"
            data-i18n="btn_apply_now">
            <i class="bi bi-send me-1"></i> Apply Now
          </button>
          <a href="browse-work.html?id=${post.id}" class="btn btn-sm btn-light border px-2" title="Details">
            <i class="bi bi-eye"></i>
          </a>
        </div>
      </div>
    </div>
  `).join('');

  applyTranslations(container);

  // Bind apply buttons
  container.querySelectorAll('.apply-work-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const postingId = e.currentTarget.getAttribute('data-id');
      const projectName = e.currentTarget.getAttribute('data-project');
      const companyName = e.currentTarget.getAttribute('data-company');
      openApplyModal({ postingId, projectName, companyName });
    });
  });
}

// Render contractor's sent applications
async function renderMyApplications(myApplications = []) {
  const tbody = document.getElementById('myApplicationsTableBody');
  if (!tbody) return;

  if (myApplications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-1"></i>
          You haven't submitted any applications yet. Explore <a href="browse-work.html">Browse Work</a> to apply!
        </td>
      </tr>
    `;
    return;
  }

  const postings = await getCollection('workPostings');

  tbody.innerHTML = myApplications.map(app => {
    const statusClass = app.status === 'awarded' || app.status === 'completed' ? 'bg-success text-white' :
                        app.status === 'shortlisted' ? 'bg-primary text-white' :
                        app.status === 'rejected' ? 'bg-danger text-white' :
                        'bg-warning text-dark';

    const post = postings.find(p => p.id === app.workPostingId || String(p.id) === String(app.workPostingId));
    const companyUid = post?.companyUid || 'company-201';
    const companyName = post?.companyName || 'EPC Enterprise';
    const projectName = post?.projectName || `Work Ref #${app.workPostingId}`;

    const canRate = app.status === 'completed' || app.status === 'awarded';

    return `
      <tr>
        <td>
          <div class="fw-semibold text-primary">${projectName}</div>
          <div class="small text-secondary"><i class="bi bi-building"></i> ${companyName}</div>
        </td>
        <td>${app.proposedBudget || 'Negotiable'}</td>
        <td>${app.proposedTimeline || 'Standard'}</td>
        <td><span class="badge ${statusClass} text-capitalize">${translateStatus(app.status)}</span></td>
        <td class="text-muted small">${new Date(app.createdAt).toLocaleDateString()}</td>
        <td>
          ${canRate ? `
            <button class="btn btn-sm btn-outline-warning text-dark fw-bold rate-company-btn" 
              data-posting-id="${app.workPostingId}" 
              data-company-uid="${companyUid}" 
              data-company-name="${companyName}"
              title="Rate & Review EPC Company">
              <i class="bi bi-star-fill text-warning"></i> Rate Company
            </button>
          ` : `
            <span class="text-muted small">—</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Bind Rate Company buttons (Requirement 3: Contractors rate companies after work completion)
  tbody.querySelectorAll('.rate-company-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const companyUid = e.currentTarget.getAttribute('data-company-uid');
      const companyName = e.currentTarget.getAttribute('data-company-name');
      const postingId = e.currentTarget.getAttribute('data-posting-id');

      openReviewModal({
        targetUid: companyUid,
        targetName: companyName,
        targetType: 'company',
        preselectedWorkPostingId: postingId,
        onReviewSubmitted: () => {
          initContractorDashboard();
        }
      });
    });
  });
}

// Render contractor's received enquiries
function renderMyEnquiries(myEnquiries = []) {
  const tbody = document.getElementById('myEnquiriesTableBody');
  if (!tbody) return;

  if (myEnquiries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="bi bi-envelope-open fs-3 d-block mb-1"></i>
          No enquiries received yet. Keep your machinery and profile updated to get noticed!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = myEnquiries.map(enq => `
    <tr>
      <td class="fw-semibold">${enq.fromName}</td>
      <td class="text-truncate" style="max-width: 200px;">${enq.subject}</td>
      <td class="text-muted small text-truncate" style="max-width: 250px;">${enq.message}</td>
      <td>
        <span class="badge ${enq.status === 'pending' ? 'bg-warning text-dark' : 'bg-success'} text-capitalize">
          ${translateStatus(enq.status)}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-secondary reply-enq-btn" 
          data-to-uid="${enq.fromUid}" 
          data-to-name="${enq.fromName}" 
          data-to-type="${enq.fromType}" 
          data-subject="Re: ${enq.subject}">
          <i class="bi bi-reply"></i> <span data-i18n="btn_reply">Reply</span>
        </button>
      </td>
    </tr>
  `).join('');
  applyTranslations(tbody);

  tbody.querySelectorAll('.reply-enq-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const toUid = e.currentTarget.getAttribute('data-to-uid');
      const toName = e.currentTarget.getAttribute('data-to-name');
      const toType = e.currentTarget.getAttribute('data-to-type');
      const defaultSubject = e.currentTarget.getAttribute('data-subject');
      openEnquiryModal({ toUid, toName, toType, defaultSubject });
    });
  });
}

// Chart.js Analytics for Contractor
function initContractorChart() {
  const ctx = document.getElementById('contractorActivityChart');
  if (!ctx || typeof Chart === 'undefined') return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      datasets: [
        {
          label: 'Profile Views',
          data: [25, 42, 68, 85, 110, 142],
          borderColor: '#1a365d',
          backgroundColor: 'rgba(26, 54, 93, 0.08)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Client Enquiries',
          data: [2, 5, 8, 11, 14, 18],
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230, 126, 34, 0.08)',
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// --- Render Public Contractor Profile ---
export async function renderContractorProfile(contractorId) {
  const contractors = await getCollection('contractors');
  const contractor = contractors.find(c => c.uid === contractorId || c.id === contractorId) || contractors[0];
  if (!contractor) {
    showToast('Contractor not found', 'error');
    return;
  }

  // Get live reviews & average rating (Requirement 5 & 8)
  const reviews = await getReviewsForUser(contractor.uid);
  const { average, totalCount } = calculateAverageRating(reviews);
  const activeRating = totalCount > 0 ? average : (contractor.rating || 4.8);
  const activeReviewCount = totalCount > 0 ? totalCount : (contractor.reviewCount || 0);

  // Populate basic header
  document.getElementById('profileFirmName').textContent = contractor.firmName;
  document.getElementById('profileOwnerName').textContent = `Proprietor: ${contractor.ownerName}`;
  document.getElementById('profileLocation').textContent = `${contractor.city}, ${contractor.state}`;
  document.getElementById('profileRating').textContent = activeRating.toFixed(1);
  document.getElementById('profileReviewsCount').textContent = `(${activeReviewCount} reviews)`;
  document.getElementById('profileExperience').textContent = `${contractor.yearsOfExperience} Years`;
  document.getElementById('profileProjectsCompleted').textContent = `${contractor.projectsCompleted || 24} Projects`;
  document.getElementById('profileLargestProject').textContent = contractor.largestProjectValue || '₹20 Cr+';
  document.getElementById('profileAboutUs').textContent = contractor.aboutUs || 'Dedicated engineering contractor delivering specialized work across India.';

  // Contact details
  const currentUser = getCurrentUser();
  const contactEl = document.getElementById('profileContactInfo');
  if (contactEl) {
    if (currentUser) {
      contactEl.innerHTML = `
        <div class="p-3 bg-light rounded border">
          <div class="mb-2"><i class="bi bi-telephone-fill text-success me-2"></i> <strong>Phone:</strong> ${contractor.phone}</div>
          <div class="mb-2"><i class="bi bi-envelope-fill text-primary me-2"></i> <strong>Email:</strong> ${contractor.email}</div>
          <div><i class="bi bi-geo-alt-fill text-danger me-2"></i> <strong>Address:</strong> ${contractor.address || contractor.city}</div>
        </div>
      `;
    } else {
      contactEl.innerHTML = `
        <div class="p-3 bg-light rounded border text-center">
          <i class="bi bi-lock-fill text-secondary fs-4 d-block mb-1"></i>
          <span class="small text-muted">Direct contact details are visible to logged-in companies.</span>
          <a href="login.html" class="btn btn-sm btn-outline-primary d-block mt-2">Login to View Phone & Email</a>
        </div>
      `;
    }
  }

  // Trades badges
  const tradesContainer = document.getElementById('profileTrades');
  if (tradesContainer) {
    tradesContainer.innerHTML = (contractor.trades || []).map(t => `
      <span class="badge-trade"><i class="bi bi-check-circle-fill text-success me-1"></i> ${translateTrade(t)}</span>
    `).join('');
  }

  // Machinery List
  const machContainer = document.getElementById('profileMachinery');
  if (machContainer) {
    machContainer.innerHTML = (contractor.machinery || []).map(m => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span><i class="bi bi-truck text-secondary me-2"></i> ${m.name}</span>
        <span class="badge bg-primary rounded-pill">${m.quantity} Unit(s)</span>
      </li>
    `).join('') || '<li class="list-group-item text-muted">No machinery listed</li>';
  }

  // Manpower
  if (document.getElementById('profileWorkers')) document.getElementById('profileWorkers').textContent = contractor.totalWorkers || 0;
  if (document.getElementById('profileSupervisors')) document.getElementById('profileSupervisors').textContent = contractor.supervisors || 0;
  if (document.getElementById('profileEngineers')) document.getElementById('profileEngineers').textContent = contractor.engineers || 0;

  // Certifications
  const certContainer = document.getElementById('profileCertifications');
  if (certContainer) {
    certContainer.innerHTML = (contractor.certifications || []).map(c => `
      <span class="badge bg-secondary-subtle text-dark border p-2 me-2 mb-2 d-inline-flex align-items-center">
        <i class="bi bi-award-fill text-warning me-1"></i> ${c}
      </span>
    `).join('') || '<span class="text-muted small">No verified certifications uploaded</span>';
  }

  // Past Projects
  const pastProjContainer = document.getElementById('profilePastProjects');
  if (pastProjContainer) {
    pastProjContainer.innerHTML = (contractor.pastProjects || []).map(p => `
      <div class="col-md-6 mb-3">
        <div class="card h-100 border p-3">
          <h6 class="fw-bold text-primary mb-1">${p.projectName}</h6>
          <div class="small text-muted mb-2"><i class="bi bi-building"></i> Client: ${p.clientName} | Year: ${p.completionYear}</div>
          <div class="small text-success fw-semibold mb-2">Value: ${p.projectValue}</div>
          <p class="small text-secondary mb-0">${p.description}</p>
        </div>
      </div>
    `).join('') || '<div class="col-12 text-muted">No past project details added yet.</div>';
  }

  // Bind Enquiry Button
  const sendEnqBtn = document.getElementById('profileSendEnquiryBtn');
  if (sendEnqBtn) {
    sendEnqBtn.addEventListener('click', () => {
      openEnquiryModal({
        toUid: contractor.uid,
        toName: contractor.firmName,
        toType: 'contractor',
        defaultSubject: `Requirement enquiry for ${contractor.trades?.[0] || 'subcontracting'}`
      });
    });
  }

  // Render Dedicated Reviews & Ratings Section (Requirement 6)
  await renderReviewsSection('contractorReviewsSection', contractor.uid, 'contractor', contractor.firmName);
}
