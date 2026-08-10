"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";

const ITEMS = [
  { id: "airport", label: "Airport Transfer", image: "/images/services/airport-thumb.png" },
  { id: "hotel", label: "Intercity Transfer", image: "/images/services/hotel.png" },
  { id: "ski", label: "Ski Transfer", image: "/images/services/ski.png" },
];

export function MiniServicePreview({ className }: { className?: string }) {
  const [active, setActive] = useState(0);
  const imgRef = useRef<HTMLDivElement | null>(null);

  function select(index: number) {
    if (index === active) return;
    setActive(index);
    if (imgRef.current) {
      gsap.fromTo(imgRef.current, { opacity: 0.2 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    }
  }

  return (
    <div
      className={`flex rounded-[6px] border-[0.5px] border-[#555555] p-2 gap-2 shadow-2xl backdrop-blur-md ${className ?? ""}`}
      style={{
        background: 'radial-gradient(95.94% 265.84% at -7.89% 112.42%, rgba(255, 255, 255, 0.25) 0%, rgba(0, 0, 0, 0.25) 100%), radial-gradient(38.14% 268.59% at 17.37% 138.64%, rgba(37, 99, 255, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)'
      }}
    >
      <ul className="flex w-48 flex-col gap-2">
        {ITEMS.map((item, i) => (
          <li key={item.id} className="flex-1">
            <button
              type="button"
              onMouseEnter={() => select(i)}
              onClick={() => select(i)}
              className={`flex h-full w-full items-center justify-start rounded-[6px] px-5 py-3 text-[15px] font-medium transition-all ${
                active === i 
                  ? "text-gold border-[0.5px] border-[#555555]/50 shadow-inner" 
                  : "text-white/80 hover:text-white"
              }`}
              style={{
                background: active === i 
                  ? 'radial-gradient(38.14% 268.59% at 17.37% 138.64%, rgba(37, 99, 255, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)'
                  : 'radial-gradient(93.22% 596.83% at -37.71% 120.45%, rgba(255, 255, 255, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)'
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <div ref={imgRef} className="relative h-[200px] w-[280px] shrink-0 overflow-hidden rounded-[4px]">
        <Image src={ITEMS[active].image} alt={ITEMS[active].label} fill sizes="280px" className="object-cover" />
      </div>
    </div>
  );
}
