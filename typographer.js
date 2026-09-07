/* Keep prepositions and short conjunctions with the word that follows them. */
(() => {
  'use strict';

  const serviceWords = [
    // Russian prepositions and short conjunctions.
    'а', 'без', 'безо', 'благодаря', 'близ', 'в', 'вблизи', 'ввиду', 'вдоль',
    'взамен', 'включая', 'вместо', 'вне', 'внутри', 'во', 'возле', 'вокруг',
    'вопреки', 'вслед', 'вследствие', 'для', 'до', 'за', 'и', 'из', 'из-за',
    'из-под', 'изо', 'или', 'к', 'ко', 'кроме', 'либо', 'меж', 'между', 'мимо',
    'на', 'над', 'надо', 'напротив', 'насчёт', 'навстречу', 'не', 'несмотря',
    'но', 'о', 'об', 'обо', 'около', 'от', 'ото', 'перед', 'передо', 'по', 'под',
    'подо', 'помимо', 'после', 'посредством', 'при', 'про', 'против', 'путём',
    'ради', 'с', 'сквозь', 'согласно', 'со', 'среди', 'у', 'через', 'чрез',

    // English prepositions, articles and short conjunctions.
    'a', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'an',
    'and', 'around', 'at', 'before', 'behind', 'below', 'beneath', 'beside',
    'between', 'beyond', 'but', 'by', 'despite', 'down', 'during', 'except', 'for',
    'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on', 'onto', 'opposite',
    'or', 'outside', 'over', 'past', 'per', 'since', 'the', 'through',
    'throughout', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike',
    'until', 'up', 'upon', 'via', 'with', 'within', 'without'
  ].sort((a, b) => b.length - a.length);

  const escapedWords = serviceWords.map((word) =>
    word.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  );
  const breakableSpace = '[\\t\\n\\f\\r ]+';
  const wordBoundary = '(^|[\\s\\u00a0([{\u00ab\u201e\u201c\u0022\u0027\u2014\u2013-])';
  const serviceWordPattern = new RegExp(
    wordBoundary + '(' + escapedWords.join('|') + ')' + breakableSpace,
    'giu'
  );
  const headingSelector = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    '[class$="__title"]', '[class*="__title "]',
    '[class$="-title"]', '[class*="-title "]'
  ].join(',');
  const trailingPairPattern =
    /([^\s\u00a0]+)[\t\n\f\r ]+([^\s\u00a0]+)([\t\n\f\r \u00a0]*)$/u;
  /* The same last pair once it has been bound, so a later pass can take it
     apart again and weigh it afresh. A pair the service-word rule made is
     left alone: keeping a preposition off the end of a line is not a
     judgement call, it stays whatever the measurements say. */
  const boundPairPattern =
    /([^\s\u00a0]+)\u00a0([^\s\u00a0]+)([\t\n\f\r \u00a0]*)$/u;
  const serviceWordSet = new Set(serviceWords);
  const excludedAncestor = [
    'script', 'style', 'noscript', 'template', 'textarea', 'pre', 'code',
    '[contenteditable]:not([contenteditable="false"])'
  ].join(',');

  const internallyEditedNodes = new WeakSet();
  const typographedTextNodes = new Set();

  const writeTextNode = (textNode, value) => {
    if (value === textNode.nodeValue) return;
    internallyEditedNodes.add(textNode);
    typographedTextNodes.add(textNode);
    textNode.nodeValue = value;
    queueMicrotask(() => internallyEditedNodes.delete(textNode));
  };

  /* A non-breaking pair is useful only while it fits its text container.
     When a narrow viewport overflows, release the single NBSP that reduces
     the overflow the most, then re-check. This keeps short pairs intact and
     avoids long service-word chains such as "from understanding" running
     past the mobile edge. */
  const relaxOverflowingSpaces = (textNode) => {
    const parent = textNode.parentElement;
    const container = parent && (parent.closest(headingSelector) || parent);
    if (!container || !container.clientWidth) return;

    let typed = textNode.nodeValue;
    while (container.scrollWidth > container.clientWidth + 1) {
      const positions = [];
      for (let i = 0; i < typed.length; i += 1) {
        if (typed.charCodeAt(i) === 160) positions.push(i);
      }
      if (!positions.length) break;

      let bestValue = typed;
      let bestWidth = container.scrollWidth;
      positions.forEach((position) => {
        const candidate =
          typed.slice(0, position) + ' ' + typed.slice(position + 1);
        writeTextNode(textNode, candidate);
        const candidateWidth = container.scrollWidth;
        if (candidateWidth < bestWidth) {
          bestValue = candidate;
          bestWidth = candidateWidth;
        }
      });

      writeTextNode(textNode, bestValue);
      if (bestValue === typed) break;
      typed = bestValue;
    }
  };

  const setNonBreakingSpaces = (textNode) => {
    const parent = textNode.parentElement;
    if (!parent || parent.closest(excludedAncestor)) return;

    let typed = textNode.nodeValue;
    let previous;
    do {
      previous = typed;
      typed = typed.replace(serviceWordPattern, '$1$2\u00a0');
    } while (typed !== previous);

    if (typed !== textNode.nodeValue) {
      writeTextNode(textNode, typed);
      relaxOverflowingSpaces(textNode);
    }
  };

  /* The width of the shortest line a heading currently wraps onto. Returns 0
     for a heading that fits on one line, where there is nothing to weigh. */
  const narrowestLineWidth = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);

    const lines = new Map();
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      if (rect.width <= 0) continue;
      const top = Math.round(rect.top);
      lines.set(top, Math.max(lines.get(top) || 0, rect.width));
    }
    if (lines.size < 2) return 0;
    return Math.min.apply(null, Array.from(lines.values()));
  };

  /* A balanced heading can still leave its final word alone when a narrow
     card or an older browser limits the CSS wrapping algorithm. Keep the
     last two words together as a small, predictable fallback.

     The fallback is not free: binding the last pair makes it one wide unit,
     which can push a short group ahead of it onto a line of its own. On the
     Russian homepage "Собираю системы, а не отдельные экраны" that turned a
     lone final word into a far worse orphan, the two-letter "а не" stranded
     mid-heading. So measure both ways and keep the pair only when it does not
     leave a line narrower than the one it was there to prevent. */
  const protectHeadingEnding = (heading) => {
    if (!heading || heading.closest(excludedAncestor)) return;

    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let textNode;
    let lastTextNode = null;
    while ((textNode = walker.nextNode())) {
      if (textNode.nodeValue.trim()) lastTextNode = textNode;
    }
    if (!lastTextNode) return;

    /* An earlier pass may already have bound this pair — against the
       fallback font, or at a width the window has since left. Undo our own
       binding first so the decision below is made on what is true now. */
    const bound = lastTextNode.nodeValue.match(boundPairPattern);
    if (bound && !serviceWordSet.has(bound[1].toLowerCase())) {
      writeTextNode(
        lastTextNode,
        lastTextNode.nodeValue.replace(boundPairPattern, '$1 $2$3')
      );
    }

    const released = lastTextNode.nodeValue;
    const typed = released.replace(trailingPairPattern, '$1\u00a0$2$3');
    if (typed === released) return;

    const narrowestReleased = narrowestLineWidth(heading);

    writeTextNode(lastTextNode, typed);
    relaxOverflowingSpaces(lastTextNode);

    const narrowestBound = narrowestLineWidth(heading);
    if (narrowestReleased && narrowestBound && narrowestBound < narrowestReleased) {
      writeTextNode(lastTextNode, released);
      relaxOverflowingSpaces(lastTextNode);
    }
  };

  const protectHeadingEndings = (root) => {
    const element = root.nodeType === Node.ELEMENT_NODE
      ? root
      : root.parentElement;
    if (!element || element.matches(excludedAncestor)) return;

    const headings = new Set();
    if (element.matches(headingSelector)) headings.add(element);
    element.querySelectorAll(headingSelector).forEach((heading) => headings.add(heading));

    const parentHeading = element.closest(headingSelector);
    if (parentHeading) headings.add(parentHeading);
    headings.forEach(protectHeadingEnding);
  };

  const processSubtree = (root) => {
    if (root.nodeType === Node.TEXT_NODE) {
      setNonBreakingSpaces(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches(excludedAncestor)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) setNonBreakingSpaces(textNode);
  };

  processSubtree(document.body);
  protectHeadingEndings(document.body);

  // Keep the same typography for greetings, dialogs and other injected copy.
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        if (internallyEditedNodes.has(mutation.target)) return;
        setNonBreakingSpaces(mutation.target);
        protectHeadingEndings(mutation.target);
      } else {
        mutation.addedNodes.forEach((node) => {
          processSubtree(node);
          protectHeadingEndings(node);
        });
      }
    });
  }).observe(document.body, { childList: true, characterData: true, subtree: true });

  /* Re-weigh every stored pair against the space actually available now. */
  const reflowTypography = () => {
    typographedTextNodes.forEach((textNode) => {
      if (!textNode.isConnected) {
        typographedTextNodes.delete(textNode);
        return;
      }
      setNonBreakingSpaces(textNode);
      relaxOverflowingSpaces(textNode);
    });
    protectHeadingEndings(document.body);
  };

  /* The first pass runs on a deferred script, which is usually earlier than
     the display webfont finishes loading — so it measures the fallback face.
     Its metrics differ enough to change where a heading wraps, and every
     decision above is made from measured widths. Re-run once the real face is
     in, or a heading keeps the break that suited Georgia. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(reflowTypography).catch(() => {});
  }

  /* Re-evaluate the stored pairs when the available width changes. A pair
     released on a phone can be restored on desktop, and a desktop pair is
     relaxed before it can overflow after rotation or window resizing. */
  let resizeFrame = null;
  window.addEventListener('resize', () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      reflowTypography();
    });
  }, { passive: true });
})();
