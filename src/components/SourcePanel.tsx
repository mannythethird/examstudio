import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Edit3,
  Search,
  Sparkles,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { ExamSource, AssessmentQuestion } from '../types';

interface SourcePanelProps {
  source: ExamSource;
  index: number;
  totalSources: number;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onToggleQuestion: (sourceId: string, questionId: number) => void;
  onSelectAllQuestions: (sourceId: string, select: boolean) => void;
  onRemovePanel: (id: string) => void;
  onEditQuestion: (question: AssessmentQuestion, sourceId: string) => void;
  onReorderQuestions: (sourceId: string, newQuestions: AssessmentQuestion[]) => void;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({
  source,
  index,
  totalSources,
  onUpdateContent,
  onUpdateTitle,
  onToggleQuestion,
  onSelectAllQuestions,
  onRemovePanel,
  onEditQuestion,
  onReorderQuestions,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<number, boolean>>({});
  const [draggedQIndex, setDraggedQIndex] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onUpdateContent(source.id, text);
      }
    };
    reader.readAsText(file);
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onUpdateContent(source.id, text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDragOverFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleCardExpanded = (qId: number) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const allAreExpanded =
    source.questions.length > 0 &&
    source.questions.every((q) => expandedCardIds[q.id]);

  const expandAll = () => {
    const allExp: Record<number, boolean> = {};
    source.questions.forEach((q) => {
      allExp[q.id] = true;
    });
    setExpandedCardIds(allExp);
  };

  const collapseAll = () => {
    setExpandedCardIds({});
  };

  // Drag and drop handlers for question units
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedQIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropQuestion = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedQIndex === null || draggedQIndex === targetIndex) return;

    const newQuestions = [...source.questions];
    const [movedQ] = newQuestions.splice(draggedQIndex, 1);
    newQuestions.splice(targetIndex, 0, movedQ);

