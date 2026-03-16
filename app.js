const nameInput = document.getElementById("name");
const button = document.getElementById("btn");
const output = document.getElementById("output");

const canvas = document.getElementById("bg");
const ctx = canvas?.getContext?.("2d");

let audioCtx;
let randomizeParticleColors = () => {};
let enableVibeMode = () => {};

function playBeep(isVibe = false) {
  const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextImpl) return;

  audioCtx ??= new AudioContextImpl();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "triangle";
  if (isVibe) {
    const base = 520 + Math.random() * 260;
    const steps = [1, 1.26, 1.5, 2];
    const stepDur = 0.04;
    steps.forEach((ratio, i) => {
      osc.frequency.setValueAtTime(base * ratio, t0 + i * stepDur);
    });
  } else {
    const base = 720 + Math.random() * 340;
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(
      base * (1.35 + Math.random() * 0.25),
      t0 + 0.05,
    );
  }

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (isVibe ? 0.18 : 0.12));

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + (isVibe ? 0.2 : 0.13));
}

function greet() {
  const name = (nameInput?.value ?? "").trim();
  const message = name ? `Hello, ${name}!` : "Hello!";
  output.textContent = message;
  console.log(message);
}

button?.addEventListener("click", () => {
  const name = (nameInput?.value ?? "").trim();
  const isVibe = name.toLowerCase() === "vibe";
  enableVibeMode(isVibe);
  randomizeParticleColors();
  playBeep(isVibe);
  greet();
});
nameInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") greet();
});

if (canvas instanceof HTMLCanvasElement && ctx) {
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const particles = [];
  const constellations = [];
  let nextParticleId = 1;
  const particleCount = Math.max(
    55,
    Math.min(110, Math.floor((innerWidth * innerHeight) / 18000)),
  );
  const linkDist = 135;
  const mouse = {
    x: innerWidth * 0.5,
    y: innerHeight * 0.45,
    tx: null,
    ty: null,
  };
  let vibeMode = false;
  let globalHue = 230;

  function resize() {
    const { innerWidth: w, innerHeight: h } = window;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnParticles() {
    particles.length = 0;
    constellations.length = 0;
    nextParticleId = 1;
    for (let i = 0; i < particleCount; i++) {
      const startHue = Math.random() < 0.55 ? 290 : 190; // purple / cyan
      particles.push({
        id: nextParticleId++,
        x: rand(0, innerWidth),
        y: rand(0, innerHeight),
        vx: rand(-0.35, 0.35),
        vy: rand(-0.35, 0.35),
        r: rand(1.1, 2.3),
        hue: startHue,
        targetHue: startHue,
        isSuperstar: false,
      });
    }
  }

  function addConstellationLinksFrom(superstar, count = 3) {
    const candidates = [];
    for (const p of particles) {
      if (p === superstar) continue;
      const dx = p.x - superstar.x;
      const dy = p.y - superstar.y;
      candidates.push({ p, d2: dx * dx + dy * dy });
    }

    candidates.sort((a, b) => a.d2 - b.d2);
    const picked = candidates.slice(0, Math.min(count, candidates.length));

    for (const { p } of picked) {
      constellations.push({ a: superstar, b: p });
    }
  }

  function spawnSuperstarAt(x, y) {
    const startHue = 50; // warm / bright
    const superstar = {
      id: nextParticleId++,
      x,
      y,
      vx: rand(-0.22, 0.22),
      vy: rand(-0.22, 0.22),
      r: rand(4.2, 5.6),
      hue: startHue,
      targetHue: startHue,
      isSuperstar: true,
    };

    particles.push(superstar);
    addConstellationLinksFrom(superstar, 3);
  }

  function randomNeonHue() {
    // Biased toward punchy neons (avoid muddy yellows/greens)
    const options = [190, 210, 240, 270, 290, 310, 330];
    return options[(Math.random() * options.length) | 0] + rand(-14, 14);
  }

  function moveHueToward(current, target, amount) {
    const c = ((current % 360) + 360) % 360;
    const t = ((target % 360) + 360) % 360;
    let delta = t - c;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return c + delta * amount;
  }

  enableVibeMode = (active) => {
    vibeMode = !!active;
    if (!vibeMode) {
      globalHue = 230;
    }
  };

  randomizeParticleColors = () => {
    const newHue = randomNeonHue();
    for (const p of particles) p.targetHue = newHue;
  };

  function onMouseMove(e) {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
  }

  function onMouseLeave() {
    mouse.tx = null;
    mouse.ty = null;
  }

  function onCanvasPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnSuperstarAt(x, y);
  }

  function step() {
    const w = innerWidth;
    const h = innerHeight;

    if (mouse.tx != null && mouse.ty != null) {
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
    } else {
      mouse.x += (w * 0.5 - mouse.x) * 0.01;
      mouse.y += (h * 0.45 - mouse.y) * 0.01;
    }

    ctx.clearRect(0, 0, w, h);

    const speed = vibeMode ? 5 : 1;
    if (vibeMode) {
      globalHue = (globalHue + 3) % 360;
    }

    for (const p of particles) {
      if (vibeMode) {
        p.targetHue = globalHue;
      }
      p.hue = moveHueToward(p.hue, p.targetHue, vibeMode ? 0.2 : 0.06);

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const d2 = dx * dx + dy * dy;
      const influence = Math.max(0, 1 - d2 / (220 * 220));
      p.vx += (dx / 220) * influence * 0.012;
      p.vy += (dy / 220) * influence * 0.012;

      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vx *= vibeMode ? 0.97 : 0.985;
      p.vy *= vibeMode ? 0.97 : 0.985;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }

    // Permanent constellations (from Superstars)
    for (const link of constellations) {
      const a = link.a;
      const b = link.b;
      if (!a || !b) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      const alpha = Math.min(0.9, 0.25 + dist / 900);
      const hue = 55; // warm starlight

      ctx.strokeStyle = `hsla(${hue}, 100%, 78%, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Links
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > linkDist) continue;

        const alpha = (1 - dist / linkDist) * 0.55;
        const hue = (a.hue + b.hue) * 0.5;
        ctx.strokeStyle = `hsla(${hue}, 100%, 68%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Dots
    for (const p of particles) {
      if (p.isSuperstar) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(255, 245, 200, 0.9)";
        ctx.fillStyle = `hsla(55, 100%, 82%, 1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, 0.9)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(step);
  }

  resize();
  spawnParticles();
  window.addEventListener("resize", () => {
    resize();
  });
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("mouseleave", onMouseLeave, { passive: true });
  canvas.addEventListener("pointerdown", onCanvasPointerDown, {
    passive: true,
  });

  requestAnimationFrame(step);
}
