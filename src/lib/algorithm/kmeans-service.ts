// ============================================================
// K-Means 真实聚类服务
// 基于合成客户池（220+ 样本）进行真实聚类分析
// 替代原有的 mock 数据，提供真实的相似客户推荐
// ============================================================

import type { CustomerKYC } from '@/types';
import {
  kMeansClustering,
  findSimilarCustomers,
  assessConfidence,
  extractCustomerFeatures,
  type ClusterResult,
  type SimilarityResult,
  type ConfidenceAssessment,
} from './kmeans-clustering';
import { getCombinedCustomerPool } from './customer-pool';

// ── 聚类结果（增强版）──────────────────────────────────────────
export interface EnhancedClusterResult {
  clusters: ClusterResult[];
  k: number;
  totalSamples: number;
  silhouetteScore: number;
  avgClusterSize: number;
  generatedAt: string;
}

export interface SimilarityRecommendation {
  similarCustomers: SimilarityResult[];
  confidence: ConfidenceAssessment;
  targetCluster: ClusterResult | null;
  targetClusterId: number;
  clusterMembersCount: number;
}

// ── 单例缓存 ──────────────────────────────────────────────────
let cachedPoolCluster: EnhancedClusterResult | null = null;

/**
 * 对合成客户池进行 K-Means 聚类（带缓存）
 */
export function clusterCustomerPool(k: number = 6): EnhancedClusterResult {
  if (cachedPoolCluster && cachedPoolCluster.k === k) {
    return cachedPoolCluster;
  }

  const pool = getCombinedCustomerPool();

  // 真实 K-Means 聚类（k=6 客群）
  const clusters = kMeansClustering(pool, {
    k,
    maxIterations: 100,
    convergenceThreshold: 0.001,
  });

  // 计算 Silhouette Score 评估聚类质量
  const silhouetteScore = calculateSilhouetteScore(pool, clusters, 50);

  const result: EnhancedClusterResult = {
    clusters,
    k,
    totalSamples: pool.length,
    silhouetteScore,
    avgClusterSize: Math.round(pool.length / k),
    generatedAt: new Date().toISOString(),
  };

  cachedPoolCluster = result;

  if (typeof window !== 'undefined') {
    console.log('[KMeans Service] 聚类完成', {
      样本数: pool.length,
      簇数: k,
      Silhouette: silhouetteScore.toFixed(3),
      平均簇大小: result.avgClusterSize,
    });
  }

  return result;
}

/**
 * 为目标客户查找相似客户（真实算法，非 mock）
 */
export function findSimilarCustomersForUser(
  targetKyc: CustomerKYC,
  topN: number = 5
): SimilarityRecommendation {
  const pool = getCombinedCustomerPool();
  const clusterResult = clusterCustomerPool(6);

  // 1. 真实相似度计算（基于特征向量余弦相似度）
  const similarCustomers = findSimilarCustomers(targetKyc, pool, topN);

  // 2. 置信度评估
  const confidence = assessConfidence(targetKyc, similarCustomers, new Map());

  // 3. 找到目标客户所属簇
  // 直接复用 kmeans-clustering 的内部距离计算
  let targetCluster: ClusterResult | null = null;
  let minDist = Infinity;

  for (const cluster of clusterResult.clusters) {
    let dist = 0;
    const targetFeat = extractCustomerFeatures(targetKyc);
    for (let i = 0; i < targetFeat.length; i++) {
      dist += Math.pow(targetFeat[i] - cluster.centroid[i], 2);
    }
    dist = Math.sqrt(dist);
    if (dist < minDist) {
      minDist = dist;
      targetCluster = cluster;
    }
  }

  return {
    similarCustomers,
    confidence,
    targetCluster,
    targetClusterId: targetCluster?.clusterId ?? -1,
    clusterMembersCount: targetCluster?.members.length ?? 0,
  };
}

/**
 * 获取客户所在的簇画像
 */
export function getClusterProfileForUser(targetKyc: CustomerKYC): {
  cluster: ClusterResult | null;
  tierMatch: boolean;
  description: string;
} {
  const clusterResult = clusterCustomerPool(6);

  // 找到最近的簇
  const targetFeat = extractCustomerFeatures(targetKyc);
  let closest: ClusterResult | null = null;
  let minDist = Infinity;

  for (const cluster of clusterResult.clusters) {
    let dist = 0;
    for (let i = 0; i < targetFeat.length; i++) {
      dist += Math.pow(targetFeat[i] - cluster.centroid[i], 2);
    }
    dist = Math.sqrt(dist);
    if (dist < minDist) {
      minDist = dist;
      closest = cluster;
    }
  }

  if (!closest) {
    return {
      cluster: null,
      tierMatch: false,
      description: '未找到匹配的客群',
    };
  }

  return {
    cluster: closest,
    tierMatch: true,
    description: closest.profile.description,
  };
}

// ── 辅助：Silhouette Score 计算 ───────────────────────────────
function calculateSilhouetteScore(
  data: CustomerKYC[],
  clusters: ClusterResult[],
  sampleSize: number = 50
): number {
  // 抽样计算（避免 O(n²)）
  const sample = data.slice(0, Math.min(sampleSize, data.length));

  // 构建 customerId -> clusterId 映射
  const customerToCluster = new Map<string, number>();
  clusters.forEach(cluster => {
    cluster.members.forEach(member => {
      customerToCluster.set(member.customerId, cluster.clusterId);
    });
  });

  let totalScore = 0;
  let validCount = 0;

  for (const customer of sample) {
    const myClusterId = customerToCluster.get(customer.kycId);
    if (myClusterId === undefined) continue;

    const myFeatures = extractCustomerFeatures(customer);
    const myCluster = clusters.find(c => c.clusterId === myClusterId);
    if (!myCluster || myCluster.members.length <= 1) continue;

    // a(i)：同簇内平均距离
    let intraSum = 0;
    let intraCount = 0;
    for (const member of myCluster.members) {
      if (member.customerId === customer.kycId) continue;
      const memberKyc = data.find(d => d.kycId === member.customerId);
      if (!memberKyc) continue;
      const memberFeat = extractCustomerFeatures(memberKyc);
      intraSum += euclideanDistance(myFeatures, memberFeat);
      intraCount++;
    }
    const a = intraCount > 0 ? intraSum / intraCount : 0;

    // b(i)：最近异簇平均距离
    let bMin = Infinity;
    for (const otherCluster of clusters) {
      if (otherCluster.clusterId === myClusterId) continue;
      if (otherCluster.members.length === 0) continue;

      let interSum = 0;
      let interCount = 0;
      for (const member of otherCluster.members.slice(0, 10)) {
        const memberKyc = data.find(d => d.kycId === member.customerId);
        if (!memberKyc) continue;
        const memberFeat = extractCustomerFeatures(memberKyc);
        interSum += euclideanDistance(myFeatures, memberFeat);
        interCount++;
      }
      const bCluster = interCount > 0 ? interSum / interCount : Infinity;
      if (bCluster < bMin) bMin = bCluster;
    }

    const maxAB = Math.max(a, bMin);
    const s = maxAB > 0 ? (bMin - a) / maxAB : 0;

    totalScore += s;
    validCount++;
  }

  return validCount > 0 ? totalScore / validCount : 0;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}
