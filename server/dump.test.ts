import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { dumpProfiles } from './dump.ts';
import { internalProfiles,externalProfiles,getPool } from './database.ts';

test('Snapshot: relações, exclusão de inativos, somatório e competência sem cobertura',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'aloca-dump-'));const old=process.env.SQL_DUMP_PATH;
  const table=(name:string,cols:string,rows:string[])=>`COPY "InHire".${name} (${cols}) FROM stdin;\n${rows.join('\n')}\n\\.\n`;
  const fixture=table('dominios','id, descricao, valor_dominio',['1\tPleno\tPLENO'])+
    table('skills','id, nome_skill, status, deletado',['1\tNode.js\tt\tf','2\tAntiga\tf\tf'])+
    table('colaboradores','id, nome_abreviado, id_senioridade, status, deletado',['1\tPerfil\\tTeste\t1\tt\tf','2\tInativo\t1\tf\tf'])+
    table('talentos','id, nome_abreviado, id_senioridade, disponibilidade_informada_percentual, status',['3\tExterno\t1\t75\tt','4\tSem capacidade\t1\t\\N\tt'])+
    table('colaborador_skills','id_colaborador, id_skill, status, deletado',['1\t1\tt\tf','1\t2\tt\tf'])+
    table('talento_skills','id_talento, id_skill',['3\t1','4\t1'])+
    table('alocacoes','id, id_colaborador, status, deletado',['10\t1\tt\tf','11\t1\tt\tf'])+
    table('planejamentos','id_alocacao, mes, ano, porcentagem, status, deletado',['10\tNov\t2026\t20\tt\tf','11\tNov\t2026\t30\tt\tf','11\tNov\t2026\t80\tf\tf']);
  const path=join(dir,'fixture.sql');writeFileSync(path,fixture);process.env.SQL_DUMP_PATH=path;
  const r={title:'Teste',mandatory_skills:['Node.js'],desired_skills:[],min_availability:50,start_month:'2026-11',duration_months:1,seniority:null};
  try{
    const internal=dumpProfiles(r,'internal');assert.equal(internal.length,1);assert.equal(internal[0].months[0].free,50);assert.deepEqual(internal[0].skills,['Node.js']);assert.equal(internal[0].name,'Perfil\tTeste');
    const external=dumpProfiles(r,'external');assert.equal(external[0].availability,75);assert.equal(external[1].availability,null);
    assert.deepEqual(await internalProfiles(r),internal);assert.deepEqual(await externalProfiles(r),external);
    assert.throws(()=>dumpProfiles({...r,start_month:'2026-12'},'internal'),(e:any)=>e.status===422);
    const oldUrl=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
    try{assert.throws(()=>getPool(),(e:any)=>e.status===503);}finally{if(oldUrl)process.env.DATABASE_URL=oldUrl;}
  }finally{if(old)process.env.SQL_DUMP_PATH=old;else delete process.env.SQL_DUMP_PATH;rmSync(dir,{recursive:true,force:true});}
});
