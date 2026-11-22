import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BookOpenCheck,
  Search,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

export const ExperiencesView = () => {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('');
  const [year, setYear] = useState('');

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const params = {};
      if (company.trim()) params.company = company.trim();
      if (topic.trim()) params.topic = topic.trim();
      if (year) params.year = year;

      const res = await api.getExperiences(params);
      setExperiences(res.data || []);
    } catch (err) {
      console.error('Error fetching experiences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, [year]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExperiences();
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Interview Experiences</h1>
          <p className="text-sm text-slate-500">
            Authentic, student-verified interview rounds, DSA topics asked, and detailed narratives at DTU.
          </p>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{experiences.length}</span> experiences
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Filter by company name (e.g. Amazon, Google)..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative flex-1">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Filter by DSA topic (e.g. Trees, DP, Graphs)..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Placement Years</option>
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Experiences List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : experiences.length > 0 ? (
          experiences.map((exp) => {
            const isExpanded = expandedId === exp._id;
            const rounds = exp.extractedStructure?.rounds || [];
            const topics = exp.extractedStructure?.dsaTopics || [];

            return (
              <div
                key={exp._id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 transition hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h3 className="text-base font-bold text-slate-900">{exp.company}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {exp.extractedStructure?.overallVerdict || 'Verified'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Class of {exp.placementYear}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {exp.role} • Difficulty: <span className="font-semibold">{exp.extractedStructure?.difficulty || 'Medium'}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => toggleExpand(exp._id)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition"
                  >
                    <span>{isExpanded ? 'Collapse Narrative' : 'View Full Details'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Structured Rounds Preview */}
                {rounds.length > 0 && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap gap-2">
                    {rounds.map((r, idx) => (
                      <div
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium"
                      >
                        <span className="font-bold text-slate-900">{r.roundName || `Round ${r.roundNumber}`}:</span>{' '}
                        {r.topicsCovered?.join(', ') || r.roundType}
                      </div>
                    ))}
                  </div>
                )}

                {/* DSA Topics Badges */}
                {topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                      DSA:
                    </span>
                    {topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded Full Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs">
                    {/* Rounds Deep Dive */}
                    {rounds.map((r, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            {r.roundNumber}
                          </span>
                          <span>{r.roundName || `Round ${r.roundNumber}`} ({r.roundType})</span>
                        </div>
                        {r.description && <p className="text-slate-600">{r.description}</p>}
                        {r.questions?.length > 0 && (
                          <div className="pt-1 text-slate-700">
                            <span className="font-semibold">Questions:</span> {r.questions.join('; ')}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Original Student Narrative */}
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">
                        Original Student Narrative (Preserved):
                      </span>
                      <div className="p-3.5 bg-slate-100 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                        {exp.originalNarrative}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
            No interview experiences found matching your query.
          </div>
        )}
      </div>
    </div>
  );
};
