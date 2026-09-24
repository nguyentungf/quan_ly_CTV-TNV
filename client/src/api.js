// API Client cho toàn bộ hệ thống Quản lý CTV & TNV

const API_BASE = '/api';

export const api = {
  // ===================== CTV APIs =====================
  getCtvMembers: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/ctv/members?${q}`);
    return res.json();
  },

  createCtvMember: async (data) => {
    const res = await fetch(`${API_BASE}/ctv/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateCtvMember: async (id, data) => {
    const res = await fetch(`${API_BASE}/ctv/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteCtvMember: async (id) => {
    const res = await fetch(`${API_BASE}/ctv/members/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  bulkActionCtv: async (action, memberIds, payload = {}) => {
    const res = await fetch(`${API_BASE}/ctv/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, memberIds, payload }),
    });
    return res.json();
  },

  getCtvGroupsSummary: async () => {
    const res = await fetch(`${API_BASE}/ctv/groups-summary`);
    return res.json();
  },

  getCtvEvents: async () => {
    const res = await fetch(`${API_BASE}/ctv/events`);
    return res.json();
  },

  initCtv19Weeks: async () => {
    const res = await fetch(`${API_BASE}/ctv/init-19-weeks`, { method: 'POST' });
    return res.json();
  },

  createCtvEvent: async (data) => {
    const res = await fetch(`${API_BASE}/ctv/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteCtvEvent: async (id) => {
    const res = await fetch(`${API_BASE}/ctv/events/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  getCtvAttendanceMatrix: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/ctv/attendance-matrix?${q}`);
    return res.json();
  },

  updateCtvAttendance: async (memberId, eventId, status) => {
    const res = await fetch(`${API_BASE}/ctv/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, eventId, status }),
    });
    return res.json();
  },

  rateCtvAttitudeActivity: async (data) => {
    const res = await fetch(`${API_BASE}/ctv/attitude-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getCtvPointLogs: async (memberId) => {
    const res = await fetch(`${API_BASE}/ctv/point-logs/${memberId}`);
    return res.json();
  },

  mergeCtvGroups: async (sourceGroup, targetGroup, notes) => {
    const res = await fetch(`${API_BASE}/ctv/merge-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceGroup, targetGroup, notes }),
    });
    return res.json();
  },

  getCtvMergeLogs: async () => {
    const res = await fetch(`${API_BASE}/ctv/merge-logs`);
    return res.json();
  },

  importCtvFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/ctv/import-file`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  importCtvCsv: async (file) => {
    return api.importCtvFile(file);
  },

  // ===================== TNV APIs =====================
  getTnvMembers: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/tnv/members?${q}`);
    return res.json();
  },

  createTnvMember: async (data) => {
    const res = await fetch(`${API_BASE}/tnv/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateTnvMember: async (id, data) => {
    const res = await fetch(`${API_BASE}/tnv/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteTnvMember: async (id) => {
    const res = await fetch(`${API_BASE}/tnv/members/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  bulkActionTnv: async (action, memberIds, payload = {}) => {
    const res = await fetch(`${API_BASE}/tnv/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, memberIds, payload }),
    });
    return res.json();
  },

  getTnvGroupsSummary: async () => {
    const res = await fetch(`${API_BASE}/tnv/groups-summary`);
    return res.json();
  },

  getTnvLeaderboard: async () => {
    const res = await fetch(`${API_BASE}/tnv/leaderboard`);
    return res.json();
  },

  getTnvDisciplineBoard: async () => {
    const res = await fetch(`${API_BASE}/tnv/discipline-board`);
    return res.json();
  },

  updateTnvWarning: async (memberId, warningLevel, warningNote) => {
    const res = await fetch(`${API_BASE}/tnv/warning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, warningLevel, warningNote }),
    });
    return res.json();
  },

  getTnvEvents: async () => {
    const res = await fetch(`${API_BASE}/tnv/events`);
    return res.json();
  },

  initTnv19Weeks: async () => {
    const res = await fetch(`${API_BASE}/tnv/init-19-weeks`, { method: 'POST' });
    return res.json();
  },

  createTnvEvent: async (data) => {
    const res = await fetch(`${API_BASE}/tnv/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteTnvEvent: async (id) => {
    const res = await fetch(`${API_BASE}/tnv/events/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  getTnvAttendanceTracker: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/tnv/attendance-tracker?${q}`);
    return res.json();
  },

  updateTnvAttendance: async (memberId, eventId, status) => {
    const res = await fetch(`${API_BASE}/tnv/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, eventId, status }),
    });
    return res.json();
  },

  recordTnvActivity: async (data) => {
    const res = await fetch(`${API_BASE}/tnv/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getTnvActivities: async (memberId) => {
    const res = await fetch(`${API_BASE}/tnv/activities/${memberId}`);
    return res.json();
  },

  importTnvFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/tnv/import-file`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  importTnvCsv: async (file) => {
    return api.importTnvFile(file);
  },

  // ===================== CAMPAIGNS & ACTIVITIES APIs =====================
  getCampaigns: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/campaigns?${q}`);
    return res.json();
  },

  createCampaign: async (data) => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateCampaign: async (id, data) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteCampaign: async (id) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  getCampaignRegistrations: async (id, params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/campaigns/${id}/registrations?${q}`);
    return res.json();
  },

  registerCampaign: async (campaignId, data) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  registerCampaignGroup: async (campaignId, data) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/register-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateCampaignAttendance: async (campaignId, data) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteCampaignRegistration: async (campaignId, registrationId) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/registrations/${registrationId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Reset database về trạng thái mẫu ban đầu
  resetSeed: async () => {
    const res = await fetch(`${API_BASE}/reset-seed`, { method: 'POST' });
    return res.json();
  }
};
