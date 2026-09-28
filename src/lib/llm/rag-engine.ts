// ============================================================
// RAG 检索引擎
// 基于向量相似度的知识库检索
// ============================================================

import { getEmbeddingClient, cosineSimilarity } from './embedding-client';
import { KNOWLEDGE_BASE, type KnowledgeDocument } from './knowledge-base';

export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;
  rank: number;
}

/**
 * RAG 引擎
 */
export class RAGEngine {
  private embeddingClient = getEmbeddingClient();
  private documentsWithEmbeddings: KnowledgeDocument[] = [];
  private initialized = false;

  /**
   * 初始化：为知识库中的所有文档生成 embedding
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[RAG] 开始初始化知识库 embedding...');

    // 1. 提取所有文档内容作为语料库
    const corpus = KNOWLEDGE_BASE.map(doc => `${doc.title}\n${doc.content}`);

    // 2. 初始化 embedding 客户端
    this.embeddingClient.initialize(corpus);

    // 3. 为每个文档生成 embedding
    this.documentsWithEmbeddings = KNOWLEDGE_BASE.map(doc => {
      const text = `${doc.title}\n${doc.content}`;
      const embedding = this.embeddingClient.embed(text);
      return {
        ...doc,
        embedding,
      };
    });

    this.initialized = true;
    console.log(`[RAG] 知识库初始化完成，共 ${this.documentsWithEmbeddings.length} 篇文档`);
    console.log(`[RAG] 词汇表大小：${this.embeddingClient.getVocabularySize()} 个词`);
  }

  /**
   * 检索：根据查询文本返回最相关的 topK 篇文档
   */
  retrieve(query: string, topK: number = 3): RetrievalResult[] {
    if (!this.initialized) {
      throw new Error('[RAG] 引擎未初始化，请先调用 initialize()');
    }

    // 1. 计算查询的 embedding
    const queryEmbedding = this.embeddingClient.embed(query);

    // 2. 计算与所有文档的相似度
    const results: RetrievalResult[] = this.documentsWithEmbeddings.map((doc, index) => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding!);
      return {
        document: doc,
        score,
        rank: index,
      };
    });

    // 3. 按相似度降序排列，返回 topK
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }

  /**
   * 按分类过滤后检索
   */
  retrieveByCategory(
    query: string,
    category: KnowledgeDocument['category'],
    topK: number = 3
  ): RetrievalResult[] {
    if (!this.initialized) {
      throw new Error('[RAG] 引擎未初始化，请先调用 initialize()');
    }

    const queryEmbedding = this.embeddingClient.embed(query);

    const filtered = this.documentsWithEmbeddings.filter(doc => doc.category === category);

    const results: RetrievalResult[] = filtered.map((doc, index) => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding!);
      return {
        document: doc,
        score,
        rank: index,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }

  /**
   * 按标签过滤后检索
   */
  retrieveByTag(query: string, tag: string, topK: number = 3): RetrievalResult[] {
    if (!this.initialized) {
      throw new Error('[RAG] 引擎未初始化，请先调用 initialize()');
    }

    const queryEmbedding = this.embeddingClient.embed(query);

    const filtered = this.documentsWithEmbeddings.filter(doc =>
      doc.tags.some(t => t.includes(tag))
    );

    const results: RetrievalResult[] = filtered.map((doc, index) => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding!);
      return {
        document: doc,
        score,
        rank: index,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }

  /**
   * 健康检查
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取知识库统计信息
   */
  getStats() {
    return {
      totalDocuments: this.documentsWithEmbeddings.length,
      vocabularySize: this.embeddingClient.getVocabularySize(),
      initialized: this.initialized,
      categories: {
        RULE: this.documentsWithEmbeddings.filter(d => d.category === 'RULE').length,
        CONCEPT: this.documentsWithEmbeddings.filter(d => d.category === 'CONCEPT').length,
        CONSTRAINT: this.documentsWithEmbeddings.filter(d => d.category === 'CONSTRAINT').length,
        PRODUCT: this.documentsWithEmbeddings.filter(d => d.category === 'PRODUCT').length,
        RISK: this.documentsWithEmbeddings.filter(d => d.category === 'RISK').length,
      },
    };
  }
}

// 单例实例
let ragEngineInstance: RAGEngine | null = null;

export async function getRAGEngine(): Promise<RAGEngine> {
  if (!ragEngineInstance) {
    ragEngineInstance = new RAGEngine();
    await ragEngineInstance.initialize();
  }
  return ragEngineInstance;
}

/**
 * 便捷方法：直接检索知识
 */
export async function searchKnowledge(query: string, topK: number = 3): Promise<RetrievalResult[]> {
  const engine = await getRAGEngine();
  return engine.retrieve(query, topK);
}
