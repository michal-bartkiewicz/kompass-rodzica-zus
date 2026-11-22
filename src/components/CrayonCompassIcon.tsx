import { useId } from 'react';

interface CrayonCompassIconProps {
  className?: string;
  calmMode?: boolean;
}

/**
 * Ikona kompasu rysowana dziecięcą kredką pastelową w kolorze zieleni ZUS,
 * wzorowana na szkicu użytkownika: nieregularny okrąg z 4 znacznikami kierunków
 * oraz ukośna igła rombowa z białym oczkiem pośrodku.
 */
export function CrayonCompassIcon({
  className = 'h-9 w-9',
  calmMode = false,
}: CrayonCompassIconProps) {
  const filterId = useId();
  const primaryGreen = calmMode ? '#475569' : '#00703C';
  const brightGreen = calmMode ? '#64748B' : '#16A34A';
  const softWash = calmMode ? '#E2E8F0' : '#DCFCE7';

  return (
    <svg
      viewBox="0 0 80 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter
          id={filterId}
          x="-12%"
          y="-12%"
          width="124%"
          height="124%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            seed="7"
            result="grain"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale="2.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      {/* Subtelne pastelowe podmalowanie pod tarczą kompasu */}
      <ellipse
        cx="40"
        cy="36"
        rx="28"
        ry="25"
        fill={softWash}
        fillOpacity="0.65"
        filter={`url(#${filterId})`}
      />

      <g filter={`url(#${filterId})`}>
        {/* Zewnętrzny nieregularny okrąg rysowany kredką (lekko szkicowany podwójny ślad) */}
        <path
          d="M41 9C56.8 8.4 69.2 19.8 68.5 35.4C67.8 50.6 55.2 62.6 39.2 62.8C23.1 63 11.4 51.2 11.6 35.8C11.8 20.6 24.4 9.6 41 9Z"
          stroke={primaryGreen}
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M39.5 11.2C54.6 10.2 67 21.2 66.5 36.2C66 49.8 54.4 60.8 39.8 61.1C24.8 61.4 13.4 50.4 13.5 36C13.6 21.8 25.5 12.1 39.5 11.2Z"
          stroke={brightGreen}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />

        {/* 4 grube kreski kierunkowe do wewnątrz (N, E, S, W) */}
        <path
          d="M39.5 10.5L39.2 18.2M66.2 37.8L57.8 37.6M42.8 61.4L42.5 52.8M13.5 34.8L22.2 35.2"
          stroke={primaryGreen}
          strokeWidth="4.8"
          strokeLinecap="round"
        />

        {/* Ukośna igła kompasu w kształcie rombu (prawy górny -> lewy dolny róg) */}
        <path
          d="M54.5 16.5L47.5 41.5L24.5 53.5L30.5 29.5L54.5 16.5Z"
          fill={primaryGreen}
          stroke={primaryGreen}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Pastelowy ślad kredki na górnej połówce igły dla faktury */}
        <path
          d="M52.5 18.5L45.8 38.2L32.2 30.8L52.5 18.5Z"
          fill={brightGreen}
          fillOpacity="0.72"
        />

        {/* Białe oczko w środku igły jak na szkicu */}
        <ellipse
          cx="39.5"
          cy="35.5"
          rx="4.2"
          ry="3.6"
          transform="rotate(-24 39.5 35.5)"
          fill="#FFFDF7"
        />
      </g>
    </svg>
  );
}
