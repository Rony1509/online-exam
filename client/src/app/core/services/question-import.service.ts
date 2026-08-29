import { Injectable } from '@angular/core';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const API_KEY_STORAGE_KEY = 'questify_anthropic_api_key';

const ExtractedQuestionSchema = z.object({
  type: z.enum(['MCQ', 'CQ']),
  question: z.string(),
  marks: z.number(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.number().optional(),
  explanation: z.string().optional(),
});

const ExtractedPaperSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
});

export type ExtractedQuestion = z.infer<typeof ExtractedQuestionSchema>;

const EXTRACTION_PROMPT = `You are given an exam question paper as an image or PDF. Extract every question into structured data.

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/creative/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order) and "correctAnswer" as the zero-based index into "options" of the correct choice, if the correct answer is indicated anywhere on the paper (e.g. an answer key). Omit "correctAnswer" if it cannot be determined.
- For CQ: omit "options" and "correctAnswer".
- "marks" is the point value for the question. If not stated, use your best estimate from context (e.g. equal division of total marks), defaulting to 1.
- "explanation" is optional — include it only if the paper provides one.
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper — do not skip or summarize any.`;

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
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Add your Anthropic API key first.');
    }

    const base64 = await fileToBase64(file);
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

    const contentBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam =
      file.type === 'application/pdf'
        ? {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
              data: base64,
            },
          };

    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: EXTRACTION_PROMPT }],
        },
      ],
      output_config: {
        format: zodOutputFormat(ExtractedPaperSchema),
      },
    });

    if (!response.parsed_output) {
      throw new Error('Could not parse the extracted questions — try again or use a clearer file.');
    }

    return response.parsed_output.questions;
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
