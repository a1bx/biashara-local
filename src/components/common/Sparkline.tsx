interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  values,
  color,
  width = 88,
  height = 32
}: SparklineProps) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  // Inset by the stroke width so the line never bleeds past the card edge.
  const inset = 2;
  const usable = Math.max(height - inset * 2, 1);
  const step = (width - inset * 2) / (values.length - 1);

  const points = values.map((value, index) => {
    const x = inset + index * step;
    const y = height - inset - (value - min) / span * usable;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M ${points.join(' L ')}`;
  const area = `${line} L ${width - inset},${height} L ${inset},${height} Z`;
  const id = `spark-${color.replace('#', '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      className="block max-w-full overflow-hidden">
      
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round" />
      
    </svg>);

}