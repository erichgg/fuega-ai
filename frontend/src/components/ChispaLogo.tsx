export function ChispaLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fuega AI logo">
      <defs>
        <linearGradient id="chispa-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B2C" />
          <stop offset="0.45" stopColor="#FF3CAC" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="chispa-flame" x1="16" y1="5" x2="16" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#FFE0CC" />
          <stop offset="1" stopColor="#FFB088" />
        </linearGradient>
        <filter id="glow" x="-2" y="-2" width="36" height="36">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="chispa-inner" cx="16" cy="18" r="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background with rounded square */}
      <rect width="32" height="32" rx="7.5" fill="url(#chispa-bg)" />

      {/* Subtle inner glow */}
      <rect width="32" height="32" rx="7.5" fill="url(#chispa-inner)" />

      {/* Main spark/flame — elegant stylized shape */}
      <g filter="url(#glow)">
        {/* Outer flame silhouette */}
        <path
          d="M16 5.5C16 5.5 21.5 10.5 21.5 15.5C21.5 17.2 20.8 18.7 19.6 19.7C20.2 17.8 19.5 15.5 17.5 13.5C17.5 13.5 18 17 16 19C14 17 14.5 13.5 14.5 13.5C12.5 15.5 11.8 17.8 12.4 19.7C11.2 18.7 10.5 17.2 10.5 15.5C10.5 10.5 16 5.5 16 5.5Z"
          fill="url(#chispa-flame)"
          fillOpacity="0.95"
        />
        {/* Inner bright core */}
        <path
          d="M16 14C16 14 18.8 16.8 18.8 19.5C18.8 21.2 17.8 22.5 16.5 23.2C16.5 23.2 17.3 21.5 16 19.8C14.7 21.5 15.5 23.2 15.5 23.2C14.2 22.5 13.2 21.2 13.2 19.5C13.2 16.8 16 14 16 14Z"
          fill="white"
          fillOpacity="0.85"
        />
        {/* Tiny bright tip */}
        <ellipse cx="16" cy="21" rx="1.3" ry="1.8" fill="white" fillOpacity="0.6" />
      </g>

      {/* Spark particles — chispa means spark */}
      <circle cx="9" cy="9" r="1" fill="white" fillOpacity="0.7">
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="23" cy="7.5" r="0.7" fill="white" fillOpacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="24.5" cy="12" r="0.9" fill="white" fillOpacity="0.6">
        <animate attributeName="opacity" values="0.6;0.25;0.6" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="7.5" cy="14" r="0.6" fill="white" fillOpacity="0.4">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Subtle highlight stroke */}
      <rect x="0.5" y="0.5" width="31" height="31" rx="7" stroke="white" strokeOpacity="0.12" strokeWidth="0.5" fill="none" />
    </svg>
  );
}
