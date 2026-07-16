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
  const excludedAncestor = [
    'script', 'style', 'noscript', 'template', 'textarea', 'pre', 'code',
    '[contenteditable]:not([contenteditable="false"])'
  ].join(',');

  const setNonBreakingSpaces = (textNode) => {
    const parent = textNode.parentElement;
    if (!parent || parent.closest(excludedAncestor)) return;

    let typed = textNode.nodeValue;
    let previous;
    do {
      previous = typed;
      typed = typed.replace(serviceWordPattern, '$1$2\u00a0');
    } while (typed !== previous);

    if (typed !== textNode.nodeValue) textNode.nodeValue = typed;
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

  // Keep the same typography for greetings, dialogs and other injected copy.
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        setNonBreakingSpaces(mutation.target);
      } else {
        mutation.addedNodes.forEach(processSubtree);
      }
    });
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
})();
