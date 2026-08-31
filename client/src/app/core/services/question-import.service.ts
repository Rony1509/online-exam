import { Injectable } from '@angular/core';

const API_KEY_STORAGE_KEY = 'questify_gemini_api_key';
// Tried in order — if the newest model is overloaded (503) or rate-limited (429) after
// its own retries, fall back to the next one rather than fail outright. gemini-2.5-flash is
// deliberately excluded: Google returns 404 for it on newer API keys ("no longer available
// to new users"), so it's not a safe fallback even though the model still exists for others.
const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash'];

function generateContentUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export interface ExtractedQuestion {
  type: 'MCQ' | 'CQ';
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: number;
  multiSelect?: boolean;
  correctAnswers?: number[];
  explanation?: string;
  source?: string;
  /** e.g. "Bangla", "English", "Math", "General Science" — only set when the source text itself groups/labels questions by subject (e.g. a combined BCS-style paper). Used to pre-guess which subject to file each question under; never invented. */
  subjectHint?: string;
}

interface ExtractedPaper {
  questions: ExtractedQuestion[];
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['MCQ', 'CQ'] },
          question: { type: 'STRING' },
          marks: { type: 'NUMBER' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctAnswer: { type: 'INTEGER' },
          multiSelect: { type: 'BOOLEAN' },
          correctAnswers: { type: 'ARRAY', items: { type: 'INTEGER' } },
          explanation: { type: 'STRING' },
          source: { type: 'STRING' },
          subjectHint: { type: 'STRING' },
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
- "source" is optional — include it only if the paper states which real exam/year this question is from (e.g. "Primary Assistant Teacher: 19").
- "subjectHint" is optional — this paper may be a combined multi-subject exam (e.g. a BCS-style paper with sections like Bangla, English, Math, General Science, Bangladesh Affairs, International Affairs, Computer). If the question is grouped under or labeled with a subject/section heading, copy that label into "subjectHint" exactly. If the whole paper is clearly one single subject, or no subject grouping is present, omit "subjectHint" entirely.
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper — do not skip or summarize any.
- "question" and "explanation" must be plain text only — no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied.`;

const EXTRACT_FROM_TEXT_PROMPT = `You are given pasted text containing one or more already-complete exam questions (with options and/or answers/explanations already written out — this is not raw notes to generate new questions from, it's existing questions to extract as structured data).

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order, without any leading letters/numbers like "a." or "1)"). If the text indicates more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if no answer is given.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" defaults to 1 unless the text states otherwise.
- "explanation" — copy the given explanation/answer rationale if present, cleaned up into plain text; leave it out if none is given.
- "source" — if the text names which real exam/year this question is from (e.g. "Primary Assistant Teacher: 19", an exam board and year), copy that as "source"; omit if not stated.
- "subjectHint" is optional — this text may be a combined multi-subject question set (e.g. a BCS-style set covering Bangla, English, Math, General Science, Bangladesh Affairs, International Affairs, Computer, etc.). If a question is grouped under or labeled with a subject/section heading, copy that label into "subjectHint" exactly. If the whole set is clearly one single subject, or no subject grouping is present, omit "subjectHint" entirely.
- Preserve each question's original wording as closely as possible.
- Extract every question in the pasted text — do not skip, merge, or summarize any.
- "question" and "explanation" must be plain text only — no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists).

Pasted text:
"""
{{TEXT}}
"""`;

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
- Always include "explanation" — the answer key for the question, direct and to the point (this is shown to students, not the teacher). For CQ, a concise but complete model answer. For MCQ, the key reason the correct option is right, in a short line or two — not a long write-up.
- "marks" — use a reasonable default (1 for MCQ, 5-10 for CQ) unless the text suggests otherwise.
- Write the question and explanation in clear, properly-written language matching the source (English or Bengali) — if the source is Banglish, convert it to proper written form rather than keeping the transliteration.
- If the question and explanation end up in English, add one final short line to "explanation" starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point. Skip this line if the question is already in Bengali.
- Base every question strictly on facts in the given text; do not invent information the text doesn't support.
- "subjectHint" is optional — only include it if the source text itself names or is clearly about one particular school subject (e.g. "Bangla", "English", "Math", "Physics"); omit it if unclear or if the text spans multiple subjects.
- Do not just restate the source text as a fill-in-the-blank — ask something that actually tests understanding of it.
- "question" and "explanation" must be plain text only — no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied; use short plain numbered lines like "1. ..." only if there's more than one point.

Source text:
"""
{{TEXT}}
"""`;
}

