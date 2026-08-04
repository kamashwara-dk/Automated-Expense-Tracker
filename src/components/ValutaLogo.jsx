/**
 * My Valuta — SVG Logo Component
 * Scalable, crisp at any size. Designed to match the PNG icon set.
 *
 * Props:
 *   size   — width/height in px (default 40)
 *   className — extra classes
 */
export default function ValutaLogo({ size = 40, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="My Valuta logo"
    >
      <defs>
        <linearGradient id="mv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f1e3a" />
          <stop offset="100%" stopColor="#070b12" />
        </linearGradient>
        <linearGradient id="mv-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#55e89a" />
          <stop offset="100%" stopColor="#74FFAC" />
        </linearGradient>
        <filter id="mv-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="mv-clip">
          <rect x="5" y="5" width="90" height="90" rx="22" ry="22" />
        </clipPath>
      </defs>

      {/* Card background */}
      <rect x="5" y="5" width="90" height="90" rx="22" ry="22" fill="url(#mv-bg)" />

      {/* Subtle border */}
      <rect
        x="5.5" y="5.5" width="89" height="89" rx="21.5" ry="21.5"
        fill="none" stroke="rgba(116,255,172,0.2)" strokeWidth="1"
      />

      {/* Mint glow blob */}
      <ellipse
        cx="50" cy="44" rx="30" ry="22"
        fill="#74FFAC" opacity="0.10"
        clipPath="url(#mv-clip)"
      />

      {/* V lettermark */}
      <g filter="url(#mv-glow)" clipPath="url(#mv-clip)">
        <polyline
          points="20,24 50,70 80,24"
          fill="none"
          stroke="url(#mv-v)"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Trend spark line crossing right arm */}
      <polyline
        points="54,52 61,42 68,46 77,29"
        fill="none"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
        clipPath="url(#mv-clip)"
      />
      {/* Spark peak dot */}
      <circle cx="77" cy="29" r="3.2" fill="white" opacity="0.95" clipPath="url(#mv-clip)" />

      {/* Bottom 3-dot accent */}
      <circle cx="41" cy="82" r="2.6" fill="#74FFAC" />
      <circle cx="50" cy="82" r="2.6" fill="#FF4885" />
      <circle cx="59" cy="82" r="2.6" fill="#74FFAC" />
    </svg>
  );
}
