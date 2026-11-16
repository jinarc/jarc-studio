// 공통 도구 — DOM 만들기 · 복사 · 알림
(function () {
  'use strict';

  const TOAST_MS = 1600;
  const TOAST_FAIL_MS = 4000;
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  let toastTimer = null;

  /**
   * 요소를 만든다. 글은 textContent로만 넣는다 (HTML 문자열을 끼워 넣지 않는다).
   * 특별한 열쇠: class · text · on<이벤트> · bg(#RRGGBB 바탕색)
   */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'bg') { if (HEX.test(value)) node.style.backgroundColor = value; }
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    [].concat(children || []).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function toast(message, ms) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-on'), ms || TOAST_MS);
  }

  /** 옛 방식 복사. 초점을 잠깐 빌렸다가 돌려준다. */
  function legacyCopy(text) {
    const before = document.activeElement;
    const area = el('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-999px;top:0;opacity:0' });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
    area.remove();
    if (before && typeof before.focus === 'function') before.focus({ preventScroll: true });
    return ok;
  }

  /** 글을 복사하고 결과를 알린다. 실패하면 실패했다고 말한다. */
  async function copyText(text, what) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (error) {
      ok = legacyCopy(text);
    }
    if (ok) toast(`${what} 복사됨`);
    else toast('복사하지 못했습니다 — 글을 직접 골라 복사하세요', TOAST_FAIL_MS);
    return ok;
  }

  /** 글 안에서 낱말(구)이 통째로 나오는 자리를 <mark>로 감싼 조각 목록을 돌려준다. */
  function highlight(text, terms) {
    const escaped = terms.filter((t) => t && t.trim())
      .sort((a, b) => b.length - a.length)                      // 긴 구부터 — 겹치는 낱말 대비
      .map((t) => t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!escaped.length) return [document.createTextNode(text)];
    const pattern = new RegExp(`(?<![A-Za-z])(?:${escaped.join('|')})(?![A-Za-z])`, 'gi');
    const nodes = []; let last = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) nodes.push(document.createTextNode(text.slice(last, match.index)));
      nodes.push(el('mark', { text: match[0] }));
      last = match.index + match[0].length;
    }
    if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
    return nodes;
  }

  window.JARC = { el, toast, copyText, highlight, views: {} };
})();
