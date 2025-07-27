import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
};

export const meetingsAPI = {
  create: (meetingData) => api.post('/meetings', meetingData),
  getAll: () => api.get('/meetings'),
  getByUuid: (uuid) => api.get(`/meetings/${uuid}`),
  start: (uuid) => api.put(`/meetings/${uuid}/start`),
  end: (uuid, transcript = '') => api.put(`/meetings/${uuid}/end`, null, {
    params: { transcript }
  }),
  update: (uuid, data) => api.put(`/meetings/${uuid}`, data),
};

export const aiProfilesAPI = {
  create: (profileData) => api.post('/ai-profiles', profileData),
  getAll: () => api.get('/ai-profiles'),
  getById: (id) => api.get(`/ai-profiles/${id}`),
  update: (id, data) => api.put(`/ai-profiles/${id}`, data),
  delete: (id) => api.delete(`/ai-profiles/${id}`),
  uploadPdf: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/ai-profiles/${id}/upload-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const chatAPI = {
  getHistory: (meetingUuid) => api.get(`/chat/${meetingUuid}/messages`),
  sendMessage: (meetingUuid, message) => api.post(`/chat/${meetingUuid}/send`, { message }),
  generateResponse: (meetingUuid, message) => api.post(`/chat/${meetingUuid}/generate-response`, { message }),
};

export const audioAPI = {
  processAudio: (meetingUuid, audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.wav');
    return api.post(`/audio/${meetingUuid}/process`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
  },
  transcribe: (meetingUuid, audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.wav');
    return api.post(`/audio/${meetingUuid}/transcribe`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  synthesize: (meetingUuid, text) => {
    return api.post(`/audio/${meetingUuid}/synthesize`, null, {
      params: { text },
      responseType: 'blob',
    });
  },
  testTts: (meetingUuid) => {
    return api.get(`/audio/${meetingUuid}/test-tts`);
  },
};

export default api;