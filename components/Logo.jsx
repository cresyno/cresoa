'use client';

export default function Logo({ variant = 'primary', size = 'medium', className, style }) {
  // Heights for wordmark (aspect ~4.13:1) and icon (1:1)
  const heights = {
    small: 22,
    medium: 30,
    large: 40,
  };
  const h = heights[size] || heights.medium;

  // Icon — "A" with gold dot on navy rounded square
  if (variant === 'icon' || variant === 'favicon' || variant === 'app') {
    return (
      <svg
        viewBox="0 0 512 512"
        width={h}
        height={h}
        className={className}
        style={style}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Cresoa"
        role="img"
      >
        <rect width="512" height="512" rx="110" fill="#0F2B4A" />
        <text
          x="256"
          y="390"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontSize="380"
          fill="#FFFFFF"
        >
          A
        </text>
        <circle cx="256" cy="345" r="24" fill="#C99B2B" />
      </svg>
    );
  }

  // Wordmark — navy on light, white on dark
  const isDark = variant === 'dark-bg' || variant === 'monochromeLight';
  const textColor = isDark ? '#FFFFFF' : '#0F2B4A';
  const goldColor = isDark ? '#E5B84B' : '#C99B2B';
  const w = h * (1240 / 300); // preserve aspect ratio

  return (
    <svg
      viewBox="0 0 1240 300"
      width={w}
      height={h}
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cresoa"
      role="img"
    >
      <text
        x="40"
        y="220"
        fontFamily="Fraunces, Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="220"
        letterSpacing="-8"
        fill={textColor}
      >
        CRESO
      </text>
      <text
        x="780"
        y="220"
        fontFamily="Fraunces, Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="220"
        letterSpacing="-8"
        fill={textColor}
      >
        A
      </text>
      <circle cx="810" cy="188" r="16" fill={goldColor} />
    </svg>
  );
}
