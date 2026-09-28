# -*- coding: utf-8 -*-
"""
精确估算 Word 文档页数：
基于"每页可容纳字符数"+"行高"+"段间距"+"表格占据行数"
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from docx import Document
from docx.shared import Cm, Pt, RGBColor

doc = Document(r'C:\Users\WHB\Desktop\ICBC-WMP\ICBC-WMP\方案\upgrade\盈智+_AI智能财富管理算法引擎升级方案.docx')

# A4: 21cm x 29.7cm
# 边距 2.8cm * 2 = 5.6cm
# 可用宽度 = 15.4cm, 高度 = 24.1cm
PAGE_WIDTH_CM = 15.4
PAGE_HEIGHT_CM = 24.1

# 中文宋体 10.5pt = 约 0.40cm 行高（含行距 1.5）
LINE_HEIGHT_CM = 0.65  # 10.5pt × 1.5 倍行距 ≈ 0.55cm + 段距
LINES_PER_PAGE = int(PAGE_HEIGHT_CM / LINE_HEIGHT_CM)  # 约 37 行/页

# 估算
total_lines = 0
total_table_lines = 0

for p in doc.paragraphs:
    text = ''.join(r.text for r in p.runs)
    # 计算段落的"占用行数"
    char_count = len(text)
    # 一行容纳约 32 个汉字
    chars_per_line = 32
    if char_count == 0:
        lines = 1
    else:
        lines = max(1, (char_count + chars_per_line - 1) // chars_per_line)
    # 加上段间距
    spacing_after = p.paragraph_format.space_after.pt if p.paragraph_format.space_after else 0
    spacing_before = p.paragraph_format.space_before.pt if p.paragraph_format.space_before else 0
    spacing_cm = (spacing_after + spacing_before) / 28.35  # pt 转 cm
    extra_lines = spacing_cm / LINE_HEIGHT_CM
    total_lines += lines + extra_lines

# 表格估算：每行按 0.7cm 计
for t in doc.tables:
    n_rows = len(t.rows)
    for row in t.rows:
        for cell in row.cells:
            text = ''.join(p.text for p in cell.paragraphs)
            char_count = len(text)
            # 表格单元格窄，按 12 字/行
            lines = max(1, (char_count + 11) // 12)
            total_table_lines += lines + 0.3  # 行间距
        total_table_lines += 0.5  # 行间距

print(f"正文段落占用行数: {total_lines:.1f}")
print(f"表格占用行数: {total_table_lines:.1f}")
print(f"总占用行数: {total_lines + total_table_lines:.1f}")
print(f"每页可用行数: {LINES_PER_PAGE}")
print(f"估算页数: {(total_lines + total_table_lines) / LINES_PER_PAGE:.1f} 页")

# 加上封面页（约 1.5 页）和目录页（约 1 页）
print(f"\n加上封面 1.5 页 + 目录 1 页")
print(f"最终页数估算: {1.5 + 1 + (total_lines + total_table_lines) / LINES_PER_PAGE:.1f} 页")
