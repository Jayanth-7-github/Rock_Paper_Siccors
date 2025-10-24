import React, { useEffect, useRef } from "react";

const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const stars = [];
    const asteroids = [];
    const planets = [];
    const mouseParticles = [];

    function spawnAsteroid() {
      const startFromLeft = Math.random() > 0.5;
      const size = 2 + Math.random() * 4;
      const vx = startFromLeft
        ? 120 + Math.random() * 220
        : -(120 + Math.random() * 220);
      const vy = 30 + Math.random() * 120;
      const x = startFromLeft ? -80 : width + 80;
      const y = Math.random() * height * 0.6;
      asteroids.push({ x, y, vx, vy, size, life: 0, ttl: 6 });
    }

    function spawnPlanets() {
      planets.length = 0;
      const palette = [
        { a: "#6EE7B7", b: "#3B82F6" },
        { a: "#FDE68A", b: "#FB923C" },
        { a: "#C7B2FF", b: "#7C3AED" },
      ];
      const col = palette[Math.floor(Math.random() * palette.length)];
      const size = 18 + Math.random() * 30;
      const x = Math.random() * (width * 0.8) + width * 0.1;
      const y = Math.random() * (height * 0.6) + height * 0.05;
      planets.push({
        x,
        y,
        size,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 2,
        gradA: col.a,
        gradB: col.b,
        alpha: 0.9 - Math.random() * 0.4,
      });
    }

    const LAYERS = [
      { count: 100, size: [1.5, 3], speed: 0.02 },
      { count: 180, size: [1, 1.5], speed: 0.01 },
      { count: 260, size: [0.5, 1], speed: 0.003 },
    ];

    LAYERS.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: li,
          size: Math.random() * (layer.size[1] - layer.size[0]) + layer.size[0],
          alpha: 0.7 + Math.random() * 0.3,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.002 + Math.random() * 0.004,
          vx: (Math.random() - 0.5) * 0.02 * (li + 1),
          vy: (Math.random() - 0.5) * 0.01 * (li + 1),
        });
      }
    });

    let lastTime = performance.now();
    let spawnTimer = 0;

    function update(dt) {
      pointerRef.current.x +=
        (pointerRef.current.tx - pointerRef.current.x) * Math.min(1, dt * 6);
      pointerRef.current.y +=
        (pointerRef.current.ty - pointerRef.current.y) * Math.min(1, dt * 6);

      stars.forEach((s) => {
        s.twinkle += s.twinkleSpeed * dt;
        s.alpha = 0.7 + 0.3 * Math.abs(Math.sin(s.twinkle));
        const parallaxFactor = (s.z + 1) / (LAYERS.length + 1);
        s.x += s.vx * dt + pointerRef.current.x * 6 * parallaxFactor;
        s.y += s.vy * dt + pointerRef.current.y * 3 * parallaxFactor;
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;
        if (s.y < -10) s.y = height + 10;
        if (s.y > height + 10) s.y = -10;
      });

      for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.life += dt;
        if (
          a.life > (a.ttl || 6) ||
          a.x < -200 ||
          a.x > width + 200 ||
          a.y > height + 200
        ) {
          asteroids.splice(i, 1);
        }
      }

      for (let i = planets.length - 1; i >= 0; i--) {
        const p = planets[i];
        p.x += p.vx * dt * 0.2;
        p.y += p.vy * dt * 0.2;
        p.rotation += p.rotSpeed * dt;
        if (p.x < -300) p.x = width + 300;
        if (p.x > width + 300) p.x = -300;
      }

      // Animate mouse particles (fade out and remove)
      for (let i = mouseParticles.length - 1; i >= 0; i--) {
        const p = mouseParticles[i];
        p.life += dt;
        p.alpha = Math.max(0, 1 - p.life / p.ttl);
        p.rotation += p.rotationSpeed * dt;
        p.size *= 0.99; // shrink slightly
        if (p.life > p.ttl) mouseParticles.splice(i, 1);
      }

      spawnTimer += dt;
      if (spawnTimer > 1.5 + Math.random() * 2.5) {
        spawnTimer = 0;
        spawnAsteroid();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      planets.forEach((p) => {
        const parallaxFactor = 0.22;
        const ox = pointerRef.current.x * width * parallaxFactor;
        const oy = pointerRef.current.y * height * (parallaxFactor * 0.6);
        const cx = p.x + ox;
        const cy = p.y + oy;

        const grad = ctx.createRadialGradient(
          cx - p.size * 0.18,
          cy - p.size * 0.18,
          p.size * 0.05,
          cx,
          cy,
          p.size
        );
        grad.addColorStop(0, p.gradA);
        grad.addColorStop(0.7, p.gradB);
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.globalAlpha = p.alpha * 0.95;
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(cx, cy, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${
          0.02 + Math.min(0.12, 0.06 * (p.size / 100))
        })`;
        ctx.lineWidth = Math.max(1, p.size * 0.02);
        ctx.arc(cx, cy, p.size * 1.12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      stars.forEach((s) => {
        const glow = s.size * 1.6;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glow);
        grad.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
        grad.addColorStop(0.6, `rgba(200,220,255,${s.alpha * 0.2})`);
        grad.addColorStop(1, "rgba(20,30,40,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      asteroids.forEach((a) => {
        const trailLen = 30 + a.size * 6;
        const angle = Math.atan2(a.vy, a.vx);
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(angle);

        const g = ctx.createLinearGradient(-trailLen, 0, 0, 0);
        g.addColorStop(0, "rgba(255,200,150,0)");
        g.addColorStop(0.6, "rgba(255,200,120,0.15)");
        g.addColorStop(1, "rgba(255,230,180,0.9)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(
          -trailLen / 2,
          0,
          trailLen,
          Math.max(1, a.size * 1.2),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "rgba(255,240,200,1)";
        ctx.arc(0, 0, a.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw mouse particles (glowing stars)
      mouseParticles.forEach((p) => {
        // Draw the outer glow (reduced intensity)
        const grad = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size * 2
        );
        grad.addColorStop(0, p.color.replace(/,1\)/, `,${p.alpha * 0.4})`));
        grad.addColorStop(0.6, p.color.replace(/,1\)/, `,${p.alpha * 0.1})`));
        grad.addColorStop(1, "rgba(40,60,120,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
        ctx.fill();

        // Draw the star shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const nextAngle = ((i + 1) * Math.PI * 2) / 5;
          const innerAngle = angle + Math.PI / 5;

          if (i === 0) {
            ctx.moveTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
          }
          // Outer point
          ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
          // Inner point
          ctx.lineTo(
            Math.cos(innerAngle) * (p.size * 0.4),
            Math.sin(innerAngle) * (p.size * 0.4)
          );
        }
        ctx.closePath();
        ctx.fillStyle = p.color.replace(/,1\)/, `,${p.alpha})`);
        ctx.fill();

        // Add sparkle in the center (reduced intensity)
        const centerGrad = ctx.createRadialGradient(
          0,
          0,
          0,
          0,
          0,
          p.size * 0.4
        );
        centerGrad.addColorStop(0, `rgba(255,255,255,${p.alpha * 0.7})`);
        centerGrad.addColorStop(1, p.color.replace(/,1\)/, `,0)`));
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = centerGrad;
        ctx.fill();
        ctx.restore();
      });
    }

    function loop(now) {
      const rawDt = (now - lastTime) / 1000; // seconds
      const dt = Math.min(0.05, rawDt);
      lastTime = now;
      update(dt);
      draw();
      animationRef.current = requestAnimationFrame(loop);
    }

    let lastX = null;
    let lastY = null;
    let lastSpawnTime = 0;

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      const x = px / rect.width;
      const y = py / rect.height;
      pointerRef.current.tx = x - 0.5;
      pointerRef.current.ty = y - 0.5;

      const now = performance.now();
      const timeSinceLastSpawn = now - lastSpawnTime;

      // Create particles along the movement path
      if (lastX !== null && lastY !== null) {
        const distance = Math.hypot(px - lastX, py - lastY);
        const numParticles = Math.min(5, Math.floor(distance / 10)); // Adjust density

        if (timeSinceLastSpawn >= 16) {
          // Limit to ~60fps
          for (let i = 0; i < numParticles; i++) {
            const fraction = i / Math.max(1, numParticles - 1);
            const x = lastX + (px - lastX) * fraction;
            const y = lastY + (py - lastY) * fraction;

            // Add some randomness to position
            const spread = 2;
            const rx = x + (Math.random() - 0.5) * spread;
            const ry = y + (Math.random() - 0.5) * spread;

            mouseParticles.push({
              x: rx,
              y: ry,
              size: 3 + Math.random() * 4,
              alpha: 1,
              life: 0,
              ttl: 0.8 + Math.random() * 0.6, // seconds
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 2,
              color: `rgba(${220 + Math.random() * 35},${
                220 + Math.random() * 35
              },255,1)`,
            });
          }
          lastSpawnTime = now;
        }
      }

      lastX = px;
      lastY = py;
    }

    function onLeave() {
      pointerRef.current.tx = 0;
      pointerRef.current.ty = 0;
      lastX = null;
      lastY = null;
    }

    spawnPlanets();
    spawnAsteroid();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        style={{
          background:
            "linear-gradient(to bottom right, #111827, #1f2937, #000000)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/50" />
    </div>
  );
};

export default AnimatedBackground;
