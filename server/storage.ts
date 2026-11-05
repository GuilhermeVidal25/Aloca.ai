import type { Pool } from 'pg';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Requirement, rank } from './matching.ts';

export type Search = { id: string; createdAt: string; requirements: Requirement; source: string; candidates: ReturnType<typeof rank>; elapsedMs: number; ownerId?:string };
export type Allocation = { id: string; searchId: string; candidateId: string; name: string; source: string; createdAt: string; status: string; ownerId?:string; decision?:{by:string;at:string;note:string} };
export interface Store {
  history(ownerId?:string): Promise<{ searches: Search[]; allocations: Allocation[] }>;
  search(id: string): Promise<Search | undefined>;
  saveSearch(search: Search): Promise<void>;
  allocation(searchId: string, candidateId: string): Promise<Allocation | undefined>;
  saveAllocation(allocation: Allocation): Promise<{ allocation: Allocation; created: boolean }>;
  allocationById?(id:string):Promise<Allocation|undefined>;
  decide?(id:string,status:'validated'|'declined',decision:NonNullable<Allocation['decision']>):Promise<Allocation|undefined>;
}
export const migration = `
CREATE SCHEMA IF NOT EXISTS "AlocaAI";
CREATE TABLE IF NOT EXISTS "AlocaAI".searches (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS searches_created_at_idx ON "AlocaAI".searches (created_at DESC);
CREATE TABLE IF NOT EXISTS "AlocaAI".allocation_requests (
  id uuid PRIMARY KEY,
  search_id uuid NOT NULL REFERENCES "AlocaAI".searches(id),
  candidate_id text NOT NULL,
  created_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  UNIQUE(search_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS requests_created_at_idx ON "AlocaAI".allocation_requests (created_at DESC);
`;

export class PostgresStore implements Store {
  constructor(private db: Pool) {}
  async init(legacyPath?: string) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      // Serializa migrações e a importação, inclusive com duas instâncias locais.
      await client.query('SELECT pg_advisory_xact_lock(247031, 1)');
      await client.query(migration);
      if (legacyPath && existsSync(legacyPath)) {
        const legacy = JSON.parse(readFileSync(legacyPath, 'utf8'));
        for (const s of legacy.searches || []) await client.query('INSERT INTO "AlocaAI".searches VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [s.id,s.createdAt,s]);
        for (const a of legacy.allocations || []) await client.query('INSERT INTO "AlocaAI".allocation_requests SELECT $1,$2,$3,$4,$5 WHERE EXISTS (SELECT 1 FROM "AlocaAI".searches WHERE id=$2) ON CONFLICT DO NOTHING', [a.id,a.searchId,a.candidateId,a.createdAt,a]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async history(ownerId?:string) {
    const where=ownerId?" WHERE payload->>'ownerId'=$1":'';const args=ownerId?[ownerId]:[];
    const [s,a] = await Promise.all([this.db.query('SELECT payload FROM "AlocaAI".searches'+where+' ORDER BY created_at DESC LIMIT 100',args),this.db.query('SELECT payload FROM "AlocaAI".allocation_requests'+where+' ORDER BY created_at DESC LIMIT 100',args)]);
    return { searches: s.rows.map(r => r.payload as Search), allocations: a.rows.map(r => r.payload as Allocation) };
  }
  async search(id: string) { return (await this.db.query('SELECT payload FROM "AlocaAI".searches WHERE id=$1',[id])).rows[0]?.payload as Search | undefined; }
  async saveSearch(s: Search) { await this.db.query('INSERT INTO "AlocaAI".searches VALUES ($1,$2,$3)',[s.id,s.createdAt,s]); }
  async allocation(searchId: string, candidateId: string) { return (await this.db.query('SELECT payload FROM "AlocaAI".allocation_requests WHERE search_id=$1 AND candidate_id=$2',[searchId,candidateId])).rows[0]?.payload as Allocation | undefined; }
  async saveAllocation(a: Allocation) {
    const inserted = await this.db.query('INSERT INTO "AlocaAI".allocation_requests VALUES ($1,$2,$3,$4,$5) ON CONFLICT (search_id,candidate_id) DO NOTHING RETURNING payload',[a.id,a.searchId,a.candidateId,a.createdAt,a]);
    if (inserted.rowCount) return { allocation: inserted.rows[0].payload as Allocation, created: true };
    return { allocation: (await this.allocation(a.searchId,a.candidateId))!, created: false };
  }
  async allocationById(id:string){return (await this.db.query('SELECT payload FROM "AlocaAI".allocation_requests WHERE id=$1',[id])).rows[0]?.payload as Allocation|undefined;}
  async decide(id:string,status:'validated'|'declined',decision:NonNullable<Allocation['decision']>){const r=await this.db.query(`UPDATE "AlocaAI".allocation_requests SET payload=payload || $2::jsonb WHERE id=$1 AND payload->>'status'='pending' RETURNING payload`,[id,{status,decision}]);return r.rows[0]?.payload as Allocation|undefined;}
}

export class FileStore implements Store {
  private data: { searches: Search[]; allocations: Allocation[] };
  constructor(private path: string) { this.data = existsSync(path) ? JSON.parse(readFileSync(path,'utf8')) : { searches: [], allocations: [] }; }
  private persist() { mkdirSync(dirname(this.path),{ recursive:true });writeFileSync(this.path+'.tmp',JSON.stringify(this.data),{ mode:0o600 });renameSync(this.path+'.tmp',this.path); }
  async history(ownerId?:string) { return { searches:this.data.searches.filter(s=>!ownerId||s.ownerId===ownerId).slice(0,100),allocations:this.data.allocations.filter(a=>!ownerId||a.ownerId===ownerId).slice(0,100) }; }
  async search(id: string) { return this.data.searches.find(s => s.id===id); }
  async saveSearch(s: Search) { this.data.searches.unshift(s);this.persist(); }
  async allocation(searchId: string,candidateId: string) { return this.data.allocations.find(a => a.searchId===searchId && a.candidateId===candidateId); }
  async saveAllocation(a: Allocation) {
    // Sem await entre checagem e gravação: uma única operação no processo.
    const existing=this.data.allocations.find(x=>x.searchId===a.searchId && x.candidateId===a.candidateId);
    if(existing)return {allocation:existing,created:false};
    this.data.allocations.unshift(a);this.persist();return {allocation:a,created:true};
  }
}
