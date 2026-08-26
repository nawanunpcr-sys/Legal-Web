#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
md2docx.py — แปลง Markdown เป็น .docx ที่เปิดใน Word ได้โดยตารางยังเป็นตารางจริง

ทำไมต้องเขียนเอง: textutil ของ macOS แปลง HTML→docx แล้ว "ตารางหายทั้งหมด"
(ทดสอบแล้วได้ 0 ตารางจาก 37 ตาราง) ส่วน pandoc ไม่ได้ติดตั้งบนเครื่องนี้
สคริปต์นี้เขียน OOXML ตรงๆ จึงคุมได้ว่าตารางออกมาเป็น w:tbl จริง

รองรับ: หัวข้อ h1-h4 · ย่อหน้า · ตาราง · บล็อกโค้ด/ผัง (ฟอนต์ monospace)
        รายการ · blockquote · เส้นคั่น · **ตัวหนา** · `โค้ดในบรรทัด`

ใช้:  python3 scripts/md2docx.py <input.md> <output.docx>
"""
import sys, re, zipfile, html

def esc(s): return html.escape(str(s), quote=False)

FONT_TH = 'Sarabun'      # ฟอนต์ไทยที่มากับ Office/macOS ส่วนใหญ่
FONT_MONO = 'Menlo'      # ผัง ASCII ต้องใช้ความกว้างคงที่ ไม่งั้นกรอบเบี้ยว

def runs(text, mono=False):
    """แปลงข้อความ inline เป็น w:r หลายตัว — รองรับ **หนา** และ `โค้ด`"""
    out, parts = [], re.split(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)', text)
    for p in parts:
        if not p: continue
        bold = p.startswith('**') and p.endswith('**')
        ital = (not bold) and p.startswith('*') and p.endswith('*') and len(p) > 2
        code = p.startswith('`') and p.endswith('`')
        body = p[2:-2] if bold else (p[1:-1] if (code or ital) else p)
        font = FONT_MONO if (code or mono) else FONT_TH
        rpr = f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/>'
        if bold: rpr += '<w:b/><w:bCs/>'
        if ital: rpr += '<w:i/><w:iCs/>'
        if code or mono: rpr += '<w:sz w:val="17"/><w:szCs w:val="17"/>'
        else: rpr += '<w:sz w:val="22"/><w:szCs w:val="22"/>'
        out.append(f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{esc(body)}</w:t></w:r>')
    return ''.join(out) or '<w:r><w:t/></w:r>'

def para(text, size=22, bold=False, mono=False, before=60, after=60, shade=None, border=False):
    ppr = f'<w:spacing w:before="{before}" w:after="{after}" w:line="264" w:lineRule="auto"/>'
    if shade: ppr += f'<w:shd w:val="clear" w:fill="{shade}"/>'
    if border: ppr += '<w:pBdr><w:left w:val="single" w:sz="18" w:space="6" w:color="888888"/></w:pBdr>'
    if bold or mono:
        r = ''.join(f'<w:r><w:rPr><w:rFonts w:ascii="{FONT_MONO if mono else FONT_TH}" w:hAnsi="{FONT_MONO if mono else FONT_TH}" w:cs="{FONT_MONO if mono else FONT_TH}"/>'
                    f'{"<w:b/><w:bCs/>" if bold else ""}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
                    f'<w:t xml:space="preserve">{esc(text)}</w:t></w:r>' for _ in [0])
    else:
        r = runs(text, mono)
    return f'<w:p><w:pPr>{ppr}</w:pPr>{r}</w:p>'

def heading(text, lvl):
    size = {1: 40, 2: 30, 3: 25, 4: 22}[lvl]
    bdr = '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="3" w:color="666666"/></w:pBdr>' if lvl <= 2 else ''
    return (f'<w:p><w:pPr><w:spacing w:before="{300 if lvl<=2 else 200}" w:after="100"/>{bdr}</w:pPr>'
            f'<w:r><w:rPr><w:rFonts w:ascii="{FONT_TH}" w:hAnsi="{FONT_TH}" w:cs="{FONT_TH}"/><w:b/><w:bCs/>'
            f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
            f'<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>')

def cell(text, w, head=False):
    shade = '<w:shd w:val="clear" w:fill="E8E8E8"/>' if head else ''
    rpr = f'<w:rFonts w:ascii="{FONT_TH}" w:hAnsi="{FONT_TH}" w:cs="{FONT_TH}"/><w:sz w:val="19"/><w:szCs w:val="19"/>'
    if head: rpr += '<w:b/><w:bCs/>'
    body = runs(text) if not head else f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{esc(text)}</w:t></w:r>'
    return (f'<w:tc><w:tcPr><w:tcW w:w="{w}" w:type="dxa"/>{shade}'
            f'<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>'
            f'<w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar></w:tcPr>'
            f'<w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>{body}</w:p></w:tc>')

def table(head, rows):
    total, n = 9360, max(len(head), 1)
    w = total // n
    b = '<w:tblBorders>' + ''.join(
        f'<w:{s} w:val="single" w:sz="6" w:space="0" w:color="999999"/>'
        for s in ['top','left','bottom','right','insideH','insideV']) + '</w:tblBorders>'
    out = [f'<w:tbl><w:tblPr><w:tblW w:w="{total}" w:type="dxa"/>{b}</w:tblPr>']
    out.append('<w:tr><w:trPr><w:tblHeader/></w:trPr>' + ''.join(cell(h, w, True) for h in head) + '</w:tr>')
    for r in rows:
        r = (r + [''] * n)[:n]
        out.append('<w:tr>' + ''.join(cell(c, w) for c in r) + '</w:tr>')
    out.append('</w:tbl>' + para('', after=80))
    return ''.join(out)

def convert(md):
    lines, body, i = md.split('\n'), [], 0
    while i < len(lines):
        L = lines[i]
        if L.startswith('```'):
            buf = []; i += 1
            while i < len(lines) and not lines[i].startswith('```'): buf.append(lines[i]); i += 1
            i += 1
            for b in buf:
                body.append(para(b or ' ', size=15, mono=True, before=0, after=0, shade='F4F4F4'))
            body.append(para('', after=80)); continue
        if re.match(r'^\|', L) and i + 1 < len(lines) and re.match(r'^\|[\s:|-]+\|$', lines[i+1]):
            head = [c.strip() for c in L.split('|')[1:-1]]
            i += 2; rows = []
            while i < len(lines) and re.match(r'^\|', lines[i]):
                rows.append([c.strip() for c in lines[i].split('|')[1:-1]]); i += 1
            body.append(table(head, rows)); continue
        h = re.match(r'^(#{1,4})\s+(.*)$', L)
        if h: body.append(heading(h.group(2), len(h.group(1)))); i += 1; continue
        if re.match(r'^---+$', L):
            body.append('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>')
            i += 1; continue
        if L.startswith('> '):
            buf = []
            while i < len(lines) and lines[i].startswith('> '): buf.append(lines[i][2:]); i += 1
            body.append(para(' '.join(buf), border=True, shade='FAFAFA')); continue
        if re.match(r'^\s*([-*]|\d+\.)\s+', L):
            while i < len(lines) and re.match(r'^\s*([-*]|\d+\.)\s+', lines[i]):
                body.append(para('•  ' + re.sub(r'^\s*(?:[-*]|\d+\.)\s+', '', lines[i]), before=20, after=20))
                i += 1
            continue
        if L.strip() == '': i += 1; continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r'^[#>|`-]', lines[i]):
            buf.append(lines[i]); i += 1
        # กันวนไม่รู้จบ: บรรทัดที่ขึ้นต้นด้วย | # > ` - แต่ไม่เข้าเงื่อนไขสาขาไหนเลย
        # (เช่น แถวตารางที่ไม่มีบรรทัดคั่น) จะทำให้ while ข้างบนไม่ทำงาน buf ว่าง และ i ไม่ขยับ
        if not buf:
            buf.append(lines[i]); i += 1
        body.append(para(' '.join(buf)))
    return ''.join(body)

DOC = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
 '<w:body>{}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
 '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>')
CT = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
 '<Default Extension="xml" ContentType="application/xml"/>'
 '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
 '</Types>')
RELS = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
 '</Relationships>')

def main():
    src, dst = sys.argv[1], sys.argv[2]
    md = open(src, encoding='utf-8').read()
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', CT)
        z.writestr('_rels/.rels', RELS)
        z.writestr('word/_rels/document.xml.rels',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')
        z.writestr('word/document.xml', DOC.format(convert(md)))
    print(f'เขียน {dst}')

if __name__ == '__main__':
    main()
