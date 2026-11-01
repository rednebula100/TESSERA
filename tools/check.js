#!/usr/bin/env node
'use strict';
// 콘텐츠 검사: 설계도 단계가 크기와 맞는지(단계가 오르면 반드시 커짐), 이정표 보상 형식, 용어 금지어
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
const ctx = { window: {}, console, Math, Map, Set, Object, Array, Number, String, JSON, document: { createElement: () => ({ getContext: () => ({}) }) } };
vm.createContext(ctx);
const src = ['util', 'data', 'pixelart', 'catalog'].map((f) => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8').replace(/^'use strict';/, '')).join('\n;\n');
vm.runInContext(src, ctx, { filename: 'content-bundle.js' });
const T = ctx.window.T;
const fails = [];
for (const d of T.DEFS) {
  const sh = T.shapeOf(d.id, 3);
  const side = Math.max(sh.w, sh.h);
  const want = T.tierForSide(side);
  if (d.tier !== want) fails.push(`${d.id}: 단계 ${d.tier}인데 긴 변 ${side}블록은 단계 ${want}`);
  if (d.res !== T.TIER_RES[d.tier] && d.res === undefined) fails.push(`${d.id}: 도면 해상도 없음`);
}
for (const m of T.MILESTONES) if (!Array.isArray(m.rewards) || !m.rewards.length) fails.push(`이정표 ${m.name}: 보상 목록 없음`);
// words that must not come back after the v4 terminology patch
const banned = [/블럭/, /쪼개기/, /소프트캡/, /끌 주민/, /워프 주민/, /레이어가 보입니다/];
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  const text = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  text.split('\n').forEach((line, i) => { for (const b of banned) if (b.test(line) && !/^\s*\/\//.test(line)) fails.push(`${f}:${i + 1} 금지어 ${b}`); });
}
if (fails.length) { fails.forEach((x) => console.log('✗ ' + x)); process.exit(1); }
console.log(`✓ 설계도 ${T.DEFS.length}개 단계 일치, 이정표 ${T.MILESTONES.length}개, 금지어 없음`);
