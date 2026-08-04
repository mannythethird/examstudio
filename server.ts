import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI SDK
  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Route: AI Question Generator
  app.post('/api/ai/generate-questions', async (req, res) => {
    try {
      const { topic, gradeLevel, count = 3, difficulty = 'medium', questionType = 'radio' } = req.body;

      if (!topic || !topic.trim()) {
        return res.status(400).json({ error: 'Topic is required for question generation.' });
      }

      const ai = getAi();
      const prompt = `Generate ${count} high-quality ${difficulty} difficulty ${questionType === 'radio' ? 'multiple-choice' : questionType} assessment questions for ${gradeLevel || 'general education'} students on the topic: "${topic}".
Each question must have 1 correct answer and 3 realistic, plausible distractor choices. Provide a clear pedagogical explanation for the correct answer.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of generated assessment questions',
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING, description: 'The question text or prompt (can include HTML tags if needed)' },
                points: { type: Type.INTEGER, description: 'Suggested point value (1 to 5)' },
                explanation: { type: Type.STRING, description: 'Explanation for why the correct answer is right' },
                choices: {
                  type: Type.ARRAY,
                  description: 'List of answer options',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: 'The option choice text' },
                      isCorrect: { type: Type.BOOLEAN, description: 'True if this option is the correct answer' },
                    },
                    required: ['text', 'isCorrect'],
                  },
                },
              },
              required: ['prompt', 'choices'],
            },
          },
        },
      });

      const jsonStr = response.text ? response.text.trim() : '[]';
      const parsedData = JSON.parse(jsonStr);

      return res.json({ success: true, questions: parsedData });
    } catch (error: any) {
      console.error('Error generating questions:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate questions.' });
    }
  });

  // API Route: Enhance Question / Distractors / Rewriting
  app.post('/api/ai/enhance-question', async (req, res) => {
    try {
      const { action, questionPrompt, existingChoices, existingExplanation } = req.body;

      if (!questionPrompt) {
        return res.status(400).json({ error: 'Question prompt is required.' });
      }

      const ai = getAi();
      let promptText = '';

      if (action === 'distractors') {
        promptText = `For the following assessment question: "${questionPrompt}"
Existing choices: ${JSON.stringify(existingChoices)}
Provide 3 improved, highly plausible distractors (incorrect choices) that test common student misconceptions.`;
      } else if (action === 'rewrite') {
        promptText = `Rewrite and rephrase the following assessment question to improve clarity and alignment with modern assessment standards:
Question: "${questionPrompt}"
Choices: ${JSON.stringify(existingChoices)}
Return a clearer question prompt, revised choices, and an explanation.`;
      } else {
        promptText = `Generate a clear, detailed explanation for why the correct answer is right for this question:
Question: "${questionPrompt}"
Choices: ${JSON.stringify(existingChoices)}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              revisedPrompt: { type: Type.STRING, description: 'Clarified or original question prompt' },
              explanation: { type: Type.STRING, description: 'Educational explanation' },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                  },
                  required: ['text', 'isCorrect'],
                },
              },
            },
            required: ['choices', 'explanation'],
          },
        },
      });

      const jsonStr = response.text ? response.text.trim() : '{}';
      const data = JSON.parse(jsonStr);

      return res.json({ success: true, ...data });
    } catch (error: any) {
      console.error('Error enhancing question:', error);
      return res.status(500).json({ error: error.message || 'Failed to enhance question.' });
    }
  });

  // API Route: Quality Audit for Selected Assessment
  app.post('/api/ai/audit-assessment', async (req, res) => {
    try {
      const { questions } = req.body;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'No questions provided for auditing.' });
      }

      const ai = getAi();
      const promptText = `Analyze the following assessment item set for technical validity, option balance, clarity, and grammatical correctness:
${JSON.stringify(questions.map(q => ({ id: q.id, prompt: q.prompt, choices: q.choices, points: q.points })))}

Evaluate for:
1. Questions missing correct answers or having multiple marked correct answers.
2. Clues in the stem or obvious non-distractors.
3. Repetitive phrasing or option length biases.
4. Overall test readiness score (0-100).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: 'Overall test quality score out of 100' },
              summary: { type: Type.STRING, description: 'High level audit summary' },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: 'warning, error, or suggestion' },
                    questionId: { type: Type.INTEGER, description: 'Question ID if applicable' },
                    message: { type: Type.STRING, description: 'Description of the finding' },
                  },
                  required: ['type', 'message'],
                },
              },
            },
            required: ['score', 'summary', 'issues'],
          },
        },
      });

      const data = JSON.parse(response.text ? response.text.trim() : '{}');
      return res.json({ success: true, audit: data });
    } catch (error: any) {
      console.error('Error auditing assessment:', error);
      return res.status(500).json({ error: error.message || 'Failed to audit assessment.' });
    }
  });

  // Serve Vite in development / static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
