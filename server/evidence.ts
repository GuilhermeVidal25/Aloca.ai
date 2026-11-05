import {canonical,monthsFor,type Requirement,type Profile} from './matching.ts';
import {getPool} from './database.ts';
import {readDump} from './dump.ts';

type Row=Record<string,any>;
type Tables=Record<string,Row[]>;
const active=(r:Row)=>r.status===true||r.status==='t';
const live=(r:Row)=>r.deletado!==true&&r.deletado!=='t';
const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const competency=(p:Row)=>`${p.ano}-${String(months.indexOf(p.mes)+1).padStart(2,'0')}`;
const horizon=(n:number)=>n<=3?'curto':n>=6?'longo':'intermediário';

export function buildEvidence(p:Profile,r:Requirement,t:Tables){
  const domains=new Map((t.dominios||[]).map(d=>[String(d.id),d.valor_dominio||d.descricao]));
  const skills=new Map((t.skills||[]).filter(s=>active(s)&&live(s)).map(s=>[String(s.id),s.nome_skill as string]));
  const links=(p.source==='internal'?t.colaborador_skills:t.talento_skills)||[];
  const levels=links.filter(s=>String(s.id_colaborador??s.id_talento)===p.id&&(p.source==='external'||active(s)&&live(s))).map(s=>({skill:skills.get(String(s.id_skill)),level:String(s.nivel_conhecimento||domains.get(String(s.id_nivel_conhecimento))||'Não informado')})).filter(s=>s.skill);
  const technical=[...r.mandatory_skills.map(skill=>({skill,required:true})),...r.desired_skills.map(skill=>({skill,required:false}))].map(item=>{
    const found=levels.filter(s=>canonical(s.skill!)===canonical(item.skill));
    return {...item,present:found.length>0,levels:[...new Set(found.map(s=>s.level))],source:'Cadastro de skills'};
  });
  const own=(t.alocacoes||[]).filter(a=>String(a.id_colaborador)===p.id&&live(a));
  const ownIds=new Set(own.map(a=>String(a.id)));
  const plans=(t.planejamentos||[]).filter(q=>ownIds.has(String(q.id_alocacao))&&active(q)&&live(q));
  const demands=new Map((t.demandas||[]).filter(live).map(d=>[String(d.id),d]));
  const people=new Map((t.colaboradores||[]).map(c=>[String(c.id),c.nome_abreviado]));
  const capacity=monthsFor(r).map(month=>{
    const rows=plans.filter(q=>competency(q)===month&&own.some(a=>String(a.id)===String(q.id_alocacao)&&active(a)));
    const assignments=rows.map(q=>{
      const allocation=own.find(a=>String(a.id)===String(q.id_alocacao));const d=demands.get(String(allocation?.id_demanda));
      return {project:d?.nome_demanda||'Demanda sem descrição',percentage:Number(q.porcentagem),manager:people.get(String(d?.id_gerente))||'Não identificado'};
    });
    return {month,recordCount:rows.length,free:p.months.find(m=>m.month===month)?.free??null,assignments};
  });
  const start=r.start_month+'-01';
  const projectIds=[...new Set(own.map(a=>String(a.id_demanda)))];
  const projects=projectIds.flatMap(id=>{
    const d=demands.get(id);if(!d||!d.dt_inicio_demanda||String(d.dt_inicio_demanda)>=start)return [];
    const allocationIds=new Set(own.filter(a=>String(a.id_demanda)===id).map(a=>String(a.id)));
    const past=plans.filter(q=>allocationIds.has(String(q.id_alocacao))&&Number(q.porcentagem)>0&&competency(q)<r.start_month);
    if(!past.length)return [];
    const [sy,sm]=String(d.dt_inicio_demanda).slice(0,7).split('-').map(Number);const [ey,em]=String(d.dt_termino_demanda_prevista).slice(0,7).split('-').map(Number);
    const duration=(ey-sy)*12+em-sm+1;
    const requiredSkills=(t.demanda_skills||[]).filter(ds=>String(ds.id_demanda)===id&&active(ds)&&live(ds)).map(ds=>skills.get(String(ds.id_skill))).filter((s):s is string=>Boolean(s));
    const overlap=r.mandatory_skills.filter(s=>requiredSkills.some(k=>canonical(k)===canonical(s)));
    return [{id,name:String(d.nome_demanda),start:String(d.dt_inicio_demanda),plannedEnd:String(d.dt_termino_demanda_prevista),plannedMonths:duration,relatedSkills:overlap,plannedCompetencies:[...new Set(past.map(competency))].sort(),status:domains.get(String(d.id_andamento_demanda))||'Não informado',manager:people.get(String(d.id_gerente))||'Não identificado',sameHorizon:duration>0&&horizon(duration)===horizon(r.duration_months)}];
  }).sort((a,b)=>b.relatedSkills.length-a.relatedSkills.length||Number(b.sameHorizon)-Number(a.sameHorizon)||b.start.localeCompare(a.start));
  const related=projects.filter(x=>x.relatedSkills.length>0);const comparable=related.filter(x=>x.sameHorizon);
  const gaps:string[]=[];
  if(p.source==='internal'&&capacity.some(m=>m.recordCount===0))gaps.push('Há meses sem planejamento individual. A capacidade nesses meses é inferida e precisa de confirmação do GP.');
  if(technical.some(s=>s.required&&s.levels.some(l=>canonical(l)==='basico')))gaps.push('Há skill obrigatória cadastrada em nível básico; a presença no catálogo não comprova a profundidade exigida pelo projeto.');
  if(!related.length)gaps.push('Não encontramos vínculo com planejamento anterior em demandas que compartilhem a stack obrigatória.');
  if(p.source==='external')gaps.push('O banco externo não contém histórico de entregas; confirme disponibilidade e profundidade técnica em avaliação.');
  return {technical,capacity:p.source==='internal'?capacity:[],projects,temporal:{horizon:horizon(r.duration_months),relatedProjects:related.length,comparableProjects:comparable.length,basis:'Vínculos com planejamento anterior e skills exigidas na demanda; duração prevista, não tempo real de execução.',assessment:comparable.length?`${comparable.length} demanda(s) com stack relacionada e duração prevista na mesma faixa do projeto.`:'Evidência insuficiente para confirmar adaptação ao horizonte do projeto.'},productivity:{status:'unavailable',ttv:null,reworkRate:null,storyCompletionRate:null,reason:'A base não registra primeira entrega, retrabalho ou histórias concluídas. Nenhuma nota de produtividade foi calculada.'},gaps,source:'Base do desafio / InHire'};
}

