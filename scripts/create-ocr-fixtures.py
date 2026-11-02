from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

root = Path(__file__).resolve().parents[1]
out = root / 'tests' / 'fixtures' / 'ocr'
out.mkdir(parents=True, exist_ok=True)
facts = [
    'Biologia: budowa ziemniaka',
    'Bulwa ziemniaka jest przekształconym pędem podziemnym.',
    'Oczka bulwy zawierają pąki.',
    'Skrobia pełni funkcję materiału zapasowego.',
    'Nie należy utożsamiać bulwy z korzeniem.',
]
measurements = [
    'Doświadczenie - dane ćwiczeniowe',
    'Próba A: 12,5 g skrobi; temperatura 21 °C.',
    'Próba B: 7 g skrobi; temperatura 18 °C.',
    'Nie dodano soli do próby B.',
    'Wniosek: próba A miała o 5,5 g więcej skrobi niż próba B.',
]
for name, font_path in [('ocr-printed-pl.png', 'arial.ttf'), ('ocr-handwriting-font.png', 'segoepr.ttf')]:
    image = Image.new('RGB', (1800, 1100), '#fffef7')
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype('C:/Windows/Fonts/' + font_path, 38)
    for index, text in enumerate(facts):
        draw.text((70, 80 + index * 135), text, fill='#142d55', font=font)
    image.save(out / name)
Image.new('RGB', (1400, 1000), 'white').save(out / 'ocr-blank.png')

pdfmetrics.registerFont(TTFont('ArialFixture', 'C:/Windows/Fonts/arial.ttf'))
c = canvas.Canvas(str(out / 'ocr-two-pages.pdf'), pagesize=A4)
for page, lines in enumerate([facts, measurements], 1):
    c.setFont('ArialFixture', 15)
    for index, text in enumerate(lines):
        c.drawString(38, 770 - index * 72, text)
    c.setFont('ArialFixture', 10)
    c.drawString(38, 35, f'Strona {page} / 2 - własny materiał kontrolny Notely')
    c.showPage()
c.save()
(out / 'expected.json').write_text(json.dumps({'imageLines': facts, 'pdfPages': [facts, measurements], 'handwritingFixture': 'Synthetic Segoe Print font; NOT a real handwritten photograph.'}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created own OCR fixtures: print, synthetic handwriting, blank image and 2-page PDF.')
