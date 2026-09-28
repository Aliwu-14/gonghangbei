// ============================================================
// RAG 知识库初始化
// 在应用启动时预加载 embedding，避免首次查询延迟
// ============================================================

import { getRAGEngine } from './rag-engine';

let initPromise: Promise<void> | null = null;

/**
 * 初始化 RAG 知识库（幂等操作）
 * 可以在应用启动时调用，也可以在首次使用时懒加载
 */
export async function initializeRAG(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('[RAG Init] 开始初始化知识库...');
      const startTime = Date.now();

      const engine = await getRAGEngine();

      const stats = engine.getStats();
      const elapsed = Date.now() - startTime;

      console.log('[RAG Init] 知识库初始化完成', {
        耗时: `${elapsed}ms`,
        文档总数: stats.totalDocuments,
        词汇表: stats.vocabularySize,
        分类统计: stats.categories,
      });
    } catch (error) {
      console.error('[RAG Init] 初始化失败:', error);
      initPromise = null; // 重置以便重试
      throw error;
    }
  })();

  return initPromise;
}

/**
 * 检查 RAG 是否已初始化
 */
export async function isRAGReady(): Promise<boolean> {
  try {
    const engine = await getRAGEngine();
    return engine.isReady();
  } catch {
    return false;
  }
}

/**
 * 获取 RAG 统计信息（用于调试）
 */
export async function getRAGStats() {
  const engine = await getRAGEngine();
  return engine.getStats();
}

// ============================================================
// 自动初始化（可选）
// 如果希望在应用启动时立即初始化，取消下面的注释
// ============================================================

// 方案1：立即初始化（阻塞式，适合服务端）
// if (typeof window === 'undefined') {
//   initializeRAG().catch(err => {
//     console.error('[RAG] 服务端初始化失败:', err);
//   });
// }

// 方案2：延迟初始化（非阻塞，适合客户端）
if (typeof window !== 'undefined') {
  // 等待 1 秒后初始化，避免影响首屏加载
  setTimeout(() => {
    initializeRAG().catch(err => {
      console.error('[RAG] 客户端初始化失败:', err);
    });
  }, 1000);
}
