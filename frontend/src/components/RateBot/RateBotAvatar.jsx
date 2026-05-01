/**
 * Shared RateBot “robot” mark — same visual language as the round FAB.
 * `variant`: "onBrand" (white glyph on transparent; use on primary bg)
 *            "soft" (primary stroke on transparent; use in message bubbles)
 */
export default function RateBotAvatar({
  className = "",
  size = 36,
  variant = "onBrand",
}) {
  const stroke = variant === "onBrand" ? "currentColor" : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2v2.5"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="1.2" r="0.9" fill={stroke} />
      <rect
        x="5"
        y="6"
        width="14"
        height="13"
        rx="3.5"
        stroke={stroke}
        strokeWidth="1.75"
      />
      <path
        d="M8 11h.01M12 11h.01M16 11h.01"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 15.5c.85.55 1.9.85 3 .85 1.03 0 2-.25 2.8-.7"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M3.5 11.5h-1M20.5 11.5h1"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
