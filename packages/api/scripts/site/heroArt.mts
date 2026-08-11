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

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg.trim(), "utf8").toString("base64")}`;
}
