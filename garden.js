/* Load the collection garden, living-avatar layer, then the Kidscade avatar atelier integration. */
document.write('<script src="garden-core.js?v=garden-life-v1"><\/script>');
document.write('<script src="garden-life.js?v=garden-life-v1"><\/script>');
document.write('<script src="avatar-integration.js?v=garden-life-v1"><\/script>');

/* Extra game cards registered before index.html snapshots the game-card NodeList. */
(function registerExtraKidscadeGames() {
    const list = document.getElementById('game-list');
    if (!list) return;

    function addCard({ id, href, category, age, icon, title, desc }) {
        if (list.querySelector(`[data-id="${id}"]`)) return;
        const card = document.createElement('a');
        card.href = href;
        card.className = 'game-card';
        card.dataset.category = category;
        card.dataset.age = age;
        card.dataset.id = id;
        card.innerHTML = `
            <span class="fav-star">☆</span>
            <div class="game-icon">${icon}</div>
            <div class="game-title">${title}</div>
            <div class="game-desc">${desc}</div>
        `;
        list.appendChild(card);
    }

    addCard({
        id: 'high_star_hoppers',
        href: '별빛 개척단.html',
        category: 'math',
        age: 'high',
        icon: '🌟',
        title: '별빛 개척단',
        desc: '연속 점프로 별 조각을 반대편 성운까지! AI 대전과 2~6인 로컬 대전을 즐기는 전략 보드게임.'
    });

    addCard({
        id: 'toddler_monkey_vines',
        href: '유아_덤블링몽키즈.html',
        category: 'math',
        age: 'toddler',
        icon: '🐒',
        title: '몽키 쏙쏙!',
        desc: '색을 뽑고 같은 색 덩굴을 톡! 떨어지는 원숭이를 세며 색깔 구별과 수 세기, 차례 기다리기를 익혀요.'
    });
})();
