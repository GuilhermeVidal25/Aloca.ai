import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const env={...process.env};
// Node lê a mesma configuração dotenv no Windows, Linux e macOS.
if(existsSync(join(root,'.env.runtime'))){process.loadEnvFile(join(root,'.env.runtime'));Object.assign(env,process.env);}
env.ALOCA_ENV_FILE ||= join(root,'.env.local');
if(process.argv.includes('--snapshot'))env.SQL_DUMP_PATH=join(root,'challenge','db','01-hackathon.sql');
else{
  delete env.SQL_DUMP_PATH;
  if(!process.argv.includes('--no-docker')){
    const docker=spawnSync('docker',['compose','up','-d','--wait'],{cwd:root,stdio:'inherit',env});
    if(docker.error || docker.status!==0){console.error('Não foi possível iniciar o PostgreSQL. Confira Docker e os arquivos da base em challenge/.');process.exit(1);}
  }
}
if(process.argv.includes('--production'))env.NODE_ENV='production';
const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:root,stdio:'inherit',env});
child.once('error',()=>{console.error('Não foi possível iniciar o servidor. Execute npm ci e tente novamente.');process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(!child.killed)child.kill(signal);});
child.once('exit',code=>{process.exitCode=code??0;});
