import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Sparkles, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export const SubmitExperienceModal = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState('narrative'); // 'narrative' or 'direct'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [placementYear, setPlacementYear] = useState('2026');
  const [narrative, setNarrative] = useState('');

  // Extracted Structure Review State
  const [extractedReview, setExtractedReview] = useState(null);
  const [dsaTopicsInput, setDsaTopicsInput] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [verdict, setVerdict] = useState('Selected');

  if (!isOpen) return null;

  const handleExtractNarrative = async () => {
    if (!company || !role || !narrative.trim()) {
      setError('Please provide company name, role, and interview description.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.extractExperience({
        narrative: narrative.trim(),
        company: company.trim(),
        role: role.trim(),
        placementYear: Number(placementYear),
      });

      const extracted = res.data.extractedStructure;
      setExtractedReview(extracted);
      setDsaTopicsInput((extracted.dsaTopics || []).join(', '));
      setDifficulty(extracted.difficulty || 'Medium');
      setVerdict(extracted.overallVerdict || 'Selected');
    } catch (err) {
      setError(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFinal = async () => {
    setError(null);
    setLoading(true);

    try {
      const topicsList = dsaTopicsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        company: company.trim(),
        role: role.trim(),
        placementYear: Number(placementYear),
        originalNarrative: narrative.trim(),
        extractedStructure: {
          roundsCount: extractedReview?.roundsCount || extractedReview?.rounds?.length || 1,
          rounds: extractedReview?.rounds || [
            {
              roundNumber: 1,
              roundName: 'Interview Round',
              roundType: 'Technical',
              topicsCovered: topicsList,
              questions: [],
              description: narrative.substring(0, 150),
            },
          ],
          dsaTopics: topicsList,
          csFundamentals: extractedReview?.csFundamentals || [],
          projectDiscussion: extractedReview?.projectDiscussion || '',
          hrQuestions: extractedReview?.hrQuestions || [],
          difficulty,
          overallVerdict: verdict,
        },
        submissionType: mode === 'narrative' ? 'narrative_llm' : 'structured_direct',
        studentConfirmed: true,
        moderationStatus: 'verified',
      };

      await api.createExperience(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit experience');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Submit Interview Experience</h2>
            <p className="text-xs text-slate-500">
              Contribute to DTU's placement knowledge base. Narrative experiences are processed by Gemini and confirmed by you.
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

        {/* Mode Switcher */}
        <div className="flex space-x-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => {
              setMode('narrative');
              setExtractedReview(null);
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              mode === 'narrative'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Free-Text Narrative + Gemini Extraction
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('direct');
              setExtractedReview({ rounds: [], dsaTopics: [] });
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              mode === 'direct'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Direct Structured Submission
          </button>
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Company *</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Amazon, Google"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Role *</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. SDE-1, Analyst"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Placement Year *</label>
            <select
              value={placementYear}
              onChange={(e) => setPlacementYear(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        {/* Narrative Area */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Interview Experience Narrative *
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Describe the rounds, coding problems, questions asked, DSA topics, and your interview journey.
          </p>
          <textarea
            rows={5}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Round 1 was an online assessment with 2 questions on sliding window and trees. Round 2 was a technical interview where I was asked to implement an LRU cache..."
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
          />
        </div>

        {/* Mode A: Gemini Extraction Review Workflow */}
        {mode === 'narrative' && !extractedReview && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={loading || !narrative.trim() || !company || !role}
              onClick={handleExtractNarrative}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Extracting via Gemini...' : 'Extract Details with Gemini'}</span>
            </button>
          </div>
        )}

        {/* Structured Review Fields */}
        {extractedReview && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Review & Confirm Extracted Details</span>
              </span>
              <span className="text-[11px] text-slate-400">
                You can correct any field before final save
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  DSA Topics Covered (Comma-separated)
                </label>
                <input
                  type="text"
                  value={dsaTopicsInput}
                  onChange={(e) => setDsaTopicsInput(e.target.value)}
                  placeholder="e.g. Dynamic Programming, Trees, Graphs"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Variable">Variable</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Verdict</label>
                  <select
                    value={verdict}
                    onChange={(e) => setVerdict(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Waitlisted">Waitlisted</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setExtractedReview(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitFinal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                {loading ? 'Saving...' : 'Confirm & Save Experience'}
              </button>
            </div>
          </div>
        )}

        {mode === 'direct' && (
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !company || !role || !narrative.trim()}
              onClick={handleSubmitFinal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs"
            >
              {loading ? 'Saving...' : 'Save Direct Submission'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
