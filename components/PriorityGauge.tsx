"use client";

interface Props {
  score: number;
}

export function PriorityGauge({ score }: Props) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 70 ? "#E07A5F" : score >= 45 ? "#D4A017" : "#6A9E6A";

  return (
    <div className="flex items-center gap-1.5">
      <svg width="44" height="44" className="-rotate-90">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#E8E4DF"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
