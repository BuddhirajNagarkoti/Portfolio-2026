/* ═══════════════════════════════════════════════
   BRAINS' NEPAL SCROLL ADVENTURE — GAME ENGINE
   Core engine: physics, input, camera, rendering
   ═══════════════════════════════════════════════ */

const AudioManager = {
    init() { },
    play() { },
    stop() { },
    enabled: false
};

const CONFIG = {
    WIDTH: 1920, HEIGHT: 1080,
    GRAVITY: 0.9, FRICTION: 0.93, SCROLL_ACCEL: 2.0, MAX_SPEED: 14,
    PLAYER_W: 100, PLAYER_H: 90, AUTO_JUMP_H: 240, // Scaled 2x
    PLAYER_W: 100, PLAYER_H: 90, AUTO_JUMP_H: 240, // Scaled 2x
    CAMERA_LERP: 0.08, WORLD_W: 100000, GROUND_Y: 880,
    SURFACE_LIP: 46 // Height of the visual crust surface
};

const ROLLER_COASTER_X = 20000;
const PORTAL_X = 35000;
function getRollerCoasterY(x) {
    const baseline = CONFIG.GROUND_Y - CONFIG.SURFACE_LIP;
    if (x < ROLLER_COASTER_X) return baseline;
    const relX = x - ROLLER_COASTER_X;

    // Smooth ramp-up over 800 pixels
    const ramp = Math.min(1, relX / 800);

    // Base lift moves the track up into the air (target ~100px up)
    const lift = 100 * ramp;

    // Oscillating waves (amplitude grows with ramp)
    const wave = Math.sin(relX * 0.006) * (80 * ramp);

    let y = baseline - lift + wave;

    // Initial launch dip protection (ensure we don't go below ground at start)
    return Math.min(y, baseline);
}
function getRollerCoasterSlope(x) {
    const y1 = getRollerCoasterY(x);
    const y2 = getRollerCoasterY(x + 10);
    return Math.atan2(y2 - y1, 10);
}

// ── Game State ──
const game = {
    canvas: null, ctx: null,
    state: 'START', // START | PLAYING | END | PIPE_TRANSITION
    time: 0, lastTime: 0, dt: 0,
    // Player
    player: {
        x: 200, y: 790, vx: 0, vy: 0, dir: 1, frame: 0, frameTimer: 0,
        onGround: true, coins: 0, skills: [], growthCount: 0,
        stretchX: 1, stretchY: 1,
        baseScale: 0.8, growthPerSkill: 0.1, scale: 0.8 // Scaled down to fit pipes
    },
    // Camera
    camera: { x: 0, targetX: 0, y: 0, targetY: 0 },
    // World
    // World
    levels: [], allPlatforms: [], allCollectibles: [], allDecorations: [],
    collectedIds: new Set(), currentStoryProgress: 0,
    currentLevel: 0,
    // Particles
    particles: [],
    // Popup queue
    popupQueue: [], popupTimer: 0,
    // End flag
    endFlag: null,
    // Portal
    portal: null, portalActive: false,
    // Touch
    lastTouchY: null,
    // Scroll whoosh cooldown
    whooshCD: 0,
    // Pipe cooldown to prevent immediate re-triggering
    pipeCD: 0,
    // Balloon scroll accumulator and throttle
    balloonScrollDelta: 0,
    lastBalloonUpdate: 0,
    // Intro shown
    introShown: false, introAlpha: 0,
    // Level summary signboards (in-world)
    summaryBoards: [], summaryBoardTimers: {},
    wizardSpoken: false,
    // Assets
    assets: {},
    assetsLoaded: false,
    // Juice
    floatingLabels: [],
    // Narrative Phases
    ascentMode: false, cartMode: false, confusedTimer: 0,
    // Fall Timer for crash landing
    fallTimer: 0,
    // 3-scroll trigger for balloon
    balloonScrollCount: 0, nearBalloonTarget: null, balloonLastScrollTime: 0,
    carScrollDelta: 0,
    activeCar: null,
    balloonVelocity: 0, // Smoothing velocity
    knowledgeBits: [],
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false },
    // Narrative Dialogue System
    activeDialogue: null,
    dialogueTimer: 0
};
let keys = game.keys; // Key Alias
window.game = game; // Expose globally for levels.js

// ── Init ──
async function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Asset Loading
    await loadAssets();

    // Input
    window.addEventListener('wheel', handleWheel, { passive: false });
    game.canvas.addEventListener('wheel', handleWheel, { passive: false });
    console.log('🎮 Input listeners registered');
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.getElementById('restartBtn').addEventListener('click', () => location.reload());

    // Build world
    buildWorld();

    // Start loop
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

async function loadAssets() {
    console.log('📥 Loading Environment Assets...');
    const assetFiles = [
        'bush.svg', 'candles.svg', 'cloud.svg', 'coins.svg', 'daraz goal.svg',
        'dragon.svg', 'fire.svg', 'hot air balloon.svg', 'items.svg',
        'key.svg', 'land.svg', 'makura entrance.svg', 'obstacles.svg', 'pipe.svg', 'pitch.svg', 'scroll.svg',
        'sky.svg', 'underground bg.svg', 'underground land.svg', 'underground obstacles.svg', 'wizard.svg', 'break sky.svg', 'car.svg', 'soil.svg', 'pokhara.svg', 'spider.svg',
        'photoshop.svg', 'illustrator.svg', 'after effects.svg', 'indesign.svg', 'premiero pro.svg', 'XD.svg'
    ];

    const promises = assetFiles.map(file => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const key = file.replace('.svg', '').replace(/ /g, '_');
            img.onload = () => {
                game.assets[key] = img;
                resolve();
            };
            img.onerror = () => {
                console.warn(`❌ Failed to load asset: ${file}`);
                resolve(); // Resolve anyway to allow game to start with procedural fallbacks
            };
            img.src = `Site Assets/${file}`;
        });
    });

    await Promise.all(promises);
    game.assetsLoaded = true;
    console.log('✅ All assets processed:', Object.keys(game.assets));
}

function resize() {
    const dpr = window.devicePixelRatio || 1;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Calculate best fit maintaining 16:9 aspect ratio
    const baseW = CONFIG.WIDTH;
    const baseH = CONFIG.HEIGHT;
    const scale = Math.min(winW / baseW, winH / baseH);

    const displayW = Math.floor(baseW * scale);
    const displayH = Math.floor(baseH * scale);

    // CSS size for layout
    game.canvas.style.width = `${displayW}px`;
    game.canvas.style.height = `${displayH}px`;

    // Center the canvas
    game.canvas.style.position = 'absolute';
    game.canvas.style.left = `${(winW - displayW) / 2}px`;
    game.canvas.style.top = `${(winH - displayH) / 2}px`;

    // Internal buffer size (the actual drawing resolution)
    game.canvas.width = baseW * dpr;
    game.canvas.height = baseH * dpr;

    // Scale the context so 1 unit = 1 pixel at base resolution
    game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // NEW: Crisp, high-quality rendering
    game.ctx.imageSmoothingEnabled = true;
    game.ctx.imageSmoothingQuality = 'high';
}

function buildWorld() {
    game.levels = generateLevels();
    // In the single world system, we just work with levels[0]
    const lv = game.levels[0];
    game.allPlatforms = lv.platforms;
    game.allCollectibles = lv.collectibles;
    game.allDecorations = lv.decorations;
    game.endFlag = lv.endFlag;
    game.summaryBoards = []; // Will be populated by showLevelSummary
    game.summaryBoardTimers = {};
    game.makuraEntered = false; // Initialize makuraEntered here
    game.wizardSpoken = false;

    let cid = 0;
    game.allCollectibles.forEach(c => { c.id = cid++; });
}

// ── Input ──
function handleWheel(e) {
    e.preventDefault();
    if (game.state === 'START') {
        console.log('🎡 Wheel event on START screen, deltaY:', e.deltaY);
        if (e.deltaY > 0) {
            console.log('🚀 Starting game...');
            startGame();
        }
        return;
    }
    if (game.state === 'BALLOON_RISING' || game.state === 'BALLOON_FLYING') {
        // Accumulate scroll delta
        game.balloonScrollDelta += e.deltaY;
        return;
    }
    if (game.state === 'CAR_DRIVING' || game.state === 'ROLLER_COASTER') {
        // Accumulate scroll delta for Car / Roller Coaster
        game.carScrollDelta += e.deltaY;
        return;
    }
    if (game.nearBalloonTarget && e.deltaY > 5) {
        console.log('🎈 Triggering balloon ascent!');
        game.balloonTotalScrolls = 0; // Reset counter on start
        triggerBalloon(game.nearBalloonTarget);
        game.nearBalloonTarget = null;
        return;
    }
    if (game.state !== 'PLAYING' && game.state !== 'BOSS') return;
    const scrollPower = CONFIG.SCROLL_ACCEL;
    const accel = Math.sign(e.deltaY) * scrollPower;
    game.player.vx += accel;

    // Higher max speed for car? No, matched to requested 19.5 for Career Break/Barahi
    const currentMaxSpeed = (game.player.x >= 10400) ? 9.5 : CONFIG.MAX_SPEED;
    game.player.vx = Math.max(-currentMaxSpeed, Math.min(currentMaxSpeed, game.player.vx));

    if (Math.abs(e.deltaY) > 2) game.player.dir = e.deltaY > 0 ? 1 : -1;

    if (game.whooshCD <= 0 && Math.abs(e.deltaY) > 5) {
        game.whooshCD = 8;
    }
}

function handleKeyDown(e) {
    game.keys[e.code] = true;
    if (game.state === 'START' && (e.code === 'Space' || e.code === 'Enter')) startGame();
    // Manual jump logic removed for natural narrative flow
}
function handleKeyUp(e) { game.keys[e.code] = false; }

function handleTouchStart(e) {
    if (e.touches.length) game.lastTouchY = e.touches[0].clientY;
    if (game.state === 'START') startGame();
}
function handleTouchMove(e) {
    e.preventDefault();
    if (!e.touches.length || game.lastTouchY === null) return;
    const dy = e.touches[0].clientY - game.lastTouchY;
    game.lastTouchY = e.touches[0].clientY;
    handleWheel({ deltaY: dy * 2, preventDefault: () => { } });
}

// ── Start / Restart ──
function startGame() {
    if (game.state !== 'START') return;

    game.state = 'PLAYING';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
}


