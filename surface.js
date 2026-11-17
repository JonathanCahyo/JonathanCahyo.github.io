// Fig. 0 — a 3D loss surface drawn by hand on a 2D canvas (no library).
// A slowly breathing bowl with ripples; a marker walks downhill by gradient
// descent and leaves its path behind. Drag to rotate.
(() => {
  const canvas = document.getElementById('surface');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 26;          // grid resolution
  const R = 1.7;         // half-width of the domain
  let w = 0, h = 0, dpr = 1;
  let yaw = -0.72, pitch = 1.02;
  let yawVel = 0;
  let dragging = false, lastX = 0, lastY = 0;
  let pointerYaw = 0;    // gentle follow of the cursor
  let t = 0, visible = true, raf = 0;
  let colors = {};

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    colors = {
      ink: (cs.getPropertyValue('--mesh') || cs.getPropertyValue('--ink')).trim(),
      ink3: cs.getPropertyValue('--ink-3').trim(),
      accent: cs.getPropertyValue('--accent').trim(),
      paper: cs.getPropertyValue('--paper').trim(),
    };
  };

  // The surface: z = f(x, y, t)
  const f = (x, y, tt) =>
    0.16 * (x * x + y * y) +
    0.2 * Math.sin(1.9 * x + tt * 0.6) * Math.cos(1.7 * y - tt * 0.45) +
    0.07 * Math.sin(3.1 * (x - y) + tt * 0.3);

  const grad = (x, y, tt) => {
    const e = 0.01;
    return [
      (f(x + e, y, tt) - f(x - e, y, tt)) / (2 * e),
      (f(x, y + e, tt) - f(x, y - e, tt)) / (2 * e),
    ];
  };

  const project = (x, y, z) => {
    // centre the surface vertically, rotate (yaw about z, then pitch about x), perspective
    const zc = z - 0.35;
    const cy = Math.cos(yaw + pointerYaw), sy = Math.sin(yaw + pointerYaw);
    const x1 = x * cy - y * sy;
    const y1 = x * sy + y * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y2 = y1 * cp - zc * sp;
    const z2 = y1 * sp + zc * cp;
    const d = 6.2;
    const s = (Math.min(w, h * 1.25) * 0.172 * d) / (d + y2);
    return [w / 2 + x1 * s, h * 0.5 - z2 * s, y2];
  };

  // ── descent marker ──
  let px, py, trail;
  const restart = () => {
    const a = Math.random() * Math.PI * 2;
    px = Math.cos(a) * R * 0.86;
    py = Math.sin(a) * R * 0.86;
    trail = [];
  };
  restart();
  let rest = 0;

  const step = () => {
    const [gx, gy] = grad(px, py, t);
    const lr = 0.028;
    px -= lr * gx; py -= lr * gy;
    px = Math.max(-R, Math.min(R, px));
    py = Math.max(-R, Math.min(R, py));
    trail.push([px, py]);
    if (trail.length > 150) trail.shift();
    if (Math.hypot(gx, gy) < 0.035) { if (++rest > 90) { rest = 0; restart(); } } else rest = 0;
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const line = (pts, color, alpha, width) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.stroke();
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const P = [];
    for (let i = 0; i <= N; i++) {
      P[i] = [];
      for (let j = 0; j <= N; j++) {
        const x = -R + (2 * R * i) / N, y = -R + (2 * R * j) / N;
        P[i][j] = project(x, y, f(x, y, t));
      }
    }
    // floor frame (the "axes")
    const floor = [[-R, -R], [R, -R], [R, R], [-R, R], [-R, -R]].map(([x, y]) => project(x, y, -0.32));
    line(floor, colors.ink3, 0.55, 1);
    for (let k = 1; k < 4; k++) {
      const v = -R + (2 * R * k) / 4;
      line([project(v, -R, -0.32), project(v, R, -0.32)], colors.ink3, 0.18, 1);
      line([project(-R, v, -0.32), project(R, v, -0.32)], colors.ink3, 0.18, 1);
    }
    // mesh: far lines fainter than near ones
    const depthAlpha = (d) => 0.16 + 0.5 * Math.max(0, Math.min(1, (1.9 - d) / 3.8));
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j < N; j++) {
        const a = P[i][j], b = P[i][j + 1];
        line([a, b], colors.ink, depthAlpha((a[2] + b[2]) / 2), i % 5 === 0 ? 1.1 : 0.6);
        const c = P[j][i], e = P[j + 1][i];
        line([c, e], colors.ink, depthAlpha((c[2] + e[2]) / 2), i % 5 === 0 ? 1.1 : 0.6);
      }
    }
    // descent path + marker
    if (trail.length > 1) {
      const pts = trail.map(([x, y]) => project(x, y, f(x, y, t) + 0.015));
      for (let i = 1; i < pts.length; i++) {
        line([pts[i - 1], pts[i]], colors.accent, 0.15 + 0.85 * (i / pts.length), 2);
      }
      const [mx, my] = pts[pts.length - 1];
      const [fx, fy] = project(px, py, -0.32);
      ctx.setLineDash([2, 4]);
      line([[mx, my], [fx, fy]], colors.accent, 0.6, 1);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.paper; ctx.strokeStyle = colors.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, Math.PI * 2); ctx.fill();
      // readout
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = colors.accent;
      ctx.fillText('loss ' + f(px, py, t).toFixed(3), Math.min(mx + 10, w - 82), my - 10);
    }
    // axis labels
    ctx.globalAlpha = 0.9;
    ctx.font = '400 10.5px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = colors.ink3;
    const lx = project(R * 1.08, 0, -0.32), ly = project(0, R * 1.08, -0.32);
    ctx.fillText('θ₁', lx[0] - 6, lx[1] + 4);
    ctx.fillText('θ₂', ly[0] - 6, ly[1] + 4);
    ctx.globalAlpha = 1;
  };

  const frame = () => {
    if (!dragging) { yaw += 0.0016 + yawVel; yawVel *= 0.94; }
    t += 0.012;
    step();
    draw();
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  };

  // ── interaction ──
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    yaw += dx * 0.008; yawVel = dx * 0.0012;
    pitch = Math.max(0.55, Math.min(1.35, pitch + dy * 0.004));
    lastX = e.clientX; lastY = e.clientY;
    if (reduce) draw();
  });
  const release = () => { dragging = false; canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  window.addEventListener('pointermove', (e) => {
    if (dragging || e.pointerType !== 'mouse') return;
    const target = (e.clientX / innerWidth - 0.5) * 0.35;
    pointerYaw += (target - pointerYaw) * 0.06;
  }, { passive: true });

  // ── lifecycle ──
  new ResizeObserver(() => { resize(); if (reduce || !visible) draw(); }).observe(canvas);
  new MutationObserver(() => { readColors(); if (reduce || !visible) draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      const was = visible; visible = en.isIntersecting;
      if (visible && !was && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (visible && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  });

  readColors(); resize();
  if (reduce) { for (let i = 0; i < 60; i++) step(); draw(); }
  else raf = requestAnimationFrame(frame);
})();
