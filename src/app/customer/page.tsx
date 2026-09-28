'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { PageBar, Container } from '@/components/PageBar';

export default function CustomerPage() {
  const router = useRouter();
  const { state } = useAppState();
  const { currentCustomer, currentKYC } = state;

  useEffect(() => {
    if (!currentCustomer || !currentKYC) {
      router.push('/login');
    }
  }, [currentCustomer, currentKYC, router]);

  if (!currentCustomer || !currentKYC) return null;

  const kyc = currentKYC;
  const riskLabel = { R1: '保守型', R2: '稳健型', R3: '平衡型', R4: '成长型', R5: '进取型' }[kyc.riskLevel];

  return (
    <>
      <PageBar
        breadcrumb={[{ label: "财富规划", href: "/welcome" }, { label: "第一步 · 客户档案" }]}
        backHref="/welcome"
      />

      <Container>
        {/* 客户身份卡 */}
        <div className="card-dark mb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5">
            <div className="text-[10px] tracking-[0.32em] text-white/60 uppercase mb-3">
              PRIVATE CLIENT · CONFIDENTIAL
            </div>
            <h1 className="text-3xl font-semibold text-white mb-2">{currentCustomer.demoName}</h1>
            <div className="w-10 h-px bg-[var(--brand-gold)] mb-3" />
            <div className="text-sm text-white/60">
              客户编号 <span className="font-mono text-white/90 ml-2">{currentCustomer.customerId}</span>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/15">
            {[
              { label: '年龄', value: `${kyc.age}`, unit: '岁' },
              { label: '职业', value: kyc.occupation, unit: '' },
              { label: '家庭结构', value: kyc.familyStructure, unit: '' },
              { label: '风险等级', value: `${kyc.riskLevel} ${riskLabel}`, accent: true },
            ].map((item, idx) => (
              <div key={idx} className="bg-[var(--brand-red)] p-4">
                <div className="text-[10px] tracking-[0.16em] text-white/50 uppercase mb-2">{item.label}</div>
                <div className={`text-xl font-semibold ${item.accent ? 'text-[var(--brand-gold)]' : 'text-white'} leading-tight`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 风险评估等级 */}
        <div className="card card-padded-lg mb-6">
          <div className="section-header">
            <div className="section-title">风险承受能力评估</div>
            <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)]">RISK ASSESSMENT</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-px bg-[var(--line)] border border-[var(--line)]">
            {/* 等级 */}
            <div className="bg-white p-6 md:col-span-4">
              <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)] uppercase mb-3">评估等级</div>
              <div className="flex items-baseline gap-3 mb-2">
                <div className="text-4xl font-bold text-[var(--brand-red)] leading-none tabular-nums">{kyc.riskLevel}</div>
                <div className="text-base text-[var(--ink-2)]">{riskLabel}</div>
              </div>
              <div className="text-xs text-[var(--ink-2)] mt-3">
                评分 <span className="font-mono font-semibold text-[var(--ink)]">{kyc.riskScore}</span> 分
              </div>
            </div>
            {/* 时间 */}
            <div className="bg-white p-6 md:col-span-4">
              <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)] uppercase mb-3">评估时间</div>
              <div className="text-lg font-medium text-[var(--ink)] tabular-nums">
                {kyc.kycDate.substring(0, 10)}
              </div>
            </div>
            {/* 光谱 */}
            <div className="card-dark p-6 md:col-span-4">
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[10px] tracking-[0.2em] text-white/60 uppercase">风险光谱</div>
                <div className="text-[10px] tracking-[0.2em] text-[var(--brand-gold)]">R1–R5</div>
              </div>
              <div className="flex items-end justify-between gap-1 h-12">
                {['R1', 'R2', 'R3', 'R4', 'R5'].map((r) => {
                  const heights = [25, 45, 65, 80, 100];
                  const idx = parseInt(r.slice(1)) - 1;
                  const isCurrent = r === kyc.riskLevel;
                  return (
                    <div key={r} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div
                        className={`w-full ${isCurrent ? 'bg-[var(--brand-gold)]' : 'bg-white/20'}`}
                        style={{ height: `${heights[idx]}%` }}
                      />
                      <div className={`text-[10px] mt-1 ${isCurrent ? 'text-[var(--brand-gold)] font-semibold' : 'text-white/40'}`}>{r}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="notice mt-6">
            <span className="notice-label">风险评估说明</span>
            本等级来源于您在工行开户时填写的《客户风险承受能力评估问卷》，平台将直接采用此评估结果，不再另行测评。如需重新评估，请前往任意工行网点办理。
          </div>
        </div>

        {/* 财务目标 + 保险 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)] mb-6">
          <div className="bg-white p-7">
            <div className="section-header">
              <h3 className="section-title">财务目标</h3>
              <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)]">GOALS</div>
            </div>
            <div className="space-y-2 mb-5">
              {kyc.goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-[var(--brand-red)] text-sm tabular-nums w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-[var(--ink)]">{goal}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--line)] pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--ink-2)]">负债收入比</span>
                <span className={`font-mono font-semibold tabular-nums ${
                  kyc.dti >= 0.4 ? 'text-[var(--danger)]' :
                  kyc.dti >= 0.3 ? 'text-[var(--warning)]' : 'text-[var(--positive)]'
                }`}>{(kyc.dti * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-2)]">收入稳定性</span>
                <span className="text-[var(--ink)] font-medium">
                  {kyc.incomeStability === 'stable' ? '稳定' : kyc.incomeStability === 'moderate' ? '一般' : '波动'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-2)]">投资经验</span>
                <span className="text-[var(--ink)] font-medium tabular-nums">{kyc.investmentYears} 年</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-7">
            <div className="section-header">
              <h3 className="section-title">保险保障状况</h3>
              <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)]">INSURANCE</div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[var(--line)] mb-4">
              <div className={`p-3 ${kyc.hasInsurance ? 'bg-[var(--positive-bg)]' : 'bg-[var(--danger-bg)]'}`}>
                <div className="text-[10px] tracking-[0.16em] text-[var(--ink-3)] uppercase mb-1">基础保险</div>
                <div className={`text-sm font-medium ${kyc.hasInsurance ? 'text-[var(--positive)]' : 'text-[var(--danger)]'}`}>
                  {kyc.hasInsurance ? '✓ 已配置' : '× 未配置'}
                </div>
              </div>
              <div className={`p-3 ${kyc.existingMedicalInsurance ? 'bg-[var(--positive-bg)]' : 'bg-[var(--danger-bg)]'}`}>
                <div className="text-[10px] tracking-[0.16em] text-[var(--ink-3)] uppercase mb-1">医疗保险</div>
                <div className={`text-sm font-medium ${kyc.existingMedicalInsurance ? 'text-[var(--positive)]' : 'text-[var(--danger)]'}`}>
                  {kyc.existingMedicalInsurance ? '✓ 已配置' : '× 未配置'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[var(--line)]">
              <div className="bg-[var(--canvas)] p-3">
                <div className="text-[10px] tracking-[0.16em] text-[var(--ink-3)] uppercase mb-1">寿险保额</div>
                <div className="text-lg font-semibold text-[var(--ink)] tabular-nums">
                  ¥{(kyc.existingLifeInsurance / 10000).toFixed(0)}<span className="text-xs text-[var(--ink-3)] ml-1">万</span>
                </div>
              </div>
              <div className="bg-[var(--canvas)] p-3">
                <div className="text-[10px] tracking-[0.16em] text-[var(--ink-3)] uppercase mb-1">重疾保额</div>
                <div className="text-lg font-semibold text-[var(--ink)] tabular-nums">
                  ¥{(kyc.existingCriticalIllness / 10000).toFixed(0)}<span className="text-xs text-[var(--ink-3)] ml-1">万</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 通胀侵蚀 */}
        {(() => {
          const inflationRate = 0.025;
          const savingsRate = 0.0035;
          const realRate = savingsRate - inflationRate;
          const initialAssets = kyc.investableAssets;
          const years = [0, 5, 10, 15, 20, 25, 30];
          const data = years.map(y => ({
            year: y,
            nominal: Math.round(initialAssets * Math.pow(1 + savingsRate, y)),
            real: Math.round(initialAssets * Math.pow(1 + realRate, y)),
          }));
          const halfLife = Math.ceil(Math.log(0.5) / Math.log(1 + realRate));
          const maxHeight = 110;

          return (
            <div className="card card-padded-lg mb-6">
              <div className="section-header">
                <h3 className="section-title">购买力侵蚀预警</h3>
                <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)]">INFLATION IMPACT</div>
              </div>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-6">
                按 <span className="font-mono font-semibold text-[var(--ink)]">2.5%</span> 年通胀率计算，不进行任何理财，您的购买力将逐年递减。
              </p>

              <div className="flex items-end gap-3 h-40 mb-6 border-b border-[var(--line)] pb-3">
                {data.map((d) => {
                  const pct = Math.max(5, (d.real / initialAssets) * 100);
                  return (
                    <div key={d.year} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="text-[11px] font-mono font-semibold text-[var(--brand-red)] mb-1 tabular-nums">
                        {(d.real / 10000).toFixed(1)}<span className="text-[9px] text-[var(--ink-3)] ml-0.5">万</span>
                      </div>
                      <div
                        className="w-full bg-[var(--brand-gold-deep)]"
                        style={{ height: `${(pct / 100) * maxHeight}px` }}
                      />
                      <div className="text-[10px] text-[var(--ink-3)] mt-2 tabular-nums">{d.year}<span className="ml-0.5">年</span></div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)]">
                <div className="bg-[var(--danger-bg)] p-5">
                  <div className="text-[10px] tracking-[0.2em] text-[var(--danger)] uppercase mb-2">购买力减半</div>
                  <div className="text-3xl font-semibold text-[var(--danger)] tabular-nums leading-none mb-2">
                    {halfLife}<span className="text-base ml-1">年</span>
                  </div>
                  <div className="text-xs text-[var(--ink-2)] tabular-nums">
                    ¥{(initialAssets / 10000).toFixed(1)} 万 → ¥{(initialAssets / 20000).toFixed(1)} 万
                  </div>
                </div>
                <div className="bg-[var(--warning-bg)] p-5">
                  <div className="text-[10px] tracking-[0.2em] text-[var(--warning)] uppercase mb-2">30年后购买力</div>
                  <div className="text-3xl font-semibold text-[var(--warning)] tabular-nums leading-none mb-2">
                    {(data[data.length - 1].real / initialAssets * 100).toFixed(0)}<span className="text-base ml-1">%</span>
                  </div>
                  <div className="text-xs text-[var(--ink-2)] tabular-nums">
                    ¥{(initialAssets / 10000).toFixed(1)} 万 → ¥{(data[data.length - 1].real / 10000).toFixed(1)} 万
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 同业基准对比 */}
        {(() => {
          const peerAvgReturn = 4.2;
          const currentReturn = 0.35;
          const assets = kyc.investableAssets;
          const annualGap = Math.round(assets * (peerAvgReturn - currentReturn) / 100);
          const tenYearGap = Math.round(
            assets * (Math.pow(1 + peerAvgReturn / 100, 10) - Math.pow(1 + currentReturn / 100, 10))
          );

          return (
            <div className="card card-padded-lg mb-8">
              <div className="section-header">
                <h3 className="section-title">同业基准对比</h3>
                <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)]">PEER BENCHMARK</div>
              </div>
              <p className="text-sm text-[var(--ink-2)] mb-6 tabular-nums">
                与您画像相似的客户群体 · {kyc.age}岁 · {kyc.occupation} · 可投资 <span className="font-mono font-semibold">¥{(kyc.investableAssets / 10000).toFixed(0)}</span> 万
              </p>

              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-[var(--ink-2)] tracking-wider">您当前年化</span>
                  <span className="font-mono text-sm text-[var(--ink-3)] tabular-nums">{currentReturn}%</span>
                </div>
                <div className="bar mb-4">
                  <div className="bar-fill bg-[var(--ink-3)]" style={{ width: `${(currentReturn / peerAvgReturn) * 100}%`, background: 'var(--ink-3)' }} />
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-[var(--ink)] font-medium tracking-wider">同业平均年化</span>
                  <span className="font-mono text-sm font-semibold text-[var(--brand-red)] tabular-nums">{peerAvgReturn}%</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--brand-red)]">
                <div className="bg-[var(--brand-red)] p-6">
                  <div className="text-[10px] tracking-[0.24em] text-[var(--brand-gold)] uppercase mb-2">年化机会成本</div>
                  <div className="text-3xl font-semibold tabular-nums">¥{annualGap.toLocaleString()}</div>
                </div>
                <div className="bg-[var(--brand-red-dark)] p-6">
                  <div className="text-[10px] tracking-[0.24em] text-[var(--brand-gold)] uppercase mb-2">10年累计差距（含复利）</div>
                  <div className="text-3xl font-semibold text-[var(--brand-gold)] tabular-nums">¥{tenYearGap.toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="section-header">
                  <h4 className="section-title" style={{ fontSize: 14 }}>同业典型配置</h4>
                  <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)]">TYPICAL ALLOCATION</div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: '现金 / 活期', pct: 15, color: 'var(--ink-3)' },
                    { label: '稳健理财 / 存款', pct: 40, color: 'var(--brand-red)' },
                    { label: '基金 / 债券', pct: 30, color: 'var(--brand-gold)' },
                    { label: '股票 / REITs', pct: 15, color: 'var(--brand-red-dark)' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-4">
                      <span className="text-xs text-[var(--ink-2)] w-32 tracking-wider">{item.label}</span>
                      <div className="flex-1 h-2 bg-[var(--paper)] overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: `${item.pct}%`, background: item.color }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-[var(--ink)] w-10 text-right tabular-nums">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 下一步 */}
        <div className="card card-padded flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] mb-1">NEXT STEP</div>
            <div className="text-base text-[var(--ink)] font-medium">核对个人与财务信息</div>
          </div>
          <button onClick={() => router.push('/kyc/basic')} className="btn btn-primary btn-lg">
            确认信息，继续 →
          </button>
        </div>
      </Container>
    </>
  );
}