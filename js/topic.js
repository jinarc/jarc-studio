// 꼭지 화면 — 표제란 + 본문 (카드 판 · 키워드 표 · 색 팔레트)
(function () {
  'use strict';
  const { el, copyText, strip, lightbox } = window.JARC;

  const hasStage = (topic) => topic.layout === 'plates';

  function head(topic, groupInfo) {
    return el('section', { class: 'thead', 'aria-labelledby': 'topic-title' }, [
      el('div', {}, [
        el('div', { class: 'thead__code' }, [
          el('b', { text: topic.code }),
          el('span', { class: 'label', text: `${groupInfo.no} ${groupInfo.name} · ${groupInfo.en}` }),
          topic.series ? el('span', { class: 'label', text: topic.series }) : null,
        ]),
        el('h1', { class: 'thead__title', id: 'topic-title', text: topic.title }),
        el('p', { class: 'thead__intro', text: topic.intro || topic.summary }),
        el('div', { class: 'thead__stats' }, topic.stats.map(([n, name]) =>
          el('div', {}, [el('b', { text: String(n) }), el('span', { class: 'label', text: name })]))),
        hasStage(topic) ? el('div', { class: 'thead__actions' }, [
          el('a', { class: 'btn btn--accent', href: `#/p/${topic.slug}/1` }, '발표 화면으로 보기 →'),
        ]) : null,
      ]),
      el('figure', { class: 'thead__cover' }, el('img', { src: topic.cover, alt: `${topic.title} 표지`, width: 890, height: 1128 })),
    ]);
  }

  // ── 카드 판 ────────────────────────────────────────────────
  function plateLine(topic, item) {
    const words = item.list.map((k) => k.en || k.ko).filter(Boolean);
    if (words.length) return words.join('  ·  ');
    return topic.kind === 'case' ? (item.text[0] || '') : '';
  }

  function plate(topic, item, index) {
    return el('a', { class: `plate${index === 0 ? ' plate--lead' : ''}`, href: `#/p/${topic.slug}/${index + 1}`, style: `--i:${index}` }, [
      el('div', { class: 'plate__fig' }, [
        el('span', { class: 'plate__no', text: item.no }),
        el('img', { src: index === 0 ? item.img : item.thumb, alt: item.alt, loading: index < 4 ? 'eager' : 'lazy', width: 890, height: 1128 }),
      ]),
      el('h2', { class: 'plate__title', text: item.title }),
      item.sub ? el('p', { class: 'plate__sub', text: item.sub }) : null,
      plateLine(topic, item) ? el('p', { class: 'plate__kw', text: plateLine(topic, item) }) : null,
    ]);
  }

  function plates(topic) {
    return el('section', { class: 'plates', 'aria-label': '카드 목록' }, [
      ...topic.items.map((item, index) => plate(topic, item, index)),
      el('a', { class: 'plate plate--cta', href: `#/p/${topic.slug}/1`, style: `--i:${topic.items.length}` }, [
        el('span', { class: 'label', text: 'Presentation · 발표 화면' }),
        el('strong', { text: '카드를 크게 띄우고 하나씩 읽는다' }),
        el('span', { text: '→' }),
      ]),
    ]);
  }

  function keywordWall(topic) {
    return el('section', { class: 'kwall', 'aria-labelledby': 'kw-title' }, [
      el('div', {}, [
        el('p', { class: 'label', text: 'Keywords · 키워드' }),
        el('h2', { id: 'kw-title', text: '키워드 모아 보기' }),
        el('p', { text: '눌러서 복사한다.' }),
      ]),
      el('div', {}, topic.items.map((item) => el('div', { class: 'kwgroup' }, [
        el('div', { class: 'kwgroup__name' }, [el('b', { text: item.no }), item.title]),
        el('div', { class: 'chips' }, item.list.map((k) => el('button', {
          class: 'chip', type: 'button', title: '눌러서 복사', onclick: () => copyText(k.en, k.en),
        }, [el('b', { text: k.en }), el('span', { text: k.ko })]))),
      ]))),
    ]);
  }

  // ── 키워드 표 ──────────────────────────────────────────────
  /** 키워드 타일. 누르면 복사한다. 예시 그림이 있으면 그 그림과 만든 프롬프트도 크게 띄운다. */
  function tile(row) {
    const main = row.en || row.ko;
    const onClick = () => {
      copyText(main, main);
      if (row.ex) lightbox.open({ src: row.ex.img, alt: `${main} 예시 그림`, label: '키워드 예시', title: main, sub: row.ko, prompt: row.ex.prompt, promptKo: row.ex.promptKo, promptLabel: '이 그림을 만든 프롬프트' });
    };
    return el('button', { class: `tile${row.ex ? ' tile--ex' : ''}`, type: 'button', title: row.ex ? '눌러서 복사 · 예시 그림 크게 보기' : '눌러서 복사', onclick: onClick }, [
      row.ex ? el('span', { class: 'tile__ex' }, el('img', { src: row.ex.thumb, alt: '', loading: 'lazy' })) : null,
      el('i', { text: String(row.n).padStart(2, '0') }),
      el('b', { text: main }),
      row.en && row.ko ? el('span', { text: row.ko }) : null,
      row.desc ? el('small', { text: row.desc }) : null,
    ]);
  }

  function cardPreview(item) {
    const show = () => lightbox.open({ src: item.img, alt: item.alt, label: item.isNew ? '새 그림' : '원본 카드', title: item.title, sub: item.sub });
    return el('button', { class: 'tsec__card', type: 'button', onclick: show }, [
      el('img', { src: item.thumb, alt: '', loading: 'lazy' }),
      el('span', { text: '원본 카드 크게 보기' }),
    ]);
  }

  function tableSection(topic, item) {
    const wide = item.list.some((row) => row.desc);
    const withExamples = item.list.some((row) => row.ex);
    return el('section', { class: 'tsec', 'aria-labelledby': `sec-${item.no}` }, [
      el('div', { class: 'tsec__head' }, [
        el('div', { class: 'tsec__no', text: item.no }),
        el('h2', { class: 'tsec__title', id: `sec-${item.no}`, text: item.title }),
        item.sub ? el('p', { class: 'label', text: item.sub }) : null,
        item.note ? el('p', { class: 'tsec__note', text: item.note }) : null,
        topic.cardPreview ? cardPreview(item) : null,
      ]),
      el('div', { class: `tiles${wide ? ' tiles--wide' : ''}${withExamples ? ' tiles--ex' : ''}` }, item.list.map(tile)),
    ]);
  }

  function table(topic) {
    const translated = topic.items.some((item) => item.list.some((row) => row.src === 'ceo' || row.src === 'guidebook'));
    return el('div', { class: 'tbody' }, [
      ...topic.items.map((item) => tableSection(topic, item)),
      translated ? el('p', { class: 'label tbody__src', text: '한글 풀이 가운데 카드에 없는 것은 가이드북 또는 번역으로 채웠다' }) : null,
    ]);
  }

  /** 사례 카드의 특징마다 예시 그림이 있으면(시대별 파사드), 카드 판 아래에 사례별 타일로 모아 보인다. 없으면 아무것도 그리지 않는다. */
  function caseExamples(topic) {
    const withEx = topic.items.filter((item) => item.list.some((row) => row.ex));
    if (!withEx.length) return null;
    return el('div', { class: 'tbody' }, [
      el('div', { class: 'tbody__lead' }, [
        el('p', { class: 'label', text: 'Examples · 특징 예시' }),
        el('h2', { text: '특징을 그림으로 보기' }),
        el('p', { text: '같은 건물 틀에 시대와 특징만 바꿔 만들었다. 눌러서 크게 보고 프롬프트를 복사한다.' }),
      ]),
      ...withEx.map((item) => tableSection(topic, { ...item, note: '' })),
    ]);
  }

  // ── 색 팔레트 ──────────────────────────────────────────────
  const ROLE_KO = { Main: '주조색', Base: '바탕색', Point: '강조색' };

  function swatch(color) {
    return el('button', { class: 'swatch', type: 'button', title: `${color.hex} 복사`, onclick: () => copyText(color.hex, color.hex) }, [
      el('span', { class: 'swatch__chip', bg: color.hex }, el('i', { text: ROLE_KO[color.role] ? `${color.role} · ${ROLE_KO[color.role]}` : color.role })),
      el('b', { text: color.en || color.ko }),
      color.en && color.ko ? el('span', { text: color.ko }) : null,
      el('code', { text: color.hex }),
    ]);
  }

  function palette(topic) {
    const blocks = []; let group = '';
    topic.items.forEach((item) => {
      if (item.group && item.group !== group) blocks.push(el('p', { class: 'pgroup', text: item.group }));
      group = item.group;
      const all = item.list.map((c) => c.hex).join(', ');
      blocks.push(el('section', { class: 'prow', 'aria-labelledby': `arch-${item.no}` }, [
        el('div', { class: 'prow__who' }, [
          el('div', { class: 'tsec__no', text: item.no }),
          el('h2', { class: 'prow__name', id: `arch-${item.no}`, text: item.title }),
          item.sub ? el('p', { class: 'prow__theme', text: item.sub }) : null,
          el('p', { class: 'label', text: item.tags.join('  ') }),
        ]),
        el('div', { class: 'prow__colors' }, [
          el('div', { class: 'swatches' }, item.list.map(swatch)),
          el('p', { class: 'prow__note', text: item.note }),
          el('button', { class: 'btn prow__all', type: 'button', onclick: () => copyText(all, `색 ${item.list.length}개`) }, `색 ${item.list.length}개 복사  ${all}`),
        ]),
      ]));
    });
    return el('div', { class: 'tbody' }, blocks);
  }

  function body(topic) {
    if (topic.layout === 'table') return [table(topic)];
    if (topic.layout === 'palette') return [palette(topic)];
    return [plates(topic), topic.kind === 'prompt' ? keywordWall(topic) : null, topic.kind === 'case' ? caseExamples(topic) : null];
  }

  function render(data, topic) {
    const groupInfo = data.groups.find((g) => g.id === topic.group);
    return el('div', { class: 'sheet' }, [strip({ back: { href: '#/', text: '← 목록' }, tag: topic.code }), head(topic, groupInfo), ...body(topic)]);
  }

  window.JARC.views.topic = { render, hasStage };
})();
