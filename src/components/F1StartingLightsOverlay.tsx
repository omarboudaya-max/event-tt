import React from 'react';

interface F1StartingLightsOverlayProps {
  count: number | null; // 1..5 = red lights, 6 = GREEN GO!
}

export const F1StartingLightsOverlay: React.FC<F1StartingLightsOverlayProps> = ({ count }) => {
  if (count === null) return null;

  const isGo = count === 6;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fadeIn">
      <div className="bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col items-center max-w-xl w-full">
        <div className="text-xs font-extrabold uppercase tracking-[0.3em] text-orange-400 mb-4">
          MEDRH 10 • PIT STOP &amp; GO !
        </div>

        {/* 5 F1 Gantry Pods */}
        <div className="grid grid-cols-5 gap-3 sm:gap-5 bg-black p-4 sm:p-6 rounded-2xl border-2 border-slate-800 w-full justify-items-center">
          {[1, 2, 3, 4, 5].map((lightNum) => {
            const litRed = !isGo && count >= lightNum;
            const litGreen = isGo;
            return (
              <div
                key={lightNum}
                className="flex flex-col gap-3 bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-800"
              >
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full transition-all duration-150 ${
                    litGreen
                      ? 'bg-emerald-400 shadow-[0_0_30px_#10b981]'
                      : litRed
                      ? 'bg-red-600 shadow-[0_0_30px_#ef4444]'
                      : 'bg-slate-800'
                  }`}
                />
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full transition-all duration-150 ${
                    litGreen
                      ? 'bg-emerald-400 shadow-[0_0_30px_#10b981]'
                      : litRed
                      ? 'bg-red-600 shadow-[0_0_30px_#ef4444]'
                      : 'bg-slate-800'
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          {isGo ? (
            <div className="text-3xl sm:text-5xl font-black italic tracking-wider text-emerald-400 animate-bounce">
              PIT STOP... GO ! 🏁
            </div>
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-red-500">
              PRÉPAREZ VOS IDÉES... ({count}/5)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
