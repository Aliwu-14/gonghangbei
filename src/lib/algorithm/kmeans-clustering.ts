// ============================================================
// K-Means聚类引擎
// 基于用户行为和财务特征，发现相似客户群体
// 用于：相似客户推荐冷启动、配置置信度提升、同业基准对比
// ============================================================

import type { CustomerKYC } from '@/types';

export interface CustomerFeature {
  customerId: string;
  features: number[];
}

export interface ClusterResult {
  clusterId: number;
  centroid: number[];
  members: CustomerFeature[];
  profile: ClusterProfile;
}

export interface ClusterProfile {
  avgAge: number;
  avgInvestableAssets: number;
  avgAnnualIncome: number;
  avgDTI: number;
  avgRiskLevel: number;
  commonGoals: string[];
  tierDistribution: Record<string, number>;
  description: string;
}

export interface SimilarityResult {
  customerId: string;
  similarity: number;
  distance: number;
}

export interface KMeansConfig {
  k: number;              // 聚类数量
  maxIterations: number;  // 最大迭代次数
  convergenceThreshold: number; // 收敛阈值
}

// ── 特征提取 ──────────────────────────────────────────────────
/**
 * 将客户KYC信息转换为特征向量
 * 特征顺序：[资产规模, 年龄, 收入水平, DTI, 月结余率, 保障覆盖率, 投资经验, 风险等级]
 */
export function extractCustomerFeatures(kyc: CustomerKYC): number[] {
  // 资产规模（归一化到0-1）
  const assetsNormalized = Math.min(kyc.investableAssets / 1000000, 1);

  // 年龄（归一化到0-1，假设18-80岁）
  const ageNormalized = (kyc.age - 18) / 62;

  // 收入水平（归一化到0-1）
  const incomeNormalized = Math.min(kyc.annualIncome / 1000000, 1);

  // DTI（0-1，直接使用）
  const dtiNormalized = Math.min(kyc.dti, 1);

  // 月结余率
  const monthlyIncome = kyc.annualIncome / 12;
  const monthlySurplus = monthlyIncome - kyc.monthlyExpense - kyc.mortgageMonthly - kyc.otherMonthlyDebt;
  const surplusRate = monthlyIncome > 0 ? Math.max(0, monthlySurplus / monthlyIncome) : 0;

  // 保障覆盖率（寿险/年收入，3倍为满分）
  const coverageRatio = kyc.annualIncome > 0
    ? Math.min(kyc.existingLifeInsurance / (kyc.annualIncome * 3), 1)
    : 0;

  // 投资经验（10年为满分）
  const experienceNormalized = Math.min(kyc.investmentYears / 10, 1);

  // 风险等级（R1=1, R2=2, ... R5=5，归一化到0-1）
  const riskLevelMap: Record<string, number> = { R1: 1, R2: 2, R3: 3, R4: 4, R5: 5 };
  const riskNormalized = (riskLevelMap[kyc.riskLevel] || 3) / 5;

  return [
    assetsNormalized,
    ageNormalized,
    incomeNormalized,
    dtiNormalized,
    surplusRate,
    coverageRatio,
    experienceNormalized,
    riskNormalized,
  ];
}

// ── 距离计算 ──────────────────────────────────────────────────
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// ── 初始化中心点（K-Means++） ─────────────────────────────────
function initializeCentroids(
  data: CustomerFeature[],
  k: number
): number[][] {
  const centroids: number[][] = [];

  // 选择第一个中心点（数据中的第一个点）
  centroids.push([...data[0].features]);

  // 选择剩余k-1个中心点
  while (centroids.length < k) {
    const distances: number[] = [];
    let totalDistance = 0;

    for (const point of data) {
      // 计算到最近中心点的距离
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = euclideanDistance(point.features, centroid);
        minDist = Math.min(minDist, dist);
      }
      distances.push(minDist * minDist); // 距离平方
      totalDistance += minDist * minDist;
    }

    // 轮盘赌选择下一个中心点
    const r = Math.random() * totalDistance;
    let cumulative = 0;
    for (let i = 0; i < data.length; i++) {
      cumulative += distances[i];
      if (cumulative >= r) {
        centroids.push([...data[i].features]);
        break;
      }
    }
  }

  return centroids;
}

// ── 分配到最近中心 ────────────────────────────────────────────
function assignToClusters(
  data: CustomerFeature[],
  centroids: number[][]
): Map<number, CustomerFeature[]> {
  const clusters = new Map<number, CustomerFeature[]>();

  for (const point of data) {
    let minDist = Infinity;
    let closestCluster = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = euclideanDistance(point.features, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        closestCluster = i;
      }
    }

    if (!clusters.has(closestCluster)) {
      clusters.set(closestCluster, []);
    }
    clusters.get(closestCluster)!.push(point);
  }

  return clusters;
}

