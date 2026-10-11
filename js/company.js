/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Company-Specific Logic: Work Requirement Posting, Applications Review & Shortlisting
 */

import { getCurrentUser, getCollection, getDocument, addDocument, updateDocument, openEnquiryModal, showToast, createNotification } from './common.js';
import { applyTranslations, translateStatus, translateTrade } from './i18n.js';
import { openReviewModal } from './reviews.js';

// --- Initialize Company Dashboard ---
export async function initCompanyDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  console.log("🏢 Initializing Company Dashboard for:", user.displayName || user.companyName);

  const companies = await getCollection('companies');
  let company = companies.find(c => c.uid === user.uid) || companies[0];

  const allPostings = await getCollection('workPostings');
  const myPostings = allPostings.filter(p => p.companyUid === user.uid || (company && p.companyUid === company.uid));

  const allApplications = await getCollection('applications');
  const myPostingIds = myPostings.map(p => p.id);
  const receivedApplications = allApplications.filter(a => myPostingIds.includes(a.workPostingId));
  const shortlistedApps = receivedApplications.filter(a => a.status === 'shortlisted' || a.status === 'awarded');

  // Stats
  if (document.getElementById('statActivePostings')) {
    document.getElementById('statActivePostings').textContent = myPostings.filter(p => p.status === 'active').length;
  }
  if (document.getElementById('statTotalApplications')) {
    document.getElementById('statTotalApplications').textContent = receivedApplications.length;
  }
  if (document.getElementById('statShortlistedCount')) {
    document.getElementById('statShortlistedCount').textContent = shortlistedApps.length;
  }
  if (document.getElementById('statProfileStatus')) {
    document.getElementById('statProfileStatus').innerHTML = `<span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-1">Verified EPC Company</span>`;
  }

  // Render My Work Postings
  renderCompanyPostings(myPostings);

  // Render Recent Applications
  renderReceivedApplications(receivedApplications, myPostings);

  // Render Shortlisted Contractors
  renderShortlistedContractors(shortlistedApps);

  // Chart
  initCompanyChart();

  window.addEventListener('languageChanged', () => {
    renderCompanyPostings(myPostings);
    renderReceivedApplications(receivedApplications, myPostings);
  });
}

// Render company's own postings
function renderCompanyPostings(postings = []) {
  const container = document.getElementById('myPostingsContainer');
  if (!container) return;

  if (postings.length === 0) {
    container.innerHTML = `
      <div class="empty-state text-center py-4">
        <i class="bi bi-file-earmark-plus text-muted fs-1 mb-2 d-block"></i>
        <h6 class="text-secondary">You haven't posted any work requirements yet</h6>
        <p class="small text-muted">Post your first requirement to receive bids from pre-qualified contractors.</p>
        <a href="post-work.html" class="btn btn-orange btn-sm mt-2" data-i18n="btn_post_new_work"><i class="bi bi-plus-lg me-1"></i> Post New Work</a>
      </div>
    `;
    applyTranslations(container);
    return;
  }

  container.innerHTML = postings.map(post => `
    <div class="card mb-3 border custom-card-hover">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <span class="badge-trade"><i class="bi bi-cone me-1"></i> ${translateTrade(post.tradeRequired)}</span>
            <span class="badge badge-status ${post.status === 'active' ? 'active' : 'closed'} ms-2">${translateStatus(post.status)}</span>
          </div>
          <span class="badge bg-primary rounded-pill px-3 py-2">
            <i class="bi bi-people-fill me-1"></i> ${post.applicationsCount || 0} Bids
          </span>
        </div>
        <h5 class="fw-bold text-primary mb-1">${post.projectName}</h5>
        <div class="small text-secondary mb-2">
          <i class="bi bi-geo-alt me-1 text-danger"></i> ${post.city}, ${post.state} | 
          <i class="bi bi-clock me-1 text-warning"></i> Duration: ${post.duration} | 
          <i class="bi bi-cash me-1 text-success"></i> Budget: ${post.estimatedBudget}
        </div>
        <p class="small text-muted mb-3">${post.scopeOfWork}</p>
        <div class="d-flex justify-content-between align-items-center pt-2 border-top">
          <span class="small text-muted">Deadline: ${new Date(post.applicationDeadline).toLocaleDateString()}</span>
          <div class="d-flex gap-2">
            <a href="browse-work.html?id=${post.id}" class="btn btn-sm btn-outline-secondary" data-i18n="btn_public_preview">Public Preview</a>
            <button class="btn btn-sm btn-primary-custom filter-posting-apps-btn" data-posting-id="${post.id}" data-i18n="btn_view_applications">
              <i class="bi bi-list-check me-1"></i> View Applications
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  applyTranslations(container);

  container.querySelectorAll('.filter-posting-apps-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const postingId = e.currentTarget.getAttribute('data-posting-id');
      const target = document.getElementById('recentApplicationsSection');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        showToast(`Filtered applications for #${postingId}`, 'info');
      }
    });
  });
}

