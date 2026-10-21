/* AMLIA — comportamiento común del sitio */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  // Menú móvil
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Aparición al hacer scroll
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Contadores
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var pre = el.getAttribute('data-pre') || '';
    var suf = el.getAttribute('data-suf') || '';
    if (reduce || !('IntersectionObserver' in window)) return;
    var started = false;
    var obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || started) return;
      started = true; obs.disconnect();
      var t0 = null, dur = 1200;
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        el.textContent = pre + v + suf;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
  });

  // Preguntas frecuentes
  document.querySelectorAll('.faq').forEach(function (f) {
    var q = f.querySelector('.faq-q');
    if (!q) return;
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', function () {
      var open = f.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // Año del pie
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
