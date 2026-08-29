import{J as Z,zt as tt}from"./main-MCIH6H3E.js";var d=`questify_gemini_api_key`;var x=[`gemini-3.7-flash`,`gemini-2.5-flash`];function b(e){return`https://generativelanguage.googleapis.com/v1beta/models/${e}:generateContent`}var m={type:`OBJECT`,properties:{questions:{type:`ARRAY`,items:{type:`OBJECT`,properties:{type:{type:`STRING`,enum:[`MCQ`,`CQ`]},question:{type:`STRING`},marks:{type:`NUMBER`},options:{type:`ARRAY`,items:{type:`STRING`}},correctAnswer:{type:`INTEGER`},multiSelect:{type:`BOOLEAN`},correctAnswers:{type:`ARRAY`,items:{type:`INTEGER`}},explanation:{type:`STRING`}},required:[`type`,`question`,`marks`]}}},required:[`questions`]};var E=`You are given an exam question paper as an image or PDF. Extract every question into structured data.

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/creative/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order). If the paper indicates more than one correct option for a question (e.g. "select all that apply", or an answer key marking multiple choices), set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if the correct answer cannot be determined.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" is the point value for the question. If not stated, use your best estimate from context (e.g. equal division of total marks), defaulting to 1.
- "explanation" is optional \u2014 include it only if the paper provides one.
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper \u2014 do not skip or summarize any.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied.`;function q(e,t){return`You are given source text written by a teacher \u2014 it may be in English, Bengali, or "Banglish" (Bengali written using English letters), and may be informal or unstructured notes rather than a full question paper.

Based on this text, write ${e} exam question(s) that test understanding of the material in it.

Rules:
- "type" is "MCQ" for multiple-choice, or "CQ" for a written/short-answer question. ${t===`AUTO`?`Choose whichever of MCQ or CQ best fits the content for each question.`:`Every question must be type "${t}".`}
- For MCQ: include exactly 4 "options" (plausible, non-trivial distractors). Only if the question genuinely has more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices \u2014 otherwise set "correctAnswer" to the single correct zero-based index (this is the normal case).
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- Always include "explanation" \u2014 a complete, clear solution/model answer for the question, written out in full (this is the answer key, not just a hint). For CQ this should be the full model answer; for MCQ it should explain why the correct option is right.
- "marks" \u2014 use a reasonable default (1 for MCQ, 5-10 for CQ) unless the text suggests otherwise.
- Write the question and explanation in clear, properly-written language matching the source (English or Bengali) \u2014 if the source is Banglish, convert it to proper written form rather than keeping the transliteration.
- Base every question strictly on facts in the given text; do not invent information the text doesn't support.
- Do not just restate the source text as a fill-in-the-blank \u2014 ask something that actually tests understanding of it.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied; organize longer explanations with short paragraphs or plain numbered lines like "1. ..." instead.

Source text:
"""
{{TEXT}}
"""`}function A(e){let t=(e.options??[]).map((o,i)=>`${i}. ${o}`).join(`
`),n=e.correctAnswers??(e.correctAnswer!==void 0?[e.correctAnswer]:[]),r=e.type===`MCQ`&&n.length>0?`Correct option${n.length>1?`s`:``}: ${n.map(o=>`${o}. ${e.options?.[o]??``}`).join(`, `)}`:``;return`You are helping a teacher write a clear, complete solution for an exam question, to show students after they submit an answer.

Question (${e.type}): ${e.question}
${t?`Options:
${t}
`:``}${r?r+`
`:``}${e.currentExplanation?`Current explanation (expand and improve on this \u2014 don't just repeat it):
${e.currentExplanation}
`:``}
Write a complete, well-organized explanation of the solution:
- For MCQ, explain step-by-step why the correct option is right, and briefly why the other options are wrong.
- For CQ, write a thorough model answer covering every part of the question.
- Match the language of the question (English or Bengali).
- Plain text only \u2014 this is shown to students as-is, with no formatting applied. Do NOT use Markdown: no "**bold**", no "#" headings, no "---" rules, no bullet/asterisk lists. Organize it with short plain paragraphs and, where useful, plain numbered lines like "1. ..." \u2014 never markdown syntax.
- Return only the explanation text itself \u2014 no preamble like "Here is the explanation:" and no repeating the question.`}var g=class e{getApiKey(){return localStorage.getItem(d)??``}setApiKey(t){localStorage.setItem(d,t.trim())}hasApiKey(){return this.getApiKey().length>0}async extractQuestions(t){let n=await T(t),r={inline_data:{mime_type:t.type||`application/pdf`,data:n}};return y(await this.fetchGeminiText([r,{text:E}],m))}async generateFromText(t,n,r){let o=q(n,r).replace(`{{TEXT}}`,t);return y(await this.fetchGeminiText([{text:o}],m))}async explainSolution(t){let n=A(t);return(await this.fetchGeminiText([{text:n}])).trim()}async fetchGeminiText(t,n){let r=this.getApiKey();if(!r)throw new Error(`Add your Gemini API key first.`);let o=2,i;for(let f of x)for(let a=1;a<=o;a++){let s=await fetch(b(f),{method:`POST`,headers:{"Content-Type":`application/json`,"x-goog-api-key":r},body:JSON.stringify(Z({contents:[{parts:t}]},n?{generationConfig:{responseMimeType:`application/json`,responseSchema:n}}:{}))});if(s.ok){let c=await s.json(),u=c.candidates?.[0]?.content?.parts?.[0]?.text;if(!u){let l=c.candidates?.[0]?.finishReason;throw new Error(l&&l!==`STOP`?`Gemini stopped without a result (${l}) \u2014 try again or use different input.`:`Gemini returned an empty result — try again or use different input.`)}return u}let w=await s.text().catch(()=>``);if(i=new Error(`Gemini request failed (${s.status}): ${w.slice(0,300)||s.statusText}`),!(s.status===429||s.status===503))throw i;a<o&&await C(a*1e3)}throw i}static ɵfac=function(n){return new(n||e)};static ɵprov=tt({token:e,factory:e.ɵfac,providedIn:`root`})};function y(e){let t;try{t=JSON.parse(e)}catch{throw new Error(`Could not parse the generated questions — try again.`)}return t.questions??[]}function C(e){return new Promise(t=>setTimeout(t,e))}function T(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>{let o=r.result;t(o.split(`,`)[1]??``)},r.onerror=()=>n(r.error),r.readAsDataURL(e)})}export{g as t};