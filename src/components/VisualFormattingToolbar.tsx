import React, { useState, useEffect } from 'react';
import {
  Plus,
  Table as TableIcon,
  Download,
  FolderPlus,
  Highlighter,
  ChevronDown,
  Wand2
} from 'lucide-react';
import JSZip from 'jszip';

interface VisualFormattingToolbarProps {
  onFormatDoc: (command: string, value?: string | null) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onOpenMathModal: () => void;
  onAddGroup: () => void;
  onAddQuestion: () => void;
  onDownloadSvgs: () => void;
  onOpenAiGenerator?: () => void;
}

export const VisualFormattingToolbar: React.FC<VisualFormattingToolbarProps> = ({
  onFormatDoc,
  onInsertTable,
  onOpenMathModal,
  onAddGroup,
  onAddQuestion,
  onDownloadSvgs,
  onOpenAiGenerator,
}) => {

  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);
  const [hoveredGrid, setHoveredGrid] = useState<{ rows: number; cols: number }>({ rows: 3, cols: 3 });

  // Close grid menu when clicking outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#table-grid-menu-container')) {
        setIsGridOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <div className="sticky top-2 z-30 bg-white border border-slate-200 rounded-xl shadow-md p-2.5 mb-6 space-y-2">
      {/* Row 1: Text Formatting Controls */}
      <div className="flex items-center space-x-1 flex-wrap gap-y-1.5 text-slate-700">
        {/* Paragraph / Heading Selector */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onFormatDoc('formatBlock', e.target.value);
              e.target.selectedIndex = 0;
            }
          }}
          className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md outline-none cursor-pointer text-slate-800"
        >
          <option value="" hidden>
            Format Block
          </option>
          <option value="H1">Heading 1</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
          <option value="P">Paragraph</option>
        </select>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Formatting Buttons */}
        <button
          type="button"
          onClick={() => onFormatDoc('bold')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Bold (Ctrl+B)"
        >
          <span className="material-symbols-outlined text-[18px]">format_bold</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('italic')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Italic (Ctrl+I)"
        >
          <span className="material-symbols-outlined text-[18px]">format_italic</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('underline')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Underline (Ctrl+U)"
        >
          <span className="material-symbols-outlined text-[18px]">format_underlined</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('strikethrough')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Strikethrough"
        >
          <span className="material-symbols-outlined text-[18px]">strikethrough_s</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('subscript')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Subscript"
        >
          <span className="material-symbols-outlined text-[18px]">subscript</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('superscript')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Superscript"
        >
          <span className="material-symbols-outlined text-[18px]">superscript</span>
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => onFormatDoc('formatBlock', 'BLOCKQUOTE')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Quote Block"
        >
          <span className="material-symbols-outlined text-[18px]">format_quote</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('insertUnorderedList')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Bullet List"
        >
          <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('insertOrderedList')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Numbered List"
        >
          <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
        </button>

        {/* Interactive 10x10 Table Grid Picker */}
        <div id="table-grid-menu-container" className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsGridOpen(!isGridOpen)}
            className="inline-flex items-center space-x-0.5 p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
            title="Insert HTML Table"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            <span className="material-symbols-outlined text-[14px]">expand_more</span>
          </button>

          {isGridOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl p-3 z-50 w-52"
            >
              <div className="text-center text-xs font-bold text-slate-700 mb-2">
                {hoveredGrid.rows} x {hoveredGrid.cols} Table
              </div>
              <div className="grid grid-cols-10 gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                {Array.from({ length: 10 }).map((_, rIdx) =>
                  Array.from({ length: 10 }).map((__, cIdx) => {
                    const r = rIdx + 1;
                    const c = cIdx + 1;
                    const isActive = r <= hoveredGrid.rows && c <= hoveredGrid.cols;
                    return (
                      <div
                        key={`cell_${r}_${c}`}
                        onMouseOver={() => setHoveredGrid({ rows: r, cols: c })}
                        onClick={() => {
                          onInsertTable(hoveredGrid.rows, hoveredGrid.cols);
                          setIsGridOpen(false);
                        }}
                        className={`w-3.5 h-3.5 border cursor-pointer transition-all ${
                          isActive
                            ? 'bg-blue-600 border-blue-700'
                            : 'bg-white border-slate-300 hover:border-blue-400'
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Highlighting */}
        <div className="relative inline-flex items-center p-1 hover:bg-slate-100 rounded cursor-pointer" title="Highlight Text Color">
          <span className="material-symbols-outlined text-[18px] text-slate-700">format_ink_highlighter</span>
          <input
            type="color"
            onChange={(e) => onFormatDoc('hiliteColor', e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => onFormatDoc('undo')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Undo"
        >
          <span className="material-symbols-outlined text-[18px]">undo</span>
        </button>
        <button
          type="button"
          onClick={() => onFormatDoc('redo')}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition"
          title="Redo"
        >
          <span className="material-symbols-outlined text-[18px]">redo</span>
        </button>
      </div>

      {/* Row 2: Action Buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onAddGroup}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-300 transition"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>Add Group</span>
          </button>

          <button
            type="button"
            onClick={onAddQuestion}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          {onOpenAiGenerator && (
            <button
              type="button"
              onClick={onOpenAiGenerator}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-2xs transition"
              title="Open AI Question Generator & Assistant"
            >
              <Wand2 className="w-4 h-4 text-purple-200" />
              <span>AI Generate</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenMathModal}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg transition"
          >
            <span className="material-symbols-outlined text-[16px]">functions</span>
            <span>MathJax Lab</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={onDownloadSvgs}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Zip SVGs</span>
          </button>
        </div>
      </div>
    </div>
  );
};
