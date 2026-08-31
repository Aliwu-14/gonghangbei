// ============================================================
// 遗传算法配置优化引擎
// 在规则引擎生成的初始配置基础上，用遗传算法进行二次优化
// 在满足所有合规约束的前提下，搜索风险调整后收益最优的配置组合
// ============================================================

import type { CustomerKYC, PyramidConfig, AllocationPlanItem } from '@/types';

export interface GAConfig {
  populationSize: number;     // 种群大小，默认100
  generations: number;        // 迭代代数，默认100
  mutationRate: number;      // 变异率，默认0.05
  eliteRatio: number;        // 精英比例，默认0.2
  convergenceThreshold: number; // 收敛阈值，默认0.0001
}

export interface GAIndividual {
  ratios: { cash: number; stable: number; growth: number; satellite: number };
  fitness: number;
  sharpeRatio: number;
  expectedReturn: number;
  volatility: number;
}

export interface GAOptimizationResult {
  optimizedConfig: PyramidConfig;
  optimizedRatios: { cash: number; stable: number; growth: number; satellite: number };
  fitness: number;
  sharpeRatio: number;
  iterations: number;
  converged: boolean;
}

// ── 默认配置 ──────────────────────────────────────────────────
const DEFAULT_GA_CONFIG: GAConfig = {
  populationSize: 100,
  generations: 100,
  mutationRate: 0.05,
  eliteRatio: 0.2,
  convergenceThreshold: 0.0001,
};

// ── 各层默认参数（用于估算收益和波动率） ───────────────────────
const LAYER_DEFAULTS = {
  cash: { expectedReturn: 0.018, volatility: 0.005 },
  stable: { expectedReturn: 0.038, volatility: 0.02 },
  growth: { expectedReturn: 0.08, volatility: 0.15 },
  satellite: { expectedReturn: 0.06, volatility: 0.20 },
};

// ── 适应度函数 ─────────────────────────────────────────────────
/**
 * 计算个体的适应度
 * 适应度 = Sharpe比率 - 流动性惩罚 - 合规惩罚
 */
function calculateFitness(
  ratios: { cash: number; stable: number; growth: number; satellite: number },
  kyc: CustomerKYC
): { fitness: number; sharpeRatio: number; expectedReturn: number; volatility: number } {
  // 加权组合收益和波动率
  const expectedReturn =
    ratios.cash * LAYER_DEFAULTS.cash.expectedReturn +
    ratios.stable * LAYER_DEFAULTS.stable.expectedReturn +
    ratios.growth * LAYER_DEFAULTS.growth.expectedReturn +
    ratios.satellite * LAYER_DEFAULTS.satellite.expectedReturn;

  const volatility = Math.sqrt(
    Math.pow(ratios.cash * LAYER_DEFAULTS.cash.volatility, 2) +
    Math.pow(ratios.stable * LAYER_DEFAULTS.stable.volatility, 2) +
    Math.pow(ratios.growth * LAYER_DEFAULTS.growth.volatility, 2) +
    Math.pow(ratios.satellite * LAYER_DEFAULTS.satellite.volatility, 2)
  );

  // 无风险利率（10年国债收益率）
  const riskFreeRate = 0.025;
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  // 惩罚项
  let penalty = 0;

  // 惩罚1：流动性约束（现金层不足）
  const minCashRatio = Math.max(0.10, (kyc.monthlyExpense * 3) / kyc.investableAssets);
  if (ratios.cash < minCashRatio) {
    penalty += (minCashRatio - ratios.cash) * 10;
  }

  // 惩罚2：DTI约束（负债压力）
  if (kyc.dti >= 0.30 && ratios.cash < 0.20) {
    penalty += (0.20 - ratios.cash) * 5;
  }

  // 惩罚3：适老约束（65岁以上权益上限10%）
  if (kyc.age >= 65) {
    const equity = ratios.growth + ratios.satellite;
    if (equity > 0.10) {
      penalty += (equity - 0.10) * 20;
    }
    if (ratios.satellite > 0) {
      penalty += ratios.satellite * 5;
    }
  }

  // 惩罚4：退休临近约束（5年内退休）
  if (kyc.yearsToRetirement !== null && kyc.yearsToRetirement <= 5 && kyc.yearsToRetirement > 0) {
    if (ratios.growth > 0.30) {
      penalty += (ratios.growth - 0.30) * 3;
    }
  }

  // 惩罚5：权益上限约束
  const equityCap = 1 - ratios.cash - ratios.stable;
  if (equityCap > kyc.investableAssets / 1000000) {
    penalty += (equityCap - kyc.investableAssets / 1000000) * 2;
  }

  return {
    fitness: sharpeRatio - penalty,
    sharpeRatio: Math.max(0, sharpeRatio),
    expectedReturn,
    volatility,
  };
}