export async function candidateEvidence(candidates:ReturnType<typeof import('./matching.ts').rank>,r:Requirement){
  if(!candidates.length)return candidates;
  if(process.env.SQL_DUMP_PATH){const tables=readDump();return prioritizeEvidence(candidates.map(p=>({...p,evidence:buildEvidence(p,r,tables)})));}
  const ids=candidates.map(p=>p.id);const internal=candidates[0].source==='internal';const db=getPool();
  const queries:Record<string,string>={
    dominios:'SELECT id,valor_dominio,descricao FROM "InHire".dominios',skills:'SELECT * FROM "InHire".skills',
    colaboradores:'SELECT id,nome_abreviado FROM "InHire".colaboradores',
    ...(internal?{
      colaborador_skills:'SELECT * FROM "InHire".colaborador_skills WHERE id_colaborador=ANY($1::bigint[])',
      alocacoes:'SELECT * FROM "InHire".alocacoes WHERE id_colaborador=ANY($1::bigint[])',
      planejamentos:'SELECT p.* FROM "InHire".planejamentos p JOIN "InHire".alocacoes a ON a.id=p.id_alocacao WHERE a.id_colaborador=ANY($1::bigint[])',
      demandas:'SELECT DISTINCT d.*,d.dt_inicio_demanda::text AS dt_inicio_demanda,d.dt_termino_demanda_prevista::text AS dt_termino_demanda_prevista FROM "InHire".demandas d JOIN "InHire".alocacoes a ON a.id_demanda=d.id WHERE a.id_colaborador=ANY($1::bigint[])',
      demanda_skills:'SELECT DISTINCT ds.* FROM "InHire".demanda_skills ds JOIN "InHire".alocacoes a ON a.id_demanda=ds.id_demanda WHERE a.id_colaborador=ANY($1::bigint[])',
    }:{talento_skills:'SELECT * FROM "InHire".talento_skills WHERE id_talento=ANY($1::bigint[])'})};
  const tables=Object.fromEntries(await Promise.all(Object.entries(queries).map(async([name,sql])=>[name,(await db.query(sql,sql.includes('$1')?[ids]:[])).rows])));
  return prioritizeEvidence(candidates.map(p=>({...p,evidence:buildEvidence(p,r,tables)})));
}
export function prioritizeEvidence<T extends {score:number;capacity:number;name:string;evidence:ReturnType<typeof buildEvidence>}>(items:T[]){
  const metrics=(x:T)=>({advanced:x.evidence.technical.filter(s=>s.required&&s.levels.some(l=>canonical(l)==='avancado')).length,intermediate:x.evidence.technical.filter(s=>s.required&&s.levels.some(l=>canonical(l)==='intermediario')).length,comparable:x.evidence.temporal.comparableProjects,documented:x.evidence.capacity.filter(m=>m.recordCount>0).length});
  return [...items].sort((a,b)=>{const x=metrics(a),y=metrics(b);return b.score-a.score||y.advanced-x.advanced||y.intermediate-x.intermediate||y.comparable-x.comparable||y.documented-x.documented||b.capacity-a.capacity||a.name.localeCompare(b.name);}).slice(0,5).map(p=>({...p,rankingEvidence:metrics(p)}));
}
