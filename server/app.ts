import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Requirements, rank, type Requirement, type Profile } from './matching.ts';
import type { Store, Search } from './storage.ts';
import { ApiError } from './errors.ts';

export interface Dependencies {
  store: Store;
  internal(r: Requirement): Promise<Profile[]>;
  external(r: Requirement): Promise<Profile[]>;
  parse(message: string): Promise<Requirement>;
  status(): Promise<Record<string, unknown>>;
}
export function createApi(deps: Dependencies) {
  const app=express();app.disable('x-powered-by');
  app.use('/api',(req,res,next)=>{
    res.setHeader('X-Request-Id',randomUUID());res.setHeader('Cache-Control','no-store');
    const origin=req.get('origin');
    if(origin && origin!==`http://${req.get('host')}` && origin!==`https://${req.get('host')}`)return next(new ApiError(403,'ORIGIN_FORBIDDEN','Origem não permitida.'));
    next();
  });
  app.use(express.json({limit:'20kb'}));
  app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
  app.get('/api/status',async(_req,res)=>res.json(await deps.status()));
  app.get('/api/history',async(_req,res)=>res.json(await deps.store.history()));
  app.post('/api/chat/parse',async(req,res)=>{
    const {message}=z.object({message:z.string().trim().min(10).max(6000)}).strict().parse(req.body);
    res.json(await deps.parse(message));
  });
  app.post('/api/chat/match',async(req,res)=>{
    const requirements=Requirements.parse(req.body);const start=performance.now();
    const internal=rank(await deps.internal(requirements),requirements);
    const candidates=internal.length?internal:rank(await deps.external(requirements),requirements);
    const search: Search={id:randomUUID(),createdAt:new Date().toISOString(),requirements,source:internal.length?'internal':'external',candidates,elapsedMs:Math.round(performance.now()-start)};
    await deps.store.saveSearch(search);res.json(search);
  });
  app.post('/api/allocations/request',async(req,res)=>{
    const {searchId,candidateId}=z.object({searchId:z.string().uuid(),candidateId:z.string().min(1).max(30)}).strict().parse(req.body);
    const search=await deps.store.search(searchId);const candidate=search?.candidates.find(c=>c.id===candidateId);
    if(!search||!candidate)throw new ApiError(404,'RECOMMENDATION_NOT_FOUND','Recomendação não encontrada. Faça uma nova consulta.');
    const existing=await deps.store.allocation(searchId,candidateId);
    if(existing){res.json(existing);return;}
    const fresh=candidate.source==='internal'?await deps.internal(search.requirements):await deps.external(search.requirements);
    if(!rank(fresh.filter(p=>p.id===candidateId),search.requirements).length)throw new ApiError(409,'CAPACITY_CHANGED','A disponibilidade ou a elegibilidade mudou. Consulte os candidatos novamente.');
    const result=await deps.store.saveAllocation({id:randomUUID(),searchId,candidateId,name:candidate.name,source:candidate.source,createdAt:new Date().toISOString(),status:'pending'});
    res.status(result.created?201:200).json(result.allocation);
  });
  app.use('/api',(_req,_res,next)=>next(new ApiError(404,'NOT_FOUND','Rota não encontrada.')));
  app.use((err: unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    const requestId=res.getHeader('X-Request-Id');
    if(err instanceof z.ZodError){res.status(422).json({code:'VALIDATION_ERROR',error:'Revise os critérios: skills, dedicação de 1 a 100%, início e duração de 1 a 12 meses.',fields:err.issues.map(i=>({path:i.path.join('.'),message:i.message})),requestId});return;}
    if(err instanceof ApiError){res.status(err.status).json({code:err.code,error:err.message,requestId});return;}
    const e=err as {status?:number;type?:string;message?:string;name?:string;code?:string};
    if(e.type==='entity.parse.failed'){res.status(400).json({code:'INVALID_JSON',error:'O corpo da solicitação deve conter JSON válido.',requestId});return;}
    if(e.type==='entity.too.large'){res.status(413).json({code:'PAYLOAD_TOO_LARGE',error:'A solicitação excede o tamanho permitido.',requestId});return;}
    if(e.status===422){res.status(422).json({code:'PERIOD_NOT_COVERED',error:e.message,requestId});return;}
    if(e.name==='TimeoutError'){res.status(504).json({code:'UPSTREAM_TIMEOUT',error:'A interpretação demorou além do esperado. Tente novamente ou use os critérios manuais.',requestId});return;}
    console.error(JSON.stringify({requestId,code:e.code || 'INTERNAL_ERROR'}));
    res.status(503).json({code:'SERVICE_UNAVAILABLE',error:'Não foi possível concluir a operação. Verifique a conexão com o banco e tente novamente.',requestId});
  });
  return app;
}
