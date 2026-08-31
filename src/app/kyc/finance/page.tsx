'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { KYCNav, PageActions } from '@/components/KYCNav';

export default function KYCFinancePage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const kyc = state.currentKYC;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [annualIncome, setAnnualIncome] = useState(kyc?.annualIncome ?? 0);
  const [monthlyExpense, setMonthlyExpense] = useState(kyc?.monthlyExpense ?? 0);
  const [investableAssets, setInvestableAssets] = useState(kyc?.investableAssets ?? 0);
  const [totalAssets, setTotalAssets] = useState(kyc?.totalAssets ?? 0);
  const [mortgageMonthly, setMortgageMonthly] = useState(kyc?.mortgageMonthly ?? 0);
  const [otherMonthlyDebt, setOtherMonthlyDebt] = useState(kyc?.otherMonthlyDebt ?? 0);

  useEffect(() => {
    if (!kyc) { router.push('/login'); }
  }, [kyc, router]);

  if (!kyc) return null;

  const previewDti = annualIncome > 0 ? ((mortgageMonthly + otherMonthlyDebt) * 12) / annualIncome : 0;

  const startEdit = () => {
    setAnnualIncome(kyc.annualIncome); setMonthlyExpense(kyc.monthlyExpense);
    setInvestableAssets(kyc.investableAssets); setTotalAssets(kyc.totalAssets);
    setMortgageMonthly(kyc.mortgageMonthly); setOtherMonthlyDebt(kyc.otherMonthlyDebt);
    setSaved(false);
    setEditing(true);
  };

  const saveEdit = () => {
    if (annualIncome <= 0) { alert('年收入必须大于0'); return; }
    if (investableAssets < 0 || totalAssets < 0) { alert('资产金额不能为负'); return; }
    const dti = ((mortgageMonthly + otherMonthlyDebt) * 12) / annualIncome;
    const emergencyFundMonths = monthlyExpense > 0
      ? Math.min(24, Math.round((investableAssets * 0.5) / monthlyExpense))
      : 0;
    dispatch({
      type: 'UPDATE_KYC',
      payload: { annualIncome, monthlyExpense, investableAssets, totalAssets, mortgageMonthly, otherMonthlyDebt, dti, emergencyFundMonths },
    });
    setEditing(false);
    setSaved(true);
  };

  const moneyInput = (label: string, value: number, set: (n: number) => void, step = 1000, unit = '元') => (
    <div>
      <label className="block text-[10px] tracking-widest text-[var(--ink-2)] uppercase mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] font-mono text-sm">¥</span>
        <input
          type="number" min={0} step={step} value={value}
          onChange={e => set(Math.max(0, Number(e.target.value)))}
          className="input pl-7 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-3)]">{unit}</span>
      </div>
    </div>
  );

  const moneyDisplay = (label: string, value: number, accent = false) => (
    <div className="bg-[var(--canvas)] p-4">
      <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-2">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${accent ? 'text-[var(--brand-red)]' : 'text-[var(--ink)]'}`}>
        ¥{value.toLocaleString()}
      </div>
    </div>
  );

  return (
    <div className="">
      <KYCNav currentStep={2} onBack={() => router.push('/kyc/basic')} />

      <div className="max-w-3xl mx-auto px-8 py-10 animate-fade-in">

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.3em] text-[var(--brand-gold-deep)] uppercase mb-2 font-medium">STEP 02 · FINANCIAL PROFILE</div>
          <h1 className="text-[28px] font-bold text-[var(--brand-red)] leading-tight mb-2">
            财务状况确认
          </h1>
          <div className="accent-line-gold mb-4"></div>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed">
            以下数据来源于您的银行客户档案。系统将据此计算负债收入比、应急资金月数与现金流结余，作为资产配置建议的依据。
          </p>
        </div>

        {state.kycDirty && (
          <div className="mb-6 px-4 py-3 border-l-2 border-[var(--warning)] bg-[var(--warning-bg)] flex items-center justify-between">
            <span className="text-sm text-[var(--warning)]">您已修改财务信息，当前方案基于修改前的信息生成</span>
            <button
              onClick={() => { dispatch({ type: 'SET_KYC_STEP', payload: { step: 'goals', done: true } }); router.push('/kyc/goals'); }}
              className="btn btn-ghost text-[var(--warning)] hover:bg-white"
            >
              去重新生成方案 →
            </button>
          </div>
        )}

        <div className="card p-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink)] tracking-wider">财务数据</h2>
              <span className="tag tag-muted">银行档案</span>
            </div>
            {!editing ? (
              <button onClick={startEdit} className="text-sm text-[var(--brand-red)] font-medium hover:text-[var(--brand-red-deep)] transition-colors flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span>修改</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn btn-ghost">取消</button>
                <button onClick={saveEdit} className="btn btn-primary py-2 px-5">保存</button>
              </div>
            )}
          </div>
          <div className="accent-line-gold mb-6"></div>
          <p className="text-sm text-[var(--ink-2)] mb-6">
            {editing ? '修改后负债收入比（DTI）将自动重新计算' : '您的资产 / 收入 / 负债数据来源于银行客户档案。'}
          </p>

          {saved && !editing && (
            <div className="mb-4 px-4 py-2.5 border-l-2 border-[var(--positive)] bg-[var(--positive-bg)] text-sm text-[var(--positive)]">
              ✓ 已保存修改。若方案已生成，请重新生成以应用新的财务数据。
            </div>
          )}

          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {moneyInput('年收入', annualIncome, setAnnualIncome, 10000)}
              {moneyInput('月支出', monthlyExpense, setMonthlyExpense)}
              {moneyInput('可投资资产', investableAssets, setInvestableAssets, 10000)}
              {moneyInput('总资产', totalAssets, setTotalAssets, 10000)}
              {moneyInput('月供 · 房贷', mortgageMonthly, setMortgageMonthly)}
              {moneyInput('其他月负债', otherMonthlyDebt, setOtherMonthlyDebt)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)]">
              {moneyDisplay('年收入', kyc.annualIncome)}
              {moneyDisplay('月支出', kyc.monthlyExpense)}
              {moneyDisplay('可投资资产', kyc.investableAssets, true)}
              {moneyDisplay('总资产', kyc.totalAssets)}
              {moneyDisplay('月供 · 房贷', kyc.mortgageMonthly)}
              {moneyDisplay('其他月负债', kyc.otherMonthlyDebt)}
            </div>
          )}

          {/* DTI 可视化 */}
          <div className="mt-6 bg-[var(--canvas)] p-5 border-l-2 border-[var(--brand-red)]">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">负债收入比</div>
                <div className="text-xs text-[var(--ink-2)] mt-1">DEBT-TO-INCOME RATIO {editing && '· 实时预览'}</div>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-semibold tabular-nums ${
                  (editing ? previewDti : kyc.dti) >= 0.4 ? 'text-[var(--danger)]' :
                  (editing ? previewDti : kyc.dti) >= 0.3 ? 'text-[var(--warning)]' : 'text-[var(--positive)]'
                }`}>
                  {editing ? (previewDti * 100).toFixed(0) : (kyc.dti * 100).toFixed(0)}
                  <span className="text-base ml-0.5">%</span>
                </span>
              </div>
            </div>
            <div className="bar h-3">
              <div className={`h-full transition-all duration-500 ${
                (editing ? previewDti : kyc.dti) >= 0.4 ? 'bg-[var(--danger)]' :
                (editing ? previewDti : kyc.dti) >= 0.3 ? 'bg-[var(--warning)]' : 'bg-[var(--positive)]'
              }`}
                style={{ width: `${Math.min(100, (editing ? previewDti : kyc.dti) * 200)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--ink-3)] mt-2 tracking-widest uppercase">
              <span>0% 健康</span><span>30% 警戒</span><span>40%+ 超标</span>
            </div>
          </div>

          <div className="mt-4 px-4 py-3 border-l-2 border-[var(--brand-red)] bg-[var(--canvas)] text-sm">
            <span className="text-[var(--ink-2)]">月结余（扣除房贷及其他负债） </span>
            <span className="font-semibold text-[var(--brand-red)] tabular-nums ml-2">
              ¥{Math.max(0, (editing ? annualIncome : kyc.annualIncome) / 12 - (editing ? monthlyExpense : kyc.monthlyExpense) - (editing ? mortgageMonthly + otherMonthlyDebt : kyc.mortgageMonthly + kyc.otherMonthlyDebt)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* 风险事件模拟 */}
        <div className="card-dark p-8 mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--ink)] tracking-wider">风险情景测算</h2>
            <div className="text-[10px] tracking-widest text-[var(--brand-gold-deep)] uppercase">STRESS TEST</div>
          </div>
          <div className="accent-line-gold mb-4"></div>
          <p className="text-sm text-[var(--ink-2)] mb-6">
            您的应急资金能撑多久？以下为常见风险事件下的资金支撑测算。
          </p>

          {(() => {
            const emergencyFund = (editing ? investableAssets : kyc.investableAssets) * 0.5;
            const monthlyNetIncome = (editing ? annualIncome : kyc.annualIncome) / 12 -
              (editing ? monthlyExpense : kyc.monthlyExpense) -
              (editing ? mortgageMonthly + otherMonthlyDebt : kyc.mortgageMonthly + kyc.otherMonthlyDebt);

            const scenarios = [
              { event: '突发医疗支出', amount: 200000, label: '医疗' },
              { event: '失业 6 个月', amount: Math.abs(monthlyNetIncome) * 6, label: '失业' },
              { event: '房价下跌 30%', amount: (editing ? totalAssets : kyc.totalAssets) * 0.3 * 0.7, label: '房产' },
            ];

            return (
              <div className="space-y-px bg-[var(--line)]">
                {scenarios.map((s, i) => {
                  const monthlyExpenseWithEvent = Math.abs(monthlyNetIncome) + s.amount / 6;
                  const monthsCovered = emergencyFund / Math.max(1, monthlyExpenseWithEvent);
                  const isCritical = monthsCovered < 3;
                  const isWarning = monthsCovered >= 3 && monthsCovered < 6;

                  return (
                    <div key={i} className="bg-white p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--brand-red)] text-sm tabular-nums">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="font-medium text-[var(--ink)] tracking-wider">{s.event}</span>
                        </div>
                        <span className="font-mono font-semibold text-[var(--danger)] tabular-nums text-sm">
                          -¥{Math.round(s.amount).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">可支撑</div>
                          <div className={`text-2xl font-semibold tabular-nums leading-none ${
                            isCritical ? 'text-[var(--danger)]' :
                            isWarning ? 'text-[var(--warning)]' : 'text-[var(--positive)]'
                          }`}>
                            {monthsCovered.toFixed(1)}<span className="text-sm ml-1">个月</span>
                          </div>
                        </div>
                        <div className="col-span-9">
                          <div className="bar h-2">
                            <div className={`h-full transition-all duration-500 ${
                              isCritical ? 'bg-[var(--danger)]' :
                              isWarning ? 'bg-[var(--warning)]' : 'bg-[var(--positive)]'
                            }`} style={{ width: `${Math.min(100, monthsCovered * 16.67)}%` }} />
                          </div>
                          <div className="text-[10px] text-[var(--ink-3)] mt-1.5 tracking-wider uppercase">
                            {isCritical ? '⚠ 风险极高，建议增加应急储备至6个月' :
                             isWarning ? '⚠ 勉强够用，建议补充应急资金' : '✓ 资金充足'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="mt-6 notice">
            <span className="notice-label">建议</span>
            保留 3-6 个月支出作为应急资金（约 ¥{(kyc.monthlyExpense * 6).toLocaleString()}），建议放在流动性高的产品中（货币基金、活期理财）。
          </div>
        </div>

        <PageActions
          onBack={() => router.push('/kyc/basic')}
          onNext={() => { dispatch({ type: 'SET_KYC_STEP', payload: { step: 'finance', done: true } }); router.push('/kyc/risk'); }}
        />
      </div>
    </div>
  );
}
