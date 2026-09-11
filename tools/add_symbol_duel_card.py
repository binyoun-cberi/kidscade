from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
anchor='            <!-- 남극 탐험 대작전 (유아용) -->'
card='''            <a href="딱 하나! 그림 대결.html" class="game-card" data-category="trivia" data-age="toddler" data-id="tod_symbol_duel" data-scorekey="symbolDuelBestStreak">
                <span class="fav-star">☆</span><div class="game-icon">👀</div><div class="game-title">딱 하나! 그림 대결</div>
                <div class="game-desc">두 원형 카드에 공통으로 있는 딱 하나의 그림을 CPU보다 먼저 찾아요! 쉬움 10초·보통 5초·어려움 3초의 관찰력 대결.</div>
            </a>
'''
if 'data-id="tod_symbol_duel"' not in s:
    if anchor not in s: raise SystemExit('toddler card anchor not found')
    s=s.replace(anchor,card+anchor,1)
p.write_text(s,encoding='utf-8')
