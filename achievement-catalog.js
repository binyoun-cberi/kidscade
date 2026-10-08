(() => {
  'use strict';

  const PLANS = Object.freeze({
    "high_haunted_school_exorcist":["첫 퇴마 보고","학교 괴이 사건을 처음 해결하세요.","괴담 학교 조사관","여러 번 학교 괴이를 봉인하세요.","완벽한 야간 수사","한 번도 피해를 입지 않고 사건을 해결하세요."],
    "hanja_sichuan":["첫 연결","첫 한자 사천성 판을 완성하세요.","한자 연결 달인","여러 판을 끝까지 해결하세요.","실수 없는 사천성","힌트와 오답 없이 판을 완료하세요."],
    "kor_hand_twist_typing":["첫 타자 도전","타자 도전을 끝까지 완료하세요.","손 꼬임 타자왕","여러 문장에 도전하며 타자 기록을 높이세요.","빈틈없는 타자","문장을 정확하게 입력하세요."],
    "job_takoyaki_simulator":["첫 타코야키","첫 주문을 완성하세요.","열두 구 장인","12구를 모두 해금하세요.","황금판","한 판의 타코야키를 모두 성공하세요."],
    "toddler_muk_jji_ppa":["첫 승부","처음으로 승리하세요.","묵찌빠 왕","누적 5승을 달성하세요.","대역전","불리한 상황에서 승리하세요."],
    "toddler_photo_coloring":["첫 작품","그림 한 장을 완성하세요.","꼬마 화가","작품 5개를 완성하세요.","무지개 팔레트","다양한 색을 모두 활용해 작품을 완성하세요."],
    "tod_shape_color":["집 찾았다!","첫 정답을 맞히세요.","척척 분류왕","20개를 정확히 분류하세요.","한 번도 안 틀렸어","한 판을 오답 없이 끝내세요."],
    "tod_hidden_emoji":["찾았다!","첫 숨은 이모지를 찾으세요.","매의 눈","한 판의 이모지를 모두 찾으세요.","힌트가 필요 없어","힌트 없이 한 판을 완료하세요."],
    "tod_heaven_stairs":["첫 계단","첫 구간을 통과하세요.","구름 위까지","높은 층까지 올라가세요.","콩콩 연속 점프","긴 연속 점프를 성공하세요."],
    "tod_chick_shell":["삐약!","첫 병아리를 찾으세요.","병아리 탐정","병아리를 20번 찾으세요.","눈썰미 최고","한 판을 실수 없이 끝내세요."],
    "tod_symbol_duel":["딱 찾았다!","첫 정답을 맞히세요.","그림 박사","10연속 정답을 달성하세요.","찰나의 눈썰미","아주 빠르게 정답을 찾아내세요."],
    "tod_antarctic_exploration":["남극 도착","첫 탐험을 시작하세요.","꼬마 탐험대장","주요 탐험 목표를 모두 완료하세요.","펭귄 친구","숨겨진 특별 요소를 발견하세요."],
    "tod_emoji_pang":["첫 팡!","첫 이모지를 터뜨리세요.","팡팡 연쇄","큰 콤보를 만드세요.","화면 대청소","한 번에 많은 이모지를 정리하세요."],
    "tod_puzzle_bobble":["첫 버블","첫 스테이지를 완료하세요.","버블 전문가","여러 스테이지를 연속으로 완료하세요.","무지개 폭발","아주 큰 연쇄를 만들어 보세요."],
    "toddler_monkey_vines":["첫 바나나","첫 목표를 성공하세요.","바나나 한가득","바나나를 많이 모으세요.","원숭이 달인","한 판을 실수 없이 끝내세요."],
    "toddler_penguin_ice_pop":["톡!","첫 얼음을 성공적으로 제거하세요.","얼음 조각가","여러 판을 완료하세요.","안 떨어졌어!","한 번도 실수하지 않고 끝내세요."],
    "toddler_color_stack":["첫 포개기","첫 색깔 스택을 완성하세요.","높이높이","높은 탑을 만드세요.","무지개 탑","아름다운 색 순서의 탑을 완성하세요."],
    "toddler_traditional_play_yard":["놀아보자!","첫 전통놀이를 체험하세요.","전통놀이 탐험가","모든 놀이 종목을 체험하세요.","놀이왕","여러 종목에서 좋은 기록을 세우세요."],
    "high_bridge_builder":["첫 다리","첫 교량을 완성하세요.","튼튼한 기술자","여러 스테이지를 통과하세요.","최소 공법","적은 재료로 안전한 다리를 완성하세요."],

    "low_perfect_pitch":["도레미!","첫 음정 판정을 성공하세요.","절대음감?","10연속 성공을 달성하세요.","고음 계단","높은 음역 계단까지 올라가세요."],
    "low_wordris":["첫 단어","첫 단어를 완성하세요.","워드 콤보","연속으로 여러 단어를 만드세요.","바닥이 깨끗해","보드를 크게 정리하세요."],
    "low_blind_elephant":["이게 코끼리구나","첫 정답을 맞히세요.","촉감 탐정","연속으로 많은 동물을 맞히세요.","단서 하나면 충분해","최소한의 단서만 보고 정답을 맞히세요."],
    "low_math_number_tower":["첫 층","첫 숫자 층을 완성하세요.","숫자 고층빌딩","높은 층까지 올라가세요.","흔들리지 않아","실수 없이 긴 구간을 통과하세요."],
    "science_periodic_memory":["첫 원소 연구","원소 퀴즈를 끝까지 완료하세요.","원소 기억왕","한 판에서 10연속 정답을 맞히세요.","주기율표 완성","118개 원소의 위치를 한 판에서 모두 맞히세요."],
    "math_pi_memory":["첫 π 도전","원주율 기록 도전을 완료하세요.","π 연구자","원주율을 50자리까지 외우세요.","π 박사","원주율을 100자리까지 외우세요."],
    "low_bumper_roulette":["첫 완주","첫 레이스를 완주하세요.","포디움","상위권으로 경기를 마치세요.","꼴찌의 반란","뒤처진 상태에서 역전하세요."],
    "low_pong_battle":["첫 승리","첫 경기를 이기세요.","랠리왕","긴 랠리를 이어가세요.","철벽 수비","실점 없이 승리하세요."],
    "math_timing_lcd":["딱 맞췄다!","첫 타이밍 도전을 성공하세요.","0.1초의 감각","목표 시간에 아주 가깝게 맞히세요.","완전 정확해","목표 시간을 정확히 맞히세요."],
    "low_one_stroke":["첫 한붓","첫 퍼즐을 한붓으로 해결하세요.","한 번에 쓱","되돌리기 없이 퍼즐을 해결하세요.","도시 완성","여러 퍼즐을 연속으로 완성하세요."],
    "low_math_dog_runner":["첫 정답 점프","첫 계산 점프를 성공하세요.","곱셈 질주","연속 정답을 오래 이어가세요.","멍멍 무실수런","한 판을 오답 없이 끝내세요."],
    "low_sand_art_studio":["첫 모래 그림","첫 작품을 완성하세요.","모래 예술가","여러 작품을 완성하세요.","색 모래 마스터","모든 주요 도구와 색을 활용하세요."],
    "math_icecream_division":["첫 아이스크림","첫 주문을 완성하세요.","나눗셈 사장님","10주문을 정확히 처리하세요.","완벽한 러시아워","바쁜 시간대를 실수 없이 넘기세요."],
    "kor_handwriting_party":["첫 바른 글씨","첫 글씨 평가를 완료하세요.","글씨왕","높은 평가를 연속으로 받으세요.","한 획도 안 삐뚤어","완벽한 글씨를 완성하세요."],
    "kor_sentence_train":["첫 열차 출발","첫 문장을 완성하세요.","문장 기관사","문장을 연속으로 정확히 완성하세요.","무정차 운행","오답 없이 한 판을 끝내세요."],
    "math_stationery_boss":["첫 판매","첫 주문을 처리하세요.","장사 잘된다!","목표 매출을 달성하세요.","완벽한 하루","주문 실수 없이 하루를 마치세요."],
    "chosung_bomb":["폭탄 해체","첫 문제를 맞히세요.","초성 전문가","연속 정답을 이어가세요.","1초 남았다!","시간이 거의 끝나기 직전에 성공하세요."],
    "low_order_pang":["첫 순서","첫 순서 문제를 해결하세요.","순서 기억왕","긴 순서를 정확히 기억하세요.","완벽한 연쇄","실수 없는 연속 성공을 달성하세요."],
    "hero_english":["첫 영어 기술","첫 영어 문제를 해결하세요.","영어 히어로","많은 문제를 정확히 해결하세요.","노미스 보스전","보스 구간을 오답 없이 통과하세요."],
    "low_word_blaster":["첫 단어 격추","첫 단어를 맞히세요.","워드 머신건","긴 콤보를 달성하세요.","퍼펙트 웨이브","한 웨이브를 완벽하게 끝내세요."],
    "high_haunted_school_exorcist":["첫 괴이 조사","첫 괴이 조사에 성공하세요.","학교 퇴마 전문가","여러 괴이를 해결하세요.","완벽한 퇴마","실수 없이 괴이를 공략하세요."],
    "language_word_siege":["첫 Word Tower","첫 게임을 끝까지 플레이하세요.","어휘 공성전","한 판에서 서로 다른 단어 10개 이상을 사용하세요.","긴 단어의 힘","난도 7 이상의 단어를 한 판에서 완성하세요."],
    "low_speak_jjoayo":["첫 발음 성공","첫 발음 판정을 성공하세요.","발음 달인","높은 점수를 연속으로 기록하세요.","PERFECT!","완벽한 발음 판정을 달성하세요."],
    "low_nyam_universe":["첫 행성","첫 행성 여행을 완료하세요.","우주 미식가","다양한 음식을 경험하세요.","편식 없는 우주인","여러 종류를 고르게 선택하세요."],
    "low_juice_maker":["첫 주스","첫 주스를 완성하세요.","주스 장인","주문을 연속으로 정확히 처리하세요.","무지개 주스","다양한 과일을 활용한 특별 주스를 만드세요."],
    "high_3d_block_painter":["첫 블록 색칠","첫 블록을 꾸미세요.","컬러 건축가","많은 블록을 색칠해 작품을 완성하세요.","여섯 면 모두!","블록의 모든 면을 활용해 꾸미세요."],
    "math_base10_blocks":["첫 계산","첫 계산을 성공하세요.","베테랑 계산원","정확한 계산을 연속으로 성공하세요.","거스름돈 딱 맞게","거스름돈을 정확히 맞히세요."],
    "magic_scale":["첫 균형","처음으로 저울의 균형을 맞히세요.","저울 박사","여러 문제를 연속으로 해결하세요.","한 번에 균형","한 번의 시도로 균형을 맞히세요."],
    "hanja_survivors_8":["첫 한자 수호","첫 한자 문제를 해결하세요.","8급 수호자","8급 한자를 많이 지켜내세요.","무피해 수호전","피해 없이 한 판을 끝내세요."],
    "kor_typing_tadak":["첫 100타","첫 타자 기록을 남기세요.","타자 고수","높은 타자 속도를 달성하세요.","오타 제로","오타 없이 연습을 끝내세요."],
    "high_gugudan_stairs":["첫 계단","첫 구구단 계단을 오르세요.","구구단 정상","높은 층까지 올라가세요.","한 번도 안 미끄러짐","오답 없이 정상까지 도전하세요."],
    "joseon_janggu":["첫 장단","첫 장단을 완주하세요.","얼쑤! 풀콤보","한 곡을 풀콤보로 연주하세요.","장구 명인","높은 난도의 장단을 완벽하게 연주하세요."],
    "trash_runner":["첫 수거","첫 쓰레기를 올바르게 수거하세요.","분리수거 전문가","많은 쓰레기를 정확히 분류하세요.","잘못 버린 것 0개","한 판을 오분류 없이 끝내세요."],
    "low_cleanup_squad":["첫 방 청소","첫 구역을 청소하세요.","반짝반짝","구역을 완전히 청소하세요.","먼지 한 톨 없다","빠뜨린 곳 없이 완벽하게 끝내세요."],
    "alkkagi_janggi":["첫 격파","첫 말을 튕겨내세요.","알까기 승부사","여러 경기를 승리하세요.","뱅크샷!","벽을 이용한 멋진 샷을 성공하세요."],
    "tod_puzzle_time":["첫 퍼즐","첫 숫자 퍼즐을 해결하세요.","숫자 퍼즐러","여러 퍼즐을 해결하세요.","힌트 없는 해결","힌트 없이 퍼즐을 완료하세요."],
    "piano_studio":["첫 곡 저장","첫 곡을 저장하세요.","꼬마 작곡가","긴 곡을 완성하세요.","모든 음을 써봤어","다양한 음을 활용해 곡을 만드세요."],
    "toddler_three_friends_set":["첫 셋","첫 셋을 찾으세요.","셋 탐정","연속으로 셋을 찾아내세요.","눈 깜짝할 새","아주 빠르게 셋을 찾으세요."],
    "low_wordchain_arena":["첫 승리","첫 끝말잇기 대결을 이기세요.","끝말잇기 20연쇄","긴 단어 연쇄를 이어가세요.","희귀 끝말","보기 드문 단어로 연결에 성공하세요."],
    "low_pattern_lock":["첫 잠금 해제","첫 패턴을 해결하세요.","패턴 마스터","고난도 패턴을 해결하세요.","대각선의 달인","복잡한 대각선 패턴을 완성하세요."],

    "high_human_history_cards":["첫 도구","첫 생존 도구를 만드세요.","부족의 생존자","오랫동안 부족을 유지하세요.","새 시대의 문","다음 시대에 진입하세요."],
    "high_weathercaster_simulator":["첫 방송","첫 기상 방송을 마치세요.","믿음직한 예보관","정확한 예보를 연속으로 성공하세요.","재난 특보 완벽 대응","위험 기상 상황을 완벽하게 전달하세요."],
    "high_twelve_island":["첫 촌장 업무","첫 결정을 내리세요.","마을은 살아남았다","큰 재난을 넘기고 마을을 유지하세요.","기묘한 촌장","특이한 사회 상태를 만들어 보세요."],
    "high_little_world":["첫 생명","첫 생명체가 살아가게 하세요.","살아있는 세계","풍부한 생태계를 만드세요.","세상이 이렇게도 되네?","아주 특별한 세계 상태를 발견하세요."],
    "science_cosmic_growth":["첫 응집","우주 먼지를 모아 첫 천체 성장을 시작하세요.","별의 탄생","핵융합이 시작되는 별 단계에 도달하세요.","사건의 지평선","블랙홀 시대에 진입하세요."],
    "high_story_builder":["첫 이야기","첫 이야기를 완성하세요.","스토리텔러","여러 장르의 이야기를 만드세요.","상상 밖의 결말","특별한 결말을 만들어 보세요."],
    "high_code_quest":["첫 버그 수정","첫 버그를 고치세요.","디버깅 기사","많은 버그를 해결하세요.","힌트 없이 보스 수정","힌트 없이 어려운 버그를 고치세요."],
    "high_factory_tycoon":["첫 생산 라인","첫 생산 설비를 가동하세요.","산업왕","대규모 생산 체계를 만드세요.","낭비 제로 공장","자원 낭비를 최소화한 공장을 운영하세요."],
    "high_classroom_war_3d":["첫 전투 승리","첫 전투를 이기세요.","교실 사령관","여러 전투를 승리하세요.","전원 생존 승리","아군을 잃지 않고 승리하세요."],
    "high_byeokrando_voyage":["첫 출항","첫 항해를 시작하세요.","대상인","큰 이익을 남기세요.","모든 교역항 방문","모든 주요 항구를 방문하세요."],
    "high_history_timebattle_live":["첫 대결","첫 역사 대결을 완료하세요.","역사 10연승","긴 연승을 달성하세요.","퍼펙트 라운드","한 라운드를 오답 없이 끝내세요."],
    "high_pass_mafia":["첫 밤 생존","첫 게임을 끝까지 생존하세요.","양쪽 역할 승리","서로 다른 역할로 승리하세요.","완벽한 추리","결정적인 추리를 정확히 성공하세요."],
    "high_seed_volleyball":["첫 승리","첫 배구 경기를 이기세요.","랠리 20","20회 이상 랠리를 이어가세요.","연속 에이스","연속 서브 에이스를 기록하세요."],
    "high_seed_baseball":["첫 안타","첫 안타를 기록하세요.","담장 밖으로!","홈런을 기록하세요.","무실점 경기","상대에게 점수를 주지 않고 승리하세요."],
    "high_seed_fc_manager":["첫 승리","첫 경기를 이기세요.","리그 챔피언","리그 정상에 오르세요.","역사 올스타 팀","특별한 선수 조합을 완성하세요."],
    "high_metro_planner":["첫 노선","첫 지하철 노선을 만드세요.","대도시 교통망","큰 교통망을 완성하세요.","정체 없는 도시","혼잡을 최소화한 교통망을 만드세요."],
    "high_quarantine_17":["첫 검역","첫 검역 결정을 완료하세요.","7일 생존","격리 구역을 오래 유지하세요.","완벽한 격리","감염 확산 없이 목표를 달성하세요."],
    "high_folklore_night_guard":["첫 야간 근무","첫 야간 근무를 시작하세요.","6귀신의 밤","위험한 밤을 끝까지 버티세요.","CCTV에만 의존하지 않았다","관리실 대응을 활용해 살아남으세요."],
    "high_rule_lab":["첫 규칙 해결","첫 규칙 퍼즐을 해결하세요.","논리 설계자","모든 주요 규칙 실험을 완료하세요.","힌트 없는 복합 규칙","힌트 없이 어려운 규칙을 해결하세요."],
    "music_neon_rift":["첫 리프트 돌파","첫 곡을 완주하세요.","풀 콤보","한 곡을 풀콤보로 끝내세요.","PERFECT RIFT","완벽한 판정을 달성하세요."],
    "high_melody_workshop":["첫 멜로디","첫 멜로디를 완성하세요.","작곡가","여러 트랙을 활용해 곡을 만드세요.","모든 악기 합주","다양한 악기를 함께 사용하세요."],
    "high_top_king":["첫 승리","첫 팽이 대결을 이기세요.","불꽃 팽이왕","여러 대결에서 승리하세요.","연속 링아웃","연속으로 상대 팽이를 경기장 밖으로 보내세요."],
    "high_kite_wind_rider":["첫 비행","첫 비행을 성공하세요.","구름 위 라이더","오랫동안 비행하세요.","추락 없는 장거리 비행","추락 없이 긴 거리를 이동하세요."],
    "trivia_school_survival":["첫 하루","첫 학교생활 하루를 넘기세요.","학교생활 생존자","여러 날을 무사히 보내세요.","특수 엔딩 발견","숨겨진 결말을 발견하세요."],
    "trivia_zoolympic":["첫 메달","첫 메달을 획득하세요.","종합 우승","종합 순위 1위를 달성하세요.","전 종목 금메달","모든 종목에서 금메달을 따세요."],
    "sim_mosquito":["첫 한입","첫 흡혈을 성공하세요.","배부른 모기","많은 먹이를 확보하세요.","한 번도 안 들켰다","한 번도 들키지 않고 끝내세요."],
    "trivia_blockraft":["첫 집","첫 건축물을 완성하세요.","블록 건축가","큰 건축물을 완성하세요.","생존과 건축 모두 성공","생존 목표와 건축 목표를 함께 달성하세요."],
    "trivia_drift_survival":["첫 불 피우기","첫 생존 기반을 마련하세요.","일주일 생존","오랫동안 섬에서 버티세요.","섬 탈출","섬에서 탈출하세요."],
    "low_big_puzzle_time":["첫 대형 퍼즐","첫 큰 퍼즐을 완성하세요.","퍼즐 고수","여러 큰 퍼즐을 해결하세요.","힌트 제로","힌트 없이 퍼즐을 끝내세요."],
    "tod_emoji_minesweeper":["첫 지뢰판 클리어","첫 지뢰찾기 판을 완료하세요.","고급 지뢰찾기","어려운 판을 해결하세요.","오표시 제로","잘못된 깃발 없이 클리어하세요."],
    "triangle_compare":["첫 비교 성공","첫 넓이 비교를 맞히세요.","넓이 감각왕","여러 문제를 연속으로 맞히세요.","함정 문제도 한 번에","어려운 비교를 한 번에 해결하세요."],
    "lab_water_sort":["첫 실험 성공","첫 물 정렬 퍼즐을 해결하세요.","정렬 박사","여러 퍼즐을 해결하세요.","최소 이동 해결","아주 적은 이동으로 퍼즐을 해결하세요."],
    "low_rubiks_cube":["한 면 완성","큐브 한 면을 완성하세요.","큐브 완성","큐브 전체를 맞추세요.","스피드 큐버","빠른 시간 안에 큐브를 맞추세요."],
    "high_little_sculptor":["첫 조각","첫 조각 작품을 완성하세요.","조각가","큰 작품을 완성하세요.","완벽한 대칭","대칭이 아름다운 작품을 만드세요."],
    "geo_exorcist":["첫 퇴마","첫 도형 적을 물리치세요.","도형 퇴마사","많은 문제를 해결하세요.","무피해 보스전","피해 없이 보스를 물리치세요."],
    "high_outbreak_korea":["첫 지역 방어","첫 지역을 방어하세요.","전국 안정화","전국의 위기를 안정시키세요.","도시 하나도 잃지 않기","도시를 잃지 않고 목표를 달성하세요."],
    "high_history_match":["첫 시대 완성","첫 시대 묶음을 완성하세요.","한국사 완주","한국사 전체 흐름을 완주하세요.","역사왕","아주 높은 역사 기록을 달성하세요."],
    "alien_pizza":["첫 외계 주문","첫 피자를 완성하세요.","은하 피자왕","많은 주문을 정확히 처리하세요.","괴상한 주문 완벽 처리","복잡한 특별 주문을 완벽하게 처리하세요."],
    "high_rhythm_dash":["첫 곡 클리어","첫 곡을 완주하세요.","풀 콤보","한 곡을 풀콤보로 끝내세요.","S랭크","최고 등급을 달성하세요."],
    "korea_puzzle":["첫 지역","첫 지역 조각을 맞히세요.","대한민국 완성","지도를 완성하세요.","무오답 지도 완성","실수 없이 지도를 완성하세요."],
    "laser_angle":["첫 반사 성공","첫 레이저 반사를 성공하세요.","각도 마스터","여러 문제를 해결하세요.","원샷 해결","한 번의 시도로 퍼즐을 해결하세요."],
    "math_quiz":["첫 10문제","첫 문제 묶음을 완료하세요.","10연속 정답","10연속 정답을 달성하세요.","한 판 퍼펙트","한 판을 오답 없이 끝내세요."],
    "fraction_quiz":["첫 분수 해결","첫 분수 문제를 해결하세요.","분수 박사","많은 문제를 연속으로 맞히세요.","퍼펙트","한 판을 완벽하게 끝내세요."],
    "snake_math":["첫 먹이","첫 계산 먹이를 획득하세요.","계산 장뱀","아주 긴 뱀을 만드세요.","충돌 없이 고득점","충돌 없이 높은 점수를 기록하세요."],
    "threes":["3 탄생","첫 3 타일을 만드세요.","큰 수 만들기","큰 숫자 타일을 만드세요.","초대형 타일","아주 높은 숫자 타일을 만드세요."],
    "math_tower_defense":["첫 좀비 방어","첫 웨이브를 막아내세요.","10웨이브 생존","10웨이브 이상 버티세요.","한 마리도 통과 못 했다","한 웨이브를 완벽하게 막아내세요."],
    "alien_sandwich":["첫 주문","첫 샌드위치를 완성하세요.","은하 샌드위치 장인","많은 주문을 처리하세요.","초거대 샌드위치","특별히 큰 샌드위치를 완성하세요."],
    "korea_marble":["첫 세계여행","첫 나라에 도착하세요.","6대륙 여행가","한 판에서 6대륙을 모두 방문하세요.","랜드마크 컬렉터","한 판에서 랜드마크 3개 이상을 완성하세요."],
    "code_breaker":["첫 암호 해독","첫 암호를 풀어내세요.","암호 전문가","여러 암호를 해결하세요.","한 번에 해독","최소 시도로 암호를 맞히세요."],
    "world_boardgames":["첫 보드게임","첫 보드게임을 완료하세요.","세계 놀이 탐험가","여러 종류의 보드게임을 플레이하세요.","모든 게임 승리","모든 주요 게임에서 승리하세요."],
    "word_snake":["첫 단어 먹기","첫 단어를 획득하세요.","영어뱀 50단어","많은 단어를 모으세요.","무오답 사냥","오답 없이 한 판을 마치세요."],
    "sudoku":["첫 스도쿠","첫 스도쿠를 완성하세요.","고급 퍼즐러","어려운 스도쿠를 해결하세요.","힌트 없이 최고 난도","힌트 없이 어려운 난도를 완료하세요."],
    "high_fraction_smith":["첫 분수 단조","첫 분수 문제를 완성하세요.","분수 대장장이","많은 분수를 정확히 처리하세요.","불량품 제로","실수 없이 한 판을 완료하세요."],
    "polygon_area":["첫 넓이 계산","첫 넓이 문제를 해결하세요.","도형 측량사","여러 문제를 정확히 해결하세요.","복합도형 원샷","어려운 복합도형을 한 번에 해결하세요."],
    "patience_tower":["첫 층","첫 층을 통과하세요.","높은 탑 등반","높은 층까지 올라가세요.","추락 없는 등반","추락 없이 긴 구간을 통과하세요."],
    "math_corner_clash":["첫 영토","첫 영토를 확보하세요.","왕국 통일","큰 영역을 지배하세요.","영토 손실 없이 승리","영토를 빼앗기지 않고 승리하세요."],
    "world_flag_master":["첫 국기","첫 국기를 맞히세요.","대륙 마스터","한 대륙의 국기를 많이 맞히세요.","세계 국기 퍼펙트","한 판을 오답 없이 끝내세요."],
    "jineung_bird":["첫 비행","첫 구간을 통과하세요.","새대가리 탈출","긴 거리를 비행하세요.","노미스 비행","실수 없이 긴 구간을 통과하세요."],
    "triangle_situation":["첫 삼각형 해결","첫 삼각형 문제를 해결하세요.","삼각형 생존자","여러 구간을 통과하세요.","무피해 클리어","피해 없이 한 판을 끝내세요."],
    "korean_vocab":["첫 어휘","첫 어휘 문제를 맞히세요.","어휘왕","많은 문제를 연속으로 맞히세요.","한 판 무오답","한 판을 오답 없이 끝내세요."],
    "swipe_spelling":["첫 맞춤법","첫 맞춤법 문제를 맞히세요.","맞춤법 고수","연속 정답을 이어가세요.","틀릴 게 업서요(?)","한 판을 완벽하게 끝내세요."],
    "language_arcade":["첫 외국어","첫 언어 게임을 완료하세요.","3개 언어 플레이","여러 언어를 체험하세요.","언어 탐험가","다양한 언어에서 좋은 기록을 세우세요."],
    "math_rune_forest":["첫 룬 해독","첫 숫자 룬을 해결하세요.","숫자 마법사","많은 문제를 해결하세요.","보스 노미스","오답 없이 보스를 통과하세요."],
    "spelling_frog":["첫 점프","첫 철자 점프를 성공하세요.","철자 개구리","긴 구간을 통과하세요.","한 번도 물에 안 빠짐","실수 없이 한 판을 끝내세요."],
    "hanja_test":["첫 합격","첫 급수 테스트를 통과하세요.","90점 이상","높은 점수를 기록하세요.","100점","만점을 달성하세요."],
    "school_tower":["첫 층 정복","첫 층을 통과하세요.","수식 마법사","높은 층까지 올라가세요.","오답 없이 정상","오답 없이 정상까지 도전하세요."],
    "pixel_editor":["첫 저장","첫 픽셀 작품을 저장하세요.","픽셀 아티스트","여러 작품을 완성하세요.","전 팔레트 사용","다양한 색을 모두 활용하세요."],
    "high_omok_arena":["첫 승리","첫 오목 대결을 이기세요.","3연승","3연승을 달성하세요.","대역전 오목","불리한 판을 뒤집어 승리하세요."],
    "high_star_hoppers":["첫 행성 개척","첫 행성을 개척하세요.","다행성 문명","여러 행성을 운영하세요.","재난 속 식민지 생존","큰 위기 속에서도 식민지를 유지하세요."],
    "high_body_muscle_lab":["첫 운동","첫 운동을 완료하세요.","전신 운동 완료","여러 부위 운동을 완료하세요.","근육 박사","몸의 여러 근육을 정확히 활용하세요."],
    "high_disaster_city":["첫 구조","첫 구조 임무를 성공하세요.","베테랑 구조대","많은 재난을 해결하세요.","도시 피해 0","도시 피해 없이 임무를 완료하세요."],
    "high_emergency_escape":["첫 탈출","첫 위기에서 탈출하세요.","5연속 탈출","연속으로 여러 위기를 탈출하세요.","3초 탈출","아주 빠르게 탈출하세요."],
    "high_history_map":["첫 영토 확보","첫 영토를 차지하세요.","삼국 통일","통일을 달성하세요.","무패 통일","패배 없이 통일하세요."],
    "high_ecopolis":["첫 친환경 건물","첫 친환경 시설을 만드세요.","탄소중립 도시","생태 복원 목표를 크게 달성하세요.","행복한 녹색도시","생태와 시민이 함께 만족하는 도시를 만드세요."],

    "job_nail_artist":["첫 손님","첫 손님을 완료하세요.","네일샵 인기 폭발","많은 손님을 만족시키세요.","모든 스타일 사용","다양한 스타일을 모두 활용하세요."],
    "job_police_car":["첫 출동","첫 임무에 출동하세요.","베테랑 순찰대","여러 임무를 완료하세요.","무사고 출동","사고 없이 임무를 끝내세요."],
    "job_drone_pilot":["첫 비행","첫 드론 비행을 성공하세요.","정밀 조종사","정확한 조종을 반복해서 성공하세요.","노크래시 미션","충돌 없이 임무를 완료하세요."],
    "job_driver_license":["첫 합격","운전면허 시험에 처음 합격하세요.","모범 운전자","높은 점수로 시험에 합격하세요.","감점 0점","감점 없이 시험을 통과하세요."],
    "job_scuba_diver":["첫 잠수","첫 잠수를 완료하세요.","심해 탐험가","깊은 바다까지 탐험하세요.","희귀 생물 발견","특별한 해양 생물을 발견하세요."],
    "job_internal_medicine":["첫 진료","첫 환자 진료를 완료하세요.","명진단 의사","여러 환자를 정확히 진단하세요.","불필요한 검사 없이 진단","최소한의 검사로 정확한 진단을 내리세요."],
    "job_teacher_classroom":["첫 하루","첫 담임 하루를 마치세요.","한 주의 담임","여러 날의 업무를 안정적으로 마치세요.","기록이 살렸다","기록을 활용해 중요한 상황을 해결하세요."],
    "job_steak_master":["첫 스테이크","첫 스테이크를 완성하세요.","그릴 마스터","여러 주문을 정확히 처리하세요.","모든 굽기 완벽","다양한 굽기를 완벽하게 맞히세요."],
    "job_bogle_bunsik":["첫 주문","첫 분식 주문을 완료하세요.","분식집 러시아워","바쁜 시간대를 잘 운영하세요.","밀린 주문 0개","대기 주문 없이 바쁜 시간을 끝내세요."],
    "job_maratang_simulator":["첫 한 그릇","첫 마라탕 주문을 완성하세요.","마라탕 달인","많은 주문을 정확히 처리하세요.","완벽한 셀프바","셀프바 운영을 완벽하게 해내세요."],
    "burger_master":["첫 버거","첫 버거 주문을 완료하세요.","20연속 주문 성공","긴 주문 연속 성공을 달성하세요.","초고속 퍼펙트 주문","빠르고 정확하게 주문을 완성하세요."]
  });

  const PILOT_GAME_IDS = new Set(['cube3d','high_micro_evolution','infinite_gugudan']);

  const LIVE_RULES = Object.freeze({
    hanja_sichuan: {
      mastery:{event:'result',field:'maxCombo',op:'gte',value:10},
      secret:{event:'result',field:'clean',op:'truthy'}
    },
    low_perfect_pitch: {
      mastery:{event:'game-over', field:'maxCombo', op:'gte', value:10},
      secret:{event:'game-over', field:'stairPeak', op:'gte', value:10}
    },
    low_wordris: {
      mastery:{event:'game-over', field:'bestCombo', op:'gte', value:5}
    },
    low_blind_elephant: {
      mastery:{event:'game-over', field:'correct', op:'gte', value:12}
    },
    science_periodic_memory: {
      mastery:{event:'result', field:'maxCombo', op:'gte', value:10},
      secret:{event:'result', field:'perfectTable', op:'truthy'}
    },
    math_pi_memory: {
      mastery:{event:'result', field:'digits', op:'gte', value:50},
      secret:{event:'result', field:'digits', op:'gte', value:100}
    },
    low_pong_battle: {
      mastery:{event:'game-over', field:'score', op:'gte', value:20}
    },
    low_speak_jjoayo: {
      mastery:{event:'game-over', field:'bestCombo', op:'gte', value:10}
    },
    low_word_blaster: {
      mastery:{event:'game-over', field:'completedWords', op:'gte', value:10}
    },
    low_pattern_lock: {
      mastery:{event:'game-over', field:'completed', op:'truthy'}
    },
    world_flag_master: {
      mastery:{event:'milestone', field:'continentMastered', op:'truthy'},
      secret:{event:'result', field:'perfect', op:'truthy'}
    },
    korea_marble: {
      mastery:{event:'result', field:'continentsVisited', op:'gte', value:6},
      secret:{event:'result', field:'landmarks', op:'gte', value:3}
    },
    low_one_stroke: {
      mastery:{event:'game-over', field:'clean', op:'truthy'},
      secret:{event:'game-over', field:'completedCount', op:'gte', value:10}
    },
    high_rule_lab: {
      mastery:{event:'game-over', field:'score', op:'gte', value:1}
    },
    high_ecopolis: {
      mastery:{event:'milestone', field:'restored', op:'gte', value:90}
    },
    job_driver_license: {
      mastery:{event:'game-over', field:'passed', op:'truthy'},
      secret:{event:'game-over', field:'score', op:'gte', value:100}
    },
    toddler_photo_coloring: {
      mastery:{event:'game-over', field:'score', op:'gte', value:100}
    }
  });

  const EXTRA_LIVE = Object.freeze({
    high_human_history_cards:Object.freeze([
      Object.freeze({slot:'neolithic_settlement',icon:'🌾',title:'생활이 마을이 되다',description:'신석기 정착의 주요 조건을 달성하세요.'}),
      Object.freeze({slot:'bronze_age',icon:'🥉',title:'청동의 시대',description:'청동기 생활 단계에 진입하세요.'}),
      Object.freeze({slot:'iron_age',icon:'⚒️',title:'철은 모든 것을 바꾼다',description:'철기 생활 단계에 진입하세요.'}),
      Object.freeze({slot:'four_lifestyles',icon:'🧭',title:'먹고사는 방법은 하나가 아니다',description:'사냥·농경·어로·목축을 모두 경험하세요.'}),
      Object.freeze({slot:'dolmen',icon:'🪨',title:'거석의 시대',description:'고인돌을 세우세요.',type:'secret',hidden:true})
    ]),
    high_factory_tycoon:Object.freeze([
      Object.freeze({slot:'first_shipment',icon:'📦',title:'첫 출하',description:'공장에서 첫 제품을 출고하세요.'}),
      Object.freeze({slot:'inventor',icon:'🥪',title:'발명가',description:'처음으로 새로운 3단 이상 샌드위치를 발견하세요.'}),
      Object.freeze({slot:'discoveries_3',icon:'📒',title:'메뉴 개발실',description:'서로 다른 샌드위치 3종을 도감에 등록하세요.'}),
      Object.freeze({slot:'rate_10',icon:'⚙️',title:'멈추지 않는 벨트',description:'최근 1분 동안 제품 10개를 출고하세요.'}),
      Object.freeze({slot:'zero_waste_30',icon:'♻️',title:'낭비 제로 공장',description:'폐기 없이 제품 30개를 연속 출고하세요.'}),
      Object.freeze({slot:'rate_20',icon:'🏭',title:'대량생산',description:'최근 1분 동안 제품 20개를 출고하세요.',type:'secret',hidden:true})
    ]),
    high_seed_baseball:Object.freeze([
      Object.freeze({slot:'first_hit',icon:'⚾',title:'플레이 볼!',description:'첫 안타를 기록하세요.'}),
      Object.freeze({slot:'home_run',icon:'💥',title:'담장 밖으로!',description:'홈런을 기록하세요.'}),
      Object.freeze({slot:'doctor_k',icon:'🔥',title:'닥터 K',description:'한 경기에서 투수 탈삼진 3개 이상을 기록하세요.'}),
      Object.freeze({slot:'two_way',icon:'🌟',title:'투타겸업',description:'한 경기에서 안타 2개와 투수 탈삼진 2개를 모두 기록하세요.'}),
      Object.freeze({slot:'shutout_win',icon:'🧱',title:'완봉승',description:'상대에게 한 점도 주지 않고 승리하세요.'}),
      Object.freeze({slot:'extra_inning_win',icon:'🌙',title:'끝날 때까지 끝난 게 아니다',description:'연장전에서 승리하세요.',type:'secret',hidden:true})
    ]),
    high_weathercaster_simulator:Object.freeze([
      Object.freeze({slot:'first_broadcast',icon:'🎙️',title:'첫 방송',description:'첫 기상 방송을 끝까지 마치세요.'}),
      Object.freeze({slot:'forecast_perfect',icon:'🌤️',title:'예보 판단 만점',description:'핵심 날씨·변화·생활 정보를 모두 맞히세요.'}),
      Object.freeze({slot:'map_perfect',icon:'🗺️',title:'지도 위의 기상캐스터',description:'방송 지도 지목을 모두 정확히 하세요.'}),
      Object.freeze({slot:'alert_perfect',icon:'🚨',title:'긴급방송 완벽 대응',description:'긴급 기상방송에서 별 3개를 받으세요.'}),
      Object.freeze({slot:'perfect_100',icon:'💯',title:'퍼펙트 뉴스룸',description:'기상 방송에서 100점을 기록하세요.',type:'secret',hidden:true})
    ]),
    job_scuba_diver:Object.freeze([
      Object.freeze({slot:'first_mission',icon:'🤿',title:'첫 조사 임무',description:'첫 탐사 의뢰를 완료하고 무사히 귀환하세요.'}),
      Object.freeze({slot:'depth_600',icon:'🌊',title:'빛이 희미해지는 곳',description:'수심 600m에 도달하세요.'}),
      Object.freeze({slot:'depth_800',icon:'🌑',title:'심해 진입',description:'수심 800m에 도달하세요.'}),
      Object.freeze({slot:'s_photo',icon:'📸',title:'연구소 표지 사진',description:'생물을 S등급으로 촬영하세요.'}),
      Object.freeze({slot:'hadal_trinity',icon:'🧭',title:'심해 3대 지형',description:'고래 낙하·심해 크레바스·해저 화산을 모두 방문하세요.'}),
      Object.freeze({slot:'hadal_mission',icon:'🏅',title:'심연에서 돌아온 사람',description:'최심부 탐사 의뢰를 완료하고 귀환하세요.',type:'secret',hidden:true})
    ]),
    job_maratang_simulator:Object.freeze([
      Object.freeze({slot:'first_order',icon:'🥘',title:'첫 한 그릇',description:'첫 손님의 마라탕을 완성해 서빙하세요.'}),
      Object.freeze({slot:'perfect_order',icon:'✨',title:'단골 예약',description:'한 주문에서 115점 이상을 받으세요.'}),
      Object.freeze({slot:'zero_waste_day',icon:'♻️',title:'버리는 재료 0원',description:'폐기 손실 없이 하루 영업을 마치세요.'}),
      Object.freeze({slot:'no_walkout_day',icon:'🙂',title:'아무도 돌아가지 않았다',description:'이탈 손님 없이 하루 영업을 마치세요.'}),
      Object.freeze({slot:'reputation_90',icon:'⭐',title:'동네 소문난 맛집',description:'평판 90 이상을 달성하세요.'}),
      Object.freeze({slot:'campaign_15',icon:'🏮',title:'15일의 마라탕집',description:'15일 타이쿤 캠페인을 완주하세요.'})
    ]),
    high_twelve_island:Object.freeze([
      Object.freeze({slot:'first_rule',icon:'📜',title:'우리 마을의 첫 규칙',description:'처음으로 공동체 규칙을 제정하세요.'}),
      Object.freeze({slot:'autonomous_village',icon:'🏛️',title:'자치 마을',description:'인구·농장·규칙 목표를 달성해 2단계 마을로 발전하세요.'}),
      Object.freeze({slot:'newcomers_5',icon:'⛵',title:'사람이 모이는 섬',description:'새 주민 5명이 섬에 정착하게 하세요.'}),
      Object.freeze({slot:'trust_90',icon:'🤝',title:'믿을 만한 촌장',description:'공동체 신뢰를 90 이상으로 올리세요.'}),
      Object.freeze({slot:'rights_safe_30',icon:'🕊️',title:'모두의 마을',description:'권리 제한 없이 30주 이상 공동체를 운영하세요.',type:'secret',hidden:true})
    ]),
    science_cosmic_growth:Object.freeze([
      Object.freeze({slot:'first_asteroid',icon:'🪨',title:'첫 천체',description:'먼지와 자갈을 모아 소행성 단계에 도달하세요.'}),
      Object.freeze({slot:'star_birth',icon:'☀️',title:'별의 탄생',description:'중심에서 핵융합이 시작되는 별 단계에 도달하세요.'}),
      Object.freeze({slot:'black_hole',icon:'⚫',title:'사건의 지평선',description:'항성질량 블랙홀 단계에 도달하세요.'}),
      Object.freeze({slot:'discoveries_12',icon:'🔭',title:'우주 관측가',description:'서로 다른 우주 현상과 천체를 12개 이상 발견하세요.'}),
      Object.freeze({slot:'galactic_core',icon:'🌌',title:'은하의 중심',description:'초대질량 블랙홀 단계에 도달하세요.',type:'secret',hidden:true})
    ]),
    high_little_world:Object.freeze([
      Object.freeze({slot:'first_life',icon:'🌱',title:'생명의 시작',description:'살아 있는 식생이 자리 잡은 세계를 만드세요.'}),
      Object.freeze({slot:'food_chain',icon:'🦊',title:'먹고 먹히는 세계',description:'식생·초식동물·포식동물이 함께 살아가는 생태계를 만드세요.'}),
      Object.freeze({slot:'first_village',icon:'🏘️',title:'첫 문명',description:'정착지를 마을 단계까지 성장시키세요.'}),
      Object.freeze({slot:'two_settlements',icon:'🧭',title:'세상은 넓다',description:'두 개 이상의 정착지가 함께 살아가게 하세요.'}),
      Object.freeze({slot:'roads',icon:'🛣️',title:'문명의 길',description:'서로 다른 정착지를 잇는 도로망이 생기게 하세요.'})
    ])
  });

  function sanitizeId(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '');
  }

  function gameExists(gameId) {
    const games = window.KidscadeCatalog?.games || [];
    return games.some(game => game?.id === gameId && !game?.disabled);
  }

  function def(gameId, slot, title, description, extra = {}) {
    return {
      id: gameId + '.' + slot,
      gameId,
      icon:'🏆',
      type:'challenge',
      hidden:false,
      target:1,
      enabled:false,
      trigger:'',
      metric:'',
      title,
      description,
      ...extra
    };
  }

  function buildDefinitions() {
    const defs = [];
    const profiles = window.KidscadeGameProfiles;
    Object.entries(PLANS).forEach(([gameId, values]) => {
      if (!gameExists(gameId) || PILOT_GAME_IDS.has(gameId)) return;
      const [firstTitle, firstDesc, masteryTitle, masteryDesc, secretTitle, secretDesc] = values;
      const profile = profiles?.getProfile?.(gameId);
      const rules = LIVE_RULES[gameId] || {};

      (profile?.baseline || []).forEach(item => {
        defs.push(def(gameId, item.slot, item.title, item.description, {
          icon:item.icon || '🏆',
          type:item.target > 1 ? 'challenge' : 'normal',
          target:item.target,
          enabled:true,
          trigger:'metric',
          metric:item.metric
        }));
      });

      defs.push(def(gameId, 'planned_first', firstTitle, firstDesc, {
        icon:'🎮',
        type:'normal',
        enabled:false
      }));
      defs.push(def(gameId, 'mastery', masteryTitle, masteryDesc, {
        icon:'🏆',
        type:'challenge',
        enabled:Boolean(rules.mastery),
        rule:rules.mastery || null
      }));
      defs.push(def(gameId, 'secret', secretTitle, secretDesc, {
        icon:'✨',
        type:'secret',
        hidden:true,
        enabled:Boolean(rules.secret),
        rule:rules.secret || null
      }));

      (EXTRA_LIVE[gameId] || []).forEach(item => {
        defs.push(def(gameId, item.slot, item.title, item.description, {
          icon:item.icon || '🏆',
          type:item.type || 'challenge',
          hidden:Boolean(item.hidden),
          enabled:true
        }));
      });
    });
    return defs;
  }

  function register() {
    const api = window.KidscadeAchievements;
    if (!api?.registerDefinitions) return false;
    const defs = buildDefinitions();
    api.registerDefinitions(defs);
    document.dispatchEvent(new CustomEvent('kidscade:achievement-catalog-ready', {
      detail:{
        games:Object.keys(PLANS).length,
        definitions:defs.length,
        enabled:defs.filter(item => item.enabled !== false).length,
        planned:defs.filter(item => item.enabled === false).length
      }
    }));
    return true;
  }

  function start() {
    if (register()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (register() || attempts >= 40) clearInterval(timer);
    }, 100);
  }

  window.KidscadeAchievementCatalog = Object.freeze({
    plans:PLANS,
    liveRules:LIVE_RULES,
    extraLive:EXTRA_LIVE,
    buildDefinitions,
    register,
    sanitizeId
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
