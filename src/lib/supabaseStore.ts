import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  computeRotatedTable,
  GamePhase,
  GameSessionState,
  IdeaNote,
  Player,
  PlayerRole,
} from '../data/gameConfig';
import { soundFX } from '../utils/soundEffects';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://rgabtrvkwxifpxcfhwyy.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYWJ0cnZrd3hpZnB4Y2Zod3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MzI2MDgsImV4cCI6MjExMDEwODYwOH0.3Uznz3SV31f2-LZgYz9K9T314rn9PEzJKQfxKRClIvs';

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 25,
          },
        },
      })
    : null;

export interface LiveReaction {
  id: string;
  emoji: string;
  label: string;
  senderName: string;
  tableId: 1 | 2 | 3;
  createdAt: number;
}

export interface TableHoteSummary {
  tableId: 1 | 2 | 3;
  hoteName: string;
  summaryText: string;
  updatedAt: string;
}

export interface FullGameStoreState {
  session: GameSessionState;
  players: Player[];
  ideas: IdeaNote[];
  tableSummaries: Record<1 | 2 | 3, TableHoteSummary | null>;
  reactions: LiveReaction[];
  connectedStatus: 'CONNECTING' | 'SUPABASE_LIVE' | 'LOCAL_ONLY';
  dbPersisted: boolean;
  startingLightsCount: number | null; // 1..5=red lights, 6=GREEN GO!
}

type Listener = (state: FullGameStoreState) => void;

const DEFAULT_ROOM = 'MEDRH10';

function getStorageKey(roomCode: string) {
  return `medrh_pitstop_state_${roomCode}`;
}

function createInitialSession(roomCode: string): GameSessionState {
  return {
    room_code: roomCode,
    phase: 'LOBBY',
    current_tour: 1,
    timer_seconds: 12 * 60,
    timer_running: false,
    active_wheel_table: 1,
    active_sub_question: null,
    spotlight_idea_id: null,
    updated_at: new Date().toISOString(),
  };
}

export class PitStopRealtimeStore {
  private roomCode: string = DEFAULT_ROOM;
  private state: FullGameStoreState;
  private listeners: Set<Listener> = new Set();
  private channel: RealtimeChannel | null = null;
  private localBroadcast: BroadcastChannel | null = null;
  private isHostInstance: boolean = false;

  constructor(roomCode: string = DEFAULT_ROOM, isHost: boolean = false) {
    this.roomCode = roomCode.toUpperCase();
    this.isHostInstance = isHost;

    const cached = this.loadFromLocalStorage();
    this.state = {
      session: cached?.session || createInitialSession(this.roomCode),
      players: cached?.players || [],
      ideas: cached?.ideas || [],
      tableSummaries: cached?.tableSummaries || { 1: null, 2: null, 3: null },
      reactions: [],
      connectedStatus: supabase ? 'CONNECTING' : 'LOCAL_ONLY',
      dbPersisted: false,
      startingLightsCount: null,
    };

    this.initChannels();
    this.setupWakeUpResync();
  }

