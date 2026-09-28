'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { KYCNav, PageActions } from '@/components/KYCNav';

export default function KYCBasicPage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const kyc = state.currentKYC;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [age, setAge] = useState(kyc?.age ?? 30);
  const [occupation, setOccupation] = useState(kyc?.occupation ?? '');
  const [familyStructure, setFamilyStructure] = useState(kyc?.familyStructure ?? '未婚');
  const [incomeStability, setIncomeStability] = useState(kyc?.incomeStability ?? 'stable');

  useEffect(() => {
    if (!kyc) { router.push('/login'); }
  }, [kyc, router]);

  if (!kyc) return null;

  const startEdit = () => {
    setAge(kyc.age); setOccupation(kyc.occupation);
    setFamilyStructure(kyc.familyStructure); setIncomeStability(kyc.incomeStability);
    setSaved(false);
    setEditing(true);
  };

  const saveEdit = () => {
    if (age < 18 || age > 90) { alert('请输入 18-90 岁之间的年龄'); return; }
    dispatch({
      type: 'UPDATE_KYC',
      payload: { age, occupation: occupation.trim() || kyc.occupation, familyStructure, incomeStability },
    });
    setEditing(false);
    setSaved(true);
  };

  return (
    <>
      <KYCNav currentStep={1} onBack={() => router.push('/customer')} />

      <div className="max-w-3xl mx-auto px-8 py-10 animate-fade-in">

        <div className="mb-8">
          <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] uppercase mb-2">STEP 01 · BASIC PROFILE</div>
          <h1 className="text-[26px] font-semibold text-[var(--brand-red)] leading-tight mb-2">
            个人信息确认
          </h1>
          <div className="accent-line-gold mb-4" />
          <p className="text-sm text-[var(--ink-2)] leading-relaxed">
            以下信息来源于您在工商银行的客户档案。请确认无误；如有变化可直接修改，平台将自动重新生成资产配置方案。
          </p>
        </div>

        {state.kycDirty && (
          <div className="notice notice-warning mb-6 flex items-center justify-between">
            <span>您已修改个人信息，当前方案基于修改前的信息生成</span>
            <button
              onClick={() => { dispatch({ type: 'SET_KYC_STEP', payload: { step: 'goals', done: true } }); router.push('/kyc/goals'); }}
              className="text-[var(--warning)] hover:underline text-sm"
            >
              去重新生成方案 →
            </button>
          </div>
        )}

        <div className="card card-padded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-3">
              <h2 className="section-title">基本信息</h2>
              <span className="tag tag-muted">银行档案</span>
            </div>
            {!editing ? (
              <button onClick={startEdit} className="text-sm text-[var(--brand-red)] hover:underline flex items-center gap-1">
                ✎ 修改
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn btn-ghost">取消</button>
                <button onClick={saveEdit} className="btn btn-primary">保存修改</button>
              </div>
            )}
          </div>

          <div className="accent-line-gold mb-6" />

          <p className="text-sm text-[var(--ink-2)] mb-6">
            {editing ? '如有信息变化可直接修改，修改后会重新生成方案。' : '您的个人信息来源于银行客户档案。'}
          </p>

          {saved && !editing && (
            <div className="notice notice-positive mb-4">
              ✓ 已保存修改。生成方案前修改会自动生效；若方案已生成，请重新生成。
            </div>
          )}

          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">年龄（18–90）</label>
                <input type="number" min={18} max={90} value={age} onChange={e => setAge(Number(e.target.value))} className="input tabular-nums" />
              </div>
              <div>
                <label className="label">职业</label>
                <input value={occupation} onChange={e => setOccupation(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">家庭结构</label>
                <select value={familyStructure} onChange={e => setFamilyStructure(e.target.value)} className="input">
                  {['未婚', '已婚无孩', '已婚有孩', '已婚子女独立', '已婚子女已工作', '已婚退休', '单亲家庭'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">收入稳定性</label>
                <select value={incomeStability} onChange={e => setIncomeStability(e.target.value as 'stable' | 'moderate' | 'volatile')} className="input">
                  <option value="stable">稳定</option>
                  <option value="moderate">一般</option>
                  <option value="volatile">波动</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)]">
              <FieldView label="年龄" value={`${kyc.age} 岁`} mono />
              <FieldView label="职业" value={kyc.occupation} />
              <FieldView label="家庭结构" value={kyc.familyStructure} />
              <FieldView label="收入稳定性" value={kyc.incomeStability === 'stable' ? '稳定' : kyc.incomeStability === 'moderate' ? '一般' : '波动'} />
              {kyc.hasChildren && (
                <FieldView label="子女信息" value={kyc.childrenSummary.map(c => `${c.name} (${c.age}岁)`).join('、')} fullWidth />
              )}
              {kyc.hasDependentParents && (
                <FieldView label="赡养责任" value="有" warning fullWidth />
              )}
            </div>
          )}
        </div>

        <PageActions
          onBack={() => router.push('/customer')}
          onNext={() => { dispatch({ type: 'SET_KYC_STEP', payload: { step: 'basic', done: true } }); router.push('/kyc/finance'); }}
        />
      </div>
    </>
  );
}

function FieldView({ label, value, mono, warning, fullWidth }: { label: string; value: string; mono?: boolean; warning?: boolean; fullWidth?: boolean }) {
  return (
    <div className={`bg-white p-4 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)] uppercase mb-1.5">{label}</div>
      <div className={`text-lg font-semibold ${warning ? 'text-[var(--warning)]' : 'text-[var(--ink)]'} ${mono ? 'tabular-nums' : ''}`}>
        {value}
      </div>
    </div>
  );
}
