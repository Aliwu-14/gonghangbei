// ============================================================
// 现金流永续测算引擎
// 基于 KYC + 金字塔配置 + 持仓产品，测算退休现金流可持续性
// ============================================================

import type { CustomerKYC, PyramidConfig, AllocationPlanItem, RiskLevel } from '@/types';

export interface CashFlowResult {
  inflation: number;
  expectedReturn: number;        // 组合加权预期年化（积累期）
  retirementReturn: number;      // 退休后保守假设收益
  sustainableRate: number;       // 安全提取率（按权益占比）
  retirementAge: number;
  yearsToRetirement: number;
  monthlySurplus: number;        // 当前月结余（假设持续定投至退休）
  assetsAtRetirement: number;    // 退休时点资产预测
  annualNeedAtRetirement: number; // 退休首年生活支出
  pensionAnnual: number;         // 退休后养老金年收入
  pensionMonthly: number;        // 估算月退休金
  pensionReplacementRate: number; // 估算替代率
  pensionContributionYears: number; // 估算缴费年限
  annualGap: number;             // 年度现金流缺口
  monthlyPensionGap: number;     // 月度退休金缺口
  monthlyDCAForPensionGap: number; // 弥补退休金缺口所需月定投
  monthlyCashFlow: number;       // 退休后每月可支配现金流
  coverageRatio: number;         // 支出覆盖率
  perpetual: boolean;            // 是否永续（至100岁仍有结余）
  depletionAge: number | null;   // 资产耗尽年龄
  alreadyRetired: boolean;
  milestones: { age: number; assets: number; withdraw: number; pension: number }[];
}

// ── 组合预期收益：按持仓加权，无持仓时按层级比例估算 ──
function portfolioExpectedReturn(config: PyramidConfig, items: AllocationPlanItem[]): number {
  const total = items.reduce((s, i) => s + i.allocationAmount, 0);
  if (total > 0) {
    const weighted = items.reduce((s, i) => s + (i.product.expectedReturn || 0) * i.allocationAmount, 0) / total;
    return weighted;
  }
  // 层级默认假设收益
  const defaults = { cash: 0.018, stable: 0.035, growth: 0.075, satellite: 0.055 };
  return config.cashRatio * defaults.cash + config.stableRatio * defaults.stable
    + config.growthRatio * defaults.growth + config.satelliteRatio * defaults.satellite;
}

// ── 安全提取率：权益（成长+卫星）占比越高，可提取率越高 ──
function sustainableWithdrawalRate(config: PyramidConfig): number {
  const equity = config.growthRatio + config.satelliteRatio;
  if (equity < 0.10) return 0.030;
  if (equity < 0.20) return 0.035;
  if (equity < 0.30) return 0.040;
  if (equity < 0.40) return 0.043;
  return 0.045;
}

/**
 * 工具函数：根据银行端给定的风险评分映射到等级
 * 注意——此函数仅用于将银行端问卷分数映射到 R1-R5 等级，
 * 任何业务页面不应调用此函数重新计算用户风险等级。
 */
function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 20) return 'R1';
  if (score <= 40) return 'R2';
  if (score <= 60) return 'R3';
  if (score <= 80) return 'R4';
  return 'R5';
}

export { scoreToRiskLevel };

//  退休金估算（简化模型）─────────────────────────────────────
// 基于"目标替代率"方法：退休金应覆盖退休前生活支出的合理比例
// 中国社保实际替代率约 40-60%，我们用保守估计
function estimatePension(kyc: CustomerKYC): { monthlyPension: number; contributionYears: number; replacementRate: number } {
  // 假设22岁开始工作缴费
  const startWorkAge = 22;
  const currentContributionYears = Math.max(0, Math.min(kyc.age - startWorkAge, 40));
  const yearsToRetirement = kyc.yearsToRetirement ?? 0;
  const totalContributionYears = Math.min(currentContributionYears + yearsToRetirement, 40);

  // 基础替代率：根据缴费年限分档（符合社保"多缴多得"原则）
  // 15年最低缴费 → 40% 替代率；30年 → 50%；40年 → 60%
  let baseReplacementRate: number;
  if (totalContributionYears < 15) {
    baseReplacementRate = 0.30; // 不足最低缴费年限，只有个人账户部分
  } else if (totalContributionYears < 25) {
    baseReplacementRate = 0.40 + (totalContributionYears - 15) * 0.01; // 40%-50%
  } else if (totalContributionYears < 35) {
    baseReplacementRate = 0.50 + (totalContributionYears - 25) * 0.008; // 50%-58%
  } else {
    baseReplacementRate = 0.58 + (totalContributionYears - 35) * 0.005; // 58%-63%
  }

  // 退休金 = 当前月支出 × 替代率（用支出而非收入，更贴近实际需求）
  // 退休时月支出 = 当前月支出 × (1 + 通胀)^yearsToRetirement
  const inflation = 0.025;
  const retirementMonthlyExpense = kyc.monthlyExpense * Math.pow(1 + inflation, yearsToRetirement);
  const monthlyPension = retirementMonthlyExpense * baseReplacementRate;

  return { monthlyPension, contributionYears: totalContributionYears, replacementRate: baseReplacementRate };
}

