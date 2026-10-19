# 역사 타임배틀 LIVE 문화유산 사진 캐시

문화유산 이름 맞히기(`heritage-identify`) 문제의 일부에 국가유산청 사진을 표시한다.
호스트와 학생의 실시간 문제, 혼자 연습 모두 동일한 정적 사진을 사용한다.
사진이 없는 문제는 원래의 글자 문제로 유지한다.

## 갱신

1. `node scripts/sync-history-heritage-images.mjs`로 128개 문화유산 개념의
   국가유산청 검색 결과와 이미지 권리 표시를 수집한다. 결과는
   `data/history-heritage-images.json`에 보관한다.
2. 후보 이름과 **실제 사진 설명**을 확인한다. 이름을 포함한다고 해서 같은 유산은
   아니다. 예: `불국사`를 검색해 나온 다보탑 사진, `천마총`을 검색해 나온
   천마도 사진은 해당 이름 맞히기에 사용하지 않는다.
3. 선별 기준은 스크립트의 `matchingPhotos`에 반영한다. 사진의 공공누리 및
   재배포·변형 조건은 원본 제공 페이지에서 **개별 확인**한다. API의
   `imageNuri=A`는 자동 후보 필터이며, 그 코드만으로 재배포 허가를
   확정해서는 안 된다. 다른 표시를 가진 사진은 자동으로 제외한다.
4. 기존 캐시 사진은 `node scripts/audit-history-heritage-rights.mjs`로
   국가유산포털의 사진 목록과 원본 확대 화면에 실제 표시되는 공공누리
   제1유형을 교차 검증한다. 전체 사진이 통과하면 `--write`를 덧붙여
   **각 사진별 원본 링크·공공누리 증빙 링크·검증일**을 기록한다.
   사진 내용이 다른 문화유산을 가리키지 않는지도 별도 확인한다.
5. 검증 후 `node scripts/sync-history-heritage-images.mjs --download`로 정적
   WebP 자산과 `data/history-heritage-media.mjs`를 갱신한다. 신규 사진을
   추가하려면 먼저 개별 사진의 권리를 확인하고 `licenseType`과
   `licenseVerifiedUrl`을 기록해야 한다. 미확인 사진은 자동 다운로드에서
   제외한다.
6. `node tests/history-live.test.mjs`를 실행한다. 모든 사진은 정답을 노출하지
   않는 해시 파일명을 사용한다. 게임에서는 국가유산청 출처, 공공누리
   제1유형과 이미지 크기 조정 사실을 표시하며, 정답 공개 화면에서 해당
   원본 사진의 공식 권리 안내 화면을 연결한다.

출처 API: https://www.khs.go.kr/cha/SearchImageOpenapi.do

## 2026-10-19 권리 검증 결과

- 배포 대상 48장 **48장 모두 통과**. `data/history-heritage-images.json`의
  각 `licenseVerifiedUrl`에서 해당 원본 파일과 **공공누리 제1유형**의
  표시를 직접 대조했다. 데이터에 검증 일시와 원본 캡션을 보관한다.
- 비교 표본: 첨성대 `1612759.jpg`의 `imageNuri=A`는 공식 확대 화면에서
  **제1유형**, 같은 유산 `1612762.jpg`의 `imageNuri=D`는 **제4유형**으로
  표시된다. 사진별 확인이 없는 A 코드 추정만으로 라이선스를 확정하지 않는다.
- 제1유형은 출처를 밝히는 조건으로 영리·비영리 이용 및 이미지 크기 변경을
  허용한다. 제3·4유형은 사진 변경이 허용되지 않아 이 캐시에서 제외한다.
- 공식 근거: [국가유산청 저작권 정책](https://www.khs.go.kr/html/HtmlPage.do?mn=NS_08_03&pg=%2Fguide%2Fcopyright.jsp),
  [한국저작권위원회 공공누리 유형](https://www.copyright.or.kr/gov/nuri/rule_info/index.do).

이는 2026-10-19 기준의 공개 표시에 대한 검증이다. 권리 표시가 변경되거나
새 촬영자·라이선스 조건이 확인되면 다시 검토해야 한다.
