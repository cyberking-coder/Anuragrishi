/* ===================================================================
   KOSH — interaction layer
=================================================================== */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year ---------- */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Nav scroll state + progress ---------- */
  const nav = document.getElementById('nav');
  const progress = document.querySelector('.scroll-progress span');
  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          const sibs = [...e.target.parentElement.querySelectorAll('[data-reveal]')];
          e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 6) * 70 + 'ms';
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Custom cursor ---------- */
  const cursor = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor-dot');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%,-50%)`;
    });
    (function loop() {
      cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, [data-magnetic], [data-hover]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.28}px, ${my * 0.4}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 3D tilt ---------- */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(900px) rotateX(0) rotateY(0)';
      });
    });
  }

  /* ---------- Video players (hero + testimonial) ---------- */
  document.querySelectorAll('.play-btn').forEach((btn) => {
    const wrap = btn.closest('.hero-video, .vt-main');
    if (!wrap) return;
    const video = wrap.querySelector('video');
    btn.addEventListener('click', () => {
      const hasSrc = video && video.querySelector('source') && video.querySelector('source').getAttribute('src');
      if (!hasSrc) {
        // No source wired yet — simulate play state so UI stays interactive.
        btn.classList.toggle('playing');
        return;
      }
      if (video.paused) { video.play(); video.classList.add('playing'); btn.classList.add('playing'); }
      else { video.pause(); video.classList.remove('playing'); btn.classList.remove('playing'); }
    });
  });

  /* ---------- Video testimonial rail ---------- */
  const thumbs = document.querySelectorAll('.vt-thumb');
  const vtName = document.getElementById('vt-name');
  const vtRole = document.getElementById('vt-role');
  const vtBtn = document.querySelector('.vt-main .play-btn');
  thumbs.forEach((t) => {
    t.addEventListener('click', () => {
      thumbs.forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      if (vtName) vtName.textContent = t.dataset.name;
      if (vtRole) vtRole.textContent = t.dataset.role;
      if (vtBtn) vtBtn.classList.remove('playing');
    });
  });

  /* ---------- Hero audio toggle ---------- */
  const heroVideo = document.querySelector('.hero-bg');
  const audioBtn = document.getElementById('audioToggle');
  if (heroVideo && audioBtn) {
    const label = audioBtn.querySelector('.audio-label');
    audioBtn.addEventListener('click', () => {
      const on = heroVideo.muted; // about to turn sound on if currently muted
      heroVideo.muted = !on;
      // ensure playback (some browsers pause on unmute of an autoplay video)
      const pr = heroVideo.play(); if (pr && pr.catch) pr.catch(() => {});
      audioBtn.classList.toggle('is-on', on);
      audioBtn.setAttribute('aria-pressed', String(on));
      audioBtn.setAttribute('aria-label', on ? 'Mute video' : 'Unmute video');
      if (label) label.textContent = on ? 'Sound on' : 'Sound off';
    });
  }

  /* ---------- Razorpay booking (test mode) ---------- */
  // Replace RAZORPAY_KEY with your own rzp_test_… / rzp_live_… key when ready.
  const RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag';
  const BOOKING_AMOUNT_PAISE = 250000; // ₹2,500 booking token
  const slotBtn = document.getElementById('bookSlotBtn');
  if (slotBtn) {
    slotBtn.addEventListener('click', () => {
      if (typeof Razorpay === 'undefined') {
        alert('Payment could not load. Please check your connection and try again.');
        return;
      }
      const options = {
        key: RAZORPAY_KEY,
        amount: BOOKING_AMOUNT_PAISE,
        currency: 'INR',
        name: 'KOSH — Inner Residential Retreat',
        description: 'Know Thyself · 3-Day Retreat — Booking Token',
        theme: { color: '#4f9d3f' },
        prefill: { name: '', email: '', contact: '' },
        notes: { retreat: 'Know Thyself 3-Day', source: 'website' },
        handler: function (response) {
          alert('Payment successful (test mode).\nPayment ID: ' + response.razorpay_payment_id);
        },
        modal: {
          ondismiss: function () { slotBtn.disabled = false; }
        }
      };
      try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert('Payment failed: ' + (resp.error && resp.error.description ? resp.error.description : 'please try again.'));
          slotBtn.disabled = false;
        });
        slotBtn.disabled = true;
        rzp.open();
        // re-enable shortly in case open() is blocked
        setTimeout(() => { slotBtn.disabled = false; }, 1500);
      } catch (e) {
        slotBtn.disabled = false;
        alert('Unable to start checkout. Please try again.');
      }
    });
  }

  /* ---------- Quote slider ---------- */
  const quotes = document.querySelectorAll('.quote');
  const qdots = document.querySelectorAll('.qdot');
  let qIdx = 0, qTimer;
  function showQuote(i) {
    quotes.forEach((q, n) => q.classList.toggle('is-active', n === i));
    qdots.forEach((d, n) => d.classList.toggle('is-active', n === i));
    qIdx = i;
  }
  function nextQuote() { showQuote((qIdx + 1) % quotes.length); }
  function startQuotes() { if (quotes.length > 1) qTimer = setInterval(nextQuote, 5500); }
  qdots.forEach((d, i) => d.addEventListener('click', () => { clearInterval(qTimer); showQuote(i); startQuotes(); }));
  startQuotes();

  /* ---------- Count-up stats ---------- */
  const nums = document.querySelectorAll('.num[data-count]');
  function animateNum(el) {
    const target = parseFloat(el.dataset.count);
    const div = parseFloat(el.dataset.div || '1');
    const suffix = el.dataset.suffix || '';
    const dur = 1600; const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased / div;
      const shown = div > 1 ? (val >= 10 ? Math.round(val) : val.toFixed(1)) : Math.round(val);
      el.textContent = shown + (p === 1 ? suffix : (div > 1 ? '' : ''));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = (div > 1 ? (target / div >= 10 ? Math.round(target / div) : (target / div).toFixed(1)) : target) + suffix;
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    const numIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animateNum(e.target); numIO.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach((n) => numIO.observe(n));
  } else {
    nums.forEach((n) => { n.textContent = (parseFloat(n.dataset.count) / parseFloat(n.dataset.div || '1')) + (n.dataset.suffix || ''); });
  }

  /* ---------- Smooth anchor offset for fixed nav ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
