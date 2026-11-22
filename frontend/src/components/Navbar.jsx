import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  BookOpenCheck,
  Bot,
  PlusCircle,
  FilePlus2,
  GraduationCap,
  Code2
} from 'lucide-react';

export const Navbar = ({
  activeTab,
  setActiveTab,
  onOpenSubmitModal,
  onOpenAdminModal,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'jobs', label: 'Historical Records', icon: FileSpreadsheet },
    { id: 'experiences', label: 'Interview Experiences', icon: BookOpenCheck },
    { id: 'assistant', label: 'AI Placement Assistant', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">DTU Placement Intelligence</span>
              <span className="hidden md:inline-block ml-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 rounded">
                MVP
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-2xs"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mock Interview Studio</span>
            </a>
            <button
              onClick={onOpenSubmitModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Submit Experience</span>
            </button>
            <button
              onClick={onOpenAdminModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-xs"
            >
              <FilePlus2 className="w-4 h-4" />
              <span className="hidden sm:inline">Admin Ingestion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-200 px-2 py-1.5 bg-slate-50 space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
