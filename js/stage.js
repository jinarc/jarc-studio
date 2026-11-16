// 발표 화면 — 카드 한 장 + 프롬프트 + 키워드. ← → 이동 · C 복사 · F 그림만 · Esc 닫기
(function () {
  'use strict';
  const { el, copyText, highlight } = window.JARC;

  let solo = false;   // 그림만 보기 상태는 카드를 넘겨도 이어진다

  function bar(topic, onSolo) {
    return el('header', { class: 'stage__bar' }, [
      el('div', { class: 'stage__where' }, [el('b', { text: topic.code }), el('span', { text: topic.title }), el('span', { class: 'label', text: topic.series })]),
      el('div', { class: 'stage__tools' }, [
        el('button', { class: 'tool', type: 'button', 'aria-pressed': String(solo), onclick: onSolo }, ['그림만', el('kbd', { text: 'F' })]),
        el('a', { class: 'tool tool--close', href: `#/t/${topic.slug}` }, ['닫기', el('kbd', { text: 'Esc' })]),
      ]),
    ]);
  }

  function promptBlock(item) {
    return el('section', { class: 'pblock', 'aria-label': '프롬프트' }, [
      el('div', { class: 'pblock__head' }, [
        el('span', { class: 'label', text: 'Prompt · 프롬프트' }),
        el('button', { class: 'copy', type: 'button', onclick: () => copyText(item.prompt, '프롬프트') }, '복사  C'),
      ]),
      el('p', { class: 'pblock__text', lang: 'en' }, highlight(item.prompt, item.list.map((k) => k.en))),
      item.promptKo ? el('p', { class: 'pblock__ko', lang: 'ko' }, [el('span', { class: 'label', text: '한글 풀이' }), item.promptKo]) : null,
      item.promptNote ? el('p', { class: 'pblock__warn', text: item.promptNote }) : null,
    ]);
  }

  function listRow(row, index) {
    const main = row.en || row.ko;
    const copyValue = row.hex || main;
    return el('li', {}, el('button', { class: 'kw', type: 'button', onclick: () => copyText(copyValue, copyValue) }, [
      row.hex ? el('i', { class: 'kw__chip', bg: row.hex }) : el('i', { text: String(index + 1) }),
      el('b', { text: main }),
      el('span', { text: [row.en ? row.ko : '', row.hex].filter(Boolean).join('  ') }),
      el('small', { text: '복사' }),
    ]));
  }

  function panel(topic, item) {
    const total = String(topic.items.length).padStart(2, '0');
    return el('div', { class: 'stage__panel' }, [
      el('p', { class: 'stage__count' }, [el('b', { text: item.no }), `/ ${total}`]),
      el('h1', { class: 'stage__title', text: item.title }),
      item.sub ? el('p', { class: 'stage__sub', text: item.sub }) : null,
      item.prompt ? promptBlock(item) : null,
      item.list.length ? el('ul', { class: 'kwlist', 'aria-label': '핵심 키워드' }, item.list.map(listRow)) : null,
      item.note ? el('p', { class: 'note' }, [el('span', { class: 'label', text: item.prompt ? '참고' : '요점' }), item.note]) : null,
      item.text.length ? el('ul', { class: 'lines' }, item.text.map((line) => el('li', { text: line }))) : null,
    ]);
  }

  /** 발표 화면 안에서 카드를 바꾼다. 방문 기록을 쌓지 않아 '뒤로'가 목록으로 간다. */
  function jump(href) {
    window.location.replace(href);
  }

  function cardLink(href, attrs, children) {
    return el('a', { href, onclick: (event) => { event.preventDefault(); jump(href); }, ...attrs }, children);
  }

  function foot(topic, index) {
    const last = topic.items.length;
    const link = (n) => `#/p/${topic.slug}/${((n - 1 + last) % last) + 1}`;
    return el('footer', { class: 'stage__foot' }, [
      cardLink(link(index), { class: 'nav', 'aria-label': '이전 카드' }, '←'),
      el('div', { class: 'film' }, topic.items.map((it, i) => cardLink(`#/p/${topic.slug}/${i + 1}`, {
        'aria-label': `${it.no} ${it.title}`, 'aria-current': i === index ? 'true' : null,
      }, el('img', { src: it.thumb, alt: '' })))),
      cardLink(link(index + 2), { class: 'nav', 'aria-label': '다음 카드' }, '→'),
    ]);
  }

  /** 화면을 그리고, 키보드 처리기를 돌려준다 (app.js가 붙이고 뗀다). */
  function render(data, topic, index) {
    const item = topic.items[index];
    const last = topic.items.length;
    const go = (n) => jump(`#/p/${topic.slug}/${((n + last) % last) + 1}`);
    const root = el('div', { class: `stage${solo ? ' is-solo' : ''}` });
    const toggleSolo = () => {
      solo = !solo;
      root.classList.toggle('is-solo', solo);
      root.querySelector('.tool').setAttribute('aria-pressed', String(solo));
    };
    root.append(
      bar(topic, toggleSolo),
      el('div', { class: 'stage__body' }, [
        el('figure', { class: 'stage__card' }, el('img', { src: item.img, alt: item.alt, width: 890, height: 1128 })),
        panel(topic, item),
      ]),
      foot(topic, index),
    );
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key;
      const onControl = event.target instanceof Element && event.target.closest('button, a, input, textarea');
      if (key === ' ' && onControl) return;                 // 단추 위의 Space는 그 단추를 누른다
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ') { event.preventDefault(); go(index + 1); }
      else if (key === 'ArrowLeft' || key === 'PageUp') { event.preventDefault(); go(index - 1); }
      else if (key === 'Escape') window.location.hash = `#/t/${topic.slug}`;
      else if (event.code === 'KeyC' && item.prompt) copyText(item.prompt, '프롬프트');      // 한글 입력 상태에서도 자판 자리로 알아본다
      else if (event.code === 'KeyF') toggleSolo();
    };
    return { node: root, onKey };
  }

  window.JARC.views.stage = { render };
})();
