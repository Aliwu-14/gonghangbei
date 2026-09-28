# 智盈 ICBC-WMP · AI技术升级方案

## 0. 现状诊断（先说实话）

扫描了 `AIAdvisorPanel.tsx`、`llm-advisor.ts`、`kmeans-clustering.ts`、`genetic-optimizer.ts`、`monte-carlo.ts` 后，结论是：

你们的"AI"目前分两类：

1. **真算法，但不是AI**：遗传算法优化、蒙特卡洛模拟、K-Means聚类——这些是扎实的运筹学/统计方法，写得也规范（有适应度函数、约束校验、K-Means++初始化），但**评委一眼能看出这是经典算法，不是"AI"**。
2. **写成AI，但是假的**：
   - `llm-advisor.ts` 的"意图识别"是关键词匹配（`lowerQuery.includes('退休')`），不是NLU/NLP模型。
   - `AIAdvisorPanel.tsx` 里 K-Means 的"聚类结果"是 `Math.random()` 生成的假数据（第104-110行），相似客户也是随机生成的（第129-139行）。
   - 所有"AI计算"外面包了一层 `setTimeout` 假装在算（第59、80、101行），实际是同步的固定逻辑。

**这是致命的**：如果评委问一句"你们的K-Means跑在什么数据上？置信度评估的相似客户是真实检索出来的吗？"，现场答不上来会非常尴尬。别的队伛如果真接了大模型API，一对比高下立判。

---

## 1. 核心策略：不是"加更多算法"，而是"让现有算法变真实 + 接入一个真正的LLM大脑"

技术竞赛评审通常按这个顺序打分：**技术深度 > 技术真实性 > 技术新颖性 > 数量**。所以优先级是：

1. 先把假数据变真（K-Means跑在真实客户库上，别再random）
2. 接入一个真正的大模型API做对话投顾的大脑（这是"AI元素"里最容易被评委感知到的部分）
3. 用RAG（检索增强生成）把你们的金融规则、合规知识库接进大模型，做出"懂业务的AI"而不是"通用聊天机器人"
4. 补一个评委喜欢的"可解释AI"展示层——不仅要AI给答案，还要展示AI为什么这么想（这是金融合规场景的刚需，也是技术亮点）

---

## 2. 具体技术升级项（按ROI排序）

### 2.1 【最高优先级】接入真实LLM API，替换关键词匹配

现状 `classifyIntent()` 是 if-else 关键词匹配，这是最容易被识破、也最容易升级的部分。

**方案**：接入阿里云 DashScope（Qwen）或 DeepSeek API，采用 **Function Calling + 结构化输出** 模式，而不是简单的"问答"：

```typescript
// src/lib/algorithm/llm-advisor-v2.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 用 Function Calling 让大模型"调用"你们已有的算法引擎，
// 而不是让大模型自己瞎编财务计算 —— 这一点很重要：
// 大模型负责"理解意图+组织语言"，你们的算法引擎负责"精确计算"，
// 分工明确，既真实可控，又能在答辩时讲清楚架构分层。
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'run_ga_optimization',
      description: '当用户想要优化资产配置比例、提升收益风险比时调用',
      parameters: {
        type: 'object',
        properties: {
          riskPreference: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_monte_carlo',
      description: '当用户想知道退休资产能否撑到多少岁、方案是否稳健时调用',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_knowledge_base',
      description: '当用户询问金融概念（DTI、夏普比率、适当性等）时调用',
      parameters: {
        type: 'object',
        properties: { topic: { type: 'string' } },
      },
    },
  },
];

export async function chatWithAdvisor(
  userMessage: string,
  history: ChatMessage[],
  kyc: CustomerKYC,
  config: PyramidConfig
): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(kyc, config); // 把KYC和当前配置注入上下文

  const response = await client.chat.completions.create({
    model: 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ],
    tools,
    tool_choice: 'auto',
  });

  const msg = response.choices[0].message;

  // 大模型决定调用哪个真实算法引擎
  if (msg.tool_calls?.length) {
    const results = await Promise.all(
      msg.tool_calls.map((call) => dispatchToolCall(call, kyc, config))
    );
    // 把工具执行结果再喂回大模型，让它生成自然语言总结
    return await synthesizeFinalAnswer(msg, results, client);
  }

  return { message: msg.content ?? '', intent: 'CHITCHAT' };
}
```

