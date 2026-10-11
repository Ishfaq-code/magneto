import test from 'node:test';
import assert from 'node:assert/strict';
import {createLookahead,opportunityFor} from '../web/learn/story-lookahead.js';
import {feedbackFor} from '../web/learn/interaction-player.js';
const state={session_id:'s',revision:1,phase:'reading',passage_id:null,observations:[],activities_started:0,policy:{}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('same candidate survives page revisions, applies only on matching page',async()=>{
 const calls=[];const cache=createLookahead(async(path,body)=>{calls.push(path);return {status:'ready',target:'rabbit',preparation_id:'h'};});
 cache.prepare(state,'rabbit');await tick();
 cache.prepare({...state,revision:2},'rabbit');assert.equal(calls.length,1);
 await assert.rejects(cache.apply(state));
 await cache.apply({...state,revision:2,passage_id:'rabbit'});assert.deepEqual(calls,['lookahead','apply-lookahead']);
 assert.equal(cache.status,'idle');
});
test('late results cannot revive invalidated lookahead',async()=>{
 let finish;const cache=createLookahead(()=>new Promise(r=>finish=r));
 cache.prepare(state,'rabbit');cache.invalidate();finish({status:'ready',target:'rabbit',preparation_id:'h'});await tick();assert.equal(cache.status,'idle');
});
test('new evidence starts new preparation; no opportunity clears it',async()=>{
 let count=0;const cache=createLookahead(async()=>{count++;return {status:'ready',target:'rabbit',preparation_id:'h'};});
 cache.prepare(state,'rabbit');await tick();cache.prepare({...state,activities_started:1},'rabbit');await tick();assert.equal(count,2);cache.prepare(state,null);assert.equal(cache.status,'idle');
});
test('feedback never grades a transcript or treats try-later as incorrect',()=>{
 assert.equal(feedbackFor('submit_response','independent'),null);
 assert.equal(feedbackFor('record_observation','try_later'),'skip');
 assert.equal(feedbackFor('record_observation','independent'),'success-independent');
 assert.equal(feedbackFor('record_observation','with_help'),'success-assisted');
 assert.equal(feedbackFor('give_hint'),null);
 assert.equal(opportunityFor('four little Rabbits'),'rabbit');
});