// ── Physics ──
function updatePlayer() {
    const p = game.player;

    // Narrative: Pipe/Balloon Transitions (BALLOON_RISING removed to allow balloon logic to execute)
    if (game.state === 'PIPE_TRANSITION' || game.state === 'TRANSITIONING') return;

    if (game.state === 'BALLOON_RISING') {
        const b = game.targetBalloon;

        // Throttled balloon movement: Update at max 60fps
        const now = game.time;
        const throttleInterval = 1 / 60; // 60fps max

        if (now - game.lastBalloonUpdate >= throttleInterval) {
            // Apply Scroll Impulse to Velocity (Smooth Momentum)
            if (Math.abs(game.balloonScrollDelta) > 0.1) {
                // Sensitivity: 0.2 (tuned for responsiveness)
                // Negative delta = Up (usually), check sign.
                // In handleWheel: deltaY > 0 (down) -> balloonY -= (down??)
                // Original logic: balloonY -= movement.
                // movement was min(delta, 100).
                // If delta > 0, movement > 0, balloonY decreases (UP?? No, Y decreases is UP in canvas).
                // Wait. Canvas 0 is top.
                // Ground is 880.
                // Balloon starts at Ground.
                // To rise, Y must decrease.
                // Wheel Down (positive delta) usually means "scroll down" -> content moves up?
                // In handleWheel: deltaY > 0 -> start game.
                // Let's assume positive delta = "Rise" logic in previous code?
                // Previous: balloonY -= delta. So Positive Delta -> Y decreases -> Rise.
                // So: velocity -= delta * factor.

                game.balloonVelocity -= game.balloonScrollDelta * 0.15;
                game.balloonScrollDelta = 0; // Consume impulse immediately like physics kick
                game.balloonTotalScrolls = (game.balloonTotalScrolls || 0) + 1;
            }

            // Apply Velocity & Friction
            game.balloonY += game.balloonVelocity;
            game.balloonVelocity *= 0.93; // Friction (Air drag)

            // Hard limits with bounce-back damping
            if (game.balloonY < -6000) { game.balloonY = -6000; game.balloonVelocity = 0; }
            if (game.balloonY > 40) { game.balloonY = 40; game.balloonVelocity = 0; }

            game.lastBalloonUpdate = now;
        }

        // Sync positions: Center player in basket
        // Use captured start Y so we don't snap to hardcoded value
        const startY = (game.balloonStartY !== undefined) ? game.balloonStartY : (CONFIG.GROUND_Y - 360);
        const bX = b.x;
        const bY = startY + game.balloonY;

        b.y = bY;
        // Center player: Balloon width roughly 100px? at scale 2 -> 200px?
        // Let's assume center is +50 relative to x.
        const centerOffset = 0;
        p.x = bX + centerOffset - (CONFIG.PLAYER_W * p.scale / 2);
        p.vx = 0; p.dir = 1;
        // Position player feet precisely in the visual basket bottom (+11.5px per scale offset)
        p.y = b.y + (11.5 * (b.scale || 1)) - (CONFIG.PLAYER_H * p.scale);

        // DRAGON ENCOUNTER TRIGGER (Occurs during the ascent)
        if (game.balloonY <= -5100 && game.state !== 'DRAGON_ATTACK') {
            console.log('🐉 Dragon Attack Triggered!');
            game.state = 'DRAGON_ATTACK';
            game.dragonTimer = 0;
            game.dragonPhase = 0; // 0: Swoop, 1: Fire, 2: Fall
        }
        return;
    }

    if (game.state === 'BALLOON_FLYING') {
        const b = game.targetBalloon;
        if (!b) {
            game.targetBalloon = game.allDecorations.find(d => d.type === 'balloon');
            if (!game.targetBalloon) return;
        }
        const bRef = game.targetBalloon;

        const now = game.time;
        const throttleInterval = 1 / 60;

        if (now - game.lastBalloonUpdate >= throttleInterval) {
            // Smooth Momentum Logic
            if (Math.abs(game.balloonScrollDelta) > 0.1) {
                game.balloonVelocity -= game.balloonScrollDelta * 0.15;
                game.balloonScrollDelta = 0;
                game.balloonTotalScrolls = (game.balloonTotalScrolls || 0) + 1;
            }

            game.balloonY += game.balloonVelocity;
            game.balloonVelocity *= 0.93;

            if (game.balloonY > 40) { game.balloonY = 40; game.balloonVelocity = 0; }
            if (game.balloonY < -6000) { game.balloonY = -6000; game.balloonVelocity = 0; }

            game.lastBalloonUpdate = now;
        }

        const lv = game.levels[game.currentLevel];
        if (lv) {
            if (bRef.x > lv.xEnd - 200) bRef.x = lv.xEnd - 200;
            if (bRef.x < lv.xStart) bRef.x = lv.xStart;
        }

        bRef.y = (game.balloonStartY !== undefined ? game.balloonStartY : ((lv.yGround || CONFIG.GROUND_Y) - 360)) + game.balloonY;

        const centerOffset = 0;
        p.x = bRef.x + centerOffset - (CONFIG.PLAYER_W * p.scale / 2);
        p.vx = 0; p.dir = 1; p.vy = 0;
        p.y = bRef.y + (11.5 * (bRef.scale || 1)) - (CONFIG.PLAYER_H * p.scale);

        // DRAGON ENCOUNTER TRIGGER
        if (game.balloonY <= -5100 && game.state !== 'DRAGON_ATTACK') {
            game.state = 'DRAGON_ATTACK';
            game.dragonTimer = 0;
            game.dragonPhase = 0;
        }
        return;
    }

    if (game.state === 'DRAGON_ATTACK') {
        const b = game.targetBalloon || game.allDecorations.find(d => d.type === 'balloon');
        const p = game.player;
        const lv = game.levels[game.currentLevel];
        game.dragonTimer++;

        if (b) {
            b.y = (game.balloonStartY !== undefined ? game.balloonStartY : ((lv.yGround || CONFIG.GROUND_Y) - 360)) + game.balloonY;
            p.x = b.x - (CONFIG.PLAYER_W * p.scale / 2);
            p.y = b.y + (11.5 * (b.scale || 1)) - (CONFIG.PLAYER_H * p.scale);
        }
        p.vx = 0; p.vy = 0; p.dir = 1;

        if (game.dragonPhase === 0) { // Swooping in
            if (game.dragonTimer > 100) { game.dragonPhase = 1; game.dragonTimer = 0; }
        } else if (game.dragonPhase === 1) { // Breating FIRE
            if (game.dragonTimer > 120) {
                game.dragonPhase = 2;
                game.dragonTimer = 0;
                game.balloonOnFire = true;
                // showPopup removed
            }
        } else if (game.dragonPhase === 2) { // THE FALL SEQUENCE START
            game.state = 'CRASH_FALLING';
            game.fallTimer = 0;
            game.balloonOnFire = true;
            p.vy = -10; // Initial "launch" up then fall
            // Calculate vx to reach 10400 in exactly 3s (assuming 60fps -> 180 frames)
            const dist = 10400 - p.x;
            p.vx = dist / 180;
            game.targetBalloon = null;
            // showPopup removed
        }
        return;
    }

    if (game.state === 'CRASH_FALLING') {
        const p = game.player;
        game.fallTimer += game.dt || 0.016;

        if (!game.summaryBoardTimers['d_huh']) {
            game.summaryBoardTimers['d_huh'] = true;
            game.activeDialogue = "HUH????????";
            game.dialogueTimer = 180;
        }

        if (game.fallTimer < 3.0) {
            // Phase 1: Cinematic Sky Fall (Character in center via render override)
            p.vx = 0; p.vy = 0;
            p.x = 10400; // Drift towards the landing X
        } else if (game.fallTimer < 5.0) {
            // Phase 2: Coordinate Transition (Only text)
            p.vx = 0; p.vy = 0;
            p.y = -200; // Reset Y to top for Phase 3
        } else {
            // Phase 3: The Drop from Sky
            p.vy += CONFIG.GRAVITY * 1.5;
            p.y += p.vy;

            // Reach "Land" (User specified 790)
            if (p.y >= 790) { // Ground Level
                p.y = 790;
                p.vx = 0; p.vy = 0;
                game.state = 'PLAYING';
                game.balloonOnFire = false;
                spawnParticles(p.x + (CONFIG.PLAYER_W * p.scale / 2), p.y + (CONFIG.PLAYER_H * p.scale), '#888', 25);

                // Auto-open Career Break summary (Index 3)
                if (!game.summaryBoardTimers[3]) {
                    game.summaryBoardTimers[3] = true;
                    showLevelSummary(3, 10400);
                }
                // showPopup removed
            }
        }
        return;
    }

    if (game.activeCar) {
        game.activeCar.x = p.x;
        // Sync car Y with player ground Y
        // Player Y is top-left, so Ground Y is p.y + H
        // Decorations are usually anchored at Ground Y?
        // levels.js car y=880.
        game.activeCar.y = p.y + CONFIG.PLAYER_H * p.scale;
    }

    // Narrative: Confusion Lock
    if (game.confusedTimer > 0) {
        game.confusedTimer--;
        p.vx *= 0.8;
        return;
    }

    // Narrative: Ascent Mode (removed old logic)
    if (game.ascentMode) {
        p.vy = -3; // slow rise
        p.vx += (game.camera.x + CONFIG.WIDTH * 0.4 - p.x) * 0.01; // drift right
        p.x += p.vx; p.y += p.vy;
        return;
    }

    // ROLLER COASTER EVENT
    if (game.state === 'ROLLER_COASTER') {
        // CINEMATIC: Auto-acceleration
        p.vx = Math.max(p.vx, 8); // Slightly faster start
        p.vx += 0.15; // Slower build-up for longer duration

        // Slow down slightly near the portal for drama and to extend time
        // Slow down slightly near the portal for drama and to extend time
        if (p.x > 34000) p.vx *= 0.965;

        p.x = Math.max(ROLLER_COASTER_X, p.x + p.vx);

        // Locked to Roller Coaster Track
        const trackY = getRollerCoasterY(p.x);
        p.y = trackY - 135;

        // Gravity/Momentum effect: Slope affects vx
        const slope = getRollerCoasterSlope(p.x);
        p.vx -= Math.sin(slope) * 0.65; // Increased gravity response

        // Transition to AI Portal at X=35000
        if (p.x >= 35000) {
            game.state = 'AI_PORTAL';
            game.aiPortalTimer = 0;
            p.vx = 0; p.vy = 0;
        }

        // Max Speed Cap (Balanced for long ride)
        const MAX_COASTER_SPEED = 30;
        if (Math.abs(p.vx) > MAX_COASTER_SPEED) p.vx = Math.sign(p.vx) * MAX_COASTER_SPEED;

        if (game.activeCar) {
            game.activeCar.x = p.x;
            game.activeCar.y = trackY;
            game.activeCar.rotation = slope;
        }
        return;
    }

    // AI PORTAL: Sucking sequence
    if (game.state === 'AI_PORTAL') {
        game.aiPortalTimer++;
        const portalX = PORTAL_X;
        const portalY = getRollerCoasterY(portalX) - 200;

        // Pull player and car towards portal center
        p.x += (portalX - p.x) * 0.05;
        p.y += (portalY - p.y) * 0.05;

        // Shrink effect
        const scaleFactor = Math.max(0, 1 - (game.aiPortalTimer / 120));
        p.scale = 0.8 * scaleFactor;
        if (game.activeCar) {
            game.activeCar.x = p.x;
            game.activeCar.y = p.y + 135 * scaleFactor;
            game.activeCar.rotation += 0.2; // Spin into the portal
        }

        if (game.aiPortalTimer > 150) {
            // Teleport to the New World (Final Chapter) - Shifted to 52500 per request
            p.x = 52500;
            p.y = 520; // Match the new AI world height
            p.scale = 3.2;
            p.vx = 0; p.vy = 0;
            game.state = 'PLAYING';
            game.activeCar = null;
            console.log("🌌 Welcome to the AI World! You have become a giant.");
        }
        return;
    }

    // NEW: Car Driving Mode
    if (game.state === 'CAR_DRIVING') {
        // Car Physics: Scroll Accumulator (Like Balloon but horizontal)

        // consume scroll delta with smoothing
        if (Math.abs(game.carScrollDelta) > 0.1) {
            const carAccel = Math.sign(game.carScrollDelta) * CONFIG.SCROLL_ACCEL * 1.15; // Tuned multiplier (Faster response)
            p.vx += carAccel;
            // Decay delta
            game.carScrollDelta *= 0.8;
            if (Math.abs(game.carScrollDelta) < 1) game.carScrollDelta = 0;
        }

        // Dynamic Friction (Matched to default 0.93)
        p.vx *= 0.93;

        // Max Speed Cap for Car (Reduced to 8)
        const MAX_CAR_SPEED = 8;
        if (Math.abs(p.vx) > MAX_CAR_SPEED) p.vx = Math.sign(p.vx) * MAX_CAR_SPEED;

        let minCarX = (p.x >= 10400) ? 10400 : 0;
        p.x = Math.max(minCarX, p.x + p.vx);
        p.y = 775; // Reverted to 775
        p.vy = 0;

        // Sync car object position to player (visual only, player is the driver)
        if (game.activeCar) game.activeCar.x = p.x;
        return;
    }

    // AI SPACE PHYSICS: Floating in the void
    if (p.x >= 52000) {
        // High friction for control, no gravity
        p.vx *= 0.95;
        // Float at a fixed height with subtle bobbing
        const bob = Math.sin(game.time * 2.0) * 40;
        // Lock minimum X to 52500 (Spawn Point) - Cannot go back
        p.x = Math.max(52500, Math.min(CONFIG.WORLD_W - 100, p.x + p.vx));
        // Lowered Y from 520 to 650 to center player in bottom half
        p.y = 650 + bob;
        p.onGround = false;
        return;
    }

    // Normal Movement
    // Keyboard Input
    if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
        p.vx -= CONFIG.SCROLL_ACCEL * 0.5;
        p.dir = -1;
    }
    if (game.keys['ArrowRight'] || game.keys['KeyD']) {
        p.vx += CONFIG.SCROLL_ACCEL * 0.5;
        p.dir = 1;
    }

    // Friction
    p.vx *= CONFIG.FRICTION;
    if (Math.abs(p.vx) < 0.1) p.vx = 0;
    // Gravity
    p.vy += CONFIG.GRAVITY;
    // Move X
    let nx = p.x + p.vx;

    // Constrain to current level end to prevent scrolling past
    const lv = game.levels[game.currentLevel];
    if (lv && lv.isVertical) {
        // Mapping horizontal scroll to vertical ascent in end-zone
        if (p.vx !== 0) {
            p.y -= p.vx * 0.8;
            p.vx = 0;
        }
        // Align player
        nx = 8300 - (CONFIG.PLAYER_W * p.scale / 2);
        p.vx = 0;
        if (p.y < -3000) p.y = -3000;
        if (p.y > CONFIG.GROUND_Y) p.y = CONFIG.GROUND_Y;
    } else {
        const lvEnd = lv.xEnd;
        if (nx > lvEnd - 120) {
            nx = lvEnd - 120;
            p.vx = 0;
        }
    }
    // Auto-jump check: if moving into a platform side, step up
    let stepped = false;
    game.allPlatforms.forEach(pl => {
        if (nx + CONFIG.PLAYER_W > pl.x && nx < pl.x + pl.w) {
            const pTop = pl.y;
            const pBot = pl.y + pl.h;
            // Side collision: player bottom is between platform top and a jump threshold
            if (p.y + CONFIG.PLAYER_H > pTop && p.y + CONFIG.PLAYER_H <= pTop + CONFIG.AUTO_JUMP_H && p.y > pTop - CONFIG.PLAYER_H) {
                if ((p.vx > 0 && p.x + CONFIG.PLAYER_W <= pl.x + 4) || (p.vx < 0 && p.x >= pl.x + pl.w - 4)) {
                    // Auto step up
                    p.y = pTop - CONFIG.PLAYER_H;
                    p.vy = 0;
                    if (!p.onGround) p.onGround = true;
                }
            }
        }
    });
    // Physics
    // Restricted Scrolling: Prevent moving past the world limits
    let limitX = CONFIG.WORLD_W - CONFIG.PLAYER_W;
    let minX = 0;
    if (game.makuraEntered) minX = 4400; // Lock character inside Makura
    if (p.x >= 10400) minX = 10400;     // Lock back scroll in Career Break
    if (p.x >= 26225) minX = 26225;     // Lock back scroll in AI World

    p.x = Math.max(minX, Math.min(limitX, nx));
    const oldY = p.y;
    p.y += p.vy;
    p.onGround = false;

    // Platform collision (top)
    game.allPlatforms.forEach(pl => {
        if (p.x + CONFIG.PLAYER_W > pl.x && p.x < pl.x + pl.w) {
            if (p.y + CONFIG.PLAYER_H >= pl.y && p.y + CONFIG.PLAYER_H <= pl.y + pl.h + 8 && p.vy >= 0) {
                // Squash on landing
                if (!p.onGround && p.vy > 2) {
                    p.stretchX = 1.3; p.stretchY = 0.7;
                }
                p.y = pl.y - CONFIG.PLAYER_H;
                p.vy = 0;
                p.onGround = true;
            }
        }
    });

    // Landing on ground check
    if (p.y >= CONFIG.GROUND_Y - CONFIG.PLAYER_H) {
        if (!p.onGround && p.vy > 2) {
            p.stretchX = 1.3; p.stretchY = 0.7;
        }
        p.y = CONFIG.GROUND_Y - CONFIG.PLAYER_H;
        p.vy = 0;
        p.onGround = true;
    }

    // Animation
    if (Math.abs(p.vx) > 0.5) {
        p.frameTimer++;
        if (p.frameTimer > 8) { p.frame = (p.frame + 1) % 4; p.frameTimer = 0; }
    } else { p.frame = 0; }

    // Growth (Only grows from Skills World items, max 6, and 4x in AI world)
    let base = (p.x >= 25000) ? 3.2 : p.baseScale;
    const targetScale = base + (p.growthCount * p.growthPerSkill);
    p.scale += (targetScale - p.scale) * 0.1;
    // Stretch return
    p.stretchX += (1 - p.stretchX) * 0.1;
    p.stretchY += (1 - p.stretchY) * 0.1;

    // Whoosh cooldown
    if (game.whooshCD > 0) game.whooshCD--;
    // Pipe cooldown
    if (game.pipeCD > 0) game.pipeCD--;
}

