'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { PageBar, Container } from '@/components/PageBar';

export default function ReservationPage() {
  const router = useRouter();
  const { state } = useAppState();
  const { currentCustomer, reservation, planItems, pyramidConfig } = state;

  const res = reservation;

  useEffect(() => {
    if (!res && (!currentCustomer || !pyramidConfig)) {
      router.push('/login');
    }
  }, [res, currentCustomer, pyramidConfig, router]);

  if (!res) {
    if (!currentCustomer || !pyramidConfig) return null;
  }

  const displayRes = res || {
    reservationNo: `RES-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    customerId: currentCustomer?.customerId || '',
    totalAmount: pyramidConfig?.totalAmount || 0,
    status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    items: planItems.map(i => ({ productId: i.productId, productName: i.product.productName, amount: i.allocationAmount })),
  };

  return (
    <>
      <PageBar
        breadcrumb={[{ label: "财富规划", href: "/welcome" }, { label: "预约登记完成" }]}
        right={<div className="text-sm text-[var(--ink-2)] tabular-nums">{currentCustomer?.demoName}</div>}
      />

      <Container size="narrow">
        {/* 成功标识 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-5 border-2 border-[var(--brand-red)] relative">
            <svg className="w-10 h-10 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] uppercase mb-2">CONFIRMATION SUCCESS</div>
          <h1 className="text-3xl font-semibold text-[var(--brand-red)] mb-3">预约已提交</h1>
          <div className="accent-line-gold mx-auto mb-3" />
          <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-md mx-auto">
            您的理财预约意向已成功提交。请妥善保存以下预约单信息，作为后续业务办理的依据。
          </p>
        </div>

        {/* 预约单 — 仿银行回单 */}
        <div className="card p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--brand-red)]"></div>
          <div className="absolute top-0 right-0 w-1 h-full bg-[var(--brand-red)]"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--brand-red)]"></div>
          <div className="absolute bottom-0 right-0 w-1 h-full bg-[var(--brand-red)]"></div>

          <div className="flex items-baseline justify-between mb-2 pb-4 border-b-2 border-[var(--ink)]">
            <div>
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">RESERVATION RECEIPT</div>
              <h2 className="text-xl font-bold text-[var(--brand-red)] tracking-wider">财富规划预约单</h2>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">单号</div>
              <div className="font-mono font-semibold text-[var(--ink)] tabular-nums">{displayRes.reservationNo}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)] my-5">
            <FieldRow label="客户编号" value={displayRes.customerId} mono />
            <FieldRow label="提交时间" value={new Date(displayRes.createdAt).toLocaleString('zh-CN')} />
            <FieldRow label="意向总额" value={`¥${displayRes.totalAmount.toLocaleString()}`} accent />
            <FieldRow label="状态" value="已确认" status />
          </div>

          {/* 产品明细表 */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--ink)] tracking-wider">产品明细</h3>
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">PRODUCT DETAILS</div>
            </div>
            <table className="icbc-table">
              <thead>
                <tr>
                  <th className="w-12">序号</th>
                  <th>产品名称</th>
                  <th className="text-right">投资金额</th>
                  <th className="text-right">占比</th>
                </tr>
              </thead>
              <tbody>
                {displayRes.items.map((item, i) => (
                  <tr key={i}>
                    <td className="font-mono text-[var(--ink-3)] tabular-nums">{String(i + 1).padStart(2, '0')}</td>
                    <td className="font-medium text-[var(--ink)]">{item.productName}</td>
                    <td className="text-right font-mono tabular-nums font-semibold">¥{item.amount.toLocaleString()}</td>
                    <td className="text-right font-mono tabular-nums text-[var(--ink-2)]">
                      {((item.amount / displayRes.totalAmount) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-[var(--canvas)]">
                  <td colSpan={2} className="font-semibold text-[var(--ink)] tracking-wider">合计</td>
                  <td className="text-right font-semibold text-[var(--brand-red)] text-base tabular-nums">¥{displayRes.totalAmount.toLocaleString()}</td>
                  <td className="text-right font-mono text-[var(--ink)] tabular-nums">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--line)] text-[10px] tracking-wider text-[var(--ink-3)] text-center uppercase">
            本预约单仅作为业务办理意向登记 · 不构成交易 · 详见风险揭示书
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/welcome')}
            className="btn btn-secondary"
          >
            返回首页
          </button>
          <button
            onClick={() => router.push('/customer')}
            className="btn btn-primary flex items-center gap-3"
          >
            <span>查看我的信息</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </Container>
    </>
  );
}

function FieldRow({ label, value, mono, accent, status }: { label: string; value: string; mono?: boolean; accent?: boolean; status?: boolean }) {
  return (
    <div className="bg-white p-4">
      <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1.5">{label}</div>
      <div className={`text-sm ${mono || accent ? 'font-mono font-semibold tabular-nums' : 'font-medium'} ${
        status ? 'text-[var(--positive)]' : accent ? 'text-[var(--brand-red)]' : 'text-[var(--ink)]'
      }`}>
        {status && <span className="inline-block w-2 h-2 bg-[var(--positive)] mr-2 align-middle"></span>}
        {value}
      </div>
    </div>
  );
}