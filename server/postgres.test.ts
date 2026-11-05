import test from 'node:test';
test('PostgreSQL real: equivalência com dump, migração e unicidade concorrente', { skip: process.env.RUN_POSTGRES_TESTS !== '1' }, async()=>{
  await import('./verify-postgres.ts');
});
