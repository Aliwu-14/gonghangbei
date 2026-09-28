/**
 * 验证修复后的极端边界场景
 */

function applyConstraintsFixed(baseRatios, kyc) {
  const ratios = { ...baseRatios };
  const adjustments = [];

  // 约束1
  if (kyc.investableAssets > 0) {
    const minCashFromExpense = (kyc.monthlyExpense * 3) / kyc.investableAssets;
    if (ratios.cash < minCashFromExpense) {
      const deficit = minCashFromExpense - ratios.cash;
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

  // 约束2
  if (kyc.age >= 65) {
    if (ratios.growth > 0.10) {
      const reduction = ratios.growth - 0.10;
      ratios.growth = 0.10;
      ratios.stable += reduction;
    }
    ratios.satellite = 0;
  }

  // 约束3 (修复版)
  if (kyc.dti >= 0.30) {
    const highLiquidityTarget = Math.max(ratios.cash, 0.20);
    if (ratios.cash < highLiquidityTarget) {
      const increase = highLiquidityTarget - ratios.cash;
      ratios.cash = highLiquidityTarget;
      const growthCut = Math.min(increase, ratios.growth);
      ratios.growth -= growthCut;
      const stableCut = Math.min(increase - growthCut, ratios.stable);
      ratios.stable -= stableCut;
      const actualIncrease = growthCut + stableCut;
      if (actualIncrease < increase) {
        ratios.cash -= (increase - actualIncrease);
      }
    }
  }

  // 约束4
  if (kyc.yearsToRetirement !== null && kyc.yearsToRetirement <= 5 && kyc.yearsToRetirement > 0) {
    const shiftAmount = Math.min(ratios.growth * 0.3, 0.10);
    ratios.growth -= shiftAmount;
    ratios.stable += shiftAmount;
  }

  const total = ratios.cash + ratios.stable + ratios.growth + ratios.satellite;
  if (Math.abs(total - 1.0) > 0.001) {
    const scale = 1.0 / total;
    ratios.cash *= scale;
    ratios.stable *= scale;
    ratios.growth *= scale;
    ratios.satellite *= scale;
  }

  return ratios;
}

console.log('=== 修复后的DTI扣减顺序验证 ===\n');

// 极端场景：growth只有5%，但DTI需要提高10%流动性
const tc1 = applyConstraintsFixed(
  { cash: 0.10, stable: 0.65, growth: 0.05, satellite: 0.20 },
  { investableAssets: 300000, monthlyExpense: 10000, age: 40, dti: 0.50, yearsToRetirement: 20 }
);
console.log('场景1: DTI 50%, growth仅5%');
console.log('  修复后: cash=' + (tc1.cash*100).toFixed(1) + '% stable=' + (tc1.stable*100).toFixed(1) + '% growth=' + (tc1.growth*100).toFixed(1) + '% sat=' + (tc1.satellite*100).toFixed(1) + '%');
console.log('  验证: ' + ((tc1.cash+tc1.stable+tc1.growth+tc1.satellite > 0.999) ? '✓ 总和=100%' : '✗ 总和≠100%'));

// 场景2：growth=0（只有cash和stable）
const tc2 = applyConstraintsFixed(
  { cash: 0.15, stable: 0.75, growth: 0.00, satellite: 0.10 },
  { investableAssets: 300000, monthlyExpense: 10000, age: 40, dti: 0.40, yearsToRetirement: 20 }
);
console.log('\n场景2: DTI 40%, growth=0%');
console.log('  修复后: cash=' + (tc2.cash*100).toFixed(1) + '% stable=' + (tc2.stable*100).toFixed(1) + '% growth=' + (tc2.growth*100).toFixed(1) + '% sat=' + (tc2.satellite*100).toFixed(1) + '%');
console.log('  验证: ' + ((tc2.cash+tc2.stable+tc2.growth+tc2.satellite > 0.999) ? '✓ 总和=100%' : '✗ 总和≠100%'));

// 场景3：双重约束（流动性+DTI同时）
const tc3 = applyConstraintsFixed(
  { cash: 0.10, stable: 0.60, growth: 0.20, satellite: 0.10 },
  { investableAssets: 100000, monthlyExpense: 15000, age: 40, dti: 0.50, yearsToRetirement: 20 }
);
console.log('\n场景3: 流动性约束+DTI约束同时触发');
console.log('  修复后: cash=' + (tc3.cash*100).toFixed(1) + '% stable=' + (tc3.stable*100).toFixed(1) + '% growth=' + (tc3.growth*100).toFixed(1) + '% sat=' + (tc3.satellite*100).toFixed(1) + '%');
console.log('  验证: ' + ((tc3.cash+tc3.stable+tc3.growth+tc3.satellite > 0.999) ? '✓ 总和=100%' : '✗ 总和≠100%'));
