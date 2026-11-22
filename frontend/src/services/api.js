const API_BASE = '/api';

export const api = {
  // Dashboard & Statistics
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/companies/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Companies Directory
  async getCompanies(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/companies?${query}`);
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  },

  // Historical Jobs
  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/jobs?${query}`);
    if (!res.ok) throw new Error('Failed to fetch historical placement records');
    return res.json();
  },

  async createJob(payload) {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save job record');
    }
    return res.json();
  },

  async bulkImportJobs(jobs) {
    const res = await fetch(`${API_BASE}/jobs/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to bulk import jobs');
    }
    return res.json();
  },

  // Student Experiences
  async getExperiences(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/experiences?${query}`);
    if (!res.ok) throw new Error('Failed to fetch interview experiences');
    return res.json();
  },

  async createExperience(payload) {
    const res = await fetch(`${API_BASE}/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save experience');
    }
    return res.json();
  },

  async extractExperience(payload) {
    const res = await fetch(`${API_BASE}/experiences/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to extract structured details from narrative');
    }
    return res.json();
  },

  // Admin Ingestion
  async extractJobAnnouncement(announcementText) {
    const res = await fetch(`${API_BASE}/admin/extract-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to extract announcement details');
    }
    return res.json();
  },

  async importLeetCodeCsv(filePath) {
    const res = await fetch(`${API_BASE}/admin/import-leetcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to import LeetCode CSV');
    }
    return res.json();
  },

  // LeetCode Questions
  async getLeetCodeQuestions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/leetcode?${query}`);
    if (!res.ok) throw new Error('Failed to fetch LeetCode questions');
    return res.json();
  },

  // AI Assistant Query
  async queryAssistant(question) {
    const res = await fetch(`${API_BASE}/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Assistant query failed');
    }
    return res.json();
  },

  async getSuggestedQueries() {
    const res = await fetch(`${API_BASE}/assistant/examples`);
    if (!res.ok) throw new Error('Failed to fetch suggested queries');
    return res.json();
  },
};
