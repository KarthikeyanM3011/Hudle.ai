export const MEETING_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Updated to match backend expectations (uppercase values)
export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

// Helper function to normalize gender values
export const normalizeGender = (gender) => {
  if (!gender) return 'MALE';
  
  const genderStr = String(gender).toUpperCase().trim();
  
  // Handle various formats
  if (['FEMALE', 'F', 'WOMAN'].includes(genderStr)) {
    return 'FEMALE';
  } else {
    return 'MALE'; // Default for any other value
  }
};

export const COACH_ROLES = [
  'Interview Coach',
  'Sales Trainer', 
  'Presentation Coach',
  'Leadership Mentor',
  'Academic Tutor',
  'Fitness Trainer',
  'Language Teacher',
  'Career Counselor',
  'Business Consultant',
  'Technical Mentor',
  'Life Coach',
  'Executive Coach',
  'Communication Coach',
  'Public Speaking Coach',
  'Negotiation Coach',
  'Product Manager Coach',
  'Startup Mentor',
  'Marketing Coach',
  'Financial Advisor',
  'Wellness Coach',
];

export const DOMAIN_EXPERTISE = [
  'Software Development',
  'Data Science',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'Human Resources',
  'Design',
  'Engineering',
  'Healthcare',
  'Education',
  'Legal',
  'Consulting',
  'Real Estate',
  'Retail',
  'Technology',
  'Media & Communications',
  'Non-Profit',
  'Government',
  'Sports & Fitness',
  'Manufacturing',
  'Automotive',
  'Aviation',
  'Energy',
  'Banking',
  'Insurance',
  'Telecommunications',
  'Food & Beverage',
  'Fashion',
  'Entertainment',
];

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  MEETING: '/meeting',
  CONFIG: '/config',
  PROFILES: '/profiles',
  MEETINGS: '/meetings',
};