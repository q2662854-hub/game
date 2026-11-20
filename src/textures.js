import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function createRoadTexture() {
  const c = makeCanvas(1024, 1024);
  const ctx = c.getContext('2d');

  // Base dark wet-sheen asphalt
  ctx.fillStyle = '#1b1d24';
  ctx.fillRect(0, 0, 1024, 1024);

  // Asphalt aggregate noise
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const v = 22 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 7})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle dark tire wear grooves in each of 4 lanes
  const laneCenters = [148, 392, 632, 876];
  laneCenters.forEach((cx) => {
    const grad = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.28, 'rgba(8,9,13,0.45)');
    grad.addColorStop(0.5, 'rgba(18,20,26,0.12)');
    grad.addColorStop(0.72, 'rgba(8,9,13,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 70, 0, 140, 1024);
  });

  // Outer solid yellow-amber shoulder lines
  ctx.fillStyle = '#f5a623';
  ctx.fillRect(36, 0, 14, 1024);
  ctx.fillRect(1024 - 50, 0, 14, 1024);

  // Center double gold-amber divider
  ctx.fillStyle = '#ffbe3d';
  ctx.fillRect(500, 0, 8, 1024);
  ctx.fillRect(516, 0, 8, 1024);

  // Dashed white lane lines (left pair and right pair)
  ctx.fillStyle = 'rgba(240, 245, 255, 0.88)';
  const dashPositions = [270, 754];
  dashPositions.forEach((dx) => {
    for (let y = 30; y < 1024; y += 256) {
      ctx.fillRect(dx - 6, y, 12, 130);
    }
  });

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMagmaStoneTextures() {
  const cMap = makeCanvas(512, 512);
  const ctx = cMap.getContext('2d');
  const cEm = makeCanvas(512, 512);
  const eCtx = cEm.getContext('2d');

  // Dark basalt crust
  ctx.fillStyle = '#1f1614';
  ctx.fillRect(0, 0, 512, 512);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 512, 512);

  // Rocky mottling
  for (let i = 0; i < 450; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 6 + Math.random() * 24;
    const g = 20 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgba(${g + 8}, ${g}, ${g - 2}, 0.55)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing magma veins
  for (let i = 0; i < 36; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    const steps = 6 + Math.floor(Math.random() * 8);

    const drawVein = (targetCtx, strokeStyle, width) => {
      targetCtx.strokeStyle = strokeStyle;
      targetCtx.lineWidth = width;
      targetCtx.lineCap = 'round';
      targetCtx.beginPath();
      targetCtx.moveTo(x, y);
      let cx = x;
      let cy = y;
      const pts = [];
      for (let s = 0; s < steps; s++) {
        cx += (Math.random() - 0.5) * 95;
        cy += (Math.random() - 0.5) * 95;
        pts.push([cx, cy]);
        targetCtx.lineTo(cx, cy);
      }
      targetCtx.stroke();
      return pts;
    };

    const pts = drawVein(eCtx, 'rgba(255, 70, 0, 0.85)', 14);
    eCtx.strokeStyle = 'rgba(255, 165, 20, 0.95)';
    eCtx.lineWidth = 7;
    eCtx.beginPath();
    eCtx.moveTo(x, y);
    pts.forEach(([px, py]) => eCtx.lineTo(px, py));
    eCtx.stroke();

    eCtx.strokeStyle = '#fff5b8';
    eCtx.lineWidth = 2.6;
    eCtx.beginPath();
    eCtx.moveTo(x, y);
    pts.forEach(([px, py]) => eCtx.lineTo(px, py));
    eCtx.stroke();

    ctx.strokeStyle = '#ff6a10';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    pts.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(cEm);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

export function createWindshieldTexture(mode = 'intact') {
  const c = makeCanvas(512, 256);
  const ctx = c.getContext('2d');

  // Sleek dark reflective tinted glass gradient
  const bg = ctx.createLinearGradient(0, 0, 512, 256);
  if (mode === 'intact') {
    bg.addColorStop(0, '#1c3b57');
    bg.addColorStop(0.35, '#2b587a');
    bg.addColorStop(0.55, '#122234');
    bg.addColorStop(1, '#0c1622');
  } else if (mode === 'cracked') {
    bg.addColorStop(0, '#2a3742');
    bg.addColorStop(0.5, '#1b1d24');
    bg.addColorStop(1, '#121015');
  } else {
    bg.addColorStop(0, '#140c0a');
    bg.addColorStop(0.5, '#2b1208');
    bg.addColorStop(1, '#0c090a');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  // Diagonal specular sky reflection stripe
  if (mode === 'intact') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 224, 190, 0.28)';
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(190, 0);
    ctx.lineTo(100, 256);
    ctx.lineTo(-10, 256);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(180, 230, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(220, 0);
    ctx.lineTo(268, 0);
    ctx.lineTo(185, 256);
    ctx.lineTo(145, 256);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Border frame
  ctx.strokeStyle = 'rgba(10, 12, 16, 0.9)';
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, 512, 256);

  if (mode === 'cracked' || mode === 'shattered') {
    const cx = 256 + (Math.random() - 0.5) * 60;
    const cy = 128 + (Math.random() - 0.5) * 30;

    // Fiery scorch halo around impact point
    const scorch = ctx.createRadialGradient(cx, cy, 8, cx, cy, mode === 'shattered' ? 140 : 80);
    scorch.addColorStop(0, mode === 'shattered' ? 'rgba(255, 110, 20, 0.95)' : 'rgba(255, 140, 40, 0.55)');
    scorch.addColorStop(0.35, 'rgba(30, 14, 8, 0.85)');
    scorch.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = scorch;
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.fill();

    // Spiderweb fracture lines
    const rays = mode === 'shattered' ? 24 : 14;
    ctx.strokeStyle = 'rgba(230, 245, 255, 0.85)';
    for (let i = 0; i < rays; i++) {
      const ang = (i / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let r = 0;
      for (let s = 0; s < 5; s++) {
        r += 35 + Math.random() * 35;
        const jAng = ang + (Math.random() - 0.5) * 0.16;
        ctx.lineTo(cx + Math.cos(jAng) * r, cy + Math.sin(jAng) * r);
      }
      ctx.stroke();
    }

    // Concentric fracture rings
    const rings = mode === 'shattered' ? [28, 62, 102, 148] : [26, 58, 92];
    rings.forEach((rad) => {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        const rr = rad * (0.85 + Math.random() * 0.3);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    if (mode === 'shattered') {
      // Dark blown-out hole in center
      ctx.fillStyle = '#090404';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rr = 34 + Math.random() * 24;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGlowTexture(inner = '#ffffff', mid = '#ff8800', outer = 'rgba(255,40,0,0)') {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.32, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSmokeTexture() {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(220,220,225,0.45)');
  g.addColorStop(1, 'rgba(180,180,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBrandGrilleTexture(brandKey) {
  const c = makeCanvas(256, 96);
  const ctx = c.getContext('2d');

  // Dark grille base
  ctx.fillStyle = '#0e1015';
  ctx.fillRect(0, 0, 256, 96);

  // Subtle mesh lines
  ctx.strokeStyle = '#252934';
  ctx.lineWidth = 2;
  for (let y = 10; y < 96; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  if (brandKey === 'benz_s' || brandKey === 'benz_g') {
    // Mercedes chrome horizontal slats + iconic 3-pointed star in center!
    ctx.fillStyle = '#d4dce6';
    ctx.fillRect(10, 42, 236, 10);
    ctx.fillStyle = '#9aa6b5';
    ctx.fillRect(18, 22, 220, 4);
    ctx.fillRect(18, 70, 220, 4);

    // Outer chrome ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 48, 34, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dark emblem fill
    ctx.fillStyle = '#11151d';
    ctx.beginPath();
    ctx.arc(128, 48, 30, 0, Math.PI * 2);
    ctx.fill();

    // 3-pointed Mercedes star
    ctx.strokeStyle = '#f2f7ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    angles.forEach((a) => {
      ctx.beginPath();
      ctx.moveTo(128, 48);
      ctx.lineTo(128 + Math.cos(a) * 28, 48 + Math.sin(a) * 28);
      ctx.stroke();
    });
  } else if (brandKey === 'bmw') {
    // Iconic BMW twin kidney grilles
    const drawKidney = (x) => {
      ctx.fillStyle = '#10131a';
      ctx.strokeStyle = '#e2e9f5';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(x, 12, 92, 72, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4e586a';
      for (let vx = x + 14; vx < x + 82; vx += 14) {
        ctx.fillRect(vx, 18, 4, 60);
      }
    };
    drawKidney(24);
    drawKidney(140);
  } else if (brandKey === 'rolls') {
    // Majestic Rolls-Royce Parthenon vertical chrome bars
    ctx.strokeStyle = '#f5f0e2';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 6, 224, 84);
    ctx.fillStyle = '#e8e2d0';
    for (let x = 28; x <= 228; x += 15) {
      ctx.fillRect(x, 10, 6, 76);
    }
  } else if (brandKey === 'bugatti') {
    // Bugatti signature horseshoe grille
    ctx.strokeStyle = '#f2f6ff';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(128, 46, 38, Math.PI, 0);
    ctx.lineTo(166, 86);
    ctx.lineTo(90, 86);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#cc1b28';
    ctx.beginPath();
    ctx.ellipse(128, 22, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (brandKey === 'lamborghini' || brandKey === 'ferrari') {
    // Aggressive honeycombed intake + central golden shield
    ctx.strokeStyle = '#ffbe30';
    ctx.lineWidth = 4;
    ctx.fillStyle = brandKey === 'ferrari' ? '#ffd026' : '#181818';
    ctx.beginPath();
    ctx.moveTo(114, 22);
    ctx.lineTo(142, 22);
    ctx.lineTo(138, 62);
    ctx.lineTo(128, 76);
    ctx.lineTo(118, 62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Porsche sleek air intakes + crest
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(118, 28, 20, 32);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(118, 28, 20, 32);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
