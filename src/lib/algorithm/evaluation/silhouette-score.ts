// ============================================================
// 轮廓系数评估
// 衡量双叉树分类的算法质量
// ============================================================

import type { CustomerKYC, TierId } from '@/types';
import { dualTreeClassify } from '../dual-tree';
import { businessDistance } from './business-distance';

/**
 * 单个客户的轮廓系数
 */
export interface CustomerSilhouette {
  customerId: string;
  tierId: TierId;
  intraClusterDistance: number;   // a(i)：同簇内平均距离
  nearestClusterDistance: number; // b(i)：最近异簇平均距离
  silhouetteScore: number;        // s(i) = (b - a) / max(a, b)
}

/**
 * 整体轮廓系数评估结果
 */
export interface SilhouetteEvaluation {
  averageSilhouette: number;       // 所有客户的平均轮廓系数
  qualityLevel: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT'; // 质量等级
  perClusterSilhouette: Record<TierId, {
    tierName: string;
    avgScore: number;
    memberCount: number;
  }>;
  // 业务可读性说明
  interpretation: string;
  // 详细数据
  customerScores: CustomerSilhouette[];
  evaluationMetrics: {
    totalCustomers: number;
    totalClusters: number;
    sampleSize: number;            // 实际参与计算的样本数
  };
}

/**
 * 计算双叉树分类的轮廓系数
 *
 * 步骤：
 * 1. 对所有客户运行双叉树分类，按 finalTier 分组
 * 2. 对每个客户计算 a(i)（同簇内平均距离）
 * 3. 对每个客户计算 b(i)（最近异簇平均距离）
 * 4. 计算 s(i) = (b(i) - a(i)) / max(a(i), b(i))
 */
export function evaluateSilhouette(
  customers: CustomerKYC[],
  options: {
    sampleSize?: number;       // 抽样计算的客户数（避免 O(n²) 复杂度）
    fullEvaluation?: boolean;  // 是否全量计算
  } = {}
): SilhouetteEvaluation {
  const { sampleSize = 200, fullEvaluation = false } = options;

  // 1. 分类所有客户
  const classified = customers.map(kyc => ({
    kyc,
    tierId: dualTreeClassify(kyc).finalTier,
    tierName: dualTreeClassify(kyc).tierName,
  }));

  // 2. 按 finalTier 分组
  const clusters = new Map<TierId, typeof classified>();
  for (const item of classified) {
    if (!clusters.has(item.tierId)) {
      clusters.set(item.tierId, []);
    }
    clusters.get(item.tierId)!.push(item);
  }

  // 3. 抽样（避免大客户群时计算量爆炸）
  const sampled = fullEvaluation
    ? classified
    : stratifiedSample(classified, clusters, sampleSize);

  // 4. 重新构建抽样后的分组
  const sampledClusters = new Map<TierId, typeof sampled>();
  for (const item of sampled) {
    if (!sampledClusters.has(item.tierId)) {
      sampledClusters.set(item.tierId, []);
    }
    sampledClusters.get(item.tierId)!.push(item);
  }

  // 5. 计算每个客户的轮廓系数
  const customerScores: CustomerSilhouette[] = [];
  const tierIds = Array.from(sampledClusters.keys());

  for (const [tierId, members] of sampledClusters) {
    const otherTierIds = tierIds.filter(t => t !== tierId);

    for (const item of members) {
      const a = averageDistanceToCluster(item.kyc, members);
      const b = Math.min(
        ...otherTierIds.map(otherTierId =>
          averageDistanceToCluster(item.kyc, sampledClusters.get(otherTierId)!)
        )
      );

      const s = Math.max(a, b) > 0
        ? (b - a) / Math.max(a, b)
        : 0;

      customerScores.push({
        customerId: item.kyc.customerId,
        tierId,
        intraClusterDistance: a,
        nearestClusterDistance: b,
        silhouetteScore: s,
      });
    }
  }

  // 6. 计算整体平均轮廓系数
  const averageSilhouette = customerScores.length > 0
    ? mean(customerScores.map(s => s.silhouetteScore))
    : 0;

  // 7. 计算每个客群的平均轮廓系数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perClusterSilhouette: Record<TierId, any> = {} as any;
  for (const [tierId, members] of sampledClusters) {
    const tierScores = customerScores.filter(s => s.tierId === tierId);
    perClusterSilhouette[tierId] = {
      tierName: members[0]?.tierName ?? tierId,
      avgScore: tierScores.length > 0
        ? mean(tierScores.map(s => s.silhouetteScore))
        : 0,
      memberCount: members.length,
    };
  }

  // 8. 业务解读
  const interpretation = interpretSilhouette(averageSilhouette);

  return {
    averageSilhouette: Math.round(averageSilhouette * 1000) / 1000,
    qualityLevel: classifySilhouetteQuality(averageSilhouette),
    perClusterSilhouette,
    interpretation,
    customerScores,
    evaluationMetrics: {
      totalCustomers: customers.length,
      totalClusters: clusters.size,
      sampleSize: sampled.length,
    },
  };
}

