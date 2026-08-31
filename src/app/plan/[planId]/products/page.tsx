'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import type { PyramidLayer, AllocationPlanItem } from '@/types';
import { getLayerCandidates, buildPlanItem, finalizeItems, regenerateItemsForConfig, canAddProduct } from '@/lib/algorithm/pyramid';
import { dualTreeClassify } from '@/lib/algorithm/dual-tree';
import { generatePyramidPlan } from '@/lib/algorithm/pyramid';
import { PageBar, Container } from '@/components/PageBar';

const layerLabels: Record<string, string> = { CASH: '应急现金层', STABLE: '稳健保障层', GROWTH: '长期成长层', SATELLITE: '卫星策略层' };
const layerAccent: Record<string, string> = { CASH: 'var(--brand-red)', STABLE: 'var(--brand-gold)', GROWTH: 'var(--brand-gold-deep)', SATELLITE: 'var(--brand-red-dark)' };
const layerBgLight: Record<string, string> = { CASH: 'bg-[#F5E5E5]', STABLE: 'bg-[#F5EFE2]', GROWTH: 'bg-[#EBDFC6]', SATELLITE: 'bg-[#E8D6D6]' };
const LAYER_ORDER: PyramidLayer[] = ['CASH', 'STABLE', 'GROWTH', 'SATELLITE'];

