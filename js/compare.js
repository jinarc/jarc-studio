// 전후 비교 — 원본과 결과를 나란히 · 겹쳐서 보고, 점검표로 판정하고, 체크하지 못한 항목으로 고치는 말을 만든다
(function () {
  'use strict';
  const { el, copyText } = window.JARC;

  let layout = 'side';      // 'side' 나란히 · 'wipe' 겹쳐서 밀어 보기

  function sideView(state) {
    return el('div', { class: 'cmp__side' }, [
      el('figure', {}, [el('img', { src: state.original.url, alt: '원본 그림' }), el('figcaption', { class: 'label', text: '원본 — 내 설계' })]),
      el('figure', {}, [el('img', { src: state.result.url, alt: '결과 그림' }), el('figcaption', { class: 'label', text: '결과 — AI가 그린 것' })]),
    ]);
  }

  /** 두 그림을 같은 틀에 겹치고, 막대를 밀어 왼쪽은 원본 · 오른쪽은 결과를 본다. */
  function wipeView(state) {
    const top = el('img', { class: 'cmp__top', src: state.original.url, alt: '원본 그림' });
    const line = el('span', { class: 'cmp__line', 'aria-hidden': 'true' });
    const range = el('input', { class: 'cmp__range', type: 'range', min: '0', max: '100', value: '50', 'aria-label': '원본과 결과의 경계 옮기기' });
    const move = () => {
      top.style.clipPath = `inset(0 ${100 - Number(range.value)}% 0 0)`;
      line.style.left = `${range.value}%`;
    };
    range.addEventListener('input', move);
    move();
    return el('div', { class: 'cmp__wipe' }, [
      el('div', { class: 'cmp__frame' }, [el('img', { src: state.result.url, alt: '결과 그림' }), top, line]),
      el('div', { class: 'cmp__ends' }, [el('span', { class: 'label', text: '← 원본' }), range, el('span', { class: 'label', text: '결과 →' })]),
    ]);
  }

  /**
   * 점검표. 원본과 같은 항목에 체크한다. 체크가 바뀔 때마다 남은(체크하지 않은) 항목을 onChange로 넘긴다.
   * @param {{text: string, fix: string, fixKo: string}[]} checks
   * @param {(open: object[]) => void} onChange
   */
  function checklist(checks, onChange) {
    const verdict = el('p', { class: 'cmp__verdict', 'aria-live': 'polite' });
    const boxes = checks.map(() => el('input', { type: 'checkbox' }));
    const update = () => {
      const open = checks.filter((check, index) => !boxes[index].checked);
      const ok = open.length === 0;
      verdict.textContent = ok ? '모두 확인했다 — 발표에 쓴다' : `${boxes.length}개 중 ${boxes.length - open.length}개 확인 — 남은 ${open.length}개가 '고치는 말'이 된다`;
      verdict.classList.toggle('is-pass', ok);
      onChange(open);
    };
    boxes.forEach((box) => box.addEventListener('change', update));
    const node = el('div', { class: 'cmp__check' }, [
      el('p', { class: 'label', text: '원본과 같으면 체크한다 — 눈으로 세어 확인' }),
      ...checks.map((check, index) => el('label', { class: 'cmp__item' }, [boxes[index], el('span', { text: check.text })])),
      verdict,
    ]);
    return { node, update };
  }

  const FIX_HEAD = 'Fix the last image, using the attached original image as the reference.';
  const FIX_HEAD_KO = '방금 만든 그림을 고친다. 첨부한 원본 그림을 기준으로 삼는다.';
  const FIX_TAIL = 'Keep everything else in the last image as it is.';
  const FIX_TAIL_KO = '그 밖에는 방금 만든 그림 그대로 둔다.';

  /** 고치는 말. 체크하지 못한 항목마다 되돌리는 문장이 붙고, 직접 쓴 말이 있으면 그 뒤에 더한다. */
  function fixPanel() {
    let open = [];
    const status = el('p', { class: 'label', 'aria-live': 'polite' });
    const text = el('p', { class: 'cmp__fixtext', lang: 'en' });
    const ko = el('p', { class: 'cmp__fixko', lang: 'ko' });
    const input = el('input', { class: 'asm__subject', type: 'text', placeholder: 'The table must be round. Remove the wall screen.', 'aria-label': '더 짚을 곳 (영어로)' });
    const button = el('button', { class: 'btn btn--accent', type: 'button', onclick: () => copyText(text.textContent, '고치는 말') }, '고치는 말 복사');
    const extra = () => { const typed = input.value.trim(); return typed ? typed.replace(/[.\s]*$/, '.') : ''; };
    const draw = () => {
      const more = extra();
      const nothing = open.length === 0 && !more;
      if (nothing) status.textContent = '모두 체크했다 — 고칠 것이 없다';
      else if (open.length === 0) status.textContent = '직접 쓴 곳만 고치는 말';
      else status.textContent = `체크하지 않은 ${open.length}개를 되돌리는 말 — 체크하면 그 문장이 빠진다`;
      text.textContent = nothing ? '' : [FIX_HEAD, ...open.map((check) => check.fix), more, FIX_TAIL].filter(Boolean).join(' ');
      ko.textContent = nothing ? '' : [FIX_HEAD_KO, ...open.map((check) => check.fixKo), more ? `(직접 쓴 말) ${more}` : '', FIX_TAIL_KO].filter(Boolean).join(' ');
      text.hidden = nothing; ko.hidden = nothing; button.disabled = nothing;
    };
    input.addEventListener('input', draw);
    const node = el('div', { class: 'cmp__fix' }, [
      status, text, ko,
      el('p', { class: 'label', text: '더 짚을 곳이 있으면 영어로 쓴다 (없으면 비워 둔다)' }),
      el('p', { class: 'wb__hint', text: '예: The table must be round. Remove the wall screen. — 테이블은 둥글어야 한다. 벽의 스크린을 없앤다.' }),
      input, button,
      el('p', { class: 'wb__hint', text: 'AI 창에 원본 그림을 다시 붙여 넣고, 이 말과 함께 보낸다.' }),
    ]);
    return { node, setOpen: (list) => { open = list; draw(); } };
  }

  /**
   * @param {{ original: ?{url: string}, result: ?{url: string} }} state
   * @param {{text: string, fix: string, fixKo: string}[]} checks
   */
  function render(state, checks) {
    const head = el('div', { class: 'slot__head' }, [el('span', { class: 'label', text: '04' }), el('h2', { text: '비교' }), el('p', { text: 'AI가 바꾼 곳을 찾는다' })]);
    if (!state.original || !state.result) {
      return el('section', { class: 'slot', 'aria-label': '전후 비교' }, [head,
        el('div', { class: 'slot__body' }, el('p', { class: 'cmp__wait', text: '원본과 결과 그림을 모두 넣으면 여기에 비교 화면이 뜬다.' }))]);
    }
    const stage = el('div', { class: 'cmp__stage' });
    const draw = () => stage.replaceChildren(layout === 'wipe' ? wipeView(state) : sideView(state));
    const tab = (id, name) => {
      const button = el('button', { class: 'pick', type: 'button', 'aria-pressed': String(layout === id) }, el('b', { text: name }));
      button.addEventListener('click', () => {
        layout = id;
        button.parentElement.querySelectorAll('.pick').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        draw();
      });
      return button;
    };
    draw();
    const fix = fixPanel();
    const list = checklist(checks, fix.setOpen);
    list.update();
    return el('section', { class: 'slot slot--cmp', 'aria-label': '전후 비교' }, [head,
      el('div', { class: 'slot__body' }, [
        el('div', { class: 'chips' }, [tab('side', '나란히'), tab('wipe', '겹쳐서 밀어 보기')]),
        stage,
        el('div', { class: 'cmp__judge' }, [list.node, fix.node]),
      ])]);
  }

  window.JARC.views.compare = { render };
})();
