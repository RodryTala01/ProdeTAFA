import {describe,expect,it,vi} from 'vitest';
import {dispatchPromiedosRefresh} from '../worker/promiedos-dispatch';

describe('Cloudflare -> GitHub Promiedos dispatch',()=>{
  it('no dispara GitHub cuando no hay trabajo',async()=>{
    const fetcher=vi.fn();
    await expect(dispatchPromiedosRefresh({days:[],games:[]},'token',fetcher as any))
      .resolves.toEqual({dispatched:false,reason:'no-work'});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('dispara workflow_dispatch en main sin exponer el token',async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({workflow_run_id:1}),{status:200}));
    await expect(dispatchPromiedosRefresh({days:['2026-10-27'],games:['abc']},'secret-token',fetcher as any))
      .resolves.toEqual({dispatched:true,reason:'work'});
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url,init]=fetcher.mock.calls[0] as any;
    expect(url).toContain('/actions/workflows/promiedos-cache.yml/dispatches');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer secret-token');
    expect(JSON.parse(init.body)).toEqual({ref:'main'});
  });

  it('falla cerrado si falta secreto o GitHub rechaza el dispatch',async()=>{
    await expect(dispatchPromiedosRefresh({days:[],games:['abc']},undefined,vi.fn() as any))
      .rejects.toThrow(/GITHUB_ACTIONS_TOKEN/);
    const fetcher=vi.fn(async()=>new Response('forbidden',{status:403}));
    await expect(dispatchPromiedosRefresh({days:[],games:['abc']},'bad',fetcher as any))
      .rejects.toThrow(/HTTP 403/);
  });
});
