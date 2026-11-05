import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi, type Dependencies } from './app.ts';
import { FileStore } from './storage.ts';
import { ApiError } from './errors.ts';
import type { Profile } from './matching.ts';

const requirements={title:'Teste de backend',mandatory_skills:['Node.js'],desired_skills:[],min_availability:50,start_month:'2026-11',duration_months:1,seniority:null};
const person: Profile={id:'42',name:'Perfil de teste',seniority:'Pleno',skills:['Node.js'],source:'internal',months:[{month:'2026-11',free:60}]};
async function setup(t: any, overrides: Partial<Dependencies>={}) {
  const directory=mkdtempSync(join(tmpdir(),'aloca-api-'));const path=join(directory,'history.json');const store=new FileStore(path);
  const app=createApi({store,internal:async()=>[person],external:async()=>[],parse:async()=>requirements,status:async()=>({database:true}),...overrides});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  t.after(async()=>{await new Promise<void>((r,e)=>server.close(x=>x?e(x):r()));rmSync(directory,{recursive:true,force:true});});
  const address=server.address() as {port:number};
  const request=async(route:string,body?:unknown)=>{const res=await fetch(`http://127.0.0.1:${address.port}/api/${route}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);return {status:res.status,data:await res.json()};};
  return {request,path,store,base:`http://127.0.0.1:${address.port}/api/`};
}
test('HTTP: inválidos retornam 422 sem consultar bases',async t=>{
  const {request}=await setup(t,{internal:async()=>{assert.fail('não deve consultar');}});
  const r=await request('chat/match',{...requirements,min_availability:101});assert.equal(r.status,422);assert.equal(r.data.code,'VALIDATION_ERROR');assert.ok(r.data.requestId);
});
test('HTTP: interno elegível interrompe a cascata e persiste consulta',async t=>{
  const {request,path}=await setup(t,{external:async()=>{assert.fail('não deve consultar talentos');}});
  const r=await request('chat/match',requirements);assert.equal(r.status,200);assert.equal(r.data.source,'internal');
  assert.equal((await new FileStore(path).history()).searches[0].id,r.data.id);
});
test('HTTP: ausência de interno consulta externo',async t=>{
  const {request}=await setup(t,{internal:async()=>[],external:async()=>[{...person,source:'external',availability:80,months:[]}]});
  const r=await request('chat/match',requirements);assert.equal(r.data.source,'external');assert.equal(r.data.candidates.length,1);
});
test('HTTP: falha do SGD nunca vira ausência de candidatos',async t=>{
  const {request}=await setup(t,{internal:async()=>{throw new Error('falha de conexão');},external:async()=>{assert.fail('fallback indevido');}});
  const r=await request('chat/match',requirements);assert.equal(r.status,503);assert.equal(r.data.code,'SERVICE_UNAVAILABLE');
});
test('HTTP: confirma elegibilidade novamente antes de registrar',async t=>{
  let available=true;const {request}=await setup(t,{internal:async()=>available?[person]:[]});
  const search=await request('chat/match',requirements);available=false;
  const r=await request('allocations/request',{searchId:search.data.id,candidateId:person.id});assert.equal(r.status,409);assert.equal(r.data.code,'CAPACITY_CHANGED');
});
test('HTTP: chamadas concorrentes registram um único pedido',async t=>{
  const {request}=await setup(t);const search=await request('chat/match',requirements);
  const requests=await Promise.all(Array.from({length:5},()=>request('allocations/request',{searchId:search.data.id,candidateId:person.id})));
  assert.equal(new Set(requests.map(r=>r.data.id)).size,1);assert.equal(requests.filter(r=>r.status===201).length,1);
  const h=await request('history');assert.equal(h.data.allocations.length,1);assert.equal(h.data.allocations[0].status,'pending');
});
test('HTTP: candidato não recomendado não pode ser solicitado',async t=>{
  const {request}=await setup(t);const search=await request('chat/match',requirements);
  assert.equal((await request('allocations/request',{searchId:search.data.id,candidateId:'999'})).status,404);
});
test('HTTP: erros de IA informam quota sem esconder a causa',async t=>{
  const {request}=await setup(t,{parse:async()=>{throw new ApiError(503,'AI_QUOTA_EXHAUSTED','Sem saldo de API.');}});
  const r=await request('chat/parse',{message:'Preciso de Node.js'});assert.equal(r.status,503);assert.equal(r.data.code,'AI_QUOTA_EXHAUSTED');
});
test('HTTP: JSON inválido e origem externa são rejeitados',async t=>{
  const {base}=await setup(t);
  const invalid=await fetch(base+'chat/match',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(invalid.status,400);assert.equal((await invalid.json()).code,'INVALID_JSON');
  const foreign=await fetch(base+'history',{headers:{Origin:'https://untrusted.example'}});assert.equal(foreign.status,403);
});
