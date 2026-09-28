const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = 'C:\\Users\\WHB\\Desktop\\ICBC-WMP\\screenshots';

const PAGES = [
  { name: '01-home', url: '/', fullPage: true },
  { name: '02-login', url: '/login', fullPage: true },
  { name: '03-welcome', url: '/welcome', fullPage: true },
  { name: '04-customer', url: '/customer', fullPage: true },
  { name: '05-kyc-basic', url: '/kyc/basic', fullPage: true },
  { name: '06-kyc-finance', url: '/kyc/finance', fullPage: true },
  { name: '07-kyc-risk', url: '/kyc/risk', fullPage: true },
  { name: '08-kyc-goals', url: '/kyc/goals', fullPage: true },
  { name: '09-plan-DEMO001', url: '/plan/DEMO001', fullPage: true },
  { name: '10-products-DEMO001', url: '/plan/DEMO001/products', fullPage: true },
  { name: '11-confirm-DEMO001', url: '/plan/DEMO001/confirm', fullPage: true },
  { name: '12-reservation-test', url: '/reservation/test-id', fullPage: true },
];

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 注入 demo state
  await page.addInitScript(() => {
    const demo = {
      currentCustomer: {
        customerId: 'DEMO001',
        demoName: '王志强',
      },
      currentKYC: {
        customerId: 'DEMO001',
        age: 42,
        occupation: '企业高管',
        familyStructure: '已婚有孩',
        incomeStability: 'stable',
        hasChildren: true,
        childrenSummary: [{ name: '王子轩', age: 12 }],
        hasDependentParents: true,
        riskLevel: 'R3',
        riskScore: 65,
        kycDate: '2025-06-01',
        kycValidUntil: '2026-06-01',
        investableAssets: 800000,
        monthlyIncome: 50000,
        annualIncome: 600000,
        monthlyExpense: 18000,
        totalAssets: 1500000,
        totalLiabilities: 200000,
        mortgageMonthly: 8000,
        otherMonthlyDebt: 2000,
        emergencyFund: 60000,
        existingLifeInsurance: 500000,
        existingCriticalIllness: 300000,
        existingMedicalInsurance: true,
        hasInsurance: true,
        investmentYears: 8,
        productsOwned: ['货币基金', '债券基金', '股票'],
        yearsToRetirement: 18,
        retirementAge: 60,
        dti: 0.25,
        goals: ['退休规划', '子女教育', '资产增值'],
      },
      tierResult: {
        finalTier: 'L2',
        tierName: '私银标准',
        equityCap: 0.6,
        confidence: 0.92,
        classificationPath: ['Q1 年收入 > 50万', 'Q2 流动资产 80万', '→ L2 私银标准'],
        adjustments: [
          { dimension: '风险等级', change: 'R3 → R3', reason: '综合评分匹配' },
        ],
      },
      pyramidConfig: {
        totalAmount: 800000,
        cashRatio: 0.20,
        stableRatio: 0.30,
        growthRatio: 0.40,
        satelliteRatio: 0.10,
        cashAmount: 160000,
        stableAmount: 240000,
        growthAmount: 320000,
        satelliteAmount: 80000,
      },
      planItems: [
        { itemId: '1', productId: 'P001', allocationAmount: 80000, product: { productName: '稳健理财一号', issuer: '工银理财', riskLevel: 'R2', returnType: '固收+' } },
        { itemId: '2', productId: 'P002', allocationAmount: 160000, product: { productName: '私银专属债基', issuer: '工银理财', riskLevel: 'R2', returnType: '固收' } },
        { itemId: '3', productId: 'P003', allocationAmount: 200000, product: { productName: '精选混合基金', issuer: '工银基金', riskLevel: 'R3', returnType: '混合' } },
        { itemId: '4', productId: 'P004', allocationAmount: 120000, product: { productName: '科技成长混合', issuer: '工银基金', riskLevel: 'R4', returnType: '权益' } },
        { itemId: '5', productId: 'P005', allocationAmount: 80000, product: { productName: '卫星策略·量化', issuer: '工银资管', riskLevel: 'R4', returnType: '另类' } },
        { itemId: '6', productId: 'P006', allocationAmount: 160000, product: { productName: '现金管理产品', issuer: '工银理财', riskLevel: 'R1', returnType: '现金' } },
      ],
      reservation: null,
      kycDirty: false,
      planCustomized: false,
      currentStep: 'goals',
      stepsDone: ['basic', 'finance', 'risk', 'goals'],
    };
    localStorage.setItem('icbc-app-state', JSON.stringify(demo));
  });

  for (const p of PAGES) {
    try {
      console.log(`> ${p.name}: ${BASE}${p.url}`);
      await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: p.fullPage });
    } catch (e) {
      console.log(`  ERR: ${e.message}`);
    }
  }
  await browser.close();
  console.log('done');
})();