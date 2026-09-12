/* Load the collection garden, living-avatar layer, then the Kidscade avatar atelier integration. */
document.write('<script src="garden-core.js?v=garden-life-v1"><\/script>');
document.write('<script src="garden-life.js?v=garden-life-v1"><\/script>');
document.write('<script src="avatar-integration.js?v=garden-life-v1"><\/script>');

/* Extra game cards registered before index.html snapshots the game-card NodeList. */
(function registerExtraKidscadeGames() {
    const list = document.getElementById('game-list');
    if (!list || list.querySelector('[data-id="high_star_hoppers"]')) return;

    const card = document.createElement('a');
    card.href = '별빛 개척단.html';
    card.className = 'game-card';
    card.dataset.category = 'math';
    card.dataset.age = 'high';
    card.dataset.id = 'high_star_hoppers';
    card.innerHTML = `
        <span class="fav-star">☆</span>
        <div class="game-icon">🌟</div>
        <div class="game-title">별빛 개척단</div>
        <div class="game-desc">연속 점프로 별 조각을 반대편 성운까지! AI 대전과 2~6인 로컬 대전을 즐기는 전략 보드게임.</div>
    `;
    list.appendChild(card);
})();
