import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Building,
  GraduationCap,
  Calendar,
  DollarSign,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';

export const JobsView = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [minCtc, setMinCtc] = useState('');
  const [branch, setBranch] = useState('');
  const [batch, setBatch] = useState('');
  const [jobType, setJobType] = useState('');

  const branches = ['COE', 'IT', 'SE', 'ECE', 'EE', 'ME', 'CE', 'EP', 'ENE', 'MAM', 'BT'];

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (minCtc) params.minCtc = minCtc;
      if (branch) params.branch = branch;
      if (batch) params.batch = batch;
      if (jobType) params.type = jobType;

      const res = await api.getJobs(params);
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [minCtc, branch, batch, jobType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleReset = () => {
    setSearch('');
    setMinCtc('');
    setBranch('');
    setBatch('');
    setJobType('');
    setTimeout(fetchJobs, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historical Placement Records</h1>
          <p className="text-sm text-slate-500">
            Filter structured records by CTC, eligible engineering branches, CGPA, and role.
          </p>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{jobs.length}</span> records
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name or role..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={minCtc}
              onChange={(e) => setMinCtc(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Min CTC (Any)</option>
              <option value="10">≥ 10 LPA</option>
              <option value="15">≥ 15 LPA</option>
              <option value="20">≥ 20 LPA</option>
              <option value="30">≥ 30 LPA</option>
              <option value="40">≥ 40 LPA</option>
            </select>

            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Batch (All)</option>
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Type (All)</option>
              <option value="full-time">Full-Time</option>
              <option value="internship">Internship</option>
              <option value="internship+fte">Internship + FTE</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Company & Role</th>
                  <th className="px-5 py-3.5">Package (CTC / Stipend)</th>
                  <th className="px-5 py-3.5">Eligible Branches</th>
                  <th className="px-5 py-3.5">Min CGPA</th>
                  <th className="px-5 py-3.5">Type & Batch</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{job.company}</div>
                      <div className="text-xs text-slate-500">{job.role}</div>
                    </td>
                    <td className="px-5 py-4">
                      {job.ctc ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block text-xs">
                          {job.ctc} LPA
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-medium">
                          {job.stipend || 'Stipend'}
                        </span>
                      )}
                      {job.ctcBreakup && (
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] truncate">
                          {job.ctcBreakup}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {job.eligibleBranches && job.eligibleBranches.length > 0 ? (
                          job.eligibleBranches.map((b) => (
                            <span key={b} className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">All Branches</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-slate-700">
                        {job.minCgpa === 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-bold">
                            0 (No Cutoff)
                          </span>
                        ) : job.minCgpa !== null && job.minCgpa !== undefined ? (
                          `${job.minCgpa} CGPA`
                        ) : (
                          <span className="text-slate-400">No cutoff</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs capitalize font-medium text-slate-800 block">
                        {job.type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Batch: {job.batch || 'Any'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            No historical records matched your filter criteria.
          </div>
        )}
      </div>

      {/* Slide-out Record Inspection Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedJob.company}</h3>
                <p className="text-xs text-slate-500">{selectedJob.role}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">CTC / Stipend</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedJob.ctc ? `${selectedJob.ctc} LPA` : selectedJob.stipend || 'N/A'}
                </span>
                {selectedJob.ctcBreakup && (
                  <span className="text-[11px] text-slate-500 block mt-0.5">{selectedJob.ctcBreakup}</span>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">CGPA Cutoff</span>
                <span className="font-bold text-slate-900">
                  {selectedJob.minCgpa === 0 ? '0 (No Cutoff)' : selectedJob.minCgpa !== null && selectedJob.minCgpa !== undefined ? selectedJob.minCgpa : 'None'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">10th / 12th Cutoff</span>
                <span className="font-bold text-slate-900">
                  {selectedJob.class10Percentage !== null && selectedJob.class10Percentage !== undefined ? `${selectedJob.class10Percentage}%` : 'None'} / {selectedJob.class12Percentage !== null && selectedJob.class12Percentage !== undefined ? `${selectedJob.class12Percentage}%` : 'None'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Backlogs: {selectedJob.allowedBacklogs !== null && selectedJob.allowedBacklogs !== undefined ? selectedJob.allowedBacklogs : 'Not specified'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">Batch</span>
                <span className="font-bold text-slate-900">
                  {selectedJob.batch || 'Unspecified'}
                </span>
              </div>
            </div>

            {selectedJob.eligibleBranches?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Eligible Branches
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.eligibleBranches.map((b) => (
                    <span key={b} className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Original WhatsApp Announcement (Data Provenance)
              </span>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                {selectedJob.originalMessage}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
