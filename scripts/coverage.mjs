import { spawnSync } from 'node:child_process';
const args=process.argv.slice(2);
const result=spawnSync(process.execPath,['node_modules/c8/bin/c8.js','node','--import','tsx','--test','server/*.test.ts'],{stdio:'inherit',env:{...process.env,...(args.includes('--postgres')?{RUN_POSTGRES_TESTS:'1'}:{})}});
if(result.error)console.error('Não foi possível executar a cobertura. Execute npm ci.');
process.exitCode=result.status??1;
