/*! product3d.js — منتج بيلف 360° وحواليه عناصر النكهة (JS عادي، بدون مكتبات)
   الاستعمال الأسرع:  Product3D.modal({ img: صورة_المنتج, name: اسم_المنتج })
   النكهة بتنكشف تلقائياً من الاسم (ليمون، حار، شيبس، جبنة ...). */
(function (w) {
  'use strict';

  /* [ تعبير الكشف (على الاسم بعد التطبيع) , عناصر بتدور حوالين المنتج , لون الإضاءة ]
     النكهات أولاً ثم أنواع المنتجات. زيد عليها: Product3D.FLAVORS.unshift([/زعتر/,['🌿'],'#4a7c3a']) */
  var FLAVORS = [
    [/ليمون|لايم|lemon|\blime/, ['🍋', '🍋', '🍃'], '#d9e24a'],
    [/حار|شطه|هالبينو|هلابينو|فلفل|سبايسي|بوفالو|chili|chilli|\bhot\b|spicy|jalape|buffalo/, ['🌶️', '🔥', '🌶️'], '#e8321e'],
    [/كاتشب|طماطم|بندوره|tomato|ketchup/, ['🍅', '🍅'], '#e53b2c'],
    [/جبن|شيدر|cheese/, ['🧀', '🧀'], '#ffb921'],
    [/فراول|strawberr/, ['🍓', '🍓'], '#f0345a'],
    [/شوكولات|شوكلا|كاكاو|choc|cocoa/, ['🍫', '🍫'], '#8a4a24'],
    [/برتقال|orange/, ['🍊', '🍊'], '#ff9a1f'],
    [/موز(?!ار)|banana/, ['🍌', '🍌'], '#ffd83a'],
    [/مانج|mango/, ['🥭', '🥭'], '#ffb300'],
    [/توت|berry|blueberr/, ['🫐', '🫐'], '#6a5acd'],
    [/عنب|grape/, ['🍇', '🍇'], '#8e44ad'],
    [/بطيخ|watermelon/, ['🍉', '🍉'], '#ff4d5e'],
    [/تفاح|\bapple/, ['🍎', '🍎'], '#e63946'],
    [/اناناس|pineapple/, ['🍍', '🍍'], '#ffd23f'],
    [/جوز الهند|كوكونت|coconut/, ['🥥', '🥥'], '#e9e2d0'],
    [/ثوم|garlic/, ['🧄', '🧄'], '#efe9dc'],
    [/بصل|onion/, ['🧅', '🧅'], '#c98bb9'],
    [/خيار|مخلل|cucumber|pickle/, ['🥒', '🥒'], '#6fbf4a'],
    [/عسل|honey/, ['🍯', '🐝'], '#f5b301'],
    [/نعنع|mint/, ['🌿', '🌿'], '#43c59e'],
    [/قهو|coffee/, ['☕', '🫘'], '#7a4b2a'],
    [/شاي|\btea\b/, ['🍵', '🍃'], '#7fa650'],
    [/ماء|مياه|water(?!melon)/, ['💧', '💧'], '#3aa9ff'],
    /* أنواع المنتجات */
    [/بطاط|شيبس|شبس|chips|potato/, ['🥔', '🥔'], '#e6b84a'],
    [/بوشار|ذره|popcorn|\bcorn\b/, ['🍿', '🌽'], '#ffd24a'],
    [/فول سوداني|فستق|لوز|كاجو|جوز(?! الهند)|peanut|almond|\bnuts?\b/, ['🥜', '🥜'], '#b9824a'],
    [/حليب|لبن(?!ان)|milk|yogurt/, ['🥛', '🥛'], '#e8f0ff'],
    [/بسكو|كوكيز|اوريو|biscuit|cookie|oreo/, ['🍪', '🍪'], '#b07a3c']
  ];

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  var CATS = [
    [/سكاكر|حلو/, ['🍬', '🍭', '🍫'], '#ff6fa5'],
    [/مشروب/, ['🥤', '🧊', '💧'], '#3aa9ff'],
    [/منظف/, ['🫧', '✨', '🫧'], '#4cc9f0'],
    [/شخصي/, ['🧼', '🫧', '✨'], '#9b8cf5'],
    [/غذائي|مواد/, ['🌾', '🥫', '✨'], '#e6b84a']
  ];
  function detect(name, category) {
    var t = norm(name), items = [], color = null;
    FLAVORS.forEach(function (f) {
      if (f[0].test(t)) { if (!color) color = f[2]; items = items.concat(f[1]); }
    });
    if (!items.length && category) {
      var c = norm(category);
      CATS.some(function (k) { if (k[0].test(c)) { items = k[1]; color = k[2]; return true; } });
    }
    if (!items.length) { items = ['✨', '⭐', '✨']; color = '#ffd400'; }
    return { items: items, color: color };
  }

  /* صور Cloudinary: إزالة الخلفية بالرابط نفسه */
  function cld(u) {
    if (!/res\.cloudinary\.com/.test(u) || u.indexOf('/upload/') < 0 || u.indexOf('e_background_removal') >= 0) return u;
    return u.replace('/upload/', '/upload/e_background_removal/w_700,c_limit,f_png/').replace(/\.(jpe?g|webp|avif|gif)(\?.*)?$/i, '.png');
  }

  function loadImg(src, cors, cb) {
    var im = new Image();
    if (cors) im.crossOrigin = 'anonymous';
    im.onload = function () { cb(im); };
    im.onerror = function () { cb(null); };
    im.src = src;
  }

  /* قص تلقائي للخلفية السادة (أبيض أو أي لون موحّد) بدون أي خدمة خارجية */
  function prep(src, doCut, maxPx) {
    return new Promise(function (res) {
      var local = /^(data|blob):/.test(src);
      loadImg(src, !local, function (im) {
        if (!im) {
          if (local) return res(null);
          return loadImg(src, false, function (im2) { res(im2 ? { src: src, w: im2.naturalWidth, h: im2.naturalHeight } : null); });
        }
        var nw = im.naturalWidth, nh = im.naturalHeight, plain = { src: src, w: nw, h: nh };
        if (!doCut) { plain.cut = true; return res(plain); }
        try {
          var k = Math.min(1, (maxPx || 640) / Math.max(nw, nh)), W = Math.max(1, Math.round(nw * k)), H = Math.max(1, Math.round(nh * k));
          var c = document.createElement('canvas'); c.width = W; c.height = H;
          var x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(im, 0, 0, W, H);
          var d = x.getImageData(0, 0, W, H), p = d.data;
          var cs = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + W - 1) * 4];
          if (cs.some(function (j) { return p[j + 3] < 250; })) { plain.cut = true; return res(plain); }          /* شفافة أصلاً */
          var r0 = 0, g0 = 0, b0 = 0;
          cs.forEach(function (j) { r0 += p[j] / 4; g0 += p[j + 1] / 4; b0 += p[j + 2] / 4; });
          if (cs.some(function (j) { return Math.abs(p[j] - r0) + Math.abs(p[j + 1] - g0) + Math.abs(p[j + 2] - b0) > 90; })) return res(plain); /* خلفية مش موحّدة */
          var T = 56, bg = new Uint8Array(W * H), st = new Int32Array(W * H), sp = 0;
          var push = function (i) {
            if (bg[i]) return; var j = i * 4;
            if (Math.abs(p[j] - r0) + Math.abs(p[j + 1] - g0) + Math.abs(p[j + 2] - b0) < T) { bg[i] = 1; st[sp++] = i; }
          };
          for (var a = 0; a < W; a++) { push(a); push((H - 1) * W + a); }
          for (var b = 0; b < H; b++) { push(b * W); push(b * W + W - 1); }
          while (sp) {
            var i = st[--sp], px = i % W, py = (i / W) | 0;
            if (px > 0) push(i - 1); if (px < W - 1) push(i + 1); if (py > 0) push(i - W); if (py < H - 1) push(i + W);
          }
          var x0 = W, y0 = H, x1 = 0, y1 = 0;
          for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
            var q = yy * W + xx;
            if (bg[q]) { p[q * 4 + 3] = 0; continue; }
            var edge = (xx > 0 && bg[q - 1]) || (xx < W - 1 && bg[q + 1]) || (yy > 0 && bg[q - W]) || (yy < H - 1 && bg[q + W]);
            p[q * 4 + 3] = edge ? 150 : 255;
            if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
          }
          if (x1 <= x0 || y1 <= y0) return res(plain);
          x.putImageData(d, 0, 0);
          var cw = x1 - x0 + 1, ch = y1 - y0 + 1, c2 = document.createElement('canvas'); c2.width = cw; c2.height = ch;
          c2.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
          res({ src: c2.toDataURL('image/png'), w: cw, h: ch, cut: true });
        } catch (e) { res(plain); }                                                           /* CORS: نعرض الصورة كما هي */
      });
    });
  }

  var CSS =
    '.p3d{--c:#ffd400;position:relative;width:100%;height:100%;min-height:340px;perspective:1100px;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:pan-y}' +
    '.p3d:active{cursor:grabbing}' +
    '.p3d-glow{position:absolute;left:50%;top:50%;width:84%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle at 50% 45%,var(--c) 0,var(--c) 38%,transparent 71%);opacity:.9}' +
    '.p3d-sh{position:absolute;left:50%;bottom:4%;width:46%;height:5%;translate:-50% 0;border-radius:50%;background:#000;filter:blur(14px);opacity:.55}' +
    '.p3d-world{position:absolute;inset:0;transform-style:preserve-3d}' +
    '.p3d-prod{position:absolute;left:50%;top:50%;transform-style:preserve-3d}' +
    '.p3d-prod img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}' +
    '.p3d-prod .f,.p3d-prod .b{backface-visibility:hidden;-webkit-backface-visibility:hidden}' +
    '.p3d-prod .m{filter:brightness(.6)}' +
    '.p3d-it{position:absolute;left:50%;top:50%;line-height:1;pointer-events:none;will-change:transform;filter:drop-shadow(0 6px 8px #0006)}' +
    '.p3d-b{position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none;will-change:transform;background:radial-gradient(circle at 32% 28%,#fffe 0,#fff6 14%,#fff1 48%,#fff4 100%);border:1px solid #fff7}' +
    '.p3d-load{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px;border:4px solid #fff4;border-top-color:#fff;border-radius:50%;animation:p3dr .8s linear infinite}' +
    '@keyframes p3dr{to{transform:rotate(360deg)}}' +
    '.p3d-ov{position:fixed;inset:0;z-index:99999;background:#000c;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
    '.p3d-box{position:relative;width:min(94vw,640px);background:#15130f;color:#fff;border-radius:24px;padding:18px 18px 22px;text-align:center;overflow:hidden}' +
    '.p3d-sc{height:min(60vh,500px)}' +
    '.p3d-t{font-size:22px;font-weight:900;margin-top:6px}' +
    '.p3d-h{font-size:12px;opacity:.55;margin-top:4px}' +
    '.p3d-sub{opacity:.85;font-weight:700;margin-top:2px}' +
    '.p3d-add{display:block;width:100%;margin-top:14px;border:0;border-radius:12px;padding:13px 24px;background:#00b06b;color:#fff;font-weight:900;font-size:16px;font-family:inherit;cursor:pointer}' +
    '.p3d-x{position:absolute;top:10px;inset-inline-start:12px;z-index:3;width:38px;height:38px;border-radius:50%;border:0;background:#ffffff1f;color:#fff;font-size:22px;cursor:pointer}';

  function css() {
    if (document.getElementById('p3d-css')) return;
    var s = document.createElement('style'); s.id = 'p3d-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  var LIVE = [], raf = 0, T0 = 0;
  function calmMode() {
    return document.documentElement.classList.contains('no-motion') || (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function tick(now) {
    var dt = Math.min(.05, (now - T0) / 1000); T0 = now; var t = now / 1000;
    LIVE.forEach(function (S) {
      if (!S.on || !S.ready) return;
      var tt = S.calm ? 0 : t;
      if (!S.drag) { S.w += ((S.calm ? 0 : 45) - S.w) * Math.min(1, dt * 1.2); S.th += S.w * dt; }
      var k = Math.min(1, S.el.clientWidth / (540 * S.orbit), S.el.clientHeight / 480) * S.zoom;
      S.world.style.transform = 'scale(' + k + ') rotateX(-8deg)';
      S.pr.style.transform = 'rotateY(' + S.th + 'deg)';
      S.its.forEach(function (it) {
        var f = it.a + tt * it.sp, x = Math.cos(f) * it.R, z = Math.sin(f) * it.R * .85, y = it.y + Math.sin(tt * 1.4 + it.bob) * 14;
        it.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + ((tt * it.spin) % 360).toFixed(0) + 'deg)';
        it.el.style.opacity = (.55 + .45 * (z / (it.R * .85) + 1) / 2).toFixed(2);
      });
    });
    raf = LIVE.length ? requestAnimationFrame(tick) : 0;
  }

  /* o: { img, name, flavor?, items?, color?, cutout?(true), cloudinary?(false), count?, bubbles? } */
  function mount(el, o) {
    o = o || {}; css();
    var info = detect(o.flavor || o.name || '', o.category), items = (o.items && o.items.length) ? o.items : info.items;
    el.classList.add('p3d'); el.style.setProperty('--c', o.color || info.color);
    el.innerHTML = '<div class="p3d-glow"></div><div class="p3d-sh"></div><div class="p3d-world"><div class="p3d-prod"></div></div><div class="p3d-load"></div>';
    var world = el.querySelector('.p3d-world'), S = { el: el, world: world, pr: el.querySelector('.p3d-prod'), th: 0, w: 0, calm: calmMode(), drag: 0, vel: 0, lx: 0, on: true, ready: false, its: [], zoom: o.zoom || 1, orbit: o.orbit || 1 };

    var n = o.count != null ? o.count : 8, nb = o.bubbles != null ? o.bubbles : 6, i;
    for (i = 0; i < n; i++) {
      var e = document.createElement('span'); e.className = 'p3d-it'; e.textContent = items[i % items.length]; e.style.fontSize = (36 + (i % 3) * 14) + 'px';
      world.appendChild(e);
      S.its.push({ el: e, a: i / n * 6.283, R: (190 + (i % 2) * 45) * S.orbit, y: ((i * 47) % 240) - 120, sp: .45 + .1 * (i % 3), spin: 30 + i * 18, bob: i });
    }
    for (i = 0; i < nb; i++) {
      var b = document.createElement('div'), sz = 8 + (i * 7) % 20; b.className = 'p3d-b'; b.style.width = b.style.height = sz + 'px';
      world.appendChild(b);
      S.its.push({ el: b, a: i / nb * 6.283 + .4, R: (150 + (i * 37) % 150) * S.orbit, y: ((i * 53) % 260) - 130, sp: (i % 2 ? -1 : 1) * (.35 + (i % 4) * .18), spin: 0, bob: i * 2 });
    }

    var first = o.cloudinary === true ? cld(o.img) : o.img;
    prep(first, o.cutout !== false, o.maxPx).then(function (r) {
      /* 'auto': جرّب القص المجاني أولاً، ولو الخلفية معقدة استعمل Cloudinary */
      if (r && !r.cut && o.cloudinary === 'auto' && o.cutout !== false && cld(o.img) !== o.img)
        return prep(cld(o.img), true).then(function (r2) { return r2 || r; });
      return r;
    }).then(function (r) {
      if (S.dead) return;
      var ld = el.querySelector('.p3d-load'); if (ld) ld.remove();
      if (!r) { el.insertAdjacentHTML('beforeend', '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff9">تعذّر تحميل الصورة</div>'); return; }
      var a = r.w / r.h, H = Math.min(380, 300 / a), W = H * a, K = o.layers || 10, th = Math.max(8, Math.min(18, W * .08)), h = '';
      for (var j = 0; j < K; j++) {
        var z = (j / (K - 1) - .5) * th, cls = j === 0 ? 'b' : j === K - 1 ? 'f' : 'm';
        h += '<img class="' + cls + '" src="' + r.src + '" alt="" draggable="false" style="transform:translateZ(' + z.toFixed(1) + 'px)' + (cls === 'b' ? ' rotateY(180deg)' : '') + '">';
      }
      S.pr.style.cssText = 'width:' + W + 'px;height:' + H + 'px;margin:' + (-H / 2) + 'px 0 0 ' + (-W / 2) + 'px';
      S.pr.innerHTML = h; S.ready = true; S.w = S.calm ? 0 : 45;
    });

    el.addEventListener('pointerdown', function (ev) { S.drag = 1; S.lx = ev.clientX; S.vel = 0; try { el.setPointerCapture(ev.pointerId); } catch (_) { } });
    el.addEventListener('pointermove', function (ev) { if (!S.drag) return; var d = ev.clientX - S.lx; S.lx = ev.clientX; S.th += d * .7; S.vel = d * .7 * 60; });
    var up = function () { if (S.drag) { S.drag = 0; S.w = S.vel || S.w; } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    if (w.IntersectionObserver) { S.io = new IntersectionObserver(function (r) { S.on = r[0].isIntersecting; }); S.io.observe(el); }

    LIVE.push(S); if (!raf) { T0 = performance.now(); raf = requestAnimationFrame(tick); }
    S.destroy = function () { if (S.gone) return; S.gone = 1; S.dead = true; if (S.io) S.io.disconnect(); LIVE.splice(LIVE.indexOf(S), 1); el.innerHTML = ''; el.classList.remove('p3d'); };
    return S;
  }

  /* نافذة جاهزة: بتفتح عند الضغط على المنتج. اختياري: sub (السعر)، onAdd (زر أضف للسلة)، accent */
  function modal(o) {
    css();
    var ov = document.createElement('div'); ov.className = 'p3d-ov';
    ov.innerHTML = '<div class="p3d-box"><button class="p3d-x" aria-label="إغلاق">×</button><div class="p3d-sc"></div><div class="p3d-t"></div><div class="p3d-sub"></div><div class="p3d-h">اسحب المنتج لتلفّه</div><button class="p3d-add" style="display:none"></button></div>';
    ov.querySelector('.p3d-t').textContent = o.name || '';
    ov.querySelector('.p3d-sub').textContent = o.sub || '';
    var add = ov.querySelector('.p3d-add');
    if (o.onAdd) {
      add.style.display = 'block'; add.textContent = o.addText || '🛒 أضف إلى السلة';
      if (o.accent) add.style.background = o.accent;
      add.onclick = function () { o.onAdd(); close(); };
    }
    var prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
    document.body.appendChild(ov);
    var S = mount(ov.querySelector('.p3d-sc'), o);
    function close() { S.destroy(); ov.remove(); document.body.style.overflow = prevOv; document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.classList.contains('p3d-x')) close(); });
    return { close: close };
  }

  w.Product3D = { mount: mount, modal: modal, detect: detect, cld: cld, FLAVORS: FLAVORS };
})(window);
