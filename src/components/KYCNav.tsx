'use client';

import { useRouter } from 'next/navigation';

interface KYCNavProps {
  currentStep: number;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function KYCNav({ currentStep, onBack, rightSlot }: KYCNavProps) {
  const router = useRouter();
  const steps = ['基本信息', '财务状况', '风险评估', '目标保障'];

  return (
    <>
      <div className="bg-white border-b border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={onBack ?? (() => router.push('/customer'))}
            className="icbc-back"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
            </svg>
            返回上一步
          </button>
          <div className="text-[10px] tracking-[0.24em] text-[var(--ink-3)] uppercase">
            步骤 <span className="font-mono text-[var(--brand-red)] font-semibold">{String(currentStep).padStart(2, '0')}</span> / 04
          </div>
          {rightSlot}
        </div>
      </div>

      <div className="bg-white border-b border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-8 py-5">
          <div className="flex items-center">
            {steps.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === currentStep;
              const isDone = stepNum < currentStep;
              return (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 flex items-center justify-center text-sm font-mono font-semibold border ${
                      isActive ? 'step-active' :
                      isDone ? 'step-done' :
                      'step-pending'
                    }`}>
                      {isDone ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span>{String(stepNum).padStart(2, '0')}</span>
                      )}
                    </div>
                    <span className={`text-sm tracking-wider hidden md:inline ${
                      isActive ? 'text-[var(--brand-red)] font-semibold' :
                      isDone ? 'text-[var(--ink-2)]' :
                      'text-[var(--ink-3)]'
                    }`}>{label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-3 ${
                      isDone ? 'bg-[var(--brand-gold)]' : 'bg-[var(--line)]'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export function PageActions({
  onBack,
  onNext,
  nextLabel = '下一步',
  nextDisabled = false,
  nextIcon = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextIcon?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between border-t border-[var(--line)] pt-6 mt-8">
      <button
        onClick={onBack ?? (() => router.back())}
        className="btn btn-secondary"
      >
        ← 返回
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="btn btn-primary btn-lg"
      >
        {nextLabel} {nextIcon && '→'}
      </button>
    </div>
  );
}