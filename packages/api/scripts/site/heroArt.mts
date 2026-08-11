// Generates the hero artwork as vector graphics.
//
// Two reasons this is drawn rather than uploaded: media uploads still need a
// Vercel Blob write token that isn't configured, and a generated SVG is
// resolution-independent — a hero spans 1920px+ on a desktop and stays crisp
// on a retina display without shipping a multi-megabyte photograph.
//
// The palette is taken straight from the brand tokens, so the artwork can't
// drift out of sync with the rest of the site the way a stock photo does.

/**
 * "Digital wave" — flowing blue-to-violet ribbons over deep navy with a
 * particle field, matching the reference artwork. Deterministic: the
 * pseudo-random particle scatter is seeded so re-running this produces
 * byte-identical output rather than a slightly different image each deploy.
 */
export function digitalWaveSvg(): string {
  const W = 1600;
  const H = 800;

  // Seeded LCG — Math.random() would make the output non-reproducible.
  let seed = 20260811;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  /** One flowing ribbon, as a smooth cubic path across the full width. */
  const wave = (yBase: number, amp: number, phase: number, thickness: number, opacity: number, gradId: string) => {
    const pts: string[] = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const x = (W / steps) * i;
      const y = yBase + Math.sin(i * 0.85 + phase) * amp + Math.sin(i * 0.31 + phase * 1.7) * (amp * 0.35);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    let d = `M ${pts[0]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1].split(",").map(Number);
      const [cx, cy] = pts[i].split(",").map(Number);
      const mx = (px + cx) / 2;
      d += ` Q ${px.toFixed(1)},${py.toFixed(1)} ${mx.toFixed(1)},${((py + cy) / 2).toFixed(1)}`;
      if (i === pts.length - 1) d += ` T ${cx.toFixed(1)},${cy.toFixed(1)}`;
    }
    return `<path d="${d}" fill="none" stroke="url(#${gradId})" stroke-width="${thickness}" stroke-linecap="round" opacity="${opacity}" filter="url(#glow)"/>`;
  };

  const ribbons: string[] = [];
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    ribbons.push(
      wave(
        H * 0.52 + (t - 0.5) * 230,
        70 + t * 40,
        t * 2.4,
        1 + (1 - Math.abs(t - 0.5) * 2) * 1.6,
        0.20 + (1 - Math.abs(t - 0.5) * 2) * 0.55,
        i % 2 === 0 ? "ribbonA" : "ribbonB"
      )
    );
  }

  // Particle field, densest along the wave band so it reads as part of the
  // same form rather than noise scattered over the whole frame.
  const dots: string[] = [];
  for (let i = 0; i < 420; i++) {
    const x = rand() * W;
    const bandPull = Math.sin((x / W) * 3.1) * 90;
    const y = H * 0.5 + bandPull + (rand() - 0.5) * 520;
    const r = rand() * 1.9 + 0.35;
    const o = 0.16 + rand() * 0.68;
    const fill = rand() > 0.72 ? "#a78bfa" : rand() > 0.4 ? "#60a5fa" : "#ffffff";
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${fill}" opacity="${o.toFixed(2)}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#050a24"/><stop offset="52%" stop-color="#0a1140"/><stop offset="100%" stop-color="#1b0e46"/>
</linearGradient>
<radialGradient id="halo" cx="52%" cy="50%" r="55%">
<stop offset="0%" stop-color="#2563ff" stop-opacity="0.34"/><stop offset="100%" stop-color="#2563ff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="ribbonA" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#1e40af" stop-opacity="0.25"/><stop offset="42%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/>
</linearGradient>
<linearGradient id="ribbonB" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.22"/><stop offset="55%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#a855f7"/>
</linearGradient>
<filter id="glow" x="-12%" y="-60%" width="124%" height="220%">
<feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
${ribbons.join("\n")}
${dots.join("")}
</svg>`;
}

/** Shared seeded PRNG factory — see the note in digitalWaveSvg on why. */
function seeded(initial: number) {
  let seed = initial;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** A patch of evenly-spaced dots, used as a graphic accent in the corners. */
function dotGrid(x0: number, y0: number, cols: number, rows: number, step: number, fill: string, opacity: number): string {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(`<circle cx="${x0 + c * step}" cy="${y0 + r * step}" r="2.4" fill="${fill}" opacity="${opacity}"/>`);
    }
  }
  return out.join("");
}

/**
 * "Ribbon wave" — silky layered bands sweeping across the frame with a
 * white-hot highlight running along their crest, over deep navy. The bright
 * core is what gives this its sense of speed, so it's drawn as its own
 * heavily-blurred stroke on top of the band rather than as a lighter colour.
 */
