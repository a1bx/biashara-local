import { useId } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoProps) {
  const uid = useId();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const tileId = `${uid}-tile`;
  const glyphId = `${uid}-glyph`;
  const barsId = `${uid}-bars`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Biashara Local">

      <defs>
        {isLight ?
        <linearGradient id={tileId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#0F8478" />
          </linearGradient> :

        <linearGradient id={glyphId} x1="6" y1="6" x2="44" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5EEAD4" />
            <stop offset="1" stopColor="#0F8478" />
          </linearGradient>
        }
        <linearGradient id={barsId} x1="24" y1="20" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#0B6259" />
        </linearGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="15"
        fill={isLight ? `url(#${tileId})` : '#0B1414'}
        stroke={isLight ? 'none' : '#17352F'}
        strokeWidth={isLight ? 0 : 1} />


      <text
        x="6"
        y="47"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="46"
        fill={isLight ? '#F4FBFA' : `url(#${glyphId})`}>

        B
      </text>

      <rect x="28.5" y="38" width="6.5" height="9" rx="2" fill={isLight ? '#F4FBFA' : `url(#${barsId})`} fillOpacity={isLight ? 0.85 : 1} />
      <rect x="35.5" y="30" width="6.5" height="17" rx="2" fill={isLight ? '#F4FBFA' : `url(#${barsId})`} fillOpacity={isLight ? 0.85 : 1} />
      <rect x="42.5" y="18" width="6.5" height="29" rx="2" fill={isLight ? '#F4FBFA' : `url(#${barsId})`} fillOpacity={isLight ? 0.85 : 1} />

      <path
        d="M18,45 C25,41 30,26 38,17"
        fill="none"
        stroke={isLight ? '#0B3F38' : '#F4FBFA'}
        strokeWidth="2.4"
        strokeLinecap="round" />

      <polygon points="34,13.5 46,15.5 39,24" fill={isLight ? '#0B3F38' : '#F4FBFA'} />
    </svg>);

}
