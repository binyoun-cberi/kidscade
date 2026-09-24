# Kidscade catalog metadata v7

`data/games.json` is the single source of truth for launch data and game discovery.

## Discovery fields

### subject
- `math` 수학
- `korean` 국어
- `language` 외국어·한자
- `social` 사회
- `science` 과학·환경
- `arts` 예술
- `career` 진로
- `thinking` 사고력

### genre
- `action`
- `puzzle`
- `strategy`
- `simulation`
- `management`
- `quiz`
- `rhythm`
- `sports`
- `sandbox`

### Other fields
- `difficulty`: easy / medium / hard
- `sessionMinutes`: representative session length in minutes
- `players`: solo / local2 / localMulti / online / classroom
- `input`: touch / keyboard
- `qualityStatus`: featured / standard / rework
- `classroom`: classroom-friendly boolean

## Compatibility

The old `category` field remains temporarily because missions, older reports and compatibility paths still use it. New discovery UI should prefer `subject` and `genre`.

`qualityStatus` is curation state, not a permanent score. A game can move between `rework`, `standard` and `featured` after review.
