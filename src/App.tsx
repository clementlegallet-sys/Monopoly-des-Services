import { useEffect, useMemo, useRef, useState } from 'react';
import boardReferenceImage from '../plateau-reference-bordures-epaisses.png';
import objectionsDeckFaceImage from '../carte objection FACE.png';
import objectionCardAlreadySameImage from '../objection-j-ai-deja-la-meme-chose.png';
import objectionCardNotInterestedImage from '../objection-ca-ne-m-interesse-pas.png';
import objectionCardNoBreakdownsImage from '../objection-je-n-ai-jamais-eu-de-pannes.png';
import objectionCardBudgetImage from '../objection-j-ai-un-budget-restreint.png';
import objectionCardSpouseImage from '../objection-je-dois-en-parler-a-mon-conjoint.png';
import objectionCardReflectImage from '../objection-je-souhaite-reflechir.png';

type TileType =
  | 'start'
  | 'chance'
  | 'service'
  | 'question'
  | 'bubble'
  | 'market'
  | 'objection';

type ServiceColor = 'blue' | 'green' | 'orange';
type TrainingMode = 'arguments' | 'objections';

type ServicePiece = {
  id: string;
  name: string;
  color: ServiceColor;
  description: string;
};

type Tile = {
  id: number;
  key: string;
  title: string;
  type: TileType;
  color?: ServiceColor;
  description: string;
  serviceId?: string;
  neighbors: number[];
  shape: TileShapeDefinition;
};

type Player = {
  id: string;
  name: string;
  position: number;
  clients: number;
  pieces: string[];
  rollsTaken: number;
};

type PendingAction = {
  tile: Tile;
  playerId: string;
  roll: number;
};

type PendingMovement = {
  playerId: string;
  originTileId: number;
  roll: number;
  reachableTileIds: number[];
};

type GamePhase = 'welcome' | 'setup' | 'playing' | 'finished';

type ObjectionCard = {
  id: string;
  title: string;
  prompt: string;
  image: string;
};

type GameState = {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  centralBank: number;
  history: string[];
  pendingMovement: PendingMovement | null;
  pendingAction: PendingAction | null;
  lastRoll: number | null;
  winnerId: string | null;
  trainingMode: TrainingMode | null;
  activeObjectionCard: ObjectionCard | null;
};

type DieFaceProps = {
  value: number | null;
  isRolling: boolean;
};

type TileShapeDefinition = {
  points: string;
  tokenAnchor: {
    x: number;
    y: number;
  };
};

type Point = {
  x: number;
  y: number;
};

type TilePresentation = {
  title: string;
  description: string;
  typeLabel: string;
};


const STORAGE_KEY = 'monopoly-des-services-state';
const INITIAL_CLIENTS = 2;
const INITIAL_BANK = 40;
const SALE_VALUES = [2, 3, 5] as const;
const PLAYER_TOKEN_COLORS = ['#d9473f', '#2b6fdd', '#f59e0b', '#0f9d74'];
const OBJECTION_DECK: ObjectionCard[] = [
  {
    id: 'already-equipped',
    title: 'J’ai déjà la même chose',
    prompt: 'Le client estime être déjà équipé chez un concurrent ou via une offre similaire.',
    image: objectionCardAlreadySameImage,
  },
  {
    id: 'not-interested',
    title: 'Ça ne m’intéresse pas',
    prompt: 'Le client ne perçoit pas encore la valeur ou l’intérêt immédiat de la proposition.',
    image: objectionCardNotInterestedImage,
  },
  {
    id: 'no-breakdowns',
    title: 'Je n’ai jamais eu de pannes',
    prompt: 'Le client remet en cause le besoin car il n’a pas vécu le problème présenté.',
    image: objectionCardNoBreakdownsImage,
  },
  {
    id: 'tight-budget',
    title: 'J’ai un budget restreint',
    prompt: 'Le client exprime une contrainte budgétaire et attend une réponse adaptée.',
    image: objectionCardBudgetImage,
  },
  {
    id: 'spouse',
    title: 'Je dois en parler à mon conjoint',
    prompt: 'Le client veut reporter sa décision pour consulter une autre personne.',
    image: objectionCardSpouseImage,
  },
  {
    id: 'need-time',
    title: 'Je souhaite réfléchir',
    prompt: 'Le client demande du temps avant de s’engager.',
    image: objectionCardReflectImage,
  },
] as const;