// ── 约束校验 ──────────────────────────────────────────────────
function isValidIndividual(
  ratios: { cash: number; stable: number; growth: number; satellite: number },
  kyc: CustomerKYC
): boolean {
  const minCashRatio = Math.max(0.10, (kyc.monthlyExpense * 3) / kyc.investableAssets);

  // 基础约束
  if (ratios.cash < 0 || ratios.stable < 0 || ratios.growth < 0 || ratios.satellite < 0) {
    return false;
  }

  // 65岁以上硬约束
  if (kyc.age >= 65) {
    if (ratios.growth + ratios.satellite > 0.10) return false;
    if (ratios.satellite > 0) return false;
  }

  // 流动性约束
  if (ratios.cash < minCashRatio - 0.05) return false; // 允许小幅违反，由惩罚函数处理

  return true;
}

// ── 初始化种群 ─────────────────────────────────────────────────
function initializePopulation(
  kyc: CustomerKYC,
  config: GAConfig
): GAIndividual[] {
  const population: GAIndividual[] = [];

  // 添加基于规则引擎的初始解
  const ruleBasedRatios = {
    cash: 0.15,
    stable: 0.45,
    growth: 0.30,
    satellite: 0.10,
  };
  const ruleFitness = calculateFitness(ruleBasedRatios, kyc);
  population.push({
    ratios: { ...ruleBasedRatios },
    ...ruleFitness,
  });

  // 随机生成其他个体
  for (let i = 1; i < config.populationSize; i++) {
    const ratios = {
      cash: 0.10 + Math.random() * 0.20,
      stable: 0.30 + Math.random() * 0.30,
      growth: 0.10 + Math.random() * 0.30,
      satellite: 0 + Math.random() * 0.15,
    };

    // 归一化
    const total = ratios.cash + ratios.stable + ratios.growth + ratios.satellite;
    ratios.cash /= total;
    ratios.stable /= total;
    ratios.growth /= total;
    ratios.satellite /= total;

    // 65岁以上卫星层为0
    if (kyc.age >= 65) {
      ratios.satellite = 0;
      const t = ratios.cash + ratios.stable + ratios.growth;
      ratios.cash /= t;
      ratios.stable /= t;
      ratios.growth /= t;
    }

    if (isValidIndividual(ratios, kyc)) {
      const fitness = calculateFitness(ratios, kyc);
      population.push({ ratios, ...fitness });
    } else {
      i--; // 重试
    }
  }

  return population;
}

// ── 选择 ──────────────────────────────────────────────────────
function select(population: GAIndividual[], eliteRatio: number): GAIndividual[] {
  // 按适应度排序
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness);

  // 保留精英
  const eliteCount = Math.floor(population.length * eliteRatio);
  const elites = sorted.slice(0, eliteCount);

  // 轮盘赌选择其余个体
  const restCount = population.length - eliteCount;
  const rest: GAIndividual[] = [];

  // 计算总适应度
  const totalFitness = sorted.reduce((sum, ind) => sum + Math.max(0, ind.fitness), 0);

  for (let i = 0; i < restCount; i++) {
    const r = Math.random() * totalFitness;
    let cumulative = 0;
    for (const ind of sorted) {
      cumulative += Math.max(0, ind.fitness);
      if (cumulative >= r) {
        rest.push({ ...ind });
        break;
      }
    }
    if (rest.length <= i) {
      rest.push({ ...sorted[sorted.length - 1] });
    }
  }

  return [...elites, ...rest];
}

// ── 交叉 ──────────────────────────────────────────────────────
function crossover(
  parent1: GAIndividual,
  parent2: GAIndividual
): GAIndividual[] {
  const alpha = Math.random();
  const child1Ratios = {
    cash: alpha * parent1.ratios.cash + (1 - alpha) * parent2.ratios.cash,
    stable: alpha * parent1.ratios.stable + (1 - alpha) * parent2.ratios.stable,
    growth: alpha * parent1.ratios.growth + (1 - alpha) * parent2.ratios.growth,
    satellite: alpha * parent1.ratios.satellite + (1 - alpha) * parent2.ratios.satellite,
  };

  const child2Ratios = {
    cash: (1 - alpha) * parent1.ratios.cash + alpha * parent2.ratios.cash,
    stable: (1 - alpha) * parent1.ratios.stable + alpha * parent2.ratios.stable,
    growth: (1 - alpha) * parent1.ratios.growth + alpha * parent2.ratios.growth,
    satellite: (1 - alpha) * parent1.ratios.satellite + alpha * parent2.ratios.satellite,
  };

  return [
    { ratios: child1Ratios, fitness: 0, sharpeRatio: 0, expectedReturn: 0, volatility: 0 },
    { ratios: child2Ratios, fitness: 0, sharpeRatio: 0, expectedReturn: 0, volatility: 0 },
  ];
}

