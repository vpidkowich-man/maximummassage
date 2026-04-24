(function () {
  'use strict';

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
      calLink: 'bbrolly/60min',
      calNamespace: '60min',
      duration: '60 min',
      price: 114,
      regularPrice: 124
    },
    {
      id: 'meagan',
      name: 'Meagan Brown',
      shortName: 'Meagan B.',
      title: 'Whole-body + craniosacral specialist',
      specialty: 'Whole-body + craniosacral',
      photo: '/images/therapists/meagan.webp',
      bio: 'Deeply intuitive, movement-aware therapist who takes a whole-body view of pain and recovery. Brings a calming presence and works to help your body find balance without pushing past limits.',
      tags: ['Craniosacral therapy', 'Reflexology', 'Thai massage'],
      review: {
        text: 'Meagan has a gift for understanding what your body needs. I always feel noticeably better after every session.',
        source: 'Google review'
      },
      experience: '10,000+ hours hands-on.',
      calLink: 'meaganb/60min',
      calNamespace: '60min',
      duration: '60 min',
      price: 114,
      regularPrice: 124
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
      calLink: 'ctooth/90min',
      calNamespace: '90min',
      duration: '90 min',
      price: 114,
      regularPrice: 124
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
      calLink: 'lstauffer/60min',
      calNamespace: '60min',
      duration: '60 min',
      price: 114,
      regularPrice: 124
    }
  ];

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function buildGrid() {
    return therapists.map((t) => `
      <button type="button" class="picker-card" data-therapist="${t.id}" aria-label="View ${escapeHtml(t.name)}">
        <img class="picker-card__photo" src="${t.photo}" alt="${escapeHtml(t.name)}" loading="lazy" width="80" height="80">
        <p class="picker-card__name">${escapeHtml(t.shortName)}</p>
        <p class="picker-card__spec">${escapeHtml(t.specialty)}</p>
      </button>
    `).join('');
  }

  function buildDetail(t) {
    const tagsHtml = t.tags.map((tag) => `<span class="detail-panel__tag">${escapeHtml(tag)}</span>`).join('');
    const calConfig = '{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}';

    return `
      <button type="button" class="detail-panel__back" data-action="back">
        <span aria-hidden="true">&larr;</span> All therapists
      </button>
      <div class="detail-panel__body">
        <img class="detail-panel__photo" src="${t.photo}" alt="${escapeHtml(t.name)}" width="120" height="120">
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
        <button
          type="button"
          class="btn btn--primary btn--block"
          data-cal-link="${t.calLink}"
          data-cal-namespace="${t.calNamespace}"
          data-cal-config='${calConfig}'
        >Book with ${escapeHtml(t.name.split(' ')[0])} &mdash; ${escapeHtml(t.duration)}</button>
      </div>
    `;
  }

  let overlay = null;
  let lastFocus = null;

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
          <h2 class="lb__title" id="picker-title">Choose your therapist</h2>
          <button type="button" class="lb__close" data-action="close" aria-label="Close">&times;</button>
        </div>
        <div class="lb__body">
          <div class="picker-grid" data-view="grid"></div>
          <p class="picker-foot">Tap a therapist to learn more</p>
          <div class="detail-panel" data-view="detail"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-view="grid"]').innerHTML = buildGrid();

    overlay.addEventListener('click', (e) => {
      const target = e.target;
      if (target === overlay) { closePicker(); return; }

      const closeBtn = target.closest('[data-action="close"]');
      if (closeBtn) { closePicker(); return; }

      const backBtn = target.closest('[data-action="back"]');
      if (backBtn) { showGrid(); return; }

      const card = target.closest('[data-therapist]');
      if (card) {
        showDetail(card.getAttribute('data-therapist'));
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.getAttribute('data-open') === 'true') {
        closePicker();
      }
    });

    return overlay;
  }

  function showGrid() {
    const panel = overlay.querySelector('[data-view="detail"]');
    panel.setAttribute('data-open', 'false');
  }

  function showDetail(id) {
    const t = therapists.find((x) => x.id === id);
    if (!t) return;
    const panel = overlay.querySelector('[data-view="detail"]');
    panel.innerHTML = buildDetail(t);
    panel.setAttribute('data-open', 'true');
    panel.scrollTop = 0;
  }

  function openPicker() {
    ensureOverlay();
    lastFocus = document.activeElement;
    overlay.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    showGrid();
    const firstCard = overlay.querySelector('.picker-card');
    if (firstCard) firstCard.focus();
  }

  function closePicker() {
    if (!overlay) return;
    overlay.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    showGrid();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  function init() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open-picker]');
      if (trigger) {
        e.preventDefault();
        openPicker();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MaximumHealth = window.MaximumHealth || {};
  window.MaximumHealth.openPicker = openPicker;
  window.MaximumHealth.closePicker = closePicker;
  window.MaximumHealth.therapists = therapists;
})();
