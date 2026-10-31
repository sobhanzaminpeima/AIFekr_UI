import {test,expect} from '@playwright/test';
import {consumeToolStream} from '../lib/live-stream';
function response(parts:string[]){const encoder=new TextEncoder();return new Response(new ReadableStream({start(c){for(const p of parts)c.enqueue(encoder.encode(p));c.close()}}))}
test('stream preserves Persian and text across chunk boundaries and requires completion',async()=>{
 const events:unknown[]=[];const result=await consumeToolStream(response(['data: {"te','xt":"سلام"}\r','\n\r\n','data: {"text":" جهان"}\n\n','data: [DONE]\n\n']),e=>events.push(e));expect(result).toBe('سلام جهان');expect(events).toHaveLength(2);
});
test('dropped, empty and provider-error streams cannot become successful outputs',async()=>{
 await expect(consumeToolStream(response(['data: {"text":"partial"}\n\n']),()=>{})).rejects.toThrow('STREAM_INTERRUPTED');
 await expect(consumeToolStream(response(['data: [DONE]\n\n']),()=>{})).rejects.toThrow('EMPTY_RESULT');
 await expect(consumeToolStream(response(['data: {"error":"provider failed"}\n\n']),()=>{})).rejects.toThrow('provider failed');
});
