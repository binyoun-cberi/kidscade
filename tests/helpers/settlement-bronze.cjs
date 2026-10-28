'use strict';
const assert = require('node:assert/strict');
const S = require('../../games/high_human_history_cards/settlement/sim.js');

// A public-action route, shared by the two existing full-history playthroughs.
module.exports = function finishBronze(s, build, ensure) {
  const run = n => S.tick(s, n), B = S.Bronze, P = S.Prehistory;
  const craft = id => {
    ensure('stone', 1); assert.equal(P.craft(s, id).ok, true, id);
    while (s.prehistory.grinding) P.grind(s);
  };
  build('woodshop'); craft('adze');
  function structure(id) {
    if (S.finished(s, id)) return;
    const timber = S.PROJECTS[id].cost.timber || 0;
    for (let guard = 0; s.resources.timber < timber && guard < 200; guard++) {
      if (!(s.prehistory.tools.adze > 0)) craft('adze');
      ensure('wood', 3); s.prehistory.selected = 'adze';
      assert.equal(S.cityAction(s, 'timber').ok, true); run(.1);
    }
    build(id);
  }
  for (const id of ['granary', 'flintWorkshop']) structure(id);
  assert.equal(P.answer(s, 'pottery', 0).ok, true);
  P.answer(s, 'tools', 0); S.Civilization.answer(s, 'toolbox', 0);
  for (const id of ['neighborhood', 'quarter', 'broadField', 'mumunStore', 'kiln', 'prospect', 'castingWorkshop']) structure(id);
  craft('reaping'); run(31);
  assert.equal(S.bronzeAction(s, 'harvest', 0).ok, true);
  assert.equal(B.answer(s, 'harvest', B.RESEARCH.harvest.answer).ok, true);
  assert.equal(S.bronzeAction(s, 'carry').ok, true); run(2.1);
  assert.equal(S.bronzeAction(s, 'mill').ok, true);
  assert.equal(B.answer(s, 'storage', B.RESEARCH.storage.answer).ok, true);
  for (const [id, amount] of [['charcoal', 2], ['copper', 2], ['tin', 1]]) {
    let guard = 0;
    while (s.resources[id] < amount && guard++ < 200) {
      if (id === 'charcoal') ensure('wood', 16);
      S.bronzeAction(s, id); run(1);
    }
    assert.ok(s.resources[id] >= amount, id);
  }
  assert.equal(S.bronzeAction(s, 'bronze').ok, true);
  for (let i = 0; !(s.history.produced.bronze >= 2) && i < 60; i++) run(1);
  assert.equal(B.answer(s, 'casting', B.RESEARCH.casting.answer).ok, true);
  structure('bronzeRitual'); structure('dolmen');
  for (const e of B.EVIDENCE) assert.equal(S.bronzeAction(s, 'observe:' + e.id).ok, true);
  assert.equal(B.answer(s, 'evidence', B.RESEARCH.evidence.answer).ok, true);
  // The older history test deliberately exercises optional manual staffing afterward.
  // Use the public switch so automatic orders do not claim its manually gathered inputs.
  if (!s.civilization.research.production && s.civilization.automatic) S.cityAction(s, 'automatic');
  assert.ok(S.restore(s));
};
