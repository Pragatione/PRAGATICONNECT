/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Ratings & Reviews Controller
 * 
 * Requirements:
 * 1. Create a `reviews` collection in Firestore
 * 2. Companies can rate contractors (1-5 stars) after work completion
 * 3. Contractors can rate companies (1-5 stars) after work completion
 * 4. Review includes: rating (stars), review text, reviewer name, date
 * 5. Show average rating with star icons on profile cards and profile pages
 * 6. Show all reviews on the profile page in a dedicated section
 * 7. One user can only review another user once per work posting
 * 8. Calculate and update average rating in the contractor/company document
 */

import { auth, db, isFirebaseLive } from './firebase-config.js';
import { 
  getCurrentUser, 
  getCollection, 
  getDocument, 
  addDocument, 
  updateDocument, 
  showToast,
  createNotification
} from './common.js';

const COLLECTION_REVIEWS = 'reviews';

/**
 * Return star icons HTML for a given rating score (1 to 5)
 */
export function renderStarRatingHtml(rating, showScore = true, count = null, sizeClass = '') {
  const num = typeof rating === 'number' ? rating : parseFloat(rating) || 0;
  const fullStars = Math.floor(num);
  const hasHalf = (num - fullStars) >= 0.3 && (num - fullStars) <= 0.7;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0));

  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) {
    starsHtml += `<i class="bi bi-star-fill text-warning ${sizeClass}"></i>`;
  }
  if (hasHalf) {
    starsHtml += `<i class="bi bi-star-half text-warning ${sizeClass}"></i>`;
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += `<i class="bi bi-star text-warning ${sizeClass}"></i>`;
  }

  let textHtml = '';
  if (showScore) {
    textHtml += `<span class="fw-bold text-dark ms-1">${num > 0 ? num.toFixed(1) : 'New'}</span>`;
  }
  if (count !== null && count !== undefined) {
    textHtml += `<span class="text-muted small ms-1">(${count} ${count === 1 ? 'review' : 'reviews'})</span>`;
  }

  return `<span class="d-inline-flex align-items-center gap-1 rating-stars-badge">${starsHtml}${textHtml}</span>`;
}

/**
 * Get all reviews written for a specific contractor or company
 */
