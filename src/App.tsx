import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SourcePanel } from './components/SourcePanel';
import { StudentPreviewPane } from './components/StudentPreviewPane';
import { CodeOutputPane } from './components/CodeOutputPane';
import { EditQuestionModal } from './components/EditQuestionModal';
import { AiGeneratorModal } from './components/AiGeneratorModal';
import { QualityAuditModal } from './components/QualityAuditModal';

import { ExamSource, AssessmentQuestion, StagedItem } from './types';
import { parseAssessmentText, serializeQuestionsToText, createBlankQuestion } from './utils/parser';
import { Plus, Sparkles, Layers, ArrowRight, ShieldCheck } from 'lucide-react';

export default function App() {
  const [sources, setSources] = useState<ExamSource[]>([]);
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [compiledCode, setCompiledCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sources' | 'preview' | 'code'>('sources');

  // Modals state
  const [editingQuestion, setEditingQuestion] = useState<{ question: AssessmentQuestion; sourceId: string } | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [examTitle, setExamTitle] = useState<string>('Unit Assessment');

  // Initialize with a clean slate (blank initial exam source)
  useEffect(() => {
    initializeCleanSlate();
  }, []);

  const initializeCleanSlate = () => {
    const initialSource: ExamSource = {
      id: 'src_1',
      title: 'Exam Source #1',
      content: '',
      questions: [],
      selectedQuestionIds: [],
      updatedAt: Date.now(),
    };

    setSources([initialSource]);
    rebuildStagedPipeline([initialSource]);
  };

  // Add question from scratch directly inside the Visual Editor
  const handleAddQuestionFromScratch = (groupId?: number) => {
    const targetGroup =
      groupId ||
      (stagedItems.length > 0
        ? Math.max(...stagedItems.map((s) => s.question.group || 1))
        : 1);
    const nextQNum = stagedItems.length + 101;

    const newQuestion: AssessmentQuestion = {
      id: nextQNum,
      type: 'radio',
      prompt: 'Click to edit question prompt...',
      choices: [
        { id: `c_${nextQNum}_1`, text: 'Option A (Correct Answer)', isCorrect: true },
        { id: `c_${nextQNum}_2`, text: 'Option B (Distractor)', isCorrect: false },
        { id: `c_${nextQNum}_3`, text: 'Option C (Distractor)', isCorrect: false },
        { id: `c_${nextQNum}_4`, text: 'Option D (Distractor)', isCorrect: false },
      ],
      points: 1,
      group: targetGroup,
      groupTitle: `Group ${targetGroup}: Multiple Choice`,
      rawText: '',
      difficulty: 'medium',
    };

    let activeSources = [...sources];
    if (activeSources.length === 0) {
      const defaultSource: ExamSource = {
        id: 'src_draft',
        title: 'Visual Editor Direct Draft',
        content: '',
        questions: [],
        selectedQuestionIds: [],
        updatedAt: Date.now(),
      };
      activeSources = [defaultSource];
    }

    const firstSource = activeSources[0];
    const updatedQuestions = [...firstSource.questions, newQuestion];
    const updatedSelected = [...firstSource.selectedQuestionIds, newQuestion.id];

    const updatedSources = activeSources.map((src, i) =>
      i === 0
        ? {
            ...src,
            questions: updatedQuestions,
            selectedQuestionIds: updatedSelected,
            content: serializeQuestionsToText(updatedQuestions),
          }
        : src
    );

    setSources(updatedSources);
    rebuildStagedPipeline(updatedSources);
  };

  const handleAddGroupFromScratch = () => {
    const nextGroupNum =
      stagedItems.length > 0
        ? Math.max(...stagedItems.map((s) => s.question.group || 1)) + 1
        : 1;
    handleAddQuestionFromScratch(nextGroupNum);
  };

  // Rebuild staged pipeline items based on selected question IDs in sources
  const rebuildStagedPipeline = (currentSources: ExamSource[]) => {
    const newPipeline: StagedItem[] = [];

    currentSources.forEach((src) => {
      src.selectedQuestionIds.forEach((qId) => {
        const foundQuestion = src.questions.find((q) => q.id === qId);
        if (foundQuestion) {
          newPipeline.push({
            id: `staged_${src.id}_${qId}`,
            question: { ...foundQuestion },
            sourceId: src.id,
            sourceTitle: src.title,
            originalId: qId,
          });
        }
      });
    });

    setStagedItems(newPipeline);
    generateCompiledOutput(newPipeline);
  };

  // Serializes and re-indexes questions for the production output
  const generateCompiledOutput = (pipeline: StagedItem[]) => {
    const questionsToCompile = pipeline.map((item, idx) => ({
      ...item.question,
      id: idx + 1, // Auto-reindex sequentially
    }));

    const textOutput = serializeQuestionsToText(questionsToCompile);
    setCompiledCode(textOutput);
  };

  // Source updates
  const handleUpdateSourceContent = (id: string, newContent: string) => {
    setSources((prev) =>
      prev.map((src) => {
        if (src.id !== id) return src;
        const parsed = parseAssessmentText(newContent, id, src.title);
        // Retain currently selected IDs that still exist in parsed
        const validSelections = src.selectedQuestionIds.filter((qId) =>
          parsed.some((pq) => pq.id === qId)
        );

        // If newly added questions, select all by default
        const newSelected = parsed.map((pq) => pq.id);

        return {
          ...src,
          content: newContent,
          questions: parsed,
          selectedQuestionIds: newSelected,
          updatedAt: Date.now(),
        };
      })
    );

    setTimeout(() => {
      setSources((latest) => {
        rebuildStagedPipeline(latest);
        return latest;
      });
    }, 0);
  };

  const handleUpdateSourceTitle = (id: string, newTitle: string) => {
    setSources((prev) =>
      prev.map((src) => (src.id === id ? { ...src, title: newTitle } : src))
    );
  };

  const handleToggleQuestion = (sourceId: string, questionId: number) => {
    setSources((prev) => {
      const updated = prev.map((src) => {
        if (src.id !== sourceId) return src;
        const exists = src.selectedQuestionIds.includes(questionId);
        const newSelections = exists
          ? src.selectedQuestionIds.filter((id) => id !== questionId)
          : [...src.selectedQuestionIds, questionId];

        return { ...src, selectedQuestionIds: newSelections };
      });
      rebuildStagedPipeline(updated);
      return updated;
    });
  };

  const handleSelectAllQuestions = (sourceId: string, select: boolean) => {
    setSources((prev) => {
      const updated = prev.map((src) => {
        if (src.id !== sourceId) return src;
        return {
          ...src,
          selectedQuestionIds: select ? src.questions.map((q) => q.id) : [],
        };
      });
      rebuildStagedPipeline(updated);
      return updated;
    });
  };

  const handleAddSourcePanel = () => {
    const newId = `src_${Date.now()}`;
    const newSource: ExamSource = {
      id: newId,
      title: `Exam Source #${sources.length + 1}`,
      content: '',
      questions: [],
      selectedQuestionIds: [],
      updatedAt: Date.now(),
    };
    setSources((prev) => [...prev, newSource]);
  };

  const handleRemoveSourcePanel = (id: string) => {
    if (sources.length <= 1) return;
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
    rebuildStagedPipeline(updated);
  };

  // Reorder questions directly inside a source panel
  const handleReorderQuestions = (sourceId: string, newQuestions: AssessmentQuestion[]) => {
    setSources((prev) => {
      const updated = prev.map((src) => {
        if (src.id !== sourceId) return src;
        return {
          ...src,
          questions: newQuestions,
          content: serializeQuestionsToText(newQuestions),
        };
      });
      rebuildStagedPipeline(updated);
      return updated;
    });
  };

  const handleRemoveStagedItem = (stagedId: string) => {
    const itemToRemove = stagedItems.find((s) => s.id === stagedId);
    if (!itemToRemove) return;

    // Uncheck from source
    setSources((prev) => {
      const updated = prev.map((src) => {
        if (src.id !== itemToRemove.sourceId) return src;
        return {
          ...src,
          selectedQuestionIds: src.selectedQuestionIds.filter(
            (id) => id !== itemToRemove.originalId
          ),
        };
      });
      return updated;
    });

    const updatedPipeline = stagedItems.filter((s) => s.id !== stagedId);
    setStagedItems(updatedPipeline);
    generateCompiledOutput(updatedPipeline);
  };

  const handleBatchPoints = (points: number) => {
    const updated = stagedItems.map((s) => ({
      ...s,
      question: { ...s.question, points },
    }));
    setStagedItems(updated);
    generateCompiledOutput(updated);
  };

  // Question Edit modal handlers
  const handleOpenEditQuestion = (question: AssessmentQuestion, sourceId: string) => {
    setEditingQuestion({ question, sourceId });
  };

  const handleSaveEditedQuestion = (updatedQ: AssessmentQuestion) => {
    if (!editingQuestion) return;

    // Update in sources
    setSources((prev) =>
      prev.map((src) => {
        if (src.id !== editingQuestion.sourceId) return src;
        const updatedQuestions = src.questions.map((q) =>
          q.id === updatedQ.id ? updatedQ : q
        );
        return {
          ...src,
          questions: updatedQuestions,
          content: serializeQuestionsToText(updatedQuestions),
        };
      })
    );

    // Update in staged items
    const updatedPipeline = stagedItems.map((item) => {
      if (item.sourceId === editingQuestion.sourceId && item.question.id === updatedQ.id) {
        return { ...item, question: updatedQ };
      }
      return item;
    });

    setStagedItems(updatedPipeline);
    generateCompiledOutput(updatedPipeline);
  };

  // AI Import Handler
  const handleAddAiQuestionsToSource = (newQuestions: AssessmentQuestion[]) => {
    if (sources.length === 0) handleAddSourcePanel();

    const targetSourceId = sources[0]?.id || `src_${Date.now()}`;

    setSources((prev) =>
      prev.map((src, i) => {
        if (i !== 0) return src;
        const combinedQuestions = [...src.questions, ...newQuestions];
        const combinedSelections = [
          ...src.selectedQuestionIds,
          ...newQuestions.map((nq) => nq.id),
        ];

        return {
          ...src,
          questions: combinedQuestions,
          selectedQuestionIds: combinedSelections,
          content: serializeQuestionsToText(combinedQuestions),
        };
      })
    );

    setTimeout(() => {
      setSources((latest) => {
        rebuildStagedPipeline(latest);
        return latest;
      });
    }, 0);
  };

  const handleUpdateStagedQuestion = (stagedId: string, updatedQ: AssessmentQuestion) => {
    // 1. Update staged items
    const updatedPipeline = stagedItems.map((item) => {
      if (item.id === stagedId) {
        return { ...item, question: updatedQ };
      }
      return item;
    });
    setStagedItems(updatedPipeline);
    generateCompiledOutput(updatedPipeline);

    // 2. Also update source questions so everything stays perfectly synced
    const targetItem = stagedItems.find((s) => s.id === stagedId);
    if (targetItem) {
      setSources((prev) =>
        prev.map((src) => {
          if (src.id !== targetItem.sourceId) return src;
          const updatedSourceQuestions = src.questions.map((q) =>
            q.id === targetItem.originalId ? updatedQ : q
          );
          return {
            ...src,
            questions: updatedSourceQuestions,
            content: serializeQuestionsToText(updatedSourceQuestions),
          };
        })
      );
    }
  };

  // Stats calculation
  const totalQuestionsCount = stagedItems.length;
  const totalPoints = stagedItems.reduce((acc, item) => acc + (item.question.points || 1), 0);
  const questionsForPreview = stagedItems.map((item, idx) => ({
    ...item.question,
    id: idx + 1,
  }));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Header Navigation Bar */}
      <Navbar
        totalSources={sources.length}
        selectedQuestionsCount={totalQuestionsCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCompile={() => generateCompiledOutput(stagedItems)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: EXAM SOURCES & QUESTIONS MATRIX */}
        {activeTab === 'sources' && (
          <div id="view-tab-sources" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">1. Sources & Questions Matrix</h2>
                <p className="text-xs text-slate-500">
                  Upload document files, paste assessment code, and drag & drop question units directly to reorder your assessment sequence.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  id="btn-add-source"
                  onClick={handleAddSourcePanel}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Exam Source</span>
                </button>

                <button
                  onClick={() => {
                    generateCompiledOutput(stagedItems);
                    setActiveTab('preview');
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                >
                  <span>Open Visual Editor ({totalQuestionsCount})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Source Panels List */}
            {sources.map((source, index) => (
              <SourcePanel
                key={source.id}
                source={source}
                index={index}
                totalSources={sources.length}
                onUpdateContent={handleUpdateSourceContent}
                onUpdateTitle={handleUpdateSourceTitle}
                onToggleQuestion={handleToggleQuestion}
                onSelectAllQuestions={handleSelectAllQuestions}
                onRemovePanel={handleRemoveSourcePanel}
                onEditQuestion={(q) => handleOpenEditQuestion(q, source.id)}
                onReorderQuestions={handleReorderQuestions}
              />
            ))}
          </div>
        )}

        {/* TAB 2: INTERACTIVE VISUAL EDITOR & PREVIEW */}
        {activeTab === 'preview' && (
          <div id="view-tab-preview">
            <StudentPreviewPane
              stagedItems={stagedItems}
              onUpdateQuestion={handleUpdateStagedQuestion}
              onRemoveQuestion={handleRemoveStagedItem}
              onAddQuestionFromScratch={handleAddQuestionFromScratch}
              onAddGroupFromScratch={handleAddGroupFromScratch}
              examTitle={examTitle}
              onUpdateExamTitle={setExamTitle}
              onOpenAiGenerator={() => setIsAiModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 3: PRODUCTION OUTPUT CODE */}
        {activeTab === 'code' && (
          <div id="view-tab-code">
            <CodeOutputPane
              code={compiledCode}
              onOpenAudit={() => setIsAuditModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white">FLVS Exam Studio</span>
            <span>— Assessment Compilation & Management</span>
          </div>
          <p>© 2026 FLVS Exam Studio. Powered by Gemini AI.</p>
        </div>
      </footer>

      {/* Modals */}
      <EditQuestionModal
        isOpen={!!editingQuestion}
        question={editingQuestion?.question || null}
        onClose={() => setEditingQuestion(null)}
        onSave={handleSaveEditedQuestion}
      />

      <AiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onAddQuestions={handleAddAiQuestionsToSource}
      />

      <QualityAuditModal
        isOpen={isAuditModalOpen}
        questions={questionsForPreview}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
