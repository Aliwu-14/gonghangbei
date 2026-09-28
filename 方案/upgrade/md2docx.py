# -*- coding: utf-8 -*-
"""
将 Markdown 商业方案转换为 Word 文档（红金调）
"""
import re
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_BREAK
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsmap
from docx.oxml import OxmlElement
from docx.enum.style import WD_STYLE_TYPE

# ======== 主题色：传统红金调 ========
COLOR_RED = RGBColor(0xC8, 0x10, 0x2E)        # 工行红
COLOR_GOLD = RGBColor(0xC9, 0xA9, 0x60)       # 国金金
COLOR_DARK_GOLD = RGBColor(0x8B, 0x70, 0x3D)  # 深金
COLOR_BG_LIGHT = "FDF6E3"                     # 浅金背景
COLOR_BG_TABLE = "FAF0E1"                     # 表格淡金
COLOR_GRAY = RGBColor(0x55, 0x55, 0x55)
COLOR_DARK = RGBColor(0x1A, 0x1A, 0x1A)
COLOR_WHITE = RGBColor(0xFF, 0xFF, 0xFF)

# ======== 文档初始化 ========
doc = Document()

# 设置默认字体（中文宋体、英文 Times New Roman）
style_normal = doc.styles['Normal']
style_normal.font.name = 'Times New Roman'
style_normal.font.size = Pt(11)
rPr = style_normal.element.rPr
rFonts = rPr.find(qn('w:rFonts')) if rPr is not None else None
if rFonts is None:
    rFonts = OxmlElement('w:rFonts')
    rPr.append(rFonts)
rFonts.set(qn('w:eastAsia'), '宋体')
rFonts.set(qn('w:ascii'), 'Times New Roman')
rFonts.set(qn('w:hAnsi'), 'Times New Roman')

# 设置页面（A4 标准 + 适度边距）
section = doc.sections[0]
section.top_margin = Cm(2.8)
section.bottom_margin = Cm(2.8)
section.left_margin = Cm(2.8)
section.right_margin = Cm(2.8)


# ======== 辅助函数 ========
def set_cell_bg(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)


