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

/* TEXTO EM LETRAS (repetível) + REVEAL NO SCROLL
   - [data-text-anim]: o texto é dividido em letras (spans aria-hidden; o elemento recebe aria-label) e uma
     sequência CSS de duração fixa é disparada. Observer "play": toca quando qualquer parte do bloco entra na
     viewport. Observer "rearm": só rearma quando o bloco está >=10% da altura da viewport FORA dela, então
     oscilações na borda não reiniciam a sequência. As letras só ficam ocultas enquanto o bloco está fora.
   - [data-reveal]: aparece uma única vez, como antes.
   - prefers-reduced-motion, sem IntersectionObserver ou erro de JS: nada é ocultado.
   Sem timers: a duração vive no CSS. Observers são desconectados em pagehide / mudança de preferência. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var ioReveal = null, ioPlay = null, ioRearm = null, active = false;

  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function reduced() { return !!(mq && mq.matches); }

  function split(el) {
    if (el.getAttribute('data-ta-split') === '1') return el.querySelectorAll('.ta-c').length > 0;
    var label = el.textContent.replace(/\s+/g, ' ').trim(), n = 0, nodes = [], t;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    while ((t = walker.nextNode())) nodes.push(t);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        w.className = 'ta-w';
        w.setAttribute('aria-hidden', 'true');
        Array.from(part).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'ta-c';
          c.style.setProperty('--i', n++);
          c.textContent = ch;
          w.appendChild(c);
        });
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    if (!n) return false;
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
    el.style.setProperty('--s', el.hasAttribute('data-hero-title') ? '50ms' : Math.max(12, Math.min(28, Math.round(640 / n))) + 'ms');
    el.setAttribute('data-ta-split', '1');
    return true;
  }

  function play(el) { if (el.classList.contains('ta-play')) return; el.classList.remove('ta-armed'); el.classList.add('ta-play'); }
  function arm(el) { el.classList.remove('ta-play'); el.classList.add('ta-armed'); }

  function onReveal(entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ioReveal.unobserve(e.target); } });
  }
  // A abertura inteira rearma DEVELOPER; os demais títulos mantêm seus observers.
  function textTarget(target) { return target.matches('.hero__stage') ? target.querySelector('[data-hero-title]') : target; }
  function onPlay(entries) { entries.forEach(function (e) { var el = textTarget(e.target); if (el && e.isIntersecting) play(el); }); }
  function onRearm(entries) {
    entries.forEach(function (e) { var el = textTarget(e.target); if (el && !e.isIntersecting && el.classList.contains('ta-play')) arm(el); });
  }

  function destroy() {
    [ioReveal, ioPlay, ioRearm].forEach(function (o) { if (o) o.disconnect(); });
    ioReveal = ioPlay = ioRearm = null;
    active = false;
    root.classList.remove('reveal-on');
    all('[data-text-anim]').forEach(function (el) { el.classList.remove('ta-armed', 'ta-play'); });
    all('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  function init() {
    if (active || reduced() || !('IntersectionObserver' in window)) return;
    active = true;
    try {
      root.classList.add('reveal-on');
      ioReveal = new IntersectionObserver(onReveal, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      ioPlay = new IntersectionObserver(onPlay, { threshold: 0 });
      ioRearm = new IntersectionObserver(onRearm, { rootMargin: '10% 0px 10% 0px', threshold: 0 });
      all('[data-reveal]').forEach(function (el) { el.classList.remove('is-in'); ioReveal.observe(el); });
      all('[data-text-anim]').forEach(function (el) {
        if (!split(el)) return;
        var trigger = el.hasAttribute('data-hero-title') ? el.closest('.hero__stage') : el;
        arm(el); ioPlay.observe(trigger); ioRearm.observe(trigger);
      });
    } catch (err) { destroy(); }
  }

  function onPrefChange() { if (reduced()) destroy(); else init(); }
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', onPrefChange); else if (mq.addListener) mq.addListener(onPrefChange); }
  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', function (e) { if (e.persisted) init(); });
  init();
}());

/* PARALLAX — controlador compartilhado; Hero mantém seus 26px e a mesma curva. */
(function () {
  'use strict';
  var stage = document.querySelector('.hero__stage');
  var image = document.querySelector('.hero__backdrop img');
  var navigation = document.querySelector('.site-nav');
  var scenes = [], sceneTop = 0;
  function register(element, layers) {
    scenes.push({ element: element, target: element.querySelector('.layered-backdrop__viewport') || element,
      view: element.closest('[data-view]'), layers: layers, hero: element === stage, visible: true });
  }
  if (stage && image) register(stage, [{ image: image, distance: 26, property: '--hero-shift' }]);
  Array.prototype.forEach.call(document.querySelectorAll('[data-layered-parallax]'), function (element) {
    var layers = Array.prototype.map.call(element.querySelectorAll('[data-layer-distance]'), function (layer) {
      return { image: layer, distance: Number(layer.getAttribute('data-layer-distance')), property: '--layer-shift' };
    });
    register(element, layers);
  });
  if (!scenes.length) return;
  var disabled = window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)');
  var frame = null, pageHidden = false, observer = null;
  function active(scene) { return scene.view && scene.view.classList.contains('is-active'); }
  function eligible(scene) { return active(scene) && (scene.visible || !observer); }
  function cancel() { if (frame !== null) cancelAnimationFrame(frame); frame = null; }
  function reset() {
    scenes.forEach(function (scene) { scene.layers.forEach(function (layer) { layer.image.style.setProperty(layer.property, '0px'); }); });
  }
  function update() {
    frame = null;
    if (disabled.matches) { reset(); return; }
    if (document.hidden || pageHidden) return;
    scenes.forEach(function (scene) {
      if (!eligible(scene)) return;
      var rect = scene.element.getBoundingClientRect();
      var height = window.innerHeight;
      if (!rect.height || rect.bottom < 0 || rect.top > height) return;
      // A Hero conserva a curva original. Cenários sticky percorrem todo o
      // intervalo entre alinhar sob o header e alcançar o fim do conteúdo.
      var viewportHeight = Math.max(1, height - sceneTop);
      var travel = rect.height - viewportHeight;
      var progress = scene.hero ? (height - rect.top) / (height + rect.height)
        : travel > 1 ? (sceneTop - rect.top) / travel : .5;
      progress = Math.max(0, Math.min(1, progress));
      scene.layers.forEach(function (layer) {
        layer.image.style.setProperty(layer.property, (-layer.distance / 2 + layer.distance * progress).toFixed(2) + 'px');
      });
    });
  }
  function schedule() {
    if (disabled.matches) { cancel(); reset(); return; }
    if (frame === null && scenes.some(eligible) && !document.hidden && !pageHidden) frame = requestAnimationFrame(update);
  }
  function refresh() {
    sceneTop = navigation ? Math.ceil(navigation.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--scene-top', sceneTop + 'px');
    scenes.forEach(function (scene) {
      if (!active(scene)) { scene.visible = false; return; }
      var rect = scene.target.getBoundingClientRect();
      scene.visible = rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight;
    });
    if (!scenes.some(eligible)) cancel();
    schedule();
  }
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        scenes.forEach(function (scene) { if (scene.target === entry.target) scene.visible = entry.isIntersecting; });
      });
      if (scenes.some(eligible)) schedule(); else cancel();
    });
    scenes.forEach(function (scene) { observer.observe(scene.target); });
  }
  if ('MutationObserver' in window) {
    var views = new MutationObserver(refresh);
    document.querySelectorAll('[data-view]').forEach(function (view) { views.observe(view, { attributes: true, attributeFilter: ['class'] }); });
  }
  if ('ResizeObserver' in window) {
    var sizes = new ResizeObserver(refresh);
    if (navigation) sizes.observe(navigation);
    scenes.forEach(function (scene) { sizes.observe(scene.element); });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', refresh);
  if (disabled.addEventListener) disabled.addEventListener('change', schedule);
  else disabled.addListener(schedule);
  document.addEventListener('visibilitychange', function () { if (document.hidden) cancel(); else refresh(); });
  window.addEventListener('pagehide', function () { pageHidden = true; cancel(); });
  window.addEventListener('pageshow', function () { pageHidden = false; refresh(); });
  refresh();
}());

