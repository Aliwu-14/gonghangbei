#!/usr/bin/env node

/**
 * ICBC public wealth-product list crawler.
 *
 * This crawler targets only the public, paginated list endpoint used by ICBC
 * Personal Internet Banking. It is sequential, throttled and resumable.
 * Product detail/prospectus pages are not requested by default.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_ROOT = path.join(ROOT, 'data', 'icbc-products');
const RAW_ROOT = path.join(DATA_ROOT, 'raw');
const PARSED_ROOT = path.join(DATA_ROOT, 'pages');
const BATCH_ROOT = path.join(DATA_ROOT, 'batches');
const COOKIE_ROOT = path.join(DATA_ROOT, '.cookies');

const LIST_URL = 'https://mybank.icbc.com.cn/servlet/ICBCBaseReqServletNoSession';
const ENTRY_URL = 'https://mybank.icbc.com.cn/icbc/newperbank/perbank3/finance/_financesub_out.jsp';
const AREA_CODE_DEFAULT = '0000';

const QUERY_PRESETS = {
  all: { menuLabel: '11/ALL', label: '全部产品' },
  recommended: { menuLabel: '01/TJ', label: '推荐产品' },
  agency: { menuLabel: '02/DX', label: '代销理财' },
  cash: { menuLabel: '07/15', label: '现金管理' },
  preferred: { menuLabel: '05/13', label: '优选净值' },
  foreign: { menuLabel: '09/WB', label: '外币类' },
};

const CSV_COLUMNS = [
  'productCode', 'productName', 'issuerLabel', 'salesStatus',
  'benchmarkLabel', 'benchmarkValue', 'primaryMetricLabel', 'primaryMetricValue',
  'unitNav', 'per10kIncome', 'annualizedYield', 'minimumPurchase', 'term',
  'metricsJson', 'salesRiskCode', 'salesRiskLabel', 'pageNumber', 'pageIndex',
  'queryKey', 'queryMenuLabel', 'areaCode', 'sourceUrl', 'retrievedAt',
];

function parseArgs(argv) {
  const args = {
    query: 'all', areaCode: AREA_CODE_DEFAULT, batchSize: 10,
    delayMs: 1400, retryDelayMs: 2500, retries: 3,
    saveRaw: true, force: false, aggregateOnly: false, all: false, pages: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    if (token === '--query') args.query = next();
    else if (token === '--area') args.areaCode = next();
    else if (token === '--batch-size') args.batchSize = Number(next());
    else if (token === '--delay-ms') args.delayMs = Number(next());
    else if (token === '--retry-delay-ms') args.retryDelayMs = Number(next());
    else if (token === '--retries') args.retries = Number(next());
    else if (token === '--pages') args.pages = parsePageRange(next());
    else if (token === '--all') args.all = true;
    else if (token === '--force') args.force = true;
    else if (token === '--aggregate-only') args.aggregateOnly = true;
    else if (token === '--no-raw') args.saveRaw = false;
    else if (token === '--help' || token === '-h') { printHelp(); process.exit(0); }
    else throw new Error(`未知参数: ${token}`);
  }
  if (!QUERY_PRESETS[args.query]) throw new Error(`不支持的 query: ${args.query}`);
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) throw new Error('--batch-size 必须为正整数');
  if (!Number.isInteger(args.delayMs) || args.delayMs < 0) throw new Error('--delay-ms 必须为非负整数');
  if (!Number.isInteger(args.retries) || args.retries < 1) throw new Error('--retries 必须为正整数');
  return args;
}

function parsePageRange(value) {
  const match = String(value).match(/^(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`页码范围格式错误: ${value}，示例: 1-10 或 7`);
  const start = Number(match[1]);
  const end = Number(match[2] || match[1]);
  if (start < 1 || end < start) throw new Error(`页码范围无效: ${value}`);
  return { start, end };
}

function printHelp() {
  console.log(`
工行公开理财产品列表分批抓取器

用法:
  node scripts/icbc-crawl.mjs --query all --pages 1-10
  node scripts/icbc-crawl.mjs --query all --all --batch-size 10
  node scripts/icbc-crawl.mjs --query all --aggregate-only

参数:
  --query <key>       all/recommended/agency/cash/preferred/foreign（默认 all）
  --pages <a-b>       只抓页码范围
  --all                根据第 1 页自动发现总页数并抓完
  --batch-size <n>    每批页数（默认 10）
  --delay-ms <n>      页与页之间的等待毫秒数（默认 1400）
  --force             覆盖已存在的页快照
  --no-raw            不保存原始 HTML，只保存解析结果
  --aggregate-only    只根据已有页快照重建 JSON/CSV/manifest
`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeName = (value) => String(value).replace(/[^a-zA-Z0-9._-]+/g, '_');
const queryDir = (queryKey) => safeName(queryKey);
const rawPath = (queryKey, page) => path.join(RAW_ROOT, queryDir(queryKey), `page-${String(page).padStart(4, '0')}.html`);
const parsedPath = (queryKey, page) => path.join(PARSED_ROOT, queryDir(queryKey), `page-${String(page).padStart(4, '0')}.json`);
const batchPath = (queryKey, batch) => path.join(BATCH_ROOT, queryDir(queryKey), `batch-${String(batch).padStart(4, '0')}.json`);

async function ensureDirs(queryKey) {
  await Promise.all([
    mkdir(path.join(RAW_ROOT, queryDir(queryKey)), { recursive: true }),
    mkdir(path.join(PARSED_ROOT, queryDir(queryKey)), { recursive: true }),
    mkdir(path.join(BATCH_ROOT, queryDir(queryKey)), { recursive: true }),
    mkdir(COOKIE_ROOT, { recursive: true }),
  ]);
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function firstMatch(text, regex, fallback = '') {
  const match = text.match(regex);
  return match ? stripTags(match[1]) : fallback;
}

function parseMetrics(block) {
  const metrics = [];
  const contentRe = /id=["']sdoublelabel(\d+)_\d+-content["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = contentRe.exec(block)) !== null) {
    const slot = Number(match[1]);
    const before = block.slice(Math.max(0, match.index - 1200), match.index);
    const labelMatches = [...before.matchAll(/ebdp-pc4promote-doublelabel-head["'][^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi)];
    const label = labelMatches.length ? stripTags(labelMatches.at(-1)[1]) : '';
    metrics.push({ slot, label, value: stripTags(match[2]) });
  }
  return metrics.sort((a, b) => a.slot - b.slot);
}

function parseTotalPages(html) {
  const match = html.match(/pageturn\.setMaxNum\(\"(\d+)\"\)/);
  return match ? Number(match[1]) : null;
}

function parseTotalRecords(html) {
  const match = html.match(/jQuery\(\"#shownum\"\)\.html\((\d+)\)/);
  return match ? Number(match[1]) : null;
}

function parseProductBlocks(html, pageNumber, queryKey, queryMenuLabel, areaCode, retrievedAt) {
  const starts = [];
  const startRe = /<div\b[^>]*\bid=["']circularcontainer_(\d+)["'][^>]*>/gi;
  let match;
  while ((match = startRe.exec(html)) !== null) starts.push({ index: match.index, blockIndex: Number(match[1]) });

  const products = [];
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : html.length;
    const block = html.slice(start, end);
    const blockIndex = starts[i].blockIndex;
    const code = firstMatch(block, /buySubmit\('([^']+)'/i);
    if (!code) continue;

    const anchor = block.match(/<a\s+href=["']javascript:buySubmit\([^>]*>([\s\S]*?)<\/a>/i);
    const productName = anchor ? stripTags(anchor[1]) : firstMatch(block, /circularcontainer_\d+\.setTitle\(["']([^"']+)["']\)/i);
    const issuerLabel = firstMatch(block, /tipTitle">([^<]*)<\/span>/i);
    const salesStatus = firstMatch(block, /text1">([^<]*)<\/span>/i);
    const metrics = parseMetrics(block);
    const metricBySlot = new Map(metrics.map((metric) => [metric.slot, metric]));
    const benchmark = metrics.find((metric) => /业绩比较基准|预期年化收益率|预期收益率/.test(metric.label));
    const unitNav = metrics.find((metric) => /单位净值|每份净值/.test(metric.label));
    const per10kIncome = metrics.find((metric) => /每万份收益/.test(metric.label));
    const annualizedYield = metrics.find((metric) => /七日年化收益率|年化收益率/.test(metric.label));
    const riskContent = firstMatch(block, /id=["']tt\d+-content["'][^>]*>([\s\S]*?)<\/div>/i);
    const riskLabel = firstMatch(block, /tt\d+\.setFloatMsg\(["']([^"']+)["']\)/i);

    products.push({
      productCode: code,
      productName,
      issuerLabel,
      salesStatus,
      benchmarkLabel: benchmark?.label || '',
      benchmarkValue: benchmark?.value || '',
      primaryMetricLabel: metricBySlot.get(1)?.label || '',
      primaryMetricValue: metricBySlot.get(1)?.value || '',
      unitNav: unitNav?.value || '',
      per10kIncome: per10kIncome?.value || '',
      annualizedYield: annualizedYield?.value || '',
      minimumPurchase: metricBySlot.get(2)?.value || '',
      term: metricBySlot.get(3)?.value || '',
      metrics,
      metricsJson: JSON.stringify(metrics),
      salesRiskCode: riskContent,
      salesRiskLabel: riskLabel,
      pageNumber,
      pageIndex: blockIndex,
      queryKey,
      queryMenuLabel,
      areaCode,
      sourceUrl: `${ENTRY_URL}?Area_code=${encodeURIComponent(areaCode)}`,
      retrievedAt,
    });
  }
  return products;
}

function makeFormData({ pageNumber, queryMenuLabel, areaCode }) {
  const pageFlag = pageNumber > 1 ? '1' : '0';
  const fields = [
    ['dse_operationName', 'per_FinanceCurProListP3NSOp'],
    ['financeQueryCondition', ['', '', '', '', '', '', '', '', pageFlag, String(pageNumber), queryMenuLabel, '1'].join('$')],
    ['useFinanceSolrFlag', '1'], ['orderclick', '0'], ['prodTerm_search', ''],
    ['riskLevel_search', ''], ['rateType_search', ''], ['currencyType_search', ''],
    ['keywords_search', ''], ['jsonobj', ''], ['investOrganization_search', ''],
    ['menuLabel', queryMenuLabel], ['orderLabel_order', ''], ['orderFlag_order', ''],
    ['pageFlag_turn', pageFlag], ['nowPageNum_turn', String(pageNumber)],
    ['Area_code', areaCode], ['structCode', '1'],
  ];
  return fields.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

async function requestPage({ pageNumber, queryMenuLabel, areaCode, cookieFile, retries, retryDelayMs }) {
  const formData = makeFormData({ pageNumber, queryMenuLabel, areaCode });
  const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const result = await execFileAsync(curl, [
        '-sS', '-L', '--compressed', '--max-time', '50',
        '-A', 'Mozilla/5.0 (compatible; ICBC-WMP-batch-crawler/1.0)', '-e', ENTRY_URL,
        '-c', cookieFile, '-b', cookieFile,
        '-H', 'Content-Type: application/x-www-form-urlencoded', '--data-raw', formData,
        LIST_URL, '-o', '-',
      ], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
      const body = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
      if (body.length < 1000) throw new Error(`响应过短 (${body.length} bytes)`);
      const html = new TextDecoder('gb18030').decode(body);
      if (!html.includes('circularcontainer')) throw new Error('响应不是预期的产品列表页面');
      return { body, html };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(retryDelayMs * attempt);
    }
  }
  throw new Error(`第 ${pageNumber} 页请求失败: ${lastError?.message || lastError}`);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(records) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const record of records) lines.push(CSV_COLUMNS.map((column) => csvCell(record[column])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

async function getExistingPageFiles(queryKey) {
  const dir = path.join(PARSED_ROOT, queryDir(queryKey));
  if (!existsSync(dir)) return [];
  const names = await readdir(dir);
  return names.filter((name) => /^page-\d{4}\.json$/.test(name)).sort();
}

async function loadPageRecords(queryKey) {
  const files = await getExistingPageFiles(queryKey);
  const pages = [];
  for (const file of files) {
    try {
      pages.push(JSON.parse(await readFile(path.join(PARSED_ROOT, queryDir(queryKey), file), 'utf8')));
    } catch (error) {
      console.warn(`跳过损坏页文件 ${file}: ${error.message}`);
    }
  }
  return pages;
}

async function aggregate(queryKey, preset, areaCode) {
  const pages = await loadPageRecords(queryKey);
  const seen = new Map();
  const duplicates = [];
  let totalPagesReported = null;
  let totalRecordsReported = null;
  const failedPages = [];
  const batchDir = path.join(BATCH_ROOT, queryDir(queryKey));
  if (existsSync(batchDir)) {
    const batchFiles = (await readdir(batchDir)).filter((name) => /^batch-\d{4}\.json$/.test(name)).sort();
    for (const file of batchFiles) {
      try {
        const batch = JSON.parse(await readFile(path.join(batchDir, file), 'utf8'));
        for (const failure of batch.errors || []) failedPages.push(failure);
      } catch (error) {
        console.warn(`跳过损坏批次文件 ${file}: ${error.message}`);
      }
    }
  }
  for (const page of pages) {
    totalPagesReported ??= page.totalPages;
    totalRecordsReported ??= page.totalRecords;
    if (Array.isArray(page.errors)) failedPages.push(...page.errors);
    for (const record of page.products || []) {
      const key = record.productCode || `${record.productName}|${record.pageNumber}`;
      if (seen.has(key)) duplicates.push({ productCode: record.productCode, first: seen.get(key), duplicate: record });
      else seen.set(key, record);
    }
  }
  const records = [...seen.values()].sort((a, b) => String(a.productCode).localeCompare(String(b.productCode)));
  const retrievedAt = new Date().toISOString();
  const out = {
    schemaVersion: '1.0', queryKey, queryLabel: preset.label, queryMenuLabel: preset.menuLabel,
    areaCode, sourceEntryUrl: ENTRY_URL, sourceListUrl: LIST_URL, retrievedAt,
    totalPagesReported, totalRecordsReported, fetchedPageCount: pages.length,
    parsedRecordCount: pages.reduce((sum, page) => sum + (page.products?.length || 0), 0),
    uniqueProductCount: records.length, duplicateRecordCount: duplicates.length,
    failedPageCount: [...new Set(failedPages.map((item) => item.pageNumber))].length,
    records, duplicates, failedPages,
  };
  await writeJson(path.join(DATA_ROOT, `${queryKey}.products.json`), out);
  await writeFile(path.join(DATA_ROOT, `${queryKey}.products.csv`), toCsv(records), 'utf8');
  await writeJson(path.join(DATA_ROOT, `${queryKey}.manifest.json`), {
    ...out, records: undefined, duplicates: undefined, failedPages: undefined,
  });
  return out;
}

async function loadPagePayload(queryKey, pageNumber) {
  return JSON.parse(await readFile(parsedPath(queryKey, pageNumber), 'utf8'));
}

async function crawlPage({ queryKey, preset, pageNumber, areaCode, args, cookieFile }) {
  const rawFile = rawPath(queryKey, pageNumber);
  const parsedFile = parsedPath(queryKey, pageNumber);
  if (!args.force && existsSync(parsedFile)) return { pageNumber, skipped: true, payload: await loadPagePayload(queryKey, pageNumber) };
  const retrievedAt = new Date().toISOString();
  const { body, html } = await requestPage({
    pageNumber, queryMenuLabel: preset.menuLabel, areaCode, cookieFile,
    retries: args.retries, retryDelayMs: args.retryDelayMs,
  });
  const rawSha256 = createHash('sha256').update(body).digest('hex');
  if (args.saveRaw) await writeFile(rawFile, body);
  const products = parseProductBlocks(html, pageNumber, queryKey, preset.menuLabel, areaCode, retrievedAt);
  const payload = {
    schemaVersion: '1.0', queryKey, queryLabel: preset.label, queryMenuLabel: preset.menuLabel,
    areaCode, pageNumber, fetchedAt: retrievedAt, totalPages: parseTotalPages(html),
    totalRecords: parseTotalRecords(html), sourceEntryUrl: ENTRY_URL, sourceListUrl: LIST_URL,
    rawBytes: body.length, rawSha256, productCount: products.length, products,
  };
  await writeJson(parsedFile, payload);
  return { pageNumber, skipped: false, payload };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const preset = QUERY_PRESETS[args.query];
  await ensureDirs(args.query);
  const cookieFile = path.join(COOKIE_ROOT, `${queryDir(args.query)}-${safeName(args.areaCode)}.txt`);
  if (!existsSync(cookieFile)) await writeFile(cookieFile, '', 'utf8');

  if (args.aggregateOnly) {
    const result = await aggregate(args.query, preset, args.areaCode);
    console.log(JSON.stringify({ mode: 'aggregate-only', queryKey: args.query, fetchedPageCount: result.fetchedPageCount,
      totalPagesReported: result.totalPagesReported, totalRecordsReported: result.totalRecordsReported,
      parsedRecordCount: result.parsedRecordCount, uniqueProductCount: result.uniqueProductCount,
      duplicateRecordCount: result.duplicateRecordCount, failedPageCount: result.failedPageCount }, null, 2));
    return;
  }

  let pageRange = args.pages;
  let totalPages = null;
  if (pageRange == null) {
    const pageOne = await crawlPage({ queryKey: args.query, preset, pageNumber: 1, areaCode: args.areaCode, args, cookieFile });
    totalPages = pageOne.payload.totalPages;
    if (!totalPages) throw new Error('无法从第 1 页发现总页数，请检查官网响应');
    pageRange = args.all ? { start: 1, end: totalPages } : { start: 1, end: Math.min(args.batchSize, totalPages) };
    console.log(`官网报告 ${pageOne.payload.totalRecords ?? '?'} 条、${totalPages} 页；第 1 页${pageOne.skipped ? '已复用' : '已保存'}`);
  }
  if (args.all && totalPages && pageRange.end > totalPages) pageRange.end = totalPages;

  const batchStart = Math.floor((pageRange.start - 1) / args.batchSize) + 1;
  const batchEnd = Math.floor((pageRange.end - 1) / args.batchSize) + 1;
  for (let batchNumber = batchStart; batchNumber <= batchEnd; batchNumber += 1) {
    const start = Math.max(pageRange.start, (batchNumber - 1) * args.batchSize + 1);
    const end = Math.min(pageRange.end, batchNumber * args.batchSize);
    const batch = { schemaVersion: '1.0', queryKey: args.query, queryLabel: preset.label, areaCode: args.areaCode,
      batchNumber, pageStart: start, pageEnd: end, startedAt: new Date().toISOString(), pages: [], errors: [] };
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      try {
        const result = await crawlPage({ queryKey: args.query, preset, pageNumber, areaCode: args.areaCode, args, cookieFile });
        batch.pages.push({ pageNumber, status: result.skipped ? 'skipped' : 'fetched', productCount: result.payload.productCount });
        console.log(`[${args.query}] page ${pageNumber}: ${result.skipped ? 'skip' : 'ok'} ${result.payload.productCount} products`);
      } catch (error) {
        batch.pages.push({ pageNumber, status: 'failed', error: error.message });
        batch.errors.push({ pageNumber, error: error.message });
        console.error(`[${args.query}] page ${pageNumber}: FAILED ${error.message}`);
      }
      if (pageNumber < end) await sleep(args.delayMs);
    }
    batch.finishedAt = new Date().toISOString();
    batch.status = batch.errors.length ? 'partial' : 'complete';
    await writeJson(batchPath(args.query, batchNumber), batch);
  }

  const result = await aggregate(args.query, preset, args.areaCode);
  console.log(JSON.stringify({ mode: 'crawl', queryKey: args.query, pageRange,
    fetchedPageCount: result.fetchedPageCount, totalPagesReported: result.totalPagesReported,
    totalRecordsReported: result.totalRecordsReported, parsedRecordCount: result.parsedRecordCount,
    uniqueProductCount: result.uniqueProductCount, duplicateRecordCount: result.duplicateRecordCount,
    failedPageCount: result.failedPageCount }, null, 2));
}

run().catch((error) => { console.error(error.stack || error.message || error); process.exitCode = 1; });
