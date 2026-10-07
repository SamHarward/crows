// Just-for-fun roulette wheel on the Town page: press Spin, see where the ball lands.
(function () {
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';

  // European wheel, clockwise from 0
  const POCKETS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
                   5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const STEP = 360 / POCKETS.length;

  const colourOf = n => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
  const mod = (a, n) => ((a % n) + n) % n;

  // ── Draw the wheel ──
  function point(angle, r) {
    const rad = angle * Math.PI / 180;
    return [r * Math.sin(rad), -r * Math.cos(rad)];
  }
  function node(tag, attrs) {
    const el = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  const wheel = $('roulette-wheel');
  const ball = $('roulette-ball');
  const pocketEls = [];
  POCKETS.forEach((n, i) => {
    const mid = i * STEP;
    const [x1, y1] = point(mid - STEP / 2, 90);
    const [x2, y2] = point(mid + STEP / 2, 90);
    const [x3, y3] = point(mid + STEP / 2, 58);
    const [x4, y4] = point(mid - STEP / 2, 58);
    const path = node('path', {
      d: `M${x1},${y1} A90,90 0 0 1 ${x2},${y2} L${x3},${y3} A58,58 0 0 0 ${x4},${y4} Z`,
      class: 'pocket pocket-' + colourOf(n)
    });
    const label = node('text', { transform: `rotate(${mid}) translate(0,-80)`, class: 'pocket-number' });
    label.textContent = n;
    wheel.append(path, label);
    pocketEls.push(path);
  });
  // Centre cone with spokes
  wheel.append(node('circle', { r: 58, class: 'wheel-cone' }));
  for (let i = 0; i < 4; i++) {
    const [x, y] = point(i * 45, 40);
    wheel.append(node('line', { x1: -x, y1: -y, x2: x, y2: y, class: 'wheel-spoke' }));
  }
  wheel.append(node('circle', { r: 9, class: 'wheel-hub' }));

  // ── Spinning ──
  let wheelTurn = 0, ballTurn = 0, spinning = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPIN_MS = reduceMotion ? 600 : 5500;

  function spin() {
    if (spinning) return;
    spinning = true;
    $('roulette-spin').disabled = true;
    pocketEls.forEach(p => p.classList.remove('pocket-win'));
    $('roulette-result').textContent = 'Spinning…';

    const index = crypto.getRandomValues(new Uint32Array(1))[0] % POCKETS.length;
    const result = POCKETS[index];

    // The wheel turns clockwise and stops with the winning pocket at the top;
    // the ball runs the other way and stops at the top, in that pocket.
    wheelTurn += 360 * 5 + mod(-index * STEP - wheelTurn, 360);
    ballTurn -= 360 * 8 + mod(ballTurn, 360);
    wheel.style.transitionDuration = ball.style.transitionDuration = SPIN_MS + 'ms';
    wheel.style.transform = `rotate(${wheelTurn}deg)`;
    ball.style.transform = `rotate(${ballTurn}deg)`;

    setTimeout(() => {
      spinning = false;
      $('roulette-spin').disabled = false;
      pocketEls[index].classList.add('pocket-win');
      const colour = colourOf(result);
      $('roulette-result').textContent = result + ' ' + colour.charAt(0).toUpperCase() + colour.slice(1);
    }, SPIN_MS);
  }

  $('roulette-spin').addEventListener('click', spin);
})();