  private loadFromLocalStorage(): Partial<FullGameStoreState> | null {
    try {
      const raw = localStorage.getItem(getStorageKey(this.roomCode));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(
        getStorageKey(this.roomCode),
        JSON.stringify({
          session: this.state.session,
          players: this.state.players,
          ideas: this.state.ideas,
          tableSummaries: this.state.tableSummaries,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }

  private notify() {
    this.saveToLocalStorage();
    const snapshot = { ...this.state };
    this.listeners.forEach((fn) => fn(snapshot));
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn({ ...this.state });
    return () => {
      this.listeners.delete(fn);
    };
  }

  public getState(): FullGameStoreState {
    return this.state;
  }

  // Automatically resync when a participant unlocks their phone screen during the workshop
  private setupWakeUpResync() {
    if (typeof window === 'undefined') return;
    const handleWake = () => {
      if (document.visibilityState === 'visible') {
        this.broadcastEvent('REQUEST_SYNC', { requesterIsHost: this.isHostInstance });
      }
    };
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);
  }

  private async initChannels() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.localBroadcast = new BroadcastChannel(`medrh_channel_${this.roomCode}`);
      this.localBroadcast.onmessage = (ev) => {
        if (ev.data && ev.data.type) {
          this.handleIncomingEvent(ev.data.type, ev.data.payload);
        }
      };
    }

    if (!supabase) {
      this.state.connectedStatus = 'LOCAL_ONLY';
      this.notify();
      return;
    }

    await this.tryFetchFromDatabase();

    this.channel = supabase.channel(`pitstop_room_${this.roomCode}`, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'PITSTOP_EVENT' }, ({ payload }) => {
        if (payload && payload.type) {
          this.handleIncomingEvent(payload.type, payload.data);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        if (!this.channel) return;
        const presenceState = this.channel.presenceState();
        Object.values(presenceState).forEach((presences: any[]) => {
          presences.forEach((p) => {
            if (p.hostSession && !this.isHostInstance) {
              const incomingSession = p.hostSession as GameSessionState;
              if (
                !this.state.session.updated_at ||
                new Date(incomingSession.updated_at) >=
                  new Date(this.state.session.updated_at)
              ) {
                const prevPhase = this.state.session.phase;
                this.state.session = incomingSession;
                if (incomingSession.phase !== prevPhase) {
                  this.applyPhaseEffects(
                    incomingSession.phase,
                    incomingSession.current_tour
                  );
                }
                this.notify();
              }
            }
          });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.state.connectedStatus = 'SUPABASE_LIVE';
          this.notify();
          if (this.isHostInstance && this.channel) {
            await this.channel.track({
              hostSession: this.state.session,
            });
          }
          this.broadcastEvent('REQUEST_SYNC', { requesterIsHost: this.isHostInstance });
        }
      });
  }

  private async tryFetchFromDatabase() {
    if (!supabase) return;
    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('pitstop_sessions')
        .select('*')
        .eq('room_code', this.roomCode)
        .maybeSingle();

      if (!sessionErr) {
        this.state.dbPersisted = true;
        if (sessionData) {
          this.state.session = {
            ...this.state.session,
            ...sessionData,
          };
        } else if (this.isHostInstance) {
          await supabase.from('pitstop_sessions').upsert(this.state.session);
        }

        const { data: playersData } = await supabase
          .from('pitstop_players')
          .select('*')
          .eq('room_code', this.roomCode)
          .order('joined_at', { ascending: true });

        if (playersData && playersData.length > 0) {
          this.state.players = playersData as Player[];
        }

        const { data: ideasData } = await supabase
          .from('pitstop_ideas')
          .select('*')
          .eq('room_code', this.roomCode)
          .order('created_at', { ascending: false });

        if (ideasData && ideasData.length > 0) {
          this.state.ideas = ideasData as IdeaNote[];
        }
        this.notify();
      }
    } catch {
      // Postgres tables optional; Realtime Broadcast + Presence handles everything
    }
  }

  private broadcastEvent(type: string, data: unknown) {
    if (this.localBroadcast) {
      this.localBroadcast.postMessage({ type, payload: data });
    }
    if (this.channel && this.state.connectedStatus === 'SUPABASE_LIVE') {
      this.channel.send({
        type: 'broadcast',
        event: 'PITSTOP_EVENT',
        payload: { type, data },
      });
    }
  }

  private handleIncomingEvent(type: string, data: any) {
    switch (type) {
      case 'REQUEST_SYNC': {
        if (
          this.isHostInstance ||
          this.state.players.length > 0 ||
          this.state.ideas.length > 0
        ) {
          this.broadcastEvent('FULL_SYNC', {
            session: this.state.session,
            players: this.state.players,
            ideas: this.state.ideas,
            tableSummaries: this.state.tableSummaries,
          });
        }
        break;
      }

      case 'FULL_SYNC': {
        if (!data) break;
        if (
          data.session &&
          (!this.state.session.updated_at ||
            new Date(data.session.updated_at) >= new Date(this.state.session.updated_at))
        ) {
          const prevPhase = this.state.session.phase;
          this.state.session = data.session;
          if (data.session.phase !== prevPhase) {
            this.applyPhaseEffects(data.session.phase, data.session.current_tour);
          }
        }
        if (Array.isArray(data.players)) {
          const map = new Map<string, Player>();
          this.state.players.forEach((p) => map.set(p.id, p));
          data.players.forEach((p: Player) => map.set(p.id, p));
          this.state.players = Array.from(map.values());
        }
        if (Array.isArray(data.ideas)) {
          const map = new Map<string, IdeaNote>();
          this.state.ideas.forEach((i) => map.set(i.id, i));
          data.ideas.forEach((i: IdeaNote) => map.set(i.id, i));
          this.state.ideas = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        if (data.tableSummaries) {
          this.state.tableSummaries = {
            ...this.state.tableSummaries,
            ...data.tableSummaries,
          };
        }
        this.notify();
        break;
      }

      case 'SESSION_UPDATE': {
        const prevPhase = this.state.session.phase;
        this.state.session = { ...this.state.session, ...data };
        if (data.phase && data.phase !== prevPhase) {
          this.applyPhaseEffects(data.phase, this.state.session.current_tour);
        }
        this.notify();
        break;
      }

      case 'PLAYER_UPSERT': {
        const p = data as Player;
        const idx = this.state.players.findIndex((item) => item.id === p.id);
        if (idx >= 0) {
          this.state.players[idx] = p;
        } else {
          this.state.players = [...this.state.players, p];
          if (this.isHostInstance) {
            soundFX.playWheelGun();
          }
        }
        this.notify();
        break;
      }

      case 'IDEA_ADD': {
        const idea = data as IdeaNote;
        if (!this.state.ideas.some((i) => i.id === idea.id)) {
          this.state.ideas = [idea, ...this.state.ideas];
          this.state.players = this.state.players.map((p) =>
            p.id === idea.author_id ? { ...p, score: p.score + 10 } : p
          );
          if (this.isHostInstance) {
            soundFX.playWheelGun();
          }
        }
        this.notify();
        break;
      }

      case 'IDEA_UPDATE': {
        const updated = data as IdeaNote;
        this.state.ideas = this.state.ideas.map((i) =>
          i.id === updated.id ? updated : i
        );
        this.notify();
        break;
      }

      case 'IDEA_DELETE': {
        const { id } = data as { id: string };
        this.state.ideas = this.state.ideas.filter((i) => i.id !== id);
        this.notify();
        break;
      }

      case 'HOTE_SUMMARY_UPDATE': {
        const summary = data as TableHoteSummary;
        this.state.tableSummaries = {
          ...this.state.tableSummaries,
          [summary.tableId]: summary,
        };
        if (this.isHostInstance) {
          soundFX.playBoost();
        }
        this.notify();
        break;
      }

      case 'LIVE_REACTION': {
        const reaction = data as LiveReaction;
        this.state.reactions = [...this.state.reactions.slice(-14), reaction];
        this.notify();
        setTimeout(() => {
          this.state.reactions = this.state.reactions.filter(
            (r) => r.id !== reaction.id
          );
          this.notify();
        }, 4000);
        break;
      }

      case 'STARTING_LIGHTS': {
        const { count } = data as { count: number | null };
        this.state.startingLightsCount = count;
        if (count !== null && count >= 1 && count <= 5) {
          soundFX.playLightBeep(false);
        } else if (count === 6) {
          soundFX.playLightBeep(true);
        }
        this.notify();
        break;
      }

      case 'RESET_ROOM': {
        this.state.session = createInitialSession(this.roomCode);
        this.state.players = [];
        this.state.ideas = [];
        this.state.tableSummaries = { 1: null, 2: null, 3: null };
        this.notify();
        break;
      }
    }
  }

  private applyPhaseEffects(newPhase: GamePhase, _currentTour: 1 | 2 | 3) {
    if (
      newPhase === 'TOUR_1' ||
      newPhase === 'ROTATION_1_2' ||
      newPhase === 'TOUR_2' ||
      newPhase === 'ROTATION_2_3' ||
      newPhase === 'TOUR_3'
    ) {
      const targetTour: 1 | 2 | 3 =
        newPhase === 'TOUR_1'
          ? 1
          : newPhase === 'ROTATION_1_2' || newPhase === 'TOUR_2'
          ? 2
          : 3;

      this.state.players = this.state.players.map((p) => ({
        ...p,
        current_table: computeRotatedTable(p.initial_table, p.role, targetTour),
      }));

      if (newPhase.startsWith('ROTATION_')) {
        soundFX.playPitLaneHorn();
      }
    } else if (newPhase === 'RESTITUTION') {
      soundFX.playFanfare();
    }
  }

  // ==================== ACTIONS ====================

  public async updateSession(partial: Partial<GameSessionState>) {
    const prevPhase = this.state.session.phase;
    const updated: GameSessionState = {
      ...this.state.session,
      ...partial,
      updated_at: new Date().toISOString(),
    };
    this.state.session = updated;

    if (partial.phase && partial.phase !== prevPhase) {
      this.applyPhaseEffects(partial.phase, updated.current_tour);
    }

    this.notify();
    this.broadcastEvent('SESSION_UPDATE', updated);

    if (this.isHostInstance && this.channel && this.state.connectedStatus === 'SUPABASE_LIVE') {
      this.channel.track({ hostSession: updated }).catch(() => {});
    }

    if (supabase && this.state.dbPersisted) {
      supabase.from('pitstop_sessions').upsert(updated).then(() => {});
    }
  }

  public async upsertPlayer(player: Player) {
    const idx = this.state.players.findIndex((p) => p.id === player.id);
    if (idx >= 0) {
      this.state.players[idx] = player;
    } else {
      this.state.players = [...this.state.players, player];
    }
    soundFX.playWheelGun();
    this.notify();
    this.broadcastEvent('PLAYER_UPSERT', player);

    if (supabase && this.state.dbPersisted) {
      supabase.from('pitstop_players').upsert(player).then(() => {});
    }
  }

  public async changePlayerRoleOrTable(
    playerId: string,
    newTable: 1 | 2 | 3,
    newRole?: PlayerRole
  ) {
    const existing = this.state.players.find((p) => p.id === playerId);
    if (!existing) return;
    const updated: Player = {
      ...existing,
      current_table: newTable,
      initial_table:
        this.state.session.current_tour === 1 ? newTable : existing.initial_table,
      role: newRole ?? existing.role,
    };
    await this.upsertPlayer(updated);
  }

  public async addIdea(params: {
    table_id: 1 | 2 | 3;
    sub_question_idx: 0 | 1 | 2;
    author: Player;
    content: string;
  }) {
    const newIdea: IdeaNote = {
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      room_code: this.roomCode,
      table_id: params.table_id,
      sub_question_idx: params.sub_question_idx,
      tour: this.state.session.current_tour,
      author_id: params.author.id,
      author_name: params.author.name,
      author_role: params.author.role,
      content: params.content.trim(),
      votes: 1,
      voters: [params.author.id],
      is_key_finding: false,
      hote_summary_note: '',
      created_at: new Date().toISOString(),
    };

    this.state.ideas = [newIdea, ...this.state.ideas];
    this.state.players = this.state.players.map((p) =>
      p.id === params.author.id ? { ...p, score: p.score + 10 } : p
    );
    soundFX.playWheelGun();
    this.notify();
    this.broadcastEvent('IDEA_ADD', newIdea);

    if (supabase && this.state.dbPersisted) {
      supabase.from('pitstop_ideas').insert(newIdea).then(() => {});
    }
    return newIdea;
  }

  public async toggleVote(ideaId: string, voterId: string) {
    const target = this.state.ideas.find((i) => i.id === ideaId);
    if (!target) return;

    const alreadyVoted = target.voters.includes(voterId);
    const updatedVoters = alreadyVoted
      ? target.voters.filter((id) => id !== voterId)
      : [...target.voters, voterId];

    const updatedIdea: IdeaNote = {
      ...target,
      voters: updatedVoters,
      votes: updatedVoters.length,
    };

    this.state.ideas = this.state.ideas.map((i) =>
      i.id === ideaId ? updatedIdea : i
    );

    const delta = alreadyVoted ? -5 : 5;
    this.state.players = this.state.players.map((p) =>
      p.id === target.author_id ? { ...p, score: Math.max(0, p.score + delta) } : p
    );

    if (!alreadyVoted) {
      soundFX.playBoost();
    }
    this.notify();
    this.broadcastEvent('IDEA_UPDATE', updatedIdea);

    if (supabase && this.state.dbPersisted) {
      supabase
        .from('pitstop_ideas')
        .update({ votes: updatedIdea.votes, voters: updatedIdea.voters })
        .eq('id', ideaId)
        .then(() => {});
    }
  }

  public async toggleKeyFinding(ideaId: string) {
    const target = this.state.ideas.find((i) => i.id === ideaId);
    if (!target) return;

    const updatedIdea: IdeaNote = {
      ...target,
      is_key_finding: !target.is_key_finding,
    };

    this.state.ideas = this.state.ideas.map((i) =>
      i.id === ideaId ? updatedIdea : i
    );
    soundFX.playBoost();
    this.notify();
    this.broadcastEvent('IDEA_UPDATE', updatedIdea);

    if (supabase && this.state.dbPersisted) {
      supabase
        .from('pitstop_ideas')
        .update({ is_key_finding: updatedIdea.is_key_finding })
        .eq('id', ideaId)
        .then(() => {});
    }
  }

  public async updateTableHoteSummary(
    tableId: 1 | 2 | 3,
    hoteName: string,
    summaryText: string
  ) {
    const summary: TableHoteSummary = {
      tableId,
      hoteName,
      summaryText: summaryText.trim(),
      updatedAt: new Date().toISOString(),
    };
    this.state.tableSummaries = {
      ...this.state.tableSummaries,
      [tableId]: summary,
    };
    soundFX.playBoost();
    this.notify();
    this.broadcastEvent('HOTE_SUMMARY_UPDATE', summary);
  }

  public sendLiveReaction(params: {
    emoji: string;
    label: string;
    senderName: string;
    tableId: 1 | 2 | 3;
  }) {
    const reaction: LiveReaction = {
      id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji: params.emoji,
      label: params.label,
      senderName: params.senderName,
      tableId: params.tableId,
      createdAt: Date.now(),
    };
    this.state.reactions = [...this.state.reactions.slice(-14), reaction];
    soundFX.playBoost();
    this.notify();
    this.broadcastEvent('LIVE_REACTION', reaction);

    setTimeout(() => {
      this.state.reactions = this.state.reactions.filter(
        (r) => r.id !== reaction.id
      );
      this.notify();
    }, 4000);
  }

  public async deleteIdea(ideaId: string) {
    this.state.ideas = this.state.ideas.filter((i) => i.id !== ideaId);
    this.notify();
    this.broadcastEvent('IDEA_DELETE', { id: ideaId });

    if (supabase && this.state.dbPersisted) {
      supabase.from('pitstop_ideas').delete().eq('id', ideaId).then(() => {});
    }
  }

  public runF1StartingLights(onComplete: () => void) {
    let step = 1;
    const interval = setInterval(() => {
      if (step <= 5) {
        this.state.startingLightsCount = step;
        soundFX.playLightBeep(false);
        this.notify();
        this.broadcastEvent('STARTING_LIGHTS', { count: step });
        step++;
      } else if (step === 6) {
        this.state.startingLightsCount = 6;
        soundFX.playLightBeep(true);
        this.notify();
        this.broadcastEvent('STARTING_LIGHTS', { count: 6 });
        step++;
      } else {
        clearInterval(interval);
        this.state.startingLightsCount = null;
        this.notify();
        this.broadcastEvent('STARTING_LIGHTS', { count: null });
        onComplete();
      }
    }, 650);
  }

  public seedSimulationData() {
    const demoPlayers: Player[] = [
      { id: 'sim_h1', room_code: this.roomCode, name: 'Sami B. (Hôte)', company: 'Tunisie Telecom', role: 'HOTE', initial_table: 1, current_table: 1, score: 45, joined_at: new Date().toISOString() },
      { id: 'sim_h2', room_code: this.roomCode, name: 'Ines K. (Hôte)', company: 'Pluxee', role: 'HOTE', initial_table: 2, current_table: 2, score: 50, joined_at: new Date().toISOString() },
      { id: 'sim_h3', room_code: this.roomCode, name: 'Karim M. (Hôte)', company: 'Hyundai', role: 'HOTE', initial_table: 3, current_table: 3, score: 40, joined_at: new Date().toISOString() },
      { id: 'sim_v1', room_code: this.roomCode, name: 'Yasmine T.', company: 'SFBT', role: 'VOYAGEUR', initial_table: 1, current_table: computeRotatedTable(1, 'VOYAGEUR', this.state.session.current_tour), score: 35, joined_at: new Date().toISOString() },
      { id: 'sim_v2', room_code: this.roomCode, name: 'Mehdi R.', company: 'Nouvelair', role: 'VOYAGEUR', initial_table: 2, current_table: computeRotatedTable(2, 'VOYAGEUR', this.state.session.current_tour), score: 30, joined_at: new Date().toISOString() },
      { id: 'sim_v3', room_code: this.roomCode, name: 'Amira J.', company: 'CONECT', role: 'VOYAGEUR', initial_table: 3, current_table: computeRotatedTable(3, 'VOYAGEUR', this.state.session.current_tour), score: 40, joined_at: new Date().toISOString() },
      { id: 'sim_v4', room_code: this.roomCode, name: 'Walid C.', company: 'Club DSI', role: 'VOYAGEUR', initial_table: 1, current_table: computeRotatedTable(1, 'VOYAGEUR', this.state.session.current_tour), score: 25, joined_at: new Date().toISOString() },
      { id: 'sim_v5', room_code: this.roomCode, name: 'Salma S.', company: 'Bravvo', role: 'VOYAGEUR', initial_table: 2, current_table: computeRotatedTable(2, 'VOYAGEUR', this.state.session.current_tour), score: 30, joined_at: new Date().toISOString() },
      { id: 'sim_v6', room_code: this.roomCode, name: 'Nabil H.', company: 'ICFOA', role: 'VOYAGEUR', initial_table: 3, current_table: computeRotatedTable(3, 'VOYAGEUR', this.state.session.current_tour), score: 20, joined_at: new Date().toISOString() },
    ];

    const demoIdeas: IdeaNote[] = [
      {
        id: 'sim_idea_1',
        room_code: this.roomCode,
        table_id: 1,
        sub_question_idx: 0,
        tour: 1,
        author_id: 'sim_v1',
        author_name: 'Yasmine T.',
        author_role: 'VOYAGEUR',
        content: 'Instaurer le Reverse Mentoring : binômes Gen Z (IA, outils digitaux) + Seniors (vision métier & réseau stratégique).',
        votes: 7,
        voters: ['sim_h1', 'sim_v1', 'sim_v2', 'sim_v3', 'sim_v4', 'sim_v5', 'sim_v6'],
        is_key_finding: true,
        created_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: 'sim_idea_2',
        room_code: this.roomCode,
        table_id: 1,
        sub_question_idx: 1,
        tour: 1,
        author_id: 'sim_h1',
        author_name: 'Sami B. (Hôte)',
        author_role: 'HOTE',
        content: 'Passer du management par le contrôle horaire au management par objectifs clairs, flexibilité et quête de sens.',
        votes: 5,
        voters: ['sim_h1', 'sim_v1', 'sim_v2', 'sim_v4', 'sim_v5'],
        is_key_finding: true,
        created_at: new Date(Date.now() - 540000).toISOString(),
      },
      {
        id: 'sim_idea_3',
        room_code: this.roomCode,
        table_id: 1,
        sub_question_idx: 2,
        tour: 2,
        author_id: 'sim_v3',
        author_name: 'Amira J.',
        author_role: 'VOYAGEUR',
        content: 'Créer des squads projets mixtes où chaque génération porte un rôle de co-pilote sur les transformations internes.',
        votes: 4,
        voters: ['sim_h1', 'sim_v3', 'sim_v4', 'sim_v6'],
        is_key_finding: false,
        created_at: new Date(Date.now() - 480000).toISOString(),
      },
      {
        id: 'sim_idea_4',
        room_code: this.roomCode,
        table_id: 2,
        sub_question_idx: 0,
        tour: 1,
        author_id: 'sim_v2',
        author_name: 'Mehdi R.',
        author_role: 'VOYAGEUR',
        content: 'Rituels « Voix du Terrain » mensuels anonymisés ou en cercle ouvert avant chaque décision stratégique du CODIR.',
        votes: 8,
        voters: ['sim_h2', 'sim_v1', 'sim_v2', 'sim_v3', 'sim_v4', 'sim_v5', 'sim_v6', 'sim_h1'],
        is_key_finding: true,
        created_at: new Date(Date.now() - 420000).toISOString(),
      },
      {
        id: 'sim_idea_5',
        room_code: this.roomCode,
        table_id: 2,
        sub_question_idx: 1,
        tour: 1,
        author_id: 'sim_h2',
        author_name: 'Ines K. (Hôte)',
        author_role: 'HOTE',
        content: 'Charte du « Droit à l’expérimentation » : valoriser les initiatives prises sur le terrain même quand elles nécessitent un ajustement.',
        votes: 6,
        voters: ['sim_h2', 'sim_v2', 'sim_v3', 'sim_v5', 'sim_v6', 'sim_v1'],
        is_key_finding: true,
        created_at: new Date(Date.now() - 360000).toISOString(),
      },
      {
        id: 'sim_idea_6',
        room_code: this.roomCode,
        table_id: 2,
        sub_question_idx: 2,
        tour: 2,
        author_id: 'sim_v5',
        author_name: 'Salma S.',
        author_role: 'VOYAGEUR',
        content: 'Budget participatif d’équipe : laisser les collaborateurs co-décider de 15% des projets d’amélioration continue.',
        votes: 5,
        voters: ['sim_h2', 'sim_v5', 'sim_v1', 'sim_v2', 'sim_v4'],
        is_key_finding: false,
        created_at: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: 'sim_idea_7',
        room_code: this.roomCode,
        table_id: 3,
        sub_question_idx: 0,
        tour: 1,
        author_id: 'sim_v3',
        author_name: 'Amira J.',
        author_role: 'VOYAGEUR',
        content: 'Cartographie dynamique des talents cachés (au-delà de la fiche de poste) pour mobiliser les passions sur des missions transverses.',
        votes: 7,
        voters: ['sim_h3', 'sim_v3', 'sim_v1', 'sim_v2', 'sim_v4', 'sim_v5', 'sim_v6'],
        is_key_finding: true,
        created_at: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: 'sim_idea_8',
        room_code: this.roomCode,
        table_id: 3,
        sub_question_idx: 1,
        tour: 2,
        author_id: 'sim_h3',
        author_name: 'Karim M. (Hôte)',
        author_role: 'HOTE',
        content: 'Transparence totale sur les critères de mobilité interne, de formation IA et de reconnaissance de la performance.',
        votes: 6,
        voters: ['sim_h3', 'sim_v1', 'sim_v3', 'sim_v4', 'sim_v5', 'sim_v6'],
        is_key_finding: true,
        created_at: new Date(Date.now() - 180000).toISOString(),
      },
      {
        id: 'sim_idea_9',
        room_code: this.roomCode,
        table_id: 3,
        sub_question_idx: 2,
        tour: 2,
        author_id: 'sim_v4',
        author_name: 'Walid C.',
        author_role: 'VOYAGEUR',
        content: 'Octroyer un « Crédit Temps Innovation & Apprentissage » (2h/semaine) avec coaching personnalisé par les pairs.',
        votes: 5,
        voters: ['sim_h3', 'sim_v4', 'sim_v2', 'sim_v3', 'sim_v6'],
        is_key_finding: false,
        created_at: new Date(Date.now() - 120000).toISOString(),
      },
    ];

    const demoSummaries: Record<1 | 2 | 3, TableHoteSummary | null> = {
      1: {
        tableId: 1,
        hoteName: 'Sami B. (Hôte)',
        summaryText: 'Consensus fort sur le Reverse Mentoring Gen Z / Seniors et le passage à un management par la confiance et le sens.',
        updatedAt: new Date().toISOString(),
      },
      2: {
        tableId: 2,
        hoteName: 'Ines K. (Hôte)',
        summaryText: 'Priorité aux rituels « Voix du Terrain » avant les décisions CODIR et au droit à l’expérimentation en équipe.',
        updatedAt: new Date().toISOString(),
      },
      3: {
        tableId: 3,
        hoteName: 'Karim M. (Hôte)',
        summaryText: 'Valoriser les compétences hors fiche de poste, garantir la transparence des parcours et libérer du temps d’apprentissage.',
        updatedAt: new Date().toISOString(),
      },
    };

    this.state.players = demoPlayers;
    this.state.ideas = demoIdeas;
    this.state.tableSummaries = demoSummaries;
    soundFX.playFanfare();
    this.notify();
    this.broadcastEvent('FULL_SYNC', {
      session: this.state.session,
      players: this.state.players,
      ideas: this.state.ideas,
      tableSummaries: this.state.tableSummaries,
    });
  }

  public async resetRoom() {
    this.state.session = createInitialSession(this.roomCode);
    this.state.players = [];
    this.state.ideas = [];
    this.state.tableSummaries = { 1: null, 2: null, 3: null };
    this.notify();
    this.broadcastEvent('RESET_ROOM', {});

    if (supabase && this.state.dbPersisted) {
      supabase.from('pitstop_ideas').delete().eq('room_code', this.roomCode).then(() => {});
      supabase.from('pitstop_players').delete().eq('room_code', this.roomCode).then(() => {});
      supabase.from('pitstop_sessions').upsert(this.state.session).then(() => {});
    }
  }
}
