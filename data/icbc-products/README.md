# 工行公开理财产品列表数据

本目录保存由 `ICBC-WMP/scripts/icbc-crawl.mjs` 按批次获取的工行个人网银公开理财产品**列表记录**。

官方入口：[工行个人网银理财产品列表](https://mybank.icbc.com.cn/icbc/newperbank/perbank3/finance/_financesub_out.jsp)。

## 数据边界

- 来源是工行个人网银公开列表入口及其分页列表服务，不是工行内部产品主数据接口。
- 默认查询口径是 `11/ALL`（全部产品目录），只请求列表页；不会自动打开每个产品的说明书、风险揭示书或交易页面。
- 列表记录可能包含不同地区、期次、份额或销售记录；`productCode` 去重后的数量才是本目录当前的唯一代码数，仍不应直接解释为“工行全部独立产品数”。
- 数据包含抓取时间、查询口径、页码和来源 URL，便于复核和增量更新。

## 目录结构

```text
raw/<query>/page-0001.html       原始 GB18030/GBK HTML 快照（可选）
pages/<query>/page-0001.json      单页解析结果
batches/<query>/batch-0001.json   批次状态、成功页、失败页
all.products.json                 去重后的完整 JSON 数据集
all.products.csv                  便于人工查看/导入的 CSV
all.manifest.json                 统计摘要，不含完整记录数组
```

## 建议运行方式

```powershell
# 先抓 1–10 页验证
node scripts/icbc-crawl.mjs --query all --pages 1-10 --batch-size 10

# 之后从已有页继续，直到官网报告的最后一页；已完成页会自动跳过
node scripts/icbc-crawl.mjs --query all --all --batch-size 10

# 只重建汇总文件，不访问网络
node scripts/icbc-crawl.mjs --query all --aggregate-only

# 不访问网络，核验页码连续性、记录数、去重和批次状态
node scripts/icbc-validate.mjs all
```

抓取器单线程、带页间延迟、失败重试并写入批次状态；不要把 `.cookies/` 目录提交到版本库。

## 字段

`productCode`、`productName`、`issuerLabel`、`salesStatus`、`benchmarkValue`、`primaryMetricValue`、`unitNav`、`per10kIncome`、`annualizedYield`、`minimumPurchase`、`term`、`salesRiskCode` 和 `salesRiskLabel` 来自列表页公开字段；`metrics`/`metricsJson` 保留页面上出现的全部指标，避免把现金管理产品的每万份收益误当成业绩比较基准；`pageNumber`、`queryKey`、`areaCode`、`sourceUrl`、`retrievedAt` 是溯源元数据。

这些数据只能作为研究/演示数据。若用于生产推荐或销售，仍需使用工行授权的产品主数据/行情接口，并重新完成适当性、披露和合规审核。
