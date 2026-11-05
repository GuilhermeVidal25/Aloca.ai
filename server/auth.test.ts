import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,passwordMatches} from './auth.ts';
test('Senhas usam salt individual e não são recuperáveis pelo hash armazenado',async()=>{
  const password='Apenas-teste-123456';const [a,b]=await Promise.all([passwordHash(password),passwordHash(password)]);assert.notEqual(a,b);assert.ok(!a.includes(password));assert.equal(await passwordMatches(password,a),true);assert.equal(await passwordMatches('outra-senha-1234',a),false);assert.equal(await passwordMatches(password,'invalid'),false);
});
