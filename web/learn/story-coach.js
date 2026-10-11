import {StoryMemory} from './story-memory.js';
import {createLookahead, opportunityFor, plannedQuestion, questionStops} from './story-lookahead.js?v=question-status-1';
import {createInteractionPlayer, feedbackFor} from './interaction-player.js';
import { createPreparation } from './story-preparation.js';
// Teacher console. The server owns session state; model proposals never directly drive hardware.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountStoryCoach({player, enabled, checkpoints = [], pause, onResume = () => {}, onQuestionStops = () => {}}) {
  if(!enabled)return {context(){},dispose(){},isPaused(){return false;}};
  const panel=document.createElement('aside');panel.className='story-coach';panel.hidden=true;panel.setAttribute('aria-label','Teacher story coach');player.append(panel);
  let state=null,open=false,busy=false,error='',passage=null,version=0,disposed=false,lastSpeech='',latestPage=undefined;
  let queue=Promise.resolve();
  const lockedControls=new Map();
  const memory=new StoryMemory();
  const preparation=createPreparation(api, render);
  const lookahead=createLookahead(api,render), interaction=createInteractionPlayer(player);
  let interactionAudio={}, windowTargets=[];
  const readyHere=()=>lookahead.status==='ready' && lookahead.target===passage;
  const preparationStatus=()=>readyHere()?'ready':lookahead.status==='preparing'?'preparing':preparation.status;
  function lockControls(locked){
    const controls=player.querySelectorAll('#reader-play,#reader-prev,#reader-next,#reader-seek,#reader-chapter');
    controls.forEach(control=>{if(locked){if(!lockedControls.has(control))lockedControls.set(control,control.disabled);control.disabled=true;}else if(lockedControls.has(control)){control.disabled=lockedControls.get(control);lockedControls.delete(control);}});
  }
  async function api(path,payload){const response=await fetch('/api/story/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let data;try{data=await response.json();}catch{throw Error('Story Mode needs the updated local server.');}if(!response.ok)throw Error(data.error||'Story Mode unavailable.');return data;}
  function render(){
    if(disposed)return;
    onQuestionStops(questionStops(plannedQuestion({state,passage,windowTargets,status:lookahead.status,preview:lookahead.preview,target:lookahead.target}), [...memory.rows, ...(state?.observations||[])], checkpoints));
    lockControls(['awaiting_tactile','ready','waiting_response','awaiting_confirmation'].includes(state?.phase));panel.hidden=!open;if(!open)return;
    const phase=state?.phase||'reading',preview=readyHere()?lookahead.preview:null,proposal=state?.proposal||(['propose_activity','propose_word_emphasis'].includes(preview?.tool)?{...preview.arguments,kind:preview.arguments.target.length===1?'letter':'word'}:preview?.arguments);
    const button=(action,label)=>`<button data-coach="${action}" ${busy?'disabled':''}>${label}</button>`;
    const checkpoint=checkpoints.find(c=>c.id===passage);
    panel.innerHTML=`<header><span>TEACHER · STORY COACH</span><button data-coach="close" aria-label="Close teacher panel">×</button></header><p class="coach-state" role="status">${busy?'One moment…':esc(phase.replaceAll('_',' '))}</p>${error?`<p class="coach-error" role="alert">${esc(error)}</p>`:''}${phase==='reading'&&(passage||lookahead.target)?`<p class="coach-note" role="status">${lookahead.status==='ready'&&!readyHere()?'Upcoming exercise and narration prepared. Keep reading.':preparationStatus()==='ready'?'Decision prepared. Ready when you are.':preparationStatus()==='preparing'?'Preparing an exercise and narrator audio while you read…':preparationStatus()==='failed'?'Preparation unavailable. Ask again or continue reading.':''}</p>`:''}${checkpoint?`<p class="coach-note">Materials: ${checkpoint.required_materials.map(esc).join('; ')}. Natural pause: after this passage.</p>`:''}<h2>${proposal?.target?esc(proposal.kind+' · '+proposal.target):'A moment to learn'}</h2><p>${esc(proposal?.reason||'Ask the orchestrator whether a short Braille activity fits this passage.')}</p>${proposal?.prompt?`<div class="coach-prompt"><small>LEARNER PROMPT</small><p>${esc(proposal.prompt)}</p></div>`:''}${state?.braille?.sequence?`<p class="coach-note">Single-cell sequence: ${state.braille.cells.map(c=>esc(c.letter)).join(' → ')}. Preview only · 1.5 seconds per letter, 0.3 second gap.</p>`:''}${state?.braille?`<div class="coach-cells" aria-label="Visual Braille preview">${state.braille.cells.map(c=>`<span><b>${String.fromCodePoint(0x2800+c.dots.reduce((n,d)=>n+(1<<(d-1)),0))}</b><small>${esc(c.letter)} · ${c.dots.join(',')}</small></span>`).join('')}</div>`:''}<div class="coach-actions">${phase==='reading'&&readyHere()?button('start_prepared',preview?.tool==='recommend_continue'?'Continue story':'Start activity · tactile ready'):['reading','proposed','continue_proposed'].includes(phase)?button('orchestrate',preparationStatus()==='ready'?'Use prepared decision':preparationStatus()==='preparing'?'Wait for decision': 'Ask orchestrator'):''}${phase==='proposed'?button('approve_activity','Start activity · tactile ready'):''}${phase==='awaiting_tactile'?button('confirm_tactile','Tactile material offered'):''}${['ready','waiting_response'].includes(phase)?button('speak_prompt',phase==='ready'?'Speak prompt':'Repeat prompt'):''}${phase==='waiting_response'?button('give_hint','Give a hint'):''}${['waiting_response','awaiting_confirmation'].includes(phase)?`${button('independent','Independent')}${button('with_help','With help')}${button('try_later','Try later')}`:''}${button('resume_story',phase==='reading'?'Close and read':'Skip / Continue story')}</div><p class="coach-note">${phase==='reading'||phase==='proposed'?'Starting an activity confirms you have its tactile material ready. ':''}${state?.braille?'Preview only. Teacher supplies tactile Braille.':'Teaching proposals via MCP · Teacher confirms learning observations.'} Microphone not connected.</p><details><summary>Word activities</summary><p>Word emphasis explores a keyword one letter at a time. Sequence preview only; hardware playback is not connected.</p>${['reading','proposed','continue_proposed'].includes(phase)?button('toggle_word_emphasis',state?.policy?.word_emphasis_enabled?'Disable word emphasis':'Enable word emphasis'):''}</details><details><summary>Personal Intelligence · practice history</summary><p>Saved on this browser profile. Review dates are practice suggestions.</p>${memory.error?`<p role="alert">${esc(memory.error)}</p>`:''}${(state?.review_candidates||[]).map(r=>`<p><strong>${esc(r.target)} · ${esc(r.activity)} · ${r.due?'Review due':r.needs_support?'Recently needed help':'Review scheduled'}</strong><br>${esc(r.reason)} Next review: ${esc(new Date(r.review_due_at).toLocaleDateString())}</p>`).join('')||'<p>No confirmed story practice yet.</p>'}</details><details><summary>Tool activity</summary><ol>${(state?.trace||[]).slice(-8).map(t=>`<li>${esc(t.actor)} · ${esc(t.tool)}</li>`).join('')}</ol></details>`;
  }
  async function syncContext(target=passage){
    if(!state)state=await api('session',{history:memory.rows});
    else state=await api('action',{session_id:state.session_id,name:'get_story_context'});
    state=await api('action',{session_id:state.session_id,revision:state.revision,name:'set_context',arguments:{passage_id:target}});
  }
  async function action(name,args={}){const token=version;const result=await api('action',{session_id:state.session_id,revision:state.revision,name,arguments:args});if(name==='record_observation')memory.remember(result.observations,result.session_id);if(disposed||token!==version)throw Error('Story context changed.');state=result;preparation.invalidate();}
  async function startActivity(){
    await action('approve_activity');await action(state.proposal.activity==='emphasize'?'prepare_word_sequence':'prepare_braille');await action('confirm_tactile');await action('speak_prompt');
    lastSpeech=state.speech.id;
    interaction.play({url:interactionAudio.prompt,text:state.speech.text});
  }
  async function resume(clip){
    const token=version;
    await action('resume_story');lookahead.invalidate();
    const completed=await interaction.play({clip});
    if(disposed||token!==version)return;
    open=false;render();
    if(completed)onResume();
    else error='Audio was interrupted. Continue with the page arrow when ready.';
  }
  async function run(name){
    if(busy||disposed)return;interaction.stop();pause();busy=true;error='';render();const token=version;
    try{
      await queue;
      if(disposed||token!==version)return;
      if(!state)await syncContext();
      if(name==='toggle_word_emphasis'){await action('set_word_emphasis',{enabled:!state.policy.word_emphasis_enabled});lookahead.invalidate();interactionAudio={};if(passage)lookahead.prepare(state,passage);return;}
      if(name==='orchestrate'||name==='start_prepared'){
        if(!passage)throw Error('No curated opportunity on this spread. Try meeting Peter, the gate, or the vegetables.');
        const result=readyHere()?await lookahead.apply(state):await preparation.apply(state);
        if(disposed||token!==version)return;state=result.state;interactionAudio=result.interaction_audio||{};
        if(name==='start_prepared'){if(state.phase==='proposed')await startActivity();else await resume('return-to-story');}
      }else if(['independent','with_help','try_later'].includes(name)){await action('record_observation',{outcome:name});lookahead.invalidate();await resume(feedbackFor('record_observation',name));}
      else{
        if(name==='approve_activity'){await startActivity();return;}
        if(name==='resume_story'){if(state.phase==='reading'){open=false;return;}await resume(state.phase==='continue_proposed'?'return-to-story':'skip');return;}
        await action(name);
        if(['speak_prompt','give_hint'].includes(name)&&state.speech?.id!==lastSpeech){
          lastSpeech=state.speech.id;
          interaction.play({url:interactionAudio[name==='give_hint'?'hint':'prompt'],text:state.speech.text});
        }
      }
    }catch(e){if(!disposed&&token===version)error=e.message;}
    finally{busy=false;render();}
  }
  panel.onclick=event=>{const name=event.target.closest('[data-coach]')?.dataset.coach;if(!name)return;if(name==='close'){interaction.stop();open=false;render();return;}run(name);};
  const trigger=player.querySelector('#open-story-coach');
  trigger.onclick=()=>{interaction.stop();pause();open=!open;render();};
  return {
    offerQuestion(){if(readyHere() && lookahead.preview?.tool==='propose_activity' && !open){pause();open=true;render();}},
    stopSpeech(){interaction.stop();},
    isPaused(){return ['awaiting_tactile','ready','waiting_response','awaiting_confirmation'].includes(state?.phase);},
    context(pageId,upcoming=[pageId]){
      if(pageId===latestPage)return;latestPage=pageId;version++;error='';
      passage=opportunityFor(pageId,checkpoints);interaction.stop();interactionAudio={};
      windowTargets=upcoming.slice(0,3).map(id=>opportunityFor(id,checkpoints)).filter(Boolean);
      const candidate=windowTargets[0]||null;
      window.speechSynthesis?.cancel();
      preparation.invalidate();
      const token=version,target=passage;
      if(!disposed){queue=queue.catch(()=>{}).then(async()=>{
        if(disposed||token!==version)return;
        await syncContext(target);
        if(!disposed&&token===version)lookahead.prepare(state,candidate);
      }).catch(e=>{if(token===version)error=e.message;}).finally(render);}
      render();
    },
    dispose(){lookahead.invalidate();interaction.dispose();lockControls(false);disposed=true;version++;preparation.invalidate();window.speechSynthesis?.cancel();if(state){queue.catch(()=>{}).then(()=>api('action',{session_id:state.session_id,revision:state.revision,name:'set_context',arguments:{passage_id:null}})).catch(()=>{});}panel.remove();}
  };
}
