import sys
import os
from docx import Document

os.chdir(r'C:\Users\WHB\Desktop\CUMCM\高质量计划书\高质量计划书')

files = [
    '01_重点推荐_鲁琪15070956278e+医.docx',
    '05_重点推荐_陈琪18179463302工银拾光——为月光族量身定制的理财管家.docx'
]

for fname in files:
    if not os.path.exists(fname):
        print(f'Not found: {fname}')
        continue
    print(f'=== {fname} ===')
    try:
        doc = Document(fname)
        # 提取所有段落和样式
        for i, p in enumerate(doc.paragraphs[:200]):
            text = p.text.strip()
            style = p.style.name if p.style else ''
            if text and ('Heading' in style or 'Title' in style):
                indent = '  ' * (1 if 'Heading 2' in style else (2 if 'Heading 3' in style else (3 if 'Heading 4' in style else 0)))
                print(f'{indent}[{style}] {text[:80]}')
    except Exception as e:
        print(f'  Error: {e}')
    print()
