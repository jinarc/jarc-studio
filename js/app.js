// 길잡이 — 주소에 맞는 화면을 그린다
//   #/                 홈
//   #/t/<꼭지>          꼭지
//   #/p/<꼭지>/<번호>   발표 화면
//   #/s/<찾을 말>       찾기
//   #/a                프롬프트 조립기
//   #/w                내 그림 작업대
(function () {
  'use strict';
  const { el, views, strip } = window.JARC;
  const data = window.JARC_DATA;
  const view = document.getElementById('view');
  const SITE = 'ai_JARC 프롬프트 스튜디오';
  let activeListeners = [];      // 지금 화면이 document에 붙인 처리기 [[이벤트, 함수]] — 화면이 바뀌면 뗀다
  let lastName = '';

  function notFound(message) {
    return el('div', { class: 'sheet' }, [
      strip({ back: { href: '#/', text: '← 목록' } }),
      el('section', { class: 'thead thead--plain' }, el('div', {}, [
        el('h1', { class: 'thead__title', text: '화면을 찾지 못했습니다' }),
        el('p', { class: 'thead__intro', text: message }),
      ])),
    ]);
  }

  function decode(text) {
    try { return decodeURIComponent(text); } catch (error) { return text; }
  }

  /** 주소를 읽어 { name, … } 로 푼다. */
  function parse(hash) {
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'a') return { name: 'assembler' };
    if (parts[0] === 'w') return { name: 'workbench' };
    if (parts[0] === 's') {
      const query = decode(parts.slice(1).join('/')).trim();
      return query ? { name: 'search', query } : { name: 'missing', message: '찾을 말을 넣어 주세요.' };
    }
    if (parts[0] !== 't' && parts[0] !== 'p') return { name: 'missing', message: '주소를 알아볼 수 없습니다.' };
    const slug = decode(parts[1] || '');
    if (!Object.hasOwn(data.topics, slug)) return { name: 'missing', message: '없는 꼭지입니다. 목록에서 다시 골라 주세요.' };
    const topic = data.topics[slug];
    if (parts[0] === 't') return { name: 'topic', topic };
    if (!views.topic.hasStage(topic)) return { name: 'missing', message: '이 꼭지에는 발표 화면이 없습니다. 주소를 다시 확인해 주세요.' };
    const number = parts[2] || '1';
    const index = /^\d+$/.test(number) ? Number(number) - 1 : -1;
    if (index >= 0 && index < topic.items.length) return { name: 'stage', topic, index };
    return { name: 'missing', message: '없는 카드 번호입니다.' };
  }

  /** 화면 이름 → { node, title, listeners } */
  function draw(target) {
    if (target.name === 'home') return { node: views.home.render(data), title: SITE };
    if (target.name === 'topic') return { node: views.topic.render(data, target.topic), title: `${target.topic.title} — ${SITE}` };
    if (target.name === 'search') return { node: views.search.render(data, target.query), title: `찾기: ${target.query} — ${SITE}` };
    if (target.name === 'assembler') return { node: views.assembler.render(data), title: `프롬프트 조립기 — ${SITE}` };
    if (target.name === 'workbench') return { ...views.workbench.render(data), title: `내 그림 작업대 — ${SITE}` };
    if (target.name === 'stage') {
      const stage = views.stage.render(data, target.topic, target.index);
      return { node: stage.node, listeners: [['keydown', stage.onKey]], title: `${target.topic.items[target.index].title} — ${target.topic.title}` };
    }
    return { node: notFound(target.message), title: SITE };
  }

  function route() {
    if (window.location.hash && !window.location.hash.startsWith('#/')) return;     // 페이지 안 닻(#view 등)은 화면을 바꾸지 않는다
    const target = parse(window.location.hash);
    activeListeners.forEach(([type, handler]) => document.removeEventListener(type, handler));
    activeListeners = [];
    let screen;
    try {
      screen = draw(target);
    } catch (error) {
      screen = { node: notFound('화면을 그리다 문제가 생겼습니다. 목록으로 돌아가 다시 열어 주세요.'), title: SITE };
      target.name = 'missing';
    }
    document.body.classList.toggle('is-stage', target.name === 'stage');
    document.body.dataset.view = target.name;              // 맨 위로 버튼을 화면에 따라 숨긴다 (base.css)
    activeListeners = screen.listeners || [];
    activeListeners.forEach(([type, handler]) => document.addEventListener(type, handler));
    document.title = screen.title;
    view.replaceChildren(screen.node);
    view.focus({ preventScroll: true });                    // 화면이 바뀌면 초점도 새 화면으로
    if (!(target.name === 'stage' && lastName === 'stage')) window.scrollTo(0, 0);
    lastName = target.name;
  }

  if (!data || !data.topics) {
    view.replaceChildren(el('p', { style: 'padding:2rem', text: '데이터 파일(js/data.js)을 읽지 못했습니다. site 폴더가 통째로 있는지 확인해 주세요.' }));
    return;
  }
  document.querySelector('.skip').addEventListener('click', (event) => {
    event.preventDefault();
    view.focus();
  });
  /** 맨 위로 버튼 — 한 화면 높이쯤 내려가면 보이고, 누르면 꼭대기로 올라가 초점을 본문에 돌려준다. */
  function setupToTop() {
    const button = document.getElementById('totop');
    if (!button) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let ticking = false;
    const update = () => { ticking = false; button.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.8); };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: still.matches ? 'auto' : 'smooth' });
      view.focus({ preventScroll: true });
    });
    update();
  }

  window.addEventListener('hashchange', route);
  setupToTop();
  route();
})();