def set_cell_borders(cell, color="C9A960", size=6):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        border = OxmlElement(f'w:{edge}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), str(size))
        border.set(qn('w:color'), color)
        tcBorders.append(border)
    tcPr.append(tcBorders)


def add_para(text="", font_size=10.5, color=None, bold=False, italic=False,
             align=None, first_line_indent=None, line_spacing=1.5,
             space_before=0, space_after=4, east_asia="宋体"):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    if align is not None:
        p.alignment = align
    if first_line_indent is not None:
        pf.first_line_indent = first_line_indent
    pf.line_spacing = line_spacing
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    if text:
        run = p.add_run(text)
        run.font.size = Pt(font_size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.name = 'Times New Roman'
        rPr = run._element.get_or_add_rPr()
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.append(rFonts)
        rFonts.set(qn('w:eastAsia'), east_asia)
        if color is not None:
            run.font.color.rgb = color
    return p


def add_inline(p, text, font_size=10.5, color=None, bold=False, italic=False, east_asia="宋体"):
    run = p.add_run(text)
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = 'Times New Roman'
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:eastAsia'), east_asia)
    if color is not None:
        run.font.color.rgb = color
    return run


def add_h1(text):
    """H1 章标题"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.space_before = Pt(28)
    pf.space_after = Pt(14)
    pf.line_spacing = 1.75
    # 强制分页（章标题单独占页）
    pf.page_break_before = True
    add_inline(p, "❖ ", font_size=20, color=COLOR_RED, bold=True)
    add_inline(p, text, font_size=20, color=COLOR_RED, bold=True, east_asia="黑体")
    # 添加底部金线
    pPr = p._element.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '12')
    bottom.set(qn('w:space'), '4')
    bottom.set(qn('w:color'), 'C9A960')
    pBdr.append(bottom)
    pPr.append(pBdr)


def add_h2(text):
    """H2 节标题"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.space_before = Pt(18)
    pf.space_after = Pt(10)
    pf.line_spacing = 1.75
    add_inline(p, "▎ ", font_size=15, color=COLOR_DARK_GOLD, bold=True)
    add_inline(p, text, font_size=15, color=COLOR_DARK, bold=True, east_asia="黑体")


def add_h3(text):
    """H3 子节标题"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.space_before = Pt(12)
    pf.space_after = Pt(6)
    pf.line_spacing = 1.75
    add_inline(p, "▶ ", font_size=12, color=COLOR_RED, bold=True)
    add_inline(p, text, font_size=12, color=COLOR_DARK, bold=True, east_asia="黑体")


def add_h4(text):
    """H4 子子节标题"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.space_before = Pt(8)
    pf.space_after = Pt(4)
    pf.line_spacing = 1.75
    add_inline(p, "▷ ", font_size=11, color=COLOR_DARK_GOLD, bold=True)
    add_inline(p, text, font_size=11, color=COLOR_DARK, bold=True, east_asia="黑体")


def add_blockquote(text):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.left_indent = Cm(0.5)
    pf.right_indent = Cm(0.5)
    pf.line_spacing = 1.5
    pf.space_before = Pt(6)
    pf.space_after = Pt(6)
    # 左侧红线
    pPr = p._element.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    left = OxmlElement('w:left')
    left.set(qn('w:val'), 'single')
    left.set(qn('w:sz'), '18')
    left.set(qn('w:space'), '8')
    left.set(qn('w:color'), 'C8102E')
    pBdr.append(left)
    pPr.append(pBdr)
    add_inline(p, "「 " + text + " 」", font_size=10.5, color=COLOR_DARK_GOLD, italic=True, east_asia="楷体")


def add_code_block(text):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.left_indent = Cm(0.5)
    pf.right_indent = Cm(0.5)
    pf.line_spacing = 1.2
    pf.space_before = Pt(4)
    pf.space_after = Pt(4)
    # 设置浅金背景
    pPr = p._element.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), COLOR_BG_TABLE)
    pPr.append(shd)
    # 添加边框
    pBdr = OxmlElement('w:pBdr')
    for edge in ('top', 'left', 'bottom', 'right'):
        border = OxmlElement(f'w:{edge}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:space'), '4')
        border.set(qn('w:color'), 'C9A960')
        pBdr.append(border)
    pPr.append(pBdr)
    for line in text.split('\n'):
        if p.runs:
            p.add_run('\n')
        add_inline(p, line, font_size=9.5, color=COLOR_DARK, east_asia="Consolas")


def add_table_from_md(lines):
    """解析 Markdown 表格并添加到文档"""
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if not all(re.match(r'^[-:]+$', c) for c in cells):
            rows.append(cells)
    if not rows:
        return
    n_cols = max(len(r) for r in rows)
    # 补齐列数
    for r in rows:
        while len(r) < n_cols:
            r.append('')
    table = doc.add_table(rows=len(rows), cols=n_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Light Grid Accent 2'
    for i, row_data in enumerate(rows):
        row = table.rows[i]
        for j, cell_text in enumerate(row_data):
            if j >= n_cols:
                continue
            cell = row.cells[j]
            cell.text = ''
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.line_spacing = 1.2
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            # 加粗表头
            if i == 0:
                add_inline(p, cell_text, font_size=10.5, color=COLOR_WHITE, bold=True, east_asia="黑体")
                set_cell_bg(cell, "C8102E")  # 表头红色
            else:
                # 解析加粗标记 **xxx**
                parts = re.split(r'(\*\*[^*]+\*\*)', cell_text)
                for part in parts:
                    if part.startswith('**') and part.endswith('**'):
                        add_inline(p, part[2:-2], font_size=10, color=COLOR_DARK, bold=True)
                    else:
                        add_inline(p, part, font_size=10, color=COLOR_DARK)
                # 隔行染色
                if i % 2 == 0:
                    set_cell_bg(cell, COLOR_BG_TABLE)
            set_cell_borders(cell, color="C9A960", size=4)
    doc.add_paragraph()  # 表格后空行


def add_hr():
    """添加分隔线"""
    p = doc.add_paragraph()
    pPr = p._element.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'C9A960')
    pBdr.append(bottom)
    pPr.append(pBdr)


