import { readFileSync } from 'node:fs';
import { monthsFor, type Requirement, type Profile } from './matching.ts';
type Row = Record<string, string | null>;
let cached: Record<string, Row[]> | undefined;
const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export function readDump() {
  if (cached) return cached;
  const sql = readFileSync(process.env.SQL_DUMP_PATH!, 'utf8');
  const tables: Record<string, Row[]> = {};
  for (const m of sql.matchAll(/COPY "InHire"\.(\w+) \((.*?)\) FROM stdin;\r?\n([\s\S]*?)\r?\n\\\./g)) {
    const cols = m[2].split(', ');
    tables[m[1]] = m[3].split(/\r?\n/).map(line => Object.fromEntries(line.split('\t').map((v, i) => [cols[i], v === '\\N' ? null : v.replace(/\\([\\tnr])/g, (_, c) => ({ t: '\t', n: '\n', r: '\r', '\\': '\\' })[c as 't'])])));
  }
  if (!tables.colaboradores || !tables.planejamentos || !tables.talentos) throw new Error('Arquivo SQL inválido ou incompleto.');
  return cached = tables;
}
const active = (r: Row) => r.status === 't' && r.deletado !== 't';
export function dumpProfiles(r: Requirement, source: 'internal' | 'external'): Profile[] {
  const t = readDump();
  const domains = new Map(t.dominios.map(d => [d.id, d.descricao || d.valor_dominio]));
  const skills = new Map(t.skills.filter(active).map(s => [s.id, s.nome_skill!]));
  const links = source === 'internal' ? t.colaborador_skills.filter(active) : t.talento_skills;
  const months = monthsFor(r);
  const plans = t.planejamentos.filter(active);
  const key = (p: Row) => `${p.ano}-${String(monthNames.indexOf(p.mes!) + 1).padStart(2,'0')}`;
  if (source === 'internal' && months.some(m => !plans.some(p => key(p) === m))) throw Object.assign(new Error('Não há planejamento em todos os meses solicitados. Revise o período.'), { status: 422 });
  const allocations = new Map(t.alocacoes.filter(active).map(a => [a.id, a.id_colaborador]));
  const totals = new Map<string, number>();
  for (const p of plans) { const person = allocations.get(p.id_alocacao); if (!person) continue; const k = person + ':' + key(p); totals.set(k, (totals.get(k) || 0) + Number(p.porcentagem)); }
  return (source === 'internal' ? t.colaboradores : t.talentos).filter(active).map(p => ({ id: p.id!, name: p.nome_abreviado!, seniority: domains.get(p.id_senioridade) || '',
    skills: links.filter(s => (s.id_colaborador || s.id_talento) === p.id).map(s => skills.get(s.id_skill)).filter((s): s is string => Boolean(s)),
    months: source === 'internal' ? months.map(month => ({ month, free: 100 - (totals.get(p.id + ':' + month) || 0) })) : [],
    availability: p.disponibilidade_informada_percentual == null ? null : Number(p.disponibilidade_informada_percentual), source }));
}