// Render received contractor applications
function renderReceivedApplications(applications = [], postings = []) {
  const tbody = document.getElementById('receivedApplicationsTableBody');
  if (!tbody) return;

  if (applications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          <i class="bi bi-folder2-open fs-3 d-block mb-1"></i>
          No applications received yet for your projects.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = applications.map(app => {
    const matchedPosting = postings.find(p => p.id === app.workPostingId);
    const badgeClass = app.status === 'awarded' ? 'bg-success text-white' :
                       app.status === 'shortlisted' ? 'bg-primary text-white' :
                       app.status === 'rejected' ? 'bg-danger text-white' : 'bg-warning text-dark';

    return `
      <tr>
        <td>
          <div class="fw-bold text-primary">${app.contractorFirmName}</div>
          <div class="small text-muted">${app.contractorName}</div>
        </td>
        <td>
          <div class="small fw-semibold text-truncate" style="max-width: 180px;">${matchedPosting?.projectName || 'Project #' + app.workPostingId}</div>
          <span class="badge-trade" style="font-size: 0.7rem;">${matchedPosting?.tradeRequired || 'Contractor'}</span>
        </td>
        <td>
          <div class="fw-semibold text-success">${app.proposedBudget || 'Negotiable'}</div>
          <div class="small text-muted">${app.proposedTimeline || 'Standard'}</div>
        </td>
        <td>
          <span class="badge ${badgeClass} text-capitalize">${translateStatus(app.status)}</span>
        </td>
        <td class="small text-muted" style="max-width: 200px;">
          <div class="text-truncate" title="${app.coverMessage}">${app.coverMessage}</div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-1 flex-wrap">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-success action-status-btn" data-id="${app.id}" data-status="shortlisted" title="Shortlist">
                <i class="bi bi-star"></i>
              </button>
              <button class="btn btn-outline-primary action-status-btn" data-id="${app.id}" data-status="awarded" title="Award">
                <i class="bi bi-trophy"></i>
              </button>
              ${app.status === 'awarded' ? `
                <button class="btn btn-outline-info action-status-btn" data-id="${app.id}" data-status="completed" title="Mark Completed">
                  <i class="bi bi-check2-circle"></i>
                </button>
              ` : ''}
              <button class="btn btn-outline-danger action-status-btn" data-id="${app.id}" data-status="rejected" title="Reject">
                <i class="bi bi-x"></i>
              </button>
              <a href="profile-contractor.html?id=${app.contractorUid}" class="btn btn-outline-secondary" title="View Profile">
                <i class="bi bi-person"></i>
              </a>
            </div>
            ${(app.status === 'completed' || app.status === 'awarded') ? `
              <button class="btn btn-sm btn-warning text-dark fw-bold rate-contractor-btn ms-1" 
                data-contractor-uid="${app.contractorUid}" 
                data-contractor-name="${app.contractorFirmName || app.contractorName}" 
                data-posting-id="${app.workPostingId}" 
                title="Rate & Review Contractor">
                <i class="bi bi-star-fill text-dark"></i> Rate
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind actions
  tbody.querySelectorAll('.action-status-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const appId = e.currentTarget.getAttribute('data-id');
      const newStatus = e.currentTarget.getAttribute('data-status');
      try {
        await updateDocument('applications', appId, { status: newStatus });

        // Requirement 4: When an application status changes → notify the contractor
        const application = await getDocument('applications', appId);
        if (application && application.contractorUid) {
          const posting = await getDocument('workPostings', application.workPostingId);
          const projectName = posting?.projectName || `Project #${application.workPostingId}`;
          const companyName = user.companyName || user.displayName || 'EPC Partner';

          let notifTitle = 'Application Status Updated';
          let notifIcon = 'bi-info-circle-fill text-info';
          let notifMessage = `Your application for "${projectName}" has been updated to "${newStatus}".`;

          if (newStatus === 'shortlisted') {
            notifTitle = 'Application Shortlisted ⭐';
            notifIcon = 'bi-star-fill text-primary';
            notifMessage = `Congratulations! Your bid for "${projectName}" has been shortlisted by ${companyName}.`;
          } else if (newStatus === 'awarded') {
            notifTitle = 'Work Package Awarded! 🏆';
            notifIcon = 'bi-trophy-fill text-success';
            notifMessage = `Great milestone! You have been awarded the work package for "${projectName}" by ${companyName}!`;
          } else if (newStatus === 'completed') {
            notifTitle = 'Work Package Completed! 🎉';
            notifIcon = 'bi-check-circle-fill text-success';
            notifMessage = `Your project work for "${projectName}" has been marked completed by ${companyName}. You can now exchange ratings and reviews!`;
          } else if (newStatus === 'rejected') {
            notifTitle = 'Application Update';
            notifIcon = 'bi-x-circle-fill text-danger';
            notifMessage = `Your application for "${projectName}" was not selected by ${companyName}.`;
          }

          await createNotification({
            recipientUid: application.contractorUid,
            senderUid: user.uid,
            senderName: companyName,
            type: 'status_change',
            title: notifTitle,
            message: notifMessage,
            icon: notifIcon,
            link: 'dashboard-contractor.html#myApplicationsTableBody',
            metadata: {
              applicationId: appId,
              workPostingId: application.workPostingId,
              status: newStatus
            }
          });
        }

        showToast(`Application status updated to "${newStatus}"! Contractor has been notified.`, 'success');
        initCompanyDashboard();
      } catch (err) {
        console.error("Failed to update application status:", err);
        showToast('Failed to update status', 'error');
      }
    });
  });

  // Bind Rate Contractor buttons (Requirement 2: Companies rate contractors after work completion)
  tbody.querySelectorAll('.rate-contractor-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const contractorUid = e.currentTarget.getAttribute('data-contractor-uid');
      const contractorName = e.currentTarget.getAttribute('data-contractor-name');
      const postingId = e.currentTarget.getAttribute('data-posting-id');

      openReviewModal({
        targetUid: contractorUid,
        targetName: contractorName,
        targetType: 'contractor',
        preselectedWorkPostingId: postingId,
        onReviewSubmitted: () => {
          initCompanyDashboard();
        }
      });
    });
  });
}

