/**
 * College Board MathJax Macro & Shorthand Engine
 * Parses custom shorthand math notation into standard TeX LaTeX syntax
 */

export function autoScaleDelimiters(str: string): string {
  const openStack: Array<{ index: number; char: string; isScaled: boolean }> = [];
  const replacements: Array<{ openIdx: number; closeIdx: number; openChar: string; closeChar: string }> = [];

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(' || str[i] === '[') {
      if (i > 0 && str[i - 1] === '\\') continue;
      let isScaled = false;
      if (i >= 5 && str.substring(i - 5, i) === '\\left') isScaled = true;
      openStack.push({ index: i, char: str[i], isScaled });
    } else if (str[i] === ')' || str[i] === ']') {
      if (i > 0 && str[i - 1] === '\\') continue;
      let isScaled = false;
      if (i >= 6 && str.substring(i - 6, i) === '\\right') isScaled = true;
      if (openStack.length > 0) {
        let matchIndex = -1;
        const targetOpen = str[i] === ')' ? '(' : '[';
        for (let j = openStack.length - 1; j >= 0; j--) {
          if (openStack[j].char === targetOpen) {
            matchIndex = j;
            break;
          }
        }
        if (matchIndex !== -1) {
          const openNode = openStack[matchIndex];
          openStack.splice(matchIndex, 1);
          if (!openNode.isScaled && !isScaled) {
            const innerContent = str.substring(openNode.index + 1, i);
            if (
              innerContent.includes('\\frac') ||
              innerContent.includes('\\sqrt') ||
              innerContent.includes('\\begin') ||
              innerContent.includes('\\left')
            ) {
              replacements.push({
                openIdx: openNode.index,
                closeIdx: i,
                openChar: openNode.char,
                closeChar: str[i],
              });
            }
          }
        }
      }
    }
  }

  const chars = str.split('');
  for (const rep of replacements) {
    chars[rep.openIdx] = '\\left' + rep.openChar;
    chars[rep.closeIdx] = '\\right' + rep.closeChar;
  }
  return chars.join('');
}

export function parseRoots(str: string): string {
  const targets = [
    { cmd: 'cbrt', tex: '\\sqrt[3]' },
    { cmd: 'sqrt', tex: '\\sqrt' },
  ];

  for (const t of targets) {
    let safety = 0;
    let searchIdx = 0;
    while (safety < 200) {
      safety++;
      const idx = str.indexOf(t.cmd + '(', searchIdx);
      if (idx === -1) break;
      let open = 0;
      let endIdx = -1;
      for (let i = idx + t.cmd.length; i < str.length; i++) {
        if (str[i] === '(') open++;
        else if (str[i] === ')') {
          open--;
          if (open === 0) {
            endIdx = i;
            break;
          }
        }
      }
      if (endIdx !== -1) {
        const inner = str.substring(idx + t.cmd.length + 1, endIdx);
        const replacement = t.tex + '{' + inner + '}';
        str = str.substring(0, idx) + replacement + str.substring(endIdx + 1);
        searchIdx = idx + replacement.length;
      } else {
        searchIdx = idx + 1;
      }
    }
  }
  str = str.replace(/(^|[^\\])cbrt([a-zA-Z0-9\.\^]+)/g, '$1\\sqrt[3]{$2}');
  str = str.replace(/(^|[^\\])sqrt([a-zA-Z0-9\.\^]+)/g, '$1\\sqrt{$2}');
  return str;
}

