# -*- coding: utf-8 -*-
"""
将参赛方案 Markdown 文件转换为精美的 Word 文档
"""

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import re

# ── 品牌色板 ─────────────────────────────────────────────
ICBC_RED    = RGBColor(0xCD, 0x26, 0x26)
ICBC_GOLD   = RGBColor(0xB8, 0x97, 0x38)
INK         = RGBColor(0x1A, 0x1A, 0x1A)
INK_LIGHT   = RGBColor(0x66, 0x66, 0x66)
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
GREY_LIGHT  = RGBColor(0xF5, 0xF5, 0xF5)
GREEN_DARK  = RGBColor(0x2E, 0x7D, 0x32)
BLUE_DARK   = RGBColor(0x15, 0x65, 0xC0)
ORANGE_DARK = RGBColor(0xE6, 0x51, 0x00)
PURPLE_DARK = RGBColor(0x6A, 0x1B, 0x9A)


# ── XML / Run 辅助 ─────────────────────────────────────────

def set_run_font(run, name='微软雅黑', size=11, bold=False, italic=False, color=None, underline=False):
    run.font.name = name
    run._element.rPr.rFonts.set(qn('w:eastAsia'), name)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.underline = underline
    if color:
        run.font.color.rgb = color


def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def set_para_shading(para, hex_color):
    pPr = para._element.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    pPr.append(shd)


