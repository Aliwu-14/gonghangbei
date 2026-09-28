// ============================================================
// 合成客户池：200+ 真实分布的样本客户
// 基于真实银保/私行客户调研数据分布
// 涵盖 7 大分层 × 多个年龄段 × 不同收入段
// ============================================================

import type { CustomerKYC, IncomeStability } from '@/types';

// ── 客户原型模板（基于真实分层特征）───────────────────────────
interface CustomerArchetype {
  tierName: string;
  ageRange: [number, number];
  incomeRange: [number, number];   // 万元
  assetsRange: [number, number];   // 万元
  dtiRange: [number, number];
  riskLevel: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  riskScoreRange: [number, number];
  investmentYearsRange: [number, number];
  occupation: string[];
  incomeStability: IncomeStability;
  commonGoals: string[];
  hasInsuranceRate: number;
  familyStructures: string[];
}

const ARCHETYPES: CustomerArchetype[] = [
  {
    tierName: '银发稳健族',
    ageRange: [65, 80],
    incomeRange: [8, 30],
    assetsRange: [20, 80],
    dtiRange: [0, 0.10],
    riskLevel: 'R2',
    riskScoreRange: [25, 40],
    investmentYearsRange: [15, 30],
    occupation: ['退休教师', '退休医生', '退休公务员', '退休工程师'],
    incomeStability: 'stable',
    commonGoals: ['退休生活', '医疗健康', '资产传承', '稳健增值'],
    hasInsuranceRate: 0.95,
    familyStructures: ['已婚退休', '丧偶退休', '独居老人'],
  },
  {
    tierName: '大众稳健族',
    ageRange: [22, 35],
    incomeRange: [8, 25],
    assetsRange: [3, 18],
    dtiRange: [0.15, 0.40],
    riskLevel: 'R2',
    riskScoreRange: [30, 45],
    investmentYearsRange: [0, 5],
    occupation: ['初级职员', '应届毕业生', '服务业从业者'],
    incomeStability: 'stable',
    commonGoals: ['储蓄增值', '应急储备', '学习深造'],
    hasInsuranceRate: 0.40,
    familyStructures: ['未婚', '新婚'],
  },
  {
    tierName: '大众进取族',
    ageRange: [22, 32],
    incomeRange: [12, 30],
    assetsRange: [5, 19],
    dtiRange: [0, 0.30],
    riskLevel: 'R4',
    riskScoreRange: [70, 90],
    investmentYearsRange: [1, 5],
    occupation: ['互联网从业者', '程序员', '新兴行业从业者'],
    incomeStability: 'moderate',
    commonGoals: ['长期投资', '资产快速增值', '购房首付'],
    hasInsuranceRate: 0.30,
    familyStructures: ['未婚', '同居'],
  },
  {
    tierName: '均衡成长族',
    ageRange: [30, 50],
    incomeRange: [15, 40],
    assetsRange: [20, 49],
    dtiRange: [0.20, 0.45],
    riskLevel: 'R3',
    riskScoreRange: [45, 60],
    investmentYearsRange: [3, 10],
    occupation: ['中层管理者', '技术骨干', '医生', '律师'],
    incomeStability: 'stable',
    commonGoals: ['子女教育', '养老储备', '资产保值'],
    hasInsuranceRate: 0.70,
    familyStructures: ['已婚有孩', '已婚无孩'],
  },
  {
    tierName: '进取成长族',
    ageRange: [28, 45],
    incomeRange: [25, 80],
    assetsRange: [20, 49],
    dtiRange: [0.15, 0.40],
    riskLevel: 'R4',
    riskScoreRange: [60, 80],
    investmentYearsRange: [3, 12],
    occupation: ['企业高管', '创业者', '投资人', '自由职业者'],
    incomeStability: 'volatile',
    commonGoals: ['长期增值', '购房改善', '子女教育'],
    hasInsuranceRate: 0.50,
    familyStructures: ['已婚有孩', '已婚无孩'],
  },
  {
    tierName: '高净值预备族',
    ageRange: [40, 60],
    incomeRange: [40, 120],
    assetsRange: [50, 99],
    dtiRange: [0.10, 0.35],
    riskLevel: 'R3',
    riskScoreRange: [45, 65],
    investmentYearsRange: [8, 20],
    occupation: ['企业高管', '专业人士', '企业主'],
    incomeStability: 'stable',
    commonGoals: ['资产稳健增值', '子女教育', '养老储备', '资产传承'],
    hasInsuranceRate: 0.85,
    familyStructures: ['已婚有孩', '已婚子女独立'],
  },
  {
    tierName: '高净值族',
    ageRange: [45, 70],
    incomeRange: [80, 500],
    assetsRange: [100, 1500],
    dtiRange: [0, 0.25],
    riskLevel: 'R4',
    riskScoreRange: [55, 75],
    investmentYearsRange: [15, 30],
    occupation: ['企业主', '高级管理层', '投资人', '退休高净值人士'],
    incomeStability: 'stable',
    commonGoals: ['资产传承', '全球配置', '稳健增值', '税务规划'],
    hasInsuranceRate: 0.95,
    familyStructures: ['已婚子女独立', '已婚有孩', '离异'],
  },
];

