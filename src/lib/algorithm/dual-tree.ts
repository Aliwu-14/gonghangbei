// ============================================================
// 双轨二叉决策树分层引擎
// 主树：资产规模粗分 → 子树：五维合规修正 → 合并：保守交集
// ============================================================

import type { CustomerKYC, TierId, TierResult, TierAdjustment } from '@/types';
import { pyramidBaseRatios } from '@/lib/mock/data';

// ── 主树：资产规模粗分 ────────────────────────────────────────
function runMainTree(kyc: CustomerKYC): { baseTier: TierId; tierName: string; path: string[] } {
  // 65岁以上 → 老年专属
  if (kyc.age >= 65) {
    return { baseTier: 'A1', tierName: '银发稳健族', path: ['年龄≥65岁', '→ A1 银发稳健族'] };
  }

  const assets = kyc.investableAssets;

  // 资产 < 20万 → B1 分支
  if (assets < 200000) {
    if (kyc.riskLevel === 'R1' || kyc.riskLevel === 'R2') {
      return { baseTier: 'B1-1', tierName: '大众稳健族', path: ['资产<20万', `风险${kyc.riskLevel}`, '→ B1-1 大众稳健族'] };
    }
    return { baseTier: 'B1-2', tierName: '大众进取族', path: ['资产<20万', `风险${kyc.riskLevel}`, '→ B1-2 大众进取族'] };
  }

  // 20万 ≤ 资产 < 50万 → B2 分支
  if (assets < 500000) {
    if (kyc.riskLevel === 'R1' || kyc.riskLevel === 'R2') {
      return { baseTier: 'B2-1', tierName: '均衡成长族', path: ['资产20-50万', `风险${kyc.riskLevel}`, '→ B2-1 均衡成长族'] };
    }
    return { baseTier: 'B2-2', tierName: '进取成长族', path: ['资产20-50万', `风险${kyc.riskLevel}`, '→ B2-2 进取成长族'] };
  }

  // 50万 ≤ 资产 < 100万 → B3
  if (assets < 1000000) {
    return { baseTier: 'B3', tierName: '高净值预备族', path: ['资产50-100万', `风险${kyc.riskLevel}`, '→ B3 高净值预备族'] };
  }

  // 资产 ≥ 100万 → B4
  return { baseTier: 'B4', tierName: '高净值族', path: ['资产≥100万', `风险${kyc.riskLevel}`, '→ B4 高净值族'] };
}

// ── 子树：五维合规并行校验 ────────────────────────────────────
interface SubTreeLabel {
  labelId: string;
  labelName: string;
  triggered: boolean;
  equityCapAdjustment: number;
  tierAdjustment: number; // 负数=降档
  reason: string;
  ruleCode: string;
  severity: 'hard' | 'soft';
}

function runSubTree(kyc: CustomerKYC): SubTreeLabel[] {
  const labels: SubTreeLabel[] = [];

  // 维度1：年龄
  if (kyc.age >= 65) {
    labels.push({
      labelId: 'AGE_65PLUS', labelName: '65岁以上', triggered: true,
      equityCapAdjustment: -0.20, tierAdjustment: -1,
      reason: '65岁以上为适当性办法第18条特别保护对象，权益上限降至10%',
      ruleCode: 'SUB_AGE_65', severity: 'hard',
    });
  } else if (kyc.age >= 60) {
    labels.push({
      labelId: 'AGE_60_64', labelName: '60-64岁', triggered: true,
      equityCapAdjustment: -0.10, tierAdjustment: 0,
      reason: '60-64岁为适老保护过渡期，审慎下调权益上限',
      ruleCode: 'SUB_AGE_60', severity: 'soft',
    });
  }

  // 维度2：收入稳定性
  if (kyc.incomeStability === 'volatile') {
    labels.push({
      labelId: 'INCOME_VOLATILE', labelName: '收入不稳定', triggered: true,
      equityCapAdjustment: -0.10, tierAdjustment: -1,
      reason: '收入波动大，高波动资产对生活影响更大，降一档配置',
      ruleCode: 'SUB_INCOME_VOLATILE', severity: 'hard',
    });
  } else if (kyc.incomeStability === 'moderate') {
    labels.push({
      labelId: 'INCOME_MODERATE', labelName: '收入波动', triggered: true,
      equityCapAdjustment: -0.05, tierAdjustment: 0,
      reason: '收入有波动，流动性需求更高',
      ruleCode: 'SUB_INCOME_MODERATE', severity: 'soft',
    });
  }

  // 维度3：负债压力（DTI）
  if (kyc.dti >= 0.40) {
    labels.push({
      labelId: 'DTI_CRITICAL', labelName: 'DTI严重超标（≥40%）', triggered: true,
      equityCapAdjustment: -0.15, tierAdjustment: -1,
      reason: 'DTI≥40%为行业警戒线，家庭偿债压力大，权益资产风险过高',
      ruleCode: 'SUB_DTI_CRITICAL', severity: 'hard',
    });
  } else if (kyc.dti >= 0.30) {
    labels.push({
      labelId: 'DTI_WARNING', labelName: 'DTI超标（30-40%）', triggered: true,
      equityCapAdjustment: -0.05, tierAdjustment: 0,
      reason: 'DTI在30-40%区间，偿债压力已较高，权益资产需审慎',
      ruleCode: 'SUB_DTI_WARNING', severity: 'soft',
    });
  }

  // 维度4：保障缺口
  const hasGap = !kyc.hasInsurance || kyc.existingLifeInsurance < kyc.annualIncome * 3;
  if (hasGap && kyc.annualIncome > 0) {
    const gapRatio = kyc.existingLifeInsurance / (kyc.annualIncome * 5);
    if (gapRatio < 0.3) {
      labels.push({
        labelId: 'GAP_CRITICAL', labelName: '保障缺口严重', triggered: true,
        equityCapAdjustment: -0.10, tierAdjustment: -1,
        reason: '寿险保障不足年收入的3倍，重大风险事件可能打断财务规划',
        ruleCode: 'SUB_GAP_CRITICAL', severity: 'hard',
      });
    } else if (gapRatio < 0.6) {
      labels.push({
        labelId: 'GAP_EXISTS', labelName: '存在保障缺口', triggered: true,
        equityCapAdjustment: -0.03, tierAdjustment: 0,
        reason: '保障缺口未完全补齐，权益资产优先级应降低',
        ruleCode: 'SUB_GAP_EXISTS', severity: 'soft',
      });
    }
  }

  // 维度5：投资经验
  if (kyc.investmentYears < 1) {
    labels.push({
      labelId: 'EXP_NONE', labelName: '无投资经验', triggered: true,
      equityCapAdjustment: -0.10, tierAdjustment: -1,
      reason: '无投资经验，不适合高波动产品，应先建立基础认知',
      ruleCode: 'SUB_EXP_NONE', severity: 'soft',
    });
  } else if (kyc.investmentYears < 2) {
    labels.push({
      labelId: 'EXP_LIMITED', labelName: '投资经验不足2年', triggered: true,
      equityCapAdjustment: -0.05, tierAdjustment: 0,
      reason: '投资经验不足2年，对市场波动理解有限',
      ruleCode: 'SUB_EXP_LIMITED', severity: 'soft',
    });
  }

  return labels;
}

