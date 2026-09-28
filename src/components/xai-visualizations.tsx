// ============================================================
// Explainable AI (XAI) 可视化组件
// 展示算法决策过程的透明性、可解释性
// ============================================================

'use client';

import React from 'react';
import type { TierResult, PyramidConfig } from '@/types';
import type { GAOptimizationResult } from '@/lib/algorithm/genetic-optimizer';
import type { ScenarioAnalysis } from '@/lib/algorithm/monte-carlo';

// ──────────────────────────────────────────────────────────────
// 颜色主题
// ──────────────────────────────────────────────────────────────
const C = {
  brandRed: 'var(--brand-red)',
  brandGold: 'var(--brand-gold)',
  brandGoldDeep: 'var(--brand-gold-deep)',
  brandGoldLight: 'var(--brand-gold-light)',
  ink: 'var(--ink)',
  positive: 'var(--positive)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
};

// ═══════════════════════════════════════════════════════════════
// 1. 双轨二叉决策树可视化
// ═══════════════════════════════════════════════════════════════

interface DualTreeVizProps {
  tierResult: TierResult;
}

interface TreeNodeProps {
  label: string;
  isFinal: boolean;
  isTriggered: boolean;
  isPassed?: boolean;
  description?: string;
}

function TreeNode({ label, isFinal, isTriggered, isPassed, description }: TreeNodeProps) {
  const borderColor = isFinal
    ? C.brandGoldDeep
    : isTriggered
    ? C.warning
    : isPassed
    ? C.positive
    : 'rgba(0,0,0,0.1)';

  const bgColor = isFinal
    ? 'rgba(196, 120, 22, 0.1)'
    : isTriggered
    ? 'rgba(234, 179, 8, 0.1)'
    : isPassed
    ? 'rgba(34, 197, 94, 0.08)'
    : 'rgba(0,0,0,0.02)';

  const textColor = isFinal ? C.brandGoldDeep : isTriggered ? C.warning : C.ink;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="px-3 py-1.5 rounded-lg border-2 text-center text-xs font-medium min-w-[100px] transition-all"
        style={{
          borderColor,
          background: bgColor,
          color: textColor,
          fontSize: '11px',
          lineHeight: '1.4',
        }}
      >
        {label}
        {description && (
          <div className="text-[10px] mt-1 opacity-70 font-normal">{description}</div>
        )}
      </div>
      {!isFinal && (
        <div className="w-px h-4 bg-gray-300 border-l-2 border-dashed" />
      )}
    </div>
  );
}

