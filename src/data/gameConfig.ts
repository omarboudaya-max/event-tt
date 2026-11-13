export type GamePhase =
  | 'LOBBY'        // Accueil, QR Code, inscription Hôtes & Voyageurs + How to Play
  | 'TOUR_1'       // Étape 1 - Tour 1 (Pit Stop 1)
  | 'ROTATION_1_2' // Transition Pit Stop : Les Voyageurs changent de table, l'Hôte accueille
  | 'TOUR_2'       // Étape 1 - Tour 2 (Pit Stop 2)
  | 'ROTATION_2_3' // Transition Pit Stop : Dernier changement de table
  | 'TOUR_3'       // Étape 1 - Tour 3 (Pit Stop 3)
  | 'RESTITUTION'; // Étape 2 - Restitution "Share the Key Findings" & Roadmap Pitstop & Go!

export type PlayerRole = 'HOTE' | 'VOYAGEUR';

export interface SubQuestion {
  index: number;
  shortTitle: string;
  question: string;
  angleStart: number;
  angleEnd: number;
}

export interface PitStopTableConfig {
  id: 1 | 2 | 3;
  name: string;
  subtitle: string;
  colorName: string;
  hex: string;
  accentHex: string;
  bgGradient: string;
  borderClass: string;
  badgeClass: string;
  textClass: string;
  stickyBg: string;
  mascotImg: string;
  wheelImg: string;
  subQuestions: [SubQuestion, SubQuestion, SubQuestion];
}

export interface Player {
  id: string;
  room_code: string;
  name: string;
  company: string;
  role: PlayerRole;
  initial_table: 1 | 2 | 3;
  current_table: 1 | 2 | 3;
  score: number;
  joined_at: string;
}

export interface IdeaNote {
  id: string;
  room_code: string;
  table_id: 1 | 2 | 3;
  sub_question_idx: 0 | 1 | 2;
  tour: 1 | 2 | 3;
  author_id: string;
  author_name: string;
  author_role: PlayerRole;
  content: string;
  votes: number;
  voters: string[]; // array of player IDs
  is_key_finding: boolean;
  hote_summary_note?: string;
  created_at: string;
}

export interface GameSessionState {
  room_code: string;
  phase: GamePhase;
  current_tour: 1 | 2 | 3;
  timer_seconds: number;
  timer_running: boolean;
  active_wheel_table: 1 | 2 | 3;
  active_sub_question: 0 | 1 | 2 | null;
  spotlight_idea_id: string | null;
  updated_at: string;
}

export const EVENT_INFO = {
  eventName: 'MEDRH 10ème Édition',
  eventSubtitle: 'Les rencontres méditerranéennes des ressources humaines',
  dates: '13 & 14 Novembre 2026 • Hammamet',
  editionTheme: '« 10 ans après : Organisations en mutation, Vagues de fond »',
  motto: 'MEDRH yet3ach',
  workshopTitle: 'Le Leadership inclusif au service de la performance collective',
  workshopGameName: 'PIT STOP & GO !',
  workshopSlogan: 'Chaque talent compte, chaque voix propulse',
  workshopRoom: 'Salle Kairouan • Vendredi 13 Nov. 15h45',
  facilitator: 'Meriam BEN TANFOUS',
  visualizer: 'Malak DERBEL',
  officialPartner: 'Tunisie Telecom (TT)',
  sponsors: ['Pluxee', 'Hyundai', 'Bravvo', 'Nouvelair', 'SFBT'],
  institutionalPartners: ['ICFOA', 'CONECT', 'ONFP', 'Club DSI Tunisie'],
};

