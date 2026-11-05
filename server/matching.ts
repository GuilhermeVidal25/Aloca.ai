import { z } from 'zod';

export const Requirements = z.object({
  title: z.string().trim().min(1).max(120),
  mandatory_skills: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  desired_skills: z.array(z.string().trim().min(1).max(80)).max(20),
  min_availability: z.number().int().min(1).max(100),
  start_month: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/),
  duration_months: z.number().int().min(1).max(12),
  seniority: z.string().max(60).nullable(),
}).strict();
export type Requirement = z.infer<typeof Requirements>;
export type Profile = { id: string; name: string; seniority: string; skills: string[]; months: { month: string; free: number }[]; availability?: number | null; source: 'internal' | 'external' };
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9+#]/g, '');
const aliases: Record<string, string> = { node: 'nodejs', nodejs: 'nodejs', ts: 'typescript', postgre: 'postgresql', postgres: 'postgresql', reactjs: 'react', js: 'javascript', dotnet: 'net' };
export const canonical = (s: string) => aliases[normalize(s)] ?? normalize(s);
export function monthsFor(r: Requirement) {
  const [year, month] = r.start_month.split('-').map(Number);
  return Array.from({ length: r.duration_months }, (_, i) => { const d = new Date(Date.UTC(year, month - 1 + i, 1)); return d.toISOString().slice(0, 7); });
}
export function rank(profiles: Profile[], r: Requirement) {
  const required = [...new Set(r.mandatory_skills.map(canonical))];
  return profiles.flatMap(p => {
    const skills = new Set(p.skills.map(canonical));
    if (!required.every(s => skills.has(s))) return [];
    if (r.seniority && normalize(p.seniority) !== normalize(r.seniority)) return [];
    const capacity = p.source === 'internal' ? Math.min(...p.months.map(m => m.free)) : p.availability;
    if (capacity == null || capacity < r.min_availability) return [];
    if (p.source === 'internal' && !monthsFor(r).every(m => p.months.some(x => x.month === m))) return [];
    const desired = [...new Set(r.desired_skills.map(canonical))];
    const desiredMatched = desired.filter(s => skills.has(s)).length;
    const score = desired.length ? Math.round(80 + desiredMatched / desired.length * 20) : 100;
    return [{ ...p, capacity, score, matched: r.mandatory_skills, desiredMatched,
      explanation: p.source === 'internal' ? `Atende às ${required.length} skills obrigatórias e mantém pelo menos ${capacity}% livres nos ${r.duration_months} meses solicitados.` : `Atende às ${required.length} skills obrigatórias. Disponibilidade declarada de ${capacity}%, sujeita a confirmação.` }];
  }).sort((a, b) => b.score - a.score || b.capacity - a.capacity || a.name.localeCompare(b.name)).slice(0, 5);
}
export function matchCascade(internal: Profile[], external: Profile[], r: Requirement) {
  const candidates = rank(internal, r);
  return candidates.length ? { source: 'internal', candidates } : { source: 'external', candidates: rank(external, r) };
}
