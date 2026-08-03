import React from 'react';
import { FileText, Layers, HelpCircle, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: 'sources' | 'preview' | 'code';
  setActiveTab: (tab: 'sources' | 'preview' | 'code') => void;
  onCompile: () => void;
  totalSources?: number;
  selectedQuestionsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onCompile,
  totalSources = 1,
  selectedQuestionsCount = 0,
}) => {
  return (
    <header id="app-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <div id="app-logo" className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 id="app-title" className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                Math Exam Studio
              </h1>
            </div>
          </div>

          {/* Main Integrated Navigation Tabs */}
          <nav id="main-nav-tabs" className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="tab-sources"
              onClick={() => setActiveTab('sources')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'sources'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-300" />
              <span>1. Sources</span>
              {totalSources > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'sources' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {totalSources}
                </span>
              )}
            </button>

            <button
              id="tab-preview"
              onClick={() => {
                onCompile();
                setActiveTab('preview');
              }}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>2. Visual Editor</span>
              {selectedQuestionsCount > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'preview' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-emerald-400 border border-slate-700'
                }`}>
                  {selectedQuestionsCount}
                </span>
              )}
            </button>

            <button
              id="tab-code"
              onClick={() => {
                onCompile();
                setActiveTab('code');
              }}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>3. Educator Code</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

