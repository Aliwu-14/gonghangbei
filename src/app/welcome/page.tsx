'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import { PageBar, Container } from '@/components/PageBar';

export default function WelcomePage() {
  const router = useRouter();
  const { state, dispatch } = useAppState();
  const customer = state.currentCustomer;

  useEffect(() => {
    if (!customer) {
      router.push('/login');
    }
  }, [customer, router]);

  if (!customer) return null;

  const logout = () => {
    dispatch({ type: 'RESET' });
    router.push('/login');
  };

  return (
    <>
      <PageBar
        breadcrumb={[{ label: "首页", href: "/" }, { label: "财富规划" }]}
        right={
          <button onClick={logout} className="text-xs text-[var(--ink-2)] hover:text-[var(--brand-red)]">
            退出登录
          </button>
        }
      />

      <Container>
        {/* 欢迎函 */}
        <div className="mb-12 pb-8 border-b border-[var(--line)]">
          <div className="text-[11px] tracking-[0.24em] text-[var(--ink-3)] mb-2">
            ICBC PRIVATE WEALTH · 私人银行欢迎函
          </div>
          <h1 className="text-3xl text-[var(--brand-red)] font-semibold mb-2">
            您好，<span className="text-[var(--brand-red)]">{customer.demoName}</span>
            <span className="text-[var(--ink-3)] text-base ml-3 font-normal">
              {state.currentCustomer?.gender === 'female' ? '女士' : '先生'}
            </span>
          </h1>
          <div className="accent-line-gold mt-3" />
        </div>

        {/* 标题 */}
        <div className="mb-10">
          <h2 className="text-[28px] font-bold text-[var(--ink)] leading-tight mb-3">开始您的专属财富规划</h2>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-2xl">
            基于您在工商银行的客户档案与风险评估等级，结合您补充的理财目标与保障需求，依托智能算法为您生成资产配置方案。整个流程约需 3–5 分钟。
          </p>
        </div>

        {/* 服务流程 — 等宽三栏 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--line)] border border-[var(--line)] mb-12">
          {[
            { num: '01', title: '档案确认', desc: '核对您在工商银行的客户档案与风险评估等级', meta: '信息核对 · 风险匹配' },
            { num: '02', title: '目标与保障', desc: '补充您的理财目标与保障需求', meta: '多目标 · 现金流测算' },
            { num: '03', title: '智能规划', desc: '系统为您生成专属资产配置方案', meta: '金字塔 · 产品匹配' },
          ].map((item) => (
            <div key={item.num} className="bg-[var(--white)] p-7">
              <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-[var(--line)]">
                <div className="text-[32px] font-bold text-[var(--brand-red)] leading-none tabular-nums">{item.num}</div>
                <div className="text-[10px] tracking-[0.2em] text-[var(--ink-3)]">{item.meta}</div>
              </div>
              <div className="text-base font-medium text-[var(--ink)] mb-2">{item.title}</div>
              <div className="text-sm text-[var(--ink-2)] leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* 服务说明 */}
        <div className="card card-padded-lg mb-10">
          <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-[var(--line)]">
            <h3 className="section-title">服务说明与免责声明</h3>
            <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)]">IMPORTANT NOTICE</div>
          </div>
          <ol className="space-y-3 text-sm text-[var(--ink-2)] leading-relaxed">
            <li className="grid grid-cols-12 gap-3">
              <span className="col-span-1 text-[var(--brand-red)] font-semibold">壹</span>
              <span className="col-span-11">本服务的<strong className="text-[var(--brand-red)]">风险评估等级来源于您在工行开户时填写的客户问卷</strong>，平台不再另行测评，直接采用此结果匹配产品。</span>
            </li>
            <li className="grid grid-cols-12 gap-3">
              <span className="col-span-1 text-[var(--brand-red)] font-semibold">贰</span>
              <span className="col-span-11">请确认您的银行客户档案中个人信息、财务状况是否准确。如有偏差，可在后续确认页进行修改。</span>
            </li>
            <li className="grid grid-cols-12 gap-3">
              <span className="col-span-1 text-[var(--brand-red)] font-semibold">叁</span>
              <span className="col-span-11">您的理财目标与保障需求请按实际填写。系统将据此推荐产品组合，并测算长期现金流可持续性。</span>
            </li>
            <li className="grid grid-cols-12 gap-3">
              <span className="col-span-1 text-[var(--brand-red)] font-semibold">肆</span>
              <span className="col-span-11">所有投资建议<strong className="text-[var(--danger)]">不构成任何形式的收益承诺</strong>。投资有风险，决策需谨慎。</span>
            </li>
            <li className="grid grid-cols-12 gap-3">
              <span className="col-span-1 text-[var(--brand-red)] font-semibold">伍</span>
              <span className="col-span-11">您的个人信息将严格保密，仅用于本次财富规划服务，符合《个人信息保护法》要求。</span>
            </li>
          </ol>
        </div>

        {/* 下一步 */}
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-6">
          <div>
            <div className="text-[11px] tracking-[0.24em] text-[var(--ink-3)] mb-1">NEXT STEP</div>
            <div className="text-base text-[var(--ink)] font-medium">核对客户档案</div>
          </div>
          <button onClick={() => router.push('/customer')} className="btn btn-primary btn-lg">
            开始规划
            <span>→</span>
          </button>
        </div>
      </Container>
    </>
  );
}