export interface ExplainInput {
  type: 'MCQ' | 'CQ';
  question: string;
  options?: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  currentExplanation?: string;
}

function explainPrompt(input: ExplainInput): string {
  const optionLines = (input.options ?? []).map((o, i) => `${i}. ${o}`).join('\n');
  const correctIndices = input.correctAnswers ?? (input.correctAnswer !== undefined ? [input.correctAnswer] : []);
  const correctLine =
    input.type === 'MCQ' && correctIndices.length > 0
      ? `Correct option${correctIndices.length > 1 ? 's' : ''}: ${correctIndices.map((i) => `${i}. ${input.options?.[i] ?? ''}`).join(', ')}`
      : '';

  return `You are helping a teacher write a short, direct solution for an exam question, to show students after they submit an answer.

Question (${input.type}): ${input.question}
${optionLines ? `Options:\n${optionLines}\n` : ''}${correctLine ? correctLine + '\n' : ''}${
    input.currentExplanation ? `Current explanation (rewrite this to be shorter and more direct):\n${input.currentExplanation}\n` : ''
  }
Write a short, direct explanation of the solution:
- Get straight to the point — state the answer/reasoning plainly. No long paragraphs, no padding, no restating the question.
- For MCQ, give the key reason the correct option is right in 1-3 short lines. Only mention wrong options if it adds real value, in one short line each.
- For CQ, give a concise but complete model answer — direct, not padded with filler.
- Organize with short plain numbered lines like "1. ..." if there's more than one point — never markdown syntax (no "**bold**", "#" headings, "---" rules, or bullet/asterisk lists). This is shown to students as-is with no formatting applied.
- Write the main explanation in the same language as the question (English or Bengali).
- If the question and explanation are in English, add one final short line starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point, so Bangla-medium students understand it too. Skip this line if the question is already in Bengali.
- Return only the explanation text itself — no preamble like "Here is the explanation:".`;
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
    const filePart = { inline_data: { mime_type: file.type || 'application/pdf', data: base64 } };

    const text = await this.fetchGeminiText([filePart, { text: EXTRACTION_PROMPT }], RESPONSE_SCHEMA);
    return parseQuestionsJson(text);
  }

  async extractFromText(text: string): Promise<ExtractedQuestion[]> {
    const prompt = EXTRACT_FROM_TEXT_PROMPT.replace('{{TEXT}}', text);
    const output = await this.fetchGeminiText([{ text: prompt }], RESPONSE_SCHEMA);
    return parseQuestionsJson(output);
  }

  async generateFromText(
    text: string,
    count: number,
    type: GenerateQuestionType,
  ): Promise<ExtractedQuestion[]> {
    const prompt = generatePrompt(count, type).replace('{{TEXT}}', text);
    const output = await this.fetchGeminiText([{ text: prompt }], RESPONSE_SCHEMA);
    return parseQuestionsJson(output);
  }

  async explainSolution(input: ExplainInput): Promise<string> {
    const prompt = explainPrompt(input);
    const text = await this.fetchGeminiText([{ text: prompt }]);
    return text.trim();
  }

  private async fetchGeminiText(parts: unknown[], schema?: object): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Add your Gemini API key first.');
    }

    const attemptsPerModel = 2;
    let lastError: Error | undefined;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
        const response = await fetch(generateContentUrl(model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            ...(schema
              ? { generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }
              : {}),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!outputText) {
            const reason = data.candidates?.[0]?.finishReason;
            throw new Error(
              reason && reason !== 'STOP'
                ? `Gemini stopped without a result (${reason}) — try again or use different input.`
                : 'Gemini returned an empty result — try again or use different input.',
            );
          }
          return outputText;
        }

        const body = await response.text().catch(() => '');
        lastError = new Error(
          `Gemini request failed (${response.status}): ${body.slice(0, 300) || response.statusText}`,
        );

        // 404 means this model isn't available for this account at all — retrying it is
        // pointless, move straight to the next model. 429/503 are worth a short retry first,
        // then fall back to the next model. Anything else (bad key, invalid request) won't
        // fix itself by retrying or switching models.
        if (response.status === 404) break;
        const retryable = response.status === 429 || response.status === 503;
        if (!retryable) throw lastError;
        if (attempt < attemptsPerModel) await sleep(attempt * 1000);
      }
    }

    throw lastError;
  }
}

function parseQuestionsJson(text: string): ExtractedQuestion[] {
  let parsed: ExtractedPaper;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Could not parse the generated questions — try again.');
  }
  return parsed.questions ?? [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
