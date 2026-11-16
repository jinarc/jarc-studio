// 내 그림 작업대 — 내 그림에 자료실의 프롬프트를 입힐 준비를 하고, 결과를 원본과 비교한다
// 그림은 이 컴퓨터 안에서만 쓰인다. 페이지는 그림을 어디로도 보내지 않는다. 생성은 AI 사이트에서 직접 한다.
// 붙여 넣을 문장은 workbench-prompt.js가 만든다.
(function () {
  'use strict';
  const { el, copyText, toast, strip, views, wbPrompt } = window.JARC;

  const KO_STALE = '한글 풀이 — 위 글을 직접 고친 부분은 풀이에 반영되지 않는다';
  const AI_SITES = [['Gemini 열기', 'https://gemini.google.com/app'], ['ChatGPT 열기', 'https://chatgpt.com/']];
  const LENGTHS = [{ id: false, name: '짧게', hint: '서너 줄' }, { id: true, name: '자세히', hint: '구조가 바뀌었을 때 — 잠금을 항목으로 풀어 쓴다' }];
  const FAIL_MS = 4000;
  // custom: 사용자가 글을 직접 고친 내용. 그림을 넣어 화면을 다시 그려도 지워지지 않게 둔다.
  const state = { original: null, result: null, task: 'render', detail: false, style: '', styleKo: '', styleFrom: '', custom: null };

  /** 그림 파일인가. 종류가 비어 오는 경우(일부 프로그램에서 끌어다 놓을 때)는 파일 이름의 끝으로 본다. */
  function isImage(file) {
    return Boolean(file) && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name || ''));
  }

  function setImage(slot, file, redraw) {
    if (!isImage(file)) { toast('그림 파일만 넣을 수 있습니다', FAIL_MS); return; }
    if (state[slot]) URL.revokeObjectURL(state[slot].url);
    state[slot] = { url: URL.createObjectURL(file), name: file.name || '붙여 넣은 그림' };
    redraw();
  }

  /** 그림 넣는 칸. 눌러 고르기 · 끌어다 놓기 · (화면 전체) 붙여넣기를 받는다. */
  function dropzone(slot, emptyText, redraw) {
    const input = el('input', { class: 'drop__input', type: 'file', accept: 'image/*', 'aria-label': emptyText });
    input.addEventListener('change', () => setImage(slot, input.files[0], redraw));
    const zone = el('label', { class: `drop${state[slot] ? ' has-image' : ''}` }, [
      input,
      state[slot]
        ? el('img', { src: state[slot].url, alt: slot === 'original' ? '내가 넣은 원본 그림' : 'AI가 만든 결과 그림' })
        : el('span', { class: 'drop__empty' }, [el('b', { text: emptyText }), el('small', { text: '눌러서 고르기 · 끌어다 놓기 · Ctrl+V' })]),
      state[slot] ? el('span', { class: 'drop__name', text: `${state[slot].name} — 눌러서 바꾸기` }) : null,
    ]);
    zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (event) => {
      event.preventDefault(); zone.classList.remove('is-over');
      setImage(slot, event.dataTransfer.files[0], redraw);
    });
    return zone;
  }

  async function copyImage(url) {
    try {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      const canvas = el('canvas', { width: bitmap.width, height: bitmap.height });
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast('원본 그림 복사됨 — AI 창에 Ctrl+V');
    } catch (error) {
      toast('그림을 복사하지 못했습니다 — 파일을 AI 창에 끌어다 놓으세요', FAIL_MS);
    }
  }

  function stepHead(no, title, hint) {
    return el('div', { class: 'slot__head' }, [el('span', { class: 'label', text: no }), el('h2', { text: title }), el('p', { text: hint })]);
  }

  /** 하나만 켜지는 단추 줄. choose(id)가 상태를 바꾼다. */
  function pickRow(kind, entries, current, choose) {
    return entries.map((entry) => {
      const button = el('button', { class: `pick ${kind}`, type: 'button', 'aria-pressed': String(entry.id === current) }, [el('b', { text: entry.name }), el('span', { text: entry.hint })]);
      button.addEventListener('click', () => {
        button.parentElement.querySelectorAll(`.${kind}`).forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        choose(entry.id);
      });
      return button;
    });
  }

  /** @param {object} data @param {() => void} onTask 작업이 바뀌면 부른다 (점검표가 달라진다) */
  function promptStep(data, onTask) {
    const area = el('textarea', { class: 'wb__prompt', rows: '5', lang: 'en', spellcheck: 'false', 'aria-label': '붙여 넣을 프롬프트' });
    const from = el('p', { class: 'label wb__from' });
    const koLabel = el('span', { class: 'label', text: '한글 풀이' });
    const koText = el('span', { class: 'wb__kotext' });
    const select = el('select', { class: 'wb__select' });
    const refresh = () => {
      const built = wbPrompt.build(state.task, state.style, state.styleKo, state.detail);
      state.custom = null;
      area.value = built.en; koText.textContent = built.ko; koLabel.textContent = '한글 풀이';
      from.textContent = state.styleFrom ? `고른 것 — ${state.styleFrom}` : '위에서 고르거나, 글의 따옴표 안에 직접 쓴다';
    };
    /** 작업에 맞는 목록으로 채운다: 스타일 · 빛 · 재질 */
    const fillSelect = () => {
      const lib = wbPrompt.task(state.task).lib;
      const pick = wbPrompt.LIBS[lib].pick;
      select.setAttribute('aria-label', pick);
      select.replaceChildren(
        el('option', { value: '', text: pick }),
        ...wbPrompt.options(data, lib).map((group) => el('optgroup', { label: group.group }, group.options.map((o) => el('option', { value: o.prompt, text: o.label, 'data-ko': o.ko || '' })))),
      );
      select.value = [...select.options].some((o) => o.value === state.style) ? state.style : '';
    };
    const chooseTask = (id) => {
      const before = wbPrompt.task(state.task).lib;
      state.task = id;
      if (wbPrompt.task(id).lib !== before) { state.style = ''; state.styleKo = ''; state.styleFrom = ''; }   // 목록이 달라지면 고른 것을 비운다
      fillSelect(); refresh(); onTask();
    };
    area.addEventListener('input', () => { state.custom = area.value; koLabel.textContent = KO_STALE; });
    select.addEventListener('change', () => {
      if (!select.value) return;
      const chosen = select.selectedOptions[0];
      state.style = select.value; state.styleKo = chosen.dataset.ko || ''; state.styleFrom = chosen.textContent; refresh();
    });
    const kept = state.custom;
    fillSelect(); refresh();
    if (kept !== null) { area.value = kept; state.custom = kept; koLabel.textContent = KO_STALE; }
    return el('section', { class: 'slot', 'aria-label': '프롬프트 만들기' }, [
      stepHead('02', '프롬프트', '바꿀 곳만 고른다 — 나머지는 잠그는 문장이 된다'),
      el('div', { class: 'slot__body' }, [
        el('p', { class: 'label', text: '무엇을 바꿀까' }),
        el('div', { class: 'chips' }, pickRow('wb__mode', wbPrompt.TASKS, state.task, chooseTask)),
        el('div', { class: 'wb__sources' }, [el('span', { class: 'label', text: '무엇으로' }), select]),
        from, area,
        el('p', { class: 'wb__ko', lang: 'ko' }, [koLabel, koText]),
        el('div', { class: 'chips wb__len' }, [el('span', { class: 'label', text: '문장 길이' }), ...pickRow('wb__lenpick', LENGTHS, state.detail, (id) => { state.detail = id; refresh(); })]),
        el('div', { class: 'wb__actions' }, [
          el('button', { class: 'btn btn--accent', type: 'button', onclick: () => copyText(area.value, '프롬프트') }, '프롬프트 복사'),
          el('button', { class: 'btn', type: 'button', onclick: () => (state.original ? copyImage(state.original.url) : toast('먼저 원본 그림을 넣어 주세요', FAIL_MS)) }, '원본 그림 복사'),
          ...AI_SITES.map(([name, href]) => el('a', { class: 'btn', href, target: '_blank', rel: 'noopener noreferrer' }, `${name} ↗`)),
        ]),
        el('p', { class: 'wb__hint', text: 'AI 창에 원본 그림과 프롬프트를 붙여 넣어 생성한 뒤, 결과 그림을 저장하거나 복사해 아래 03에 넣는다.' }),
      ]),
    ]);
  }

  function render(data) {
    const body = el('div', { class: 'asm__slots' });
    let compare = null;
    const redrawCompare = () => { const next = views.compare.render(state, wbPrompt.checks(state.task)); compare.replaceWith(next); compare = next; };
    const redraw = () => {
      compare = views.compare.render(state, wbPrompt.checks(state.task));
      body.replaceChildren(
        el('section', { class: 'slot', 'aria-label': '원본 그림' }, [
          stepHead('01', '원본 그림', '내 SketchUp 화면 · 스케치 · 렌더'),
          el('div', { class: 'slot__body' }, dropzone('original', '원본 그림 넣기', redraw)),
        ]),
        promptStep(data, redrawCompare),
        el('section', { class: 'slot', 'aria-label': '결과 그림' }, [
          stepHead('03', '결과 그림', 'AI가 만든 그림을 가져온다'),
          el('div', { class: 'slot__body' }, dropzone('result', '결과 그림 넣기', redraw)),
        ]),
        compare,
      );
    };
    const onPaste = (event) => {                                // 붙여 넣은 그림은 빈 칸부터 채운다
      const file = [...(event.clipboardData ? event.clipboardData.files : [])].find(isImage);
      if (!file) return;
      event.preventDefault();
      setImage(state.original ? 'result' : 'original', file, redraw);
    };
    redraw();
    const node = el('div', { class: 'sheet' }, [
      strip({ back: { href: '#/', text: '← 목록' }, tag: 'WORKBENCH · 작업대' }),
      el('section', { class: 'thead thead--plain' }, el('div', {}, [
        el('p', { class: 'label', text: 'Workbench · 작업대' }),
        el('h1', { class: 'thead__title', text: '내 그림 작업대' }),
        el('p', { class: 'thead__intro', text: '내 그림에서 바꿀 곳만 골라 — 분위기 전체, 빛만, 바닥 · 벽 · 천장 하나만 — 자료실의 프롬프트를 입혀 보고, 결과가 내 설계를 지켰는지 원본과 비교한다. 그림은 이 컴퓨터 안에서만 쓰이며 페이지가 어디로도 보내지 않는다.' }),
      ])),
      body,
    ]);
    return { node, listeners: [['paste', onPaste]] };
  }

  window.JARC.views.workbench = { render };
})();
