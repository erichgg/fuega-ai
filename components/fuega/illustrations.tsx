import { cn } from "@/lib/utils";

interface IllustrationProps {
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Shared CSS animation classNames — uses Tailwind's arbitrary values        */
/*  to avoid dangerouslySetInnerHTML entirely.                                */
/*  Animations are defined inline via style props on individual elements.     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  EmptyFeedIllustration                                                     */
/*  Cold logs with small wisps of smoke. Used on empty feed states.           */
/* -------------------------------------------------------------------------- */

export function EmptyFeedIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[120px] w-[120px]", className)}
      aria-hidden="true"
    >
      {/* Ground */}
      <ellipse cx="60" cy="100" rx="45" ry="6" fill="#2a2a2a" />
      {/* Log 1 */}
      <rect x="25" y="82" width="50" height="12" rx="6" fill="#CC4A10" opacity="0.4" />
      {/* Log 2 */}
      <rect x="35" y="72" width="45" height="11" rx="5.5" fill="#CC4A10" opacity="0.35" transform="rotate(-12 57 77)" />
      {/* Log cross marks */}
      <circle cx="40" cy="88" r="2" fill="#1a1a1a" opacity="0.3" />
      <circle cx="55" cy="86" r="1.5" fill="#1a1a1a" opacity="0.3" />
      {/* Smoke wisps */}
      <circle cx="50" cy="65" r="3" fill="#666" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="65;47;65" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="58" cy="60" r="2.5" fill="#666" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0;0.25" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="60;40;60" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="54" cy="58" r="2" fill="#999" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="cy" values="58;38;58" dur="4s" begin="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmptySearchIllustration                                                   */
/*  Magnifying glass with a small flame inside the lens.                      */
/* -------------------------------------------------------------------------- */

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[120px] w-[120px]", className)}
      aria-hidden="true"
    >
      {/* Lens circle */}
      <circle cx="52" cy="50" r="30" stroke="#666" strokeWidth="4" fill="#1a1a1a" />
      {/* Inner glow */}
      <circle cx="52" cy="50" r="26" fill="#2a2a2a" />
      {/* Flame inside lens */}
      <path
        d="M52 62 C46 55, 44 48, 48 42 C50 39, 52 38, 52 35 C52 38, 54 39, 56 42 C60 48, 58 55, 52 62Z"
        fill="#FF6B2C"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path
        d="M52 62 C49 57, 48 52, 50 47 C51 44, 52 43, 52 41 C52 43, 53 44, 54 47 C56 52, 55 57, 52 62Z"
        fill="#FF8F5C"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
      </path>
      {/* Handle */}
      <line x1="74" y1="72" x2="95" y2="93" stroke="#666" strokeWidth="5" strokeLinecap="round" />
      {/* Spark on lens rim */}
      <circle cx="32" cy="34" r="2" fill="#FF4500" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmptyNotificationsIllustration                                            */
/*  A bell with a sleeping "z" and ember.                                     */
/* -------------------------------------------------------------------------- */

export function EmptyNotificationsIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[120px] w-[120px]", className)}
      aria-hidden="true"
    >
      {/* Bell body */}
      <path
        d="M40 70 C40 50, 42 35, 60 30 C78 35, 80 50, 80 70 L40 70Z"
        fill="#2a2a2a"
        stroke="#666"
        strokeWidth="2"
      />
      {/* Bell rim */}
      <rect x="35" y="70" width="50" height="6" rx="3" fill="#666" />
      {/* Clapper */}
      <circle cx="60" cy="82" r="5" fill="#666" />
      {/* Bell top knob */}
      <circle cx="60" cy="28" r="4" fill="#666" />
      {/* Sleeping Z's */}
      <text x="72" y="28" fill="#999" fontSize="12" fontWeight="bold" fontFamily="monospace" opacity="0.6">
        z
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y" values="28;25;28" dur="2s" repeatCount="indefinite" />
      </text>
      <text x="82" y="20" fill="#999" fontSize="10" fontWeight="bold" fontFamily="monospace" opacity="0.6">
        z
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.4s" repeatCount="indefinite" />
        <animate attributeName="y" values="20;17;20" dur="2s" begin="0.4s" repeatCount="indefinite" />
      </text>
      <text x="90" y="14" fill="#999" fontSize="8" fontWeight="bold" fontFamily="monospace" opacity="0.6">
        z
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="14;11;14" dur="2s" begin="0.8s" repeatCount="indefinite" />
      </text>
      {/* Small ember glow at bottom */}
      <circle cx="60" cy="76" r="2" fill="#CC4A10" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  GovernanceIllustration                                                    */
/*  Ballot box with a flame/spark coming out of the slot.                     */
/* -------------------------------------------------------------------------- */

export function GovernanceIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[120px] w-[160px]", className)}
      aria-hidden="true"
    >
      {/* Box body */}
      <rect x="40" y="40" width="80" height="60" rx="4" fill="#2a2a2a" stroke="#666" strokeWidth="2" />
      {/* Box lid */}
      <rect x="36" y="34" width="88" height="12" rx="3" fill="#2a2a2a" stroke="#666" strokeWidth="2" />
      {/* Slot */}
      <rect x="62" y="36" width="36" height="4" rx="2" fill="#1a1a1a" />
      {/* Ballot paper going into slot */}
      <rect x="72" y="18" width="16" height="22" rx="1" fill="#999" opacity="0.7" />
      <line x1="75" y1="24" x2="85" y2="24" stroke="#666" strokeWidth="1" />
      <line x1="75" y1="28" x2="83" y2="28" stroke="#666" strokeWidth="1" />
      {/* Flame spark from slot */}
      <path
        d="M80 20 C77 16, 76 12, 78 8 C79 6, 80 5, 80 3 C80 5, 81 6, 82 8 C84 12, 83 16, 80 20Z"
        fill="#FF4500"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path
        d="M80 18 C78.5 15, 78 12, 79 9 C79.5 7.5, 80 7, 80 5.5 C80 7, 80.5 7.5, 81 9 C82 12, 81.5 15, 80 18Z"
        fill="#FF8F5C"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
      </path>
      {/* Sparks */}
      <circle cx="74" cy="10" r="1.5" fill="#FF6B2C">
        <animate attributeName="cy" values="10;-8" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="86" cy="12" r="1" fill="#00D4AA">
        <animate attributeName="cy" values="12;-6" dur="2.5s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.5s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      {/* Check mark on box */}
      <path d="M70 65 L77 72 L92 57" stroke="#00D4AA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  CampfireIllustration                                                      */
/*  Lit campfire with logs, flames, and sparks rising.                        */
/* -------------------------------------------------------------------------- */

export function CampfireIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[160px] w-[160px]", className)}
      aria-hidden="true"
    >
      {/* Ground */}
      <ellipse cx="80" cy="135" rx="55" ry="8" fill="#2a2a2a" />
      {/* Stone ring */}
      <ellipse cx="80" cy="128" rx="48" ry="10" fill="none" stroke="#666" strokeWidth="3" strokeDasharray="8 4" opacity="0.4" />
      {/* Logs */}
      <rect x="42" y="112" width="55" height="14" rx="7" fill="#CC4A10" opacity="0.7" />
      <rect x="58" y="104" width="52" height="13" rx="6.5" fill="#CC4A10" opacity="0.6" transform="rotate(-15 84 110)" />
      <rect x="55" y="116" width="48" height="12" rx="6" fill="#CC4A10" opacity="0.5" transform="rotate(10 79 122)" />
      {/* Main flame */}
      <path
        d="M80 110 C65 90, 58 70, 68 50 C72 42, 78 36, 80 28 C82 36, 88 42, 92 50 C102 70, 95 90, 80 110Z"
        fill="#FF4500"
      >
        <animateTransform attributeName="transform" type="translate" values="0,0;3,0;0,0;-2,0;0,0" dur="2s" repeatCount="indefinite" />
      </path>
      {/* Inner flame */}
      <path
        d="M80 108 C70 94, 66 78, 72 62 C75 55, 79 50, 80 44 C81 50, 85 55, 88 62 C94 78, 90 94, 80 108Z"
        fill="#FF6B2C"
      >
        <animateTransform attributeName="transform" type="translate" values="0,0;2,0;0,0;-3,0;0,0" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </path>
      {/* Core flame */}
      <path
        d="M80 105 C74 96, 72 84, 76 72 C78 67, 80 64, 80 58 C80 64, 82 67, 84 72 C88 84, 86 96, 80 105Z"
        fill="#FF8F5C"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
      </path>
      {/* Rising sparks */}
      <circle cx="72" cy="40" r="2" fill="#FF6B2C">
        <animate attributeName="cy" values="40;22" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="35" r="1.5" fill="#FF4500">
        <animate attributeName="cy" values="35;17" dur="2.5s" begin="0.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.5s" begin="0.7s" repeatCount="indefinite" />
      </circle>
      <circle cx="78" cy="30" r="1" fill="#00D4AA">
        <animate attributeName="cy" values="30;12" dur="3s" begin="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="3s" begin="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="85" cy="25" r="1.5" fill="#FF8F5C">
        <animate attributeName="cy" values="25;7" dur="2.2s" begin="0.3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.2s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="22" r="1" fill="#FF6B2C">
        <animate attributeName="cy" values="22;4" dur="2.8s" begin="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.8s" begin="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  NotFoundIllustration                                                      */
/*  Broken/cracked campfire ring with scattered embers.                       */
/* -------------------------------------------------------------------------- */

export function NotFoundIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[160px] w-[200px]", className)}
      aria-hidden="true"
    >
      {/* Ground */}
      <ellipse cx="100" cy="130" rx="70" ry="10" fill="#2a2a2a" />
      {/* Broken ring - left arc */}
      <path
        d="M40 120 C40 100, 55 85, 80 82"
        stroke="#666"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Broken ring - right arc */}
      <path
        d="M120 82 C145 85, 160 100, 160 120"
        stroke="#666"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Crack lines */}
      <path d="M80 82 L88 78 L85 85" stroke="#666" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M120 82 L112 78 L115 85" stroke="#666" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Scattered broken logs */}
      <rect x="55" y="108" width="30" height="10" rx="5" fill="#CC4A10" opacity="0.3" transform="rotate(-8 70 113)" />
      <rect x="110" y="110" width="28" height="9" rx="4.5" fill="#CC4A10" opacity="0.25" transform="rotate(12 124 114)" />
      <rect x="82" y="115" width="22" height="8" rx="4" fill="#CC4A10" opacity="0.2" />
      {/* Scattered embers */}
      <circle cx="65" cy="100" r="2" fill="#FF4500" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="105" r="1.5" fill="#CC4A10" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="95" cy="108" r="2.5" fill="#FF6B2C" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.7;0.35" dur="2.5s" begin="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="115" cy="98" r="1" fill="#00D4AA" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" begin="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="95" r="1.5" fill="#FF8F5C" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" begin="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Faint smoke */}
      <circle cx="90" cy="85" r="3" fill="#666" opacity="0.15">
        <animate attributeName="cy" values="85;65" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="105" cy="80" r="2.5" fill="#666" opacity="0.1">
        <animate attributeName="cy" values="80;60" dur="5s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0" dur="5s" begin="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  SecurityIllustration                                                      */
