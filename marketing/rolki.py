import os, sys, csv, subprocess, datetime
from playwright.sync_api import sync_playwright
R=list(csv.DictReader(open('rolki/baza.csv',encoding='utf-8')))
start=datetime.date(2026,11,26)
only=sys.argv[1:]  # opcjonalnie numery do podglądu
LOGO='<div class="logo"><div class="mk"><i></i><i></i><i></i><i></i></div>Czwórki</div>'
grid=lambda ws,cls='': '<div class="grid">'+''.join(f'<div class="t {cls}">{w}</div>' for w in ws)+'</div>'
def count(ws,n): return f'{LOGO}<h1>Co łączy<br>te 4 słowa?</h1>{grid(ws)}<div class="timer"><div class="n">{n}</div><div class="bar"><i style="width:{n*10}%"></i></div></div>'
def ans(ws,a,ex): return f'{LOGO}<div class="ans"><small>Odpowiedź</small><b>{a}</b></div>{grid(ws,"g")}<div class="sub">{ex[0].upper()+ex[1:]}</div>'
def end(): return f'{LOGO}<div class="end">Zgadłeś? 🎉<br>Napisz w komentarzu!</div><div class="sub">Codziennie nowa gra słowna:<br>16 słów, 4 grupy.</div><div class="cta">czworki.pl</div>'
css='''.ans{background:#141413;color:#fff;border-radius:32px;padding:40px 30px;width:100%}.ans small{display:block;font-size:40px;font-weight:600;opacity:.7}.ans b{display:block;font-size:84px;font-weight:800;color:#FFD84A;letter-spacing:-1px}.t.g{background:#FFF8E6;color:#141413}'''
html=open('vid.html',encoding='utf-8').read().replace('</style>',css+'</style>')
enc=['-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-r','30']
def still(png,dur,out):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','30','-i',png,'-vf',f'format=yuv420p,loop=-1:1,trim=duration={dur}',*enc,out+'.tmp.mp4'],check=True); os.rename(out+'.tmp.mp4',out)
os.makedirs('rolki/out',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1080,"height":1920})
    def shot(body,path):
        pg.set_content(html.replace('<div id="c" style="display:contents"></div>',body)); pg.wait_for_timeout(60); pg.screenshot(path=path)
    for r in R:
        if only and r['nr'] not in only: continue
        ws=[r[f'slowo{i}'] for i in range(1,5)]; d=start+datetime.timedelta(int(r['nr'])-1)
        wd=f'/tmp/r{r["nr"]}'; os.makedirs(wd,exist_ok=True); parts=[]
        for i,n in enumerate(range(10,0,-1)):
            shot(count(ws,n),f'{wd}/{i}.png'); still(f'{wd}/{i}.png',1,f'{wd}/{i}.mp4'); parts.append(f'{wd}/{i}.mp4')
        shot(ans(ws,r['odpowiedz'],r['wyjasnienie']),f'{wd}/a.png'); still(f'{wd}/a.png',3.5,f'{wd}/a.mp4'); parts.append(f'{wd}/a.mp4')
        shot(end(),f'{wd}/e.png'); still(f'{wd}/e.png',2.5,f'{wd}/e.mp4'); parts.append(f'{wd}/e.mp4')
        open(f'{wd}/l.txt','w').write(''.join(f"file '{x}'\n" for x in parts))
        out=f'rolki/out/rolka-{d:%m-%d}-{r["nr"]:0>2}.mp4'
        subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',f'{wd}/l.txt','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-shortest','-c:v','copy','-c:a','aac','-movflags','+faststart',out+'.tmp.mp4'],check=True); os.rename(out+'.tmp.mp4',out)
    b.close()
