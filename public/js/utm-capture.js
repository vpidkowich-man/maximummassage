(function () {
  'use strict';
  try {
    const params = new URLSearchParams(window.location.search);
    ['gclid', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content'].forEach((key) => {
      const val = params.get(key);
      if (val) sessionStorage.setItem(key, val);
    });
  } catch (_) { /* sessionStorage may be blocked in some contexts */ }
})();