export function autoFormatFractions(str: string): string {
  function stripOuterParens(s: string): string {
    s = s.trim();
    if (s.startsWith('(') && s.endsWith(')')) {
      let parens = 0;
      for (let i = 0; i < s.length - 1; i++) {
        if (s[i] === '(') parens++;
        else if (s[i] === ')') parens--;
        if (parens === 0) return s;
      }
      return s.slice(1, -1);
    }
    return s;
  }

  let safetyCounter = 0;
  let searchEnd = str.length;
  while (safetyCounter < 300) {
    safetyCounter++;
    const i = str.lastIndexOf('/', searchEnd - 1);
    if (i === -1) break;
    let start = i - 1;
    while (start >= 0 && str[start] === ' ') start--;
    let numStart = start;
    let openP = 0,
      openB = 0,
      openBr = 0;
    while (numStart >= 0) {
      const c = str[numStart];
      if (c === ')') openP++;
      else if (c === '(') {
        if (openP === 0) break;
        openP--;
      } else if (c === '}') openB++;
      else if (c === '{') {
        if (openB === 0) break;
        openB--;
      } else if (c === ']') openBr++;
      else if (c === '[') {
        if (openBr === 0) break;
        openBr--;
      } else if (/[a-zA-Z0-9\.\^\_\\*]/.test(c)) {
      } else {
        if (openP === 0 && openB === 0 && openBr === 0) break;
      }
      numStart--;
    }
    numStart++;
    let end = i + 1;
    while (end < str.length && str[end] === ' ') end++;
    let denEnd = end;
    (openP = 0), (openB = 0), (openBr = 0);
    if (str[denEnd] === '+' || str[denEnd] === '-') denEnd++;
    while (denEnd < str.length) {
      const c = str[denEnd];
      if (c === '(') openP++;
      else if (c === ')') {
        if (openP === 0) break;
        openP--;
      } else if (c === '{') openB++;
      else if (c === '}') {
        if (openB === 0) break;
        openB--;
      } else if (c === '[') openBr++;
      else if (c === ']') {
        if (openBr === 0) break;
        openBr--;
      } else if (/[a-zA-Z0-9\.\^\_\\*]/.test(c)) {
      } else {
        if (openP === 0 && openB === 0 && openBr === 0) break;
      }
      denEnd++;
    }
    denEnd--;
    if (numStart >= 0 && denEnd < str.length && numStart <= start && denEnd >= end) {
      let numerator = stripOuterParens(str.substring(numStart, i));
      let denominator = stripOuterParens(str.substring(i + 1, denEnd + 1));
      numerator = numerator.replace(/\+/g, '\\ +\\ ').replace(/\-/g, '\\ -\\ ');
      denominator = denominator.replace(/\+/g, '\\ +\\ ').replace(/\-/g, '\\ -\\ ');
      const frac = `\\frac{${numerator}}{${denominator}}`;
      str = str.substring(0, numStart) + frac + str.substring(denEnd + 1);
      searchEnd = str.length;
    } else {
      searchEnd = i;
    }
  }
  return str;
}

