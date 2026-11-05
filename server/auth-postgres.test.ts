import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {existsSync} from 'node:fs';
import pg from 'pg';
import {createSecurity} from './auth.ts';
import {createApi} from './app.ts';
import {PostgresStore} from './storage.ts';

test('Acesso real: bootstrap único, sessões, TI isolada, GP validando e administração', {skip:process.env.RUN_POSTGRES_TESTS!=='1'},async()=>{
  const env=process.env.ALOCA_ENV_FILE||'.env.local';if(existsSync(env))process.loadEnvFile(env);
  const admin=new pg.Pool({connectionString:process.env.DATABASE_URL});const name='aloca_auth_test_'+randomBytes(6).toString('hex');await admin.query(`CREATE DATABASE "${name}"`);
  const uri=new URL(process.env.DATABASE_URL!);uri.pathname='/'+name;const db=new pg.Pool({connectionString:uri.toString()});let server:ReturnType<ReturnType<typeof createApi>['listen']>|undefined;
  const pass='Temporary-test-pass-12345';
  try{
    const store=new PostgresStore(db);await store.init();const security=await createSecurity(db);const r={title:'Backend',mandatory_skills:['Node.js'],desired_skills:[],min_availability:50,start_month:'2026-11',duration_months:1,seniority:null};
    const person={id:'42',name:'Teste de acesso',seniority:'Pleno',source:'internal' as const,skills:['Node.js'],months:[{month:'2026-11',free:70}]};
    const app=createApi({store,security,internal:async()=>[person],external:async()=>[],parse:async()=>r,status:async()=>({database:true})});server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server!.once('listening',ok));const port=(server.address() as any).port;
    const req=async(path:string,body?:unknown,cookie='',method='POST')=>{const res=await fetch(`http://127.0.0.1:${port}/api/${path}`,{method:body?method:'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||'',headers:res.headers};};
    assert.equal((await req('history')).status,401);assert.equal((await req('auth/session')).data.setupRequired,true);
    const setup=await req('auth/setup',{name:'Admin de teste',email:'admin@test.invalid',password:pass});assert.equal(setup.status,201);const ac=setup.cookie;assert.ok(setup.headers.get('set-cookie')!.includes('HttpOnly'));assert.equal(setup.data.user.role,'ADMIN');
    assert.equal((await req('auth/setup',{name:'Intruso',email:'other@test.invalid',password:pass})).status,409);
    const ti=await req('auth/users',{name:'TI teste',email:'ti@test.invalid',password:pass,role:'TI'},ac);const other=await req('auth/users',{name:'TI outro',email:'other@test.invalid',password:pass,role:'TI'},ac);const gp=await req('auth/users',{name:'GP teste',email:'gp@test.invalid',password:pass,role:'GP'},ac);assert.equal(ti.status,201);assert.equal(other.status,201);assert.equal(gp.status,201);
    assert.equal((await req('auth/users',{name:'Duplicado',email:'ti@test.invalid',password:pass,role:'TI'},ac)).status,409);
    const tc=(await req('auth/login',{email:'ti@test.invalid',password:pass})).cookie;const oc=(await req('auth/login',{email:'other@test.invalid',password:pass})).cookie;const gc=(await req('auth/login',{email:'gp@test.invalid',password:pass})).cookie;
    assert.equal((await req('auth/users',undefined,tc)).status,403);assert.equal((await req('auth/users',{name:'Escalar',email:'hack@test.invalid',password:pass,role:'ADMIN'},tc)).status,403);
    const search=await req('chat/match',r,tc);assert.equal(search.data.ownerId,ti.data.id);
    assert.equal((await req('history',undefined,oc)).data.searches.length,0);
    assert.equal((await req('allocations/request',{searchId:search.data.id,candidateId:'42'},oc)).status,403);
    assert.equal((await req('allocations/request',{searchId:search.data.id,candidateId:'42'},gc)).status,403);
    const allocation=await req('allocations/request',{searchId:search.data.id,candidateId:'42'},tc);assert.equal(allocation.status,201);
    assert.equal((await req('allocations/'+allocation.data.id+'/decision',{status:'validated',note:'Conferido no teste'},tc)).status,403);
    const decision=await req('allocations/'+allocation.data.id+'/decision',{status:'validated',note:'Conferido no teste'},gc);assert.equal(decision.data.status,'validated');assert.equal(decision.data.decision.by,'GP teste');
    assert.equal((await req('allocations/'+allocation.data.id+'/decision',{status:'declined',note:'Outra análise'},gc)).status,409);
    assert.equal((await req('auth/users/'+setup.data.user.id,{role:'TI',active:true},ac,'PATCH')).status,409);
    assert.equal((await req('auth/users/'+other.data.id,{role:'TI',active:false},ac,'PATCH')).status,200);assert.equal((await req('history',undefined,oc)).status,401);
    assert.ok((await req('auth/audit',undefined,ac)).data.some((a:any)=>a.action==='request_validated'));
    const raw=await db.query('SELECT password_hash FROM "AlocaAI".users');assert.ok(raw.rows.every(x=>!x.password_hash.includes(pass)));
    await req('auth/logout',{},tc);assert.equal((await req('history',undefined,tc)).status,401);
    for(let i=0;i<5;i++)assert.equal((await req('auth/login',{email:'ti@test.invalid',password:'Senha-incorreta-123'})).status,401);
    assert.equal((await req('auth/login',{email:'ti@test.invalid',password:pass})).status,429);
  }finally{if(server)await new Promise<void>(ok=>server!.close(()=>ok()));await db.end();await admin.query(`DROP DATABASE "${name}"`);await admin.end();}
});
