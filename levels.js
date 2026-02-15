/* ═══════════════════════════════════════════════
   BRAINS' NEPAL SCROLL ADVENTURE — ONE CONTINUOUS WORLD
   A single, seamless narrative journey
   ═══════════════════════════════════════════════ */

// ── Pixel Art Drawing System ──
const PixelArt = {
  scale: 4, // Scaled 2x (was 2)

  drawSVG(ctx, key, x, y, w, h, alpha = 1) {
    if (window.game && window.game.assets && window.game.assets[key]) {
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(window.game.assets[key], x, y, w, h);
      if (alpha < 1) ctx.globalAlpha = 1;
      return true;
    }
    return false;
  },

  drawPixels(ctx, ox, oy, data, s) {
    const sz = s || this.scale;
    for (let y = 0; y < data.length; y++) {
      for (let x = 0; x < data[y].length; x++) {
        if (data[y][x]) {
          ctx.fillStyle = data[y][x];
          ctx.fillRect(ox + x * sz, oy + y * sz, sz, sz);
        }
      }
    }
  },

  drawPlayer(ctx, x, y, frame, dir, time = 0) {
    const s = 10;
    const R = '#dc143c', Y = '#f5c842', B = '#3a2a1a', S = '#ffcc99', W = '#fff';
    const BK = '#5a3a1a', G = '#4a7a2a', BL = '#003893', D = '#222';
    const isBlinking = (time % 2) > 1.85;
    const eyeColor = isBlinking ? S : D;

    const topi = [
      [0, 0, R, R, R, R, R, 0, 0, 0],
      [0, R, R, Y, R, R, R, R, 0, 0],
      [R, R, R, Y, Y, R, R, R, R, 0],
    ];
    const head = [
      [0, 0, S, S, S, S, S, 0, 0, 0],
      [0, S, S, eyeColor, S, eyeColor, S, S, 0, 0],
      [0, S, S, S, S, S, S, S, 0, 0],
      [0, 0, S, S, W, S, S, 0, 0, 0],
    ];
    const body = [
      [0, BK, BL, BL, BL, BL, BK, BK, 0, 0],
      [0, BK, BL, Y, BL, BL, BK, BK, 0, 0],
      [0, 0, BL, BL, BL, BL, BK, 0, 0, 0],
      [0, 0, S, BL, BL, S, 0, 0, 0, 0],
    ];
    const legs = frame % 2 === 0
      ? [[0, 0, B, 0, 0, B, 0, 0, 0, 0], [0, 0, B, 0, 0, 0, B, 0, 0, 0]]
      : [[0, 0, 0, B, 0, B, 0, 0, 0, 0], [0, B, 0, 0, 0, B, 0, 0, 0, 0]];

    ctx.save();
    if (dir < 0) {
      ctx.translate(x + 30, 0);
      ctx.scale(-1, 1);
      x = 0;
    }
    this.drawPixels(ctx, x, y, topi, s);
    this.drawPixels(ctx, x, y + 18, head, s);
    this.drawPixels(ctx, x, y + 42, body, s);
    this.drawPixels(ctx, x, y + 66, legs, s);
    ctx.restore();
  },

  drawCoin(ctx, x, y, time, skill, worldX) {
    const bob = Math.sin(time * 3) * 12;
    const sz = 80;
    const yOff = y + bob - 80;

    // Use specific software icons ONLY within the Makura World (4000-8000)
    let iconKey = 'coins';
    if (worldX !== undefined && worldX >= 4000 && worldX < 8000) {
      if (skill === 'ps') iconKey = 'photoshop';
      else if (skill === 'ai') iconKey = 'illustrator';
      else if (skill === 'ae') iconKey = 'after_effects';
      else if (skill === 'id') iconKey = 'indesign';
      else if (skill === 'pr') iconKey = 'premiero_pro';
      else if (skill === 'xd') iconKey = 'XD';
    }

    if (this.drawSVG(ctx, iconKey, x, yOff, sz, sz)) return;

    const stretch = Math.abs(Math.cos(time * 3));
    const cx = x + sz / 2, cy = yOff + sz / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(stretch, 1);
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#f5c842'; ctx.fill();
    ctx.strokeStyle = '#b8941f'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#8a6a10';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 2);
    ctx.restore();
  },

  drawScroll(ctx, x, y, time) {
    const bob = Math.sin(time * 2) * 15;
    const sz = 100;
    const yOff = y + bob - 100;
    if (this.drawSVG(ctx, 'scroll', x, yOff, sz, sz)) return;

    const sy = yOff + sz / 2;
    ctx.save();
    ctx.translate(x + sz / 2, sy);
    ctx.fillStyle = '#e8d5a3'; ctx.fillRect(-20, -25, 40, 50);
    ctx.fillStyle = '#c4a86a'; ctx.fillRect(-25, -25, 50, 10);
    ctx.fillStyle = '#c4a86a'; ctx.fillRect(-25, 15, 50, 10);
    ctx.restore();
  },

  drawGem(ctx, x, y, time) {
    const bob = Math.sin(time * 2.5) * 12;
    const sz = 80;
    const yOff = y + bob - 80;
    if (this.drawSVG(ctx, 'items', x, yOff, sz, sz)) return;

    const hx = x + sz / 2, hy = yOff + sz / 2;
    ctx.fillStyle = '#e84060';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 20);
    ctx.bezierCurveTo(hx - 40, hy - 20, hx - 40, hy - 50, hx, hy - 30);
    ctx.bezierCurveTo(hx + 40, hy - 50, hx + 40, hy - 20, hx, hy + 20);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b02040'; ctx.lineWidth = 6;
    ctx.stroke();
  },

  drawTemple(ctx, x, y, scale = 1) {
    // Fit precisely into the 400x260 gap of the wall blocks
    if (this.drawSVG(ctx, 'makura_entrance', x, y - 260, 400, 260)) return;

    // Procedural Fallback
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const colors = ['#8b0000', '#a52a2a', '#cd5c5c'];
    for (let i = 0; i < 3; i++) {
      const w = 160 - i * 40, h = 30;
      const tx = (160 - w) / 2, ty = i * 36;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(tx - 16, ty + h); ctx.lineTo(tx + w / 2, ty);
      ctx.lineTo(tx + w + 16, ty + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a2a1a';
      ctx.fillRect(tx + 10, ty + h, w - 20, 10);
    }
    ctx.fillStyle = '#e8d5a3'; ctx.fillRect(40, 108, 80, 152); // Taller entrance
    ctx.fillStyle = '#1a110a'; ctx.fillRect(55, 140, 50, 120); // The dark doorway
    ctx.fillStyle = '#f5c842'; ctx.fillRect(76, -20, 8, 28);
    ctx.restore();
  },

  drawWizard(ctx, x, y, scale = 1, hasScroll = true) {
    const s = scale;
    if (this.drawSVG(ctx, 'wizard', x, y - 160 * s, 120 * s, 160 * s)) {
      if (hasScroll) {
        // Position scroll in his hand
        this.drawSVG(ctx, 'scroll', x - 30, y - 110 * s, 80 * s, 80 * s);
      }
      return true;
    }
    // Fallback if SVG fails
    ctx.fillStyle = '#6a5acd'; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + 30, y - 100); ctx.lineTo(x - 30, y - 100); ctx.fill();
  },

  drawSpeechBubble(ctx, x, y, text) {
    const lines = text.split('\n');
    ctx.font = '14px "Press Start 2P"';
    let maxW = 0;
    lines.forEach(l => {
      const metrics = ctx.measureText(l);
      if (metrics.width > maxW) maxW = metrics.width;
    });

    const pad = 20;
    const bw = maxW + pad * 2;
    const bh = lines.length * 24 + pad * 2;
    const bx = x - bw / 2;
    const by = y - bh;

    // Outer Border
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    // Bubble Base
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, by, bw, bh);

    // Triangle Pointer
    ctx.beginPath();
    ctx.moveTo(x - 12, by + bh);
    ctx.lineTo(x + 12, by + bh);
    ctx.lineTo(x, by + bh + 16);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Text
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.fillText(line, x, by + pad + 16 + i * 24);
    });
    ctx.textAlign = 'left';
  },

  drawRhododendron(ctx, x, y) {
    if (this.drawSVG(ctx, 'bush', x, y - 110, 192, 128)) return;
    ctx.fillStyle = '#006400';
    ctx.beginPath(); ctx.arc(x + 40, y, 48, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 88, y - 20, 56, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 140, y + 8, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff1493';
    ctx.beginPath(); ctx.arc(x + 32, y - 20, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 80, y - 48, 16, 0, Math.PI * 2); ctx.fill();
  },

  drawPortal(ctx, x, y, time) {
    for (let i = 3; i >= 0; i--) {
      const r = 60 + i * 24 + Math.sin(time * 3 + i) * 8;
      const alpha = 0.2 + (3 - i) * 0.15;
      const hue = (time * 60 + i * 30) % 360;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 4) * 0.3})`;
    ctx.beginPath(); ctx.ellipse(x, y, 30, 50, 0, 0, Math.PI * 2); ctx.fill();
  },

  drawPipe(ctx, x, y) {
    if (this.drawSVG(ctx, 'pipe', x, y, 140, 200)) return;
    const w = 120, h = 160;
    const lipW = 140, lipH = 48;
    const bodyX = x + (lipW - w) / 2;
    ctx.fillStyle = '#005c00'; ctx.fillRect(bodyX, y + lipH, w, h);
    ctx.fillStyle = '#1b9b1b'; ctx.fillRect(bodyX, y + lipH, w * 0.7, h);
    ctx.fillStyle = '#4ae24a'; ctx.fillRect(bodyX + 10, y + lipH, 24, h);
    ctx.fillStyle = '#8ff58f'; ctx.fillRect(bodyX + 16, y + lipH, 8, h);
    ctx.fillStyle = '#005c00'; ctx.fillRect(x, y, lipW, lipH);
    ctx.fillStyle = '#1b9b1b'; ctx.fillRect(x, y, lipW * 0.75, lipH);
    ctx.fillStyle = '#4ae24a'; ctx.fillRect(x + 10, y, 30, lipH);
    ctx.fillStyle = '#8ff58f'; ctx.fillRect(x + 16, y, 10, lipH);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeRect(x, y, lipW, lipH);
    ctx.strokeRect(bodyX, y + lipH, w, h);
    ctx.beginPath(); ctx.moveTo(bodyX, y + lipH); ctx.lineTo(bodyX + w, y + lipH); ctx.stroke();
  },

  drawBalloon(ctx, x, y, time, scale = 1, isBobbing = true) {
    if (window.game && window.game.assets && window.game.assets['hot_air_balloon']) {
      const bob = isBobbing ? Math.sin(time * 2) * 10 : 0;
      const bW = 200 * scale, bH = 280 * scale;
      ctx.drawImage(window.game.assets['hot_air_balloon'], x - bW / 2, y + bob - bH + (11.5 * scale), bW, bH);
      return;
    }
    const bob = isBobbing ? Math.sin(time * 2) * 10 : 0;
    const by = y + bob - 120 * scale;
    ctx.save(); ctx.translate(x, by); ctx.scale(scale, scale);
    ctx.fillStyle = '#8b4513'; ctx.fillRect(-30, 100, 60, 40);
    ctx.strokeStyle = '#5d2906'; ctx.lineWidth = 2; ctx.strokeRect(-30, 100, 60, 40);
    ctx.strokeStyle = '#deb887'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-25, 100); ctx.lineTo(-40, 70); ctx.moveTo(25, 100); ctx.lineTo(40, 70); ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, 30, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(30, 30, 0, 90); ctx.quadraticCurveTo(-30, 30, 0, -30); ctx.fill();
    ctx.restore();
  },

  drawCloud(ctx, x, y, time) {
    if (this.drawSVG(ctx, 'cloud', x, y, 160, 100, 0.9)) return;
    const drift = Math.sin(time * 0.5) * 20;
    const cx = x + drift;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, y, 30, 0, Math.PI * 2); ctx.arc(cx + 40, y - 10, 40, 0, Math.PI * 2); ctx.arc(cx + 80, y + 5, 30, 0, Math.PI * 2); ctx.arc(cx + 40, y + 20, 35, 0, Math.PI * 2); ctx.fill();
  },

  drawTorch(ctx, x, y, time) {
    if (window.game && window.game.assets && window.game.assets['candles']) {
      const flicker = Math.sin(time * 15) * 4;
      ctx.drawImage(window.game.assets['candles'], x, y, 60, 80);

      // Enchanced Glow Effect
      const grd = ctx.createRadialGradient(x + 30, y + 20, 2, x + 30, y + 20, 80 + flicker);
      grd.addColorStop(0, 'rgba(255, 200, 50, 0.4)');
      grd.addColorStop(0.3, 'rgba(255, 120, 0, 0.2)');
      grd.addColorStop(1, 'rgba(255, 50, 0, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x + 30, y + 20, 80 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#5d4037'; ctx.fillRect(x + 20, y + 20, 8, 30);
    const flicker = Math.sin(time * 10) * 4;
    ctx.fillStyle = '#ff6b35'; ctx.beginPath(); ctx.moveTo(x + 24, y + 20); ctx.quadraticCurveTo(x + 36 + flicker, y + 10, x + 24, y - 20 - flicker); ctx.quadraticCurveTo(x + 12 - flicker, y + 10, x + 24, y + 20); ctx.fill();
  },

  drawStalactite(ctx, x, y) {
    ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 32, y + 120); ctx.lineTo(x + 64, y); ctx.fill();
    ctx.fillStyle = '#34495e'; ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 32, y + 100); ctx.lineTo(x + 40, y); ctx.fill();
  },

  drawSpider(ctx, x, y, w, h) {
    this.drawSVG(ctx, 'spider', x, y, w, h);
  }
};

// ── Unified World Generation ──
function generateLevels() {
  const G = 880;
  return [
    {
      name: 'Nepal Quest', xStart: 0, xEnd: 75000,
      bgTheme: 'hills', // This will be dynamic based on X in game.js
      introText: "Brains' Journey through Nepal 🏔️\nOne world, one story.\nScroll to explore!",
      platforms: [
        // CHAPTER 1: SKILLS
        { x: 0, y: G, w: 3220, h: 120 },
        { x: 500, y: G - 100, w: 300, h: 100 },
        { x: 1000, y: G - 160, w: 240, h: 80 },
        { x: 1700, y: G - 120, w: 280, h: 80 },
        // Connecting Land
        { x: 3220, y: G, w: 1220, h: 120 },
        // THE DIVIDING WALL (Huge block separating Skills from Makura)
        { x: 4000, y: 0, w: 400, h: G - 260 }, // Giant top wall
        { x: 4000, y: G, w: 400, h: 600 },    // Solid base wall
        // CHAPTER 2: MAKURA (Ascending Corporate Ladder)
        { x: 4400, y: G, w: 200, h: 120 }, // Connecting block from gate
        { x: 4600, y: G, w: 400, h: 120 },
        { x: 5000, y: G - 120, w: 400, h: 240 },
        { x: 5400, y: G - 240, w: 400, h: 360 },
        { x: 5800, y: G - 360, w: 400, h: 480 },
        { x: 6200, y: G - 480, w: 400, h: 600 },
        { x: 6600, y: G - 600, w: 400, h: 720 },
        { x: 7000, y: G - 720, w: 1500, h: 840 }, // Summit Platform (Extended to 1500w)
        // CHAPTER 4: CAREER BREAK & BARAHI (Extended to 51000)
        { x: 9200, y: G, w: 41800, h: 120 },
        // CHAPTER 5: AI WORLD (Final Horizon) shifted to 51000
        // CHAPTER 5: AI WORLD (Land Removed for Space Void)
      ],
      collectibles: [
        // 2015 - BSc. CSIT Student
        { x: 650, y: G - 180, type: 'gem', label: 'Inventory', desc: 'MSI Laptop' },
        { x: 1120, y: G - 240, type: 'coin', skill: 'ps', label: 'Photoshop', desc: 'Somewhat knowledge' },
        { x: 1500, y: G - 100, type: 'coin', skill: 'pr', label: 'Video Editing', desc: 'Somewhat knowledge' },
        { x: 1850, y: G - 200, type: 'scroll', label: 'Achievement', desc: 'Created Rap Music video for friend' },
        { x: 2400, y: G - 100, type: 'coin', skill: 'code', label: 'Programming', desc: 'Early learning' },
        // MAKURA
        { x: 4800, y: G - 100, type: 'coin', skill: 'ps', label: 'Photoshop', desc: 'Expertise' },
        { x: 5200, y: G - 220, type: 'coin', skill: 'ai', label: 'Illustrator', desc: 'Vector Art' },
        { x: 5500, y: G - 340, type: 'coin', skill: 'ae', label: 'After Effects', desc: 'Motion Graphics' },
        { x: 5800, y: G - 460, type: 'coin', skill: 'id', label: 'InDesign', desc: 'Editorial Layout' },
        { x: 6100, y: G - 580, type: 'coin', skill: 'pr', label: 'Premiere Pro', desc: 'Video Editing' },
        { x: 6300, y: G - 700, type: 'coin', skill: 'xd', label: 'Adobe XD', desc: 'Prototyping' },
        { x: 6500, y: G - 700, type: 'coin', skill: 'code', label: 'Programming', desc: '5% still' },
        { x: 6650, y: G - 720, type: 'scroll', label: 'Achievement', desc: 'Miss Nepal 2018 Branding & Graphics Design' },
        { x: 6800, y: G - 720, type: 'scroll', label: 'Academics', desc: 'Completed Bsc. CSIT' },
        // DARAZ SKY (Balloon Flight - Vertical Ascent at X=8250)
        { x: 8250, y: G - 1000, type: 'coin', skill: 'code', label: 'Ecommerce Ad design', desc: 'Campaign Focus' },
        { x: 8200, y: G - 2000, type: 'coin', skill: 'uiux', label: 'Product Design', desc: 'User Experience' },
        { x: 8300, y: G - 3000, type: 'coin', skill: 'ai', label: 'Social Media Designs', desc: 'Digital Presence' },
        { x: 8150, y: G - 4000, type: 'coin', skill: 'ae', label: 'Motion Graphics', desc: 'Dynamic Content' },
        { x: 8250, y: G - 5000, type: 'coin', skill: 'ps', label: 'Branding', desc: 'Visual Identity' },
        // CAREER BREAK: Straight path

        // BARAHI ADVENTURE (Roller Coaster Lead-up) - Shifted 300px Left
        { x: 16700, y: G - 150, type: 'coin', skill: 'ps', label: 'Hotel Branding', desc: 'Identity Design' },
        { x: 17500, y: G - 250, type: 'coin', skill: 'id', label: 'Magazine Ads & Design', desc: 'Print Media' },
        { x: 18300, y: G - 150, type: 'gem', label: 'Hotel PMS', desc: 'System Management' },
        { x: 19100, y: G - 200, type: 'scroll', label: 'Marketing Strategies', desc: 'Campaign Planning' },

        // AI WORLD COLLECTIBLES (Shifted to 51000+)
        // AI WORLD COLLECTIBLES (Removed)
      ],
      decorations: [
        { type: 'rhododendron', x: 400, y: G },
        { type: 'rhododendron', x: 800, y: G },
        { type: 'rhododendron', x: 1200, y: G },
        { type: 'rhododendron', x: 2000, y: G },
        { type: 'rhododendron', x: 2800, y: G },
        { type: 'temple', x: 4000, y: G, scale: 1 }, // FITS EXACTLY IN WALL (4000-4400)
        { type: 'wizard', x: 3800, y: G }, // Shifted slightly left, hidden until summary trigger
        { type: 'torch', x: 4020, y: G - 100 },
        { type: 'torch', x: 4320, y: G - 100 },
        { type: 'cloud', x: 300, y: 150 },
        { type: 'cloud', x: 600, y: 100 },
        { type: 'cloud', x: 1000, y: 180 },
        { type: 'cloud', x: 1500, y: 120 },
        { type: 'cloud', x: 2200, y: 150 },
        { type: 'cloud', x: 3000, y: 80 },
        { type: 'torch', x: 4950, y: G - 240 },
        { type: 'torch', x: 5550, y: G - 360 },
        { type: 'torch', x: 6350, y: G - 600 },
        { type: 'torch', x: 7150, y: G - 840 },
        // Removed torch near balloon area
        // Stalactites removed

        // FINAL BALLOON (Chapter transition to Sky)

        // SKY CLOUDS (High visibility zone)
        { type: 'cloud', x: 7900, y: G - 1500 },
        { type: 'cloud', x: 8600, y: G - 2000 },
        { type: 'cloud', x: 7800, y: G - 3000 },
        { type: 'cloud', x: 8700, y: G - 4000 },
        { type: 'cloud', x: 8000, y: G - 5000 },
        { type: 'cloud', x: 8500, y: G - 6000 },

        { type: 'balloon', x: 8250, y: G - 742, scale: 2, noBob: true },

        // BREAK DECORATIONS
        { type: 'rhododendron', x: 9300, y: G },
        { type: 'rhododendron', x: 9600, y: G },
        { type: 'rhododendron', x: 9900, y: G },
        { type: 'rhododendron', x: 10200, y: G },
        { type: 'rhododendron', x: 10500, y: G },
        { type: 'rhododendron', x: 11200, y: G },
        { type: 'rhododendron', x: 12000, y: G },
        { type: 'rhododendron', x: 13000, y: G },
        { type: 'cloud', x: 9400, y: 150 },
        { type: 'cloud', x: 9800, y: 220 },
        { type: 'cloud', x: 10100, y: 200 },
        { type: 'cloud', x: 10500, y: 120 },
        { type: 'cloud', x: 10800, y: 100 },
        { type: 'cloud', x: 11200, y: 180 },
        { type: 'cloud', x: 11500, y: 150 },
        { type: 'cloud', x: 12500, y: 100 },
        { type: 'car', x: 14200, y: 880 },

        // BARAHI ADVENTURE FILLER (16000 - 21000)
        { type: 'rhododendron', x: 16000, y: G },
        { type: 'rhododendron', x: 17500, y: G },
        { type: 'rhododendron', x: 19000, y: G },
        { type: 'rhododendron', x: 20500, y: G },
        { type: 'cloud', x: 16500, y: 150 },
        { type: 'cloud', x: 18500, y: 220 },
        { type: 'cloud', x: 21000, y: 180 },
        { type: 'rhododendron', x: 22000, y: G },
        { type: 'rhododendron', x: 23500, y: G },
        { type: 'cloud', x: 22500, y: 150 },
        { type: 'cloud', x: 24500, y: 220 },

        // ADDING MORE FILLER FOR THE 27000 UNIT GAP
        // ADDING MORE FILLER FOR THE 27000 UNIT GAP
        { type: 'rhododendron', x: 28000, y: G },
        { type: 'rhododendron', x: 33000, y: G },
        { type: 'cloud', x: 27000, y: 150 },
        { type: 'cloud', x: 31000, y: 220 },

        // AI WORLD DECORS (Removed)

        // ROLLER COASTER FILLER (30000 - 35000)
        { type: 'cloud', x: 30000, y: 200 }
      ],
      summaryBoards: [
        { levelName: 'Background', worldX: 3800, worldY: G - 200 },
        { levelName: 'Creative Designer', worldX: 6100, worldY: G - 1560 },
        { levelName: '2018 - Daraz - Sr. Graphics Designer', worldX: 10800, worldY: G - 200 },
        { levelName: 'Design Manager', worldX: 15000, worldY: G - 200 },
        { levelName: 'AI Horizon', worldX: 51500, worldY: G - 200 }
      ],
      obstacles: []
    }
  ];
}
