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
  | 'story'
  | 'market'
  | 'pitch'
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
  title: string;
  type: TileType;
  color?: ServiceColor;
  description: string;
  serviceId?: string;
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
  left: number;
  top: number;
  width: number;
  height: number;
  polygon: string;
  tokenAnchor: {
    x: number;
    y: number;
  };
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

const TILE_SHAPES: Record<number, TileShapeDefinition> = {
  0: {
    left: 41.5,
    top: 40.1,
    width: 17.1,
    height: 18.9,
    polygon: 'polygon(17% 14%, 50% 4%, 82% 15%, 97% 50%, 82% 85%, 50% 96%, 17% 85%, 3% 50%)',
    tokenAnchor: { x: 50.0, y: 49.4 },
  },
  1: {
    left: 43.2,
    top: 16.2,
    width: 13.2,
    height: 21.6,
    polygon: 'polygon(48% 2%, 83% 12%, 78% 97%, 22% 97%, 17% 12%)',
    tokenAnchor: { x: 49.8, y: 27.2 },
  },
  2: {
    left: 39.7,
    top: 0.5,
    width: 20.1,
    height: 16.1,
    polygon: 'polygon(14% 98%, 2% 28%, 23% 2%, 77% 2%, 98% 28%, 86% 98%)',
    tokenAnchor: { x: 49.8, y: 8.9 },
  },
  3: {
    left: 78.3,
    top: 18.4,
    width: 17.2,
    height: 28.9,
    polygon: 'polygon(2% 16%, 36% 2%, 97% 9%, 90% 83%, 48% 98%, 2% 84%)',
    tokenAnchor: { x: 87.9, y: 33.6 },
  },
  4: {
    left: 58.6,
    top: 35.9,
    width: 15.6,
    height: 16.3,
    polygon: 'polygon(3% 16%, 57% 2%, 97% 19%, 97% 81%, 44% 98%, 3% 80%)',
    tokenAnchor: { x: 66.2, y: 43.9 },
  },
  5: {
    left: 68.8,
    top: 56.3,
    width: 17.8,
    height: 23.4,
    polygon: 'polygon(3% 11%, 56% 2%, 97% 19%, 86% 97%, 30% 91%, 3% 73%)',
    tokenAnchor: { x: 77.0, y: 68.1 },
  },
  6: {
    left: 44.2,
    top: 60.5,
    width: 12.8,
    height: 22.6,
    polygon: 'polygon(20% 2%, 80% 2%, 86% 83%, 50% 98%, 14% 83%)',
    tokenAnchor: { x: 50.2, y: 71.4 },
  },
  7: {
    left: 39.8,
    top: 82.4,
    width: 21.0,
    height: 17.2,
    polygon: 'polygon(13% 2%, 87% 2%, 98% 68%, 77% 98%, 23% 98%, 2% 68%)',
    tokenAnchor: { x: 49.8, y: 90.8 },
  },
  8: {
    left: 12.7,
    top: 55.2,
    width: 17.9,
    height: 24.5,
    polygon: 'polygon(45% 2%, 98% 12%, 98% 74%, 68% 91%, 13% 98%, 2% 18%)',
    tokenAnchor: { x: 22.1, y: 68.0 },
  },
  9: {
    left: 26.2,
    top: 35.6,
    width: 15.0,
    height: 16.7,
    polygon: 'polygon(43% 2%, 98% 18%, 98% 81%, 56% 98%, 2% 79%, 2% 21%)',
    tokenAnchor: { x: 33.7, y: 44.0 },
  },
  10: {
    left: 12.2,
    top: 18.0,
    width: 17.7,
    height: 29.1,
    polygon: 'polygon(51% 2%, 98% 16%, 98% 81%, 61% 98%, 2% 83%, 9% 10%)',
    tokenAnchor: { x: 21.8, y: 33.1 },
  },
  11: {
    left: 28.8,
    top: 1.8,
    width: 10.7,
    height: 9.3,
    polygon: 'polygon(20% 98%, 2% 42%, 43% 2%, 98% 18%, 81% 98%)',
    tokenAnchor: { x: 34.0, y: 6.0 },
  },
  12: {
    left: 84.9,
    top: 51.7,
    width: 10.9,
    height: 9.5,
    polygon: 'polygon(2% 19%, 57% 2%, 98% 55%, 80% 98%, 19% 86%)',
    tokenAnchor: { x: 90.4, y: 56.4 },
  },
};

const TILE_GRAPH: Record<number, number[]> = {
  0: [1, 4, 6, 9],
  1: [0, 2, 3, 11],
  2: [1],
  3: [1, 4],
  4: [0, 3, 5, 12],
  5: [4],
  6: [0, 7, 8, 12],
  7: [6],
  8: [6, 9],
  9: [0, 8, 10, 11],
  10: [9],
  11: [1, 9],
  12: [4, 6],
};

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

