#!/usr/bin/env node

/** Validate a completed ICBC list snapshot without making network requests. */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_ROOT = path.join(ROOT, 'data', 'icbc-products');
const queryKey = process.argv[2] || 'all';
const queryDir = path.join(DATA_ROOT, 'pages', queryKey);
const rawDir = path.join(DATA_ROOT, 'raw', queryKey);
const batchDir = path.join(DATA_ROOT, 'batches', queryKey);
const productsFile = path.join(DATA_ROOT, `${queryKey}.products.json`);
const validationFile = path.join(DATA_ROOT, `${queryKey}.validation.json`);

const errors = [];
const warnings = [];
const pagePayloads = [];

function addError(message) { errors.push(message); }
function addWarning(message) { warnings.push(message); }

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function main() {
  if (!existsSync(productsFile)) addError(`缺少汇总文件: ${productsFile}`);
  if (!existsSync(queryDir)) addError(`缺少页目录: ${queryDir}`);
  if (errors.length) return finish();

  const summary = await loadJson(productsFile);
  const pageFiles = (await readdir(queryDir)).filter((name) => /^page-\d{4}\.json$/.test(name)).sort();
  const pageNumbers = [];
  for (const file of pageFiles) {
    try {
      const payload = await loadJson(path.join(queryDir, file));
      pagePayloads.push(payload);
      pageNumbers.push(payload.pageNumber);
      if (!Array.isArray(payload.products)) addError(`${file}: products 不是数组`);
      if (payload.productCount !== (payload.products || []).length) addError(`${file}: productCount 与 products 长度不一致`);
      if ((payload.products || []).length > 10) addWarning(`${file}: 单页超过 10 条，请检查页面结构变化`);
      for (const product of payload.products || []) {
        for (const field of ['productCode', 'productName', 'salesRiskCode', 'pageNumber', 'queryKey', 'retrievedAt']) {
          if (product[field] == null || String(product[field]).trim() === '') addError(`${file}: ${field} 为空`);
        }
        if (!/^\d+$/.test(String(product.salesRiskCode))) addWarning(`${file}: ${product.productCode} 风险代码异常: ${product.salesRiskCode}`);
        if (!Array.isArray(product.metrics)) addError(`${file}: ${product.productCode} 缺少 metrics 数组`);
      }
      const rawFile = path.join(rawDir, file.replace(/\.json$/, '.html'));
      if (!existsSync(rawFile)) addWarning(`${file}: 缺少原始 HTML 快照`);
      else {
        const bytes = await readFile(rawFile);
        if (bytes.length < 1000) addError(`${file}: 原始 HTML 过短`);
        const digest = createHash('sha256').update(bytes).digest('hex');
        if (payload.rawSha256 && payload.rawSha256 !== digest) addError(`${file}: rawSha256 不匹配`);
      }
    } catch (error) {
      addError(`${file}: 无法读取/解析 (${error.message})`);
    }
  }

  const expectedPages = Number(summary.totalPagesReported);
  if (Number.isInteger(expectedPages)) {
    const expected = Array.from({ length: expectedPages }, (_, i) => i + 1);
    if (JSON.stringify(pageNumbers.sort((a, b) => a - b)) !== JSON.stringify(expected)) addError('页码不连续或存在缺页');
  }
  const parsedCount = pagePayloads.reduce((sum, page) => sum + (page.products || []).length, 0);
  if (parsedCount !== summary.parsedRecordCount) addError('汇总 parsedRecordCount 与页文件不一致');
  if (summary.totalRecordsReported != null && parsedCount !== summary.totalRecordsReported) addError('官网报告记录数与解析记录数不一致');

  const codes = (summary.records || []).map((record) => record.productCode);
  const uniqueCodes = new Set(codes);
  if (codes.length !== uniqueCodes.size) addError('汇总 records 中存在重复 productCode');
  if (summary.uniqueProductCount !== uniqueCodes.size) addError('汇总 uniqueProductCount 不一致');
  if (summary.duplicateRecordCount !== 0) addWarning(`汇总发现 ${summary.duplicateRecordCount} 条重复列表记录`);

  if (existsSync(batchDir)) {
    const batchFiles = (await readdir(batchDir)).filter((name) => /^batch-\d{4}\.json$/.test(name)).sort();
    for (const file of batchFiles) {
      const batch = await loadJson(path.join(batchDir, file));
      if (batch.status !== 'complete') addError(`${file}: 状态为 ${batch.status}`);
      if ((batch.errors || []).length) addError(`${file}: 有 ${(batch.errors || []).length} 个失败页`);
    }
  }

  return finish({
    queryKey,
    checkedAt: new Date().toISOString(),
    expectedPages,
    actualPages: pagePayloads.length,
    parsedRecordCount: parsedCount,
    uniqueProductCount: uniqueCodes.size,
    errors,
    warnings,
    valid: errors.length === 0,
  });
}

async function finish(result = { queryKey, checkedAt: new Date().toISOString(), errors, warnings, valid: errors.length === 0 }) {
  await writeFile(validationFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error.message || error); process.exitCode = 1; });