/* GATINHO — uma instância global, áudio carregado somente por clique. */
(function () {
  'use strict';
  var cat = document.getElementById('audio-cat');
  var button = document.getElementById('audio-cat-toggle');
  var audio = document.getElementById('audio-cat-audio');
  var bubble = document.getElementById('audio-cat-bubble');
  var closeButton = document.getElementById('audio-cat-close');
  var status = document.getElementById('audio-cat-status');
  if (!cat || !button || !audio || !bubble || !closeButton || !status) return;

  var desired = false, playing = false, revision = 0, frame = null, bubblePending = false;
  var volume = .12, pageHidden = false, wasHidden = false, internalPauses = 0;

  function render() {
    cat.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', desired ? 'true' : 'false');
    button.setAttribute('aria-label', desired ? 'Desativar música' : 'Ativar música');
  }
  function cancelFade() { if (frame !== null) cancelAnimationFrame(frame); frame = null; }
  function hideBubble() {
    bubble.hidden = true;
    if (document.activeElement === closeButton) button.focus({ preventScroll: true });
  }
  function welcome() {
    if (!bubblePending || !desired || !playing || document.hidden || pageHidden) return;
    bubblePending = false;
    bubble.hidden = false;
  }
  closeButton.addEventListener('click', hideBubble);
  function fade(to, duration, done) {
    cancelFade();
    var from = audio.volume, start = null;
    if (document.hidden || pageHidden || from === to) {
      audio.volume = to; if (done) done(); return;
    }
    function step(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = progress * progress * (3 - 2 * progress);
      audio.volume = from + (to - from) * eased;
      if (progress < 1) frame = requestAnimationFrame(step);
      else { frame = null; if (done) done(); }
    }
    frame = requestAnimationFrame(step);
  }
  function pauseMedia() {
    if (!audio.paused) internalPauses++;
    audio.pause(); playing = false; render();
  }
  function failed() {
    revision++; desired = false; playing = false; cancelFade(); pauseMedia();
    hideBubble(); status.textContent = 'Não foi possível tocar a música. Tente novamente.'; render();
  }
  function start() {
    if (!desired || document.hidden || pageHidden) return;
    var attempt = ++revision;
    if (audio.paused) audio.volume = 0;
    try {
      var promise = audio.play();
      if (promise && promise.catch) promise.catch(function () { if (attempt === revision && desired) failed(); });
      if (playing) { fade(volume, 1200); welcome(); }
    } catch (err) { if (attempt === revision) failed(); }
  }
  button.addEventListener('click', function () {
    status.textContent = ''; hideBubble();
    var source = button.getAttribute('data-audio-src');
    if (!source) {
      status.textContent = 'A trilha ainda não está disponível.';
      return;
    }
    desired = !desired;
    bubblePending = desired;
    revision++; render();
    if (!desired) {
      fade(0, 300, function () { if (!desired) pauseMedia(); });
      return;
    }
    if (typeof audio.canPlayType === 'function' && !audio.canPlayType('audio/mpeg')) {
      failed(); return;
    }
    if (!audio.getAttribute('src')) audio.setAttribute('src', source);
    if (audio.ended) audio.currentTime = 0;
    start();
  });
  audio.addEventListener('playing', function () {
    if (!desired || document.hidden || pageHidden) { pauseMedia(); return; }
    playing = true; status.textContent = ''; render(); fade(volume, 1200); welcome();
  });
  audio.addEventListener('waiting', function () { playing = false; cancelFade(); render(); });
  audio.addEventListener('pause', function () {
    if (internalPauses) { internalPauses--; return; }
    playing = false;
    if (!document.hidden && !pageHidden) { desired = false; revision++; hideBubble(); }
    cancelFade(); render();
  });
  audio.addEventListener('ended', function () { playing = false; desired = false; revision++; cancelFade(); hideBubble(); render(); });
  audio.addEventListener('error', failed);

  function visibility() {
    var hidden = document.hidden || pageHidden;
    cat.classList.toggle('is-suspended', hidden);
    if (hidden) {
      wasHidden = true; revision++;
      cancelFade(); status.textContent = '';
      audio.volume = 0; pauseMedia();
    } else if (wasHidden) {
      wasHidden = false;
      if (desired && !audio.ended) start();
      else if (audio.ended) { desired = false; render(); }
    }
  }
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', function () {
    pageHidden = true; visibility();
  });
  window.addEventListener('pageshow', function () { pageHidden = false; visibility(); });
  render(); visibility();
}());

