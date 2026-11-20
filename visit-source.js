/* Where a visit came from, kept for the counters.

   Every page sends a visitor on to the other language when it should: a
   Russian browser on an English page, an English choice on a Russian one.
   The jump used to cost the source. The page landed on reported that the
   visit came from the page that sent it, so both counters filed every such
   visit as a step inside the site, and Cloudflare counted no visit at all.
   The sending page now leaves the referrer it was opened with in
   sessionStorage, and this puts it back before either counter reads it.

   The build inlines this ahead of both counters on every published page,
   because it has to run while the page is still being read, before the
   beacon. Opened from disk, the pages have no counters and no use for it.

   It also notes where the visit began. Clarity starts only once a visitor
   agrees, often a page or two in, and takes its referrer from that page;
   consent.js tags the session with this note instead. A utm_source in the
   address wins over the referrer: it is the label someone chose. */
(function () {
  try {
    var own = location.origin + '/';
    var saved = sessionStorage.getItem('referrer-before-redirect');
    if (saved !== null) {
      sessionStorage.removeItem('referrer-before-redirect');
      /* Only on the page the jump landed on, which the sending page opened. */
      if (document.referrer.indexOf(own) === 0) {
        Object.defineProperty(document, 'referrer', {
          configurable: true,
          get: function () { return saved; }
        });
      }
    }

    var from = document.referrer;
    if (from.indexOf(own) === 0) return;   /* a step inside the site */
    var tag = new URLSearchParams(location.search).get('utm_source');
    var host = from ? new URL(from).hostname.replace(/^www\./, '') : 'direct';
    sessionStorage.setItem('visit-source', tag || host);
  } catch (e) {}
})();
