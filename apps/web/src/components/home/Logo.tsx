export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M4 8h14v4H8v4h9v4H8v4h10v4H4V8Z" fill="url(#logo-grad)" />
      <path d="M18 8h10v4h-6v16h-4V8Z" fill="url(#logo-grad-2)" />
      <defs>
        <linearGradient id="logo-grad" x1="4" y1="8" x2="18" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C9A15A" />
          <stop offset="1" stopColor="#8A6F3B" />
        </linearGradient>
        <linearGradient id="logo-grad-2" x1="18" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8CE8C" />
          <stop offset="1" stopColor="#C9A15A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  tagline = true,
  logoImage,
  siteName = "Marwa Digital",
  taglineText = "Ride Easy. Explore Freely.",
}: {
  className?: string;
  tagline?: boolean;
  logoImage?: string | null;
  siteName?: string;
  taglineText?: string;
}) {
  const [namePrefix, ...nameRest] = siteName.split(/(?<=^[A-Za-z])/);
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {logoImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content; next/image's optimizer rejects it, see Hero/ImageBox/SiteLogo for the same fix
        <img src={logoImage} alt={siteName} className="h-8 w-8 shrink-0 object-contain" />
      ) : (
        <LogoMark className="h-8 w-8 shrink-0" />
      )}
      <div className="leading-tight">
        <div className="text-lg font-bold text-white">
          {siteName.length > 1 ? (
            <>
              {namePrefix}
              <span className="font-normal">{nameRest.join("")}</span>
            </>
          ) : (
            siteName
          )}
        </div>
        {tagline && (
          <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-gold">
            {taglineText}
          </div>
        )}
      </div>
    </div>
  );
}