# ======== 读取并解析 Markdown ========
md_path = r'C:\Users\WHB\Desktop\ICBC-WMP\ICBC-WMP\方案\upgrade\盈智+_AI智能财富管理算法引擎升级方案.md'
with open(md_path, 'r', encoding='utf-8') as f:
    md_content = f.read()

# ======== 封面页 ========
# 顶部 6 行空白
for _ in range(5):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.5

# 装饰线
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_inline(p, "━━━━━━ 工商银行 · 智能财富管理 ━━━━━━", font_size=12, color=COLOR_GOLD, bold=True)

# 空白
for _ in range(2):
    doc.add_paragraph()

# 主标题
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(24)
p.paragraph_format.space_after = Pt(12)
add_inline(p, "盈 智 +", font_size=56, color=COLOR_RED, bold=True, east_asia="黑体")

# 副标题（英文）
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(8)
add_inline(p, "YING ZHI PLUS", font_size=18, color=COLOR_DARK_GOLD, bold=True)

# 中文标语
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(12)
p.paragraph_format.space_after = Pt(8)
add_inline(p, "AI 智能让财富增益", font_size=22, color=COLOR_RED, bold=True, east_asia="黑体")

# 文档副标题
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(24)
p.paragraph_format.space_after = Pt(4)
add_inline(p, "—— AI 智能财富管理算法引擎升级方案 ——", font_size=16, color=COLOR_DARK, bold=True, east_asia="黑体")

# 装饰线
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_inline(p, "━" * 30, font_size=12, color=COLOR_GOLD)

# 留白
for _ in range(8):
    doc.add_paragraph()

# 底部信息
info_table = doc.add_table(rows=4, cols=2)
info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
info_data = [
    ("项目版本：", "V1.0"),
    ("编写日期：", "2026年9月"),
    ("项目性质：", "工行杯 · 智能财富管理算法引擎升级方案"),
    ("适用客群：", "工商银行零售客户与高净值客户"),
]
for idx, (k, v) in enumerate(info_data):
    cells = info_table.rows[idx].cells
    cells[0].width = Cm(4.5)
    cells[1].width = Cm(9)
    p0 = cells[0].paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_inline(p0, k, font_size=12, color=COLOR_DARK, bold=True, east_asia="黑体")
    p1 = cells[1].paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_inline(p1, v, font_size=12, color=COLOR_RED, bold=True, east_asia="黑体")
    set_cell_bg(cells[0], COLOR_BG_LIGHT)
    set_cell_bg(cells[1], COLOR_BG_TABLE)
    set_cell_borders(cells[0], color="C9A960", size=4)
    set_cell_borders(cells[1], color="C9A960", size=4)

# 装饰线
for _ in range(4):
    doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_inline(p, "━" * 30, font_size=12, color=COLOR_GOLD)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_inline(p, "工商银行财富管理项目组  编", font_size=14, color=COLOR_DARK_GOLD, bold=True, east_asia="黑体")
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_inline(p, "2026 年 9 月", font_size=12, color=COLOR_GRAY, east_asia="楷体")

# 强制分页（进入目录页）
p = doc.add_paragraph()
run = p.add_run()
run.add_break(WD_BREAK.PAGE)