// ── 变异 ──────────────────────────────────────────────────────
function mutate(
  individual: GAIndividual,
  kyc: CustomerKYC,
  mutationRate: number
): GAIndividual {
  const mutated = { ...individual, ratios: { ...individual.ratios } };

  if (Math.random() < mutationRate) {
    // 随机选择一个层进行变异
    const layers: (keyof typeof mutated.ratios)[] = ['cash', 'stable', 'growth', 'satellite'];
    const layer = layers[Math.floor(Math.random() * layers.length)];

    // 变异幅度 ±5%
    const delta = (Math.random() - 0.5) * 0.10;
    mutated.ratios[layer] = Math.max(0, Math.min(1, mutated.ratios[layer] + delta));
  }

  // 归一化
  const total = mutated.ratios.cash + mutated.ratios.stable + mutated.ratios.growth + mutated.ratios.satellite;
  mutated.ratios.cash /= total;
  mutated.ratios.stable /= total;
  mutated.ratios.growth /= total;
  mutated.ratios.satellite /= total;

  // 65岁以上卫星层为0
  if (kyc.age >= 65) {
    mutated.ratios.satellite = 0;
    const t = mutated.ratios.cash + mutated.ratios.stable + mutated.ratios.growth;
    if (t > 0) {
      mutated.ratios.cash /= t;
      mutated.ratios.stable /= t;
      mutated.ratios.growth /= t;
    }
  }

  return mutated;
}

// ── 主优化函数 ─────────────────────────────────────────────────
/**
 * 使用遗传算法优化金字塔配置比例
 * @param kyc 客户KYC信息
 * @param initialConfig 初始配置（来自规则引擎）
 * @param items 当前配置的产品列表
 * @param gaConfig 遗传算法配置
 * @returns 优化后的配置
 */
export function optimizeWithGA(
  kyc: CustomerKYC,
  initialConfig: PyramidConfig,
  items: AllocationPlanItem[],
  gaConfig: Partial<GAConfig> = {}
): GAOptimizationResult {
  const config = { ...DEFAULT_GA_CONFIG, ...gaConfig };

  // 使用初始配置的比例作为种群种子
  const initialRatios = {
    cash: initialConfig.cashRatio,
    stable: initialConfig.stableRatio,
    growth: initialConfig.growthRatio,
    satellite: initialConfig.satelliteRatio,
  };

  // 计算初始适应度
  const initialFitness = calculateFitness(initialRatios, kyc);
  let bestIndividual: GAIndividual = {
    ratios: initialRatios,
    ...initialFitness,
  };

  // 记录历史最佳适应度（用于判断收敛）
  const fitnessHistory: number[] = [];

  // 初始化种群
  let population = initializePopulation(kyc, config);

  // 用初始解替换最差个体
  const worstIdx = population.findIndex(
    (ind) => ind.fitness === Math.min(...population.map((p) => p.fitness))
  );
  if (worstIdx !== -1) {
    population[worstIdx] = { ...bestIndividual };
  }

  // 迭代
  for (let gen = 0; gen < config.generations; gen++) {
    // 评估适应度
    population = population.map((ind) => {
      if (ind.fitness === 0) {
        const fitness = calculateFitness(ind.ratios, kyc);
        return { ...ind, ...fitness };
      }
      return ind;
    });

    // 更新最佳个体
    for (const ind of population) {
      if (ind.fitness > bestIndividual.fitness) {
        bestIndividual = { ...ind };
      }
    }

    // 记录适应度历史
    fitnessHistory.push(bestIndividual.fitness);

    // 检查收敛
    if (fitnessHistory.length >= 20) {
      const recent = fitnessHistory.slice(-20);
      const improvement = Math.max(...recent) - Math.min(...recent);
      if (improvement < config.convergenceThreshold) {
        // 收敛，提前终止
        break;
      }
    }

    // 选择
    population = select(population, config.eliteRatio);

    // 交叉和变异
    const newPopulation: GAIndividual[] = [];
    const elites = population.slice(0, Math.floor(population.length * config.eliteRatio));
    newPopulation.push(...elites);

    while (newPopulation.length < config.populationSize) {
      // 随机选择两个父代
      const idx1 = Math.floor(Math.random() * population.length);
      let idx2 = Math.floor(Math.random() * population.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * population.length);
      }

      // 交叉
      const children = crossover(population[idx1], population[idx2]);

      // 变异
      for (const child of children) {
        const mutated = mutate(child, kyc, config.mutationRate);
        if (isValidIndividual(mutated.ratios, kyc)) {
          const fitness = calculateFitness(mutated.ratios, kyc);
          newPopulation.push({ ...mutated, ...fitness });
        }
      }
    }

    population = newPopulation.slice(0, config.populationSize);
  }

  // 最终评估
  const finalFitness = calculateFitness(bestIndividual.ratios, kyc);
  bestIndividual = { ...bestIndividual, ...finalFitness };

  // 构建优化后的配置
  const totalAmount = kyc.investableAssets;
  const optimizedConfig: PyramidConfig = {
    cashRatio: bestIndividual.ratios.cash,
    stableRatio: bestIndividual.ratios.stable,
    growthRatio: bestIndividual.ratios.growth,
    satelliteRatio: bestIndividual.ratios.satellite,
    cashAmount: Math.round(totalAmount * bestIndividual.ratios.cash / 1000) * 1000,
    stableAmount: Math.round(totalAmount * bestIndividual.ratios.stable / 1000) * 1000,
    growthAmount: Math.round(totalAmount * bestIndividual.ratios.growth / 1000) * 1000,
    satelliteAmount: Math.round(totalAmount * bestIndividual.ratios.satellite / 1000) * 1000,
    totalAmount,
  };

  // 取整差额留在现金层
  const roundingDiff = totalAmount -
    (optimizedConfig.cashAmount + optimizedConfig.stableAmount +
     optimizedConfig.growthAmount + optimizedConfig.satelliteAmount);
  optimizedConfig.cashAmount += roundingDiff;

  return {
    optimizedConfig,
    optimizedRatios: bestIndividual.ratios,
    fitness: bestIndividual.fitness,
    sharpeRatio: bestIndividual.sharpeRatio,
    iterations: fitnessHistory.length,
    converged: fitnessHistory.length < config.generations,
  };
}

