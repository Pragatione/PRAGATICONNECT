/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Common Utilities, Toast Notifications, Modals, Navbar & Sample Data Seeder
 */

import { auth, db, isFirebaseLive } from './firebase-config.js';
import { t, getCurrentLanguage, setLanguage, SUPPORTED_LANGUAGES, applyTranslations } from './i18n.js';
import { createNotification, setupNavbarNotifications } from './notifications.js';

export { createNotification };
export { 
  renderStarRatingHtml, 
  getReviewsForUser, 
  calculateAverageRating, 
  recalculateAndUpdateRating, 
  hasUserReviewedWork, 
  getEligiblePostingsForReview, 
  createReview, 
  openReviewModal, 
  renderReviewsSection 
} from './reviews.js';

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  USERS: 'pragati_users',
  CONTRACTORS: 'pragati_contractors',
  COMPANIES: 'pragati_companies',
  WORK_POSTINGS: 'pragati_work_postings',
  ENQUIRIES: 'pragati_enquiries',
  APPLICATIONS: 'pragati_applications',
  NOTIFICATIONS: 'pragati_notifications',
  REVIEWS: 'pragati_reviews',
  OTPS: 'pragati_otps',
  CURRENT_USER: 'pragati_current_user'
};

// --- Toast Notification Helper ---
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;

  const iconClass = type === 'success' ? 'bi-check-circle-fill text-success' :
                    type === 'error' ? 'bi-exclamation-octagon-fill text-danger' :
                    type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' :
                    'bi-info-circle-fill text-primary';

  toast.innerHTML = `
    <i class="bi ${iconClass} fs-5"></i>
    <div class="flex-grow-1">
      <div class="small fw-semibold">${type.toUpperCase()}</div>
      <div class="small text-secondary">${message}</div>
    </div>
    <button type="button" class="btn-close btn-close-sm ms-2" aria-label="Close"></button>
  `;

  toast.querySelector('.btn-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Data Seeder (High-Quality Indian Construction Industry Data) ---
export function seedDemoData(force = false) {
  const existingPostings = localStorage.getItem(STORAGE_KEYS.WORK_POSTINGS);
  const existingUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const hasAdmin = existingUsers.some(u => u.email?.toLowerCase() === 'admin@pragaticonnect.in');

  if (!force && existingPostings && JSON.parse(existingPostings).length > 0 && hasAdmin && existingUsers.length >= 20) {
    return;
  }

  console.log("🌱 Seeding Pragati Connect sample data...");

  // Sample Users (20+ users for admin tables and analytics)
  const sampleUsers = [
    {
      uid: "admin-001",
      email: "admin@pragaticonnect.in",
      userType: "admin",
      role: "admin",
      displayName: "Pragati Administrator",
      phone: "+91 80000 00000",
      city: "New Delhi",
      state: "Delhi",
      profileComplete: true,
      verified: true,
      createdAt: "2025-10-01T09:00:00.000Z"
    },
    {
      uid: "contractor-101",
      email: "rajesh@apexbhopal.com",
      userType: "contractor",
      displayName: "Rajesh Sharma",
      firmName: "Apex Earthmovers & Infra Pvt Ltd",
      phone: "+91 98260 12345",
      city: "Bhopal",
      state: "Madhya Pradesh",
      profileComplete: true,
      verified: true,
      createdAt: "2025-10-15T11:20:00.000Z"
    },
    {
      uid: "contractor-102",
      email: "vikram@shreeganeshinfra.in",
      userType: "contractor",
      displayName: "Vikram Patil",
      firmName: "Shree Ganesh Civil Projects",
      phone: "+91 94220 88990",
      city: "Pune",
      state: "Maharashtra",
      profileComplete: true,
      verified: true,
      createdAt: "2025-11-04T14:10:00.000Z"
    },
    {
      uid: "contractor-103",
      email: "manoj@vkmep.com",
      userType: "contractor",
      displayName: "Manoj Reddy",
      firmName: "VK MEP & Electromech Services",
      phone: "+91 98490 55432",
      city: "Hyderabad",
      state: "Telangana",
      profileComplete: true,
      verified: true,
      createdAt: "2025-11-22T08:45:00.000Z"
    },
    {
      uid: "company-201",
      email: "procurement@ltcivil.com",
      userType: "company",
      displayName: "L&T Heavy Civil IC",
      companyName: "L&T Heavy Civil Infrastructure",
      phone: "+91 22 6752 5656",
      city: "Mumbai",
      state: "Maharashtra",
      profileComplete: true,
      verified: true,
      createdAt: "2025-10-05T10:15:00.000Z"
    },
    {
      uid: "company-202",
      email: "subcontracts@tataprojects.com",
      userType: "company",
      displayName: "Tata Projects Infra",
      companyName: "Tata Projects Limited",
      phone: "+91 22 6665 8282",
      city: "Bengaluru",
      state: "Karnataka",
      profileComplete: true,
      verified: true,
      createdAt: "2025-11-12T16:30:00.000Z"
    },
    {
      uid: "contractor-104",
      email: "suresh@patelroadways.in",
      userType: "contractor",
      displayName: "Suresh Patel",
      firmName: "Patel Road & Highway Construction",
      phone: "+91 98250 33412",
      city: "Ahmedabad",
      state: "Gujarat",
      profileComplete: true,
      verified: true,
      createdAt: "2025-12-02T13:20:00.000Z"
    },
    {
      uid: "contractor-105",
      email: "amit@vermaconcrete.com",
      userType: "contractor",
      displayName: "Amit Verma",
      firmName: "Verma RMC & Precast Works",
      phone: "+91 94150 99823",
      city: "Lucknow",
      state: "Uttar Pradesh",
      profileComplete: true,
      verified: false,
      createdAt: "2025-12-19T09:15:00.000Z"
    },
    {
      uid: "company-203",
      email: "vendor@shapoorji.com",
      userType: "company",
      displayName: "Shapoorji Pallonji EPC",
      companyName: "Shapoorji Pallonji & Co Ltd",
      phone: "+91 22 6749 0000",
      city: "Mumbai",
      state: "Maharashtra",
      profileComplete: true,
      verified: true,
      createdAt: "2026-01-08T11:40:00.000Z"
    },
    {
      uid: "contractor-106",
      email: "gurpreet@singhearthmovers.com",
      userType: "contractor",
      displayName: "Gurpreet Singh",
      firmName: "Singh Earthmovers & Shoring",
      phone: "+91 98140 77123",
      city: "Chandigarh",
      state: "Punjab",
      profileComplete: true,
      verified: true,
      createdAt: "2026-01-14T15:25:00.000Z"
    },
    {
      uid: "contractor-107",
      email: "aniket@deccanprecast.in",
      userType: "contractor",
      displayName: "Aniket Jadhav",
      firmName: "Deccan Precast Solutions",
      phone: "+91 97650 44321",
      city: "Pune",
      state: "Maharashtra",
      profileComplete: true,
      verified: false,
      createdAt: "2026-01-26T10:00:00.000Z"
    },
    {
      uid: "company-204",
      email: "contracts@afcons.com",
      userType: "company",
      displayName: "Afcons Infrastructure",
      companyName: "Afcons Infrastructure Ltd",
      phone: "+91 22 6719 1000",
      city: "Mumbai",
      state: "Maharashtra",
      profileComplete: true,
      verified: true,
      createdAt: "2026-02-01T12:00:00.000Z"
    },
    {
      uid: "contractor-108",
      email: "pradeep@royfab.com",
      userType: "contractor",
      displayName: "Pradeep Roy",
      firmName: "Bengal Steel & PEB Fabricators",
      phone: "+91 98310 66543",
      city: "Kolkata",
      state: "West Bengal",
      profileComplete: true,
      verified: true,
      createdAt: "2026-02-10T14:50:00.000Z"
    },
    {
      uid: "contractor-109",
      email: "firoz@alhindmep.in",
      userType: "contractor",
      displayName: "Mohammed Firoz",
      firmName: "Al-Hind HVAC & Electricals",
      phone: "+91 94440 22189",
      city: "Chennai",
      state: "Tamil Nadu",
      profileComplete: true,
      verified: false,
      createdAt: "2026-02-18T16:15:00.000Z"
    },
    {
      uid: "company-205",
      email: "procure@dilipbuildcon.com",
      userType: "company",
      displayName: "Dilip Buildcon Infra",
      companyName: "Dilip Buildcon Limited",
      phone: "+91 755 402 9999",
      city: "Bhopal",
      state: "Madhya Pradesh",
      profileComplete: true,
      verified: true,
      createdAt: "2026-02-24T09:30:00.000Z"
    },
    {
      uid: "contractor-110",
      email: "rakesh@ncrheavy.com",
      userType: "contractor",
      displayName: "Rakesh Yadav",
      firmName: "NCR Heavy Cranes & Logistics",
      phone: "+91 98110 55678",
      city: "Gurugram",
      state: "Haryana",
      profileComplete: true,
      verified: true,
      createdAt: "2026-03-01T11:10:00.000Z"
    },
    {
      uid: "contractor-111",
      email: "dinesh@keralapiling.com",
      userType: "contractor",
      displayName: "Dinesh Nair",
      firmName: "Cochin Marine & Piling Works",
      phone: "+91 98470 33211",
      city: "Kochi",
      state: "Kerala",
      profileComplete: true,
      verified: false,
      createdAt: "2026-03-08T13:40:00.000Z"
    },
    {
      uid: "company-206",
      email: "tenders@nccurban.com",
      userType: "company",
      displayName: "NCC Limited Infra",
      companyName: "NCC Limited",
      phone: "+91 40 2330 8888",
      city: "Hyderabad",
      state: "Telangana",
      profileComplete: true,
      verified: true,
      createdAt: "2026-03-12T15:20:00.000Z"
    },
    {
      uid: "contractor-112",
      email: "sunil@rajasthanmarbles.in",
      userType: "contractor",
      displayName: "Sunil Meena",
      firmName: "Jaipur Stone & Masonry Co",
      phone: "+91 94140 88765",
      city: "Jaipur",
      state: "Rajasthan",
      profileComplete: true,
      verified: true,
      createdAt: "2026-03-19T10:05:00.000Z"
    },
    {
      uid: "contractor-113",
      email: "rameshwar@shivalikwaterproofing.in",
      userType: "contractor",
      displayName: "Rameshwar Kulkarni",
      firmName: "Shivalik Waterproofing & Injections",
      phone: "+91 94230 11987",
      city: "Nagpur",
      state: "Maharashtra",
      profileComplete: true,
      verified: false,
      createdAt: "2026-03-24T12:30:00.000Z"
    },
    {
      uid: "company-207",
      email: "vendorcell@jmcprojects.com",
      userType: "company",
      displayName: "JMC Projects India",
      companyName: "JMC Projects (India) Ltd",
      phone: "+91 79 3001 1500",
      city: "Ahmedabad",
      state: "Gujarat",
      profileComplete: true,
      verified: true,
      createdAt: "2026-03-29T16:00:00.000Z"
    },
    {
      uid: "contractor-114",
      email: "balram@indoreinfra.com",
      userType: "contractor",
      displayName: "Balram Choudhary",
      firmName: "Malwa Earth & Infrastructure",
      phone: "+91 98270 44556",
      city: "Indore",
      state: "Madhya Pradesh",
      profileComplete: true,
      verified: true,
      createdAt: "2026-04-02T09:45:00.000Z"
    },
    {
      uid: "company-208",
      email: "subcon@kecrpg.com",
      userType: "company",
      displayName: "KEC International",
      companyName: "KEC International Ltd",
      phone: "+91 22 6667 0200",
      city: "Mumbai",
      state: "Maharashtra",
      profileComplete: true,
      verified: true,
      createdAt: "2026-04-05T14:10:00.000Z"
    },
    {
      uid: "contractor-115",
      email: "harish@himalayaninfra.in",
      userType: "contractor",
      displayName: "Harish Joshi",
      firmName: "Himalayan Hill Roads & Slope Protection",
      phone: "+91 94120 77654",
      city: "Dehradun",
      state: "Uttarakhand",
      profileComplete: true,
      verified: true,
      createdAt: "2026-04-08T11:20:00.000Z"
    }
  ];

  // Sample Contractors
  const sampleContractors = [
    {
      uid: "contractor-101",
      firmName: "Apex Earthmovers & Infra Pvt Ltd",
      ownerName: "Rajesh Sharma",
      phone: "+91 98260 12345",
      email: "rajesh@apexbhopal.com",
      gstNumber: "23AABCA1234F1Z8",
      panNumber: "AABCA1234F",
      city: "Bhopal",
      state: "Madhya Pradesh",
      pincode: "462001",
      address: "Plot 42, Sector C, Industrial Area, Govindpura",
      trades: ["Civil", "Road/Highway", "Demolition", "Concrete"],
      machinery: [
        { name: "Excavator CAT 320D", quantity: 4 },
        { name: "JCB 3DX Super", quantity: 6 },
        { name: "Vibratory Soil Compactor 10T", quantity: 3 },
        { name: "Tipper Dumper 16T", quantity: 12 }
      ],
      totalWorkers: 140,
      supervisors: 8,
      engineers: 4,
      yearsOfExperience: 14,
      largestProjectValue: "₹38 Cr",
      projectsCompleted: 26,
      aboutUs: "Specialized in bulk earth excavation, rock cutting, subgrade preparation, and national highway earthworks with own fleet of heavy equipment.",
      pastProjects: [
        {
          projectName: "NH-46 Four Laning Package 3",
          clientName: "NHAI / Dilip Buildcon",
          projectValue: "₹24 Cr",
          location: "Bhopal-Hoshangabad",
          completionYear: 2024,
          description: "Excavated over 450,000 cu.m of soil and murrum for 32 km highway alignment."
        },
        {
          projectName: "Industrial Corridor Grading",
          clientName: "MPIDC",
          projectValue: "₹14 Cr",
          location: "Pithampur, MP",
          completionYear: 2023,
          description: "Precision land levelling and internal stormwater drains for 120 acre industrial cluster."
        }
      ],
      availableForWork: true,
      willingToTravel: true,
      travelRadius: "Pan India",
      certifications: ["CPWD Registered", "ISO Certified", "PWD Class I"],
      profileViews: 142,
      enquiriesReceived: 18,
      rating: 4.8,
      reviewCount: 15,
      createdAt: new Date().toISOString()
    },
    {
      uid: "contractor-102",
      firmName: "Shree Ganesh Structural & Precast",
      ownerName: "Vikram Patil",
      phone: "+91 94220 88990",
      email: "vikram@shreeganeshinfra.in",
      gstNumber: "27AAACG9876C1Z4",
      panNumber: "AAACG9876C",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411019",
      address: "Chakan Industrial Zone, Phase II",
      trades: ["Structural Steel", "Concrete", "Civil", "Roofing"],
      machinery: [
        { name: "Mobile Hydra Crane 14T", quantity: 3 },
        { name: "Automatic Rebar Bending Machine", quantity: 4 },
        { name: "Transit Mixer 6 cu.m", quantity: 5 },
        { name: "Concrete Pump 36m", quantity: 2 }
      ],
      totalWorkers: 110,
      supervisors: 6,
      engineers: 5,
      yearsOfExperience: 11,
      largestProjectValue: "₹22 Cr",
      projectsCompleted: 19,
      aboutUs: "Experienced civil & steel fabrication contractor delivering industrial warehouses, pre-engineered buildings (PEB), and heavy RCC substructures.",
      pastProjects: [
        {
          projectName: "Automobile Assembly Plant PEB Shed",
          clientName: "Mahindra & Mahindra Tier-1 Vendor",
          projectValue: "₹18 Cr",
          location: "Chakan, Pune",
          completionYear: 2025,
          description: "Erected 1,800 MT structural steel framing and standing seam roofing."
        }
      ],
      availableForWork: true,
      willingToTravel: true,
      travelRadius: "Anywhere in Maharashtra",
      certifications: ["ISO Certified", "Safety Certified", "PWD Class I"],
      profileViews: 98,
      enquiriesReceived: 12,
      rating: 4.7,
      reviewCount: 9,
      createdAt: new Date().toISOString()
    },
    {
      uid: "contractor-103",
      firmName: "VK MEP Solutions & Turnkey Services",
      ownerName: "Manoj Reddy",
      phone: "+91 98490 55432",
      email: "manoj@vkmep.com",
      gstNumber: "36AABCV4567D1Z1",
      panNumber: "AABCV4567D",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      address: "Hitec City, Madhapur, Hyderabad",
      trades: ["MEP", "Electrical", "Plumbing", "Fire Fighting"],
      machinery: [
        { name: "Pipe Threading Machine", quantity: 8 },
        { name: "Duct Fabrication Machine", quantity: 2 },
        { name: "High Pressure Hydro Test Unit", quantity: 4 },
        { name: "Scissor Lift 12m", quantity: 3 }
      ],
      totalWorkers: 95,
      supervisors: 7,
      engineers: 6,
      yearsOfExperience: 9,
      largestProjectValue: "₹15 Cr",
      projectsCompleted: 22,
      aboutUs: "Turnkey MEP contractor covering HVAC ducting, chilled water piping, high-tension electrical distribution, DG synchronization, and UL/FM fire protection.",
      pastProjects: [
        {
          projectName: "G+14 IT Tech Park MEP Package",
          clientName: "Phoenix Group",
          projectValue: "₹12 Cr",
          location: "Gachibowli, Hyderabad",
          completionYear: 2024,
          description: "Complete HVAC ducting, plumbing shafts, and electrical substation cabling."
        }
      ],
      availableForWork: true,
      willingToTravel: true,
      travelRadius: "Pan India",
      certifications: ["ISO Certified", "Safety Certified"],
      profileViews: 114,
      enquiriesReceived: 14,
      rating: 4.9,
      reviewCount: 11,
      createdAt: new Date().toISOString()
    }
  ];

  // Sample Companies
  const sampleCompanies = [
    {
      uid: "company-201",
      companyName: "L&T Heavy Civil Infrastructure",
      contactPerson: "Arvind Narayan",
      designation: "General Manager - Subcontracts",
      phone: "+91 22 6752 5656",
      email: "procurement@ltcivil.com",
      gstNumber: "27AAACL0123P1Z9",
      website: "https://www.larsentoubro.com",
      city: "Mumbai",
      state: "Maharashtra",
      address: "L&T House, Ballard Estate, Mumbai 400001",
      companyType: "EPC",
      companySize: "1000+",
      annualTurnover: "Above ₹5000 Cr",
      aboutCompany: "India's premier engineering and construction conglomerate executing landmark bridges, metro rail projects, and hydro tunnels.",
      workPostings: 4,
      contractorsHired: 42,
      rating: 4.9,
      reviewCount: 8,
      createdAt: new Date().toISOString()
    },
    {
      uid: "company-202",
      companyName: "Tata Projects Limited",
      contactPerson: "Sanjay Deshmukh",
      designation: "Head - Vendor Development",
      phone: "+91 22 6665 8282",
      email: "subcontracts@tataprojects.com",
      gstNumber: "29AAACT9876Q1Z3",
      website: "https://www.tataprojects.com",
      city: "Bengaluru",
      state: "Karnataka",
      address: "Mittal Towers, MG Road, Bengaluru 560001",
      companyType: "Infrastructure",
      companySize: "1000+",
      annualTurnover: "₹1000 - ₹5000 Cr",
      aboutCompany: "Executing industrial plants, urban transit, data centers, and advanced healthcare facilities across India.",
      workPostings: 3,
      contractorsHired: 28,
      rating: 4.8,
      reviewCount: 6,
      createdAt: new Date().toISOString()
    }
  ];

  // Sample Work Postings
  const sampleWorkPostings = [
    {
      id: "work-1001",
      companyUid: "company-201",
      companyName: "L&T Heavy Civil Infrastructure",
      projectName: "Mumbai Metro Line 4 - Elevated Viaduct Substructure",
      projectLocation: "Ghatkopar to Mulund Corridor",
      city: "Mumbai",
      state: "Maharashtra",
      tradeRequired: "Concrete",
      scopeOfWork: "Construction of RCC pier caps, portal beams, and segment casting for 4.2 km elevated metro viaduct. Rigorous quality adherence to DMRC/MMRDA standards.",
      estimatedBudget: "₹5-10 Cr",
      startDate: "2026-11-01",
      duration: "6 months",
      minExperience: 5,
      machineryRequired: "Transit Mixers, Boom Placer, Concrete Batching Plant coordination",
      certificationsRequired: ["Safety Certified", "ISO Certified"],
      manpowerRequired: "50+ skilled bar benders and shuttering carpenters",
      applicationDeadline: "2026-10-30",
      status: "active",
      applicationsCount: 4,
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    },
    {
      id: "work-1002",
      companyUid: "company-201",
      companyName: "L&T Heavy Civil Infrastructure",
      projectName: "Samruddhi Expressway Spur - Earthwork & Embankment",
      projectLocation: "Nashik-Igatpuri Belt",
      city: "Nashik",
      state: "Maharashtra",
      tradeRequired: "Road/Highway",
      scopeOfWork: "Site clearing, borrow area excavation, filling and compaction of 300,000 cu.m embankment with GSB and WMM layering for 18 km service roads.",
      estimatedBudget: "₹10-50 Cr",
      startDate: "2026-11-15",
      duration: "9 months",
      minExperience: 8,
      machineryRequired: "Heavy Excavators (20T+), Graders, 10T Vibratory Rollers, 20 Tippers",
      certificationsRequired: ["PWD Class I", "Safety Certified"],
      manpowerRequired: "60+ operators, survey teams, and road gang",
      applicationDeadline: "2026-11-05",
      status: "completed",
      applicationsCount: 7,
      createdAt: new Date(Date.now() - 3600000 * 24 * 40).toISOString()
    },
    {
      id: "work-1003",
      companyUid: "company-202",
      companyName: "Tata Projects Limited",
      projectName: "Bengaluru Tech Park - Phase 2 MEP Turnkey Execution",
      projectLocation: "Whitefield, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      tradeRequired: "MEP",
      scopeOfWork: "Supply and installation of chilled water piping, AHU connections, GI ductwork, fire sprinkler loops, and LT distribution boards for 450,000 sq.ft office space.",
      estimatedBudget: "₹1-5 Cr",
      startDate: "2026-12-01",
      duration: "4 months",
      minExperience: 6,
      machineryRequired: "Threading machines, hydro test pump, scaffolding towers",
      certificationsRequired: ["ISO Certified"],
      manpowerRequired: "35 skilled plumbers, duct fabricators & electricians",
      applicationDeadline: "2026-11-10",
      status: "active",
      applicationsCount: 3,
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: "work-1004",
      companyUid: "company-202",
      companyName: "Tata Projects Limited",
      projectName: "Automated Logistics Hub - Structural PEB Erection",
      projectLocation: "Sriperumbudur Industrial Corridor",
      city: "Chennai",
      state: "Tamil Nadu",
      tradeRequired: "Structural Steel",
      scopeOfWork: "Unloading, alignment, torque tightening, and high-level sheeting of 2,200 MT Pre-Engineered Steel Building framing. Clear height 14 meters.",
      estimatedBudget: "₹1-5 Cr",
      startDate: "2026-11-20",
      duration: "3 months",
      minExperience: 5,
      machineryRequired: "Hydra Cranes 14T-20T, Scissor Lifts, Torque Wrenches",
      certificationsRequired: ["Safety Certified"],
      manpowerRequired: "40 skilled riggers, erectors & safety supervisors",
      applicationDeadline: "2026-11-01",
      status: "completed",
      applicationsCount: 5,
      createdAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString()
    },
    {
      id: "work-1005",
      companyUid: "company-201",
      companyName: "L&T Heavy Civil Infrastructure",
      projectName: "Underground Metro Station - Deep Diaphragm Wall & Waterproofing",
      projectLocation: "Central Business District",
      city: "Mumbai",
      state: "Maharashtra",
      tradeRequired: "Waterproofing",
      scopeOfWork: "Elastomeric membrane and pre-applied HDPE waterproofing for underground retainment walls and bottom raft slab subject to high water table.",
      estimatedBudget: "₹50 Lakh - ₹1 Cr",
      startDate: "2026-12-10",
      duration: "3 months",
      minExperience: 4,
      machineryRequired: "Airless spray machines, hot air welders",
      certificationsRequired: ["ISO Certified"],
      manpowerRequired: "20 specialized applicators",
      applicationDeadline: "2026-11-25",
      status: "active",
      applicationsCount: 2,
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
    }
  ];

  // Sample Applications
  const sampleApplications = [
    {
      id: "app-301",
      workPostingId: "work-1001",
      contractorUid: "contractor-101",
      contractorName: "Rajesh Sharma",
      contractorFirmName: "Apex Earthmovers & Infra Pvt Ltd",
      coverMessage: "We have executed similar pier concrete works on NH-46 and have 40 RCC specialists available starting Nov 1st.",
      proposedBudget: "₹6.8 Cr",
      proposedTimeline: "5.5 months",
      status: "shortlisted",
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: "app-302",
      workPostingId: "work-1003",
      contractorUid: "contractor-103",
      contractorName: "Manoj Reddy",
      contractorFirmName: "VK MEP Solutions & Turnkey Services",
      coverMessage: "We have finished 3 commercial tech parks with full HVAC & plumbing compliance. Our teams are ready in Bengaluru.",
      proposedBudget: "₹2.9 Cr",
      proposedTimeline: "4 months",
      status: "applied",
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
    },
    {
      id: "app-303",
      workPostingId: "work-1002",
      contractorUid: "contractor-101",
      contractorName: "Rajesh Sharma",
      contractorFirmName: "Apex Earthmovers & Infra Pvt Ltd",
      coverMessage: "Mobilized 6 CAT 320 excavators and 12 tippers for Samruddhi spur highway earthwork.",
      proposedBudget: "₹18.5 Cr",
      proposedTimeline: "8 months",
      status: "completed",
      createdAt: new Date(Date.now() - 3600000 * 24 * 40).toISOString()
    },
    {
      id: "app-304",
      workPostingId: "work-1004",
      contractorUid: "contractor-102",
      contractorName: "Vikram Solanki",
      contractorFirmName: "Shree Ganesh Structural & Precast",
      coverMessage: "Erected 2,200 MT structural framing with 100% torque pass rate.",
      proposedBudget: "₹3.8 Cr",
      proposedTimeline: "3 months",
      status: "completed",
      createdAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString()
    },
    {
      id: "app-305",
      workPostingId: "work-1005",
      contractorUid: "contractor-101",
      contractorName: "Rajesh Sharma",
      contractorFirmName: "Apex Earthmovers & Infra Pvt Ltd",
      coverMessage: "Specialized deep diaphragm excavation team ready for mobilization.",
      proposedBudget: "₹85 Lakh",
      proposedTimeline: "2.5 months",
      status: "awarded",
      createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
    }
  ];

  // Sample Enquiries
  const sampleEnquiries = [
    {
      id: "enq-401",
      fromUid: "company-201",
      fromName: "L&T Heavy Civil Infrastructure",
      fromType: "company",
      toUid: "contractor-101",
      toName: "Apex Earthmovers & Infra Pvt Ltd",
      toType: "contractor",
      subject: "Inquiry: Fleet availability for excavation in Pune-Nashik section",
      message: "Hello Rajesh ji, we noticed your fleet of CAT 320 excavators and 12 tippers. Are 2 excavators and 5 tippers free for a 4-month mobilization starting next month?",
      relatedWorkPostingId: "work-1002",
      status: "pending",
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: "enq-402",
      fromUid: "company-202",
      fromName: "Tata Projects Limited",
      fromType: "company",
      toUid: "contractor-102",
      toName: "Shree Ganesh Structural & Precast",
      toType: "contractor",
      subject: "Request for Quotation - Precast boundary wall & column pockets",
      message: "Dear Vikram ji, we have an upcoming warehouse package near Chakan. Please review our scope and let us know your capacity.",
      status: "read",
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString()
    }
  ];

  // Save to local storage
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sampleUsers));
  localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(sampleContractors));
  localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(sampleCompanies));
  localStorage.setItem(STORAGE_KEYS.WORK_POSTINGS, JSON.stringify(sampleWorkPostings));
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(sampleApplications));
  localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(sampleEnquiries));

  seedDemoNotifications(force);
  seedDemoReviews(force);

  console.log("✅ Sample data seeding complete! Pragati Connect is fully populated.");
}

