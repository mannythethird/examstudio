import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw } from 'lucide-react';
import { AssessmentQuestion, AuditResult } from '../types';

interface QualityAuditModalProps {
  questions: AssessmentQuestion[];
  isOpen: boolean;
  onClose: () => void;
}

export const QualityAuditModal: React.FC<QualityAuditModalProps> = ({
  questions,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAudit = async () => {
    if (questions.length === 0) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/ai/audit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });

      const data = await res.json();
      if (data.success && data.audit) {
        setAudit(data.audit);
      } else {
        alert(data.error || 'Failed to complete audit.');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing assessment audit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Assessment Psychometric Quality Audit</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Evaluating item stem balance, distractors, and validity...</p>
            </div>
          ) : audit ? (
            <div className="space-y-5">
              {/* Score card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Psychometric Validity Score</h4>
                  <p className="text-xs text-slate-600 mt-1">{audit.summary}</p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-extrabold ${audit.score >= 80 ? 'text-emerald-600' : audit.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {audit.score}
                  </span>
                  <span className="text-xs text-slate-400 font-bold"> / 100</span>
                </div>
              </div>

              {/* Findings & Issues */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Audit Findings ({audit.issues?.length || 0})
                </h4>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {audit.issues?.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                        issue.type === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : issue.type === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-blue-50 border-blue-200 text-blue-950'
                      }`}
                    >
                      {issue.type === 'error' ? (
                        <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : issue.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}

                      <div>
                        {issue.questionId && (
                          <span className="font-bold mr-1">Question #{issue.questionId}:</span>
                        )}
                        <span>{issue.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Click run audit to evaluate your compiled assessment.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={runAudit}
            disabled={isLoading}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-run Audit</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
