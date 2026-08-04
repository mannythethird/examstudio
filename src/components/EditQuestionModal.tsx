import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Sparkles, Wand2, RefreshCw } from 'lucide-react';
import { AssessmentQuestion, QuestionChoice } from '../types';

interface EditQuestionModalProps {
  question: AssessmentQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuestion: AssessmentQuestion) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !question) return null;

  const [prompt, setPrompt] = useState(question.prompt);
  const [choices, setChoices] = useState<QuestionChoice[]>(question.choices || []);
  const [points, setPoints] = useState(question.points || 1);
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleChoiceTextChange = (id: string, text: string) => {
    setChoices((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text } : c))
    );
  };

  const handleCorrectToggle = (id: string) => {
    setChoices((prev) =>
      prev.map((c) => ({
        ...c,
        isCorrect: c.id === id,
      }))
    );
  };

  const handleAddChoice = () => {
    const newChoiceId = `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setChoices((prev) => [
      ...prev,
      { id: newChoiceId, text: 'New Option Choice', isCorrect: false },
    ]);
  };

  const handleRemoveChoice = (id: string) => {
    if (choices.length <= 2) {
      alert('A question must have at least 2 choices.');
      return;
    }
    setChoices((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAiEnhance = async (action: 'distractors' | 'rewrite' | 'explanation') => {
    try {
      setIsEnhancing(true);
      const res = await fetch('/api/ai/enhance-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          questionPrompt: prompt,
          existingChoices: choices,
          existingExplanation: explanation,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.revisedPrompt) setPrompt(data.revisedPrompt);
        if (data.explanation) setExplanation(data.explanation);
        if (data.choices && Array.isArray(data.choices)) {
          setChoices(
            data.choices.map((c: any, i: number) => ({
              id: `c_ai_${i}_${Date.now()}`,
              text: c.text,
              isCorrect: !!c.isCorrect,
            }))
          );
        }
      } else {
        alert(data.error || 'Failed to enhance question.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error enhancing question.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...question,
      prompt,
      choices,
      points,
      explanation,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-xs">
              Unit #{question.id}
            </span>
            <h3 className="font-bold text-base">Edit Question Item</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Form */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* AI Helper Bar */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-purple-900 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>AI Question Enhancement Assistant</span>
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <button
                disabled={isEnhancing}
                onClick={() => handleAiEnhance('rewrite')}
                className="px-2.5 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md transition shadow-2xs disabled:opacity-50"
              >
                {isEnhancing ? 'Refining...' : 'Clearer Stem'}
              </button>
              <button
                disabled={isEnhancing}
                onClick={() => handleAiEnhance('distractors')}
                className="px-2.5 py-1 text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-md transition disabled:opacity-50"
              >
                Better Distractors
              </button>
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Question Prompt (Supports HTML & Images)
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Points:</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)}
                  className="w-16 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full p-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Choices list */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Answer Options (Radio Select Correct Option)
              </label>
              <button
                onClick={handleAddChoice}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Choice</span>
              </button>
            </div>

            <div className="space-y-2">
              {choices.map((choice, idx) => (
                <div
                  key={choice.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border transition ${
                    choice.isCorrect
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name={`correct_radio_${question.id}`}
                    checked={choice.isCorrect}
                    onChange={() => handleCorrectToggle(choice.id)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs text-slate-500 w-4">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <input
                    type="text"
                    value={choice.text}
                    onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleRemoveChoice(choice.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation / Feedback */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Teacher Feedback / Explanation
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              placeholder="Provide solution feedback or rationale for why the answer is correct..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
