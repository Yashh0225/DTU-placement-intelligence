import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { JobsView } from './components/JobsView';
import { ExperiencesView } from './components/ExperiencesView';
import { CompaniesView } from './components/CompaniesView';
import { AssistantView } from './components/AssistantView';
import { SubmitExperienceModal } from './components/SubmitExperienceModal';
import { AdminIngestionModal } from './components/AdminIngestionModal';

export const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [assistantInitialQuery, setAssistantInitialQuery] = useState('');

  const handleLaunchSearch = (query) => {
    setAssistantInitialQuery(query);
    setActiveTab('assistant');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={(tab) => setActiveTab(tab)}
            onLaunchSearch={handleLaunchSearch}
          />
        )}
        {activeTab === 'companies' && <CompaniesView />}
        {activeTab === 'jobs' && <JobsView />}
        {activeTab === 'experiences' && <ExperiencesView />}
        {activeTab === 'assistant' && (
          <AssistantView initialQuery={assistantInitialQuery} />
        )}
      </main>

      <SubmitExperienceModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSuccess={() => {
          // Refresh views or trigger toast
        }}
      />

      <AdminIngestionModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          // Refresh views or trigger toast
        }}
      />
    </div>
  );
};