export function seedDemoReviews(force = false) {
  const existing = localStorage.getItem(STORAGE_KEYS.REVIEWS);
  if (!force && existing && JSON.parse(existing).length > 0) return;

  const sampleReviews = [
    {
      id: "rev-601",
      workPostingId: "work-1002",
      workPostingTitle: "Samruddhi Expressway Spur - Earthwork & Embankment",
      reviewerUid: "company-201",
      reviewerName: "L&T Heavy Civil Infrastructure",
      reviewerType: "company",
      targetUid: "contractor-101",
      targetName: "Apex Earthmovers & Infra Pvt Ltd",
      targetType: "contractor",
      rating: 5,
      reviewText: "Outstanding execution by Rajesh ji and the Apex Earthmovers team. Mobilized 6 heavy excavators and 12 tippers within 48 hours. Zero safety violations, achieved 98% Proctor compaction on soil embankment, and finished 15 days ahead of schedule. Highly recommended for EPC highway earthwork.",
      createdAt: new Date(Date.now() - 3600000 * 24 * 18).toISOString()
    },
    {
      id: "rev-602",
      workPostingId: "work-1002",
      workPostingTitle: "Samruddhi Expressway Spur - Earthwork & Embankment",
      reviewerUid: "contractor-101",
      reviewerName: "Apex Earthmovers & Infra Pvt Ltd",
      reviewerType: "contractor",
      targetUid: "company-201",
      targetName: "L&T Heavy Civil Infrastructure",
      targetType: "company",
      rating: 5,
      reviewText: "Exemplary principal contractor experience. Site engineers provided timely benchmark coordinates and prompt approvals. Running bills and RA certifications cleared within 14 days without unnecessary disputes. Looking forward to bidding on future packages with L&T.",
      createdAt: new Date(Date.now() - 3600000 * 24 * 17).toISOString()
    },
    {
      id: "rev-603",
      workPostingId: "work-1004",
      workPostingTitle: "Automated Logistics Hub - Structural PEB Erection",
      reviewerUid: "company-202",
      reviewerName: "Tata Projects Limited",
      reviewerType: "company",
      targetUid: "contractor-102",
      targetName: "Shree Ganesh Structural & Precast",
      targetType: "contractor",
      rating: 5,
      reviewText: "Highly professional steel erection crew. Handled 2,200 MT structural framing with flawless crane rigging, proper harness lines, and passed 100% torque inspections. Very impressed with Vikram Solanki's engineering supervision.",
      createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
    },
    {
      id: "rev-604",
      workPostingId: "work-1004",
      workPostingTitle: "Automated Logistics Hub - Structural PEB Erection",
      reviewerUid: "contractor-102",
      reviewerName: "Shree Ganesh Structural & Precast",
      reviewerType: "contractor",
      targetUid: "company-202",
      targetName: "Tata Projects Limited",
      targetType: "company",
      rating: 5,
      reviewText: "Smooth site coordination, clear work permits from safety department, and prompt material crane unloading. Tata Projects maintains high quality standards and treated our subcontractors with high respect. Payments released on time.",
      createdAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString()
    },
    {
      id: "rev-605",
      workPostingId: "work-1001",
      workPostingTitle: "Mumbai Metro Line 4 - Elevated Viaduct Substructure",
      reviewerUid: "company-201",
      reviewerName: "L&T Heavy Civil Infrastructure",
      reviewerType: "company",
      targetUid: "contractor-101",
      targetName: "Apex Earthmovers & Infra Pvt Ltd",
      targetType: "contractor",
      rating: 4,
      reviewText: "Solid equipment reliability and experienced plant operators. Complied strictly with high-density urban traffic management norms during night-time muck disposal.",
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
    }
  ];

  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(sampleReviews));
}