const BOARD_SPACES: Tile[] = [
  {
    id: 0,
    key: 'start',
    title: 'Départ',
    type: 'start',
    description: 'Point de départ de tous les joueurs.',
    neighbors: [1, 16, 17, 18, 19, 20],
    shape: {
      points: '39.6,37.5 55.9,37.2 60.8,48.8 56.0,61.4 44.4,61.7 39.2,49.0',
      tokenAnchor: { x: 49.9, y: 49.3 },
    },
  },
  {
    id: 1,
    key: 'market-north',
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
    neighbors: [0, 2, 3, 15, 16, 20],
    shape: {
      points: '42.7,16.1 55.8,16.1 56.2,37.2 43.0,37.3',
      tokenAnchor: { x: 49.5, y: 26.4 },
    },
  },
  {
    id: 2,
    key: 'service-protection-facture',
    title: 'Protection Facture',
    type: 'service',
    color: 'blue',
    serviceId: 'protection-facture',
    description: 'Donner 2 avantages pour remporter la pièce.',
    neighbors: [1, 3, 15],
    shape: {
      points: '39.2,0.0 60.8,0.0 55.8,16.1 42.7,16.1',
      tokenAnchor: { x: 49.9, y: 8.2 },
    },
  },
  {
    id: 3,
    key: 'bubble-northeast',
    title: 'Bulle',
    type: 'bubble',
    description: 'Case bulle : argument BAC ou traitement d’objection selon le mode choisi.',
    neighbors: [1, 2, 4, 20],
    shape: {
      points: '60.8,0.0 81.8,0.0 71.0,21.0 66.0,21.0 55.8,16.1',
      tokenAnchor: { x: 68.7, y: 9.8 },
    },
  },
  {
    id: 4,
    key: 'chance-east',
    title: 'Chance',
    type: 'chance',
    description: 'Bonne réponse = +2 clients.',
    neighbors: [3, 5, 20],
    shape: {
      points: '81.8,0.0 100.0,49.8 79.0,49.8 71.0,21.0',
      tokenAnchor: { x: 86.5, y: 31.0 },
    },
  },
  {
    id: 5,
    key: 'question-east',
    title: 'Case ?',
    type: 'question',
    description: 'Poser une question ouverte adaptée à une offre du groupe.',
    neighbors: [4, 6, 19, 20],
    shape: {
      points: '79.0,49.8 100.0,49.8 94.0,65.0 84.2,61.4',
      tokenAnchor: { x: 89.8, y: 57.2 },
    },
  },
  {
    id: 6,
    key: 'service-izi-confort',
    title: 'IZI Confort',
    type: 'service',
    color: 'orange',
    serviceId: 'izi-confort',
    description: 'Donner 2 avantages pour remporter la pièce.',
    neighbors: [5, 7, 19],
    shape: {
      points: '73.2,69.2 84.2,61.4 94.0,65.0 87.3,84.9',
      tokenAnchor: { x: 81.0, y: 71.0 },
    },
  },
  {
    id: 7,
    key: 'bubble-southeast',
    title: 'Bulle',
    type: 'bubble',
    description: 'Case bulle : argument BAC ou traitement d’objection selon le mode choisi.',
    neighbors: [6, 8, 18, 19],
    shape: {
      points: '60.8,82.2 73.2,69.2 87.3,84.9 81.4,100.0',
      tokenAnchor: { x: 75.4, y: 88.2 },
    },
  },
  {
    id: 8,
    key: 'service-assistance-depannage',
    title: 'Assistance Dépannage',
    type: 'service',
    color: 'blue',
    serviceId: 'assistance-depannage',
    description: 'Donner 2 avantages pour remporter la pièce.',
    neighbors: [7, 9, 18],
    shape: {
      points: '39.4,82.2 60.8,82.2 61.8,100.0 38.5,100.0',
      tokenAnchor: { x: 49.7, y: 91.0 },
    },
  },
  {
    id: 9,
    key: 'bubble-southwest',
    title: 'Bulle',
    type: 'bubble',
    description: 'Case bulle : argument BAC ou traitement d’objection selon le mode choisi.',
    neighbors: [8, 10, 17, 18],
    shape: {
      points: '23.4,100.0 38.8,82.3 27.0,69.1 13.0,84.9',
      tokenAnchor: { x: 31.6, y: 90.4 },
    },
  },
  {
    id: 10,
    key: 'question-southwest',
    title: 'Case ?',
    type: 'question',
    description: 'Poser une question ouverte adaptée à une offre du groupe.',
    neighbors: [9, 11, 17],
    shape: {
      points: '0.0,100.0 13.0,84.9 27.0,69.1 9.8,65.0 0.0,80.0',
      tokenAnchor: { x: 21.6, y: 82.5 },
    },
  },
  {
    id: 11,
    key: 'service-izi-by-edf',
    title: 'IZI by EDF',
    type: 'service',
    color: 'green',
    serviceId: 'izi-by-edf',
    description: 'Donner 2 avantages pour remporter la pièce.',
    neighbors: [10, 12, 16, 17],
    shape: {
      points: '5.5,65.6 21.2,50.1 27.0,69.1 9.8,84.9',
      tokenAnchor: { x: 16.2, y: 68.8 },
    },
  },
  {
    id: 12,
    key: 'bubble-west',
    title: 'Bulle',
    type: 'bubble',
    description: 'Case bulle : argument BAC ou traitement d’objection selon le mode choisi.',
    neighbors: [11, 13, 16],
    shape: {
      points: '0.0,50.0 21.2,50.1 39.0,37.7 24.2,26.4 5.8,33.6',
      tokenAnchor: { x: 16.0, y: 55.2 },
    },
  },
  {
    id: 13,
    key: 'question-west',
    title: 'Case ?',
    type: 'question',
    description: 'Poser une question ouverte adaptée à une offre du groupe.',
    neighbors: [12, 14, 16],
    shape: {
      points: '0.0,33.6 5.8,33.6 24.2,26.4 21.2,50.1 0.0,50.0',
      tokenAnchor: { x: 8.5, y: 44.0 },
    },
  },
  {
    id: 14,
    key: 'service-thermostat-connecte-sowee',
    title: 'Thermostat connecté Sowee',
    type: 'service',
    color: 'green',
    serviceId: 'thermostat-connecte-sowee',
    description: 'Donner 2 avantages pour remporter la pièce.',
    neighbors: [13, 15, 16],
    shape: {
      points: '5.8,10.8 24.2,26.4 39.0,37.7 23.7,50.0 0.0,33.6',
      tokenAnchor: { x: 18.8, y: 28.6 },
    },
  },
  {
    id: 15,
    key: 'question-northwest',
    title: 'Case ?',
    type: 'question',
    description: 'Poser une question ouverte adaptée à une offre du groupe.',
    neighbors: [1, 2, 14, 16],
    shape: {
      points: '15.2,0.0 39.2,0.0 32.8,16.1 24.2,10.8',
      tokenAnchor: { x: 31.0, y: 7.2 },
    },
  },
  {
    id: 16,
    key: 'market-northwest',
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
    neighbors: [0, 1, 11, 12, 13, 14, 15, 17],
    shape: {
      points: '32.8,16.1 42.7,16.1 43.0,37.3 39.0,37.7 24.2,26.4',
      tokenAnchor: { x: 33.2, y: 28.7 },
    },
  },
  {
    id: 17,
    key: 'market-southwest',
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
    neighbors: [0, 10, 11, 16, 18],
    shape: {
      points: '21.2,50.1 39.2,37.8 43.0,61.5 27.0,69.1',
      tokenAnchor: { x: 31.7, y: 58.8 },
    },
  },
  {
    id: 18,
    key: 'market-south',
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
    neighbors: [0, 7, 8, 9, 17, 19],
    shape: {
      points: '43.0,61.5 56.0,61.5 56.8,82.3 39.4,82.2',
      tokenAnchor: { x: 50.0, y: 71.4 },
    },
  },
  {
    id: 19,
    key: 'market-southeast',
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
    neighbors: [0, 5, 6, 7, 18, 20],
    shape: {
      points: '56.0,61.5 67.8,49.8 73.2,69.2 60.8,82.2 56.8,82.3',
      tokenAnchor: { x: 64.2, y: 58.9 },
    },
  },
  {
    id: 20,
    key: 'market-northeast',
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
    neighbors: [0, 1, 3, 4, 5, 19],
    shape: {
      points: '56.2,37.2 70.6,28.6 79.0,41.5 67.8,49.8 60.0,49.8',
      tokenAnchor: { x: 67.0, y: 38.0 },
    },
  },
];

const TILE_GRAPH: Record<number, number[]> = Object.fromEntries(
  BOARD_SPACES.map((tile) => [tile.id, tile.neighbors]),
);

const parsePolygonPoints = (points: string): Point[] =>
  points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });

const serializePolygonPoints = (points: Point[]): string =>
  points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

