// ============================================================
// 金字塔配置引擎
// 根据分层结果 + KYC 约束 → 四层配比 + 金额分配
// ============================================================

import type { CustomerKYC, TierId, PyramidConfig, PyramidLayer, Product, AllocationPlanItem } from '@/types';
import { pyramidBaseRatios, demoProducts } from '@/lib/mock/data';

// ── 约束修正引擎 ──────────────────────────────────────────────
interface Adjustment {
  dimension: string;
  layer: string;
  amount: number;
  reason: string;
}

function applyConstraints(
  baseRatios: { cash: number; stable: number; growth: number; satellite: number },
  kyc: CustomerKYC
): { ratios: { cash: number; stable: number; growth: number; satellite: number }; adjustments: Adjustment[] } {
  const ratios = { ...baseRatios };
  const adjustments: Adjustment[] = [];

  // 约束1：流动性硬约束 — 现金层 ≥ 3个月支出 / 可投资资产
  // 防御：可投资资产为0时跳过该约束，避免除零
  if (kyc.investableAssets > 0) {
    const minCashFromExpense = (kyc.monthlyExpense * 3) / kyc.investableAssets;
    if (ratios.cash < minCashFromExpense) {
      const deficit = minCashFromExpense - ratios.cash;
      adjustments.push({
        dimension: '流动性硬约束',
        layer: 'cash',
        amount: deficit,
        reason: `最低流动性要求（3个月支出${Math.round(kyc.monthlyExpense * 3 / 10000)}万）`,
      });
      // 优先从成长层扣减（增长层扣完再扣稳健层）
      const growthCut = Math.min(deficit, ratios.growth);
      ratios.cash += growthCut;
      ratios.growth -= growthCut;
      const remainingDeficit = deficit - growthCut;
      if (remainingDeficit > 0) {
        const stableCut = Math.min(remainingDeficit, ratios.stable);
        ratios.cash += stableCut;
        ratios.stable -= stableCut;
      }
    }
  }

  // 约束2：65岁以上权益上限
  if (kyc.age >= 65) {
    const elderlyGrowthCap = 0.10;
    if (ratios.growth > elderlyGrowthCap) {
      const reduction = ratios.growth - elderlyGrowthCap;
      adjustments.push({
        dimension: '适老保护',
        layer: 'growth→stable',
        amount: reduction,
        reason: '65岁以上客户，权益类产品上限10%',
      });
      ratios.growth = elderlyGrowthCap;
      ratios.stable += reduction;
    }
    ratios.satellite = 0; // 65+ 无卫星层
  }

  // 约束3：DTI ≥ 30% 提高流动性（优先扣减成长层，再扣稳健层）
  if (kyc.dti >= 0.30) {
    const highLiquidityTarget = Math.max(ratios.cash, 0.20);
    if (ratios.cash < highLiquidityTarget) {
      const increase = highLiquidityTarget - ratios.cash;
      adjustments.push({
        dimension: '负债压力',
        layer: 'cash',
        amount: increase,
        reason: `负债收入比${Math.round(kyc.dti * 100)}%超30%警戒线，提高流动性缓冲`,
      });
      ratios.cash = highLiquidityTarget;
      // 与约束1一致：优先扣成长，再扣稳健
      const growthCut = Math.min(increase, ratios.growth);
      ratios.growth -= growthCut;
      const stableCut = Math.min(increase - growthCut, ratios.stable);
      ratios.stable -= stableCut;
      // 剩余不足部分兜底（保证非负）
      const actualIncrease = growthCut + stableCut;
      if (actualIncrease < increase) {
        ratios.cash -= (increase - actualIncrease);
      }
    }
  }

  // 约束4：养老目标临近（5年内退休）
  if (kyc.yearsToRetirement !== null && kyc.yearsToRetirement <= 5 && kyc.yearsToRetirement > 0) {
    const shiftAmount = Math.min(ratios.growth * 0.3, 0.10);
    adjustments.push({
      dimension: '养老目标临近',
      layer: 'growth→stable',
      amount: shiftAmount,
      reason: `距退休仅${kyc.yearsToRetirement}年，养老资金转稳健`,
    });
    ratios.growth -= shiftAmount;
    ratios.stable += shiftAmount;
  }

  // 归一化：确保总和 = 1.0
  const total = ratios.cash + ratios.stable + ratios.growth + ratios.satellite;
  if (Math.abs(total - 1.0) > 0.001) {
    const scale = 1.0 / total;
    ratios.cash *= scale;
    ratios.stable *= scale;
    ratios.growth *= scale;
    ratios.satellite *= scale;
  }

  return { ratios, adjustments };
}

