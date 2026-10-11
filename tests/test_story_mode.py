import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from story_mode.controller import Controller, StoryError
from story_mode.selection import decision_context, allowed_tools

class StoryTests(unittest.TestCase):
    def setUp(self):
        self.c=Controller();self.s=self.c.create();self.call('set_context',{'passage_id':'rabbit'},'teacher')
    def call(self,name,args=None,actor='orchestrator'):
        self.s=self.c.call(self.s['session_id'],self.s['revision'],name,args,actor=actor);return self.s
    def propose(self,target='r'):
        return self.call('propose_activity',{'activity':'identify','target':target,'prompt':'Feel the letter. What is it?','hint':'Find the middle dot on the right.','reason':'Offer a brief recognition activity at this story moment.'})
    def start(self):
        self.propose();self.call('approve_activity',actor='teacher');self.call('prepare_braille');self.call('confirm_tactile',actor='teacher');self.call('speak_prompt')
    def test_stale_navigation_cannot_start_activity(self):
        old=self.s['revision'];self.call('set_context',{'passage_id':'gate'},'teacher')
        with self.assertRaises(StoryError):self.c.call(self.s['session_id'],old,'recommend_continue',{'reason':'old'})
    def test_model_cannot_confirm_tactile_or_grade(self):
        self.propose()
        with self.assertRaises(StoryError):self.call('approve_activity')
        self.call('approve_activity',actor='teacher');self.call('prepare_braille')
        with self.assertRaises(StoryError):self.call('confirm_tactile')
        with self.assertRaises(StoryError):self.call('speak_prompt')
        self.assertFalse(self.s['device']['ready']);self.assertFalse(self.s['braille']['physical_ready'])
    def test_transcript_is_not_a_score(self):
        self.start();self.call('submit_response',{'text':'are'})
        self.assertEqual(self.s['observations'],[])
        with self.assertRaises(StoryError):self.call('record_observation',{'outcome':'independent'})
        self.call('record_observation',{'outcome':'independent'},'teacher')
        self.assertEqual(self.s['observations'][0]['target'],'r')
    def test_hint_requires_assisted_observation(self):
        self.start();self.call('give_hint')
        with self.assertRaises(StoryError):self.call('record_observation',{'outcome':'independent'},'teacher')
        self.call('record_observation',{'outcome':'with_help'},'teacher')
    def test_word_cells_and_letter_are_distinct(self):
        self.propose('rabbit');self.call('approve_activity',actor='teacher');self.call('prepare_braille')
        self.assertEqual(len(self.s['braille']['cells']),6)
        self.assertEqual(self.s['braille']['cells'][0]['dots'],[1,2,3,5])
    def test_target_guard_and_atomic_error(self):
        before=self.c.get(self.s['session_id'])
        with self.assertRaises(StoryError):self.propose('z')
        self.assertEqual(before,self.c.get(self.s['session_id']))
    def test_navigation_clears_activity_but_keeps_observations(self):
        self.start();self.call('record_observation',{'outcome':'with_help'},'teacher')
        self.call('set_context',{'passage_id':'lettuce'},'teacher')
        self.assertEqual(self.s['phase'],'reading');self.assertIsNone(self.s['proposal']);self.assertNotIn('speech',self.s)
        self.assertEqual(self.s['observations'][0]['outcome'],'with_help')
    def test_selection_context_excludes_unrelated_and_private_state(self):
        state=self.c.sessions[self.s['session_id']]
        state['observations']=[{'id':str(i),'target':'r','source':'teacher',
            'outcome':'with_help','activity':'identify','hint_used':True,'passage_id':'rabbit'} for i in range(10)]
        state['observations'] += [{'target':'g','source':'teacher'}, {'target':'r','source':'transcript'}]
        state['response']={'text':'Private unconfirmed transcript'}
        context=decision_context(self.c.get(self.s['session_id']))
        self.assertEqual([o['id'] for o in context['observations']],['6','7','8','9'])
        self.assertEqual(context['observations_omitted'],6)
        self.assertNotIn('response',context)
        self.assertNotIn('trace',context)
        self.assertNotIn('device',context)
        self.assertEqual(allowed_tools(context),{'propose_activity','recommend_continue'})

    def test_selection_is_unavailable_during_an_activity(self):
        self.start()
        with self.assertRaises(ValueError):decision_context(self.s)

    def test_budget(self):
        self.c.sessions[self.s['session_id']]['activities_started']=6
        with self.assertRaises(StoryError):self.propose()
        self.call('recommend_continue',{'reason':'The activity limit has been reached.'})

if __name__=='__main__':unittest.main()
