// 작업대의 프롬프트 문장 — 무엇을 바꿀지(작업)와 고른 분위기로 붙여 넣을 문장을 만든다
// 기준 (의장 2026-11-17): 건축 구조물의 위치와 크기는 고정. 천장 · 벽 · 바닥의 디자인(무늬 · 패널 · 마감)은 구조가 아니라 바뀐다.
(function () {
  'use strict';

  // 짧은 틀 (기본)
  const KEEP_SHORT = 'KEEP exactly: the camera; the position and size of every architectural element (floor, walls, ceiling height, columns, beams, stairs, windows, doors); the furniture, fixtures, screen content and people. Add nothing new.';
  const KEEP_SHORT_KO = '그대로 둘 것: 카메라 / 건축 구조물(바닥 · 벽 · 천장 높이 · 기둥 · 보 · 계단 · 창 · 문)의 위치와 크기 / 가구 · 기구 · 화면 내용 · 사람. 새로 더하지 않는다.';
  // 긴 틀 ('자세히') — 짧은 틀로 돌렸는데 구조가 바뀌었을 때 쓴다
  const LOCK = [
    'LOCK — every architectural structure that makes up the attached image keeps its exact position and size:',
    '- the camera (same viewpoint, angle and framing);',
    '- the floor, walls and ceiling: same position, shape and height. Do not raise, lower or open the ceiling;',
    '- the columns, beams, stairs, railings and level changes: same position and size;',
    '- the windows, doors and openings: same number, position and size. Do not add, remove, move or resize any opening;',
    '- the built-in elements, screens with their content, wall panels and light fixtures;',
    '- the furniture: same number, shape and position; and the people.',
    'Do not add ducts, pipes, beams, lamps, windows, furniture or objects that are not in the attached image.',
  ];
  const LOCK_KO = [
    '잠금 — 첨부한 그림을 이루는 건축 구조물은 모두 위치와 크기를 그대로 둔다:',
    '- 카메라 (같은 시점 · 각도 · 화면 구성)',
    '- 바닥 · 벽 · 천장: 같은 자리, 같은 모양, 같은 높이. 천장을 높이거나 낮추거나 트지 않는다',
    '- 기둥 · 보 · 계단 · 난간 · 단 차이: 같은 자리, 같은 크기',
    '- 창 · 문 · 개구부: 같은 수 · 자리 · 크기. 개구부를 더하거나 빼거나 옮기거나 크기를 바꾸지 않는다',
    '- 붙박이 요소, 화면과 그 내용, 벽 패널, 조명 기구',
    '- 가구: 같은 수 · 모양 · 자리. 그리고 사람',
    '첨부한 그림에 없는 덕트 · 배관 · 보 · 조명 · 창 · 가구 · 소품을 더하지 않는다.',
  ];
  const SURFACE = 'Surface design is not structure, so redesign all three to match the style: the ceiling design (pattern, panels, finish), the wall design (finish, pattern, paneling) and the floor design (material, pattern, layout of tiles, planks or carpet). Do this within the same ceiling plane, wall planes and floor plane.';
  const SURFACE_KO = '표면 디자인은 구조가 아니므로 셋 다 스타일에 맞게 새로 디자인한다: 천장 디자인(무늬 · 패널 · 마감), 벽 디자인(마감 · 무늬 · 패널), 바닥 디자인(재질 · 무늬 · 타일이나 마루나 카펫의 깔기 방식). 단, 같은 천장면 · 벽면 · 바닥면 안에서만.';

  const onlySurface = (en, ko, others, othersKo) => ({
    lib: 'material',
    head: `Edit the attached image: change the ${en} finish only.`, headKo: `첨부한 그림을 고친다: ${ko} 마감만 바꾼다.`,
    change: `CHANGE: the ${en} design only (material, pattern, color)`, changeKo: `바꿀 것: ${ko} 디자인만(재질 · 무늬 · 색)`,
    rest: `Keep the ${others}, their finishes and the lighting as they are.`, restKo: `${othersKo}과 그 마감, 조명은 그대로 둔다.`,
    check: { text: `${othersKo}의 마감과 조명이 그대로다 (${ko}만 바뀌었다)`,
      fix: `Restore the original finishes of the ${others} and the original lighting — only the ${en} may differ.`,
      fixKo: `${othersKo}의 마감과 조명을 원본대로 되돌린다 — ${ko}만 달라야 한다.` },
  });

  /** 무엇을 바꿀까 — 작업마다 문장의 머리 · 바꿀 것 · 나머지 지킬 것 · 고를 목록(lib) · 더할 점검(check)이 정해진다. */
  const TASKS = [
    { id: 'render', name: '마감 입히기', hint: '마감 없는 그림 → 렌더', lib: 'style', full: true,
      head: 'Turn the attached image into a photorealistic render: add finishes and light only.', headKo: '첨부한 그림을 사실적인 렌더로 바꾼다: 마감과 빛만 입힌다.',
      change: 'APPLY: the ceiling, wall and floor design (material, pattern, color) and the light mood', changeKo: '입힐 것: 천장 · 벽 · 바닥의 디자인(재질 · 무늬 · 색)과 빛의 분위기' },
    { id: 'mood', name: '분위기 전체', hint: '천장 · 벽 · 바닥 마감과 빛', lib: 'style', full: true,
      head: 'Edit the attached image: change finishes and light only.', headKo: '첨부한 그림을 고친다: 마감과 빛만 바꾼다.',
      change: 'REDESIGN: the ceiling, wall and floor design (material, pattern, color) and the light mood', changeKo: '새로 디자인할 것: 천장 · 벽 · 바닥의 디자인(재질 · 무늬 · 색)과 빛의 분위기' },
    { id: 'light', name: '빛만', hint: '마감은 그대로 · 조명과 시간대만', lib: 'light',
      head: 'Edit the attached image: change the lighting only.', headKo: '첨부한 그림을 고친다: 빛만 바꾼다.',
      change: 'CHANGE: the light and atmosphere only', changeKo: '바꿀 것: 빛과 분위기만',
      rest: 'Keep every material, color and pattern of every surface as it is.', restKo: '모든 표면의 재질 · 색 · 무늬는 그대로 둔다.',
      check: { text: '표면의 재질 · 색 · 무늬가 그대로다 (빛만 바뀌었다)',
        fix: 'Restore the original material, color and pattern of every surface — only the light may differ.',
        fixKo: '모든 표면의 재질 · 색 · 무늬를 원본대로 되돌린다 — 빛만 달라야 한다.' } },
    { id: 'floor', name: '바닥만', hint: '바닥 마감만', ...onlySurface('floor', '바닥', 'walls and ceiling', '벽 · 천장') },
    { id: 'wall', name: '벽만', hint: '벽 마감만', ...onlySurface('wall', '벽', 'floor and ceiling', '바닥 · 천장') },
    { id: 'ceiling', name: '천장만', hint: '천장 마감만', ...onlySurface('ceiling', '천장', 'floor and walls', '바닥 · 벽') },
  ];
  const LIBS = {
    style: { pick: '스타일 고르기 …', blank: '[여기에 재질 · 색 · 빛을 쓴다]' },
    light: { pick: '빛 고르기 …', blank: '[여기에 빛과 분위기를 쓴다]' },
    material: { pick: '재질 고르기 …', blank: '[여기에 재질을 쓴다]' },
  };

  // 비교 점검 — 원본과 같으면 체크한다. 체크하지 못한 항목은 fix 문장이 되어 '고치는 말'에 들어간다.
  const CHECKS = [
    { text: '바닥 · 벽 · 천장의 모양과 높이가 같다',
      fix: 'Restore the floor, walls and ceiling to the original shape, position and height — do not raise or open the ceiling.',
      fixKo: '바닥 · 벽 · 천장을 원본의 모양 · 자리 · 높이로 되돌린다 — 천장을 높이거나 트지 않는다.' },
    { text: '창 · 문의 수와 자리가 같다 (새 개구부가 없다)',
      fix: 'Restore the original windows and doors: same number, position and size. Remove every opening that is not in the original.',
      fixKo: '창과 문을 원본대로 되돌린다: 같은 수 · 자리 · 크기. 원본에 없는 개구부는 모두 없앤다.' },
    { text: '가구의 수 · 모양 · 자리가 같다',
      fix: 'Restore the original number, shape and position of the furniture.',
      fixKo: '가구의 수 · 모양 · 자리를 원본대로 되돌린다.' },
    { text: '설계에 없는 것(조명 · 덕트 · 소품)이 생기지 않았다',
      fix: 'Remove every duct, pipe, beam, lamp and object that is not in the original.',
      fixKo: '원본에 없는 덕트 · 배관 · 보 · 조명 · 소품을 모두 없앤다.' },
  ];

  const task = (id) => TASKS.find((t) => t.id === id) || TASKS[0];

  /** 작업에 맞는 점검 항목: 구조 네 가지 + 일부만 바꾸는 작업이면 '나머지는 그대로인가' */
  function checks(taskId) {
    const extra = task(taskId).check;
    return extra ? [...CHECKS, extra] : CHECKS;
  }

  /** 붙여 넣을 문장 (영어 · 한글 풀이). style이 비면 빈칸 안내를 넣는다. */
  function build(taskId, style, styleKo, detail) {
    const t = task(taskId); const blank = LIBS[t.lib].blank;
    const en = [t.head, ...(detail ? LOCK : [KEEP_SHORT]), t.rest, `${t.change} — "${style || blank}"`, detail && t.full ? SURFACE : null];
    const ko = [t.headKo, ...(detail ? LOCK_KO : [KEEP_SHORT_KO]), t.restKo, `${t.changeKo} — "${styleKo || style || blank}"`, detail && t.full ? SURFACE_KO : null];
    return { en: en.filter(Boolean).join('\n'), ko: ko.filter(Boolean).join('\n') };
  }

  const topicItems = (data, slug) => (Object.hasOwn(data.topics, slug) ? data.topics[slug].items : []);

  /**
   * 작업의 목록(lib)에 맞는 고를 거리: [{ group, options: [{ label, prompt, ko }] }]
   * 스타일 · 빛은 카드 프롬프트에서 마감 · 색 · 빛만 뽑은 글(item.finish)을, 재질은 재질 라이브러리의 키워드를 쓴다.
   */
  function options(data, lib) {
    if (lib === 'material') {
      return topicItems(data, 'materials').map((item) => ({
        group: item.title, options: item.list.filter((row) => row.en).map((row) => ({ label: `${row.en} — ${row.ko}`, prompt: row.en, ko: row.ko })),
      }));
    }
    const slug = lib === 'light' ? 'lighting_weather' : 'interior_styles';
    const picks = topicItems(data, slug).filter((item) => item.finish).map((item) => ({ label: `${item.no} ${item.title}`, prompt: item.finish, ko: item.finishKo }));
    return picks.length ? [{ group: lib === 'light' ? '조명 & 날씨' : '인테리어 스타일', options: picks }] : [];
  }

  window.JARC.wbPrompt = { TASKS, LIBS, task, build, options, checks };
})();