const insetPolygonPoints = (points: string, inset: number): string => {
  if (inset <= 0) {
    return points;
  }

  const parsedPoints = parsePolygonPoints(points);
  const centroid = parsedPoints.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x / parsedPoints.length,
      y: accumulator.y + point.y / parsedPoints.length,
    }),
    { x: 0, y: 0 },
  );

  const insetPoints = parsedPoints.map((point) => {
    const deltaX = centroid.x - point.x;
    const deltaY = centroid.y - point.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      return point;
    }

    const appliedInset = Math.min(inset, distance * 0.35);
    const ratio = appliedInset / distance;

    return {
      x: point.x + deltaX * ratio,
      y: point.y + deltaY * ratio,
    };
  });

  return serializePolygonPoints(insetPoints);
};

const getBoardRegistryIssues = (tiles: Tile[]) => {
  const tileIds = new Set(tiles.map((tile) => tile.id));
  const issues: string[] = [];

  tiles.forEach((tile) => {
    if (!tile.key.trim()) {
      issues.push(`Case ${tile.id} sans identifiant lisible.`);
    }

    if (!tile.title.trim()) {
      issues.push(`Case ${tile.id} sans libellé.`);
    }

    if (!tile.description.trim()) {
      issues.push(`Case ${tile.id} sans description.`);
    }

    if (!tile.shape.points.trim()) {
      issues.push(`Case ${tile.id} sans forme SVG.`);
    }

    if (tile.neighbors.length === 0) {
      issues.push(`Case ${tile.id} sans adjacency.`);
    }

    tile.neighbors.forEach((neighborId) => {
      if (!tileIds.has(neighborId)) {
        issues.push(`Case ${tile.id} reliée à une case inconnue (${neighborId}).`);
        return;
      }

      if (!TILE_GRAPH[neighborId]?.includes(tile.id)) {
        issues.push(`Adjacency non symétrique entre ${tile.id} et ${neighborId}.`);
      }
    });
  });

  return issues;
};

const BOARD_REGISTRY_ISSUES = getBoardRegistryIssues(BOARD_SPACES);

const DIE_PIPS: Record<number, string[]> = {
  1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
};

const servicePieces: ServicePiece[] = [
  {
    id: 'assistance-depannage',
    name: 'Assistance Dépannage',
    color: 'blue',
    description: 'Aide rapide en cas de problème ou de panne à domicile.',
  },
  {
    id: 'protection-facture',
    name: 'Protection Facture',
    color: 'blue',
    description: 'Sécurise le budget en cas de hausse imprévue ou d’imprévu.',
  },
  {
    id: 'izi-by-edf',
    name: 'IZI by EDF',
    color: 'green',
    description: 'Accompagnement travaux et rénovation énergétique.',
  },
  {
    id: 'thermostat-connecte-sowee',
    name: 'Thermostat connecté Sowee',
    color: 'green',
    description: 'Pilotage malin du chauffage et suivi des consommations.',
  },
  {
    id: 'izi-confort',
    name: 'IZI Confort',
    color: 'orange',
    description: 'Solutions de confort thermique pour le foyer.',
  },
  {
    id: 'homiris',
    name: 'Homiris',
    color: 'orange',
    description: 'Protection du domicile avec télésurveillance.',
  },
];

const board = BOARD_SPACES;

const colorLabels: Record<ServiceColor, string> = {
  blue: 'Bleu',
  green: 'Vert',
  orange: 'Orange',
};

const tileTypeLabels: Record<TileType, string> = {
  start: 'Départ',
  chance: 'Chance',
  service: 'Service EDF',
  question: 'Case ?',
  bubble: 'Bulle',
  market: 'Place du Marché',
  objection: 'Objection',
};

const trainingModeLabels: Record<TrainingMode, string> = {
  arguments: 'Arguments de vente',
  objections: 'Objections',
};

const bubbleModeCopy: Record<
  TrainingMode,
  {
    label: string;
    description: string;
    success: string;
  }
> = {
  arguments: {
    label: 'Argument de vente',
    description: 'Développer un argument BAC clair, concret et orienté bénéfices client.',
    success: 'Challenge argumentaire réussi.',
  },
  objections: {
    label: 'Traitement d’objection',
    description:
      'Répondre à une objection client avec une reformulation claire et une réponse rassurante.',
    success: 'Challenge objection réussi.',
  },
};


const drawRandomObjectionCard = (excludedId?: string | null) => {
  const availableCards = OBJECTION_DECK.filter((card) => card.id !== excludedId);

  if (availableCards.length === 0) {
    return OBJECTION_DECK[0] ?? null;
  }

  return availableCards[Math.floor(Math.random() * availableCards.length)] ?? null;
};

const createInitialState = (): GameState => ({
  phase: 'welcome',
  players: [],
  currentPlayerIndex: 0,
  centralBank: INITIAL_BANK,
  history: ['Bienvenue dans Monopoly des Services.'],
  pendingMovement: null,
  pendingAction: null,
  lastRoll: null,
  winnerId: null,
  trainingMode: null,
  activeObjectionCard: null,
});

const uid = () => Math.random().toString(36).slice(2, 10);

const getService = (serviceId?: string) =>
  servicePieces.find((piece) => piece.id === serviceId) ?? null;

const appendHistoryEntry = (history: string[], message: string) => [message, ...history].slice(0, 12);

const TOKEN_OFFSETS = [
  { x: 0, y: 0 },
  { x: 2.6, y: -2.2 },
  { x: -2.6, y: 2.2 },
  { x: 2.6, y: 2.2 },
  { x: -2.6, y: -2.2 },
] as const;

const getTokenOffset = (occupantIndex: number) => {
  const preset = TOKEN_OFFSETS[occupantIndex];

  if (preset) {
    return preset;
  }

  const ringIndex = occupantIndex - TOKEN_OFFSETS.length;
  const angle = ((ringIndex % 6) / 6) * Math.PI * 2;
  const radius = 4.4 + Math.floor(ringIndex / 6) * 1.8;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};


const getTilePresentation = (
  tile: Tile,
  trainingMode: TrainingMode | null,
): TilePresentation => {
  if (tile.type === 'bubble' || tile.type === 'objection') {
    if (trainingMode === 'objections') {
      return {
        title: 'Objection',
        description: 'Tirez une carte Objection et répondez avec la méthode AREF.',
        typeLabel: 'Objection',
      };
    }

    return {
      title: 'Argument BAC',
      description: 'Construire un argument bénéfice-avantage-caractéristique.',
      typeLabel: 'Argument BAC',
    };
  }

  return {
    title: tile.title,
    description: tile.description,
    typeLabel: tileTypeLabels[tile.type],
  };
};

const getServicesByColor = () =>
  servicePieces.reduce<Record<ServiceColor, string[]>>(
    (accumulator, piece) => {
      accumulator[piece.color].push(piece.id);
      return accumulator;
    },
    { blue: [], green: [], orange: [] },
  );

