import{It as rt,Y as Z}from"./main-MWD7NTQ5.js";var x=`questify_gemini_api_key`;var A=[`gemini-3.7-flash`,`gemini-3.6-flash`];function v(i){return`https://generativelanguage.googleapis.com/v1beta/models/${i}:generateContent`}var P={gemini:`Gemini`,groq:`Groq`,cerebras:`Cerebras`};var E=`questify_ai_provider_preference`;var R=[`gemini`,`groq`,`cerebras`];var q=`questify_groq_api_key`;var S=[`llama-3.3-70b-versatile`,`llama-3.1-8b-instant`];var k=`https://api.groq.com/openai/v1/chat/completions`;var C=`questify_cerebras_api_key`;var I=[`gpt-oss-120b`,`qwen-3.8-27b`];var O=`https://api.cerebras.ai/v1/chat/completions`;var Q=`Respond with ONLY a single JSON object (no markdown, no code fences, no commentary) of exactly this shape:
{"questions": [{"type": "MCQ" | "CQ", "question": string, "marks": number, "options": string[] (MCQ only), "correctAnswer": number (MCQ only, zero-based, omit if multiSelect or unknown), "multiSelect": boolean (optional), "correctAnswers": number[] (MCQ only, zero-based, only if multiSelect), "explanation": string (optional), "source": string (optional), "year": string (optional), "subjectHint": string (optional), "topicHint": string (optional)}]}`;var m={type:`OBJECT`,properties:{questions:{type:`ARRAY`,items:{type:`OBJECT`,properties:{type:{type:`STRING`,enum:[`MCQ`,`CQ`]},question:{type:`STRING`},marks:{type:`NUMBER`},options:{type:`ARRAY`,items:{type:`STRING`}},correctAnswer:{type:`INTEGER`},multiSelect:{type:`BOOLEAN`},correctAnswers:{type:`ARRAY`,items:{type:`INTEGER`}},explanation:{type:`STRING`},source:{type:`STRING`},year:{type:`STRING`},subjectHint:{type:`STRING`},topicHint:{type:`STRING`}},required:[`type`,`question`,`marks`]}}},required:[`questions`]};var f=`- "year" is optional \u2014 include it only if the text/paper states which year this question is from (e.g. a paper dated "2019", or a source line like "Dhaka Medical College Admission: 2019-20" \u2014 extract just the year part). Omit if not stated.
- "subjectHint" is optional \u2014 set it when the text groups/labels questions by subject/section heading (copy that label exactly), OR, if there's no such heading but the question is about well-established academic content (e.g. a Medical/Science admission question, a BCS-style question), use your own subject-matter knowledge to classify which school subject it belongs to (e.g. "Biology", "Chemistry", "Physics", "English", "General Knowledge"). Leave it out if genuinely unclear.
- "topicHint" is optional \u2014 your best-effort classification of the specific topic/chapter the question is about (e.g. "Human Circulatory System", "Chemical Bonding", "Photosynthesis"), based on your own subject-matter knowledge of the question's content. Leave it out if genuinely unclear \u2014 never guess wildly.`;var _=`You are given an exam question paper as an image or PDF. Extract every question into structured data.

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/creative/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order). If the paper indicates more than one correct option for a question (e.g. "select all that apply", or an answer key marking multiple choices), set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if the correct answer cannot be determined.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" is the point value for the question. If not stated, use your best estimate from context (e.g. equal division of total marks), defaulting to 1.
- "explanation" is optional \u2014 include it only if the paper provides one.
- "source" is optional \u2014 include it only if the paper states which real exam this question is from (e.g. "Dhaka Medical College Admission").
${f}
- Preserve the original question wording as closely as possible, including any sub-parts, in "question".
- Extract every question on the paper \u2014 do not skip or summarize any.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied.`;var G=`You are given pasted text containing one or more already-complete exam questions (with options and/or answers/explanations already written out \u2014 this is not raw notes to generate new questions from, it's existing questions to extract as structured data).

Rules:
- "type" is "MCQ" for multiple-choice questions with options, or "CQ" for written/short-answer questions with no options.
- For MCQ: include "options" (the answer choices, in order, without any leading letters/numbers like "a." or "1)"). If the text indicates more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices. Otherwise set "correctAnswer" to the single correct zero-based index. Omit both if no answer is given.
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- "marks" defaults to 1 unless the text states otherwise.
- "explanation" \u2014 copy the given explanation/answer rationale if present, cleaned up into plain text; leave it out if none is given.
- "source" \u2014 if the text names which real exam this question is from (e.g. "Dhaka Medical College Admission", an exam board/institution name), copy that as "source"; omit if not stated.
${f}
- Preserve each question's original wording as closely as possible.
- Extract every question in the pasted text \u2014 do not skip, merge, or summarize any.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists).

Pasted text:
"""
{{TEXT}}
"""`;function M(i,e){return`You are given source text written by a teacher \u2014 it may be in English, Bengali, or "Banglish" (Bengali written using English letters), and may be informal or unstructured notes rather than a full question paper.

Based on this text, write ${i} exam question(s) that test understanding of the material in it.

Rules:
- "type" is "MCQ" for multiple-choice, or "CQ" for a written/short-answer question. ${e===`AUTO`?`Choose whichever of MCQ or CQ best fits the content for each question.`:`Every question must be type "${e}".`}
- For MCQ: include exactly 4 "options" (plausible, non-trivial distractors). Only if the question genuinely has more than one correct option, set "multiSelect": true and "correctAnswers" to all correct zero-based indices \u2014 otherwise set "correctAnswer" to the single correct zero-based index (this is the normal case).
- For CQ: omit "options", "correctAnswer", and "correctAnswers".
- Always include "explanation" \u2014 the answer key for the question, direct and to the point (this is shown to students, not the teacher). For CQ, a concise but complete model answer. For MCQ, the key reason the correct option is right, in a short line or two \u2014 not a long write-up.
- "marks" \u2014 use a reasonable default (1 for MCQ, 5-10 for CQ) unless the text suggests otherwise.
- Write the question and explanation in clear, properly-written language matching the source (English or Bengali) \u2014 if the source is Banglish, convert it to proper written form rather than keeping the transliteration.
- If the question and explanation end up in English, add one final short line to "explanation" starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point. Skip this line if the question is already in Bengali.
- Base every question strictly on facts in the given text; do not invent information the text doesn't support.
${f}
- Do not just restate the source text as a fill-in-the-blank \u2014 ask something that actually tests understanding of it.
- "question" and "explanation" must be plain text only \u2014 no Markdown ("**bold**", "#" headings, "---" rules, bullet/asterisk lists). These are shown to students as-is with no formatting applied; use short plain numbered lines like "1. ..." only if there's more than one point.

Source text:
"""
{{TEXT}}
"""`}function $(i){let e=(i.options??[]).map((o,r)=>`${r}. ${o}`).join(`
`),t=i.correctAnswers??(i.correctAnswer!==void 0?[i.correctAnswer]:[]),n=i.type===`MCQ`&&t.length>0?`Correct option${t.length>1?`s`:``}: ${t.map(o=>`${o}. ${i.options?.[o]??``}`).join(`, `)}`:``;return`You are helping a teacher write a short, direct solution for an exam question, to show students after they submit an answer.

Question (${i.type}): ${i.question}
${e?`Options:
${e}
`:``}${n?n+`
`:``}${i.currentExplanation?`Current explanation (rewrite this to be shorter and more direct):
${i.currentExplanation}
`:``}
Write a short, direct explanation of the solution:
- Get straight to the point \u2014 state the answer/reasoning plainly. No long paragraphs, no padding, no restating the question.
- For MCQ, give the key reason the correct option is right in 1-3 short lines. Only mention wrong options if it adds real value, in one short line each.
- For CQ, give a concise but complete model answer \u2014 direct, not padded with filler.
- Organize with short plain numbered lines like "1. ..." if there's more than one point \u2014 never markdown syntax (no "**bold**", "#" headings, "---" rules, or bullet/asterisk lists). This is shown to students as-is with no formatting applied.
- Write the main explanation in the same language as the question (English or Bengali).
- If the question and explanation are in English, add one final short line starting exactly with "Bangla meaning: " giving a brief Bengali translation of the answer/key point, so Bangla-medium students understand it too. Skip this line if the question is already in Bengali.
- Return only the explanation text itself \u2014 no preamble like "Here is the explanation:".`}var T=class i{getApiKey(){return localStorage.getItem(x)??``}setApiKey(e){localStorage.setItem(x,e.trim())}hasApiKey(){return this.getApiKey().length>0}getGroqApiKey(){return localStorage.getItem(q)??``}setGroqApiKey(e){localStorage.setItem(q,e.trim())}hasGroqApiKey(){return this.getGroqApiKey().length>0}getCerebrasApiKey(){return localStorage.getItem(C)??``}setCerebrasApiKey(e){localStorage.setItem(C,e.trim())}hasCerebrasApiKey(){return this.getCerebrasApiKey().length>0}hasAnyKey(){return this.hasApiKey()||this.hasGroqApiKey()||this.hasCerebrasApiKey()}hasKeyFor(e){return e===`gemini`?this.hasApiKey():e===`groq`?this.hasGroqApiKey():this.hasCerebrasApiKey()}providerLabel(e){return P[e]}getProviderPreference(){let e=localStorage.getItem(E);return e===`gemini`||e===`groq`||e===`cerebras`?e:`auto`}setProviderPreference(e){localStorage.setItem(E,e)}async extractQuestions(e){let t=await B(e),n={inline_data:{mime_type:e.type||`application/pdf`,data:t}};return y(await this.fetchGeminiText([n,{text:_}],m))}async extractFromText(e){let t=G.replace(`{{TEXT}}`,e);return y(await this.fetchAiText(t,m))}async generateFromText(e,t,n){let o=M(t,n).replace(`{{TEXT}}`,e);return y(await this.fetchAiText(o,m))}async explainSolution(e){let t=$(e);return(await this.fetchAiText(t)).trim()}async fetchAiText(e,t){let n=this.getProviderPreference(),o=(n===`auto`?R:[n]).filter(a=>this.hasKeyFor(a));if(o.length===0)throw new Error(n===`auto`?`Add a Gemini, Groq, or Cerebras API key first.`:`Add a ${this.providerLabel(n)} API key first, or switch the active AI provider to Auto.`);let r=[];for(let a of o)try{return await this.callProvider(a,e,t)}catch(c){r.push(`${this.providerLabel(a)}: ${c.message}`)}throw new Error(r.join(`

`))}async callProvider(e,t,n){return e===`gemini`?this.fetchGeminiText([{text:t}],n):e===`groq`?this.fetchOpenAiCompatibleText(k,this.getGroqApiKey(),S,t,!!n,`Groq`):this.fetchOpenAiCompatibleText(O,this.getCerebrasApiKey(),I,t,!!n,`Cerebras`)}async fetchOpenAiCompatibleText(e,t,n,o,r,a){if(!t)throw new Error(`Add your ${a} API key first.`);let c=r?`${o}

${Q}`:o,s;for(let p of n){let l=await fetch(e,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${t}`},body:JSON.stringify(Z({model:p,messages:[{role:`user`,content:c}],max_tokens:8e3},r?{response_format:{type:`json_object`}}:{}))});if(l.ok){let u=(await l.json()).choices?.[0]?.message?.content;if(!u)throw new Error(`${a} returned an empty result \u2014 try again.`);return u}let w=await l.text().catch(()=>``);if(s=new Error(`${a} request failed (${l.status}): ${w.slice(0,300)||l.statusText}`),l.status===404)continue;if(!(l.status===429||l.status===503))throw s}throw s}async fetchGeminiText(e,t){let n=this.getApiKey();if(!n)throw new Error(`Add your Gemini API key first.`);let o=3,r;for(let a of A)for(let c=1;c<=o;c++){let s=await fetch(v(a),{method:`POST`,headers:{"Content-Type":`application/json`,"x-goog-api-key":n},body:JSON.stringify({contents:[{parts:e}],generationConfig:Z({maxOutputTokens:65536},t?{responseMimeType:`application/json`,responseSchema:t}:{})})});if(s.ok){let h=(await s.json()).candidates?.[0],d=h?.content?.parts?.[0]?.text;if(!d){let u=h?.finishReason;throw new Error(u===`MAX_TOKENS`?`This paper is too large to extract in one go — Gemini ran out of output space. Split it into smaller batches (e.g. 30-50 questions per upload/paste) and try each separately.`:u&&u!==`STOP`?`Gemini stopped without a result (${u}) \u2014 try again or use different input.`:`Gemini returned an empty result — try again or use different input.`)}return d}let p=await s.text().catch(()=>``);if(r=new Error(`Gemini request failed (${s.status}): ${p.slice(0,300)||s.statusText}`),s.status===404)break;if(!(s.status===429||s.status===503))throw r;c<o&&await K(Math.min(1500*2**(c-1),8e3))}throw r&&/\b(429|503)\b/.test(r.message)?new Error(`${r.message}

Gemini is overloaded/rate-limited on Google's side right now \u2014 this already retried automatically across ${A.length} models. It usually clears within a minute or two; wait a bit and try again.`):r}static ɵfac=function(t){return new(t||i)};static ɵprov=rt({token:i,factory:i.ɵfac,providedIn:`root`})};function y(i){let e;try{e=JSON.parse(i)}catch{throw new Error(`Could not parse the generated questions — try again. If this is a large paper (many dozens of questions), try splitting it into smaller batches instead of one big upload.`)}return e.questions??[]}function K(i){return new Promise(e=>setTimeout(e,i))}function B(i){return new Promise((e,t)=>{let n=new FileReader;n.onload=()=>{let o=n.result;e(o.split(`,`)[1]??``)},n.onerror=()=>t(n.error),n.readAsDataURL(i)})}export{T as t};