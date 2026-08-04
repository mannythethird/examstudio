import { AssessmentQuestion, QuestionChoice, QuestionType } from '../types';

/**
 * Normalizes image paths and protocol-relative links in HTML
 */
export function sanitizeHtmlContent(html: string): string {
  if (!html) return '';
  // Replace protocol-relative URLs (src="//...)
  return html.replace(/src="\/\//g, 'src="https://');
}

/**
 * Parses raw flat-file assessment text into structured question objects
 */
export function parseAssessmentText(text: string, sourceId: string = 'src1', sourceTitle: string = 'Source'): AssessmentQuestion[] {
  if (!text || !text.trim()) return [];

  // Split text by question type prefix (mc:radio:, mc:check:, mc:tf:, tf:, essay:)
  const rawBlocks = text.split(/(?=(?:mc:radio:|mc:check:|mc:tf:|tf:|essay:))/gi);
  const questions: AssessmentQuestion[] = [];

  rawBlocks.forEach((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Detect question type
    let qType: QuestionType = 'radio';
    let contentWithoutPrefix = trimmed;

    if (/^mc:radio:/i.test(trimmed)) {
      qType = 'radio';
      contentWithoutPrefix = trimmed.replace(/^mc:radio:/i, '');
    } else if (/^mc:check:/i.test(trimmed)) {
      qType = 'check';
      contentWithoutPrefix = trimmed.replace(/^mc:check:/i, '');
    } else if (/^(?:mc:tf:|tf:)/i.test(trimmed)) {
      qType = 'tf';
      contentWithoutPrefix = trimmed.replace(/^(?:mc:tf:|tf:)/i, '');
    } else if (/^essay:/i.test(trimmed)) {
      qType = 'essay';
      contentWithoutPrefix = trimmed.replace(/^essay:/i, '');
    }

    // Split prompt and metadata/choices by '###'
    const parts = contentWithoutPrefix.split('###');
    if (parts.length < 2) {
      // Fallback for simple/unstructured formats
      return;
    }

    const rawPrompt = sanitizeHtmlContent(parts[0].trim());

    // Extract ID and remainder after ###
    const metaAndChoices = parts[1].split('#^');
    const idMatch = parts[1].match(/^(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : index + 101;

    let group = id;
    let points = 1;
    let explanation = '';
    const choices: QuestionChoice[] = [];
    const tags: string[] = [];

    // Parse metadata lines and choice options
    for (let i = 1; i < metaAndChoices.length; i++) {
      const segment = metaAndChoices[i].trim();
      if (!segment) continue;

      if (segment.startsWith('points:')) {
        const pts = parseInt(segment.replace('points:', ''), 10);
        if (!isNaN(pts)) points = pts;
      } else if (segment.startsWith('group:')) {
        const grp = parseInt(segment.replace('group:', ''), 10);
        if (!isNaN(grp)) group = grp;
      } else if (segment.startsWith('feedback:') || segment.startsWith('explanation:')) {
        explanation = segment.replace(/^(?:feedback|explanation):/, '').trim();
      } else if (segment.startsWith('tag:') || segment.startsWith('tags:')) {
        const tagStr = segment.replace(/^(?:tag|tags):/, '').trim();
        tagStr.split(',').forEach(t => tags.push(t.trim()));
      } else {
        // Line-by-line choice processing if segment contains newlines
        const lines = segment.split('\n');
        lines.forEach((line, choiceIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // Check if metadata line slipped through
          if (trimmedLine.startsWith('points:') || trimmedLine.startsWith('group:') || trimmedLine.startsWith('feedback:')) {
            if (trimmedLine.startsWith('points:')) points = parseInt(trimmedLine.replace('points:', ''), 10) || points;
            if (trimmedLine.startsWith('group:')) group = parseInt(trimmedLine.replace('group:', ''), 10) || group;
            if (trimmedLine.startsWith('feedback:')) explanation = trimmedLine.replace('feedback:', '').trim();
            return;
          }

          let isCorrect = false;
          let choiceText = trimmedLine;

          if (choiceText.startsWith('x-')) {
            isCorrect = true;
            choiceText = choiceText.substring(2).trim();
          } else if (choiceText.startsWith('[x]')) {
            isCorrect = true;
            choiceText = choiceText.substring(3).trim();
          } else if (choiceText.startsWith('*')) {
            isCorrect = true;
            choiceText = choiceText.substring(1).trim();
          }

          choiceText = sanitizeHtmlContent(choiceText);

          if (choiceText) {
            choices.push({
              id: `c_${id}_${choiceIdx}_${Math.random().toString(36).substr(2, 4)}`,
              text: choiceText,
              isCorrect
            });
          }
        });
      }
    }

    // Determine heuristic difficulty
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (choices.length > 4 || rawPrompt.length > 250 || rawPrompt.includes('<img')) {
      difficulty = 'hard';
    } else if (choices.length <= 3 && rawPrompt.length < 100) {
      difficulty = 'easy';
    }

    questions.push({
      id,
      type: qType,
      prompt: rawPrompt,
      choices,
      points,
      group,
      explanation,
      rawText: trimmed,
      tags,
      difficulty,
      sourceId,
      sourceTitle
    });
  });

  return questions;
}

/**
 * Converts structured AssessmentQuestion objects back into standard flat assessment text
 */
export function serializeQuestionsToText(questions: AssessmentQuestion[]): string {
  return questions.map((q, idx) => {
    const seqNum = idx + 1;
    const prefix = `mc:${q.type || 'radio'}:`;
    let output = `${prefix}${q.prompt}\n`;
    output += `###${seqNum}#^\n`;
    output += `group:${seqNum}#^\n`;
    output += `points:${q.points || 1}#^\n`;

    if (q.explanation && q.explanation.trim()) {
      output += `feedback:${q.explanation.trim()}#^\n`;
    }

    if (q.choices && q.choices.length > 0) {
      const choicesStr = q.choices
        .map(c => `${c.isCorrect ? 'x-' : ''}${c.text}`)
        .join('\n');
      output += `${choicesStr}\n`;
    }

    return output;
  }).join('\n');
}

/**
 * Creates a new blank assessment question
 */
export function createBlankQuestion(id: number = 101): AssessmentQuestion {
  return {
    id,
    type: 'radio',
    prompt: 'Enter question text here...',
    choices: [
      { id: `c_${id}_1`, text: 'Option A (Correct answer)', isCorrect: true },
      { id: `c_${id}_2`, text: 'Option B (Distractor)', isCorrect: false },
      { id: `c_${id}_3`, text: 'Option C (Distractor)', isCorrect: false },
      { id: `c_${id}_4`, text: 'Option D (Distractor)', isCorrect: false }
    ],
    points: 1,
    group: id,
    rawText: '',
    difficulty: 'medium'
  };
}
