import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Sparkles, Download, Check } from 'lucide-react';
import { processRawMathInput } from '../utils/mathParser';

interface MathLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertHtml: (html: string) => void;
}

export const MathLabModal: React.FC<MathLabModalProps> = ({ isOpen, onClose, onInsertHtml }) => {
  const [rawInput, setRawInput] = useState<string>('');
  const [renderedLatex, setRenderedLatex] = useState<string>('');
  const [filename, setFilename] = useState<string>('eq_1');
  const previewRef = useRef<HTMLDivElement>(null);
  const [eqCounter, setEqCounter] = useState<number>(1);

  useEffect(() => {
    if (!rawInput.trim()) {
      setRenderedLatex('');
      return;
    }

    const html = processRawMathInput(rawInput);
    setRenderedLatex(html);

    const timer = setTimeout(() => {
      if (previewRef.current && (window as any).MathJax) {
        try {
          (window as any).MathJax.typesetClear([previewRef.current]);
          (window as any).MathJax.typesetPromise([previewRef.current]).catch((err: any) =>
            console.error(err)
          );
        } catch (e) {
          console.error(e);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [rawInput]);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (!previewRef.current) return;
    const svgElement = previewRef.current.querySelector('svg');
    if (!svgElement) {
      alert('Please enter a valid equation to render first.');
      return;
    }

    const clone = svgElement.cloneNode(true) as SVGElement;
    clone.style.margin = '0';
    const cleanFilename = filename.trim() || `eq_${eqCounter}`;

    const cardHtml = `<span class="math-card inline-flex flex-col items-center bg-white border border-slate-300 rounded-md p-2 mx-1 align-middle shadow-2xs select-none" contenteditable="false">${clone.outerHTML}<input type="text" class="filename-input text-[11px] w-28 text-center border border-slate-200 rounded px-1 py-0.5 outline-none text-slate-600 focus:border-blue-500" value="${cleanFilename}" /></span>&nbsp;`;

    onInsertHtml(cardHtml);
    setEqCounter((prev) => prev + 1);
    setFilename(`eq_${eqCounter + 1}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              ∑
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Insert CB-Ready MathJax</h3>
              <p className="text-xs text-slate-500">
                Enter equations using College Board shorthand macros or TeX notation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Math Equation Input (LaTeX / Shorthand)
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Supports <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">sqrt(x)</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">[[a,b;c,d]]</code>, matrices, fractions
            </span>
          </div>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="e.g. 2x^2 + sqrt(16) / 4 = 10 | Equation 1"
            rows={4}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Live Rendered Preview</label>
          <div
            ref={previewRef}
            className="min-h-[100px] p-4 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-800 font-medium overflow-x-auto text-center"
          >
            {renderedLatex ? (
              <div dangerouslySetInnerHTML={{ __html: renderedLatex }} />
            ) : (
              <span className="text-xs text-slate-400 italic">
                Formatted equations will render live here...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">Asset Filename:</span>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition inline-flex items-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Insert SVG into Question</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