function updateJuice() {
    // Update floating labels
    game.floatingLabels = game.floatingLabels.filter(l => {
        l.y -= 0.8;
        l.life -= 0.02;
        return l.life > 0;
    });
}

function checkCollisions() {
    // Safety check: Don't check collisions while transitioning
    if (game.state === 'TRANSITIONING') return;

    // Narrative Guard: Don't trigger pipes/balloons in the first moments of starting to prevent accidental snaps
    const safeToTrigger = (game.time > 1.0);

    const p = game.player;
    const px = p.x, py = p.y, pw = CONFIG.PLAYER_W, ph = CONFIG.PLAYER_H;

    if (Math.abs(p.vx) > 8 && game.whooshCD <= 0) {
        game.whooshCD = 10;
    }

    // Collectibles
    game.allCollectibles.forEach(c => {
        if (game.collectedIds.has(c.id)) return;

        // Calculate visual-aligned collision box
        const pwScaled = pw * p.scale;
        const phScaled = ph * p.scale;

        const visualX = px;
        const visualY = py + ph * (1 - p.scale); // Offset Y to match bottom anchoring

        let tol = 60;
        // ITEM MAGNET: In Daraz balloon, items gravitate to the balloon basket
        if (game.state.includes('BALLOON')) {
            const dx = (px + pwScaled / 2) - (c.x + 12);
            const dy = (py + phScaled / 2 + 80) - (c.y + 12); // Targeting the basket
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 450) {
                const speed = 0.18;
                c.x += dx * speed;
                c.y += dy * speed;
            }
            tol = 80; // Standard tolerance since they fly in now
        }

        if (visualX + pwScaled + 60 > c.x && visualX - 60 < c.x + 80 &&
            visualY + phScaled + 60 > c.y && visualY - 60 < c.y + 80) {

            game.collectedIds.add(c.id);
            p.coins++;
            if (c.skill) {
                p.skills.push(c.skill);
                // Narrative Growth: Only grow from Skills World items
                if (c.x < 4000 && p.growthCount < 6) {
                    p.growthCount++;
                }
            }
            spawnParticles(c.x + 12, c.y + 12, c.type === 'gem' ? '#ff4466' : '#f5c842', 8);

            // Floating label Juice (Updated for new skills)
            const labels = {
                ps: 'Photoshop', ai: 'Illustrator', ae: 'After Effects',
                id: 'InDesign', fi: 'Figma', pr: 'Premiere',
                js: 'JavaScript', react: 'React', py: 'Python', node: 'Node.js',
                gemini: 'Gemini AI', grok: 'Grok AI'
            };
            const txt = c.skill ? '+' + (labels[c.skill] || c.skill) : (c.type === 'gem' ? '+💖' : '+📜');
            game.floatingLabels.push({
                x: c.x + 12, y: c.y, text: txt, color: c.type === 'gem' ? '#ff4466' : '#fff', life: 1.0
            });

            showPopup(c.type === 'coin' ? '🎨' : c.type === 'scroll' ? '📜' : '💎', c.label, c.desc);
            updateHUD();
        }
    });

    // Decorations with interaction
    game.allDecorations.forEach(d => {
        const dx = Math.abs(d.x - px);
        const dy = Math.abs(d.y - py);

        const atLimit = (d.type === 'balloon' && Math.abs(px - (d.x + 50)) < 120);
        if ((dx < 120 && dy < 300) || atLimit) {
            if (d.type === 'balloon') {
                // Balloon Trigger: Auto-snap when close enough
                if (game.state === 'PLAYING' && Math.abs(d.x - px) < 80 && game.pipeCD <= 0 && safeToTrigger) {
                    console.log('🎈 Auto-triggering balloon ascent!');
                    triggerBalloon(d);
                    game.pipeCD = 120;
                }
            }
            if (d.type === 'cart' && !game.cartMode) triggerCart();
            if (d.type === 'car' && game.state === 'PLAYING') {
                if (Math.abs(d.x - px) < 180) { // Widened trigger zone
                    console.log('🚗 Entering Car Mode!');
                    game.state = 'CAR_DRIVING';
                    game.activeCar = d;
                    // Snap player to car immediately (Centered in vehicle)
                    game.player.x = d.x;
                    game.player.y = 775;
                    game.player.vx = 0;
                }
            }
        }
    });

    // Clear balloon trigger if moving away
    if (game.nearBalloonTarget) {
        const d = game.nearBalloonTarget;
        const distDx = Math.abs(d.x - px);
        const distDy = Math.abs(d.y - py);
        if (distDx > 200 || distDy > 400) {
            game.nearBalloonTarget = null;
            game.balloonScrollCount = 0;
            console.log('🎈 Balloon trigger reset (moved away)');
        }
    }

    // Trigger final end screen at world edge
    if (px > 62000) { showEnd(); }
}



