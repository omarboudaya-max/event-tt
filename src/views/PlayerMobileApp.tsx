import React, { useEffect, useState } from 'react';
import {
  EVENT_INFO,
  PHASE_LABELS,
  PIT_STOP_TABLES,
  Player,
  PlayerRole,
} from '../data/gameConfig';
import { FullGameStoreState, PitStopRealtimeStore } from '../lib/supabaseStore';
import { InteractivePitWheel } from '../components/InteractivePitWheel';
import { RestitutionRoadmapView } from '../components/RestitutionRoadmapView';
import {
  Send,
  Zap,
  Star,
  Award,
  Clock,
  Compass,
  CheckCircle2,
  RefreshCw,
  Mic,
  Sparkles,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface PlayerMobileAppProps {
  store: PitStopRealtimeStore;
  gameState: FullGameStoreState;
  onSwitchToHostMode: () => void;
}

const LOCAL_PLAYER_KEY = 'medrh_pitstop_current_player_v1';

export const PlayerMobileApp: React.FC<PlayerMobileAppProps> = ({
  store,
  gameState,
  onSwitchToHostMode,
}) => {
  const { session, players, ideas, tableSummaries } = gameState;

  const [playerId, setPlayerId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PLAYER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.id || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Registration Form State
  const [nameInput, setNameInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('VOYAGEUR');
  const [selectedTable, setSelectedTable] = useState<1 | 2 | 3>(1);

  // Active Gameplay State
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<0 | 1 | 2>(0);
  const [ideaText, setIdeaText] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [hoteSummaryInput, setHoteSummaryInput] = useState('');
  const [summarySavedToast, setSummarySavedToast] = useState(false);
  const [showTableSwitcher, setShowTableSwitcher] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);

  const livePlayer: Player | null =
    players.find((p) => p.id === playerId) ||
    (() => {
      if (!playerId) return null;
      try {
        const raw = localStorage.getItem(LOCAL_PLAYER_KEY);
        return raw ? (JSON.parse(raw) as Player) : null;
      } catch {
        return null;
      }
    })();

  useEffect(() => {
    if (livePlayer && !players.some((p) => p.id === livePlayer.id)) {
      store.upsertPlayer(livePlayer);
    }
  }, [livePlayer, players, store]);

  useEffect(() => {
    if (livePlayer) {
      const existingSummary = tableSummaries[livePlayer.current_table]?.summaryText || '';
      if (existingSummary && !hoteSummaryInput) {
        setHoteSummaryInput(existingSummary);
      }
    }
  }, [livePlayer, tableSummaries, hoteSummaryInput]);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newPlayer: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      room_code: session.room_code,
      name: nameInput.trim(),
      company: companyInput.trim(),
      role: selectedRole,
      initial_table: selectedTable,
      current_table: selectedTable,
      score: 10,
      joined_at: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_PLAYER_KEY, JSON.stringify(newPlayer));
    setPlayerId(newPlayer.id);
    store.upsertPlayer(newPlayer);
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livePlayer || !ideaText.trim()) return;

    store.addIdea({
      table_id: livePlayer.current_table,
      sub_question_idx: selectedQuestionIdx,
      author: livePlayer,
      content: ideaText.trim(),
    });

    setIdeaText('');
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2200);
  };

  const handleSaveHoteSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livePlayer || !hoteSummaryInput.trim()) return;
    store.updateTableHoteSummary(
      livePlayer.current_table,
      livePlayer.name,
      hoteSummaryInput.trim()
    );
    setSummarySavedToast(true);
    setTimeout(() => setSummarySavedToast(false), 2200);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ==================== 1. REGISTRATION SCREEN ====================
  if (!livePlayer) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6">
        <div className="max-w-md w-full mx-auto space-y-5 my-auto">
          <div className="bg-gradient-to-br from-orange-500/25 via-amber-500/15 to-slate-900 border-2 border-orange-500/50 rounded-3xl p-5 text-center shadow-2xl">
            <span className="inline-block px-3 py-0.5 rounded-full bg-orange-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
              {EVENT_INFO.eventName} • {EVENT_INFO.motto}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
              BIENVENUE À NOTRE PIT STOP ! 🏎️
            </h1>
            <p className="text-xs sm:text-sm text-amber-200 font-semibold mt-1">
              {EVENT_INFO.workshopTitle}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Animé par {EVENT_INFO.facilitator} • Visualisé par {EVENT_INFO.visualizer}
            </p>
          </div>

          <form
            onSubmit={handleJoinGame}
            className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl"
          >
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                Votre Prénom &amp; Nom *
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: Amine Ben Ali"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-semibold text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                Entreprise / Organisation (Optionnel)
              </label>
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="Ex: Tunisie Telecom, Pluxee, DRH..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                Votre Rôle dans le Pit Stop
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('VOYAGEUR')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedRole === 'VOYAGEUR'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>🏎️ Voyageur</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-tight">
                    Change de table après chaque tour pour enrichir les 3 roues
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('HOTE')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedRole === 'HOTE'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>🎙️ Hôte de Table</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-tight">
                    Reste à sa table pour résumer les idées aux nouveaux arrivants
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                À quelle Table (Stand) êtes-vous assis(e) ?
              </label>
              <div className="space-y-2">
                {([1, 2, 3] as const).map((tId) => {
                  const t = PIT_STOP_TABLES[tId];
                  const isChosen = selectedTable === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setSelectedTable(tId)}
                      className={`w-full p-3 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                        isChosen
                          ? `bg-gradient-to-r ${t.bgGradient} ${t.borderClass} shadow-lg`
                          : 'bg-slate-950 border-slate-800 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={t.mascotImg}
                        alt={t.name}
                        className="w-12 h-12 rounded-xl bg-white p-1 object-contain shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.badgeClass}`}
                        >
                          STAND {tId}
                        </span>
                        <div className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                          {t.name}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">{t.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              EMBARQUER AU PIT STOP 🏁
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={onSwitchToHostMode}
            className="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer"
          >
            Accès Écran Animateur / Projecteur (Host)
          </button>
        </div>
      </div>
    );
  }

  // ==================== 2. ACTIVE PLAYER COCKPIT ====================
  const activeTable = PIT_STOP_TABLES[livePlayer.current_table];
  const currentTableSummary = tableSummaries[livePlayer.current_table];
  const currentTableIdeas = ideas
    .filter((i) => i.table_id === livePlayer.current_table)
    .sort((a, b) => Number(b.is_key_finding) - Number(a.is_key_finding) || b.votes - a.votes);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-12">
      {/* Sticky Mobile Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${activeTable.badgeClass}`}
            >
              STAND {livePlayer.current_table}
            </span>
            <div className="truncate">
              <div className="text-xs font-black text-white truncate">
                {livePlayer.role === 'HOTE' ? '🎙️ ' : '🏎️ '}
                {livePlayer.name}
              </div>
              <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <Award className="w-3 h-3" /> {livePlayer.score} pts • Tour {session.current_tour}/3
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-sm font-black text-emerald-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(session.timer_seconds)}
            </div>

            <button
              type="button"
              onClick={() => setShowHowToPlayModal(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer"
              title="Règles du jeu"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={() => setShowTableSwitcher((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-orange-400" />
              Stand
            </button>
          </div>
        </div>

        {showTableSwitcher && (
          <div className="max-w-lg mx-auto mt-2.5 p-3 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5 animate-fadeIn">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Changer de Stand ou de Rôle :</span>
              <button
                type="button"
                onClick={() => setShowTableSwitcher(false)}
                className="text-xs text-orange-400 font-bold"
              >
                Fermer
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((tId) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => {
                    store.changePlayerRoleOrTable(livePlayer.id, tId);
                    localStorage.setItem(
                      LOCAL_PLAYER_KEY,
                      JSON.stringify({ ...livePlayer, current_table: tId })
                    );
                    setShowTableSwitcher(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black border cursor-pointer ${
                    livePlayer.current_table === tId
                      ? `${PIT_STOP_TABLES[tId].badgeClass} border-white`
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  Stand {tId}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  store.changePlayerRoleOrTable(
                    livePlayer.id,
                    livePlayer.current_table,
                    'VOYAGEUR'
                  );
                  setShowTableSwitcher(false);
                }}
                className={`py-1.5 rounded-xl text-xs font-bold border ${
                  livePlayer.role === 'VOYAGEUR'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🏎️ Rôle Voyageur
              </button>
              <button
                type="button"
                onClick={() => {
                  store.changePlayerRoleOrTable(
                    livePlayer.id,
                    livePlayer.current_table,
                    'HOTE'
                  );
                  setShowTableSwitcher(false);
                }}
                className={`py-1.5 rounded-xl text-xs font-bold border ${
                  livePlayer.role === 'HOTE'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🎙️ Rôle Hôte
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-lg w-full mx-auto px-3.5 pt-4 space-y-4 flex-1">
        {/* Live Telemetry Reaction Pulses to Big Screen */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 pl-1">
            Réagir à l’écran :
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { emoji: '🔥', label: 'Pépite !' },
              { emoji: '🚀', label: 'Go Action !' },
              { emoji: '🤝', label: 'Inclusif !' },
              { emoji: '💡', label: 'Top Vision !' },
            ].map((item) => (
              <button
                key={item.emoji}
                type="button"
                onClick={() =>
                  store.sendLiveReaction({
                    emoji: item.emoji,
                    label: item.label,
                    senderName: livePlayer.name,
                    tableId: livePlayer.current_table,
                  })
                }
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
              >
                <span>{item.emoji}</span>
                <span className="hidden sm:inline text-[10px] text-slate-300">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* -------------------- ROTATION ALERT BANNER -------------------- */}
        {(session.phase === 'ROTATION_1_2' || session.phase === 'ROTATION_2_3') && (
          <div className="bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-slate-900 border-2 border-amber-400 rounded-3xl p-5 text-center space-y-3 shadow-2xl animate-fadeIn">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase">
              🔄 PIT STOP ROTATION !
            </span>
            {livePlayer.role === 'HOTE' ? (
              <>
                <h2 className="text-xl font-black text-white">
                  🎙️ VOUS ÊTES L’HÔTE DU STAND {livePlayer.current_table}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <strong>Restez à votre table !</strong> Accueillez les nouveaux Voyageurs et résumez-leur les{' '}
                  <strong>{currentTableIdeas.length} idées</strong> déjà proposées sur votre roue.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black text-white">
                  🏎️ REJOIGNEZ LE STAND {livePlayer.current_table} !
                </h2>
                <div
                  className={`p-3 rounded-2xl border-2 ${activeTable.borderClass} bg-slate-950/80`}
                >
                  <div className={`text-xs font-black uppercase ${activeTable.textClass}`}>
                    VOTRE NOUVELLE TABLE : STAND {activeTable.id}
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {activeTable.name}
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Écoutez le résumé de l’Hôte de table, votez (⚡ Boost) pour les meilleures idées existantes et ajoutez les vôtres !
                </p>
              </>
            )}
          </div>
        )}

        {/* -------------------- RESTITUTION VIEW ON MOBILE -------------------- */}
        {session.phase === 'RESTITUTION' ? (
          <RestitutionRoadmapView
            ideas={ideas}
            players={players}
            tableSummaries={tableSummaries}
            isHost={livePlayer.role === 'HOTE'}
            onToggleKeyFinding={(id) => store.toggleKeyFinding(id)}
          />
        ) : (
          <>
            {/* Current Stand Theme Card */}
            <div
              className={`bg-gradient-to-br ${activeTable.bgGradient} border-2 ${activeTable.borderClass} rounded-3xl p-4 shadow-xl`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={activeTable.mascotImg}
                    alt={activeTable.name}
                    className="w-14 h-14 rounded-2xl bg-white p-1 object-contain border-2 shrink-0"
                    style={{ borderColor: activeTable.hex }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${activeTable.badgeClass}`}
                      >
                        STAND {activeTable.id}
                      </span>
                      <span className="text-[11px] text-slate-300 font-bold">
                        • {PHASE_LABELS[session.phase].badge}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-black text-white leading-tight mt-1">
                      {activeTable.name}
                    </h2>
                    <p className="text-[11px] text-slate-300 truncate">{activeTable.subtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWheelModal((v) => !v)}
                  className="px-3 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-xs font-extrabold text-amber-300 flex flex-col items-center shrink-0 cursor-pointer"
                >
                  <Compass className="w-4 h-4 mb-0.5" />
                  <span>Roue</span>
                </button>
              </div>

              {showWheelModal && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <InteractivePitWheel
                    table={activeTable}
                    ideas={ideas}
                    activeSubQuestion={selectedQuestionIdx}
                    onSelectSubQuestion={(idx) => {
                      if (idx !== null) setSelectedQuestionIdx(idx);
                    }}
                    compact={true}
                  />
                </div>
              )}
            </div>

            {/* Hôte Special Synthesis Input OR Incoming Voyageur Summary Display */}
            {livePlayer.role === 'HOTE' ? (
              <form
                onSubmit={handleSaveHoteSummary}
                className="bg-amber-500/15 border-2 border-amber-400/60 rounded-3xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                    <Mic className="w-4 h-4" />
                    🎙️ Votre Synthèse d’Hôte (Stand {livePlayer.current_table})
                  </div>
                  <span className="text-[10px] text-amber-200">
                    Visible par les nouveaux Voyageurs &amp; à la Restitution
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={hoteSummaryInput}
                  onChange={(e) => setHoteSummaryInput(e.target.value)}
                  placeholder="Notez ici le résumé clé de votre table pour briefer les nouveaux arrivants et la restitution finale..."
                  className="w-full p-3 rounded-2xl bg-slate-950/90 border border-amber-400/40 text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-amber-400 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-200/80">
                    Astuce : Épinglez aussi les meilleures idées avec ⭐
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer hover:brightness-110"
                  >
                    {summarySavedToast ? 'Synthèse Publiée ✅' : 'Publier le Résumé'}
                  </button>
                </div>
              </form>
            ) : (
              currentTableSummary &&
              currentTableSummary.summaryText && (
                <div className="bg-amber-500/15 border border-amber-400/50 rounded-2xl p-3.5 space-y-1">
                  <div className="text-[11px] font-black uppercase text-amber-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    Briefing de l’Hôte ({currentTableSummary.hoteName}) :
                  </div>
                  <p className="text-xs text-white font-medium leading-relaxed">
                    « {currentTableSummary.summaryText} »
                  </p>
                </div>
              )
            )}

            {/* 3 Sub-Questions Selector Tabs + Idea Input Form */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                1. Choisissez l’un des 3 rayons de la roue :
              </div>

              <div className="grid grid-cols-3 gap-2">
                {activeTable.subQuestions.map((sq, idx) => {
                  const qIdx = idx as 0 | 1 | 2;
                  const isSelected = selectedQuestionIdx === qIdx;
                  const count = currentTableIdeas.filter(
                    (i) => i.sub_question_idx === qIdx
                  ).length;

                  return (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => setSelectedQuestionIdx(qIdx)}
                      className={`p-2.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        isSelected
                          ? `${activeTable.badgeClass} border-white shadow-lg scale-[1.02]`
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-black">QUESTION {qIdx + 1}</div>
                      <div className="text-[10px] font-bold truncate opacity-90 mt-0.5">
                        {sq.shortTitle}
                      </div>
                      <div className="text-[10px] mt-1 opacity-75">{count} idées</div>
                    </button>
                  );
                })}
              </div>

              <div
                className={`p-3.5 rounded-2xl bg-slate-950 border-l-4 ${activeTable.borderClass}`}
              >
                <div className={`text-[11px] font-black uppercase ${activeTable.textClass}`}>
                  Question {selectedQuestionIdx + 1} sur 3 :
                </div>
                <div className="text-sm sm:text-base font-extrabold text-white mt-0.5 leading-snug">
                  {activeTable.subQuestions[selectedQuestionIdx].question}
                </div>
              </div>

              <form onSubmit={handleSubmitIdea} className="space-y-2.5">
                <textarea
                  rows={3}
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="Écrivez votre idée, piste d'action ou bonne pratique..."
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-orange-400 resize-none"
                />

                <button
                  type="submit"
                  disabled={!ideaText.trim()}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    ideaText.trim()
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  PROPULSER MON IDÉE SUR LA ROUE (+10 PTS)
                </button>

                {justSubmitted && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    Idée propulsée en direct sur l’écran et la roue !
                  </div>
                )}
              </form>
            </div>

            {/* Live Ideas & Boost Wall for Current Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Idées du Stand {activeTable.id} ({currentTableIdeas.length})
                </h3>
                <span className="text-[11px] text-amber-300 font-semibold">
                  Appuyez sur ⚡ pour voter !
                </span>
              </div>

              {currentTableIdeas.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  Soyez le premier à propulser une idée sur la roue du Stand {activeTable.id} !
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentTableIdeas.map((idea) => {
                    const hasVoted = idea.voters.includes(livePlayer.id);
                    return (
                      <div
                        key={idea.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          idea.is_key_finding
                            ? 'bg-gradient-to-r from-amber-500/20 to-slate-950 border-amber-400'
                            : 'bg-slate-950/90 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${activeTable.badgeClass}`}
                          >
                            Q{idea.sub_question_idx + 1} •{' '}
                            {activeTable.subQuestions[idea.sub_question_idx].shortTitle}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Tour {idea.tour}
                          </span>
                        </div>

                        <p className="text-sm text-white font-medium leading-snug">
                          {idea.content}
                        </p>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 truncate">
                            {idea.author_role === 'HOTE' ? '🎙️ ' : '🏎️ '}
                            <strong className="text-slate-200">{idea.author_name}</strong>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {livePlayer.role === 'HOTE' && (
                              <button
                                type="button"
                                onClick={() => store.toggleKeyFinding(idea.id)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                  idea.is_key_finding
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {idea.is_key_finding ? 'Key Finding' : 'Épingler'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => store.toggleVote(idea.id, livePlayer.id)}
                              className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                                hasVoted
                                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                                  : 'bg-slate-800 text-amber-300 border border-slate-700'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              Boost ({idea.votes})
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showHowToPlayModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowHowToPlayModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-orange-400">
                Règles du Jeu • Pit Stop &amp; Go !
              </h3>
              <button
                type="button"
                onClick={() => setShowHowToPlayModal(false)}
                className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                Fermer
              </button>
            </div>
            <div className="bg-white rounded-2xl p-2">
              <img
                src="/assets/how_to_play.png"
                alt="How to Play"
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
