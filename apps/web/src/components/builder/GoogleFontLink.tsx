import { isGoogleFont } from "@marwa/builder";

/**
 * Loads a Google Font on demand for a single block, rather than every block
 * on the page paying for every family anyone ever picked. Renders nothing
 * for system fonts or "inherit" — those cost no extra request. Multiple
 * blocks using the same family each render an identical <link>, which the
 * browser dedupes to one request; simpler than aggregating families across
 * the whole page tree for a marginal saving.
 */
export function GoogleFontLink({ family }: { family?: string }) {
  if (!isGoogleFont(family)) return null;
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  return <link rel="stylesheet" href={href} />;
}
