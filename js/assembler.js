// 프롬프트 조립기 — 다섯 칸에서 키워드를 골라 한 문장으로 만든다
(function () {
  'use strict';
  const { el, copyText, toast, strip } = window.JARC;

  // KEEP 칸의 문장은 자료실에 없는 것이라 강의용으로 새로 썼다
  const KEEP = [
    ['Keep the same camera and room shape.', '카메라와 방 모양을 그대로 둔다'],
    ['Preserve all architectural details.', '건축 디테일을 모두 지킨다'],
    ['Do not add or remove furniture.', '가구를 더하거나 빼지 않는다'],
    ['Keep every window and door in the same position.', '창과 문의 자리를 그대로 둔다'],
    ['Do not change the layout.', '배치를 바꾸지 않는다'],
    ['Change nothing else.', '그 밖에는 아무것도 바꾸지 않는다'],
  ];
  const SLOTS = [
    { id: 'keep', en: 'KEEP', ko: '지킬 것', from: null },
    { id: 'material', en: 'MATERIAL', ko: '재질', from: ['materials'] },
    { id: 'light', en: 'LIGHT', ko: '빛', from: ['lighting_weather'] },
    { id: 'camera', en: 'CAMERA', ko: '카메라', from: ['camera_views'] },
    { id: 'quality', en: 'QUALITY', ko: '품질', from: ['core_keywords_30'], firstOnly: true },
  ];
  const EMPTY_TEXT = '공간을 쓰고 아래 칸에서 키워드를 고르면 여기에 프롬프트가 만들어집니다.';
  const state = { subject: '', picked: { keep: [], material: [], light: [], camera: [], quality: [] } };

  /** 칸마다 고를 수 있는 것: [{ title, options: [{en, ko}] }]. 꼭지가 없으면 빈 칸으로 둔다. */
  function optionGroups(data, slot) {
    if (!slot.from) return [{ title: '', options: KEEP.map(([en, ko]) => ({ en, ko })) }];
    return slot.from.flatMap((slug) => {
      const items = Object.hasOwn(data.topics, slug) ? data.topics[slug].items : [];
      return (slot.firstOnly ? items.slice(0, 1) : items).map((item) => ({ title: item.title, options: item.list.filter((k) => k.en) }));
    });
  }

  /** 고른 재질 · 빛 · 카메라 · 품질 키워드를 쉼표로 이은 글. */
  function keywords() {
    const p = state.picked;
    return [...p.material, ...p.light, ...p.camera, ...p.quality].join(', ');
  }

  /** 무엇을 그리는가 → 지킬 것 → 재질 · 빛 · 카메라 · 품질 순서로 잇는다. */
  function compose() {
    const p = state.picked;
    const subject = state.subject.trim();
    const words = keywords();
    const sentences = [
      subject ? (/[.!?]$/.test(subject) ? subject : `${subject}.`) : '',
      p.keep.join(' '),
      words ? `${words}.` : '',
    ];
    return sentences.filter(Boolean).join(' ');
  }

  /** 만든 프롬프트의 한글 풀이: 쓴 글은 그대로 두고, 고른 것만 한글 뜻으로 잇는다. meaning은 영어 → 한글 뜻. */
  function composeKo(meaning) {
    const p = state.picked;
    const ko = (list) => list.map((en) => meaning.get(en) || en);
    const subject = state.subject.trim();
    return [subject ? `(직접 쓴 말) ${subject}` : '', ko(p.keep).join(' · '), ko([...p.material, ...p.light, ...p.camera, ...p.quality]).join(', ')].filter(Boolean).join(' / ');
  }

  function pickedCount() {
    return Object.values(state.picked).reduce((sum, list) => sum + list.length, 0);
  }

  function pickButton(slot, option, refresh) {
    const isOn = () => state.picked[slot.id].includes(option.en);
    const button = el('button', { class: 'pick', type: 'button', 'aria-pressed': String(isOn()) }, [el('b', { text: option.en }), el('span', { text: option.ko })]);
    button.addEventListener('click', () => {
      const list = state.picked[slot.id];
      state.picked[slot.id] = isOn() ? list.filter((value) => value !== option.en) : [...list, option.en];
      button.setAttribute('aria-pressed', String(isOn()));
      refresh();
    });
    return button;
  }

  function slotSection(data, slot, index, refresh) {
    return el('section', { class: 'slot', 'aria-label': slot.ko }, [
      el('div', { class: 'slot__head' }, [el('span', { class: 'label', text: `0${index + 1}` }), el('h2', { text: slot.en }), el('p', { text: slot.ko })]),
      el('div', { class: 'slot__body' }, optionGroups(data, slot).map((group) => el('div', { class: 'slot__group' }, [
        group.title ? el('p', { class: 'label', text: group.title }) : null,
        el('div', { class: 'chips' }, group.options.map((option) => pickButton(slot, option, refresh))),
      ]))),
    ]);
  }

  function render(data) {
    const output = el('p', { class: 'asm__text', lang: 'en', 'aria-live': 'polite' });
    const count = el('span', { class: 'label' });
    const koText = el('span');
    const koBox = el('p', { class: 'asm__ko', lang: 'ko' }, [el('span', { class: 'label', text: '한글 풀이' }), koText]);
    const meaning = new Map(SLOTS.flatMap((slot) => optionGroups(data, slot).flatMap((group) => group.options.map((option) => [option.en, option.ko || option.en]))));
    const subject = el('input', { class: 'asm__subject', type: 'text', value: state.subject,
      placeholder: 'Interior view of a seminar room with one long table', 'aria-label': '무엇을 그리는가 (영어로)' });
    const refresh = () => {
      const text = compose();
      output.textContent = text || EMPTY_TEXT;
      output.classList.toggle('is-empty', !text);
      koText.textContent = composeKo(meaning); koBox.hidden = !text;
      count.textContent = `고른 것 ${pickedCount()}`;
    };
    const slots = el('div', { class: 'asm__slots' }, SLOTS.map((slot, index) => slotSection(data, slot, index, refresh)));
    const reset = () => {                                   // 화면을 다시 그리지 않고 제자리에서 비운다
      state.subject = ''; subject.value = '';
      SLOTS.forEach((slot) => { state.picked[slot.id] = []; });
      slots.querySelectorAll('.pick').forEach((button) => button.setAttribute('aria-pressed', 'false'));
      refresh();
    };
    const copy = () => {
      const text = compose();
      if (text) copyText(text, '프롬프트'); else toast('아직 고른 것이 없습니다');
    };
    subject.addEventListener('input', () => { state.subject = subject.value; refresh(); });
    refresh();
    return el('div', { class: 'sheet sheet--asm' }, [
      strip({ back: { href: '#/', text: '← 목록' }, tag: 'ASSEMBLER · 조립기' }),
      el('section', { class: 'thead thead--plain' }, el('div', {}, [
        el('p', { class: 'label', text: 'Prompt assembler' }),
        el('h1', { class: 'thead__title', text: '프롬프트 조립기' }),
        el('p', { class: 'thead__intro', text: '무엇을 그릴지 한 줄로 쓰고, 다섯 칸에서 키워드를 눌러 고른다. 한 번에 한 칸만 바꿔 보면 무엇이 효과였는지 알 수 있다.' }),
        el('label', { class: 'asm__label' }, [el('span', { class: 'label', text: '00  SUBJECT — 무엇을 그리는가 (영어로 쓴다)' }), subject]),
        el('p', { class: 'wb__hint', text: '예: Interior view of a seminar room with one long table — 긴 테이블 하나가 있는 세미나실 내부' }),
      ])),
      slots,
      el('aside', { class: 'asm__out', 'aria-label': '만들어진 프롬프트' }, [
        el('div', { class: 'asm__outhead' }, [el('span', { class: 'label', text: 'Your prompt · 만든 프롬프트' }), count]),
        output, koBox,
        el('div', { class: 'asm__actions' }, [
          el('button', { class: 'btn btn--accent', type: 'button', onclick: copy }, '프롬프트 복사'),
          el('button', { class: 'btn', type: 'button', onclick: reset }, '비우기'),
        ]),
      ]),
    ]);
  }

  window.JARC.views.assembler = { render };
})();
