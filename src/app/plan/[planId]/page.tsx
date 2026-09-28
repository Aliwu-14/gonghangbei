'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { computeCashFlow } from '@/lib/algorithm/cashflow';
import { buildConfigFromRatios, scaleItemsToConfig, generatePyramidPlan } from '@/lib/algorithm/pyramid';
import { dualTreeClassify } from '@/lib/algorithm/dual-tree';
import { PageBar, Container } from '@/components/PageBar';
import AIAdvisorPanel from '@/components/AIAdvisorPanel';

export default function PlanOverviewPage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const { tierResult, pyramidConfig, currentKYC, currentCustomer, planItems, kycDirty, planCustomized } = state;

  const [adjusting, setAdjusting] = useState(false);
  const [ratios, setRatios] = useState({ cash: 0, stable: 0, growth: 0, satellite: 0 });
  const [showCashflow, setShowCashflow] = useState(true);

  useEffect(() => {
    if (!tierResult || !pyramidConfig || !currentKYC) {
      router.push('/login');
    }
  }, [tierResult, pyramidConfig, currentKYC, router]);

  if (!tierResult || !pyramidConfig || !currentKYC) return null;

  const cashflow = computeCashFlow(currentKYC, pyramidConfig, planItems);

  const equityCap = tierResult.equityCap;
  const cashFloor = Math.min(0.6, (currentKYC.monthlyExpense * 3) / Math.max(1, currentKYC.investableAssets));
  const sumR = ratios.cash + ratios.stable + ratios.growth + ratios.satellite;
  const equityR = ratios.growth + ratios.satellite;
  const validRatios = Math.abs(sumR - 1) < 0.001 && equityR <= equityCap + 0.001 && ratios.cash >= cashFloor - 0.001;

  const startAdjust = () => {
    setRatios({
      cash: pyramidConfig.cashRatio, stable: pyramidConfig.stableRatio,
      growth: pyramidConfig.growthRatio, satellite: pyramidConfig.satelliteRatio,
    });
    setAdjusting(true);
  };

  const applyRatios = () => {
    const config = buildConfigFromRatios(ratios, pyramidConfig.totalAmount);
    const items = scaleItemsToConfig(planItems, config, currentKYC);
    dispatch({ type: 'UPDATE_CONFIG', payload: { config, items } });
    setAdjusting(false);
  };

  const stepRatio = (key: 'cash' | 'stable' | 'growth' | 'satellite', delta: number) => {
    setRatios(prev => {
      const next = { ...prev };
      next[key] = Math.round((prev[key] + delta) * 100) / 100;
      if (next[key] < 0) next[key] = 0;
      if (next[key] > 1) next[key] = 1;
      return next;
    });
  };

  const rebalance = () => {
    setRatios(prev => {
      const diff = 1 - (prev.cash + prev.stable + prev.growth + prev.satellite);
      const next = { ...prev };
      let stable = prev.stable + diff;
      if (stable < 0) stable = 0;
      next.stable = Math.round(stable * 100) / 100;
      return next;
    });
  };

  const regeneratePlan = () => {
    const tier = dualTreeClassify(currentKYC);
    dispatch({ type: 'SET_TIER', payload: tier });
    const { config, items } = generatePyramidPlan(currentKYC, tier.finalTier);
    dispatch({ type: 'SET_PYRAMID', payload: { config, items } });
    router.push('/plan/generate');
  };

  const layers = [
    { key: 'satellite', label: '卫星策略层', ratio: pyramidConfig.satelliteRatio, amount: pyramidConfig.satelliteAmount, color: 'var(--brand-red-dark)', visible: pyramidConfig.satelliteRatio > 0 },
    { key: 'growth', label: '长期成长层', ratio: pyramidConfig.growthRatio, amount: pyramidConfig.growthAmount, color: 'var(--brand-gold-deep)', visible: true },
    { key: 'stable', label: '稳健保障层', ratio: pyramidConfig.stableRatio, amount: pyramidConfig.stableAmount, color: 'var(--brand-gold)', visible: true },
    { key: 'cash', label: '应急现金层', ratio: pyramidConfig.cashRatio, amount: pyramidConfig.cashAmount, color: 'var(--brand-red)', visible: true },
  ].filter(l => l.visible);

  const fmtWan = (n: number) => `¥${(n / 10000).toFixed(1)}万`;

  // 工行红+棕金语义色
  const RED = 'var(--brand-red)';
  const RED_DARK = 'var(--brand-red-dark)';
  const RED_DEEP = 'var(--brand-red-deep)';
  const GOLD = 'var(--brand-gold)';
  const GOLD_DEEP = 'var(--brand-gold-deep)';
  const MIST = 'var(--ink-3)';
  const FOG = 'var(--ink-4)';
  const POS = 'var(--positive)';
  const POS_BG = 'var(--positive-bg)';
  const WARN = 'var(--warning)';
  const WARN_BG = 'var(--warning-bg)';
  const DANGER = 'var(--danger)';
  const DANGER_BG = 'var(--danger-bg)';

  return (
    <>
      <PageBar
        breadcrumb={[{ label: "财富规划", href: "/welcome" }, { label: "专属配置方案" }]}
        right={
          <div className="text-sm text-[var(--ink-2)] tabular-nums">
            您好，<span className="font-semibold text-[var(--brand-red)]">{currentCustomer?.demoName}</span>
          </div>
        }
      />

      <Container>
        {kycDirty && (
          <div className="notice notice-warning mb-6 flex items-center justify-between">
            <span>您修改过个人信息或财务状况，当前方案基于修改前的数据（风险评估等级由银行端锁定，未变更）</span>
            <button onClick={regeneratePlan} className="ml-4 btn btn-ghost text-[var(--warning)] whitespace-nowrap hover:bg-white">
              重新生成方案 →
            </button>
          </div>
        )}

        {/* 分层结果 */}
        <div className="card p-8 mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="icbc-section-title">您的客户分层</h2>
            <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">TIER CLASSIFICATION</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--line)] border border-[var(--line)] mb-6">
            <div className="bg-[var(--brand-red)] text-white p-6 text-center">
              <div className="text-[10px] tracking-widest text-[var(--brand-gold-light)] uppercase mb-2">服务层级</div>
              <div className="text-4xl font-bold text-[var(--brand-gold-light)] leading-none mb-2 tracking-tighter">{tierResult.finalTier}</div>
              <div className="text-xs text-white/70 tracking-wider">{tierResult.tierName}</div>
            </div>
            <div className="bg-white p-6 text-center">
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-2">权益配置上限</div>
              <div className="text-3xl font-semibold text-[var(--ink)] leading-none mb-2 tabular-nums">{(tierResult.equityCap * 100).toFixed(0)}<span className="text-base ml-0.5">%</span></div>
              <div className="text-xs text-[var(--ink-3)] tracking-wider">成长 + 卫星层占比上限</div>
            </div>
            <div className="bg-white p-6 text-center">
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-2">评估置信度</div>
              <div className="text-3xl font-semibold text-[var(--ink)] leading-none mb-2 tabular-nums">{(tierResult.confidence * 100).toFixed(0)}<span className="text-base ml-0.5">%</span></div>
              <div className="text-xs text-[var(--ink-3)] tracking-wider">分类结果可信度</div>
            </div>
          </div>

          <div className="bg-[var(--canvas)] p-5 mb-4 border-l-2 border-[var(--brand-red)]">
            <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-3">分层依据</div>
            <div className="flex flex-wrap items-center gap-2">
              {tierResult.classificationPath.map((step, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-white text-sm text-[var(--ink)] border border-[var(--line)]">{step}</span>
                  {i < tierResult.classificationPath.length - 1 && <span className="text-[var(--brand-red)] font-mono">→</span>}
                </span>
              ))}
            </div>
          </div>

          {tierResult.adjustments.length > 0 && (
            <div className="border-l-2 border-[var(--warning)] bg-[var(--warning-bg)] p-5">
              <div className="text-[10px] tracking-widest text-[var(--warning)] uppercase mb-3">个性化调整</div>
              <div className="space-y-3">
                {tierResult.adjustments.map((adj, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-[var(--warning)] text-base tabular-nums w-6">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <span className="font-medium text-[var(--ink)]">{adj.dimension}</span>
                      <span className="text-[var(--ink-3)] ml-2">·</span>
                      <span className="text-[var(--ink-2)] ml-2">{adj.change}</span>
                      <div className="text-[var(--ink-2)] text-xs mt-1">{adj.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 现金流永续测算 ── */}
        <div className="card p-6 mb-6 border-l-4" style={{ borderLeftColor: RED }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--ink)] flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: RED }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              现金流永续测算
            </h2>
            <button onClick={() => setShowCashflow(!showCashflow)} className="text-sm text-[var(--ink-3)] hover:text-[var(--ink-2)]">
              {showCashflow ? '收起' : '展开'}
            </button>
          </div>

          {showCashflow && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 border border-[var(--line)] bg-white">
                  <div className="text-xs text-[var(--ink-3)] mb-1">{cashflow.alreadyRetired ? '当前可支配资产' : `${cashflow.retirementAge}岁预测资产`}</div>
                  <div className="text-xl font-bold text-[var(--ink)]">{fmtWan(cashflow.assetsAtRetirement)}</div>
                  <div className="text-[10px] text-[var(--ink-3)] mt-1">组合年化 {(cashflow.expectedReturn * 100).toFixed(1)}%</div>
                </div>
                <div className="p-4 bg-[var(--canvas)]">
                  <div className="text-xs text-[var(--ink-3)] mb-1">{cashflow.alreadyRetired ? '当前月现金流' : '退休后月现金流'}</div>
                  <div className="text-xl font-bold" style={{ color: RED }}>¥{Math.round(cashflow.monthlyCashFlow).toLocaleString()}</div>
                  <div className="text-[10px] text-[var(--ink-3)] mt-1">安全提取率 {(cashflow.sustainableRate * 100).toFixed(1)}% + 养老金</div>
                </div>
                <div className={`p-4 ${cashflow.perpetual ? '' : ''}`} style={{ background: cashflow.perpetual ? POS_BG : WARN_BG }}>
                  <div className="text-xs text-[var(--ink-3)] mb-1">现金流可持续性</div>
                  <div className={`text-xl font-bold ${cashflow.perpetual ? '' : ''}`} style={{ color: cashflow.perpetual ? POS : WARN }}>
                    {cashflow.perpetual ? '永续 ✓' : `至${cashflow.depletionAge}岁`}
                  </div>
                  <div className="text-[10px] text-[var(--ink-3)] mt-1">{cashflow.perpetual ? '至100岁仍有结余' : '测算资产耗尽年龄'}</div>
                </div>
                <div className="p-4 bg-[var(--canvas)]">
                  <div className="text-xs text-[var(--ink-3)] mb-1">支出覆盖率</div>
                  <div className="text-xl font-bold" style={{ color: cashflow.coverageRatio >= 1 ? POS : cashflow.coverageRatio >= 0.7 ? WARN : DANGER }}>
                    {(cashflow.coverageRatio * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-[var(--ink-3)] mt-1">现金流 ÷ 同期支出</div>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-xs text-[var(--ink-3)] mb-1">
                  <span>{cashflow.alreadyRetired ? '当前' : `${cashflow.retirementAge}岁退休时`}支出覆盖情况</span>
                  <span>目标 100%</span>
                </div>
                <div className="bar h-3">
                  <div
                    className={`bar-fill ${cashflow.coverageRatio >= 1 ? '' : cashflow.coverageRatio >= 0.7 ? '' : ''}`}
                    style={{ width: `${Math.min(100, cashflow.coverageRatio * 100)}%`, background: cashflow.coverageRatio >= 1 ? POS : cashflow.coverageRatio >= 0.7 ? WARN : DANGER }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-5">
                <div className="flex justify-between py-1 border-b border-[var(--line-2)]">
                  <span className="text-[var(--ink-3)]">{cashflow.alreadyRetired ? '当前年支出' : '退休首年支出（含通胀）'}</span>
                  <span className="font-medium text-[var(--ink)]">¥{Math.round(cashflow.annualNeedAtRetirement).toLocaleString()}/年</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line-2)]">
                  <span className="text-[var(--ink-3)]">养老金年收入（社保估算）</span>
                  <span className="font-medium text-[var(--ink)]">¥{Math.round(cashflow.pensionAnnual).toLocaleString()}/年</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line-2)]">
                  <span className="text-[var(--ink-3)]">年度现金流缺口</span>
                  <span className={`font-medium ${cashflow.annualGap > 0 ? '' : ''}`} style={{ color: cashflow.annualGap > 0 ? DANGER : POS }}>
                    {cashflow.annualGap > 0 ? `¥${Math.round(cashflow.annualGap).toLocaleString()}` : '无缺口'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line-2)]">
                  <span className="text-[var(--ink-3)]">{cashflow.alreadyRetired ? '—' : '定投假设（月结余）'}</span>
                  <span className="font-medium text-[var(--ink)]">{cashflow.alreadyRetired ? '已退休' : `¥${Math.round(cashflow.monthlySurplus).toLocaleString()}/月`}</span>
                </div>
              </div>

              {!cashflow.alreadyRetired && (() => {
                const monthlyExpenseAtRetirement = currentKYC.monthlyExpense * Math.pow(1 + 0.025, cashflow.yearsToRetirement);
                const pensionGap = Math.max(0, monthlyExpenseAtRetirement - cashflow.pensionMonthly);
                const gapRatio = monthlyExpenseAtRetirement > 0 ? pensionGap / monthlyExpenseAtRetirement : 0;

                return (
                  <div className="p-5 mb-5 border border-[var(--line)] bg-[var(--canvas)]">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" style={{ color: RED }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-[var(--ink)]">退休金估算与缺口分析</h3>
                      <span className="text-[10px] text-[var(--ink-3)] ml-auto">基于社保公式简化模型</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white p-3 text-center">
                        <div className="text-[10px] text-[var(--ink-3)] mb-1">估算月退休金</div>
                        <div className="text-lg font-bold" style={{ color: POS }}>¥{Math.round(cashflow.pensionMonthly).toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--ink-3)] mt-1">替代率 {(cashflow.pensionReplacementRate * 100).toFixed(0)}%</div>
                      </div>
                      <div className="bg-white p-3 text-center">
                        <div className="text-[10px] text-[var(--ink-3)] mb-1">退休月支出</div>
                        <div className="text-lg font-bold text-[var(--ink)]">¥{Math.round(monthlyExpenseAtRetirement).toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--ink-3)] mt-1">含通胀调整</div>
                      </div>
                      <div className="bg-white p-3 text-center">
                        <div className="text-[10px] text-[var(--ink-3)] mb-1">月度缺口</div>
                        <div className="text-lg font-bold" style={{ color: pensionGap > 0 ? DANGER : POS }}>
                          ¥{Math.round(pensionGap).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[var(--ink-3)] mt-1">需投资弥补</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-[var(--ink-3)] mb-1">
                        <span>退休金覆盖</span>
                        <span>缺口 {(gapRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-3 bg-[var(--paper)] overflow-hidden flex">
                        <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, (1 - gapRatio) * 100)}%`, background: POS }} />
                        <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, gapRatio * 100)}%`, background: DANGER }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1">
                        <span style={{ color: POS }}>¥{Math.round(cashflow.pensionMonthly).toLocaleString()}/月</span>
                        <span style={{ color: DANGER }}>¥{Math.round(pensionGap).toLocaleString()}/月</span>
                      </div>
                    </div>

                    {pensionGap > 0 && (
                      <div className="bg-white p-3 border-l-4" style={{ borderLeftColor: RED }}>
                        <div className="text-xs font-medium text-[var(--ink)] mb-1">弥补建议</div>
                        <div className="text-xs text-[var(--ink-2)]">
                          距离退休还有 <span className="font-semibold" style={{ color: RED }}>{cashflow.yearsToRetirement}年</span>，
                          建议每月额外定投 <span className="font-bold" style={{ color: RED }}>¥{Math.round(cashflow.monthlyDCAForPensionGap).toLocaleString()}</span> 至推荐组合，
                          即可在退休时积累足够资产弥补退休金缺口。
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-[var(--ink-3)] mt-3 leading-relaxed">
                      估算依据：缴费年限约{cashflow.pensionContributionYears}年，基于当前收入与全国社平工资比值确定替代率分档。
                      实际退休金受政策调整、缴费基数变化等因素影响，本估算仅供参考。
                    </div>
                  </div>
                );
              })()}

              {cashflow.milestones.length > 0 && (
                <div className="bg-[var(--canvas)] p-4 mb-4">
                  <div className="text-sm font-medium text-[var(--ink)] mb-3">资产里程碑（按当前方案推演）</div>
                  <div className="flex items-end gap-2 h-24">
                    {cashflow.milestones.map((m, i) => {
                      const max = Math.max(...cashflow.milestones.map(x => x.assets), 1);
                      const h = Math.max(4, (m.assets / max) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                          <span className="text-[9px] text-[var(--ink-3)] mb-0.5">{(m.assets / 10000).toFixed(0)}万</span>
                          <div className="w-full" style={{ height: `${h}%`, background: cashflow.perpetual ? POS : WARN }}></div>
                          <span className="text-[9px] text-[var(--ink-3)] mt-1">{m.age}岁</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-[var(--ink-3)] leading-relaxed">
                测算假设：通胀 2.5%/年；养老金基于社保公式简化模型（缴费年限×分档替代率）；退休后组合收益取 min(组合预期, 4%)；安全提取率按权益占比 3.0%-4.5% 分档。
                {cashflow.annualGap > 0 && !cashflow.perpetual && <span style={{ color: WARN }}> 当前方案下资产约在 {cashflow.depletionAge} 岁耗尽，建议提高定投或调整目标。</span>}
                {cashflow.perpetual && <span style={{ color: POS }}> 当前方案可实现现金流永续（至100岁仍有结余）。</span>}
                调整下方配置比例或产品后，测算将自动更新。
              </div>
            </>
          )}
        </div>

        {/* ── 不行动的代价 ── */}
        <div className="card p-6 mb-6 border-l-4" style={{ borderLeftColor: GOLD_DEEP }}>
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: GOLD_DEEP }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            不行动的代价
          </h2>
          <p className="text-sm text-[var(--ink-3)] mb-5">如果这笔钱继续放在活期账户里，与按推荐方案配置的差距会越来越大</p>

          {(() => {
            const years = 30;
            const savingsRate = 0.0035;
            const portfolioRate = Math.min(cashflow.expectedReturn, 0.06);
            const initialAssets = currentKYC.investableAssets;
            const monthlyContribution = Math.max(0, currentKYC.annualIncome / 12 - currentKYC.monthlyExpense - currentKYC.mortgageMonthly - currentKYC.otherMonthlyDebt);

            const data: { year: number; savings: number; portfolio: number }[] = [];
            let s = initialAssets, p = initialAssets;
            for (let y = 0; y <= years; y++) {
              data.push({ year: y, savings: Math.round(s), portfolio: Math.round(p) });
              s = s * (1 + savingsRate) + monthlyContribution * 12;
              p = p * (1 + portfolioRate) + monthlyContribution * 12;
            }

            const maxVal = Math.max(...data.map(d => d.portfolio), 1);
            const finalSavings = data[data.length - 1].savings;
            const finalPortfolio = data[data.length - 1].portfolio;
            const gap = finalPortfolio - finalSavings;
            const gapRatio = finalSavings > 0 ? (finalPortfolio / finalSavings) : 0;

            return (
              <>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-[var(--canvas)] p-4 text-center">
                    <div className="text-xs text-[var(--ink-3)] mb-1">30年后（活期）</div>
                    <div className="text-xl font-bold text-[var(--ink-3)]">{fmtWan(finalSavings)}</div>
                    <div className="text-[10px] text-[var(--ink-3)]">年化 ~0.35%</div>
                  </div>
                  <div className="p-4 text-center border border-[var(--brand-red)]">
                    <div className="text-xs text-[var(--ink-3)] mb-1">30年后（推荐方案）</div>
                    <div className="text-xl font-bold" style={{ color: RED }}>{fmtWan(finalPortfolio)}</div>
                    <div className="text-[10px] text-[var(--ink-3)]">年化 ~{(portfolioRate * 100).toFixed(1)}%</div>
                  </div>
                  <div className="p-4 text-center border border-[var(--brand-gold)]">
                    <div className="text-xs text-[var(--ink-3)] mb-1">差距</div>
                    <div className="text-xl font-bold" style={{ color: GOLD_DEEP }}>{fmtWan(gap)}</div>
                    <div className="text-[10px] text-[var(--ink-3)]">{gapRatio.toFixed(1)}倍</div>
                  </div>
                </div>

                <div className="bg-[var(--canvas)] p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[var(--ink)]">资产增长对比（万元）</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3" style={{ background: FOG }} /> 活期存款</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3" style={{ background: RED }} /> 推荐方案</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 h-32">
                    {data.filter((_, i) => i % 3 === 0 || i === years).map((d) => {
                      const hS = Math.max(2, (d.savings / maxVal) * 100);
                      const hP = Math.max(2, (d.portfolio / maxVal) * 100);
                      return (
                        <div key={d.year} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: '100%' }}>
                            <div className="w-2" style={{ height: `${hS}%`, background: FOG }} title={`活期: ${fmtWan(d.savings)}`} />
                            <div className="w-2" style={{ height: `${hP}%`, background: RED }} title={`推荐: ${fmtWan(d.portfolio)}`} />
                          </div>
                          <span className="text-[9px] text-[var(--ink-3)] mt-1">{d.year}年</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 text-sm flex items-start gap-2" style={{ background: DANGER_BG, color: DANGER }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    按 2.5% 通胀计算，活期存款 {Math.ceil(Math.log(0.5) / Math.log(1 - 0.025 + 0.0035))} 年后购买力减半。
                    今天的 {fmtWan(initialAssets)}，{Math.ceil(Math.log(0.5) / Math.log(1 - 0.025 + 0.0035))} 年后只值 {fmtWan(initialAssets * 0.5)}。
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* ── P3: 人生里程碑倒计时 ── */}
        <div className="card p-6 mb-6 border-l-4" style={{ borderLeftColor: RED }}>
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: RED }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            人生里程碑倒计时
          </h2>
          <p className="text-sm text-[var(--ink-3)] mb-5">每个重要节点都需要足够的资金支持，看看你准备好了吗</p>

          {(() => {
            const age = currentKYC.age;
            const retirementAge = currentKYC.yearsToRetirement ? age + currentKYC.yearsToRetirement : 60;
            const yearsToRetirement = Math.max(0, retirementAge - age);

            const milestones = [
              {
                label: '退休生活', age: retirementAge, yearsLeft: yearsToRetirement, icon: '🏖️',
                needAmount: currentKYC.monthlyExpense * 12 * 25, color: RED,
              },
              ...(currentKYC.goals.includes('子女教育') ? [{
                label: '子女上大学', age: age + 18, yearsLeft: 18, icon: '🎓',
                needAmount: 800000, color: GOLD_DEEP,
              }] : []),
              ...(currentKYC.goals.includes('购房首付') || currentKYC.goals.includes('购房改善') ? [{
                label: '购房目标', age: age + 5, yearsLeft: 5, icon: '🏠',
                needAmount: currentKYC.totalAssets * 0.3, color: GOLD,
              }] : []),
              {
                label: '应急储备', age: age, yearsLeft: 0, icon: '🛡️',
                needAmount: currentKYC.monthlyExpense * 6, color: RED_DEEP,
              },
            ];

            const portfolioReturn = Math.min(cashflow.expectedReturn, 0.06);
            const monthlyContribution = Math.max(0, currentKYC.annualIncome / 12 - currentKYC.monthlyExpense - currentKYC.mortgageMonthly - currentKYC.otherMonthlyDebt);

            return (
              <div className="space-y-4">
                {milestones.map((m, i) => {
                  const futureValue = currentKYC.investableAssets * Math.pow(1 + portfolioReturn, m.yearsLeft) +
                    monthlyContribution * 12 * ((Math.pow(1 + portfolioReturn, m.yearsLeft) - 1) / portfolioReturn);
                  const gap = Math.max(0, m.needAmount - futureValue);
                  const progress = Math.min(100, (futureValue / m.needAmount) * 100);

                  return (
                    <div key={i} className="bg-[var(--canvas)] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{m.icon}</span>
                          <div>
                            <div className="font-semibold text-[var(--ink)]">{m.label}</div>
                            <div className="text-xs text-[var(--ink-3)]">
                              {m.yearsLeft === 0 ? '立即需要' : `还有 ${m.yearsLeft} 年（${m.age}岁）`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[var(--ink)]">需要 ¥{(m.needAmount / 10000).toFixed(0)}万</div>
                          <div className="text-xs text-[var(--ink-3)]">预计 ¥{(futureValue / 10000).toFixed(0)}万</div>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="bar h-2">
                          <div
                            className="bar-fill"
                            style={{ width: `${progress}%`, background: m.color }}
                          />
                        </div>
                      </div>

                      {gap > 0 && m.yearsLeft > 0 && (
                        <div className="text-xs flex items-center gap-1" style={{ color: DANGER }}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          资金缺口 ¥{(gap / 10000).toFixed(1)}万，建议每月多定投 ¥{Math.round(gap / m.yearsLeft / 12).toLocaleString()}
                        </div>
                      )}
                      {gap === 0 && (
                        <div className="text-xs flex items-center gap-1" style={{ color: POS }}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          资金充足 ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* ── AI智能算法引擎 ── */}
        <AIAdvisorPanel
          kyc={currentKYC}
          config={pyramidConfig}
          items={planItems}
          onOptimizedConfig={(newConfig) => {
            const items = scaleItemsToConfig(planItems, newConfig, currentKYC);
            dispatch({ type: 'UPDATE_CONFIG', payload: { config: newConfig, items } });
          }}
        />

        {/* ── 金字塔可视化 + 比例调整 ─ */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--ink)]">金字塔配置方案</h2>
            <div className="flex items-center gap-2">
              {planCustomized && <span className="text-xs px-2 py-1 bg-[var(--brand-gold-light)]/20 text-[var(--brand-gold-deep)]">已手动调整</span>}
              {!adjusting ? (
                <button onClick={startAdjust} className="text-sm font-medium hover:underline" style={{ color: RED }}>⚙ 调整比例</button>
              ) : (
                <button onClick={() => setAdjusting(false)} className="text-sm text-[var(--ink-3)] hover:text-[var(--ink-2)]">收起调整</button>
              )}
            </div>
          </div>

          {adjusting && (
            <div className="mb-6 p-4 bg-[var(--canvas)] border border-[var(--line)]">
              <p className="text-sm text-[var(--ink-3)] mb-4">用 +/− 调整各层比例（每次1%），需满足：合计100%、权益（成长+卫星）≤ {(equityCap * 100).toFixed(0)}%、现金层 ≥ {(cashFloor * 100).toFixed(0)}%（应急流动性下限）</p>
              <div className="space-y-3 mb-4">
                {([
                  { key: 'cash', label: '应急现金层', color: RED },
                  { key: 'stable', label: '稳健保障层', color: GOLD },
                  { key: 'growth', label: '长期成长层', color: GOLD_DEEP },
                  { key: 'satellite', label: '卫星策略层', color: RED_DEEP },
                ] as const).map(row => (
                  <div key={row.key} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: row.color }} />
                    <span className="text-sm text-[var(--ink)] w-24">{row.label}</span>
                    <button onClick={() => stepRatio(row.key, -0.01)} className="w-7 h-7 bg-white border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--brand-red)] font-bold" style={{ borderColor: 'var(--line)' }}>−</button>
                    <span className="w-16 text-center font-bold text-[var(--ink)]">{(ratios[row.key] * 100).toFixed(0)}%</span>
                    <button onClick={() => stepRatio(row.key, 0.01)} className="w-7 h-7 bg-white border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--brand-red)] font-bold">+</button>
                    <span className="text-xs text-[var(--ink-3)] ml-2">¥{Math.round(pyramidConfig.totalAmount * ratios[row.key]).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                <span className={`px-2 py-1 ${Math.abs(sumR - 1) < 0.001 ? '' : ''}`} style={{ background: Math.abs(sumR - 1) < 0.001 ? POS_BG : DANGER_BG, color: Math.abs(sumR - 1) < 0.001 ? POS : DANGER }}>
                  合计 {(sumR * 100).toFixed(0)}% {Math.abs(sumR - 1) < 0.001 ? '✓' : '（需=100%）'}
                </span>
                <span className={`px-2 py-1`} style={{ background: equityR <= equityCap + 0.001 ? POS_BG : DANGER_BG, color: equityR <= equityCap + 0.001 ? POS : DANGER }}>
                  权益 {(equityR * 100).toFixed(0)}% / 上限 {(equityCap * 100).toFixed(0)}% {equityR <= equityCap + 0.001 ? '✓' : '超限'}
                </span>
                <span className={`px-2 py-1`} style={{ background: ratios.cash >= cashFloor - 0.001 ? POS_BG : DANGER_BG, color: ratios.cash >= cashFloor - 0.001 ? POS : DANGER }}>
                  现金下限 {(cashFloor * 100).toFixed(0)}% {ratios.cash >= cashFloor - 0.001 ? '✓' : '不足'}
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={rebalance} className="px-4 py-2 text-sm border border-[var(--line)] text-[var(--ink-2)] bg-white hover:bg-[var(--canvas)]">一键配平（差额归入稳健层）</button>
                <button
                  onClick={applyRatios}
                  disabled={!validRatios}
                  className="px-6 py-2 text-sm font-semibold border-0"
                  style={{
                    background: validRatios ? RED : 'var(--line)',
                    color: validRatios ? 'white' : MIST,
                    cursor: validRatios ? 'pointer' : 'not-allowed',
                  }}
                >
                  应用新比例
                </button>
              </div>
            </div>
          )}

          {/* SVG 金字塔 — 工行红+棕金 */}
          <div className="flex flex-col items-center mb-8">
            {(() => {
              const svgW = 400, svgH = 340;
              const apexX = svgW / 2, apexY = 10;
              const baseY = svgH - 10;
              const baseHalfW = 185;
              const n = layers.length;
              const layerH = (baseY - apexY) / n;
              const colorMap: Record<string, string> = {
                satellite: RED_DARK, growth: GOLD_DEEP, stable: GOLD, cash: RED,
              };

              return (
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.10))' }}>
                  {layers.map((layer, i) => {
                    const y1 = apexY + i * layerH;
                    const y2 = apexY + (i + 1) * layerH;
                    const w1 = (y1 - apexY) / (baseY - apexY) * baseHalfW * 2;
                    const w2 = (y2 - apexY) / (baseY - apexY) * baseHalfW * 2;
                    const x1L = apexX - w1 / 2, x1R = apexX + w1 / 2;
                    const x2L = apexX - w2 / 2, x2R = apexX + w2 / 2;
                    const fill = colorMap[layer.key] || MIST;
                    const midY = (y1 + y2) / 2;

                    return (
                      <g key={layer.key}>
                        <polygon
                          points={`${x1L},${y1} ${x1R},${y1} ${x2R},${y2} ${x2L},${y2}`}
                          fill={fill}
                          stroke="white"
                          strokeWidth="2"
                          opacity={0.95}
                        />
                        <text x={apexX} y={midY - 6} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
                          {(layer.ratio * 100).toFixed(0)}%
                        </text>
                        <text x={apexX} y={midY + 10} textAnchor="middle" fill="white" fontSize="11" opacity={0.9}>
                          {layer.label}
                        </text>
                        <text x={apexX} y={midY + 25} textAnchor="middle" fill="white" fontSize="10" opacity={0.75}>
                          ¥{layer.amount.toLocaleString()}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          {/* 各层明细 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {layers.map((layer) => {
              const solidColor: Record<string, string> = { satellite: RED_DARK, growth: GOLD_DEEP, stable: GOLD, cash: RED };
              return (
                <div key={layer.key} className="bg-[var(--canvas)] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: solidColor[layer.key] || MIST }} />
                    <span className="font-medium text-[var(--ink)]">{layer.label}</span>
                  </div>
                  <div className="text-sm text-[var(--ink-2)]">
                    比例 {(layer.ratio * 100).toFixed(0)}% · 金额 ¥{layer.amount.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-[var(--canvas)] text-sm text-[var(--ink-2)] text-center">
            配置基数：¥{pyramidConfig.totalAmount.toLocaleString()} · 合计：¥{(pyramidConfig.cashAmount + pyramidConfig.stableAmount + pyramidConfig.growthAmount + pyramidConfig.satelliteAmount).toLocaleString()}
          </div>
        </div>

        {/* 提示 */}
        <div className="border p-4 mb-6 text-sm" style={{ background: WARN_BG, color: WARN, borderColor: 'var(--warning)' }}>
          本方案根据您的个人信息和风险偏好生成，仅供参考，不构成收益承诺。投资有风险，决策需谨慎。
        </div>

        <div className="flex justify-between items-center">
          <button onClick={() => router.push('/customer')} className="btn btn-secondary">← 返回修改信息</button>
          <button
            onClick={() => router.push(`/plan/${currentCustomer?.customerId}/products`)}
            className="btn btn-primary"
          >
            查看/调整推荐产品 →
          </button>
        </div>
      </Container>
    </>
  );
}