// ============================================================
// Bootstrap 重采样稳定性评估
// 衡量双叉树分类在新样本下的一致性
// ============================================================

import type { CustomerKYC, TierId } from '@/types';
import { dualTreeClassify } from '../dual-tree';

/**
 * 单个客户的稳定性指标
 */
export interface CustomerStability {
  customerId: string;
  mostFrequentTier: TierId;
  frequency: number;            // 出现次数最多的场景占比（0-1）
  tierDistribution: Record<TierId, number>; // 该客户被分到各场景的次数
  stabilityLevel: 'STABLE' | 'BOUNDARY' | 'UNSTABLE';
}

/**
 * 整体稳定性评估结果
 */
export interface BootstrapStabilityResult {
  iterationCount: number;
  totalCustomers: number;
  // 分布统计
  stableCount: number;          // >95% 一致的客户数
  boundaryCount: number;         // 70-95% 一致的客户数
  unstableCount: number;        // <70% 一致的客户数
  stablePercentage: number;
  boundaryPercentage: number;
  unstablePercentage: number;
  // 客户级数据
  customerStabilities: CustomerStability[];
  // 场景级一致性
  scenarioConsistency: Record<TierId, {
    scenarioName: string;
    consistencyRate: number;     // 该场景客户被分到该场景的平均一致率
    membershipRate: number;      // 该场景在所有迭代中的稳定成员率
  }>;
  // 业务解读
  interpretation: string;
  generatedAt: string;
}

/**
 * Bootstrap 重采样配置
 */
export interface BootstrapConfig {
  iterations?: number;          // 迭代次数，默认 1000
  seed?: number;                // 随机种子
  sampleRatio?: number;         // 抽样比例，默认 1.0（与原数据同量）
}

/**
 * 核心算法：运行 Bootstrap 重采样，评估双叉树分类的稳定性
 */