export function parseCustomShorthandMacros(equation: string): string {
  if (equation.includes('longdiv') || equation.includes('\\begin{array}')) return equation;

  equation = equation.replace(/\[\[([^\]]+)\]\]/g, (_match, innerContent) => {
    const rows = innerContent.split(';');
    const firstRow = rows[0] || '';
    const isAugmented = firstRow.includes('::');
    const formattedRows = rows.map((row: string) => {
      if (isAugmented) {
        const parts = row.split('::');
        const leftCols = parts[0] ? parts[0].split(',').map((c: string) => c.trim()) : [];
        const rightCols = parts[1] ? parts[1].split(',').map((c: string) => c.trim()) : [];
        return leftCols.join(' & ') + ' & ' + rightCols.join(' & ');
      } else {
        return row
          .split(',')
          .map((c: string) => c.trim())
          .join(' & ');
      }
    });
    if (isAugmented) {
      const sampleParts = firstRow.split('::');
      const leftCount = sampleParts[0] ? sampleParts[0].split(',').length : 1;
      const rightCount = sampleParts[1] ? sampleParts[1].split(',').length : 1;
      const colSpec = 'c'.repeat(leftCount) + '|' + 'c'.repeat(rightCount);
      return '\\left[\\begin{array}{' + colSpec + '} ' + formattedRows.join(' \\\\ ') + ' \\end{array}\\right]';
    } else {
      return '\\begin{bmatrix} ' + formattedRows.join(' \\\\ ') + ' \\end{bmatrix}';
    }
  });

  equation = equation.replace(/cases\[([^\]]+)\]/g, (_match, innerContent) => {
    const rows = innerContent.split(';');
    const formattedRows = rows.map((row: string) => {
      let trimmed = row.trim();
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        const val = parts[0].trim();
        const constraint = parts.slice(1).join(',').trim();
        trimmed = val + ' &\\quad ' + constraint;
      } else {
        if (trimmed.includes('=') && !trimmed.includes('&=')) trimmed = trimmed.replace('=', '&=');
        else if (trimmed.includes('<') && !trimmed.includes('&<')) trimmed = trimmed.replace('<', '&<');
        else if (trimmed.includes('>') && !trimmed.includes('&>')) trimmed = trimmed.replace('>', '&>');
        else if (trimmed.includes('\\leq') && !trimmed.includes('&\\leq')) trimmed = trimmed.replace('\\leq', '&\\leq');
        else if (trimmed.includes('\\geq') && !trimmed.includes('&\\geq')) trimmed = trimmed.replace('\\geq', '&\\geq');
      }
      return trimmed;
    });
    return '\\begin{cases} \\begin{aligned} ' + formattedRows.join(' \\\\ ') + ' \\end{aligned} \\end{cases}';
  });

  equation = parseRoots(equation);
  equation = autoFormatFractions(equation);
  equation = equation.replace(/\bpi\b/g, '\\pi ');
  equation = equation.replace(/([0-9])pi([a-zA-Z0-9]*)/g, '$1\\pi $2');
  equation = equation.replace(
    /(^|[^a-zA-Z\\])(lim|infty|pm|approx|vert|sim|therefore|parallel|perp|angle|triangle|cong|arcsin|arccos|arctan|sin|cos|tan|csc|sec|cot|ln|log|int|cdot|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow)(?![a-zA-Z])/g,
    '$1\\$2'
  );
  equation = equation.replace(/overline\(([^)]+)\)/g, '\\overline{$1}');
  equation = equation.replace(/line\(([^)]+)\)/g, '\\overleftrightarrow{$1}');
  equation = equation.replace(/ray\(([^)]+)\)/g, '\\overrightarrow{$1}');
  equation = equation.replace(/(\d+|\))\s*(deg|°)/g, '$1^{\\circ}');
  equation = equation.replace(/text\(([^)]+)\)/g, '\\text{$1}');
  equation = equation.replace(/bcancel\(([^)]+)\)/g, '\\bcancel{$1}');
  equation = equation.replace(/!=/g, '\\neq');
  equation = equation.replace(/<=/g, '\\leq');
  equation = equation.replace(/>=/g, '\\geq');
  equation = equation.replace(
    /(^|[^a-zA-Z\\])(alpha|beta|gamma|delta|theta|pi|mu|sigma|tau|phi|omega|Sigma|Delta|Omega)(?![a-zA-Z])/g,
    '$1\\$2'
  );
  equation = equation.replace(/(^|[^a-zA-Z\\])(union)(?![a-zA-Z])/g, '$1\\cup');
  equation = equation.replace(/(^|[^a-zA-Z\\])(intersect)(?![a-zA-Z])/g, '$1\\cap');
  equation = equation.replace(/xbar/g, '\\bar{x}');
  equation = equation.replace(/phat/g, '\\hat{p}');
  equation = equation.replace(/yhat/g, '\\hat{y}');
  equation = equation.replace(/binom\(([^,]+),\s*([^)]+)\)/g, '\\binom{$1}{$2}');
  equation = equation.replace(/nCr\(([^,]+),\s*([^)]+)\)/g, '{}_{$1}C_{$2}');
  equation = equation.replace(/nPr\(([^,]+),\s*([^)]+)\)/g, '{}_{$1}P_{$2}');
  equation = equation.replace(/%/g, '\\%');
  equation = autoScaleDelimiters(equation);

  return equation;
}

