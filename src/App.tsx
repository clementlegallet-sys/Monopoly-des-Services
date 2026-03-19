import { useEffect, useMemo, useRef, useState } from 'react';
import boardReferenceImage from '../PLATEAU DE JEU .png';
import plancheAImage from '../PLANCHE A 1.2.png';
import plancheBImage from '../PLANCHE B 1.2.png';
import objectionBubbleImage from '../CARTES OBJECTIONS FACE.png';
import bacBubbleImage from '../PLANCHE B 2.2.png';

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
};

type DieFaceProps = {
  value: number | null;
  isRolling: boolean;
};

type TileOverlay = {
  left: number;
  top: number;
  width: number;
  height: number;
  clipPath: string;
};

type BubbleTileVisual = {
  image: string;
  alt: string;
  label: string;
};

const STORAGE_KEY = 'monopoly-des-services-state';
const INITIAL_CLIENTS = 2;
const INITIAL_BANK = 40;
const SALE_VALUES = [2, 3, 5] as const;
const PLAYER_TOKEN_COLORS = ['#d9473f', '#2b6fdd', '#f59e0b', '#0f9d74'];

const TILE_OVERLAYS: Record<number, TileOverlay> = {
  0: {
    left: 40.6,
    top: 39.2,
    width: 18.8,
    height: 20.6,
    clipPath: 'polygon(17% 14%, 50% 0%, 83% 14%, 100% 50%, 83% 87%, 50% 100%, 17% 87%, 0% 50%)',
  },
  1: {
    left: 43.3,
    top: 16.8,
    width: 13.4,
    height: 21.4,
    clipPath: 'polygon(50% 0%, 89% 12%, 82% 100%, 18% 100%, 11% 12%)',
  },
  2: {
    left: 39.6,
    top: 0.6,
    width: 20.7,
    height: 16.2,
    clipPath: 'polygon(14% 100%, 0% 30%, 24% 0%, 76% 0%, 100% 30%, 86% 100%)',
  },
  3: {
    left: 78.3,
    top: 18.6,
    width: 17.4,
    height: 29.8,
    clipPath: 'polygon(0% 18%, 39% 0%, 100% 8%, 92% 84%, 49% 100%, 0% 84%)',
  },
  4: {
    left: 58.4,
    top: 35,
    width: 15.2,
    height: 16.9,
    clipPath: 'polygon(0% 17%, 57% 0%, 100% 20%, 100% 82%, 44% 100%, 0% 80%)',
  },
  5: {
    left: 68.3,
    top: 55,
    width: 18.6,
    height: 24.8,
    clipPath: 'polygon(0% 11%, 56% 0%, 100% 18%, 88% 100%, 29% 93%, 0% 74%)',
  },
  6: {
    left: 43.4,
    top: 60.4,
    width: 13.2,
    height: 22,
    clipPath: 'polygon(18% 0%, 82% 0%, 89% 86%, 50% 100%, 11% 86%)',
  },
  7: {
    left: 39.6,
    top: 82.8,
    width: 20.8,
    height: 16.8,
    clipPath: 'polygon(14% 0%, 86% 0%, 100% 70%, 76% 100%, 24% 100%, 0% 70%)',
  },
  8: {
    left: 12.8,
    top: 55,
    width: 18.9,
    height: 24.8,
    clipPath: 'polygon(44% 0%, 100% 12%, 100% 76%, 70% 93%, 12% 100%, 0% 18%)',
  },
  9: {
    left: 26.7,
    top: 35,
    width: 15.1,
    height: 16.9,
    clipPath: 'polygon(43% 0%, 100% 18%, 100% 82%, 56% 100%, 0% 80%, 0% 20%)',
  },
  10: {
    left: 13,
    top: 18.2,
    width: 18.7,
    height: 29.8,
    clipPath: 'polygon(51% 0%, 100% 16%, 100% 82%, 61% 100%, 0% 84%, 8% 8%)',
  },
  11: {
    left: 29.1,
    top: 1.6,
    width: 10.8,
    height: 8.8,
    clipPath: 'polygon(21% 100%, 0% 44%, 44% 0%, 100% 16%, 80% 100%)',
  },
  12: {
    left: 85.1,
    top: 52,
    width: 10.8,
    height: 8.8,
    clipPath: 'polygon(0% 18%, 56% 0%, 100% 55%, 79% 100%, 19% 87%)',
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

const bubbleTileVisuals: Record<TrainingMode, BubbleTileVisual> = {
  arguments: {
    image: bacBubbleImage,
    alt: 'Logo Argument de vente BAC',
    label: 'ARGUMENT DE VENTE (BAC)',
  },
  objections: {
    image: objectionBubbleImage,
    alt: 'Logo Objection',
    label: 'OBJECTION',
  },
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
});

const uid = () => Math.random().toString(36).slice(2, 10);

const getService = (serviceId?: string) =>
  servicePieces.find((piece) => piece.id === serviceId) ?? null;

const appendHistoryEntry = (history: string[], message: string) => [message, ...history].slice(0, 12);

const isSpeechBubbleTile = (tile: Tile) =>
  tile.type === 'question' || tile.type === 'story' || tile.type === 'pitch' || tile.type === 'objection';

const getTilePresentation = (tile: Tile, trainingMode: TrainingMode | null) => {
  if (!trainingMode || !isSpeechBubbleTile(tile)) {
    return tile;
  }

  const modeCopy = bubbleModeCopy[trainingMode];

  return {
    ...tile,
    title: modeCopy.label,
    description: modeCopy.description,
  };
};

const getBubbleTileVisual = (trainingMode: TrainingMode | null) =>
  trainingMode ? bubbleTileVisuals[trainingMode] : null;

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
  const destinations = new Set<number>();

  const traverse = (tileId: number, stepsLeft: number, visited: Set<number>) => {
    if (stepsLeft === 0) {
      if (tileId !== originTileId) {
        destinations.add(tileId);
      }
      return;
    }

    TILE_GRAPH[tileId]?.forEach((neighborId) => {
      if (visited.has(neighborId)) {
        return;
      }

      visited.add(neighborId);
      traverse(neighborId, stepsLeft - 1, visited);
      visited.delete(neighborId);
    });
  };

  traverse(originTileId, roll, new Set([originTileId]));

  return [...destinations].sort((left, right) => left - right);
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
      return {
        ...createInitialState(),
        ...parsedGame,
        players: (parsedGame.players ?? []).map((player) => ({
          ...player,
          rollsTaken: player.rollsTaken ?? 0,
        })) as Player[],
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
  const activeTrainingMode = game.trainingMode ?? selectedTrainingMode;
  const boardFocusTileId =
    inspectedTileId ??
    game.pendingAction?.tile.id ??
    game.pendingMovement?.originTileId ??
    currentPlayer?.position ??
    0;
  const focusTile = getTilePresentation(board[boardFocusTileId] ?? board[0], activeTrainingMode);
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
      const presentedTile = tile ? getTilePresentation(tile, currentGame.trainingMode) : null;

      if (!player || !tile || !presentedTile) {
        return { ...currentGame, pendingMovement: null };
      }

      const movedPlayers = currentGame.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, position: tileId, rollsTaken: candidate.rollsTaken + 1 }
          : candidate,
      );

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

      return {
        ...currentGame,
        players: movedPlayers,
        pendingMovement: null,
        pendingAction: {
          tile: presentedTile,
          playerId: player.id,
          roll: pendingMovement.roll,
        },
        history: appendHistoryEntry(
          currentGame.history,
          `${player.name} choisit ${presentedTile.title} comme destination après un ${pendingMovement.roll}.`,
        ),
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
      let message = `${player.name} réussit l'épreuve ${pendingAction.tile.title}.`;

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
        message = `${player.name} gagne ${result.awarded} client après validation de ${pendingAction.tile.title}.`;

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

      return resolveTurn(
        currentGame,
        currentGame.players,
        currentGame.centralBank,
        `${player?.name ?? 'Le joueur'} ne valide pas la case ${currentGame.pendingAction.tile.title}.`,
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

  const winner = game.players.find((player) => player.id === game.winnerId) ?? null;

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Plateau interactif · React + TypeScript + Vite</p>
          <h1>Monopoly des Services</h1>
          <p className="hero-copy">
            Une version digitale recentrée sur le tapis de jeu d’origine&nbsp;: le plateau devient la
            surface principale, les zones restent collées au visuel et les pions se repèrent
            immédiatement sur les cases.
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

            <div className="board-frame">
              <div className="board-surface">
                <img src={boardReferenceImage} alt="Plateau Monopoly des Services" className="board-base-image" />
                <div className="board-image-shade" />

                <div className="board-overlays" aria-label="Cases du plateau">
                  {board.map((tile) => {
                    const overlay = TILE_OVERLAYS[tile.id];
                    const presentedTile = getTilePresentation(tile, game.trainingMode);
                    const occupants = game.players.filter((player) => player.position === tile.id);
                    const service = getService(tile.serviceId);
                    const tileLabel = tile.type === 'service' && service ? service.name : presentedTile.title;
                    const bubbleVisual = isSpeechBubbleTile(tile) ? getBubbleTileVisual(game.trainingMode) : null;
                    const isFocused = tile.id === boardFocusTileId;
                    const isSelectedTile = tile.id === game.pendingAction?.tile.id;
                    const isCurrentPlayerTile = tile.id === currentPlayer?.position;
                    const isReachable = reachableTileIds.includes(tile.id);
                    const isDisabled = isChoosingDestination && !isReachable;

                    return (
                      <button
                        type="button"
                        className={`board-zone tile-${tile.type} tile-color-${tile.color ?? 'neutral'} ${
                          isFocused ? 'board-zone-focused' : ''
                        } ${isSelectedTile ? 'board-zone-selected' : ''} ${
                          isCurrentPlayerTile ? 'board-zone-current' : ''
                        } ${isReachable ? 'board-zone-reachable' : ''} ${
                          isDisabled ? 'board-zone-disabled' : ''
                        }`}
                        key={tile.id}
                        style={{
                          left: `${overlay.left}%`,
                          top: `${overlay.top}%`,
                          width: `${overlay.width}%`,
                          height: `${overlay.height}%`,
                          clipPath: overlay.clipPath,
                          WebkitClipPath: overlay.clipPath,
                        }}
                        onClick={() =>
                          isChoosingDestination ? handleDestinationSelection(tile.id) : setInspectedTileId(tile.id)
                        }
                        title={`${tileLabel} · ${presentedTile.description}`}
                        aria-label={`${tileLabel}. ${isReachable ? 'Destination atteignable.' : presentedTile.description}`}
                        disabled={isDisabled}
                      >
                        <span className="board-zone-hit" />
                        {bubbleVisual && (
                          <span className="board-zone-bubble-visual" aria-hidden="true">
                            <img
                              src={bubbleVisual.image}
                              alt={bubbleVisual.alt}
                              className="board-zone-bubble-image"
                            />
                            <span className="board-zone-bubble-caption">{bubbleVisual.label}</span>
                          </span>
                        )}
                        <span className="board-zone-badge" aria-hidden="true">
                          {tile.id}
                        </span>
                        <span className="board-zone-label sr-only">
                          Case {tile.id} · {tileLabel} · {tileTypeLabels[tile.type]}
                        </span>
                        <span className="board-zone-tokens" aria-hidden={occupants.length === 0}>
                          {occupants.map((player, occupantIndex) => {
                            const playerIndex = game.players.findIndex((entry) => entry.id === player.id);
                            const columnOffset = occupantIndex % 2 === 0 ? -1 : 1;
                            const rowOffset = Math.floor(occupantIndex / 2);
                            const offsetX = occupantIndex === 0 ? 0 : columnOffset * (12 + rowOffset * 2);
                            const offsetY = rowOffset * 13;

                            return (
                              <span
                                className="player-token board-player-token"
                                key={player.id}
                                style={{
                                  background: PLAYER_TOKEN_COLORS[playerIndex % PLAYER_TOKEN_COLORS.length],
                                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                                  zIndex: occupants.length - occupantIndex,
                                }}
                                title={player.name}
                              >
                                {getPlayerInitials(player.name)}
                              </span>
                            );
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="board-focus-card">
                  <div className="board-focus-copy">
                    <p className="eyebrow">Lecture du plateau</p>
                    <h3>{focusTileService?.name ?? focusTile.title}</h3>
                    <p>{focusTile.description}</p>
                  </div>
                  <div className="board-focus-meta">
                    <span className="status-chip">{tileTypeLabels[focusTile.type]}</span>
                    {focusTile.color && <span className="tile-family">Famille {colorLabels[focusTile.color]}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="board-reference-strip" aria-label="Références complémentaires du jeu">
              <img src={plancheAImage} alt="Planche A de référence" className="mini-reference" />
              <img src={plancheBImage} alt="Planche B de référence" className="mini-reference" />
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
                    <strong>Destination choisie : {game.pendingAction.tile.title}</strong>
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
            <h2>{game.pendingAction.tile.title}</h2>
            <p>{game.pendingAction.tile.description}</p>

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
