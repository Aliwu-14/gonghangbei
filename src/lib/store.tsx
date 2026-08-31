// ============================================================
// 全局状态管理（React Context + sessionStorage 持久化）
// ============================================================

'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Customer, CustomerKYC, TierResult, PyramidConfig, AllocationPlanItem, ReservationOrder } from '@/types';

interface AppState {
  // 当前客户
  currentCustomer: Customer | null;
  currentKYC: CustomerKYC | null;
  // 分层结果
  tierResult: TierResult | null;
  // 金字塔配置
  pyramidConfig: PyramidConfig | null;
  // 推荐产品
  planItems: AllocationPlanItem[];
  // 预约单
  reservation: ReservationOrder | null;
  // 流程步骤
  currentStep: number;
  // KYC 各步骤完成状态
  kycSteps: { basic: boolean; finance: boolean; risk: boolean; goals: boolean };
  // KYC 在方案生成后被修改（提示用户重新生成）
  kycDirty: boolean;
  // 用户手动调整过比例或产品
  planCustomized: boolean;
}

const initialState: AppState = {
  currentCustomer: null,
  currentKYC: null,
  tierResult: null,
  pyramidConfig: null,
  planItems: [],
  reservation: null,
  currentStep: 0,
  kycSteps: { basic: false, finance: false, risk: false, goals: false },
  kycDirty: false,
  planCustomized: false,
};

const STORAGE_KEY = 'icbc_wmp_state';

type Action =
  | { type: 'SET_CUSTOMER'; payload: { customer: Customer; kyc: CustomerKYC } }
  | { type: 'UPDATE_KYC'; payload: Partial<CustomerKYC> }
  | { type: 'SET_TIER'; payload: TierResult }
  | { type: 'SET_PYRAMID'; payload: { config: PyramidConfig; items: AllocationPlanItem[] } }
  | { type: 'UPDATE_CONFIG'; payload: { config: PyramidConfig; items: AllocationPlanItem[] } }
  | { type: 'UPDATE_ITEMS'; payload: AllocationPlanItem[] }
  | { type: 'SET_RESERVATION'; payload: ReservationOrder }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_KYC_STEP'; payload: { step: keyof AppState['kycSteps']; done: boolean } }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; payload: AppState };

// ── KYC 中不可被本平台修改的字段（银行端来源数据） ────────────
// 这些字段仅来源于银行端问卷，本平台任何页面均不应提供修改入口
const BANK_LOCKED_KYC_FIELDS = [
  'riskLevel',          // 风险评估等级
  'riskScore',          // 风险评分
  'riskQuestionnaireVersion', // 问卷版本
  'riskAssessedAt',     // 评估日期
  'riskValidUntil',     // 评估有效期
] as const;

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CUSTOMER':
      return { ...state, currentCustomer: action.payload.customer, currentKYC: action.payload.kyc };
    case 'UPDATE_KYC': {
      if (!state.currentKYC) return state;
      // 银行端锁定字段过滤：忽略平台尝试修改的银行端字段
      const filtered = { ...action.payload };
      BANK_LOCKED_KYC_FIELDS.forEach(f => delete (filtered as Record<string, unknown>)[f]);
      return {
        ...state,
        currentKYC: { ...state.currentKYC, ...filtered },
        // 方案已生成时标记需要重新生成
        kycDirty: state.tierResult ? true : state.kycDirty,
      };
    }
    case 'SET_TIER':
      return { ...state, tierResult: action.payload };
    case 'SET_PYRAMID':
      // 系统重新生成方案：清除脏标记
      return {
        ...state,
        pyramidConfig: action.payload.config,
        planItems: action.payload.items,
        kycDirty: false,
        planCustomized: false,
      };
    case 'UPDATE_CONFIG':
      // 用户手动调整比例
      return {
        ...state,
        pyramidConfig: action.payload.config,
        planItems: action.payload.items,
        planCustomized: true,
      };
    case 'UPDATE_ITEMS':
      // 用户手动调整产品/金额
      return { ...state, planItems: action.payload, planCustomized: true };
    case 'SET_RESERVATION':
      return { ...state, reservation: action.payload };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_KYC_STEP':
      return { ...state, kycSteps: { ...state.kycSteps, [action.payload.step]: action.payload.done } };
    case 'RESET':
      return initialState;
    case 'HYDRATE':
      // 从持久化存储恢复状态
      return { ...initialState, ...action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// 尝试从 sessionStorage 恢复状态
function loadPersistedState(): Partial<AppState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 验证关键字段存在
      if (parsed.currentCustomer && parsed.currentKYC) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load persisted state:', e);
  }
  return null;
}

// 保存状态到 sessionStorage
function persistState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // 从 sessionStorage 恢复状态
  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      dispatch({ type: 'HYDRATE', payload: persisted as AppState });
    }
    setHydrated(true);
  }, []);

  // 状态变化时持久化（仅在已 hydrate 后）
  useEffect(() => {
    if (hydrated) {
      persistState(state);
    }
  }, [state, hydrated]);

  // 页面卸载时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 保留状态直到页面真正关闭
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 提供初始状态直到 hydrate 完成，防止闪烁
  const displayState = hydrated ? state : initialState;

  return (
    <AppContext.Provider value={{ state: displayState, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
