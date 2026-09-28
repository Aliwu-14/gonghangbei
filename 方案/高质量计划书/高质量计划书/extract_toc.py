import zipfile
import re
import os

files = [
    '01_重点推荐_鲁琪15070956278e+医.docx',
    '05_重点推荐_陈琪18179463302工银拾光——为月光族量身定制的理财管家.docx'
]

for fname in files:
    if not os.path.exists(fname):
        continue
    print(f'=== {fname} ===')
    try:
        with zipfile.ZipFile(fname) as z:
            with z.open('word/document.xml') as f:
                content = f.read().decode('utf-8')

                style_pattern = re.compile(r'<w:pStyle w:val="(Heading\d|Title)"/>')
                text_pattern = re.compile(r'<w:t[^>]*>([^<]+)</w:t>')

                paragraphs = re.split(r'<w:p[ >]', content)
                for p in paragraphs:
                    style_match = style_pattern.search(p)
                    if style_match:
                        style = style_match.group(1)
                        texts = text_pattern.findall(p)
                        text = ''.join(texts).strip()
                        if text and len(text) < 100:
                            print(f'  [{style}] {text}')
    except Exception as e:
        print(f'  Error: {e}')
    print()