**为什么这个设计在答辩时很有说服力**：
- 你可以画一张架构图："大模型只做意图理解和语言生成，所有金融计算都由确定性算法引擎完成" —— 这直接回应金融行业对大模型"幻觉"风险的顾虑，展示你们理解AI落地在强合规行业的关键约束。
- Function Calling 本身就是2024-2025年最主流的AI Agent架构范式，比单纯的Prompt工程更有技术含量。

**成本/风险**：DashScope Qwen-Plus 价格很低（约0.004元/千token），演示阶段几乎零成本。需要准备网络环境可访问的API Key，注意不要把Key提交到仓库（用`.env.local` + `.gitignore`）。

---

### 2.2 【次高优先级】RAG知识库：让AI"懂你们的业务规则"，不是通用聊天

现状的 `KNOWLEDGE_QA` 是硬编码的5条问答（DTI、金字塔、夏普比率等），这既不能扩展，也体现不出"检索增强"的技术含量。

**升级方案**：把你们已有的规则文档（双轨决策树规则、13条合规规则、金字塔约束逻辑）做成向量化知识库，用RAG检索后再喂给大模型：

```typescript
// src/lib/algorithm/rag-engine.ts
import { OpenAI } from 'openai';

// 用轻量级方案：不需要引入向量数据库，
// 客户量级不大，用内存余弦相似度检索即可，
// 这也是"够用就好"原则——评委看的是思路，不是集群规模
interface KnowledgeChunk {
  id: string;
  text: string;
  embedding: number[];
  source: string; // 来自哪个规则模块，如 'dual-tree' | 'compliance' | 'pyramid'
}

let knowledgeBase: KnowledgeChunk[] = [];

export async function buildKnowledgeBase(client: OpenAI) {
  const docs = [
    { source: 'dual-tree', text: '双轨分层规则：主树按资产规模分层...' },
    { source: 'compliance', text: '合规规则：产品风险等级不得超过客户风险承受能力...' },
    { source: 'pyramid', text: '金字塔约束：DTI超过30%时提高现金层比例...' },
    // 可以直接把 dual-tree.ts / compliance.ts 里的注释和规则描述灌进来
  ];

  const embeddings = await client.embeddings.create({
    model: 'text-embedding-v2',
    input: docs.map((d) => d.text),
  });

  knowledgeBase = docs.map((d, i) => ({
    id: `chunk_${i}`,
    text: d.text,
    embedding: embeddings.data[i].embedding,
    source: d.source,
  }));
}

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (normA * normB);
}

export async function retrieveContext(query: string, client: OpenAI, topK = 3): Promise<string[]> {
  const queryEmbed = await client.embeddings.create({
    model: 'text-embedding-v2',
    input: query,
  });
  const qVec = queryEmbed.data[0].embedding;

  return knowledgeBase
    .map((chunk) => ({ chunk, score: cosineSim(qVec, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk.text);
}
```

这套RAG可以直接接进2.1的 `buildSystemPrompt`：先检索相关规则片段，再拼进system prompt，让大模型的回答"有理有据"，而且能标注信息来源（例如"根据合规规则库·适当性条款"）。

**这一点的价值在于**：现场演示时可以直接问一个知识库里的边缘问题（比如"DTI超过30%但我是私行客户会怎样"），展示AI不是死记硬背5条问答，而是真的在检索你们的业务规则库——这是区分"套壳ChatGPT"和"垂直领域AI"的关键证据。

---

### 2.3 K-Means聚类去假：接入真实的模拟客户库

`AIAdvisorPanel.tsx` 第104-139行的聚类结果和相似客户是 `Math.random()` 生成的。这个问题最好修——评委只要多点两次"刷新"按钮，看到数字每次都不一样、且毫无逻辑关联，就会发现是假的。

**方案**：
1. 用 `readme.md` 里提到的Demo客户数据（如果数量不够，用脚本批量生成200-500个符合分布规律的模拟KYC样本，写进 `src/lib/mock/customers.ts`）。
2. `handleKMeansDemo` 真正调用已经写好的 `kMeansClustering()`（这个函数是真实实现的，只是没被接上）：

