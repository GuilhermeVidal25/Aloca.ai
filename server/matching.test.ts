import test from 'node:test';
import assert from 'node:assert/strict';
import { rank, matchCascade, monthsFor, Requirements, type Profile } from './matching.ts';
const r = Requirements.parse({ title: 'Backend', mandatory_skills: ['Node.js'], desired_skills: [], min_availability: 50, start_month: '2026-11', duration_months: 3, seniority: null });
const p: Profile = { id: '1', name: 'Exemplo', seniority: 'Pleno', skills: ['Node'], source: 'internal', months: [{ month: '2026-11', free: 80 }, { month: '2026-12', free: 50 }, { month: '2027-01', free: 60 }] };
test('período cruza ano sem perder meses', () => assert.deepEqual(monthsFor(r), ['2026-11','2026-12','2027-01']));
test('aceita o limite exato e equivalência Node', () => assert.equal(rank([p], r)[0].capacity, 50));
test('média suficiente não compensa mês sem capacidade', () => assert.equal(rank([{ ...p, months: p.months.map((m, i) => ({ ...m, free: i === 1 ? 40 : 100 })) }], r).length, 0));
test('exclui skill obrigatória ausente', () => assert.equal(rank([p], { ...r, mandatory_skills: ['PostgreSQL'] }).length, 0));
test('exclui período incompleto', () => assert.equal(rank([{ ...p, months: p.months.slice(1) }], r).length, 0));
test('prioriza interno e usa externo apenas se necessário', () => { const ext: Profile = { ...p, id: '2', source: 'external', availability: 100, months: [] }; assert.equal(matchCascade([p], [ext], r).source, 'internal'); assert.equal(matchCascade([], [ext], r).candidates[0].id, '2'); });
test('talento sem disponibilidade confirmada é excluído', () => assert.equal(rank([{ ...p, source: 'external', availability: null }], r).length, 0));
test('senioridade é eliminatória e ignora acentos/caixa',()=>{
  assert.equal(rank([p],{...r,seniority:'Sênior'}).length,0);
  assert.equal(rank([{...p,seniority:'Sênior'}],{...r,seniority:'senior'}).length,1);
});
test('desejável pontua sem excluir perfil que atende às obrigatórias',()=>{
  const ranked=rank([{...p,id:'2',skills:['Node.js','Docker']},p],{...r,desired_skills:['Docker']});
  assert.equal(ranked.length,2);assert.equal(ranked[0].id,'2');assert.equal(ranked[0].score,100);assert.equal(ranked[1].score,80);
});
test('capacidade desempata; resultado limita a cinco sem duplicar equivalências',()=>{
  const profiles=Array.from({length:8},(_,i)=>({...p,id:String(i),name:'Perfil '+i,months:p.months.map(m=>({...m,free:60+i}))}));
  const ranked=rank(profiles,{...r,mandatory_skills:['Node','Node.js']});assert.equal(ranked.length,5);assert.equal(ranked[0].id,'7');assert.equal(ranked[0].explanation.startsWith('Atende às 1 skills'),true);
});
test('sobre-alocação e ausência total de planejamento são inelegíveis',()=>{
  assert.equal(rank([{...p,months:p.months.map(m=>({...m,free:-10}))}],r).length,0);
  assert.equal(rank([{...p,months:[]}],r).length,0);
});
test('contrato rejeita pedido vazio, meses inválidos e campos não previstos',()=>{
  for(const value of [{...r,mandatory_skills:[]},{...r,min_availability:0},{...r,start_month:'2026-13'},{...r,duration_months:13},{...r,force:true}])assert.equal(Requirements.safeParse(value).success,false);
});
