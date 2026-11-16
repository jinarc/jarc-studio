// 찾기 — 모든 꼭지의 키워드 · 프롬프트에서 영어 · 한글로 찾는다
(function () {
  'use strict';
  const { el, copyText, strip } = window.JARC;

  const MAX_RESULTS = 150;
  let index = null;

  /** 찾을 거리 한 줄: 어느 꼭지의 어느 항목인지, 복사할 글, 찾을 때 볼 글 */
  function buildIndex(data) {
    const rows = []; const seenPrompts = new Set();
    Object.values(data.topics).forEach((topic) => {
      topic.items.forEach((item, i) => {
        const href = topic.layout === 'plates' ? `#/p/${topic.slug}/${i + 1}` : `#/t/${topic.slug}`;
        const where = { code: topic.code, topic: topic.title, item: item.title, href };
        item.list.forEach((row) => {
          const main = row.en || row.ko;
          if (!main) return;
          rows.push({ ...where, main, sub: [row.en ? row.ko : '', row.hex, row.desc].filter(Boolean).join(' · '), copy: row.hex || main,
            hay: [row.en, row.ko, row.desc, row.hex, item.title].join(' ').toLowerCase(), kind: row.hex ? '색' : '키워드', hex: row.hex || '' });
        });
        if (item.prompt && !seenPrompts.has(`${topic.slug}|${item.prompt}`)) {      // 같은 꼭지의 같은 프롬프트는 한 번만
          seenPrompts.add(`${topic.slug}|${item.prompt}`);
          rows.push({ ...where, main: item.prompt, sub: item.promptKo, copy: item.prompt,
            hay: [item.prompt, item.promptKo, item.title, item.sub].join(' ').toLowerCase(), kind: '프롬프트', hex: '' });
        }
      });
    });
    return rows;
  }

  function find(data, query) {
    if (!index) index = buildIndex(data);
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index.filter((row) => words.every((word) => row.hay.includes(word)));
  }

  function resultRow(row) {
    return el('li', { class: `hit${row.kind === '프롬프트' ? ' hit--prompt' : ''}` }, [
      el('a', { class: 'hit__where', href: row.href }, [el('b', { text: row.code }), ` ${row.topic} · ${row.item}`]),
      el('button', { class: 'hit__main', type: 'button', title: '눌러서 복사', onclick: () => copyText(row.copy, row.kind) }, [
        row.hex ? el('i', { class: 'kw__chip', bg: row.hex }) : null,
        el('b', { text: row.main }),
        row.sub ? el('span', { text: row.sub }) : null,
      ]),
      el('span', { class: 'label', text: row.kind }),
    ]);
  }

  function render(data, query) {
    const hits = find(data, query);
    const shown = hits.slice(0, MAX_RESULTS);
    return el('div', { class: 'sheet' }, [
      strip({ back: { href: '#/', text: '← 목록' }, query }),
      el('section', { class: 'thead thead--plain' }, el('div', {}, [
        el('p', { class: 'label', text: 'Search · 찾기' }),
        el('h1', { class: 'thead__title', text: `“${query}”` }),
        el('p', { class: 'thead__intro', text: hits.length
          ? `${hits.length}개를 찾았습니다.${hits.length > MAX_RESULTS ? ` 앞의 ${MAX_RESULTS}개만 보여 줍니다. 낱말을 더 넣어 좁혀 보세요.` : ''} 눌러서 복사한다.`
          : '찾은 것이 없습니다. 영어 낱말이나 다른 한글 낱말로 다시 찾아보세요.' }),
      ])),
      shown.length ? el('ul', { class: 'hits' }, shown.map(resultRow)) : null,
    ]);
  }

  window.JARC.views.search = { render };
})();
