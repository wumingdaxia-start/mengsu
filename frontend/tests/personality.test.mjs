import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createQuestions,scorePersonality,axes} from '../src/data/personality.js'
const questions=createQuestions()
const responses=n=>Object.fromEntries(questions.map(q=>[q.id,n]))
test('original questionnaire has 24 unique questions and balanced forward/reverse items',()=>{
  assert.equal(questions.length,24); assert.equal(new Set(questions.map(q=>q.id)).size,24)
  for(const axis of axes){const items=questions.filter(q=>q.axis===axis.id);assert.equal(items.length,4);assert.equal(items.filter(q=>q.reverse).length,2)}
})
test('neutral and acquiescent responses are not turned into a confident type',()=>{
  for(const value of [1,3,5]){const result=scorePersonality(responses(value));assert.equal(result.title,'此刻均衡型');assert.ok(result.profile.every(p=>p.position===50&&p.side==='balanced'))}
})
test('reversed questions move the axis in the correct direction and results stay in range',()=>{
  for(const high of [false,true]){
    const answers=Object.fromEntries(questions.map(q=>[q.id,q.reverse === high?1:5]))
    const r=scorePersonality(answers)
    assert.ok(r.profile.every(p=>p.position === (high?100:0)))
    assert.ok(r.profile.every(p=>p.side === (high?'high':'low')))
    assert.ok(r.actions.length===2)
  }
})
test('missing or invalid input cannot silently produce a result',()=>{
  for(const bad of [undefined,0,6,2.5,'3',null]){const a=responses(3);a[questions[0].id]=bad;assert.throws(()=>scorePersonality(a))}
  assert.throws(()=>scorePersonality({}))
})