export function seedDemoNotifications(force = false) {
  const existing = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  if (!force && existing && JSON.parse(existing).length > 0) return;

  const sampleNotifications = [
    {
      id: "notif-501",
      recipientUid: "contractor-101",
      senderUid: "company-201",
      senderName: "L&T Heavy Civil Infrastructure",
      type: "enquiry",
      title: "New Business Enquiry",
      message: "L&T Heavy Civil sent you an inquiry: Fleet availability for excavation in Pune-Nashik section",
      icon: "bi-envelope-paper-fill text-primary",
      link: "dashboard-contractor.html#myEnquiriesTableBody",
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      metadata: {
        enquiryId: "enq-401",
        subject: "Fleet availability for excavation in Pune-Nashik section"
      }
    },
    {
      id: "notif-502",
      recipientUid: "contractor-101",
      senderUid: "company-201",
      senderName: "L&T Heavy Civil Infrastructure",
      type: "status_change",
      title: "Application Shortlisted ⭐",
      message: "Great news! Your bid for 'Mumbai Metro Line 4 - Elevated Viaduct Substructure' has been shortlisted by L&T Heavy Civil.",
      icon: "bi-star-fill text-primary",
      link: "dashboard-contractor.html#myApplicationsTableBody",
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      metadata: {
        applicationId: "app-301",
        workPostingId: "work-1001",
        status: "shortlisted"
      }
    },
    {
      id: "notif-503",
      recipientUid: "company-201",
      senderUid: "contractor-101",
      senderName: "Apex Earthmovers & Infra Pvt Ltd",
      type: "application",
      title: "New Work Application Received",
      message: "Apex Earthmovers & Infra Pvt Ltd submitted a bid of ₹6.8 Cr for 'Mumbai Metro Line 4 - Elevated Viaduct Substructure'",
      icon: "bi-briefcase-fill text-warning",
      link: "dashboard-company.html#recentApplicationsSection",
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      metadata: {
        applicationId: "app-301",
        workPostingId: "work-1001"
      }
    },
    {
      id: "notif-504",
      recipientUid: "company-202",
      senderUid: "contractor-103",
      senderName: "VK MEP Solutions & Turnkey Services",
      type: "application",
      title: "New Work Application Received",
      message: "VK MEP Solutions submitted a bid of ₹2.9 Cr for 'Bengaluru Tech Park - Phase 2 MEP Turnkey Execution'",
      icon: "bi-briefcase-fill text-warning",
      link: "dashboard-company.html#recentApplicationsSection",
      read: true,
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
      metadata: {
        applicationId: "app-302",
        workPostingId: "work-1003"
      }
    },
    {
      id: "notif-505",
      recipientUid: "contractor-102",
      senderUid: "company-202",
      senderName: "Tata Projects Limited",
      type: "enquiry",
      title: "New Business Enquiry",
      message: "Tata Projects Limited sent you an inquiry: Request for Quotation - Precast boundary wall & column pockets",
      icon: "bi-envelope-paper-fill text-primary",
      link: "dashboard-contractor.html#myEnquiriesTableBody",
      read: true,
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
      metadata: {
        enquiryId: "enq-402",
        subject: "Request for Quotation - Precast boundary wall & column pockets"
      }
    }
  ];

  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(sampleNotifications));
  console.log("🔔 Seeded initial sample notifications for Pragati Connect");
}

