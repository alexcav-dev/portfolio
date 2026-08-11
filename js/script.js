(function () {
  'use strict';

  var views = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var root = document.documentElement;
  var current = null;

  function setView(name) {
    if (!name || !views.length || name === current) return;

    var next = views.filter(function (view) {
      return view.getAttribute('data-view') === name;
    })[0];
    if (!next) return;

    views.forEach(function (view) {
      var active = view === next;
      view.classList.toggle('is-active', active);
      view.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    triggers.forEach(function (link) {
      var active = link.getAttribute('data-nav') === name;
      link.classList.toggle('active', active);
      if (active) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    var heading = next.querySelector('h2, h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }

    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = '';

    current = name;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest ? event.target.closest('[data-nav]') : null;
    if (!trigger) return;
    event.preventDefault();
    setView(trigger.getAttribute('data-nav'));
  });

  var activeView = document.querySelector('[data-view].is-active');
  current = activeView ? activeView.getAttribute('data-view') : 'inicio';
}());

function downloadCV() {
  var a = document.createElement("a");
  a.href = "assets/files/Alex_Cavalcante_Costa_Curriculo_2026.pdf";
  a.download = "Alex_Cavalcante_Costa_-_Curriculo_2026.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* AMBIENT LO-FI — um único <audio>, um único estado, disponível em todas as views.
   O elemento vive na navegação global (fora das views), então trocar de aba
   não recria nem reinicia a reprodução. */
(function () {
  'use strict';

  var btn = document.getElementById('ambient-toggle');
  var audio = document.getElementById('ambient-audio');
  if (!btn || !audio) return;

  var TARGET = 0.18;
  var state = { isPlaying: false, volume: TARGET };
  var frame = null;

  audio.volume = 0;

  function fade(to, duration, done) {
    if (frame) cancelAnimationFrame(frame);
    var from = audio.volume;
    var start = performance.now();
    if (duration <= 0 || from === to) { audio.volume = to; if (done) done(); return; }
    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased));
      if (t < 1) { frame = requestAnimationFrame(step); }
      else { frame = null; if (done) done(); }
    }
    frame = requestAnimationFrame(step);
  }

  function render() {
    var on = state.isPlaying;
    btn.classList.add('is-swapping');
    setTimeout(function () {
      var label = btn.querySelector('.ambient-toggle__state');
      if (label) label.textContent = on ? 'ON' : 'OFF';
      btn.classList.remove('is-swapping');
    }, 140);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Desativar música ambiente' : 'Ativar música ambiente');
  }

  btn.addEventListener('click', function () {
    if (state.isPlaying) {
      state.isPlaying = false;
      render();
      fade(0, 700, function () { audio.pause(); });
    } else {
      state.isPlaying = true;
      render();
      audio.volume = 0;
      var play = audio.play();
      if (play && play.catch) play.catch(function () {
        state.isPlaying = false;
        render();
      });
      fade(state.volume, 900);
    }
  });
}());

/* MENU MOBILE — toggle do painel de navegação (abre/fecha apenas);
   a troca de view continua no listener global [data-nav]. */
(function () {
  'use strict';

  var toggle = document.getElementById('nav-toggle');
  var panel = document.getElementById('nav-panel');
  if (!toggle || !panel) return;

  function setOpen(open) {
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    panel.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('click', function (event) {
    if (!panel.classList.contains('is-open')) return;
    var t = event.target;
    if (!t.closest || !t.closest('.site-nav') || t.closest('[data-nav]')) setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}());
