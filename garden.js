/* Load the collection garden, living-avatar layer, then the Kidscade avatar atelier integration. */
document.write('<script src="garden-core.js?v=garden-life-v1"><\/script>');
document.write('<script src="garden-life.js?v=garden-life-v1"><\/script>');
document.write('<script src="avatar-integration.js?v=garden-life-v1"><\/script>');
document.write('<script src="avatar-preview-boot-fix.js?v=avatar-preview-fix-v1"><\/script>');

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

    addCard({
        id: 'toddler_penguin_ice_pop',
        href: '펭귄_얼음_톡톡.html?v=rework-2',
        category: 'math',
        age: 'toddler',
        icon: '🐧',
        title: '펭귄 얼음 톡톡!',
        desc: '하얀 얼음과 파란 얼음을 톡톡 깨며 색 구별, 1~3 수 세기, 공간관계와 차례 기다리기를 익혀요.'
    });

    addCard({
        id: 'toddler_color_stack',
        href: '색깔_겹겹_컬러코드.html',
        category: 'math',
        age: 'toddler',
        icon: '🧩',
        title: '색깔 겹겹!',
        desc: '투명 그림 카드를 차례대로 겹쳐 목표 그림을 완성하며 색·모양 관찰과 순서 사고를 길러요.'
    });

    addCard({
        id: 'toddler_three_friends_set',
        href: '셋_친구_찾기.html?v=plain-fix-1',
        category: 'math',
        age: 'toddler',
        icon: '🔎',
        title: '셋 친구 찾기!',
        desc: '모양·색깔·개수를 비교해 모두 같거나 모두 다른 카드 3장을 찾으며 관찰력과 분류·논리 사고를 길러요.'
    });
})();