// Auto-seed on initial load
seedDemoData();
seedDemoNotifications();

// --- Universal Data Storage Layer ---
export async function getCollection(collectionName) {
  if (isFirebaseLive && db) {
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn(`Firestore getDocs failed for ${collectionName}, reading local store:`, err);
    }
  }

  const key = `pragati_${collectionName.toLowerCase()}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export async function getDocument(collectionName, docId) {
  if (isFirebaseLive && db) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDoc(doc(db, collectionName, docId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.warn(`Firestore getDoc failed for ${collectionName}/${docId}:`, err);
    }
  }

  const items = await getCollection(collectionName);
  return items.find(item => item.id === docId || item.uid === docId) || null;
}

export async function addDocument(collectionName, data) {
  const newId = data.id || data.uid || `${collectionName.slice(0, 4)}-${Date.now()}`;
  const record = { id: newId, createdAt: new Date().toISOString(), ...data };

  if (isFirebaseLive && db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, collectionName, newId), record);
      console.log(`🔥 Document saved to Firestore ${collectionName}:`, newId);
    } catch (err) {
      console.warn(`Firestore setDoc failed for ${collectionName}:`, err);
    }
  }

  // Always sync local store for instant UI reactivity
  const key = `pragati_${collectionName.toLowerCase()}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const index = items.findIndex(i => (i.id && i.id === newId) || (i.uid && i.uid === newId));
  if (index >= 0) {
    items[index] = { ...items[index], ...record };
  } else {
    items.unshift(record);
  }
  localStorage.setItem(key, JSON.stringify(items));
  return record;
}

