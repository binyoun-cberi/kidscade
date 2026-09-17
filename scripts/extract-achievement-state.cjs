const fs = require('node:fs');

const htmlPath = 'index_base.html';
const bootstrapPath = 'main-bootstrap.js';
let html = fs.readFileSync(htmlPath, 'utf8');
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

if (!html.includes('<script src="achievement-state.js"></script>')) {
  assertIncludes(html, '<script src="daily-progress.js"></script>', 'daily progress script');
  html = html.replace(
    '<script src="daily-progress.js"></script>',
    '<script src="daily-progress.js"></script>\n    <script src="achievement-state.js"></script>'
  );
}

html = html.replace(
  /\n\s*let claimedRanks = safeParseStorage\('kidscade_claimed_ranks', \{\}\);/,
  ''
);
html = html.replace(
  /\n\s*if \(!claimedRanks \|\| typeof claimedRanks !== 'object' \|\| Array\.isArray\(claimedRanks\)\) claimedRanks = \{\};/,
  ''
);

const rankSectionStart = '            function getCustomHistoryRank(score) {';
const rankSectionEnd = '\n\n            function issueCertificate(gameName, rankName) {';
const start = html.indexOf(rankSectionStart);
const end = html.indexOf(rankSectionEnd, start);
if (start < 0 || end < 0) throw new Error('Could not locate legacy achievement controller');

const replacement = `            function syncBadgesAndProfile() {
                gameCards.forEach(card => {
                    const rankKey = card.getAttribute('data-rankkey');
                    const scoreKey = card.getAttribute('data-scorekey');
                    const isTime = card.getAttribute('data-istime') === 'true';
                    const gameId = card.getAttribute('data-id');

                    const existingBadge = card.querySelector('.badge-container');
                    if (existingBadge) existingBadge.remove();

                    const badgeContainer = document.createElement('div');
                    badgeContainer.className = 'badge-container';

                    let achievement = window.KidscadeAchievements?.inspect?.({ gameId, rankKey, scoreKey, isTime });
                    if (!achievement) {
                        const rawRank = rankKey ? localStorage.getItem(rankKey) : null;
                        const rawScore = scoreKey ? localStorage.getItem(scoreKey) : null;
                        let rank = rawRank && rawRank !== '언랭크' ? rawRank : '언랭크';
                        let score = parseInt(rawScore || '0', 10) || 0;
                        if (gameId === 'high_history_match') {
                            try {
                                const parsed = JSON.parse(rawRank || rawScore || '{}');
                                score = Math.max(parsed.figures || 0, parsed.events || 0);
                                if (score < 6) rank = '구석기'; else if (score < 12) rank = '신석기'; else if (score < 18) rank = '고조선';
                                else if (score < 24) rank = '삼국시대'; else if (score < 30) rank = '남북국시대'; else if (score < 36) rank = '고려시대';
                                else if (score < 42) rank = '조선시대'; else if (score < 50) rank = '대한제국'; else if (score < 60) rank = '대한민국'; else rank = '역사왕 👑';
                            } catch (_) {}
                        }
                        const highRankMarkers = ['플래티넘', '다이아몬드', '마스터', '그랜드마스터', '챌린저', '세종대왕', '강철 위장', '조선시대', '대한제국', '대한민국', '역사왕'];
                        achievement = {
                            rank,
                            score,
                            hasRank: rank !== '언랭크',
                            highRank: highRankMarkers.some(value => String(rank).includes(value)),
                            rewardClaimed: safeParseStorage('kidscade_claimed_ranks', {})[gameId] === true,
                            scoreText: score > 0 ? (isTime
                                ? \`⏱️ 최고 \${Math.floor(score / 60).toString().padStart(2, '0')}:\${(score % 60).toString().padStart(2, '0')}\`
                                : \`🏆 최고 \${score.toLocaleString()}점\`) : ''
                        };
                    }

                    const currentRankValue = achievement.rank || '언랭크';
                    if (achievement.hasRank) {
                        const rankBadge = document.createElement('div');
                        rankBadge.className = 'badge badge-rank';
                        rankBadge.textContent = \`🏅 \${currentRankValue}\`;
                        badgeContainer.appendChild(rankBadge);
                    }

                    if (achievement.highRank && !achievement.rewardClaimed) {
                        const gameTitle = card.querySelector('.game-title')?.innerText || gameId;
                        if (addCoins(1000, \`[\${gameTitle}] 최고 등급 달성!\`)) {
                            if (window.KidscadeAchievements?.markRewardClaimed) {
                                window.KidscadeAchievements.markRewardClaimed(gameId);
                            } else {
                                const claimed = safeParseStorage('kidscade_claimed_ranks', {});
                                claimed[gameId] = true;
                                localStorage.setItem('kidscade_claimed_ranks', JSON.stringify(claimed));
                            }
                        }
                    }

                    if (achievement.scoreText) {
                        const scoreBadge = document.createElement('div');
                        scoreBadge.className = 'badge badge-score';
                        scoreBadge.textContent = achievement.scoreText;
                        badgeContainer.appendChild(scoreBadge);
                    }

                    if (achievement.highRank && !card.classList.contains('mini-card')) {
                        const certBtn = document.createElement('button');
                        certBtn.className = 'cert-btn';
                        certBtn.innerHTML = '📜 상장 발급';
                        certBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            issueCertificate(card.querySelector('.game-title')?.innerText || gameId, currentRankValue);
                        };
                        badgeContainer.appendChild(certBtn);
                    }

                    if (badgeContainer.hasChildNodes()) card.appendChild(badgeContainer);
                });
            }`;

html = html.slice(0, start) + replacement + html.slice(end);

if (!bootstrap.includes("src=\"' + withVersion('achievement-state.js')")) {
  assertIncludes(bootstrap, "html = html.replace('src=\"daily-progress.js\"', 'src=\"' + withVersion('daily-progress.js') + '\"');", 'daily progress bootstrap versioning');
  bootstrap = bootstrap.replace(
    "html = html.replace('src=\"daily-progress.js\"', 'src=\"' + withVersion('daily-progress.js') + '\"');",
    "html = html.replace('src=\"daily-progress.js\"', 'src=\"' + withVersion('daily-progress.js') + '\"');\n    html = html.replace('src=\"achievement-state.js\"', 'src=\"' + withVersion('achievement-state.js') + '\"');"
  );
}

fs.writeFileSync(htmlPath, html);
fs.writeFileSync(bootstrapPath, bootstrap);