export function evaluateBootstrapStability(
  customers: CustomerKYC[],
  config: BootstrapConfig = {}
): BootstrapStabilityResult {
  const {
    iterations = 1000,
    seed = 42,
    sampleRatio = 1.0,
  } = config;

  // 设置随机种子（保证可复现）
  const rng = seedRandom(seed);

  // 记录每个客户在每次迭代中被分到的场景
  const classificationHistory = new Map<string, Map<TierId, number>>();

  // 记录每个场景在每次迭代中的成员
  const scenarioMembershipHistory = new Map<TierId, Set<string>>();

  // Bootstrap 循环
  for (let i = 0; i < iterations; i++) {
    // 1. 有放回抽样
    const sampleSize = Math.floor(customers.length * sampleRatio);
    const sample: CustomerKYC[] = [];
    for (let j = 0; j < sampleSize; j++) {
      const idx = Math.floor(rng() * customers.length);
      sample.push(customers[idx]);
    }

    // 2. 对抽样样本运行双叉树分类
    const sampleClassifications = new Map<string, { tierId: TierId; tierName: string }>();
    const scenarioMembers = new Map<TierId, Set<string>>();

    for (const kyc of sample) {
      const tier = dualTreeClassify(kyc);
      sampleClassifications.set(kyc.customerId, {
        tierId: tier.finalTier,
        tierName: tier.tierName,
      });

      if (!scenarioMembers.has(tier.finalTier)) {
        scenarioMembers.set(tier.finalTier, new Set());
      }
      scenarioMembers.get(tier.finalTier)!.add(kyc.customerId);
    }

    // 3. 记录历史
    for (const [customerId, classification] of sampleClassifications) {
      if (!classificationHistory.has(customerId)) {
        classificationHistory.set(customerId, new Map());
      }
      const tierCount = classificationHistory.get(customerId)!;
      tierCount.set(classification.tierId, (tierCount.get(classification.tierId) || 0) + 1);
    }

    // 累计场景成员历史
    for (const [tierId, members] of scenarioMembers) {
      if (!scenarioMembershipHistory.has(tierId)) {
        scenarioMembershipHistory.set(tierId, new Set());
      }
      const acc = scenarioMembershipHistory.get(tierId)!;
      for (const memberId of members) {
        acc.add(`${i}:${memberId}`); // 用迭代号前缀区分不同迭代的同一客户
      }
    }
  }

  // 4. 计算每个客户的稳定性
  const customerStabilities: CustomerStability[] = [];
  let stableCount = 0;
  let boundaryCount = 0;
  let unstableCount = 0;

  for (const customer of customers) {
    const history = classificationHistory.get(customer.customerId);
    if (!history || history.size === 0) {
      // 该客户从未被抽到（理论上不应发生，除非 sampleRatio < 1）
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tierDistribution: Record<TierId, number> = {} as any;
    let totalOccurrences = 0;
    let maxTier: TierId = 'B1-1';
    let maxCount = 0;

    for (const [tierId, count] of history) {
      tierDistribution[tierId] = count;
      totalOccurrences += count;
      if (count > maxCount) {
        maxCount = count;
        maxTier = tierId;
      }
    }

    const frequency = maxCount / totalOccurrences;
    let stabilityLevel: 'STABLE' | 'BOUNDARY' | 'UNSTABLE';
    if (frequency >= 0.95) {
      stabilityLevel = 'STABLE';
      stableCount++;
    } else if (frequency >= 0.70) {
      stabilityLevel = 'BOUNDARY';
      boundaryCount++;
    } else {
      stabilityLevel = 'UNSTABLE';
      unstableCount++;
    }

    customerStabilities.push({
      customerId: customer.customerId,
      mostFrequentTier: maxTier,
      frequency,
      tierDistribution,
      stabilityLevel,
    });
  }

  // 5. 场景级一致性
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scenarioConsistency: Record<TierId, any> = {} as any;
  for (const [tierId] of scenarioMembershipHistory) {
    const tierCustomers = customerStabilities.filter(s => s.mostFrequentTier === tierId);
    const consistencyRate = tierCustomers.length > 0
      ? mean(tierCustomers.map(c => c.frequency))
      : 0;

    // 该场景在所有迭代中的平均成员数（用于评估场景本身是否稳定）
    const scenarioIterationSizes = Array.from(scenarioMembershipHistory.get(tierId)!)
      .reduce((map, key) => {
        const iterNum = key.split(':')[0];
        map.set(iterNum, (map.get(iterNum) || 0) + 1);
        return map;
      }, new Map<string, number>());
    const avgSize = mean(Array.from(scenarioIterationSizes.values()));
    const membershipRate = avgSize / iterations;

    scenarioConsistency[tierId] = {
      scenarioName: '', // 后续填充
      consistencyRate,
      membershipRate: Math.min(membershipRate, 1.0),
    };
  }

  // 填充场景名称
  for (const customer of customers) {
    const tier = dualTreeClassify(customer);
    const consistency = scenarioConsistency[tier.finalTier];
    if (consistency && !consistency.scenarioName) {
      consistency.scenarioName = tier.tierName;
    }
  }

  const totalCustomers = customerStabilities.length;
  return {
    iterationCount: iterations,
    totalCustomers,
    stableCount,
    boundaryCount,
    unstableCount,
    stablePercentage: Math.round((stableCount / totalCustomers) * 1000) / 10,
    boundaryPercentage: Math.round((boundaryCount / totalCustomers) * 1000) / 10,
    unstablePercentage: Math.round((unstableCount / totalCustomers) * 1000) / 10,
    customerStabilities,
    scenarioConsistency,
    interpretation: interpretStability(stableCount, boundaryCount, unstableCount, totalCustomers),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 边界客户处理建议
 * 业务意义：边界客户应单独标注，由客户经理复核
 */
export interface BoundaryCustomerHandling {
  totalBoundaryCustomers: number;
  recommendedActions: string[];
  feedbackLoop: string;
}

export function planBoundaryCustomerHandling(
  result: BootstrapStabilityResult
): BoundaryCustomerHandling {
  const boundaryCustomers = result.customerStabilities.filter(
    s => s.stabilityLevel === 'BOUNDARY'
  );

  return {
    totalBoundaryCustomers: boundaryCustomers.length,
    recommendedActions: [
      '1. 在系统中标注为"边界客户"，不强行分类到单一场景',
      '2. 推送至客户经理人工复核，确认最终分层',
      '3. 复核结果反馈至双叉树规则，作为规则优化的输入',
      '4. 对持续高频率切换场景的客户，启动专项分析',
    ],
    feedbackLoop: '人工复核 → 规则优化 → 双叉树更新 → 下一轮 Bootstrap 验证',
  };
}

/**
 * 生成可读报告
 */
export function generateBootstrapReport(result: BootstrapStabilityResult): string {
  const lines: string[] = [];
  lines.push(`Bootstrap 重采样稳定性报告`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`迭代次数：${result.iterationCount}`);
  lines.push(`客户总数：${result.totalCustomers}`);
  lines.push('');
  lines.push(`稳定性分布：`);
  lines.push(`  稳定客户（一致性 ≥95%）：${result.stableCount}（${result.stablePercentage}%）`);
  lines.push(`  边界客户（一致性 70-95%）：${result.boundaryCount}（${result.boundaryPercentage}%）`);
  lines.push(`  不稳定客户（一致性 <70%）：${result.unstableCount}（${result.unstablePercentage}%）`);
  lines.push('');
  lines.push(`业务解读：${result.interpretation}`);
  lines.push('');
  lines.push(`各场景一致性：`);
  const sortedScenarios = Object.entries(result.scenarioConsistency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a, b) => (b[1] as any).consistencyRate - (a[1] as any).consistencyRate);
  for (const [tierId, data] of sortedScenarios) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    lines.push(`  ${d.scenarioName}（${tierId}）：一致性 ${(d.consistencyRate * 100).toFixed(1)}%`);
  }

  return lines.join('\n');
}

// ── 工具函数 ──────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * 业务解读
 */
function interpretStability(
  stable: number,
  boundary: number,
  unstable: number,
  total: number
): string {
  const stableRatio = stable / total;
  if (stableRatio >= 0.85) {
    return `优秀：${(stableRatio * 100).toFixed(1)}% 的客户分类高度稳定，分类方法可靠`;
  } else if (stableRatio >= 0.70) {
    return `良好：${(stableRatio * 100).toFixed(1)}% 的客户分类稳定，${(boundary / total * 100).toFixed(1)}% 为边界客户需复核`;
  } else if (stableRatio >= 0.50) {
    return `一般：分类存在较多边界客户，建议优化双叉树分裂规则`;
  } else {
    return `不足：分类稳定性较差，需要重新审视分类逻辑`;
  }
}

/**
 * 简单的伪随机数生成器（Mulberry32）
 * 用于保证 Bootstrap 实验的可复现性
 */
function seedRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}