const getCompleteSets = (players: Player[]) => {
  const servicesByColor = getServicesByColor();

  return players.reduce<Record<string, ServiceColor[]>>((accumulator, player) => {
    accumulator[player.id] = (Object.keys(servicesByColor) as ServiceColor[]).filter((color) =>
      servicesByColor[color].every((serviceId) => player.pieces.includes(serviceId)),
    );
    return accumulator;
  }, {});
};

const awardClients = (
  players: Player[],
  playerId: string,
  amount: number,
  availableBank: number,
): { players: Player[]; awarded: number } => {
  const awarded = Math.max(0, Math.min(amount, availableBank));

  return {
    players: players.map((player) =>
      player.id === playerId ? { ...player, clients: player.clients + awarded } : player,
    ),
    awarded,
  };
};

const getPlayerInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || '?';

const getReachableTileIds = (originTileId: number, roll: number) => {
  if (roll <= 0) {
    return [];
  }

  let frontier = new Set<number>([originTileId]);

  for (let step = 0; step < roll; step += 1) {
    const nextFrontier = new Set<number>();

    frontier.forEach((tileId) => {
      TILE_GRAPH[tileId]?.forEach((neighborId) => {
        nextFrontier.add(neighborId);
      });
    });

    frontier = nextFrontier;
  }

  frontier.delete(originTileId);

  return [...frontier].sort((left, right) => left - right);
};

const DieFace = ({ value, isRolling }: DieFaceProps) => {
  const safeValue = value && value >= 1 && value <= 6 ? value : null;

  return (
    <div className={`die-face ${isRolling ? 'die-face-rolling' : ''}`} aria-live="polite">
      <div className="die-inner">
        {safeValue ? (
          DIE_PIPS[safeValue].map((pip) => <span key={pip} className={`pip pip-${pip}`} />)
        ) : (
          <span className="die-placeholder">?</span>
        )}
      </div>
      <div className="die-caption">{isRolling ? 'Lancer...' : `Face ${safeValue ?? '-'}`}</div>
    </div>
  );
};

