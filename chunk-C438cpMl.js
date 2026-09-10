import{K as Z,zt as tt}from"./main-N5N7O6FK.js";var w=`questify_gemini_api_key`;var b=[`gemini-3.7-flash`,`gemini-3.6-flash`];function A(n){return`https://generativelanguage.googleapis.com/v1beta/models/${n}:generateContent`}var x=`questify_groq_api_key`;var T=[`llama-3.3-70b-versatile`,`llama-3.1-8b-instant`];var C=`https://api.groq.com/openai/v1/chat/completions`;var k=`Respond with ONLY a single JSON object (no markdown, no code fences, no commentary) of exactly this shape:
{"questions": [{"type": "MCQ" | "CQ", "question": string, "marks": number, "options": string[] (MCQ only), "correctAnswer": number (MCQ only, zero-based, omit if multiSelect or unknown), "multiSelect": boolean (optional), "correctAnswers": number[] (MCQ only, zero-based, only if multiSelect), "explanation": string (optional), "source": string (optional), "subjectHint": string (optional)}]}`;var h={type:`OBJECT`,properties:{questions:{type:`ARRAY`,items:{type:`OBJECT`,properties:{type:{type:`STRING`,enum:[`MCQ`,`CQ`]},question:{type:`STRING`},marks:{type:`NUMBER`},options:{type:`ARRAY`,items:{type:`STRING`}},correctAnswer:{type:`INTEGER`},multiSelect:{type:`BOOLEAN`},correctAnswers:{type:`ARRAY`,items:{type:`INTEGER`}},explanation:{type:`STRING`},source:{type:`STRING`},subjectHint:{type:`STRING`}},required:[`type`,`question`,`marks`]}}},required:[`questions`]};var Q=`You are given an exam question paper as an image or PDF. Extract every question into structured data.

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
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied.`;var G=`You are given pasted text containing one or more already-complete exam questions (with options and/or answers/explanations already written out \u2014 this is not raw notes to generate new questions from, it's existing questions to extract as structured data).

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
"""`;function S(n,e){return`You are given source text written by a teacher \u2014 it may be in English, Bengali, or "Banglish" (Bengali written using English letters), and may be informal or unstructured notes rather than a full question paper.

Based on this text, write ${n} exam question(s) that test understanding of the material in it.

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
"""`}function v(n){let e=(n.options??[]).map((r,i)=>`${i}. ${r}`).join(`
`),t=n.correctAnswers??(n.correctAnswer!==void 0?[n.correctAnswer]:[]),o=n.type===`MCQ`&&t.length>0?`Correct option${t.length>1?`s`:``}: ${t.map(r=>`${r}. ${n.options?.[r]??``}`).join(`, `)}`:``;return`You are helping a teacher write a short, direct solution for an exam question, to show students after they submit an answer.

Question (${n.type}): ${n.question}
${e?`Options:
${e}
`:``}${o?o+`
`:``}${n.currentExplanation?`Current explanation (rewrite this to be shorter and more direct):
${n.currentExplanation}
`:``}
Write a short, direct explanation of the solution:
- Get straight to the point \u2014 state the answer/reasoning plainly. No long paragraphs, no padding, no restating the question.
- For MCQ, give the key reason the correct option is right in 1-3 short lines. Only mention wrong options if it adds real value, in one short line each.
- For CQ, give a concise but complete model answer \u2014 direct, not padded with filler.
- Organize with short plain numbered lines like "1. ..." if there's more than one point \u2014 never markdown syntax (no "**bold**", "#" headings, "---" rules, or bullet/asterisk lists). This is shown to students as-is with no formatting applied.
- Write the main explanation in the same language as the question (English or Bengali).
- If the question and explanation are in English, add one final short line starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point, so Bangla-medium students understand it too. Skip this line if the question is already in Bengali.
- Return only the explanation text itself \u2014 no preamble like "Here is the explanation:".`}var q=class n{getApiKey(){return localStorage.getItem(w)??``}setApiKey(e){localStorage.setItem(w,e.trim())}hasApiKey(){return this.getApiKey().length>0}getGroqApiKey(){return localStorage.getItem(x)??``}setGroqApiKey(e){localStorage.setItem(x,e.trim())}hasGroqApiKey(){return this.getGroqApiKey().length>0}async extractQuestions(e){let t=await M(e),o={inline_data:{mime_type:e.type||`application/pdf`,data:t}};return d(await this.fetchGeminiText([o,{text:Q}],h))}async extractFromText(e){let t=G.replace(`{{TEXT}}`,e);return d(await this.fetchAiText(t,h))}async generateFromText(e,t,o){let r=S(t,o).replace(`{{TEXT}}`,e);return d(await this.fetchAiText(r,h))}async explainSolution(e){let t=v(e);return(await this.fetchAiText(t)).trim()}async fetchAiText(e,t){let o=this.hasApiKey(),r=this.hasGroqApiKey();if(!o&&!r)throw new Error(`Add a Gemini or Groq API key first.`);let i;if(o)try{return await this.fetchGeminiText([{text:e}],t)}catch(l){if(i=l,!r)throw i}try{return await this.fetchGroqText(e,!!t)}catch(l){let s=l;throw i?new Error(`Gemini failed: ${i.message}

Groq fallback also failed: ${s.message}`):s}}async fetchGroqText(e,t){let o=this.getGroqApiKey();if(!o)throw new Error(`Add your Groq API key first.`);let r=t?`${e}

${k}`:e,i;for(let l of T){let s=await fetch(C,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${o}`},body:JSON.stringify(Z({model:l,messages:[{role:`user`,content:r}],max_tokens:8e3},t?{response_format:{type:`json_object`}}:{}))});if(s.ok){let u=(await s.json()).choices?.[0]?.message?.content;if(!u)throw new Error(`Groq returned an empty result — try again.`);return u}let a=await s.text().catch(()=>``);if(i=new Error(`Groq request failed (${s.status}): ${a.slice(0,300)||s.statusText}`),s.status===404)continue;if(!(s.status===429||s.status===503))throw i}throw i}async fetchGeminiText(e,t){let o=this.getApiKey();if(!o)throw new Error(`Add your Gemini API key first.`);let r=3,i;for(let l of b)for(let s=1;s<=r;s++){let a=await fetch(A(l),{method:`POST`,headers:{"Content-Type":`application/json`,"x-goog-api-key":o},body:JSON.stringify({contents:[{parts:e}],generationConfig:Z({maxOutputTokens:65536},t?{responseMimeType:`application/json`,responseSchema:t}:{})})});if(a.ok){let g=(await a.json()).candidates?.[0],y=g?.content?.parts?.[0]?.text;if(!y){let c=g?.finishReason;throw new Error(c===`MAX_TOKENS`?`This paper is too large to extract in one go — Gemini ran out of output space. Split it into smaller batches (e.g. 30-50 questions per upload/paste) and try each separately.`:c&&c!==`STOP`?`Gemini stopped without a result (${c}) \u2014 try again or use different input.`:`Gemini returned an empty result — try again or use different input.`)}return y}let m=await a.text().catch(()=>``);if(i=new Error(`Gemini request failed (${a.status}): ${m.slice(0,300)||a.statusText}`),a.status===404)break;if(!(a.status===429||a.status===503))throw i;s<r&&await I(Math.min(1500*2**(s-1),8e3))}throw i&&/\b(429|503)\b/.test(i.message)?new Error(`${i.message}

Gemini is overloaded/rate-limited on Google's side right now \u2014 this already retried automatically across ${b.length} models. It usually clears within a minute or two; wait a bit and try again.`):i}static ɵfac=function(t){return new(t||n)};static ɵprov=tt({token:n,factory:n.ɵfac,providedIn:`root`})};function d(n){let e;try{e=JSON.parse(n)}catch{throw new Error(`Could not parse the generated questions — try again. If this is a large paper (many dozens of questions), try splitting it into smaller batches instead of one big upload.`)}return e.questions??[]}function I(n){return new Promise(e=>setTimeout(e,n))}function M(n){return new Promise((e,t)=>{let o=new FileReader;o.onload=()=>{let r=o.result;e(r.split(`,`)[1]??``)},o.onerror=()=>t(o.error),o.readAsDataURL(n)})}export{q as t};