import React, { useState, useEffect } from 'react';

interface FloatingTableToolbarProps {
  onTableAction: (
    action:
      | 'insertRowAbove'
      | 'insertRowBelow'
      | 'deleteRow'
      | 'insertColLeft'
      | 'insertColRight'
      | 'deleteCol'
      | 'rowHeader'
      | 'colHeader'
      | 'mergeRight'
      | 'mergeDown'
      | 'unmerge'
  ) => void;
}

export const FloatingTableToolbar: React.FC<FloatingTableToolbarProps> = ({ onTableAction }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeMenu, setActiveMenu] = useState<'col' | 'row' | 'merge' | null>(null);
  const [isRowHeader, setIsRowHeader] = useState<boolean>(false);
  const [isColHeader, setIsColHeader] = useState<boolean>(false);

  useEffect(() => {
    const handleSelectionOrClick = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setPosition(null);
        return;
      }

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

      if (cell && row && table) {
        const rect = table.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY - 45,
          left: rect.left + window.scrollX,
        });

        const colIndex = Array.from(row.children).indexOf(cell);
        setIsRowHeader(row.children[0] && row.children[0].tagName === 'TH');
        setIsColHeader(
          table.rows[0] &&
            table.rows[0].children[colIndex] &&
            table.rows[0].children[colIndex].tagName === 'TH'
        );
      } else {
        setPosition(null);
        setActiveMenu(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionOrClick);
    document.addEventListener('mousedown', (e) => {
      if (!(e.target as HTMLElement).closest('#floating-table-toolbar-root')) {
        setActiveMenu(null);
      }
    });

    return () => {
      document.removeEventListener('selectionchange', handleSelectionOrClick);
    };
  }, []);

  if (!position) return null;

  return (
    <div
      id="floating-table-toolbar-root"
      onMouseDown={(e) => e.preventDefault()}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="absolute z-40 bg-white border border-slate-300 shadow-xl rounded-lg p-1 flex items-center space-x-1 animate-in fade-in duration-150 text-xs font-semibold text-slate-700"
    >
      {/* Column Tools */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setActiveMenu(activeMenu === 'col' ? null : 'col')}
          className="p-1.5 hover:bg-slate-100 rounded flex items-center space-x-0.5 text-slate-700"
          title="Column Options"
        >
          <span className="material-symbols-outlined text-[18px]">view_column</span>
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
        </button>

        {activeMenu === 'col' && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-44 z-50">
            <div
              onClick={() => onTableAction('colHeader')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer flex items-center justify-between"
            >
              <span>Header Column</span>
              <input type="checkbox" checked={isColHeader} readOnly className="rounded text-blue-600" />
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div
              onClick={() => onTableAction('insertColLeft')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Insert column left
            </div>
            <div
              onClick={() => onTableAction('insertColRight')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Insert column right
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div
              onClick={() => onTableAction('deleteCol')}
              className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer font-bold"
            >
              Delete column
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-300 mx-0.5" />

      {/* Row Tools */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setActiveMenu(activeMenu === 'row' ? null : 'row')}
          className="p-1.5 hover:bg-slate-100 rounded flex items-center space-x-0.5 text-slate-700"
          title="Row Options"
        >
          <span className="material-symbols-outlined text-[18px]">table_rows</span>
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
        </button>

        {activeMenu === 'row' && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-44 z-50">
            <div
              onClick={() => onTableAction('rowHeader')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer flex items-center justify-between"
            >
              <span>Header Row</span>
              <input type="checkbox" checked={isRowHeader} readOnly className="rounded text-blue-600" />
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div
              onClick={() => onTableAction('insertRowAbove')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Insert row above
            </div>
            <div
              onClick={() => onTableAction('insertRowBelow')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Insert row below
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div
              onClick={() => onTableAction('deleteRow')}
              className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer font-bold"
            >
              Delete row
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-300 mx-0.5" />

      {/* Merge Tools */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setActiveMenu(activeMenu === 'merge' ? null : 'merge')}
          className="p-1.5 hover:bg-slate-100 rounded flex items-center space-x-0.5 text-slate-700"
          title="Merge Cell Options"
        >
          <span className="material-symbols-outlined text-[18px]">cell_merge</span>
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
        </button>

        {activeMenu === 'merge' && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-44 z-50">
            <div
              onClick={() => onTableAction('mergeRight')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Merge right
            </div>
            <div
              onClick={() => onTableAction('mergeDown')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Merge down
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div
              onClick={() => onTableAction('unmerge')}
              className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
            >
              Unmerge
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