export function ribbonWaveSvg(): string {
  const W = 1720;
  const H = 900;

  /**
   * A wave path. `amp` scales height, `phase` shifts it along, and `skew`
   * tilts the whole run so bands sweep diagonally instead of sitting level —
   * the tilt is most of what makes these read as ribbons in motion.
   */
  const path = (yBase: number, amp: number, phase: number, skew = 0) => {
    const pts: string[] = [];
    for (let i = 0; i <= 72; i++) {
      const t = i / 72;
      const x = W * t;
      const y =
        yBase +
        t * skew +
        Math.sin(t * Math.PI * 1.9 + phase) * amp +
        Math.sin(t * Math.PI * 3.7 + phase * 1.5) * amp * 0.22;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${pts.join(" L ")}`;
  };

  /**
   * One ribbon = a dense sheet of near-parallel hairlines. Drawing it as many
   * fine strokes rather than a few thick ones is what produces the woven,
   * silky surface; a thick stroke just reads as a flat band.
   */
  const ribbon = (opts: {
    y: number; amp: number; phase: number; skew: number;
    count: number; spread: number; grad: string; peak: number;
  }) => {
    const out: string[] = [];
    for (let i = 0; i < opts.count; i++) {
      const t = i / (opts.count - 1);
      // Opacity peaks mid-sheet and falls to nothing at both edges, so the
      // ribbon fades into the ground instead of ending on a hard line.
      const edge = 1 - Math.abs(t - 0.5) * 2;
      out.push(
        `<path d="${path(opts.y + t * opts.spread, opts.amp - t * opts.amp * 0.16, opts.phase + t * 0.22, opts.skew)}" fill="none" stroke="url(#${opts.grad})" stroke-width="1.15" opacity="${(edge * opts.peak).toFixed(3)}"/>`
      );
    }
    return out.join("");
  };

  // Four sheets crossing at different tilts and phases. The overlaps are the
  // point — where two sheets cross, the additive brightness reads as a fold.
  const sheets = [
    ribbon({ y: 300, amp: 150, phase: 0.5, skew: 250, count: 74, spread: 250, grad: "rwA", peak: 0.85 }),
    ribbon({ y: 210, amp: 120, phase: 2.5, skew: 330, count: 60, spread: 215, grad: "rwB", peak: 0.68 }),
    ribbon({ y: 520, amp: 165, phase: 3.6, skew: -190, count: 66, spread: 230, grad: "rwB", peak: 0.72 }),
    ribbon({ y: 120, amp: 95, phase: 5.1, skew: 150, count: 40, spread: 150, grad: "rwA", peak: 0.5 }),
  ].join("");

  // Broad blurred bodies sit behind the hairlines to give the sheets volume.
  const bodies = [
    `<path d="${path(430, 150, 0.5, 250)}" fill="none" stroke="url(#rwA)" stroke-width="150" opacity="0.24" filter="url(#soft)"/>`,
    `<path d="${path(640, 160, 3.6, -190)}" fill="none" stroke="url(#rwB)" stroke-width="120" opacity="0.20" filter="url(#soft)"/>`,
  ].join("");

  /**
   * The lit crest. Three passes: a wide bloom, a tinted mid pass, and a tight
   * white filament. Splitting them is what reads as light rather than as a
   * white line — a single stroke, however bright, always looks drawn.
   */
  const filament = (y: number, amp: number, phase: number, skew: number, strength: number) => {
    const d = path(y, amp, phase, skew);
    return (
      `<path d="${d}" fill="none" stroke="url(#rwHot)" stroke-width="16" opacity="${(0.5 * strength).toFixed(2)}" filter="url(#bloom)"/>` +
      `<path d="${d}" fill="none" stroke="#dbe7ff" stroke-width="5" opacity="${(0.55 * strength).toFixed(2)}" filter="url(#tight)"/>` +
      `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="${(0.95 * strength).toFixed(2)}"/>`
    );
  };

  const crest = filament(452, 150, 0.5, 250, 1) + filament(668, 158, 3.6, -190, 0.62);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bgrw" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#01040f"/><stop offset="42%" stop-color="#040a2e"/><stop offset="100%" stop-color="#0d0640"/>
</linearGradient>
<linearGradient id="rwA" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#1e40af" stop-opacity="0.5"/><stop offset="38%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#a855f7"/>
</linearGradient>
<linearGradient id="rwB" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.45"/><stop offset="46%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#c026d3"/>
</linearGradient>
<linearGradient id="rwHot" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#60a5fa"/><stop offset="45%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e879f9"/>
</linearGradient>
<radialGradient id="glowrw" cx="74%" cy="52%" r="42%">
<stop offset="0%" stop-color="#7c3aed" stop-opacity="0.40"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
</radialGradient>
<filter id="soft" x="-20%" y="-90%" width="140%" height="280%"><feGaussianBlur stdDeviation="26"/></filter>
<filter id="bloom" x="-20%" y="-90%" width="140%" height="280%"><feGaussianBlur stdDeviation="13"/></filter>
<filter id="tight" x="-20%" y="-90%" width="140%" height="280%"><feGaussianBlur stdDeviation="3.5"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bgrw)"/>
<rect width="${W}" height="${H}" fill="url(#glowrw)"/>
${bodies}
${sheets}
${crest}
${dotGrid(790, 10, 14, 9, 26, "#3b82f6", 0.5)}
${dotGrid(1270, 660, 9, 7, 26, "#8b5cf6", 0.42)}
</svg>`;
}

/**
 * "Particle mesh" — a wireframe terrain of dots joined by short lines, rolling
 * in waves toward the horizon, with lit stems rising from it. Rows are spaced
 * on an eased curve and both dot size and line opacity fall off with depth, so
 * the flat SVG reads as receding perspective without any 3D projection.
 */
export function particleMeshSvg(): string {
  const W = 1720;
  const H = 970;
  const rand = seeded(778291);

  const ROWS = 26;
  const COLS = 62;
  const horizon = H * 0.42;

  type P = { x: number; y: number; d: number };
  const grid: P[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const t = r / (ROWS - 1);
    // Eased depth: rows bunch up toward the horizon.
    const depth = Math.pow(t, 1.9);
    const rowY = horizon + depth * (H - horizon) * 1.06;
    const spread = 0.34 + depth * 1.5;
    const row: P[] = [];
    for (let c = 0; c < COLS; c++) {
      const u = c / (COLS - 1);
      const x = W / 2 + (u - 0.5) * W * spread;
      const wave =
        Math.sin(u * Math.PI * 3.1 + t * 2.2) * (26 + depth * 78) +
        Math.sin(u * Math.PI * 1.4 - t * 3.0) * (16 + depth * 46);
      row.push({ x, y: rowY + wave * (0.35 + depth), d: depth });
    }
    grid.push(row);
  }

  /** Blue near the left, violet toward the right — the brand sweep. */
  const hue = (u: number) => (u < 0.42 ? "#38bdf8" : u < 0.62 ? "#3b82f6" : u < 0.82 ? "#7c3aed" : "#c026d3");

  const lines: string[] = [];
  const dots: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = grid[r][c];
      const u = c / (COLS - 1);
      const fade = 0.1 + p.d * 0.72;
      if (c < COLS - 1) {
        const q = grid[r][c + 1];
        lines.push(`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="${hue(u)}" stroke-width="${(0.35 + p.d * 0.5).toFixed(2)}" opacity="${(fade * 0.5).toFixed(2)}"/>`);
      }
      if (r < ROWS - 1) {
        const q = grid[r + 1][c];
        lines.push(`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="${hue(u)}" stroke-width="${(0.3 + p.d * 0.45).toFixed(2)}" opacity="${(fade * 0.34).toFixed(2)}"/>`);
      }
      dots.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(0.7 + p.d * 2.1).toFixed(2)}" fill="${hue(u)}" opacity="${Math.min(0.95, fade + 0.2).toFixed(2)}"/>`);
    }
  }

  // Crest filaments: bright lines tracing a few rows, echoing the reference's
  // lit wave edges.
  const crests: string[] = [];
  for (const r of [11, 15, 19]) {
    const d = grid[r].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
    crests.push(`<path d="M ${d}" fill="none" stroke="url(#pmCrest)" stroke-width="3.4" opacity="0.5" filter="url(#pmBloom)"/>`);
    crests.push(`<path d="M ${d}" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.7"/>`);
  }

  // Stems rising above the horizon, each capped with a lit node.
  const stems: string[] = [];
  for (let i = 0; i < 46; i++) {
    const x = rand() * W;
    const baseY = horizon + rand() * 90;
    const h = 70 + rand() * 300;
    const col = hue(x / W);
    stems.push(
      `<line x1="${x.toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(baseY - h).toFixed(1)}" stroke="${col}" stroke-width="1.1" opacity="${(0.22 + rand() * 0.3).toFixed(2)}"/>` +
        `<circle cx="${x.toFixed(1)}" cy="${(baseY - h).toFixed(1)}" r="${(2.6 + rand() * 3.4).toFixed(2)}" fill="${col}" opacity="${(0.6 + rand() * 0.38).toFixed(2)}"/>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bgpm" x1="0" y1="0" x2="0.7" y2="1">
<stop offset="0%" stop-color="#050b28"/><stop offset="58%" stop-color="#07124a"/><stop offset="100%" stop-color="#180a4e"/>
</linearGradient>
<linearGradient id="pmCrest" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#22d3ee"/><stop offset="48%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#d946ef"/>
</linearGradient>
<filter id="pmBloom" x="-10%" y="-140%" width="120%" height="380%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bgpm)"/>
${dotGrid(70, 40, 10, 6, 24, "#3b82f6", 0.34)}
${dotGrid(1560, 30, 4, 3, 22, "#6366f1", 0.4)}
${stems.join("")}
${lines.join("")}
${crests.join("")}
${dots.join("")}
</svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg.trim(), "utf8").toString("base64")}`;
}