// ── 层级排序（用于升降档） ────────────────────────────────────
const TIER_ORDER: TierId[] = ['B1-1', 'B1-2', 'B2-1', 'B2-2', 'B3', 'B4'];

function getTierIndex(tier: TierId): number {
  return TIER_ORDER.indexOf(tier);
}

function getTierById(id: TierId): { name: string; equityCap: number; cashFloor: number } {
  const names: Record<TierId, string> = {
    'A1': '银发稳健族', 'B1-1': '大众稳健族', 'B1-2': '大众进取族',
    'B2-1': '均衡成长族', 'B2-2': '进取成长族', 'B3': '高净值预备族', 'B4': '高净值族',
  };
  const ratios = pyramidBaseRatios[id];
  return {
    name: names[id],
    equityCap: 1 - ratios.cash - ratios.stable, // 成长+卫星 = 权益上限
    cashFloor: ratios.cash,
  };
}

// ── 双轨合并 ──────────────────────────────────────────────────
export function dualTreeClassify(kyc: CustomerKYC): TierResult {
  // 步骤1：主树
  const mainResult = runMainTree(kyc);
  const baseTier = mainResult.baseTier;

  // 步骤2：子树
  const subLabels = runSubTree(kyc);
  const hardLabels = subLabels.filter(l => l.severity === 'hard');
  const softLabels = subLabels.filter(l => l.severity === 'soft');

  // 步骤3：合并子树标签
  let totalEquityAdjustment = 0;
  let maxTierDowngrade = 0;

  if (hardLabels.length > 0) {
    // 硬标签：取最严格的一个
    const worst = hardLabels.reduce((a, b) =>
      Math.abs(a.equityCapAdjustment) > Math.abs(b.equityCapAdjustment) ? a : b
    );
    totalEquityAdjustment = worst.equityCapAdjustment;
    maxTierDowngrade = worst.tierAdjustment;
  } else {
    // 软标签：叠加
    totalEquityAdjustment = softLabels.reduce((sum, l) => sum + l.equityCapAdjustment, 0);
    maxTierDowngrade = softLabels.length > 0
      ? Math.min(...softLabels.map(l => l.tierAdjustment))
      : 0;
  }

  // 步骤4：档位合并
  let finalTier = baseTier;
  if (maxTierDowngrade < 0 && baseTier !== 'A1') {
    const currentIdx = getTierIndex(baseTier);
    const newIdx = Math.max(0, currentIdx + maxTierDowngrade);
    finalTier = TIER_ORDER[newIdx];
  }

  // 65岁特殊处理：权益上限独立上限10%
  const tierInfo = getTierById(finalTier);
  let equityCap = tierInfo.equityCap + totalEquityAdjustment;
  if (kyc.age >= 65) {
    equityCap = Math.min(equityCap, 0.10);
  }
  equityCap = Math.max(0, Math.min(equityCap, 0.70));

  // 步骤5：构建调整记录
  const adjustments: TierAdjustment[] = subLabels
    .filter(l => l.triggered)
    .map(l => ({
      dimension: l.labelName,
      ruleCode: l.ruleCode,
      change: l.tierAdjustment < 0 ? `降${Math.abs(l.tierAdjustment)}档` : '仅调权益上限',
      reason: l.reason,
    }));

  // 步骤6：置信度
  let confidence = 0.85;
  confidence -= subLabels.filter(l => l.triggered).length * 0.05;
  confidence = Math.max(0.50, confidence);

  return {
    baseTier,
    finalTier,
    tierName: getTierById(finalTier).name,
    equityCap,
    cashFloor: tierInfo.cashFloor,
    confidence,
    classificationPath: mainResult.path,
    adjustments,
    algorithmVersion: 'dual-tree-v1.0',
  };
}
