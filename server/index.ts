import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPool, internalProfiles, externalProfiles } from './database.ts';
import { readDump } from './dump.ts';
import { createApi } from './app.ts';
import { FileStore, PostgresStore } from './storage.ts';
import { parseRequirements, aiStatus } from './ai.ts';

const envFile=process.env.ALOCA_ENV_FILE || resolve('.env.local');
if(existsSync(envFile))process.loadEnvFile(envFile);
const snapshot=Boolean(process.env.SQL_DUMP_PATH);
const legacyPath=resolve('data/history.json');
const store=snapshot?new FileStore(legacyPath):new PostgresStore(getPool());
if(store instanceof PostgresStore)await store.init(legacyPath);
else readDump();
const app=createApi({store,internal:internalProfiles,external:externalProfiles,parse:parseRequirements,status:async()=>{
  let database=false;
  try{if(snapshot)readDump();else await getPool().query('SELECT 1 FROM "InHire".colaboradores LIMIT 1');database=true;}catch{}
  return {database,source:snapshot?'dump':'postgres',persistence:snapshot?'file':'postgres',...aiStatus()};
}});
if(process.env.NODE_ENV==='production'){app.use(express.static(resolve('dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));}
else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const server=app.listen(Number(process.env.PORT || 3000),'127.0.0.1',()=>console.log(`Aloca.ai disponível em http://localhost:${process.env.PORT || 3000} · fonte: ${snapshot?'SQL snapshot':'PostgreSQL'}`));
async function close(){server.close();if(!snapshot)await getPool().end();process.exit(0);}
process.once('SIGINT',close);process.once('SIGTERM',close);
