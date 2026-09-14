/* Match the portrait to the same system/explicit theme used by the page. */
(function () {
  var source = document.querySelector('[data-portrait-dark]');
  if (!source) return;

  function syncTheme() {
    var theme = document.documentElement.getAttribute('data-theme');
    source.media = theme === 'dark' ? 'all' :
      theme === 'light' ? 'not all' : '(prefers-color-scheme: dark)';
  }

  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
})();