const board: Tile[] = [
  { id: 0, title: 'Départ', type: 'start', description: 'Point de départ de tous les joueurs.' },
  { id: 1, title: 'Chance', type: 'chance', description: 'Bonne réponse = +2 clients.' },
  {
    id: 2,
    title: 'Service EDF',
    type: 'service',
    color: 'blue',
    serviceId: 'assistance-depannage',
    description: 'Donner 2 avantages pour remporter la pièce.',
  },
  {
    id: 3,
    title: 'Case ?',
    type: 'question',
    color: 'blue',
    description: 'Poser une question ouverte adaptée à une offre du groupe.',
  },
  {
    id: 4,
    title: 'Service EDF',
    type: 'service',
    color: 'blue',
    serviceId: 'protection-facture',
    description: 'Donner 2 avantages pour remporter la pièce.',
  },
  {
    id: 5,
    title: 'Histoire',
    type: 'story',
    color: 'green',
    description: 'Raconter une situation d’usage convaincante.',
  },
  {
    id: 6,
    title: 'Service EDF',
    type: 'service',
    color: 'green',
    serviceId: 'izi-by-edf',
    description: 'Donner 2 avantages pour remporter la pièce.',
  },
  {
    id: 7,
    title: 'Objection',
    type: 'objection',
    color: 'green',
    description: 'Répondre à une objection avec la méthode AREF.',
  },
  {
    id: 8,
    title: 'Service EDF',
    type: 'service',
    color: 'green',
    serviceId: 'thermostat-connecte-sowee',
    description: 'Donner 2 avantages pour remporter la pièce.',
  },
  {
    id: 9,
    title: 'Place du Marché',
    type: 'market',
    description: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  },
  {
    id: 10,
    title: 'Service EDF',
    type: 'service',
    color: 'orange',
    serviceId: 'izi-confort',
    description: 'Donner 2 avantages pour remporter la pièce.',
  },
  {
    id: 11,
    title: 'Argument BAC',
    type: 'pitch',
    color: 'orange',
    description: 'Construire un argument bénéfice-avantage-caractéristique.',
  },
  {
    id: 12,
    title: 'Service EDF',
    type: 'service',
    color: 'orange',
    serviceId: 'homiris',
    description: 'Donner 2 avantages pour remporter la pièce.',
  },
];

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
  story: 'Histoire',
  market: 'Place du Marché',
  pitch: 'Argument BAC',
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

const parsePolygonPoints = (polygon: string) =>
  polygon
    .replace(/^polygon\(/, '')
    .replace(/\)$/, '')
    .split(',')
    .map((point) => point.trim())
    .filter(Boolean)
    .map((point) => {
      const [x, y] = point.split(/\s+/);
      return {
        x: Number.parseFloat(x.replace('%', '')),
        y: Number.parseFloat(y.replace('%', '')),
      };
    });

const toSvgPolygonPoints = ({ left, top, width, height, polygon }: TileShapeDefinition) =>
  parsePolygonPoints(polygon)
    .map(({ x, y }) => `${left + (width * x) / 100},${top + (height * y) / 100}`)
    .join(' ');

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
  if (tile.type === 'objection') {
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
        tile.type === 'objection' && currentGame.trainingMode === 'objections'
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
        pendingAction.tile.type === 'story' ||
        pendingAction.tile.type === 'pitch' ||
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
    const shape = TILE_SHAPES[tile.id];
    const occupants = game.players.filter((player) => player.position === tile.id);
    const service = getService(tile.serviceId);
    const tilePresentation = getTilePresentation(tile, game.trainingMode);
    const tileLabel = tile.type === 'service' && service ? service.name : tilePresentation.title;
    const isFocused = tile.id === boardFocusTileId;
    const isSelectedTile = tile.id === game.pendingAction?.tile.id;
    const isCurrentPlayerTile = tile.id === currentPlayer?.position;
    const isReachable = reachableTileIds.includes(tile.id);
    const isDisabled = isChoosingDestination && !isReachable;

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
      svgPoints: toSvgPolygonPoints(shape),
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
                        svgPoints,
                        tileLabel,
                        tilePresentation,
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
                            <polygon className="board-space-shape" points={svgPoints} />
                            <polygon className="board-space-outline" points={svgPoints} />
                            <polygon
                              className="board-space-hit"
                              points={svgPoints}
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

            {game.pendingAction.tile.type === 'objection' && game.trainingMode === 'objections' && (
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