// ── Level Tracking ──
// ── Story Progress ──
function updateStoryProgress() {
    const px = game.player.x;
    let displayName = "NEPAL QUEST";

    // Dialogue Timer Update
    if (game.dialogueTimer > 0) {
        game.dialogueTimer--;
        if (game.dialogueTimer <= 0) game.activeDialogue = null;
    }

    // Story Dialogue Triggers (Zone-based & Repeatable)
    function triggerDialogue(id, text, xTarget, range = 300) {
        const dist = Math.abs(px - xTarget);
        if (dist < range) {
            if (!game.summaryBoardTimers[id]) {
                game.activeDialogue = text;
                game.dialogueTimer = 240;
                game.summaryBoardTimers[id] = true;
            }
        } else if (dist > range + 200) {
            game.summaryBoardTimers[id] = false; // Allow re-triggering when returning
        }
    }

    if (game.state === 'PLAYING') {
        triggerDialogue('d_start', "Welcome to the story\nof my portfolio!", 200);
        triggerDialogue('d_journey', "Its an 11 year journey -\nkeep scrolling till the end", 2108);
        triggerDialogue('d_chasing', "Learn Hard. Work Harder.\nChase the dream", 5540);
        triggerDialogue('d_growth', "I need growth.\nTime to soar for new heights", 7705);
    }

    // Balloon Ascent Dialogues
    if (game.balloonY < -2550 && !game.summaryBoardTimers['d_dream_close']) {
        game.summaryBoardTimers['d_dream_close'] = true;
        game.activeDialogue = "I can see it.\nI am close to achieve my dream";
        game.dialogueTimer = 240;
    }
    if (game.balloonY < -3670 && !game.summaryBoardTimers['d_almost_there']) {
        game.summaryBoardTimers['d_almost_there'] = true;
        game.activeDialogue = "almost there,\ni can almost catch it";
        game.dialogueTimer = 240;
    }
    if (game.balloonY < -4420 && !game.summaryBoardTimers['d_grab_it']) {
        game.summaryBoardTimers['d_grab_it'] = true;
        game.activeDialogue = "Here it is!\nI will grab it any moment now";
        game.dialogueTimer = 240;
    }

    if (px < 4000) displayName = "2015 - BSc. CSIT Student";
    else if (px < 5580) displayName = "2015 - Intern - Makura Creations";
    else if (px < 6380) displayName = "2016 - Graphics Designer";
    else if (px < 7705) displayName = "2017 - Creative Designer";
    else if (px < 8400) displayName = "2018 - Creative Designer";
    else if (px < 10400) displayName = "2018 - Daraz - Sr. Graphics Designer";
    else if (px < 17000) displayName = "Career Break - Finding Purpose";
    else if (px < 19760) displayName = "2024 - Barahi Hospitality & Leisure";
    else if (px < 35000) displayName = "2025 - Barahi Hospitality & Leisure";
    else displayName = "2026 - AI & Future";

    // State Overrides
    if (game.state === 'ROLLER_COASTER') displayName = "BARAHI ROLLER COASTER";
    else if (game.state === 'AI_PORTAL') displayName = "AI VENTURE";

    if ((game.state.includes('BALLOON') || game.state === 'DRAGON_ATTACK' || game.state === 'CRASH_FALLING') && game.balloonY < -600) {
        if (game.balloonY < -4420) {
            displayName = "2024 - Design Manager";
        } else if (game.balloonY < -2200) {
            displayName = "2022 - Design Manager";
        } else {
            displayName = "2018 - Daraz - Sr. Graphics Designer";
        }
    }

    document.getElementById('levelName').textContent = displayName;

    // Trigger Summary Boards based on milestones (using global function)
    if (px > 2910) triggerLevelSummary(0, 2910);
    if (px > 7000) triggerLevelSummary(1, 7050);
    // Board 2 transition removed to avoid overlap with Board 3 (Design Manager)
    // Board 3 is now triggered on landing in updatePlayer()

    // ── Career Break Monologue ──
    // Career Break Monologue (Repeatable)
    triggerDialogue('cb_m1', "HUH?? I was right there.\nI was this close,", 10450);
    triggerDialogue('cb_m2', "My dream was just within\nmy arms length.", 10950);
    triggerDialogue('cb_m3', "Now I don't know where I am\nor how to reach there back again.", 11450);
    triggerDialogue('cb_m4', "It has been delayed again.", 11950);
    triggerDialogue('cb_m5', "Should I go abroad?\nShould I start something?....", 12450);
    triggerDialogue('cb_m6', "I know what i should do.\nI should not stay doing nothing.", 12950);
    triggerDialogue('cb_m7', "I will hop on any opportunity\nI get and start fresh.", 13450);
    triggerDialogue('cb_barahi_intro', "Hospitality & Service - I wonder how this\nindustry is. Its exciting! Lets gooo!", 15000);

    triggerDialogue('d_barahi_work', "Not so different than how\ni was working.", 17600);
    triggerDialogue('d_barahi_places', "I got to go to Pokhara and\nchitwan. Nice places", 18700);
    triggerDialogue('d_barahi_comfort', "I am getting comfortable in\nthis new industry", 19500);

    if (px > 26000 && px < 30000 && !game.summaryBoardTimers['d_coaster_shock']) {
        game.summaryBoardTimers['d_coaster_shock'] = true;
        game.activeDialogue = "!!!!!!!! Whats happening!!!!!!!!\nNOT AGAIN !!!!!!";
        game.dialogueTimer = 180;
    }

    // Knowledge Sequence Triggers (AI WORLD shifted to 52k+)
    if (px > 52000 && !game.summaryBoardTimers['k1']) {
        game.summaryBoardTimers['k1'] = true;
        game.floatingLabels.push({ x: px, y: game.player.y - 100, text: "ABSORBING: PROGRAMMING...", life: 2.0, color: '#00ffff' });
    }
    if (px > 53000 && !game.summaryBoardTimers['k2']) {
        game.summaryBoardTimers['k2'] = true;
        game.floatingLabels.push({ x: px, y: game.player.y - 100, text: "ABSORBING: GEN AI...", life: 2.0, color: '#ff00ff' });
    }
    if (px > 54000 && !game.summaryBoardTimers['k3']) {
        game.summaryBoardTimers['k3'] = true;
        game.floatingLabels.push({ x: px, y: game.player.y - 100, text: "ABSORBING: DEVELOPMENT...", life: 2.0, color: '#ffff00' });
    }

    // AI World Monologue Sequence (Updated & Expanded)
    if (px > 52550 && !game.summaryBoardTimers['ai_m1']) {
        game.summaryBoardTimers['ai_m1'] = true; game.activeDialogue = "Where am I? What is this place?\nWhat is this... thing coming towards me?"; game.dialogueTimer = 480;
    }
    if (px > 53200 && !game.summaryBoardTimers['ai_m2']) {
        game.summaryBoardTimers['ai_m2'] = true; game.activeDialogue = "Move me faster. Scroll. Scroll faster!\nGet these things away from me!"; game.dialogueTimer = 400;
    }
    if (px > 53900 && !game.summaryBoardTimers['ai_m3']) {
        game.summaryBoardTimers['ai_m3'] = true; game.activeDialogue = "...Wait. These things. I know them.\nMy 5% programming knowledge... it’s pulsing."; game.dialogueTimer = 480;
    }
    if (px > 54700 && !game.summaryBoardTimers['ai_m4']) {
        game.summaryBoardTimers['ai_m4'] = true; game.activeDialogue = "It’s getting stronger. Are these... codes?\nThe skills I neglected are surging, evolving."; game.dialogueTimer = 480;
    }
    if (px > 55600 && !game.summaryBoardTimers['ai_m5']) {
        game.summaryBoardTimers['ai_m5'] = true; game.activeDialogue = "I can not only design now,\nI can bring it to life."; game.dialogueTimer = 480;
    }
    if (px > 56500 && !game.summaryBoardTimers['ai_m6']) {
        game.summaryBoardTimers['ai_m6'] = true; game.activeDialogue = "The possibilities are truly endless.\nThis power. This knowledge."; game.dialogueTimer = 400;
    }
    if (px > 57200 && !game.summaryBoardTimers['ai_m7']) {
        game.summaryBoardTimers['ai_m7'] = true; game.activeDialogue = "So, all that time choosing design over\ncoding was the right path all along?"; game.dialogueTimer = 480;
    }
    if (px > 58000 && !game.summaryBoardTimers['ai_m8']) {
        game.summaryBoardTimers['ai_m8'] = true; game.activeDialogue = "The world has changed. I should too.\nI’m going to explore this new AI age."; game.dialogueTimer = 480;
    }
    if (px > 58800 && !game.summaryBoardTimers['ai_m9']) {
        game.summaryBoardTimers['ai_m9'] = true; game.activeDialogue = "Am i now a designer ? Or a developer?\nI think I have become both."; game.dialogueTimer = 400;
    }
    if (px > 59500 && !game.summaryBoardTimers['ai_m10']) {
        game.summaryBoardTimers['ai_m10'] = true; game.activeDialogue = "AI is as terrifying as it is exciting."; game.dialogueTimer = 400;
    }
    if (px > 59850 && !game.summaryBoardTimers['ai_m10b']) {
        game.summaryBoardTimers['ai_m10b'] = true; game.activeDialogue = "Anthropic’s CEO claims developers will be obsolete\nin 6 to 12 months; Elon says coding as we know it is dying..."; game.dialogueTimer = 550;
    }
    if (px > 60200 && !game.summaryBoardTimers['ai_m11']) {
        game.summaryBoardTimers['ai_m11'] = true; game.activeDialogue = "The future is not about writing lines,\nit’s about bringing ideas to functional reality."; game.dialogueTimer = 600;
    }
    if (px > 60850 && !game.summaryBoardTimers['ai_m12']) {
        game.summaryBoardTimers['ai_m12'] = true; game.activeDialogue = "Thank you for staying with me until the end."; game.dialogueTimer = 300;
    }

    // Makura Entrance Transition (Teleport to Interior)
    if (px > 4090 && !game.makuraEntered) {
        game.makuraEntered = true;
        game.player.x = 4400; // Spawn on the left edge of the interior range
        // Snap camera center to 4965 as requested
        game.camera.x = 4965 - (CONFIG.WIDTH * 0.5);

        // Dialogue
        game.activeDialogue = "Time to Learn and\ngain Experience";
        game.dialogueTimer = 240;
    }

    // Wizard Dialogue Trigger
    if (px > 3590 && px < 4090 && !game.wizardSpoken) {
        game.wizardSpoken = true;
    }

    // Roller Coaster Event Trigger (Now after Pokhara backdrop)
    if (px > 20000 && game.state === 'CAR_DRIVING') {
        game.state = 'ROLLER_COASTER';
    }
}

// ── Level Summary (In-World Signboards) ──
function triggerLevelSummary(id, x) {
    if (game.summaryBoardTimers[id] === true) return;
    game.summaryBoardTimers[id] = true;
    showLevelSummary(id, x);
}

