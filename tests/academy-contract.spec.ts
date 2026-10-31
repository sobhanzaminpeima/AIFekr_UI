import {test,expect} from '@playwright/test';
import {assessmentAnswers,type PublicAssessmentQuestion} from '../lib/academy-contract';
test('assessment serializes all six supported answer types without grading in the browser',()=>{
 const questions:PublicAssessmentQuestion[]=[{type:'multipleChoice',question:'one',options:['a','b']},{type:'multipleSelect',question:'many',options:['a','b','c']},{type:'trueFalse',question:'boolean'},{type:'shortAnswer',question:'text'},{type:'ordering',question:'order',items:['a','b']},{type:'matching',question:'match',left:['a','b'],right:['x','y']}];
 const f=new FormData();for(const [k,v] of [['q0','1'],['q1','0'],['q1','2'],['q2','false'],['q3',' پاسخ '],['q4_0','1'],['q4_1','0'],['q5_0','0'],['q5_1','1']])f.append(k,v);
 expect(assessmentAnswers(questions,f)).toEqual([1,[0,2],false,'پاسخ',[1,0],[0,1]]);
});
test('missing answers and duplicate ordering choices are rejected before submission',()=>{
 expect(()=>assessmentAnswers([{type:'trueFalse',question:'q'}],new FormData())).toThrow('ANSWER_ALL_QUESTIONS');
 const f=new FormData();f.set('q0_0','0');f.set('q0_1','0');expect(()=>assessmentAnswers([{type:'ordering',question:'q',items:['a','b']}],f)).toThrow('INVALID_ANSWER');
});
