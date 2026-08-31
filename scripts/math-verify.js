/**
 * 数学逻辑验证脚本
 * 验证金字塔配置、现金流测算、约束引擎的正确性
 */

// ============================================================
// 1. 模拟 applyConstraints 核心逻辑
// ============================================================
console.log('=== 1. 金字塔约束引擎测试 ===\n');

function applyConstraints(baseRatios, kyc) {
  const ratios = { ...baseRatios };
  const adjustments = [];

  // 约束1：流动性硬约束
  if (kyc.investableAssets > 0) {
    const minCashFromExpense = (kyc.monthlyExpense * 3) / kyc.investableAssets;
    if (ratios.cash < minCashFromExpense) {
      const deficit = minCashFromExpense - ratios.cash;
      adjustments.push({ dim: '流动性硬约束', deficit });
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

  // 约束2：65岁以上
  if (kyc.age >= 65) {
    const elderlyGrowthCap = 0.10;
    if (ratios.growth > elderlyGrowthCap) {
      const reduction = ratios.growth - elderlyGrowthCap;
      adjustments.push({ dim: '适老保护', reduction });
      ratios.growth = elderlyGrowthCap;
      ratios.stable += reduction;
    }
    ratios.satellite = 0;
  }

  // 约束3：DTI >= 30%（修复版：先扣growth再扣stable，与约束1保持一致）
  if (kyc.dti >= 0.30) {
    const highLiquidityTarget = Math.max(ratios.cash, 0.20);
    if (ratios.cash < highLiquidityTarget) {
      const increase = highLiquidityTarget - ratios.cash;
      adjustments.push({ dim: 'DTI压力', increase });
      ratios.cash = highLiquidityTarget;
      const growthCut = Math.min(increase, ratios.growth);
      ratios.growth -= growthCut;
      const stableCut = Math.min(increase - growthCut, ratios.stable);
      ratios.stable -= stableCut;
    }
  }

  // 约束4：养老临近
  if (kyc.yearsToRetirement !== null && kyc.yearsToRetirement <= 5 && kyc.yearsToRetirement > 0) {
    const shiftAmount = Math.min(ratios.growth * 0.3, 0.10);
    adjustments.push({ dim: '养老临近', shiftAmount });
    ratios.growth -= shiftAmount;
    ratios.stable += shiftAmount;
  }

  // 归一化
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

// 测试案例
const testCases = [
  {
    name: '基线：B1-2（无约束）',
    base: { cash: 0.30, stable: 0.50, growth: 0.20, satellite: 0.00 },
    kyc: { investableAssets: 200000, monthlyExpense: 8000, age: 30, dti: 0.15, yearsToRetirement: 30 },
  },
  {
    name: '约束1：月支出高（需提高现金层）',
    base: { cash: 0.30, stable: 0.50, growth: 0.20, satellite: 0.00 },
    kyc: { investableAssets: 100000, monthlyExpense: 20000, age: 30, dti: 0.15, yearsToRetirement: 30 },
  },
  {
    name: '约束2：65岁以上',
    base: { cash: 0.45, stable: 0.45, growth: 0.10, satellite: 0.00 },
    kyc: { investableAssets: 200000, monthlyExpense: 5000, age: 68, dti: 0.10, yearsToRetirement: 0 },
  },
  {
    name: '约束3：DTI 45%（高负债）',
    base: { cash: 0.30, stable: 0.50, growth: 0.20, satellite: 0.00 },
    kyc: { investableAssets: 300000, monthlyExpense: 10000, age: 40, dti: 0.45, yearsToRetirement: 20 },
  },
  {
    name: '约束4：3年后退休',
    base: { cash: 0.20, stable: 0.40, growth: 0.30, satellite: 0.10 },
    kyc: { investableAssets: 500000, monthlyExpense: 8000, age: 57, dti: 0.10, yearsToRetirement: 3 },
  },
  {
    name: '多重约束：65岁 + 高DTI',
    base: { cash: 0.45, stable: 0.45, growth: 0.10, satellite: 0.00 },
    kyc: { investableAssets: 200000, monthlyExpense: 6000, age: 67, dti: 0.35, yearsToRetirement: 0 },
  },
];

let allPassed = true;
for (const tc of testCases) {
  const result = applyConstraints(tc.base, tc.kyc);
  const total = result.ratios.cash + result.ratios.stable + result.ratios.growth + result.ratios.satellite;
  const sumOk = Math.abs(total - 1.0) < 0.0001;
  const equity = result.ratios.growth + result.ratios.satellite;
  const cashFloorOk = result.ratios.cash >= 0;
  const equityOk = result.ratios.growth >= 0 && result.ratios.satellite >= 0;

  const status = sumOk && cashFloorOk && equityOk ? '✓ PASS' : '✗ FAIL';
  if (!sumOk || !cashFloorOk || !equityOk) allPassed = false;

  console.log(`${status} ${tc.name}`);
  console.log(`  输入: cash=${(tc.base.cash*100).toFixed(1)}% stable=${(tc.base.stable*100).toFixed(1)}% growth=${(tc.base.growth*100).toFixed(1)}% sat=${(tc.base.satellite*100).toFixed(1)}%`);
  console.log(`  输出: cash=${(result.ratios.cash*100).toFixed(1)}% stable=${(result.ratios.stable*100).toFixed(1)}% growth=${(result.ratios.growth*100).toFixed(1)}% sat=${(result.ratios.satellite*100).toFixed(1)}% | sum=${(total*100).toFixed(2)}%`);
  if (result.adjustments.length > 0) {
    const adjStrs = result.adjustments.map(a => {
      if (a.deficit !== undefined) return `${a.dim}(${(a.deficit*100).toFixed(1)}%)`;
      if (a.reduction !== undefined) return `${a.dim}(${(a.reduction*100).toFixed(1)}%)`;
      if (a.increase !== undefined) return `${a.dim}(${(a.increase*100).toFixed(1)}%)`;
      if (a.shiftAmount !== undefined) return `${a.dim}(${(a.shiftAmount*100).toFixed(1)}%)`;
      return a.dim;
    });
    console.log(`  约束触发: ${adjStrs.join(', ')}`);
  }
  console.log();
}

// ============================================================
// 2. 现金流测算核心公式验证
// ============================================================
console.log('=== 2. 现金流测算公式测试 ===\n');

function computeCashFlow(kyc, config) {
  const inflation = 0.025;

  // 组合加权预期收益（无持仓时按层级估算）
  const defaults = { cash: 0.018, stable: 0.035, growth: 0.075, satellite: 0.055 };
  const expectedReturn = config.cashRatio * defaults.cash + config.stableRatio * defaults.stable
    + config.growthRatio * defaults.growth + config.satelliteRatio * defaults.satellite;

  // 安全提取率
  const equity = config.growthRatio + config.satelliteRatio;
  let sustainableRate;
  if (equity < 0.10) sustainableRate = 0.030;
  else if (equity < 0.20) sustainableRate = 0.035;
  else if (equity < 0.30) sustainableRate = 0.040;
  else if (equity < 0.40) sustainableRate = 0.043;
  else sustainableRate = 0.045;

  const alreadyRetired = kyc.yearsToRetirement === null || kyc.yearsToRetirement === 0;
  const yearsToRetirement = alreadyRetired ? 0 : kyc.yearsToRetirement;
  const retirementAge = kyc.age + yearsToRetirement;

  // 月结余
  const monthlySurplus = Math.max(0, kyc.annualIncome / 12 - kyc.monthlyExpense - kyc.mortgageMonthly - kyc.otherMonthlyDebt);

  // 积累期：复利 + 定投
  let assetsAtRetirement = kyc.investableAssets;
  if (yearsToRetirement > 0) {
    assetsAtRetirement = kyc.investableAssets * Math.pow(1 + expectedReturn, yearsToRetirement);
    const annualContribution = monthlySurplus * 12;
    if (expectedReturn > 0 && annualContribution > 0) {
      const annuityFactor = (Math.pow(1 + expectedReturn, yearsToRetirement) - 1) / expectedReturn;
      assetsAtRetirement += annualContribution * annuityFactor;
    } else if (annualContribution > 0) {
      assetsAtRetirement += annualContribution * yearsToRetirement;
    }
  }

  // 退休金估算
  const startWorkAge = 22;
  const currentContributionYears = Math.max(0, Math.min(kyc.age - startWorkAge, 40));
  const totalContributionYears = Math.min(currentContributionYears + yearsToRetirement, 40);
  let baseReplacementRate;
  if (totalContributionYears < 15) baseReplacementRate = 0.30;
  else if (totalContributionYears < 25) baseReplacementRate = 0.40 + (totalContributionYears - 15) * 0.01;
  else if (totalContributionYears < 35) baseReplacementRate = 0.50 + (totalContributionYears - 25) * 0.008;
  else baseReplacementRate = 0.58 + (totalContributionYears - 35) * 0.005;

  const retirementMonthlyExpense = kyc.monthlyExpense * Math.pow(1 + inflation, yearsToRetirement);
  const pensionMonthly = retirementMonthlyExpense * baseReplacementRate;
  const annualGap = Math.max(0, retirementMonthlyExpense * 12 - pensionMonthly * 12);

  // 退休后月现金流
  const annualWithdrawal = assetsAtRetirement * sustainableRate;
  const monthlyCashFlow = (annualWithdrawal + pensionMonthly * 12) / 12;
  const coverageRatio = (annualWithdrawal + pensionMonthly * 12) / (retirementMonthlyExpense * 12);

  // 永续测算
  let balance = assetsAtRetirement;
  let depletionAge = null;
  const retirementReturn = Math.min(expectedReturn, 0.04);
  for (let t = 0; retirementAge + t <= 100; t++) {
    const age = retirementAge + t;
    const withdraw = annualGap * Math.pow(1 + inflation, t);
    balance = balance * (1 + retirementReturn) - withdraw;
    if (balance <= 0) { depletionAge = age; break; }
  }
  const perpetual = depletionAge === null && balance > 0;

  return { expectedReturn, sustainableRate, assetsAtRetirement, monthlySurplus, annualGap,
    monthlyCashFlow, coverageRatio, retirementAge, perpetual, depletionAge,
    pensionMonthly, baseReplacementRate };
}

const cfTestCases = [
  {
    name: '普通上班族：5万资产，20年后退休',
    kyc: { age: 35, annualIncome: 200000, monthlyExpense: 10000, investableAssets: 50000,
      mortgageMonthly: 0, otherMonthlyDebt: 0, yearsToRetirement: 25 },
    config: { cashRatio: 0.30, stableRatio: 0.50, growthRatio: 0.20, satelliteRatio: 0.00 },
  },
  {
    name: '高净值：80万资产，10年后退休',
    kyc: { age: 50, annualIncome: 800000, monthlyExpense: 30000, investableAssets: 800000,
      mortgageMonthly: 0, otherMonthlyDebt: 0, yearsToRetirement: 10 },
    config: { cashRatio: 0.15, stableRatio: 0.35, growthRatio: 0.35, satelliteRatio: 0.15 },
  },
  {
    name: '退休人员：30万资产',
    kyc: { age: 65, annualIncome: 80000, monthlyExpense: 6000, investableAssets: 300000,
      mortgageMonthly: 0, otherMonthlyDebt: 0, yearsToRetirement: 0 },
    config: { cashRatio: 0.45, stableRatio: 0.45, growthRatio: 0.10, satelliteRatio: 0.00 },
  },
  {
    name: '月光族：2万资产，30年后退休',
    kyc: { age: 30, annualIncome: 150000, monthlyExpense: 12000, investableAssets: 20000,
      mortgageMonthly: 0, otherMonthlyDebt: 0, yearsToRetirement: 30 },
    config: { cashRatio: 0.35, stableRatio: 0.50, growthRatio: 0.15, satelliteRatio: 0.00 },
  },
  {
    name: '高负债：5万资产，负债45%',
    kyc: { age: 40, annualIncome: 300000, monthlyExpense: 15000, investableAssets: 50000,
      mortgageMonthly: 10000, otherMonthlyDebt: 0, yearsToRetirement: 20 },
    config: { cashRatio: 0.20, stableRatio: 0.50, growthRatio: 0.30, satelliteRatio: 0.00 },
  },
];

for (const tc of cfTestCases) {
  const r = computeCashFlow(tc.kyc, tc.config);
  console.log(`${tc.name}`);
  console.log(`  组合预期收益: ${(r.expectedReturn*100).toFixed(2)}% | 安全提取率: ${(r.sustainableRate*100).toFixed(1)}%`);
  console.log(`  退休年龄: ${r.retirementAge}岁 | 退休时资产: ¥${(r.assetsAtRetirement/10000).toFixed(1)}万`);
  console.log(`  月退休金: ¥${Math.round(r.pensionMonthly).toLocaleString()} | 替代率: ${(r.baseReplacementRate*100).toFixed(1)}%`);
  console.log(`  月结余: ¥${Math.round(r.monthlySurplus).toLocaleString()} | 年度缺口: ¥${Math.round(r.annualGap).toLocaleString()}`);
  console.log(`  退休后月现金流: ¥${Math.round(r.monthlyCashFlow).toLocaleString()} | 覆盖率: ${(r.coverageRatio*100).toFixed(0)}%`);
  console.log(`  永续: ${r.perpetual ? '✓ 可以永续' : `✗ ${r.depletionAge}岁耗尽`}`);
  console.log();
}

// ============================================================
// 3. 夏普比率公式验证
// ============================================================
console.log('=== 3. 产品评分公式测试 ===\n');

function scoreProduct(product, kycRiskLevel) {
  let score = 0;

  // 维度1：风险适配（30分）
  const riskNum = kycRiskLevel === 'R1' ? 1 : kycRiskLevel === 'R2' ? 2 : kycRiskLevel === 'R3' ? 3 : kycRiskLevel === 'R4' ? 4 : 5;
  const riskMatch = product.riskLevelNumeric <= riskNum;
  score += riskMatch ? 30 : 0;

  // 维度2：流动性（20分）
  score += product.liquidityType === '随时' ? 20 : product.liquidityType === 'T+1' ? 15 : 5;

  // 维度3：目标匹配（20分）
  score += 15; // 简化

  // 维度4：费用（10分）
  const fee = product.managementFee + product.subscriptionFee;
  score += fee < 0.01 ? 10 : fee < 0.02 ? 7 : 3;

  // 维度5：夏普比率（20分）
  if (product.historicalReturn1y !== null && product.volatility !== null && product.volatility > 0) {
    const sharpe = product.historicalReturn1y / product.volatility;
    score += Math.min(20, Math.max(0, sharpe * 40));
  } else {
    score += 10;
  }

  return Math.round(score * 100) / 100;
}

const productTests = [
  { name: '货币基金', product: { riskLevelNumeric: 1, liquidityType: '随时', managementFee: 0.003, subscriptionFee: 0, historicalReturn1y: 0.022, volatility: 0.002 } },
  { name: 'PR2理财', product: { riskLevelNumeric: 2, liquidityType: '定期', managementFee: 0.005, subscriptionFee: 0, historicalReturn1y: 0.038, volatility: 0.008 } },
  { name: '纯债基金', product: { riskLevelNumeric: 2, liquidityType: 'T+2', managementFee: 0.006, subscriptionFee: 0.001, historicalReturn1y: 0.045, volatility: 0.02 } },
  { name: '沪深300指数', product: { riskLevelNumeric: 4, liquidityType: 'T+1', managementFee: 0.005, subscriptionFee: 0.012, historicalReturn1y: 0.08, volatility: 0.18 } },
  { name: '纳斯达克QDII', product: { riskLevelNumeric: 4, liquidityType: 'T+7', managementFee: 0.015, subscriptionFee: 0.01, historicalReturn1y: 0.15, volatility: 0.22 } },
];

for (const tc of productTests) {
  const scoreR2 = scoreProduct(tc.product, 'R2');
  const scoreR3 = scoreProduct(tc.product, 'R3');
  const scoreR4 = scoreProduct(tc.product, 'R4');
  const sharpe = tc.product.volatility > 0 ? (tc.product.historicalReturn1y / tc.product.volatility) : 0;
  console.log(`${tc.name} (风险${tc.product.riskLevelNumeric}): R2=${scoreR2.toFixed(1)}分 R3=${scoreR3.toFixed(1)}分 R4=${scoreR4.toFixed(1)}分 | 夏普=${sharpe.toFixed(2)}`);
}
console.log();

// ============================================================
// 4. DTI 计算公式验证
// ============================================================
console.log('=== 4. DTI 计算公式测试 ===\n');

function verifyDTI(annualIncome, mortgageMonthly, otherMonthlyDebt) {
  // 月供/年收入 = (月供×12)/年收入
  const dti = ((mortgageMonthly + otherMonthlyDebt) * 12) / annualIncome;
  return dti;
}

const dtiTests = [
  { name: '无负债', annual: 200000, mortgage: 0, other: 0 },
  { name: '房贷月供6000', annual: 300000, mortgage: 6000, other: 0 },
  { name: '高负债：房贷+消费贷', annual: 400000, mortgage: 10000, other: 4000 },
  { name: '临界值：刚好30%', annual: 200000, mortgage: 5000, other: 0 },
];

for (const tc of dtiTests) {
  const dti = verifyDTI(tc.annual, tc.mortgage, tc.other);
  const status = dti >= 0.40 ? '⚠️ 严重超标' : dti >= 0.30 ? '⚠️ 超标' : '✓ 正常';
  console.log(`${tc.name}: DTI=${(dti*100).toFixed(1)}% ${status}`);
}
console.log();

// ============================================================
// 5. 复利与年金公式验证
// ============================================================
console.log('=== 5. 复利与年金公式测试 ===\n');

// 复利终值：FV = PV × (1+r)^n
const fv = (pv, r, n) => pv * Math.pow(1 + r, n);

// 普通年金终值：FV_annuity = PMT × [(1+r)^n - 1] / r
const fvAnnuity = (pmt, r, n) => pmt * (Math.pow(1 + r, n) - 1) / r;

// 现值折现：PV = FV / (1+r)^n
const pvDiscount = (fv, r, n) => fv / Math.pow(1 + r, n);

// 验证：5万初始 + 每月2000定投，年化5%，10年
const test1 = fv(50000, 0.05, 10);
const test2 = fvAnnuity(2000 * 12, 0.05, 10); // 年投入
console.log('5万×10年(5%复利) = ¥' + Math.round(test1).toLocaleString());
console.log('年投2.4万×10年(5%) = ¥' + Math.round(test2).toLocaleString());
console.log('合计 = ¥' + Math.round(test1 + test2).toLocaleString());
console.log();

// 验证：100万，年化4%提取，每年提取4万，能持续多久？
let balance = 1000000;
let years = 0;
while (balance > 0 && years < 100) {
  balance = balance * 1.04 - 40000;
  years++;
}
console.log(`100万×4%年提取4万×4%增长: ${years}年后耗尽（实际应为永续或约34年）`);
console.log();

// ============================================================
// 6. 归一化验证
// ============================================================
console.log('=== 6. 归一化边界测试 ===\n');

// 当总和超过1时归一化
const over = { cash: 0.35, stable: 0.52, growth: 0.13, satellite: 0.05 };
const overTotal = over.cash + over.stable + over.growth + over.satellite;
const overScale = 1.0 / overTotal;
console.log(`比例和=${(overTotal*100).toFixed(2)}% → 缩放因子=${overScale.toFixed(4)}`);
console.log(`归一化后: cash=${(over.cash*overScale*100).toFixed(2)}% stable=${(over.stable*overScale*100).toFixed(2)}% growth=${(over.growth*overScale*100).toFixed(2)}% sat=${(over.satellite*overScale*100).toFixed(2)}%`);
console.log();

// ============================================================
// 7. 1000元取整逻辑验证
// ============================================================
console.log('=== 7. 金额取整测试 ===\n');

function roundToThousand(amount, roundingDiff) {
  let cashAmount = Math.round(amount * ratios.cash / 1000) * 1000;
  let stableAmount = Math.round(amount * ratios.stable / 1000) * 1000;
  let growthAmount = Math.round(amount * ratios.growth / 1000) * 1000;
  let satelliteAmount = Math.round(amount * ratios.satellite / 1000) * 1000;
  const roundingDiffActual = amount - (cashAmount + stableAmount + growthAmount + satelliteAmount);
  cashAmount += roundingDiffActual;
  return { cashAmount, stableAmount, growthAmount, satelliteAmount };
}

const ratios = { cash: 0.30, stable: 0.50, growth: 0.15, satellite: 0.05 };
const testAmounts = [50000, 123456, 99999, 1000000, 150000];
for (const amt of testAmounts) {
  let cashAmount = Math.round(amt * ratios.cash / 1000) * 1000;
  let stableAmount = Math.round(amt * ratios.stable / 1000) * 1000;
  let growthAmount = Math.round(amt * ratios.growth / 1000) * 1000;
  let satelliteAmount = Math.round(amt * ratios.satellite / 1000) * 1000;
  const diff = amt - (cashAmount + stableAmount + growthAmount + satelliteAmount);
  cashAmount += diff;
  const sum = cashAmount + stableAmount + growthAmount + satelliteAmount;
  console.log(`¥${amt.toLocaleString()} → 现金¥${cashAmount.toLocaleString()} + 稳健¥${stableAmount.toLocaleString()} + 成长¥${growthAmount.toLocaleString()} + 卫星¥${satelliteAmount.toLocaleString()} = ¥${sum.toLocaleString()} ${sum === amt ? '✓' : '✗'}`);
}
console.log();

console.log('=== 测试完成 ===');
console.log(allPassed ? '✓ 所有金字塔约束测试通过' : '✗ 部分测试失败');
