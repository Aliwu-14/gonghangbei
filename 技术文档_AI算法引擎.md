# ICBC 智能财富管理平台 - AI 算法引擎技术文档

> **项目路径**：`C:\Users\WHB\Desktop\ICBC-WMP\ICBC-WMP`
> **最后更新**：2026-09-22
> **技术栈**：Next.js 14 + TypeScript + DeepSeek API + 纯 SVG 可视化

---

## 目录

1. [系统架构总览](#1-系统架构总览)
2. [Step 1 · LLM Client 与 Function Calling](#2-step-1-llm-client-与-function-calling)
3. [Step 2 · RAG 知识库检索引擎](#3-step-2-rag-知识库检索引擎)
4. [Step 3 · K-Means 真实聚类与客户池](#4-step-3-k-means-真实聚类与客户池)
5. [Step 4 · Explainable AI 可视化](#5-step-4-explainable-ai-可视化)
6. [核心算法模块详解](#6-核心算法模块详解)
7. [数据结构与类型定义](#7-数据结构与类型定义)
8. [文件结构索引](#8-文件结构索引)

---

## 1. 系统架构总览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (Next.js)                      │
│  /plan/[planId] 方案详情页 / kyc/* KYC 流程 / login 登录   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI Advisor Panel (React)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │🧠 AI决策 │ │🎯 遗传   │ │📊 蒙特   │ │👥 K-Means│  │
│  │  可解释  │ │算法优化  │ │卡洛模拟  │ │  聚类    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │              │             │              │         │
│       └──────────────┴─────────────┴──────────────┘         │
│                          │                                   │
│                    💬 AI 对话投顾                            │
│              (DeepSeek + RAG + Function Calling)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                   ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│   LLM 层         │ │  算法引擎层   │ │  RAG 知识库层        │
│  DeepSeek API   │ │              │ │                      │
│  DeepseekClient │ │ DualTree     │ │ KnowledgeBase        │
│  FunctionTools  │ │ Pyramid      │ │ EmbeddingClient      │
│  WealthAdvisor  │ │ Compliance   │ │ RAGEngine            │
│                 │ │ GeneticOpt   │ │ (TF-IDF 向量化)      │
│                 │ │ MonteCarlo   │ │                      │
│                 │ │ KMeans       │ │                      │
└─────────────────┘ └──────────────┘ └──────────────────────┘
         │                 │                   │
         └─────────────────┴───────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (Mock Data)                        │
│  demoCustomers (8个) | demoKYC | demoProducts (100+)      │
│  SyntheticCustomerPool (220个真实分布样本)                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型说明

| 模块 | 选型 | 原因 |
|------|------|------|
| **LLM** | DeepSeek Chat API | 低成本、高中文理解能力、支持 Function Calling |
| **Embedding** | TF-IDF（本地） | 无需外部 API、零成本、离线可用、金融术语效果好 |
| **聚类** | K-Means++ | 经典无监督算法、可解释性强、适合客户分层 |
| **可视化** | 纯 SVG + CSS | 零依赖、答辩友好、易于定制 |
| **前端框架** | Next.js 14 App Router | SSR/SSG 灵活、React 生态丰富 |

---

## 2. Step 1 · LLM Client 与 Function Calling

### 2.1 核心文件

| 文件 | 功能 |
|------|------|
| `src/lib/llm/deepseek-client.ts` | DeepSeek API 客户端封装 |
| `src/lib/llm/function-tools.ts` | Function Calling 工具定义（5个函数） |
| `src/lib/llm/wealth-advisor.ts` | 业务编排层：对话上下文、工具调度、结果合成 |
| `src/lib/llm/types.ts` | LLM 消息类型定义 |
| `src/lib/llm/llm-advisor.ts` | 规则匹配型问答（非 LLM） |

### 2.2 DeepSeek 客户端

位于 `src/lib/llm/deepseek-client.ts`，提供统一的 API 封装：

```typescript
// 消息格式
interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// 核心接口
interface DeepSeekClient {
  chat(messages: LLMMessage[], options?: ChatOptions): Promise<ChatResponse>;
}

// ChatOptions
interface ChatOptions {
  tools?: ToolDefinition[];   // Function Calling 工具定义
  temperature?: number;        // 0-2，默认 0.7
  max_tokens?: number;         // 最大生成 token 数
}
```

### 2.3 Function Calling 工具

位于 `src/lib/llm/function-tools.ts`，定义了 5 个工具函数：

#### 工具 1：`query_knowledge_base`
查询金融知识问答知识库。

```typescript
{
  name: 'query_knowledge_base',
  description: '查询金融知识问答知识库，回答关于DTI、金字塔配置、夏普比率等概念的问题',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: '查询主题，如"DTI是什么"、"夏普比率"等'
      }
    },
    required: ['topic']
  }
}
```

#### 工具 2：`run_genetic_optimization`
使用遗传算法优化资产配置比例。

```typescript
{
  name: 'run_genetic_optimization',
  description: '使用遗传算法对当前金字塔配置进行二次优化',
  parameters: { type: 'object', properties: {} }
}
```

#### 工具 3：`run_monte_carlo_simulation`
蒙特卡洛模拟评估方案稳健性。

```typescript
{
  name: 'run_monte_carlo_simulation',
  description: '运行蒙特卡洛模拟，评估配置方案在不同市场情景下的表现',
  parameters: { type: 'object', properties: {} }
}
```

#### 工具 4：`run_kmeans_clustering`
K-Means 客户聚类分析。

```typescript
{
  name: 'run_kmeans_clustering',
  description: '对客户进行K-Means聚类分析，找到相似客户群体',
  parameters: { type: 'object', properties: {} }
}
```

#### 工具 5：`explain_current_config`
解释当前配置方案。

```typescript
{
  name: 'explain_current_config',
  description: '解释当前金字塔配置方案的设计逻辑和约束调整',
  parameters: { type: 'object', properties: {} }
}
```

### 2.4 对话流程

```
用户输入
  │
  ▼
┌─────────────────────┐
│ 1. 构建系统提示词     │  客户画像 + 当前配置 + RAG 上下文
│    buildSystemPrompt() │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 2. 首次 LLM 调用     │  messages + tools
│    client.chat()    │  → 响应 + tool_calls（可选）
└────────┬────────────┘
         │
         ├─── 无 tool_calls ──→ 直接返回响应
         │
         ▼
┌─────────────────────┐
│ 3. 执行工具函数       │  Promise.all(tool_calls.map(executeToolCall))
│    executeToolCall() │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 4. 二次 LLM 调用     │  工具结果注入 messages
│    client.chat()    │  → 最终合成响应
└────────┬────────────┘
         │
         ▼
      返回 ChatResponse
```

### 2.5 系统提示词

```typescript
你是中国工商银行的智能财富规划顾问"智盈AI"。

**你的角色定位**：
- 专业但温暖，用通俗易懂的语言解释金融概念
- 基于客户的真实KYC数据和当前配置方案提供个性化建议
- 涉及计算时调用专业算法引擎，不要自己编造数字

**当前客户画像**：
- 姓名：XXX
- 年龄：XX岁，职业：XXXX
- 资产：可投资资产 XX万元
- 风险等级：R3（平衡型）
- DTI：XX%

**当前配置方案**：
- 现金层：XX%（XX万元）
- 稳健层：XX%（XX万元）
- 成长层：XX%（XX万元）
- 卫星层：XX%（XX万元）

**重要约束**：
1. ❌ 不得承诺具体收益率或保本保息
2. ❌ 不得推荐具体股票代码、基金代码
3. ✅ 必须强调"投资有风险，理财需谨慎"
```

---

## 3. Step 2 · RAG 知识库检索引擎

### 3.1 核心文件

| 文件 | 功能 |
|------|------|
| `src/lib/llm/knowledge-base.ts` | 知识库文档（16篇，5大分类） |
| `src/lib/llm/embedding-client.ts` | TF-IDF 向量化客户端 |
| `src/lib/llm/rag-engine.ts` | RAG 检索引擎（余弦相似度） |
| `src/lib/llm/rag-init.ts` | 客户端初始化逻辑 |

### 3.2 知识库文档结构

```typescript
interface KnowledgeDocument {
  id: string;              // 唯一标识，如 'dual-tree-001'
  title: string;           // 可读标题
  content: string;          // 完整内容（markdown 格式）
  category: 'RULE' | 'CONCEPT' | 'CONSTRAINT' | 'PRODUCT' | 'RISK';
  source: string;           // 来源模块：dual-tree | pyramid | compliance | ...
  tags: string[];           // 标签数组
  embedding?: number[];    // 向量表示（初始化时生成）
}
```

### 3.3 知识库内容（16篇）

| 分类 | 篇数 | 覆盖主题 |
|------|------|----------|
| **RULE** | 4篇 | 双轨树分层规则、降档逻辑、产品适当性、过滤规则 |
| **CONCEPT** | 7篇 | DTI、夏普比率、安全提取率、蒙特卡洛、遗传算法、K-Means、金字塔四层模型 |
| **CONSTRAINT** | 1篇 | 现金层约束调整（流动性、DTI、退休临近） |
| **PRODUCT** | 0篇 | （预留） |
| **RISK** | 0篇 | （预留） |

### 3.4 TF-IDF 向量化

由于 DeepSeek 不提供公开的 Embedding API，采用本地 TF-IDF 方案：

```typescript
class EmbeddingClient {
  // 1. 初始化：构建词汇表 + 计算 IDF
  initialize(corpus: string[]): void;

  // 2. 将文本转为向量
  embed(text: string): number[];

  // 3. 批量转换
  embedBatch(texts: string[]): number[][];

  // 4. 计算两段文本的相似度
  similarity(textA: string, textB: string): number;
}

// 余弦相似度
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}
```

**TF-IDF 计算公式**：
- **TF(t,d)** = 词 t 在文档 d 中出现的次数 / 文档 d 总词数
- **IDF(t)** = log(总文档数 / 包含词 t 的文档数)
- **TF-IDF(t,d)** = TF(t,d) × IDF(t)

### 3.5 RAG 检索流程

```
用户问题
  │
  ▼
┌──────────────────────────────────┐
│ 1. 计算用户问题的 TF-IDF 向量      │
│    embeddingClient.embed(query)  │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ 2. 与所有文档计算余弦相似度        │
│    cosineSimilarity(query_vec,   │
│      doc.embedding)             │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ 3. 按相似度降序排列，返回 topK    │
│    results.sort(...).slice(0,2) │
└──────────────┬───────────────────┘
               │
               ▼
      返回最相关的 2 篇文档
```

### 3.6 双重 RAG 策略

**策略 1：自动注入（每轮对话）**

```typescript
// wealth-advisor.ts: chatWithWealthAdvisor()
const ragResults = await searchKnowledge(userMessage, 2);
if (ragResults[0].score > 0.1) {
  systemPrompt += `\n\n**知识库检索结果**：\n${ragContext}`;
}
```

**策略 2：工具调用（按需）**

```typescript
// query_knowledge_base 工具函数
const results = await searchKnowledge(topic, 2);
return results[0].document.content;
```

### 3.7 为什么选择 TF-IDF 而非真实 Embedding API

| 维度 | TF-IDF | 真实 Embedding API |
|------|---------|-------------------|
| **成本** | ✅ 零成本 | ❌ 每次调用收费 |
| **速度** | ✅ < 100ms 本地计算 | ❌ 需网络请求 3-5s |
| **离线** | ✅ 完全离线 | ❌ 依赖外网 |
| **语义理解** | ⚠️ 基于词频 | ✅ 深度语义理解 |
| **适用场景** | ✅ 专业术语（金融） | ✅ 通用场景 |

**结论**：TF-IDF 对金融专业术语效果良好（词频即语义），适合答辩演示 + 本地部署。未来可无缝升级到 OpenAI/DashScope Embedding，只需修改 `embedding-client.ts`。

---

## 4. Step 3 · K-Means 真实聚类与客户池

### 4.1 核心文件

| 文件 | 功能 |
|------|------|
| `src/lib/algorithm/kmeans-clustering.ts` | K-Means++ 算法核心实现 |
| `src/lib/algorithm/kmeans-service.ts` | 聚类服务封装（缓存 + 相似度） |
| `src/lib/algorithm/customer-pool.ts` | 合成客户池生成器（220样本） |

### 4.2 合成客户池设计

#### 7 大客户原型

| 客群 | 年龄 | 资产 | 收入 | 风险 | 占比 |
|------|------|------|------|------|------|
| **银发稳健族** | 65-80 | 20-80万 | 8-30万 | R2 | 10% |
| **大众稳健族** | 22-35 | 3-18万 | 8-25万 | R2 | 18% |
| **大众进取族** | 22-32 | 5-19万 | 12-30万 | R4 | 10% |
| **均衡成长族** | 30-50 | 20-49万 | 15-40万 | R3 | 22% |
| **进取成长族** | 28-45 | 20-49万 | 25-80万 | R4 | 12% |
| **高净值预备族** | 40-60 | 50-99万 | 40-120万 | R3 | 18% |
| **高净值族** | 45-70 | 100-1500万 | 80-500万 | R4 | 10% |

#### 8 维特征向量

```typescript
function extractCustomerFeatures(kyc: CustomerKYC): number[] {
  return [
    assetsNormalized,     // 资产规模（归一化 0-1，100万满分）
    ageNormalized,        // 年龄（归一化 0-1，18-80岁）
    incomeNormalized,     // 收入水平（归一化 0-1，100万满分）
    dtiNormalized,        // DTI（0-1）
    surplusRate,           // 月结余率
    coverageRatio,        // 保障覆盖率（寿险/年收入，3倍满分）
    experienceNormalized,  // 投资经验（10年满分）
    riskNormalized,       // 风险等级（R1=1, R5=5，归一化）
  ];
}
```

#### 可复现随机数

```typescript
// Seedable PRNG（线性同余生成器）
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// 示例
const pool = generateSyntheticCustomerPool(220, seed = 42);
```

### 4.3 K-Means++ 算法流程

```
输入：220 个客户特征向量，k = 6
输出：6 个簇 + 质心 + 轮廓系数

Step 1: 初始化质心（K-Means++）
  → 第一个质心：随机选择
  → 后续质心：按距离平方的概率分布选择（避免局部最优）

Step 2: 分配样本
  → 每个样本分配到最近的质心（欧氏距离）

Step 3: 更新质心
  → 每个簇的均值作为新质心

Step 4: 检查收敛
  → inertia 变化 < 0.001 或达到最大迭代次数

Step 5: 计算 Silhouette Score
  → 评估聚类质量
```

### 4.4 Silhouette Score（轮廓系数）

```typescript
// 单个样本的轮廓系数
s(i) = (b(i) - a(i)) / max(a(i), b(i))
// a(i)：同簇内平均距离
// b(i)：最近异簇平均距离

// 质量分级
function classifySilhouetteQuality(score: number) {
  if (score < 0.30) return 'POOR';     // 较差
  if (score < 0.50) return 'FAIR';     // 一般
  if (score < 0.70) return 'GOOD';     // 良好
  return 'EXCELLENT';                   // 优秀
}
```

### 4.5 服务封装

```typescript
// 单例 + 缓存
let cachedPoolCluster: EnhancedClusterResult | null = null;

export function clusterCustomerPool(k: number = 6): EnhancedClusterResult {
  if (cachedPoolCluster && cachedPoolCluster.k === k) {
    return cachedPoolCluster; // 命中缓存
  }
  // 真实计算
  const clusters = kMeansClustering(pool, { k, maxIterations: 100 });
  const silhouetteScore = calculateSilhouetteScore(pool, clusters, 50);
  cachedPoolCluster = { clusters, silhouetteScore, ... };
  return cachedPoolCluster;
}

export function findSimilarCustomersForUser(
  targetKyc: CustomerKYC,
  topN: number = 5
): SimilarityRecommendation {
  const pool = getCombinedCustomerPool(); // 220 个样本
  const similar = findSimilarCustomers(targetKyc, pool, topN);
  const confidence = assessConfidence(targetKyc, similar, new Map());
  return { similarCustomers: similar, confidence, ... };
}
```

### 4.6 置信度评估

```typescript
interface ConfidenceAssessment {
  baseConfidence: number;       // 0.70（基础）
  similarityBoost: number;        // 相似客户相似度带来的提升
  experienceBoost: number;       // 投资经验带来的提升
  finalConfidence: number;      // 最终置信度（0.50-0.95）
  confidenceLevel: 'low' | 'medium' | 'high';
}

// 置信度计算
finalConfidence = min(0.95, max(0.50,
  baseConfidence
  + similarityBoost    // avgSimilarity × 0.15
  + experienceBoost   // 5年+: +0.10, 2-5年: +0.05, <1年: -0.05
));
```

---

## 5. Step 4 · Explainable AI 可视化

### 5.1 核心文件

| 文件 | 功能 |
|------|------|
| `src/components/xai-visualizations.tsx` | 四大 XAI 可视化组件（~600行） |

### 5.2 组件 1：DualTreeViz（双轨决策树）

展示客户分层的完整决策路径（主树 + 子树）。

```tsx
<DualTreeViz tierResult={tierResult} />
```

**数据结构**：

```typescript
interface TierResult {
  baseTier: TierId;           // 基础分层
  finalTier: TierId;          // 最终分层
  tierName: string;           // 分层名称
  equityCap: number;           // 权益上限
  classificationPath: string[]; // 分类路径
  adjustments: TierAdjustment[]; // 调整项
}

interface TierAdjustment {
  dimension: string;           // 维度名称
  ruleCode: string;            // 规则编码
  change: string;             // 变化描述
  reason: string;             // 调整原因
  cashDelta: number;
  stableDelta: number;
  growthDelta: number;
  satelliteDelta: number;
}
```

**视觉效果**：

```
主树路径：资产规模粗分
[年龄≥65岁] → [→ A1 银发稳健族]
  权益上限 10% | 基础分层 A1 | 最终分层 A1

📌 65岁以上（SUB_AGE_65）：权益上限降至10% [硬约束]
  依据：适当性办法第18条特别保护对象
```

### 5.3 组件 2：ConstraintChainViz（约束链路）

展示金字塔配置的约束调整过程。

```tsx
<ConstraintChainViz config={config} />
```

**视觉效果**：

```
现金层   ████████████░░░░░░░░░░░  15.0%
稳健层   ████████████████████████  45.0%
成长层   ████████████████████░░░░  30.0%
卫星层   ██████████░░░░░░░░░░░░░  10.0%

调整链路：
  成长层 → → (-10%) 稳健层    65岁以上权益上限10%约束
  卫星层 → → (-10%) 系统      65岁以上禁止卫星层
```

### 5.4 组件 3：GAEvolutionViz（适应度进化曲线）

展示遗传算法的进化过程。

```tsx
<GAEvolutionViz gaResult={gaResult} />
```

**数据依赖**（新增字段）：

```typescript
// genetic-optimizer.ts
interface GAOptimizationResult {
  // ... 原有字段 ...
  fitnessHistory: number[]; // 新增：每代的最佳适应度
}
```

**SVG 实现**：

```typescript
function buildSVGPath(
  history: number[],
  width: number,
  height: number,
  padding: number
): { path: string; points: {x: number, y: number}[] } {
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((v, i) => ({
    x: padding + (i / (history.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return { path, points };
}
```

**视觉效果**：

```
适应度进化曲线
┌──────────────────────────────────────┐
│  /\      /\                          │
│ /  \    /  \    /\                  │
│/    \  /    \  /  \    /\    ●     │  ← 曲线 + 面积填充
│     \/      \/    \  /              │
│                 \/                   │
└──────────────────────────────────────┘
✓ 已收敛 | 38 代
初始 0.42 → 优化后 0.56 (+33.3%)
```

### 5.5 组件 4：MonteCarloViz（耗尽年龄分布）

展示资产在不同市场情景下的耗尽年龄分布。

```tsx
<MonteCarloViz scenario={scenarioResult} />
```

**数据依赖**（新增字段）：

```typescript
// monte-carlo.ts
interface ScenarioAnalysis {
  optimistic: {
    annualReturn: number;
    endingBalance: number;
    endingAge: number;  // 新增：资产耗尽年龄
    description: string;
  };
  base: { endingAge: number; ... };
  pessimistic: { endingAge: number; ... };
}
```

**视觉效果**：

```
资产耗尽年龄分布
┌──────────────────────────────────────┐
│  ▓▓                                  │
│  ▓▓▓▓     ████                      │  ← 红→绿渐变
│  ▓▓▓▓▓▓   ████████  ░░░░           │     低年龄耗尽风险高
│  ▓▓▓▓▓▓▓▓ ████████████████ ░░░░░░░  │
└──────────────────────────────────────┘
50        70        90        100 年龄

乐观情景        基准情景        悲观情景
100岁余28万     100岁余12万     82岁耗尽
```

### 5.6 AIAdvisorPanel 集成

新增 **🧠 AI决策可解释** Tab，整合全部四种可视化：

```
tabs = [
  { key: 'xai',        label: '🧠 AI决策可解释' },
  { key: 'ga',         label: '🎯 遗传算法优化' },
  { key: 'montecarlo', label: '📊 蒙特卡洛模拟' },
  { key: 'kmeans',     label: '👥 客户聚类分析' },
  { key: 'chatbot',    label: '💬 AI对话投顾' },
];
```

---

## 6. 核心算法模块详解

### 6.1 双轨二叉决策树（dual-tree.ts）

```
主树（资产规模粗分）
┌────────────────────────────────────────────┐
│ age ≥ 65?                                  │
│  ├─ 是 → A1 银发稳健族                     │
│  └─ 否                                     │
│     ├─ assets < 20万?                     │
│     │  ├─ risk R1/R2 → B1-1 大众稳健族   │
│     │  └─ risk R3-R5 → B1-2 大众进取族   │
│     ├─ assets < 50万?                     │
│     │  ├─ risk R1/R2 → B2-1 均衡成长族   │
│     │  └─ risk R3-R5 → B2-2 进取成长族   │
│     ├─ assets < 100万? → B3 高净值预备族  │
│     └─ assets ≥ 100万? → B4 高净值族      │
└────────────────────────────────────────────┘

子树（五维合规并行校验）
1. 老年保护（65+）：权益上限 → 10%
2. 收入不稳定（volatile）：权益上限 -10%，降一档
3. 高负债（DTI ≥ 40%）：权益上限 -15%，降一档
4. 投资经验不足（< 1年）：权益上限 -10%
5. 风险过低（资产 ≥ 50万 且 R1/R2）：降档

合并策略：主树 × 子树 = 保守交集（向更稳健方向调整）
```

### 6.2 金字塔配置引擎（pyramid.ts）

四层配置模型，根据分层基础比例 + 约束调整：

```
基础比例（B2-1 均衡成长族示例）：
  现金层 15% | 稳健层 45% | 成长层 30% | 卫星层 10%

约束修正（按优先级）：
  1. 流动性硬约束（最优先）
     → 现金 ≥ 3个月支出 / 可投资资产
     → 优先从成长层扣减，再扣稳健层

  2. 65岁以上权益上限
     → 成长层 + 卫星层 ≤ 10%
     → 超额部分转入稳健层

  3. DTI ≥ 30% 提高流动性
     → 现金层提升至 ≥ 20%
     → 从成长层扣减

调整结果：
  现金层 18% (+3%) | 稳健层 52% (+7%) | 成长层 22% (-8%) | 卫星层 8% (-2%)
```

### 6.3 遗传算法（genetic-optimizer.ts）

```
参数配置：
  种群大小: 100 | 进化代数: 50 | 变异率: 0.05 | 精英比例: 0.2

适应度函数：
  fitness = SharpeRatio - 约束惩罚

约束惩罚项：
  1. 65岁以上卫星层 > 0 → +5
  2. 65岁以上权益 > 10% → +3
  3. 流动性不足 → +(缺口 × 5)
  4. 退休临近（5年内）成长层 > 30% → +(超额 × 3)
  5. 权益上限违反 → +(超额 × 2)

进化流程：
  初始化种群 → 评估适应度 → 选择（精英保留 + 轮盘赌）
    → 交叉（加权平均） → 变异（随机扰动 ±3%）
    → 重复直到收敛或达到最大代数
```

### 6.4 蒙特卡洛模拟（monte-carlo.ts）

```
参数：
  模拟次数: 10,000 次 | 模拟时长: 至 100岁

三层情景：
  乐观情景: expectedReturn + 2σ（高市场收益）
  基准情景: expectedReturn（历史期望）
  悲观情景: expectedReturn - 2σ（低市场收益）

每年模拟：
  1. 组合收益: balance × (1 + annualReturn)
  2. 生活支出: monthlyExpense × 12 × (1 + inflation)^year
  3. 社保养老金: estimateAnnualPension(kyc)
  4. 净提取: max(0, 支出 - 养老金)
  5. 余额更新: newBalance = balance +收益 - 净提取

输出指标：
  - 成功率：资产撑到100岁的模拟比例
  - 预期耗尽年龄：在失败场景中的平均耗尽年龄
  - 5%分位数：95%的场景下能保持的最低余额
```

---

## 7. 数据结构与类型定义

### 7.1 核心类型

```typescript
// 客户 KYC
interface CustomerKYC {
  kycId: string;
  customerId: string;
  age: number;
  occupation: string;
  incomeStability: 'stable' | 'moderate' | 'volatile';
  annualIncome: number;
  monthlyExpense: number;
  investableAssets: number;
  totalAssets: number;
  mortgageMonthly: number;
  otherMonthlyDebt: number;
  dti: number;
  investmentYears: number;
  riskLevel: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  riskScore: number;
  goals: string[];
  goalPriority: { goal: string; priority: number }[];
  hasInsurance: boolean;
  existingLifeInsurance: number;
  existingCriticalIllness: number;
  kycStatus: 'VALID' | 'INVALID' | 'EXPIRED';
  kycDate: string;
  kycValidUntil: string;
  dataSource: 'SYNTHETIC_DEMO' | 'SYNTHETIC_POOL';
}

// 金字塔配置
interface PyramidConfig {
  tierId: TierId;
  tierName: string;
  cashRatio: number;    // 0-1
  stableRatio: number;
  growthRatio: number;
  satelliteRatio: number;
  cashAmount: number;
  stableAmount: number;
  growthAmount: number;
  satelliteAmount: number;
  totalAmount: number;
  adjustments: Adjustment[];
}

// 分层结果
interface TierResult {
  baseTier: TierId;
  finalTier: TierId;
  tierName: string;
  equityCap: number;
  classificationPath: string[];
  adjustments: TierAdjustment[];
}
```

### 7.2 分层 ID 定义

```typescript
type TierId =
  | 'A1'       // 银发稳健族（65+）
  | 'B1-1'     // 大众稳健族（<20万，R1/R2）
  | 'B1-2'     // 大众进取族（<20万，R3-R5）
  | 'B2-1'     // 均衡成长族（20-50万，R1/R2）
  | 'B2-2'     // 进取成长族（20-50万，R3-R5）
  | 'B3'       // 高净值预备族（50-100万）
  | 'B4';      // 高净值族（≥100万）
```

---

## 8. 文件结构索引

```
src/
├── app/
│   ├── plan/[planId]/
│   │   ├── page.tsx            ← 方案详情页（集成 AIAdvisorPanel）
│   │   ├── confirm/page.tsx
│   │   └── products/page.tsx
│   ├── kyc/
│   │   ├── basic/page.tsx
│   │   ├── finance/page.tsx
│   │   ├── goals/page.tsx
│   │   └── risk/page.tsx
│   ├── login/page.tsx
│   └── welcome/page.tsx
│
├── components/
│   ├── AIAdvisorPanel.tsx     ← AI 投顾面板（5个 Tab）
│   ├── xai-visualizations.tsx  ← XAI 可视化（4个组件）
│   ├── PageBar.tsx
│   ├── Modal.tsx
│   └── ...
│
└── lib/
    ├── algorithm/
    │   ├── dual-tree.ts           ← 双轨决策树
    │   ├── pyramid.ts             ← 金字塔配置引擎
    │   ├── compliance.ts         ← 合规检查引擎
    │   ├── genetic-optimizer.ts   ← 遗传算法（新增 fitnessHistory）
    │   ├── monte-carlo.ts         ← 蒙特卡洛模拟（新增 endingAge）
    │   ├── kmeans-clustering.ts   ← K-Means 核心算法
    │   ├── kmeans-service.ts     ← K-Means 服务封装（新增）
    │   ├── customer-pool.ts       ← 合成客户池（新增）
    │   ├── cashflow.ts            ← 现金流计算
    │   ├── llm-advisor.ts        ← 规则匹配问答
    │   └── evaluation/
    │       ├── silhouette-score.ts
    │       ├── business-distance.ts
    │       └── ...
    │
    ├── llm/
    │   ├── deepseek-client.ts     ← DeepSeek API 客户端
    │   ├── function-tools.ts      ← Function Calling 工具定义
    │   ├── wealth-advisor.ts      ← 业务编排层
    │   ├── types.ts               ← LLM 消息类型
    │   ├── knowledge-base.ts      ← RAG 知识库文档（新增）
    │   ├── embedding-client.ts   ← TF-IDF 向量化（新增）
    │   ├── rag-engine.ts          ← RAG 检索引擎（新增）
    │   └── rag-init.ts            ← RAG 初始化（新增）
    │
    ├── mock/
    │   └── data.ts                ← 8个 demo 客户 + 100+ 产品
    │
    └── store.tsx                  ← 全局状态管理
```

---

## 附录 A：环境变量

```bash
# .env.local
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx
```

---

## 附录 B：构建与运行

```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 类型检查
npx tsc --noEmit
```

---

## 附录 C：四个步骤核心指标

| 指标 | Step 1 | Step 2 | Step 3 | Step 4 |
|------|--------|--------|--------|--------|
| **新增文件** | 5 个 | 4 个 | 2 个 | 1 个 |
| **新增代码** | ~400 行 | ~800 行 | ~460 行 | ~600 行 |
| **修改文件** | 2 个 | 1 个 | 3 个 | 4 个 |
| **知识库规模** | 0 篇 | 16 篇 | - | - |
| **客户池样本** | 8 个 | - | 220 个 | - |
| **可视化组件** | 0 个 | 0 个 | 0 个 | 4 个 |
| **构建状态** | ✅ | ✅ | ✅ | ✅ |

---

*文档版本：v1.0 | 最后更新：2026-09-22*