export async function updateDocument(collectionName, id, updateFields) {
  if (isFirebaseLive && db) {
    try {
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await updateDoc(doc(db, collectionName, id), updateFields);
    } catch (err) {
      console.warn(`Firestore updateDoc failed for ${collectionName}/${id}:`, err);
    }
  }

  const key = `pragati_${collectionName.toLowerCase()}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const index = items.findIndex(i => i.id === id || i.uid === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...updateFields, updatedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(items));
    return items[index];
  }
  return null;
}

export async function deleteDocument(collectionName, id) {
  if (isFirebaseLive && db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(db, collectionName, id));
      console.log(`🔥 Document deleted from Firestore ${collectionName}:`, id);
    } catch (err) {
      console.warn(`Firestore deleteDoc failed for ${collectionName}/${id}:`, err);
    }
  }

  const key = `pragati_${collectionName.toLowerCase()}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = items.filter(i => (i.id !== id && i.uid !== id));
  localStorage.setItem(key, JSON.stringify(filtered));
  return true;
}

// --- Session & Current User Helper ---
export function getCurrentUser() {
  const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } else {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }
}

// --- Render Unified Navigation Bar ---
export function renderNavbar(activePage = '') {
  const navContainer = document.getElementById('navbar-container');
  if (!navContainer) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.email?.toLowerCase() === 'admin@pragaticonnect.in' || currentUser?.role === 'admin' || currentUser?.userType === 'admin';
  const isContractor = currentUser?.userType === 'contractor';
  const isCompany = currentUser?.userType === 'company';
  const currentLang = getCurrentLanguage();
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  // Count unread enquiries
  let unreadCount = 0;
  if (currentUser) {
    const enquiries = JSON.parse(localStorage.getItem(STORAGE_KEYS.ENQUIRIES) || '[]');
    unreadCount = enquiries.filter(e => e.toUid === currentUser.uid && e.status === 'pending').length;
  }

  navContainer.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-custom">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          <div class="brand-logo-icon">
            <i class="bi bi-cone-striped"></i>
          </div>
          <div>
            <span data-i18n="brand_name">Pragati Connect</span>
            <span class="brand-tagline-small" data-i18n="brand_tagline">प्रगति का रास्ता, काम से शुरू</span>
          </div>
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent" aria-controls="navContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navContent">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3">
            <li class="nav-item">
              <a class="nav-link ${activePage === 'home' ? 'active' : ''}" href="index.html" data-i18n="nav_home">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${activePage === 'browse-work' ? 'active' : ''}" href="browse-work.html">
                <i class="bi bi-briefcase me-1"></i> <span data-i18n="nav_browse_work">Browse Work</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${activePage === 'browse-contractors' ? 'active' : ''}" href="browse-contractors.html">
                <i class="bi bi-people me-1"></i> <span data-i18n="nav_find_contractors">Find Contractors</span>
              </a>
            </li>
            ${isCompany ? `
              <li class="nav-item">
                <a class="nav-link text-warning fw-semibold ${activePage === 'post-work' ? 'active' : ''}" href="post-work.html">
                  <i class="bi bi-plus-circle me-1"></i> <span data-i18n="nav_post_work">Post Work</span>
                </a>
              </li>
            ` : ''}
            ${isAdmin ? `
              <li class="nav-item">
                <a class="nav-link text-danger fw-bold ${activePage === 'admin' ? 'active' : ''}" href="admin.html">
                  <i class="bi bi-shield-lock-fill me-1"></i> Admin Portal
                </a>
              </li>
            ` : ''}
          </ul>

          <div class="d-flex align-items-center gap-2">
            <!-- Language Switcher Dropdown -->
            <div class="dropdown me-1">
              <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-1 py-1 px-2 rounded-3" type="button" id="langDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Switch Language">
                <i class="bi bi-translate text-primary fs-6"></i>
                <span class="fw-semibold small">${currentLangObj.nativeName}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="langDropdown">
                <li class="px-3 py-1 small text-muted fw-bold border-bottom" data-i18n="lang_select">Language / भाषा</li>
                ${SUPPORTED_LANGUAGES.map(l => `
                  <li>
                    <button class="dropdown-item py-2 d-flex justify-content-between align-items-center lang-option-btn ${l.code === currentLang ? 'active fw-bold' : ''}" data-lang="${l.code}">
                      <span>${l.nativeName} <small class="text-muted">(${l.name})</small></span>
                      ${l.code === currentLang ? '<i class="bi bi-check2 text-success fw-bold"></i>' : ''}
                    </button>
                  </li>
                `).join('')}
              </ul>
            </div>

            ${currentUser ? `
              <!-- Real-Time Notifications Dropdown -->
              <div class="dropdown me-2 position-relative" id="notificationsDropdownWrapper">
                <button class="btn btn-light position-relative p-2 rounded-circle notification-bell-btn border dropdown-toggle" 
                        type="button" 
                        id="notificationBellBtn" 
                        data-bs-toggle="dropdown" 
                        data-bs-auto-close="outside"
                        aria-expanded="false" 
                        title="Notifications">
                  <i class="bi bi-bell-fill fs-5 text-secondary"></i>
                  <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none notification-badge" id="notificationBadge">
                    0
                  </span>
                </button>
                <div class="dropdown-menu dropdown-menu-end shadow-lg border-0 p-0 notification-dropdown-menu" id="notificationDropdownMenu" aria-labelledby="notificationBellBtn" style="width: 360px; max-width: 92vw;">
                  <div class="d-flex justify-content-between align-items-center p-3 border-bottom bg-light rounded-top">
                    <div class="d-flex align-items-center gap-2">
                      <i class="bi bi-bell-fill text-primary"></i>
                      <span class="fw-bold text-dark" data-i18n="notif_title">Notifications</span>
                      <span class="badge bg-primary rounded-pill small" id="notificationUnreadCountPill">0</span>
                    </div>
                    <button class="btn btn-link btn-sm text-decoration-none p-0 text-primary small fw-semibold" id="markAllReadBtn" data-i18n="notif_mark_all_read">
                      <i class="bi bi-check2-all me-1"></i> Mark all read
                    </button>
                  </div>
                  <div class="notification-list-container" id="notificationListContainer" style="max-height: 380px; overflow-y: auto;">
                    <div class="text-center py-4 text-muted">
                      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                      <div class="small mt-2">Loading notifications...</div>
                    </div>
                  </div>
                  <div class="p-2 border-top bg-light text-center small rounded-bottom d-flex justify-content-between align-items-center px-3">
                    <span class="text-muted" style="font-size: 0.75rem;">
                      <i class="bi bi-broadcast text-success me-1"></i> Real-time Firestore sync
                    </span>
                    <button class="btn btn-link btn-sm text-muted text-decoration-none p-0" id="clearAllNotifsBtn" style="font-size: 0.75rem;" data-i18n="notif_clear">
                      Clear list
                    </button>
                  </div>
                </div>
              </div>

              <div class="dropdown">
                <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 py-1 px-3" type="button" id="userMenuBtn" data-bs-toggle="dropdown" aria-expanded="false">
                  <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-weight: 600;">
                    ${(currentUser.displayName || currentUser.firmName || currentUser.companyName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span class="d-none d-md-inline fw-semibold small text-truncate" style="max-width: 140px;">
                    ${currentUser.displayName || currentUser.firmName || currentUser.companyName || 'Account'}
                  </span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userMenuBtn">
                  <li class="px-3 py-2 border-bottom">
                    <div class="fw-bold small text-primary">${currentUser.displayName || 'User'}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${currentUser.email}</div>
                    <span class="badge ${isAdmin ? 'bg-danger text-white' : 'bg-warning text-dark'} mt-1 text-uppercase">${isAdmin ? 'ADMIN' : currentUser.userType}</span>
                  </li>
                  ${isAdmin ? `
                    <li>
                      <a class="dropdown-item py-2 fw-semibold text-danger" href="admin.html">
                        <i class="bi bi-shield-lock-fill me-2 text-danger"></i> Admin Dashboard
                      </a>
                    </li>
                  ` : ''}
                  <li>
                    <a class="dropdown-item py-2" href="${isAdmin ? 'admin.html' : (isContractor ? 'dashboard-contractor.html' : 'dashboard-company.html')}">
                      <i class="bi bi-speedometer2 me-2 text-primary"></i> <span data-i18n="nav_dashboard">Dashboard</span>
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item py-2" href="my-profile.html">
                      <i class="bi bi-person-gear me-2 text-secondary"></i> <span data-i18n="nav_my_profile">My Profile</span>
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item py-2" href="${isContractor ? `profile-contractor.html?id=${currentUser.uid}` : `profile-company.html?id=${currentUser.uid}`}">
                      <i class="bi bi-eye me-2 text-info"></i> <span data-i18n="nav_public_profile">View Public Profile</span>
                    </a>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button class="dropdown-item py-2 text-danger" id="logoutBtn">
                      <i class="bi bi-box-arrow-right me-2"></i> <span data-i18n="nav_logout">Logout</span>
                    </button>
                  </li>
                </ul>
              </div>
            ` : `
              <!-- Logged Out Nav -->
              <a href="login.html" class="btn btn-outline-primary px-3" data-i18n="nav_login">Login</a>
              <a href="register.html" class="btn btn-orange px-3" data-i18n="nav_register">Register</a>
            `}
          </div>
        </div>
      </div>
    </nav>
  `;

  // Initialize real-time notifications if user is logged in
  if (currentUser) {
    setupNavbarNotifications(currentUser);
  }

  // Bind Language Change Buttons
  navContainer.querySelectorAll('.lang-option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedLang = e.currentTarget.getAttribute('data-lang');
      if (selectedLang) {
        setLanguage(selectedLang);
        renderNavbar(activePage);
        renderFooter();
        showToast(
          selectedLang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है।' :
          selectedLang === 'mr' ? 'भाषा बदलून मराठी करण्यात आली आहे.' :
          'Language changed to English.',
          'info',
          2500
        );
      }
    });
  });

  // Bind Logout Action
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutUser();
    });
  }

  // Apply translations to navbar
  applyTranslations(navContainer);
}

// --- Universal Footer Renderer ---
export function renderFooter() {
  const footerContainer = document.getElementById('footer-container');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <footer class="footer-custom">
      <div class="container">
        <div class="row g-4">
          <div class="col-lg-4 col-md-6">
            <div class="d-flex align-items-center gap-2 mb-3">
              <div class="brand-logo-icon">
                <i class="bi bi-cone-striped"></i>
              </div>
              <h4 class="text-white mb-0" data-i18n="brand_name">Pragati Connect</h4>
            </div>
            <p class="text-muted small" data-i18n="footer_tagline">
              "Pragati ka raasta, kaam se shuru" — India's premier B2B marketplace bridging the gap between specialized construction contractors and tier-1 EPC infrastructure giants.
            </p>
            <div class="d-flex gap-3 text-white fs-5 mt-3">
              <a href="#" class="text-muted hover-orange"><i class="bi bi-linkedin"></i></a>
              <a href="#" class="text-muted hover-orange"><i class="bi bi-twitter-x"></i></a>
              <a href="#" class="text-muted hover-orange"><i class="bi bi-facebook"></i></a>
              <a href="#" class="text-muted hover-orange"><i class="bi bi-whatsapp"></i></a>
            </div>
          </div>

          <div class="col-lg-2 col-md-6">
            <h5 class="text-white" data-i18n="footer_quick_links">Quick Links</h5>
            <ul class="list-unstyled small">
              <li class="mb-2"><a href="index.html" data-i18n="nav_home">Home</a></li>
              <li class="mb-2"><a href="browse-work.html" data-i18n="nav_browse_work">Browse Work Postings</a></li>
              <li class="mb-2"><a href="browse-contractors.html" data-i18n="nav_find_contractors">Find Contractors</a></li>
              <li class="mb-2"><a href="register.html" data-i18n="nav_register">Register</a></li>
              <li class="mb-2"><a href="login.html" data-i18n="nav_login">Login</a></li>
              <li class="mb-2"><a href="admin.html" class="text-warning-emphasis"><i class="bi bi-shield-lock me-1"></i> Admin Portal</a></li>
            </ul>
          </div>

          <div class="col-lg-3 col-md-6">
            <h5 class="text-white" data-i18n="footer_top_trades">Top Trades</h5>
            <ul class="list-unstyled small">
              <li class="mb-2"><a href="browse-contractors.html?trade=Civil" data-i18n="trade_civil">Civil & Earthwork</a></li>
              <li class="mb-2"><a href="browse-contractors.html?trade=MEP" data-i18n="trade_mep">MEP & HVAC Services</a></li>
              <li class="mb-2"><a href="browse-contractors.html?trade=Structural+Steel" data-i18n="trade_steel">Structural Steel & PEB</a></li>
              <li class="mb-2"><a href="browse-contractors.html?trade=Concrete" data-i18n="trade_concrete">Precast & Ready-Mix</a></li>
              <li class="mb-2"><a href="browse-contractors.html?trade=Road%2FHighway" data-i18n="trade_highway">Highways & Infrastructure</a></li>
            </ul>
          </div>

          <div class="col-lg-3 col-md-6">
            <h5 class="text-white" data-i18n="footer_help_support">Help & Support</h5>
            <p class="small text-muted mb-2"><i class="bi bi-envelope-fill me-2 text-warning"></i> support@pragaticonnect.in</p>
            <p class="small text-muted mb-2"><i class="bi bi-telephone-fill me-2 text-warning"></i> +91 1800 200 4567 (Toll Free)</p>
            <p class="small text-muted mb-3"><i class="bi bi-geo-alt-fill me-2 text-warning"></i> Mumbai • New Delhi • Bengaluru</p>
            <div class="p-2 rounded bg-dark border border-secondary text-center small text-light">
              <span class="badge bg-success me-1" data-i18n="status_active">Active</span> <span data-i18n="footer_verified_portal">100% Verified Indian Business Portal</span>
            </div>
          </div>
        </div>

        <div class="footer-bottom d-flex flex-column flex-md-row justify-content-between align-items-center">
          <p class="mb-0">© ${new Date().getFullYear()} <span data-i18n="footer_copyright">Pragati Connect Technologies Pvt Ltd. All rights reserved.</span></p>
          <div class="d-flex gap-3 mt-2 mt-md-0 small">
            <a href="#" class="text-muted">Privacy Policy</a>
            <a href="#" class="text-muted">Terms of Service</a>
            <a href="#" class="text-muted">Contractor Guidelines</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  applyTranslations(footerContainer);
}

// --- Universal Enquiry Modal Setup ---
export function setupEnquiryModal() {
  let modalEl = document.getElementById('enquiryModal');
  if (!modalEl) {
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = `
      <div class="modal fade" id="enquiryModal" tabindex="-1" aria-labelledby="enquiryModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title text-white" id="enquiryModalLabel">
                <i class="bi bi-envelope-paper me-2"></i> <span data-i18n="modal_enquiry_title">Send Business Enquiry</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="enquiryForm">
              <div class="modal-body p-4">
                <input type="hidden" id="enquiryToUid">
                <input type="hidden" id="enquiryToName">
                <input type="hidden" id="enquiryToType">
                <input type="hidden" id="enquiryRelatedPostingId">

                <div class="alert alert-light border d-flex align-items-center gap-2 mb-3">
                  <i class="bi bi-person-badge fs-4 text-primary"></i>
                  <div>
                    <div class="small text-muted" data-i18n="modal_recipient">Sending enquiry to:</div>
                    <div class="fw-bold text-primary" id="enquiryRecipientDisplay">Recipient Name</div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold"><span data-i18n="modal_subject">Subject / Scope Overview</span> <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" id="enquirySubject" data-i18n-ph="ph_subject" placeholder="e.g. Requirement for 2 Excavators in Pune" required>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold"><span data-i18n="modal_message">Detailed Message</span> <span class="text-danger">*</span></label>
                  <textarea class="form-control" id="enquiryMessage" rows="4" data-i18n-ph="ph_message" placeholder="Detail your project timeline, quantity, specifications or questions..." required></textarea>
                </div>
              </div>
              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="btn_cancel">Cancel</button>
                <button type="submit" class="btn btn-orange" id="enquirySubmitBtn">
                  <i class="bi bi-send me-1"></i> <span data-i18n="btn_send_enquiry">Send Enquiry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    modalEl = document.getElementById('enquiryModal');
    applyTranslations(modalEl);

    // Handle Form Submit
    const form = document.getElementById('enquiryForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        showToast('Please login to send an enquiry.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }

      const toUid = document.getElementById('enquiryToUid').value;
      const toName = document.getElementById('enquiryToName').value;
      const toType = document.getElementById('enquiryToType').value;
      const relatedWorkPostingId = document.getElementById('enquiryRelatedPostingId').value || null;
      const subject = document.getElementById('enquirySubject').value.trim();
      const message = document.getElementById('enquiryMessage').value.trim();

      const newEnquiry = {
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || currentUser.firmName || currentUser.companyName || 'Anonymous',
        fromType: currentUser.userType,
        toUid,
        toName,
        toType,
        subject,
        message,
        relatedWorkPostingId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      try {
        const savedEnquiry = await addDocument('enquiries', newEnquiry);

        // Notify recipient about new business enquiry (Requirement 2)
        const senderLabel = currentUser.companyName || currentUser.firmName || currentUser.displayName || 'Business Partner';
        await createNotification({
          recipientUid: toUid,
          senderUid: currentUser.uid,
          senderName: senderLabel,
          type: 'enquiry',
          title: 'New Business Enquiry',
          message: `${senderLabel} sent you an enquiry: "${subject}"`,
          icon: 'bi-envelope-paper-fill text-primary',
          link: toType === 'contractor' ? 'dashboard-contractor.html#myEnquiriesTableBody' : 'dashboard-company.html',
          metadata: {
            enquiryId: savedEnquiry?.id,
            subject,
            relatedWorkPostingId
          }
        });

        showToast('Enquiry sent successfully! The recipient has been notified.', 'success');
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
        form.reset();
      } catch (err) {
        console.error('Failed to send enquiry:', err);
        showToast('Could not send enquiry. Please try again.', 'error');
      }
    });
  }
}