# ======== 目录页 ========
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(24)
p.paragraph_format.space_after = Pt(12)
add_inline(p, "❖ ", font_size=20, color=COLOR_RED, bold=True)
add_inline(p, "目  录", font_size=20, color=COLOR_RED, bold=True, east_asia="黑体")
pPr = p._element.get_or_add_pPr()
pBdr = OxmlElement('w:pBdr')
bottom = OxmlElement('w:bottom')
bottom.set(qn('w:val'), 'single')
bottom.set(qn('w:sz'), '12')
bottom.set(qn('w:space'), '4')
bottom.set(qn('w:color'), 'C9A960')
pBdr.append(bottom)
pPr.append(pBdr)

# 目录列表
toc_items = [
    ("执行摘要", "1"),
    ("第一章  项目背景与需求分析", "3"),
    ("第二章  产品方案与技术创新", "10"),
    ("第三章  商业模式与价值论证", "18"),
    ("第四章  发展规划与实施路径", "24"),
    ("第五章  营销策略", "28"),
    ("第六章  技术可行性分析", "31"),
    ("第七章  竞争分析", "34"),
    ("第八章  风险识别与应对措施", "37"),
    ("附录 A  技术架构详解", "40"),
    ("附录 B  参考文献", "44"),
]
for title, page in toc_items:
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.75
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Cm(1.5)
    # 模拟 leader 效果
    add_inline(p, title, font_size=14, color=COLOR_DARK, bold=True, east_asia="黑体")
    add_inline(p, " " * 4 + "·" * (40 - len(title)) + " ", font_size=10.5, color=COLOR_GOLD)
    add_inline(p, "P" + page, font_size=14, color=COLOR_RED, bold=True)

# 强制分页（进入正文）
p = doc.add_paragraph()
p.add_run().add_break(WD_BREAK.PAGE)

# 解析 Markdown 行
lines = md_content.split('\n')
i = 0
n = len(lines)

# 是否在代码块内
in_code = False
code_buffer = []

# 是否在表格内
in_table = False
table_buffer = []

# 是否在引用块内
blockquote_buffer = []

# 是否在列表内
list_buffer = []


def flush_blockquote():
    if blockquote_buffer:
        text = ' '.join(blockquote_buffer)
        add_blockquote(text)
        blockquote_buffer.clear()


def flush_list():
    if list_buffer:
        for item in list_buffer:
            text = item
            # 解析加粗
            parts = re.split(r'(\*\*[^*]+\*\*)', text)
            p = doc.add_paragraph()
            pf = p.paragraph_format
            pf.left_indent = Cm(0.8)
            pf.first_line_indent = Cm(-0.4)
            pf.line_spacing = 1.5
            pf.space_before = Pt(2)
            pf.space_after = Pt(2)
            add_inline(p, "• ", font_size=10.5, color=COLOR_RED, bold=True)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    add_inline(p, part[2:-2], font_size=10.5, color=COLOR_DARK, bold=True)
                else:
                    # 处理行内代码 `xxx`
                    sub_parts = re.split(r'(`[^`]+`)', part)
                    for sp in sub_parts:
                        if sp.startswith('`') and sp.endswith('`'):
                            add_inline(p, sp[1:-1], font_size=10, color=COLOR_RED, east_asia="Consolas")
                        else:
                            add_inline(p, sp, font_size=10.5, color=COLOR_DARK)
        list_buffer.clear()


def flush_table():
    if table_buffer:
        add_table_from_md(table_buffer)
        table_buffer.clear()


# 标题区
title_seen = False

