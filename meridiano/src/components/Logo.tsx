import React, { useState, useEffect } from 'react';

// Custom event to sync logo changes across all Logo components instantly
const LOGO_CHANGE_EVENT = 'meridiano_logo_updated';

export const setCustomLogo = (dataUrl: string | null) => {
  if (dataUrl) {
    localStorage.setItem('meridiano_custom_logo', dataUrl);
  } else {
    localStorage.removeItem('meridiano_custom_logo');
  }
  window.dispatchEvent(new Event(LOGO_CHANGE_EVENT));
};

export const getCustomLogo = (): string | null => {
  try {
    return localStorage.getItem('meridiano_custom_logo');
  } catch {
    return null;
  }
};

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  showSubtitle?: boolean;
  variant?: 'original' | 'light' | 'dark' | 'white';
  color?: string;
  forceVector?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showWordmark = true,
  showSubtitle = true,
  variant = 'original',
  color,
  forceVector = false,
  layout = 'vertical',
}) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => getCustomLogo());

  useEffect(() => {
    const handleUpdate = () => {
      setCustomLogoUrl(getCustomLogo());
    };
    window.addEventListener(LOGO_CHANGE_EVENT, handleUpdate);
    return () => window.removeEventListener(LOGO_CHANGE_EVENT, handleUpdate);
  }, []);

  const sizeMap = {
    sm: { 
      width: 52, 
      height: 38, 
      imgHeight: 'h-9', 
      titleText: 'text-xs tracking-[0.22em] font-bold', 
      subText: 'text-[7.5px] tracking-[0.16em] mt-0.5 font-semibold' 
    },
    md: { 
      width: 74, 
      height: 54, 
      imgHeight: 'h-12', 
      titleText: 'text-sm sm:text-base tracking-[0.25em] font-black', 
      subText: 'text-[8px] sm:text-[9px] tracking-[0.2em] mt-0.5 font-bold' 
    },
    lg: { 
      width: 104, 
      height: 76, 
      imgHeight: 'h-18', 
      titleText: 'text-xl tracking-[0.26em] font-black', 
      subText: 'text-[10px] tracking-[0.2em] mt-1 font-bold' 
    },
    xl: { 
      width: 136, 
      height: 100, 
      imgHeight: 'h-24', 
      titleText: 'text-2xl tracking-[0.28em] font-black', 
      subText: 'text-[11px] tracking-[0.22em] mt-1 font-bold' 
    },
    hero: { 
      width: 180, 
      height: 132, 
      imgHeight: 'h-36', 
      titleText: 'text-3xl sm:text-4xl tracking-[0.28em] font-black', 
      subText: 'text-[12px] tracking-[0.24em] mt-1.5 font-bold' 
    },
  };

  const dim = sizeMap[size];

  // If user uploaded a custom logo, display it directly
  if (!forceVector && customLogoUrl) {
    return (
      <div className={`inline-flex flex-col items-center justify-center text-center select-none ${className}`}>
        <img
          src={customLogoUrl}
          alt="MERIDIANO - Global Sourcing and Trade"
          className={`${dim.imgHeight} w-auto max-w-full object-contain filter drop-shadow-md`}
        />
        {showWordmark && (
          <span
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: '#0F2747' }}
            className={`uppercase leading-none mt-2 ${dim.titleText}`}
          >
            MERIDIANO
          </span>
        )}
        {showSubtitle && (
          <span
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, color: '#0F2747' }}
            className={`uppercase mt-0.5 leading-none ${dim.subText}`}
          >
            Global Sourcing and Trade
          </span>
        )}
      </div>
    );
  }

  // Exact unified monochrome color: #0F2747 or pure white
  const unifiedColor = color || (variant === 'white' ? '#FFFFFF' : '#0F2747');
  const maskStroke = variant === 'white' ? '#070D1A' : '#FFFFFF';

  // SVG Emblem: Monochrome unified in #0F2747
  const emblemSvg = (
    <svg
      viewBox="0 0 160 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: dim.width, height: dim.height }}
      className="overflow-visible shrink-0 filter drop-shadow-xs"
      aria-label="MERIDIANO Emblem"
    >
      {/* Globe Wireframe Hemisphere (Dome) */}
      <path
        d="M 34 82 A 46 46 0 0 1 126 82"
        stroke={unifiedColor}
        strokeWidth="2.4"
        strokeOpacity="0.95"
        fill="none"
      />

      {/* Center vertical meridian */}
      <line
        x1="80"
        y1="36"
        x2="80"
        y2="94"
        stroke={unifiedColor}
        strokeWidth="2.2"
        strokeOpacity="0.95"
      />

      {/* Left meridian ellipse */}
      <path
        d="M 80 36 C 58 48 58 68 80 94"
        stroke={unifiedColor}
        strokeWidth="2.0"
        strokeOpacity="0.9"
        fill="none"
      />

      {/* Right meridian ellipse */}
      <path
        d="M 80 36 C 102 48 102 68 80 94"
        stroke={unifiedColor}
        strokeWidth="2.0"
        strokeOpacity="0.9"
        fill="none"
      />

      {/* Horizontal latitude arc */}
      <path
        d="M 42 66 Q 80 54 118 66"
        stroke={unifiedColor}
        strokeWidth="2.0"
        strokeOpacity="0.9"
        fill="none"
      />

      {/* Bold Geometric Letter 'M' */}
      <path
        d="M 52 92 L 52 42 L 62 42 L 80 73 L 98 42 L 108 42 L 108 92 L 98 92 L 98 57 L 85 79 L 75 79 L 62 57 L 62 92 Z"
        fill={unifiedColor}
      />

      {/* Arched Horizon Line with Terminal End Nodes */}
      <path
        d="M 16 88 Q 80 64 144 88"
        stroke={maskStroke}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Foreground sharp arc */}
      <path
        d="M 16 88 Q 80 64 144 88"
        stroke={unifiedColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Terminal nodes */}
      <circle cx="16" cy="88" r="4.8" fill={unifiedColor} />
      <circle cx="144" cy="88" r="4.8" fill={unifiedColor} />
    </svg>
  );

  // If horizontal layout is requested
  if (layout === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        {emblemSvg}
        <div className="flex flex-col text-left">
          {showWordmark && (
            <span
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: unifiedColor }}
              className={`uppercase leading-none ${dim.titleText} tracking-[0.24em]`}
            >
              MERIDIANO
            </span>
          )}
          {showSubtitle && (
            <span
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, color: unifiedColor }}
              className={`uppercase ${dim.subText} mt-1 leading-none tracking-[0.18em]`}
            >
              Global Sourcing and Trade
            </span>
          )}
        </div>
      </div>
    );
  }

  // Classic Vertical Layout (Monochrome #0F2747)
  return (
    <div className={`inline-flex flex-col items-center justify-center select-none text-center ${className}`}>
      {emblemSvg}

      {/* Wordmark: Montserrat Bold in #0F2747 */}
      {showWordmark && (
        <span
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: unifiedColor }}
          className={`uppercase leading-none mt-2 ${dim.titleText}`}
        >
          MERIDIANO
        </span>
      )}

      {/* Subtitle: Global Sourcing and Trade in #0F2747 */}
      {showSubtitle && (
        <span
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, color: unifiedColor }}
          className={`uppercase mt-0.5 leading-none ${dim.subText}`}
        >
          Global Sourcing and Trade
        </span>
      )}
    </div>
  );
};
