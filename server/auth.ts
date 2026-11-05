import express from 'express';
import type {Pool} from 'pg';
import {randomBytes,randomUUID,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {z} from 'zod';
import {ApiError} from './errors.ts';

const scrypt=promisify(rawScrypt);
export type Role='TI'|'GP'|'ADMIN';
export type Actor={id:string;name:string;email:string;role:Role};
declare global {namespace Express {interface Request {actor?:Actor}}}
const roles=z.enum(['TI','GP','ADMIN']);
const credentials=z.object({email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(12).max(128)}).strict();
const registration=credentials.extend({name:z.string().trim().min(2).max(100),role:roles});
const userColumns='id,name,email,role';
const tokenHash=(s:string)=>createHash('sha256').update(s).digest('hex');
function cookieToken(req:express.Request){return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('aloca_session='))?.slice('aloca_session='.length)||'';}
export async function passwordHash(password:string){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return salt+':'+hash.toString('hex');}
export async function passwordMatches(password:string,stored:string){const [salt,key]=stored.split(':');if(!salt||!key||key.length!==128)return false;const actual=await scrypt(password,salt,64) as Buffer;return timingSafeEqual(actual,Buffer.from(key,'hex'));}

export async function createSecurity(db:Pool){
  await db.query(`CREATE SCHEMA IF NOT EXISTS "AlocaAI";
    CREATE TABLE IF NOT EXISTS "AlocaAI".users(id uuid PRIMARY KEY,name text NOT NULL,email text NOT NULL UNIQUE,password_hash text NOT NULL,role text NOT NULL CHECK(role IN ('TI','GP','ADMIN')),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS "AlocaAI".sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES "AlocaAI".users(id),expires_at timestamptz NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON "AlocaAI".sessions(expires_at);
    CREATE TABLE IF NOT EXISTS "AlocaAI".access_audit(id uuid PRIMARY KEY,actor_id uuid REFERENCES "AlocaAI".users(id),action text NOT NULL,target_id text,created_at timestamptz NOT NULL DEFAULT now());`);
  const router=express.Router();
  const audit=async(actor:Actor,action:string,target?:string)=>{await db.query('INSERT INTO "AlocaAI".access_audit(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)',[randomUUID(),actor.id,action,target||null]);};
  async function current(req:express.Request){const token=cookieToken(req);if(!token)return undefined;const r=await db.query(`SELECT u.id,u.name,u.email,u.role FROM "AlocaAI".sessions s JOIN "AlocaAI".users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`,[tokenHash(token)]);return r.rows[0] as Actor|undefined;}
  async function session(res:express.Response,user:Actor,secure:boolean){const token=randomBytes(32).toString('hex');await db.query('INSERT INTO "AlocaAI".sessions VALUES($1,$2,now()+interval \'8 hours\')',[tokenHash(token),user.id]);res.cookie('aloca_session',token,{httpOnly:true,sameSite:'strict',secure,maxAge:8*60*60*1000,path:'/'});}
  async function requireActor(req:express.Request,_res:express.Response,next:express.NextFunction){try{req.actor=await current(req);if(!req.actor)throw new ApiError(401,'AUTH_REQUIRED','Entre com sua conta para acessar a plataforma.');next();}catch(e){next(e);}}
  function requireRoles(...allowed:Role[]){return (req:express.Request,_res:express.Response,next:express.NextFunction)=>{if(!req.actor||!allowed.includes(req.actor.role))return next(new ApiError(403,'FORBIDDEN','Seu perfil não permite esta ação.'));next();};}
  router.get('/session',async(req,res)=>{const count=await db.query('SELECT count(*) FROM "AlocaAI".users');res.json({user:await current(req)||null,setupRequired:Number(count.rows[0].count)===0});});
  router.post('/setup',async(req,res)=>{
    const input=registration.omit({role:true}).parse(req.body);const hash=await passwordHash(input.password);const client=await db.connect();let user:Actor;
    try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(247031,2)');const count=await client.query('SELECT count(*) FROM "AlocaAI".users');if(Number(count.rows[0].count)!==0)throw new ApiError(409,'SETUP_FINISHED','O administrador inicial já foi configurado. Solicite uma conta ao administrador.');const r=await client.query(`INSERT INTO "AlocaAI".users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'ADMIN') RETURNING ${userColumns}`,[randomUUID(),input.name,input.email,hash]);user=r.rows[0];await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    await session(res,user!,req.secure);await audit(user!,'bootstrap_admin',user!.id);res.status(201).json({user:user!});
  });
  const failures=new Map<string,{count:number;until:number}>();
  router.post('/login',async(req,res)=>{
    const input=credentials.parse(req.body);const key=(req.ip||'local')+':'+input.email;const state=failures.get(key);if(state&&state.until>Date.now()&&state.count>=5)throw new ApiError(429,'LOGIN_RATE_LIMITED','Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.');
    const r=await db.query('SELECT * FROM "AlocaAI".users WHERE email=$1 AND active',[input.email]);const row=r.rows[0];
    const dummy='00000000000000000000000000000000:'+('00'.repeat(64));const valid=await passwordMatches(input.password,row?.password_hash||dummy);
    if(!row||!valid){failures.set(key,{count:state&&state.until>Date.now()?state.count+1:1,until:Date.now()+15*60*1000});throw new ApiError(401,'INVALID_CREDENTIALS','E-mail ou senha inválidos.');}
    failures.delete(key);const user:Actor={id:row.id,name:row.name,email:row.email,role:row.role};await session(res,user,req.secure);await audit(user,'login');res.json({user});
  });
  router.post('/logout',async(req,res)=>{const token=cookieToken(req);if(token)await db.query('DELETE FROM "AlocaAI".sessions WHERE token_hash=$1',[tokenHash(token)]);res.clearCookie('aloca_session',{httpOnly:true,sameSite:'strict',path:'/'});res.json({ok:true});});
  router.get('/users',requireActor,requireRoles('ADMIN'),async(_req,res)=>{res.json((await db.query(`SELECT ${userColumns},active FROM "AlocaAI".users ORDER BY created_at`)).rows);});
  router.post('/users',requireActor,requireRoles('ADMIN'),async(req,res)=>{
    const input=registration.parse(req.body);try{const r=await db.query(`INSERT INTO "AlocaAI".users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING ${userColumns}`,[randomUUID(),input.name,input.email,await passwordHash(input.password),input.role]);await audit(req.actor!,'create_user',r.rows[0].id);res.status(201).json(r.rows[0]);}catch(e){if((e as any).code==='23505')throw new ApiError(409,'EMAIL_EXISTS','Já existe uma conta com esse e-mail.');throw e;}
  });
  router.patch('/users/:id',requireActor,requireRoles('ADMIN'),async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);const input=z.object({role:roles,active:z.boolean()}).strict().parse(req.body);
    if(id===req.actor!.id&&(input.role!=='ADMIN'||!input.active))throw new ApiError(409,'SELF_ACCESS_CHANGE','Você não pode remover seu próprio acesso administrativo.');
    const r=await db.query(`UPDATE "AlocaAI".users SET role=$2,active=$3 WHERE id=$1 RETURNING ${userColumns},active`,[id,input.role,input.active]);if(!r.rowCount)throw new ApiError(404,'USER_NOT_FOUND','Usuário não encontrado.');await db.query('DELETE FROM "AlocaAI".sessions WHERE user_id=$1',[id]);await audit(req.actor!,'update_user',id);res.json(r.rows[0]);
  });
  router.get('/audit',requireActor,requireRoles('ADMIN'),async(_req,res)=>{res.json((await db.query('SELECT a.id,a.action,a.target_id,a.created_at,u.name AS actor FROM "AlocaAI".access_audit a LEFT JOIN "AlocaAI".users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100')).rows);});
  return {router,requireActor,requireRoles,audit};
}
export type Security=Awaited<ReturnType<typeof createSecurity>>;
