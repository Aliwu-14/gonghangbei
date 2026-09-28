'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';

export default function PlanGeneratePage() {
  const router = useRouter();
  const { state } = useAppState();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const customerIdRef = useRef(state.currentCustomer?.customerId || '');

  useEffect(() => {
    if (state.currentCustomer?.customerId) {
      customerIdRef.current = state.currentCustomer.customerId;
    }
  }, [state.currentCustomer?.customerId]);

  useEffect(() => {
    if (!state.currentCustomer) {
      router.push('/login');
      return;
    }
    const steps = [
      { text: '正在分析您的客户档案', pct: 15 },
      { text: '评估风险承受能力', pct: 35 },
      { text: '计算最优资产配置', pct: 55 },
      { text: '匹配适合您的产品组合', pct: 75 },
      { text: '生成专属财富方案', pct: 90 },
      { text: '方案准备就绪', pct: 100 },
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].pct);
        setCurrentStep(steps[i].text);
        i++;
      } else {
        clearInterval(timer);
        setTimeout(() => {
          const customerId = customerIdRef.current;
          if (customerId) {
            router.push(`/plan/${customerId}`);
          }
        }, 800);
      }
    }, 600);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div className=" flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="card p-10 text-center">
          <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] uppercase mb-3">
            ICBC · GENERATING · PLEASE WAIT
          </div>
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-[var(--brand-red)] relative">
            <svg className="w-10 h-10 text-[var(--brand-red)] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--brand-red)] mb-3 tracking-wider">正在为您生成方案</h2>
          <div className="accent-line-gold mx-auto mb-4"></div>
          <p className="text-sm text-[var(--ink-2)] mb-8 h-5">{currentStep}</p>

          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 bar h-1">
              <div className="bar-fill" style={{ width: `${progress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div className="font-mono font-semibold text-sm text-[var(--brand-red)] tabular-nums w-12 text-right">{progress}%</div>
          </div>

          <div className="text-[10px] tracking-widest text-[var(--ink-3)] uppercase mt-6">
            中国工商银行 · 财富规划服务 · 算法驱动 · 数据保密
          </div>
        </div>
      </div>
    </div>
  );
}