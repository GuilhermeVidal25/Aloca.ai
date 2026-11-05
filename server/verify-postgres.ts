import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getPool, internalProfiles, externalProfiles } from './database.ts';
import { dumpProfiles } from './dump.ts';
import { rank, Requirements } from './matching.ts';
import { PostgresStore, type Search } from './storage.ts';

const envFile=process.env.ALOCA_ENV_FILE || resolve('.env.local');
if(existsSync(envFile))process.loadEnvFile(envFile);
const db=getPool();const store=new PostgresStore(db);const ids: string[]=[];
try {
  await store.init(process.env.LEGACY_HISTORY_PATH || resolve('data/history.json'));
  const before=(await store.history()).searches.map(s=>s.id);
  await store.init(process.env.LEGACY_HISTORY_PATH || resolve('data/history.json'));
  assert.deepEqual((await store.history()).searches.map(s=>s.id),before);
  console.log('Migração e importação idempotentes: OK');
  delete process.env.SQL_DUMP_PATH;
  for(const scenario of [{title:'Backend',mandatory_skills:['Node.js','TypeScript','PostgreSQL'],min_availability:50},{title:'Contingência',mandatory_skills:['Delphi','C#'],min_availability:100}]) {
    const r=Requirements.parse({...scenario,desired_skills:[],start_month:'2026-11',duration_months:3,seniority:null});
    const actual=rank(await internalProfiles(r),r);const external=actual.length?[]:rank(await externalProfiles(r),r);
    process.env.SQL_DUMP_PATH=resolve('challenge/db/01-hackathon.sql');
    const expected=rank(dumpProfiles(r,'internal'),r);const expectedExt=expected.length?[]:rank(dumpProfiles(r,'external'),r);delete process.env.SQL_DUMP_PATH;
    const summarize=(ps:typeof actual)=>ps.map(p=>({id:p.id,capacity:p.capacity,score:p.score,months:p.months}));
    assert.deepEqual(summarize(actual),summarize(expected));assert.deepEqual(summarize(external),summarize(expectedExt));
    assert.ok(actual.length+external.length>0);
    console.log(`${r.title}: PostgreSQL e dump equivalentes; origem ${actual.length?'interna':'externa'}; ${actual.length+external.length} candidatos`);
    const search:Search={id:randomUUID(),createdAt:new Date().toISOString(),requirements:r,source:actual.length?'internal':'external',candidates:actual.length?actual:external,elapsedMs:0};ids.push(search.id);
    await store.saveSearch(search);assert.equal((await new PostgresStore(db).search(search.id))?.id,search.id);
    const candidate=search.candidates[0];
    const calls=await Promise.all(Array.from({length:6},()=>store.saveAllocation({id:randomUUID(),searchId:search.id,candidateId:candidate.id,name:candidate.name,source:candidate.source,createdAt:new Date().toISOString(),status:'pending'})));
    assert.equal(calls.filter(c=>c.created).length,1);assert.equal(new Set(calls.map(c=>c.allocation.id)).size,1);
    console.log('Persistência e unicidade com seis pedidos concorrentes: OK');
  }
  const count=await db.query('SELECT (SELECT count(*) FROM "InHire".colaboradores) AS internos,(SELECT count(*) FROM "InHire".talentos) AS talentos');
  assert.equal(count.rows[0].internos,'279');assert.equal(count.rows[0].talentos,'300');
  console.log('Base original preservada: OK');
} finally {
  // Apenas registros criados por esta verificação, identificados pelos UUIDs acima.
  for(const id of ids){await db.query('DELETE FROM "AlocaAI".allocation_requests WHERE search_id=$1',[id]);await db.query('DELETE FROM "AlocaAI".searches WHERE id=$1',[id]);}
  await db.end();
}