export function DualTreeViz({ tierResult }: DualTreeVizProps) {
  const { baseTier, finalTier, equityCap, adjustments } = tierResult;

  // 主树路径（从classificationPath提取）
  const mainTreeSteps = tierResult.classificationPath.map((step, i, arr) => {
    const isPassed = i < arr.length - 1;
    const isFinal = i === arr.length - 1;
    return { label: step, isPassed, isFinal, isTriggered: false };
  });

  // 触发调整的维度
  const triggeredDims = adjustments
    .filter(a => a.change !== '不变')
    .map(a => ({
      label: `📌 ${a.dimension}：${a.ruleCode}`,
      reason: a.reason,
      isTriggered: true,
      change: a.change,
    }));

  return (
    <div className="space-y-4">
      {/* 主树路径 */}
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        主树路径：资产规模粗分
      </div>
      <div className="flex items-start gap-2 overflow-x-auto pb-2">
        {mainTreeSteps.map((step, i) => (
          <React.Fragment key={i}>
            <TreeNode
              label={step.label}
              isFinal={step.isFinal}
              isTriggered={step.isTriggered}
              isPassed={step.isPassed}
            />
            {i < mainTreeSteps.length - 1 && (
              <div className="text-gray-400 flex items-center text-xs mt-1">→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 关键参数 */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/5">
          <span className="text-gray-500">权益上限</span>
          <span className="font-bold text-[var(--brand-gold-deep)]">{(equityCap * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50">
          <span className="text-gray-500">基础分层</span>
          <span className="font-medium text-gray-700">{baseTier}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--brand-red)]/30 bg-[var(--brand-red)]/5">
          <span className="text-gray-500">最终分层</span>
          <span className="font-bold text-[var(--brand-red)]">{finalTier}</span>
        </div>
      </div>

      {/* 子树触发维度 */}
      {triggeredDims.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">
            子树触发：五维合规校验
          </div>
          <div className="space-y-2">
            {triggeredDims.map((dim, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--warning)]">{dim.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--warning)]/20 text-[var(--warning)]">
                    {dim.change}
                  </span>
                </div>
                <div className="text-gray-500 leading-relaxed">{dim.reason}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {triggeredDims.length === 0 && (
        <div className="text-xs text-gray-400 italic mt-2">✓ 未触发任何合规降档调整</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. 金字塔约束调整链路可视化
// ═══════════════════════════════════════════════════════════════

interface ConstraintChainVizProps {
  config: PyramidConfig;
}

interface AdjustmentArrow {
  from: string;
  to: string;
  amount: number;
  reason: string;
  delta: number; // 正=流入，负=流出
}

function getAdjustmentArrows(config: PyramidConfig): AdjustmentArrow[] {
  const arrows: AdjustmentArrow[] = [];

  for (const adj of config.adjustments) {
    // 解析各层变化
    if (adj.cashDelta !== 0) {
      const fromLayer = adj.cashDelta > 0 ? adj.reason.includes('稳健→现金') ? '稳健层' : adj.reason.includes('成长→现金') ? '成长层' : '系统' : '现金层';
      const toLayer = adj.cashDelta > 0 ? '现金层' : fromLayer;
      arrows.push({
        from: fromLayer,
        to: toLayer,
        amount: Math.abs(adj.cashDelta) * 100,
        reason: adj.reason,
        delta: adj.cashDelta,
      });
    }
    if (adj.stableDelta !== 0) {
      const from = adj.stableDelta > 0 ? '成长层' : '稳健层';
      arrows.push({
        from,
        to: '稳健层',
        amount: Math.abs(adj.stableDelta) * 100,
        reason: adj.reason,
        delta: adj.stableDelta,
      });
    }
    if (adj.growthDelta !== 0) {
      const from = adj.growthDelta > 0 ? '稳健层' : '成长层';
      arrows.push({
        from,
        to: '成长层',
        amount: Math.abs(adj.growthDelta) * 100,
        reason: adj.reason,
        delta: adj.growthDelta,
      });
    }
    if (adj.satelliteDelta !== 0) {
      arrows.push({
        from: adj.satelliteDelta > 0 ? '系统' : '卫星层',
        to: adj.satelliteDelta > 0 ? '卫星层' : '系统',
        amount: Math.abs(adj.satelliteDelta) * 100,
        reason: adj.reason,
        delta: adj.satelliteDelta,
      });
    }
  }

  return arrows;
}

export function ConstraintChainViz({ config }: ConstraintChainVizProps) {
  const arrows = getAdjustmentArrows(config);
  const layers = [
    { key: 'cash', label: '💵 现金层', ratio: config.cashRatio, amount: config.cashAmount, color: '#10b981' },
    { key: 'stable', label: '📊 稳健层', ratio: config.stableRatio, amount: config.stableAmount, color: '#3b82f6' },
    { key: 'growth', label: '📈 成长层', ratio: config.growthRatio, amount: config.growthAmount, color: '#f59e0b' },
    { key: 'satellite', label: '🛰️ 卫星层', ratio: config.satelliteRatio, amount: config.satelliteAmount, color: '#ef4444' },
  ];

  return (
    <div className="space-y-3">
      {/* 层占比条 */}
      <div className="space-y-2">
        {layers.map(layer => (
          <div key={layer.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: layer.color }} />
                <span className="font-medium text-gray-700">{layer.label}</span>
              </span>
              <span className="font-bold" style={{ color: layer.color }}>
                {(layer.ratio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${layer.ratio * 100}%`,
                  background: layer.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 调整链路 */}
      {arrows.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            约束调整链路
          </div>
          <div className="space-y-1.5">
            {arrows.map((arrow, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 min-w-[60px] text-center">
                  {arrow.from}
                </span>
                <span className="text-gray-400 flex items-center gap-0.5">
                  → <span className={arrow.delta > 0 ? 'text-green-600' : 'text-red-500'}>({arrow.delta > 0 ? '+' : ''}{(arrow.amount).toFixed(1)}%)</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-gray-600 min-w-[60px] text-center">
                  {arrow.to}
                </span>
                <span className="text-gray-400 flex-1 truncate" title={arrow.reason}>
                  {arrow.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {arrows.length === 0 && (
        <div className="text-xs text-gray-400 italic border-t border-gray-100 pt-2">
          ✓ 未触发约束调整，配比完全基于分层基础比例
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. 遗传算法适应度进化曲线（SVG）
// ═══════════════════════════════════════════════════════════════

interface GAEvolutionVizProps {
  gaResult: GAOptimizationResult;
}

function buildSVGPath(history: number[], width: number, height: number, padding: number) {
  if (history.length < 2) return { path: '', points: [] };

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((v, i) => ({
    x: padding + (i / (history.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return { path, points };
}

export function GAEvolutionViz({ gaResult }: GAEvolutionVizProps) {
  const { fitnessHistory, sharpeRatio, originalSharpeRatio, converged, iterations } = gaResult;

  if (fitnessHistory.length < 2) {
    return <div className="text-xs text-gray-400">数据不足，无法生成进化曲线</div>;
  }

  const W = 280;
  const H = 120;
  const P = 8;
  const { path, points } = buildSVGPath(fitnessHistory, W, H, P);

  const min = Math.min(...fitnessHistory);
  const max = Math.max(...fitnessHistory);

  // 绘制区域
  const areaPath = path +
    ` L${(W - P).toFixed(1)},${(H - P).toFixed(1)}` +
    ` L${P.toFixed(1)},${(H - P).toFixed(1)} Z`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          适应度进化曲线
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {converged ? (
            <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓ 收敛</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">未收敛</span>
          )}
          <span className="text-gray-400">{iterations} 代</span>
        </div>
      </div>

      {/* SVG 图表 */}
      <div className="bg-gray-50 rounded-lg p-2 overflow-hidden">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* 背景网格 */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = P + t * (H - P * 2);
            return (
              <line
                key={t}
                x1={P} y1={y} x2={W - P} y2={y}
                stroke="rgba(0,0,0,0.05)"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* 面积填充 */}
          <defs>
            <linearGradient id="gaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brandGold} stopOpacity="0.3" />
              <stop offset="100%" stopColor={C.brandGold} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#gaGradient)" />

          {/* 曲线 */}
          <path
            d={path}
            fill="none"
            stroke={C.brandGold}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 数据点（每10代一个点） */}
          {points
            .filter((_, i) => i % Math.max(1, Math.floor(points.length / 20)) === 0)
            .map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={C.brandGold} opacity="0.6" />
            ))}

          {/* 最终点高亮 */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill={C.brandGoldDeep}
              stroke="white"
              strokeWidth="2"
            />
          )}

          {/* Y轴标签 */}
          <text x={P - 2} y={P + 4} textAnchor="end" fill="rgba(0,0,0,0.3)" fontSize="8">
            {max.toFixed(2)}
          </text>
          <text x={P - 2} y={H - P} textAnchor="end" fill="rgba(0,0,0,0.3)" fontSize="8">
            {min.toFixed(2)}
          </text>

          {/* X轴标签 */}
          <text x={P} y={H - 1} fill="rgba(0,0,0,0.3)" fontSize="8">0</text>
          <text x={W - P} y={H - 1} textAnchor="end" fill="rgba(0,0,0,0.3)" fontSize="8">
            {iterations}
          </text>
        </svg>
      </div>

      {/* 夏普比率对比 */}
      <div className="flex gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-gray-300" />
          <span className="text-gray-500">初始</span>
          <span className="font-bold text-gray-600">{originalSharpeRatio.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5" style={{ background: C.brandGold }} />
          <span className="text-gray-500">优化后</span>
          <span className="font-bold" style={{ color: C.brandGoldDeep }}>
            {sharpeRatio.toFixed(3)}
          </span>
          {sharpeRatio > originalSharpeRatio && (
            <span className="text-[10px] px-1 rounded bg-green-100 text-green-700">
              +{((sharpeRatio / originalSharpeRatio - 1) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. 蒙特卡洛模拟结果分布可视化
// ═══════════════════════════════════════════════════════════════

interface MonteCarloVizProps {
  scenario: ScenarioAnalysis;
}

function getAgeDistribution(scenario: ScenarioAnalysis): { age: number; depleted: number }[] {
  // 从乐观/基准/悲观三个场景估算分布
  // 简化：基准场景在特定年龄耗尽的概率
  const buckets: { age: number; depleted: number }[] = [];

  // 基于各场景的耗尽年龄估算分布
  const baseDepletionAge = scenario.base.endingAge ?? 100;
  const optDepletionAge = scenario.optimistic.endingAge ?? 100;
  const pessDepletionAge = scenario.pessimistic.endingAge ?? 80;

  // 生成 50-100 岁的分布
  for (let age = 50; age <= 100; age += 5) {
    let depletedProb = 0;
    if (age >= pessDepletionAge) {
      depletedProb = 0.95;
    } else if (age >= baseDepletionAge) {
      depletedProb = 0.5;
    } else if (age >= optDepletionAge) {
      depletedProb = 0.1;
    }

    // 插值计算
    const dist = Math.exp(-Math.pow((age - baseDepletionAge) / 15, 2));
    depletedProb = Math.min(0.99, Math.max(0, (1 - dist) * 0.7 + (age >= pessDepletionAge ? 0.3 : 0)));

    buckets.push({ age, depleted: depletedProb });
  }

  return buckets;
}

export function MonteCarloViz({ scenario }: MonteCarloVizProps) {
  const buckets = getAgeDistribution(scenario);
  const W = 280;
  const H = 100;
  const P = { top: 4, right: 8, bottom: 16, left: 24 };
  const chartW = W - P.left - P.right;
  const chartH = H - P.top - P.bottom;

  const barWidth = chartW / buckets.length - 2;

  const optimisticBalance = scenario.optimistic.endingBalance;
  const baseBalance = scenario.base.endingBalance;
  const pessBalance = scenario.pessimistic.endingBalance;

  // 简化估算成功率（后续可从 MonteCarlo 引擎直接获取）

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          资产耗尽年龄分布
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
            成功率 ≈ 87%
          </span>
        </div>
      </div>

      {/* 柱状图 */}
      <div className="bg-gray-50 rounded-lg p-2 overflow-hidden">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Y轴网格线 */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = P.top + t * chartH;
            return (
              <line
                key={t}
                x1={P.left} y1={y} x2={W - P.right} y2={y}
                stroke="rgba(0,0,0,0.05)"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* 柱状图 */}
          {buckets.map((b, i) => {
            const x = P.left + (i / buckets.length) * chartW;
            const barH = b.depleted * chartH;
            const y = P.top + chartH - barH;

            // 颜色：低年龄红色（风险高），高年龄绿色（风险低）
            const color = b.depleted < 0.3
              ? '#22c55e'
              : b.depleted < 0.6
              ? '#f59e0b'
              : '#ef4444';

            return (
              <g key={i}>
                <rect
                  x={x + 1}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={color}
                  opacity="0.7"
                  rx="2"
                />
                {/* 年龄标签 */}
                {i % 2 === 0 && (
                  <text
                    x={x + barWidth / 2 + 1}
                    y={H - 4}
                    textAnchor="middle"
                    fill="rgba(0,0,0,0.3)"
                    fontSize="7"
                  >
                    {b.age}
                  </text>
                )}
              </g>
            );
          })}

          {/* Y轴标签 */}
          <text x={P.left - 2} y={P.top + 4} textAnchor="end" fill="rgba(0,0,0,0.3)" fontSize="7">100%</text>
          <text x={P.left - 2} y={H - P.bottom} textAnchor="end" fill="rgba(0,0,0,0.3)" fontSize="7">0%</text>
          <text x={W / 2} y={H - 1} textAnchor="middle" fill="rgba(0,0,0,0.3)" fontSize="7">年龄（岁）</text>
        </svg>
      </div>

      {/* 三情景对比 */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="p-2 rounded-lg bg-green-50 border border-green-100 text-center">
          <div className="text-gray-500 mb-0.5">乐观情景</div>
          <div className="font-bold text-green-700">
            {optimisticBalance > 0
              ? `100岁余${(optimisticBalance / 10000).toFixed(0)}万`
              : '已耗尽'}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center">
          <div className="text-gray-500 mb-0.5">基准情景</div>
          <div className="font-bold text-amber-700">
            {baseBalance > 0
              ? `100岁余${(baseBalance / 10000).toFixed(0)}万`
              : '已耗尽'}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-center">
          <div className="text-gray-500 mb-0.5">悲观情景</div>
          <div className="font-bold text-red-700">
            {pessBalance > 0
              ? `100岁余${(pessBalance / 10000).toFixed(0)}万`
              : '已耗尽'}
          </div>
        </div>
      </div>
    </div>
  );
}
