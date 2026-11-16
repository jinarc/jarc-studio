// 크게 보기 — 그림 한 장을 화면 가득 띄운다 (원본 카드 · 키워드 예시 그림)
(function () {
  'use strict';
  const { el, copyText } = window.JARC;

  /**
   * @param {{ src: string, alt?: string, label?: string, title: string, sub?: string, prompt?: string, promptKo?: string, promptLabel?: string }} view
   */
  function open(view) {
    const dialog = el('dialog', { class: 'lbox', 'aria-label': view.title });
    const close = () => dialog.close();
    dialog.append(
      el('figure', { class: 'lbox__fig' }, el('img', { src: view.src, alt: view.alt || view.title })),
      el('div', { class: 'lbox__side' }, [
        view.label ? el('p', { class: 'label', text: view.label }) : null,
        el('h2', { class: 'lbox__title', text: view.title }),
        view.sub ? el('p', { class: 'lbox__sub', text: view.sub }) : null,
        view.prompt ? el('section', { class: 'pblock' }, [
          el('div', { class: 'pblock__head' }, [
            el('span', { class: 'label', text: view.promptLabel || '프롬프트' }),
            el('button', { class: 'copy', type: 'button', onclick: () => copyText(view.prompt, '프롬프트') }, '복사'),
          ]),
          el('p', { class: 'pblock__text', lang: 'en', text: view.prompt }),
          view.promptKo ? el('p', { class: 'pblock__ko', lang: 'ko' }, [el('span', { class: 'label', text: '한글 풀이' }), view.promptKo]) : null,
        ]) : null,
        el('button', { class: 'tool lbox__close', type: 'button', onclick: close }, ['닫기', el('kbd', { text: 'Esc' })]),
      ]),
    );
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });   // 바깥(어두운 곳)을 누르면 닫힌다
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  }

  window.JARC.lightbox = { open };
})();
