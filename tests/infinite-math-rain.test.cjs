const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { makeQuestion, connectedChain, scoreFor, suggestedTarget } = require("../games/infinite_gugudan/math-rain-engine.js");

const root = path.resolve(__dirname, "..");
const folder = path.join(root, "games/infinite_gugudan");
function read(file) { return fs.readFileSync(path.join(folder, file), "utf8"); }
function calculate(text) {
  const match = text.match(/^(\d+) ([+−×÷]) (\d+)$/);
  assert.ok(match, "bad expression: " + text);
  const a = +match[1], b = +match[3];
  return { "+": () => a + b, "−": () => a - b, "×": () => a * b, "÷": () => a / b }[match[2]]();
}

test("rain questions are always solvable, bounded and match the shown answer", () => {
  for (const level of ["easy", "normal", "hard"]) {
    const families = new Set();
    for (let i = 0; i < 2500; i++) {
      const question = makeQuestion(level);
      assert.equal(calculate(question.expression), question.answer, question.expression);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 2 && question.answer <= 99);
      assert.equal(question.color, question.answer % 4);
      const operands = question.expression.match(/\d+/g).map(Number);
      if (level === "easy") assert.ok(operands.every(n => n <= 20), question.expression);
      families.add(question.family);
    }
    assert.ok(families.has("add"));
    assert.ok(families.has("subtract"));
    if (level !== "easy") assert.ok(families.has("multiply"));
    if (level === "hard") assert.ok(families.has("divide"));
  }
});

test("matching-answer spawning preserves the requested answer even if not factorable", () => {
  for (const level of ["easy", "normal", "hard"]) {
    for (const answer of [3, 11, 24, 36, 56, 81, 97, 99]) {
      for (let i = 0; i < 60; i++) {
        const q = makeQuestion(level, Math.random, answer);
        assert.equal(q.answer, answer);
        assert.equal(calculate(q.expression), answer);
      }
    }
  }
});

test("chain flood fill uses connected nearby blocks of the same answer only", () => {
  const blocks = [
    {id:1,answer:24,x:90,y:40},{id:2,answer:24,x:200,y:100},
    {id:3,answer:24,x:320,y:155},{id:4,answer:48,x:120,y:70},
    {id:5,answer:24,x:600,y:600}
  ];
  assert.deepEqual(connectedChain(blocks, 1), [1, 2, 3]);
  assert.deepEqual(connectedChain(blocks, 4), [4]);
  assert.deepEqual(connectedChain(blocks, 99), []);
  assert.deepEqual(connectedChain([], 1), []);
  assert.equal(suggestedTarget(blocks), 5);
  assert.equal(suggestedTarget([]), null);
});

test("score rewards successful streaks and useful chain reactions", () => {
  assert.equal(scoreFor(0, 10), 0);
  assert.ok(scoreFor(1, 4) > scoreFor(1, 1));
  assert.ok(scoreFor(3, 1) > 3 * scoreFor(1, 1));
  assert.ok(scoreFor(1, 1, 20) > scoreFor(1, 1, 0));
});

test("standalone game mode hooks into the existing game without replacing PvP", () => {
  const html = read("무한 구구단： 무한루.html");
  const ui = read("math-rain.js");
  const css = read("math-rain.css");
  assert.match(html, /math-rain\.css\?v=1/);
  assert.match(html, /math-rain-engine\.js\?v=1/);
  assert.match(html, /math-rain\.js\?v=1/);
  assert.match(html, /data-mode="cpu"/);
  assert.match(html, /data-mode="local"/);
  assert.match(html, /function showEnergyFeedback/);
  assert.match(ui, /connectedChain/);
  assert.match(ui, /document\.hidden && state\.running/);
  assert.match(ui, /window\.KidscadeGame\?\.result\?\./);
  assert.match(ui, /rainLaunchBtn/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotThrow(() => new Function(ui));
  assert.doesNotThrow(() => new Function(read("math-rain-engine.js")));
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (m[1].trim()) assert.doesNotThrow(() => new Function(m[1]));
  }
});
