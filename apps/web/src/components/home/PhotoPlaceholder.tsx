import type { ReactNode } from "react";

const GRADIENTS: Record<string, string> = {
  airport: "linear-gradient(135deg, #2b2620 0%, #4a3f2c 45%, #8a6f3b 100%)",
  hotel: "linear-gradient(135deg, #1e2422 0%, #2f3a35 45%, #4d6a5c 100%)",
  ski: "linear-gradient(135deg, #101a2b 0%, #1c3a5e 45%, #3f7fb0 100%)",
  fleet: "linear-gradient(135deg, #0d0d0f 0%, #1c1c1f 60%, #2a2a2e 100%)",
};

/**
 * Tasteful gradient + icon placeholder standing in for client-supplied fleet
 * and location photography (per BLUEPRINT.md, real images are a client
 * responsibility). Swap for next/image once real assets are provided.
 */
export function PhotoPlaceholder({
  variant,
  icon,
  className,
}: {
  variant: keyof typeof GRADIENTS;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
      style={{ background: GRADIENTS[variant] }}
    >
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%)]" />
      {icon && <div className="relative text-white/70">{icon}</div>}
    </div>
  );
}
