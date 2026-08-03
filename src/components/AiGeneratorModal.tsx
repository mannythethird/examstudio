import React, { useState } from 'react';
import { X, Sparkles, Wand2, Plus, Check } from 'lucide-react';
import { AssessmentQuestion } from '../types';

interface AiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (questions: AssessmentQuestion[]) => void;
}

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({
  isOpen,
  onClose,
  onAddQuestions,
}) => {
  if (!isOpen) return null;

  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('High School (9-12)');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic or subject focus.');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          gradeLevel,
          count,
          difficulty,
          questionType: 'radio',
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedItems(data.questions);
      } else {
        alert(data.error || 'Failed to generate questions.');
      }
    } catch (err: any) {
      alert(err.message || 'Server connection error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportGenerated = () => {
    if (generatedItems.length === 0) return;

    const baseId = Date.now() % 10000;
    const formatted: AssessmentQuestion[] = generatedItems.map((item, idx) => {
      const qId = baseId + idx;
      return {
        id: qId,
        type: 'radio',
        prompt: item.prompt,
        points: item.points || 1,
        explanation: item.explanation || '',
        group: qId,
        rawText: '',
        difficulty,
        choices: (item.choices || []).map((c: any, cIdx: number) => ({
          id: `c_gen_${qId}_${cIdx}`,
          text: c.text,
          isCorrect: !!c.isCorrect,
        })),
      };
    });

    onAddQuestions(formatted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-5 h-5 text-purple-400 animate-pulse" />
            <h3 className="font-bold text-base">AI Assessment Question Generator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-purple-950 hover:bg-purple-800 text-purple-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Topic & Specs Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Topic or Learning Objective *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis light-dependent reactions, World War II turning points..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Elementary (K-5)">Elementary (K-5)</option>
                  <option value="Middle School (6-8)">Middle School (6-8)</option>
                  <option value="High School (9-12)">High School (9-12)</option>
                  <option value="Higher Education / AP">Higher Education / AP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Item Quantity
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={1}>1 Question</option>
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="easy">Easy (Recall)</option>
                  <option value="medium">Medium (Application)</option>
                  <option value="hard">Hard (Analysis)</option>
                </select>
              </div>
            </div>

            <button
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating AI Questions...' : 'Generate Questions with Gemini AI'}</span>
            </button>
          </div>

          {/* Preview of Generated Items */}
          {generatedItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Generated Assessment Questions Preview ({generatedItems.length})
              </h4>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {generatedItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-purple-200 rounded-lg p-3 text-xs space-y-2">
                    <p className="font-semibold text-slate-900">{idx + 1}. {item.prompt}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                      {item.choices?.map((c: any, cIdx: number) => (
                        <div
                          key={cIdx}
                          className={`p-1.5 rounded border text-[11px] ${
                            c.isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + cIdx)}. {c.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            disabled={generatedItems.length === 0}
            onClick={handleImportGenerated}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Import Generated Items to Exam Source</span>
          </button>
        </div>
      </div>
    </div>
  );
};
