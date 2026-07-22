/* ===================================================================
   Know Thyself — interaction layer
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
  const floatReg = document.getElementById('floatRegister');
  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
    // floating Register button: show once past the hero, stay to the end
    if (floatReg) floatReg.classList.toggle('show', y > window.innerHeight * 0.7);
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
          const delay = Math.min(sibs.indexOf(e.target), 6) * 70;
          const el = e.target;
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('in');
          io.unobserve(el);
          // clear the stagger delay after the reveal so it can't make later
          // interactions (e.g. the card tilt) feel laggy/inconsistent
          setTimeout(() => { el.style.transitionDelay = ''; }, delay + 1100);
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

  /* ---------- Stories of Transformation (click card → modal video) ---------- */
  const storyModal = document.getElementById('storyModal');
  const storyVideo = document.getElementById('storyVideo');
  const storyModalName = document.getElementById('storyModalName');
  if (storyModal && storyVideo) {
    function openStory(src, name) {
      storyVideo.setAttribute('src', src);
      if (storyModalName) storyModalName.textContent = name || '';
      storyModal.hidden = false;
      document.body.style.overflow = 'hidden';
      const pr = storyVideo.play(); if (pr && pr.catch) pr.catch(() => {});
    }
    function closeStory() {
      storyVideo.pause();
      storyVideo.removeAttribute('src'); storyVideo.load();
      storyModal.hidden = true;
      document.body.style.overflow = '';
    }
    document.querySelectorAll('.story-card').forEach((card) => {
      card.addEventListener('click', () => {
        const name = (card.dataset.name || '').replace('&amp;', '&');
        openStory(card.dataset.video, name);
      });
    });
    storyModal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeStory));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !storyModal.hidden) closeStory(); });
  }

  /* ---------- Stories slider (prev / next) ---------- */
  const track = document.getElementById('storiesTrack');
  const prevBtn = document.getElementById('storyPrev');
  const nextBtn = document.getElementById('storyNext');
  if (track && prevBtn && nextBtn) {
    function step() {
      const card = track.querySelector('.story-card');
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '24') || 24;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    }
    function updateNav() {
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    }
    prevBtn.addEventListener('click', () => { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    nextBtn.addEventListener('click', () => { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    updateNav();
  }

  /* ---------- Hero audio: mute toggle + volume slider ---------- */
  const heroVideo = document.querySelector('.hero-bg');
  const audioCtrl = document.getElementById('audioControl');
  const audioBtn = document.getElementById('audioToggle');
  const audioSlider = document.getElementById('audioSlider');
  if (heroVideo && audioBtn && audioSlider) {
    heroVideo.volume = audioSlider.value / 100;

    function paintSlider() {
      audioSlider.style.backgroundSize = audioSlider.value + '% 100%';
    }
    function setSoundOn(on) {
      heroVideo.muted = !on;
      audioCtrl.classList.toggle('is-on', on);
      audioBtn.setAttribute('aria-pressed', String(on));
      audioBtn.setAttribute('aria-label', on ? 'Mute video' : 'Unmute video');
      // autoplay videos can pause when unmuted — keep them running
      const pr = heroVideo.play(); if (pr && pr.catch) pr.catch(() => {});
    }
    paintSlider();

    audioBtn.addEventListener('click', () => setSoundOn(heroVideo.muted));

    audioSlider.addEventListener('input', () => {
      const vol = audioSlider.value / 100;
      heroVideo.volume = vol;
      paintSlider();
      // dragging the slider up unmutes; to zero mutes
      if (vol === 0) { if (!heroVideo.muted) setSoundOn(false); }
      else if (heroVideo.muted) { setSoundOn(true); }
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