function showLevelSummary(completedLevelIdx, customX = null) {
    const items = game.allCollectibles.filter(c => {
        // Filter by X range for single world chapters
        if (completedLevelIdx === 0) return c.x < 4000;
        if (completedLevelIdx === 1) return c.x >= 4000 && c.x < 8200;
        if (completedLevelIdx === 2) return c.x >= 8200 && c.x < 10400;
        if (completedLevelIdx === 3) return (c.x >= 10400 && c.x < 16400) || (c.x >= 8100 && c.x < 8400);
        return c.x >= 51000;
    }).filter(c => game.collectedIds.has(c.id));

    const total = game.allCollectibles.filter(c => {
        if (completedLevelIdx === 0) return c.x < 4000;
        if (completedLevelIdx === 1) return c.x >= 4000 && c.x < 8200;
        if (completedLevelIdx === 2) return c.x >= 8200 && c.x < 10400;
        if (completedLevelIdx === 3) return (c.x >= 10400 && c.x < 16400) || (c.x >= 8100 && c.x < 8400);
        return c.x >= 51000;
    }).length;

    const boardNames = ["Background", "Creative Designer", "2018 - Daraz - Sr. Graphics Designer", "Design Manager", "AI Horizon"];

    let skills = items.filter(i => i.skill).map(i => ({ skill: i.skill, label: i.label, desc: i.desc }));
    let certs = items.filter(i => i.type === 'scroll' || (i.type === 'gem' && !i.skill)).map(i => ({ label: i.label, desc: i.desc, type: i.type }));

    // SPECIAL CASE: Design Manager (Board 3)
    if (completedLevelIdx === 3) {
        // Show specific software skills
        skills = [
            { skill: 'ps', label: 'Photoshop' },
            { skill: 'ai', label: 'Illustrator' },
            { skill: 'ae', label: 'After effects' },
            { skill: 'pr', label: 'Premiere Pro' },
            { skill: 'xd', label: 'Figma' },
            { skill: 'code', label: 'Programming' }
        ];
        // Quoted expertise text will be rendered manually, so we clear certs to avoid duplication
        certs = [];
    }

    const board = {
        worldX: customX !== null ? customX : (game.player.x),
        worldY: game.state.includes('BALLOON') ? game.player.y - 400 : (game.camera.y + 120),
        levelIdx: completedLevelIdx,
        levelName: boardNames[completedLevelIdx] || "Chapter Result",
        items: items,
        totalItems: total,
        skills: skills,
        certs: certs,
        spawnTime: game.time,
    };
    game.summaryBoards.push(board);
}
function renderSummaryBoards(ctx, cam, camY, t) {
    game.summaryBoards.forEach(board => {
        // HIDE SUMMARIES based on chapter transitions
        if (board.levelIdx === 0 && game.player.x > 4100) return; // Hide Skills in Makura
        if (board.levelIdx === 1 && game.player.x > 8400) return; // Hide Makura in Daraz
        if (board.levelIdx === 2 && game.player.x > 14000) return; // Hide Daraz in Break

        // NEW: Don't show technical summaries while player is in a cinematic balloon/fall moment
        if (game.state.includes('BALLOON') || game.state === 'CRASH_FALLING') return;

        const screenX = board.worldX - cam;
        const screenY = (board.worldY || 0) - camY;
        if (screenX < -1200 || screenX > CONFIG.WIDTH + 400) return;

        const elapsed = (t - board.spawnTime) * 60;
        const alpha = Math.min(0.95, elapsed * 0.025);
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;

        const panelW = 1040, panelH = 800; // 520->1040, 400->800
        const px = screenX - panelW / 2;
        const py = screenY + 40; // 20->40
        const cx = screenX;

        // Panel background
        ctx.fillStyle = 'rgba(10,10,25,0.92)';
        ctx.fillRect(px, py, panelW, panelH);
        // Gold border
        ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 6; // 3->6
        ctx.strokeRect(px, py, panelW, panelH);
        // Inner border
        ctx.strokeStyle = 'rgba(245,200,66,0.25)'; ctx.lineWidth = 2; // 1->2
        ctx.strokeRect(px + 10, py + 10, panelW - 20, panelH - 20); // 5->10

        // Header
        ctx.fillStyle = '#f5c842';
        ctx.font = '28px "Press Start 2P"'; // 14->28
        ctx.textAlign = 'center';
        ctx.fillText(board.levelName.toUpperCase(), cx, py + 64); // 32->64

        // Divider
        ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 4; // 2->4
        ctx.beginPath(); ctx.moveTo(px + 40, py + 84); ctx.lineTo(px + panelW - 40, py + 84); ctx.stroke(); // 20->40, 42->84

        // Content
        let yOff = py + 124; // Moved up since collection count is removed
        ctx.textAlign = 'left';

        // Skills with bars
        if (board.skills && board.skills.length > 0) {
            ctx.fillStyle = '#66ccff'; ctx.font = '22px "Press Start 2P"'; // 11->22
            ctx.fillText('SKILLS', px + 40, yOff); // 20->40
            yOff += 24; // 12->24
            board.skills.forEach((sk, i) => {
                const col = i % 2;
                const rowIdx = Math.floor(i / 2);
                const rowY = yOff + rowIdx * 56; // Reduced height per row
                const colX = px + 44 + col * 480; // 480px column spacing

                // Name
                ctx.fillStyle = '#fff'; ctx.font = '16px "Press Start 2P"';
                ctx.fillText(sk.label, colX, rowY + 32);

                // Bar
                const barX = colX + 220, barW = 200, barH = 20;
                ctx.fillStyle = '#222';
                ctx.fillRect(barX, rowY + 16, barW, barH);
                const fillPct = Math.min(1, elapsed / (50 + i * 12));
                const levels = {
                    js: 0.9, react: 0.85, python: 0.8, uiux: 0.75, html: 0.95, css: 0.9, node: 0.7, git: 0.85,
                    ai: 0.92, ae: 0.88, id: 0.85, ps: 0.9, pr: 0.88, xd: 0.82,
                    code: 0.05
                };
                // Specific override for Background phase
                if (board.levelName === 'Background') {
                    if (sk.skill === 'ps') levels.ps = 0.2;
                    if (sk.skill === 'pr') levels.pr = 0.2;
                }
                if (board.levelName === 'Design Manager') {
                    levels.ps = 0.95;
                    levels.ai = 0.95;
                    levels.ae = 0.75;
                    levels.pr = 0.65;
                    levels.xd = 0.6; // Figma
                    levels.code = 0.05;
                }
                const pct = (levels[sk.skill] || 0.7) * fillPct;
                const grad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
                grad.addColorStop(0, '#f5c842'); grad.addColorStop(1, '#ff6b35');
                ctx.fillStyle = grad;
                ctx.fillRect(barX, rowY + 16, barW * pct, barH);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
                ctx.strokeRect(barX, rowY + 16, barW, barH);
            });
            yOff += Math.ceil(board.skills.length / 2) * 56 + 24;
        }

        // Certs/achievements
        if (board.certs && board.certs.length > 0) {
            yOff -= 10; // Slightly move up
            board.certs.forEach((cert, i) => {
                const row = yOff + i * 40;
                ctx.fillStyle = '#eee'; ctx.font = '16px "Press Start 2P"';
                ctx.fillText(cert.label + ' - ' + cert.desc, px + 44, row + 32);
            });
            yOff += board.certs.length * 40 + 40;
        }

        // Characteristics / Areas
        if (board.levelName === 'Background') {
            ctx.fillStyle = '#66ff66'; ctx.font = '22px "Press Start 2P"';
            ctx.fillText('CHARACTERISTICS', px + 40, yOff);
            yOff += 40;
            ctx.fillStyle = '#fff'; ctx.font = '18px "Press Start 2P"';
            ctx.fillText('Curious and motivated', px + 44, yOff);
        } else if (board.levelName === 'Creative Designer') {
            ctx.fillStyle = '#66ff66'; ctx.font = '22px "Press Start 2P"';
            ctx.fillText('EXPERIENCE', px + 40, yOff);
            yOff += 40;
            ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"';
            ctx.fillText('Graphics Design, UI UX Design, Video Editing, Motion Graphics, Branding', px + 44, yOff);
        } else if (board.levelName === 'Design Manager') {
            // Expertise
            ctx.fillStyle = '#66ff66'; ctx.font = '22px "Press Start 2P"';
            ctx.fillText('EXPERTISE', px + 40, yOff);
            yOff += 40;
            ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"';
            ctx.fillText('Ecommerce Ad Design, Product Design, Social Media Designs,', px + 44, yOff);
            yOff += 30;
            ctx.fillText('Branding & Marketing , Leadership & Management', px + 44, yOff);
            yOff += 50;

            // Projects
            ctx.fillStyle = '#66ff66'; ctx.font = '22px "Press Start 2P"';
            ctx.fillText('PROJECTS', px + 40, yOff);
            yOff += 40;
            ctx.fillStyle = '#fff'; ctx.font = '12px "Press Start 2P"';
            ctx.fillText('KV & Branding for Major Sale Campaigns:', px + 44, yOff);
            yOff += 30;
            ctx.fillText('"Daraz 11.11, Dashain Dhamaka, New Year"', px + 64, yOff);
            yOff += 50;

            // Awards
            ctx.fillStyle = '#66ff66'; ctx.font = '22px "Press Start 2P"';
            ctx.fillText('AWARDS', px + 40, yOff);
            yOff += 40;
            ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"';
            ctx.fillText('Continuous Innovation', px + 44, yOff);
        }

        // Corner dots
        ctx.fillStyle = '#f5c842';
        [[px + 8, py + 8], [px + panelW - 24, py + 8], [px + 8, py + panelH - 24], [px + panelW - 24, py + panelH - 24]].forEach(([x, y]) => {
            ctx.fillRect(x, y, 16, 16); // 4->8?, 12->24, 8->16
        });

        // Spider on corner (only for Makura zone)
        if (board.levelName === 'Creative Designer') {
            PixelArt.drawSpider(ctx, px - 60, py - 60, 160, 160);
        }

        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    });
}

// ── Camera ──
function updateCamera() {
    // Single World Camera
    const WorldW = CONFIG.WORLD_W;


    if (game.state === 'BALLOON_RISING' || game.state === 'BALLOON_FLYING' || game.state === 'DRAGON_ATTACK' || game.state === 'CRASH_FALLING' || game.state === 'ROLLER_COASTER' || game.state === 'AI_PORTAL') {
        const centerOffset = (game.state === 'CRASH_FALLING' || game.state === 'AI_PORTAL') ? 0.2 : 0.5;
        const dynamicYOffset = (game.state === 'DRAGON_ATTACK' || game.state.includes('BALLOON')) ? -200 : 0;

        // FIXED CAMERA FOR FALL: Target the landing zone's camera height immediately
        // This makes the character visibly fall from the top of the screen to the land
        // FIXED CAMERA FOR FALL: Target the landing zone's camera height immediately
        // This makes the character visibly fall from the top of the screen to the land
        if (game.state === 'CRASH_FALLING') {
            // Target ground level (simulating the player is about to land at Y=790)
            // Camera should be centered on ground level for the landing
            game.camera.targetY = 790 - (CONFIG.HEIGHT * 0.75);
        } else {
            game.camera.targetY = game.player.y - CONFIG.HEIGHT * centerOffset + dynamicYOffset;
        }

        game.camera.targetX = game.player.x - CONFIG.WIDTH * 0.5;

        const lerpX = (game.state === 'CRASH_FALLING') ? 0.1 : 0.15;
        const lerpY = (game.state === 'CRASH_FALLING') ? 0.1 : 0.15; // Move to ground faster

        game.camera.x += (game.camera.targetX - game.camera.x) * lerpX;
        game.camera.y += (game.camera.targetY - game.camera.y) * lerpY;
        return;
    }

    if (!game.camera.y) game.camera.y = 0;
    if (!game.camera.targetY) game.camera.targetY = 0;

    // Follow player, but center them more in the viewport
    game.camera.targetX = game.player.x - CONFIG.WIDTH * 0.5;

    // Constrain camera within world boundaries
    game.camera.targetX = Math.max(0, Math.min(WorldW - CONFIG.WIDTH, game.camera.targetX));

    // NEW: Lock camera at the end of Skills World (3450)
    // After player reaches 3450, camera stays fixed while character walks towards Makura entrance (4100)
    if (game.player.x < 4100) {
        const lockThreshold = 3450 - (CONFIG.WIDTH * 0.5);
        game.camera.targetX = Math.min(lockThreshold, game.camera.targetX);
    }

    // Vertical constraints
    // AI WORLD: Lock camera to center screen
    if (game.player.x >= 25000) {
        game.camera.targetY = 0;
    }
    // If we are in the sky zone (Makura end/Daraz) OR in Makura climbing section, allow going up
    else if (game.player.x > 4000 || game.state.includes('BALLOON')) {
        // Track player Y to create "climbing" effect (view moves up, so player stays lower)
        const trackY = game.player.y - CONFIG.HEIGHT * 0.7;
        const minCamY = -6000;
        const maxCamY = 0;
        game.camera.targetY = Math.max(minCamY, Math.min(maxCamY, trackY));
    } else {
        game.camera.targetY = 0; // Lock to ground for most of the world
    }

    // Vertical Lerp
    if (!game.camera.y) game.camera.y = 0;
    game.camera.x += (game.camera.targetX - game.camera.x) * CONFIG.CAMERA_LERP;
    game.camera.y += (game.camera.targetY - game.camera.y) * CONFIG.CAMERA_LERP;
}

// ── Narrative Transitions ──
// ── Narrative Transitions ──

function triggerBalloon(balloon) {
    if (game.state === 'BALLOON_RISING') return;

    game.state = 'BALLOON_RISING';
    game.player.vx = 0;
    game.player.vy = 0;

    // Position player centered in basket
    // Estimate center offset ~50px
    game.player.x = balloon.x + 50 - (CONFIG.PLAYER_W * game.player.scale / 2);
    game.balloonY = 0;
    game.balloonVelocity = 0; // Reset velocity for smooth start
    // Capture initial Y position to avoid snapping
    game.balloonStartY = balloon.y;
    game.targetBalloon = balloon;

    const overlay = document.getElementById('transitionOverlay');
    if (overlay) overlay.classList.remove('active');

    showPopup('🎈', 'UP AND AWAY!', 'To the new adventure');
}


function triggerCart() {
    game.cartMode = true;
    showPopup('🎢', 'ROLLER COASTER!', 'Hold on tight!');
}

// ── Particles ──
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        game.particles.push({
            x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 1) * 6, // 4->8, 3->6
            life: 30 + Math.random() * 20, maxLife: 50, color, size: 4 + Math.random() * 6 // 2+..3 -> 4+..6
        });
    }
}
function updateParticles() {
    game.particles = game.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        return p.life > 0;
    });
}

