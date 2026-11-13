import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  EVENT_INFO,
  IdeaNote,
  PIT_STOP_TABLES,
  Player,
} from '../data/gameConfig';
import { TableHoteSummary } from '../lib/supabaseStore';
import {
  Trophy,
  Star,
  Zap,
  Download,
  Flag,
  Sparkles,
  Award,
  Map,
  CheckCircle2,
  Mic,
} from 'lucide-react';

interface RestitutionRoadmapViewProps {
  ideas: IdeaNote[];
  players: Player[];
  tableSummaries?: Record<1 | 2 | 3, TableHoteSummary | null>;
  isHost?: boolean;
  onToggleKeyFinding?: (ideaId: string) => void;
}

export const RestitutionRoadmapView: React.FC<RestitutionRoadmapViewProps> = ({
  ideas,
  players,
  tableSummaries,
  isHost = false,
  onToggleKeyFinding,
}) => {
  const [selectedTableFilter, setSelectedTableFilter] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [showVisualPoster, setShowVisualPoster] = useState(true);

  useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  const exportMarkdownReport = () => {
    const lines: string[] = [];
    lines.push(`# SYNTHÈSE ATELIER — ${EVENT_INFO.eventName}`);
    lines.push(`## ${EVENT_INFO.workshopTitle} (${EVENT_INFO.workshopGameName})`);
    lines.push(`- **Animation** : ${EVENT_INFO.facilitator}`);
    lines.push(`- **Visualisation** : ${EVENT_INFO.visualizer}`);
    lines.push(`- **Date & Lieu** : ${EVENT_INFO.dates} (${EVENT_INFO.workshopRoom})`);
    lines.push(`- **Participants connectés** : ${players.length} | **Idées produites** : ${ideas.length}`);
    lines.push('');

    ([1, 2, 3] as const).forEach((tId) => {
      const table = PIT_STOP_TABLES[tId];
      const summary = tableSummaries?.[tId];
      const tIdeas = ideas
        .filter((i) => i.table_id === tId)
        .sort((a, b) => Number(b.is_key_finding) - Number(a.is_key_finding) || b.votes - a.votes);

      lines.push(`---`);
      lines.push(`## STAND ${tId} : ${table.name}`);
      lines.push(`*${table.subtitle}*`);
      lines.push('');
      if (summary && summary.summaryText) {
        lines.push(`> **🎙️ Synthèse de l'Hôte (${summary.hoteName}) :** ${summary.summaryText}`);
        lines.push('');
      }

      table.subQuestions.forEach((sq, idx) => {
        lines.push(`### Q${idx + 1}. ${sq.question}`);
        const sqIdeas = tIdeas.filter((i) => i.sub_question_idx === idx);
        if (sqIdeas.length === 0) {
          lines.push(`- *(Aucune note enregistrée)*`);
        } else {
          sqIdeas.forEach((idea) => {
            const star = idea.is_key_finding ? '⭐ [KEY FINDING] ' : '';
            lines.push(
              `- ${star}${idea.content} *(par ${idea.author_name} • Tour ${idea.tour} • ⚡ ${idea.votes} votes)*`
            );
          });
        }
        lines.push('');
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEDRH10_PitStop_Restitution_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 5);
  const totalVotes = ideas.reduce((acc, i) => acc + i.votes, 0);
  const keyFindingsCount = ideas.filter((i) => i.is_key_finding).length;

  const tablesToDisplay =
    selectedTableFilter === 'ALL' ? ([1, 2, 3] as const) : ([selectedTableFilter] as const);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner Restitution */}
      <div className="bg-gradient-to-r from-orange-600/30 via-amber-500/20 to-pink-600/30 border-2 border-orange-400/50 rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500 text-slate-950 text-xs font-black uppercase tracking-wider mb-2">
              <Flag className="w-3.5 h-3.5" />
              ÉTAPE 2 • RESTITUTION FINALE • PIT STOP &amp; GO !
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              SHARE THE KEY FINDINGS 🏁
            </h2>
            <p className="text-sm sm:text-base text-slate-200 mt-1">
              « Chaque talent compte, chaque voix propulse » — Feuille de route issue des 3 Tours d’intelligence collective
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowVisualPoster((v) => !v)}
              className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <Map className="w-4 h-4 text-orange-400" />
              {showVisualPoster ? 'Masquer la Fresque' : 'Afficher Fresque Pitstop & Go!'}
            </button>

            <button
              type="button"
              onClick={exportMarkdownReport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:brightness-110 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Exporter la Synthèse (.MD)
            </button>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-xs text-slate-400 uppercase font-bold">Équipage Pit Crew</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">{players.length}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-xs text-slate-400 uppercase font-bold">Idées Propulsées</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">{ideas.length}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-xs text-slate-400 uppercase font-bold">Boosts Collectifs ⚡</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">{totalVotes}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-xs text-slate-400 uppercase font-bold">Key Findings ⭐</div>
            <div className="text-2xl sm:text-3xl font-black text-pink-400 mt-0.5">{keyFindingsCount}</div>
          </div>
        </div>
      </div>

      {/* Malak Derbel's Visual Roadmap Poster + Interactive Filter */}
      {showVisualPoster && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Circuit Visuel « PITSTOP &amp; GO ! » — Vers la Vision &amp; Performance Collective
              </h3>
              <p className="text-xs text-slate-400">
                Visualisation par {EVENT_INFO.visualizer} • Animation par {EVENT_INFO.facilitator}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTableFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  selectedTableFilter === 'ALL'
                    ? 'bg-white text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Tous les 3 Stands
              </button>
              {([1, 2, 3] as const).map((tId) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setSelectedTableFilter(tId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    selectedTableFilter === tId
                      ? PIT_STOP_TABLES[tId].badgeClass
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Stand {tId}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-white p-2 max-h-[420px] flex items-center justify-center">
            <img
              src="/assets/roadmap.png"
              alt="Pitstop & Go Roadmap"
              className="max-h-[400px] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* 3 Columns for the 3 Pit Stop Themes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tablesToDisplay.map((tId) => {
          const table = PIT_STOP_TABLES[tId];
          const hoteSummary = tableSummaries?.[tId];
          const tableIdeas = ideas
            .filter((i) => i.table_id === tId)
            .sort(
              (a, b) =>
                Number(b.is_key_finding) - Number(a.is_key_finding) || b.votes - a.votes
            );
          const tableHotes = players.filter(
            (p) => p.role === 'HOTE' && p.initial_table === tId
          );

          return (
            <div
              key={tId}
              className={`bg-gradient-to-b ${table.bgGradient} border-2 ${table.borderClass} rounded-3xl p-5 flex flex-col shadow-xl`}
            >
              {/* Table Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <img
                  src={table.mascotImg}
                  alt={table.name}
                  className="w-16 h-16 rounded-2xl bg-white p-1 object-contain shrink-0 border-2"
                  style={{ borderColor: table.hex }}
                />
                <div className="min-w-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${table.badgeClass}`}
                  >
                    STAND {tId} • {tableIdeas.length} IDÉES
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight mt-1">
                    {table.name}
                  </h3>
                  <p className="text-xs text-slate-300">{table.subtitle}</p>
                  {tableHotes.length > 0 && (
                    <p className="text-[11px] text-amber-300 font-semibold mt-1">
                      🎙️ Hôte(s) : {tableHotes.map((h) => h.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Hôte Synthesis Box if provided */}
              {hoteSummary && hoteSummary.summaryText && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/60 text-xs text-amber-100">
                  <div className="font-black text-amber-300 uppercase flex items-center gap-1.5 mb-1">
                    <Mic className="w-3.5 h-3.5" />
                    Synthèse de l’Hôte ({hoteSummary.hoteName})
                  </div>
                  <p className="leading-relaxed font-medium text-white">
                    « {hoteSummary.summaryText} »
                  </p>
                </div>
              )}

              {/* Questions & Sticky Notes */}
              <div className="space-y-4 mt-4 flex-1">
                {table.subQuestions.map((sq, sqIdx) => {
                  const sqIdeas = tableIdeas.filter((i) => i.sub_question_idx === sqIdx);
                  return (
                    <div
                      key={sqIdx}
                      className="bg-slate-950/75 border border-slate-800/90 rounded-2xl p-3.5"
                    >
                      <div className="flex items-start gap-2 mb-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-black shrink-0 ${table.badgeClass}`}
                        >
                          Q{sqIdx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                          {sq.question}
                        </h4>
                      </div>

                      {sqIdeas.length === 0 ? (
                        <p className="text-xs text-slate-500 italic pl-2">
                          Aucune proposition sur cet axe.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sqIdeas.map((idea, idx) => (
                            <div
                              key={idea.id}
                              className={`p-3 rounded-xl border transition-all ${
                                idea.is_key_finding
                                  ? 'bg-gradient-to-r from-amber-500/20 to-slate-900 border-amber-400 shadow-md'
                                  : idx === 0
                                  ? 'bg-slate-900 border-slate-700'
                                  : 'bg-slate-900/60 border-slate-800/80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                                  {idea.content}
                                </p>
                                {isHost && onToggleKeyFinding && (
                                  <button
                                    type="button"
                                    onClick={() => onToggleKeyFinding(idea.id)}
                                    title="Marquer comme Key Finding"
                                    className={`p-1.5 rounded-lg border shrink-0 cursor-pointer transition-all ${
                                      idea.is_key_finding
                                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                    }`}
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  {idea.is_key_finding && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Key Finding
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-300">
                                    {idea.author_name}
                                  </span>
                                  <span>• Tour {idea.tour}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold flex items-center gap-1">
                                  <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {idea.votes}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Podium Contributors */}
      {topPlayers.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            Podium Pit Crew — Top Contributeurs &amp; Ambassadeurs du Leadership Inclusif
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {topPlayers.map((p, idx) => {
              const tConfig = PIT_STOP_TABLES[p.initial_table];
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    idx === 0
                      ? 'bg-gradient-to-b from-amber-500/25 to-slate-950 border-amber-400'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                      #{idx + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tConfig.badgeClass}`}>
                      {p.role === 'HOTE' ? 'HÔTE' : 'VOYAGEUR'} • Stand {p.initial_table}
                    </span>
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm truncate">{p.name}</div>
                    {p.company && (
                      <div className="text-xs text-slate-400 truncate">{p.company}</div>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Score Pit-Stop</span>
                    <span className="text-sm font-black text-amber-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> {p.score} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
