const canvas = document.getElementById("fireworksCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  // Get the wrapper's size
  const wrapper = canvas.parentElement;
  const width = wrapper.offsetWidth;
  const height = wrapper.offsetHeight;
  // Set canvas drawing buffer size to match display size
  canvas.width = width;
  canvas.height = height;
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener("resize", resizeCanvas);
const btn = document.getElementById("fireworksBtn");

const NEON_COLORS = [
  "#00fff7",
  "#ff00c8",
  "#39ff14",
  "#f7ff00",
  "#ff2d00",
  "#00ffea",
  "#ff00a6",
  "#00ff90",
  "#fffb00",
  "#ff007c",
];

function randomNeonColor() {
  return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
}

function randomBetween(a, b) {
  return Math.random() * (b - a) + a;
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.radius = randomBetween(2, 5);
    this.color = color;
    this.angle = randomBetween(0, 2 * Math.PI);
    this.speed = randomBetween(2, 8);
    this.alpha = 1;
    this.decay = randomBetween(0.01, 0.03);
  }
  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.alpha -= this.decay;
    this.speed *= 0.96;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.alpha, 0);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

function launchFirework() {
  const particles = [];
  const numParticles = Math.floor(randomBetween(40, 80));
  const x = randomBetween(200, canvas.width - 200);
  const y = randomBetween(200, canvas.height - 200);
  const color = randomNeonColor();
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle(x, y, randomNeonColor()));
  }
  animateParticles(particles);
}

function animateParticles(particles) {
  function animate() {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(20, 20, 30, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    particles.forEach((p) => {
      p.update();
      p.draw(ctx);
    });
    // Remove faded particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].alpha <= 0) {
        particles.splice(i, 1);
      }
    }
    if (particles.length > 0) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

class Rocket {
  constructor(x, y, targetY, color) {
    this.x = x;
    this.y = y;
    this.targetY = targetY;
    this.color = color;
    this.radius = 6;
    this.speed = randomBetween(7, 12);
    this.exploded = false;
    this.trail = [];
  }
  update() {
    if (this.y > this.targetY) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 10) this.trail.shift();
      this.y -= this.speed;
    } else {
      this.exploded = true;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      ctx.globalAlpha = (i / this.trail.length) * 0.7;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function launchRockets() {
  resizeCanvas(); // Ensure canvas is sized before launching
  const rockets = [];
  const numRockets = Math.floor(randomBetween(3, 7));
  for (let i = 0; i < numRockets; i++) {
    const x = randomBetween(150, canvas.width - 150);
    const y = canvas.height - 10;
    const targetY = randomBetween(120, canvas.height / 2);
    rockets.push(new Rocket(x, y, targetY, randomNeonColor()));
  }
  animateRockets(rockets);
}

function animateRockets(rockets) {
  let explosions = [];
  function animate() {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(20, 20, 30, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    rockets.forEach((r) => {
      if (!r.exploded) {
        r.update();
        r.draw(ctx);
      } else if (r.exploded && !r._explosionDone) {
        const particles = [];
        const numParticles = Math.floor(randomBetween(40, 80));
        for (let i = 0; i < numParticles; i++) {
          particles.push(new Particle(r.x, r.y, randomNeonColor()));
        }
        explosions.push({ particles });
        r._explosionDone = true;
      }
    });
    // Animate explosions
    explosions.forEach((exp) => {
      exp.particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });
      // Remove faded particles
      for (let i = exp.particles.length - 1; i >= 0; i--) {
        if (exp.particles[i].alpha <= 0) {
          exp.particles.splice(i, 1);
        }
      }
    });
    // Remove finished explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      if (explosions[i].particles.length === 0) {
        explosions.splice(i, 1);
      }
    }
    // Continue animating if rockets or explosions remain
    if (rockets.some((r) => !r._explosionDone) || explosions.length > 0) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

btn.addEventListener("click", launchRockets);