// ── Popup ──
function showPopup(icon, title, desc) {
    game.popupQueue.push({ icon, title, desc });
    if (game.popupQueue.length === 1) displayNextPopup();
}
function displayNextPopup() {
    if (!game.popupQueue.length) return;
    const p = game.popupQueue[0];
    const el = document.getElementById('popup');
    document.getElementById('popupIcon').textContent = p.icon;
    document.getElementById('popupTitle').textContent = p.title;
    document.getElementById('popupDesc').textContent = p.desc;
    el.classList.remove('hidden', 'hiding');
    game.popupTimer = 120; // ~2 sec
}
function updatePopup() {
    if (game.popupTimer > 0) {
        game.popupTimer--;
        if (game.popupTimer === 0) {
            document.getElementById('popup').classList.add('hiding');
            setTimeout(() => {
                document.getElementById('popup').classList.add('hidden');
                game.popupQueue.shift();
                if (game.popupQueue.length) setTimeout(displayNextPopup, 50);
            }, 100);
        }
    }
}

// ── HUD ──
function updateHUD() {
    const p = game.player;
    // document.getElementById('coins').textContent = '✨ ' + p.coins;
}

// ── End Screen ──
function showEnd() {
    game.state = 'END';
    document.getElementById('hud').classList.add('hidden');
    const rs = document.getElementById('resumeSummary');
    if (rs) {
        rs.innerHTML = `
            <p><span class="resume-label">SKILLS:</span> Graphics Design, UI UX Design, Video Editing, Motion Graphics</p>
            <p><span class="resume-label">SOFTWARES:</span> All Adobe Products, Figma, Google Antigravity, VS Code</p>
            <p><span class="resume-label">FROM:</span> Lalitpur, Nepal</p>
            <p><span class="resume-label">ROLE:</span> Creative Thinker & Problem Solver</p>
            <p><span class="resume-label">STATUS:</span> Designer with AI Enthusiasm & Vibe coding software developer</p>
        `;
    }

    const cl = document.getElementById('contactLinks');
    if (cl) {
        cl.innerHTML = `
            <a href="https://www.linkedin.com/in/buddhiraj-nagarkoti-42ba97125/" target="_blank" class="contact-btn">LinkedIn</a>
            <a href="mailto:buddhiraj.nagarkoti@gmail.com" class="contact-btn">Email</a>
            <a href="https://wa.me/9779840065972" target="_blank" class="contact-btn">WhatsApp</a>
        `;
    }

    document.getElementById('endScreen').classList.remove('hidden');
}


// ══════════════════════
//   RENDERING
// ══════════════════════

// ── Rendering Helpers ──
function drawTiled(ctx, img, x, y, w, h, scrollX = 0, scrollY = 0, tileX = true, tileY = true) {
    if (!img || img.width === 0 || img.height === 0) return;
    const iw = img.width;
    const ih = img.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Calculate start positions to align with world grid
    // Use Math.floor to prevent sub-pixel jitter and ensure stable world-anchoring
    const ox = tileX ? (((x + scrollX) % iw + iw) % iw) : 0;
    const oy = tileY ? (((y + scrollY) % ih + ih) % ih) : 0;

    const startX = Math.floor(x - ox);
    const startY = Math.floor(y - oy);

    // Loop through tiles
    for (let tx = startX - (tileX ? iw : 0); tx < x + w; tx += iw) {
        for (let ty = startY - (tileY ? ih : 0); ty < y + h; ty += ih) {
            ctx.drawImage(img, Math.floor(tx), Math.floor(ty), iw, ih);
            if (!tileY) break; // Only one row
        }
        if (!tileX) break; // Only one column
    }
    ctx.restore();
}

function drawMountainLayer(ctx, offset, color, baseY, height) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, CONFIG.HEIGHT);
    for (let x = -20; x <= CONFIG.WIDTH + 20; x += 5) {
        const wx = x + offset;
        const h = Math.sin(wx * 0.003) * height * 0.5 + Math.sin(wx * 0.008) * height * 0.3
            + Math.sin(wx * 0.015) * height * 0.15;
        ctx.lineTo(x, baseY - Math.abs(h));
    }
    ctx.lineTo(CONFIG.WIDTH + 20, CONFIG.HEIGHT); ctx.closePath(); ctx.fill();
}

