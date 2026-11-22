import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Bot,
  Send,
  Sparkles,
  Layers,
  FileSpreadsheet,
  BookOpenCheck,
  Code2,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export const AssistantView = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [suggestedQueries, setSuggestedQueries] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function fetchExamples() {
      try {
        const res = await api.getSuggestedQueries();
        setSuggestedQueries(res.data || []);
      } catch (err) {
        console.error('Failed to load suggested queries:', err);
      }
    }
    fetchExamples();

    if (initialQuery.trim()) {
      handleAsk(initialQuery.trim());
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleAsk = async (questionText) => {
    const q = questionText || query;
    if (!q || !q.trim() || loading) return;

    const userMessage = {
      role: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversation((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.queryAssistant(q.trim());
      const botMessage = {
        role: 'assistant',
        data: res.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversation((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        error: err.message || 'Failed to generate answer. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">AI Placement Assistant</h1>
            <p className="text-xs text-slate-500">
              Multi-source RAG synthesizing Historical Jobs, Interview Experiences, and LeetCode Questions
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Grounded Answers</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {conversation.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Explore Placement Intelligence with AI</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Ask structured package questions, semantic interview topics, or multi-source queries. Every response is strictly grounded in DTU database evidence with provenance links.
              </p>
            </div>

            {/* Suggested Queries */}
            <div className="text-left space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block text-center">
                Suggested Placement Queries
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestedQueries.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(item.query)}
                    className="p-3 text-left bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition group shadow-xs"
                  >
                    <span className="text-[11px] font-bold text-blue-600 block mb-0.5">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-800 font-medium group-hover:text-blue-950">
                      {item.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          conversation.map((msg, idx) => (
            <div key={idx} className="space-y-3">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <span className="text-[10px] text-blue-200 block text-right mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-3xl w-full bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-5 shadow-xs space-y-4">
                    {msg.error ? (
                      <div className="flex items-start space-x-2.5 text-rose-600 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{msg.error}</span>
                      </div>
                    ) : (
                      <>
                        {/* Retrieval Plan Visualization */}
                        {msg.data.plan && (
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                              <span className="flex items-center space-x-1.5">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                <span>Multi-Source Retrieval Plan</span>
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{msg.data.executionTimeMs}ms</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs">
                              {msg.data.sourcesUsed.map((src) => (
                                <span
                                  key={src}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-white border border-slate-200 text-slate-800 shadow-2xs"
                                >
                                  {src === 'jobs' && <FileSpreadsheet className="w-3 h-3 text-emerald-600" />}
                                  {src === 'experiences' && <BookOpenCheck className="w-3 h-3 text-indigo-600" />}
                                  {src === 'leetcode' && <Code2 className="w-3 h-3 text-amber-600" />}
                                  <span className="capitalize">{src}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Grounded Answer Body */}
                        <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                          {msg.data.answer}
                        </div>

                        {/* Citations & Source Badges */}
                        {msg.data.citations && msg.data.citations.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                              Supporting Verified Sources
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.data.citations.map((c, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-0.5"
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        c.type === 'job_announcement'
                                          ? 'bg-emerald-500'
                                          : c.type === 'student_experience'
                                          ? 'bg-indigo-500'
                                          : 'bg-amber-500'
                                      }`}
                                    ></span>
                                    <span className="font-bold text-slate-900 truncate">{c.title}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">{c.details}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 py-3 bg-white max-w-sm rounded-xl p-3 border border-slate-200">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600"></div>
            <span>Routing query & synthesizing evidence from MongoDB...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="pt-3 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="Ask placement questions (e.g. Which companies offered 15+ LPA and what were their interview experiences?)..."
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition flex items-center space-x-1.5 shadow-xs"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
