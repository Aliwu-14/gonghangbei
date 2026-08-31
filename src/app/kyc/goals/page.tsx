'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { dualTreeClassify } from '@/lib/algorithm/dual-tree';
import { generatePyramidPlan } from '@/lib/algorithm/pyramid';
import { KYCNav } from '@/components/KYCNav';

const GOAL_POOL = ['储蓄增值', '购房首付', '购房改善', '子女教育', '养老储备', '退休生活', '医疗健康', '长期增值', '长期投资', '资产传承', '稳健增值', '应急备用'];

export default function KYCGoalsPage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const kyc = state.currentKYC;

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goals, setGoals] = useState<string[]>(kyc?.goals ?? []);
  const [hasInsurance, setHasInsurance] = useState(kyc?.hasInsurance ?? false);
  const [lifeInsurance, setLifeInsurance] = useState(kyc?.existingLifeInsurance ?? 0);
  const [criticalIllness, setCriticalIllness] = useState(kyc?.existingCriticalIllness ?? 0);
  const [hasMedical, setHasMedical] = useState(kyc?.existingMedicalInsurance ?? false);
  const [yearsToRetirement, setYearsToRetirement] = useState<number>(kyc?.yearsToRetirement ?? 0);

  useEffect(() => {
    if (!kyc) { router.push('/login'); }
  }, [kyc, router]);

  if (!kyc) return null;

  const startEdit = () => {
    setGoals(kyc.goals);
    setHasInsurance(kyc.hasInsurance); setLifeInsurance(kyc.existingLifeInsurance);
    setCriticalIllness(kyc.existingCriticalIllness); setHasMedical(kyc.existingMedicalInsurance);
    setYearsToRetirement(kyc.yearsToRetirement ?? 0);
    setSaved(false);
    setEditing(true);
  };

  const toggleGoal = (g: string) => {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const saveEdit = () => {
    if (goals.length === 0) { alert('请至少选择一个理财目标'); return; }
    dispatch({
      type: 'UPDATE_KYC',
      payload: {
        goals,
        goalPriority: goals.map((g, i) => ({ goal: g, priority: i + 1 })),
        hasInsurance, existingLifeInsurance: lifeInsurance,
        existingCriticalIllness: criticalIllness, existingMedicalInsurance: hasMedical,
        yearsToRetirement,
      },
    });
    setEditing(false);
    setSaved(true);
  };

  const handleGeneratePlan = () => {
    if (editing) {
      if (goals.length === 0) { alert('请至少选择一个理财目标'); return; }
      dispatch({
        type: 'UPDATE_KYC',
        payload: {
          goals,
          goalPriority: goals.map((g, i) => ({ goal: g, priority: i + 1 })),
          hasInsurance, existingLifeInsurance: lifeInsurance,
          existingCriticalIllness: criticalIllness, existingMedicalInsurance: hasMedical,
          yearsToRetirement,
        },
      });
      setEditing(false);
      setSaved(true);
    }

    dispatch({ type: 'SET_KYC_STEP', payload: { step: 'goals', done: true } });
    const tierResult = dualTreeClassify(state.currentKYC!);
    dispatch({ type: 'SET_TIER', payload: tierResult });
    const { config, items } = generatePyramidPlan(state.currentKYC!, tierResult.finalTier);
    dispatch({ type: 'SET_PYRAMID', payload: { config, items } });
    dispatch({ type: 'SET_STEP', payload: 5 });
    router.push('/plan/generate');
  };

  return (
    <div className="">
      <KYCNav currentStep={4} onBack={() => router.push('/kyc/risk')} />

      <div className="max-w-3xl mx-auto px-8 py-10 animate-fade-in">

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.3em] text-[var(--brand-gold-deep)] uppercase mb-2 font-medium">STEP 04 · GOALS & PROTECTION</div>
          <h1 className="text-[28px] font-bold text-[var(--brand-red)] leading-tight mb-2">
            理财目标与保障
          </h1>
          <div className="accent-line-gold mb-4"></div>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed">
            请补充您的理财目标与现有保障状况。系统将据此为您匹配合适的产品组合，并测算长期现金流可持续性。
          </p>
        </div>

        {state.kycDirty && (
          <div className="mb-6 px-4 py-3 border-l-2 border-[var(--warning)] bg-[var(--warning-bg)] text-sm text-[var(--warning)]">
            您修改过的信息将在点击「生成配置方案」时生效。
          </div>
        )}

        {/* 理财目标 */}
        <div className="card p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink)] tracking-wider">理财目标</h2>
              <span className="tag tag-muted">{kyc.goals.length} 项</span>
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

          {editing ? (
            <>
              <p className="text-sm text-[var(--ink-2)] mb-4">点击选择您的理财目标（可多选，至少 1 项）</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[var(--line)] border border-[var(--line)]">
                {GOAL_POOL.map(g => {
                  const active = goals.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGoal(g)}
                      className={`px-4 py-3 text-sm font-medium transition-all text-left ${
                        active
                          ? 'bg-[var(--brand-red)] text-white'
                          : 'bg-white text-[var(--ink-2)] hover:bg-[var(--canvas)]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {active && (
                          <svg className="w-3.5 h-3.5 text-[var(--brand-gold-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                        <span>{g}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-px bg-[var(--line)]">
              {kyc.goals.map((goal, i) => (
                <div key={i} className="bg-white px-4 py-3 flex items-center gap-4">
                  <span className="text-[var(--brand-red)] text-base font-bold tabular-nums w-8">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[var(--ink)] font-medium">{goal}</span>
                </div>
              ))}
            </div>
          )}
          {saved && !editing && (
            <div className="mt-4 px-3 py-2 border-l-2 border-[var(--positive)] bg-[var(--positive-bg)] text-sm text-[var(--positive)]">
              ✓ 目标已保存，点击下方「生成配置方案」生效。
            </div>
          )}
        </div>

        {/* 保险保障 */}
        <div className="card p-8 mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--ink)] tracking-wider">保险保障</h2>
            {editing && <span className="tag tag-warning">编辑中</span>}
          </div>
          <div className="accent-line-gold mb-6"></div>

          {editing ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)]">
                <label className={`bg-white p-4 flex items-center gap-3 cursor-pointer transition-colors ${hasInsurance ? 'bg-[var(--positive-bg)]' : ''}`}>
                  <input type="checkbox" checked={hasInsurance} onChange={e => setHasInsurance(e.target.checked)} className="w-4 h-4 accent-[var(--brand-red)]" />
                  <span className="text-sm text-[var(--ink)]">已配置基础保险</span>
                </label>
                <label className={`bg-white p-4 flex items-center gap-3 cursor-pointer transition-colors ${hasMedical ? 'bg-[var(--positive-bg)]' : ''}`}>
                  <input type="checkbox" checked={hasMedical} onChange={e => setHasMedical(e.target.checked)} className="w-4 h-4 accent-[var(--brand-red)]" />
                  <span className="text-sm text-[var(--ink)]">已配置医疗保险</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] tracking-widest text-[var(--ink-2)] uppercase mb-2">寿险保额（元）</label>
                  <input type="number" min={0} step={100000} value={lifeInsurance} onChange={e => setLifeInsurance(Number(e.target.value))} className="input tabular-nums" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest text-[var(--ink-2)] uppercase mb-2">重疾保额（元）</label>
                  <input type="number" min={0} step={100000} value={criticalIllness} onChange={e => setCriticalIllness(Number(e.target.value))} className="input tabular-nums" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)]">
                <div className={`p-4 ${kyc.hasInsurance ? 'bg-[var(--positive-bg)]' : 'bg-[var(--danger-bg)]'}`}>
                  <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">基础保险</div>
                  <div className={`text-sm font-semibold ${kyc.hasInsurance ? 'text-[var(--positive)]' : 'text-[var(--danger)]'}`}>
                    {kyc.hasInsurance ? '✓ 已配置' : '× 未配置'}
                  </div>
                </div>
                <div className={`p-4 ${kyc.existingMedicalInsurance ? 'bg-[var(--positive-bg)]' : 'bg-[var(--danger-bg)]'}`}>
                  <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">医疗保险</div>
                  <div className={`text-sm font-semibold ${kyc.existingMedicalInsurance ? 'text-[var(--positive)]' : 'text-[var(--danger)]'}`}>
                    {kyc.existingMedicalInsurance ? '✓ 已配置' : '× 未配置'}
                  </div>
                </div>
                <div className="bg-[var(--canvas)] p-4">
                  <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">寿险保额</div>
                  <div className="text-lg font-semibold text-[var(--ink)] tabular-nums">¥{(kyc.existingLifeInsurance / 10000).toFixed(0)}<span className="text-xs text-[var(--ink-3)] ml-1">万</span></div>
                </div>
                <div className="bg-[var(--canvas)] p-4">
                  <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mb-1">重疾保额</div>
                  <div className="text-lg font-semibold text-[var(--ink)] tabular-nums">¥{(kyc.existingCriticalIllness / 10000).toFixed(0)}<span className="text-xs text-[var(--ink-3)] ml-1">万</span></div>
                </div>
              </div>
              {!kyc.hasInsurance && (
                <div className="mt-4 px-4 py-3 border-l-2 border-[var(--warning)] bg-[var(--warning-bg)] text-sm text-[var(--warning)]">
                  您当前未配置基础保险，保障缺口可能影响配置方案的合理性。
                </div>
              )}
            </>
          )}
        </div>

        {/* 退休规划 */}
        <div className="card p-8 mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--ink)] tracking-wider">退休规划</h2>
            <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">RETIREMENT</div>
          </div>
          <div className="accent-line-gold mb-6"></div>

          {editing ? (
            <div className="max-w-sm">
              <label className="block text-[10px] tracking-widest text-[var(--ink-2)] uppercase mb-2">距退休年数（已退休填 0）</label>
              <input type="number" min={0} max={45} value={yearsToRetirement} onChange={e => setYearsToRetirement(Math.max(0, Math.min(45, Number(e.target.value))))} className="input tabular-nums" />
            </div>
          ) : (
            <div className="bg-[var(--canvas)] p-5 flex items-center justify-between border-l-2 border-[var(--brand-red)]">
              <div>
                <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase">距退休</div>
                <div className="text-xs text-[var(--ink-2)] mt-1">YEARS TO RETIREMENT</div>
              </div>
              <div className="text-3xl font-bold text-[var(--brand-red)] tabular-nums">
                {kyc.yearsToRetirement === 0 ? '已退休' : kyc.yearsToRetirement === null ? '—' : `${kyc.yearsToRetirement} 年`}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] pt-6">
          <button onClick={() => router.push('/kyc/risk')} className="btn btn-secondary flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>返回</span>
          </button>
          <button onClick={handleGeneratePlan} className="btn btn-primary-accent flex items-center gap-3">
            <span>生成配置方案</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
