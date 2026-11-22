import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Building2,
  FileSpreadsheet,
  BookOpenCheck,
  TrendingUp,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Code2
} from 'lucide-react';

export const Dashboard = ({ onNavigate, onLaunchSearch }) => {
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickQuery, setQuickQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsRes, jobsRes] = await Promise.all([
          api.getDashboardStats(),
          api.getJobs({ limit: 4 }),
        ]);
        setStats(statsRes.data);
        setRecentJobs(jobsRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onLaunchSearch(quickQuery.trim());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero AI Search Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-8 text-white shadow-md border border-slate-700/50">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Placement Intelligence Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Historical DTU Campus Placement Intelligence
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Query historical WhatsApp announcements, student-verified interview rounds, and company-wise LeetCode datasets powered by Gemini RAG and structured MongoDB filters.
          </p>

          <form onSubmit={handleQuickSearch} className="flex items-center space-x-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="e.g. Which companies offered 15+ LPA and what were their interview experiences at DTU?"
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/15"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 font-medium text-sm rounded-xl transition flex items-center space-x-1.5 shadow-sm"
            >
              <span>Ask AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Live Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Companies</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{stats?.totalCompanies || 0}</span>
            <p className="text-xs text-slate-500 mt-1">Recruiting organizations</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Placement Notices</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{stats?.totalJobs || 0}</span>
            <p className="text-xs text-slate-500 mt-1">WhatsApp announcement records</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Interview Experiences</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpenCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{stats?.totalExperiences || 0}</span>
            <p className="text-xs text-slate-500 mt-1">Student verified reports</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Highest Package</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">
              {stats?.highestCtc ? `${stats.highestCtc} LPA` : 'N/A'}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Avg: {stats?.avgCtc ? `${stats.avgCtc} LPA` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Top Topics + Recent Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Top Interview Topics */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <span>Frequent Interview Topics</span>
            </h2>
            <span className="text-xs text-slate-400">From student reports</span>
          </div>
          <p className="text-xs text-slate-500">
            Algorithmic topics most frequently tested during technical rounds at DTU.
          </p>

          <div className="space-y-2 pt-2">
            {stats?.topTopics && stats.topTopics.length > 0 ? (
              stats.topTopics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => onLaunchSearch(`What was asked regarding ${topic.topic} in interviews at DTU?`)}
                >
                  <span className="text-xs font-semibold text-slate-800">{topic.topic}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                    {topic.count} mentions
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                Submit interview experiences to populate real topic analytics.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Historical Placement Records */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Historical Placement Records</h2>
              <p className="text-xs text-slate-500">Extracted from authorized WhatsApp exports and campus notices</p>
            </div>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <div key={job._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{job.company}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize font-medium">
                        {job.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {job.role} • Batch {job.batch || 'All'} • Eligible: {job.eligibleBranches?.slice(0, 3).join(', ') || 'All'}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                      {job.ctc ? `${job.ctc} LPA` : job.stipend || 'Competitive'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No job announcements ingested yet. Use Admin Ingestion to add historical announcements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