/*  Shield with a flame emblem.                                               */
/* -------------------------------------------------------------------------- */

export function SecurityIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[140px] w-[120px]", className)}
      aria-hidden="true"
    >
      {/* Shield shape */}
      <path
        d="M60 10 L15 30 L15 70 C15 95, 35 115, 60 130 C85 115, 105 95, 105 70 L105 30 Z"
        fill="#2a2a2a"
        stroke="#666"
        strokeWidth="2.5"
      />
      {/* Inner shield highlight */}
      <path
        d="M60 18 L22 35 L22 68 C22 90, 39 108, 60 122 C81 108, 98 90, 98 68 L98 35 Z"
        fill="#1a1a1a"
      />
      {/* Flame emblem */}
      <path
        d="M60 95 C48 80, 42 65, 48 50 C52 42, 58 36, 60 28 C62 36, 68 42, 72 50 C78 65, 72 80, 60 95Z"
        fill="#FF4500"
      >
        <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
      </path>
      <path
        d="M60 90 C52 78, 48 66, 52 55 C54 49, 58 45, 60 38 C62 45, 66 49, 68 55 C72 66, 68 78, 60 90Z"
        fill="#FF6B2C"
      >
        <animate attributeName="opacity" values="1;0.7;1" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </path>
      <path
        d="M60 84 C55 76, 53 67, 56 60 C57.5 56, 59 53, 60 49 C61 53, 62.5 56, 64 60 C67 67, 65 76, 60 84Z"
        fill="#FF8F5C"
      >
        <animate attributeName="opacity" values="1;0.7;1" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
      </path>
      {/* Shield glow accent */}
      <path
        d="M60 10 L15 30 L15 70 C15 95, 35 115, 60 130 C85 115, 105 95, 105 70 L105 30 Z"
        fill="none"
        stroke="#FF4500"
        strokeWidth="1"
        opacity="0.2"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  WelcomeIllustration                                                       */
