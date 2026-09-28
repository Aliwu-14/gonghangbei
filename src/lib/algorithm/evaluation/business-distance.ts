// ============================================================
// 业务距离定义
// 用于评估双叉树分类的相似度计算
// ============================================================

import type { CustomerKYC } from '@/types';

/**
 * 业务维度的权重
 * 反映各维度在客户分层中的相对重要性
 */
export const BUSINESS_DIMENSION_WEIGHTS = {
  assets: 0.30,      // 资产规模（最核心的财务分层依据）
  riskLevel: 0.20,   // 风险等级（影响产品配置）
  age: 0.15,         // 年龄（影响生命周期与适当性）
  incomeStability: 0.10, // 收入稳定性（影响风险承受能力）
  dti: 0.10,         // 负债收入比（影响现金流）
  familyStructure: 0.08, // 家庭结构（影响需求场景）
  lifeStage: 0.07,   // 生命周期（影响目标优先级）
} as const;

/**
 * 业务距离计算
 * 综合考虑客户画像各维度，计算两位客户的业务相似度
 *
 * 距离越小 → 业务画像越相似
 * 距离越大 → 业务画像越不同
 */
export function businessDistance(c1: CustomerKYC, c2: CustomerKYC): number {
  let distance = 0;

  // 维度1：资产规模（取对数后做差，避免高净值客户主导距离）
  const logAssets1 = Math.log10(Math.max(c1.investableAssets, 1));
  const logAssets2 = Math.log10(Math.max(c2.investableAssets, 1));
  distance += Math.abs(logAssets1 - logAssets2) * BUSINESS_DIMENSION_WEIGHTS.assets;

  // 维度2：风险等级（R1-R5 转换为数字）
  const riskNum1 = riskLevelToNumber(c1.riskLevel);
  const riskNum2 = riskLevelToNumber(c2.riskLevel);
  distance += Math.abs(riskNum1 - riskNum2) / 4 * BUSINESS_DIMENSION_WEIGHTS.riskLevel;

  // 维度3：年龄
  distance += Math.abs(c1.age - c2.age) / 30 * BUSINESS_DIMENSION_WEIGHTS.age;

  // 维度4：收入稳定性
  const incomeStabilityValue1 = incomeStabilityToNumber(c1.incomeStability);
  const incomeStabilityValue2 = incomeStabilityToNumber(c2.incomeStability);
  distance += Math.abs(incomeStabilityValue1 - incomeStabilityValue2) / 2 * BUSINESS_DIMENSION_WEIGHTS.incomeStability;

  // 维度5：DTI（负债收入比）
  distance += Math.abs(c1.dti - c2.dti) * BUSINESS_DIMENSION_WEIGHTS.dti;

  // 维度6：家庭结构（离散变量）
  if (c1.familyStructure !== c2.familyStructure) {
    distance += BUSINESS_DIMENSION_WEIGHTS.familyStructure;
  }

  // 维度7：生命周期
  const stage1 = inferLifeStage(c1);
  const stage2 = inferLifeStage(c2);
  if (stage1 !== stage2) {
    distance += BUSINESS_DIMENSION_WEIGHTS.lifeStage;
  }

  return distance;
}

/**
 * 风险等级转数字（R1=1, R2=2, ..., R5=5）
 */
function riskLevelToNumber(level: string): number {
  const map: Record<string, number> = { R1: 1, R2: 2, R3: 3, R4: 4, R5: 5 };
  return map[level] ?? 3;
}

/**
 * 收入稳定性转数字（stable=0, moderate=1, volatile=2）
 */
function incomeStabilityToNumber(stability: string): number {
  const map: Record<string, number> = { stable: 0, moderate: 1, volatile: 2 };
  return map[stability] ?? 1;
}

/**
 * 生命周期推断（基于年龄与距退休年限）
 */
function inferLifeStage(kyc: CustomerKYC): string {
  if (kyc.age < 30) return 'YOUNG';
  if (kyc.age < 45) return 'FAMILY_BUILDING';
  if (kyc.age < 55) return 'MATURE';
  if (kyc.age < 65) return 'PRE_RETIRE';
  return 'RETIREE';
}

/**
 * 批量计算客户间距离矩阵
 * 注意：n 个客户产生 n×n 距离矩阵，n 较大会占用较多内存
 */
export function calculateDistanceMatrix(customers: CustomerKYC[]): number[][] {
  const n = customers.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else if (j < i) {
        // 对称矩阵，复用之前计算的结果
        matrix[i][j] = matrix[j][i];
      } else {
        matrix[i][j] = businessDistance(customers[i], customers[j]);
      }
    }
  }

  return matrix;
}

/**
 * 计算一组客户的平均业务距离
 * 用于评估某客群内部的同质性
 */
export function averageIntraClusterDistance(
  customers: CustomerKYC[],
  sampleSize: number = 100
): number {
  if (customers.length < 2) return 0;

  // 抽样计算，避免 O(n²) 复杂度
  const n = Math.min(sampleSize, customers.length);
  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalDistance += businessDistance(customers[i], customers[j]);
      pairCount++;
    }
  }

  return pairCount > 0 ? totalDistance / pairCount : 0;
}