import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEvidence,prioritizeEvidence} from './evidence.ts';
import type {Profile} from './matching.ts';
const r={title:'MVP',mandatory_skills:['Node.js'],desired_skills:['Docker'],min_availability:50,start_month:'2026-11',duration_months:3,seniority:null};
const p:Profile={id:'1',name:'Perfil de teste',seniority:'Pleno',skills:['Node.js'],source:'internal',months:[{month:'2026-11',free:100},{month:'2026-12',free:100},{month:'2027-01',free:100}]};
test('Evidência distingue skill básica, desejável ausente e capacidade inferida',()=>{
  const e=buildEvidence(p,r,{skills:[{id:'1',nome_skill:'Node.js',status:'t',deletado:'f'}],colaborador_skills:[{id_colaborador:'1',id_skill:'1',nivel_conhecimento:'BASICO',status:'t',deletado:'f'}]});
  assert.equal(e.technical[0].levels[0],'BASICO');assert.equal(e.technical[1].present,false);assert.equal(e.capacity[0].recordCount,0);assert.equal(e.gaps.length,3);assert.equal(e.productivity.status,'unavailable');assert.equal(e.productivity.ttv,null);
});
test('Experiência exige planejamento anterior: vínculo sem planejamento e projeto futuro não contam',()=>{
  const tables={dominios:[],skills:[{id:'1',nome_skill:'Node.js',status:true}],alocacoes:[{id:'10',id_colaborador:'1',id_demanda:'20',status:true},{id:'11',id_colaborador:'1',id_demanda:'21',status:true},{id:'12',id_colaborador:'1',id_demanda:'22',status:true}],demandas:[{id:'20',nome_demanda:'Projeto anterior',dt_inicio_demanda:'2026-01-01',dt_termino_demanda_prevista:'2026-03-31'},{id:'21',nome_demanda:'Sem evidência',dt_inicio_demanda:'2026-01-01',dt_termino_demanda_prevista:'2026-03-31'},{id:'22',nome_demanda:'Futuro',dt_inicio_demanda:'2027-01-01',dt_termino_demanda_prevista:'2027-03-31'}],planejamentos:[{id_alocacao:'10',ano:2026,mes:'Fev',porcentagem:50,status:true},{id_alocacao:'12',ano:2026,mes:'Fev',porcentagem:50,status:true}],demanda_skills:[{id_demanda:'20',id_skill:'1',status:true}]};
  const e=buildEvidence(p,r,tables);assert.equal(e.projects.length,1);assert.equal(e.temporal.relatedProjects,1);assert.equal(e.temporal.comparableProjects,1);assert.deepEqual(e.projects[0].plannedCompetencies,['2026-02']);assert.ok(e.temporal.basis.includes('não tempo real'));
});
test('Talento externo não recebe histórico inventado nem capacidade confirmada',()=>{
  const e=buildEvidence({...p,source:'external',availability:75,months:[]},r,{});assert.equal(e.capacity.length,0);assert.equal(e.projects.length,0);assert.equal(e.productivity.reworkRate,null);assert.ok(e.gaps.some(g=>g.includes('externo')));
});
test('Desempate usa profundidade e evidência sem atribuir nota de produtividade',()=>{
  const basic=buildEvidence(p,r,{skills:[{id:'1',nome_skill:'Node.js',status:true}],colaborador_skills:[{id_colaborador:'1',id_skill:'1',nivel_conhecimento:'BASICO',status:true}]});
  const advanced=structuredClone(basic);advanced.technical[0].levels=['AVANCADO'];
  const result=prioritizeEvidence([{name:'A',score:100,capacity:100,evidence:basic},{name:'B',score:100,capacity:60,evidence:advanced}]);assert.equal(result[0].name,'B');assert.equal(result[0].rankingEvidence.advanced,1);assert.equal(result[0].evidence.productivity.status,'unavailable');
});
