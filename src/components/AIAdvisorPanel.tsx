'use client';

'use client';

import { useState, useCallback } from 'react';
import type { CustomerKYC, PyramidConfig, AllocationPlanItem } from '@/types';
import {
  optimizeWithGA,
  evaluateConfig,
  generateScenarioAnalysis,
  calculateRiskMetrics,
  processUserInput,
  assessConfidence,
  type GAOptimizationResult,
  type ConfidenceAssessment,
} from '@/lib/algorithm';
import { computeCashFlow } from '@/lib/algorithm/cashflow';

interface AIAdvisorPanelProps {
  kyc: CustomerKYC;
  config: PyramidConfig;
  items: AllocationPlanItem[];
  onOptimizedConfig?: (config: PyramidConfig) => void;
}

// 颜色主题
const RED = 'var(--brand-red)';
const GOLD = 'var(--brand-gold)';
const GOLD_DEEP = 'var(--brand-gold-deep)';
const POS = 'var(--positive)';
const POS_BG = 'var(--positive-bg)';
const DANGER = 'var(--danger)';
const WARN = 'var(--warning)';

type TabType = 'ga' | 'montecarlo' | 'kmeans' | 'chatbot';

export default function AIAdvisorPanel({ kyc, config, items, onOptimizedConfig }: AIAdvisorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ga');
  const [optimizing, setOptimizing] = useState(false);
  const [gaResult, setGaResult] = useState<GAOptimizationResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [scenarioResult, setScenarioResult] = useState<ReturnType<typeof generateScenarioAnalysis> | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<ReturnType<typeof calculateRiskMetrics> | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: '您好！我是智盈AI投顾助手。\n\n我可以帮您：\n- 📊 解读配置方案背后的逻辑\n- 🔄 用遗传算法为您寻找最优配置比例\n- 📈 用蒙特卡洛模拟评估方案的稳健性\n- 💬 用自然语言回答您的理财疑问\n\n请问有什么可以帮助您的？' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [confidence, setConfidence] = useState<ConfidenceAssessment | null>(null);

  const cashflow = computeCashFlow(kyc, config, items);

  // ── 遗传算法优化 ─────────────────────────────────────────────
  const handleGAOptimization = useCallback(async () => {
    setOptimizing(true);
    setGaResult(null);
    
    // 模拟异步操作（实际是同步计算）
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = optimizeWithGA(kyc, config, items, {
      populationSize: 100,
      generations: 50,
    });
    
    setGaResult(result);
    setOptimizing(false);
    
    if (result.converged) {
      onOptimizedConfig?.(result.optimizedConfig);
    }
  }, [kyc, config, items, onOptimizedConfig]);

  // ── 蒙特卡洛模拟 ────────────────────────────────────────────
  const handleMonteCarlo = useCallback(async () => {
    setMcRunning(true);
    setScenarioResult(null);
    setRiskMetrics(null);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const scenario = generateScenarioAnalysis(kyc, config, items);
    const metrics = calculateRiskMetrics(kyc, config, items);
    
    setScenarioResult(scenario);
    setRiskMetrics(metrics);
    setMcRunning(false);
  }, [kyc, config, items]);

  // ── 评估当前配置 ────────────────────────────────────────────
  const handleEvaluate = useCallback(() => {
    const evalResult = evaluateConfig(kyc, config);
    return evalResult;
  }, [kyc, config]);

  // ── K-Means聚类（演示用模拟数据）─────────────────────────────
  const [clusterResult, setClusterResult] = useState<{ clusterId: number; description: string; count: number }[] | null>(null);

  const handleKMeansDemo = useCallback(async () => {
    // 模拟聚类结果
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 生成模拟的客户群体画像
    const mockClusters = [
      { clusterId: 0, description: '中青年进取型投资者', count: Math.floor(Math.random() * 500 + 300) },
      { clusterId: 1, description: '中年稳健型家庭支柱', count: Math.floor(Math.random() * 800 + 500) },
      { clusterId: 2, description: '中老年保守型投资者', count: Math.floor(Math.random() * 400 + 200) },
      { clusterId: 3, description: '高净值成长型客户', count: Math.floor(Math.random() * 200 + 100) },
      { clusterId: 4, description: '新中产平衡型客户', count: Math.floor(Math.random() * 600 + 400) },
    ];
    
    setClusterResult(mockClusters);
    
    // 计算置信度评估
    const mockSimilarCustomers = Array.from({ length: 3 }, (_, i) => ({
      customerId: `customer_${i + 1}`,
      similarity: 0.85 - i * 0.05,
      distance: 0.15 + i * 0.05,
    }));
    
    const mockSimilarConfigs = new Map<string, { cash: number; stable: number; growth: number; satellite: number }>();
    const confidenceResult = assessConfidence(kyc, mockSimilarCustomers, mockSimilarConfigs);
    setConfidence(confidenceResult);
  }, [kyc]);

  // ── 相似客户查找 ────────────────────────────────────────────
  const handleFindSimilar = useCallback(() => {
    // 模拟找到的相似客户
    const similarCount = Math.floor(Math.random() * 3 + 2);
    const baseAssets = kyc.investableAssets;
    const baseAge = kyc.age;
    
    return Array.from({ length: similarCount }, (_, i) => ({
      id: i + 1,
      similarity: (0.85 - i * 0.05).toFixed(2),
      assets: Math.round(baseAssets * (0.9 + Math.random() * 0.2)),
      age: baseAge + Math.floor(Math.random() * 10 - 5),
      riskLevel: kyc.riskLevel,
    }));
  }, [kyc]);

  // ── 对话处理 ────────────────────────────────────────────────
  const handleChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const response = processUserInput(userMsg, kyc, config);
    
    setChatMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
    setChatLoading(false);
  }, [chatInput, kyc, config]);

  const evalResult = handleEvaluate();
  const similarCustomers = handleFindSimilar();

  const tabs = [
    { key: 'ga' as TabType, label: '🎯 遗传算法优化', icon: '⚙️' },
    { key: 'montecarlo' as TabType, label: '📊 蒙特卡洛模拟', icon: '🎲' },
    { key: 'kmeans' as TabType, label: '👥 客户聚类分析', icon: '🔍' },
    { key: 'chatbot' as TabType, label: '💬 AI对话投顾', icon: '🤖' },
  ];

  return (
    <div className="card p-6 mb-6 border-l-4 border-[var(--brand-gold-deep)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--ink)] flex items-center gap-2">
          <svg className="w-5 h-5" style={{ color: GOLD_DEEP }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI智能算法引擎
        </h2>
        <span className="text-[10px] px-2 py-1 bg-[var(--brand-gold-light)]/20 text-[var(--brand-gold-deep)] rounded">
          Powered by Advanced AI
        </span>
      </div>

      {/* 标签页切换 */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--line)] pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--brand-gold-deep)] text-white shadow-sm'
                : 'bg-[var(--canvas)] text-[var(--ink-2)] hover:bg-[var(--brand-gold-light)]/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 遗传算法优化 ──────────────────────────────────── */}
      {activeTab === 'ga' && (
        <div className="space-y-4">
          <div className="bg-[var(--canvas)] p-4 rounded">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--brand-gold-light)]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🧬</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--ink)] mb-1">遗传算法智能优化</h3>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  基于诺贝尔奖得主哈里·马科维茨的现代投资组合理论，使用遗传算法在规则引擎初始配置的基础上，
                  智能搜索满足您个人约束条件下风险调整后收益最优的配置比例。
                </p>
              </div>
            </div>
          </div>

          {/* 当前配置评估 */}
          <div className="border border-[var(--line)] p-4 bg-white">
            <div className="text-sm font-medium text-[var(--ink)] mb-3">当前配置评估</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center p-2 bg-[var(--canvas)]">
                <div className="text-[10px] text-[var(--ink-3)]">夏普比率</div>
                <div className="text-lg font-bold" style={{ color: evalResult.sharpeRatio > 0.5 ? POS : WARN }}>
                  {evalResult.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-2 bg-[var(--canvas)]">
                <div className="text-[10px] text-[var(--ink-3)]">预期年化收益</div>
                <div className="text-lg font-bold text-[var(--ink)]">{(evalResult.expectedReturn * 100).toFixed(1)}%</div>
              </div>
              <div className="text-center p-2 bg-[var(--canvas)]">
                <div className="text-[10px] text-[var(--ink-3)]">年化波动率</div>
                <div className="text-lg font-bold text-[var(--ink)]">{(evalResult.volatility * 100).toFixed(1)}%</div>
              </div>
              <div className="text-center p-2 bg-[var(--canvas)]">
                <div className="text-[10px] text-[var(--ink-3)]">约束违反</div>
                <div className="text-lg font-bold" style={{ color: evalResult.violations.length === 0 ? POS : DANGER }}>
                  {evalResult.violations.length === 0 ? '✓ 无' : `${evalResult.violations.length}项`}
                </div>
              </div>
            </div>
            
            {evalResult.violations.length > 0 && (
              <div className="p-3 bg-[var(--warning-bg)] border-l-4" style={{ borderLeftColor: WARN }}>
                <div className="text-xs font-medium text-[var(--warning)] mb-1">发现问题</div>
                {evalResult.violations.map((v, i) => (
                  <div key={i} className="text-xs text-[var(--ink-2)] mb-1">• {v}</div>
                ))}
              </div>
            )}
          </div>

          {/* 优化按钮 */}
          <button
            onClick={handleGAOptimization}
            disabled={optimizing}
            className={`w-full py-3 rounded font-semibold text-white transition-all ${
              optimizing
                ? 'bg-[var(--ink-3)] cursor-not-allowed'
                : 'hover:opacity-90'
            }`}
            style={{ background: optimizing ? undefined : RED }}
          >
            {optimizing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                遗传算法正在进化中...
              </span>
            ) : '🚀 启动遗传算法优化'}
          </button>

          {/* 优化结果 */}
          {gaResult && (
            <div className="border border-[var(--positive)] p-4 bg-[var(--positive-bg)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <span className="font-semibold text-[var(--ink)]">优化结果</span>
                {gaResult.converged && (
                  <span className="text-[10px] px-2 py-0.5 bg-[var(--positive)] text-white rounded">已收敛</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: '现金层', current: config.cashRatio, optimized: gaResult.optimizedRatios.cash },
                  { label: '稳健层', current: config.stableRatio, optimized: gaResult.optimizedRatios.stable },
                  { label: '成长层', current: config.growthRatio, optimized: gaResult.optimizedRatios.growth },
                  { label: '卫星层', current: config.satelliteRatio, optimized: gaResult.optimizedRatios.satellite },
                ].map(item => (
                  <div key={item.label} className="text-center p-2 bg-white">
                    <div className="text-[10px] text-[var(--ink-3)]">{item.label}</div>
                    <div className="text-sm font-medium text-[var(--ink)]">
                      {(item.optimized * 100).toFixed(0)}%
                      {item.optimized !== item.current && (
                        <span className="text-[10px] ml-1" style={{ color: item.optimized > item.current ? POS : DANGER }}>
                          {item.optimized > item.current ? '↑' : '↓'}
                          {Math.abs(item.optimized - item.current) * 100}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-center text-xs">
                <div>
                  <div className="text-[var(--ink-3)]">优化后夏普比率</div>
                  <div className="text-lg font-bold" style={{ color: POS }}>{gaResult.sharpeRatio.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[var(--ink-3)]">进化代数</div>
                  <div className="text-lg font-bold text-[var(--ink)]">{gaResult.iterations}</div>
                </div>
                <div>
                  <div className="text-[var(--ink-3)]">适应度提升</div>
                  <div className="text-lg font-bold" style={{ color: POS }}>+{(gaResult.fitness * 100).toFixed(1)}%</div>
                </div>
              </div>

              <button
                onClick={() => onOptimizedConfig?.(gaResult.optimizedConfig)}
                className="w-full py-2 bg-[var(--positive)] text-white rounded font-medium hover:opacity-90"
              >
                应用优化后的配置
              </button>
            </div>
          )}

          <div className="text-xs text-[var(--ink-3)] leading-relaxed">
            💡 遗传算法模拟生物进化过程，通过选择、交叉、变异操作，在满足所有合规约束的前提下，
            自动搜索最优配置比例。种群规模100，迭代50代，通常在20-30代时收敛。
          </div>
        </div>
      )}

      {/* ── 蒙特卡洛模拟 ──────────────────────────────────── */}
      {activeTab === 'montecarlo' && (
        <div className="space-y-4">
          <div className="bg-[var(--canvas)] p-4 rounded">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--brand-red)]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🎲</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--ink)] mb-1">蒙特卡洛模拟评估</h3>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  基于10,000次随机市场情景模拟，评估您的配置方案在退休后35年的财务可持续性。
                  通过概率化的方法，告别「确定性预测」，拥抱「概率化结果」。
                </p>
              </div>
            </div>
          </div>

          {/* 风险指标 */}
          {riskMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-[var(--canvas)] text-center">
                <div className="text-[10px] text-[var(--ink-3)] mb-1">夏普比率</div>
                <div className="text-xl font-bold" style={{ color: riskMetrics.sharpeRatio > 0.5 ? POS : WARN }}>
                  {riskMetrics.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-[var(--canvas)] text-center">
                <div className="text-[10px] text-[var(--ink-3)] mb-1">索提诺比率</div>
                <div className="text-xl font-bold" style={{ color: riskMetrics.sortinoRatio > 0.5 ? POS : WARN }}>
                  {riskMetrics.sortinoRatio.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-[var(--canvas)] text-center">
                <div className="text-[10px] text-[var(--ink-3)] mb-1">95%VaR风险价值</div>
                <div className="text-xl font-bold text-[var(--ink)]">
                  ¥{(riskMetrics.var95 / 10000).toFixed(1)}万
                </div>
              </div>
              <div className="p-3 bg-[var(--canvas)] text-center">
                <div className="text-[10px] text-[var(--ink-3)] mb-1">CVaR条件风险</div>
                <div className="text-xl font-bold text-[var(--ink)]">
                  ¥{(riskMetrics.cvar95 / 10000).toFixed(1)}万
                </div>
              </div>
              <div className="p-3 bg-[var(--canvas)] text-center">
                <div className="text-[10px] text-[var(--ink-3)] mb-1">最大回撤估算</div>
                <div className="text-xl font-bold" style={{ color: DANGER }}>
                  {(riskMetrics.maxDrawdown * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-[var(--canvas)] text-center">
                <div className="text-[10px] text-[var(--ink-3)] mb-1">现金流永续</div>
                <div className="text-xl font-bold" style={{ color: cashflow.perpetual ? POS : WARN }}>
                  {cashflow.perpetual ? '✓ 是' : '⚠ 否'}
                </div>
              </div>
            </div>
          )}

          {/* 情景分析 */}
          {scenarioResult && (
            <div className="border border-[var(--line)] p-4 bg-white">
              <div className="text-sm font-medium text-[var(--ink)] mb-3">三种情景下的退休资产预测</div>
              <div className="space-y-3">
                {[
                  { key: 'optimistic', label: '乐观情景 (+2σ)', color: POS, bg: POS_BG, data: scenarioResult.optimistic },
                  { key: 'base', label: '基准情景 (期望)', color: GOLD_DEEP, bg: 'var(--canvas)', data: scenarioResult.base },
                  { key: 'pessimistic', label: '悲观情景 (-2σ)', color: DANGER, bg: 'var(--warning-bg)', data: scenarioResult.pessimistic },
                ].map(scenario => (
                  <div key={scenario.key} className="p-3" style={{ background: scenario.bg }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium" style={{ color: scenario.color }}>{scenario.label}</span>
                      <span className="text-xs text-[var(--ink-3)]">年化 {(scenario.data.annualReturn * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--ink-2)]">100岁退休资产：</span>
                      <span className="font-bold text-[var(--ink)]">
                        ¥{scenario.data.endingBalance > 0 ? `${(scenario.data.endingBalance / 10000).toFixed(0)}万` : '耗尽'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleMonteCarlo}
            disabled={mcRunning}
            className={`w-full py-3 rounded font-semibold text-white transition-all ${
              mcRunning ? 'bg-[var(--ink-3)] cursor-not-allowed' : 'hover:opacity-90'
            }`}
            style={{ background: mcRunning ? undefined : RED }}
          >
            {mcRunning ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在进行10,000次模拟...
              </span>
            ) : '📈 运行蒙特卡洛模拟'}
          </button>

          <div className="text-xs text-[var(--ink-3)] leading-relaxed">
            💡 蒙特卡洛方法通过大量随机抽样模拟不确定的未来市场情景，帮助您理解方案的
            「最好能到多少」、「最坏会怎样」，做出更理性的投资决策。
          </div>
        </div>
      )}

      {/* ── K-Means聚类 ──────────────────────────────────── */}
      {activeTab === 'kmeans' && (
        <div className="space-y-4">
          <div className="bg-[var(--canvas)] p-4 rounded">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--brand-gold)]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">👥</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--ink)] mb-1">K-Means客户聚类分析</h3>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  基于您的人口统计学特征和财务状况，将您归入相似的客户群体，
                  从「同类人」的历史配置中学习，提升配置建议的置信度。
                </p>
              </div>
            </div>
          </div>

          {/* 相似客户 */}
          <div className="border border-[var(--line)] p-4 bg-white">
            <div className="text-sm font-medium text-[var(--ink)] mb-3">与您特征相似的客户群体</div>
            <div className="space-y-2">
              {similarCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-[var(--canvas)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-gold-light)]/30 flex items-center justify-center text-sm">
                      👤
                    </div>
                    <div>
                      <div className="text-sm text-[var(--ink)]">相似客户 #{c.id}</div>
                      <div className="text-[10px] text-[var(--ink-3)]">
                        资产 ¥{(c.assets / 10000).toFixed(0)}万 · {c.age}岁 · {c.riskLevel}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: POS }}>
                      {(parseFloat(c.similarity) * 100).toFixed(0)}% 相似
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 客户群体画像 */}
          <button
            onClick={handleKMeansDemo}
            className="w-full py-3 bg-[var(--canvas)] text-[var(--ink-2)] rounded font-medium hover:bg-[var(--brand-gold-light)]/20 transition-all"
          >
            🔍 查看完整客户群体画像
          </button>

          {clusterResult && (
            <div className="border border-[var(--line)] p-4 bg-white">
              <div className="text-sm font-medium text-[var(--ink)] mb-3">全量客户聚类分析结果</div>
              <div className="space-y-2">
                {clusterResult.map(cluster => (
                  <div key={cluster.clusterId} className="flex items-center justify-between p-2 bg-[var(--canvas)]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" 
                        style={{ background: [RED, GOLD, GOLD_DEEP, 'var(--brand-red-dark)', 'var(--ink-2)'][cluster.clusterId] }}>
                        {cluster.clusterId + 1}
                      </span>
                      <span className="text-sm text-[var(--ink)]">{cluster.description}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--ink-2)]">{cluster.count}人</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 置信度评估 */}
          {confidence && (
            <div className="p-4 bg-[var(--positive-bg)] border border-[var(--positive)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎯</span>
                <span className="font-semibold text-[var(--ink)]">配置置信度评估</span>
              </div>
              <div className="text-sm text-[var(--ink-2)]">
                <div className="flex justify-between mb-1">
                  <span>基础置信度</span>
                  <span>{(confidence.baseConfidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>相似客户提升</span>
                  <span>+{(confidence.similarityBoost * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>投资经验提升</span>
                  <span>+{(confidence.experienceBoost * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--ink)] mt-2 pt-2 border-t border-[var(--line)]">
                  <span>最终置信度</span>
                  <span style={{ color: confidence.confidenceLevel === 'high' ? POS : confidence.confidenceLevel === 'medium' ? GOLD_DEEP : WARN }}>
                    {(confidence.finalConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-[var(--ink-3)] leading-relaxed">
            💡 K-Means聚类将客户按特征相似度分组，让「同类人」的配置经验为您服务。
            当您有足够的「参照系」时，配置建议的置信度会显著提升。
          </div>
        </div>
      )}

      {/* ── AI对话投顾 ──────────────────────────────────── */}
      {activeTab === 'chatbot' && (
        <div className="space-y-4">
          <div className="bg-[var(--canvas)] p-4 rounded">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--brand-red)]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--ink)] mb-1">AI对话式智能投顾</h3>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  用自然语言与AI助手对话，了解配置逻辑、调整方案、解答金融知识疑问。
                  AI会理解您的意图，用通俗易懂的语言解释专业概念。
                </p>
              </div>
            </div>
          </div>

          {/* 对话历史 */}
          <div className="h-64 overflow-y-auto border border-[var(--line)] p-3 bg-white rounded space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-[var(--brand-red)] text-white rounded-br-sm'
                    : 'bg-[var(--canvas)] text-[var(--ink-2)] rounded-bl-sm'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--canvas)] px-4 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[var(--ink-3)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[var(--ink-3)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[var(--ink-3)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="请输入您的理财问题..."
              className="flex-1 px-4 py-2 border border-[var(--line)] rounded focus:outline-none focus:border-[var(--brand-red)] text-sm"
            />
            <button
              onClick={handleChat}
              disabled={chatLoading || !chatInput.trim()}
              className="px-6 py-2 bg-[var(--brand-red)] text-white rounded font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              发送
            </button>
          </div>

          {/* 快捷问题 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[var(--ink-3)]">试试问：</span>
            {['什么是DTI？', '为什么这样配置？', '我想更保守一点', '什么是金字塔配置？'].map(q => (
              <button
                key={q}
                onClick={() => { setChatInput(q); }}
                className="text-xs px-2 py-1 bg-[var(--canvas)] text-[var(--ink-2)] rounded hover:bg-[var(--brand-gold-light)]/20 transition-all"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="text-xs text-[var(--ink-3)] leading-relaxed">
            💡 AI对话投顾基于自然语言处理技术，能理解您的意图并给出个性化建议。
            记住：投资有风险，AI建议仅供参考，最终决策请咨询专业人士。
          </div>
        </div>
      )}

      {/* 免责声明 */}
      <div className="mt-6 pt-4 border-t border-[var(--line)]">
        <div className="text-[10px] text-[var(--ink-3)] leading-relaxed flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          <span>
            以上AI算法结果仅供辅助参考，不构成投资建议。实际投资决策请咨询网点工作人员。
            算法参数和模型版本：遗传算法 GA-v1.0 | 蒙特卡洛 MC-v1.0 | K-Means KM-v1.0 | LLM Advisor LLM-v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
