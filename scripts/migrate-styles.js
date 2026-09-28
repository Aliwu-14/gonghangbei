/* eslint-disable */
// 把所有旧 class 映射到新 class
const fs = require('fs');
const path = require('path');

const FILES = [
  'src/app/kyc/finance/page.tsx',
  'src/app/kyc/goals/page.tsx',
  'src/app/kyc/risk/page.tsx',
  'src/app/plan/[planId]/page.tsx',
  'src/app/plan/[planId]/products/page.tsx',
  'src/app/plan/[planId]/confirm/page.tsx',
  'src/app/plan/generate/page.tsx',
  'src/app/reservation/[id]/page.tsx',
];

// 替换规则 — 顺序重要
const REPLACEMENTS = [
  // class 名
  ['icbc-card-accent', 'card-dark'],
  ['icbc-card-elevated', 'card'],
  ['icbc-card-dark', 'card-dark'],
  ['icbc-card', 'card'],
  ['icbc-btn-primary', 'btn btn-primary'],
  ['icbc-btn-secondary', 'btn btn-secondary'],
  ['icbc-btn-ghost', 'btn btn-ghost'],
  ['icbc-btn', 'btn btn-primary'],
  ['icbc-input', 'input'],
  ['icbc-back-btn', 'icbc-back'],
  ['progress-bar-fill', 'bar-fill'],
  ['progress-bar', 'bar'],
  // tag
  ['icbc-tag icbc-tag-red', 'tag tag-red'],
  ['icbc-tag icbc-tag-gold', 'tag tag-gold'],
  ['icbc-tag icbc-tag-muted', 'tag tag-muted'],
  ['icbc-tag icbc-tag-positive', 'tag tag-positive'],
  ['icbc-tag icbc-tag-warning', 'tag tag-warning'],
  ['icbc-tag icbc-tag-danger', 'tag tag-danger'],
  ['icbc-tag icbc-tag-info', 'tag tag-info'],
  ['icbc-tag icbc-tag-outline', 'tag tag-outline'],
  ['icbc-tag', 'tag tag-muted'],
  // notice
  ['icbc-notice-label', 'notice-label'],
  ['icbc-notice', 'notice'],
  // 颜色变量
  ['--neutral-canvas', '--canvas'],
  ['--neutral-paper', '--paper'],
  ['--neutral-pure', '--white'],
  ['--neutral-line-2', '--line-2'],
  ['--neutral-line', '--line'],
  ['--neutral-fog', '--ink-4'],
  ['--neutral-mist', '--ink-3'],
  ['--neutral-graphite', '--ink-2'],
  ['--neutral-slate', '--ink-2'],
  ['--neutral-ink', '--ink'],
  ['--bg-page', '--canvas'],
  ['--bg-elevated', '--canvas'],
  ['--bg-card', '--white'],
  ['--bg-dark', '--brand-red-dark'],
  // 语义色
  ['--semantic-positive', '--positive'],
  ['--semantic-positive-bg', '--positive-bg'],
  ['--semantic-warning', '--warning'],
  ['--semantic-warning-bg', '--warning-bg'],
  ['--semantic-danger', '--danger'],
  ['--semantic-danger-bg', '--danger-bg'],
  ['--semantic-info', '--info'],
  ['--semantic-info-bg', '--info-bg'],
  // 品牌色 alias
  ['--brand-primary', '--brand-red'],
  // 装饰元素
  ['gold-accent-line-vertical', 'accent-line-v'],
  ['gold-accent-line', 'accent-line-gold'],
  // font-serif 全去掉
  ['font-serif ', ''],
  // 上下结构
  ['min-h-[calc(100vh-180px)] bg-[var(--canvas)]', ''],
];

for (const file of FILES) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.log('SKIP', file);
    continue;
  }
  let content = fs.readFileSync(full, 'utf-8');
  let changed = 0;
  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed++;
    }
  }
  // bg-[var(--canvas)] -> 没有问题
  fs.writeFileSync(full, content, 'utf-8');
  console.log(`OK ${file} (${changed} types replaced)`);
}
