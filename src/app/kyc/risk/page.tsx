'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { KYCNav, PageActions } from '@/components/KYCNav';

export default function KYCRiskPage() {
  const router = useRouter();
  const { state } = useAppState();
  const kyc = state.currentKYC;

  useEffect(() => {
    if (!kyc) { router.push('/login'); }
  }, [kyc, router]);

  if (!kyc) return null;

  const riskDescriptions: Record<string, { name: string; desc: string; suitable: string; pct: string }> = {
    R1: { name: '保守型', desc: '风险承受能力极低。本金安全性优先于收益，能接受小幅波动。', suitable: '保本型存款、国债、低风险现金管理类产品', pct: '0–20' },
    R2: { name: '稳健型', desc: '风险承受能力较低。本金保障为主，追求稳定收益。', suitable: '存款、国债、PR2及以下固收理财、短债基金', pct: '21–40' },
    R3: { name: '平衡型', desc: '风险承受能力中等。可接受短期波动，追求资产稳健增值。', suitable: 'PR2–PR3固收理财、混合基金、债券基金、稳健FOF', pct: '41–60' },
    R4: { name: '成长型', desc: '风险承受能力较高。能承受较大幅度波动，追求长期资本增值。', suitable: '指数基金、股票基金、行业主题基金、QDII', pct: '61–80' },
    R5: { name: '进取型', desc: '风险承受能力极高。能承受本金损失，追求高收益高回报。', suitable: '私募基金、衍生品、结构化产品、海外另类投资', pct: '81–100' }
  };

  const level = kyc.riskLevel;
  const info = riskDescriptions[level];

  return (
    <div className="">
      <KYCNav currentStep={3} onBack={() => router.push('/kyc/finance')} />

      <div className="max-w-3xl mx-auto px-8 py-10 animate-fade-in">

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.3em] text-[var(--brand-gold-deep)] uppercase mb-2 font-medium">STEP 03 · RISK PROFILE</div>
          <h1 className="text-[28px] font-bold text-[var(--brand-red)] leading-tight mb-2">
            风险承受能力评估
          </h1>
          <div className="accent-line-gold mb-4"></div>
        </div>

        <div className="mb-6 notice">
          <span className="notice-label">银行端提供</span>
          您在工商银行开户时所填写的《客户风险承受能力评估问卷》结果，本平台将直接采用，不再重复测评。如需重新评估，请携带有效证件至任意工行网点办理。
        </div>

        {/* 主风险等级卡片 */}
        <div className="card p-10 mb-6 text-center">
          <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-4">YOUR RISK LEVEL</div>

          <div className="flex items-end justify-center gap-4 mb-6">
            <div className="text-[120px] leading-none font-bold text-[var(--brand-red)] tracking-tighter">
              {level}
            </div>
            <div className="text-left pb-3">
              <div className="text-2xl text-[var(--ink)] mb-1">{info.name}</div>
              <div className="text-xs text-[var(--ink-3)] tracking-widest uppercase">评分 {kyc.riskScore} · 分档 {info.pct}</div>
            </div>
          </div>

          <div className="accent-line-gold mx-auto mb-6"></div>

          <div className="max-w-xl mx-auto text-sm text-[var(--ink-2)] leading-relaxed mb-6">
            {info.desc}
          </div>

          <div className="inline-block bg-[var(--brand-red)] text-white px-6 py-3 text-sm tracking-wider">
            <span className="text-[var(--brand-gold-light)] mr-2">适配产品</span>
            {info.suitable}
          </div>
        </div>

        {/* 风险光谱 */}
        <div className="card p-8 mb-6">
          <div className="flex items-baseline justify-between mb-6">
            <h3 className="text-base font-semibold text-[var(--ink)] tracking-wider">风险光谱</h3>
            <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">RISK SPECTRUM</div>
          </div>

          <div className="flex items-end justify-between gap-2 h-32 mb-2">
            {(['R1', 'R2', 'R3', 'R4', 'R5'] as const).map((lvl) => {
              const heights = [30, 50, 70, 88, 100];
              const idx = parseInt(lvl.slice(1)) - 1;
              const isCurrent = lvl === level;
              return (
                <div key={lvl} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className={`text-xs font-mono font-semibold mb-2 ${isCurrent ? 'text-[var(--brand-red)]' : 'text-[var(--ink-3)]'}`}>
                    {lvl}
                  </div>
                  <div
                    className={`w-full transition-all duration-500 ${isCurrent ? 'bg-[var(--brand-red)]' : 'bg-[var(--paper)] group-hover:bg-[var(--line)]'}`}
                    style={{ height: `${heights[idx]}%` }}
                  ></div>
                  {isCurrent && (
                    <div className="text-[10px] text-[var(--brand-red)] font-semibold mt-2 tracking-widest">← 当前</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-[var(--ink-3)] tracking-widest uppercase flex justify-between px-2">
            <span>保守</span><span>稳健</span><span>平衡</span><span>成长</span><span>进取</span>
          </div>
        </div>

        {/* 五档对照表 */}
        <div className="card p-8 mb-6">
          <div className="flex items-baseline justify-between mb-6">
            <h3 className="text-base font-semibold text-[var(--ink)] tracking-wider">五档风险等级说明</h3>
            <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">FIVE LEVELS</div>
          </div>
          <div className="space-y-px bg-[var(--line)]">
            {(['R1', 'R2', 'R3', 'R4', 'R5'] as const).map((lvl) => {
              const d = riskDescriptions[lvl];
              const isCurrent = lvl === level;
              return (
                <div
                  key={lvl}
                  className={`bg-white p-4 ${isCurrent ? 'border-l-2 border-[var(--brand-red)]' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`text-lg font-semibold ${isCurrent ? 'text-[var(--brand-red)]' : 'text-[var(--ink-2)]'}`}>{lvl}</span>
                    <span className="text-sm font-medium text-[var(--ink)]">{d.name}</span>
                    <span className="text-[10px] text-[var(--ink-3)] font-mono tabular-nums">评分 {d.pct}</span>
                    {isCurrent && (
                      <span className="ml-auto tag tag-muted-primary">您当前</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--ink-2)] leading-relaxed">{d.suitable}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 投资经验 */}
        <div className="card p-8 mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-base font-semibold text-[var(--ink)] tracking-wider">投资经验</h3>
            <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">EXPERIENCE</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)]">
            <div className="bg-[var(--canvas)] p-5">
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-2">投资年限</div>
              <div className="text-2xl font-semibold text-[var(--ink)] tabular-nums">{kyc.investmentYears}<span className="text-sm text-[var(--ink-3)] ml-1">年</span></div>
            </div>
            <div className="bg-[var(--canvas)] p-5">
              <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-2">已持有产品</div>
              <div className="text-sm text-[var(--ink)] leading-relaxed">{kyc.productsOwned.join('、') || '无'}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--ink-3)]">上述信息由银行客户档案提供，用于评估您的投资经验和产品认知。</p>
        </div>

        <PageActions
          onBack={() => router.push('/kyc/finance')}
          onNext={() => router.push('/kyc/goals')}
        />
      </div>
    </div>
  );
}
