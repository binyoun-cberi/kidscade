# 단 하나의 인생 — 공식 통계 스냅샷

## 목적과 한계

실제 관측값·추정치·전망·게임 전용 확률을 혼동하지 않기 위해 국제기구에서 제공한 **국가 단위 공개 지표**를 날짜와 함께 저장한다. 본 데이터는 미래의 실제 개인 수명이나 직업을 예측하지 않는다.

- 게임 대상: 기존 103개국. 각 국가는 국기 이모지에서 추출한 ISO 3166-1 alpha-2 코드로 매칭한다.
- 제공 방식: `games/high_one_life/official-data.js` 정적 스냅샷. 실행 중 외부 API 호출 없음.
- 수집: `node scripts/sync-one-life-official-stats.cjs`, 월 1회 GitHub Actions 자동 갱신(변경 내역은 PR 검토).
- 수집 API: [World Bank Indicators API v2](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392). 인증키 불필요.
- 라이선스: World Development Indicators 데이터의 출처 표기 및 각 원천 자료별 이용 조건을 준수한다. 출처: [World Bank Data](https://data.worldbank.org/).

## 통계 필드 / 공식 원천

| 스냅샷 필드 | 지표 코드 | 1차 제공기관 | 사용 방식 |
| --- | --- | --- | --- |
| `population` | SP.POP.TOTL | UN/세계은행 | 출생 가중치에 사용 |
| `crudeBirthRate` | SP.DYN.CBRT.IN | UN/각국 통계청 | 같은 연도의 인구×출생률÷1000 계산 |
| `estimatedBirths` | 계산값 | 위 두 지표의 파생값 | 출생 가중치 (공식 집계 출생아 수 아님) |
| `sexRatioBirth` | SP.POP.BRTH.MF | UN WPP | 출생 성별 확률 |
| `urbanPercent` | SP.URB.TOTL.IN.ZS | UN/세계은행 | 도시 인구율을 출생 거주지의 **게임용 근사**에 반영 |
| `primaryCompletion` | SE.PRM.CMPT.ZS | UNESCO UIS | 학교 접근 확률에 소폭 보정. **총량 비율이며 개인의 졸업 확률 아님** |
| `unemployment` | SL.UEM.TOTL.ZS | ILO ILOEST | 표시 전용 (84개 직업별 취업 확률은 이 지표에서 알 수 없음) |
| `under5Mortality` | SH.DYN.MORT | UN IGME·UNICEF·WHO·세계은행 | 5세 미만 총 사망률을 5년간 균등 위험으로 **가상 분배** |
| `lifeExpectancy` | SP.DYN.LE00.IN | UN/각국 통계청 | 참고 기대수명, 성별·개인 운명 아닌 전체 평균 |
| `healthCoverage` | SH.UHC.SRVS.CV.XD | WHO | 데이터가 API에서 정상 제공되지 않으면 비움 |
| `physiciansPerThousand` | SH.MED.PHYS.ZS | WHO/OECD/각국 | 의료 여건 수치 표시 및 소폭 가상 보정. 접근성 자체가 아님 |

## 품질 관리

- 매번 실제 API 응답을 검증하고, 최소 출생 가중치 85개국·5세 미만 사망률 85개국·실업률 80개국이 없으면 갱신을 실패 처리.
- 유효값이 없는 국가는 0이 아니라 **누락**으로 저장; 기존 게임용 가중치를 제한적으로 사용하면서 자료 없음 표기.
- 최신 자료는 지표마다 관측 연도가 달라지는 것을 인정하고 **지표별 연도**를 저장.
- 오래된 관측 자료를 2026년의 관측 결과처럼 표시하지 않음.
- WHO UHC처럼 개별 지표가 반환되지 않으면 임의 수치를 생성하지 않음.
- 단순 복제 데이터를 위해 API 키, 무료 크레딧, 런타임 서버 호출은 요구되지 않음.

## 남아 있는 가상 모델

- 성별·연령별 **완전한 실측 생명표** 미연동: 5세 미만 전체 사망률만 통계 근거. 나머지 연령대의 생존 곡선은 게임 모델.
- 84개 직업의 진입 자격, 채용 확률, 연봉 및 국가별 임금은 아직 게임용 모형.
- 부모 직업, 가구 자산, 형제자매, 건강·행복·관계, 중요한 선택과 미래 사건은 게임용 시나리오.
- 2026년부터 2100년까지의 사건은 실제 미래 예측이 아님.

## 검증

```bash
node --test tests/one-life-official-stats.test.cjs tests/one-life-v8.test.cjs tests/one-life-screen-flow.test.cjs
```

수집 데이터의 한계와 출처는 게임 화면에서도 볼 수 있다.
