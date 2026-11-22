import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Sparkles, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const AdminIngestionModal = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('announcement'); // 'announcement', 'bulkJson', or 'leetcode'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab 1: Announcement Ingestion
  const [announcementText, setAnnouncementText] = useState('');
  const [extractedJob, setExtractedJob] = useState(null);

  // Tab 2: Bulk JSON Import
  const [rawJsonText, setRawJsonText] = useState('');
  const [bulkStats, setBulkStats] = useState(null);

  // Editable Form Fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [ctc, setCtc] = useState('');
  const [ctcBreakup, setCtcBreakup] = useState('');
  const [stipend, setStipend] = useState('');
  const [type, setType] = useState('full-time');
  const [branches, setBranches] = useState('COE, IT, SE');
  const [minCgpa, setMinCgpa] = useState('');
  const [class10Percentage, setClass10Percentage] = useState('');
  const [class12Percentage, setClass12Percentage] = useState('');
  const [allowedBacklogs, setAllowedBacklogs] = useState('');
  const [batch, setBatch] = useState('2025');

  // Tab 2: LeetCode Import
  const [importStats, setImportStats] = useState(null);

  if (!isOpen) return null;

  const handleExtractAnnouncement = async () => {
    if (!announcementText.trim()) {
      setError('Please paste an announcement message.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.extractJobAnnouncement(announcementText.trim());
      const data = res.data;
      setExtractedJob(data);

      setCompany(data.company || '');
      setRole(data.role || '');
      setCtc(data.ctc !== null && data.ctc !== undefined ? String(data.ctc) : '');
      setCtcBreakup(data.ctcBreakup || '');
      setStipend(data.stipend || '');
      setType(data.type || 'full-time');
      setBranches((data.eligibleBranches || []).join(', '));
      setMinCgpa(data.minCgpa !== null && data.minCgpa !== undefined ? String(data.minCgpa) : '');
      setClass10Percentage(data.class10Percentage !== null && data.class10Percentage !== undefined ? String(data.class10Percentage) : '');
      setClass12Percentage(data.class12Percentage !== null && data.class12Percentage !== undefined ? String(data.class12Percentage) : '');
      setAllowedBacklogs(data.allowedBacklogs !== null && data.allowedBacklogs !== undefined ? String(data.allowedBacklogs) : '');
      setBatch(data.batch || '2025');
    } catch (err) {
      setError(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const parseNullableNum = (val) => {
    if (val === '' || val === null || val === undefined) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  const handleSaveJob = async () => {
    if (!company || !role) {
      setError('Company and Role are required.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const branchList = branches
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);

      const payload = {
        company: company.trim(),
        role: role.trim(),
        type,
        eligibleBranches: branchList,
        minCgpa: parseNullableNum(minCgpa),
        class10Percentage: parseNullableNum(class10Percentage),
        class12Percentage: parseNullableNum(class12Percentage),
        allowedBacklogs: parseNullableNum(allowedBacklogs),
        batch: batch.trim() || null,
        ctc: parseNullableNum(ctc),
        ctcBreakup: ctcBreakup.trim() || null,
        stipend: stipend.trim() || null,
        originalMessage: announcementText.trim(),
        status: 'published',
      };

      await api.createJob(payload);
      setSuccessMsg(`Successfully saved placement announcement for ${company}!`);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkJsonImport = async () => {
    if (!rawJsonText.trim()) {
      setError('Please paste a JSON array of placement records.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let parsed;
      try {
        parsed = JSON.parse(rawJsonText.trim());
      } catch (e) {
        throw new Error('Invalid JSON syntax. Please verify that the pasted text is valid JSON.');
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Expected a JSON array [...] containing job objects.');
      }

      const res = await api.bulkImportJobs(parsed);
      setBulkStats(res.data);
      setSuccessMsg(`Successfully imported ${res.data?.total || parsed.length} placement records to MongoDB!`);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to import JSON records');
    } finally {
      setLoading(false);
    }
  };

  const handleImportLeetCode = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await api.importLeetCodeCsv('data/leetcode_sample.csv');
      setImportStats(res.data);
      setSuccessMsg('LeetCode dataset imported successfully without duplicates!');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to import LeetCode CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Admin Placement Ingestion</h2>
            <p className="text-xs text-slate-500">
              Ingest historical WhatsApp announcements or import company-wise LeetCode datasets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center space-x-2 border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs flex items-center space-x-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('announcement')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              activeTab === 'announcement'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            WhatsApp Notice Ingestion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulkJson')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              activeTab === 'bulkJson'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Bulk JSON Import (ChatGPT)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leetcode')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              activeTab === 'leetcode'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            LeetCode Dataset Importer
          </button>
        </div>

        {activeTab === 'announcement' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Paste Original WhatsApp Placement Announcement
              </label>
              <textarea
                rows={5}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Paste original authorized WhatsApp export message or notice here..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {!extractedJob ? (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={loading || !announcementText.trim()}
                  onClick={handleExtractAnnouncement}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{loading ? 'Extracting via Gemini...' : 'Extract Structured Fields'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Review & Correct Extracted Fields</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Admin verification step</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Company *</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Role *</label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">CTC (in LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ctc}
                      onChange={(e) => setCtc(e.target.value)}
                      placeholder="e.g. 10 or 44.5"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">CTC Breakup / Notes</label>
                    <input
                      type="text"
                      value={ctcBreakup}
                      onChange={(e) => setCtcBreakup(e.target.value)}
                      placeholder="e.g. 10-15 LPA (PPO)"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Monthly Stipend</label>
                    <input
                      type="text"
                      value={stipend}
                      onChange={(e) => setStipend(e.target.value)}
                      placeholder="e.g. 50k pm or 1.25 Lakh/month"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Eligible Branches</label>
                    <input
                      type="text"
                      value={branches}
                      onChange={(e) => setBranches(e.target.value)}
                      placeholder="COE, IT, SE, ECE"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Min CGPA</label>
                      <input
                        type="number"
                        step="0.1"
                        value={minCgpa}
                        onChange={(e) => setMinCgpa(e.target.value)}
                        placeholder="0 or 7.5"
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Batch</label>
                      <input
                        type="text"
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        placeholder="2027"
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">10th Cutoff %</label>
                      <input
                        type="number"
                        step="1"
                        value={class10Percentage}
                        onChange={(e) => setClass10Percentage(e.target.value)}
                        placeholder="0 or 60"
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">12th Cutoff %</label>
                      <input
                        type="number"
                        step="1"
                        value={class12Percentage}
                        onChange={(e) => setClass12Percentage(e.target.value)}
                        placeholder="0 or 60"
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Backlogs Allowed</label>
                      <input
                        type="number"
                        step="1"
                        value={allowedBacklogs}
                        onChange={(e) => setAllowedBacklogs(e.target.value)}
                        placeholder="0"
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setExtractedJob(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSaveJob}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs"
                  >
                    {loading ? 'Saving...' : 'Save Placement Record to MongoDB'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'bulkJson' ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Paste JSON Array Generated by ChatGPT / External LLM
                </label>
                <span className="text-[11px] text-slate-400">Schema validated array: [...]</span>
              </div>
              <textarea
                rows={9}
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                placeholder='[
  {
    "company": "STRIDE AMC",
    "role": "Associate Product Manager",
    "type": "internship+fte",
    "eligibleBranches": ["CSE", "IT", "SE"],
    "minCgpa": 0,
    "ctc": 10,
    "ctcBreakup": "10-15 LPA"
  }
]'
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                disabled={loading || !rawJsonText.trim()}
                onClick={handleBulkJsonImport}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Importing & Validating Records...' : 'Import All Records to MongoDB'}</span>
              </button>
            </div>

            {bulkStats && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-emerald-800 block">Batch Import Summary</span>
                <div className="grid grid-cols-3 gap-2 text-emerald-900">
                  <div>Total Submitted: <span className="font-bold">{bulkStats.total}</span></div>
                  <div>Inserted New: <span className="font-bold">{bulkStats.inserted}</span></div>
                  <div>Updated Existing: <span className="font-bold">{bulkStats.updated}</span></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                <span>Repeatable LeetCode CSV Import</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Imports company-wise practice problems from <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">backend/data/leetcode_sample.csv</code>.
                Company names are canonicalized and compound unique indexing guarantees zero duplicate entries even if repeated multiple times.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={handleImportLeetCode}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{loading ? 'Importing & Deduplicating...' : 'Trigger Dataset Import'}</span>
              </button>
            </div>

            {importStats && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-emerald-800 block">Import Summary</span>
                <div className="grid grid-cols-3 gap-2 text-emerald-900">
                  <div>Total Rows: <span className="font-bold">{importStats.totalRows}</span></div>
                  <div>Upserted New: <span className="font-bold">{importStats.upsertedCount}</span></div>
                  <div>Matched / Deduplicated: <span className="font-bold">{importStats.matchedCount}</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
