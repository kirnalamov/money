"use client";

import { useState } from "react";
import { logoUrl, PriceHint } from "@/lib/moex";
import { cn } from "@/lib/utils";

interface Props {
  symbol: string;
  hint: PriceHint;
  size: number;
  radius: number;
  /** цвет буквы-заглушки и её подложки */
  color: string;
}

/** Логотип бумаги с бэкенда; пока грузится или если его нет — цветная буква */
export function SecurityLogo({ symbol, hint, size, radius, color }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <span
      className="relative flex flex-none items-center justify-center overflow-hidden font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: loaded ? "rgba(255,255,255,0.06)" : `${color}24`,
        color,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {!loaded && symbol.charAt(0)}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl(symbol, hint)}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </span>
  );
}