/**
 * 分层抽样
 * 保留各客群的代表性，避免大客群主导结果
 */
function stratifiedSample(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classified: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clusters: Map<TierId, any[]>,
  totalSampleSize: number
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  const totalCount = classified.length;

  // 按客群规模比例分配抽样
  for (const [, members] of clusters) {
    const proportion = members.length / totalCount;
    const sampleForCluster = Math.max(
      1,
      Math.round(proportion * totalSampleSize)
    );
    // 随机抽取
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    result.push(...shuffled.slice(0, sampleForCluster));
  }

  return result;
}

/**
 * 计算客户到客群的平均距离
 */
function averageDistanceToCluster(
  customer: CustomerKYC,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clusterMembers: any[]
): number {
  if (clusterMembers.length <= 1) return 0;

  let totalDistance = 0;
  let count = 0;

  for (const member of clusterMembers) {
    if (member.kyc.customerId === customer.customerId) continue;
    totalDistance += businessDistance(customer, member.kyc);
    count++;
  }

  return count > 0 ? totalDistance / count : 0;
}

/**
 * 业务距离的归一化处理
 * 由于业务距离可能大于 1，将 silhouette 计算归一化到 [0, 1] 范围
 * 业务意义：分数越高，客群内同质性越强
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeSilhouette(s: number): number {
  // 业务距离范围大约是 [0, 1.5]
  // 原 silhouette 范围 [-1, 1]，归一化后 [0, 1]
  return (s + 1) / 2;
}

/**
 * 轮廓系数质量分级
 *
 * 业务分类场景下：
 * - < 0.30: 较差（POOR）
 * - 0.30-0.50: 一般（FAIR）
 * - 0.50-0.70: 良好（GOOD）
 * - > 0.70: 优秀（EXCELLENT）
 *
 * 注意：业务分类因维度离散多，轮廓系数通常低于通用聚类
 */
function classifySilhouetteQuality(
  score: number
): 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT' {
  if (score < 0.30) return 'POOR';
  if (score < 0.50) return 'FAIR';
  if (score < 0.70) return 'GOOD';
  return 'EXCELLENT';
}

/**
 * 业务解读
 */
function interpretSilhouette(score: number): string {
  if (score >= 0.70) {
    return '优秀：双叉树分类的客群内部高度同质，客群间显著分离，业务分层效果突出';
  } else if (score >= 0.50) {
    return '良好：双叉树分类有效划分了主要业务维度，分层结果可用于业务决策';
  } else if (score >= 0.30) {
    return '一般：分类有一定效果，但存在边界场景，建议结合人工复核';
  } else {
    return '较差：分类同质性不足，需要优化双叉树的分裂规则';
  }
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * 生成可读报告
 */
export function generateSilhouetteReport(evaluation: SilhouetteEvaluation): string {
  const lines: string[] = [];
  lines.push(`轮廓系数评估报告`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`整体轮廓系数：${evaluation.averageSilhouette.toFixed(3)}（${evaluation.qualityLevel}）`);
  lines.push(`业务解读：${evaluation.interpretation}`);
  lines.push('');
  lines.push(`评估规模：`);
  lines.push(`  客户总数：${evaluation.evaluationMetrics.totalCustomers}`);
  lines.push(`  场景总数：${evaluation.evaluationMetrics.totalClusters}`);
  lines.push(`  抽样数量：${evaluation.evaluationMetrics.sampleSize}`);
  lines.push('');
  lines.push(`各客群场景轮廓系数：`);
  const sortedClusters = Object.entries(evaluation.perClusterSilhouette)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a, b) => (b[1] as any).avgScore - (a[1] as any).avgScore);

  for (const [tierId, data] of sortedClusters) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    lines.push(`  ${d.tierName}（${tierId}）：${d.avgScore.toFixed(3)}（${d.memberCount} 人）`);
  }

  return lines.join('\n');
}