/*  Warm campfire with people silhouettes sitting around it.                  */
/* -------------------------------------------------------------------------- */

export function WelcomeIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[120px] w-[240px]", className)}
      aria-hidden="true"
    >
      {/* Ground */}
      <ellipse cx="120" cy="105" rx="100" ry="10" fill="#2a2a2a" />
      {/* Campfire logs */}
      <rect x="100" y="88" width="40" height="10" rx="5" fill="#CC4A10" opacity="0.6" />
      <rect x="105" y="82" width="35" height="9" rx="4.5" fill="#CC4A10" opacity="0.5" transform="rotate(-10 122 86)" />
      {/* Fire */}
      <path
        d="M120 85 C110 72, 106 58, 112 45 C115 39, 119 35, 120 30 C121 35, 125 39, 128 45 C134 58, 130 72, 120 85Z"
        fill="#FF4500"
      >
        <animateTransform attributeName="transform" type="translate" values="0,0;2,0;0,0;-2,0;0,0" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path
        d="M120 82 C113 72, 111 62, 115 52 C117 47, 119 44, 120 40 C121 44, 123 47, 125 52 C129 62, 127 72, 120 82Z"
        fill="#FF6B2C"
      >
        <animateTransform attributeName="transform" type="translate" values="0,0;-2,0;0,0;2,0;0,0" dur="2.5s" begin="0.3s" repeatCount="indefinite" />
      </path>
      <path
        d="M120 78 C116 72, 115 64, 117 57 C118 54, 119.5 52, 120 48 C120.5 52, 122 54, 123 57 C125 64, 124 72, 120 78Z"
        fill="#FF8F5C"
      >
        <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
      </path>
      {/* Light glow circle */}
      <circle cx="120" cy="70" r="40" fill="#FF4500" opacity="0.04" />
      <circle cx="120" cy="70" r="25" fill="#FF6B2C" opacity="0.06" />
      {/* Person silhouettes - left group */}
      {/* Person 1 - far left */}
      <circle cx="40" cy="78" r="7" fill="#666" opacity="0.5" />
      <path d="M32 86 C32 82, 36 80, 40 80 C44 80, 48 82, 48 86 L48 100 L32 100 Z" fill="#666" opacity="0.5" />
      {/* Person 2 - center left */}
      <circle cx="68" cy="76" r="7.5" fill="#666" opacity="0.55" />
      <path d="M59 84 C59 80, 63.5 78, 68 78 C72.5 78, 77 80, 77 84 L77 100 L59 100 Z" fill="#666" opacity="0.55" />
      {/* Person 3 - center right */}
      <circle cx="172" cy="76" r="7.5" fill="#666" opacity="0.55" />
      <path d="M163 84 C163 80, 167.5 78, 172 78 C176.5 78, 181 80, 181 84 L181 100 L163 100 Z" fill="#666" opacity="0.55" />
      {/* Person 4 - far right */}
      <circle cx="200" cy="78" r="7" fill="#666" opacity="0.5" />
      <path d="M192 86 C192 82, 196 80, 200 80 C204 80, 208 82, 208 86 L208 100 L192 100 Z" fill="#666" opacity="0.5" />
      {/* Rising sparks */}
      <circle cx="116" cy="30" r="1.5" fill="#FF6B2C">
        <animate attributeName="cy" values="30;12" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="125" cy="26" r="1" fill="#00D4AA">
        <animate attributeName="cy" values="26;8" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="118" cy="22" r="1" fill="#FF4500">
        <animate attributeName="cy" values="22;4" dur="2.3s" begin="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.3s" begin="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