export default function ProductsPage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const { planItems, currentCustomer, currentKYC, pyramidConfig, kycDirty, planCustomized, tierResult } = state;
  const [swapLayer, setSwapLayer] = useState<PyramidLayer | null>(null);

  useEffect(() => {
    if (!currentCustomer || planItems.length === 0) {
      router.push('/login');
    }
  }, [currentCustomer, planItems, router]);

  if (!currentCustomer || !currentKYC || !pyramidConfig || !tierResult) return null;

  const layerBudgets: Record<string, number> = {
    CASH: pyramidConfig.cashAmount, STABLE: pyramidConfig.stableAmount,
    GROWTH: pyramidConfig.growthAmount, SATELLITE: pyramidConfig.satelliteAmount,
  };

  const updateItems = (items: AllocationPlanItem[]) => dispatch({ type: 'UPDATE_ITEMS', payload: items });

  const setAmount = (itemId: string, amount: number) => {
    updateItems(planItems.map(i => i.itemId === itemId
      ? { ...i, allocationAmount: Math.max(i.product.minAmount, Math.round(amount / 1000) * 1000) }
      : i));
  };

  const removeItem = (itemId: string) => {
    updateItems(planItems.filter(i => i.itemId !== itemId));
  };

  const addProduct = (productId: string, layer: PyramidLayer) => {
    const candidate = getLayerCandidates(layer, currentKYC, []).find(p => p.productId === productId);
    if (!candidate) return;
    const check = canAddProduct(layer, candidate, layerBudgets[layer], planItems);
    if (!check.canAdd) { alert(check.reason); return; }
    const allocated = planItems.filter(i => i.layerCode === layer).reduce((s, i) => s + i.allocationAmount, 0);
    const free = layerBudgets[layer] - allocated;
    const item = buildPlanItem(candidate, layer, Math.max(candidate.minAmount, Math.round(free / 2 / 1000) * 1000), currentKYC);
    updateItems([...planItems, item]);
    setSwapLayer(null);
  };

  const replaceItem = (oldItemId: string, newProductId: string, layer: PyramidLayer) => {
    const candidate = getLayerCandidates(layer, currentKYC, []).find(p => p.productId === newProductId);
    if (!candidate) return;
    const old = planItems.find(i => i.itemId === oldItemId);
    if (!old) return;
    const amount = Math.max(candidate.minAmount, Math.round(old.allocationAmount / 1000) * 1000);
    const item = buildPlanItem(candidate, layer, amount, currentKYC);
    updateItems(planItems.map(i => i.itemId === oldItemId ? item : i));
    setSwapLayer(null);
  };

  const restoreRecommendation = () => {
    const items = regenerateItemsForConfig(pyramidConfig, currentKYC);
    dispatch({ type: 'UPDATE_ITEMS', payload: items });
  };

  const regeneratePlan = () => {
    const tier = dualTreeClassify(currentKYC);
    dispatch({ type: 'SET_TIER', payload: tier });
    const { config, items } = generatePyramidPlan(currentKYC, tier.finalTier);
    dispatch({ type: 'SET_PYRAMID', payload: { config, items } });
    router.push('/plan/generate');
  };

  const goConfirm = () => {
    const { items: finalItems, validation } = finalizeItems(planItems, pyramidConfig);
    if (finalItems.length === 0) { alert('请至少保留一个产品'); return; }
    if (!validation.valid) {
      alert('产品分配存在错误，无法确认方案：\n' + validation.errors.join('\n'));
      return;
    }
    if (validation.warnings.length > 0) {
      const confirmed = confirm('检测到以下问题：\n' + validation.warnings.join('\n') + '\n\n是否仍要继续？');
      if (!confirmed) return;
    }
    dispatch({ type: 'UPDATE_ITEMS', payload: finalItems });
    router.push(`/plan/${currentCustomer?.customerId}/confirm`);
  };

  const totalAllocated = planItems.reduce((s, i) => s + i.allocationAmount, 0);

  return (
    <>
      <PageBar
        breadcrumb={[
          { label: "财富规划", href: "/welcome" },
          { label: "专属配置方案", href: `/plan/${currentCustomer.customerId}` },
          { label: "产品组合调整" },
        ]}
        right={<div className="text-sm text-[var(--ink-2)] tabular-nums">{currentCustomer?.demoName}</div>}
      />

      <Container>

        {/* 页面标题 */}
        <div className="mb-6">
          <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] uppercase mb-2">PRODUCT ALLOCATION · REVIEW & ADJUST</div>
          <h1 className="text-[26px] font-semibold text-[var(--brand-red)] leading-tight mb-2">产品组合调整</h1>
          <div className="accent-line-gold mb-4" />
        </div>

        <div className="notice mb-6">
          <span className="notice-label">操作说明</span>
          您可以调整每个产品的金额（±1,000 元）、替换为同层其他产品、移除不需要的产品，或添加新产品。各层调整总额不能超过该层预算，未分配余额将在确认时自动并入该层首选产品。
          {planCustomized && <span className="ml-2 text-[var(--brand-gold-deep)] font-medium">（您已做过手动调整）</span>}
        </div>

        {kycDirty && (
          <div className="notice notice-warning mb-6 flex items-center justify-between">
            <span>您修改过个人信息，当前推荐基于修改前的数据</span>
            <button onClick={regeneratePlan} className="btn btn-ghost text-[var(--warning)] whitespace-nowrap hover:bg-white">
              重新生成方案 →
            </button>
          </div>
        )}

        {LAYER_ORDER.map(layer => {
          const items = planItems.filter(i => i.layerCode === layer);
          const budget = layerBudgets[layer];
          const allocated = items.reduce((s, i) => s + i.allocationAmount, 0);
          if (budget < 1000 && items.length === 0) return null;
          const pct = budget > 0 ? Math.min(100, (allocated / budget) * 100) : 0;
          const over = allocated > budget;
          const candidates = getLayerCandidates(layer, currentKYC, items.map(i => i.productId));

          return (
            <div key={layer} className="mb-8">
              {/* 层头 */}
              <div className="card p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-1 h-8" style={{ background: layerAccent[layer] }}></div>
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--ink)] tracking-wider">{layerLabels[layer]}</h2>
                      <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mt-0.5">
                        预算 ¥{budget.toLocaleString()} · 已分配 ¥{allocated.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-semibold tabular-nums ${
                      over ? 'text-[var(--danger)]' : allocated < budget ? 'text-[var(--warning)]' : 'text-[var(--positive)]'
                    }`}>
                      {pct.toFixed(0)}<span className="text-sm ml-0.5">%</span>
                    </span>
                    {candidates.length > 0 && (
                      <button
                        onClick={() => setSwapLayer(swapLayer === layer ? null : layer)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          swapLayer === layer
                            ? 'bg-[var(--brand-red)] text-white border border-[var(--brand-red)]'
                            : 'border border-[var(--brand-red)] text-[var(--brand-red)] hover:bg-[var(--brand-red)] hover:text-white'
                        }`}
                      >
                        {swapLayer === layer ? '× 收起' : '+ 添加产品'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bar h-2">
                  <div className="h-full transition-all" style={{
                    width: `${pct}%`,
                    background: over ? 'var(--danger)' : layerAccent[layer]
                  }} />
                </div>
                {over && (
                  <div className="mt-2 text-xs text-[var(--danger)] tracking-wider">该层已超预算 ¥{(allocated - budget).toLocaleString()}，请调减金额或移除产品</div>
                )}
              </div>

              {/* 候选产品添加面板 */}
              {swapLayer === layer && candidates.length > 0 && (
                <div className="bg-[var(--canvas)] p-5 mb-4 border-l-2 border-[var(--brand-red)]">
                  <div className="flex items-baseline justify-between mb-3">
                    <h4 className="text-sm font-semibold text-[var(--ink)] tracking-wider">可添加的{layerLabels[layer]}产品</h4>
                    <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">AVAILABLE · {candidates.length}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)]">
                    {candidates.map(p => (
                      <button
                        key={p.productId}
                        onClick={() => addProduct(p.productId, layer)}
                        className="text-left p-4 bg-white hover:bg-[var(--canvas)] transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-[var(--ink)] text-sm group-hover:text-[var(--brand-red)] transition-colors">{p.productName}</span>
                          <span className="tag tag-muted text-[10px]">{p.riskLevel}</span>
                        </div>
                        <div className="text-xs text-[var(--ink-3)] tabular-nums">{p.issuer} · {p.subCategory} · 起购 ¥{p.minAmount.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 产品卡片 */}
              <div className="space-y-3">
                {items.map((item) => {
                  const swapCandidates = getLayerCandidates(layer, currentKYC, [item.productId, ...items.filter(x => x.itemId !== item.itemId).map(x => x.productId)]);
                  return (
                    <div key={item.itemId} className="card p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`tag tag-muted ${layerBgLight[layer]}`} style={{ color: layerAccent[layer] }}>
                              {layerLabels[item.layerCode]}
                            </span>
                            <span className="text-xs text-[var(--ink-3)]">{item.product.riskLevel} · {item.product.returnType}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-[var(--ink)] tracking-wider">{item.product.productName}</h3>
                          <p className="text-xs text-[var(--ink-3)] mt-1 tabular-nums">{item.product.issuer} · {item.product.subCategory} · {item.product.productId}</p>
                        </div>
                        <button
                          onClick={() => { if (items.length > 1 || planItems.length > 1) removeItem(item.itemId); else alert('至少保留一个产品'); }}
                          className="text-xs text-[var(--ink-3)] hover:text-[var(--danger)] transition-colors px-2 py-1 tracking-wider"
                        >
                          移除 ✕
                        </button>
                      </div>

                      {/* 金额调整 */}
                      <div className="flex items-center gap-3 mb-4 bg-[var(--canvas)] p-4 border-l-2 border-[var(--brand-red)]">
                        <span className="text-xs text-[var(--ink-2)] tracking-widest uppercase mr-2">投资金额</span>
                        <button onClick={() => setAmount(item.itemId, item.allocationAmount - 1000)} className="w-9 h-9 bg-white border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--brand-red)] hover:text-[var(--brand-red)] transition-colors font-mono">−</button>
                        <input
                          type="number"
                          value={item.allocationAmount}
                          min={item.product.minAmount}
                          step={1000}
                          onChange={e => setAmount(item.itemId, Number(e.target.value))}
                          className="w-36 px-3 py-1.5 border border-[var(--line)] text-right font-mono font-semibold text-[var(--brand-red)] bg-white focus:outline-none focus:border-[var(--brand-red)] tabular-nums"
                        />
                        <span className="text-xs text-[var(--ink-3)]">元</span>
                        <button onClick={() => setAmount(item.itemId, item.allocationAmount + 1000)} className="w-9 h-9 bg-white border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--brand-red)] hover:text-[var(--brand-red)] transition-colors font-mono">+</button>
                        <span className="text-[10px] text-[var(--ink-3)] ml-auto tracking-wider uppercase tabular-nums">
                          起购 ¥{item.product.minAmount.toLocaleString()} · 评分 {item.score.toFixed(0)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)] mb-4">
                        <StatBlock label="预期收益" value={item.product.expectedReturn ? `${(item.product.expectedReturn * 100).toFixed(2)}%` : '—'} />
                        <StatBlock label="流动性" value={item.product.liquidityType} />
                        <StatBlock label="风险等级" value={item.product.riskLevel} />
                        <StatBlock label="占总资产" value={`${((item.allocationAmount / pyramidConfig.totalAmount) * 100).toFixed(1)}%`} accent />
                      </div>

                      <div className="border-l-2 border-[var(--positive)] bg-[var(--positive-bg)] p-3 mb-4 text-xs">
                        <span className="font-medium text-[var(--positive)] tracking-wider uppercase mr-2">推荐理由</span>
                        <span className="text-[var(--ink-2)] leading-relaxed">{item.recommendationReason}</span>
                      </div>

                      {swapCandidates.length > 0 && (
                        <details className="text-sm group">
                          <summary className="cursor-pointer text-[var(--brand-red)] font-medium select-none tracking-wider flex items-center gap-2 hover:text-[var(--brand-red-deep)]">
                            <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                            替换为其他产品（{swapCandidates.length} 个可选）
                          </summary>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)]">
                            {swapCandidates.map(p => (
                              <button
                                key={p.productId}
                                onClick={() => replaceItem(item.itemId, p.productId, layer)}
                                className="text-left p-3 bg-white hover:bg-[var(--canvas)] transition-colors"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-[var(--ink)] text-sm">{p.productName}</span>
                                  <span className="text-[10px] text-[var(--ink-3)] font-mono tabular-nums">{p.riskLevel} · {p.expectedReturn ? `${(p.expectedReturn * 100).toFixed(2)}%` : '—'}</span>
                                </div>
                                <div className="text-[10px] text-[var(--ink-3)] tracking-wider">{p.issuer} · {p.subCategory}</div>
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="text-center py-12 text-[var(--ink-3)] border border-dashed border-[var(--line)] text-sm tracking-wider">
                    该层暂无产品，点击「+ 添加产品」补充，或余额将在确认时并入其他层
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 底部汇总 */}
        <div className="card p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">已选 {planItems.length} 个产品 · 累计分配</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-semibold text-[var(--brand-red)] tabular-nums">¥{totalAllocated.toLocaleString()}</div>
                <div className="text-sm text-[var(--ink-3)] font-mono tabular-nums">/ ¥{pyramidConfig.totalAmount.toLocaleString()}</div>
              </div>
            </div>
            <button onClick={restoreRecommendation} className="btn btn-secondary">
              ↺ 恢复系统推荐
            </button>
          </div>
          {totalAllocated < pyramidConfig.totalAmount && (
            <div className="mt-4 pt-4 border-t border-[var(--line)] text-xs text-[var(--warning)] tracking-wider">
              ⚠ 未分配余额 ¥{(pyramidConfig.totalAmount - totalAllocated).toLocaleString()} 将在确认时自动并入各层首选产品
            </div>
          )}
        </div>

        <div className="flex justify-between items-center border-t border-[var(--line)] pt-6">
          <button onClick={() => router.push(`/plan/${currentCustomer.customerId}`)} className="btn btn-secondary flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>返回方案概览</span>
          </button>
          <button onClick={goConfirm} className="btn btn-primary flex items-center gap-3">
            <span>确认方案</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

      </Container>
    </>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white p-3">
      <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">{label}</div>
      <div className={`font-mono font-semibold tabular-nums ${accent ? 'text-[var(--brand-red)]' : 'text-[var(--ink)]'}`}>{value}</div>
    </div>
  );
}
