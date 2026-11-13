import React, { useState } from 'react';
import { IdeaNote, PitStopTableConfig } from '../data/gameConfig';
import { Sparkles, RotateCw, Eye, Layers } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface InteractivePitWheelProps {
  table: PitStopTableConfig;
  ideas: IdeaNote[];
  activeSubQuestion: 0 | 1 | 2 | null;
  onSelectSubQuestion: (idx: 0 | 1 | 2 | null) => void;
  compact?: boolean;
}

export const InteractivePitWheel: React.FC<InteractivePitWheelProps> = ({
  table,
  ideas,
  activeSubQuestion,
  onSelectSubQuestion,
  compact = false,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [showOriginalArt, setShowOriginalArt] = useState(false);

  const tableIdeas = ideas.filter((i) => i.table_id === table.id);
  const counts = [0, 1, 2].map(
    (idx) => tableIdeas.filter((i) => i.sub_question_idx === idx).length
  );
  const votesBySector = [0, 1, 2].map((idx) =>
    tableIdeas
      .filter((i) => i.sub_question_idx === idx)
      .reduce((acc, item) => acc + item.votes, 0)
  );

  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    soundFX.playWheelGun();
    const randomSector = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const extraSpins = 360 * 3 + randomSector * 120;
    setSpinRotation((prev) => prev + extraSpins);

    setTimeout(() => {
      setIsSpinning(false);
      soundFX.playBoost();
      onSelectSubQuestion(randomSector);
    }, 900);
  };

  // SVG Geometry for 3 sectors of 120 degrees each
  // Sector 0: Top-Left/Top (-150° to -30°)
  // Sector 1: Right (-30° to 90°)
  // Sector 2: Bottom-Left (90° to 210°)
  const cx = 220;
  const cy = 220;
  const rOuter = 198;
  const rInner = 82;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createSectorPath = (startAngle: number, endAngle: number) => {
    const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
    const startInner = polarToCartesian(cx, cy, rInner, endAngle);
    const endInner = polarToCartesian(cx, cy, rInner, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', startOuter.x, startOuter.y,
      'A', rOuter, rOuter, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', rInner, rInner, 0, largeArcFlag, 1, startInner.x, startInner.y,
      'Z',
    ].join(' ');
  };

  const sectorAngles: Array<{ idx: 0 | 1 | 2; start: number; end: number; mid: number }> = [
    { idx: 0, start: -60, end: 60, mid: 0 },     // Top sector
    { idx: 1, start: 60, end: 180, mid: 120 },   // Bottom-Right sector
    { idx: 2, start: 180, end: 300, mid: 240 },  // Bottom-Left sector
  ];

  return (
    <div className="relative flex flex-col items-center">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => onSelectSubQuestion(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeSubQuestion === null
              ? `${table.badgeClass} border-white shadow-lg scale-105`
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Toutes les 3 Questions ({tableIdeas.length})
        </button>

        <button
          type="button"
          onClick={handleSpinWheel}
          className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:brightness-110 transition-all shadow-md cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
          Spin Pit-Wheel
        </button>

        <button
          type="button"
          onClick={() => setShowOriginalArt((v) => !v)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer"
          title="Alterner entre la roue interactive et la planche originale de Malak Derbel"
        >
          <Eye className="w-3.5 h-3.5" />
          {showOriginalArt ? 'Vue Interactive' : 'Planche Originale'}
        </button>
      </div>

      {showOriginalArt ? (
        <div className="relative w-full max-w-[420px] aspect-square rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-white p-2">
          <img
            src={table.wheelImg}
            alt={table.name}
            className="w-full h-full object-contain rounded-full"
          />
        </div>
      ) : (
        <div
          className={`relative ${
            compact ? 'w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]' : 'w-[340px] h-[340px] sm:w-[420px] sm:h-[420px]'
          } flex items-center justify-center select-none`}
        >
          {/* Outer F1 Tire Tread Glow */}
          <div
            className="absolute inset-0 rounded-full opacity-25 blur-xl pointer-events-none"
            style={{ background: `radial-gradient(circle, ${table.hex}, transparent 70%)` }}
          />

          <svg
            viewBox="0 0 440 440"
            className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,0,0,0.65)] transition-transform duration-700 ease-out"
            style={{ transform: `rotate(${spinRotation}deg)` }}
          >
            {/* Outer F1 Tire Rim */}
            <circle
              cx={cx}
              cy={cy}
              r={214}
              fill="#090D16"
              stroke={table.hex}
              strokeWidth="4"
              strokeDasharray="18 8"
            />
            <circle
              cx={cx}
              cy={cy}
              r={204}
              fill="#0F172A"
              stroke="#334155"
              strokeWidth="2"
            />

            {/* 3 Interactive 120-Degree Sectors */}
            {sectorAngles.map(({ idx, start, end, mid }) => {
              const isSelected = activeSubQuestion === idx;
              const isDimmed = activeSubQuestion !== null && activeSubQuestion !== idx;
              const sq = table.subQuestions[idx];
              const labelPos = polarToCartesian(cx, cy, 146, mid);
              const badgePos = polarToCartesian(cx, cy, 112, mid);

              return (
                <g
                  key={idx}
                  onClick={() => {
                    soundFX.playBoost();
                    onSelectSubQuestion(isSelected ? null : idx);
                  }}
                  className="cursor-pointer transition-opacity duration-300"
                  style={{ opacity: isDimmed ? 0.45 : 1 }}
                >
                  <path
                    d={createSectorPath(start, end)}
                    fill={isSelected ? table.hex : '#1E293B'}
                    fillOpacity={isSelected ? 0.32 : 0.88}
                    stroke={isSelected ? '#FFFFFF' : table.hex}
                    strokeWidth={isSelected ? 3.5 : 2}
                  />

                  {/* Sector Question Number & Short Title */}
                  <g
                    transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${-spinRotation})`}
                  >
                    <rect
                      x="-68"
                      y="-24"
                      width="136"
                      height="46"
                      rx="10"
                      fill="#020617"
                      fillOpacity="0.86"
                      stroke={isSelected ? '#FFFFFF' : table.hex}
                      strokeWidth={isSelected ? '2' : '1.2'}
                    />
                    <text
                      x="0"
                      y="-6"
                      textAnchor="middle"
                      fill={table.accentHex}
                      fontSize="11"
                      fontWeight="800"
                      fontFamily="Chakra Petch, sans-serif"
                    >
                      AXE {idx + 1} • {sq.shortTitle.toUpperCase()}
                    </text>
                    <text
                      x="0"
                      y="11"
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {counts[idx]} idée{counts[idx] > 1 ? 's' : ''} • ⚡ {votesBySector[idx]}
                    </text>
                  </g>

                  {/* Active Pulse Dot */}
                  {counts[idx] > 0 && (
                    <circle
                      cx={badgePos.x}
                      cy={badgePos.y}
                      r={6}
                      fill={table.accentHex}
                    />
                  )}
                </g>
              );
            })}

            {/* Center Wheel Hub */}
            <circle
              cx={cx}
              cy={cy}
              r={rInner}
              fill="#FFFFFF"
              stroke={table.hex}
              strokeWidth="6"
            />
          </svg>

          {/* Center Mascot Overlay (stays upright even when wheel spins) */}
          <button
            type="button"
            onClick={() => onSelectSubQuestion(null)}
            title="Afficher les 3 questions de la table"
            className="absolute w-[34%] h-[34%] rounded-full overflow-hidden flex flex-col items-center justify-center bg-white shadow-inner p-1.5 cursor-pointer hover:scale-105 transition-transform border-2"
            style={{ borderColor: table.hex }}
          >
            <img
              src={table.mascotImg}
              alt={table.name}
              className="w-full h-full object-contain"
            />
          </button>
        </div>
      )}

      {/* 3 Clickable Question Pills Below the Wheel for Crystal-Clear Reading */}
      <div className="w-full grid grid-cols-1 gap-2 mt-3">
        {table.subQuestions.map((sq) => {
          const idx = sq.index as 0 | 1 | 2;
          const isSelected = activeSubQuestion === idx;
          const count = counts[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSubQuestion(isSelected ? null : idx)}
              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? `bg-slate-900 ${table.borderClass} ring-2 ring-offset-2 ring-offset-slate-950`
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold shrink-0 mt-0.5 ${table.badgeClass}`}
                >
                  Q{idx + 1}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                  {sq.question}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