def set_cell_borders_color(cell, color='E0E0E0', sz='4'):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for side in ['top', 'left', 'bottom', 'right']:
        el = OxmlElement(f'w:{side}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), sz)
        el.set(qn('w:color'), color)
        borders.append(el)
    tcPr.append(borders)


def set_table_border_color(table, color='E0E0E0', sz='4'):
    tbl = table._tbl
    tblPr = tbl.find(qn('w:tblPr'))
    if tblPr is None:
        tblPr = OxmlElement('w:tblPr')
        tbl.insert(0, tblPr)
    borders = OxmlElement('w:tblBorders')
    for side in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        el = OxmlElement(f'w:{side}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), sz)
        el.set(qn('w:color'), color)
        borders.append(el)
    tblPr.append(borders)


def add_horizontal_rule(doc, color='CD2626', sz='6'):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after  = Pt(2)
    pPr = p._element.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bot = OxmlElement('w:bottom')
    bot.set(qn('w:val'), 'single')
    bot.set(qn('w:sz'), sz)
    bot.set(qn('w:space'), '1')
    bot.set(qn('w:color'), color)
    pBdr.append(bot)
    pPr.append(pBdr)


def set_col_width(table, col_idx, width_cm):
    """设置列宽（厘米）"""
    tbl = table._tbl
    tblGrid = tbl.find(qn('w:tblGrid'))
    if tblGrid is not None:
        gridCols = tblGrid.findall(qn('w:gridCol'))
        if col_idx < len(gridCols):
            gridCols[col_idx].set(qn('w:w'), str(int(width_cm * 567)))


def set_row_height(row, height_pt, rule=WD_ROW_HEIGHT_RULE.AT_LEAST):
    trPr = row._tr.get_or_add_trPr()
    trHeight = OxmlElement('w:trHeight')
    trHeight.set(qn('w:val'), str(int(height_pt * 20)))
    trHeight.set(qn('w:hRule'), 'atLeast')
    trPr.append(trHeight)


def add_colored_table_header(table, row_idx, cells_with_colors):
    """
    cells_with_colors: list of (text, bg_hex, text_rgb_tuple) tuples
    """
    row = table.rows[row_idx]
    for ci, (text, bg_hex, rgb_tuple) in enumerate(cells_with_colors):
        if ci >= len(row.cells):
            break
        cell = row.cells[ci]
        set_cell_bg(cell, bg_hex)
        set_cell_borders_color(cell, bg_hex, '8')
        cell.text = ''
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        para.paragraph_format.space_before = Pt(6)
        para.paragraph_format.space_after  = Pt(6)
        run = para.add_run(text)
        r, g, b = rgb_tuple
        set_run_font(run, '微软雅黑', 11, bold=True, color=RGBColor(r, g, b))


def add_step_table(doc, steps):
    """
    渲染用户旅程四步表格，每步一个彩色区块
    steps: list of (title, icon, items, color_hex, text_rgb)
    """
    cols = len(steps)
    table = doc.add_table(rows=3, cols=cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_border_color(table, 'FFFFFF', '4')

    # 设置列宽均匀
    for ci in range(cols):
        set_col_width(table, ci, 3.8)

    for ci, (title, icon, items, color_hex, text_rgb) in enumerate(steps):
        # ── 第一行：标题 ──────────────────────────────
        header_cell = table.rows[0].cells[ci]
        set_cell_bg(header_cell, color_hex)
        set_cell_borders_color(header_cell, color_hex, '8')
        set_row_height(table.rows[0], 36)
        header_cell.text = ''
        hp = header_cell.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        hp.paragraph_format.space_before = Pt(8)
        hp.paragraph_format.space_after  = Pt(4)
        hr = hp.add_run(f'{icon}  {title}')
        r, g, b = text_rgb
        set_run_font(hr, '微软雅黑', 12, bold=True, color=RGBColor(r, g, b))

        # ── 第二行：内容 ──────────────────────────────
        content_cell = table.rows[1].cells[ci]
        set_cell_bg(content_cell, 'FAFAFA')
        set_cell_borders_color(content_cell, color_hex, '4')
        content_cell.text = ''
        for idx, item in enumerate(items):
            if idx > 0:
                content_cell.add_paragraph()
            p = content_cell.paragraphs[idx] if idx < len(content_cell.paragraphs) else content_cell.add_paragraph()
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after  = Pt(3)
            r = p.add_run(f'• {item}')
            set_run_font(r, '微软雅黑', 9, color=INK)

        # ── 第三行：底边色条 ─────────────────────────
        footer_cell = table.rows[2].cells[ci]
        set_cell_bg(footer_cell, color_hex)
        set_cell_borders_color(footer_cell, color_hex, '4')
        set_row_height(table.rows[2], 6)
        footer_cell.text = ''

    doc.add_paragraph()  # 空行


def add_architecture_table(doc):
    """
    三层架构彩色卡片表：用户体验层 / 算法层 / 数据层
    """
    table = doc.add_table(rows=5, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_border_color(table, 'FFFFFF', '4')

    widths = [6.5, 6.5, 6.5]
    for ci, w in enumerate(widths):
        set_col_width(table, ci, w)

    configs = [
        ('🏗️ 用户体验层', 'CD2626', (255, 255, 255),  # 红白
         ['Next.js 14 App Router', '欢迎页 Welcome', '客户档案 Customer',
          'KYC流程 KYC', '资产配置 Plan', '预约单 Reservation']),
        ('⚙️ 智能算法层', '2E7D32', (255, 255, 255),  # 绿白
         ['双轨决策树 · 客户分层引擎', '金字塔配置 · 四层资产配置',
          '现金流永续 · 养老测算', '产品推荐 · 5维评分', '合规检查 · 12类检查项']),
        ('🔒 数据与安全层', '1565C0', (255, 255, 255),  # 蓝白
         ['ICBC产品数据库 · 24类', '客户画像与KYC数据', '5层字段级脱敏',
          'AES-256 + SHA-256', '访问审计日志', 'RLS行级安全']),
    ]

    for ci, (title, color_hex, text_rgb, items) in enumerate(configs):
        # 标题行
        hc = table.rows[0].cells[ci]
        set_cell_bg(hc, color_hex)
        set_cell_borders_color(hc, color_hex, '8')
        set_row_height(table.rows[0], 32)
        hc.text = ''
        p = hc.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after  = Pt(6)
        r = p.add_run(title)
        tr, tg, tb = text_rgb
        set_run_font(r, '微软雅黑', 12, bold=True, color=RGBColor(tr, tg, tb))

        # 副标题
        sc = table.rows[1].cells[ci]
        set_cell_bg(sc, 'F8F8F8')
        set_cell_borders_color(sc, color_hex, '4')
        sc.text = ''
        sp = sc.paragraphs[0]
        sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sp.paragraph_format.space_before = Pt(3)
        sp.paragraph_format.space_after  = Pt(3)
        sub_texts = {
            'CD2626': 'Next.js 14 · React 18 · TypeScript',
            '2E7D32': 'Pure TypeScript · 模块化算法引擎',
            '1565C0': 'Neon Postgres · RLS · Prisma ORM',
        }
        sr = sp.add_run(sub_texts.get(color_hex, ''))
        set_run_font(sr, '微软雅黑', 8, italic=True, color=INK_LIGHT)

        # 内容行（合并2-4行）
        if ci == 0:
            items_rows = [items[:3], items[3:]]
        elif ci == 1:
            items_rows = [items[:3], items[3:]]
        else:
            items_rows = [items[:3], items[3:]]

        for ri_offset, row_items in enumerate(items_rows):
            rc = table.rows[2 + ri_offset].cells[ci]
            set_cell_bg(rc, 'FAFAFA')
            set_cell_borders_color(rc, color_hex, '3')
            rc.text = ''
            for idx, item in enumerate(row_items):
                if idx > 0:
                    rc.add_paragraph()
                p = rc.paragraphs[idx]
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.space_after  = Pt(3)
                run = p.add_run(f'  • {item}')
                set_run_font(run, '微软雅黑', 9, color=INK)

        # 底色条
        fc = table.rows[4].cells[ci]
        set_cell_bg(fc, color_hex)
        set_cell_borders_color(fc, color_hex, '4')
        set_row_height(table.rows[4], 6)
        fc.text = ''

    doc.add_paragraph()


def add_pyramid_table(doc):
    """
    金字塔四层彩色配置表
    """
    headers = [
        ('🌟 卫星层', 'FF6D00', (255, 255, 255)),
        ('🌱 成长层', '2E7D32', (255, 255, 255)),
        ('📈 稳健层', '1565C0', (255, 255, 255)),
        ('💰 现金层', 'AD1457', (255, 255, 255)),
    ]
    rows_data = [
        ('比例区间', '5 – 20%', '20 – 40%', '30 – 50%', '10 – 20%'),
        ('投资品种', 'QDII · REITs · 黄金', '混合基金 · 股票基金 · 指数基金 · ESG基金',
         '银行理财PR2 · 债券基金 · 养老目标FOF · 年金险', '货币基金 · 天天理财 · 活期存款'),
        ('核心目标', '分散化 + 追求超额收益', '长期资本增值', '稳健增值 + 对抗通胀', '流动性安全垫'),
        ('风险等级', 'R4 – R5', 'R3 – R5', 'R1 – R4', 'R1 – R5'),
        ('典型场景', '全球配置、对冲风险', '长期持有、复利增长', '家庭储备、子女教育', '应急备用、随时可取'),
    ]

    cols = 5  # 标签列 + 4个数据列
    table = doc.add_table(rows=len(rows_data) + 1, cols=cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_border_color(table, 'CCCCCC', '4')

    # 设置列宽
    set_col_width(table, 0, 2.5)
    for ci in range(1, 5):
        set_col_width(table, ci, 4.2)

    # 表头行
    header_row = table.rows[0]
    # 标签列
    label_cell = header_row.cells[0]
    set_cell_bg(label_cell, 'F5F5F5')
    set_cell_borders_color(label_cell, 'CCCCCC')
    label_cell.text = ''
    lp = label_cell.paragraphs[0]
    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lp.paragraph_format.space_before = Pt(6)
    lp.paragraph_format.space_after  = Pt(6)
    lr = lp.add_run('指标')
    set_run_font(lr, '微软雅黑', 10, bold=True, color=INK)

    for ci, (title, bg_hex, text_rgb) in enumerate(headers):
        cell = header_row.cells[ci + 1]
        set_cell_bg(cell, bg_hex)
        set_cell_borders_color(cell, bg_hex, '6')
        cell.text = ''
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after  = Pt(6)
        r = p.add_run(title)
        tr, tg, tb = text_rgb
        set_run_font(r, '微软雅黑', 11, bold=True, color=RGBColor(tr, tg, tb))

    # 数据行
    for ri, row_vals in enumerate(rows_data):
        row = table.rows[ri + 1]
        # 标签列
        lbl_cell = row.cells[0]
        bg = 'FFF8E1' if ri % 2 == 0 else 'FFFDE7'
        set_cell_bg(lbl_cell, bg)
        set_cell_borders_color(lbl_cell, 'CCCCCC')
        lbl_cell.text = ''
        lp = lbl_cell.paragraphs[0]
        lp.paragraph_format.space_before = Pt(5)
        lp.paragraph_format.space_after  = Pt(5)
        lr = lp.add_run(row_vals[0])
        set_run_font(lr, '微软雅黑', 9, bold=True, color=INK)

        # 数据列
        for ci, val in enumerate(row_vals[1:]):
            cell = row.cells[ci + 1]
            set_cell_bg(cell, 'FAFAFA')
            set_cell_borders_color(cell, 'DDDDDD', '3')
            cell.text = ''
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(5)
            p.paragraph_format.space_after  = Pt(5)
            r = p.add_run(val)
            set_run_font(r, '微软雅黑', 9, color=INK)

    doc.add_paragraph()


def add_data_model_table(doc):
    """
    数据模型彩色表格
    """
    data = [
        # (实体, 主键, 关联, 关键字段, 领域色)
        ('Customer 客户', 'uuid id PK', '1:N → CustomerProfile',
         'name, age, risk_level, investable_asset', 'CD2626'),
        ('CustomerProfile 客户档案', 'uuid id PK', '1:N → CustomerKYC [可版本化]',
         'profile_data (JSONB), updated_at', 'E53935'),
        ('CustomerKYC KYC档案', 'uuid id PK', 'N:1 ← Profile',
         'kyc_data (JSONB), version', 'B89738'),
        ('RiskAssessment 风险评估', '— (子集)', '⊂ KYC',
         'risk_level, confidence, path_log', 'B89738'),
        ('FinancialGoal 财务目标', '— (子集)', '⊂ KYC',
         'retirement_age, monthly_income, goals[]', 'B89738'),
        ('InsuranceCoverage 保险保障', '— (子集)', '⊂ KYC',
         'life_insurance, critical_illness, medical', 'B89738'),
        ('ConsentRecord 授权记录', '— (子集)', '⊂ KYC',
         'consent_type, consent_date', 'B89738'),
        ('ReservationOrder 预约单', 'uuid id PK', 'N:1 ← Customer',
         'order_no, status, plan_snapshot', '1565C0'),
        ('AllocationPlan 资产配置方案', 'uuid id PK', 'N:1 ← Order',
         'pyramid_config, created_at', '2E7D32'),
        ('AllocationPlanItem 配置项', 'uuid id PK', 'N:1 ← Plan',
         'product_id, layer, amount, ratio', '2E7D32'),
        ('Product 产品', 'uuid id PK', '独立实体',
         'name, risk_level, expected_return', '283593'),
        ('DataAccessLog 访问日志', 'uuid id PK', 'N:1 ← Customer',
         'accessor_role, accessed_fields, accessed_at', 'E65100'),
    ]

    cols = 5
    table = doc.add_table(rows=len(data) + 1, cols=cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_border_color(table, 'CCCCCC', '4')

    # 列宽
    set_col_width(table, 0, 3.5)
    set_col_width(table, 1, 2.2)
    set_col_width(table, 2, 3.5)
    set_col_width(table, 3, 5.0)
    set_col_width(table, 4, 1.5)

    # 表头
    header_row = table.rows[0]
    headers = [('核心实体', 'CD2626'), ('主键', '37474F'),
               ('关联关系', '37474F'), ('关键字段', '37474F'), ('领域', '37474F')]
    for ci, (title, color_hex) in enumerate(headers):
        cell = header_row.cells[ci]
        set_cell_bg(cell, color_hex)
        set_cell_borders_color(cell, color_hex, '6')
        cell.text = ''
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after  = Pt(6)
        r = p.add_run(title)
        set_run_font(r, '微软雅黑', 10, bold=True, color=WHITE)

    # 数据行
    for ri, (entity, pk, relation, fields, color_hex) in enumerate(data):
        row = table.rows[ri + 1]
        bg = 'FAFAFA' if ri % 2 == 0 else 'FFFFFF'

        # 实体列（带色条）
        ec = row.cells[0]
        set_cell_bg(ec, bg)
        set_cell_borders_color(ec, 'DDDDDD', '3')
        ec.text = ''
        # 左边加色条
        tcp = ec._tc.get_or_add_tcPr()
        left_border = OxmlElement('w:left')
        left_border.set(qn('w:val'), 'single')
        left_border.set(qn('w:sz'), '18')
        left_border.set(qn('w:color'), color_hex)
        tcBorders = OxmlElement('w:tcBorders')
        tcBorders.append(left_border)
        tcp.append(tcBorders)
        # 内容
        p = ec.paragraphs[0]
        p.paragraph_format.space_before = Pt(5)
        p.paragraph_format.space_after  = Pt(5)
        p.paragraph_format.left_indent   = Cm(0.2)
        r = p.add_run(entity)
        set_run_font(r, '微软雅黑', 9, bold=True, color=RGBColor(int(color_hex[:2], 16), int(color_hex[2:4], 16), int(color_hex[4:], 16)))

        for ci, val in enumerate([pk, relation, fields, '']):
            cell = row.cells[ci + 1]
            set_cell_bg(cell, bg)
            set_cell_borders_color(cell, 'DDDDDD', '3')
            cell.text = ''
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(5)
            p.paragraph_format.space_after  = Pt(5)
            if ci < 3:
                run = p.add_run(val)
                set_run_font(run, '微软雅黑', 9, color=INK)
            else:
                # 领域色块
                run = p.add_run('●')
                run.font.color.rgb = RGBColor(int(color_hex[:2], 16), int(color_hex[2:4], 16), int(color_hex[4:], 16))
                set_run_font(run, '微软雅黑', 14)

    doc.add_paragraph()


# ── Markdown 解析 ──────────────────────────────────────────

def parse_inline(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    return text


def md_table_to_docx(doc, lines, start):
    table_lines = []
    i = start
    while i < len(lines):
        line = lines[i].strip()
        if line and not line.startswith('|'):
            break
        if line == '' and len(table_lines) > 0:
            if i + 1 < len(lines) and not lines[i + 1].strip().startswith('|'):
                break
        table_lines.append(line)
        i += 1

    if len(table_lines) < 2:
        return i

    rows_data = []
    for line in table_lines:
        if re.match(r'^[\|\s\-:]+$', line):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        cells = [parse_inline(c) for c in cells]
        rows_data.append(cells)

    if not rows_data:
        return i

    col_count = len(rows_data[0])
    table = doc.add_table(rows=len(rows_data), cols=col_count)
    set_table_border_color(table, 'DDDDDD', '4')
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for r_idx, row_data in enumerate(rows_data):
        row = table.rows[r_idx]
        for c_idx, cell_text in enumerate(row_data):
            if c_idx >= len(row.cells):
                break
            cell = row.cells[c_idx]
            cell.text = ''
            para = cell.paragraphs[0]
            para.paragraph_format.space_before = Pt(4)
            para.paragraph_format.space_after  = Pt(4)
            run = para.add_run(cell_text)
            set_run_font(run, '微软雅黑', 10)
            if r_idx == 0:
                run.font.bold = True
                run.font.color.rgb = WHITE
                set_cell_bg(cell, 'CD2626')
                set_cell_borders_color(cell, 'CD2626', '6')
            else:
                set_cell_bg(cell, 'FAFAFA' if r_idx % 2 == 1 else 'FFFFFF')

    return i


def md_to_docx(md_file, docx_file):
    doc = Document()

    # ── 页面设置 ─────────────────────────────────────────
    section = doc.sections[0]
    section.page_width    = Cm(21)
    section.page_height   = Cm(29.7)
    section.left_margin   = Cm(2.8)
    section.right_margin  = Cm(2.8)
    section.top_margin    = Cm(2.5)
    section.bottom_margin = Cm(2.5)

    # 默认样式
    style = doc.styles['Normal']
    style.font.name = '微软雅黑'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
    style.font.size = Pt(11)
    style.font.color.rgb = INK

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    i = 0
    in_architecture = False

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        # ── 封面标题 ───────────────────────────────────
        if line.startswith('# '):
            text = line[2:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(24)
            p.paragraph_format.space_after  = Pt(12)
            run = p.add_run(text)
            set_run_font(run, '微软雅黑', 26, bold=True, color=ICBC_RED)
            i += 1
            continue

        # ── 封面信息 ───────────────────────────────────
        if line.startswith('> '):
            text = line[2:].strip()
            text = parse_inline(text)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(text)
            set_run_font(run, '微软雅黑', 11, color=INK_LIGHT)
            i += 1
            continue

        # ── 一级标题 ───────────────────────────────────
        if line.startswith('## '):
            text = line[3:].strip()
            doc.add_paragraph()
            p = doc.add_heading(text, level=1)
            for run in p.runs:
                set_run_font(run, '微软雅黑', 16, bold=True, color=ICBC_RED)
            add_horizontal_rule(doc)
            i += 1
            continue

        # ── 二级标题 ───────────────────────────────────
        if line.startswith('### '):
            text = line[4:].strip()
            p = doc.add_heading(text, level=2)
            for run in p.runs:
                set_run_font(run, '微软雅黑', 13, bold=True, color=RGBColor(0x88, 0x17, 0x17))
            i += 1
            continue

        # ── 三级标题 ───────────────────────────────────
        if line.startswith('#### '):
            text = line[5:].strip()
            p = doc.add_heading(text, level=3)
            for run in p.runs:
                set_run_font(run, '微软雅黑', 11, bold=True, color=INK)
            i += 1
            continue

        # ── Mermaid / 代码块 ────────────────────────────
        if line.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            code_text = '\n'.join(code_lines)
            p = doc.add_paragraph()
            p.paragraph_format.left_indent  = Cm(0.5)
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after   = Pt(4)
            set_para_shading(p, 'F0F4F8')
            run = p.add_run(code_text)
            set_run_font(run, 'Consolas', 9, color=RGBColor(0x2E, 0x2E, 0x2E))
            i += 1
            continue

        # ── 表格 ────────────────────────────────────────
        if line.startswith('|'):
            # 检测是否是用户旅程四步表
            if '步骤一' in line and '步骤二' in line and '步骤三' in line and '步骤四' in line:
                add_step_table(doc, [
                    ('客户档案', '📋', ['风险等级光谱图', '购买力侵蚀预警', '同业基准对比'], 'CD2626', (255,255,255)),
                    ('目标与保障', '🔐', ['基本信息采集', '财务状况录入', '理财目标设定'], 'B89738', (255,255,255)),
                    ('智能规划', '📊', ['金字塔配置方案', '现金流永续测算', '产品推荐评分'], '2E7D32', (255,255,255)),
                    ('预约登记', '🎫', ['方案确认', '预约单生成', '合规回溯记录'], '1565C0', (255,255,255)),
                ])
                # 跳过原始表格行
                while i < len(lines) and lines[i].strip().startswith('|'):
                    i += 1
                continue

            # 检测是否是系统架构表
            if '用户体验层' in line and '智能算法层' in line:
                add_architecture_table(doc)
                while i < len(lines) and lines[i].strip().startswith('|'):
                    i += 1
                continue

            # 检测是否是金字塔表
            if '卫星层' in line and '稳健层' in line and '现金层' in line:
                add_pyramid_table(doc)
                while i < len(lines) and lines[i].strip().startswith('|'):
                    i += 1
                continue

            # 检测是否是数据模型表
            if 'Customer' in line or '数据模型' in line:
                if any(k in line for k in ['客户', 'Customer', '预约', '产品', '日志']):
                    # 收集多行
                    table_lines_raw = []
                    while i < len(lines) and lines[i].strip().startswith('|'):
                        table_lines_raw.append(lines[i])
                        i += 1
                    # 如果收集了超过3行，认为是数据模型表
                    if len(table_lines_raw) >= 5:
                        add_data_model_table(doc)
                        continue

            # 普通表格
            i = md_table_to_docx(doc, lines, i)
            continue

        # ── 引用块 ─────────────────────────────────────
        if line.startswith('>'):
            text = line[1:].strip()
            text = parse_inline(text)
            p = doc.add_paragraph()
            p.paragraph_format.left_indent  = Cm(1)
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after  = Pt(4)
            set_para_shading(p, 'FFF8E7')
            pPr = p._element.get_or_add_pPr()
            pBdr = OxmlElement('w:pBdr')
            left = OxmlElement('w:left')
            left.set(qn('w:val'), 'single')
            left.set(qn('w:sz'), '12')
            left.set(qn('w:space'), '4')
            left.set(qn('w:color'), 'B89738')
            pBdr.append(left)
            pPr.append(pBdr)
            run = p.add_run(text)
            set_run_font(run, '微软雅黑', 11, italic=True, color=RGBColor(0x5D, 0x40, 0x00))
            i += 1
            continue

        # ── 列表 ───────────────────────────────────────
        if line.startswith('- ') or line.startswith('* '):
            text = line[2:].strip()
            text = parse_inline(text)
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after  = Pt(2)
            parts = re.split(r'\*\*(.+?)\*\*', text)
            for pi, part in enumerate(parts):
                if pi % 2 == 1:
                    run = p.add_run(part)
                    set_run_font(run, '微软雅黑', 10, bold=True)
                elif part:
                    run = p.add_run(part)
                    set_run_font(run, '微软雅黑', 10)
            i += 1
            continue

        # ── 普通段落 ───────────────────────────────────
        text = parse_inline(line)
        if text.startswith('<!--') or text.startswith('---'):
            i += 1
            continue

        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after  = Pt(3)
        parts = re.split(r'\*\*(.+?)\*\*', text)
        for pi, part in enumerate(parts):
            if pi % 2 == 1:
                run = p.add_run(part)
                set_run_font(run, '微软雅黑', 11, bold=True)
            elif part:
                run = p.add_run(part)
                set_run_font(run, '微软雅黑', 11)

        i += 1

    doc.save(docx_file)
    print('[OK] Word document saved: ' + docx_file)


if __name__ == '__main__':
    md_file   = r'C:\Users\WHB\Desktop\ICBC-WMP\参赛方案_智盈_正式版.md'
    docx_file = r'C:\Users\WHB\Desktop\ICBC-WMP\参赛方案_智盈_正式版_v3.docx'
    md_to_docx(md_file, docx_file)
