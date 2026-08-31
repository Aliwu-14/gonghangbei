'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { PageBar, Container } from '@/components/PageBar';

export default function ConfirmPage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const { currentCustomer, tierResult, pyramidConfig, planItems } = state;
  const [confirmed, setConfirmed] = useState(false);
  const [riskWarning, setRiskWarning] = useState(false);

  useEffect(() => {
    if (!tierResult || !pyramidConfig) { router.push('/login'); }
  }, [tierResult, pyramidConfig, router]);

  if (!tierResult || !pyramidConfig || !currentCustomer) return null;

  const handleConfirm = () => {
    if (!confirmed || !riskWarning) return;
    const actualTotal = planItems.reduce((sum, item) => sum + item.allocationAmount, 0);
    const reservation = {
      reservationId: `RES-${Date.now()}`,
      reservationNo: `RES-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      customerId: currentCustomer?.customerId || '',
      planId: `PLAN-${currentCustomer?.customerId}`,
      totalAmount: actualTotal,
      status: 'CONFIRMED' as const,
      disclaimerConfirmed: confirmed,
      riskWarningConfirmed: riskWarning,
      isDemo: true,
      items: planItems.map(i => ({
        productId: i.productId,
        productName: i.product.productName,
        amount: i.allocationAmount,
      })),
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    dispatch({ type: 'SET_RESERVATION', payload: reservation });
    router.push(`/reservation/${reservation.reservationId}`);
  };

  const productTotal = planItems.reduce((s, i) => s + i.allocationAmount, 0);
  const hasDiff = productTotal !== pyramidConfig.totalAmount;

  return (
    <>
      <PageBar
        breadcrumb={[
          { label: "财富规划", href: "/welcome" },
          { label: "专属配置方案", href: `/plan/${currentCustomer.customerId}` },
          { label: "方案确认与预约" },
        ]}
        right={<div className="text-sm text-[var(--ink-2)] tabular-nums">{currentCustomer?.demoName}</div>}
      />

      <Container size="narrow">

        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] uppercase mb-3">FINAL CONFIRMATION</div>
          <h1 className="text-3xl font-semibold text-[var(--brand-red)] mb-3">方案最终确认</h1>
          <div className="accent-line-gold mx-auto mb-4" />
          <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-xl mx-auto">
            请仔细核对方案内容，并阅读下方的风险揭示。确认后系统将生成预约登记单，作为正式业务办理的依据。
          </p>
        </div>

        {/* 方案摘要 */}
        <div className="card p-8 mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--ink)] tracking-wider">方案摘要</h2>
            <span className="tag tag-gold">{planItems.length} 个产品</span>
          </div>
          <div className="accent-line-gold mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)] mb-5">
            <div className="bg-[var(--brand-red)] text-white p-5">
              <div className="text-[10px] tracking-widest text-[var(--brand-gold-light)] uppercase mb-2">服务层级</div>
              <div className="text-2xl font-bold tabular-nums">{tierResult.finalTier}</div>
              <div className="text-xs text-white/70 tracking-wider mt-1">{tierResult.tierName}</div>
            </div>
            <div className="bg-white p-5">
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-2">产品总额</div>
              <div className="text-2xl font-semibold text-[var(--brand-red)] tabular-nums">¥{productTotal.toLocaleString()}</div>
              <div className="text-[10px] text-[var(--ink-3)] tracking-wider mt-1 tabular-nums">配置总额 ¥{pyramidConfig.totalAmount.toLocaleString()}</div>
            </div>
          </div>

          {hasDiff && (
            <div className="notice mb-5">
              <span className="notice-label">说明</span>
              产品总额（¥{productTotal.toLocaleString()}）与配置总额（¥{pyramidConfig.totalAmount.toLocaleString()}）存在差异，系因产品最低起购额约束所致。
            </div>
          )}

          <div className="bg-[var(--canvas)] px-4 py-3 text-xs text-[var(--ink-2)] tracking-wider">
            <span className="text-[var(--ink-3)]">配置结构：</span>
            现金层 <span className="font-mono font-semibold text-[var(--ink)]">{(pyramidConfig.cashRatio * 100).toFixed(0)}%</span> ·
            稳健层 <span className="font-mono font-semibold text-[var(--ink)]">{(pyramidConfig.stableRatio * 100).toFixed(0)}%</span> ·
            成长层 <span className="font-mono font-semibold text-[var(--ink)]">{(pyramidConfig.growthRatio * 100).toFixed(0)}%</span>
            {pyramidConfig.satelliteRatio > 0 && <> · 卫星层 <span className="font-mono font-semibold text-[var(--ink)]">{(pyramidConfig.satelliteRatio * 100).toFixed(0)}%</span></>}
          </div>
        </div>

        {/* 风险揭示 */}
        <div className="border-l-2 border-[var(--brand-red)] bg-[var(--canvas)] p-8 mb-6">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-lg font-bold text-[var(--brand-red)] tracking-wider">风险揭示书</h2>
            <span className="tag tag-warning">必读</span>
          </div>
          <div className="accent-line-gold mb-6"></div>
          <div className="space-y-3 text-sm text-[var(--ink-2)] mb-6 leading-relaxed">
            <p>尊敬的客户，在您确认本配置方案前，请仔细阅读以下风险揭示：</p>
            <ol className="space-y-2">
              <li className="grid grid-cols-12 gap-3">
                <span className="col-span-1 text-[var(--brand-red)] font-bold tabular-nums">壹</span>
                <span className="col-span-11">本方案仅供您参考决策，<strong className="text-[var(--danger)]">不构成任何形式的收益承诺或对未来表现的保证</strong>。</span>
              </li>
              <li className="grid grid-cols-12 gap-3">
                <span className="col-span-1 text-[var(--brand-red)] font-bold tabular-nums">贰</span>
                <span className="col-span-11">投资有风险。产品的历史业绩不代表未来表现，可能发生本金损失。</span>
              </li>
              <li className="grid grid-cols-12 gap-3">
                <span className="col-span-1 text-[var(--brand-red)] font-bold tabular-nums">叁</span>
                <span className="col-span-11">本预约登记为意向确认，<strong>不触发真实交易</strong>，不执行真实支付或扣款。</span>
              </li>
              <li className="grid grid-cols-12 gap-3">
                <span className="col-span-1 text-[var(--brand-red)] font-bold tabular-nums">肆</span>
                <span className="col-span-11">最终投资决策由您自主做出，建议结合自身情况审慎决策。</span>
              </li>
            </ol>
          </div>

          <div className="border-t border-[var(--line)] pt-5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={riskWarning}
                onChange={(e) => setRiskWarning(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[var(--brand-red)]"
              />
              <span className="text-sm text-[var(--ink)] group-hover:text-[var(--brand-red)] transition-colors">我已阅读并理解上述风险揭示内容</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[var(--brand-red)]"
              />
              <span className="text-sm text-[var(--ink)] group-hover:text-[var(--brand-red)] transition-colors">我确认本方案中的信息真实、准确，自主决定进行预约登记</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-[var(--line)] pt-6">
          <button onClick={() => router.back()} className="btn btn-secondary flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>返回修改</span>
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || !riskWarning}
            className="btn btn-primary btn-lg flex items-center gap-3"
          >
            <span>确认并生成预约单</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </button>
        </div>

      </Container>
    </>
  );
}