// ── 主测算函数 ─────────────────────────────────────────────────
export function computeCashFlow(
  kyc: CustomerKYC,
  config: PyramidConfig,
  items: AllocationPlanItem[]
): CashFlowResult {
  const inflation = 0.025;
  const expectedReturn = portfolioExpectedReturn(config, items);
  const sustainableRate = sustainableWithdrawalRate(config);
  const retirementReturn = Math.min(expectedReturn, 0.04); // 退休后保守假设

  const alreadyRetired = kyc.yearsToRetirement === null || kyc.yearsToRetirement === 0;
  const yearsToRetirement = alreadyRetired ? 0 : (kyc.yearsToRetirement as number);
  const retirementAge = kyc.age + yearsToRetirement;

  // 月结余 = 月收入 − 月支出 − 月供 − 其他月负债（≥0）
  const monthlySurplus = Math.max(0, kyc.annualIncome / 12 - kyc.monthlyExpense - kyc.mortgageMonthly - kyc.otherMonthlyDebt);

  // 积累期：现有资产复利 + 每年结余定投（年末投入）
  let assetsAtRetirement = kyc.investableAssets;
  const r = expectedReturn;
  if (yearsToRetirement > 0) {
    // 现有资产复利增长
    assetsAtRetirement = kyc.investableAssets * Math.pow(1 + r, yearsToRetirement);
    // 每年结余定投的终值（普通年金，年末投入）
    const annualContribution = monthlySurplus * 12;
    if (r > 0 && annualContribution > 0) {
      const annuityFactor = (Math.pow(1 + r, yearsToRetirement) - 1) / r;
      assetsAtRetirement += annualContribution * annuityFactor;
    } else if (annualContribution > 0) {
      assetsAtRetirement += annualContribution * yearsToRetirement;
    }
  }

  // 退休首年支出（通胀调整）
  const annualNeedAtRetirement = kyc.monthlyExpense * 12 * Math.pow(1 + inflation, yearsToRetirement);

  // 养老金估算
  const pensionEstimate = estimatePension(kyc);
  const pensionAnnual = pensionEstimate.monthlyPension * 12;

  // 年度现金流缺口 = 退休年支出 − 年养老金（≥0）
  const annualGap = Math.max(0, annualNeedAtRetirement - pensionAnnual);

  // 退休后月现金流 = (资产年安全提取额 + 年养老金) / 12
  const annualWithdrawal = assetsAtRetirement * sustainableRate;
  const monthlyCashFlow = (annualWithdrawal + pensionAnnual) / 12;
  
  // 支出覆盖率 = (年安全提取 + 年养老金) / 年支出
  const coverageRatio = annualNeedAtRetirement > 0
    ? (annualWithdrawal + pensionAnnual) / annualNeedAtRetirement
    : 1;

  // 弥补退休金缺口所需的月定投额
  // 缺口 = 退休月支出 − 月退休金
  const monthlyPensionGap = Math.max(0, kyc.monthlyExpense * Math.pow(1 + inflation, yearsToRetirement) - pensionEstimate.monthlyPension);
  
  // 用年金终值公式反推：每月定投 × 年金终值系数 = 退休时需要的额外资产
  // 退休时需要的额外资产 = 月缺口 × 12 / 安全提取率（用4%规则反推）
  const extraAssetsNeeded = monthlyPensionGap * 12 / sustainableRate;
  let monthlyDCAForPensionGap = 0;
  if (extraAssetsNeeded > 0 && yearsToRetirement > 0) {
    // 月复利计算
    const monthlyRate = r / 12;
    const monthsToRetirement = yearsToRetirement * 12;
    if (monthlyRate > 0) {
      const monthlyAnnuityFactor = (Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate;
      monthlyDCAForPensionGap = extraAssetsNeeded / monthlyAnnuityFactor;
    } else {
      monthlyDCAForPensionGap = extraAssetsNeeded / monthsToRetirement;
    }
  }

  // 逐年模拟至100岁：判断永续性
  let balance = assetsAtRetirement;
  let depletionAge: number | null = null;
  const milestones: { age: number; assets: number; withdraw: number; pension: number }[] = [];
  for (let t = 0; retirementAge + t <= 100; t++) {
    const age = retirementAge + t;
    // 每年提取缺口部分（通胀调整）
    const withdraw = annualGap * Math.pow(1 + inflation, t);
    // 资产增长 − 提取
    balance = balance * (1 + retirementReturn) - withdraw;
    if (age === retirementAge || age % 10 === 0 || age === 100) {
      milestones.push({ 
        age, 
        assets: Math.max(0, balance), 
        withdraw, 
        pension: pensionAnnual * Math.pow(1 + inflation, t) 
      });
    }
    if (balance <= 0) { 
      depletionAge = age; 
      break; 
    }
  }
  const perpetual = depletionAge === null && balance > 0;

  return {
    inflation, expectedReturn, retirementReturn, sustainableRate,
    retirementAge, yearsToRetirement, monthlySurplus,
    assetsAtRetirement, annualNeedAtRetirement, pensionAnnual,
    pensionMonthly: pensionEstimate.monthlyPension,
    pensionReplacementRate: pensionEstimate.replacementRate,
    pensionContributionYears: pensionEstimate.contributionYears,
    annualGap, monthlyPensionGap, monthlyDCAForPensionGap,
    monthlyCashFlow, coverageRatio, perpetual, depletionAge,
    alreadyRetired, milestones,
  };
}