// ── 产品评分 ──────────────────────────────────────────────────
function scoreProduct(product: Product, kyc: CustomerKYC, layer: PyramidLayer): number {
  let score = 0;

  // 维度1：风险适配（30分）
  const riskMatch = product.riskLevelNumeric <= (kyc.riskLevel === 'R1' ? 1 : kyc.riskLevel === 'R2' ? 2 : kyc.riskLevel === 'R3' ? 3 : kyc.riskLevel === 'R4' ? 4 : 5);
  score += riskMatch ? 30 : 0;

  // 维度2：流动性（20分）
  if (layer === 'CASH') {
    score += product.liquidityType === '随时' ? 20 : product.liquidityType === 'T+1' ? 15 : 5;
  } else {
    score += 15; // 非现金层流动性权重降低
  }

  // 维度3：目标匹配（20分）
  const goalMatch = product.suitableGoals.some(g => kyc.goals.includes(g));
  score += goalMatch ? 20 : 5;

  // 维度4：费用（10分）
  const fee = (product.managementFee || 0) + (product.subscriptionFee || 0);
  score += fee < 0.01 ? 10 : fee < 0.02 ? 7 : 3;

  // 维度5：历史风险收益特征（20分）
  // 夏普比率 = (历史收益 - 无风险收益率) / 波动率，无风险收益率取10年国债收益率约2.5%
  const riskFreeRate = 0.025;
  if (product.historicalReturn1y !== null && product.volatility !== null) {
    const excessReturn = Math.max(0, product.historicalReturn1y - riskFreeRate);
    const sharpe = product.volatility > 0 ? excessReturn / product.volatility : 0;
    score += Math.min(20, Math.max(0, sharpe * 20));
  } else {
    score += 10; // 无数据给中间分
  }

  return Math.round(score * 100) / 100;
}

