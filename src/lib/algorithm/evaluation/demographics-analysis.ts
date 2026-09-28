// ============================================================
// 业务指标对比分析
// 评估双叉树分类结果的业务意义
// ============================================================

import type { CustomerKYC, TierId } from '@/types';
import { dualTreeClassify } from '../dual-tree';

/**
 * 客群画像
 * 描述一个客群场景的核心业务特征
 */
export interface ClusterProfile {
  tierId: TierId;
  tierName: string;
  count: number;
  percentage: number;
  // 财务指标
  avgAssets: number;
  medianAssets: number;
  avgAnnualIncome: number;
  avgDTI: number;
  // 客户指标
  avgAge: number;
  riskDistribution: Record<string, number>;
  // 家庭与生命周期
  familyDistribution: Record<string, number>;
  lifeStageDistribution: Record<string, number>;
  // 业务洞察
  primaryGoals: { goal: string; ratio: number }[];
  // 抽样客户 ID 列表（用于复现）
  sampleCustomerIds: string[];
}

/**
 * 业务指标对比表
 * 用于展示不同客群场景的画像差异
 */
export interface DemographicsComparison {
  totalCustomers: number;
  totalScenarios: number;
  profiles: ClusterProfile[];
  contrastiveScenarios: ContrastiveScenario[];
  generatedAt: string;
}

/**
 * 对比场景对
 * 用于对比两个差异最大的客群场景
 */
export interface ContrastiveScenario {
  scenarioA: ClusterProfile;
  scenarioB: ClusterProfile;
  differentiation: {
    assetsRatio: number;       // 资产差异倍数
    ageDifference: number;     // 年龄差异
    riskDifference: number;    // 风险等级差异
  };
  businessInsight: string;     // 业务解读
}

/**
 * 对一批客户运行双叉树分类，并提取业务画像
 */