export const PIT_STOP_TABLES: Record<1 | 2 | 3, PitStopTableConfig> = {
  1: {
    id: 1,
    name: 'INCLUSION INTERGÉNÉRATIONNELLE',
    subtitle: 'Génération Z & communication intergénérationnelle',
    colorName: 'Stand Jaune • Solaire',
    hex: '#F59E0B',
    accentHex: '#FBBF24',
    bgGradient: 'from-amber-500/25 via-yellow-500/10 to-slate-900',
    borderClass: 'border-amber-400',
    badgeClass: 'bg-amber-400 text-slate-950',
    textClass: 'text-amber-400',
    stickyBg: 'bg-amber-300 text-slate-950 border-amber-500',
    mascotImg: '/assets/mascot_table_1.png',
    wheelImg: '/assets/wheels_p1.png',
    subQuestions: [
      {
        index: 0,
        shortTitle: 'Richesse Collective',
        question: 'Comment transformer les différences générationnelles en richesse collective ?',
        angleStart: 210,
        angleEnd: 330,
      },
      {
        index: 1,
        shortTitle: 'Posture & Attentes',
        question: 'Comment adapter sa posture aux nouvelles attentes ?',
        angleStart: 330,
        angleEnd: 90,
      },
      {
        index: 2,
        shortTitle: 'Collaboration Inter-Gén',
        question: 'Comment mieux faire collaborer les générations ?',
        angleStart: 90,
        angleEnd: 210,
      },
    ],
  },
  2: {
    id: 2,
    name: 'EXPRESSION ET PARTICIPATION À LA PRISE DE DÉCISION',
    subtitle: 'Participation & intelligence collective',
    colorName: 'Stand Vert • Propulsion',
    hex: '#10B981',
    accentHex: '#34D399',
    bgGradient: 'from-emerald-500/25 via-green-500/10 to-slate-900',
    borderClass: 'border-emerald-400',
    badgeClass: 'bg-emerald-400 text-slate-950',
    textClass: 'text-emerald-400',
    stickyBg: 'bg-emerald-300 text-slate-950 border-emerald-500',
    mascotImg: '/assets/mascot_table_2.png',
    wheelImg: '/assets/wheels_p2.png',
    subQuestions: [
      {
        index: 0,
        shortTitle: 'Écoute des Voix',
        question: 'Toutes les voix sont-elles réellement entendues ?',
        angleStart: 210,
        angleEnd: 330,
      },
      {
        index: 1,
        shortTitle: "Confiance & Pouvoir d'Agir",
        question: "Comment développer la confiance et le pouvoir d'agir ?",
        angleStart: 330,
        angleEnd: 90,
      },
      {
        index: 2,
        shortTitle: 'Implication Décisionnelle',
        question: 'Comment impliquer davantage les équipes dans les décisions ?',
        angleStart: 90,
        angleEnd: 210,
      },
    ],
  },
  3: {
    id: 3,
    name: 'EMPOWERMENT ET PERFORMANCE',
    subtitle: 'Autonomie, équité & valorisation des talents',
    colorName: 'Stand Rose • Énergie',
    hex: '#EC4899',
    accentHex: '#F472B6',
    bgGradient: 'from-pink-500/25 via-rose-500/10 to-slate-900',
    borderClass: 'border-pink-400',
    badgeClass: 'bg-pink-400 text-slate-950',
    textClass: 'text-pink-400',
    stickyBg: 'bg-pink-300 text-slate-950 border-pink-500',
    mascotImg: '/assets/mascot_table_3.png',
    wheelImg: '/assets/wheels_p3.png',
    subQuestions: [
      {
        index: 0,
        shortTitle: 'Libérer les Talents',
        question: 'Comment libérer les talents au service de la performance collective ?',
        angleStart: 210,
        angleEnd: 330,
      },
      {
        index: 1,
        shortTitle: 'Équité des Opportunités',
        question: "Comment garantir l'équité des opportunités ?",
        angleStart: 330,
        angleEnd: 90,
      },
      {
        index: 2,
        shortTitle: 'Moyens de Réussir',
        question: 'Comment donner à chacun les moyens de réussir ?',
        angleStart: 90,
        angleEnd: 210,
      },
    ],
  },
};

export function computeRotatedTable(
  initialTable: 1 | 2 | 3,
  role: PlayerRole,
  tour: 1 | 2 | 3
): 1 | 2 | 3 {
  if (role === 'HOTE') {
    return initialTable; // Hôte stays at their table for all 3 rounds!
  }
  const zeroBased = (initialTable - 1 + (tour - 1)) % 3;
  return (zeroBased + 1) as 1 | 2 | 3;
}

export const PHASE_LABELS: Record<GamePhase, { title: string; subtitle: string; badge: string }> = {
  LOBBY: {
    title: 'BIENVENUE AU PIT STOP !',
    subtitle: 'Scannez le QR Code, choisissez votre Stand (1, 2 ou 3) et votre rôle (Hôte ou Voyageur)',
    badge: 'GRILLE DE DÉPART',
  },
  TOUR_1: {
    title: 'ÉTAPE 1 • TOUR 1 / 3',
    subtitle: 'Premier Pit Stop : Idéation sur les 3 questions de votre roue thématique',
    badge: 'TOUR 1 EN COURS',
  },
  ROTATION_1_2: {
    title: 'CHANGEMENT DE STAND (VERS TOUR 2)',
    subtitle: "Les Voyageurs changent de table ! L'Hôte reste pour résumer les idées du Tour 1 aux nouveaux arrivants.",
    badge: 'ROTATION PIT CREW',
  },
  TOUR_2: {
    title: 'ÉTAPE 1 • TOUR 2 / 3',
    subtitle: "Deuxième Pit Stop : Écoutez le résumé de l'Hôte, boostez les meilleures idées et enrichissez la roue !",
    badge: 'TOUR 2 EN COURS',
  },
  ROTATION_2_3: {
    title: 'CHANGEMENT DE STAND (VERS TOUR 3)',
    subtitle: "Dernière rotation ! Les Voyageurs rejoignent leur 3ème table. L'Hôte synthétise les Tours 1 & 2.",
    badge: 'ROTATION FINALE',
  },
  TOUR_3: {
    title: 'ÉTAPE 1 • TOUR 3 / 3 (SPRINT FINAL)',
    subtitle: 'Dernier Pit Stop : Complétez les 3 roues et sélectionnez les pépites (Key Findings) de chaque table !',
    badge: 'TOUR 3 • SPRINT',
  },
  RESTITUTION: {
    title: 'ÉTAPE 2 • RESTITUTION : PIT STOP & GO !',
    subtitle: 'Share the Key Findings : Feuille de route collective & Podium de la Performance Collective',
    badge: 'DRAPEAU À DAMIER',
  },
};