// ── 快速评估（不完整优化） ──────────────────────────────────────
/**
 * 对给定配置进行快速评估，返回优化建议
 */
export function evaluateConfig(
  kyc: CustomerKYC,
  config: PyramidConfig
): {
  sharpeRatio: number;
  expectedReturn: number;
  volatility: number;
  violations: string[];
  suggestions: string[];
} {
  const ratios = {
    cash: config.cashRatio,
    stable: config.stableRatio,
    growth: config.growthRatio,
    satellite: config.satelliteRatio,
  };

  const { sharpeRatio, expectedReturn, volatility } = calculateFitness(ratios, kyc);
  const violations: string[] = [];
  const suggestions: string[] = [];

  // 检查约束违反
  const minCashRatio = Math.max(0.10, (kyc.monthlyExpense * 3) / kyc.investableAssets);
  if (config.cashRatio < minCashRatio) {
    violations.push(`现金层比例${(config.cashRatio * 100).toFixed(1)}%低于最低要求${(minCashRatio * 100).toFixed(1)}%`);
    suggestions.push(`建议将现金层提高至${(minCashRatio * 100).toFixed(1)}%以上`);
  }

  if (kyc.age >= 65) {
    const equity = config.growthRatio + config.satelliteRatio;
    if (equity > 0.10) {
      violations.push(`65岁以上客户权益上限为10%，当前配置${(equity * 100).toFixed(1)}%超过限制`);
      suggestions.push(`建议将成长层和卫星层比例合计控制在10%以内`);
    }
    if (config.satelliteRatio > 0) {
      violations.push(`65岁以上客户不建议配置卫星层`);
      suggestions.push(`建议将卫星层资金转入稳健层`);
    }
  }

  if (kyc.dti >= 0.30 && config.cashRatio < 0.20) {
    violations.push(`DTI${(kyc.dti * 100).toFixed(0)}%超过30%警戒线，建议现金层≥20%`);
    suggestions.push(`建议将现金层提高至20%以上以应对负债压力`);
  }

  if (kyc.yearsToRetirement !== null && kyc.yearsToRetirement <= 5 && kyc.yearsToRetirement > 0) {
    if (config.growthRatio > 0.30) {
      violations.push(`距退休不足5年，成长层比例${(config.growthRatio * 100).toFixed(1)}%偏高`);
      suggestions.push(`建议将部分成长层资金转入稳健层`);
    }
  }

  return {
    sharpeRatio: Math.max(0, sharpeRatio),
    expectedReturn,
    volatility,
    violations,
    suggestions,
  };
}
