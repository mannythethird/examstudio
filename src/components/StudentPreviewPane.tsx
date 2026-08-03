import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Edit3,
  Eye,
  HelpCircle,
  Award,
  RotateCcw,
  FileCheck,
  Printer,
  Wand2,
  Code2,
  Layout,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { AssessmentQuestion, QuestionChoice, StagedItem } from '../types';
import { VisualFormattingToolbar } from './VisualFormattingToolbar';
import { FloatingTableToolbar } from './FloatingTableToolbar';
import { MathLabModal } from './MathLabModal';
import JSZip from 'jszip';

interface StudentPreviewPaneProps {
  stagedItems: StagedItem[];
  onUpdateQuestion: (stagedId: string, updatedQuestion: AssessmentQuestion) => void;
  onRemoveQuestion: (stagedId: string) => void;
  onAddQuestionFromScratch: (groupId?: number) => void;
  onAddGroupFromScratch: () => void;
  examTitle?: string;
  onUpdateExamTitle?: (newTitle: string) => void;
  onOpenAiGenerator?: () => void;
}

export const StudentPreviewPane: React.FC<StudentPreviewPaneProps> = ({
  stagedItems,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddQuestionFromScratch,
  onAddGroupFromScratch,
  examTitle = 'Unit Assessment',
  onUpdateExamTitle,
  onOpenAiGenerator,
}) => {
  const [mode, setMode] = useState<'editor' | 'student'>('editor');
  const [editorViewMode, setEditorViewMode] = useState<'visual' | 'code'>('visual');
  const [rawCodeItems, setRawCodeItems] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<string, boolean>>({});

  // Math Modal State
  const [isMathModalOpen, setIsMathModalOpen] = useState<boolean>(false);
  const [lastFocusedNode, setLastFocusedNode] = useState<HTMLElement | null>(null);

  // Student test simulation state
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  const toggleGroupCollapse = (groupId: number) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleQuestionCollapse = (stagedId: string) => {
    setCollapsedQuestions((prev) => ({ ...prev, [stagedId]: !prev[stagedId] }));
  };

  const toggleItemRawCode = (stagedId: string) => {
    setRawCodeItems((prev) => ({
      ...prev,
      [stagedId]: !prev[stagedId],
    }));
  };

  // Format document action (execCommand)
  const handleFormatDoc = (command: string, value: string | null = null) => {
    if (lastFocusedNode) {
      lastFocusedNode.focus();
    }
    document.execCommand(command, false, value || undefined);
  };

  // Insert HTML Table
  const handleInsertTable = (rows: number, cols: number) => {
    if (lastFocusedNode) lastFocusedNode.focus();

    let tableHTML = '<br><table border="1" cellpadding="8" style="width:100%; border-collapse:collapse; margin:12px 0;"><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHTML += '<tr>';
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          tableHTML += `<th style="border:1px solid #cbd5e1; padding:8px; background-color:#f8fafc; font-weight:600;">Header ${c + 1}</th>`;
        } else {
          tableHTML += `<td style="border:1px solid #cbd5e1; padding:8px;">Cell ${r + 1},${c + 1}</td>`;
        }
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table><br>';

    document.execCommand('insertHTML', false, tableHTML);
  };

  // Floating Table Manipulation
  const handleTableAction = (action: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node = selection.anchorNode;
    let cell: HTMLTableCellElement | null = null;
    let row: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;

    while (node && node !== document.body) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') cell = node as HTMLTableCellElement;
      if (node.nodeName === 'TR') row = node as HTMLTableRowElement;
      if (node.nodeName === 'TABLE') table = node as HTMLTableElement;
      node = node.parentNode;
    }

    if (!cell || !row || !table) return;
    const colIndex = Array.from(row.children).indexOf(cell);
    const rowIndex = Array.from(table.rows).indexOf(row);

    switch (action) {
      case 'insertRowAbove':
      case 'insertRowBelow': {
        const newRow = row.cloneNode(true) as HTMLTableRowElement;
        Array.from(newRow.children).forEach((c) => {
          c.innerHTML = '<br>';
          if (c.tagName === 'TH') {
            const td = document.createElement('td');
            td.innerHTML = '<br>';
            newRow.replaceChild(td, c);
          }
        });
        if (action === 'insertRowAbove') row.parentNode?.insertBefore(newRow, row);
        else row.parentNode?.insertBefore(newRow, row.nextSibling);
        break;
      }
      case 'deleteRow': {
        row.parentNode?.removeChild(row);
        if (table.rows.length === 0) table.parentNode?.removeChild(table);
        break;
      }
      case 'insertColLeft':
      case 'insertColRight': {
        Array.from(table.rows).forEach((r) => {
          if (r.children[colIndex]) {
            const target = r.children[colIndex];
            const newCell = document.createElement(target.tagName);
            newCell.innerHTML = '<br>';
            if (action === 'insertColLeft') r.insertBefore(newCell, target);
            else r.insertBefore(newCell, target.nextSibling);
          }
        });
        break;
      }
      case 'deleteCol': {
        Array.from(table.rows).forEach((r) => {
          if (r.children[colIndex]) r.removeChild(r.children[colIndex]);
        });
        if (table.rows.length > 0 && table.rows[0].children.length === 0) {
          table.parentNode?.removeChild(table);
        }
        break;
      }
      case 'rowHeader': {
        const isThRow = row.children[0] && row.children[0].tagName === 'TH';
        const newTag = isThRow ? 'td' : 'th';
        Array.from(row.children).forEach((c) => {
          const newC = document.createElement(newTag);
          newC.innerHTML = c.innerHTML;
          row.replaceChild(newC, c);
        });
        break;
      }
      case 'colHeader': {
        const isThCol =
          table.rows[0] &&
          table.rows[0].children[colIndex] &&
          table.rows[0].children[colIndex].tagName === 'TH';
        const newTag = isThCol ? 'td' : 'th';
        Array.from(table.rows).forEach((r) => {
          const c = r.children[colIndex];
          if (c) {
            const newC = document.createElement(newTag);
            newC.innerHTML = c.innerHTML;
            r.replaceChild(newC, c);
          }
        });
        break;
      }
      case 'mergeRight': {
        const nextCell = cell.nextElementSibling as HTMLTableCellElement | null;
        if (nextCell) {
          cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
          cell.innerHTML += (cell.innerHTML === '<br>' ? '' : '<br>') + nextCell.innerHTML;
          row.removeChild(nextCell);
        }
        break;
      }
      case 'mergeDown': {
        const nextRow = table.rows[rowIndex + (cell.rowSpan || 1)];
        if (nextRow && nextRow.children[colIndex]) {
          const targetCell = nextRow.children[colIndex] as HTMLTableCellElement;
          cell.rowSpan = (cell.rowSpan || 1) + (targetCell.rowSpan || 1);
          cell.innerHTML += (cell.innerHTML === '<br>' ? '' : '<br>') + targetCell.innerHTML;
          nextRow.removeChild(targetCell);
        }
        break;
      }
      case 'unmerge': {
        if (cell.colSpan > 1) {
          const newC = document.createElement(cell.tagName);
          newC.innerHTML = '<br>';
          cell.colSpan -= 1;
          row.insertBefore(newC, cell.nextSibling);
        } else if (cell.rowSpan > 1) {
          const targetRow = table.rows[rowIndex + 1];
          if (targetRow) {
            const newC = document.createElement(cell.tagName);
            newC.innerHTML = '<br>';
            targetRow.insertBefore(newC, targetRow.children[colIndex] || null);
            cell.rowSpan -= 1;
          }
        }
        break;
      }
    }
  };

  // Download all rendered equation SVGs in a ZIP file
  const handleDownloadAllSvgs = async () => {
    const cards = document.querySelectorAll('.math-card');
    if (cards.length === 0) {
      alert('No rendered math equations found on page to package.');
      return;
    }

    const zip = new JSZip();
    cards.forEach((card, index) => {
      const svg = card.querySelector('svg');
      const input = card.querySelector('.filename-input') as HTMLInputElement | null;
      if (!svg) return;

      let fileName = input?.value.trim() || `equation_${index + 1}`;
      if (!fileName.toLowerCase().endsWith('.svg')) fileName += '.svg';

      const clone = svg.cloneNode(true) as SVGElement;
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgString = clone.outerHTML.replace(/currentColor/g, '#000000');
      zip.file(fileName, svgString);
    });

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'assessment_math_assets.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Error packaging SVGs.');
    }
  };

  // Insert HTML from MathLab Modal
  const handleInsertMathHtml = (htmlString: string) => {
    if (lastFocusedNode) lastFocusedNode.focus();
    document.execCommand('insertHTML', false, htmlString);
  };

  // Question editing handlers
  const handlePromptChange = (stagedId: string, currentQ: AssessmentQuestion, newPrompt: string) => {
    onUpdateQuestion(stagedId, { ...currentQ, prompt: newPrompt });
  };

  const handleGroupMetadataChange = (
    stagedId: string,
    currentQ: AssessmentQuestion,
    field: 'groupTitle' | 'lessons' | 'complexity' | 'standards' | 'points',
    val: any
  ) => {
    onUpdateQuestion(stagedId, { ...currentQ, [field]: val });
  };

  const handleSetCorrectChoice = (
    stagedId: string,
    currentQ: AssessmentQuestion,
    targetChoiceId: string
  ) => {
    const updatedChoices = currentQ.choices.map((c) => ({
      ...c,
      isCorrect: c.id === targetChoiceId,
    }));
    onUpdateQuestion(stagedId, { ...currentQ, choices: updatedChoices });
  };

  const handleChoiceTextChange = (
    stagedId: string,
    currentQ: AssessmentQuestion,
    choiceId: string,
    newText: string
  ) => {
    const updatedChoices = currentQ.choices.map((c) =>
      c.id === choiceId ? { ...c, text: newText } : c
    );
    onUpdateQuestion(stagedId, { ...currentQ, choices: updatedChoices });
  };

  const handleAddChoice = (stagedId: string, currentQ: AssessmentQuestion) => {
    const newChoiceId = `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newChoice: QuestionChoice = {
      id: newChoiceId,
      text: 'New Option Choice',
      isCorrect: false,
    };
    onUpdateQuestion(stagedId, {
      ...currentQ,
      choices: [...currentQ.choices, newChoice],
    });
  };

  const handleRemoveChoice = (stagedId: string, currentQ: AssessmentQuestion, choiceId: string) => {
    if (currentQ.choices.length <= 2) {
      alert('Questions require at least 2 choices.');
      return;
    }
    const updatedChoices = currentQ.choices.filter((c) => c.id !== choiceId);
    if (!updatedChoices.some((c) => c.isCorrect) && updatedChoices.length > 0) {
      updatedChoices[0].isCorrect = true;
    }
    onUpdateQuestion(stagedId, { ...currentQ, choices: updatedChoices });
  };

  const handleAiEnhance = async (
    stagedId: string,
    currentQ: AssessmentQuestion,
    action: 'distractors' | 'rewrite' | 'explanation'
  ) => {
    try {
      setAiLoadingId(stagedId);
      const res = await fetch('/api/ai/enhance-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          questionPrompt: currentQ.prompt,
          existingChoices: currentQ.choices,
          existingExplanation: currentQ.explanation,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updatedChoices = data.choices
          ? data.choices.map((c: any, i: number) => ({
              id: `c_ai_${i}_${Date.now()}`,
              text: c.text,
              isCorrect: !!c.isCorrect,
            }))
          : currentQ.choices;

        onUpdateQuestion(stagedId, {
          ...currentQ,
          prompt: data.revisedPrompt || currentQ.prompt,
          explanation: data.explanation || currentQ.explanation,
          choices: updatedChoices,
        });
      } else {
        alert(data.error || 'Failed to enhance question.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error enhancing question.');
    } finally {
      setAiLoadingId(null);
    }
  };

  // Student test grading
  const handleStudentSelectChoice = (qIndex: number, choiceText: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qIndex]: choiceText }));
  };

  let score = 0;
  let possiblePoints = 0;
  stagedItems.forEach((item, idx) => {
    const q = item.question;
    possiblePoints += q.points || 1;
    const selectedChoiceText = userAnswers[idx];
    const correctChoice = q.choices.find((c) => c.isCorrect);

    if (selectedChoiceText && correctChoice && selectedChoiceText === correctChoice.text) {
      score += q.points || 1;
    }
  });

  const percentage = possiblePoints > 0 ? Math.round((score / possiblePoints) * 100) : 0;

  // Group staged items by group ID
  const groupedItemsMap = new Map<number, StagedItem[]>();
  stagedItems.forEach((item) => {
    const grp = item.question.group || 1;
    if (!groupedItemsMap.has(grp)) groupedItemsMap.set(grp, []);
    groupedItemsMap.get(grp)!.push(item);
  });

  const groupIds = Array.from(groupedItemsMap.keys()).sort((a, b) => a - b);

  return (
    <div id="visual-editor-container" className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-6 mb-6">
      {/* Floating Table Context Toolbar */}
      <FloatingTableToolbar onTableAction={handleTableAction} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-extrabold text-slate-900">3. Visual Editor</h2>
            <span
              className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                mode === 'editor'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {mode === 'editor' ? 'Visual Direct Edit' : 'Student View Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'editor'
              ? 'Build or edit exams directly visually. Click any text, option, or table cell to modify.'
              : 'Interactive student exam simulator with auto-grading.'}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {mode === 'editor' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setEditorViewMode('visual')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded font-semibold transition ${
                  editorViewMode === 'visual'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Direct visual inline editing mode"
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Visual Render</span>
              </button>
              <button
                onClick={() => setEditorViewMode('code')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded font-semibold transition ${
                  editorViewMode === 'code'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Edit raw HTML code tags"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Raw HTML Mode</span>
              </button>
            </div>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setMode('editor')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md font-semibold transition ${
                mode === 'editor'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Visual Editor</span>
            </button>
            <button
              onClick={() => setMode('student')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md font-semibold transition ${
                mode === 'student'
                  ? 'bg-white text-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Student Simulator</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Exam Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 mb-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1">
          <FileText className="w-6 h-6 text-blue-400 shrink-0" />
          <input
            type="text"
            value={examTitle}
            onChange={(e) => onUpdateExamTitle && onUpdateExamTitle(e.target.value)}
            placeholder="Enter Exam Title..."
            className="bg-transparent border-b border-slate-700 hover:border-blue-400 focus:border-blue-400 font-bold text-lg sm:text-xl text-white outline-none w-full pb-0.5 transition"
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0 text-xs font-semibold">
          <span className="px-2.5 py-1 bg-slate-800 text-blue-300 rounded-lg border border-slate-700">
            {stagedItems.length} {stagedItems.length === 1 ? 'Question' : 'Questions'}
          </span>
          <span className="px-2.5 py-1 bg-slate-800 text-emerald-400 rounded-lg border border-slate-700">
            {stagedItems.reduce((acc, item) => acc + (item.question.points || 1), 0)} Total Pts
          </span>
        </div>
      </div>

      {/* Sticky Visual Formatting Toolbar */}
      {mode === 'editor' && (
        <VisualFormattingToolbar
          onFormatDoc={handleFormatDoc}
          onInsertTable={handleInsertTable}
          onOpenMathModal={() => setIsMathModalOpen(true)}
          onAddGroup={onAddGroupFromScratch}
          onAddQuestion={() => onAddQuestionFromScratch()}
          onDownloadSvgs={handleDownloadAllSvgs}
          onOpenAiGenerator={onOpenAiGenerator}
        />
      )}

      {/* EMPTY STATE / FROM SCRATCH WELCOME PANEL */}
      {stagedItems.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center my-6 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Edit3 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Create Exam From Scratch</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
            You can compose questions, groups, formulas, and options right here in the visual editor.
            Or if you add sources in the Sources tab, everything will automatically sync here too!
          </p>

          <div className="flex items-center justify-center space-x-3 flex-wrap gap-y-2">
            <button
              onClick={() => onAddQuestionFromScratch()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Question</span>
            </button>

            <button
              onClick={onAddGroupFromScratch}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition"
            >
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span>Add Question Group</span>
            </button>

            <button
              onClick={() => setIsMathModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition"
            >
              <span className="material-symbols-outlined text-[18px]">functions</span>
              <span>MathJax Lab</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: VISUAL DIRECT EDITOR */}
      {mode === 'editor' && stagedItems.length > 0 && (
        <div className="space-y-8">
          {groupIds.map((grpId) => {
            const itemsInGroup = groupedItemsMap.get(grpId) || [];
            const isGroupCollapsed = !!collapsedGroups[grpId];
            const sampleQ = itemsInGroup[0]?.question;

            return (
              <div
                key={`group_${grpId}`}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-all"
              >
                {/* Group Header Bar */}
                <div
                  onClick={() => toggleGroupCollapse(grpId)}
                  className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <button className="text-slate-500 hover:text-slate-800">
                        {isGroupCollapsed ? (
                          <ChevronRight className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <span className="font-extrabold text-sm sm:text-base text-slate-900">
                        Group {grpId}:
                      </span>
                      <input
                        type="text"
                        onClick={(e) => e.stopPropagation()}
                        value={sampleQ?.groupTitle || `Multiple Choice`}
                        onChange={(e) => {
                          const val = e.target.value;
                          itemsInGroup.forEach((it) =>
                            handleGroupMetadataChange(it.id, it.question, 'groupTitle', val)
                          );
                        }}
                        placeholder="e.g. Multiple Choice Section..."
                        className="bg-transparent border-b border-dashed border-slate-400 focus:border-blue-600 text-slate-900 font-bold text-sm sm:text-base outline-none px-1 py-0.5"
                      />
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full">
                      {itemsInGroup.length} {itemsInGroup.length === 1 ? 'Question' : 'Questions'}
                    </span>
                  </div>

                  {/* Group Metadata Bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center space-x-4 sm:space-x-6 text-xs text-slate-600 pt-2 flex-wrap gap-y-2 pl-7"
                  >
                    <div className="flex items-center space-x-1">
                      <strong className="text-slate-700">Lessons:</strong>
                      <input
                        type="text"
                        value={sampleQ?.lessons || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          itemsInGroup.forEach((it) =>
                            handleGroupMetadataChange(it.id, it.question, 'lessons', val)
                          );
                        }}
                        placeholder="e.g. Polynomials"
                        className="border-b border-slate-300 focus:border-blue-600 text-blue-700 font-medium outline-none px-1 w-28 sm:w-36 bg-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-1">
                      <strong className="text-slate-700">Complexity:</strong>
                      <input
                        type="text"
                        value={sampleQ?.complexity || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          itemsInGroup.forEach((it) =>
                            handleGroupMetadataChange(it.id, it.question, 'complexity', val)
                          );
                        }}
                        placeholder="e.g. Moderate"
                        className="border-b border-slate-300 focus:border-blue-600 text-blue-700 font-medium outline-none px-1 w-20 bg-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-1">
                      <strong className="text-slate-700">Standards:</strong>
                      <input
                        type="text"
                        value={sampleQ?.standards || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          itemsInGroup.forEach((it) =>
                            handleGroupMetadataChange(it.id, it.question, 'standards', val)
                          );
                        }}
                        placeholder="e.g. MA.912.AR.1.3"
                        className="border-b border-slate-300 focus:border-blue-600 text-blue-700 font-medium outline-none px-1 w-28 sm:w-36 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Group Body Questions List */}
                {!isGroupCollapsed && (
                  <div className="p-4 sm:p-6 space-y-6 bg-slate-50/40">
                    {itemsInGroup.map((item) => {
                      const q = item.question;
                      const globalIndex = stagedItems.findIndex((it) => it.id === item.id) + 1;
                      const isAiLoading = aiLoadingId === item.id;
                      const isRawCode = editorViewMode === 'code' || !!rawCodeItems[item.id];
                      const isQCollapsed = !!collapsedQuestions[item.id];

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition"
                        >
                          {/* Question Card Header */}
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleQuestionCollapse(item.id)}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                {isQCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                                #{globalIndex}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.sourceTitle || 'Visual Draft'}
                              </span>

                              {/* Points input */}
                              <div className="flex items-center space-x-1 bg-white border border-slate-300 px-2 py-0.5 rounded text-xs">
                                <span className="text-slate-500 text-[11px] font-semibold">
                                  Pts:
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={q.points || 1}
                                  onChange={(e) =>
                                    handleGroupMetadataChange(
                                      item.id,
                                      q,
                                      'points',
                                      parseInt(e.target.value, 10) || 1
                                    )
                                  }
                                  className="w-10 text-center font-bold text-blue-700 focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Actions & AI */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleItemRawCode(item.id)}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded border transition ${
                                  isRawCode
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                                }`}
                                title="Toggle raw HTML code editor"
                              >
                                <Code2 className="w-3.5 h-3.5" />
                                <span>{isRawCode ? 'Visual' : 'Raw Code'}</span>
                              </button>

                              {onOpenAiGenerator && (
                                <button
                                  onClick={onOpenAiGenerator}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 rounded transition shadow-2xs"
                                  title="Open AI Question Generator & Assistant"
                                >
                                  <Wand2 className="w-3.5 h-3.5 text-purple-200" />
                                  <span className="hidden sm:inline">AI Generate</span>
                                </button>
                              )}

                              <button
                                disabled={isAiLoading}
                                onClick={() => handleAiEnhance(item.id, q, 'rewrite')}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 transition disabled:opacity-50"
                                title="AI refine question prompt"
                              >
                                <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                                <span className="hidden sm:inline">AI Refine</span>
                              </button>

                              <button
                                disabled={isAiLoading}
                                onClick={() => handleAiEnhance(item.id, q, 'distractors')}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 transition disabled:opacity-50"
                                title="AI generate distractors"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="hidden sm:inline">AI Distractors</span>
                              </button>

                              <button
                                onClick={() => onRemoveQuestion(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                                title="Remove question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {!isQCollapsed && (
                            <>
                              {/* Question Stem Prompt */}
                              <div className="mb-5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Question Stem
                                </label>

                                {isRawCode ? (
                                  <textarea
                                    value={q.prompt}
                                    onChange={(e) =>
                                      handlePromptChange(item.id, q, e.target.value)
                                    }
                                    rows={3}
                                    className="w-full p-3 text-xs font-mono bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed shadow-2xs"
                                    placeholder="Enter question stem HTML..."
                                  />
                                ) : (
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={(e) => setLastFocusedNode(e.currentTarget)}
                                    onBlur={(e) => {
                                      const newHtml = e.currentTarget.innerHTML;
                                      if (newHtml !== q.prompt) {
                                        handlePromptChange(item.id, q, newHtml);
                                      }
                                    }}
                                    className="p-4 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition overflow-x-auto min-h-[50px] [&_table]:border-collapse [&_table]:w-full [&_table]:my-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100"
                                    dangerouslySetInnerHTML={{
                                      __html:
                                        q.prompt ||
                                        '<div><em class="text-slate-400">Click to enter question prompt...</em></div>',
                                    }}
                                  />
                                )}
                              </div>

                              {/* Answer Options List */}
                              <div className="space-y-2.5 mb-5">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Answer Options (Toggle radio for correct key)
                                  </label>
                                  <button
                                    onClick={() => handleAddChoice(item.id, q)}
                                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Option</span>
                                  </button>
                                </div>

                                {q.choices.map((choice, cIdx) => {
                                  const letter = String.fromCharCode(65 + cIdx);
                                  const isCorrect = choice.isCorrect;

                                  return (
                                    <div
                                      key={choice.id || cIdx}
                                      className={`p-3 rounded-xl border flex items-center space-x-3 transition ${
                                        isCorrect
                                          ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-300/40 shadow-2xs'
                                          : 'bg-white border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      {/* Correct key toggle button */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetCorrectChoice(item.id, q, choice.id)
                                        }
                                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                                          isCorrect
                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                            : 'border-slate-300 hover:border-emerald-500 text-transparent bg-white'
                                        }`}
                                        title="Click to set as Correct Answer Key"
                                      >
                                        ✔
                                      </button>

                                      <span className="font-extrabold text-xs text-slate-500 w-4 shrink-0">
                                        {letter}.
                                      </span>

                                      {/* Choice Content */}
                                      <div className="flex-1 min-w-0">
                                        {isRawCode ? (
                                          <input
                                            type="text"
                                            value={choice.text}
                                            onChange={(e) =>
                                              handleChoiceTextChange(
                                                item.id,
                                                q,
                                                choice.id,
                                                e.target.value
                                              )
                                            }
                                            className={`w-full px-2.5 py-1.5 text-xs font-mono rounded border ${
                                              isCorrect
                                                ? 'bg-white border-emerald-400 text-emerald-950 focus:ring-emerald-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:ring-blue-500'
                                            } focus:outline-none focus:ring-1`}
                                          />
                                        ) : (
                                          <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onFocus={(e) => setLastFocusedNode(e.currentTarget)}
                                            onBlur={(e) => {
                                              const newHtml = e.currentTarget.innerHTML;
                                              if (newHtml !== choice.text) {
                                                handleChoiceTextChange(
                                                  item.id,
                                                  q,
                                                  choice.id,
                                                  newHtml
                                                );
                                              }
                                            }}
                                            className={`p-2 rounded text-xs sm:text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-400 hover:bg-slate-100/80 transition overflow-x-auto min-h-[36px] [&_table]:border-collapse [&_table]:my-1 [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_th]:bg-slate-100 ${
                                              isCorrect
                                                ? 'font-semibold text-emerald-950 bg-white/70'
                                                : 'text-slate-800'
                                            }`}
                                            dangerouslySetInnerHTML={{
                                              __html:
                                                choice.text ||
                                                '<em>Click to enter option text...</em>',
                                            }}
                                          />
                                        )}
                                      </div>

                                      {/* Badge */}
                                      {isCorrect ? (
                                        <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md shrink-0">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="hidden sm:inline">Correct Key</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleSetCorrectChoice(item.id, q, choice.id)
                                          }
                                          className="text-[11px] font-semibold text-slate-400 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50 transition shrink-0"
                                        >
                                          Set Correct
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleRemoveChoice(item.id, q, choice.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 shrink-0 transition"
                                        title="Delete Option"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Solution Rationale */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Solution Rationale / Explanation
                                </label>
                                <input
                                  type="text"
                                  value={q.explanation || ''}
                                  onChange={(e) =>
                                    onUpdateQuestion(item.id, {
                                      ...q,
                                      explanation: e.target.value,
                                    })
                                  }
                                  placeholder="Provide solution rationale or feedback for students..."
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    <div className="pt-2">
                      <button
                        onClick={() => onAddQuestionFromScratch(grpId)}
                        className="inline-flex items-center space-x-1 px-4 py-2 bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Question to Group {grpId}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => onAddQuestionFromScratch()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Question</span>
            </button>

            <button
              onClick={onAddGroupFromScratch}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition"
            >
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span>+ Add Question Group</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: STUDENT SIMULATION MODE */}
      {mode === 'student' && stagedItems.length > 0 && (
        <div className="space-y-6">
          {isSubmitted && (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-md">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Assessment Submitted</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Score: <span className="font-extrabold text-blue-700">{score}</span> /{' '}
                    {possiblePoints} pts ({percentage}%)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setUserAnswers({});
                  setIsSubmitted(false);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 rounded-xl transition shadow-2xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Test</span>
              </button>
            </div>
          )}

          {stagedItems.map((item, idx) => {
            const q = item.question;
            const targetNum = idx + 1;
            const selectedChoice = userAnswers[idx];
            const correctChoice = q.choices.find((c) => c.isCorrect);

            return (
              <div
                key={item.id}
                className="p-6 rounded-2xl border border-slate-200 bg-white transition shadow-2xs"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <span className="px-3 py-1 rounded-lg font-extrabold text-xs bg-blue-600 text-white shadow-2xs">
                    Question #{targetNum}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {q.points || 1} {q.points === 1 ? 'Point' : 'Points'}
                  </span>
                </div>

                <div
                  className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed mb-5 [&_table]:border-collapse [&_table]:w-full [&_table]:my-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100"
                  dangerouslySetInnerHTML={{ __html: q.prompt }}
                />

                <div className="space-y-2.5">
                  {q.choices.map((choice, cIdx) => {
                    const letter = String.fromCharCode(65 + cIdx);
                    const isSelected = selectedChoice === choice.text;
                    const isCorrectAnswer = choice.isCorrect;

                    let borderStyle = 'border-slate-200 bg-white hover:border-blue-300';
                    if (isSelected) borderStyle = 'border-blue-500 bg-blue-50/60 text-blue-900 font-medium';
                    if (isSubmitted && isCorrectAnswer)
                      borderStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-300';
                    if (isSubmitted && isSelected && !isCorrectAnswer)
                      borderStyle = 'border-rose-500 bg-rose-50 text-rose-950 font-medium';

                    return (
                      <div
                        key={choice.id || cIdx}
                        onClick={() => handleStudentSelectChoice(idx, choice.text)}
                        className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition select-none ${borderStyle}`}
                      >
                        <input
                          type="radio"
                          name={`student_sim_q_${targetNum}`}
                          checked={isSelected}
                          onChange={() => handleStudentSelectChoice(idx, choice.text)}
                          disabled={isSubmitted}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-extrabold text-xs text-slate-500 uppercase">{letter}.</span>
                        <div
                          className="flex-1 text-xs sm:text-sm [&_table]:border-collapse [&_table]:my-1 [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_th]:bg-slate-100"
                          dangerouslySetInnerHTML={{ __html: choice.text }}
                        />
                      </div>
                    );
                  })}
                </div>

                {isSubmitted && q.explanation && (
                  <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs sm:text-sm">
                    <span className="font-bold">Solution Rationale: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {!isSubmitted && (
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsSubmitted(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
              >
                <FileCheck className="w-5 h-5" />
                <span>Submit & Grade Student Test</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MathJax Lab Modal */}
      <MathLabModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
        onInsertHtml={handleInsertMathHtml}
      />
    </div>
  );
};
