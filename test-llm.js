// ============================================================
// LLM 功能测试脚本
// 验证 DeepSeek API 连接 + Function Calling 是否正常工作
// ============================================================

// 模拟一个简单的测试用例
const testKYC = {
  customerId: 'TEST-001',
  age: 35,
  occupation: '企业高管',
  annualIncome: 800000,
  investableAssets: 2000000,
  monthlyExpense: 30000,
  riskLevel: 'R3',
  investmentYears: 5,
  marriageStatus: '已婚',
  childrenCount: 1,
  hasRealEstate: true,
  hasMortgage: true,
  mortgageAmount: 1500000,
  dti: 0.25,
  retirementAge: 60,
  incomeStability: '稳定',
};

const testConfig = {
  tierId: 'B1',
  tierName: '成长进取族',
  cashRatio: 0.10,
  stableRatio: 0.30,
  growthRatio: 0.50,
  satelliteRatio: 0.10,
  cashAmount: 200000,
  stableAmount: 600000,
  growthAmount: 1000000,
  satelliteAmount: 200000,
  adjustments: [],
};

console.log('🧪 开始测试 LLM 集成...\n');

// 测试用例 1：普通咨询
console.log('📋 测试用例 1: 普通咨询');
console.log('用户问题："我想了解一下什么是金字塔配置模型？"');
console.log('预期：LLM 应该调用 query_knowledge_base 工具\n');

// 测试用例 2：优化请求
console.log('📋 测试用例 2: 优化请求');
console.log('用户问题："我想让资产配置收益更高一些，能帮我优化吗？"');
console.log('预期：LLM 应该调用 run_genetic_optimization 工具\n');

// 测试用例 3：风险评估
console.log('📋 测试用例 3: 风险评估');
console.log('用户问题："我的退休方案能撑到100岁吗？会不会半路用光？"');
console.log('预期：LLM 应该调用 run_monte_carlo_simulation 工具\n');

// 测试用例 4：方案解释
console.log('📋 测试用例 4: 方案解释');
console.log('用户问题："为什么给我分配了这么多现金层？"');
console.log('预期：LLM 应该调用 explain_current_config 工具\n');

console.log('✅ 测试用例准备完成！');
console.log('\n📝 实际测试步骤：');
console.log('1. 访问 http://localhost:3000');
console.log('2. 使用测试账号登录（13800001001 / 123456）');
console.log('3. 完成 KYC 并生成方案');
console.log('4. 在"AI 对话"页面输入上述测试问题');
console.log('5. 观察 Network 面板的 API 调用和 Function Calling 响应');
console.log('\n🔍 验证要点：');
console.log('- 检查浏览器控制台是否有错误');
console.log('- 检查 LLM 是否正确识别意图并调用工具');
console.log('- 检查工具执行结果是否正确返回');
console.log('- 检查 LLM 的最终回复是否自然流畅');
