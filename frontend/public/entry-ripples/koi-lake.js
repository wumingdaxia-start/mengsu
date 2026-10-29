/* Shared Canvas 2D engine: browser script and Next.js CommonJS import. No WebGL/3D dependency. */
(function (root) {
  function createKoiLake(canvas, options = {}) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    const base = options.base || 'assets/';
    const photo = new Image(), fish = new Image();
    photo.src = base + 'osmanthus-koi-photo.jpg';
    fish.src = base + 'koi-swimmer.png';
    let width = 1, height = 1, active = true, elapsed = 0, last = 0, lastTouch = -1;
    let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const ripples = [];
    const petals = Array.from({ length: 14 }, (_, i) => ({
      x: ((i * .618) % 1), y: (i * .173) % 1, phase: i * 2.4, speed: .018 + (i % 4) * .004,
    }));
    const onMotion = () => { reduced = media.matches; draw(0); };
    media.addEventListener('change', onMotion);
    function resize(w, h) {
      width = Math.max(1, w); height = Math.max(1, h);
      const dpr = Math.min(devicePixelRatio || 1, width < 768 ? 1 : 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(0);
    }
    function ripple(x, y, strength = 1) {
      if (ripples.length > 14) ripples.shift();
      ripples.push({ x, y, age: 0, strength });
    }
    function move(x, y) {
      if (reduced || elapsed - lastTouch < .16) return;
      lastTouch = elapsed; ripple(x, y, .8);
    }
    function draw(dt) {
      ctx.fillStyle = '#8caba6'; ctx.fillRect(0, 0, width, height);
      if (!photo.complete || !photo.naturalWidth) return;
      // Cover-fit the reference; a 16:9 viewport is ideal, portrait crops from the centre.
      const scale = Math.max(width / photo.width, height / photo.height);
      const iw = photo.width * scale, ih = photo.height * scale;
      const ox = (width - iw) / 2, oy = (height - ih) / 2;
      ctx.drawImage(photo, ox, oy, iw, ih);
      if (reduced) return;
      // Photograph-derived fish sprites follow slow elliptical orbits around the reflected sun.
      const cx = ox + iw * .505, cy = oy + ih * .70;
      const count = width < 768 ? 4 : 7;
      if (fish.complete && fish.naturalWidth) for (let i = 0; i < count; i++) {
        const a = elapsed * (.085 + (i % 3) * .012) + i * 6.283 / count;
        const rx = iw * (.15 + (i % 3) * .023), ry = ih * (.14 + (i % 2) * .035);
        const sway = Math.sin(elapsed * 1.3 + i * 2.1);
        const x = cx + Math.cos(a) * (rx + sway * iw * .007), y = cy + Math.sin(a) * (ry + Math.cos(elapsed + i) * ih * .009);
        let deflect = 0;
        for (const r of ripples) { const distance = Math.hypot(x-r.x,y-r.y); if (distance < 100) deflect += Math.sin(r.age*3)*.06*(1-distance/100); }
        ctx.save(); ctx.translate(x, y);
        ctx.rotate(Math.atan2(ry * Math.cos(a), -rx * Math.sin(a)) + deflect + Math.sin(elapsed * 2.2 + i) * .065);
        const size = iw * (.047 + (i % 2) * .006);
        ctx.globalAlpha = .78;
        // Keep the head steady and flex the tail with three small textured sections.
        const sw = fish.naturalWidth, sh = fish.naturalHeight;
        for (let segment = 0; segment < 3; segment++) {
          const bend = Math.sin(elapsed * 4.2 + i - segment * .7) * (2 - segment) * size * .012;
          ctx.drawImage(fish, sw * segment / 3, 0, sw / 3 + .5, sh,
            -size / 2 + size * segment / 3, -size * .165 + bend, size / 3 + .5, size * .33);
        }
        ctx.restore();
      }
      // Low-opacity warm caustic glow, never flashes or obscures foreground UI.
      const glow = ctx.createRadialGradient(cx,cy,0,cx,cy,width*.17);
      glow.addColorStop(0, `rgba(255,237,172,${.045 + Math.sin(elapsed*.6)*.015})`);
      glow.addColorStop(1,'rgba(255,237,172,0)');
      ctx.fillStyle = glow; ctx.fillRect(0,0,width,height);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]; r.age += dt;
        if (r.age > 4.8) { ripples.splice(i,1); continue; }
        for (let ring = 0; ring < 3; ring++) {
          const radius = r.age * 24 + ring * 12;
          ctx.beginPath(); ctx.ellipse(r.x,r.y,radius,radius*.47,0,0,Math.PI*2);
          ctx.strokeStyle = `rgba(255,249,219,${Math.max(0,1-r.age/4.8)*.19*r.strength/(ring+1)})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
      for (let i = 0; i < (width < 768 ? 6 : petals.length); i++) {
        const p = petals[i]; p.y += dt*p.speed;
        if (p.y > 1) { ripple(p.x*width,height*.83,.45); p.y = -.03; }
        const x = (p.x + Math.sin(elapsed*.19+p.phase)*.025)*width;
        const y = p.y*height*.83;
        ctx.save(); ctx.translate(x,y); ctx.rotate(elapsed*.23+p.phase);
        ctx.fillStyle = 'rgba(255,219,116,.8)';
        ctx.beginPath(); ctx.ellipse(0,0,3,1.6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
    }
    photo.onload = () => draw(0);
    return {
      resize, move, leave() {},
      setActive(value) { active = value; if(value) draw(0); },
      render(dt, now) {
        if (!active || document.hidden || now-last < 1/30) return;
        // Existing entry passes seconds. Cap delta after tab resumes.
        const step = Math.min(Math.max(now-last,dt), .06); last = now;
        if (!reduced) elapsed += step;
        draw(reduced ? 0 : step);
      },
      destroy() { media.removeEventListener('change',onMotion); photo.onload = null; ripples.length = 0; },
    };
  }
  if (typeof module !== 'undefined') module.exports = { createKoiLake };
  if (root) root.MengsuMoonSchool = { create: createKoiLake };
})(typeof window !== 'undefined' ? window : null);
