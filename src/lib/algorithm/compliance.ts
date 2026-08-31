// ============================================================
// 合规检查引擎
// 先过滤 → 再评分 → 后推荐
// ============================================================

import type { CustomerKYC, Product, ComplianceCheckResult, ComplianceStatus, PyramidLayer } from '@/types';

// ── 适当性检查 ────────────────────────────────────────────────
export function checkSuitability(
  kyc: CustomerKYC,
  product: Product,
  allocationAmount?: number
): ComplianceCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  const specialRequirements: string[] = [];
  let status: ComplianceStatus = 'PASS';

  // 检查1：KYC 有效性
  if (kyc.kycStatus !== 'VALID') {
    violations.push('KYC 信息不完整或已过期，请先完成风险评估');
    status = 'BLOCK';
  }

  // 检查2：风险等级匹配
  if (!product.suitabilityScope.includes(kyc.riskLevel)) {
    violations.push(`产品风险等级${product.riskLevel}超出客户风险承受范围${kyc.riskLevel}`);
    status = 'BLOCK';
  }

  // 检查3：年龄限制
  if (product.suitableAgeMin !== null && kyc.age < product.suitableAgeMin) {
    violations.push(`客户年龄${kyc.age}岁，低于产品最低年龄要求${product.suitableAgeMin}岁`);
    status = 'BLOCK';
  }
  if (product.suitableAgeMax !== null && kyc.age > product.suitableAgeMax) {
    violations.push(`客户年龄${kyc.age}岁，超过产品最高年龄要求${product.suitableAgeMax}岁`);
    status = 'BLOCK';
  }

  // 检查4：起购金额（如果指定了分配金额，则检查分配金额是否满足）
  if (kyc.investableAssets < product.minAmount) {
    warnings.push(`可投资资产${kyc.investableAssets}元低于产品起购金额${product.minAmount}元`);
    status = status === 'BLOCK' ? 'BLOCK' : 'WARN';
  }
  if (allocationAmount !== undefined && allocationAmount < product.minAmount) {
    violations.push(`分配金额${allocationAmount}元低于产品起购金额${product.minAmount}元`);
    status = 'BLOCK';
  }

  // 检查5：65岁以上保护
  if (kyc.age >= 65) {
    if (product.riskLevelNumeric >= 4) {
      specialRequirements.push('65岁以上客户购买中高风险产品，需额外确认投资目的和损失承受能力');
      status = status === 'BLOCK' ? 'BLOCK' : 'WARN';
    }
    warnings.push('老年客户投资需审慎，建议优先配置稳健类产品');
    // 卫星层权益类产品对65岁以上客户限制
    if (product.pyramidLayer === 'SATELLITE' && product.riskLevelNumeric >= 3) {
      violations.push('65岁以上客户不建议配置卫星层高风险产品');
      status = 'BLOCK';
    }
  }

  // 检查6：万能险特殊规则
  if (product.category === 'UNIVERSAL_LIFE') {
    if (kyc.age < 18 || kyc.age > 60) {
      warnings.push('万能险对被保人年龄有要求，需核实具体产品条款');
    }
    specialRequirements.push('万能险需根据产品和被保人信息执行专项合规校验');
  }

  // 检查7：私募产品起购金额
  if (product.category === 'STRUCTURED_FINANCIAL') {
    if (kyc.investableAssets < 1000000) {
      violations.push(`私募产品起购金额100万元，您的可投资资产${kyc.investableAssets}元不满足要求`);
      status = 'BLOCK';
    }
    specialRequirements.push('私募产品仅面向合格投资者销售，需完成适当性认证');
  }

  // 检查8：QDII产品汇率风险提示
  if (product.category === 'QDII') {
    warnings.push('QDII产品涉及汇率风险，可能受境外市场波动影响');
    specialRequirements.push('QDII产品赎回到账时间较长（T+7），需提前做好资金安排');
  }

  // 检查9：REITs产品流动性风险
  if (product.category === 'REITS') {
    warnings.push('公募REITs在二级市场交易，可能存在流动性风险');
    specialRequirements.push('REITs产品收益包含分红和价差，需关注产品底层资产状况');
  }

  // 检查10：黄金产品波动风险
  if (product.category === 'GOLD') {
    warnings.push('黄金价格受国际市场、汇率等多因素影响，波动较大');
    specialRequirements.push('黄金积存适合长期配置，短期价格波动不代表最终收益');
  }

  // 检查11：产品数据有效性
  if (!product.isActive) {
    violations.push('产品已停售，不能进入新预约单');
    status = 'BLOCK';
  }

  // 检查12：数据过期
  const dataAge = Date.now() - new Date(product.dataAsOf).getTime();
  if (dataAge > 180 * 24 * 60 * 60 * 1000) { // 超过180天
    warnings.push(`产品数据已超${Math.round(dataAge / (24 * 60 * 60 * 1000))}天，建议核实最新信息`);
  }

  // 检查13：保险产品长期锁定期
  if (product.category === 'LIFE_INSURANCE' || product.category === 'ANNUITY_INSURANCE') {
    if (kyc.yearsToRetirement !== null && kyc.yearsToRetirement < 5) {
      warnings.push('距退休不足5年，购买长期寿险需评估资金流动性');
    }
    specialRequirements.push('保险产品有犹豫期和等待期，请仔细阅读条款');
  }

  // 通用提示
  warnings.push('历史业绩不代表未来表现');
  warnings.push('投资有风险，最终选择由客户自主决定');

  return {
    status,
    severity: status === 'BLOCK' ? 'BLOCK' : status === 'WARN' ? 'WARN' : 'INFO',
    ruleVersion: 'compliance-v2.0',
    violations,
    warnings,
    specialRequirements,
    checkedAt: new Date().toISOString(),
  };
}

// ── 批量合规检查 ──────────────────────────────────────────────
export function batchCheckSuitability(
  kyc: CustomerKYC,
  products: Product[]
): { product: Product; result: ComplianceCheckResult }[] {
  return products.map(product => ({
    product,
    result: checkSuitability(kyc, product),
  }));
}

// ── 检查产品是否适合特定金字塔层 ────────────────────────────────
export function checkLayerSuitability(
  product: Product,
  layer: PyramidLayer
): { suitable: boolean; reason?: string } {
  const layerMapping: Record<PyramidLayer, string[]> = {
    'CASH': ['DEMAND_DEPOSIT', 'TIME_DEPOSIT', 'NCD', 'MONEY_MARKET', 'STRUCTURED_DEPOSIT', 'WMP_DAILY', 'WMP_PR1'],
    'STABLE': ['WMP_PR2', 'BOND_FUND', 'PENSION_WMP', 'PENSION_FOF', 'LIFE_INSURANCE', 'ANNUITY_INSURANCE', 'UNIVERSAL_LIFE', 'GOVT_BOND', 'WMP_PR1'],
    'GROWTH': ['WMP_PR3', 'MIXED_FUND', 'INDEX_FUND', 'EQUITY_FUND', 'ESG_FUND'],
    'SATELLITE': ['QDII', 'REITS', 'GOLD'],
  };

  const suitableCategories = layerMapping[layer];
  if (suitableCategories && suitableCategories.includes(product.category)) {
    return { suitable: true };
  }

  // 一些产品可以在多个层存在
  if (product.pyramidLayer === layer) {
    return { suitable: true };
  }

  return {
    suitable: false,
    reason: `产品类型${product.category}不适合放在${layer}层`,
  };
}