// ── 产品推荐 ──────────────────────────────────────────────────
function recommendProducts(
  layer: PyramidLayer,
  layerAmount: number,
  kyc: CustomerKYC
): AllocationPlanItem[] {
  const candidates = demoProducts.filter(p =>
    p.isActive &&
    p.pyramidLayer === layer &&
    p.suitabilityScope.includes(kyc.riskLevel)
  );

  // 评分排序
  const scored = candidates
    .map(p => ({ product: p, score: scoreProduct(p, kyc, layer) }))
    .sort((a, b) => b.score - a.score);

  // 多样性规则：每个子类别只取评分最高的1个，避免同层全是同类产品
  const bestPerSubCategory = new Map<string, typeof scored[number]>();
  for (const s of scored) {
    if (!bestPerSubCategory.has(s.product.subCategory)) {
      bestPerSubCategory.set(s.product.subCategory, s);
    }
  }
  const selected = Array.from(bestPerSubCategory.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 金额分配
  const totalScore = selected.reduce((sum, s) => sum + s.score, 0) || 1;
  const items: AllocationPlanItem[] = [];

  for (const { product, score } of selected) {
    const ratio = score / totalScore;
    let amount = Math.round(layerAmount * ratio / 1000) * 1000; // 1000元取整

    // 满足最低起购金额
    if (amount < product.minAmount) {
      amount = product.minAmount;
    }

    // 不超过层预算
    if (amount > layerAmount) {
      amount = layerAmount;
    }

    if (amount >= product.minAmount) {
      const reasons: string[] = [];
      if (layer === 'CASH') reasons.push('适合现金层，因为流动性较高');
      if (layer === 'STABLE') reasons.push('适合稳健层，因为产品风险等级不高于客户风险承受等级');
      if (layer === 'GROWTH') reasons.push('适合成长层，因为期限与目标期限匹配');
      if (layer === 'SATELLITE') reasons.push('适合卫星层，因为客户风险承受能力允许');
      if (product.suitableGoals.some(g => kyc.goals.includes(g))) {
        reasons.push(`匹配客户目标：${product.suitableGoals.filter(g => kyc.goals.includes(g)).join('、')}`);
      }

      items.push({
        itemId: `ITEM-${product.productId}`,
        planId: '', // 后续填充
        productId: product.productId,
        product,
        layerCode: layer,
        allocationRatio: amount / layerAmount,
        allocationAmount: amount,
        score,
        recommendationReason: reasons.join('；'),
        complianceStatus: 'PASS',
      });
    }
  }

  return items;
}

// ── 金字塔配置主函数 ──────────────────────────────────────────
export function generatePyramidPlan(
  kyc: CustomerKYC,
  tierId: TierId
): { config: PyramidConfig; items: AllocationPlanItem[]; adjustments: Adjustment[] } {
  const baseRatios = pyramidBaseRatios[tierId];
  const { ratios, adjustments } = applyConstraints(baseRatios, kyc);

  const totalAmount = kyc.investableAssets;

  // 计算各层金额
  let cashAmount = Math.round(totalAmount * ratios.cash / 1000) * 1000;
  const stableAmount = Math.round(totalAmount * ratios.stable / 1000) * 1000;
  const growthAmount = Math.round(totalAmount * ratios.growth / 1000) * 1000;
  const satelliteAmount = Math.round(totalAmount * ratios.satellite / 1000) * 1000;

  // 取整差额留在现金层
  const roundingDiff = totalAmount - (cashAmount + stableAmount + growthAmount + satelliteAmount);
  cashAmount += roundingDiff;

  const config: PyramidConfig = {
    cashRatio: ratios.cash,
    stableRatio: ratios.stable,
    growthRatio: ratios.growth,
    satelliteRatio: ratios.satellite,
    cashAmount,
    stableAmount,
    growthAmount,
    satelliteAmount,
    totalAmount,
  };

  // 产品推荐
  const items: AllocationPlanItem[] = [];
  if (cashAmount >= 1000) items.push(...recommendProducts('CASH', cashAmount, kyc));
  if (stableAmount >= 1000) items.push(...recommendProducts('STABLE', stableAmount, kyc));
  if (growthAmount >= 1000) items.push(...recommendProducts('GROWTH', growthAmount, kyc));
  if (satelliteAmount >= 1000) items.push(...recommendProducts('SATELLITE', satelliteAmount, kyc));

  return { config, items, adjustments };
}

// ── 按自定义比例重新计算金额（用户手动调整金字塔比例时使用） ──
export function buildConfigFromRatios(
  ratios: { cash: number; stable: number; growth: number; satellite: number },
  totalAmount: number
): PyramidConfig {
  let cashAmount = Math.round(totalAmount * ratios.cash / 1000) * 1000;
  const stableAmount = Math.round(totalAmount * ratios.stable / 1000) * 1000;
  const growthAmount = Math.round(totalAmount * ratios.growth / 1000) * 1000;
  const satelliteAmount = Math.round(totalAmount * ratios.satellite / 1000) * 1000;
  const roundingDiff = totalAmount - (cashAmount + stableAmount + growthAmount + satelliteAmount);
  cashAmount += roundingDiff;
  return {
    cashRatio: ratios.cash, stableRatio: ratios.stable,
    growthRatio: ratios.growth, satelliteRatio: ratios.satellite,
    cashAmount, stableAmount, growthAmount, satelliteAmount, totalAmount,
  };
}

// ── 按当前配置比例重新推荐产品（"恢复系统推荐"按钮） ──
export function regenerateItemsForConfig(config: PyramidConfig, kyc: CustomerKYC): AllocationPlanItem[] {
  const items: AllocationPlanItem[] = [];
  if (config.cashAmount >= 1000) items.push(...recommendProducts('CASH', config.cashAmount, kyc));
  if (config.stableAmount >= 1000) items.push(...recommendProducts('STABLE', config.stableAmount, kyc));
  if (config.growthAmount >= 1000) items.push(...recommendProducts('GROWTH', config.growthAmount, kyc));
  if (config.satelliteAmount >= 1000) items.push(...recommendProducts('SATELLITE', config.satelliteAmount, kyc));
  return items;
}

// ── 将用户已选产品按新比例等比缩放（保留用户的产品选择，仅调整金额） ──
export function scaleItemsToConfig(
  items: AllocationPlanItem[],
  config: PyramidConfig,
  kyc: CustomerKYC
): AllocationPlanItem[] {
  const layerAmounts: Record<string, number> = {
    CASH: config.cashAmount, STABLE: config.stableAmount,
    GROWTH: config.growthAmount, SATELLITE: config.satelliteAmount,
  };
  const result: AllocationPlanItem[] = [];

  for (const layer of ['CASH', 'STABLE', 'GROWTH', 'SATELLITE'] as const) {
    const budget = layerAmounts[layer];
    const layerItems = items.filter(i => i.layerCode === layer);
    if (budget < 1000) continue; // 该层被清零，产品全部移除
    if (layerItems.length === 0) {
      result.push(...recommendProducts(layer, budget, kyc));
      continue;
    }
    const oldSum = layerItems.reduce((s, i) => s + i.allocationAmount, 0) || 1;
    const scaled = layerItems
      .map(i => ({ ...i, allocationAmount: Math.round(i.allocationAmount * budget / oldSum / 1000) * 1000 }))
      .filter(i => i.allocationAmount >= i.product.minAmount);
    if (scaled.length === 0) {
      result.push(...recommendProducts(layer, budget, kyc));
      continue;
    }
    // 归集到该层金额
    const sum = scaled.reduce((s, i) => s + i.allocationAmount, 0);
    const diff = budget - sum;
    scaled.sort((a, b) => b.allocationAmount - a.allocationAmount)[0].allocationAmount += diff;
    for (const item of scaled) {
      item.allocationRatio = item.allocationAmount / budget;
    }
    result.push(...scaled);
  }
  return result;
}

// ── 获取某层可替换/添加的候选产品（同层、风险适配、未被选中） ──
export function getLayerCandidates(
  layer: PyramidLayer,
  kyc: CustomerKYC,
  excludeIds: string[]
): Product[] {
  return demoProducts.filter(p =>
    p.isActive &&
    p.pyramidLayer === layer &&
    p.suitabilityScope.includes(kyc.riskLevel) &&
    !excludeIds.includes(p.productId)
  );
}

// ── 构造一个新的配置项 ──
export function buildPlanItem(product: Product, layer: PyramidLayer, amount: number, kyc: CustomerKYC): AllocationPlanItem {
  const reasons: string[] = [];
  if (layer === 'CASH') reasons.push('适合现金层，流动性较高');
  if (layer === 'STABLE') reasons.push('适合稳健层，风险等级不高于您的承受等级');
  if (layer === 'GROWTH') reasons.push('适合成长层，追求长期增值');
  if (layer === 'SATELLITE') reasons.push('适合卫星层，分散化配置');
  if (product.suitableGoals.some(g => kyc.goals.includes(g))) {
    reasons.push(`匹配您的目标：${product.suitableGoals.filter(g => kyc.goals.includes(g)).join('、')}`);
  }
  return {
    itemId: `ITEM-${product.productId}`,
    planId: '',
    productId: product.productId,
    product,
    layerCode: layer,
    allocationRatio: 0,
    allocationAmount: amount,
    score: scoreProduct(product, kyc, layer),
    recommendationReason: reasons.join('；'),
    complianceStatus: 'PASS',
  };
}

// ── 校验结果 ──────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  layerResults: Record<string, { allocated: number; budget: number; diff: number }>;
}