const App = () => {
  const [game, setGame] = useState<GameState>(() => {
    if (typeof window === 'undefined') {
      return createInitialState();
    }

    const savedGame = window.localStorage.getItem(STORAGE_KEY);

    if (!savedGame) {
      return createInitialState();
    }

    try {
      const parsedGame = JSON.parse(savedGame) as Partial<GameState>;
      const parsedObjectionCard = parsedGame.activeObjectionCard;
      const normalizedObjectionCard =
        parsedObjectionCard &&
        typeof parsedObjectionCard === 'object' &&
        'id' in parsedObjectionCard &&
        'title' in parsedObjectionCard &&
        'image' in parsedObjectionCard
          ? (parsedObjectionCard as ObjectionCard)
          : null;

      return {
        ...createInitialState(),
        ...parsedGame,
        players: (parsedGame.players ?? []).map((player) => ({
          ...player,
          rollsTaken: player.rollsTaken ?? 0,
        })) as Player[],
        activeObjectionCard: normalizedObjectionCard,
      };
    } catch {
      return createInitialState();
    }
  });
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [selectedTrainingMode, setSelectedTrainingMode] = useState<TrainingMode | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [saleValue, setSaleValue] = useState<number>(SALE_VALUES[0]);
  const [displayRoll, setDisplayRoll] = useState<number | null>(game.lastRoll);
  const [isRolling, setIsRolling] = useState(false);
  const [inspectedTileId, setInspectedTileId] = useState<number | null>(null);
  const rollIntervalRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  useEffect(() => {
    if (BOARD_REGISTRY_ISSUES.length > 0) {
      console.warn('Board registry issues detected:', BOARD_REGISTRY_ISSUES);
    }
  }, []);

  useEffect(() => {
    if (!isRolling) {
      setDisplayRoll(game.lastRoll);
    }
  }, [game.lastRoll, isRolling]);

  useEffect(
    () => () => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
      }
      if (rollTimeoutRef.current) {
        window.clearTimeout(rollTimeoutRef.current);
      }
    },
    [],
  );

  const currentPlayer = game.players[game.currentPlayerIndex] ?? null;
  const completeSets = useMemo(() => getCompleteSets(game.players), [game.players]);
  const boardFocusTileId =
    inspectedTileId ??
    game.pendingAction?.tile.id ??
    game.pendingMovement?.originTileId ??
    currentPlayer?.position ??
    0;
  const focusTile = board[boardFocusTileId] ?? board[0];
  const focusTilePresentation = getTilePresentation(focusTile, game.trainingMode);
  const focusTileService = getService(focusTile.serviceId);
  const reachableTileIds = game.pendingMovement?.reachableTileIds ?? [];
  const isChoosingDestination = Boolean(game.pendingMovement);

  const startSetup = () => {
    setGame((currentGame) => ({
      ...currentGame,
      phase: 'setup',
      history: ['Configuration des joueurs en cours.'],
    }));
  };

  const resetGame = () => {
    if (rollIntervalRef.current) {
      window.clearInterval(rollIntervalRef.current);
    }
    if (rollTimeoutRef.current) {
      window.clearTimeout(rollTimeoutRef.current);
    }

    setPlayerNames(['', '']);
    setSelectedTrainingMode(null);
    setSelectedPieceId('');
    setSaleValue(SALE_VALUES[0]);
    setDisplayRoll(null);
    setIsRolling(false);
    setInspectedTileId(null);
    setGame(createInitialState());
  };

  const launchGame = () => {
    const names = playerNames.map((name) => name.trim()).filter(Boolean);

    if (names.length < 2) {
      setGame((currentGame) => ({
        ...currentGame,
        history: appendHistoryEntry(currentGame.history, 'Ajoutez au moins 2 joueurs pour démarrer.'),
      }));
      return;
    }

    if (!selectedTrainingMode) {
      setGame((currentGame) => ({
        ...currentGame,
        history: appendHistoryEntry(
          currentGame.history,
          'Choisissez un mode d’entraînement avant de lancer la partie.',
        ),
      }));
      return;
    }

    const players = names.map<Player>((name) => ({
      id: uid(),
      name,
      position: 0,
      clients: INITIAL_CLIENTS,
      pieces: [],
      rollsTaken: 0,
    }));

    setDisplayRoll(null);
    setInspectedTileId(0);
    setGame({
      phase: 'playing',
      players,
      currentPlayerIndex: 0,
      centralBank: INITIAL_BANK,
      history: [`La partie commence. ${players[0].name} ouvre le jeu en mode ${trainingModeLabels[selectedTrainingMode]}.`],
      pendingMovement: null,
      pendingAction: null,
      lastRoll: null,
      winnerId: null,
      trainingMode: selectedTrainingMode,
      activeObjectionCard: null,
    });
  };

  const rollDie = () => {
    if (
      !currentPlayer ||
      game.pendingMovement ||
      game.pendingAction ||
      game.phase === 'finished' ||
      isRolling
    ) {
      return;
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;

    if (rollIntervalRef.current) {
      window.clearInterval(rollIntervalRef.current);
    }
    if (rollTimeoutRef.current) {
      window.clearTimeout(rollTimeoutRef.current);
    }

    setIsRolling(true);
    setDisplayRoll(Math.floor(Math.random() * 6) + 1);

    rollIntervalRef.current = window.setInterval(() => {
      setDisplayRoll(Math.floor(Math.random() * 6) + 1);
    }, 110);

    rollTimeoutRef.current = window.setTimeout(() => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
      }

      const reachableDestinations = getReachableTileIds(currentPlayer.position, finalRoll);

      setDisplayRoll(finalRoll);
      setInspectedTileId(currentPlayer.position);
      setIsRolling(false);
      setGame((currentGame) => ({
        ...currentGame,
        lastRoll: finalRoll,
        pendingMovement: {
          playerId: currentPlayer.id,
          originTileId: currentPlayer.position,
          roll: finalRoll,
          reachableTileIds: reachableDestinations,
        },
        history: appendHistoryEntry(
          currentGame.history,
          `${currentPlayer.name} lance un ${finalRoll}. Choisissez maintenant une case de destination.`,
        ),
      }));
    }, 900);
  };

  const resolveTurn = (state: GameState, players: Player[], centralBank: number, message: string): GameState => {
    const history = appendHistoryEntry(state.history, message);

    if (centralBank <= 0) {
      const winner = [...players].sort((left, right) => right.clients - left.clients)[0] ?? null;
      return {
        ...state,
        players,
        centralBank,
        history,
        pendingMovement: null,
        pendingAction: null,
        phase: 'finished',
        winnerId: winner?.id ?? null,
      };
    }

    return {
      ...state,
      players,
      centralBank,
      history,
      pendingMovement: null,
      pendingAction: null,
      currentPlayerIndex: (state.currentPlayerIndex + 1) % players.length,
    };
  };

  const handleDestinationSelection = (tileId: number) => {
    if (!game.pendingMovement) {
      return;
    }

    setInspectedTileId(tileId);

    setGame((currentGame) => {
      const pendingMovement = currentGame.pendingMovement;
      if (!pendingMovement || !pendingMovement.reachableTileIds.includes(tileId)) {
        return currentGame;
      }

      const player = currentGame.players.find((candidate) => candidate.id === pendingMovement.playerId);
      const tile = board[tileId];
      const tilePresentation = tile ? getTilePresentation(tile, currentGame.trainingMode) : null;

      if (!player || !tile) {
        return { ...currentGame, pendingMovement: null };
      }

      const movedPlayers = currentGame.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, position: tileId, rollsTaken: candidate.rollsTaken + 1 }
          : candidate,
      );
      const triggeredObjectionCard =
        (tile.type === 'bubble' || tile.type === 'objection') && currentGame.trainingMode === 'objections'
          ? drawRandomObjectionCard(currentGame.activeObjectionCard?.id)
          : null;

      if (tile.type === 'market' && player.rollsTaken === 0 && pendingMovement.roll === 1) {
        return resolveTurn(
          {
            ...currentGame,
            players: movedPlayers,
            pendingMovement: null,
            pendingAction: null,
          },
          movedPlayers,
          currentGame.centralBank,
          'Aucune action sur Place du Marché au premier lancer.',
        );
      }

      const destinationMessage = triggeredObjectionCard
        ? `${player.name} choisit ${tilePresentation?.title ?? tile.title} comme destination après un ${pendingMovement.roll}. Carte tirée : « ${triggeredObjectionCard.title} ».`
        : `${player.name} choisit ${tilePresentation?.title ?? tile.title} comme destination après un ${pendingMovement.roll}.`;

      return {
        ...currentGame,
        players: movedPlayers,
        pendingMovement: null,
        pendingAction: {
          tile,
          playerId: player.id,
          roll: pendingMovement.roll,
        },
        activeObjectionCard: currentGame.trainingMode === 'objections' ? triggeredObjectionCard ?? currentGame.activeObjectionCard : null,
        history: appendHistoryEntry(currentGame.history, destinationMessage),
      };
    });
  };

  const handleValidatedAction = () => {
    if (!game.pendingAction) {
      return;
    }

    setGame((currentGame) => {
      const pendingAction = currentGame.pendingAction;
      if (!pendingAction) {
        return currentGame;
      }

      const player = currentGame.players.find((candidate) => candidate.id === pendingAction.playerId);
      if (!player) {
        return { ...currentGame, pendingMovement: null, pendingAction: null };
      }

      let players = currentGame.players;
      let centralBank = currentGame.centralBank;
      const pendingTilePresentation = getTilePresentation(pendingAction.tile, currentGame.trainingMode);
      let message = `${player.name} réussit l'épreuve ${pendingTilePresentation.title}.`;

      if (pendingAction.tile.type === 'chance') {
        const result = awardClients(players, player.id, 2, centralBank);
        players = result.players;
        centralBank -= result.awarded;
        message = `${player.name} gagne ${result.awarded} client${result.awarded > 1 ? 's' : ''} grâce à la case Chance.`;
      }

      if (
        pendingAction.tile.type === 'question' ||
        pendingAction.tile.type === 'bubble' ||
        pendingAction.tile.type === 'objection'
      ) {
        const result = awardClients(players, player.id, 1, centralBank);
        players = result.players;
        centralBank -= result.awarded;
        message = `${player.name} gagne ${result.awarded} client après validation de ${pendingTilePresentation.title}.`;

        if (currentGame.trainingMode) {
          message += ` ${bubbleModeCopy[currentGame.trainingMode].success}`;
        }

        if (pendingAction.tile.color) {
          const sets = getCompleteSets(players);
          const owners = players.filter(
            (candidate) =>
              candidate.id !== player.id && sets[candidate.id]?.includes(pendingAction.tile.color as ServiceColor),
          );

          owners.forEach((owner) => {
            const bonus = awardClients(players, owner.id, 1, centralBank);
            players = bonus.players;
            centralBank -= bonus.awarded;
          });

          if (owners.length > 0) {
            message += ` Bonus enseigne complète pour ${owners.map((owner) => owner.name).join(', ')}.`;
          }
        }
      }

      if (pendingAction.tile.type === 'service' && pendingAction.tile.serviceId) {
        players = players.map((candidate) =>
          candidate.id === player.id && !candidate.pieces.includes(pendingAction.tile.serviceId as string)
            ? { ...candidate, pieces: [...candidate.pieces, pendingAction.tile.serviceId as string] }
            : candidate,
        );
        const service = getService(pendingAction.tile.serviceId);
        message = `${player.name} remporte la pièce ${service?.name ?? 'service'}.`;
      }

      return resolveTurn(currentGame, players, centralBank, message);
    });
  };

  const handleRejectedAction = () => {
    setGame((currentGame) => {
      if (!currentGame.pendingAction) {
        return currentGame;
      }

      const player = currentGame.players.find(
        (candidate) => candidate.id === currentGame.pendingAction?.playerId,
      );
      const pendingTilePresentation = getTilePresentation(
        currentGame.pendingAction.tile,
        currentGame.trainingMode,
      );

      return resolveTurn(
        currentGame,
        currentGame.players,
        currentGame.centralBank,
        `${player?.name ?? 'Le joueur'} ne valide pas la case ${pendingTilePresentation.title}.`,
      );
    });
  };

  const handleMarketSale = () => {
    setGame((currentGame) => {
      const player = currentGame.players[currentGame.currentPlayerIndex];
      if (!currentGame.pendingAction || !player || !selectedPieceId) {
        return currentGame;
      }

      if (!player.pieces.includes(selectedPieceId)) {
        return {
          ...currentGame,
          history: appendHistoryEntry(
            currentGame.history,
            'Sélectionnez une pièce réellement possédée par le joueur actif.',
          ),
        };
      }

      const awarded = Math.min(saleValue, currentGame.centralBank);
      const players = currentGame.players.map((candidate) =>
        candidate.id === player.id
          ? {
              ...candidate,
              pieces: candidate.pieces.filter((pieceId) => pieceId !== selectedPieceId),
              clients: candidate.clients + awarded,
            }
          : candidate,
      );

      const message = `${player.name} vend ${getService(selectedPieceId)?.name ?? 'une pièce'} pour ${awarded} clients.`;
      setSelectedPieceId('');
      return resolveTurn(currentGame, players, currentGame.centralBank - awarded, message);
    });
  };

  const drawObjectionCard = () => {
    setGame((currentGame) => {
      if (currentGame.trainingMode !== 'objections') {
        return currentGame;
      }

      const card = drawRandomObjectionCard(currentGame.activeObjectionCard?.id);

      if (!card) {
        return currentGame;
      }

      return {
        ...currentGame,
        activeObjectionCard: card,
        history: appendHistoryEntry(currentGame.history, `Nouvelle carte Objection tirée : « ${card.title} »`),
      };
    });
  };

  const pendingActionTilePresentation = game.pendingAction
    ? getTilePresentation(game.pendingAction.tile, game.trainingMode)
    : null;
  const canInspectObjectionCard = Boolean(game.activeObjectionCard);
  const winner = game.players.find((player) => player.id === game.winnerId) ?? null;
  const boardTiles = board.map((tile) => {
    const shape = tile.shape;
    const occupants = game.players.filter((player) => player.position === tile.id);
    const service = getService(tile.serviceId);
    const tilePresentation = getTilePresentation(tile, game.trainingMode);
    const tileLabel = tile.type === 'service' && service ? service.name : tilePresentation.title;
    const isFocused = tile.id === boardFocusTileId;
    const isSelectedTile = tile.id === game.pendingAction?.tile.id;
    const isCurrentPlayerTile = tile.id === currentPlayer?.position;
    const isReachable = reachableTileIds.includes(tile.id);
    const isDisabled = isChoosingDestination && !isReachable;
    const visualPoints = insetPolygonPoints(shape.points, isReachable ? 1.1 : 0.95);
    const outlinePoints = insetPolygonPoints(shape.points, 0.5);
    const hitPoints = insetPolygonPoints(shape.points, 0.85);

    return {
      tile,
      shape,
      occupants,
      service,
      tilePresentation,
      tileLabel,
      isFocused,
      isSelectedTile,
      isCurrentPlayerTile,
      isReachable,
      isDisabled,
      visualPoints,
      outlinePoints,
      hitPoints,
    };
  });

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Plateau interactif · React + TypeScript + Vite</p>
          <h1>Monopoly des Services</h1>
          <p className="hero-copy">
            Une version digitale recentrée sur le tapis de jeu d’origine&nbsp;: le plateau devient la
            surface principale, la géométrie des cases colle au nouveau visuel à bordures épaisses et les pions se repèrent immédiatement sur les espaces jouables.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={game.phase === 'welcome' ? startSetup : resetGame}>
            {game.phase === 'welcome' ? 'Commencer' : 'Réinitialiser'}
          </button>
          {game.phase !== 'welcome' && (
            <button className="secondary-button" onClick={resetGame}>
              Nouvelle partie
            </button>
          )}
        </div>
      </header>

      {game.phase === 'setup' && (
        <section className="panel intro-panel">
          <div className="panel-header">
            <div>
              <h2>Paramétrage des joueurs</h2>
              <p>Ajoutez de 2 à 4 joueurs. Chaque joueur démarre avec 2 clients.</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => setPlayerNames((current) => [...current, ''])}
              disabled={playerNames.length >= 4}
            >
              Ajouter un joueur
            </button>
          </div>
          <div className="setup-grid">
            {playerNames.map((name, index) => (
              <label className="field" key={`player-${index}`}>
                <span>Joueur {index + 1}</span>
                <input
                  value={name}
                  onChange={(event) => {
                    const nextNames = [...playerNames];
                    nextNames[index] = event.target.value;
                    setPlayerNames(nextNames);
                  }}
                  placeholder={`Nom du joueur ${index + 1}`}
                />
              </label>
            ))}
          </div>

          <fieldset className="mode-selector">
            <legend>Mode d’entraînement obligatoire</legend>
            <p className="mode-selector-copy">
              Ce choix pilote les cases BD / bulles du plateau pendant toute la partie.
            </p>
            <div className="mode-options">
              {(Object.keys(trainingModeLabels) as TrainingMode[]).map((mode) => (
                <label
                  key={mode}
                  className={`mode-option ${selectedTrainingMode === mode ? 'mode-option-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="training-mode"
                    value={mode}
                    checked={selectedTrainingMode === mode}
                    onChange={() => setSelectedTrainingMode(mode)}
                  />
                  <span className="mode-option-body">
                    <strong>{trainingModeLabels[mode]}</strong>
                    <span>{bubbleModeCopy[mode].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="primary-button" onClick={launchGame}>
            Lancer la partie
          </button>
        </section>
      )}

      {(game.phase === 'playing' || game.phase === 'finished') && (
        <main className="game-layout">
          <section className="board-stage panel">
            <div className="board-header">
              <div>
                <p className="eyebrow">Plateau principal</p>
                <h2>Le tapis de jeu</h2>
                {game.trainingMode && (
                  <p className="board-mode-copy">Mode actif : {trainingModeLabels[game.trainingMode]}</p>
                )}
              </div>
              <div className="board-header-status">
                <div className={`status-chip ${BOARD_REGISTRY_ISSUES.length > 0 ? 'status-chip-warning' : ''}`}>
                  {BOARD_REGISTRY_ISSUES.length > 0
                    ? `${BOARD_REGISTRY_ISSUES.length} alerte(s) registre`
                    : `${board.length} cases jouables`}
                </div>
                {game.trainingMode && (
                  <div className="status-chip status-chip-mode">{trainingModeLabels[game.trainingMode]}</div>
                )}
                <div className="board-bank">Banque centrale : {game.centralBank} clients</div>
              </div>
            </div>

            <div className={`board-stage-layout ${game.trainingMode === 'objections' ? 'board-stage-layout-objections' : ''}`}>
              {game.trainingMode === 'objections' && (
                <section className="deck-sidecar deck-panel">
                  <div className="deck-sidecar-header">
                    <div>
                      <p className="eyebrow">Pioche</p>
                      <h3>Deck Objections</h3>
                    </div>
                    <button className="secondary-button" onClick={drawObjectionCard}>
                      {canInspectObjectionCard ? 'Changer la carte' : 'Préparer une carte'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="objections-deck-pile objections-deck-pile-large"
                    onClick={drawObjectionCard}
                    aria-label="Piocher une carte Objection"
                  >
                    <span className="objections-deck-shadow objections-deck-shadow-back" aria-hidden="true" />
                    <span className="objections-deck-shadow objections-deck-shadow-mid" aria-hidden="true" />
                    <span className="objections-deck-top-card">
                      <img src={objectionsDeckFaceImage} alt="Dos du deck Objections" />
                    </span>
                  </button>
                  <div className="deck-card objections-deck-copy">
                    <p className="deck-card-label">Pile active</p>
                    <strong>{game.activeObjectionCard?.title ?? 'Aucune carte révélée'}</strong>
                    <p>
                      La pioche reste dans la zone libre à gauche du plateau et la carte de défi s’ouvre lors d’une case Objection.
                    </p>
                    {game.activeObjectionCard && (
                      <button className="secondary-button objections-view-button" onClick={drawObjectionCard}>
                        Tirer une autre carte
                      </button>
                    )}
                  </div>
                </section>
              )}

              <div className="board-frame">
                <div className="board-surface">
                  <img src={boardReferenceImage} alt="Plateau Monopoly des Services" className="board-base-image" />
                  <div className="board-image-shade" />

                  <div className="board-token-layer" aria-hidden="true">
                    {boardTiles.map(({ tile, shape, occupants }) =>
                      occupants.map((player, occupantIndex) => {
                        const playerIndex = game.players.findIndex((entry) => entry.id === player.id);
                        const offset = getTokenOffset(occupantIndex);

                        return (
                          <span
                            className="player-token board-player-token"
                            key={`${tile.id}-${player.id}`}
                            style={{
                              background: PLAYER_TOKEN_COLORS[playerIndex % PLAYER_TOKEN_COLORS.length],
                              left: `${shape.tokenAnchor.x}%`,
                              top: `${shape.tokenAnchor.y}%`,
                              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                              zIndex: 5 + occupantIndex,
                            }}
                            title={player.name}
                          >
                            {getPlayerInitials(player.name)}
                          </span>
                        );
                      }),
                    )}
                  </div>

                  <svg
                    className="board-overlay-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-label="Cases du plateau"
                  >
                    {boardTiles.map(
                      ({
                        tile,
                        isCurrentPlayerTile,
                        isDisabled,
                        isFocused,
                        isReachable,
                        isSelectedTile,
                        hitPoints,
                        outlinePoints,
                        tileLabel,
                        tilePresentation,
                        visualPoints,
                      }) => {
                        const interactiveTitle = `${tileLabel} · ${tilePresentation.description}`;
                        const canSelectDestination = isChoosingDestination && isReachable;

                        return (
                          <g
                            key={tile.id}
                            className={`board-space-group tile-${tile.type} tile-color-${tile.color ?? 'neutral'} ${
                              isFocused ? 'board-space-focused' : ''
                            } ${isSelectedTile ? 'board-space-selected' : ''} ${
                              isCurrentPlayerTile ? 'board-space-current' : ''
                            } ${isReachable ? 'board-space-reachable' : ''} ${
                              isDisabled ? 'board-space-disabled' : ''
                            }`}
                          >
                            <polygon className="board-space-shape" points={visualPoints} />
                            <polygon className="board-space-outline" points={outlinePoints} />
                            <polygon
                              className="board-space-hit"
                              points={hitPoints}
                              role="button"
                              tabIndex={isDisabled ? -1 : 0}
                              aria-disabled={isDisabled}
                              aria-label={`${tileLabel}. ${
                                canSelectDestination ? 'Destination atteignable.' : tilePresentation.description
                              }`}
                              onClick={() =>
                                isChoosingDestination ? handleDestinationSelection(tile.id) : setInspectedTileId(tile.id)
                              }
                              onKeyDown={(event) => {
                                if (isDisabled) {
                                  return;
                                }

                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  if (isChoosingDestination) {
                                    handleDestinationSelection(tile.id);
                                  } else {
                                    setInspectedTileId(tile.id);
                                  }
                                }
                              }}
                            >
                              <title>{interactiveTitle}</title>
                            </polygon>
                          </g>
                        );
                      },
                    )}
                  </svg>

                  <aside className="board-focus-card" aria-live="polite">
                    <p className="eyebrow board-focus-eyebrow">Lecture du plateau</p>
                    <div className="board-focus-main">
                      <div className="board-focus-copy">
                        <h3>{focusTileService?.name ?? focusTilePresentation.title}</h3>
                        <p>{focusTilePresentation.description}</p>
                      </div>
                      <div className="board-focus-meta">
                        <span className="status-chip">{focusTilePresentation.typeLabel}</span>
                        {focusTile.color && <span className="tile-family">Famille {colorLabels[focusTile.color]}</span>}
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          <aside className="info-rail">
            <section className="panel turn-panel">
              <div className="turn-header">
                <div>
                  <p className="eyebrow">Tour actuel</p>
                  <h2>{currentPlayer ? currentPlayer.name : 'En attente'}</h2>
                  <p>
                    {isChoosingDestination
                      ? 'Choisissez votre case de destination.'
                      : currentPlayer
                        ? 'Lancez le dé puis sélectionnez une case atteignable sur le plateau.'
                        : 'Configurez une partie pour commencer.'}
                  </p>
                  {game.trainingMode && <p>Mode : {trainingModeLabels[game.trainingMode]}</p>}
                </div>
                <DieFace value={displayRoll} isRolling={isRolling} />
              </div>
              <div className="turn-actions">
                <button
                  className="primary-button"
                  onClick={rollDie}
                  disabled={
                    Boolean(game.pendingMovement) ||
                    Boolean(game.pendingAction) ||
                    game.phase === 'finished' ||
                    isRolling
                  }
                >
                  {isRolling ? 'Le dé roule...' : 'Lancer le dé'}
                </button>
                <div className="status-chip">Dernier résultat : {game.lastRoll ?? '-'}</div>
                {game.pendingMovement && (
                  <div className="turn-helper">
                    <strong>Choisissez votre case de destination</strong>
                    <span>
                      Départ : case {game.pendingMovement.originTileId} · {game.pendingMovement.roll} déplacement
                      {game.pendingMovement.roll > 1 ? 's' : ''} possible
                      {game.pendingMovement.roll > 1 ? 's' : ''}.
                    </span>
                  </div>
                )}
                {game.pendingAction && (
                  <div className="turn-helper">
                    <strong>
                      Destination choisie :{' '}
                      {pendingActionTilePresentation?.title ?? game.pendingAction.tile.title}
                    </strong>
                    <span>Validez maintenant l’action de la case pour terminer le tour.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="panel score-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="eyebrow">Scores</p>
                  <h2>Joueurs & pions</h2>
                </div>
              </div>
              <div className="score-list">
                {game.players.map((player, index) => (
                  <article className="score-card" key={player.id}>
                    <div className="score-title-row">
                      <span
                        className="player-badge"
                        style={{ background: PLAYER_TOKEN_COLORS[index % PLAYER_TOKEN_COLORS.length] }}
                      >
                        {getPlayerInitials(player.name)}
                      </span>
                      <div>
                        <h3>{player.name}</h3>
                        <p>Case {player.position}</p>
                      </div>
                    </div>
                    <div className="score-stats">
                      <strong>{player.clients} clients</strong>
                      <span>{player.pieces.length} pièce(s)</span>
                      <span>Premier lancer : {player.rollsTaken === 0 ? 'pas encore joué' : 'effectué'}</span>
                      <span>
                        Enseignes :{' '}
                        {completeSets[player.id]?.length
                          ? completeSets[player.id].map((color) => colorLabels[color]).join(', ')
                          : 'Aucune'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel reserve-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="eyebrow">Réserve</p>
                  <h2>Pièces service</h2>
                </div>
              </div>
              <div className="service-list">
                {servicePieces.map((piece) => (
                  <article className={`service-card service-${piece.color}`} key={piece.id}>
                    <div className="service-card-head">
                      <h3>{piece.name}</h3>
                      <span className="tile-family">{colorLabels[piece.color]}</span>
                    </div>
                    <p>{piece.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel history-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="eyebrow">Partie</p>
                  <h2>Historique</h2>
                </div>
              </div>
              <ul>
                {game.history.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          </aside>
        </main>
      )}

      {game.pendingAction && (
        <div className="modal-backdrop">
          <section className="modal-card">
            <p className="eyebrow">Résolution de case</p>
            <h2>{pendingActionTilePresentation?.title ?? game.pendingAction.tile.title}</h2>
            <p>{pendingActionTilePresentation?.description ?? game.pendingAction.tile.description}</p>

            {game.pendingAction.tile.type === 'market' && currentPlayer && (
              <div className="market-box">
                {currentPlayer.pieces.length === 0 && (
                  <p className="market-message">
                    Aucun échange automatique possible : {currentPlayer.name} ne possède encore aucune pièce à vendre.
                  </p>
                )}
                {game.centralBank === 0 && (
                  <p className="market-message">
                    La banque centrale ne peut plus racheter de pièce : aucun client disponible.
                  </p>
                )}
                <label className="field">
                  <span>Pièce à vendre</span>
                  <select value={selectedPieceId} onChange={(event) => setSelectedPieceId(event.target.value)}>
                    <option value="">Choisir une pièce</option>
                    {currentPlayer.pieces.map((pieceId) => (
                      <option key={pieceId} value={pieceId}>
                        {getService(pieceId)?.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Valeur de vente</span>
                  <select value={saleValue} onChange={(event) => setSaleValue(Number(event.target.value))}>
                    {SALE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {value} clients
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  L’échange entre joueurs reste animé oralement. La vente à la banque est suivie
                  automatiquement ici.
                </p>
                <div className="modal-actions">
                  <button
                    className="primary-button"
                    onClick={handleMarketSale}
                    disabled={currentPlayer.pieces.length === 0 || game.centralBank === 0}
                  >
                    Vendre à la banque
                  </button>
                  <button className="secondary-button" onClick={handleRejectedAction}>
                    Passer le tour
                  </button>
                </div>
              </div>
            )}

            {(game.pendingAction.tile.type === 'bubble' || game.pendingAction.tile.type === 'objection') &&
              game.trainingMode === 'objections' && (
              <div className="deck-card modal-deck-card objection-viewer">
                <div className="deck-card-header">
                  <div>
                    <p className="deck-card-label">Carte Objection tirée</p>
                    <strong>{game.activeObjectionCard?.title ?? 'Carte en attente'}</strong>
                  </div>
                  <button className="secondary-button" onClick={drawObjectionCard}>
                    Changer la carte
                  </button>
                </div>
                <p>Utilisez la carte réelle ci-dessous pour mener le challenge et valider la réponse.</p>
                {game.activeObjectionCard ? (
                  <figure className="objection-card-viewer">
                    <img
                      src={game.activeObjectionCard.image}
                      alt={`Carte objection : ${game.activeObjectionCard.title}`}
                      className="objection-card-image"
                    />
                    <figcaption>{game.activeObjectionCard.prompt}</figcaption>
                  </figure>
                ) : (
                  <p className="market-message">Aucune carte disponible. Relancez une pioche pour continuer.</p>
                )}
              </div>
            )}

            {game.pendingAction.tile.type !== 'market' && (
              <div className="modal-actions">
                <button className="primary-button" onClick={handleValidatedAction}>
                  Réponse validée
                </button>
                <button className="secondary-button" onClick={handleRejectedAction}>
                  Réponse refusée
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {game.phase === 'finished' && (
        <div className="modal-backdrop">
          <section className="modal-card">
            <p className="eyebrow">Fin de partie</p>
            <h2>{winner ? `${winner.name} remporte la partie !` : 'Partie terminée'}</h2>
            <p>
              La banque de clients est vide. Comparez les scores puis relancez une nouvelle partie si
              vous voulez refaire un coup bonus manuellement.
            </p>
            <button className="primary-button" onClick={resetGame}>
              Rejouer
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default App;