// ── 更新中心点 ─────────────────────────────────────────────────
function updateCentroids(
  clusters: Map<number, CustomerFeature[]>,
  k: number,
  featureDimension: number
): number[][] {
  const centroids: number[][] = [];

  for (let i = 0; i < k; i++) {
    const members = clusters.get(i) || [];
    if (members.length === 0) {
      // 如果簇为空，生成随机中心点
      centroids.push(Array(featureDimension).fill(0).map(() => Math.random()));
    } else {
      // 计算均值
      const centroid = Array(featureDimension).fill(0);
      for (const member of members) {
        for (let j = 0; j < featureDimension; j++) {
          centroid[j] += member.features[j];
        }
      }
      for (let j = 0; j < featureDimension; j++) {
        centroid[j] /= members.length;
      }
      centroids.push(centroid);
    }
  }

  return centroids;
}

// ── 计算簇内方差 ───────────────────────────────────────────────
function calculateInertia(
  data: CustomerFeature[],
  centroids: number[][]
): number {
  let inertia = 0;
  for (const point of data) {
    let minDist = Infinity;
    for (const centroid of centroids) {
      const dist = euclideanDistance(point.features, centroid);
      minDist = Math.min(minDist, dist);
    }
    inertia += minDist * minDist;
  }
  return inertia;
}

// ── 主聚类函数 ─────────────────────────────────────────────────
/**
 * 对客户进行K-Means聚类
 */
export function kMeansClustering(
  kycList: CustomerKYC[],
  config: Partial<KMeansConfig> = {}
): ClusterResult[] {
  const k = config.k ?? 5;
  const maxIterations = config.maxIterations ?? 100;
  const convergenceThreshold = config.convergenceThreshold ?? 0.001;

  // 提取特征
  const data: CustomerFeature[] = kycList.map((kyc) => ({
    customerId: kyc.kycId,
    features: extractCustomerFeatures(kyc),
  }));

  if (data.length < k) {
    // 数据点少于k，退化为每个点一个簇
    return data.map((d, i) => ({
      clusterId: i,
      centroid: d.features,
      members: [d],
      profile: generateClusterProfile([d], kycList),
    }));
  }

  // 初始化中心点
  let centroids = initializeCentroids(data, k);

  // 迭代
  for (let iter = 0; iter < maxIterations; iter++) {
    // 分配到簇
    const clusters = assignToClusters(data, centroids);

    // 更新中心点
    const newCentroids = updateCentroids(clusters, k, data[0].features.length);

    // 检查收敛
    const oldInertia = calculateInertia(data, centroids);
    const newInertia = calculateInertia(data, newCentroids);

    if (Math.abs(oldInertia - newInertia) < convergenceThreshold) {
      centroids = newCentroids;
      break;
    }

    centroids = newCentroids;
  }

  // 最终分配
  const finalClusters = assignToClusters(data, centroids);

  // 生成结果
  const results: ClusterResult[] = [];
  for (let i = 0; i < k; i++) {
    const members = finalClusters.get(i) || [];
    results.push({
      clusterId: i,
      centroid: centroids[i],
      members,
      profile: generateClusterProfile(members, kycList),
    });
  }

  // 按成员数量降序排列
  return results.sort((a, b) => b.members.length - a.members.length);
}

// ── 生成簇画像 ─────────────────────────────────────────────────
function generateClusterProfile(
  members: CustomerFeature[],
  kycList: CustomerKYC[]
): ClusterProfile {
  const memberIds = new Set(members.map((m) => m.customerId));
  const memberKycs = kycList.filter((kyc) => memberIds.has(kyc.kycId));

  if (memberKycs.length === 0) {
    return {
      avgAge: 0,
      avgInvestableAssets: 0,
      avgAnnualIncome: 0,
      avgDTI: 0,
      avgRiskLevel: 0,
      commonGoals: [],
      tierDistribution: {},
      description: '空簇',
    };
  }

  // 计算均值
  const avgAge = memberKycs.reduce((sum, k) => sum + k.age, 0) / memberKycs.length;
  const avgAssets = memberKycs.reduce((sum, k) => sum + k.investableAssets, 0) / memberKycs.length;
  const avgIncome = memberKycs.reduce((sum, k) => sum + k.annualIncome, 0) / memberKycs.length;
  const avgDTI = memberKycs.reduce((sum, k) => sum + k.dti, 0) / memberKycs.length;

  const riskLevelMap: Record<string, number> = { R1: 1, R2: 2, R3: 3, R4: 4, R5: 5 };
  const avgRisk = memberKycs.reduce((sum, k) => sum + (riskLevelMap[k.riskLevel] || 3), 0) / memberKycs.length;

  // 统计目标
  const goalCount: Record<string, number> = {};
  for (const kyc of memberKycs) {
    for (const goal of kyc.goals) {
      goalCount[goal] = (goalCount[goal] || 0) + 1;
    }
  }
  const commonGoals = Object.entries(goalCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([goal]) => goal);

  // 生成描述
  const ageDesc = avgAge < 35 ? '年轻' : avgAge < 50 ? '中年' : '中老年';
  const assetDesc = avgAssets < 200000 ? '大众' : avgAssets < 500000 ? '富裕' : '高净值';
  const riskDesc = avgRisk < 2.5 ? '保守' : avgRisk < 3.5 ? '平衡' : '进取';

  return {
    avgAge,
    avgInvestableAssets: avgAssets,
    avgAnnualIncome: avgIncome,
    avgDTI,
    avgRiskLevel: avgRisk,
    commonGoals,
    tierDistribution: {},
    description: `${ageDesc}${assetDesc}${riskDesc}群体`,
  };
}

