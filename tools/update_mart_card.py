from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='''<a href="10개가 모이면! 수 막대 계산실.html" class="game-card" data-category="math" data-age="low" data-id="math_base10_blocks">
   <span class="fav-star">☆</span>
   <div class="game-icon">🧱</div>
   <div class="game-title">10개가 모이면! 수 막대 계산실</div>
   <div class="game-desc">수 막대 모형을 직접 끌어놓고, 10개씩 묶거나 나누어 풀며 덧셈과 뺄셈의 자릿수 원리를 직관적이고 재미있게 익히는 초등 수학 교구 놀이입니다.</div>
</a>'''
new='''<a href="10개가 모이면! 수 막대 계산실.html" class="game-card" data-category="math" data-age="low" data-id="math_base10_blocks">
   <span class="fav-star">☆</span>
   <div class="game-icon">🧾</div>
   <div class="game-title">우리 동네 마트 계산대</div>
   <div class="game-desc">2D 픽셀 마트에서 상품을 직접 스캔하고 받은 돈을 확인한 뒤, 현금 서랍에서 알맞은 지폐와 동전을 꺼내 거스름돈을 계산해요.</div>
</a>'''
if old not in s:
    raise SystemExit('index card anchor not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