/* GALERIAS DE PROJETOS — instâncias únicas; modal nativo compartilhado. */
(function () {
  'use strict';
  var view = document.querySelector('[data-view="projetos"]');
  var dialog = document.getElementById('project-lightbox');
  if (!view || !dialog || typeof dialog.showModal !== 'function') return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var galleries = [], pageHidden = false, opened = null, opener = null, modalIndex = 0;
  var frame = null, advanceDuration = 9000;
  var savedOverflow = null;
  var modalImage = dialog.querySelector('img');
  var modalTitle = document.getElementById('project-lightbox-title');
  var modalCaption = document.getElementById('project-lightbox-caption');
  var closeButton = dialog.querySelector('[data-lightbox-close]');

  function finish(gallery) { gallery.command = null; gallery.velocity = 0; }
  function active() { return view.classList.contains('is-active'); }
  function available(gallery) { return active() && gallery.visible && !document.hidden && !pageHidden; }
  function smooth(value) { return value * value * (3 - 2 * value); }
  function integrate(gallery, now) {
    if (!gallery.mode || gallery.last === null) return;
    now = Math.max(now, gallery.last);
    var elapsed = now - gallery.last; gallery.last = now;
    if (gallery.mode === 'auto') {
      gallery.phase += elapsed / advanceDuration;
      gallery.velocity = 1 / advanceDuration;
    } else if (gallery.command) {
      var command = gallery.command;
      command.elapsed = Math.min(command.duration, command.elapsed + elapsed);
      var t = command.elapsed / command.duration, delta = command.to - command.from;
      // Hermite retains the current velocity when an arrow redirects a moving
      // card, then gently comes to rest at the chosen position.
      var tangent = command.velocity * command.duration;
      gallery.phase = command.from + delta * smooth(t) + tangent * (t * t * t - 2 * t * t + t);
      gallery.velocity = (delta * (6 * t - 6 * t * t) + tangent * (3 * t * t - 4 * t + 1)) / command.duration;
      if (t === 1) { gallery.phase = command.to; finish(gallery); gallery.mode = null; }
    }
    render(gallery);
  }
  function schedule() {
    var running = galleries.some(function (gallery) { return gallery.mode !== null; });
    if (!running && frame !== null) { cancelAnimationFrame(frame); frame = null; }
    else if (running && frame === null) frame = requestAnimationFrame(step);
  }
  function step(now) {
    frame = null;
    galleries.forEach(function (gallery) { if (gallery.mode) integrate(gallery, now); });
    schedule();
  }
  function sync(gallery) {
    var now = performance.now();
    integrate(gallery, now);
    var visible = available(gallery);
    if (reduced.matches) finish(gallery);
    gallery.autoplay.disabled = reduced.matches;
    gallery.autoplay.textContent = reduced.matches ? 'Movimento reduzido' : gallery.manual ? 'Retomar' : 'Pausar';
    gallery.autoplay.setAttribute('aria-label', reduced.matches ? 'Passagem automática desativada por redução de movimento'
      : (gallery.manual ? 'Retomar' : 'Pausar') + ' passagem automática de ' + gallery.name);
    gallery.mode = null;
    if (visible && !reduced.matches && !dialog.open) {
      // Arrow commands are explicit navigation, even when their button has
      // keyboard focus or the pointer remains over the gallery.
      if (gallery.command) gallery.mode = 'manual';
      else if (!gallery.manual && !gallery.hover && !gallery.focus) gallery.mode = 'auto';
    }
    gallery.last = gallery.mode ? now : null;
    schedule();
  }
  function syncAll() { galleries.forEach(sync); }
  function pause(gallery) {
    integrate(gallery, performance.now());
    gallery.manual = true; finish(gallery); sync(gallery);
  }
  function wrap(gallery, index) { return (index % gallery.items.length + gallery.items.length) % gallery.items.length; }
  function segment(from, to, t, start, end) {
    var t2 = t * t, t3 = t2 * t;
    return from * (2 * t3 - 3 * t2 + 1) + to * (-2 * t3 + 3 * t2)
      + start * (t3 - 2 * t2 + t) + end * (t3 - t2);
  }
  function slotPoses(gallery) {
    var count = gallery.items.length, step = Math.floor(gallery.phase), t = gallery.phase - step;
    var side = 22, sideScale = .82, join = side * .625;
    // Translations are percentages of the unscaled card, not the stage.
    // Keep the entire lateral card inside the measured stage, with a small
    // inset. The rear leg is concealed by opaque cards rather than clipping.
    var leftTurn = Math.min(26, (gallery.clipHalf || 69.444444) - 50 * sideScale - 2);
    var incoming = segment(side, 0, t, 0, -side), easing = smooth(t);
    var firstHalf = t < .5, local = firstHalf ? t * 2 : (t - .5) * 2;
    return gallery.items.map(function (item, index) {
      var role = wrap(gallery, index - step), x, scale = sideScale, layer;
      if (role === 0) {
        x = firstHalf ? segment(0, -leftTurn, local, -side * .5, 0)
          : count === 2 ? segment(-leftTurn, side, local, 0, 0)
          : segment(-leftTurn, -side, local, 0, side * .5);
        scale = firstHalf ? 1 - (1 - sideScale) * smooth(local) : sideScale;
        layer = firstHalf ? 4 : count === 2 ? 3 : 2;
      } else if (role === 1) {
        x = incoming; scale = sideScale + (1 - sideScale) * easing;
        layer = firstHalf ? 3 : 4;
      } else {
        var previous = role === count - 1;
        var nextPreview = role === 2;
        x = firstHalf ? segment(previous ? -side : 0, join, local, side * .5, -side * .625)
          : nextPreview ? segment(join, side, local, -side * .625, 0)
          : segment(join, 0, local, -side * .625, side * .5);
        layer = firstHalf ? previous ? 2 : nextPreview ? 1 : 0 : nextPreview ? 3 : 0;
      }
      // The front card retreats as it moves left, then changes depth at the
      // lateral turn. Rear cards travel under the front before emerging right;
      // no card leaves the stage, fades or changes vertical alignment.
      return { x: x, y: 0, scale: scale, layer: layer };
    });
  }
  function covered(pose, poses, halfWidth) {
    halfWidth = halfWidth || Infinity;
    var leftEdge = Math.max(-halfWidth, pose.x - 50 * pose.scale);
    var rightEdge = Math.min(halfWidth, pose.x + 50 * pose.scale);
    if (leftEdge >= rightEdge) return true;
    var exposed = [{ left: leftEdge, right: rightEdge,
      top: pose.y - 50 * pose.scale, bottom: pose.y + 50 * pose.scale }];
    // Rectangle subtraction is only for focus/hit eligibility. Painting and
    // partial overlap use the browser's opaque surfaces, never masks or fades.
    poses.forEach(function (other) {
      if (other.layer <= pose.layer || !exposed.length) return;
      var left = other.x - 50 * other.scale, right = other.x + 50 * other.scale;
      var top = other.y - 50 * other.scale, bottom = other.y + 50 * other.scale;
      var remaining = [];
      exposed.forEach(function (part) {
        var l = Math.max(part.left, left), r = Math.min(part.right, right);
        var t = Math.max(part.top, top), b = Math.min(part.bottom, bottom);
        if (l >= r || t >= b) { remaining.push(part); return; }
        if (part.top < t) remaining.push({ left: part.left, right: part.right, top: part.top, bottom: t });
        if (b < part.bottom) remaining.push({ left: part.left, right: part.right, top: b, bottom: part.bottom });
        if (part.left < l) remaining.push({ left: part.left, right: l, top: t, bottom: b });
        if (r < part.right) remaining.push({ left: r, right: part.right, top: t, bottom: b });
      });
      exposed = remaining;
    });
    return !exposed.length;
  }
  function render(gallery) {
    var poses = slotPoses(gallery), centerLayer = -Infinity, centerIndex = 0;
    gallery.items.forEach(function (item, index) {
      var pose = poses[index];
      item.button.style.setProperty('--orbit-x', pose.x.toFixed(5) + '%');
      item.button.style.setProperty('--orbit-y', '0%');
      item.button.style.setProperty('--orbit-scale', pose.scale.toFixed(6));
      item.button.style.setProperty('--orbit-layer', String(pose.layer));
      var hidden = covered(pose, poses, gallery.clipHalf || 69.444444);
      item.button.style.setProperty('--orbit-hit', hidden ? 'none' : 'auto');
      item.button.inert = hidden;
      item.button.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      item.button.tabIndex = hidden ? -1 : 0;
      if (Math.abs(pose.x) <= 50 * pose.scale && pose.layer > centerLayer) {
        centerLayer = pose.layer; centerIndex = index;
      }
    });
    if (centerIndex !== gallery.index) {
      gallery.index = centerIndex;
      gallery.counter.textContent = (centerIndex + 1) + ' / ' + gallery.items.length;
      gallery.caption.textContent = gallery.items[centerIndex].label;
    }
  }
  function move(gallery, direction) {
    integrate(gallery, performance.now());
    var target = gallery.command ? gallery.command.to + direction
      : direction > 0 ? Math.floor(gallery.phase + .000001) + 1 : Math.ceil(gallery.phase - .000001) - 1;
    gallery.manual = true;
    gallery.counter.setAttribute('aria-live', 'polite');
    if (reduced.matches) { gallery.phase = target; finish(gallery); render(gallery); }
    else gallery.command = { from: gallery.phase, to: target, velocity: gallery.velocity,
      elapsed: 0, duration: Math.max(650, Math.min(1800, Math.abs(target - gallery.phase) * 1100)) };
    sync(gallery);
  }
  function showCapture() {
    var item = opened.items[modalIndex];
    modalTitle.textContent = opened.name;
    modalCaption.textContent = item.label + ' · ' + (modalIndex + 1) + ' / ' + opened.items.length;
    modalImage.src = item.src;
    modalImage.alt = opened.name + ' — ' + item.label;
  }
  function openCapture(gallery, index, trigger) {
    pause(gallery); finish(gallery);
    opened = gallery; modalIndex = index; opener = trigger;
    showCapture();
    savedOverflow = { body: document.body.style.overflow, root: document.documentElement.style.overflow };
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
    dialog.showModal(); closeButton.focus({ preventScroll: true }); syncAll();
  }
  function closeModal() { if (dialog.open) dialog.close(); }
  function stepModal(direction) {
    if (!opened) return;
    modalIndex = wrap(opened, modalIndex + direction); showCapture();
  }
  dialog.querySelector('[data-lightbox-prev]').addEventListener('click', function () { stepModal(-1); });
  dialog.querySelector('[data-lightbox-next]').addEventListener('click', function () { stepModal(1); });
  closeButton.addEventListener('click', closeModal);
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); closeModal(); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) closeModal(); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); stepModal(event.key === 'ArrowRight' ? 1 : -1); return;
    }
    if (event.key !== 'Tab') return;
    var buttons = Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled])'));
    var first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', function () {
    if (savedOverflow) {
      document.body.style.overflow = savedOverflow.body;
      document.documentElement.style.overflow = savedOverflow.root; savedOverflow = null;
    }
    var trigger = opener; opened = null; opener = null;
    if (trigger && trigger.isConnected && active()) trigger.focus({ preventScroll: true });
    syncAll();
  });

  Array.prototype.forEach.call(view.querySelectorAll('[data-project-gallery]'), function (root) {
    var gallery = { root: root, name: root.getAttribute('data-project-name'), index: null, phase: 0,
      mode: null, last: null, velocity: 0, command: null, manual: false, hover: false, focus: false, visible: false,
      autoplay: root.querySelector('[data-gallery-autoplay]'), counter: root.querySelector('[data-gallery-counter]'),
      caption: root.querySelector('[data-gallery-caption]') };
    gallery.items = Array.prototype.map.call(root.querySelectorAll('[data-capture-label]'), function (button, index) {
      var item = { button: button, label: button.getAttribute('data-capture-label'), src: button.querySelector('img').getAttribute('src') };
      button.addEventListener('click', function () { openCapture(gallery, index, button); });
      return item;
    });
    galleries.push(gallery); root.classList.add('is-orbiting'); render(gallery);
    root.querySelector('[data-gallery-prev]').addEventListener('click', function () { move(gallery, -1); });
    root.querySelector('[data-gallery-next]').addEventListener('click', function () { move(gallery, 1); });
    gallery.autoplay.addEventListener('click', function () {
      integrate(gallery, performance.now());
      gallery.manual = !gallery.manual; finish(gallery);
      if (!gallery.manual) gallery.counter.setAttribute('aria-live', 'off');
      sync(gallery);
    });
    root.addEventListener('mouseenter', function () { gallery.hover = true; sync(gallery); });
    root.addEventListener('mouseleave', function () { gallery.hover = false; sync(gallery); });
    root.addEventListener('focusin', function () { gallery.focus = true; sync(gallery); });
    root.addEventListener('focusout', function (event) { gallery.focus = root.contains(event.relatedTarget); sync(gallery); });
  });
  function measure() {
    galleries.forEach(function (gallery) {
      var rect = gallery.root.getBoundingClientRect();
      var captureWidth = window.getComputedStyle ? parseFloat(window.getComputedStyle(gallery.items[0].button).width) : gallery.items[0].button.offsetWidth;
      if (captureWidth && rect.width) gallery.clipHalf = rect.width / captureWidth * 50;
      gallery.visible = active() && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    if (!active()) closeModal();
    syncAll();
  }
  if ('IntersectionObserver' in window) {
    var visibility = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { galleries.forEach(function (gallery) {
        if (gallery.root === entry.target) gallery.visible = entry.isIntersecting;
      }); });
      syncAll();
    });
    galleries.forEach(function (gallery) { visibility.observe(gallery.root); });
  } else window.addEventListener('scroll', measure, { passive: true });
  if ('MutationObserver' in window) {
    var viewChanges = new MutationObserver(measure);
    viewChanges.observe(view, { attributes: true, attributeFilter: ['class'] });
  }
  if (reduced.addEventListener) reduced.addEventListener('change', syncAll);
  else reduced.addListener(syncAll);
  window.addEventListener('resize', measure);
  document.addEventListener('visibilitychange', syncAll);
  window.addEventListener('pagehide', function () { pageHidden = true; syncAll(); });
  window.addEventListener('pageshow', function () { pageHidden = false; measure(); });
  measure();
}());
