import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  EVENT_INFO,
  GamePhase,
  IdeaNote,
  PHASE_LABELS,
  PIT_STOP_TABLES,
} from '../data/gameConfig';
import { FullGameStoreState, PitStopRealtimeStore } from '../lib/supabaseStore';
import { InteractivePitWheel } from '../components/InteractivePitWheel';
import { RestitutionRoadmapView } from '../components/RestitutionRoadmapView';
import { soundFX } from '../utils/soundEffects';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  QrCode,
  Users,
  Flag,
  Zap,
  Star,
  Trash2,
  ArrowRight,
  Compass,
  Image as ImageIcon,
  Wand2,
  ExternalLink,
  Clock,
  Maximize2,
  X,
  Mic,
} from 'lucide-react';

interface HostDashboardProps {
  store: PitStopRealtimeStore;
  gameState: FullGameStoreState;
  onSwitchToPlayerMode: () => void;
}

const PHASE_ORDER: GamePhase[] = [
  'LOBBY',
  'TOUR_1',
  'ROTATION_1_2',
  'TOUR_2',
  'ROTATION_2_3',
  'TOUR_3',
  'RESTITUTION',
];

export const HostDashboard: React.FC<HostDashboardProps> = ({
  store,
  gameState,
  onSwitchToPlayerMode,
}) => {
  const { session, players, ideas, tableSummaries, reactions, connectedStatus } =
    gameState;

  const [muted, setMuted] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [posterLightbox, setPosterLightbox] = useState<
    null | 'WELCOME' | 'HOW_TO_PLAY' | 'ROADMAP'
  >(null);
  const [tourViewMode, setTourViewMode] = useState<'ALL_TABLES' | 'SINGLE_WHEEL'>('ALL_TABLES');
  const [spotlightIdea, setSpotlightIdea] = useState<IdeaNote | null>(null);

  const playerJoinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?mode=player&room=${session.room_code}`
      : '';

  useEffect(() => {
    if (!session.timer_running) return;
    const interval = setInterval(() => {
      const currentSec = store.getState().session.timer_seconds;
      if (currentSec <= 1) {
        soundFX.playPitLaneHorn();
        store.updateSession({ timer_seconds: 0, timer_running: false });
      } else {
        if (currentSec === 61 || currentSec === 11) {
          soundFX.playLightBeep(false);
        }
        store.updateSession({ timer_seconds: currentSec - 1 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session.timer_running, store]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePhaseTransition = (targetPhase: GamePhase) => {
    const isTourStart =
      targetPhase === 'TOUR_1' || targetPhase === 'TOUR_2' || targetPhase === 'TOUR_3';
    const targetTour: 1 | 2 | 3 =
      targetPhase === 'TOUR_1'
        ? 1
        : targetPhase === 'ROTATION_1_2' || targetPhase === 'TOUR_2'
        ? 2
        : 3;

    if (isTourStart) {
      store.runF1StartingLights(() => {
        store.updateSession({
          phase: targetPhase,
          current_tour: targetTour,
          timer_seconds: 12 * 60,
          timer_running: true,
        });
      });
    } else {
      store.updateSession({
        phase: targetPhase,
        current_tour: targetTour,
        timer_running: false,
      });
    }
  };

  const currentPhaseIdx = PHASE_ORDER.indexOf(session.phase);
  const nextPhase =
    currentPhaseIdx >= 0 && currentPhaseIdx < PHASE_ORDER.length - 1
      ? PHASE_ORDER[currentPhaseIdx + 1]
      : null;

  const toggleMute = () => {
    soundFX.muted = !muted;
    setMuted(!muted);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative">
      {/* ==================== TOP TELEMETRY HEADER ==================== */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Workshop Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-pink-500 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-sm tracking-tighter text-orange-400">
                F1•RH
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500 text-slate-950">
                  {EVENT_INFO.eventName}
                </span>
                <span className="text-xs font-bold text-amber-300">
                  {EVENT_INFO.workshopGameName}
                </span>
                <span className="hidden md:inline-block text-xs text-slate-400">
                  • Animé par {EVENT_INFO.facilitator} • Visuel {EVENT_INFO.visualizer}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-xl">
                {EVENT_INFO.workshopTitle}
              </h1>
            </div>
          </div>

          {/* Center: F1 Pit Stop Digital Chronometer */}
          <div className="flex items-center gap-2 bg-slate-900 border-2 border-slate-800 rounded-2xl px-3.5 py-1.5 shadow-inner">
            <Clock
              className={`w-4 h-4 ${
                session.timer_running ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span
              className={`font-mono text-xl sm:text-2xl font-black tracking-wider ${
                session.timer_seconds <= 60
                  ? 'text-red-500 animate-pulse'
                  : session.timer_running
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
              style={{ fontFamily: 'Chakra Petch, monospace' }}
            >
              {formatTime(session.timer_seconds)}
            </span>

            <button
              type="button"
              onClick={() =>
                store.updateSession({ timer_running: !session.timer_running })
              }
              className={`p-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                session.timer_running
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500 text-slate-950 hover:brightness-110'
              }`}
              title={session.timer_running ? 'Pause Chrono' : 'Démarrer Chrono'}
            >
              {session.timer_running ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800">
              {[5, 10, 12, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    store.updateSession({
                      timer_seconds: mins * 60,
                      timer_running: false,
                    })
                  }
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Right: Live Status, Posters, Demo & QR */}
          <div className="flex items-center gap-2">
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                connectedStatus === 'SUPABASE_LIVE'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {connectedStatus === 'SUPABASE_LIVE' ? 'LIVE SUPABASE' : 'SYNC LOCAL'}
              <span className="text-white font-black ml-1">({players.length} joueurs)</span>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>

            <button
              type="button"
              onClick={() => setPosterLightbox('HOW_TO_PLAY')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Afficher les planches originales de Malak Derbel"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Planches</span>
            </button>

            <button
              type="button"
              onClick={() => store.seedSimulationData()}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Injecter des données de démonstration pour tester l'atelier"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Démo</span>
            </button>

            <button
              type="button"
              onClick={onSwitchToPlayerMode}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Basculer vers le mode Split-Screen / Vue Joueur"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Split / Joueur</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
              title={muted ? 'Activer le son F1' : 'Couper le son'}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Phase Navigation Stepper Bar */}
        <div className="max-w-[1600px] mx-auto mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {PHASE_ORDER.map((ph, idx) => {
              const isCurrent = session.phase === ph;
              const isPast = idx < currentPhaseIdx;
              const labels: Record<GamePhase, string> = {
                LOBBY: '1. Accueil & QR',
                TOUR_1: '2. Tour 1',
                ROTATION_1_2: '🔄 Rotation 1→2',
                TOUR_2: '3. Tour 2',
                ROTATION_2_3: '🔄 Rotation 2→3',
                TOUR_3: '4. Tour 3',
                RESTITUTION: '🏁 5. Restitution',
              };
              return (
                <button
                  key={ph}
                  type="button"
                  onClick={() => handlePhaseTransition(ph)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 shadow-lg scale-105'
                      : isPast
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {labels[ph]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {nextPhase && (
              <button
                type="button"
                onClick={() => handlePhaseTransition(nextPhase)}
                className="px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer transition-all"
              >
                Étape Suivante
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Réinitialiser la salle (effacer tous les joueurs et idées) ?')) {
                  store.resetRoom();
                }
              }}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 cursor-pointer"
              title="Réinitialiser la salle"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ==================== MAIN STAGE BY PHASE ==================== */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-6">
        {/* Phase Banner */}
        <div className="mb-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-1">
              {PHASE_LABELS[session.phase].badge}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {PHASE_LABELS[session.phase].title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {PHASE_LABELS[session.phase].subtitle}
            </p>
          </div>

          {(session.phase === 'TOUR_1' ||
            session.phase === 'TOUR_2' ||
            session.phase === 'TOUR_3') && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTourViewMode('ALL_TABLES')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                  tourViewMode === 'ALL_TABLES'
                    ? 'bg-white text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Vue 3 Stands en Direct
              </button>
              <button
                type="button"
                onClick={() => setTourViewMode('SINGLE_WHEEL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                  tourViewMode === 'SINGLE_WHEEL'
                    ? 'bg-orange-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Zoom Roue Interactive
              </button>
            </div>
          )}
        </div>

        {/* -------------------- 1. LOBBY VIEW -------------------- */}
        {session.phase === 'LOBBY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-orange-500/40 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500 text-slate-950 text-xs font-black uppercase mb-3">
                <Flag className="w-3.5 h-3.5" />
                REJOIGNEZ L’ÉQUIPAGE PIT STOP
              </div>
              <h3 className="text-2xl font-black text-white mb-1">
                Scannez pour embarquer !
              </h3>
              <p className="text-xs text-slate-300 mb-4 max-w-sm">
                Choisissez votre Stand (1, 2 ou 3) et votre rôle :{' '}
                <strong className="text-amber-300">1 Hôte par table</strong> +{' '}
                <strong className="text-emerald-300">Voyageurs</strong>
              </p>

              <div className="bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.3)] border-4 border-orange-400">
                <QRCodeSVG value={playerJoinUrl} size={210} level="M" />
              </div>

              <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 w-full">
                <div className="text-[11px] text-slate-400 uppercase font-bold">
                  Code Salle • Accès Direct
                </div>
                <div className="text-2xl font-black tracking-widest text-amber-400">
                  {session.room_code}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {playerJoinUrl}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-5">
                <button
                  type="button"
                  onClick={() => setPosterLightbox('WELCOME')}
                  className="group relative rounded-2xl overflow-hidden border border-slate-700 bg-white p-1.5 hover:border-orange-400 transition-all cursor-pointer"
                >
                  <img
                    src="/assets/welcome_poster.png"
                    alt="Bienvenue au Pit Stop"
                    className="h-36 w-full object-contain"
                  />
                  <div className="mt-1 text-[11px] font-extrabold text-slate-900 bg-amber-300 rounded-lg py-1">
                    Affiche Bienvenue 🔍
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterLightbox('HOW_TO_PLAY')}
                  className="group relative rounded-2xl overflow-hidden border border-slate-700 bg-white p-1.5 hover:border-orange-400 transition-all cursor-pointer"
                >
                  <img
                    src="/assets/how_to_play.png"
                    alt="How to Play"
                    className="h-36 w-full object-contain"
                  />
                  <div className="mt-1 text-[11px] font-extrabold text-slate-900 bg-orange-300 rounded-lg py-1">
                    Règles How to Play 🔍
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePhaseTransition('TOUR_1')}
                className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                LANCER LE TOUR 1 (FEUX F1) 🏁
              </button>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([1, 2, 3] as const).map((tId) => {
                  const table = PIT_STOP_TABLES[tId];
                  const tablePlayers = players.filter((p) => p.current_table === tId);
                  const hotes = tablePlayers.filter((p) => p.role === 'HOTE');
                  const voyageurs = tablePlayers.filter((p) => p.role === 'VOYAGEUR');

                  return (
                    <div
                      key={tId}
                      className={`bg-gradient-to-b ${table.bgGradient} border-2 ${table.borderClass} rounded-3xl p-4 flex flex-col justify-between shadow-xl min-h-[420px]`}
                    >
                      <div>
                        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                          <img
                            src={table.mascotImg}
                            alt={table.name}
                            className="w-14 h-14 rounded-2xl bg-white p-1 object-contain border-2 shrink-0"
                            style={{ borderColor: table.hex }}
                          />
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${table.badgeClass}`}
                            >
                              STAND {tId}
                            </span>
                            <h4 className="text-sm font-black text-white leading-tight mt-1">
                              {table.name}
                            </h4>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 mb-1.5 flex items-center justify-between">
                            <span>🎙️ Hôte de Table</span>
                            <span>{hotes.length > 0 ? 'Prêt ✅' : 'En attente...'}</span>
                          </div>
                          {hotes.length === 0 ? (
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-700 text-xs text-slate-400 text-center">
                              1 participant choisit le rôle « Hôte » sur son mobile
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {hotes.map((h) => (
                                <div
                                  key={h.id}
                                  className="px-3 py-2 rounded-xl bg-amber-400/20 border border-amber-400 text-xs font-extrabold text-amber-200 flex items-center justify-between"
                                >
                                  <span>🎙️ {h.name}</span>
                                  <span className="text-[10px] opacity-80">{h.company}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                            <span>🏎️ Voyageurs (Pit Crew)</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white">
                              {voyageurs.length}
                            </span>
                          </div>
                          {voyageurs.length === 0 ? (
                            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500 text-center">
                              En attente des Voyageurs...
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                              {voyageurs.map((v) => (
                                <span
                                  key={v.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-bold text-slate-100 flex items-center gap-1.5 animate-fadeIn"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: table.hex }}
                                  />
                                  {v.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Les 3 Axes de la Roue :
                        </div>
                        {table.subQuestions.map((sq, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-slate-200 truncate flex items-center gap-1.5"
                          >
                            <span
                              className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center shrink-0 ${table.badgeClass}`}
                            >
                              {idx + 1}
                            </span>
                            <span className="truncate">{sq.question}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase text-orange-400">
                    MÉCANIQUE DU JEU • WORLD CAFÉ F1 PIT STOP
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200">
                    <strong>Étape 1 (3 Tours) :</strong> À chaque tour, l’<strong>Hôte</strong> reste à sa table pour résumer les idées aux nouveaux arrivants, tandis que les <strong>Voyageurs</strong> changent de table pour enrichir et voter (⚡ Boost) sur les 3 roues.{' '}
                    <strong>Étape 2 (Restitution) :</strong> Partage des Key Findings !
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPosterLightbox('HOW_TO_PLAY')}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs shrink-0 border border-slate-700 cursor-pointer"
                >
                  Agrandir « How to Play »
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 2. ROTATION TRANSITION VIEWS -------------------- */}
        {(session.phase === 'ROTATION_1_2' || session.phase === 'ROTATION_2_3') && (
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-10 text-center shadow-2xl space-y-8">
            <div className="max-w-2xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest">
                🔄 PIT STOP CREW ROTATION EN COURS
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white mt-3">
                VOYAGEURS, CHANGEZ DE TABLE !
              </h2>
              <p className="text-base sm:text-lg text-slate-300 mt-2">
                Les téléphones des <strong>Voyageurs</strong> ont automatiquement basculé vers leur nouveau Stand !{' '}
                Les <strong>Hôtes 🎙️</strong> restent à leur table pour accueillir la nouvelle vague et résumer les idées précédentes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {([1, 2, 3] as const).map((tId) => {
                const table = PIT_STOP_TABLES[tId];
                const nextTId = ((tId % 3) + 1) as 1 | 2 | 3;
                const nextTable = PIT_STOP_TABLES[nextTId];
                const currentCrew = players.filter((p) => p.current_table === tId);
                const tableIdeasCount = ideas.filter((i) => i.table_id === tId).length;
                const hoteSummary = tableSummaries[tId];

                return (
                  <div
                    key={tId}
                    className={`bg-gradient-to-b ${table.bgGradient} border-2 ${table.borderClass} rounded-3xl p-5 flex flex-col items-center`}
                  >
                    <img
                      src={table.mascotImg}
                      alt={table.name}
                      className="w-20 h-20 rounded-2xl bg-white p-1.5 object-contain border-2 mb-3"
                      style={{ borderColor: table.hex }}
                    />
                    <span className={`px-3 py-0.5 rounded-full text-xs font-black ${table.badgeClass}`}>
                      STAND {tId}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">{table.name}</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      {tableIdeasCount} idées déjà collectées à résumer par l’Hôte
                    </p>

                    {hoteSummary && hoteSummary.summaryText && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-left text-xs w-full">
                        <div className="font-black text-amber-300 text-[10px] uppercase">
                          🎙️ Résumé Hôte ({hoteSummary.hoteName}) :
                        </div>
                        <p className="text-white mt-0.5 line-clamp-2">
                          « {hoteSummary.summaryText} »
                        </p>
                      </div>
                    )}

                    <div className="mt-4 w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs">
                      <div className="font-bold text-amber-300 mb-1">
                        Nouvel équipage attendu ({currentCrew.length}) :
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {currentCrew.map((p) => (
                          <span
                            key={p.id}
                            className={`px-2 py-0.5 rounded-md font-bold ${
                              p.role === 'HOTE'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {p.role === 'HOTE' ? '🎙️ ' : ''}
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      Anciens voyageurs partis vers{' '}
                      <span className={nextTable.textClass}>Stand {nextTId} →</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  handlePhaseTransition(
                    session.phase === 'ROTATION_1_2' ? 'TOUR_2' : 'TOUR_3'
                  )
                }
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-amber-400 text-slate-950 font-black text-lg uppercase tracking-wider shadow-2xl hover:scale-105 cursor-pointer transition-all inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                DÉMARRER LE {session.phase === 'ROTATION_1_2' ? 'TOUR 2' : 'TOUR 3'} (FEUX F1) 🏁
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 3. ACTIVE TOUR VIEW (TOUR 1, 2, 3) -------------------- */}
        {(session.phase === 'TOUR_1' ||
          session.phase === 'TOUR_2' ||
          session.phase === 'TOUR_3') && (
          <>
            {tourViewMode === 'ALL_TABLES' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {([1, 2, 3] as const).map((tId) => {
                  const table = PIT_STOP_TABLES[tId];
                  const tableIdeas = ideas.filter((i) => i.table_id === tId);
                  const tablePlayers = players.filter((p) => p.current_table === tId);
                  const hoteSummary = tableSummaries[tId];

                  return (
                    <div
                      key={tId}
                      className={`bg-gradient-to-b ${table.bgGradient} border-2 ${table.borderClass} rounded-3xl p-5 flex flex-col shadow-xl`}
                    >
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <img
                            src={table.mascotImg}
                            alt={table.name}
                            className="w-14 h-14 rounded-2xl bg-white p-1 object-contain border-2 shrink-0"
                            style={{ borderColor: table.hex }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${table.badgeClass}`}
                              >
                                STAND {tId}
                              </span>
                              <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {tablePlayers.length}
                              </span>
                            </div>
                            <h3 className="text-base font-black text-white leading-tight mt-1">
                              {table.name}
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            store.updateSession({ active_wheel_table: tId });
                            setTourViewMode('SINGLE_WHEEL');
                          }}
                          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Ouvrir la roue interactive de ce stand"
                        >
                          <Compass className="w-4 h-4 text-amber-400" />
                          Roue
                        </button>
                      </div>

                      {hoteSummary && hoteSummary.summaryText && (
                        <div className="mt-3 p-3 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-xs">
                          <div className="font-black text-amber-300 text-[10px] uppercase flex items-center gap-1">
                            <Mic className="w-3 h-3" /> Synthèse Hôte ({hoteSummary.hoteName})
                          </div>
                          <p className="text-white mt-0.5 leading-snug">
                            « {hoteSummary.summaryText} »
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 my-3">
                        {table.subQuestions.map((sq, sqIdx) => {
                          const cnt = tableIdeas.filter(
                            (i) => i.sub_question_idx === sqIdx
                          ).length;
                          return (
                            <div
                              key={sqIdx}
                              className="bg-slate-950/70 border border-slate-800 rounded-xl p-2 text-center"
                            >
                              <div className={`text-[10px] font-black ${table.textClass}`}>
                                Q{sqIdx + 1} • {sq.shortTitle}
                              </div>
                              <div className="text-lg font-black text-white">{cnt}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex-1 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                        {tableIdeas.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                            Les participants du Stand {tId} saisissent leurs idées depuis leurs téléphones...
                          </div>
                        ) : (
                          tableIdeas.map((idea) => (
                            <div
                              key={idea.id}
                              className={`p-3.5 rounded-2xl border transition-all animate-fadeIn ${
                                idea.is_key_finding
                                  ? 'bg-gradient-to-r from-amber-500/25 to-slate-900 border-amber-400 shadow-lg'
                                  : 'bg-slate-950/85 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black ${table.badgeClass}`}
                                >
                                  Q{idea.sub_question_idx + 1} •{' '}
                                  {table.subQuestions[idea.sub_question_idx].shortTitle}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => store.toggleVote(idea.id, 'HOST_BOOST')}
                                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    title="Booster cette idée"
                                  >
                                    <Zap className="w-3 h-3 fill-amber-400" />
                                    {idea.votes}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => store.toggleKeyFinding(idea.id)}
                                    className={`p-1 rounded-lg cursor-pointer ${
                                      idea.is_key_finding
                                        ? 'bg-amber-400 text-slate-950'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                    title="Épingler comme Key Finding pour la Restitution"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSpotlightIdea(idea)}
                                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                    title="Afficher en plein écran"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-sm text-white font-medium leading-snug">
                                {idea.content}
                              </p>

                              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                                <span>
                                  {idea.author_role === 'HOTE' ? '🎙️ ' : '🏎️ '}
                                  <strong className="text-slate-200">{idea.author_name}</strong>
                                </span>
                                <span>Tour {idea.tour}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {([1, 2, 3] as const).map((tId) => {
                    const t = PIT_STOP_TABLES[tId];
                    const isSelected = session.active_wheel_table === tId;
                    return (
                      <button
                        key={tId}
                        type="button"
                        onClick={() =>
                          store.updateSession({
                            active_wheel_table: tId,
                            active_sub_question: null,
                          })
                        }
                        className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 border-2 cursor-pointer transition-all ${
                          isSelected
                            ? `${t.badgeClass} border-white shadow-xl scale-105`
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <span>STAND {tId} : {t.name}</span>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const activeTable = PIT_STOP_TABLES[session.active_wheel_table];
                  const filteredIdeas = ideas
                    .filter(
                      (i) =>
                        i.table_id === activeTable.id &&
                        (session.active_sub_question === null ||
                          i.sub_question_idx === session.active_sub_question)
                    )
                    .sort(
                      (a, b) =>
                        Number(b.is_key_finding) - Number(a.is_key_finding) ||
                        b.votes - a.votes
                    );

                  return (
                    <div
                      className={`bg-gradient-to-br ${activeTable.bgGradient} border-2 ${activeTable.borderClass} rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start`}
                    >
                      <div className="lg:col-span-5 flex flex-col items-center">
                        <InteractivePitWheel
                          table={activeTable}
                          ideas={ideas}
                          activeSubQuestion={session.active_sub_question}
                          onSelectSubQuestion={(idx) =>
                            store.updateSession({ active_sub_question: idx })
                          }
                        />
                      </div>

                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                          <div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${activeTable.badgeClass}`}
                            >
                              STAND {activeTable.id} •{' '}
                              {session.active_sub_question === null
                                ? 'TOUTES LES 3 QUESTIONS'
                                : `FOCUS QUESTION ${session.active_sub_question + 1}`}
                            </span>
                            <h3 className="text-xl font-black text-white mt-1">
                              {session.active_sub_question === null
                                ? activeTable.name
                                : activeTable.subQuestions[session.active_sub_question].question}
                            </h3>
                          </div>
                          <span className="text-sm font-black text-amber-300">
                            {filteredIdeas.length} idée{filteredIdeas.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
                          {filteredIdeas.map((idea) => (
                            <div
                              key={idea.id}
                              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                                idea.is_key_finding
                                  ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 shadow-lg'
                                  : 'bg-slate-950/85 border-slate-800'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-black ${activeTable.badgeClass}`}
                                  >
                                    Q{idea.sub_question_idx + 1} • Tour {idea.tour}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => store.toggleVote(idea.id, 'HOST_BOOST')}
                                      className="px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Zap className="w-3 h-3 fill-amber-400" />
                                      {idea.votes}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => store.toggleKeyFinding(idea.id)}
                                      className={`p-1 rounded-lg cursor-pointer ${
                                        idea.is_key_finding
                                          ? 'bg-amber-400 text-slate-950'
                                          : 'bg-slate-800 text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      <Star className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => store.deleteIdea(idea.id)}
                                      className="p-1 rounded-lg bg-slate-900 text-slate-500 hover:text-red-400 cursor-pointer"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-white font-medium leading-relaxed">
                                  {idea.content}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                                <span className="font-bold text-slate-200">
                                  {idea.author_role === 'HOTE' ? '🎙️ ' : '🏎️ '}
                                  {idea.author_name}
                                </span>
                                {idea.is_key_finding && (
                                  <span className="text-amber-300 font-bold text-[11px]">
                                    ⭐ Key Finding
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* -------------------- 4. RESTITUTION VIEW -------------------- */}
        {session.phase === 'RESTITUTION' && (
          <RestitutionRoadmapView
            ideas={ideas}
            players={players}
            tableSummaries={tableSummaries}
            isHost={true}
            onToggleKeyFinding={(id) => store.toggleKeyFinding(id)}
          />
        )}
      </main>

      {/* ==================== LIVE FLOATING REACTIONS OVERLAY ==================== */}
      {reactions.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 pointer-events-none">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="px-4 py-2 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-2xl flex items-center gap-2 animate-bounce"
            >
              <span className="text-2xl">{r.emoji}</span>
              <div>
                <div className="text-xs font-black text-white">{r.label}</div>
                <div className="text-[10px] text-amber-300 font-bold">
                  {r.senderName} • Stand {r.tableId}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODALS & LIGHTBOXES ==================== */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-slate-900 border-2 border-orange-400 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-xs font-black uppercase text-orange-400 mb-1">
              {EVENT_INFO.eventName} • {EVENT_INFO.workshopGameName}
            </div>
            <h3 className="text-2xl font-black text-white mb-4">
              Scannez pour rejoindre l’Atelier
            </h3>
            <div className="bg-white p-5 rounded-3xl inline-block border-4 border-orange-400 shadow-xl">
              <QRCodeSVG value={playerJoinUrl} size={240} level="M" />
            </div>
            <div className="mt-4 text-xl font-black text-amber-400 tracking-widest">
              SALLE : {session.room_code}
            </div>
            <p className="text-xs text-slate-400 mt-1 break-all">{playerJoinUrl}</p>
          </div>
        </div>
      )}

      {posterLightbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPosterLightbox(null)}
        >
          <div
            className="max-w-5xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPosterLightbox('WELCOME')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    posterLightbox === 'WELCOME'
                      ? 'bg-orange-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  1. Affiche Bienvenue
                </button>
                <button
                  type="button"
                  onClick={() => setPosterLightbox('HOW_TO_PLAY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    posterLightbox === 'HOW_TO_PLAY'
                      ? 'bg-orange-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  2. How to Play (3 Tours &amp; Restitution)
                </button>
                <button
                  type="button"
                  onClick={() => setPosterLightbox('ROADMAP')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    posterLightbox === 'ROADMAP'
                      ? 'bg-orange-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  3. Fresque Pitstop &amp; Go!
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPosterLightbox(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" /> Fermer
              </button>
            </div>

            <div className="bg-white rounded-2xl p-3 max-h-[78vh] w-full flex items-center justify-center overflow-hidden">
              <img
                src={
                  posterLightbox === 'WELCOME'
                    ? '/assets/welcome_poster.png'
                    : posterLightbox === 'HOW_TO_PLAY'
                    ? '/assets/how_to_play.png'
                    : '/assets/roadmap.png'
                }
                alt="Planche Atelier"
                className="max-h-[74vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {spotlightIdea && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setSpotlightIdea(null)}
        >
          <div
            className="max-w-2xl w-full bg-slate-900 border-2 border-amber-400 rounded-3xl p-8 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  PIT_STOP_TABLES[spotlightIdea.table_id].badgeClass
                }`}
              >
                STAND {spotlightIdea.table_id} • QUESTION {spotlightIdea.sub_question_idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setSpotlightIdea(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-400">
              {
                PIT_STOP_TABLES[spotlightIdea.table_id].subQuestions[
                  spotlightIdea.sub_question_idx
                ].question
              }
            </p>

            <blockquote className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed py-4 border-y border-slate-800">
              « {spotlightIdea.content} »
            </blockquote>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-slate-300">
                Proposé par{' '}
                <strong className="text-white">{spotlightIdea.author_name}</strong> (Tour{' '}
                {spotlightIdea.tour})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    store.toggleKeyFinding(spotlightIdea.id);
                    setSpotlightIdea({
                      ...spotlightIdea,
                      is_key_finding: !spotlightIdea.is_key_finding,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                    spotlightIdea.is_key_finding
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                  {spotlightIdea.is_key_finding ? 'Key Finding Épinglé ⭐' : 'Épingler Key Finding'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
