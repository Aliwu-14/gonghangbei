import sys
import os
from docx import Document

os.chdir(r'C:\Users\WHB\Desktop\CUMCM\高质量计划书\高质量计划书')
sys.stdout.reconfigure(encoding='utf-8')

# 看看01号 e+医 的整体结构（包括所有段落，不只是标题）
fname = '01_重点推荐_鲁琪15070956278e+医.docx'
print(f'=== {fname} 全段落（前80段）===\n')

doc = Document(fname)
for i, p in enumerate(doc.paragraphs[:80]):
    text = p.text.strip()
    style = p.style.name if p.style else ''
    if text:
        print(f'[{style[:15]:15}] {text[:90]}')
