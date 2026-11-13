import React, { useEffect, useMemo, useState } from 'react';
import { FullGameStoreState, PitStopRealtimeStore } from './lib/supabaseStore';
import { HostDashboard } from './views/HostDashboard';
import { PlayerMobileApp } from './views/PlayerMobileApp';
import { F1StartingLightsOverlay } from './components/F1StartingLightsOverlay';
import { EVENT_INFO, PIT_STOP_TABLES } from './data/gameConfig';
import { Monitor, Smartphone, Columns, Flag, Sparkles } from 'lucide-react';

type ViewMode = 'LANDING' | 'HOST' | 'PLAYER' | 'SPLIT_PREVIEW';

export const App: React.FC = () => {
  // Determine initial mode & room from URL query params or path
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return { mode: 'LANDING' as ViewMode, room: 'MEDRH10' };
    }
    const params = new URLSearchParams(window.location.search);
    const modeParam = (params.get('mode') || '').toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const room = (params.get('room') || 'MEDRH10').toUpperCase();

    if (modeParam === 'player' || path.includes('/play')) {
      return { mode: 'PLAYER' as ViewMode, room };
    }
    if (modeParam === 'host' || path.includes('/host')) {
      return { mode: 'HOST' as ViewMode, room };
    }
    if (modeParam === 'split') {
      return { mode: 'SPLIT_PREVIEW' as ViewMode, room };
    }
    return { mode: 'LANDING' as ViewMode, room };
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>(initialParams.mode);
  const store = useMemo(
    () => new PitStopRealtimeStore(initialParams.room, initialParams.mode !== 'PLAYER'),
    [initialParams.room, initialParams.mode]
  );

  const [gameState, setGameState] = useState<FullGameStoreState>(() =>
    store.getState()
  );

  useEffect(() => {
    return store.subscribe((newState) => {
      setGameState({ ...newState });
    });
  }, [store]);

  const switchMode = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newMode === 'LANDING') {
        url.searchParams.delete('mode');
      } else {
        url.searchParams.set('mode', newMode.toLowerCase());
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // ==================== LANDING / LAUNCHER SCREEN ====================
  if (viewMode === 'LANDING') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl w-full mx-auto my-auto space-y-8 relative z-10">
          {/* Top Event Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-black uppercase tracking-widest">
              <Flag className="w-3.5 h-3.5" />
              {EVENT_INFO.eventName} • {EVENT_INFO.dates} • Partenaire Officiel :{' '}
              {EVENT_INFO.officialPartner}
            </div>

            <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white">
              BIENVENUE À NOTRE{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-pink-400">
                PIT STOP !
              </span>
            </h1>

            <p className="text-base sm:text-xl font-bold text-slate-200 max-w-2xl mx-auto">
              Atelier : « {EVENT_INFO.workshopTitle} »
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              {EVENT_INFO.workshopRoom} • Animé par{' '}
              <strong className="text-amber-300">{EVENT_INFO.facilitator}</strong> •
              Visualisation par{' '}
              <strong className="text-pink-300">{EVENT_INFO.visualizer}</strong>
            </p>
          </div>

          {/* 3 Launch Cards: Host Screen, Player Mobile, or Split-Screen Test */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Host Projector */}
            <button
              type="button"
              onClick={() => switchMode('HOST')}
              className="group text-left bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-orange-500/60 hover:border-orange-400 rounded-3xl p-6 shadow-2xl transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-slate-950 flex items-center justify-center mb-4 shadow-lg">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-black uppercase">
                  ÉCRAN GÉANT • SALLE KAIROUAN
                </span>
                <h2 className="text-xl font-black text-white mt-2">
                  Mode Animateur / Host 🏁
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Projetez le QR Code d’embarquement, contrôlez le chronomètre F1, lancez les 3 Tours avec les feux de départ, affichez les 3 roues interactives et la Restitution finale.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-black text-orange-400 flex items-center justify-between">
                <span>OUVRIR LE COCKPIT HOST</span>
                <span>→</span>
              </div>
            </button>

            {/* 2. Player Smartphone */}
            <button
              type="button"
              onClick={() => switchMode('PLAYER')}
              className="group text-left bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/60 hover:border-emerald-400 rounded-3xl p-6 shadow-2xl transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center mb-4 shadow-lg">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                  MOBILE PARTICIPANTS
                </span>
                <h2 className="text-xl font-black text-white mt-2">
                  Mode Joueur (Hôte / Voyageur) 📱
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Rejoignez le Stand 1, 2 ou 3, choisissez le rôle d’Hôte de table ou de Voyageur, propulsez vos idées sur les 3 rayons de la roue et votez (⚡ Boost) à chaque rotation.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-black text-emerald-400 flex items-center justify-between">
                <span>REJOINDRE COMME JOUEUR</span>
                <span>→</span>
              </div>
            </button>

            {/* 3. Split-Screen Live Simulator */}
            <button
              type="button"
              onClick={() => switchMode('SPLIT_PREVIEW')}
              className="group text-left bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-pink-500/60 hover:border-pink-400 rounded-3xl p-6 shadow-2xl transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-pink-500 text-slate-950 flex items-center justify-center mb-4 shadow-lg">
                  <Columns className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-black uppercase">
                  RÉPÉTITION &amp; DÉMO EN DIRECT
                </span>
                <h2 className="text-xl font-black text-white mt-2">
                  Vue Split-Screen (Host + Mobile) ⚡
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Testez simultanément l’écran géant Animateur à gauche et le téléphone d’un Joueur à droite pour répéter tout l’atelier en temps réel !
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-black text-pink-400 flex items-center justify-between">
                <span>TESTER CÔTE À CÔTE</span>
                <span>→</span>
              </div>
            </button>
          </div>

          {/* 3 Pit Stop Themes Preview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {([1, 2, 3] as const).map((tId) => {
              const t = PIT_STOP_TABLES[tId];
              return (
                <div
                  key={tId}
                  className="bg-slate-900/75 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <img
                    src={t.mascotImg}
                    alt={t.name}
                    className="w-12 h-12 rounded-xl bg-white p-1 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.badgeClass}`}
                    >
                      STAND {tId}
                    </span>
                    <div className="text-xs font-extrabold text-white truncate mt-0.5">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{t.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 pt-6">
          {EVENT_INFO.eventName} • {EVENT_INFO.editionTheme} • « {EVENT_INFO.motto} »
        </footer>
      </div>
    );
  }

  // ==================== SPLIT-SCREEN SIMULATOR VIEW ====================
  if (viewMode === 'SPLIT_PREVIEW') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Sparkles className="w-4 h-4" />
            MODE SIMULATION SPLIT-SCREEN : Écran Animateur (Gauche) + Téléphone Joueur (Droite)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchMode('HOST')}
              className="px-3 py-1 rounded-lg bg-orange-500 text-slate-950 font-black cursor-pointer"
            >
              Plein Écran Host
            </button>
            <button
              type="button"
              onClick={() => switchMode('PLAYER')}
              className="px-3 py-1 rounded-lg bg-emerald-400 text-slate-950 font-black cursor-pointer"
            >
              Plein Écran Joueur
            </button>
            <button
              type="button"
              onClick={() => switchMode('LANDING')}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold cursor-pointer"
            >
              Menu Accueil
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-800">
          <div className="xl:col-span-8 max-h-[calc(100vh-44px)] overflow-y-auto">
            <HostDashboard
              store={store}
              gameState={gameState}
              onSwitchToPlayerMode={() => switchMode('PLAYER')}
            />
          </div>
          <div className="xl:col-span-4 max-h-[calc(100vh-44px)] overflow-y-auto bg-slate-950">
            <PlayerMobileApp
              store={store}
              gameState={gameState}
              onSwitchToHostMode={() => switchMode('HOST')}
            />
          </div>
        </div>

        <F1StartingLightsOverlay count={gameState.startingLightsCount} />
      </div>
    );
  }

  // ==================== SINGLE VIEW: HOST OR PLAYER ====================
  return (
    <>
      {viewMode === 'HOST' ? (
        <HostDashboard
          store={store}
          gameState={gameState}
          onSwitchToPlayerMode={() => switchMode('SPLIT_PREVIEW')}
        />
      ) : (
        <PlayerMobileApp
          store={store}
          gameState={gameState}
          onSwitchToHostMode={() => switchMode('HOST')}
        />
      )}
      <F1StartingLightsOverlay count={gameState.startingLightsCount} />
    </>
  );
};