// ── 查找相似客户 ──────────────────────────────────────────────
/**
 * 查找与给定客户最相似的N个客户
 */
export function findSimilarCustomers(
  targetKyc: CustomerKYC,
  allKycs: CustomerKYC[],
  topN: number = 5
): SimilarityResult[] {
  const targetFeatures = extractCustomerFeatures(targetKyc);
  const similarities: SimilarityResult[] = [];

  for (const kyc of allKycs) {
    if (kyc.kycId === targetKyc.kycId) continue;

    const features = extractCustomerFeatures(kyc);
    const similarity = cosineSimilarity(targetFeatures, features);
    const distance = euclideanDistance(targetFeatures, features);

    similarities.push({
      customerId: kyc.kycId,
      similarity,
      distance,
    });
  }

  // 按相似度降序排列
  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

// ── 继承群组配置偏好 ──────────────────────────────────────────
/**
 * 基于相似客户群体的历史配置，计算推荐配置比例
 */
export function inheritClusterPreference(
  targetKyc: CustomerKYC,
  clusters: ClusterResult[],
  historicalConfigs: Map<string, { cash: number; stable: number; growth: number; satellite: number }>
): { cash: number; stable: number; growth: number; satellite: number } | null {
  // 找到目标客户所属的簇
  const targetFeatures = extractCustomerFeatures(targetKyc);
  let closestCluster: ClusterResult | null = null;
  let minDist = Infinity;

  for (const cluster of clusters) {
    const dist = euclideanDistance(targetFeatures, cluster.centroid);
    if (dist < minDist) {
      minDist = dist;
      closestCluster = cluster;
    }
  }

  if (!closestCluster || closestCluster.members.length === 0) {
    return null;
  }

  // 计算该簇的历史配置均值
  let totalCash = 0, totalStable = 0, totalGrowth = 0, totalSatellite = 0;
  let count = 0;

  for (const member of closestCluster.members) {
    const config = historicalConfigs.get(member.customerId);
    if (config) {
      totalCash += config.cash;
      totalStable += config.stable;
      totalGrowth += config.growth;
      totalSatellite += config.satellite;
      count++;
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    cash: totalCash / count,
    stable: totalStable / count,
    growth: totalGrowth / count,
    satellite: totalSatellite / count,
  };
}

// ── 配置置信度评估 ─────────────────────────────────────────────
export interface ConfidenceAssessment {
  baseConfidence: number;        // 基础置信度（基于规则引擎）
  similarityBoost: number;        // 相似客户相似度带来的提升
  experienceBoost: number;       // 投资经验带来的提升
  finalConfidence: number;       // 最终置信度
  confidenceLevel: 'low' | 'medium' | 'high';
}

/**
 * 评估配置建议的置信度
 */
export function assessConfidence(
  targetKyc: CustomerKYC,
  similarCustomers: SimilarityResult[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  similarConfigs: Map<string, { cash: number; stable: number; growth: number; satellite: number }>
): ConfidenceAssessment {
  // 基础置信度
  const baseConfidence = 0.70;

  // 相似客户带来的提升（基于平均相似度）
  let similarityBoost = 0;
  if (similarCustomers.length > 0) {
    const avgSimilarity = similarCustomers.reduce((sum, s) => sum + s.similarity, 0) / similarCustomers.length;
    similarityBoost = avgSimilarity * 0.15; // 最高15%的提升
  }

  // 投资经验带来的提升
  let experienceBoost = 0;
  if (targetKyc.investmentYears >= 5) {
    experienceBoost = 0.10;
  } else if (targetKyc.investmentYears >= 2) {
    experienceBoost = 0.05;
  } else if (targetKyc.investmentYears < 1) {
    experienceBoost = -0.05; // 轻微惩罚
  }

  const finalConfidence = Math.min(0.95, Math.max(0.50, baseConfidence + similarityBoost + experienceBoost));

  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
  if (finalConfidence >= 0.80) {
    confidenceLevel = 'high';
  } else if (finalConfidence < 0.65) {
    confidenceLevel = 'low';
  }

  return {
    baseConfidence,
    similarityBoost,
    experienceBoost,
    finalConfidence,
    confidenceLevel,
  };
}
