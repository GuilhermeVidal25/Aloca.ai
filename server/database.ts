import pg from 'pg';
import { monthsFor, type Requirement, type Profile } from './matching.ts';
import { dumpProfiles } from './dump.ts';

let pool: pg.Pool | undefined;
export function getPool() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error('A base do desafio ainda não foi conectada. Configure DATABASE_URL no servidor.'), { status: 503 });
  return pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 4000, max: 4, statement_timeout: 10000 });
}
export async function internalProfiles(r: Requirement): Promise<Profile[]> {
  if (process.env.SQL_DUMP_PATH) return dumpProfiles(r, 'internal');
  const db = getPool();
  const months = monthsFor(r);
  // Sem planejamento na competência, não há evidência de disponibilidade.
  const coverage = await db.query(`SELECT DISTINCT ano, mes FROM "InHire".planejamentos WHERE status AND NOT deletado`);
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const covered = new Set(coverage.rows.map(x => `${x.ano}-${String(names.indexOf(x.mes) + 1).padStart(2, '0')}`));
  if (months.some(m => !covered.has(m))) throw Object.assign(new Error('Não há planejamento em todos os meses solicitados. Revise o período; não podemos confirmar capacidade sem esses dados.'), { status: 422 });
  const result = await db.query(`SELECT c.id::text, c.nome_abreviado AS name, d.descricao AS seniority,
    coalesce((SELECT json_agg(s.nome_skill) FROM "InHire".colaborador_skills cs JOIN "InHire".skills s ON s.id=cs.id_skill WHERE cs.id_colaborador=c.id AND cs.status AND NOT cs.deletado AND s.status AND NOT s.deletado),'[]') AS skills,
    (SELECT json_agg(json_build_object('month',to_char(k.dt,'YYYY-MM'),'free',100-coalesce((SELECT sum(p.porcentagem) FROM "InHire".planejamentos p JOIN "InHire".alocacoes a ON a.id=p.id_alocacao WHERE a.id_colaborador=c.id AND a.status AND NOT a.deletado AND p.status AND NOT p.deletado AND p.ano=extract(year FROM k.dt) AND p.mes=(ARRAY['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month FROM k.dt)::int]),0)) ORDER BY k.dt) FROM generate_series($1::date, $2::date, interval '1 month') k(dt)) AS months
    FROM "InHire".colaboradores c LEFT JOIN "InHire".dominios d ON d.id=c.id_senioridade WHERE c.status AND NOT c.deletado`, [months[0] + '-01', months.at(-1) + '-01']);
  return result.rows.map(p => ({ ...p, source: 'internal' }));
}
export async function externalProfiles(r?: Requirement): Promise<Profile[]> {
  if (process.env.SQL_DUMP_PATH && r) return dumpProfiles(r, 'external');
  const result = await getPool().query(`SELECT t.id::text,t.nome_abreviado AS name,d.descricao AS seniority,t.disponibilidade_informada_percentual AS availability,
    coalesce((SELECT json_agg(s.nome_skill) FROM "InHire".talento_skills ts JOIN "InHire".skills s ON s.id=ts.id_skill WHERE ts.id_talento=t.id AND s.status AND NOT s.deletado),'[]') AS skills
    FROM "InHire".talentos t LEFT JOIN "InHire".dominios d ON d.id=t.id_senioridade WHERE t.status`);
  return result.rows.map(p => ({ ...p, months: [], source: 'external' }));
}
