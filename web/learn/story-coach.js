// Teacher console. The server owns session state; model proposals never directly drive hardware.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountStoryCoach({player, enabled, pause}) {
  if(!enabled)return {context(){},dispose(){},isPaused(){return false;}};
  const panel=document.createElement('aside');panel.className='story-coach';panel.hidden=true;panel.setAttribute('aria-label','Teacher story coach');player.append(panel);
  let state=null,open=false,busy=false,error='',passage=null,version=0,disposed=false,lastSpeech='',latestText='';
  let queue=Promise.resolve();
  const lockedControls=new Map();
  function lockControls(locked){
    const controls=player.querySelectorAll('#reader-play,#reader-prev,#reader-next,#reader-seek,#reader-chapter');
    controls.forEach(control=>{if(locked){if(!lockedControls.has(control))lockedControls.set(control,control.disabled);control.disabled=true;}else if(lockedControls.has(control)){control.disabled=lockedControls.get(control);lockedControls.delete(control);}});
  }
  async function api(path,payload){const response=await fetch('/api/story/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let data;try{data=await response.json();}catch{throw Error('Story Mode needs the updated local server.');}if(!response.ok)throw Error(data.error||'Story Mode unavailable.');return data;}
  function render(){
    if(disposed)return;lockControls(['awaiting_tactile','ready','waiting_response','awaiting_confirmation'].includes(state?.phase));panel.hidden=!open;if(!open)return;
    const phase=state?.phase||'reading',proposal=state?.proposal;
    const button=(action,label)=>`<button data-coach="${action}" ${busy?'disabled':''}>${label}</button>`;
    panel.innerHTML=`<header><span>TEACHER · STORY COACH</span><button data-coach="close" aria-label="Close teacher panel">×</button></header><p class="coach-state" role="status">${busy?'Orchestrator working…':esc(phase.replaceAll('_',' '))}</p>${error?`<p class="coach-error" role="alert">${esc(error)}</p>`:''}<h2>${proposal?.target?esc(proposal.kind+' · '+proposal.target):'A moment to learn'}</h2><p>${esc(proposal?.reason||'Ask the orchestrator whether a short Braille activity fits this passage.')}</p>${proposal?.prompt?`<div class="coach-prompt"><small>LEARNER PROMPT</small><p>${esc(proposal.prompt)}</p></div>`:''}${state?.braille?`<div class="coach-cells" aria-label="Visual Braille preview">${state.braille.cells.map(c=>`<span><b>${String.fromCodePoint(0x2800+c.dots.reduce((n,d)=>n+(1<<(d-1)),0))}</b><small>${esc(c.letter)} · ${c.dots.join(',')}</small></span>`).join('')}</div>`:''}<div class="coach-actions">${['reading','proposed','continue_proposed'].includes(phase)?button('orchestrate','Ask orchestrator'):''}${phase==='proposed'?button('approve_activity','Start activity'):''}${phase==='awaiting_tactile'?button('confirm_tactile','Tactile material offered'):''}${['ready','waiting_response'].includes(phase)?button('speak_prompt',phase==='ready'?'Speak prompt':'Repeat prompt'):''}${phase==='waiting_response'?button('give_hint','Give a hint'):''}${['waiting_response','awaiting_confirmation'].includes(phase)?`${button('independent','Independent')}${button('with_help','With help')}${button('try_later','Try later')}`:''}${button('resume_story',phase==='reading'?'Close and read':'Skip / Continue story')}</div><p class="coach-note">${state?.braille?'Preview only. Teacher supplies tactile Braille.':'Live model via MCP · Teacher confirms learning observations.'} Microphone not connected.</p><details><summary>Tool activity</summary><ol>${(state?.trace||[]).slice(-8).map(t=>`<li>${esc(t.actor)} · ${esc(t.tool)}</li>`).join('')}</ol></details>`;
  }
  async function syncContext(){
    if(!state)state=await api('session',{});
    else state=await api('action',{session_id:state.session_id,name:'get_story_context'});
    state=await api('action',{session_id:state.session_id,revision:state.revision,name:'set_context',arguments:{passage_id:passage}});
  }
  async function action(name,args={}){const token=version;const result=await api('action',{session_id:state.session_id,revision:state.revision,name,arguments:args});if(disposed||token!==version)throw Error('Story context changed.');state=result;}
  async function run(name){
    if(busy||disposed)return;pause();busy=true;error='';render();const token=version;
    try{
      await queue;
      if(disposed||token!==version)return;
      if(!state)await syncContext();
      if(name==='orchestrate'){
        if(!passage)throw Error('No curated opportunity on this spread. Try meeting Peter, the gate, or the vegetables.');
        const result=await api('orchestrate',{session_id:state.session_id,revision:state.revision});
        if(disposed||token!==version)return;state=result.state;
      }else if(['independent','with_help','try_later'].includes(name))await action('record_observation',{outcome:name});
      else{
        await action(name);
        if(name==='approve_activity')await action('prepare_braille');
        if(name==='resume_story'){window.speechSynthesis?.cancel();open=false;}
        if(['speak_prompt','give_hint'].includes(name)&&state.speech?.id!==lastSpeech){
          lastSpeech=state.speech.id;
          if('speechSynthesis'in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(state.speech.text);utterance.rate=.85;speechSynthesis.speak(utterance);}else error='Speech is unavailable. Teacher can read the prompt aloud.';
        }
      }
    }catch(e){if(!disposed&&token===version)error=e.message;}
    finally{busy=false;render();}
  }
  panel.onclick=event=>{const name=event.target.closest('[data-coach]')?.dataset.coach;if(!name)return;if(name==='close'){open=false;render();return;}run(name);};
  const trigger=player.querySelector('#open-story-coach');
  trigger.onclick=()=>{pause();open=!open;render();};
  return {
    isPaused(){return ['awaiting_tactile','ready','waiting_response','awaiting_confirmation'].includes(state?.phase);},
    context(text){
      if(text===latestText)return;latestText=text;version++;error='';
      passage=/lettuces.*French beans.*radishes/s.test(text)?'lettuce':/four little Rabbits/i.test(text)?'rabbit':/squeezed under the gate/i.test(text)?'gate':null;
      window.speechSynthesis?.cancel();
      if(state){queue=queue.catch(()=>{}).then(syncContext).catch(e=>{error=e.message;}).finally(render);}
      render();
    },
    dispose(){lockControls(false);disposed=true;version++;window.speechSynthesis?.cancel();if(state){queue.catch(()=>{}).then(()=>api('action',{session_id:state.session_id,revision:state.revision,name:'set_context',arguments:{passage_id:null}})).catch(()=>{});}panel.remove();}
  };
}