/**
 * 全面校验产品分配是否符合预算约束
 */
export function validateAllocation(
  items: AllocationPlanItem[],
  config: PyramidConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const layerAmounts: Record<string, number> = {
    CASH: config.cashAmount, STABLE: config.stableAmount,
    GROWTH: config.growthAmount, SATELLITE: config.satelliteAmount,
  };
  
  const layerResults: Record<string, { allocated: number; budget: number; diff: number }> = {};
  
  // 按层分组统计
  for (const layer of ['CASH', 'STABLE', 'GROWTH', 'SATELLITE'] as const) {
    const layerItems = items.filter(i => i.layerCode === layer);
    const allocated = layerItems.reduce((s, i) => s + i.allocationAmount, 0);
    const budget = layerAmounts[layer];
    const diff = allocated - budget;
    
    layerResults[layer] = { allocated, budget, diff };
    
    // 检查产品金额是否满足最低起购额
    for (const item of layerItems) {
      if (item.allocationAmount < item.product.minAmount) {
        errors.push(`${layer}层产品"${item.product.productName}"金额 ¥${item.allocationAmount} 低于起购额 ¥${item.product.minAmount}`);
      }
    }
    
    // 检查是否超配（允许 1000 元以内的误差）
    if (diff > 1000) {
      const minSum = layerItems.reduce((s, i) => s + i.product.minAmount, 0);
      if (minSum > budget) {
        errors.push(`${layer}层产品最低起购额合计 ¥${minSum} 超过预算 ¥${budget}，无法满足约束`);
      } else {
        warnings.push(`${layer}层超配 ¥${diff.toLocaleString()}`);
      }
    }
  }
  
  // 检查总额
  const totalAllocated = items.reduce((s, i) => s + i.allocationAmount, 0);
  const totalDiff = totalAllocated - config.totalAmount;
  if (Math.abs(totalDiff) > 1000) {
    warnings.push(`产品总额 ¥${totalAllocated.toLocaleString()} 与配置总额 ¥${config.totalAmount.toLocaleString()} 相差 ¥${Math.abs(totalDiff).toLocaleString()}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    layerResults,
  };
}

/**
 * 检查添加产品是否会超过层预算
 */
export function canAddProduct(
  layer: PyramidLayer,
  product: Product,
  layerBudget: number,
  currentItems: AllocationPlanItem[]
): { canAdd: boolean; reason?: string } {
  const layerItems = currentItems.filter(i => i.layerCode === layer);
  const allocated = layerItems.reduce((s, i) => s + i.allocationAmount, 0);
  const free = layerBudget - allocated;
  
  // 检查最低起购额
  if (product.minAmount > layerBudget) {
    return { canAdd: false, reason: `该产品起购额 ¥${product.minAmount.toLocaleString()} 超过层预算 ¥${layerBudget.toLocaleString()}` };
  }
  
  // 检查剩余预算是否足够最低起购
  if (free < product.minAmount) {
    return { canAdd: false, reason: `该层剩余预算 ¥${free.toLocaleString()} 不足，起购额需 ¥${product.minAmount.toLocaleString()}` };
  }
  
  // 检查添加后是否可能导致超配（考虑其他产品可能需要保持最低起购额）
  const otherItems = layerItems;
  const otherMinSum = otherItems.reduce((s, i) => s + i.product.minAmount, 0);
  if (otherMinSum + product.minAmount > layerBudget) {
    return { canAdd: false, reason: `添加后所有产品最低起购额合计 ¥${(otherMinSum + product.minAmount).toLocaleString()} 将超过层预算 ¥${layerBudget.toLocaleString()}` };
  }
  
  return { canAdd: true };
}

// ── 余额归集：把每层未分配的余额自动并入该层首选产品 ──
export function finalizeItems(items: AllocationPlanItem[], config: PyramidConfig): { items: AllocationPlanItem[]; validation: ValidationResult } {
  const layerAmounts: Record<string, number> = {
    CASH: config.cashAmount, STABLE: config.stableAmount,
    GROWTH: config.growthAmount, SATELLITE: config.satelliteAmount,
  };
  const result = items.map(i => ({ ...i }));
  
  for (const layer of ['CASH', 'STABLE', 'GROWTH', 'SATELLITE'] as const) {
    const layerItems = result.filter(i => i.layerCode === layer);
    if (layerItems.length === 0) continue;
    
    const allocated = layerItems.reduce((s, i) => s + i.allocationAmount, 0);
    const budget = layerAmounts[layer];
    const diff = budget - allocated;
    
    if (diff === 0) continue;
    
    layerItems.sort((a, b) => b.allocationAmount - a.allocationAmount);
    
    if (diff > 0) {
      // 欠配：将余额加到金额最大的产品
      layerItems[0].allocationAmount += diff;
    } else {
      // 超配：从金额最大的产品扣减
      let remain = -diff;
      for (const item of layerItems) {
        if (remain <= 0) break;
        const cut = Math.min(item.allocationAmount - item.product.minAmount, remain);
        item.allocationAmount -= cut;
        remain -= cut;
      }
      
      // 如果仍有剩余无法扣减（所有产品都只能扣减到最低起购额），说明无法满足约束
      // 此时移除最后一个产品（金额最小的），重新归集
      if (remain > 0 && layerItems.length > 1) {
        layerItems.pop(); // 移除金额最小的产品
        // 重新处理剩余产品
        const newAllocated = layerItems.reduce((s, i) => s + i.allocationAmount, 0);
        const newDiff = budget - newAllocated;
        if (newDiff > 0 && layerItems.length > 0) {
          layerItems[0].allocationAmount += newDiff;
        } else if (newDiff < 0) {
          // 再次尝试扣减
          let newRemain = -newDiff;
          for (const item of layerItems) {
            if (newRemain <= 0) break;
            const cut = Math.min(item.allocationAmount - item.product.minAmount, newRemain);
            item.allocationAmount -= cut;
            newRemain -= cut;
          }
        }
      }
    }
    
    // 更新比例
    for (const item of layerItems) {
      item.allocationRatio = budget > 0 ? item.allocationAmount / budget : 0;
    }
  }
  
  // 清掉低于起购额的产品
  const finalItems = result.filter(i => i.allocationAmount >= i.product.minAmount);
  
  // 校验结果
  const validation = validateAllocation(finalItems, config);
  
  return { items: finalItems, validation };
}
