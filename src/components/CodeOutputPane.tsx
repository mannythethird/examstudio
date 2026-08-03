import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, ShieldCheck } from 'lucide-react';

interface CodeOutputPaneProps {
  code: string;
  onOpenAudit?: () => void;
}

export const CodeOutputPane: React.FC<CodeOutputPaneProps> = ({ code, onOpenAudit }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment_compiled_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lineCount = code ? code.split('\n').length : 0;

  return (
    <div id="code-output-container" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900">3. Educator Code Output</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
              {lineCount} lines generated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Copy or download this production-ready flat-file for deployment into your LMS or test delivery system.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {onOpenAudit && (
            <button
              id="btn-educator-qa-audit"
              onClick={onOpenAudit}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
              title="Run Quality Audit & Psychometric Check on flat-file code"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>QA Audit Check</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Flat-File Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download .txt File</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
        <div className="bg-slate-900 px-4 py-2 text-slate-400 text-[11px] flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>assessment_compiled.txt</span>
          </div>
          <span>UTF-8 Plain Text</span>
        </div>

        <textarea
          readOnly
          value={code}
          className="w-full h-[520px] p-4 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none resize-none leading-relaxed select-all"
        />
      </div>
    </div>
  );
};

