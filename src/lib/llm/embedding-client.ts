// ============================================================
// Embedding 客户端封装
// 由于 DeepSeek 暂未提供公开的 Embedding API，
// 这里实现一个轻量级的本地向量化方案（基于 TF-IDF + 余弦相似度）
// 后续如有真实 Embedding API 可替换
// ============================================================

/**
 * 简易的中文分词（基于停用词过滤）
 */
function simpleTokenize(text: string): string[] {
  // 移除标点符号和特殊字符
  const cleaned = text.replace(/[，。！？；：、""''（）【】《》\s]/g, ' ');
  
  // 按空格分割并过滤空字符串
  const tokens = cleaned.split(' ').filter(t => t.length > 0);
  
  // 简单的中文分词：按单字符拆分（对于中文短语）
  const result: string[] = [];
  tokens.forEach(token => {
    if (/[\u4e00-\u9fa5]/.test(token)) {
      // 中文：按字符拆分
      result.push(...token.split(''));
    } else {
      // 英文/数字：保留整体
      result.push(token.toLowerCase());
    }
  });
  
  return result;
}

/**
 * 计算词频（TF）
 */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  tokens.forEach(token => {
    tf.set(token, (tf.get(token) || 0) + 1);
  });
  
  // 归一化
  const total = tokens.length;
  tf.forEach((count, token) => {
    tf.set(token, count / total);
  });
  
  return tf;
}

/**
 * 计算逆文档频率（IDF）
 */
function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const docCount = documents.length;
  
  // 统计每个词出现在多少个文档中
  const docFreq = new Map<string, number>();
  documents.forEach(doc => {
    const uniqueTokens = new Set(doc);
    uniqueTokens.forEach(token => {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    });
  });
  
  // 计算 IDF
  docFreq.forEach((freq, token) => {
    idf.set(token, Math.log(docCount / freq));
  });
  
  return idf;
}

/**
 * 计算 TF-IDF 向量
 */
function computeTFIDF(
  tokens: string[],
  idf: Map<string, number>,
  vocabulary: string[]
): number[] {
  const tf = computeTF(tokens);
  const vector: number[] = new Array(vocabulary.length).fill(0);
  
  tokens.forEach(token => {
    const idx = vocabulary.indexOf(token);
    if (idx !== -1) {
      const tfValue = tf.get(token) || 0;
      const idfValue = idf.get(token) || 0;
      vector[idx] = tfValue * idfValue;
    }
  });
  
  return vector;
}

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

/**
 * Embedding 客户端
 */
export class EmbeddingClient {
  private vocabulary: string[] = [];
  private idf: Map<string, number> = new Map();
  private initialized = false;

  /**
   * 初始化词汇表和 IDF（需要先用语料库训练）
   */
  initialize(corpus: string[]): void {
    // 分词
    const documents = corpus.map(doc => simpleTokenize(doc));
    
    // 构建词汇表
    const vocabSet = new Set<string>();
    documents.forEach(doc => {
      doc.forEach(token => vocabSet.add(token));
    });
    this.vocabulary = Array.from(vocabSet);
    
    // 计算 IDF
    this.idf = computeIDF(documents);
    
    this.initialized = true;
  }

  /**
   * 将文本转换为向量
   */
  embed(text: string): number[] {
    if (!this.initialized) {
      throw new Error('EmbeddingClient 未初始化，请先调用 initialize()');
    }
    
    const tokens = simpleTokenize(text);
    return computeTFIDF(tokens, this.idf, this.vocabulary);
  }

  /**
   * 批量转换
   */
  embedBatch(texts: string[]): number[][] {
    return texts.map(text => this.embed(text));
  }

  /**
   * 计算两段文本的相似度
   */
  similarity(textA: string, textB: string): number {
    const vecA = this.embed(textA);
    const vecB = this.embed(textB);
    return cosineSimilarity(vecA, vecB);
  }

  /**
   * 健康检查
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取词汇表大小
   */
  getVocabularySize(): number {
    return this.vocabulary.length;
  }
}

// 单例实例
let embeddingClientInstance: EmbeddingClient | null = null;

export function getEmbeddingClient(): EmbeddingClient {
  if (!embeddingClientInstance) {
    embeddingClientInstance = new EmbeddingClient();
  }
  return embeddingClientInstance;
}