while i < n:
    line = lines[i]
    stripped = line.strip()

    # 代码块
    if stripped.startswith('```'):
        if not in_code:
            in_code = True
            code_buffer = []
            i += 1
            continue
        else:
            add_code_block('\n'.join(code_buffer))
            code_buffer = []
            in_code = False
            i += 1
            continue
    if in_code:
        code_buffer.append(line)
        i += 1
        continue

    # 表格
    if '|' in stripped and (stripped.startswith('|') or i + 1 < n and re.match(r'^\|?\s*[-:]+', lines[i+1].strip())):
        in_table = True
        table_buffer.append(line)
        i += 1
        continue
    else:
        if in_table:
            flush_table()
            in_table = False

    # 空行
    if not stripped:
        flush_blockquote()
        flush_list()
        i += 1
        continue

    # 标题
    if stripped.startswith('# '):
        flush_blockquote()
        flush_list()
        text = stripped[2:].strip()
        if not title_seen:
            # 文档封面主标题
            title_seen = True
            # 顶部装饰
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pf = p.paragraph_format
            pf.space_before = Pt(0)
            pf.space_after = Pt(6)
            add_inline(p, "━" * 20, font_size=10.5, color=COLOR_GOLD)
            # 主标题
            p2 = doc.add_paragraph()
            p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pf2 = p2.paragraph_format
            pf2.space_before = Pt(12)
            pf2.space_after = Pt(6)
            add_inline(p2, text.split(' — ')[0] if ' — ' in text else text, font_size=32, color=COLOR_RED, bold=True, east_asia="黑体")
            # 副标题
            if ' — ' in text:
                p3 = doc.add_paragraph()
                p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf3 = p3.paragraph_format
                pf3.space_before = Pt(4)
                pf3.space_after = Pt(4)
                add_inline(p3, text.split(' — ')[1], font_size=18, color=COLOR_DARK_GOLD, bold=True, east_asia="黑体")
            p4 = doc.add_paragraph()
            p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pf4 = p4.paragraph_format
            pf4.space_before = Pt(6)
            pf4.space_after = Pt(12)
            add_inline(p4, "━" * 20, font_size=10.5, color=COLOR_GOLD)
        else:
            add_h1(text)
        i += 1
        continue

    if stripped.startswith('## '):
        flush_blockquote()
        flush_list()
        text = stripped[3:].strip()
        add_h2(text)
        i += 1
        continue

    if stripped.startswith('### '):
        flush_blockquote()
        flush_list()
        text = stripped[4:].strip()
        add_h3(text)
        i += 1
        continue

    if stripped.startswith('#### '):
        flush_blockquote()
        flush_list()
        text = stripped[5:].strip()
        add_h4(text)
        i += 1
        continue

    # 分隔线
    if stripped == '---':
        flush_blockquote()
        flush_list()
        add_hr()
        i += 1
        continue

    # 引用块
    if stripped.startswith('>'):
        text = stripped.lstrip('>').strip()
        blockquote_buffer.append(text)
        i += 1
        continue

    # 列表项
    if re.match(r'^[-*]\s+', stripped) or re.match(r'^\d+\.\s+', stripped):
        flush_blockquote()
        text = re.sub(r'^[-*]\s+', '', stripped)
        text = re.sub(r'^\d+\.\s+', '', text)
        list_buffer.append(text)
        i += 1
        continue

    # 普通段落（含粗体/行内代码）
    flush_blockquote()
    flush_list()
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    pf.space_before = Pt(2)
    pf.space_after = Pt(4)
    pf.first_line_indent = Cm(0.74)  # 首行缩进2字符

    # 切分加粗和行内代码
    parts = re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', stripped)
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            add_inline(p, part[2:-2], font_size=10.5, color=COLOR_DARK, bold=True)
        elif part.startswith('`') and part.endswith('`'):
            add_inline(p, part[1:-1], font_size=10, color=COLOR_RED, east_asia="Consolas")
        else:
            add_inline(p, part, font_size=10.5, color=COLOR_DARK)
    i += 1


# 收尾
flush_table()
flush_blockquote()
flush_list()

# ======== 封面页（前置）=======
# 我们已经在开头输出了主标题，再加一个文档说明区
# （说明：因 Word 文件按顺序追加，封面的主标题已经是文档第一页）

# 保存
out_path = r'C:\Users\WHB\Desktop\ICBC-WMP\ICBC-WMP\方案\upgrade\盈智+_AI智能财富管理算法引擎升级方案.docx'
doc.save(out_path)
print(f"已生成 Word 文档：{out_path}")
print(f"文件大小：{os.path.getsize(out_path)/1024:.1f} KB")
