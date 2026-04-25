(function () {
  'use strict';

  const TALLY_FORM_SRC = 'https://tally.so/embed/0QPyJQ?alignLeft=1&hideTitle=1&transparentBackground=1';
  const TALLY_SCRIPT = 'https://tally.so/widgets/embed.js';
  const LEAD_CAPTURE_ENDPOINT = 'REPLACE_WITH_APPS_SCRIPT_URL';
  const CONFIRMATION_PATH = '/massage-therapy-calgary-flow-b/confirmation/';

  const PRACTITIONER_PATHS = ['/brookelyn/', '/meagan/', '/charlotte/', '/lindsey/'];

  const UTM_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  const therapists = [
    {
      id: 'brookelyn',
      name: 'Brookelyn Brolly',
      shortName: 'Brookelyn B.',
      title: 'Sports + injury recovery specialist',
      specialty: 'Sports + injury recovery',
      photo: '/images/therapists/brookelyn.webp',
      bio: 'Results-driven therapist who helps active people get back to the things they love. Direct, practical, and grounded in deep anatomical knowledge.',
      tags: ['Sports injuries', 'SI joint + low back', 'Cervical spine', 'Jade stone'],
      review: {
        text: 'Brookelyn really listened and tailored the session to exactly what I needed. I felt better after one visit.',
        source: 'Google review'
      },
      experience: '10,000+ hours hands-on. Graduated MacEwan University, 2014.',
      duration: '60 min',
      price: 114,
      regularPrice: 124,
      path: '/brookelyn/'
    },
    {
      id: 'meagan',
      name: 'Meagan Brown',
      shortName: 'Meagan B.',
      title: 'Whole-body + craniosacral specialist',
      specialty: 'Whole-body + craniosacral',
      photo: '/images/therapists/meagan.jpg',
      bio: 'Deeply intuitive, movement-aware therapist who takes a whole-body view of pain and recovery. Brings a calming presence and works to help your body find balance without pushing past limits.',
      tags: ['Craniosacral therapy', 'Reflexology', 'Thai massage'],
      review: {
        text: 'Meagan has a gift for understanding what your body needs. I always feel noticeably better after every session.',
        source: 'Google review'
      },
      experience: '10,000+ hours hands-on.',
      duration: '60 min',
      price: 114,
      regularPrice: 124,
      path: '/meagan/'
    },
    {
      id: 'charlotte',
      name: 'Charlotte Tooth',
      shortName: 'Charlotte T.',
      title: 'Chronic pain + myofascial release specialist',
      specialty: 'Chronic pain + cupping',
      photo: '/images/therapists/charlotte.webp',
      bio: 'Results-focused therapist with a calm, clinical approach and a deep commitment to helping people move better and feel better. Advanced skills in injury recovery and chronic pain care.',
      tags: ['Dynamic cupping', 'Myofascial release', 'Trigger point', 'Lymphatic drainage', 'Pre/post-partum', 'Reiki'],
      review: {
        text: 'Charlotte is an experienced and knowledgeable professional. Best massage therapist ever — highly recommend!',
        source: 'Google review'
      },
      experience: '7,200+ hours hands-on.',
      duration: '90 min',
      price: 114,
      regularPrice: 124,
      path: '/charlotte/'
    },
    {
      id: 'lindsey',
      name: 'Lindsey Stauffer',
      shortName: 'Lindsey S.',
      title: 'Fascial release + nervous system specialist',
      specialty: 'Fascial release + nervous system',
      photo: '/images/therapists/lindsey.webp',
      bio: 'Calm, detail-oriented therapist with a deeply supportive presence. Blends fascial release techniques with a nervous-system-aware approach to reduce pain, improve movement, and restore balance.',
      tags: ['Fascial release', 'Yoga teacher', 'Doula', 'Acupuncture (in training)'],
      review: {
        text: 'Lindsey creates such a safe, calming space. Her fascial work is incredible — I noticed a difference after the first session.',
        source: 'Google review'
      },
      experience: '4,000+ hours hands-on.',
      duration: '60 min',
      price: 114,
      regularPrice: 124,
      path: '/lindsey/'
    },
    {
      id: 'kassandra',
      name: 'Kassandra Wilson',
      shortName: 'Kassandra W.',
      specialty: 'Deep tissue + sports',
      photo: '/images/therapists/kassandra.webp',
      disabled: true,
      disabledLabel: 'Fully booked'
    },
    {
      id: 'tracy',
      name: 'Tracy Schneider-Steeves',
      shortName: 'Tracy S.',
      specialty: 'Trigger point + craniosacral',
      photo: '/images/therapists/tracy.webp',
      disabled: true,
      disabledLabel: 'Fully booked'
    }
  ];

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function readUtm(key) {
    const fromUrl = new URLSearchParams(window.location.search).get(key);
    if (fromUrl) return fromUrl;
    try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function collectUtms() {
    const out = {};
    UTM_KEYS.forEach((k) => { out[k] = readUtm(k); });
    return out;
  }

  function buildTallySrc() {
    const extras = [];
    UTM_KEYS.forEach((k) => {
      const v = readUtm(k);
      if (v) extras.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    if (!extras.length) return TALLY_FORM_SRC;
    const sep = TALLY_FORM_SRC.indexOf('?') > -1 ? '&' : '?';
    return TALLY_FORM_SRC + sep + extras.join('&');
  }

  function buildQuizView() {
    return `
      <div class="quiz-wrap" data-view-root="quiz">
        <iframe
          data-quiz-iframe
          loading="lazy"
          frameborder="0"
          marginheight="0"
          marginwidth="0"
          title="Find a Therapist Quiz"
        ></iframe>
      </div>
    `;
  }

  function buildGrid(recommendedId) {
    return `
      ${recommendedId ? '<p class="picker-intro">Based on your answers, we recommend <strong>' + escapeHtml(findTherapist(recommendedId).name.split(" ")[0]) + '</strong> &mdash; but pick whoever feels right.</p>' : ''}
      <div class="picker-grid">
        ${therapists.map((t) => {
          const isRecommended = t.id === recommendedId;
          const isDisabled = !!t.disabled;
          const classes = ['picker-card'];
          if (isRecommended) classes.push('picker-card--recommended');
          if (isDisabled) classes.push('picker-card--disabled');
          const attrs = isDisabled
            ? 'disabled aria-disabled="true" tabindex="-1"'
            : 'data-therapist="' + t.id + '" aria-label="View ' + escapeHtml(t.name) + '"';
          return `
            <button type="button" class="${classes.join(' ')}" ${attrs}>
              ${isRecommended ? '<span class="picker-card__badge">We recommend</span>' : ''}
              <img class="picker-card__photo" src="${t.photo}" alt="${escapeHtml(t.name)}" loading="lazy">
              <p class="picker-card__name">${escapeHtml(t.shortName)}</p>
              <p class="picker-card__spec">${escapeHtml(t.specialty)}</p>
              ${isDisabled ? '<p class="picker-card__disabled-label">' + escapeHtml(t.disabledLabel) + '</p>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <p class="picker-foot">Tap a therapist to see more &mdash; two of our team are currently fully booked.</p>
    `;
  }

  function findTherapist(id) {
    return therapists.find((x) => x.id === id);
  }

  function buildDetail(t) {
    const tagsHtml = t.tags.map((tag) => `<span class="detail-panel__tag">${escapeHtml(tag)}</span>`).join('');
    return `
      <button type="button" class="detail-panel__back" data-action="back">
        <span aria-hidden="true">&larr;</span> All therapists
      </button>
      <div class="detail-panel__body">
        <img class="detail-panel__photo" src="${t.photo}" alt="${escapeHtml(t.name)}">
        <h3 class="detail-panel__name">${escapeHtml(t.name)}, RMT</h3>
        <p class="detail-panel__title">${escapeHtml(t.title)}</p>
        <p class="detail-panel__bio">${escapeHtml(t.bio)}</p>
        <div class="detail-panel__tags">${tagsHtml}</div>
        <blockquote class="detail-panel__quote">${escapeHtml(t.review.text)}</blockquote>
        <p class="detail-panel__source">&mdash; ${escapeHtml(t.review.source)}</p>
        <p class="detail-panel__exp">${escapeHtml(t.experience)}</p>
        <p class="detail-panel__price">
          $${t.price}
          <span class="detail-panel__price-old">$${t.regularPrice}</span>
          <span class="cta-card__badge">$10 off new clients</span>
        </p>
        <button type="button" class="btn btn--primary btn--block" data-action="open-lead-form" data-therapist="${t.id}">
          Book with ${escapeHtml(t.name.split(' ')[0])} &mdash; ${escapeHtml(t.duration)}
        </button>
      </div>
    `;
  }

  function buildLeadForm(t) {
    return `
      <button type="button" class="detail-panel__back" data-action="back-to-detail" data-therapist="${t.id}">
        <span aria-hidden="true">&larr;</span> Back
      </button>
      <form class="lead-form" data-lead-form data-therapist="${t.id}" novalidate>
        <h3 class="lead-form__title">Almost there</h3>
        <p class="lead-form__sub">A few quick details so we can hold a spot with ${escapeHtml(t.name.split(' ')[0])}.</p>
        <label class="lead-form__field">
          <span>First name</span>
          <input name="first_name" type="text" autocomplete="given-name" required>
        </label>
        <label class="lead-form__field">
          <span>Last name</span>
          <input name="last_name" type="text" autocomplete="family-name" required>
        </label>
        <label class="lead-form__field">
          <span>Email</span>
          <input name="email" type="email" autocomplete="email" required>
        </label>
        <label class="lead-form__field">
          <span>Phone</span>
          <input name="phone" type="tel" autocomplete="tel" required>
        </label>
        <p class="lead-form__err" data-lead-err hidden></p>
        <button type="submit" class="btn btn--primary btn--block" data-lead-submit>
          Proceed to see availability
        </button>
      </form>
    `;
  }

  let overlay = null;
  let lastFocus = null;
  let tallyBooted = false;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'picker-title');
    overlay.innerHTML = `
      <div class="lb" role="document">
        <div class="lb__head">
          <h2 class="lb__title" id="picker-title">Find your therapist</h2>
          <button type="button" class="lb__close" data-action="close" aria-label="Close">&times;</button>
        </div>
        <div class="lb__body">
          <div class="lb__stage" data-view="quiz"></div>
          <div class="lb__stage" data-view="grid" hidden></div>
          <div class="detail-panel" data-view="detail"></div>
          <div class="lb__stage" data-view="lead-form" hidden></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      const target = e.target;
      if (target === overlay) { closeLightbox(); return; }
      if (target.closest('[data-action="close"]')) { closeLightbox(); return; }
      if (target.closest('[data-action="back"]')) { showGrid(); return; }

      const backToDetail = target.closest('[data-action="back-to-detail"]');
      if (backToDetail) {
        showDetail(backToDetail.getAttribute('data-therapist'));
        return;
      }

      const openLead = target.closest('[data-action="open-lead-form"]');
      if (openLead) {
        showLeadForm(openLead.getAttribute('data-therapist'));
        return;
      }

      const card = target.closest('[data-therapist]');
      if (card && card.classList.contains('picker-card') && !card.hasAttribute('disabled')) {
        showDetail(card.getAttribute('data-therapist'));
      }
    });

    overlay.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-lead-form]');
      if (form) {
        e.preventDefault();
        submitLeadForm(form);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.getAttribute('data-open') === 'true') {
        closeLightbox();
      }
    });

    return overlay;
  }

  function setView(name) {
    overlay.querySelectorAll('[data-view]').forEach((el) => {
      if (el.getAttribute('data-view') === name) {
        el.hidden = false;
        if (el.classList.contains('detail-panel')) el.setAttribute('data-open', 'true');
      } else {
        if (el.classList.contains('detail-panel')) el.setAttribute('data-open', 'false');
        else el.hidden = true;
      }
    });
    const title = overlay.querySelector('.lb__title');
    if (name === 'quiz') title.textContent = 'Find your therapist';
    else if (name === 'grid') title.textContent = 'Choose your therapist';
    else if (name === 'detail') title.textContent = 'Your therapist';
    else if (name === 'lead-form') title.textContent = 'Almost there';
  }

  function showQuiz() {
    const stage = overlay.querySelector('[data-view="quiz"]');
    stage.innerHTML = buildQuizView();
    const iframe = stage.querySelector('[data-quiz-iframe]');
    if (iframe && !iframe.getAttribute('src')) {
      iframe.src = buildTallySrc();
      iframe.addEventListener('load', onQuizIframeLoad);
    }
    bootTallyScript();
    setView('quiz');
  }

  function bootTallyScript() {
    if (tallyBooted) return;
    tallyBooted = true;
    if (document.querySelector('script[src="' + TALLY_SCRIPT + '"]')) return;
    const s = document.createElement('script');
    s.src = TALLY_SCRIPT;
    s.async = true;
    document.body.appendChild(s);
  }

  function onQuizIframeLoad(e) {
    const iframe = e.target;
    try {
      const href = iframe.contentWindow.location.href;
      const pathname = iframe.contentWindow.location.pathname;
      const matchedPath = PRACTITIONER_PATHS.find((p) => pathname.indexOf(p) === 0);
      if (matchedPath) {
        const id = matchedPath.replace(/\//g, '');
        showGrid(id);
      }
    } catch (err) {
      /* still on tally.so — cross-origin, no action */
    }
  }

  let lastRecommendedId = null;
  function showGrid(recommendedId) {
    if (recommendedId) lastRecommendedId = recommendedId;
    const stage = overlay.querySelector('[data-view="grid"]');
    stage.innerHTML = buildGrid(recommendedId || lastRecommendedId);
    setView('grid');
    stage.scrollTop = 0;
  }

  function showDetail(id) {
    const t = findTherapist(id);
    if (!t || t.disabled) return;
    const panel = overlay.querySelector('[data-view="detail"]');
    panel.innerHTML = buildDetail(t);
    setView('detail');
    panel.scrollTop = 0;
  }

  function showLeadForm(id) {
    const t = findTherapist(id);
    if (!t) return;
    const stage = overlay.querySelector('[data-view="lead-form"]');
    stage.innerHTML = buildLeadForm(t);
    setView('lead-form');
    stage.scrollTop = 0;
    const first = stage.querySelector('input[name="first_name"]');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function submitLeadForm(form) {
    const submitBtn = form.querySelector('[data-lead-submit]');
    const errEl = form.querySelector('[data-lead-err]');
    const therapistId = form.getAttribute('data-therapist');
    const t = findTherapist(therapistId);

    const data = {
      first_name: (form.first_name.value || '').trim(),
      last_name: (form.last_name.value || '').trim(),
      email: (form.email.value || '').trim(),
      phone: (form.phone.value || '').trim(),
      selected_therapist: t ? t.name : therapistId,
      selected_therapist_id: therapistId,
      ...collectUtms()
    };

    if (!data.first_name || !data.last_name || !data.email || !data.phone) {
      errEl.textContent = 'Please fill in all fields.';
      errEl.hidden = false;
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errEl.textContent = 'That email doesn’t look right.';
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    const stash = {
      ...data,
      ts: new Date().toISOString()
    };
    try { sessionStorage.setItem('mh_lead', JSON.stringify(stash)); } catch (_) {}

    postLead(data)
      .catch(() => { /* fall through; stashed data still lets confirmation page work */ })
      .finally(() => {
        window.location.href = CONFIRMATION_PATH;
      });
  }

  function postLead(data) {
    if (!LEAD_CAPTURE_ENDPOINT || LEAD_CAPTURE_ENDPOINT === 'REPLACE_WITH_APPS_SCRIPT_URL') {
      return Promise.resolve();
    }
    return fetch(LEAD_CAPTURE_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'lead', ...data })
    });
  }

  function openLightbox() {
    ensureOverlay();
    lastFocus = document.activeElement;
    overlay.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    showQuiz();
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function init() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open-picker]');
      if (trigger) {
        e.preventDefault();
        openLightbox();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MaximumHealth = window.MaximumHealth || {};
  window.MaximumHealth.openPicker = openLightbox;
  window.MaximumHealth.closePicker = closeLightbox;
  window.MaximumHealth.therapists = therapists;
  window.MaximumHealth.collectUtms = collectUtms;
  window.MaximumHealth.__endpoint = () => LEAD_CAPTURE_ENDPOINT;
})();
