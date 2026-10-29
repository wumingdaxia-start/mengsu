import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createQuestions,scorePersonality} from '../src/data/personality.js'
import {personalityCards,cardsForResult} from '../src/data/personality-cards.js'
test('twelve unique original card scenes cover both ends of every axis',()=>{
 assert.equal(personalityCards.length,12)
 assert.equal(new Set(personalityCards.map(c=>c.id)).size,12)
 assert.equal(new Set(personalityCards.map(c=>c.art)).size,12)
 assert.ok(personalityCards.every(c=>c.title&&c.subtitle&&c.description&&c.action&&c.artLabel))
})
test('result cards follow the answers instead of random drawing',()=>{
 const q=createQuestions()
 for(const side of ['low','high']){
  const answers=Object.fromEntries(q.map(q=>[q.id,(side==='high')!==q.reverse?5:1]))
  const result=scorePersonality(answers)
  const cards=cardsForResult(result)
  assert.equal(cards.length,2)
  assert.ok(cards.every(c=>c.side===side))
  assert.deepEqual(cardsForResult(result).map(c=>c.id),cards.map(c=>c.id))
  assert.equal(cards.map(c=>c.title).join(' · ')+'型',result.title)
 }
 const neutral=scorePersonality(Object.fromEntries(q.map(q=>[q.id,3])))
 assert.equal(cardsForResult(neutral)[0].id,'balanced')
 assert.deepEqual(cardsForResult(null),[])
})
