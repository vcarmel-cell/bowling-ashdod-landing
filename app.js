(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("lane");
  const scene = document.getElementById("scene");
  const nowName = document.getElementById("now-name");
  const btnPause = document.getElementById("btn-pause");
  const pauseLabel = document.getElementById("pause-label");
  const btnNext = document.getElementById("btn-next");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const INK = { maple: "#E7B877", seam: "#B9824A", night: "#0B2E4A", deep: "#061C2E", pit: "#04131F", red: "#E11D48", pin: "#F6F1E7" };

  /* ---------- lane geometry: one-point perspective ----------
     Half-width of a lane grows linearly from the vanishing point;
     distance down the lane (feet from the foul line) maps through 1/z. */
  const VPY = -292, K = 0.1831;
  const C = 38833, Z0 = 41.67;
  const W = (y) => K * (y - VPY);
  const yOfD = (d) => VPY + C / (Z0 + d);
  const ppi = (y) => (2 * W(y)) / 41.5;          // screen units per inch at depth y
  const S = 2.9;                                 // lane-to-lane spacing, in half-widths
  const LANE_END = yOfD(67.5);
  const BOTTOM = 900;

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const band = (k, f1, f2, y1, y2) =>
    `${(k * S + f1) * W(y1)},${y1} ${(k * S + f2) * W(y1)},${y1} ${(k * S + f2) * W(y2)},${y2} ${(k * S + f1) * W(y2)},${y2}`;

  /* ---------- shared shapes ---------- */
  const defs = el("defs", {}, svg);
  // bowling pin, drawn in inches, base at 0, top at -15
  const PIN_D = "M-1 0C-1.6-1-2.45-3-2.38-4.5C-2.3-6.5-1.3-8.5-.9-10C-.75-11-1.3-12.2-1.25-13.4C-1.2-14.6-.5-15 0-15C.5-15 1.2-14.6 1.25-13.4C1.3-12.2.75-11 .9-10C1.3-8.5 2.3-6.5 2.38-4.5C2.45-3 1.6-1 1 0Z";
  const clip = el("clipPath", { id: "pinClip" }, defs);
  el("path", { d: PIN_D }, clip);
  const pinG = el("g", { id: "pinShape" }, defs);
  el("path", { d: PIN_D, fill: INK.pin }, pinG);
  const stripes = el("g", { "clip-path": "url(#pinClip)", fill: INK.red }, pinG);
  el("rect", { x: -2, y: -10.95, width: 4, height: 0.42 }, stripes);
  el("rect", { x: -2, y: -10.25, width: 4, height: 0.42 }, stripes);
  el("path", { d: PIN_D, fill: "none", stroke: INK.night, "stroke-width": 0.9, "vector-effect": "non-scaling-stroke", "stroke-opacity": 0.55 }, pinG);

  /* ---------- the alley ---------- */
  el("rect", { x: -2000, y: -10, width: 4000, height: 920, fill: INK.deep }, svg);
  el("rect", { x: -2000, y: -10, width: 4000, height: LANE_END + 10, fill: INK.pit }, svg);

  const alley = el("g", {}, svg);
  for (let k = -6; k <= 6; k++) {
    const g = el("g", {}, alley);
    // capping / ball-return divider and gutters
    el("polygon", { points: band(k, 1.0, 1.2, LANE_END, BOTTOM), fill: "#072238" }, g);
    el("polygon", { points: band(k, -1.2, -1.0, LANE_END, BOTTOM), fill: "#072238" }, g);
    // lane surface
    // lane 1 is the only lit maple field; the others stay in the alley dark
    el("polygon", { points: band(k, -1, 1, LANE_END, BOTTOM), fill: k === 0 ? INK.maple : INK.night }, g);
    // 39 boards
    let d = "";
    for (let i = 1; i < 39; i++) {
      const f = -1 + (2 * i) / 39;
      d += `M${(k * S + f) * W(LANE_END)} ${LANE_END}L${(k * S + f) * W(BOTTOM)} ${BOTTOM}`;
    }
    el("path", { d, stroke: INK.seam, "stroke-width": 1, "stroke-opacity": k === 0 ? 0.42 : 0.18, fill: "none", "vector-effect": "non-scaling-stroke" }, g);
    // foul line
    const yf = yOfD(0), yf2 = yOfD(-0.35);
    el("polygon", { points: band(k, -1, 1, yf, yf2), fill: INK.red }, g);
    // targeting arrows: seven, in a V from 13 to 16 ft
    [5, 10, 15, 20, 25, 30, 35].forEach((b) => {
      const off = Math.abs(b - 20) / 15;     // 0 centre … 1 outer
      const dTip = 16 - off * 3, dBase = dTip - 1.6;
      const yt = yOfD(dTip), yb = yOfD(dBase);
      const f = -1 + (2 * (b - 0.5)) / 39, half = 0.9 / 39;
      el("polygon", {
        points: `${(k * S + f) * W(yt)},${yt} ${(k * S + f + half) * W(yb)},${yb} ${(k * S + f - half) * W(yb)},${yb}`,
        fill: INK.night,
      }, g);
    });
    // dots at 7 ft
    [3, 5, 8, 11, 14, 26, 29, 32, 35, 37].forEach((b) => {
      const y = yOfD(7), f = -1 + (2 * (b - 0.5)) / 39;
      el("ellipse", { cx: (k * S + f) * W(y), cy: y, rx: 0.5 * ppi(y), ry: 0.18 * ppi(y), fill: INK.night }, g);
    });
    // approach dots
    [3, 5, 8, 11, 14, 20, 26, 29, 32, 35, 37].forEach((b) => {
      const y = yOfD(-4.5), f = -1 + (2 * (b - 0.5)) / 39;
      el("ellipse", { cx: (k * S + f) * W(y), cy: y, rx: 0.55 * ppi(y), ry: 0.22 * ppi(y), fill: INK.night }, g);
    });
    // pins on neighbouring lanes stay standing
    if (k !== 0) drawPins(g, k);
    // neighbouring lanes sit in the dark
    if (k !== 0) el("polygon", { points: band(k, -1.25, 1.25, LANE_END - 40, BOTTOM), fill: INK.deep, opacity: 0.45 }, g);
  }

  // pool of light on the pin deck of lane 1, and the pins' reflection in the oil
  el("polygon", { points: band(0, -1, 1, LANE_END, yOfD(50)), fill: INK.pin, opacity: 0.16 }, svg);
  el("polygon", { points: band(0, -1, 1, LANE_END, yOfD(57)), fill: INK.pin, opacity: 0.12 }, svg);
  const reflect = el("g", { opacity: 0.16, transform: `translate(0 ${yOfD(60)}) scale(1 -0.55) translate(0 ${-yOfD(60)})` }, svg);
  const reflectPins = el("g", {}, reflect);

  function pinSpots() {
    const out = [];
    for (let r = 0; r < 4; r++) {
      const y = yOfD(60 + r * 0.866);
      for (let i = 0; i <= r; i++) out.push({ r, xin: (i - r / 2) * 12, y, p: ppi(y) });
    }
    return out.reverse();   // back row first, head pin drawn last
  }
  function drawPins(parent, k) {
    pinSpots().forEach((s) => {
      el("use", { href: "#pinShape", transform: `translate(${k * S * W(s.y) + s.xin * s.p} ${s.y}) scale(${s.p})` }, parent);
    });
  }

  /* ---------- lane 1 live elements ---------- */
  const pinLayer = el("g", {}, svg);
  const pins = pinSpots().map((s) => ({ ...s, node: el("use", { href: "#pinShape" }, pinLayer), ghost: el("use", { href: "#pinShape" }, reflectPins) }));

  const sweep = el("g", {}, svg);
  el("rect", { x: -W(LANE_END) * 1.25, y: -60, width: W(LANE_END) * 2.5, height: 60, fill: INK.night }, sweep);
  el("rect", { x: -W(LANE_END) * 1.25, y: -10, width: W(LANE_END) * 2.5, height: 6, fill: INK.red }, sweep);

  const ballG = el("g", { opacity: 0 }, svg);
  const ballShadow = el("ellipse", { fill: INK.deep, opacity: 0.28 }, ballG);
  const ballBody = el("circle", { r: 1 }, ballG);
  const ballHoles = el("g", { fill: INK.deep, opacity: 0.75 }, ballG);
  [[-0.22, -0.38], [0.18, -0.4], [0, -0.05]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 0.11 }, ballHoles));

  // strike call
  const strike = el("g", { opacity: 0 }, svg);
  const strikeIn = el("g", {}, strike);
  // the word, with the score-sheet strike mark: a big red X on its own
  el("text", {
    x: 48, y: 4, "text-anchor": "middle", "dominant-baseline": "central", direction: "rtl",
    "font-family": "Karantina, Heebo, sans-serif", "font-weight": 700, "font-size": 104, fill: INK.pin,
    stroke: INK.night, "stroke-width": 8, "paint-order": "stroke", "stroke-linejoin": "round",
  }, strikeIn).textContent = "סטרייק";
  el("path", { d: "M-112-30L-58 24M-58-30L-112 24", stroke: INK.night, "stroke-width": 22, "stroke-linecap": "square" }, strikeIn);
  el("path", { d: "M-112-30L-58 24M-58-30L-112 24", stroke: INK.red, "stroke-width": 12, "stroke-linecap": "square" }, strikeIn);

  /* ---------- heroes: flat cut shapes, three colours each ---------- */
  const HEROES = [
    { name: "ברק", suit: "#1D3F95", cape: "#FFC93C", mark: "#F6F1E7",
      emblem: '<path d="M7-24-11 3H0L-7 24 13-5H2L9-24Z"/>' },
    { name: "גלית", suit: "#0E8A8A", cape: "#F2805E", mark: "#F2D9A6",
      emblem: '<path d="M-24 10C-20-6-8-12 2-8C10-5 10 3 4 5C14 4 18-4 24 0V12H-24Z"/>' },
    { name: "העוגן", suit: "#2B2D33", cape: "#C8102E", mark: "#E0A526",
      emblem: '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square"><circle cx="0" cy="-19" r="5"/><path d="M0-14V18M-12-6H12M-19 5C-17 16-9 19 0 19S17 16 19 5"/></g>' },
  ];

  function buildHero(parent, h) {
    const root = el("g", {}, parent);
    el("ellipse", { cx: 0, cy: 0, rx: 66, ry: 11, fill: INK.deep, opacity: 0.3 }, root);
    const body = el("g", {}, root);
    // legs in a wide stance, boots
    el("polygon", { points: "-34,-124 -8,-124 -16,-6 -44,-6", fill: h.suit }, body);
    el("polygon", { points: "8,-124 34,-124 44,-6 16,-6", fill: h.suit }, body);
    el("polygon", { points: "-42,-46 -15,-46 -14,0 -50,0", fill: h.mark }, body);
    el("polygon", { points: "15,-46 42,-46 50,0 14,0", fill: h.mark }, body);
    // torso: broad shoulders, narrow waist
    el("polygon", { points: "-62,-238 62,-238 34,-120 -34,-120", fill: h.suit }, body);
    el("rect", { x: -36, y: -133, width: 72, height: 13, fill: h.mark }, body);
    // cape: hung from the shoulders, flaring past the body, scalloped hem
    const cape = el("g", {}, body);
    el("path", { d: "M-60-240H60L96-56Q48-74 0-60Q-48-74-100-52Z", fill: h.cape }, cape);
    const em = el("g", { transform: "translate(0 -158) scale(1.45)", fill: h.mark, color: h.mark }, cape);
    em.innerHTML = h.emblem;
    el("rect", { x: -30, y: -246, width: 60, height: 10, fill: h.mark }, body);
    // head: cowl, with the mask band and its knot tails seen from behind
    el("circle", { cx: 0, cy: -268, r: 27, fill: h.suit }, body);
    el("polygon", { points: "-23.7,-281 23.7,-281 26.8,-271 -26.8,-271", fill: h.mark }, body);
    el("polygon", { points: "2,-279 26,-262 20,-256 -1,-273", fill: h.mark }, body);
    el("polygon", { points: "-2,-277 12,-250 5,-247 -6,-272", fill: h.mark }, body);
    // arms, over the cape's edge
    const armL = el("g", {}, body);
    el("polygon", { points: "-64,-236 -44,-232 -56,-124 -74,-128", fill: h.suit }, armL);
    el("circle", { cx: -66, cy: -120, r: 12, fill: h.mark }, armL);
    const armR = el("g", {}, body);
    el("polygon", { points: "44,-232 64,-236 74,-128 56,-124", fill: h.suit }, armR);
    el("circle", { cx: 65, cy: -118, r: 12, fill: h.mark }, armR);
    const held = el("g", {}, armR);
    el("circle", { cx: 66, cy: -102, r: 24, fill: h.cape }, held);
    el("circle", { cx: 66, cy: -102, r: 24, fill: "none", stroke: INK.deep, "stroke-opacity": 0.4, "stroke-width": 2 }, held);
    return { root, body, armL, armR, cape, held };
  }

  // roster portrait: the same hero, facing us
  function buildHeroFront(parent, h) {
    const g = el("g", {}, parent);
    el("ellipse", { cx: 0, cy: 0, rx: 66, ry: 10, fill: INK.night, opacity: 0.18 }, g);
    el("path", { d: "M-58-238H58L92-48Q46-60 0-50Q-46-60-92-48Z", fill: h.cape }, g);
    el("polygon", { points: "-34,-124 -8,-124 -16,-6 -44,-6", fill: h.suit }, g);
    el("polygon", { points: "8,-124 34,-124 44,-6 16,-6", fill: h.suit }, g);
    el("polygon", { points: "-42,-46 -15,-46 -14,0 -50,0", fill: h.mark }, g);
    el("polygon", { points: "15,-46 42,-46 50,0 14,0", fill: h.mark }, g);
    el("polygon", { points: "-62,-238 62,-238 34,-120 -34,-120", fill: h.suit }, g);
    el("rect", { x: -36, y: -133, width: 72, height: 13, fill: h.mark }, g);
    el("polygon", { points: "-64,-236 -44,-232 -56,-124 -74,-128", fill: h.suit }, g);
    el("polygon", { points: "44,-232 64,-236 74,-128 56,-124", fill: h.suit }, g);
    el("circle", { cx: -66, cy: -120, r: 12, fill: h.mark }, g);
    el("circle", { cx: 65, cy: -118, r: 12, fill: h.mark }, g);
    const em = el("g", { transform: "translate(0 -192) scale(1.15)", fill: h.mark, color: h.mark }, g);
    em.innerHTML = h.emblem;
    el("circle", { cx: 0, cy: -268, r: 27, fill: h.suit }, g);
    el("polygon", { points: "-26.8,-279 26.8,-279 25.2,-262 -25.2,-262", fill: h.mark }, g);
    el("ellipse", { cx: -10, cy: -270.5, rx: 6, ry: 3, fill: INK.deep }, g);
    el("ellipse", { cx: 10, cy: -270.5, rx: 6, ry: 3, fill: INK.deep }, g);
    return g;
  }

  const heroLayer = el("g", {}, svg);
  const heroes = HEROES.map((h) => ({ ...h, parts: buildHero(heroLayer, h) }));
  heroes.forEach((h) => h.parts.root.setAttribute("opacity", 0));

  document.querySelectorAll(".sheet-row").forEach((row) => {
    const h = HEROES[+row.dataset.hero];
    const s = row.querySelector(".sheet-hero");
    if (s) buildHeroFront(s, h);
  });

  /* ---------- timeline ---------- */
  const T_ENTER = 500, T_APPROACH = 1300, T_ROLL = 2500;
  const T_RELEASE = T_ENTER + T_APPROACH;            // 1800
  const T_EXIT = 4500, T_SWEEP = 4900, T_CYCLE = 6100;
  const STILL_AT = 4250;
  const HX = 30, HY0 = 812, HY1 = 722, HS0 = 1.14, HS1 = 0.93;   // run-up of several feet

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let current = 0, t = 0, last = 0, playing = !reduced.matches, visible = true, raf = 0;
  let scatter = [], impactAt = Infinity;
  const rand = (a, b) => a + Math.random() * (b - a);

  function newScatter() {
    scatter = pins.map((p) => {
      const dir = p.xin === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(p.xin);
      return { dx: dir * rand(30, 130), dy: -rand(6, 34), lift: rand(14, 34), rot: dir * rand(70, 160), delay: p.r * 45 + Math.abs(p.xin) * 1.6 };
    });
  }
  newScatter();

  // ball travel: feet from the foul line, given ms since release
  const ballD = (ms) => -1 + 69 * (1 - Math.pow(1 - clamp(ms / T_ROLL), 1.35));
  const hookX = (d) => { const u = clamp(d / 60); return (1 - u) * (1 - u) * 11 + 2 * (1 - u) * u * 19.5 + u * u * 3; };

  function armPose(p) {
    // p: 0..1 through the approach. Returns right-arm rotation and foreshortening.
    if (p < 0.45) { const q = easeInOut(p / 0.45); return { rot: lerp(0, -20, q), sy: lerp(1, 1.12, q) }; }
    const q = easeInOut((p - 0.45) / 0.55);
    return { rot: lerp(-20, 6, q), sy: lerp(1.12, 0.55, q) };
  }

  function handPos(hx, hy, hs, pose) {
    // ball centre in hand: pivot (54,-234), offset (12,132) scaled + rotated
    const a = (pose.rot * Math.PI) / 180;
    const ox = 12, oy = 132 * pose.sy;
    const x = 54 + ox * Math.cos(a) - oy * Math.sin(a);
    const y = -234 + ox * Math.sin(a) + oy * Math.cos(a);
    return { x: hx + x * hs, y: hy + y * hs, r: 24 * hs };
  }

  function render() {
    const h = heroes[current];
    const P = h.parts;

    // hero placement
    let hx = HX, hy = HY0, hs = HS0, op = 1, pose = { rot: 0, sy: 1 }, bob = 0;
    if (t < T_ENTER) {
      const q = easeOut(t / T_ENTER);
      hx = lerp(HX + 240, HX, q); op = q;
    } else if (t < T_RELEASE) {
      const p = (t - T_ENTER) / T_APPROACH;
      // four steps that accelerate, then the slide into the foul line
      const q = p < 0.8 ? 0.85 * Math.pow(p / 0.8, 1.4) : 0.85 + 0.15 * easeOut((p - 0.8) / 0.2);
      hy = lerp(HY0, HY1, q); hs = lerp(HS0, HS1, q);
      bob = p < 0.8 ? -9 * Math.abs(Math.sin(Math.PI * 4 * (p / 0.8))) : 0;
      pose = armPose(p);
    } else {
      hy = HY1; hs = HS1;
      const f = clamp((t - T_RELEASE) / 600);
      pose = { rot: lerp(6, 10, easeOut(f)), sy: lerp(0.55, 0.42, easeOut(f)) };
      if (t > T_EXIT) { const q = easeInOut(clamp((t - T_EXIT) / 420)); hx = lerp(HX, HX - 260, q); op = 1 - q; }
    }
    P.root.setAttribute("transform", `translate(${hx} ${hy + bob}) scale(${hs})`);
    P.root.setAttribute("opacity", op);
    P.armR.setAttribute("transform", `rotate(${pose.rot} 54 -234) translate(0 -234) scale(1 ${pose.sy}) translate(0 234)`);
    const lp = t < T_ENTER ? 0 : clamp((t - T_ENTER) / T_APPROACH);
    P.armL.setAttribute("transform", `rotate(${lerp(0, 38, easeInOut(lp))} -54 -234)`);
    P.cape.setAttribute("transform", `translate(0 -244) skewX(${(t < T_RELEASE ? Math.sin(t / 120) * 4 : 3)}) translate(0 244)`);
    P.held.setAttribute("opacity", t < T_RELEASE ? 1 : 0);

    // the ball
    if (t >= T_RELEASE) {
      const ms = t - T_RELEASE;
      const d = ballD(ms);
      const y = yOfD(Math.max(d, -0.6));
      const r = 4.25 * ppi(y) * 0.78;
      let x = hookX(Math.max(d, 0)) * ppi(y);
      let cy = y - r;
      // blend out of the hand during the first 220ms
      const hand = handPos(HX, HY1, 0.93, { rot: 6, sy: 0.55 });
      const b = easeOut(clamp(ms / 220));
      x = lerp(hand.x, x, b); cy = lerp(hand.y, cy, b);
      const rr = lerp(hand.r, r, b);
      const fade = 1 - clamp((d - 62) / 4);
      ballG.setAttribute("opacity", fade);
      ballBody.setAttribute("cx", x); ballBody.setAttribute("cy", cy); ballBody.setAttribute("r", rr);
      ballBody.setAttribute("fill", h.cape);
      ballShadow.setAttribute("cx", x); ballShadow.setAttribute("cy", cy + rr * 0.92); ballShadow.setAttribute("rx", rr * 0.95); ballShadow.setAttribute("ry", rr * 0.22);
      ballHoles.setAttribute("transform", `translate(${x} ${cy}) scale(${rr}) rotate(${-ms * 0.5})`);
      if (d >= 60 && impactAt === Infinity) impactAt = t;
    } else {
      ballG.setAttribute("opacity", 0);
    }

    // pins
    const since = t - impactAt;
    const resetAt = T_SWEEP + 380;
    pins.forEach((p, i) => {
      let x = p.xin * p.p, y = p.y, rot = 0, o = 1;
      if (t >= resetAt) {
        const q = easeOut(clamp((t - resetAt) / 260));
        y = p.y - (1 - q) * 18; o = q;
      } else if (since >= 0) {
        const s = scatter[i];
        const q = clamp((since - s.delay) / 640);
        const e = easeOut(q);
        x += s.dx * e; y += s.dy * e - s.lift * Math.sin(Math.PI * Math.min(q, 1));
        rot = s.rot * e; o = 1 - clamp((q - 0.45) / 0.55);
      }
      p.node.setAttribute("transform", `translate(${x} ${y}) rotate(${rot} 0 ${-7.5 * p.p}) scale(${p.p})`);
      p.node.setAttribute("opacity", o);
      p.ghost.setAttribute("transform", p.node.getAttribute("transform"));
      p.ghost.setAttribute("opacity", o);
    });

    // strike call
    if (since >= 120 && since < 1700) {
      const s = since - 120;
      const q = easeOut(clamp(s / 260));
      const out = clamp((s - 1250) / 330);
      strike.setAttribute("opacity", q * (1 - out));
      strike.setAttribute("transform", `translate(0 ${yOfD(40)})`);
      strikeIn.setAttribute("transform", `scale(${lerp(0.86, 1, q)})`);
    } else strike.setAttribute("opacity", 0);

    // pinsetter sweep: drops, holds while pins are reset, lifts
    let sy = -70;
    if (t >= T_SWEEP && t < T_SWEEP + 1100) {
      const s = t - T_SWEEP;
      if (s < 300) sy = lerp(-70, LANE_END + 30, easeInOut(s / 300));
      else if (s < 650) sy = LANE_END + 30;
      else sy = lerp(LANE_END + 30, -70, easeInOut((s - 650) / 450));
    }
    sweep.setAttribute("transform", `translate(0 ${sy})`);
  }

  function setHero(i) {
    heroes.forEach((h, j) => h.parts.root.setAttribute("opacity", j === i ? 1 : 0));
    current = i;
    nowName.textContent = heroes[i].name;
  }
  function restart(i) {
    heroes[current].parts.root.setAttribute("opacity", 0);
    setHero(i); t = 0; impactAt = Infinity; newScatter();
  }

  // freeze the throw at a given moment, replaying the ball so the impact time is known
  function seek(target) {
    impactAt = Infinity;
    for (t = T_RELEASE; t < target && impactAt === Infinity; t += 16) render();
    t = target; render();
  }
  function stillFrame() {
    // reduced motion: show the payoff, pins mid-scatter and the strike call
    seek(STILL_AT);
  }

  function tick(now) {
    raf = 0;
    if (!playing || !visible) return;
    const dt = Math.min(64, now - (last || now));
    last = now; t += dt;
    if (t >= T_CYCLE) restart((current + 1) % heroes.length);
    render();
    raf = requestAnimationFrame(tick);
  }
  function play() { if (!raf && playing && visible) { last = 0; raf = requestAnimationFrame(tick); } }

  function setPlaying(on) {
    playing = on;
    btnPause.setAttribute("aria-pressed", on ? "false" : "true");
    pauseLabel.textContent = on ? "עצירה" : "הפעלה";
    if (on) play();
  }

  btnPause.addEventListener("click", () => setPlaying(!playing));
  btnNext.addEventListener("click", () => {
    restart((current + 1) % heroes.length);
    if (playing) play(); else stillFrame();
  });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) play();
  }).observe(scene);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) play(); });
  reduced.addEventListener?.("change", (e) => setPlaying(!e.matches));

  setHero(0);
  // #t=<ms> freezes one frame of the throw (used for review captures)
  const frameAt = /^#t=(\d+)(&og)?$/.exec(location.hash);
  if (frameAt && frameAt[2]) document.documentElement.classList.add("og");
  if (frameAt) {
    setPlaying(false);
    seek(+frameAt[1]);
  } else if (playing) { render(); play(); } else { setPlaying(false); stillFrame(); }
})();
