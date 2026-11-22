import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Building2, Search, TrendingUp, Award, Tag } from 'lucide-react';

export const CompaniesView = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanies({ search: search.trim() });
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCompanies();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruiting Companies</h1>
          <p className="text-sm text-slate-500">
            Historical recruiting organizations, compensation tiers, and placement profiles at DTU.
          </p>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          <span className="font-bold text-slate-900">{companies.length}</span> organizations listed
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Grid of Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : companies.length > 0 ? (
          companies.map((comp) => (
            <div
              key={comp._id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{comp.name}</h3>
                  <span className="text-xs text-slate-500">{comp.industry || 'Technology'}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {comp.tier || 'Dream'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block">Highest Package</span>
                  <span className="font-bold text-slate-900">
                    {comp.highestPackage ? `${comp.highestPackage} LPA` : 'Competitive'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block">Avg Package</span>
                  <span className="font-bold text-slate-900">
                    {comp.averagePackage ? `${comp.averagePackage} LPA` : 'N/A'}
                  </span>
                </div>
              </div>

              {comp.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {comp.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
            No company profiles registered. Ingesting placement records automatically links company intelligence.
          </div>
        )}
      </div>
    </div>
  );
};
