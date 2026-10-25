/* Math Rain — standalone arithmetic rules. Inspired by jkallio/combine (MIT).
 * Copyright (c) 2026 Kidscade contributors. */
(function(root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  if (root) root.MathRainEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const POOL = [12, 16, 18, 20, 24, 27, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 63, 64, 72, 81];
  function integer(low, high, random = Math.random) {
    return low + Math.floor(Math.min(0.999999999, Math.max(0, random())) * (high - low + 1));
  }
  function makeQuestion(level, random = Math.random, requestedAnswer) {
    const easy = level === "easy";
    const hard = level === "hard";
    const answer = Number.isInteger(requestedAnswer) && requestedAnswer >= 2 && requestedAnswer <= 99
      ? requestedAnswer
      : easy ? integer(3, 20, random) : POOL[integer(0, POOL.length - 1, random)];
    const choices = easy ? ["add", "subtract"] : hard ? ["add", "subtract", "multiply", "divide"] : ["add", "multiply", "subtract"];
    let family = choices[integer(0, choices.length - 1, random)];
    let a, b;
    if (family === "multiply") {
      const pairs = [];
      for (let factor = 2; factor <= 9; factor++) {
        if (answer % factor === 0 && answer / factor >= 2 && answer / factor <= 9) {
          pairs.push([factor, answer / factor]);
        }
      }
      if (pairs.length) [a, b] = pairs[integer(0, pairs.length - 1, random)];
      else family = "add";
    }
    if (family === "add") {
      a = integer(1, answer - 1, random);
      b = answer - a;
    } else if (family === "subtract") {
      b = integer(1, easy ? 9 : 20, random);
      a = answer + b;
    } else if (family === "divide") {
      b = integer(2, 7, random);
      a = answer * b;
    }
    const sign = { add: "+", subtract: "−", multiply: "×", divide: "÷" }[family];
    return { expression: a + " " + sign + " " + b, answer, family, color: answer % 4 };
  }
  function connectedChain(blocks, selectedId, horizontal = 165, vertical = 140) {
    const first = blocks.find(block => block.id === selectedId);
    if (!first) return [];
    const ids = new Set([first.id]);
    const queue = [first];
    while (queue.length) {
      const current = queue.shift();
      for (const next of blocks) {
        if (ids.has(next.id) || next.answer !== first.answer) continue;
        if (Math.abs(next.x - current.x) <= horizontal &&
            Math.abs(next.y - current.y) <= vertical) {
          ids.add(next.id);
          queue.push(next);
        }
      }
    }
    return [...ids];
  }
  function scoreFor(chainLength, combo, heightBonus = 0) {
    if (!Number.isInteger(chainLength) || chainLength < 1) return 0;
    return Math.round((100 + Math.max(0, heightBonus)) * chainLength *
      (1 + Math.min(12, Math.max(0, combo - 1)) * 0.12) +
      Math.max(0, chainLength - 1) * 80);
  }
  function suggestedTarget(blocks) {
    if (!blocks.length) return null;
    return blocks.reduce((lowest, block) => block.y > lowest.y ? block : lowest).id;
  }
  return Object.freeze({ makeQuestion, connectedChain, scoreFor, suggestedTarget });
});
