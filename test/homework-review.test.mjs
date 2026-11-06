import assert from 'node:assert/strict';
import {validHomeworkReview,normalizeHomeworkReview} from '../src/homework-review.js';
import {gradeHomeworkPhoto} from '../src/pyapi.js';
const finding={kind:'ai_reference',excerpt:'ChatGPT көмегімен',reason:'Жұмыста ЖИ көмегі көрсетілген; студенттің түсінгенін нақтылаңыз.',question:'Осы бағдарламада input() не үшін қажет?'};
assert(validHomeworkReview({findings:[]}));assert.equal(normalizeHomeworkReview(undefined),null,'Old grades are not silently marked as reviewed');
assert(!validHomeworkReview({findings:[{...finding,kind:'neat_handwriting'}]}));
assert(!validHomeworkReview({findings:[{...finding,excerpt:''}]}));
assert(!validHomeworkReview({findings:Array(4).fill(finding)}));
const bounded=normalizeHomeworkReview({findings:[{...finding,excerpt:'x'.repeat(1000)}]});assert.equal(bounded.findings[0].excerpt.length,240);
const original=globalThis.fetch;let sent;
globalThis.fetch=async(url,options)=>{
  sent=JSON.parse(options.body);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({score:25,comment:'Барлық талап орындалған.',review:{findings:[finding]}})}]}}]}),{status:200});
};
try{
  const result=await gradeHomeworkPhoto({GEMINI_API_KEY:'synthetic-test-key'},'synthetic-photo','image/png');
  assert.equal(result.score,25);assert.equal(result.review.findings[0].excerpt,finding.excerpt);
  const prompt=sent.contents[0].parts[0].text;
  assert(prompt.includes('Never lower the score because of suspected AI use'));
  assert(prompt.includes('Never estimate an AI percentage'));
  assert(prompt.includes('must NOT be flagged'));
  assert(sent.generationConfig.responseSchema.required.includes('review'));
  assert.equal(sent.contents[0].parts[1].inlineData.data,'synthetic-photo');
}finally{globalThis.fetch=original;}
console.log('Homework review: structured visible evidence, bounded teacher-only findings, compatible old grades, no authorship percentages and rubric-only scoring passed.');