function render() {
    let ctx = game.ctx, cam = game.camera.x, camY = game.camera.y || 0, t = game.time, p = game.player;

    // Camera Shake during Dragon Fire
    if (game.state === 'DRAGON_ATTACK' && game.dragonPhase === 1) {
        cam += Math.sin(t * 50) * 10;
        camY += Math.cos(t * 50) * 10;
    }

    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // ── Dynamic Sky Blending ──
    let undergroundAlpha = (p.x >= 4100 && p.x < 9200) ? 1 : 0;
    let skyAlpha = 0;
    let breakSkyAlpha = (p.x >= 9200 && p.x < 16400) ? 1 : 0;
    let aiWorldAlpha = Math.max(0, Math.min(1, (p.x - 35000) / 1000)); // Start AI World fade at 35k (Portal)
    let pokharaEntry = Math.max(0, Math.min(1, (p.x - 18000) / 800));
    let pokharaExit = Math.max(0, Math.min(1, (p.x - 20650) / 800));

    // Smooth horizontal check for Daraz land transition (if not in balloon)
    if (!game.state.includes('BALLOON') && p.x >= 8180 && p.x < 9200) {
        skyAlpha = Math.min(1, (p.x - 8180) / 400);
        undergroundAlpha = Math.min(undergroundAlpha, 1 - skyAlpha);
    }

    // Smooth transition from Daraz Sky to Break Sky
    // Smooth transition from Daraz Sky to Break Sky .. then back to Normal Sky for Barahi
    if (p.x >= 9200) {
        if (p.x < 16400) {
            breakSkyAlpha = Math.min(1, (p.x - 9200) / 400);
            skyAlpha = Math.max(0, 1 - breakSkyAlpha);
        } else {
            // FADEOUT Break Sky -> Return to Normal Sky
            breakSkyAlpha = Math.max(0, 1 - (p.x - 16400) / 600);
            skyAlpha = 0; // SkyAlpha controls "Balloon Sky" logic, usually 0 for ground level. 
            // The BASE sky is always drawn at line 1167. 
            // So we just zero out the overlays.
        }
    }

    // Smooth vertical transition for Balloon Ascent / Dragon Attack / Fall
    if (game.state.includes('BALLOON') || game.state === 'DRAGON_ATTACK' || game.state === 'CRASH_FALLING') {
        const yStart = -100;
        const yRange = 1200;

        // If in dragon attack or falling, keep sky maxed
        if (game.state === 'DRAGON_ATTACK') {
            skyAlpha = 1;
            undergroundAlpha = 0;
        } else if (game.state === 'CRASH_FALLING') {
            // Fade from Sky (blue) to Break Sky (warm/pink) over 3 seconds
            const t = Math.min(1, game.fallTimer / 3.0);
            skyAlpha = 1 - t;
            breakSkyAlpha = t;
            undergroundAlpha = 0;
        } else if (game.balloonY < yStart) {
            skyAlpha = Math.min(1, (game.balloonY - yStart) / -yRange);
            undergroundAlpha = Math.min(undergroundAlpha, 1 - skyAlpha);
        } else {
            skyAlpha = 0;
            undergroundAlpha = 1;
        }
    }

    // ROLLER COASTER SKY OVERRIDE
    if (game.state === 'ROLLER_COASTER') {
        skyAlpha = 1; // Use the base Sky.svg
        undergroundAlpha = 0;
        breakSkyAlpha = 0;
        aiWorldAlpha = 0; // Force no AI background
    }

    // 1. Hills Base (Level 0 always underlying)
    if (game.assets['sky']) {
        ctx.drawImage(game.assets['sky'], 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
        skyGrad.addColorStop(0, '#4ac4ff'); skyGrad.addColorStop(1, '#d4f1ff');
        ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }

    // Fade Mountains out as we go underground or fly high
    const hillDetailAlpha = Math.max(0, 1 - (undergroundAlpha * 0.8) - skyAlpha);
    if (hillDetailAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = hillDetailAlpha;
        drawMountainLayer(ctx, cam * 0.2, '#b3e5fc', CONFIG.HEIGHT, 300);
        drawMountainLayer(ctx, cam * 0.5, '#81d4fa', CONFIG.HEIGHT, 150);
        ctx.restore();
    }

    // 2. Layer: Underground (Makura)
    let caveL = 4100 - cam;
    const caveR = 9200 - cam;
    if (game.makuraEntered && p.x < 9200) caveL = 0;

    if (caveR > 0 && caveL < CONFIG.WIDTH) {
        ctx.save();
        const x = Math.max(0, caveL), w = Math.min(CONFIG.WIDTH, caveR) - x;
        ctx.beginPath(); ctx.rect(x, 0, w, CONFIG.HEIGHT); ctx.clip();

        ctx.globalAlpha = 1; // Solid in world zones
        ctx.fillStyle = '#102040'; // Deep blue cave fill
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        if (game.assets['underground_bg']) {
            ctx.drawImage(game.assets['underground_bg'], 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
        ctx.restore();
    }

    // 3. Layer: Sky (Daraz) - Using sky.svg specifically for the Daraz Chapter
    if (skyAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = skyAlpha;
        if (game.assets['sky']) {
            ctx.drawImage(game.assets['sky'], 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        } else {
            ctx.fillStyle = '#4ac4ff'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
        // Optional: Stars or Clouds based on alpha
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 30; i++) {
            const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * CONFIG.WIDTH;
            const sy = (Math.cos(i * 456.78) * 0.5 + 0.5) * CONFIG.HEIGHT;
            ctx.globalAlpha = skyAlpha * (0.2 + Math.sin(t + i) * 0.2);
            ctx.fillRect(sx, sy, 3, 3);
        }
        ctx.restore();
    }

    // 4. Layer: Break Sky (Career Break)
    if (breakSkyAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = breakSkyAlpha;
        if (game.assets['break_sky']) {
            ctx.drawImage(game.assets['break_sky'], 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        } else {
            // Procedural fallback
            const breakGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
            breakGrad.addColorStop(0, '#ff9a9e'); breakGrad.addColorStop(1, '#fad0c4');
            ctx.fillStyle = breakGrad; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
        ctx.restore();
    }

    // 5. Layer: AI WORLD (Dark Atmosphere)
    if (aiWorldAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = aiWorldAlpha;

        // Deep Dark Gradient (Matching Start Screen / High Tech vibe)
        const aiGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
        aiGrad.addColorStop(0, '#050510'); // Near black top
        aiGrad.addColorStop(1, '#151025'); // Deep purple-blue bottom
        ctx.fillStyle = aiGrad;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Tech "Data" Particles floating up
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; // Cyan tech glow
        for (let i = 0; i < 40; i++) {
            const seed = i * 789.123;
            const sx = (Math.abs(Math.sin(seed)) * (CONFIG.WIDTH + 400) - 200);
            const sy = (Math.abs(Math.cos(seed)) * (CONFIG.HEIGHT + 200) - (t * 80) % (CONFIG.HEIGHT + 200));
            const size = (Math.abs(Math.sin(seed * 2)) * 4 + 2);
            ctx.globalAlpha = aiWorldAlpha * (0.3 + Math.sin(t + i) * 0.2);
            ctx.fillRect(sx, sy, size, size);

            // Subtle glow on some particles
            if (i % 5 === 0) {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ffff';
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.strokeRect(sx - 2, sy - 2, size + 4, size + 4);
                ctx.restore();
            }
        }
        ctx.restore();
    }

    // 4.5 Layer: Pokhara (Barahi Backdrop)
    if (p.x >= 18000 && p.x < 21450 && game.assets['pokhara']) {
        ctx.save();
        const entrySlide = (1 - pokharaEntry) * CONFIG.WIDTH;
        const exitSlide = pokharaExit * CONFIG.WIDTH;
        const px = ((18000 - cam) * 0.2) + entrySlide - exitSlide;
        ctx.drawImage(game.assets['pokhara'], px, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        ctx.restore();
    }

    // 3.5 Layer: Daraz Summit Goal (Approach Cinematic)
    if ((game.state.includes('BALLOON') || game.state === 'DRAGON_ATTACK') && skyAlpha > 0.1) {
        const ascentProgress = Math.min(1, Math.abs(game.balloonY) / 5100);
        if (ascentProgress > 0.1) {
            ctx.save();
            // Fade in over the ascent
            const goalAlpha = Math.min(1, (ascentProgress - 0.1) * 2.0);
            ctx.globalAlpha = goalAlpha * skyAlpha;

            // Scale up as we get "nearer" (Summit approach)
            const goalScale = 0.4 + (ascentProgress * 1.1);
            const goalW = 1000 * goalScale;
            const goalH = 800 * goalScale;

            // "From left to right" - slide into view as we approach
            const goalX = -300 + (ascentProgress * 500);
            // Rise up slightly slower than the balloon for depth
            const goalY = (CONFIG.HEIGHT * 0.15) + (1.0 - ascentProgress) * 300;

            if (game.assets['daraz_goal']) {
                ctx.drawImage(game.assets['daraz_goal'], goalX, goalY, goalW, goalH);
            }
            ctx.restore();
        }
    }

    // ── Background Decorations ──
    if (game.state !== 'CRASH_FALLING' || game.fallTimer >= 5.0) {
        game.allDecorations.forEach(d => {
            const dx = d.x - cam;
            const dy = d.y - camY;
            if (dx < -200 || dx > CONFIG.WIDTH + 200) return;
            if (d.x >= 50000) return; // Hide all decorations in AI Space void

            switch (d.type) {
                case 'cloud':
                    // Add gentle horizontal floating
                    const floatX = Math.sin(t * 0.5 + d.x * 0.01) * 60;
                    PixelArt.drawCloud(ctx, dx + floatX, dy, t);
                    break;
                case 'torch': PixelArt.drawTorch(ctx, dx, dy - CONFIG.SURFACE_LIP, t); break;
                case 'temple': break; // Drawn later
                case 'wizard':
                    if (game.summaryBoardTimers[0] && p.x < 4100) {
                        PixelArt.drawWizard(ctx, dx, dy - CONFIG.SURFACE_LIP, d.scale || 1.4, true);
                    }
                    break;
                case 'rhododendron': PixelArt.drawRhododendron(ctx, dx, dy); break;
                // Car is moved to foreground
            }
        });
    }

    // ── Ground ──
    // Solid ground (removed fade logic that was affecting soil during sky transitions)
    if (game.state !== 'CRASH_FALLING' || game.fallTimer >= 5.0) {
        ctx.save();
        ctx.globalAlpha = 1;
        // Define Zones: Land (0-4100), Underground (4100-9200), Break (9200-16400), Barahi (16400+)
        const zones = [
            { end: 4100, key: 'soil', sH: 80, obs: 'land' }, // Skills World
            { end: 9200, key: 'underground_land', sH: 80, obs: 'underground_obstacles' },
            { end: 36000, key: 'soil', sH: 80, obs: 'land' } // Barahi Adventure ends here (slightly extended)
            // AI WORLD (50000+): Land removed for "Space Floating" feel
        ];

        let startX = 0;
        zones.forEach(z => {
            const endX = z.end;
            const drawStart = Math.max(cam, startX);
            const drawEnd = Math.min(cam + CONFIG.WIDTH, endX);

            if (drawStart < drawEnd) {
                // Skip drawing old world ground if we've entered Makura
                if (game.makuraEntered && z.end <= 4100) return;

                const sx = drawStart - cam;
                const w = drawEnd - drawStart;

                // Draw Surface Layer (Drawn ONCE at the top)
                if (z.obs && game.assets[z.obs]) {
                    const oY = CONFIG.GROUND_Y - CONFIG.SURFACE_LIP - camY;
                    drawTiled(ctx, game.assets[z.obs], sx, oY, w, z.sH, cam, camY, true, false);
                }

                // Draw Base Layer (Soil/Land below surface)
                if (game.assets[z.key]) {
                    const gY = CONFIG.GROUND_Y - CONFIG.SURFACE_LIP + z.sH - camY;
                    // Fill from ground down to well below viewport
                    drawTiled(ctx, game.assets[z.key], sx, gY, w, 1500, cam, camY, true, true);
                }
            }
            startX = endX;
        });
        ctx.restore();
    }

    // ── Roller Coaster Rail ──
    if (game.player.x > 15000) {
        ctx.save();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let first = true;
        for (let rx = cam - 100; rx < cam + CONFIG.WIDTH + 100; rx += 25) {
            if (rx < ROLLER_COASTER_X) continue;
            if (rx > 35100) break; // Track ends at the portal
            const ry = getRollerCoasterY(rx) - camY;
            if (first) ctx.moveTo(rx - cam, ry);
            else ctx.lineTo(rx - cam, ry);
            first = false;
        }
        ctx.stroke();

        ctx.strokeStyle = '#666'; ctx.lineWidth = 6;
        ctx.stroke();

        // Ties
        ctx.strokeStyle = '#111'; ctx.lineWidth = 8;
        for (let rx = Math.floor((cam - 100) / 80) * 80; rx < cam + CONFIG.WIDTH + 100; rx += 80) {
            if (rx < ROLLER_COASTER_X) continue;
            if (rx > 35100) break;
            const ry = getRollerCoasterY(rx) - camY;
            const slope = getRollerCoasterSlope(rx);
            ctx.save();
            ctx.translate(rx - cam, ry);
            ctx.rotate(slope);
            ctx.beginPath();
            ctx.moveTo(0, -15); ctx.lineTo(0, 15);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    // Draw Roller Coaster Track (Procedural)
    if (game.player.x > 19000 && game.player.x < 51000) {
        ctx.save();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Draw segment around player
        const startX = Math.max(20000, cam - 100);
        const endX = Math.min(35000, cam + CONFIG.WIDTH + 100);

        // Rail 1
        for (let ix = startX; ix < endX; ix += 20) {
            const iy = getRollerCoasterY(ix);
            if (ix === startX) ctx.moveTo(ix - cam, iy - camY);
            else ctx.lineTo(ix - cam, iy - camY);
        }
        ctx.stroke();

        // Rail 2 (Offset)
        ctx.beginPath();
        for (let ix = startX; ix < endX; ix += 20) {
            const iy = getRollerCoasterY(ix);
            // Rail 2 is offset by +20 pixels vertically
            if (ix === startX) ctx.moveTo(ix - cam, iy - camY + 20);
            else ctx.lineTo(ix - cam, iy - camY + 20);
        }
        ctx.stroke();

        // Ties
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        for (let ix = startX; ix < endX; ix += 60) {
            const iy = getRollerCoasterY(ix);
            ctx.beginPath();
            ctx.moveTo(ix - cam, iy - camY);
            ctx.lineTo(ix - cam, iy - camY + 20);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ── AI Portal ──
    if (game.player.x > 33000) {
        const portalX = 35000 - cam;
        const portalY = getRollerCoasterY(35000) - 300 - camY; // Move portal even higher for dramatic "climb"
        PixelArt.drawPortal(ctx, portalX, portalY, t);

        // "AI" Text label
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 32px "Press Start 2P"';
        ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20;
        ctx.textAlign = 'center';
        ctx.fillText('AI', portalX, portalY - 100);
        ctx.restore();
    }

    // ── Knowledge Absorption Bits ──
    game.knowledgeBits.forEach(b => {
        const bx = b.x - cam;
        const by = b.y - camY;
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, b.life * 0.4); // Lowered opacity to make them less distracting
        ctx.fillStyle = b.color;
        ctx.font = 'bold 22px monospace';
        ctx.shadowBlur = 5; ctx.shadowColor = b.color; // Reduced glow
        ctx.fillText(b.word, bx, by);
        ctx.restore();
    });

    // ── Summary Boards (Rendered behind the path) ──
    renderSummaryBoards(ctx, cam, camY, t);

    // ── Platforms ──
    game.allPlatforms.forEach(pl => {
        const px = pl.x - cam;
        const py = pl.y - camY;
        // Stop drawing platforms if in Space void, or high in sky, or falling
        if (pl.x >= 25000 || (game.state.includes('BALLOON') && game.balloonY < -500) || (game.state === 'CRASH_FALLING' && game.fallTimer < 5.0)) return;

        if (px > CONFIG.WIDTH + 10 || px + pl.w < -10) return;
        if (py > CONFIG.HEIGHT + 10 || py + pl.h < -10) return;

        // Skip drawing Skills world blocks when inside Makura
        if (game.makuraEntered && pl.x < 4400) return;

        // Determine Platform Style based on its center point
        const centerX = pl.x + pl.w / 2;
        let pKey = 'soil', oKey = 'land', sH = 80;
        if (centerX >= 4100 && centerX < 9200) {
            pKey = 'underground_land'; oKey = 'underground_obstacles';
        } else if (centerX >= 9200 && centerX < 16400) {
            pKey = 'soil'; oKey = 'land';
        } else if (centerX >= 16400) {
            pKey = 'soil'; oKey = 'land';
        }

        if (game.assets[pKey]) {
            // Draw Surface Layer (Top Crust)
            if (oKey && game.assets[oKey]) {
                const topY = py - CONFIG.SURFACE_LIP;
                drawTiled(ctx, game.assets[oKey], px, topY, pl.w, sH, cam, camY, true, false);
                // Base Fill
                const fillY = topY + sH;
                const fillH = Math.max(0, (py + pl.h) - fillY);
                drawTiled(ctx, game.assets[pKey], px, fillY, pl.w, fillH, cam, camY, true, true);
            } else {
                drawTiled(ctx, game.assets[pKey], px, py - CONFIG.SURFACE_LIP, pl.w, pl.h + CONFIG.SURFACE_LIP, cam, camY, true, true);
            }
        } else {
            ctx.fillStyle = (centerX >= 4100 && centerX < 9200) ? '#0a3d62' : '#c4873e';
            ctx.fillRect(px, py, pl.w, pl.h);
        }
    });



    // ── Seamless Makura Entrance ──
    if (!game.makuraEntered) {
        game.allDecorations.filter(d => d.type === 'temple').forEach(d => {
            const dx = d.x - cam, dy = d.y - camY;
            if (dx < -800 || dx > CONFIG.WIDTH + 800) return;
            PixelArt.drawTemple(ctx, dx, dy - CONFIG.SURFACE_LIP, d.scale || 1);
        });
    }

    // ── Foreground Spider ──
    game.allDecorations.filter(d => d.type === 'spider').forEach(d => {
        const dx = d.x - cam, dy = d.y - camY;
        if (dx < -400 || dx > CONFIG.WIDTH + 400) return;
        PixelArt.drawSpider(ctx, dx, dy, d.w || 320, d.h || 320);
    });

    // ── Speed Lines ──
    if (Math.abs(p.vx) > CONFIG.MAX_SPEED * 0.7) {
        ctx.strokeStyle = `rgba(255,255,255,${(Math.abs(p.vx) - CONFIG.MAX_SPEED * 0.7) / (CONFIG.MAX_SPEED * 0.3) * 0.4})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            const lx = Math.random() * CONFIG.WIDTH;
            const ly = Math.random() * CONFIG.HEIGHT;
            const len = 20 + Math.random() * 40;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len * Math.sign(p.vx), ly); ctx.stroke();
        }
    }

    // ── Portal ──
    if (game.portal) PixelArt.drawPortal(ctx, game.portal.x - cam, game.portal.y, t);

    // ── Collectibles ──
    game.allCollectibles.forEach(c => {
        if (game.collectedIds.has(c.id)) return;
        const cx = c.x - cam;
        const cy = c.y - camY;
        if (cx < -30 || cx > CONFIG.WIDTH + 30) return;
        switch (c.type) {
            case 'coin': PixelArt.drawCoin(ctx, cx, cy, t, c.skill, c.x); break;
            case 'scroll': PixelArt.drawScroll(ctx, cx, cy, t); break;
            case 'gem': PixelArt.drawGem(ctx, cx, cy, t); break;
        }
    });

    // ── Floating Labels ──
    game.floatingLabels.forEach(l => {
        ctx.globalAlpha = l.life;
        ctx.fillStyle = l.color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(l.text, l.x - cam, l.y - camY);
        ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;

    // ── End Flag ──
    if (game.endFlag) {
        const fx = game.endFlag.x - cam, fy = game.endFlag.y - camY;
        if (game.assets['daraz_goal']) {
            ctx.drawImage(game.assets['daraz_goal'], fx, fy - 60, 160, 200);
        } else {
            ctx.fillStyle = '#888'; ctx.fillRect(fx + 20, fy, 8, 120);
            ctx.fillStyle = '#dc143c'; ctx.beginPath(); ctx.moveTo(fx + 28, fy); ctx.lineTo(fx + 88, fy + 20); ctx.lineTo(fx + 28, fy + 40); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f5c842'; ctx.font = '28px sans-serif'; ctx.fillText('⭐', fx + 36, fy + 30);
        }
    }

    // ── Player Rendering ──
    if (game.state === 'CRASH_FALLING' && game.fallTimer >= 3.0 && game.fallTimer < 5.0) {
        // Phase 2: Interstitial - Only show the sky fade (Player hidden)
    } else {
        ctx.save();
        let footX, footY;

        if (game.state.includes('BALLOON')) {
            // PARENTING: Use the balloon's visual position directly for perfect sync
            const b = game.targetBalloon || game.allDecorations.find(d => d.type === 'balloon');
            const bdx = b ? (b.x - cam) : (p.x - cam);
            const bdy = b ? (b.y - camY - CONFIG.SURFACE_LIP) : (p.y - camY);
            const bob = Math.sin(t * 2) * 10;

            // Exact center of the balloon
            footX = bdx;
            // Positioned 115px down from balloon anchor (G-742), plus the 15px personal tweak
            // Adjusted for scale 2
            const balloonScale = b ? (b.scale || 1) : 2;
            footY = bdy + bob + (-5 * balloonScale);
        } else if (game.state === 'CRASH_FALLING' && game.fallTimer < 3.0) {
            // Phase 1: Fixed in center
            footX = CONFIG.WIDTH / 2;
            footY = CONFIG.HEIGHT / 2;
        } else if (game.state === 'CAR_DRIVING') {
            // Position player inside the car seat visually - Tuned for 240x160 car
            // If activeCar exists, lock visual to it to prevent jitter
            const carX = game.activeCar ? (game.activeCar.x - cam) : (p.x - cam);
            const carY = game.activeCar ? (game.activeCar.y - camY) : (p.y - camY);

            const jiggle = (Math.abs(p.vx) > 0.1) ? Math.sin(t * 20) * 2 : 0;
            footX = carX + 50;
            footY = carY - 40 - CONFIG.SURFACE_LIP + jiggle; // Align with seat + Jiggle
        } else {
            footX = p.x - cam + (CONFIG.PLAYER_W * p.scale / 2);
            const playerVisualY = p.y;
            footY = playerVisualY - camY + CONFIG.PLAYER_H - CONFIG.SURFACE_LIP;
        }

        ctx.translate(footX, footY);
        ctx.scale(p.stretchX * p.scale, p.stretchY * p.scale);
        PixelArt.drawPlayer(ctx, -50, -86, p.frame, p.dir, t);
        ctx.restore();
    }

    // ── Dragon & Fire Render ──
    if (game.state === 'DRAGON_ATTACK' || game.balloonOnFire) {
        const b = game.targetBalloon || game.allDecorations.find(d => d.type === 'balloon');
        if (b) {
            const bx = b.x - cam;
            const by = b.y - camY - CONFIG.SURFACE_LIP;

            // Render Dragon during attack
            if (game.state === 'DRAGON_ATTACK') {
                const dragonX = bx + 400 + (game.dragonPhase === 0 ? (100 - game.dragonTimer) * 12 : 0);
                const dragonY = by - 480; // Moved 200px down from -680
                if (game.assets['dragon']) {
                    ctx.drawImage(game.assets['dragon'], dragonX, dragonY, 600, 400);

                    // LAYOFF Tag
                    ctx.save();
                    ctx.fillStyle = '#ffffff'; ctx.font = '48px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.shadowBlur = 15; ctx.shadowColor = '#000';
                    ctx.fillText('LAYOFF', dragonX + 300, dragonY - 40);
                    ctx.restore();
                }

                // Breath Fire
                if (game.dragonPhase === 1) {
                    if (game.assets['fire']) {
                        // Fire moved 200px down from -490
                        ctx.drawImage(game.assets['fire'], bx - 60, by - 290, 560, 280);
                    }
                }
            }

            // Fire on Balloon
            if (game.balloonOnFire && game.assets['fire']) {
                const fireSize = 150 + Math.sin(t * 10) * 20;
                ctx.drawImage(game.assets['fire'], bx - fireSize / 2, by - 100, fireSize, fireSize);
                ctx.drawImage(game.assets['fire'], bx + 20, by - 140, fireSize * 0.8, fireSize * 0.8);
            }
        }
    }

    // ── Foreground Decorations (Part 1: Balloon/Props) ──
    game.allDecorations.forEach(d => {
        const dx = d.x - cam;
        const dy = d.y - camY;
        if (dx < -200 || dx > CONFIG.WIDTH + 200) return;
        if (d.type === 'pipe') PixelArt.drawPipe(ctx, dx, dy - CONFIG.SURFACE_LIP);
        else if (d.type === 'balloon') PixelArt.drawBalloon(ctx, dx, dy - CONFIG.SURFACE_LIP, t, d.scale || 1, !d.noBob);
        else if (d.type === 'car') {
            if (game.assets['car']) {
                // dy is 880 (ground). Adjusted for natural fit (350px width)
                // Offset Y logic: Idle (-135), Driving (Now -135 as requested)
                const idleOffset = -135;
                const jiggle = (game.activeCar === d && Math.abs(game.player.vx) > 0.1) ? Math.sin(t * 20) * 2 : 0;

                ctx.save();
                ctx.translate(dx, dy - CONFIG.SURFACE_LIP + idleOffset + jiggle + 70); // translate to car center (half height)
                if (d.rotation) ctx.rotate(d.rotation);
                ctx.drawImage(game.assets['car'], -175, -70, 350, 140);
                ctx.restore();
            }
        }
    });



    // ── Foreground Decorations (Part 2: UI/Bubbles) ──
    game.allDecorations.forEach(d => {
        const dx = d.x - cam;
        const dy = d.y - camY;
        if (dx < -400 || dx > CONFIG.WIDTH + 400) return;
        if (d.type === 'wizard') {
            if (game.summaryBoardTimers[0] && game.wizardSpoken && p.x < 4100 && Math.abs(p.x - d.x) < 400) {
                PixelArt.drawSpeechBubble(ctx, dx + 40, dy - CONFIG.SURFACE_LIP - 220, "You haven't completed your degree,\nyou are on 3rd semester - are you sure\nyou want to go in corporate world?");
            }
        }
    });

    // ── Player Speech Bubble ──
    if (game.activeDialogue) {
        let px, py;
        if (game.state === 'CRASH_FALLING' && game.fallTimer < 3.0) {
            px = CONFIG.WIDTH / 2;
            py = CONFIG.HEIGHT / 2;
        } else {
            px = p.x - cam + (CONFIG.PLAYER_W * p.scale / 2);
            py = p.y - camY - CONFIG.SURFACE_LIP;
        }
        // Bubble height depends on player scale
        let bubbleY = py - (80 * p.scale);
        let scale = 1;

        // SCALE UP FOR AI WORLD
        // SCALE UP FOR AI WORLD
        if (p.x > 50000) {
            scale = 2.0; // 2x Bigger text
            // bubbleY -= 100; // Removed upward offset to keep text closer to center/player
            bubbleY += 20; // Slightly lower relative to player head
        }

        PixelArt.drawSpeechBubble(ctx, px, bubbleY, game.activeDialogue, scale);
    }

    // ── Particles ──
    game.particles.forEach(pt => {
        const alpha = pt.life / pt.maxLife;
        ctx.fillStyle = pt.color; ctx.globalAlpha = alpha;
        ctx.fillRect(pt.x - cam, pt.y - camY, pt.size, pt.size);
    });
    ctx.globalAlpha = 1;

    // ── HUD / GUI (Intro Prompts) ──


    if (game.state === 'PLAYING' && Math.abs(p.vx) < 0.3 && game.time > 2 && Math.sin(game.time * 3) > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '18px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText('↓ Scroll to move →', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 30); ctx.textAlign = 'left';
    }

}

// ══════════════════
//   GAME LOOP
// ══════════════════
function gameLoop(timestamp) {
    game.dt = Math.min((timestamp - game.lastTime) / 1000, 0.05);
    game.lastTime = timestamp;
    game.time += game.dt;
    const activeStates = ['PLAYING', 'BOSS', 'BALLOON_RISING', 'BALLOON_FLYING', 'DRAGON_ATTACK', 'CRASH_FALLING', 'CAR_DRIVING', 'ROLLER_COASTER', 'AI_PORTAL'];
    if (activeStates.includes(game.state)) {
        updatePlayer();
        checkCollisions();
        updateStoryProgress();
        updateCamera();
        updateParticles();
        updatePopup();
        updateJuice();
        updateKnowledgeSequence();
    }

    if (game.state !== 'START') render();
    requestAnimationFrame(gameLoop);
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', init);

// DEBUG TOOL
window.teleportToBalloon = function () {
    game.player.x = 8300;
    game.player.y = 880 - 360 - 90; // Platform height
    console.log('🚀 Teleported to Balloon zone');
};

function updateKnowledgeSequence() {
    const p = game.player;
    // Only spawn inside AI World (After portal/teleport at 52500)
    // Relaxed check to ensure it starts immediately
    if (p.x < 52000) { game.knowledgeBits = []; return; }
    const px = p.x;
    const py = p.y + (CONFIG.PLAYER_H * p.scale * 0.3);

    // Spawn knowledge chunks (Continuous stream throughout AI World)
    // Extended final zone to cover all monologue and beyond
    const zones = [
        { start: 52000, end: 53500, words: ['Python', 'JS', 'Rust', 'C++', 'DataStruct', 'Algo', 'Binary', '{ }', 'API', 'Code'] },
        { start: 53500, end: 54500, words: ['LLM', 'GPT-4', 'RAG', 'Transformer', 'FineTune', 'Prompt', 'Token', 'Vector', 'AI'] },
        // Extended final zone to infinity (essentially) for continuous effect
        { start: 54500, end: 200000, words: ['Next.js', 'React', 'Cloud', 'K8s', 'Docker', 'Scale', 'Postgres', 'API', 'Deploy', 'System Design', 'Architecture', 'DevOps', 'CI/CD'] }
    ];

    zones.forEach(zone => {
        if (px >= zone.start && px <= zone.end && Math.random() > 0.7) {
            const word = zone.words[Math.floor(Math.random() * zone.words.length)];
            // Spawn from random direction (0 to 2*PI)
            const angle = Math.random() * Math.PI * 2;
            const dist = (CONFIG.WIDTH * 0.6) + (Math.random() * 200); // Distance outside immediate view

            game.knowledgeBits.push({
                x: px + Math.cos(angle) * dist,
                y: py + Math.sin(angle) * dist,
                word: word, life: 1.5,
                color: zone.start === 52000 ? '#00ffff' : (zone.start === 53000 ? '#ff00ff' : '#ffff00')
            });
        }
    });

    game.knowledgeBits = game.knowledgeBits.filter(b => {
        const dx = (px + (CONFIG.PLAYER_W * p.scale * 0.5)) - b.x;
        const dy = py - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) return false; // Absorbed!
        const speed = 25;
        b.x += (dx / dist) * speed;
        b.y += (dy / dist) * speed;
        b.life -= 0.005;
        return b.life > 0;
    });
}
