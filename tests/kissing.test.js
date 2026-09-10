import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditKissing, projectConfiguration, projectionBasis} from '../src/math/kissing.js';
const data = JSON.parse(readFileSync(new URL('../data/kissing.json', import.meta.url)));
test('all three published 604-point configurations satisfy exact Q(sqrt(2)) inequalities', () => {
  for (let i=0; i<3; i++) {
    const result = auditKissing(data.configurations[i]);
    assert.equal(result.points,604);
    assert.equal(result.contacts.length,[19704,22904,22840][i]);
    assert.equal(result.antipodalPairs,[302,302,238][i]);
  }
});
test('11D projection is orthonormal and deterministic', () => {
  const basis=projectionBasis(42);
  assert.deepEqual(basis,projectionBasis(42));
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) assert.ok(Math.abs(basis[i].reduce((s,x,k)=>s+x*basis[j][k],0)-(i===j?1:0))<1e-12);
  assert.equal(projectConfiguration(data.configurations[0],basis).length,604*3);
});
test('malformed kissing data fails visibly',()=>assert.throws(()=>auditKissing([[[0,0]]]),/604/));
