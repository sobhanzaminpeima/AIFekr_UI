import {test,expect} from '@playwright/test';
import {initializeGame,stepGame,validateReplay,type GameSlug,type ReplayEvent} from '../lib/play-engine';
test('rendered game events reproduce the authoritative final state for all five action games',()=>{
 for(const slug of ['tower','snake','2048','speed-run','fiko-fly'] as GameSlug[]){
  let state=initializeGame(slug,12345);const events:ReplayEvent[]=[];
  for(let frame=1;frame<=80&&!state.over;frame++){const input=frame%9===0?'tap':frame%7===0?'left':'none';if(input!=='none')events.push({frame,input});state=stepGame(state,input);}
  const verified=validateReplay(slug,12345,events,state.frame,{});expect(verified.score).toBe(state.score);expect(verified.over).toBe(state.over);
 }
});
test('game replay rejects impossible frame input rather than accepting a submitted score',()=>{
 expect(()=>validateReplay('tower',123,[{frame:999,input:'tap'}],5,{})).toThrow();
});