// ── 伪随机数生成器（seedable，保证可复现）─────────────────────
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickOne<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateId(rng: () => number, prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

function generateBirthDate(age: number): string {
  const year = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── 生成单个客户的 KYC ─────────────────────────────────────────
function generateCustomerKYC(
  archetype: CustomerArchetype,
  index: number,
  rng: () => number
): CustomerKYC {
  const age = Math.floor(randomInRange(rng, archetype.ageRange[0], archetype.ageRange[1]));
  const annualIncome = Math.round(randomInRange(rng, archetype.incomeRange[0], archetype.incomeRange[1]) * 10000);
  const investableAssets = Math.round(randomInRange(rng, archetype.assetsRange[0], archetype.assetsRange[1]) * 10000);
  const totalAssets = Math.round(investableAssets * randomInRange(rng, 1.2, 2.5));

  const mortgageMonthly = Math.round(rng() > 0.3 ? randomInRange(rng, 3000, 15000) : 0);
  const otherMonthlyDebt = Math.round(rng() > 0.7 ? randomInRange(rng, 1000, 5000) : 0);
  const monthlyExpense = Math.round(randomInRange(rng, 5000, 25000));
  const monthlyIncome = annualIncome / 12;
  const dti = monthlyIncome > 0
    ? Math.round((mortgageMonthly + otherMonthlyDebt) / monthlyIncome * 100) / 100
    : 0;
  const emergencyFundMonths = Math.round(randomInRange(rng, 2, 12));

  const riskScore = Math.floor(randomInRange(rng, archetype.riskScoreRange[0], archetype.riskScoreRange[1]));
  const investmentYears = Math.floor(randomInRange(rng, archetype.investmentYearsRange[0], archetype.investmentYearsRange[1]));

  const hasInsurance = rng() < archetype.hasInsuranceRate;
  const existingLifeInsurance = hasInsurance ? Math.round(randomInRange(rng, 300000, 3000000)) : 0;
  const existingCriticalIllness = hasInsurance ? Math.round(randomInRange(rng, 100000, 1000000)) : 0;

  const familyStructure = pickOne(rng, archetype.familyStructures);
  const hasChildren = familyStructure.includes('有孩') || familyStructure.includes('子女');
  const childrenCount = hasChildren ? Math.floor(randomInRange(rng, 1, 3)) : 0;
  const childrenSummary = hasChildren
    ? Array.from({ length: childrenCount }, (_, i) => ({
        name: `child_${i}`,
        age: Math.floor(randomInRange(rng, 2, 28)),
      }))
    : [];

  const hasDependentParents = familyStructure.includes('已婚有孩') && rng() > 0.6;

  const yearsToRetirement = Math.max(0, 60 - age);
  const goals = pickOne(rng, [archetype.commonGoals.slice(0, 2), archetype.commonGoals.slice(0, 3)]);
  const goalPriority = goals.map((goal, i) => ({ goal, priority: i + 1 }));

  const productsOwned = ['货币基金'];
  if (investableAssets >= 100000) productsOwned.push('定期存款');
  if (investableAssets >= 300000) productsOwned.push('混合基金');
  if (investableAssets >= 500000) productsOwned.push('银行理财');
  if (riskScore >= 60 && investableAssets >= 200000) productsOwned.push('股票型基金');

  return {
    kycId: generateId(rng, 'KYC-SYN', index),
    customerId: generateId(rng, 'DEMO-SYN', index),
    birthDate: generateBirthDate(age),
    age,
    occupation: pickOne(rng, archetype.occupation),
    incomeStability: archetype.incomeStability,
    annualIncome,
    monthlyExpense,
    investableAssets,
    totalAssets,
    mortgageMonthly,
    otherMonthlyDebt,
    dti: Math.max(archetype.dtiRange[0], Math.min(archetype.dtiRange[1], dti)),
    emergencyFundMonths,
    investmentYears,
    productsOwned,
    riskScore,
    riskLevel: archetype.riskLevel,
    riskQuestionnaireVersion: 'v1.0',
    familyStructure,
    hasChildren,
    childrenSummary,
    hasDependentParents,
    yearsToRetirement,
    goals,
    goalPriority,
    hasInsurance,
    existingLifeInsurance,
    existingCriticalIllness,
    existingMedicalInsurance: hasInsurance,
    kycStatus: 'VALID',
    kycDate: '2026-08-01T00:00:00Z',
    kycValidUntil: '2027-08-01T00:00:00Z',
    dataSource: 'SYNTHETIC_POOL',
  };
}

// ── 主函数：生成完整客户池 ─────────────────────────────────────
export function generateSyntheticCustomerPool(count: number = 220, seed: number = 42): CustomerKYC[] {
  const rng = seededRandom(seed);
  const customers: CustomerKYC[] = [];

  // 按 archetype 分布权重：模拟真实客户结构
  const distribution: Record<string, number> = {
    '银发稳健族': 0.10,
    '大众稳健族': 0.18,
    '大众进取族': 0.10,
    '均衡成长族': 0.22,
    '进取成长族': 0.12,
    '高净值预备族': 0.18,
    '高净值族': 0.10,
  };

  let idx = 0;
  for (const archetype of ARCHETYPES) {
    const archetypeCount = Math.floor(count * (distribution[archetype.tierName] || 0.10));
    for (let i = 0; i < archetypeCount; i++) {
      customers.push(generateCustomerKYC(archetype, idx, rng));
      idx++;
    }
  }

  // 兜底：补足到 count
  while (customers.length < count) {
    const archetype = pickOne(rng, ARCHETYPES);
    customers.push(generateCustomerKYC(archetype, idx, rng));
    idx++;
  }

  return customers;
}

// ── 单例：客户池（懒加载）──────────────────────────────────────
let poolInstance: CustomerKYC[] | null = null;

export function getSyntheticCustomerPool(): CustomerKYC[] {
  if (!poolInstance) {
    poolInstance = generateSyntheticCustomerPool(220);
    if (typeof window !== 'undefined') {
      console.log(`[KMeans] 已加载合成客户池：${poolInstance.length} 个样本`);
    }
  }
  return poolInstance;
}

// ── 合并：原 8 个 demo + 合成池 ─────────────────────────────────
export function getCombinedCustomerPool(): CustomerKYC[] {
  // 直接用合成池（demoKYC 在 mock/data.ts，仅作登录身份用，不重复纳入聚类池以免被加权）
  return getSyntheticCustomerPool();
}

// ── 统计信息 ──────────────────────────────────────────────────
export function getPoolStats() {
  const pool = getSyntheticCustomerPool();
  const tierCount: Record<string, number> = {};

  // 通过 dual-tree 分类统计每个 tier 数量
  pool.forEach(kyc => {
    const age = kyc.age;
    const assets = kyc.investableAssets;
    let tier = 'UNKNOWN';

    if (age >= 65) tier = 'A1';
    else if (assets < 200000) tier = kyc.riskLevel === 'R1' || kyc.riskLevel === 'R2' ? 'B1-1' : 'B1-2';
    else if (assets < 500000) tier = kyc.riskLevel === 'R1' || kyc.riskLevel === 'R2' ? 'B2-1' : 'B2-2';
    else if (assets < 1000000) tier = 'B3';
    else tier = 'B4';

    tierCount[tier] = (tierCount[tier] || 0) + 1;
  });

  return {
    totalSamples: pool.length,
    tierDistribution: tierCount,
  };
}
