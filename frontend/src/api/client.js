import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const ACCESS_TOKEN_KEY = 'careerlens_access_token';
const REFRESH_TOKEN_KEY = 'careerlens_refresh_token';

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

export function setAuthTokens({ access = '', refresh = '' } = {}) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login/') ||
      url.includes('/auth/signup/') ||
      url.includes('/auth/google/') ||
      url.includes('/auth/refresh/') ||
      url.includes('/auth/logout/');

    if (status === 401 && !isAuthEndpoint) {
      clearAuthTokens();

      const publicPaths = ['/', '/login', '/signup'];
      const currentPath = window.location.pathname;
      const isPublicPath = publicPaths.includes(currentPath);

      if (!isPublicPath && currentPath !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Something went wrong.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;

  const firstKey = Object.keys(data)[0];

  if (firstKey) {
    const value = data[firstKey];
    if (Array.isArray(value)) return `${firstKey}: ${value.join(' ')}`;
    if (typeof value === 'string') return `${firstKey}: ${value}`;
  }

  return 'Something went wrong.';
}

export async function signupUser(payload) {
  const response = await api.post('/auth/signup/', payload);
  return response.data;
}

export async function loginUser({ username, password }) {
  const response = await api.post('/auth/login/', {
    username,
    password,
  });
  return response.data;
}

export async function googleLoginUser(credential) {
  const response = await api.post('/auth/google/', {
    credential,
  });

  return response.data;
}

export async function fetchProfile() {
  const response = await api.get('/auth/profile/');
  return response.data;
}

export async function updateProfile(payload) {
  const response = await api.patch('/auth/profile/', payload);
  return response.data;
}

export async function logoutUser(refresh) {
  const response = await api.post('/auth/logout/', {
    refresh,
  });
  return response.data;
}

export async function fetchResumes() {
  const response = await api.get('/resumes/');
  return response.data;
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/resumes/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateResume(resumeId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.patch(`/resumes/${resumeId}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteResume(resumeId) {
  await api.delete(`/resumes/${resumeId}/`);
}

export async function createAnalysis({ resumeId, jobTitle, jobDescription }) {
  const response = await api.post('/analysis/', {
    resume_id: resumeId,
    job_title: jobTitle,
    job_description: jobDescription,
  });
  return response.data;
}

export async function exportAnalysisPdf(reportId) {
  const response = await api.get(`/analysis/${reportId}/export-pdf/`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function fetchAnalysisReports() {
  const response = await api.get('/analysis/');
  return response.data;
}

export async function fetchLatestAnalysisReport() {
  const response = await api.get('/analysis/latest/');
  return response.data || null;
}

export async function tailorResume(reportId, payload = {}) {
  const response = await api.post(`/analysis/${reportId}/tailor-resume/`, payload);
  return response.data;
}

export async function fetchDashboard({ useAi = false } = {}) {
  const response = await api.get('/analysis/dashboard/', {
    params: { ai: useAi ? 'true' : 'false' },
  });
  return response.data;
}

export async function fetchRecommendedJobs({
  query = '',
  country = '',
  sort = 'relevance',
  maxDaysOld = 30,
} = {}) {
  const response = await api.get('/analysis/jobs/', {
    params: {
      query: query || undefined,
      country: country || undefined,
      sort: sort || undefined,
      max_days_old: maxDaysOld || 30,
    },
  });

  return response.data;
}

export async function fetchApplications({ status = '', priority = '', search = '' } = {}) {
  const response = await api.get('/applications/', {
    params: {
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined,
    },
  });

  return response.data;
}

export async function fetchApplicationSummary() {
  const response = await api.get('/applications/summary/');
  return response.data;
}

export async function createApplication(payload) {
  const response = await api.post('/applications/', payload);
  return response.data;
}

export async function updateApplication(applicationId, payload) {
  const response = await api.patch(`/applications/${applicationId}/`, payload);
  return response.data;
}

export async function deleteApplication(applicationId) {
  await api.delete(`/applications/${applicationId}/`);
}

export async function getAdminStats() {
  const response = await api.get('/admin/stats/');
  return response.data;
}

export async function getAdminUsers(params = {}) {
  const response = await api.get('/admin/users/', { params });
  return response.data;
}

export async function createAdminUser(payload) {
  const response = await api.post('/admin/users/', payload);
  return response.data;
}

export async function updateAdminUser(userId, payload) {
  const response = await api.patch(`/admin/users/${userId}/`, payload);
  return response.data;
}

export async function deactivateAdminUser(userId) {
  const response = await api.delete(`/admin/users/${userId}/`);
  return response.data;
}

export async function generateCoverLetter(reportId, payload = {}) {
  const response = await api.post(`/analysis/${reportId}/cover-letter/`, payload);
  return response.data;
}

export async function generateInterviewPrep(reportId, payload = {}) {
  const response = await api.post(`/analysis/${reportId}/interview-prep/`, payload);
  return response.data;
}

export async function generateResumeInterviewPrep(resumeId, payload = {}) {
  const response = await api.post(`/resumes/${resumeId}/interview-prep/`, payload);
  return response.data;
}

export default api;