```typescript
// AIAdvisorPanel.tsx 内替换 handleKMeansDemo
import { kMeansClustering, findSimilarCustomers } from '@/lib/algorithm';
import { mockCustomerPool } from '@/lib/mock/customers'; // 新增：200+模拟客户

const handleKMeansDemo = useCallback(async () => {
  const allKycs = [...mockCustomerPool, kyc]; // 真实数据集 + 当前客户
  const clusters = kMeansClustering(allKycs, { k: 5 });

  setClusterResult(
    clusters.map((c) => ({
      clusterId: c.clusterId,
      description: c.profile.description, // 真实生成的画像，不是硬编码文案
      count: c.members.length,
    }))
  );

  const similar = findSimilarCustomers(kyc, mockCustomerPool, 5);
  setConfidence(assessConfidence(kyc, similar, new Map()));
}, [kyc]);
```

工作量很小（半天内可完成），但收益是把"看起来是AI"变成"真的是AI"，这是防止被现场问倒的关键防御动作。

---

### 2.4 可解释AI展示层：把算法决策过程可视化

金融合规场景下，"黑箱AI"是减分项，"可解释AI（Explainable AI, XAI）"才是加分项。你们其实已经有基础——`dual-tree.ts` 里的 `path: string[]` 记录了决策路径，只是没有在前端做可视化。

**方案**：在方案详情页新增"AI决策溯源"组件，把双轨决策树的路径、合规规则触发记录、GA每代收敛曲线做成可视化时间轴/树状图：

```typescript
// 复用现有的 TierResult.path 和 ComplianceCheckResult
// 只需要一个新组件，不需要改算法层
interface DecisionTraceProps {
  mainTreePath: string[];      // 来自 dual-tree.ts 的 runMainTree
  subTreeLabels: SubTreeLabel[]; // 来自 runSubTree
  triggeredRules: ComplianceCheckResult[]; // 来自 compliance.ts
}
```

前端画一个"决策树可视化路径图"（比如用简单的SVG连线或者现成的flow图组件），这在答辩PPT截图里非常抓眼球，而且**技术含量的可见性远高于代码量**——评委不看代码，只看你能不能讲清楚"AI是怎么想的"。

---

### 2.5 【锦上添花，视时间而定】Web Worker + 渐进式蒙特卡洛，展示"工程能力"而非只是"算法能力"

如果时间允许，把蒙特卡洛的1万次模拟丢进Web Worker，做成"实时进度条+渐进结果流"（而不是现在的固定 `setTimeout(2000)` 假等待）。这个改动技术性没有2.1/2.2高，但能体现"前端工程化能力"，是技术评审里的加分细节，非必须项。

---

## 3. 优先级与工作量评估

| 项目 | 技术含量 | 工作量 | 是否必做 |
|---|---|---|---|
| 2.1 真实LLM API + Function Calling | ★★★★★ | 1-2天 | **必做，最高优先级** |
| 2.2 RAG知识库 | ★★★★ | 1天 | **强烈建议** |
| 2.3 K-Means去假 | ★★★ | 0.5天 | **必做（防翻车）** |
| 2.4 可解释AI可视化 | ★★★★ | 1天 | 建议做 |
| 2.5 Web Worker渐进式模拟 | ★★ | 0.5天 | 视时间而定 |

总计约4-5天可以把整个AI层从"看起来像demo"升级到"有真实技术架构、能扛住深挖提问"的水平。

---

## 4. 答辩话术建议（技术亮点提炼）

升级完成后，建议在答辩中这样讲AI架构：

> "我们采用『大模型做理解与表达，确定性算法做计算与决策』的分层架构：用户的自然语言意图由大模型通过Function Calling解析并路由到对应的算法引擎——遗传算法优化配置比例、蒙特卡洛模拟评估风险、K-Means聚类找相似客群——所有金融计算结果都是确定性、可复现、可审计的，避免了大模型在强合规场景下的幻觉风险；同时通过RAG检索增强，让大模型的知识问答严格基于我们自己的合规规则库和业务逻辑，而不是通用互联网知识。"

这段话本身就能覆盖"AI幻觉风险控制""金融合规适配""Agent架构"三个评委关心的技术维度，比单纯堆砌"我们用了遗传算法+蒙特卡洛+K-Means+大模型"这种罗列式介绍更有说服力。

---

## 5. 下一步

建议从 **2.1（真实LLM接入）** 开始动手，这是最能立竿见影提升"AI感"的部分，而且现有的 `processUserInput` 接口边界已经很清晰，替换成本可控。需要的话我可以直接开始写代码，第一步是搭建LLM客户端封装 + 环境变量配置 + Function Calling的工具分发逻辑。
