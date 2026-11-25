import sys
from playwright.sync_api import sync_playwright
T=lambda ws: '<div class="grid">'+''.join(f'<div class="t d">{w}</div>' for w in ws)+'</div>'
name,ans,answ,words=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4].split(',')
main=(f'<div class="row"><b>Wczoraj: {ans}</b><span>{answ}</span></div>'
      '<h1>Co łączy<br>te 4 słowa?</h1>'+T(words)+
      '<p class="sub">Odpowiedź jutro. A w grze czeka dziś 16 nowych słów.</p>')
html=open('tpl.html',encoding='utf-8').read()
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1080,"height":1350})
    pg.set_content(html.replace('<div class="main" id="main"></div>',f'<div class="main">{main}</div>'))
    pg.wait_for_timeout(200); pg.screenshot(path=f"czworki-post-{name}.png"); b.close()