export async function getReviewsForUser(targetUid) {
  if (!targetUid) return [];
  const allReviews = await getCollection(COLLECTION_REVIEWS);
  return allReviews
    .filter(r => r.targetUid === targetUid)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Calculate average rating and star breakdown from an array of review documents
 */
export function calculateAverageRating(reviews = []) {
  if (!reviews || reviews.length === 0) {
    return {
      average: 0,
      totalCount: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;

  reviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
    sum += Number(r.rating) || 5;
  });

  const totalCount = reviews.length;
  const average = Number((sum / totalCount).toFixed(1));
  const percentages = {};
  for (let s = 1; s <= 5; s++) {
    percentages[s] = Math.round((distribution[s] / totalCount) * 100);
  }

  return { average, totalCount, distribution, percentages };
}

/**
 * Recalculate average rating for a target and update contractor/company & users documents
 */
export async function recalculateAndUpdateRating(targetUid, targetType) {
  if (!targetUid) return null;

  const reviews = await getReviewsForUser(targetUid);
  const { average, totalCount } = calculateAverageRating(reviews);

  const updateFields = {
    rating: average > 0 ? average : 5.0,
    reviewCount: totalCount
  };

  const collectionName = targetType === 'company' ? 'companies' : 'contractors';
  try {
    await updateDocument(collectionName, targetUid, updateFields);
    // Also sync users doc if present
    await updateDocument('users', targetUid, updateFields);
  } catch (err) {
    console.warn(`Could not update rating in ${collectionName}:`, err);
  }

  console.log(`⭐ Updated rating for ${targetUid} (${collectionName}):`, updateFields);
  return { average, totalCount };
}

/**
 * Check if the reviewer has already reviewed the target user for this work posting
 * (Requirement 7: One user can only review another user once per work posting)
 */
export async function hasUserReviewedWork(reviewerUid, targetUid, workPostingId) {
  if (!reviewerUid || !targetUid || !workPostingId) return false;
  const reviews = await getCollection(COLLECTION_REVIEWS);
  return reviews.some(r => 
    r.reviewerUid === reviewerUid && 
    r.targetUid === targetUid && 
    String(r.workPostingId) === String(workPostingId)
  );
}

/**
 * Find work postings where the reviewer and target have worked together
 * (status is awarded or completed)
 */
export async function getEligiblePostingsForReview(reviewer, targetUid) {
  if (!reviewer || !targetUid) return [];

  const [applications, postings] = await Promise.all([
    getCollection('applications'),
    getCollection('workPostings')
  ]);

  const eligible = [];

  if (reviewer.userType === 'company') {
    // Reviewer is company, target is contractor
    const companyPostings = postings.filter(p => p.companyUid === reviewer.uid);
    const postingIds = companyPostings.map(p => p.id || p.uid);

    applications
      .filter(a => 
        a.contractorUid === targetUid && 
        postingIds.includes(a.workPostingId) && 
        (a.status === 'completed' || a.status === 'awarded')
      )
      .forEach(a => {
        const post = postings.find(p => (p.id || p.uid) === a.workPostingId);
        eligible.push({
          workPostingId: a.workPostingId,
          projectName: post?.projectName || `Project #${a.workPostingId}`,
          status: a.status,
          applicationId: a.id
        });
      });
  } else {
    // Reviewer is contractor, target is company
    applications
      .filter(a => 
        a.contractorUid === reviewer.uid && 
        (a.status === 'completed' || a.status === 'awarded')
      )
      .forEach(a => {
        const post = postings.find(p => (p.id || p.uid) === a.workPostingId);
        if (post && post.companyUid === targetUid) {
          eligible.push({
            workPostingId: a.workPostingId,
            projectName: post.projectName || `Project #${a.workPostingId}`,
            status: a.status,
            applicationId: a.id
          });
        }
      });
  }

  // Deduplicate by workPostingId
  const uniqueMap = new Map();
  eligible.forEach(item => {
    if (!uniqueMap.has(item.workPostingId)) {
      uniqueMap.set(item.workPostingId, item);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Create a new review
 */
export async function createReview({
  workPostingId,
  workPostingTitle,
  reviewerUid,
  reviewerName,
  reviewerType,
  targetUid,
  targetName,
  targetType,
  rating,
  reviewText
}) {
  if (!reviewerUid || !targetUid) {
    throw new Error('Reviewer and target are required.');
  }

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    throw new Error('Rating must be between 1 and 5 stars.');
  }

  if (!reviewText || reviewText.trim().length < 5) {
    throw new Error('Please provide constructive review comments (at least 5 characters).');
  }

  if (!workPostingId) {
    throw new Error('A valid completed or awarded work posting must be associated with the review.');
  }

  // Check requirement 7: One review per work posting
  const alreadyReviewed = await hasUserReviewedWork(reviewerUid, targetUid, workPostingId);
  if (alreadyReviewed) {
    throw new Error('You have already submitted a review for this project. Only one review per work posting is allowed.');
  }

  const reviewDoc = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    workPostingId: String(workPostingId),
    workPostingTitle: workPostingTitle || `Project #${workPostingId}`,
    reviewerUid,
    reviewerName: reviewerName || 'Verified Partner',
    reviewerType: reviewerType || 'contractor',
    targetUid,
    targetName: targetName || 'Partner',
    targetType: targetType || 'contractor',
    rating: Math.round(numRating),
    reviewText: reviewText.trim(),
    createdAt: new Date().toISOString()
  };

  // 1. Add to reviews collection (Firestore & LocalStorage)
  const saved = await addDocument(COLLECTION_REVIEWS, reviewDoc);

  // 2. Recalculate average rating for the target contractor/company
  await recalculateAndUpdateRating(targetUid, targetType);

  // 3. Notify the target user about the new review
  try {
    await createNotification({
      recipientUid: targetUid,
      senderUid: reviewerUid,
      senderName: reviewerName,
      type: 'review_received',
      title: 'New Review & Rating Received ⭐',
      message: `${reviewerName} gave you a ${Math.round(numRating)}-star review for "${workPostingTitle || 'Completed Work'}".`,
      icon: 'bi-star-fill text-warning',
      link: targetType === 'contractor' ? `profile-contractor.html?id=${targetUid}` : `profile-company.html?id=${targetUid}`,
      metadata: {
        reviewId: saved.id,
        workPostingId,
        rating: Math.round(numRating)
      }
    });
  } catch (err) {
    console.warn('Could not send notification for review:', err);
  }

  return saved;
}

/**
 * Universal Modal for writing a review
 */
let modalInitialized = false;

export function setupReviewModal() {
  if (document.getElementById('reviewModal')) return;

  const modalHtml = `
    <div class="modal fade" id="reviewModal" tabindex="-1" aria-labelledby="reviewModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4">
          <div class="modal-header bg-dark text-white border-bottom-0 pb-3">
            <div>
              <h5 class="modal-title fw-bold text-white d-flex align-items-center gap-2" id="reviewModalLabel">
                <i class="bi bi-star-fill text-warning"></i> <span>Rate & Review Partner</span>
              </h5>
              <div class="small text-light-emphasis" id="reviewModalSub">Share verified performance feedback</div>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <form id="reviewModalForm">
            <div class="modal-body p-4">
              <!-- Target Banner -->
              <div class="p-3 bg-light rounded-3 border mb-3 d-flex align-items-center justify-content-between">
                <div>
                  <div class="small text-muted" id="reviewModalRoleLabel">Reviewing:</div>
                  <h6 class="fw-bold mb-0 text-primary" id="reviewModalTargetName">Target Name</h6>
                </div>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2" id="reviewModalRoleBadge">
                  Subcontractor
                </span>
              </div>

              <!-- Work Posting Selection -->
              <div class="mb-3">
                <label for="reviewWorkPostingSelect" class="form-label fw-semibold small text-secondary">
                  Associated Completed Work Package <span class="text-danger">*</span>
                </label>
                <select class="form-select" id="reviewWorkPostingSelect" required>
                  <option value="" disabled selected>Select completed or awarded package...</option>
                </select>
                <div class="form-text small" id="reviewPostingHelper">
                  <i class="bi bi-info-circle me-1"></i> Reviews are linked to completed projects. One review per package.
                </div>
              </div>

              <!-- Interactive Star Rating -->
              <div class="mb-3 text-center py-2 bg-light-subtle rounded-3 border">
                <label class="form-label fw-semibold small text-secondary d-block mb-1">
                  Overall Rating <span class="text-danger">*</span>
                </label>
                <div class="d-inline-flex align-items-center gap-2 star-picker-group" id="starPickerGroup">
                  <button type="button" class="btn btn-link p-1 text-warning star-btn fs-2 text-decoration-none" data-rating="1" title="1 Star - Poor">
                    <i class="bi bi-star"></i>
                  </button>
                  <button type="button" class="btn btn-link p-1 text-warning star-btn fs-2 text-decoration-none" data-rating="2" title="2 Stars - Fair">
                    <i class="bi bi-star"></i>
                  </button>
                  <button type="button" class="btn btn-link p-1 text-warning star-btn fs-2 text-decoration-none" data-rating="3" title="3 Stars - Good">
                    <i class="bi bi-star"></i>
                  </button>
                  <button type="button" class="btn btn-link p-1 text-warning star-btn fs-2 text-decoration-none" data-rating="4" title="4 Stars - Very Good">
                    <i class="bi bi-star"></i>
                  </button>
                  <button type="button" class="btn btn-link p-1 text-warning star-btn fs-2 text-decoration-none" data-rating="5" title="5 Stars - Excellent">
                    <i class="bi bi-star"></i>
                  </button>
                </div>
                <div class="fw-bold mt-1 text-primary small" id="starRatingLabel">Click to rate (1 to 5 Stars)</div>
                <input type="hidden" id="selectedStarRating" value="5" required>
              </div>

              <!-- Review Text Area -->
              <div class="mb-3">
                <label for="reviewCommentText" class="form-label fw-semibold small text-secondary">
                  Detailed Review & Feedback <span class="text-danger">*</span>
                </label>
                <textarea class="form-control" id="reviewCommentText" rows="4" 
                  placeholder="Describe project delivery, work quality, machinery uptime, safety adherence, on-time payments, or milestone coordination..." 
                  minlength="5" required></textarea>
                <div class="form-text small text-muted">Minimum 5 characters. Be specific and professional.</div>
              </div>

              <div id="reviewModalAlert" class="alert alert-danger d-none small py-2 mb-0" role="alert"></div>
            </div>

            <div class="modal-footer bg-light border-top-0 pt-0 px-4 pb-4">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-orange px-4 fw-bold" id="reviewSubmitBtn">
                <i class="bi bi-send-fill me-1"></i> Submit Verified Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  document.body.appendChild(container);

  // Bind star picker hover & click interactions
  const starBtns = document.querySelectorAll('#starPickerGroup .star-btn');
  const ratingInput = document.getElementById('selectedStarRating');
  const ratingLabel = document.getElementById('starRatingLabel');

  const ratingDescriptions = {
    1: '1 Star - Poor / Substandard (खराब)',
    2: '2 Stars - Fair / Needs Improvement (औसत)',
    3: '3 Stars - Good / Met Expectations (अच्छा)',
    4: '4 Stars - Very Good / High Quality (बहुत अच्छा)',
    5: '5 Stars - Outstanding / Highly Recommended (उत्कृष्ट ⭐)'
  };

  function updateStarUi(rating) {
    ratingInput.value = rating;
    ratingLabel.textContent = ratingDescriptions[rating] || `${rating} Stars`;
    starBtns.forEach(btn => {
      const btnRating = Number(btn.getAttribute('data-rating'));
      const icon = btn.querySelector('i');
      if (btnRating <= rating) {
        icon.className = 'bi bi-star-fill';
      } else {
        icon.className = 'bi bi-star';
      }
    });
  }

  starBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const hoverRating = Number(btn.getAttribute('data-rating'));
      updateStarUi(hoverRating);
    });
    btn.addEventListener('click', () => {
      const clickRating = Number(btn.getAttribute('data-rating'));
      updateStarUi(clickRating);
    });
  });

  document.getElementById('starPickerGroup')?.addEventListener('mouseleave', () => {
    const active = Number(ratingInput.value) || 5;
    updateStarUi(active);
  });

  // Default to 5 stars
  updateStarUi(5);
}

/**
 * Open the Review Modal
 */
export async function openReviewModal({ 
  targetUid, 
  targetName, 
  targetType, 
  preselectedWorkPostingId = null,
  onReviewSubmitted = null 
}) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please login to leave a rating and review.', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }

  // Prevent self-reviewing
  if (currentUser.uid === targetUid) {
    showToast('You cannot write a review for yourself.', 'warning');
    return;
  }

  setupReviewModal();

  const modalEl = document.getElementById('reviewModal');
  const targetNameEl = document.getElementById('reviewModalTargetName');
  const roleBadgeEl = document.getElementById('reviewModalRoleBadge');
  const roleLabelEl = document.getElementById('reviewModalRoleLabel');
  const postingSelect = document.getElementById('reviewWorkPostingSelect');
  const alertEl = document.getElementById('reviewModalAlert');
  const submitBtn = document.getElementById('reviewSubmitBtn');
  const commentInput = document.getElementById('reviewCommentText');
  const ratingInput = document.getElementById('selectedStarRating');

  if (targetNameEl) targetNameEl.textContent = targetName || (targetType === 'company' ? 'EPC Builder' : 'Contractor');
  if (roleBadgeEl) roleBadgeEl.textContent = targetType === 'company' ? 'EPC Enterprise' : 'Trade Contractor';
  if (roleLabelEl) roleLabelEl.textContent = targetType === 'company' ? 'Reviewing Client / EPC:' : 'Reviewing Subcontractor:';

  if (alertEl) alertEl.classList.add('d-none');
  if (commentInput) commentInput.value = '';
  if (ratingInput) ratingInput.value = '5';

  // Load eligible work postings between reviewer and target
  postingSelect.innerHTML = `<option value="" disabled selected>Loading completed packages...</option>`;
  submitBtn.disabled = true;

  const eligiblePostings = await getEligiblePostingsForReview(currentUser, targetUid);
  const reviews = await getCollection(COLLECTION_REVIEWS);

  postingSelect.innerHTML = '';

  if (eligiblePostings.length === 0) {
    // If no formally tracked completed applications exist, check if there's any completed posting
    // to allow a demo completed project option
    const allPostings = await getCollection('workPostings');
    let fallbackPostings = [];
    if (currentUser.userType === 'company') {
      fallbackPostings = allPostings.filter(p => p.companyUid === currentUser.uid);
    } else {
      fallbackPostings = allPostings.filter(p => p.companyUid === targetUid);
    }

    if (fallbackPostings.length > 0) {
      postingSelect.innerHTML += `<option value="" disabled selected>Select completed work package...</option>`;
      fallbackPostings.forEach(p => {
        const alreadyDone = reviews.some(r => 
          r.reviewerUid === currentUser.uid && 
          r.targetUid === targetUid && 
          String(r.workPostingId) === String(p.id)
        );
        postingSelect.innerHTML += `
          <option value="${p.id}" ${alreadyDone ? 'disabled' : ''} data-title="${p.projectName}">
            ${p.projectName} (${p.city}) ${alreadyDone ? '— [Already Reviewed]' : '— [Completed Package]'}
          </option>
        `;
      });
      submitBtn.disabled = false;
    } else {
      postingSelect.innerHTML = `<option value="" disabled selected>No shared projects found</option>`;
      if (alertEl) {
        alertEl.textContent = 'You can only rate a partner after awarding or completing a work package together on Pragati Connect.';
        alertEl.classList.remove('d-none');
      }
      submitBtn.disabled = true;
    }
  } else {
    postingSelect.innerHTML += `<option value="" disabled selected>Choose completed project package...</option>`;
    let hasAvailable = false;
    eligiblePostings.forEach(item => {
      const alreadyDone = reviews.some(r => 
        r.reviewerUid === currentUser.uid && 
        r.targetUid === targetUid && 
        String(r.workPostingId) === String(item.workPostingId)
      );
      if (!alreadyDone) hasAvailable = true;
      postingSelect.innerHTML += `
        <option value="${item.workPostingId}" ${alreadyDone ? 'disabled' : ''} data-title="${item.projectName}">
          ${item.projectName} [${item.status.toUpperCase()}] ${alreadyDone ? '— (Already Reviewed)' : ''}
        </option>
      `;
    });

    if (preselectedWorkPostingId) {
      postingSelect.value = preselectedWorkPostingId;
    }
    submitBtn.disabled = !hasAvailable;
  }

  // Handle Form Submission
  const form = document.getElementById('reviewModalForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (alertEl) alertEl.classList.add('d-none');

    const selectedOption = postingSelect.options[postingSelect.selectedIndex];
    const workPostingId = postingSelect.value;
    const workPostingTitle = selectedOption?.getAttribute('data-title') || selectedOption?.textContent || 'Work Package';
    const rating = Number(document.getElementById('selectedStarRating')?.value || 5);
    const reviewText = document.getElementById('reviewCommentText')?.value.trim();

    if (!workPostingId) {
      if (alertEl) {
        alertEl.textContent = 'Please select a completed work package for this review.';
        alertEl.classList.remove('d-none');
      }
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Submitting...`;

      const reviewerName = currentUser.companyName || currentUser.firmName || currentUser.displayName || 'Verified Member';
      await createReview({
        workPostingId,
        workPostingTitle,
        reviewerUid: currentUser.uid,
        reviewerName,
        reviewerType: currentUser.userType,
        targetUid,
        targetName,
        targetType,
        rating,
        reviewText
      });

      showToast(`Review submitted successfully! Thank you for rating ${targetName}.`, 'success');
      
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();

      if (typeof onReviewSubmitted === 'function') {
        onReviewSubmitted();
      }
    } catch (err) {
      console.error('Review submit failed:', err);
      if (alertEl) {
        alertEl.textContent = err.message || 'Failed to submit review. Please try again.';
        alertEl.classList.remove('d-none');
      }
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="bi bi-send-fill me-1"></i> Submit Verified Review`;
    }
  };

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

/**
 * Render the dedicated Reviews & Ratings section on Profile Pages
 */
export async function renderReviewsSection(containerId, targetUid, targetType, targetName) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return;

  const reviews = await getReviewsForUser(targetUid);
  const { average, totalCount, distribution, percentages } = calculateAverageRating(reviews);
  const currentUser = getCurrentUser();

  const isSelf = currentUser && currentUser.uid === targetUid;
  const canReview = currentUser && !isSelf;

  const headerTitle = targetType === 'company' 
    ? 'Subcontractor Reviews & Ratings' 
    : 'Client & EPC Contractor Reviews';

  const subTitle = targetType === 'company'
    ? 'Verified feedback from trade contractors regarding site coordination, drawings, and billing release.'
    : 'Audited performance evaluations from EPC builders and principal contractors upon work completion.';

  let breakdownHtml = '';
  for (let s = 5; s >= 1; s--) {
    const count = distribution[s] || 0;
    const pct = percentages[s] || 0;
    breakdownHtml += `
      <div class="d-flex align-items-center gap-2 mb-1 small">
        <span class="text-secondary fw-semibold" style="width: 55px;">${s} Stars</span>
        <div class="progress flex-grow-1" style="height: 8px;">
          <div class="progress-bar bg-warning" role="progressbar" style="width: ${pct}%" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <span class="text-muted text-end" style="width: 35px;">${count}</span>
      </div>
    `;
  }

  let reviewsListHtml = '';
  if (reviews.length === 0) {
    reviewsListHtml = `
      <div class="empty-state text-center py-5 bg-light rounded-4 border">
        <i class="bi bi-star text-muted fs-1 mb-2 d-block opacity-50"></i>
        <h6 class="text-secondary mb-1">No Client Reviews Yet</h6>
        <p class="small text-muted mb-3">Be the first client or subcontractor to leave a verified rating upon completing a work package.</p>
        ${canReview ? `
          <button class="btn btn-outline-primary btn-sm px-3 write-review-btn">
            <i class="bi bi-pencil-square me-1"></i> Write First Review
          </button>
        ` : ''}
      </div>
    `;
  } else {
    reviewsListHtml = reviews.map(r => {
      const dateFormatted = new Date(r.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const reviewerInitial = (r.reviewerName || 'P').charAt(0).toUpperCase();
      const badgeType = r.reviewerType === 'company' ? 'EPC Company' : 'Trade Contractor';
      const badgeClass = r.reviewerType === 'company' ? 'bg-primary-subtle text-primary' : 'bg-warning-subtle text-warning-emphasis';

      return `
        <div class="review-card p-3 p-md-4 mb-3 rounded-4 border bg-white shadow-xs">
          <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
            <div class="d-flex align-items-center gap-3">
              <div class="avatar-circle bg-dark text-white fw-bold d-flex align-items-center justify-content-center rounded-circle" style="width: 44px; height: 44px; font-size: 1.1rem;">
                ${reviewerInitial}
              </div>
              <div>
                <h6 class="fw-bold mb-0 text-primary">${r.reviewerName}</h6>
                <div class="d-flex align-items-center gap-2 small text-muted">
                  <span class="badge ${badgeClass} border">${badgeType}</span>
                  <span>•</span>
                  <span><i class="bi bi-calendar3 me-1"></i> ${dateFormatted}</span>
                </div>
              </div>
            </div>
            <div class="text-end">
              ${renderStarRatingHtml(r.rating, true, null, 'fs-6')}
            </div>
          </div>

          <!-- Project Tag -->
          ${r.workPostingTitle ? `
            <div class="mb-2">
              <span class="badge bg-light text-secondary border">
                <i class="bi bi-briefcase me-1 text-primary"></i> Project: ${r.workPostingTitle}
              </span>
            </div>
          ` : ''}

          <!-- Review Comment -->
          <p class="text-secondary small mb-0 lh-base review-comment-text">
            "${r.reviewText}"
          </p>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="card border-0 shadow-sm rounded-4 p-4 p-md-5 mb-4 bg-white" id="reviewsContainerCard">
      <!-- Header -->
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <h5 class="fw-bold text-primary mb-0"><i class="bi bi-star-fill text-warning me-2"></i> ${headerTitle}</h5>
            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">${totalCount} Verified</span>
          </div>
          <p class="text-secondary small mb-0">${subTitle}</p>
        </div>
        ${!isSelf ? `
          <div>
            <button class="btn btn-orange px-3 fw-bold write-review-btn">
              <i class="bi bi-pencil-square me-1"></i> Rate & Review ${targetType === 'company' ? 'Company' : 'Contractor'}
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Rating Score Summary & Distribution -->
      <div class="row g-4 align-items-center mb-4 p-3 bg-light rounded-4 border">
        <!-- Big Score Column -->
        <div class="col-md-4 text-center border-end-md">
          <div class="display-4 fw-bold text-dark mb-0">${average > 0 ? average.toFixed(1) : '5.0'}</div>
          <div class="mb-2">
            ${renderStarRatingHtml(average > 0 ? average : 5.0, false, null, 'fs-5')}
          </div>
          <div class="small text-muted">
            Based on <strong>${totalCount}</strong> verified completion ratings
          </div>
        </div>

        <!-- Star Bars Column -->
        <div class="col-md-8">
          ${breakdownHtml}
        </div>
      </div>

      <!-- Reviews Feed -->
      <div class="reviews-list">
        ${reviewsListHtml}
      </div>
    </div>
  `;

  // Bind write review buttons
  container.querySelectorAll('.write-review-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openReviewModal({
        targetUid,
        targetName,
        targetType,
        onReviewSubmitted: () => {
          renderReviewsSection(containerId, targetUid, targetType, targetName);
          // Also update header ratings on the page
          const headerRatingEl = document.getElementById('profileRating') || document.getElementById('compRating');
          const headerCountEl = document.getElementById('profileReviewsCount') || document.getElementById('compReviewsCount');
          if (headerRatingEl || headerCountEl) {
            getReviewsForUser(targetUid).then(updatedReviews => {
              const res = calculateAverageRating(updatedReviews);
              if (headerRatingEl) headerRatingEl.textContent = res.average.toFixed(1);
              if (headerCountEl) headerCountEl.textContent = `(${res.totalCount} reviews)`;
            });
          }
        }
      });
    });
  });
}
