// 3D-Projected Particle, Skid Mark, Shockwave & Floating Callout System

export class EffectSystem {
  constructor() {
    this.particles = [];
    this.skids = [];
    this.rings = [];
    this.texts = [];
  }

  clear() {
    this.particles.length = 0;
    this.skids.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
  }

  spawnGlassShatter(x, y, z, count = 28) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 8.5;
      this.particles.push({
        type: 'glass',
        x: x + (Math.random() - 0.5) * 1.1,
        y: y + (Math.random() - 0.5) * 0.4,
        z: z + (Math.random() - 0.5) * 0.6,
        vx: Math.cos(ang) * spd,
        vy: 3.5 + Math.random() * 6.5,
        vz: Math.sin(ang) * spd * 0.6 - 2.0,
        size: 0.14 + Math.random() * 0.24,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 18,
        life: 0.75 + Math.random() * 0.65,
        maxLife: 1.4,
        gravity: 20
      });
    }
  }

  spawnFireExplosion(x, y, z, scale = 1.0) {
    const count = Math.floor(24 * scale);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (2 + Math.random() * 7.5) * scale;
      this.particles.push({
        type: i % 3 === 0 ? 'ember' : 'fire',
        x: x + (Math.random() - 0.5) * 0.5,
        y: y + (Math.random() - 0.5) * 0.4,
        z: z + (Math.random() - 0.5) * 0.5,
        vx: Math.cos(ang) * spd,
        vy: (2 + Math.random() * 7.5) * scale,
        vz: Math.sin(ang) * spd * 0.6,
        size: (0.28 + Math.random() * 0.45) * scale,
        life: 0.35 + Math.random() * 0.42,
        maxLife: 0.77,
        gravity: i % 3 === 0 ? 14 : -2.5
      });
    }

    this.rings.push({
      x,
      y,
      z,
      radius: 0.35,
      maxRadius: 3.2 * scale,
      life: 0.34,
      maxLife: 0.34,
      color: scale > 1.2 ? '#ffe066' : '#ff7b24'
    });
  }

  spawnRockTrail(x, y, z, power = 1.0) {
    const count = power > 1.2 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: i === 0 ? 'fire' : 'ember',
        x: x + (Math.random() - 0.5) * 0.28 * power,
        y: y + (Math.random() - 0.5) * 0.28 * power,
        z: z + (Math.random() - 0.5) * 0.25,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 0.6 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 1.2,
        size: (0.22 + Math.random() * 0.26) * power,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        gravity: -2.0
      });
    }
  }

  spawnSmokePlume(x, y, z, intensity = 1.0) {
    this.particles.push({
      type: 'smoke',
      x: x + (Math.random() - 0.5) * 0.65,
      y: y + 0.2,
      z: z + (Math.random() - 0.5) * 0.4,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 2.2 + Math.random() * 2.1,
      vz: 1.5 + Math.random() * 1.5,
      size: (0.45 + Math.random() * 0.45) * intensity,
      life: 0.75 + Math.random() * 0.55,
      maxLife: 1.3,
      gravity: -1.4
    });

    if (Math.random() < 0.55) {
      this.particles.push({
        type: 'fire',
        x: x + (Math.random() - 0.5) * 0.5,
        y: y + 0.1,
        z,
        vx: (Math.random() - 0.5) * 1.8,
        vy: 1.8 + Math.random() * 2.6,
        vz: 0.5,
        size: 0.3 + Math.random() * 0.25,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
        gravity: -2.2
      });
    }
  }

  spawnGuardrailCrash(x, y, z, dir) {
    // Sparks + metal rail chunks
    for (let i = 0; i < 26; i++) {
      this.particles.push({
        type: i < 16 ? 'ember' : 'debris',
        x,
        y: y + Math.random() * 0.8,
        z,
        vx: dir * (2 + Math.random() * 8) + (Math.random() - 0.5) * 5,
        vy: 3 + Math.random() * 8,
        vz: (Math.random() - 0.5) * 7,
        size: i < 16 ? 0.18 + Math.random() * 0.16 : 0.24 + Math.random() * 0.28,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 16,
        life: 0.55 + Math.random() * 0.55,
        maxLife: 1.1,
        gravity: 22,
        color: i < 16 ? '#ffd86b' : '#aeb8c4'
      });
    }
    this.spawnFireExplosion(x, y + 0.5, z, 1.35);
  }

  addSkidMark(x1, z1, x2, z2) {
    if (this.skids.length > 260) {
      this.skids.shift();
    }
    this.skids.push({
      x1,
      z1,
      x2,
      z2,
      life: 4.5,
      maxLife: 4.5
    });
  }

  spawnText(sx, sy, text, color = '#ffe066', size = 22) {
    this.texts.push({
      sx,
      sy,
      text,
      color,
      size,
      vy: -68,
      life: 1.05,
      maxLife: 1.05
    });
  }

  update(dt) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.rot !== undefined) {
        p.rot += p.vrot * dt;
      }

      // Bounce glass/debris off asphalt
      if ((p.type === 'glass' || p.type === 'debris' || p.type === 'ember') && p.y < 0.05) {
        p.y = 0.05;
        p.vy = Math.abs(p.vy) * 0.38;
        p.vx *= 0.72;
        p.vz *= 0.72;
      }

      if (p.type === 'smoke') {
        p.size += dt * 1.1;
      }
    }

    // Skid marks
    for (let i = this.skids.length - 1; i >= 0; i--) {
      this.skids[i].life -= dt;
      if (this.skids[i].life <= 0) {
        this.skids.splice(i, 1);
      }
    }

    // Shockwave rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const prog = 1 - r.life / r.maxLife;
      r.radius = 0.35 + (r.maxRadius - 0.35) * (1 - Math.pow(1 - prog, 3));
    }

    // Floating texts
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.sy += t.vy * dt;
      t.vy *= Math.pow(0.2, dt);
    }
  }

  drawSkids(ctx, project) {
    if (!this.skids.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this.skids) {
      if (s.z1 < 0.5 || s.z2 < 0.5 || s.z1 > 115) continue;
      const p1 = project(s.x1, 0.02, s.z1);
      const p2 = project(s.x2, 0.02, s.z2);
      const alpha = Math.min(0.65, (s.life / s.maxLife) * 0.75);
      ctx.strokeStyle = `rgba(12, 10, 14, ${alpha})`;
      ctx.lineWidth = Math.max(1.2, p1.scale * 0.24);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx, project) {
    // Draw rings first
    for (const r of this.rings) {
      if (r.z < 0.2) continue;
      const p = project(r.x, r.y, r.z);
      const alpha = r.life / r.maxLife;
      const radPx = r.radius * p.scale;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = Math.max(2, p.scale * 0.14 * alpha);
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, radPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Smoke (normal alpha blending)
    for (const part of this.particles) {
      if (part.type !== 'smoke' || part.z < 0.2 || part.z > 120) continue;
      const p = project(part.x, part.y, part.z);
      const alpha = Math.min(0.65, (part.life / part.maxLife) * 0.72);
      const rad = Math.max(2, part.size * p.scale);
      ctx.fillStyle = `rgba(26, 22, 30, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass shards & debris
    for (const part of this.particles) {
      if ((part.type !== 'glass' && part.type !== 'debris') || part.z < 0.2 || part.z > 120) continue;
      const p = project(part.x, part.y, part.z);
      const alpha = Math.min(1, (part.life / part.maxLife) * 1.4);
      const sz = Math.max(2.2, part.size * p.scale);

      ctx.save();
      ctx.translate(p.sx, p.sy);
      ctx.rotate(part.rot);
      ctx.globalAlpha = alpha;
      if (part.type === 'glass') {
        const glint = Math.sin(part.rot * 3) > 0.35;
        ctx.fillStyle = glint ? '#ffffff' : 'rgba(182, 232, 255, 0.92)';
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.lineTo(sz * 0.75, sz * 0.25);
        ctx.lineTo(-sz * 0.55, sz * 0.85);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = part.color || '#9aa6b5';
        ctx.fillRect(-sz * 0.6, -sz * 0.3, sz * 1.2, sz * 0.6);
      }
      ctx.restore();
    }

    // Additive fire & embers
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const part of this.particles) {
      if ((part.type !== 'fire' && part.type !== 'ember') || part.z < 0.2 || part.z > 120) continue;
      const p = project(part.x, part.y, part.z);
      const ratio = part.life / part.maxLife;
      const rad = Math.max(1.5, part.size * p.scale * (part.type === 'fire' ? 0.5 + ratio * 0.7 : 0.7));

      if (part.type === 'fire') {
        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, rad);
        g.addColorStop(0, `rgba(255, 246, 178, ${ratio * 0.95})`);
        g.addColorStop(0.45, `rgba(255, 118, 22, ${ratio * 0.8})`);
        g.addColorStop(1, 'rgba(255, 36, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 222, 115, ${ratio})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawTexts(ctx) {
    if (!this.texts.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const ratio = t.life / t.maxLife;
      const pop = ratio > 0.85 ? 1 + (1 - ratio) * 1.8 : 1;
      ctx.save();
      ctx.translate(t.sx, t.sy);
      ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, ratio * 1.5);
      ctx.font = `900 ${t.size}px Vazirmatn, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(10, 5, 16, 0.88)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
}