    onReorderQuestions(source.id, newQuestions);
    setDraggedQIndex(null);
  };

  const moveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= source.questions.length) return;
    const newQuestions = [...source.questions];
    const [movedQ] = newQuestions.splice(fromIdx, 1);
    newQuestions.splice(toIdx, 0, movedQ);
    onReorderQuestions(source.id, newQuestions);
  };

  const handleShuffle = () => {
    const shuffled = [...source.questions].sort(() => Math.random() - 0.5);
    onReorderQuestions(source.id, shuffled);
  };

  const handleBatchPoints = (pts: number) => {
    const updated = source.questions.map((q) => ({ ...q, points: pts }));
    onReorderQuestions(source.id, updated);
  };

  const handleDeleteQuestion = (qId: number) => {
    const updated = source.questions.filter((q) => q.id !== qId);
    onReorderQuestions(source.id, updated);
  };

  const filteredQuestions = source.questions.filter((q) => {
    if (!filterQuery.trim()) return true;
    const query = filterQuery.toLowerCase();
    return (
      q.id.toString().includes(query) ||
      q.prompt.toLowerCase().includes(query) ||
      q.choices.some((c) => c.text.toLowerCase().includes(query))
    );
  });

  const selectedCount = source.selectedQuestionIds.length;
  const isAllSelected = source.questions.length > 0 && selectedCount === source.questions.length;

  return (
    <div
      id={`source-panel-${source.id}`}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition hover:shadow-md"
    >
      {/* Panel Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
            #{index + 1}
          </span>
          <div>
            <input
              type="text"
              value={source.title}
              onChange={(e) => onUpdateTitle(source.id, e.target.value)}
              className="font-bold text-slate-800 text-base bg-transparent hover:bg-white hover:border-slate-300 border border-transparent rounded px-1.5 py-0.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Exam Source Title..."
            />
            <p className="text-xs text-slate-500 pl-1">
              Parsed Questions: <span className="font-semibold text-slate-700">{source.questions.length}</span> | Selected: <span className="font-semibold text-blue-600">{selectedCount}</span>
            </p>
          </div>
        </div>

        {totalSources > 1 && (
          <button
            id={`btn-remove-source-${source.id}`}
            onClick={() => onRemovePanel(source.id)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
            title="Remove this exam source"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Source</span>
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Input options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Option A: Upload Flat-File (.txt / .json)
            </label>
            <div
              onDrop={handleDropFile}
              onDragOver={handleDragOverFile}
              onClick={() => document.getElementById(`file_input_${source.id}`)?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/40 rounded-lg p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[110px]"
            >
              <Upload className="w-6 h-6 text-slate-400 hover:text-blue-600 mb-1.5" />
              <span className="text-xs font-semibold text-slate-700">Drag & Drop .txt document or click to browse</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Supports flat mc:radio: layouts</span>
              <input
                id={`file_input_${source.id}`}
                type="file"
                accept=".txt,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Direct Textarea Paste */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Option B: Paste Direct Config Text
            </label>
            <textarea
              id={`textarea-${source.id}`}
              value={source.content}
              onChange={(e) => onUpdateContent(source.id, e.target.value)}
              placeholder="Paste raw flat-file assessment data here (e.g. mc:radio:What is... ###101#^)..."
              className="w-full h-[110px] p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>
        </div>

        {/* Question Picker & Drag-and-Drop Selection Area */}
        {source.questions.length > 0 ? (
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Question Units Matrix ({source.questions.length})
                </span>
                <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Drag & Drop Reorder Enabled
                </span>
              </div>

              {/* Action Controls & Search */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                {/* Reveal / Collapse Toggle */}
                <button
                  onClick={allAreExpanded ? collapseAll : expandAll}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition"
                  title="Reveal or collapse details"
                >
                  {allAreExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{allAreExpanded ? 'Collapse All' : 'Reveal All'}</span>
                </button>

                {/* Shuffle Button */}
                <button
                  onClick={handleShuffle}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition"
                  title="Randomize question order in this source"
                >
                  <Shuffle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Shuffle</span>
                </button>

                {/* Batch Points */}
                <div className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded-md border border-slate-300 text-xs">
                  <span className="text-slate-500 font-medium mr-1">Pts:</span>
                  <button
                    onClick={() => handleBatchPoints(1)}
                    className="px-1.5 py-0.5 font-bold text-blue-600 hover:bg-blue-50 rounded"
                    title="Set all questions to 1 pt"
                  >
                    1pt
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleBatchPoints(2)}
                    className="px-1.5 py-0.5 font-bold text-blue-600 hover:bg-blue-50 rounded"
                    title="Set all questions to 2 pts"
                  >
                    2pts
                  </button>
                </div>

                {/* Search Filter */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search in questions..."
                    className="pl-8 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 sm:w-40"
                  />
                </div>

                {/* Select All Checkbox */}
                <button
                  onClick={() => onSelectAllQuestions(source.id, !isAllSelected)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-slate-700 transition"
                >
                  {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{isAllSelected ? 'Deselect' : 'Select All'}</span>
                </button>
              </div>
            </div>

            {/* Questions List with Drag & Drop */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredQuestions.map((q) => {
                const realIdx = source.questions.findIndex((item) => item.id === q.id);
                const isSelected = source.selectedQuestionIds.includes(q.id);
                const isExpanded = !!expandedCardIds[q.id];
                const isDragging = draggedQIndex === realIdx;

                return (
                  <div
                    key={q.id}
                    id={`card-${source.id}-${q.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, realIdx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropQuestion(e, realIdx)}
                    className={`bg-white rounded-lg border transition ${
                      isDragging ? 'opacity-40 border-blue-400 bg-blue-50 scale-[0.99]' : ''
                    } ${
                      isSelected
                        ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Question Header Bar */}
                    <div
                      className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none"
                      onClick={() => toggleCardExpanded(q.id)}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5"
                          title="Drag handle to reorder question position"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleQuestion(source.id, q.id);
                          }}
                          className="flex items-center cursor-pointer p-0.5"
                          title="Toggle question inclusion"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleQuestion(source.id, q.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          Unit #{q.id}
                        </span>

                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {q.points} {q.points === 1 ? 'pt' : 'pts'}
                        </span>

                        <div className="text-xs font-medium text-slate-800 truncate max-w-[220px] sm:max-w-[400px]">
                          <span dangerouslySetInnerHTML={{ __html: q.prompt.replace(/<[^>]*>?/gm, '') || 'Click to view prompt...' }} />
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(realIdx, realIdx - 1);
                          }}
                          disabled={realIdx === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(realIdx, realIdx + 1);
                          }}
                          disabled={realIdx === source.questions.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditQuestion(q, source.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                          title="Edit Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(q.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Question Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Question Detailed Content Expander */}
                    {isExpanded && (
                      <div className="px-4 py-3 border-t border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-700 space-y-2">
                        {/* Prompt HTML rendering */}
                        <div className="font-semibold text-slate-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.prompt }} />

                        {/* Choices preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.choices.map((choice, cIdx) => (
                            <div
                              key={choice.id || cIdx}
                              className={`p-2 rounded border flex items-start space-x-2 ${
                                choice.isCorrect
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-medium'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className="font-bold text-[11px] text-slate-500 uppercase">{String.fromCharCode(65 + cIdx)}.</span>
                              <div className="flex-1" dangerouslySetInnerHTML={{ __html: choice.text }} />
                              {choice.isCorrect && (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Correct</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="mt-2 text-[11px] bg-amber-50 text-amber-900 p-2 rounded border border-amber-200">
                            <span className="font-bold">Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs">
            No valid question blocks parsed yet. Upload a .txt file or paste content above to populate this panel.
          </div>
        )}
      </div>
    </div>
  );
};
