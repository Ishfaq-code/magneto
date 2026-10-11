export function opportunityFor(text) {
  return /lettuces.*French beans.*radishes/s.test(text) ? 'lettuce' : /four little Rabbits/i.test(text) ? 'rabbit' : /squeezed under the gate/i.test(text) ? 'gate' : null;
}
export function createLookahead(api, changed = () => {}) {
  let entry = null, generation = 0, timer = null;
  function invalidate() {generation++; clearTimeout(timer); entry = null; changed();}
  function prepare(state, target) {
    if (!target || state.phase !== 'reading') {invalidate(); return;}
    const key = JSON.stringify([state.session_id,target,state.observations,state.activities_started,state.policy,state.interaction_revision]);
    if (entry?.key === key && entry.status !== 'failed') return;
    invalidate(); const token = generation;
    entry = {key,target,status:'preparing'}; changed();
    const deadline = Date.now() + 240000;
    const fail = () => {if(token===generation){entry.status='failed';changed();}};
    const receive = result => {
      if(token!==generation)return;
      if(result.target!==target || typeof result.preparation_id!=='string') {fail();return;}
      entry.handle=result.preparation_id;
      if(result.status==='ready'){entry.status='ready';entry.preview=result.preview;changed();return;}
      if(Date.now()>deadline){fail();return;}
      timer=setTimeout(()=>api('lookahead-status',{session_id:state.session_id,preparation_id:entry.handle}).then(receive).catch(fail),1500);
    };
    api('lookahead',{session_id:state.session_id,revision:state.revision,target}).then(receive).catch(fail);
  }
  async function apply(state) {
    if(entry?.status!=='ready' || entry.target!==state.passage_id)throw Error('The upcoming exercise is not ready for this page.');
    const handle=entry.handle; invalidate();
    return api('apply-lookahead',{session_id:state.session_id,revision:state.revision,preparation_id:handle});
  }
  return {prepare,apply,invalidate,get preview(){return entry?.preview;},get target(){return entry?.target;},get status(){return entry?.status||'idle';}};
}
