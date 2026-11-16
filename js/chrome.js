// 모든 화면이 함께 쓰는 위쪽 띠 — 이름 · 찾기 · 조립기
(function () {
  'use strict';
  const { el } = window.JARC;

  function searchForm(value) {
    const input = el('input', {
      class: 'find__input', type: 'search', name: 'q', value: value || '', placeholder: '키워드 찾기 — 영어 · 한글',
      'aria-label': '키워드 찾기', autocomplete: 'off',
    });
    return el('form', {
      class: 'find', role: 'search',
      onsubmit: (event) => {
        event.preventDefault();
        const query = input.value.trim();
        if (query) window.location.hash = `#/s/${encodeURIComponent(query)}`;
      },
    }, [input, el('button', { class: 'find__go', type: 'submit', 'aria-label': '찾기' }, '찾기')]);
  }

  /**
   * @param {{ back?: {href: string, text: string}, tag?: string, query?: string }} [opts]
   * @returns {HTMLElement}
   */
  function strip(opts) {
    const o = opts || {};
    return el('header', { class: 'strip' }, [
      el('div', { class: 'strip__left' }, [
        o.back ? el('a', { class: 'back', href: o.back.href }, o.back.text) : null,
        el('a', { class: 'strip__brand', href: '#/' }, ['ai_JARC ', el('b', { text: '/' }), ' PROMPT STUDIO']),
      ]),
      el('nav', { class: 'strip__tools', 'aria-label': '도구' }, [
        searchForm(o.query),
        el('a', { class: 'strip__link', href: '#/a' }, '프롬프트 조립기'),
        el('a', { class: 'strip__link', href: '#/w' }, '내 그림 작업대'),
        o.tag ? el('span', { class: 'label', text: o.tag }) : null,
      ]),
    ]);
  }

  window.JARC.strip = strip;
})();