// Render Shortlisted Contractors
function renderShortlistedContractors(shortlisted = []) {
  const container = document.getElementById('shortlistedContractorsContainer');
  if (!container) return;

  if (shortlisted.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-muted border rounded bg-white">
        No shortlisted contractors yet. Click the star icon on any application to shortlist them.
      </div>
    `;
    return;
  }

  container.innerHTML = shortlisted.map(item => `
    <div class="col-md-6 mb-3">
      <div class="p-3 bg-white border rounded d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold text-primary">${item.contractorFirmName}</div>
          <div class="small text-muted"><i class="bi bi-clock me-1"></i> ${item.proposedTimeline} | Quote: ${item.proposedBudget}</div>
          <span class="badge bg-success-subtle text-success border mt-1 text-capitalize">${item.status}</span>
        </div>
        <div class="d-flex gap-2">
          <a href="profile-contractor.html?id=${item.contractorUid}" class="btn btn-sm btn-outline-primary">Profile</a>
          <button class="btn btn-sm btn-orange contact-shortlist-btn" 
            data-to-uid="${item.contractorUid}" 
            data-to-name="${item.contractorFirmName}">
            <i class="bi bi-envelope"></i> Message
          </button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.contact-shortlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const toUid = e.currentTarget.getAttribute('data-to-uid');
      const toName = e.currentTarget.getAttribute('data-to-name');
      openEnquiryModal({
        toUid,
        toName,
        toType: 'contractor',
        defaultSubject: 'Work order discussion / Negotiation'
      });
    });
  });
}

// Chart.js Analytics for Company
function initCompanyChart() {
  const ctx = document.getElementById('companyActivityChart');
  if (!ctx || typeof Chart === 'undefined') return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Project Alpha', 'Highway Embankment', 'Tech Park MEP', 'Warehouse PEB', 'Metro Viaduct'],
      datasets: [
        {
          label: 'Total Contractor Applications',
          data: [12, 19, 7, 14, 22],
          backgroundColor: '#1a365d',
          borderRadius: 6
        },
        {
          label: 'Shortlisted Contractors',
          data: [3, 5, 2, 4, 6],
          backgroundColor: '#e67e22',
          borderRadius: 6
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

// --- Submit Work Posting Form ---
export async function submitWorkPosting(formData) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login as a company to post work requirements.', 'warning');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  const posting = {
    companyUid: user.uid,
    companyName: user.companyName || user.displayName || 'EPC Partner',
    projectName: formData.projectName,
    projectLocation: formData.projectLocation,
    city: formData.city,
    state: formData.state,
    tradeRequired: formData.tradeRequired,
    scopeOfWork: formData.scopeOfWork,
    estimatedBudget: formData.estimatedBudget,
    startDate: formData.startDate,
    duration: formData.duration,
    minExperience: Number(formData.minExperience) || 3,
    machineryRequired: formData.machineryRequired || '',
    certificationsRequired: formData.certificationsRequired || [],
    manpowerRequired: formData.manpowerRequired || '',
    applicationDeadline: formData.applicationDeadline,
    status: 'active',
    applicationsCount: 0,
    createdAt: new Date().toISOString()
  };

  try {
    const saved = await addDocument('workPostings', posting);
    showToast('Work requirement posted successfully!', 'success');
    return { success: true, posting: saved };
  } catch (err) {
    console.error("Failed to post work:", err);
    showToast('Failed to post work. Please try again.', 'error');
    return { success: false, error: err.message };
  }
}
