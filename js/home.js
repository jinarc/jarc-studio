// 홈 — 표지 · 프롬프트의 다섯 칸 · 도면 목록표
(function () {
  'use strict';
  const { el, strip } = window.JARC;

  const FORMULA = [
    ['KEEP', '지킬 것', '카메라 · 방 모양 · 가구의 수와 자리'],
    ['MATERIAL', '재질', '표면의 이름을 정확히'],
    ['LIGHT', '빛', '시간 · 날씨 · 켜지는 불'],
    ['CAMERA', '카메라', '어디서 어떻게 보는가'],
    ['QUALITY', '품질', '사진 · 렌더의 완성도'],
  ];
  const PILE = ['lighting_weather', 'camera_views', 'color_mexico'];

  function hero(data) {
    const count = Object.keys(data.topics).length;
    return el('section', { class: 'hero', 'aria-labelledby': 'hero-title' }, [
      el('div', {}, [
        el('p', { class: 'label', text: `건축 · 실내 AI 프롬프트 자료실 — 꼭지 ${count} · 카드 ${data.meta.cards} · 프롬프트 ${data.meta.prompts}` }),
        el('h1', { class: 'hero__title', id: 'hero-title' }, [el('span', { text: 'PROMPT' }), el('span', { text: 'STUDIO' })]),
        el('p', { class: 'hero__lead' }, [
          el('strong', { text: 'AI에게 건축을 말하는 법. ' }),
          '카드를 보고, 프롬프트를 읽고, 내 공간에 옮긴다. 키워드는 눌러서 복사한다.',
        ]),
      ]),
      el('div', { class: 'hero__pile', 'aria-hidden': 'true' },
        PILE.map((slug) => el('img', { src: data.topics[slug].coverThumb, alt: '', width: 420, height: 532 }))),
    ]);
  }

  function formula() {
    return el('section', { class: 'formula', 'aria-label': '프롬프트의 다섯 칸' }, [
      el('a', { class: 'formula__head', href: '#/a' }, [
        el('span', { class: 'label', text: 'Prompt anatomy · 프롬프트의 짜임' }),
        el('strong', {}, ['프롬프트의 다섯 칸', el('i', { text: ' → 조립기' })]),
      ]),
      ...FORMULA.map(([en, ko, hint], index) => el('div', { class: 'formula__slot' }, [
        el('span', { class: 'label', text: `0${index + 1}` }),
        el('span', { class: 'formula__en', text: en }),
        el('span', { class: 'formula__ko', text: `${ko} — ${hint}` }),
      ])),
    ]);
  }

  function row(topic, index) {
    return el('a', { class: 'row', href: `#/t/${topic.slug}`, style: `--i:${index}` }, [
      el('img', { class: 'row__thumb', src: topic.coverThumb, alt: '', loading: 'lazy', width: 420, height: 532 }),
      el('span', { class: 'row__code', text: topic.code }),
      el('span', { class: 'row__title', text: topic.title }),
      el('span', { class: 'row__kind', text: topic.kindLabel }),
      el('span', { class: 'row__count', text: topic.count }),
      el('span', { class: 'row__go' }, ['열기 ', el('i', { text: '→' })]),
    ]);
  }

  function group(data, g) {
    return el('section', { class: 'group', 'aria-labelledby': `g-${g.id}` }, [
      el('div', { class: 'group__head' }, [
        el('div', { class: 'group__no', text: g.no }),
        el('h2', { class: 'group__name', id: `g-${g.id}`, text: g.name }),
        el('p', { class: 'label', text: g.en }),
        el('p', { class: 'group__q', text: g.q }),
      ]),
      el('div', {}, g.topics.map((slug, index) => row(data.topics[slug], index))),
    ]);
  }

  function render(data) {
    return el('div', { class: 'sheet' }, [
      strip(),
      hero(data),
      formula(),
      el('div', { class: 'index' }, data.groups.map((g) => group(data, g))),
      el('footer', { class: 'colophon' }, [
        el('span', { class: 'label', text: '자료 — ai_JARC 자료실 · 송진호' }),
        el('span', { class: 'label', text: `만든 날 ${data.meta.built}` }),
      ]),
    ]);
  }

  window.JARC.views.home = { render };
})();
