import{J as Z,zt as tt}from"./main-TCTRJV56.js";var m=`questify_gemini_api_key`;var x=`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent`;var d={type:`OBJECT`,properties:{questions:{type:`ARRAY`,items:{type:`OBJECT`,properties:{type:{type:`STRING`,enum:[`MCQ`,`CQ`]},question:{type:`STRING`},marks:{type:`NUMBER`},options:{type:`ARRAY`,items:{type:`STRING`}},correctAnswer:{type:`INTEGER`},multiSelect:{type:`BOOLEAN`},correctAnswers:{type:`ARRAY`,items:{type:`INTEGER`}},explanation:{type:`STRING`}},required:[`type`,`question`,`marks`]}}},required:[`questions`]};var E=`You are given an exam question paper as an image or PDF. Extract every question into structured data.

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/creative/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order). If the paper indicates more than one correct option for a question (e.g. "select all that apply", or an answer key marking multiple choices), set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if the correct answer cannot be determined.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" is the point value for the question. If not stated, use your best estimate from context (e.g. equal division of total marks), defaulting to 1.
- "explanation" is optional \u2014 include it only if the paper provides one.
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper \u2014 do not skip or summarize any.`;function b(t,e){return`You are given source text written by a teacher \u2014 it may be in English, Bengali, or "Banglish" (Bengali written using English letters), and may be informal or unstructured notes rather than a full question paper.

Based on this text, write ${t} exam question(s) that test understanding of the material in it.

Rules:
- "type" is "MCQ" for multiple-choice, or "CQ" for a written/short-answer question. ${e===`AUTO`?`Choose whichever of MCQ or CQ best fits the content for each question.`:`Every question must be type "${e}".`}
- For MCQ: include exactly 4 "options" (plausible, non-trivial distractors). Only if the question genuinely has more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices \u2014 otherwise set "correctAnswer" to the single correct zero-based index (this is the normal case).
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- Always include "explanation" \u2014 a complete, clear solution/model answer for the question, written out in full (this is the answer key, not just a hint). For CQ this should be the full model answer; for MCQ it should explain why the correct option is right.
- "marks" \u2014 use a reasonable default (1 for MCQ, 5-10 for CQ) unless the text suggests otherwise.
- Write the question and explanation in clear, properly-written language matching the source (English or Bengali) \u2014 if the source is Banglish, convert it to proper written form rather than keeping the transliteration.
- Base every question strictly on facts in the given text; do not invent information the text doesn't support.
- Do not just restate the source text as a fill-in-the-blank \u2014 ask something that actually tests understanding of it.

Source text:
"""
{{TEXT}}
"""`}function A(t){let e=(t.options??[]).map((o,s)=>`${s}. ${o}`).join(`
`),n=t.correctAnswers??(t.correctAnswer!==void 0?[t.correctAnswer]:[]),r=t.type===`MCQ`&&n.length>0?`Correct option${n.length>1?`s`:``}: ${n.map(o=>`${o}. ${t.options?.[o]??``}`).join(`, `)}`:``;return`You are helping a teacher write a clear, complete solution for an exam question, to show students after they submit an answer.

Question (${t.type}): ${t.question}
${e?`Options:
${e}
`:``}${r?r+`
`:``}${t.currentExplanation?`Current explanation (expand and improve on this \u2014 don't just repeat it):
${t.currentExplanation}
`:``}
Write a complete, well-structured explanation of the solution:
- For MCQ, explain step-by-step why the correct option is right, and briefly why the other options are wrong.
- For CQ, write a thorough model answer covering every part of the question.
- Match the language of the question (English or Bengali).
- Return only the explanation text itself \u2014 no preamble like "Here is the explanation:" and no repeating the question.`}var y=class t{getApiKey(){return localStorage.getItem(m)??``}setApiKey(e){localStorage.setItem(m,e.trim())}hasApiKey(){return this.getApiKey().length>0}async extractQuestions(e){let n=await C(e),r={inline_data:{mime_type:e.type||`application/pdf`,data:n}};return g(await this.fetchGeminiText([r,{text:E}],d))}async generateFromText(e,n,r){let o=b(n,r).replace(`{{TEXT}}`,e);return g(await this.fetchGeminiText([{text:o}],d))}async explainSolution(e){let n=A(e);return(await this.fetchGeminiText([{text:n}])).trim()}async fetchGeminiText(e,n){let r=this.getApiKey();if(!r)throw new Error(`Add your Gemini API key first.`);let o=4,s;for(let a=1;a<=o;a++){let i=await fetch(x,{method:`POST`,headers:{"Content-Type":`application/json`,"x-goog-api-key":r},body:JSON.stringify(Z({contents:[{parts:e}]},n?{generationConfig:{responseMimeType:`application/json`,responseSchema:n}}:{}))});if(i.ok){let u=await i.json(),l=u.candidates?.[0]?.content?.parts?.[0]?.text;if(!l){let c=u.candidates?.[0]?.finishReason;throw new Error(c&&c!==`STOP`?`Gemini stopped without a result (${c}) \u2014 try again or use different input.`:`Gemini returned an empty result — try again or use different input.`)}return l}let f=await i.text().catch(()=>``);if(s=new Error(`Gemini request failed (${i.status}): ${f.slice(0,300)||i.statusText}`),!(i.status===429||i.status===503)||a===o)break;await q(a*1e3)}throw s}static ɵfac=function(n){return new(n||t)};static ɵprov=tt({token:t,factory:t.ɵfac,providedIn:`root`})};function g(t){let e;try{e=JSON.parse(t)}catch{throw new Error(`Could not parse the generated questions — try again.`)}return e.questions??[]}function q(t){return new Promise(e=>setTimeout(e,t))}function C(t){return new Promise((e,n)=>{let r=new FileReader;r.onload=()=>{let o=r.result;e(o.split(`,`)[1]??``)},r.onerror=()=>n(r.error),r.readAsDataURL(t)})}export{y as t};