export function openEnquiryModal({ toUid, toName, toType, relatedPostingId = null, defaultSubject = '' }) {
  setupEnquiryModal();
  document.getElementById('enquiryToUid').value = toUid;
  document.getElementById('enquiryToName').value = toName;
  document.getElementById('enquiryToType').value = toType;
  document.getElementById('enquiryRelatedPostingId').value = relatedPostingId || '';
  document.getElementById('enquiryRecipientDisplay').textContent = `${toName} (${toType})`;
  document.getElementById('enquirySubject').value = defaultSubject;

  const modalEl = document.getElementById('enquiryModal');
  applyTranslations(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

// --- Universal Apply Modal Setup ---
export function setupApplyModal() {
  let modalEl = document.getElementById('applyModal');
  if (!modalEl) {
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = `
      <div class="modal fade" id="applyModal" tabindex="-1" aria-labelledby="applyModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title text-white" id="applyModalLabel">
                <i class="bi bi-briefcase me-2"></i> <span data-i18n="modal_apply_title">Submit Contractor Bid / Application</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="applyForm">
              <div class="modal-body p-4">
                <input type="hidden" id="applyPostingId">
                <input type="hidden" id="applyCompanyName">

                <div class="alert alert-light border mb-3">
                  <div class="small text-muted">Applying for Project:</div>
                  <div class="fw-bold text-primary" id="applyProjectDisplay">Project Name</div>
                  <div class="small text-secondary" id="applyCompanyDisplay">Company Name</div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold"><span data-i18n="ph_cover_note">Cover Note / Key Capabilities</span> <span class="text-danger">*</span></label>
                  <textarea class="form-control" id="applyCoverMessage" rows="4" data-i18n-ph="ph_cover_note" placeholder="Briefly highlight your past similar projects, machinery ready to deploy, and workforce strength..." required></textarea>
                </div>

                <div class="row g-2 mb-3">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" data-i18n="modal_proposed_rate">Proposed Budget / Rate (₹)</label>
                    <input type="text" class="form-control" id="applyBudget" placeholder="e.g. ₹4.5 Cr or ₹450/sq.m">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" data-i18n="modal_proposed_timeline">Proposed Timeline</label>
                    <input type="text" class="form-control" id="applyTimeline" placeholder="e.g. 5 Months">
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="btn_cancel">Cancel</button>
                <button type="submit" class="btn btn-orange" id="applySubmitBtn">
                  <i class="bi bi-check-circle me-1"></i> <span data-i18n="btn_apply_bid">Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    modalEl = document.getElementById('applyModal');
    applyTranslations(modalEl);

    // Handle Form Submit
    const form = document.getElementById('applyForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        showToast('Please login as a contractor to apply.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }
      if (currentUser.userType !== 'contractor') {
        showToast('Only registered contractors can apply for work postings.', 'error');
        return;
      }

      const workPostingId = document.getElementById('applyPostingId').value;
      const coverMessage = document.getElementById('applyCoverMessage').value.trim();
      const proposedBudget = document.getElementById('applyBudget').value.trim();
      const proposedTimeline = document.getElementById('applyTimeline').value.trim();

      const newApplication = {
        workPostingId,
        contractorUid: currentUser.uid,
        contractorName: currentUser.displayName || currentUser.ownerName || 'Contractor',
        contractorFirmName: currentUser.firmName || currentUser.displayName || 'Contractor Firm',
        coverMessage,
        proposedBudget: proposedBudget || 'As per scope',
        proposedTimeline: proposedTimeline || 'Standard',
        status: 'applied',
        createdAt: new Date().toISOString()
      };

      try {
        const savedApp = await addDocument('applications', newApplication);

        // Increment application count on work posting
        const posting = await getDocument('workPostings', workPostingId);
        if (posting) {
          await updateDocument('workPostings', workPostingId, {
            applicationsCount: (posting.applicationsCount || 0) + 1
          });

          // Notify company about new work application (Requirement 3)
          if (posting.companyUid) {
            const contractorTitle = currentUser.firmName || currentUser.displayName || 'Contractor';
            await createNotification({
              recipientUid: posting.companyUid,
              senderUid: currentUser.uid,
              senderName: contractorTitle,
              type: 'application',
              title: 'New Work Application Received',
              message: `${contractorTitle} submitted a bid of ${proposedBudget || 'standard rate'} for "${posting.projectName}"`,
              icon: 'bi-briefcase-fill text-warning',
              link: 'dashboard-company.html#recentApplicationsSection',
              metadata: {
                applicationId: savedApp?.id,
                workPostingId,
                projectName: posting.projectName,
                budget: proposedBudget
              }
            });
          }
        }

        showToast('Application submitted successfully! The company will review your profile.', 'success');
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
        form.reset();
      } catch (err) {
        console.error('Failed to submit application:', err);
        showToast('Failed to submit application. Please try again.', 'error');
      }
    });
  }
}

export function openApplyModal({ postingId, projectName, companyName }) {
  setupApplyModal();
  document.getElementById('applyPostingId').value = postingId;
  document.getElementById('applyCompanyName').value = companyName;
  document.getElementById('applyProjectDisplay').textContent = projectName;
  document.getElementById('applyCompanyDisplay').textContent = companyName;

  const modalEl = document.getElementById('applyModal');
  applyTranslations(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

// --- Logout User ---
export async function logoutUser() {
  if (isFirebaseLive && auth) {
    try {
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
  }
  setCurrentUser(null);
  showToast('You have been logged out.', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 800);
}

// --- Page Guard Helpers ---
export function requireAuth(allowedRole = null) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to access this page.', 'warning');
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }, 1000);
    return false;
  }

  // Check onboarding completion (unless user is already on onboarding page)
  const currentPath = window.location.pathname;
  if (user.profileComplete === false && !currentPath.includes('onboarding')) {
    if (user.userType === 'contractor') {
      window.location.href = 'onboarding-contractor.html';
      return false;
    } else if (user.userType === 'company') {
      window.location.href = 'onboarding-company.html';
      return false;
    } else {
      window.location.href = 'login.html';
      return false;
    }
  }

  if (allowedRole && user.userType !== allowedRole && user.userType !== 'admin') {
    showToast(`Access restricted. This page is for ${allowedRole} accounts only.`, 'error');
    setTimeout(() => {
      window.location.href = user.userType === 'contractor' ? 'dashboard-contractor.html' : 'dashboard-company.html';
    }, 1200);
    return false;
  }

  return true;
}

// --- Mobile Bottom Navigation Bar (Requirement 5) ---
export function renderBottomNav(activeTab = 'home', userType = null) {
  const currentUser = getCurrentUser();
  const effectiveType = userType || currentUser?.userType || 'contractor';
  
  let existingNav = document.getElementById('mobileBottomNav');
  if (existingNav) existingNav.remove();

  document.body.classList.add('has-bottom-nav');

  const bottomNav = document.createElement('nav');
  bottomNav.id = 'mobileBottomNav';
  bottomNav.className = 'mobile-bottom-nav d-md-none';

  if (effectiveType === 'contractor') {
    bottomNav.innerHTML = `
      <a href="dashboard-contractor.html" class="mobile-nav-item ${activeTab === 'home' ? 'active' : ''}">
        <i class="bi bi-speedometer2"></i>
        <span>Home</span>
      </a>
      <a href="browse-work.html" class="mobile-nav-item ${activeTab === 'browse' ? 'active' : ''}">
        <i class="bi bi-briefcase"></i>
        <span>Work</span>
      </a>
      <a href="dashboard-contractor.html#myApplicationsSection" class="mobile-nav-item ${activeTab === 'applications' ? 'active' : ''}">
        <i class="bi bi-send-check"></i>
        <span>Bids</span>
      </a>
      <a href="dashboard-contractor.html#myEnquiriesSection" class="mobile-nav-item ${activeTab === 'messages' ? 'active' : ''}">
        <i class="bi bi-chat-dots"></i>
        <span>Enquiries</span>
      </a>
      <a href="my-profile.html" class="mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}">
        <i class="bi bi-person"></i>
        <span>Profile</span>
      </a>
    `;
  } else {
    // Company Bottom Nav
    bottomNav.innerHTML = `
      <a href="dashboard-company.html" class="mobile-nav-item ${activeTab === 'home' ? 'active' : ''}">
        <i class="bi bi-speedometer2"></i>
        <span>Home</span>
      </a>
      <a href="browse-contractors.html" class="mobile-nav-item ${activeTab === 'contractors' ? 'active' : ''}">
        <i class="bi bi-people"></i>
        <span>Find</span>
      </a>
      <a href="post-work.html" class="mobile-nav-item ${activeTab === 'post' ? 'active' : ''}">
        <i class="bi bi-plus-circle-fill text-warning fs-5"></i>
        <span>Post Work</span>
      </a>
      <a href="dashboard-company.html#recentApplicationsSection" class="mobile-nav-item ${activeTab === 'applications' ? 'active' : ''}">
        <i class="bi bi-inbox"></i>
        <span>Bids</span>
      </a>
      <a href="my-profile.html" class="mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}">
        <i class="bi bi-building"></i>
        <span>Profile</span>
      </a>
    `;
  }

  document.body.appendChild(bottomNav);
}

// Initialize components upon document ready & listen for language switch
document.addEventListener('DOMContentLoaded', () => {
  setupEnquiryModal();
  setupApplyModal();
  applyTranslations();
});

window.addEventListener('languageChanged', () => {
  applyTranslations();
});

