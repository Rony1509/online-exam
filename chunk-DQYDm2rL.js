import{Rt as rt,X as Z}from"./main-LRBCP4H3.js";var m=`questify_gemini_api_key`;var x=[`gemini-3.7-flash`,`gemini-3.6-flash`];function b(t){return`https://generativelanguage.googleapis.com/v1beta/models/${t}:generateContent`}var c={type:`OBJECT`,properties:{questions:{type:`ARRAY`,items:{type:`OBJECT`,properties:{type:{type:`STRING`,enum:[`MCQ`,`CQ`]},question:{type:`STRING`},marks:{type:`NUMBER`},options:{type:`ARRAY`,items:{type:`STRING`}},correctAnswer:{type:`INTEGER`},multiSelect:{type:`BOOLEAN`},correctAnswers:{type:`ARRAY`,items:{type:`INTEGER`}},explanation:{type:`STRING`},source:{type:`STRING`},subjectHint:{type:`STRING`}},required:[`type`,`question`,`marks`]}}},required:[`questions`]};var E=`You are given an exam question paper as an image or PDF. Extract every question into structured data.

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/creative/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order). If the paper indicates more than one correct option for a question (e.g. "select all that apply", or an answer key marking multiple choices), set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if the correct answer cannot be determined.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" is the point value for the question. If not stated, use your best estimate from context (e.g. equal division of total marks), defaulting to 1.
- "explanation" is optional \u2014 include it only if the paper provides one.
- "source" is optional \u2014 include it only if the paper states which real exam/year this question is from (e.g. "Primary Assistant Teacher: 19").
- "subjectHint" is optional \u2014 this paper may be a combined multi-subject exam (e.g. a BCS-style paper with sections like Bangla, English, Math, General Science, Bangladesh Affairs, International Affairs, Computer). If the question is grouped under or labeled with a subject/section heading, copy that label into "subjectHint" exactly. If the whole paper is clearly one single subject, or no subject grouping is present, omit "subjectHint" entirely.
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper \u2014 do not skip or summarize any.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied.`;var q=`You are given pasted text containing one or more already-complete exam questions (with options and/or answers/explanations already written out \u2014 this is not raw notes to generate new questions from, it's existing questions to extract as structured data).

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order, without any leading letters/numbers like "a." or "1)"). If the text indicates more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if no answer is given.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" defaults to 1 unless the text states otherwise.
- "explanation" \u2014 copy the given explanation/answer rationale if present, cleaned up into plain text; leave it out if none is given.
- "source" \u2014 if the text names which real exam/year this question is from (e.g. "Primary Assistant Teacher: 19", an exam board and year), copy that as "source"; omit if not stated.
- "subjectHint" is optional \u2014 this text may be a combined multi-subject question set (e.g. a BCS-style set covering Bangla, English, Math, General Science, Bangladesh Affairs, International Affairs, Computer, etc.). If a question is grouped under or labeled with a subject/section heading, copy that label into "subjectHint" exactly. If the whole set is clearly one single subject, or no subject grouping is present, omit "subjectHint" entirely.
- Preserve each question's original wording as closely as possible.
- Extract every question in the pasted text \u2014 do not skip, merge, or summarize any.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists).

Pasted text:
"""
{{TEXT}}
"""`;function T(t,e){return`You are given source text written by a teacher \u2014 it may be in English, Bengali, or "Banglish" (Bengali written using English letters), and may be informal or unstructured notes rather than a full question paper.

Based on this text, write ${t} exam question(s) that test understanding of the material in it.

Rules:
- "type" is "MCQ" for multiple-choice, or "CQ" for a written/short-answer question. ${e===`AUTO`?`Choose whichever of MCQ or CQ best fits the content for each question.`:`Every question must be type "${e}".`}
- For MCQ: include exactly 4 "options" (plausible, non-trivial distractors). Only if the question genuinely has more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices \u2014 otherwise set "correctAnswer" to the single correct zero-based index (this is the normal case).
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- Always include "explanation" \u2014 the answer key for the question, direct and to the point (this is shown to students, not the teacher). For CQ, a concise but complete model answer. For MCQ, the key reason the correct option is right, in a short line or two \u2014 not a long write-up.
- "marks" \u2014 use a reasonable default (1 for MCQ, 5-10 for CQ) unless the text suggests otherwise.
- Write the question and explanation in clear, properly-written language matching the source (English or Bengali) \u2014 if the source is Banglish, convert it to proper written form rather than keeping the transliteration.
- If the question and explanation end up in English, add one final short line to "explanation" starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point. Skip this line if the question is already in Bengali.
- Base every question strictly on facts in the given text; do not invent information the text doesn't support.
- "subjectHint" is optional \u2014 only include it if the source text itself names or is clearly about one particular school subject (e.g. "Bangla", "English", "Math", "Physics"); omit it if unclear or if the text spans multiple subjects.
- Do not just restate the source text as a fill-in-the-blank \u2014 ask something that actually tests understanding of it.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied; use short plain numbered lines like "1. ..." only if there's more than one point.

Source text:
"""
{{TEXT}}
"""`}function A(t){let e=(t.options??[]).map((o,r)=>`${r}. ${o}`).join(`
`),n=t.correctAnswers??(t.correctAnswer!==void 0?[t.correctAnswer]:[]),i=t.type===`MCQ`&&n.length>0?`Correct option${n.length>1?`s`:``}: ${n.map(o=>`${o}. ${t.options?.[o]??``}`).join(`, `)}`:``;return`You are helping a teacher write a short, direct solution for an exam question, to show students after they submit an answer.

Question (${t.type}): ${t.question}
${e?`Options:
${e}
`:``}${i?i+`
`:``}${t.currentExplanation?`Current explanation (rewrite this to be shorter and more direct):
${t.currentExplanation}
`:``}
Write a short, direct explanation of the solution:
- Get straight to the point \u2014 state the answer/reasoning plainly. No long paragraphs, no padding, no restating the question.
- For MCQ, give the key reason the correct option is right in 1-3 short lines. Only mention wrong options if it adds real value, in one short line each.
- For CQ, give a concise but complete model answer \u2014 direct, not padded with filler.
- Organize with short plain numbered lines like "1. ..." if there's more than one point \u2014 never markdown syntax (no "**bold**", "#" headings, "---" rules, or bullet/asterisk lists). This is shown to students as-is with no formatting applied.
- Write the main explanation in the same language as the question (English or Bengali).
- If the question and explanation are in English, add one final short line starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point, so Bangla-medium students understand it too. Skip this line if the question is already in Bengali.
- Return only the explanation text itself \u2014 no preamble like "Here is the explanation:".`}var y=class t{getApiKey(){return localStorage.getItem(m)??``}setApiKey(e){localStorage.setItem(m,e.trim())}hasApiKey(){return this.getApiKey().length>0}async extractQuestions(e){let n=await k(e),i={inline_data:{mime_type:e.type||`application/pdf`,data:n}};return u(await this.fetchGeminiText([i,{text:E}],c))}async extractFromText(e){let n=q.replace(`{{TEXT}}`,e);return u(await this.fetchGeminiText([{text:n}],c))}async generateFromText(e,n,i){let o=T(n,i).replace(`{{TEXT}}`,e);return u(await this.fetchGeminiText([{text:o}],c))}async explainSolution(e){let n=A(e);return(await this.fetchGeminiText([{text:n}])).trim()}async fetchGeminiText(e,n){let i=this.getApiKey();if(!i)throw new Error(`Add your Gemini API key first.`);let o=2,r;for(let f of x)for(let a=1;a<=o;a++){let s=await fetch(b(f),{method:`POST`,headers:{"Content-Type":`application/json`,"x-goog-api-key":i},body:JSON.stringify(Z({contents:[{parts:e}]},n?{generationConfig:{responseMimeType:`application/json`,responseSchema:n}}:{}))});if(s.ok){let p=await s.json(),h=p.candidates?.[0]?.content?.parts?.[0]?.text;if(!h){let l=p.candidates?.[0]?.finishReason;throw new Error(l&&l!==`STOP`?`Gemini stopped without a result (${l}) \u2014 try again or use different input.`:`Gemini returned an empty result — try again or use different input.`)}return h}let w=await s.text().catch(()=>``);if(r=new Error(`Gemini request failed (${s.status}): ${w.slice(0,300)||s.statusText}`),s.status===404)break;if(!(s.status===429||s.status===503))throw r;a<o&&await C(a*1e3)}throw r}static ɵfac=function(n){return new(n||t)};static ɵprov=rt({token:t,factory:t.ɵfac,providedIn:`root`})};function u(t){let e;try{e=JSON.parse(t)}catch{throw new Error(`Could not parse the generated questions — try again.`)}return e.questions??[]}function C(t){return new Promise(e=>setTimeout(e,t))}function k(t){return new Promise((e,n)=>{let i=new FileReader;i.onload=()=>{let o=i.result;e(o.split(`,`)[1]??``)},i.onerror=()=>n(i.error),i.readAsDataURL(t)})}export{y as t};