export function processRawMathInput(rawInput: string): string {
  if (!rawInput.trim()) return '';

  const longdivBlocks: string[] = [];
  const blockRegex = /longdiv\(([^)]+)\)\[([\s\S]*?)\]/g;
  let textToParse = rawInput.replace(blockRegex, (_match, divisor, gridContent) => {
    const cleanGrid = gridContent.replace(/[\r\n]+/g, ' ').trim();
    const rows = cleanGrid.split(';');
    const formattedRows = rows
      .map((row: string, idx: number) => {
        let trimmedRow = row.trim();
        if (!trimmedRow) return '';
        if (trimmedRow === 'hline') return '\\hline';
        trimmedRow = trimmedRow.replace(/\bdown\b/g, '\\downarrow');
        trimmedRow = parseCustomShorthandMacros(trimmedRow);
        const cols = trimmedRow.split('&&').map((c: string) => c.trim());
        const mappedRow = cols.join(' & ');
        if (idx === 1) {
          return divisor + ' & \\enclose{longdiv}{' + mappedRow + '}';
        }
        return ' & ' + mappedRow;
      })
      .filter((r: string) => r !== '');
    const arrayLaTeX = '\\begin{array}{rccccccccc} ' + formattedRows.join(' \\\\ ') + ' \\end{array}';
    longdivBlocks.push(arrayLaTeX);
    return `__LONGDIV_PLACEHOLDER_${longdivBlocks.length - 1}__`;
  });

  const lines = textToParse.split('\n');
  const processedLines: string[] = [];
  let hasTextColumn = false;
  let originalLineCount = 0;

  const parsedLines = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      originalLineCount++;
      const cleanTrimmed = trimmed.replace(/\|/g, '').trim().toLowerCase();
      if (cleanTrimmed === 'hline' || cleanTrimmed === '---') {
        return { equation: '', textPart: '', isHline: true };
      }
      let equation = trimmed;
      let textPart = '';
      if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        equation = parts[0].trim();
        textPart = parts.slice(1).join('|').trim();
      } else {
        const textMatch = trimmed.match(/(.*?)\s{2,}([A-Za-z].*)$/);
        if (textMatch) {
          equation = textMatch[1].trim();
          textPart = textMatch[2].trim();
        }
      }
      if (textPart) hasTextColumn = true;
      const isPlaceholder = equation.includes('__LONGDIV_PLACEHOLDER_');
      if (!isPlaceholder) {
        equation = parseCustomShorthandMacros(equation);
        if (textPart) {
          textPart = parseCustomShorthandMacros(textPart);
        }
        if (
          equation.includes(',') &&
          !equation.includes('array') &&
          !equation.includes('matrix') &&
          !equation.includes('bmatrix') &&
          !equation.includes('cases')
        ) {
          const eqParts = equation.split(',');
          const mainEq = eqParts[0].trim();
          let constraint = eqParts.slice(1).join(',').trim();
          const textCheck = constraint.replace(/\\[a-zA-Z]+/g, '').trim();
          if (/[a-zA-Z]{2,}/.test(textCheck)) {
            constraint = `\\text{${constraint}}`;
          }
          equation = `${mainEq}, ${constraint}`;
        }
        if (!equation.includes('array') && !equation.includes('matrix') && !equation.includes('bmatrix')) {
          if (equation.includes('=') && !equation.includes('&=')) {
            equation = equation.replace('=', '&=');
          } else if (equation.includes('\\approx') && !equation.includes('&\\approx')) {
            equation = equation.replace('\\approx', '&\\approx');
          } else if (equation.includes('\\cong') && !equation.includes('&\\cong')) {
            equation = equation.replace('\\cong', '&\\cong');
          } else if (equation.includes('\\sim') && !equation.includes('&\\sim')) {
            equation = equation.replace('\\sim', '&\\sim');
          } else if (equation.includes('\\neq') && !equation.includes('&\\neq')) {
            equation = equation.replace('\\neq', '&\\neq');
          } else if (equation.includes('\\parallel') && !equation.includes('&\\parallel')) {
            equation = equation.replace('\\parallel', '&\\parallel');
          } else if (equation.includes('\\perp') && !equation.includes('&\\perp')) {
            equation = equation.replace('\\perp', '&\\perp');
          } else if (equation.includes('<') && !equation.includes('&<')) {
            equation = equation.replace('<', '&<');
          } else if (equation.includes('>') && !equation.includes('&>')) {
            equation = equation.replace('>', '&>');
          } else if (equation.includes('\\leq') && !equation.includes('&\\leq')) {
            equation = equation.replace('\\leq', '&\\leq');
          } else if (equation.includes('\\geq') && !equation.includes('&\\geq')) {
            equation = equation.replace('\\geq', '&\\geq');
          } else if (
            !equation.includes('=') &&
            !equation.includes('\\cong') &&
            !equation.includes('\\sim') &&
            !equation.includes('\\neq') &&
            !equation.includes('\\parallel') &&
            !equation.includes('\\perp') &&
            !equation.includes('<') &&
            !equation.includes('>') &&
            !equation.includes('\\leq') &&
            !equation.includes('\\geq')
          ) {
            equation = '&' + equation;
          }
        } else {
          if (equation.startsWith('=')) {
            equation = '&' + equation;
          }
        }
      }
      return { equation, textPart, isHline: false };
    })
    .filter((line) => line !== null);

  for (let i = 0; i < parsedLines.length; i++) {
    const lineItem = parsedLines[i];
    if (lineItem.isHline) {
      processedLines.push('\\hline');
      continue;
    }
    let currentLineString = lineItem.equation;
    if (currentLineString.includes('__LONGDIV_PLACEHOLDER_')) {
      currentLineString = currentLineString.replace(/__LONGDIV_PLACEHOLDER_(\d+)__/g, (_match, index) => {
        return longdivBlocks[parseInt(index, 10)];
      });
    }
    if (hasTextColumn) {
      if (lineItem.textPart) {
        currentLineString += ` && ${lineItem.textPart}`;
      } else {
        currentLineString += ` &&`;
      }
    }
    const nextLineItem = i < parsedLines.length - 1 ? parsedLines[i + 1] : null;
    const isNextHline = nextLineItem && nextLineItem.isHline;
    if (i < parsedLines.length - 1 && !currentLineString.includes('\\begin{array}')) {
      if (isNextHline) {
        currentLineString += ` \\\\[4pt]`;
      } else {
        currentLineString += ` \\\\[10pt]`;
      }
    }
    processedLines.push(currentLineString);
  }

  let liveRenderHTML = '';
  const isAugmentedSystem = rawInput.includes('::');
  if (isAugmentedSystem) {
    const blockLines = processedLines.map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return '';
      if (
        trimmedLine.includes('\\left[') ||
        trimmedLine.includes('[[') ||
        trimmedLine.includes('\\begin{array}')
      ) {
        return `\\[ ${trimmedLine} \\]`;
      } else {
        const cleanText = trimmedLine.split('&&')[0].trim();
        return `<div>${cleanText}</div>`;
      }
    });
    liveRenderHTML = blockLines.filter((l) => l !== '').join('\n');
  } else if (originalLineCount === 1 && !hasTextColumn) {
    const cleanStandalone = processedLines
      .join(' ')
      .replace(/^&/, '')
      .replace(/&=/g, '=')
      .replace(/&\\cong/g, '\\cong')
      .replace(/&\\sim/g, '\\sim')
      .replace(/&\\neq/g, '\\neq')
      .replace(/&\\parallel/g, '\\parallel')
      .replace(/&\\perp/g, '\\perp')
      .replace(/&</g, '<')
      .replace(/&>/g, '>')
      .replace(/&\\leq/g, '\\leq')
      .replace(/&\\geq/g, '\\geq');
    liveRenderHTML = `\\[ ${cleanStandalone} \\]`;
  } else {
    liveRenderHTML = `\\[ \\begin{aligned} ${processedLines.join(' ')} \\end{aligned} \\]`.replace(
      '\\[ \\begin{aligned}  ',
      '\\[ \\begin{aligned} '
    ).replace(' \\ ]', ' \\]');
  }

  if (liveRenderHTML) {
    liveRenderHTML = liveRenderHTML.split('#').join('{,}');
    liveRenderHTML = liveRenderHTML.replace(/\}\s+(\d)/g, '}\\ $1').replace(/(\d)\s+\\text\{/g, '$1\\ \\text{');
  }

  return liveRenderHTML;
}
