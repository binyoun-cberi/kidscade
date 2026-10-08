((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeGameProfiles = Object.freeze(api);
})(() => {
  'use strict';

  const MODEL_DEFINITIONS = Object.freeze({
    match: Object.freeze({
      label:'승패 대전',
      scope:'match',
      legacy:'match-end',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_win', metric:'wins', target:1, icon:'🥇', title:'첫 승리', description:'처음으로 한 경기를 승리하세요.' }),
        Object.freeze({ slot:'wins_5', metric:'wins', target:5, icon:'🏆', title:'5승 달성', description:'이 게임에서 5승을 달성하세요.' })
      ])
    }),
    session: Object.freeze({
      label:'한 판 기록',
      scope:'session',
      legacy:'session-end',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_session', metric:'sessionsCompleted', target:1, icon:'✅', title:'첫 한 판', description:'한 판을 끝까지 완료하세요.' }),
        Object.freeze({ slot:'sessions_5', metric:'sessionsCompleted', target:5, icon:'📚', title:'5판 완료', description:'이 게임을 5판 끝까지 완료하세요.' })
      ])
    }),
    run: Object.freeze({
      label:'런·생존',
      scope:'run',
      legacy:'run-end',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_run', metric:'runs', target:1, icon:'👟', title:'첫 도전', description:'첫 번째 유효한 도전을 끝내세요.' }),
        Object.freeze({ slot:'runs_10', metric:'runs', target:10, icon:'🔥', title:'10번의 도전', description:'유효한 도전을 10번 완료하세요.' })
      ])
    }),
    stage: Object.freeze({
      label:'스테이지·퍼즐',
      scope:'stage',
      legacy:'explicit-success',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_clear', metric:'stagesCleared', target:1, icon:'🚩', title:'첫 클리어', description:'첫 스테이지나 퍼즐을 해결하세요.' }),
        Object.freeze({ slot:'clears_10', metric:'stagesCleared', target:10, icon:'🧩', title:'10회 클리어', description:'스테이지나 퍼즐을 10회 해결하세요.' })
      ])
    }),
    shift: Object.freeze({
      label:'영업·근무',
      scope:'shift',
      legacy:'explicit-success',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_shift', metric:'shiftsCompleted', target:1, icon:'🕒', title:'첫 근무 완료', description:'첫 영업이나 근무를 끝까지 완료하세요.' }),
        Object.freeze({ slot:'shifts_5', metric:'shiftsCompleted', target:5, icon:'💼', title:'베테랑 근무자', description:'영업이나 근무를 5회 완료하세요.' })
      ])
    }),
    mission: Object.freeze({
      label:'임무',
      scope:'mission',
      legacy:'explicit-success',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_mission', metric:'missionsCompleted', target:1, icon:'🎯', title:'첫 임무 완료', description:'첫 임무를 성공적으로 완료하세요.' }),
        Object.freeze({ slot:'missions_5', metric:'missionsCompleted', target:5, icon:'🛡️', title:'임무 전문가', description:'임무를 5회 성공적으로 완료하세요.' })
      ])
    }),
    campaign: Object.freeze({
      label:'캠페인',
      scope:'campaign',
      legacy:'explicit-success',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_campaign', metric:'campaignsCompleted', target:1, icon:'🏕️', title:'첫 여정 완주', description:'하나의 캠페인이나 장기 목표를 완료하세요.' }),
        Object.freeze({ slot:'campaigns_3', metric:'campaignsCompleted', target:3, icon:'🗺️', title:'세 번의 여정', description:'캠페인이나 장기 목표를 3회 완료하세요.' })
      ])
    }),
    progression: Object.freeze({
      label:'성장·진행',
      scope:'progression',
      legacy:'ignore',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_milestone', metric:'uniqueMilestones', target:1, icon:'🌱', title:'첫 성장', description:'게임의 첫 주요 성장 목표에 도달하세요.' }),
        Object.freeze({ slot:'milestones_5', metric:'uniqueMilestones', target:5, icon:'🌳', title:'성장의 발자취', description:'서로 다른 주요 성장 목표 5개에 도달하세요.' })
      ])
    }),
    sandbox: Object.freeze({
      label:'자유 샌드박스',
      scope:'sandbox',
      legacy:'ignore',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_milestone', metric:'uniqueMilestones', target:1, icon:'✨', title:'첫 발견', description:'자유 플레이에서 첫 주요 발견이나 목표를 달성하세요.' }),
        Object.freeze({ slot:'milestones_5', metric:'uniqueMilestones', target:5, icon:'🌍', title:'세계 탐험가', description:'서로 다른 주요 발견이나 목표 5개를 달성하세요.' })
      ])
    }),
    creation: Object.freeze({
      label:'창작',
      scope:'creation',
      legacy:'explicit-success',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_creation', metric:'creationsSaved', target:1, icon:'🎨', title:'첫 작품', description:'첫 완성 작품을 저장하세요.' }),
        Object.freeze({ slot:'creations_5', metric:'creationsSaved', target:5, icon:'🖼️', title:'작품 다섯 개', description:'완성 작품을 5개 저장하세요.' })
      ])
    }),
    collection: Object.freeze({
      label:'컬렉션·종목',
      scope:'collection',
      legacy:'ignore',
      baseline:Object.freeze([
        Object.freeze({ slot:'first_discovery', metric:'uniqueMilestones', target:1, icon:'🧭', title:'첫 체험', description:'첫 종목이나 수집 목표를 완료하세요.' }),
        Object.freeze({ slot:'discoveries_5', metric:'uniqueMilestones', target:5, icon:'🗃️', title:'다섯 가지 체험', description:'서로 다른 종목이나 수집 목표 5개를 완료하세요.' })
      ])
    })
  });

  const GROUPS = Object.freeze({
    match:Object.freeze([
      'high_history_timebattle_live','low_bumper_roulette','low_pong_battle','high_pass_mafia',
      'high_seed_volleyball','high_seed_baseball','high_seed_fc_manager','high_top_king',
      'toddler_muk_jji_ppa','alkkagi_janggi','math_corner_clash','high_omok_arena',
      'low_wordchain_arena','infinite_gugudan'
    ]),
    session:Object.freeze([
      'low_blind_elephant','math_timing_lcd','trivia_zoolympic','kor_handwriting_party',
      'tod_shape_color','kor_sentence_train','chosung_bomb','low_order_pang','low_speak_jjoayo',
      'tod_symbol_duel','kor_typing_tadak','math_quiz','fraction_quiz','world_flag_master',
      'korean_vocab','swipe_spelling','language_arcade','hanja_test','high_body_muscle_lab','math_pi_memory','science_periodic_memory','kor_hand_twist_typing'
    ]),
    run:Object.freeze([
      'low_perfect_pitch','low_wordris','low_math_dog_runner','music_neon_rift','high_kite_wind_rider',
      'sim_mosquito','low_word_blaster','language_word_siege','hanja_survivors_8','high_rhythm_dash','snake_math','threes',
      'math_tower_defense','high_gugudan_stairs','joseon_janggu','trash_runner','word_snake',
      'patience_tower','jineung_bird','triangle_situation','math_rune_forest','spelling_frog',
      'tod_emoji_pang','high_emergency_escape','tod_heaven_stairs'
    ]),
    stage:Object.freeze([
      'hanja_sichuan','high_code_quest','low_math_number_tower','high_classroom_war_3d','high_rule_lab','low_one_stroke',
      'tod_hidden_emoji','low_big_puzzle_time','tod_chick_shell','tod_antarctic_exploration',
      'tod_emoji_minesweeper','triangle_compare','lab_water_sort','low_rubiks_cube','geo_exorcist',
      'high_history_match','magic_scale','korea_puzzle','laser_angle','code_breaker','sudoku',
      'high_fraction_smith','polygon_area','high_haunted_school_exorcist','tod_puzzle_time','tod_puzzle_bobble','toddler_monkey_vines',
      'toddler_penguin_ice_pop','toddler_color_stack','toddler_three_friends_set','high_bridge_builder',
      'low_pattern_lock','school_tower','hero_english'
    ]),
    shift:Object.freeze([
      'job_nail_artist','job_takoyaki_simulator','job_steak_master','job_bogle_bunsik',
      'math_icecream_division','math_stationery_boss','job_maratang_simulator','math_base10_blocks',
      'alien_pizza','alien_sandwich','burger_master','job_teacher_classroom',
      'high_folklore_night_guard','low_juice_maker'
    ]),
    mission:Object.freeze([
      'high_weathercaster_simulator','job_police_car','job_drone_pilot','job_driver_license',
      'job_scuba_diver','job_internal_medicine','low_cleanup_squad','high_disaster_city','high_haunted_school_exorcist'
    ]),
    campaign:Object.freeze([
      'high_twelve_island','high_byeokrando_voyage','high_quarantine_17','trivia_school_survival',
      'trivia_drift_survival','high_outbreak_korea','korea_marble','high_history_map'
    ]),
    progression:Object.freeze([
      'high_human_history_cards','high_metro_planner','trivia_blockraft','high_star_hoppers',
      'high_ecopolis','high_micro_evolution','science_cosmic_growth'
    ]),
    sandbox:Object.freeze([
      'high_little_world','high_factory_tycoon','cube3d'
    ]),
    creation:Object.freeze([
      'high_story_builder','low_sand_art_studio','high_melody_workshop','toddler_photo_coloring',
      'high_3d_block_painter','high_little_sculptor','piano_studio','pixel_editor'
    ]),
    collection:Object.freeze([
      'low_nyam_universe','toddler_traditional_play_yard','world_boardgames'
    ])
  });

  const profileMap = new Map();
  Object.entries(GROUPS).forEach(([model, ids]) => {
    const modelDef = MODEL_DEFINITIONS[model];
    ids.forEach(gameId => {
      if (profileMap.has(gameId)) throw new Error('Duplicate game outcome profile: ' + gameId);
      profileMap.set(gameId, Object.freeze({
        gameId,
        model,
        label:modelDef.label,
        scope:modelDef.scope,
        legacy:modelDef.legacy,
        baseline:modelDef.baseline
      }));
    });
  });

  function getProfile(gameId) {
    const id = String(gameId || '').trim();
    const profile = profileMap.get(id);
    return profile ? { ...profile, baseline:profile.baseline.map(item => ({ ...item })) } : null;
  }

  function getProfiles() {
    return Array.from(profileMap.values()).map(profile => ({
      ...profile,
      baseline:profile.baseline.map(item => ({ ...item }))
    }));
  }

  function getModelDefinition(model) {
    const def = MODEL_DEFINITIONS[String(model || '').trim()];
    return def ? { ...def, baseline:def.baseline.map(item => ({ ...item })) } : null;
  }

  function listByModel(model) {
    const key = String(model || '').trim();
    return (GROUPS[key] || []).slice();
  }

  return Object.freeze({
    models:MODEL_DEFINITIONS,
    groups:GROUPS,
    size:profileMap.size,
    getProfile,
    getProfiles,
    getModelDefinition,
    listByModel
  });
});
