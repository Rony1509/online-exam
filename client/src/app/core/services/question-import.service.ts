import { Injectable } from '@angular/core';

const API_KEY_STORAGE_KEY = 'questify_gemini_api_key';
const GEMINI_MODEL = 'gemini-3.7-flash';
const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export interface ExtractedQuestion {
  type: 'MCQ' | 'CQ';
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: number;
  multiSelect?: boolean;
  correctAnswers?: number[];
  explanation?: string;
}

interface ExtractedPaper {
  questions: ExtractedQuestion[];
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['MCQ', 'CQ'] },
          question: { type: 'string' },
          marks: { type: 'number' },
          options: { type: 'array', items: { type: 'string' } },
          correctAnswer: { type: 'integer' },
          multiSelect: { type: 'boolean' },
          correctAnswers: { type: 'array', items: { type: 'integer' } },
          explanation: { type: 'string' },
        },
        required: ['type', 'question', 'marks'],
      },
    },
  },
  required: ['questions'],
};

const EXTRACTION_PROMPT = `You are given an exam question paper as an image or PDF. Extract every question into structured data.

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/creative/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order). If the paper indicates more than one correct option for a question (e.g. "select all that apply", or an answer key marking multiple choices), set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if the correct answer cannot be determined.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" is the point value for the question. If not stated, use your best estimate from context (e.g. equal division of total marks), defaulting to 1.
- "explanation" is optional — include it only if the paper provides one.
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper — do not skip or summarize any.`;

export type GenerateQuestionType = 'AUTO' | 'MCQ' | 'CQ';

function generatePrompt(count: number, type: GenerateQuestionType): string {
  const typeInstruction =
    type === 'AUTO'
      ? 'Choose whichever of MCQ or CQ best fits the content for each question.'
      : `Every question must be type "${type}".`;

  return `You are given source text written by a teacher — it may be in English, Bengali, or "Banglish" (Bengali written using English letters), and may be informal or unstructured notes rather than a full question paper.

Based on this text, write ${count} exam question(s) that test understanding of the material in it.

Rules:
- "type" is "MCQ" for multiple-choice, or "CQ" for a written/short-answer question. ${typeInstruction}
- For MCQ: include exactly 4 "options" (plausible, non-trivial distractors). Only if the question genuinely has more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices — otherwise set "correctAnswer" to the single correct zero-based index (this is the normal case).
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- Always include "explanation" — a complete, clear solution/model answer for the question, written out in full (this is the answer key, not just a hint). For CQ this should be the full model answer; for MCQ it should explain why the correct option is right.
- "marks" — use a reasonable default (1 for MCQ, 5-10 for CQ) unless the text suggests otherwise.
- Write the question and explanation in clear, properly-written language matching the source (English or Bengali) — if the source is Banglish, convert it to proper written form rather than keeping the transliteration.
- Base every question strictly on facts in the given text; do not invent information the text doesn't support.
- Do not just restate the source text as a fill-in-the-blank — ask something that actually tests understanding of it.

Source text:
"""
{{TEXT}}
"""`;
}

@Injectable({ providedIn: 'root' })
export class QuestionImportService {
  getApiKey(): string {
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  }

  setApiKey(key: string): void {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  }

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  async extractQuestions(file: File): Promise<ExtractedQuestion[]> {
    const base64 = await fileToBase64(file);
    const fileInput =
      file.type === 'application/pdf'
        ? { type: 'document', data: base64, mime_type: 'application/pdf' }
        : { type: 'image', data: base64, mime_type: file.type };

    return this.runInteraction([fileInput, { type: 'text', text: EXTRACTION_PROMPT }]);
  }

  async generateFromText(
    text: string,
    count: number,
    type: GenerateQuestionType,
  ): Promise<ExtractedQuestion[]> {
    const prompt = generatePrompt(count, type).replace('{{TEXT}}', text);
    return this.runInteraction([{ type: 'text', text: prompt }]);
  }

  private async runInteraction(input: unknown[]): Promise<ExtractedQuestion[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Add your Gemini API key first.');
    }

    const response = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Gemini request failed (${response.status}): ${body.slice(0, 300) || response.statusText}`,
      );
    }

    const data = await response.json();
    if (data.status === 'failed' || !data.output_text) {
      throw new Error('Could not generate questions — try again or use different input.');
    }

    let parsed: ExtractedPaper;
    try {
      parsed = JSON.parse(data.output_text);
    } catch {
      throw new Error('Could not parse the generated questions — try again.');
    }

    return parsed.questions ?? [];
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