export function analyzeCustomerDemographics(
  customers: CustomerKYC[]
): DemographicsComparison {
  // 1. 对每个客户进行双叉树分类
  const classifiedCustomers = customers.map(kyc => ({
    kyc,
    tier: dualTreeClassify(kyc),
  }));

  // 2. 按 finalTier 分组
  const groupedByTier = new Map<TierId, typeof classifiedCustomers>();
  for (const item of classifiedCustomers) {
    const tier = item.tier.finalTier;
    if (!groupedByTier.has(tier)) {
      groupedByTier.set(tier, []);
    }
    groupedByTier.get(tier)!.push(item);
  }

  // 3. 为每个客群生成画像
  const profiles: ClusterProfile[] = [];
  for (const [tierId, items] of groupedByTier) {
    profiles.push(buildClusterProfile(tierId, items));
  }

  // 4. 找出最具对比性的两个场景
  const contrastive = findMostContrastiveScenarios(profiles);

  return {
    totalCustomers: customers.length,
    totalScenarios: profiles.length,
    profiles: profiles.sort((a, b) => b.count - a.count), // 按人数降序
    contrastiveScenarios: contrastive,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 构建单个客群的画像
 */
function buildClusterProfile(
  tierId: TierId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: { kyc: CustomerKYC; tier: any }[]
): ClusterProfile {
  const kycs = items.map(i => i.kyc);
  const totalCount = kycs.length;

  // 资产
  const assetsList = kycs.map(k => k.investableAssets).sort((a, b) => a - b);
  const avgAssets = assetsList.reduce((s, v) => s + v, 0) / totalCount;
  const medianAssets = assetsList[Math.floor(totalCount / 2)];

  // 收入与 DTI
  const avgAnnualIncome = mean(kycs.map(k => k.annualIncome));
  const avgDTI = mean(kycs.map(k => k.dti));

  // 年龄
  const avgAge = mean(kycs.map(k => k.age));

  // 风险等级分布
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riskDistribution = distributionBy(kycs, k => k.riskLevel);

  // 家庭结构分布
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const familyDistribution = distributionBy(kycs, k => k.familyStructure);

  // 生命周期分布
  const lifeStageDistribution = distributionBy(kycs, k => inferLifeStage(k));

  // 主要目标
  const goalCount: Record<string, number> = {};
  for (const k of kycs) {
    for (const g of k.goals) {
      goalCount[g] = (goalCount[g] || 0) + 1;
    }
  }
  const primaryGoals = Object.entries(goalCount)
    .map(([goal, count]) => ({ goal, ratio: count / totalCount }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);

  return {
    tierId,
    tierName: items[0].tier.tierName,
    count: totalCount,
    percentage: 0, // 后续填充
    avgAssets: Math.round(avgAssets),
    medianAssets: Math.round(medianAssets),
    avgAnnualIncome: Math.round(avgAnnualIncome),
    avgDTI: Math.round(avgDTI * 1000) / 1000,
    avgAge: Math.round(avgAge * 10) / 10,
    riskDistribution,
    familyDistribution,
    lifeStageDistribution,
    primaryGoals,
    sampleCustomerIds: kycs.slice(0, 5).map(k => k.customerId),
  };
}

/**
 * 计算占比字段（基于总客户数）
 */
function fillPercentages(profiles: ClusterProfile[], total: number): ClusterProfile[] {
  return profiles.map(p => ({
    ...p,
    percentage: Math.round((p.count / total) * 1000) / 10,
  }));
}

/**
 * 找出差异最大的两个场景对
 */
function findMostContrastiveScenarios(
  profiles: ClusterProfile[]
): ContrastiveScenario[] {
  const filled = fillPercentages(profiles, profiles.reduce((s, p) => s + p.count, 0));
  const result: ContrastiveScenario[] = [];

  // 找出资产最高和最低的两个场景
  const sortedByAssets = [...filled].sort((a, b) => a.avgAssets - b.avgAssets);
  if (sortedByAssets.length >= 2) {
    const lowest = sortedByAssets[0];
    const highest = sortedByAssets[sortedByAssets.length - 1];
    result.push({
      scenarioA: lowest,
      scenarioB: highest,
      differentiation: {
        assetsRatio: highest.avgAssets / Math.max(lowest.avgAssets, 1),
        ageDifference: highest.avgAge - lowest.avgAge,
        riskDifference: highestRiskLevel(highest) - highestRiskLevel(lowest),
      },
      businessInsight: `${highest.tierName}客群资产规模是${lowest.tierName}的${(highest.avgAssets / Math.max(lowest.avgAssets, 1)).toFixed(1)}倍，验证了双叉树主树按资产分层的有效性`,
    });
  }

  return result;
}

/**
 * 提取客群的主要风险等级（占比最高的）
 */
function highestRiskLevel(profile: ClusterProfile): number {
  const levels = ['R1', 'R2', 'R3', 'R4', 'R5'];
  let maxLevel = 'R1';
  let maxRatio = 0;
  for (const [level, ratio] of Object.entries(profile.riskDistribution)) {
    if (ratio > maxRatio) {
      maxRatio = ratio;
      maxLevel = level;
    }
  }
  return levels.indexOf(maxLevel) + 1;
}

// ── 工具函数 ──────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function distributionBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  const total = items.length;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    result[k] = Math.round((v / total) * 1000) / 10;
  }
  return result;
}

function inferLifeStage(kyc: CustomerKYC): string {
  if (kyc.age < 30) return 'YOUNG';
  if (kyc.age < 45) return 'FAMILY_BUILDING';
  if (kyc.age < 55) return 'MATURE';
  if (kyc.age < 65) return 'PRE_RETIRE';
  return 'RETIREE';
}

/**
 * 生成可读的对比报告
 */
export function generateComparisonReport(comparison: DemographicsComparison): string {
  const lines: string[] = [];
  lines.push(`业务指标对比报告`);
  lines.push(`生成时间：${comparison.generatedAt}`);
  lines.push(`客户总数：${comparison.totalCustomers}`);
  lines.push(`场景总数：${comparison.totalScenarios}`);
  lines.push('');
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Top 5 客群场景画像`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  for (const profile of comparison.profiles.slice(0, 5)) {
    lines.push('');
    lines.push(`【${profile.tierName}】(${profile.tierId})`);
    lines.push(`  人数：${profile.count}（${profile.percentage}%）`);
    lines.push(`  平均资产：${(profile.avgAssets / 10000).toFixed(1)}万`);
    lines.push(`  平均年龄：${profile.avgAge}岁`);
    lines.push(`  平均DTI：${(profile.avgDTI * 100).toFixed(1)}%`);
    lines.push(`  主要风险等级：${topDistribution(profile.riskDistribution)}`);
    lines.push(`  主要家庭结构：${topDistribution(profile.familyDistribution)}`);
    lines.push(`  主要目标：${profile.primaryGoals.map(g => `${g.goal}(${(g.ratio * 100).toFixed(0)}%)`).join('、')}`);
  }

  if (comparison.contrastiveScenarios.length > 0) {
    lines.push('');
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`对比场景分析`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    for (const cs of comparison.contrastiveScenarios) {
      lines.push('');
      lines.push(`${cs.businessInsight}`);
      lines.push(`  - ${cs.scenarioA.tierName}：${(cs.scenarioA.avgAssets / 10000).toFixed(1)}万资产，平均${cs.scenarioA.avgAge}岁`);
      lines.push(`  - ${cs.scenarioB.tierName}：${(cs.scenarioB.avgAssets / 10000).toFixed(1)}万资产，平均${cs.scenarioB.avgAge}岁`);
      lines.push(`  - 资产差异倍数：${cs.differentiation.assetsRatio.toFixed(1)}倍`);
    }
  }

  return lines.join('\n');
}

function topDistribution(dist: Record<string, number>): string {
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '无';
  const [key, ratio] = sorted[0];
  return `${key}(${ratio}%)`;
}