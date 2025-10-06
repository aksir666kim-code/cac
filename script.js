document.addEventListener('DOMContentLoaded', () => {
  const introLoader = document.getElementById('intro-loader');
  const startBtn = document.getElementById('start-btn');
  const toggleStepsBtn = document.getElementById('toggle-steps');
  const gearIcons = document.getElementById('gear-icons');
  const welcomeAudio = document.getElementById('welcome-audio');

  // Start button click event (hide intro and start the app)
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // Play welcome audio if exists
      if (welcomeAudio) {
        welcomeAudio.play().catch(() => {
          // Autoplay might be blocked, ignore errors
        });
      }

      // Hide intro loader with fade out (CSS handles transition)
      if (introLoader) introLoader.classList.add('hidden');

      // After fadeout, focus main content and attempt to start animation
      setTimeout(() => {
        const main = document.getElementById('main-content') || document.querySelector('main');
        if (main) main.focus();

        // If the page has a play button for the gears, click it to start animation
        const playBtn = document.getElementById('play-pause-btn');
        if (playBtn && typeof playBtn.click === 'function') {
          // Ensure the button shows "play" state before toggling
          playBtn.click();
        }

        // Also dispatch a custom event other scripts can listen to
        const evt = new Event('app-start');
        window.dispatchEvent(evt);
      }, 500); // Match CSS transition duration
    });
  }

  // Toggle step icons display (defensive checks)
  if (toggleStepsBtn && gearIcons) {
    toggleStepsBtn.addEventListener('click', () => {
      if (gearIcons.classList.contains('hidden')) {
        gearIcons.classList.remove('hidden');
        toggleStepsBtn.textContent = '📦 ซ่อนขั้นตอนทั้งหมด';
      } else {
        gearIcons.classList.add('hidden');
        toggleStepsBtn.textContent = '📦 ดูขั้นตอนทั้งหมด';
      }
    });
  }
});

// --- Mechanism animation: crank -> slider -> gear train ---
// Listen for app-start or start when page is ready
window.addEventListener('app-start', () => {
  startMechanism();
});

// If user manually toggled start earlier, allow manual call
function startMechanism() {
  try {
    const svg = document.getElementById('mechanism-svg');
    if (!svg) return;

    // Elements: only the three gears remain
    const driver = document.getElementById('driver');
    const idler = document.getElementById('idler');
    const driven = document.getElementById('driven');

    // Gear teeth counts
    const teeth = { driver: 20, idler: 30, driven: 40 };
    const ratio_idler = -(teeth.driver / teeth.idler);
    const ratio_driven = (teeth.driver / teeth.driven);

    // Helper: generate simple rectangular tooth markers around a gear
    const SVG_NS = 'http://www.w3.org/2000/svg';
      function addTeeth(gearEl, count, radius, toothW, toothH) {
        if (!gearEl) return;
        const prev = gearEl.querySelector('.teeth-group');
        if (prev) gearEl.removeChild(prev);
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('class', 'teeth-group');

        // small overlap so the inner end of the tooth sits into the gear body and hides gaps
        const overlap = Math.max(0, Math.min(toothH * 0.2, toothH - 1));

        // create trapezoidal tooth shape (wider at outer tip) and rotate each copy
        for (let i = 0; i < count; i++) {
          const angle = (360 / count) * i;
          const halfInner = toothW / 2;
          const halfOuter = halfInner * 1.6; // flare at tip for trapezoid
          const ri = radius; // inner radius
          const ro = radius + toothH; // outer radius

          // coordinates for a tooth centered at top (angle=0). We'll rotate the path by 'angle'
          const x1 = -halfInner, y1 = -ri + overlap; // inner left
          const x2 = -halfOuter, y2 = -ro; // outer left
          const x3 = halfOuter, y3 = -ro; // outer right
          const x4 = halfInner, y4 = -ri + overlap; // inner right

          const path = document.createElementNS(SVG_NS, 'path');
          const d = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`;
          path.setAttribute('d', d);
          path.setAttribute('class', 'tooth');
          path.setAttribute('transform', `rotate(${angle})`);
          group.appendChild(path);
        }

        // append so teeth render on top of the gear body
        gearEl.appendChild(group);
      }

    // Add visual teeth to each gear.
    const driverRadius = 40;
    const idlerRadius = 60;
    const drivenRadius = 80;
    const widthFactor = 0.08; // tooth width = radius * widthFactor
    addTeeth(driver, teeth.driver, driverRadius, driverRadius * widthFactor, 16 * 0.3);
    addTeeth(idler, teeth.idler, idlerRadius, idlerRadius * widthFactor, 20 * 0.3);
    addTeeth(driven, teeth.driven, drivenRadius, drivenRadius * widthFactor, 24 * 0.3);

    // Gear center coordinates (match SVG)
    const centers = {
      driver: { x: 200, y: 120 },
      idler: { x: 300, y: 120 },
      driven: { x: 440, y: 120 }
    };

    // Animation state
    let running = true;
    let last = null;
    let driverAngle = 0; // degrees
    let driverDps = 90; // degrees per second (default)

    // If there's a speed control on the page, bind it
    const speedRange = document.getElementById('speed-range');
    if (speedRange) {
      driverDps = parseFloat(speedRange.value) || driverDps;
      speedRange.addEventListener('input', (e) => {
        driverDps = parseFloat(e.target.value) || driverDps;
      });
    }

    function update(dt) {
      driverAngle = (driverAngle + driverDps * dt) % 360;
      const idlerAngle = (ratio_idler * driverAngle) % 360;
      const drivenAngle = (ratio_driven * driverAngle) % 360;
      if (driver) driver.setAttribute('transform', `translate(${centers.driver.x},${centers.driver.y}) rotate(${driverAngle})`);
      if (idler) idler.setAttribute('transform', `translate(${centers.idler.x},${centers.idler.y}) rotate(${idlerAngle})`);
      if (driven) driven.setAttribute('transform', `translate(${centers.driven.x},${centers.driven.y}) rotate(${drivenAngle})`);
    }

    function frame(ts) {
      if (!running) return;
      if (!last) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      update(dt);
      requestAnimationFrame(frame);
    }

    // Start animation loop
    requestAnimationFrame(frame);
  } catch (e) {
    console.error('Mechanism animation failed', e);
  }
}