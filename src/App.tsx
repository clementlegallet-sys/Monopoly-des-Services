import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import boardReferenceImage from '../plateau-reference-bordures-epaisses.png';
import boardMapJson from '../board_map_final.json';
import objectionsDeckFaceImage from '../carte objection FACE.png';
import objectionCardAlreadySameImage from '../objection-j-ai-deja-la-meme-chose.png';
import objectionCardNotInterestedImage from '../objection-ca-ne-m-interesse-pas.png';
import objectionCardNoBreakdownsImage from '../objection-je-n-ai-jamais-eu-de-pannes.png';
import objectionCardBudgetImage from '../objection-j-ai-un-budget-restreint.png';
import objectionCardSpouseImage from '../objection-je-dois-en-parler-a-mon-conjoint.png';
import objectionCardReflectImage from '../objection-je-souhaite-reflechir.png';
import edfOfficialLogo from '../logo-edf-officiel.png';
import chanceCardsRegistry from '../chance_cards_registry.json';
import chanceContactFrontImage from '../chance-contact-front.png';
import chanceContactBackImage from '../chance-contact-back.png';
import chanceContacteurFrontImage from '../chance-contacteur-front.png';
import chanceContacteurBackImage from '../chance-contacteur-back.png';
import chanceDelesteurFrontImage from '../chance-delesteur-front.png';
import chanceDelesteurBackImage from '../chance-delesteur-back.png';
import chanceDisjFrontImage from '../chance-disj-front.png';
import chanceDisjBackImage from '../chance-disj-back.png';
import chanceFilPiloteFrontImage from '../chance-filpilote-front.png';
import chanceFilPiloteBackImage from '../chance-filpilote-back.png';
import chanceGestionDelestFrontImage from '../chance-gestiondelest-front.png';
import chanceGestionDelestBackImage from '../chance-gestiondelest-back.png';
import chanceGestionnaireFrontImage from '../chance-gestionnaire-front.png';
import chanceGestionnaireBackImage from '../chance-gestionnaire-back.png';
import chanceManKelecFrontImage from '../chance-mankelec-front.png';
import chanceManKelecBackImage from '../chance-mankelec-back.png';
import chanceRadiateurFrontImage from '../chance-radiateur-front.png';
import chanceRadiateurBackImage from '../chance-radiateur-back.png';
import chanceTempoFrontImage from '../chance-tempo-front.png';
import chanceTempoBackImage from '../chance-tempo-back.png';
import chanceThermostatFrontImage from '../chance-thermostat-front.png';
import chanceThermostatBackImage from '../chance-thermostat-back.png';
import chanceThermostatiqueFrontImage from '../chance-thermostatique-front.png';
import chanceThermostatiqueBackImage from '../chance-thermostatique-back.png';

type TileType =
  | 'start'
  | 'chance'
  | 'service'
  | 'question'
  | 'bubble'
  | 'market'
  | 'objection';

type RegistryTileType = 'start' | 'market' | 'service' | 'bubble_mode' | 'chance' | 'question';

type ServiceColor = 'blue' | 'green' | 'orange';
type TrainingMode = 'arguments' | 'objections';

type ServicePiece = {
  id: string;
  name: string;
  color: ServiceColor;
  description: string;
};

type TileActionDefinition = {
  kind: 'start' | 'chance' | 'service' | 'question' | 'bubble' | 'market' | 'objection';
  summary: string;
  rewardClients?: number;
  grantsServiceId?: string;
  drawObjectionCard?: boolean;
};

type TileShapeDefinition = {
  points: string;
  tokenAnchor: {
    x: number;
    y: number;
  };
};

type TileBlueprint = {
  order: number;
  tileId: string;
  label: string;
  type: TileType;
  color?: ServiceColor;
  description: string;
  serviceId?: string;
  adjacency: string[];
  shape: TileShapeDefinition;
  actionType: string;
};

type Tile = TileBlueprint & { action: TileActionDefinition };

type Player = {
  id: string;
  name: string;
  avatarId: string;
  position: string;
  clients: number;
  pieces: string[];
  rollsTaken: number;
};

type PlayerDraft = {
  name: string;
  avatarId: string;
};

type PendingAction = {
  tile: Tile;
  playerId: string;
  roll: number;
};

type PendingMovement = {
  playerId: string;
  originTileId: string;
  roll: number;
  reachableTileIds: string[];
};

type GamePhase = 'welcome' | 'setup' | 'playing' | 'finished';

type ObjectionCard = {
  id: string;
  title: string;
  prompt: string;
  image: string;
};

type ChanceCardRegistryEntry = {
  cardId: string;
  label: string;
  frontImage: string;
  backImage: string;
};

type ChanceCard = {
  id: string;
  title: string;
  frontImage: string;
  backImage: string;
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
  activeChanceCard: ChanceCard | null;
  hasMentionsLegalesTile: boolean;
  playersWhoLeftStart: string[];
  validatedLegalMentions: number[];
};

type DieFaceProps = {
  value: number | null;
  isRolling: boolean;
  isSettling: boolean;
};

type Point = {
  x: number;
  y: number;
};

type BoardMapTile = {
  tileId: string;
  label: string;
  type: RegistryTileType;
  actionType: string;
  tokenAnchor: Point;
  polygon: Point[];
};

type BoardMapFile = {
  version: number;
  boardImage: string;
  tiles: BoardMapTile[];
  bubbleTiles: string[];
};

type MappingTool = 'polygon' | 'anchor';

type TilePresentation = {
  title: string;
  description: string;
  identityLabel?: string;
};

type TileInteractionDebugState = {
  tileId: string;
  label: string;
  type: TileType;
  source: 'inspection' | 'destination';
};

type LegalMention = {
  id: number;
  text: string;
};

const STORAGE_KEY = 'monopoly-des-services-state';
const INITIAL_CLIENTS = 2;
const INITIAL_BANK = 40;
const SALE_VALUES = [2, 3, 5] as const;
const PLAYER_TOKEN_COLORS = ['#d9473f', '#2b6fdd', '#f59e0b', '#0f9d74'];
const PLAYER_AVATARS = [
  { id: 'bolt', symbol: '⚡', label: 'Éclair' },
  { id: 'house', symbol: '🏠', label: 'Maison' },
  { id: 'shield', symbol: '🛡️', label: 'Protection' },
  { id: 'plug', symbol: '🔌', label: 'Énergie' },
  { id: 'sun', symbol: '☀️', label: 'Solaire' },
  { id: 'leaf', symbol: '🌿', label: 'Durable' },
  { id: 'wrench', symbol: '🔧', label: 'Maintenance' },
  { id: 'spark', symbol: '✨', label: 'Étincelle' },
] as const;
const ENABLE_TILE_DEBUG = true;
const DEVELOPER_QUERY_PARAM = 'dev';
const TILE_DEBUG_FLASH_DURATION_MS = 950;
const BOARD_MAP_SOURCE = boardMapJson as BoardMapFile;
const BOARD_MAP_TILE_LOOKUP = new Map(BOARD_MAP_SOURCE.tiles.map((tile) => [tile.tileId, tile]));
const TECHNICAL_SOURCE_OF_TRUTH = {
  image: boardReferenceImage,
  boardMap: BOARD_MAP_SOURCE,
} as const;
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
const CHANCE_IMAGE_BY_FILE: Record<string, string> = {
  'chance-contact-front.png': chanceContactFrontImage,
  'chance-contact-back.png': chanceContactBackImage,
  'chance-contacteur-front.png': chanceContacteurFrontImage,
  'chance-contacteur-back.png': chanceContacteurBackImage,
  'chance-delesteur-front.png': chanceDelesteurFrontImage,
  'chance-delesteur-back.png': chanceDelesteurBackImage,
  'chance-disj-front.png': chanceDisjFrontImage,
  'chance-disj-back.png': chanceDisjBackImage,
  'chance-filpilote-front.png': chanceFilPiloteFrontImage,
  'chance-filpilote-back.png': chanceFilPiloteBackImage,
  'chance-gestiondelest-front.png': chanceGestionDelestFrontImage,
  'chance-gestiondelest-back.png': chanceGestionDelestBackImage,
  'chance-gestionnaire-front.png': chanceGestionnaireFrontImage,
  'chance-gestionnaire-back.png': chanceGestionnaireBackImage,
  'chance-mankelec-front.png': chanceManKelecFrontImage,
  'chance-mankelec-back.png': chanceManKelecBackImage,
  'chance-radiateur-front.png': chanceRadiateurFrontImage,
  'chance-radiateur-back.png': chanceRadiateurBackImage,
  'chance-tempo-front.png': chanceTempoFrontImage,
  'chance-tempo-back.png': chanceTempoBackImage,
  'chance-thermostat-front.png': chanceThermostatFrontImage,
  'chance-thermostat-back.png': chanceThermostatBackImage,
  'chance-thermostatique-front.png': chanceThermostatiqueFrontImage,
  'chance-thermostatique-back.png': chanceThermostatiqueBackImage,
};
const CHANCE_DECK: ChanceCard[] = (chanceCardsRegistry.cards as ChanceCardRegistryEntry[])
  .map((card) => ({
    id: card.cardId,
    title: card.label,
    frontImage: CHANCE_IMAGE_BY_FILE[card.frontImage] ?? '',
    backImage: CHANCE_IMAGE_BY_FILE[card.backImage] ?? '',
  }))
  .filter((card) => card.frontImage && card.backImage);
const DEFAULT_AVATAR_ID = PLAYER_AVATARS[0].id;
const START_TILE_ID = 'T0';
const LEGAL_MENTIONS: LegalMention[] = [
  { id: 1, text: 'Info sur les documents précontractuels présents dans le parcours de signature annoncée ?' },
  { id: 2, text: 'Contrat assuré par AXA annoncé pour Assistance Dépannage et METLIFE pour Protection Facture' },
  { id: 3, text: 'Commercialisé par EDF SA mandataire d’EDF Assurances annoncé ?' },
  { id: 4, text: 'Un exemple d’exclusion est-il annoncé ?' },
  { id: 5, text: 'Engagement d’1 an après signature annoncé ?' },
  { id: 6, text: 'Tacite reconduction du contrat à date anniversaire annoncée ?' },
  { id: 7, text: 'Annonce de la cotisation mensuelle facturée sur la facture d’énergie ?' },
  { id: 8, text: 'Résiliation possible après 1 an annoncée ?' },
  { id: 9, text: 'Délai de renonciation 30 jours annoncé ?' },
];

const BOARD_TILE_ORDER = [
  'T0',
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'T10',
  'T11',
  'T12',
  'T13',
  'T14',
  'T15',
  'T16',
  'T17',
  'T18',
  'T19',
  'T20',
  'T21',
  'T22',
] as const;

const BUBBLE_TILE_IDS = [...BOARD_MAP_SOURCE.bubbleTiles];

const TILE_TYPE_BY_REGISTRY_TYPE: Record<RegistryTileType, TileType> = {
  start: 'start',
  market: 'market',
  service: 'service',
  bubble_mode: 'bubble',
  chance: 'chance',
  question: 'question',
};

const TILE_SERVICE_METADATA: Partial<
  Record<
    string,
    {
      color: ServiceColor;
      serviceId: string;
    }
  >
> = {
  T7: { color: 'blue', serviceId: 'protection-facture' },
  T11: { color: 'orange', serviceId: 'izi-confort' },
  T13: { color: 'blue', serviceId: 'assistance-depannage' },
  T15: { color: 'green', serviceId: 'izi-by-edf' },
  T18: { color: 'green', serviceId: 'thermostat-connecte-sowee' },
};

const TILE_DESCRIPTIONS: Partial<Record<string, string>> = {
  T0: 'Point de départ de tous les joueurs.',
  T1: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  T2: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  T3: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  T4: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  T5: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  T6: 'Échanger une pièce entre joueurs ou vendre une pièce à la banque.',
  T7: 'Donner 2 avantages pour remporter la pièce.',
  T8: 'Case bulle : affiche une objection en mode Objections et un BAC en mode Arguments de vente.',
  T9: 'Bonne réponse = +2 clients.',
  T10: 'Poser une question ouverte adaptée à une offre du groupe.',
  T11: 'Donner 2 avantages pour remporter la pièce.',
  T12: 'Case bulle : affiche une objection en mode Objections et un BAC en mode Arguments de vente.',
  T13: 'Donner 2 avantages pour remporter la pièce.',
  T14: 'Poser une question ouverte adaptée à une offre du groupe.',
  T15: 'Donner 2 avantages pour remporter la pièce.',
  T16: 'Case bulle : affiche une objection en mode Objections et un BAC en mode Arguments de vente.',
  T17: 'Poser une question ouverte adaptée à une offre du groupe.',
  T18: 'Donner 2 avantages pour remporter la pièce.',
  T19: 'Case bulle : affiche une objection en mode Objections et un BAC en mode Arguments de vente.',
  T20: 'Poser une question ouverte adaptée à une offre du groupe.',
  T21: 'Poser une question ouverte adaptée à une offre du groupe.',
  T22: 'Case bulle : affiche une objection en mode Objections et un BAC en mode Arguments de vente.',
};

const TILE_LAYOUT: Record<string, Pick<TileBlueprint, 'order' | 'tileId' | 'adjacency'>> = {
  T0: {
    order: 0,
    tileId: 'T0',
    adjacency: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
  },
  T1: {
    order: 1,
    tileId: 'T1',
    adjacency: ['T0', 'T6', 'T7', 'T8', 'T2', 'T20'],
  },
  T2: {
    order: 2,
    tileId: 'T2',
    adjacency: ['T0', 'T1', 'T8', 'T9', 'T10', 'T3'],
  },
  T3: {
    order: 3,
    tileId: 'T3',
    adjacency: ['T0', 'T2', 'T11', 'T22', 'T21', 'T4'],
  },
  T4: {
    order: 4,
    tileId: 'T4',
    adjacency: ['T0', 'T3', 'T21', 'T13', 'T12', 'T5'],
  },
  T5: {
    order: 5,
    tileId: 'T5',
    adjacency: ['T0', 'T4', 'T12', 'T14', 'T15', 'T6'],
  },
  T6: {
    order: 6,
    tileId: 'T6',
    adjacency: ['T0', 'T5', 'T17', 'T18', 'T19', 'T20', 'T1'],
  },
  T7: {
    order: 7,
    tileId: 'T7',
    adjacency: ['T1', 'T20', 'T8'],
  },
  T8: {
    order: 8,
    tileId: 'T8',
    adjacency: ['T1', 'T2', 'T7', 'T9'],
  },
  T9: {
    order: 9,
    tileId: 'T9',
    adjacency: ['T2', 'T8', 'T10'],
  },
  T10: {
    order: 10,
    tileId: 'T10',
    adjacency: ['T2', 'T9', 'T11'],
  },
  T11: {
    order: 11,
    tileId: 'T11',
    adjacency: ['T3', 'T10', 'T22'],
  },
  T12: {
    order: 12,
    tileId: 'T12',
    adjacency: ['T4', 'T5', 'T13', 'T14'],
  },
  T13: {
    order: 13,
    tileId: 'T13',
    adjacency: ['T4', 'T12', 'T21'],
  },
  T14: {
    order: 14,
    tileId: 'T14',
    adjacency: ['T5', 'T12', 'T15'],
  },
  T15: {
    order: 15,
    tileId: 'T15',
    adjacency: ['T5', 'T14', 'T16'],
  },
  T16: {
    order: 16,
    tileId: 'T16',
    adjacency: ['T5', 'T15', 'T17'],
  },
  T17: {
    order: 17,
    tileId: 'T17',
    adjacency: ['T6', 'T16', 'T18'],
  },
  T18: {
    order: 18,
    tileId: 'T18',
    adjacency: ['T6', 'T17', 'T19'],
  },
  T19: {
    order: 19,
    tileId: 'T19',
    adjacency: ['T6', 'T18', 'T20'],
  },
  T20: {
    order: 20,
    tileId: 'T20',
    adjacency: ['T1', 'T6', 'T7', 'T19'],
  },
  T21: {
    order: 21,
    tileId: 'T21',
    adjacency: ['T3', 'T4', 'T13', 'T22'],
  },
  T22: {
    order: 22,
    tileId: 'T22',
    adjacency: ['T3', 'T11', 'T21'],
  },
};

const getTileActionDefinition = (tile: TileBlueprint): TileActionDefinition => {
  switch (tile.type) {
    case 'start':
      return {
        kind: 'start',
        summary: 'Point de départ et repère central des déplacements.',
      };
    case 'chance':
      return {
        kind: 'chance',
        summary: 'Bonne réponse : gagner 2 clients.',
        rewardClients: 2,
      };
    case 'service':
      return {
        kind: 'service',
        summary: 'Réussir le challenge pour gagner la pièce service.',
        grantsServiceId: tile.serviceId,
      };
    case 'question':
      return {
        kind: 'question',
        summary: 'Poser une question ouverte pertinente pour gagner 1 client.',
        rewardClients: 1,
      };
    case 'bubble':
      return {
        kind: 'bubble',
        summary: 'Déclenche un argument BAC ou une objection selon le mode choisi.',
        rewardClients: 1,
        drawObjectionCard: true,
      };
    case 'market':
      return {
        kind: 'market',
        summary: 'Échanger une pièce ou vendre une pièce à la banque.',
      };
    case 'objection':
      return {
        kind: 'objection',
        summary: 'Traiter une objection client et gagner 1 client si validé.',
        rewardClients: 1,
        drawObjectionCard: true,
      };
    default:
      return {
        kind: tile.type,
        summary: tile.description,
      };
  }
};

const BOARD_REGISTRY: Tile[] = BOARD_TILE_ORDER.map((tileId) => {
  const layout = TILE_LAYOUT[tileId];
  const boardMapTile = BOARD_MAP_TILE_LOOKUP.get(tileId);

  if (!layout) {
    throw new Error(`Tile layout missing for ${tileId}.`);
  }

  if (!boardMapTile) {
    throw new Error(`Board map entry missing for ${tileId}.`);
  }

  if (boardMapTile.polygon.length < 3) {
    throw new Error(`Board map polygon missing or invalid for ${tileId}.`);
  }

  const tile: TileBlueprint = {
    ...layout,
    shape: {
      points: serializePolygonPoints(boardMapTile.polygon),
      tokenAnchor: boardMapTile.tokenAnchor,
    },
    label: boardMapTile.label,
    type: TILE_TYPE_BY_REGISTRY_TYPE[boardMapTile.type],
    actionType: boardMapTile.actionType,
    description: TILE_DESCRIPTIONS[tileId] ?? boardMapTile.label,
    color: TILE_SERVICE_METADATA[tileId]?.color,
    serviceId: TILE_SERVICE_METADATA[tileId]?.serviceId,
  };

  return {
    ...tile,
    action: getTileActionDefinition(tile),
  };
});

const BOARD_BY_TILE_ID = new Map(BOARD_REGISTRY.map((tile) => [tile.tileId, tile]));
const BOARD_TILE_ORDER_INDEX = new Map<string, number>(BOARD_TILE_ORDER.map((tileId, index) => [tileId, index]));
const TILE_GRAPH: Record<string, string[]> = Object.fromEntries(
  BOARD_REGISTRY.map((tile) => [tile.tileId, tile.adjacency]),
);

const STORED_TILE_ID_ALIASES: Record<string, string> = {
  T00: 'T0',
  T01: 'T1',
  T02: 'T2',
  T03: 'T3',
  T04: 'T4',
  T05: 'T5',
  T06: 'T6',
  T07: 'T7',
  T08: 'T8',
  T09: 'T9',
};

const parsePolygonPoints = (points: string): Point[] =>
  points.trim()
    ? points
        .trim()
        .split(/\s+/)
        .map((pair) => {
          const [x, y] = pair.split(',').map(Number);
          return { x, y };
        })
    : [];

function serializePolygonPoints(points: Point[]): string {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function cloneBoardMap(boardMap: BoardMapFile): BoardMapFile {
  return JSON.parse(JSON.stringify(boardMap)) as BoardMapFile;
}

function clampBoardCoordinate(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(2));
}

const getPolygonCentroid = (points: string): Point => {
  const parsedPoints = parsePolygonPoints(points);
  const total = parsedPoints.length || 1;

  return parsedPoints.reduce(
    (centroid, point) => ({
      x: centroid.x + point.x / total,
      y: centroid.y + point.y / total,
    }),
    { x: 0, y: 0 },
  );
};

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
  const tileIds = new Set(tiles.map((tile) => tile.tileId));
  const issues: string[] = [];

  if (!TECHNICAL_SOURCE_OF_TRUTH.image) {
    issues.push('Image technique annotée introuvable.');
  }

  if (tiles.length !== BOARD_TILE_ORDER.length) {
    issues.push(`Le registre doit contenir exactement ${BOARD_TILE_ORDER.length} cases.`);
  }

  BOARD_TILE_ORDER.forEach((tileId, order) => {
    const boardMapTile = BOARD_MAP_TILE_LOOKUP.get(tileId);
    const tile = tiles.find((candidate) => candidate.tileId === tileId);

    if (!boardMapTile) {
      issues.push(`Tuile absente du JSON technique : ${tileId}.`);
      return;
    }

    if (!tile) {
      issues.push(`Tuile absente du mapping SVG : ${tileId}.`);
      return;
    }

    if (tile.order !== order) {
      issues.push(`Ordre ${tileId} attendu ${order} mais reçu ${tile.order}.`);
    }

    if (tile.label !== boardMapTile.label) {
      issues.push(`Libellé attendu pour ${tileId} : ${boardMapTile.label}.`);
    }

    if (tile.type !== TILE_TYPE_BY_REGISTRY_TYPE[boardMapTile.type]) {
      issues.push(`Type attendu pour ${tileId} : ${boardMapTile.type}.`);
    }

    if (!tile.shape.points.trim()) {
      issues.push(`Case ${tileId} sans forme SVG.`);
    }

    if (boardMapTile.polygon.length < 3) {
      issues.push(`Case ${tileId} sans polygone final exploitable.`);
    }

    if (tile.adjacency.length === 0) {
      issues.push(`Case ${tileId} sans adjacency.`);
    }

    tile.adjacency.forEach((neighborId) => {
      if (!tileIds.has(neighborId)) {
        issues.push(`Case ${tileId} reliée à une case inconnue (${neighborId}).`);
        return;
      }

      if (!TILE_GRAPH[neighborId]?.includes(tileId)) {
        issues.push(`Adjacency non symétrique entre ${tileId} et ${neighborId}.`);
      }
    });
  });

  const actualBubbleIds = tiles.filter((tile) => tile.type === 'bubble').map((tile) => tile.tileId);
  if (actualBubbleIds.join('|') !== BUBBLE_TILE_IDS.join('|')) {
    issues.push(`Bulles attendues : ${BUBBLE_TILE_IDS.join(', ')}.`);
  }

  return issues;
};

const BOARD_REGISTRY_ISSUES = getBoardRegistryIssues(BOARD_REGISTRY);

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

const board = BOARD_REGISTRY;

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

const drawRandomChanceCard = (excludedId?: string | null) => {
  const availableCards = CHANCE_DECK.filter((card) => card.id !== excludedId);

  if (availableCards.length === 0) {
    return CHANCE_DECK[0] ?? null;
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
  activeChanceCard: null,
  hasMentionsLegalesTile: false,
  playersWhoLeftStart: [],
  validatedLegalMentions: [],
});

const uid = () => Math.random().toString(36).slice(2, 10);

const getService = (serviceId?: string) =>
  servicePieces.find((piece) => piece.id === serviceId) ?? null;

const appendHistoryEntry = (history: string[], message: string) => [message, ...history].slice(0, 12);

const haveAllPlayersLeftStart = (players: Player[], playersWhoLeftStart: string[]) => {
  if (players.length === 0) {
    return false;
  }

  const leftStartSet = new Set(playersWhoLeftStart);
  return players.every((player) => leftStartSet.has(player.id));
};

const TOKEN_RADIUS = 2.4;
const TOKEN_DEBUG_MARKER_RADIUS = 0.72;
const TOKEN_STACK_SPACING = 2.8;

const getTokenOffset = (occupantIndex: number, occupantCount: number) => {
  if (occupantCount <= 1) {
    return { x: 0, y: 0 };
  }

  if (occupantCount === 2) {
    return {
      x: occupantIndex === 0 ? -TOKEN_STACK_SPACING / 2 : TOKEN_STACK_SPACING / 2,
      y: 0,
    };
  }

  if (occupantCount === 3) {
    const triangleOffsets = [
      { x: 0, y: -TOKEN_STACK_SPACING * 0.7 },
      { x: -TOKEN_STACK_SPACING * 0.78, y: TOKEN_STACK_SPACING * 0.52 },
      { x: TOKEN_STACK_SPACING * 0.78, y: TOKEN_STACK_SPACING * 0.52 },
    ] as const;

    return triangleOffsets[occupantIndex] ?? { x: 0, y: 0 };
  }

  if (occupantCount === 4) {
    const gridOffsets = [
      { x: -TOKEN_STACK_SPACING / 2, y: -TOKEN_STACK_SPACING / 2 },
      { x: TOKEN_STACK_SPACING / 2, y: -TOKEN_STACK_SPACING / 2 },
      { x: -TOKEN_STACK_SPACING / 2, y: TOKEN_STACK_SPACING / 2 },
      { x: TOKEN_STACK_SPACING / 2, y: TOKEN_STACK_SPACING / 2 },
    ] as const;

    return gridOffsets[occupantIndex] ?? { x: 0, y: 0 };
  }

  const ringIndex = occupantIndex;
  const angle = ((ringIndex % occupantCount) / occupantCount) * Math.PI * 2 - Math.PI / 2;
  const radius = TOKEN_STACK_SPACING * 0.92 + Math.floor(ringIndex / occupantCount) * 1.2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};


const getTilePresentation = (
  tile: Tile,
  trainingMode: TrainingMode | null,
  hasMentionsLegalesTile: boolean,
): TilePresentation => {
  if (tile.tileId === START_TILE_ID && hasMentionsLegalesTile) {
    return {
      title: 'Mentions légales',
      description: 'Le joueur cite oralement une mention légale. Le modérateur valide ou refuse la réponse.',
      identityLabel: 'Mentions légales',
    };
  }

  if (tile.type === 'bubble') {
    return {
      title: tile.label,
      description:
        trainingMode === 'objections'
          ? 'Case bulle en mode Objections : affiche et déclenche une objection.'
          : 'Case bulle en mode Arguments de vente : affiche et déclenche un BAC.',
      identityLabel: trainingMode === 'objections' ? 'Objection' : 'BAC',
    };
  }

  if (tile.type === 'objection') {
    return {
      title: tile.label,
      description: 'Tirez une carte Objection et répondez avec la méthode AREF.',
      identityLabel: 'Objection',
    };
  }

  return {
    title: tile.label,
    description: tile.description,
  };
};

const normalizeStoredTileId = (value: unknown): string => {
  if (typeof value === 'string') {
    if (BOARD_BY_TILE_ID.has(value)) {
      return value;
    }

    const aliasedTileId = STORED_TILE_ID_ALIASES[value];
    if (aliasedTileId && BOARD_BY_TILE_ID.has(aliasedTileId)) {
      return aliasedTileId;
    }
  }

  return BOARD_REGISTRY[0].tileId;
};

const getResolvedActionSummary = (tile: Tile, trainingMode: TrainingMode | null) => {
  if (tile.type === 'bubble') {
    return trainingMode === 'objections'
      ? 'Déclenche le comportement Objection pour cette bulle.'
      : 'Déclenche le comportement BAC pour cette bulle.';
  }

  return tile.action.summary;
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

const getAvatarById = (avatarId: string) =>
  PLAYER_AVATARS.find((avatar) => avatar.id === avatarId) ?? PLAYER_AVATARS[0];

const getReachableTileIds = (originTileId: string, roll: number) => {
  if (roll <= 0) {
    return [];
  }

  let frontier = new Set<string>([originTileId]);

  for (let step = 0; step < roll; step += 1) {
    const nextFrontier = new Set<string>();

    frontier.forEach((tileId) => {
      TILE_GRAPH[tileId]?.forEach((neighborId) => {
        nextFrontier.add(neighborId);
      });
    });

    frontier = nextFrontier;
  }

  frontier.delete(originTileId);

  return [...frontier].sort(
    (left, right) => (BOARD_TILE_ORDER_INDEX.get(left) ?? 0) - (BOARD_TILE_ORDER_INDEX.get(right) ?? 0),
  );
};

const DieFace = ({ value, isRolling, isSettling }: DieFaceProps) => {
  const safeValue = value && value >= 1 && value <= 6 ? value : null;
  const dieClasses = ['die-face', isRolling ? 'die-face-rolling' : '', isSettling ? 'die-face-settling' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={dieClasses} aria-live="polite">
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
      const parsedChanceCard = parsedGame.activeChanceCard;
      const normalizedObjectionCard =
        parsedObjectionCard &&
        typeof parsedObjectionCard === 'object' &&
        'id' in parsedObjectionCard &&
        'title' in parsedObjectionCard &&
        'image' in parsedObjectionCard
          ? (parsedObjectionCard as ObjectionCard)
          : null;
      const normalizedChanceCard =
        parsedChanceCard &&
        typeof parsedChanceCard === 'object' &&
        'id' in parsedChanceCard &&
        'title' in parsedChanceCard &&
        'frontImage' in parsedChanceCard &&
        'backImage' in parsedChanceCard
          ? (parsedChanceCard as ChanceCard)
          : null;

      const players = (parsedGame.players ?? []).map((player, index) => ({
        ...player,
        avatarId:
          typeof player.avatarId === 'string'
            ? player.avatarId
            : PLAYER_AVATARS[index % PLAYER_AVATARS.length].id,
        position: normalizeStoredTileId(player.position),
        rollsTaken: player.rollsTaken ?? 0,
      })) as Player[];
      const playersWhoLeftStart = Array.isArray(parsedGame.playersWhoLeftStart)
        ? parsedGame.playersWhoLeftStart.filter((entry): entry is string => typeof entry === 'string')
        : [];
      const persistedMentionsLegalesState =
        Boolean(parsedGame.hasMentionsLegalesTile) || haveAllPlayersLeftStart(players, playersWhoLeftStart);

      return {
        ...createInitialState(),
        ...parsedGame,
        players,
        pendingMovement: parsedGame.pendingMovement
          ? {
              ...parsedGame.pendingMovement,
              originTileId: normalizeStoredTileId(parsedGame.pendingMovement.originTileId),
              reachableTileIds: (parsedGame.pendingMovement.reachableTileIds ?? []).map((tileId) =>
                normalizeStoredTileId(tileId),
              ),
            }
          : null,
        pendingAction:
          parsedGame.pendingAction && parsedGame.pendingAction.tile
            ? {
                ...parsedGame.pendingAction,
                tile:
                  BOARD_BY_TILE_ID.get(
                    normalizeStoredTileId((parsedGame.pendingAction.tile as Partial<Tile>).tileId),
                  ) ?? BOARD_REGISTRY[0],
              }
            : null,
        activeObjectionCard: normalizedObjectionCard,
        activeChanceCard: normalizedChanceCard,
        hasMentionsLegalesTile: persistedMentionsLegalesState,
        playersWhoLeftStart,
        validatedLegalMentions: Array.isArray(parsedGame.validatedLegalMentions)
          ? parsedGame.validatedLegalMentions.filter(
              (entry): entry is number => typeof entry === 'number' && LEGAL_MENTIONS.some((mention) => mention.id === entry),
            )
          : [],
      };
    } catch {
      return createInitialState();
    }
  });
  const [playerDrafts, setPlayerDrafts] = useState<PlayerDraft[]>([
    { name: '', avatarId: PLAYER_AVATARS[0].id },
    { name: '', avatarId: PLAYER_AVATARS[1].id },
  ]);
  const [allowAvatarReuse, setAllowAvatarReuse] = useState(false);
  const [selectedTrainingMode, setSelectedTrainingMode] = useState<TrainingMode | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [saleValue, setSaleValue] = useState<number>(SALE_VALUES[0]);
  const [displayRoll, setDisplayRoll] = useState<number | null>(game.lastRoll);
  const [isRolling, setIsRolling] = useState(false);
  const [isDieSettling, setIsDieSettling] = useState(false);
  const [inspectedTileId, setInspectedTileId] = useState<string | null>(null);
  const [isTileDebugEnabled, setIsTileDebugEnabled] = useState(false);
  const [tileDebugState, setTileDebugState] = useState<TileInteractionDebugState | null>(null);
  const [debugFlashTileId, setDebugFlashTileId] = useState<string | null>(null);
  const [isBoardMappingMode, setIsBoardMappingMode] = useState(false);
  const [boardMapDraft, setBoardMapDraft] = useState<BoardMapFile>(() => cloneBoardMap(BOARD_MAP_SOURCE));
  const [selectedMappingTileId, setSelectedMappingTileId] = useState<string>(
    BOARD_MAP_SOURCE.tiles[0]?.tileId ?? BOARD_REGISTRY[0]?.tileId ?? 'T0',
  );
  const [mappingTool, setMappingTool] = useState<MappingTool>('polygon');
  const [finalizedMappingTileIds, setFinalizedMappingTileIds] = useState<string[]>([]);
  const [mappingExportMessage, setMappingExportMessage] = useState('');
  const [isObjectionCardRevealed, setIsObjectionCardRevealed] = useState(false);
  const [isObjectionCardFlipping, setIsObjectionCardFlipping] = useState(false);
  const [isObjectionCardShowingBack, setIsObjectionCardShowingBack] = useState(false);
  const [isChanceAnswerRevealed, setIsChanceAnswerRevealed] = useState(false);
  const [isChanceCardFlipping, setIsChanceCardFlipping] = useState(false);
  const [isChanceCardShowingBack, setIsChanceCardShowingBack] = useState(false);
  const [chanceAnswerDecision, setChanceAnswerDecision] = useState<'validated' | 'rejected' | null>(null);
  const [selectedLegalMentionId, setSelectedLegalMentionId] = useState<number | null>(null);
  const [isMentionsLegalesModeratorView, setIsMentionsLegalesModeratorView] = useState(false);
  const isDeveloperMode = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(DEVELOPER_QUERY_PARAM) === '1';
  }, []);
  const rollIntervalRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<number | null>(null);
  const dieSettlingTimeoutRef = useRef<number | null>(null);
  const debugFlashTimeoutRef = useRef<number | null>(null);
  const objectionRevealTimeoutRef = useRef<number | null>(null);
  const chanceRevealTimeoutRef = useRef<number | null>(null);
  const boardSurfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  useEffect(() => {
    if (isDeveloperMode && BOARD_REGISTRY_ISSUES.length > 0) {
      console.warn('Board registry issues detected:', BOARD_REGISTRY_ISSUES);
    }
  }, [isDeveloperMode]);

  useEffect(() => {
    if (!isRolling) {
      setDisplayRoll(game.lastRoll);
    }
  }, [game.lastRoll, isRolling]);

  useEffect(() => {
    const isObjectionChallenge =
      game.pendingAction &&
      (game.pendingAction.tile.type === 'bubble' || game.pendingAction.tile.type === 'objection') &&
      game.trainingMode === 'objections';

    if (!isObjectionChallenge) {
      setIsObjectionCardRevealed(false);
      setIsObjectionCardFlipping(false);
      setIsObjectionCardShowingBack(false);
      if (objectionRevealTimeoutRef.current) {
        window.clearTimeout(objectionRevealTimeoutRef.current);
        objectionRevealTimeoutRef.current = null;
      }
      return;
    }

    setIsObjectionCardRevealed(false);
    setIsObjectionCardFlipping(false);
    setIsObjectionCardShowingBack(false);

    if (objectionRevealTimeoutRef.current) {
      window.clearTimeout(objectionRevealTimeoutRef.current);
      objectionRevealTimeoutRef.current = null;
    }
  }, [game.pendingAction, game.activeObjectionCard?.id, game.trainingMode]);

  useEffect(() => {
    const isChanceChallenge = game.pendingAction?.tile.type === 'chance';

    if (!isChanceChallenge) {
      setIsChanceAnswerRevealed(false);
      setIsChanceCardFlipping(false);
      setIsChanceCardShowingBack(false);
      setChanceAnswerDecision(null);
      if (chanceRevealTimeoutRef.current) {
        window.clearTimeout(chanceRevealTimeoutRef.current);
        chanceRevealTimeoutRef.current = null;
      }
      return;
    }

    setIsChanceAnswerRevealed(false);
    setIsChanceCardFlipping(false);
    setIsChanceCardShowingBack(false);
    setChanceAnswerDecision(null);

    if (chanceRevealTimeoutRef.current) {
      window.clearTimeout(chanceRevealTimeoutRef.current);
      chanceRevealTimeoutRef.current = null;
    }
  }, [game.pendingAction, game.activeChanceCard?.id]);

  useEffect(() => {
    const isMentionsLegalesModal =
      game.pendingAction?.tile.tileId === START_TILE_ID &&
      (game.hasMentionsLegalesTile || haveAllPlayersLeftStart(game.players, game.playersWhoLeftStart));
    if (!isMentionsLegalesModal) {
      setSelectedLegalMentionId(null);
      setIsMentionsLegalesModeratorView(false);
      return;
    }
    setSelectedLegalMentionId(null);
    setIsMentionsLegalesModeratorView(false);
  }, [game.pendingAction, game.hasMentionsLegalesTile, game.players, game.playersWhoLeftStart]);

  useEffect(() => {
    if (!ENABLE_TILE_DEBUG) {
      return;
    }

    const allPlayersLeftStart = haveAllPlayersLeftStart(game.players, game.playersWhoLeftStart);
    const currentTileState = allPlayersLeftStart || game.hasMentionsLegalesTile ? 'Mentions légales' : 'Départ';
    console.info(
      `[depart-state] allPlayersLeftStart=${allPlayersLeftStart} persistedFlag=${game.hasMentionsLegalesTile} currentTileState=${currentTileState}`,
    );
  }, [game.players, game.playersWhoLeftStart, game.hasMentionsLegalesTile]);

  useEffect(
    () => () => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
      }
      if (rollTimeoutRef.current) {
        window.clearTimeout(rollTimeoutRef.current);
      }
      if (dieSettlingTimeoutRef.current) {
        window.clearTimeout(dieSettlingTimeoutRef.current);
      }
      if (debugFlashTimeoutRef.current) {
        window.clearTimeout(debugFlashTimeoutRef.current);
      }
      if (objectionRevealTimeoutRef.current) {
        window.clearTimeout(objectionRevealTimeoutRef.current);
      }
      if (chanceRevealTimeoutRef.current) {
        window.clearTimeout(chanceRevealTimeoutRef.current);
      }
    },
    [],
  );

  const currentPlayer = game.players[game.currentPlayerIndex] ?? null;
  const isMentionsLegalesActive =
    game.hasMentionsLegalesTile || haveAllPlayersLeftStart(game.players, game.playersWhoLeftStart);
  const boardImageSource = boardReferenceImage;
  const completeSets = useMemo(() => getCompleteSets(game.players), [game.players]);
  const currentPlayerTile = currentPlayer ? BOARD_BY_TILE_ID.get(currentPlayer.position) ?? null : null;
  const pendingMovementOriginTile = game.pendingMovement
    ? BOARD_BY_TILE_ID.get(game.pendingMovement.originTileId) ?? null
    : null;
  const focusTile =
    (inspectedTileId ? BOARD_BY_TILE_ID.get(inspectedTileId) ?? null : null) ??
    game.pendingAction?.tile ??
    pendingMovementOriginTile ??
    currentPlayerTile ??
    board[0];
  const focusTilePresentation = getTilePresentation(focusTile, game.trainingMode, isMentionsLegalesActive);
  const selectedMappingTile =
    boardMapDraft.tiles.find((tile) => tile.tileId === selectedMappingTileId) ?? boardMapDraft.tiles[0] ?? null;
  const isSelectedMappingTileFinalized = selectedMappingTile
    ? finalizedMappingTileIds.includes(selectedMappingTile.tileId)
    : false;
  const boardMapExport = useMemo(() => JSON.stringify(boardMapDraft, null, 2), [boardMapDraft]);
  const mappingTiles = useMemo(
    () =>
      boardMapDraft.tiles.map((tile) => ({
        ...tile,
        polygonPoints: serializePolygonPoints(tile.polygon),
      })),
    [boardMapDraft],
  );
  const reachableTileIds = game.pendingMovement?.reachableTileIds ?? [];
  const isChoosingDestination = Boolean(game.pendingMovement);

  const updateMappingTile = (tileId: string, updater: (tile: BoardMapTile) => BoardMapTile) => {
    setBoardMapDraft((currentBoardMap) => ({
      ...currentBoardMap,
      tiles: currentBoardMap.tiles.map((tile) => (tile.tileId === tileId ? updater(tile) : tile)),
    }));
  };

  const getBoardPointerPoint = (clientX: number, clientY: number): Point | null => {
    const boardRect = boardSurfaceRef.current?.getBoundingClientRect();

    if (!boardRect) {
      return null;
    }

    return {
      x: clampBoardCoordinate(((clientX - boardRect.left) / boardRect.width) * 100),
      y: clampBoardCoordinate(((clientY - boardRect.top) / boardRect.height) * 100),
    };
  };

  const handleBoardMappingClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selectedMappingTile) {
      return;
    }

    const point = getBoardPointerPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    if (mappingTool === 'anchor') {
      updateMappingTile(selectedMappingTile.tileId, (tile) => ({
        ...tile,
        tokenAnchor: point,
      }));
      setMappingExportMessage(`Ancre déplacée pour ${selectedMappingTile.tileId}.`);
      return;
    }

    if (isSelectedMappingTileFinalized) {
      setMappingExportMessage(
        `Le polygone de ${selectedMappingTile.tileId} est finalisé. Utilisez « Reprendre le polygone » ou « Réinitialiser ».`,
      );
      return;
    }

    updateMappingTile(selectedMappingTile.tileId, (tile) => ({
      ...tile,
      polygon: [...tile.polygon, point],
    }));
    setMappingExportMessage(`Point ajouté à ${selectedMappingTile.tileId} (${point.x}, ${point.y}).`);
  };

  const resetSelectedMappingTilePolygon = () => {
    if (!selectedMappingTile) {
      return;
    }

    updateMappingTile(selectedMappingTile.tileId, (tile) => ({
      ...tile,
      polygon: [],
    }));
    setFinalizedMappingTileIds((currentTileIds) =>
      currentTileIds.filter((tileId) => tileId !== selectedMappingTile.tileId),
    );
    setMappingExportMessage(`Polygone réinitialisé pour ${selectedMappingTile.tileId}.`);
  };

  const finalizeSelectedMappingTilePolygon = () => {
    if (!selectedMappingTile) {
      return;
    }

    if (selectedMappingTile.polygon.length < 3) {
      setMappingExportMessage('Ajoutez au moins 3 points avant de fermer le polygone.');
      return;
    }

    setFinalizedMappingTileIds((currentTileIds) =>
      currentTileIds.includes(selectedMappingTile.tileId)
        ? currentTileIds
        : [...currentTileIds, selectedMappingTile.tileId],
    );
    setMappingExportMessage(`Polygone finalisé pour ${selectedMappingTile.tileId}.`);
  };

  const reopenSelectedMappingTilePolygon = () => {
    if (!selectedMappingTile) {
      return;
    }

    setFinalizedMappingTileIds((currentTileIds) =>
      currentTileIds.filter((tileId) => tileId !== selectedMappingTile.tileId),
    );
    setMappingExportMessage(`Édition du polygone reprise pour ${selectedMappingTile.tileId}.`);
  };

  const copyBoardMapExport = async () => {
    try {
      await navigator.clipboard.writeText(boardMapExport);
      setMappingExportMessage('Le contenu mis à jour de board_map_final.json a été copié dans le presse-papiers.');
    } catch {
      setMappingExportMessage("Impossible de copier automatiquement le JSON. Utilisez la zone d'export ci-dessous.");
    }
  };

  const downloadBoardMapExport = () => {
    const exportBlob = new Blob([boardMapExport], { type: 'application/json' });
    const exportUrl = window.URL.createObjectURL(exportBlob);
    const exportLink = document.createElement('a');
    exportLink.href = exportUrl;
    exportLink.download = 'board_map_final.json';
    exportLink.click();
    window.URL.revokeObjectURL(exportUrl);
    setMappingExportMessage('Le fichier board_map_final.json a été exporté.');
  };

  const logTileInteraction = (tile: Tile, source: 'inspection' | 'destination') => {
    if (!ENABLE_TILE_DEBUG || !isDeveloperMode) {
      return;
    }

    console.info(`[board-debug:${source}] tileId=${tile.tileId} label="${tile.label}" type=${tile.type}`);
  };

  const flashClickedTile = (tileId: string) => {
    if (debugFlashTimeoutRef.current) {
      window.clearTimeout(debugFlashTimeoutRef.current);
    }

    setDebugFlashTileId(tileId);
    debugFlashTimeoutRef.current = window.setTimeout(() => {
      setDebugFlashTileId((currentTileId) => (currentTileId === tileId ? null : currentTileId));
    }, TILE_DEBUG_FLASH_DURATION_MS);
  };

  const inspectTile = (tile: Tile, source: 'inspection' | 'destination' = 'inspection') => {
    setInspectedTileId(tile.tileId);
    logTileInteraction(tile, source);

    if (isDeveloperMode && isTileDebugEnabled) {
      setTileDebugState({
        tileId: tile.tileId,
        label: tile.label,
        type: tile.type,
        source,
      });
      flashClickedTile(tile.tileId);
    }
  };

  const getBoundTileId = (event: MouseEvent<SVGPolygonElement> | KeyboardEvent<SVGPolygonElement>) =>
    event.currentTarget.dataset.tileId ?? null;

  const getTileFromBoundShape = (
    event: MouseEvent<SVGPolygonElement> | KeyboardEvent<SVGPolygonElement>,
  ) => {
    const tileId = getBoundTileId(event);

    if (!tileId) {
      return null;
    }

    return BOARD_BY_TILE_ID.get(tileId) ?? null;
  };

  const handleTileShapeClick = (event: MouseEvent<SVGPolygonElement>) => {
    const tile = getTileFromBoundShape(event);

    if (!tile) {
      return;
    }

    if (isChoosingDestination) {
      handleDestinationSelection(tile.tileId);
      return;
    }

    inspectTile(tile, 'inspection');
  };

  const handleTileShapeKeyDown = (event: KeyboardEvent<SVGPolygonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();

    const tile = getTileFromBoundShape(event);

    if (!tile) {
      return;
    }

    if (isChoosingDestination) {
      handleDestinationSelection(tile.tileId);
      return;
    }

    inspectTile(tile, 'inspection');
  };

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
    if (dieSettlingTimeoutRef.current) {
      window.clearTimeout(dieSettlingTimeoutRef.current);
      dieSettlingTimeoutRef.current = null;
    }

    setPlayerDrafts([
      { name: '', avatarId: PLAYER_AVATARS[0].id },
      { name: '', avatarId: PLAYER_AVATARS[1].id },
    ]);
    setAllowAvatarReuse(false);
    setSelectedTrainingMode(null);
    setSelectedPieceId('');
    setSaleValue(SALE_VALUES[0]);
    setDisplayRoll(null);
    setIsRolling(false);
    setIsDieSettling(false);
    setInspectedTileId(null);
    setIsTileDebugEnabled(false);
    setTileDebugState(null);
    setDebugFlashTileId(null);
    setIsBoardMappingMode(false);
    setGame(createInitialState());
  };

  const launchGame = () => {
    const playersDraft = playerDrafts
      .map((draft) => ({
        name: draft.name.trim(),
        avatarId: draft.avatarId || DEFAULT_AVATAR_ID,
      }))
      .filter((draft) => Boolean(draft.name));

    if (playersDraft.length < 2) {
      setGame((currentGame) => ({
        ...currentGame,
        history: appendHistoryEntry(currentGame.history, 'Ajoutez au moins 2 joueurs pour démarrer.'),
      }));
      return;
    }

    if (!allowAvatarReuse) {
      const selectedAvatarIds = playersDraft.map((draft) => draft.avatarId);
      const uniqueAvatarCount = new Set(selectedAvatarIds).size;
      if (uniqueAvatarCount !== selectedAvatarIds.length) {
        setGame((currentGame) => ({
          ...currentGame,
          history: appendHistoryEntry(
            currentGame.history,
            'Chaque joueur doit avoir un avatar unique (ou activez les doublons).',
          ),
        }));
        return;
      }
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

    const players = playersDraft.map<Player>((draft) => ({
      id: uid(),
      name: draft.name,
      avatarId: draft.avatarId,
      position: BOARD_REGISTRY[0].tileId,
      clients: INITIAL_CLIENTS,
      pieces: [],
      rollsTaken: 0,
    }));

    setDisplayRoll(null);
    setInspectedTileId(board[0]?.tileId ?? null);
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
      activeChanceCard: null,
      hasMentionsLegalesTile: false,
      playersWhoLeftStart: [],
      validatedLegalMentions: [],
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
    if (dieSettlingTimeoutRef.current) {
      window.clearTimeout(dieSettlingTimeoutRef.current);
      dieSettlingTimeoutRef.current = null;
    }

    setIsRolling(true);
    setIsDieSettling(false);
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
      const originTile = BOARD_BY_TILE_ID.get(currentPlayer.position);
      if (originTile) {
        inspectTile(originTile);
      }
      setIsRolling(false);
      setIsDieSettling(true);
      dieSettlingTimeoutRef.current = window.setTimeout(() => {
        setIsDieSettling(false);
        dieSettlingTimeoutRef.current = null;
      }, 340);
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

  const handleDestinationSelection = (tileId: string) => {
    if (!game.pendingMovement) {
      return;
    }

    const tile = BOARD_BY_TILE_ID.get(tileId);
    if (tile) {
      inspectTile(tile, 'destination');
    }

    setGame((currentGame) => {
      const pendingMovement = currentGame.pendingMovement;
      if (!pendingMovement || !pendingMovement.reachableTileIds.includes(tileId)) {
        return currentGame;
      }

      const player = currentGame.players.find((candidate) => candidate.id === pendingMovement.playerId);
      const tile = BOARD_BY_TILE_ID.get(tileId);
      const currentMentionsLegalesState =
        currentGame.hasMentionsLegalesTile ||
        haveAllPlayersLeftStart(currentGame.players, currentGame.playersWhoLeftStart);
      const tilePresentation = tile
        ? getTilePresentation(tile, currentGame.trainingMode, currentMentionsLegalesState)
        : null;

      if (!player || !tile) {
        return { ...currentGame, pendingMovement: null };
      }

      const playerLeftStart =
        pendingMovement.originTileId === START_TILE_ID && tileId !== START_TILE_ID;
      const updatedPlayersWhoLeftStart = playerLeftStart
        ? [...new Set([...currentGame.playersWhoLeftStart, player.id])]
        : currentGame.playersWhoLeftStart;
      const hasMentionsLegalesTile =
        currentGame.hasMentionsLegalesTile ||
        haveAllPlayersLeftStart(currentGame.players, updatedPlayersWhoLeftStart);

      const movedPlayers = currentGame.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, position: tileId, rollsTaken: candidate.rollsTaken + 1 }
          : candidate,
      );
      const triggeredObjectionCard =
        (tile.type === 'bubble' || tile.type === 'objection') && currentGame.trainingMode === 'objections'
          ? drawRandomObjectionCard(currentGame.activeObjectionCard?.id)
          : null;
      const triggeredChanceCard =
        tile.type === 'chance' ? drawRandomChanceCard(currentGame.activeChanceCard?.id) : null;

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
        ? `${player.name} choisit ${tilePresentation?.title ?? tile.label} comme destination après un ${pendingMovement.roll}. Carte tirée : « ${triggeredObjectionCard.title} ».`
        : triggeredChanceCard
          ? `${player.name} choisit ${tilePresentation?.title ?? tile.label} comme destination après un ${pendingMovement.roll}. Carte Chance tirée : « ${triggeredChanceCard.title} ».`
        : `${player.name} choisit ${tilePresentation?.title ?? tile.label} comme destination après un ${pendingMovement.roll}.`;

      return {
        ...currentGame,
        players: movedPlayers,
        hasMentionsLegalesTile,
        playersWhoLeftStart: updatedPlayersWhoLeftStart,
        pendingMovement: null,
        pendingAction: {
          tile,
          playerId: player.id,
          roll: pendingMovement.roll,
        },
        activeObjectionCard: currentGame.trainingMode === 'objections' ? triggeredObjectionCard ?? currentGame.activeObjectionCard : null,
        activeChanceCard: triggeredChanceCard ?? currentGame.activeChanceCard,
        history: appendHistoryEntry(currentGame.history, destinationMessage),
      };
    });
  };

  const resolvePendingAction = (isValidated: boolean) => {
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
        currentGame.hasMentionsLegalesTile ||
          haveAllPlayersLeftStart(currentGame.players, currentGame.playersWhoLeftStart),
      );

      if (!isValidated) {
        return resolveTurn(
          currentGame,
          currentGame.players,
          currentGame.centralBank,
          `${player?.name ?? 'Le joueur'} ne valide pas la case ${pendingTilePresentation.title}.`,
        );
      }

      const pendingAction = currentGame.pendingAction;
      if (!pendingAction) {
        return currentGame;
      }

      if (!player) {
        return { ...currentGame, pendingMovement: null, pendingAction: null };
      }

      let players = currentGame.players;
      let centralBank = currentGame.centralBank;
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

      const isMentionsLegalesTile =
        pendingAction.tile.tileId === START_TILE_ID &&
        (currentGame.hasMentionsLegalesTile ||
          haveAllPlayersLeftStart(currentGame.players, currentGame.playersWhoLeftStart));
      if (isMentionsLegalesTile) {
        if (selectedLegalMentionId !== null && !currentGame.validatedLegalMentions.includes(selectedLegalMentionId)) {
          message = `${player.name} cite correctement une mention légale (n°${selectedLegalMentionId}).`;
          return resolveTurn(
            {
              ...currentGame,
              validatedLegalMentions: [...currentGame.validatedLegalMentions, selectedLegalMentionId],
            },
            players,
            centralBank,
            message,
          );
        }

        message = `${player.name} valide la case Mentions légales.`;
      }

      return resolveTurn(currentGame, players, centralBank, message);
    });
  };

  const revealChanceAnswer = (decision: 'validated' | 'rejected') => {
    if (!game.pendingAction || game.pendingAction.tile.type !== 'chance' || !game.activeChanceCard) {
      return;
    }

    if (isChanceAnswerRevealed || isChanceCardFlipping) {
      return;
    }

    if (chanceRevealTimeoutRef.current) {
      window.clearTimeout(chanceRevealTimeoutRef.current);
      chanceRevealTimeoutRef.current = null;
    }

    setChanceAnswerDecision(decision);
    setIsChanceCardFlipping(true);
    chanceRevealTimeoutRef.current = window.setTimeout(() => {
      setIsChanceCardShowingBack(true);

      chanceRevealTimeoutRef.current = window.setTimeout(() => {
        setIsChanceAnswerRevealed(true);
        setIsChanceCardFlipping(false);
        chanceRevealTimeoutRef.current = null;
      }, 280);
    }, 280);
  };

  const handleValidatedAction = () => {
    if (game.pendingAction?.tile.type === 'chance') {
      revealChanceAnswer('validated');
      return;
    }

    resolvePendingAction(true);
  };

  const handleRejectedAction = () => {
    if (game.pendingAction?.tile.type === 'chance') {
      revealChanceAnswer('rejected');
      return;
    }

    resolvePendingAction(false);
  };

  const handleDepartContinue = () => {
    setGame((currentGame) => {
      const pendingAction = currentGame.pendingAction;
      if (!pendingAction || pendingAction.tile.tileId !== START_TILE_ID) {
        return currentGame;
      }

      const player = currentGame.players.find((candidate) => candidate.id === pendingAction.playerId);
      return resolveTurn(
        currentGame,
        currentGame.players,
        currentGame.centralBank,
        `${player?.name ?? 'Le joueur'} passe par Départ.`,
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

  const handleRevealObjectionCard = () => {
    if (!game.activeObjectionCard || isObjectionCardRevealed || isObjectionCardFlipping) {
      return;
    }

    if (objectionRevealTimeoutRef.current) {
      window.clearTimeout(objectionRevealTimeoutRef.current);
      objectionRevealTimeoutRef.current = null;
    }

    setIsObjectionCardFlipping(true);
    objectionRevealTimeoutRef.current = window.setTimeout(() => {
      setIsObjectionCardShowingBack(true);

      objectionRevealTimeoutRef.current = window.setTimeout(() => {
        setIsObjectionCardRevealed(true);
        setIsObjectionCardFlipping(false);
        objectionRevealTimeoutRef.current = null;
      }, 280);
    }, 280);
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

  const drawChanceCard = () => {
    setGame((currentGame) => {
      const card = drawRandomChanceCard(currentGame.activeChanceCard?.id);

      if (!card) {
        return currentGame;
      }

      return {
        ...currentGame,
        activeChanceCard: card,
        history: appendHistoryEntry(currentGame.history, `Nouvelle carte Chance tirée : « ${card.title} »`),
      };
    });
  };

  const pendingActionTilePresentation = game.pendingAction
    ? getTilePresentation(game.pendingAction.tile, game.trainingMode, isMentionsLegalesActive)
    : null;
  const mentionsLegalesInAction = game.pendingAction?.tile.tileId === START_TILE_ID && isMentionsLegalesActive;
  const validatedMentions = LEGAL_MENTIONS.filter((mention) => game.validatedLegalMentions.includes(mention.id));
  const remainingMentions = LEGAL_MENTIONS.filter((mention) => !game.validatedLegalMentions.includes(mention.id));
  const canInspectObjectionCard = Boolean(game.activeObjectionCard);
  const objectionFrontImageSource = objectionsDeckFaceImage;
  const objectionBackImageSource = game.activeObjectionCard?.image ?? null;
  const displayedObjectionImageSource = isObjectionCardShowingBack ? objectionBackImageSource : objectionFrontImageSource;
  const displayedChanceImageSource = isChanceCardShowingBack
    ? game.activeChanceCard?.backImage ?? null
    : game.activeChanceCard?.frontImage ?? null;
  const winner = game.players.find((player) => player.id === game.winnerId) ?? null;
  const focusTileActionLabel = isChoosingDestination && reachableTileIds.includes(focusTile.tileId)
    ? 'Case atteignable ce tour : cliquez pour la choisir comme destination.'
    : getResolvedActionSummary(focusTile, game.trainingMode);

  const boardMapValidation = useMemo(() => {
    const expectedLabels: Record<string, string> = {
      T11: 'IZI Confort',
      T13: 'Assistance Dépannage',
      T15: 'IZI by EDF',
      T22: 'Bulle jaune bas droite',
      T8: 'Bulle rose haut droite',
      T12: 'Bulle rouge bas',
      T16: 'Bulle orange gauche',
      T19: 'Bulle verte haut gauche',
    };

    return Object.entries(expectedLabels).map(([tileId, expectedLabel]) => {
      const tile = BOARD_BY_TILE_ID.get(tileId);
      const boardMapTile = BOARD_MAP_TILE_LOOKUP.get(tileId);
      const isBubbleValidation = ['T8', 'T12', 'T16', 'T19', 'T22'].includes(tileId);

      return {
        tileId,
        expectedLabel,
        actualLabel: tile?.label ?? null,
        passed:
          tile?.label === expectedLabel &&
          Boolean(boardMapTile) &&
          (!isBubbleValidation || tile?.type === 'bubble'),
      };
    });
  }, []);

  const boardTiles = board.map((tile) => {
    const shape = tile.shape;
    const occupants = game.players.filter((player) => player.position === tile.tileId);
    const tilePresentation = getTilePresentation(tile, game.trainingMode, isMentionsLegalesActive);
    const tileLabel = tile.label;
    const isFocused = tile.tileId === focusTile.tileId;
    const isSelectedTile = tile.tileId === game.pendingAction?.tile.tileId;
    const isCurrentPlayerTile = tile.tileId === currentPlayer?.position;
    const isReachable = reachableTileIds.includes(tile.tileId);
    const isDisabled = isChoosingDestination && !isReachable;
    const isDebugFlashing = tile.tileId === debugFlashTileId;
    const visualPoints = insetPolygonPoints(shape.points, isReachable ? 1.1 : 0.95);
    const outlinePoints = insetPolygonPoints(shape.points, 0.5);
    const hitPoints = shape.points;
    const labelAnchor = getPolygonCentroid(shape.points);

    return {
      tile,
      shape,
      occupants,
      tilePresentation,
      tileLabel,
      isFocused,
      isSelectedTile,
      isCurrentPlayerTile,
      isReachable,
      isDisabled,
      isDebugFlashing,
      visualPoints,
      outlinePoints,
      hitPoints,
      labelAnchor,
    };
  });

  const debugAnchorTile = isDeveloperMode && isTileDebugEnabled && inspectedTileId
    ? boardTiles.find(({ tile }) => tile.tileId === inspectedTileId) ?? null
    : null;

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-main">
          <div className="hero-brand">
            <div className="edf-logo-slot">
              <img src={edfOfficialLogo} alt="EDF" className="edf-logo" />
            </div>
            <div>
              <p className="eyebrow">Plateau interactif</p>
              <h1>Monopoly des Services</h1>
            </div>
          </div>
          <p className="hero-copy">
              Une version digitale fidèle au tapis de jeu d’origine&nbsp;: le plateau reste au centre de l’expérience, les déplacements sont lisibles et chaque case guide clairement l’animation de la partie.
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
              onClick={() =>
                setPlayerDrafts((current) => [
                  ...current,
                  {
                    name: '',
                    avatarId: PLAYER_AVATARS[current.length % PLAYER_AVATARS.length].id,
                  },
                ])
              }
              disabled={playerDrafts.length >= 4}
            >
              Ajouter un joueur
            </button>
          </div>
          <div className="setup-grid">
            {playerDrafts.map((draft, index) => (
              <div className="player-setup-card" key={`player-${index}`}>
                <label className="field">
                  <span>Joueur {index + 1}</span>
                  <input
                    value={draft.name}
                    onChange={(event) => {
                      setPlayerDrafts((current) =>
                        current.map((currentDraft, currentIndex) =>
                          currentIndex === index ? { ...currentDraft, name: event.target.value } : currentDraft,
                        ),
                      );
                    }}
                    placeholder={`Nom du joueur ${index + 1}`}
                  />
                </label>
                <div className="field">
                  <span>Avatar</span>
                  <div className="avatar-picker" role="radiogroup" aria-label={`Avatar joueur ${index + 1}`}>
                    {PLAYER_AVATARS.map((avatar) => {
                      const isTakenByAnotherPlayer =
                        !allowAvatarReuse &&
                        playerDrafts.some(
                          (playerDraft, playerDraftIndex) =>
                            playerDraftIndex !== index && playerDraft.avatarId === avatar.id,
                        );
                      const isSelected = draft.avatarId === avatar.id;

                      return (
                        <button
                          type="button"
                          key={avatar.id}
                          className={`avatar-option ${isSelected ? 'avatar-option-selected' : ''}`}
                          onClick={() => {
                            setPlayerDrafts((current) =>
                              current.map((currentDraft, currentIndex) =>
                                currentIndex === index ? { ...currentDraft, avatarId: avatar.id } : currentDraft,
                              ),
                            );
                          }}
                          disabled={isTakenByAnotherPlayer}
                          aria-pressed={isSelected}
                          title={
                            isTakenByAnotherPlayer
                              ? `${avatar.label} déjà sélectionné`
                              : `Choisir ${avatar.label}`
                          }
                        >
                          <span aria-hidden="true">{avatar.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <label className="avatar-reuse-toggle">
            <input
              type="checkbox"
              checked={allowAvatarReuse}
              onChange={(event) => setAllowAvatarReuse(event.target.checked)}
            />
            <span>Autoriser les doublons d’avatar</span>
          </label>

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
                {isDeveloperMode && ENABLE_TILE_DEBUG && (
                  <button
                    type="button"
                    className={`secondary-button board-debug-toggle ${
                      isTileDebugEnabled ? 'board-debug-toggle-active' : ''
                    }`}
                    aria-pressed={isTileDebugEnabled}
                    onClick={() => {
                      setIsTileDebugEnabled((currentValue) => {
                        const nextValue = !currentValue;

                        if (!nextValue) {
                          setTileDebugState(null);
                          setDebugFlashTileId(null);
                          if (debugFlashTimeoutRef.current) {
                            window.clearTimeout(debugFlashTimeoutRef.current);
                          }
                        }

                        return nextValue;
                      });
                    }}
                  >
                    Debug clic {isTileDebugEnabled ? 'activé' : 'désactivé'}
                  </button>
                )}
                {isDeveloperMode && (
                  <div className={`status-chip ${BOARD_REGISTRY_ISSUES.length > 0 ? 'status-chip-warning' : ''}`}>
                    {BOARD_REGISTRY_ISSUES.length > 0
                      ? `${BOARD_REGISTRY_ISSUES.length} alerte(s) registre`
                      : `${board.length} cases jouables`}
                  </div>
                )}
                {game.trainingMode && (
                  <div className="status-chip status-chip-mode">{trainingModeLabels[game.trainingMode]}</div>
                )}
                <div className="board-bank">Banque centrale : {game.centralBank} clients</div>
              </div>
            </div>

            {isDeveloperMode && ENABLE_TILE_DEBUG && isTileDebugEnabled && (
              <details className="developer-panel">
                <summary>Developer section · Board Mapping Mode</summary>
                <div className="developer-panel-body">
                  <p className="developer-panel-copy">
                    Outil développeur masqué en lecture normale : sélectionnez une tuile du fichier
                    <code> board_map_final.json </code>
                    puis cliquez sur le plateau pour inspecter ou ajuster localement le polygone et le tokenAnchor.
                  </p>
                  <label className="developer-toggle">
                    <input
                      type="checkbox"
                      checked={isBoardMappingMode}
                      onChange={(event) => setIsBoardMappingMode(event.target.checked)}
                    />
                    <span>Activer Board Mapping Mode</span>
                  </label>

                  {isBoardMappingMode && (
                    <div className="developer-controls-grid">
                    <label className="field">
                      <span>Tuile à mapper</span>
                      <select
                        value={selectedMappingTileId}
                        onChange={(event) => setSelectedMappingTileId(event.target.value)}
                      >
                        {boardMapDraft.tiles.map((tile) => (
                          <option key={tile.tileId} value={tile.tileId}>
                            {tile.tileId} · {tile.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <fieldset className="mapping-toolset">
                      <legend>Mode de clic</legend>
                      <label className="mapping-tool-option">
                        <input
                          type="radio"
                          name="mapping-tool"
                          checked={mappingTool === 'polygon'}
                          onChange={() => setMappingTool('polygon')}
                        />
                        <span>Ajouter des points de polygone</span>
                      </label>
                      <label className="mapping-tool-option">
                        <input
                          type="radio"
                          name="mapping-tool"
                          checked={mappingTool === 'anchor'}
                          onChange={() => setMappingTool('anchor')}
                        />
                        <span>Définir ou déplacer le tokenAnchor</span>
                      </label>
                    </fieldset>

                    <div className="mapping-button-row">
                      <button type="button" className="secondary-button" onClick={resetSelectedMappingTilePolygon}>
                        Réinitialiser le polygone
                      </button>
                      <button type="button" className="secondary-button" onClick={finalizeSelectedMappingTilePolygon}>
                        Fermer / finaliser
                      </button>
                      <button type="button" className="secondary-button" onClick={reopenSelectedMappingTilePolygon}>
                        Reprendre le polygone
                      </button>
                      <button type="button" className="secondary-button" onClick={copyBoardMapExport}>
                        Copier le JSON
                      </button>
                      <button type="button" className="secondary-button" onClick={downloadBoardMapExport}>
                        Exporter board_map_final.json
                      </button>
                    </div>

                    <p className="developer-status-line">
                      {mappingExportMessage ||
                        (mappingTool === 'anchor'
                          ? 'Cliquez sur le plateau pour positionner le tokenAnchor.'
                          : 'Cliquez sur le plateau pour ajouter des points au polygone courant.')}
                    </p>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div
              className={`board-stage-layout board-stage-layout-chance ${
                isDeveloperMode && isBoardMappingMode ? 'board-stage-layout-mapping' : ''
              }`}
            >
              <aside className="deck-stack-column">
                <section className="deck-sidecar deck-panel deck-sidecar-compact">
                  <div className="deck-sidecar-header">
                    <div>
                      <p className="eyebrow">Pioche</p>
                      <h3>Deck Chance</h3>
                    </div>
                    <button className="secondary-button" onClick={drawChanceCard}>
                      {game.activeChanceCard ? 'Changer la carte' : 'Préparer une carte'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="objections-deck-pile objections-deck-pile-large chance-deck-pile"
                    onClick={drawChanceCard}
                    aria-label="Piocher une carte Chance"
                  >
                    <span className="objections-deck-shadow objections-deck-shadow-back" aria-hidden="true" />
                    <span className="objections-deck-shadow objections-deck-shadow-mid" aria-hidden="true" />
                    <span className="objections-deck-top-card">
                      <img
                        src={chanceThermostatBackImage}
                        alt="Dos d'une carte Chance"
                      />
                    </span>
                  </button>
                </section>

                {game.trainingMode === 'objections' && (
                  <section className="deck-sidecar deck-panel deck-sidecar-compact">
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
                        <img src={objectionFrontImageSource} alt="Dos du deck Objections" />
                      </span>
                    </button>
                  </section>
                )}
              </aside>

              <div className="board-frame">
                <div
                  className={`board-surface ${isDeveloperMode && isBoardMappingMode ? 'board-surface-mapping' : ''}`}
                  ref={boardSurfaceRef}
                >
                  <img src={boardImageSource} alt="Plateau Monopoly des Services" className="board-base-image" />
                  <div className="board-image-shade" />

                  <svg
                    className="board-token-layer"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {boardTiles.map(({ tile, shape, occupants }) =>
                      occupants.map((player, occupantIndex) => {
                        const playerIndex = game.players.findIndex((entry) => entry.id === player.id);
                        const offset = getTokenOffset(occupantIndex, occupants.length);
                        const tokenCenterX = shape.tokenAnchor.x + offset.x;
                        const tokenCenterY = shape.tokenAnchor.y + offset.y;

                        return (
                          <g
                            className="board-player-token"
                            key={`${tile.tileId}-${player.id}`}
                            transform={`translate(${tokenCenterX} ${tokenCenterY})`}
                            style={{ color: PLAYER_TOKEN_COLORS[playerIndex % PLAYER_TOKEN_COLORS.length] }}
                          >
                            <title>
                              {player.name} · {getAvatarById(player.avatarId).label}
                            </title>
                            <circle className="board-player-token-shadow" r={TOKEN_RADIUS + 0.26} cy={0.5} />
                            <circle className="board-player-token-body" r={TOKEN_RADIUS} />
                            <circle className="board-player-token-gloss" r={TOKEN_RADIUS * 0.74} cx={-0.5} cy={-0.72} />
                            <circle className="board-player-token-ring" r={TOKEN_RADIUS + 0.34} />
                            <text
                              className="board-player-token-label"
                              textAnchor="middle"
                              dominantBaseline="central"
                            >
                              {getAvatarById(player.avatarId).symbol}
                            </text>
                          </g>
                        );
                      }),
                    )}
                    {debugAnchorTile && (
                      <g
                        className="board-token-anchor-debug"
                        transform={`translate(${debugAnchorTile.shape.tokenAnchor.x} ${debugAnchorTile.shape.tokenAnchor.y})`}
                      >
                        <circle className="board-token-anchor-debug-ring" r={TOKEN_RADIUS + 0.9} />
                        <circle className="board-token-anchor-debug-center" r={TOKEN_DEBUG_MARKER_RADIUS} />
                        <line x1={-(TOKEN_RADIUS + 1.35)} y1={0} x2={TOKEN_RADIUS + 1.35} y2={0} />
                        <line x1={0} y1={-(TOKEN_RADIUS + 1.35)} x2={0} y2={TOKEN_RADIUS + 1.35} />
                      </g>
                    )}
                  </svg>

                  <svg
                    className={`board-overlay-svg ${isDeveloperMode && isBoardMappingMode ? 'board-overlay-svg-passive' : ''}`}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-label="Cases du plateau"
                  >
                    {boardTiles.map(
                      ({
                        tile,
                        isCurrentPlayerTile,
                        isDebugFlashing,
                        isDisabled,
                        isFocused,
                        isReachable,
                        isSelectedTile,
                        hitPoints,
                        labelAnchor,
                        outlinePoints,
                        tileLabel,
                        tilePresentation,
                        visualPoints,
                      }) => {
                        const interactiveTitle = `${tileLabel} · ${tilePresentation.description}`;
                        const canSelectDestination = isChoosingDestination && isReachable;

                        return (
                          <g
                            key={tile.tileId}
                            data-tile-id={tile.tileId}
                            className={`board-space-group tile-${tile.type} tile-color-${tile.color ?? 'neutral'} ${
                              isFocused ? 'board-space-focused' : ''
                            } ${isSelectedTile ? 'board-space-selected' : ''} ${
                              isCurrentPlayerTile ? 'board-space-current' : ''
                            } ${isReachable ? 'board-space-reachable' : ''} ${
                              isDebugFlashing ? 'board-space-debug-flash' : ''
                            } ${
                              isDisabled ? 'board-space-disabled' : ''
                            }`}
                          >
                            <polygon className="board-space-shape" points={visualPoints} data-tile-id={tile.tileId} />
                            <polygon
                              className="board-space-outline"
                              points={outlinePoints}
                              data-tile-id={tile.tileId}
                            />
                            {tile.type === 'bubble' && tilePresentation.identityLabel && (
                              <>
                                <clipPath id={`bubble-label-clip-${tile.tileId}`}>
                                  <polygon points={visualPoints} />
                                </clipPath>
                                <g
                                  aria-hidden="true"
                                  className="board-space-bubble-badge"
                                  clipPath={`url(#bubble-label-clip-${tile.tileId})`}
                                  transform={`translate(${labelAnchor.x} ${labelAnchor.y})`}
                                >
                                  <ellipse className="board-space-bubble-badge-fill" rx={5.9} ry={3.65} />
                                  <ellipse className="board-space-bubble-badge-ring" rx={5.9} ry={3.65} />
                                  <text className="board-space-objection-label" textAnchor="middle">
                                    {game.trainingMode === 'objections' ? (
                                      <>
                                        <tspan x="0" dy="-0.46em">Object</tspan>
                                        <tspan x="0" dy="1.02em">ion</tspan>
                                      </>
                                    ) : (
                                      <tspan x="0" dy="0.32em">{tilePresentation.identityLabel}</tspan>
                                    )}
                                  </text>
                                </g>
                              </>
                            )}
                            <polygon
                              className="board-space-hit"
                              points={hitPoints}
                              role="button"
                              tabIndex={isDisabled ? -1 : 0}
                              aria-disabled={isDisabled}
                              data-tile-id={tile.tileId}
                              aria-label={`${tileLabel}. ${
                                canSelectDestination ? 'Destination atteignable.' : tilePresentation.description
                              }`}
                              onClick={handleTileShapeClick}
                              onKeyDown={handleTileShapeKeyDown}
                            >
                              <title>{interactiveTitle}</title>
                            </polygon>
                          </g>
                        );
                      },
                    )}
                  </svg>

                    {isDeveloperMode && isBoardMappingMode && (
                    <>
                      <div
                        className="board-mapping-capture"
                        onClick={handleBoardMappingClick}
                        aria-hidden="true"
                      />
                      <svg
                        className="board-mapping-svg"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-label="Board Mapping Mode"
                      >
                        {mappingTiles.map((tile) => {
                          const isSelectedTile = tile.tileId === selectedMappingTile?.tileId;
                          const isFinalized = finalizedMappingTileIds.includes(tile.tileId);
                          const hasPolygon = tile.polygon.length >= 3;
                          const hasPath = tile.polygon.length >= 2;
                          const renderedPoints = tile.polygonPoints;

                          return (
                            <g
                              key={`mapping-${tile.tileId}`}
                              className={`board-mapping-group ${isSelectedTile ? 'board-mapping-group-selected' : ''}`}
                            >
                              {hasPolygon && (
                                <polygon
                                  className={`board-mapping-polygon ${
                                    isFinalized ? 'board-mapping-polygon-finalized' : ''
                                  }`}
                                  points={renderedPoints}
                                />
                              )}
                              {!hasPolygon && hasPath && (
                                <polyline className="board-mapping-polyline" points={renderedPoints} />
                              )}
                              {tile.polygon.map((point, index) => (
                                <g key={`${tile.tileId}-point-${index}`}>
                                  <circle
                                    className="board-mapping-point"
                                    cx={point.x}
                                    cy={point.y}
                                    r={isSelectedTile ? 0.7 : 0.45}
                                  />
                                  {isSelectedTile && (
                                    <text className="board-mapping-point-label" x={point.x + 0.9} y={point.y - 0.9}>
                                      {index + 1}
                                    </text>
                                  )}
                                </g>
                              ))}
                              <g className="board-mapping-anchor">
                                <circle cx={tile.tokenAnchor.x} cy={tile.tokenAnchor.y} r={isSelectedTile ? 1 : 0.65} />
                                <line
                                  x1={tile.tokenAnchor.x - 1.35}
                                  y1={tile.tokenAnchor.y}
                                  x2={tile.tokenAnchor.x + 1.35}
                                  y2={tile.tokenAnchor.y}
                                />
                                <line
                                  x1={tile.tokenAnchor.x}
                                  y1={tile.tokenAnchor.y - 1.35}
                                  x2={tile.tokenAnchor.x}
                                  y2={tile.tokenAnchor.y + 1.35}
                                />
                              </g>
                            </g>
                          );
                        })}
                      </svg>
                    </>
                  )}

                  <aside className="board-focus-card" aria-live="polite">
                    <p className="eyebrow board-focus-eyebrow">Lecture du plateau</p>
                    <div className="board-focus-main">
                      <div className="board-focus-copy">
                        <h3>{focusTilePresentation.title}</h3>
                        <p>{focusTilePresentation.description}</p>
                        <p className="board-focus-action">{focusTileActionLabel}</p>
                      </div>
                    </div>
                  </aside>

                  {isDeveloperMode && ENABLE_TILE_DEBUG && isTileDebugEnabled && tileDebugState && (
                    <aside className="board-debug-card" aria-live="polite">
                      <p className="eyebrow board-debug-eyebrow">Debug clic</p>
                      <div className="board-debug-main">
                        <p className="board-debug-source">Source · {tileDebugState.source}</p>
                        <p className="board-debug-line">tileId · {tileDebugState.tileId}</p>
                        <p className="board-debug-line">label · {tileDebugState.label}</p>
                        <p className="board-debug-line">type · {tileTypeLabels[tileDebugState.type]}</p>
                      </div>
                      <div className="board-debug-validation">
                        <strong>Validation board_map_final.json</strong>
                        <ul>
                          {boardMapValidation.map((entry) => (
                            <li key={entry.tileId}>
                              {entry.passed ? '✓' : '⚠'} {entry.tileId} → {entry.actualLabel ?? 'introuvable'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </aside>
                  )}
                </div>
              </div>

              {isDeveloperMode && isBoardMappingMode && selectedMappingTile && (
                <aside className="board-mapping-panel panel">
                  <p className="eyebrow">Board Mapping Mode</p>
                  <h3>
                    {selectedMappingTile.tileId} · {selectedMappingTile.label}
                  </h3>
                  <p>
                    Mode de clic :{' '}
                    <strong>
                      {mappingTool === 'anchor' ? 'tokenAnchor' : 'points de polygone'}
                    </strong>
                  </p>
                  <p>
                    État du polygone :{' '}
                    <strong>{isSelectedMappingTileFinalized ? 'finalisé' : 'en cours d’édition'}</strong>
                  </p>
                  <div className="mapping-data-block">
                    <strong>polygon points</strong>
                    <pre>{selectedMappingTile.polygon.length > 0 ? JSON.stringify(selectedMappingTile.polygon, null, 2) : '[]'}</pre>
                  </div>
                  <div className="mapping-data-block">
                    <strong>tokenAnchor</strong>
                    <pre>{JSON.stringify(selectedMappingTile.tokenAnchor, null, 2)}</pre>
                  </div>
                  <div className="mapping-data-block">
                    <strong>Export JSON</strong>
                    <textarea readOnly value={boardMapExport} rows={12} />
                  </div>
                </aside>
              )}
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
                      ? 'Choisissez votre prochaine case parmi les emplacements mis en évidence.'
                      : currentPlayer
                        ? 'Lancez le dé puis sélectionnez une destination atteignable sur le plateau.'
                        : 'Configurez une partie pour commencer.'}
                  </p>
                  {game.trainingMode && <p>Mode : {trainingModeLabels[game.trainingMode]}</p>}
                </div>
                <DieFace value={displayRoll} isRolling={isRolling} isSettling={isDieSettling} />
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
                      Départ : {pendingMovementOriginTile?.label ?? 'case actuelle'} · {game.pendingMovement.roll} déplacement
                      {game.pendingMovement.roll > 1 ? 's' : ''} possible
                      {game.pendingMovement.roll > 1 ? 's' : ''}.
                    </span>
                  </div>
                )}
                {game.pendingAction && (
                  <div className="turn-helper">
                    <strong>
                      Destination choisie :{' '}
                      {pendingActionTilePresentation?.title ?? game.pendingAction.tile.label}
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
                        {getAvatarById(player.avatarId).symbol}
                      </span>
                      <div>
                        <h3>{player.name}</h3>
                        <p>{BOARD_BY_TILE_ID.get(player.position)?.label ?? 'Case actuelle'}</p>
                      </div>
                    </div>
                    <div className="score-stats">
                      <strong>{player.clients} clients</strong>
                      <span>{player.pieces.length} pièce(s) service</span>
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
            <h2>{pendingActionTilePresentation?.title ?? game.pendingAction.tile.label}</h2>
            <p>{pendingActionTilePresentation?.description ?? game.pendingAction.tile.description}</p>

            {mentionsLegalesInAction && (
              <div className="mentions-legales-box">
                {!isMentionsLegalesModeratorView ? (
                  <p className="market-message">
                    Citez oralement une mention légale, puis passez à la validation modérateur.
                  </p>
                ) : (
                  <>
                    <details className="mentions-legales-moderator" open>
                      <summary>Zone modérateur · validation manuelle</summary>
                      <label className="field">
                        <span>Mention correctement citée (si validée)</span>
                        <select
                          value={selectedLegalMentionId ?? ''}
                          onChange={(event) =>
                            setSelectedLegalMentionId(event.target.value ? Number(event.target.value) : null)
                          }
                        >
                          <option value="">Choisir une mention restante</option>
                          {remainingMentions.map((mention) => (
                            <option key={mention.id} value={mention.id}>
                              {mention.id}. {mention.text}
                            </option>
                          ))}
                        </select>
                      </label>
                    </details>
                    <div className="mentions-legales-tracking">
                      <div>
                        <h3>Mentions restantes</h3>
                        <ul>
                          {remainingMentions.map((mention) => (
                            <li key={`remaining-${mention.id}`}>{mention.id}. {mention.text}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3>Mentions validées</h3>
                        <ul>
                          {validatedMentions.length > 0 ? (
                            validatedMentions.map((mention) => (
                              <li key={`validated-${mention.id}`} className="mention-validated">
                                {mention.id}. {mention.text}
                              </li>
                            ))
                          ) : (
                            <li>Aucune mention validée pour le moment.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

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

            {game.pendingAction.tile.type === 'chance' && (
              <div className="deck-card modal-deck-card chance-viewer">
                <div className="deck-card-header">
                  <div>
                    <p className="deck-card-label">Carte Chance</p>
                    <strong>{game.activeChanceCard?.title ?? 'Carte en attente'}</strong>
                  </div>
                  <button className="secondary-button" onClick={drawChanceCard}>
                    Changer la carte
                  </button>
                </div>
                <p>Montrez la carte au participant puis validez la réponse pour attribuer les 2 clients.</p>
                {game.activeChanceCard ? (
                  <figure className="objection-card-viewer chance-card-viewer">
                    <span
                      className={`objection-card-flip-button${isChanceCardShowingBack ? ' is-showing-back' : ''}${isChanceAnswerRevealed ? ' is-revealed' : ''}${isChanceCardFlipping ? ' is-flipping' : ''}`}
                      aria-label={
                        isChanceCardShowingBack
                          ? `Réponse de la carte Chance : ${game.activeChanceCard.title}`
                          : `Carte Chance : ${game.activeChanceCard.title}`
                      }
                    >
                      <span className="objection-card-flip-scene">
                        <span className="objection-card-flip-illusion">
                          <img
                            src={displayedChanceImageSource ?? ''}
                            alt={
                              isChanceCardShowingBack
                                ? `Réponse de la carte Chance : ${game.activeChanceCard.title}`
                                : `Carte Chance : ${game.activeChanceCard.title}`
                            }
                            className="objection-card-image"
                          />
                        </span>
                      </span>
                    </span>
                  </figure>
                ) : (
                  <p className="market-message">Aucune carte disponible. Relancez une pioche pour continuer.</p>
                )}
              </div>
            )}

            {(game.pendingAction.tile.type === 'bubble' || game.pendingAction.tile.type === 'objection') &&
              game.trainingMode === 'objections' && (
              <div className="deck-card modal-deck-card objection-viewer">
                <div className="deck-card-header">
                  <div>
                    <p className="deck-card-label">Carte Objection</p>
                    <strong>
                      {isObjectionCardRevealed
                        ? game.activeObjectionCard?.title ?? 'Carte en attente'
                        : 'Cliquez pour révéler la carte'}
                    </strong>
                  </div>
                  <button className="secondary-button" onClick={drawObjectionCard}>
                    Changer la carte
                  </button>
                </div>
                <p>
                  {isObjectionCardRevealed
                    ? 'Utilisez la carte réelle révélée ci-dessous pour mener le challenge et valider la réponse.'
                    : 'La carte reste face cachée au départ. Cliquez dessus pour lancer le flip et découvrir l’objection tirée.'}
                </p>
                {game.activeObjectionCard ? (
                  <figure className="objection-card-viewer">
                    <button
                      key={game.activeObjectionCard.id}
                      type="button"
                      className={`objection-card-flip-button${isObjectionCardShowingBack ? ' is-showing-back' : ''}${isObjectionCardRevealed ? ' is-revealed' : ''}${isObjectionCardFlipping ? ' is-flipping' : ''}`}
                      onClick={handleRevealObjectionCard}
                      disabled={isObjectionCardRevealed || isObjectionCardFlipping}
                      aria-label={
                        isObjectionCardRevealed
                          ? `Carte objection révélée : ${game.activeObjectionCard.title}`
                          : 'Révéler la carte Objection'
                      }
                    >
                      <span className="objection-card-flip-scene">
                        <span className="objection-card-flip-illusion">
                          <img
                            src={displayedObjectionImageSource ?? ''}
                            alt={
                              isObjectionCardShowingBack
                                ? `Carte objection : ${game.activeObjectionCard.title}`
                                : 'Face commune du deck Objections'
                            }
                            className="objection-card-image"
                          />
                          {!isObjectionCardShowingBack && (
                            <span className="objection-card-face-caption">Cliquer pour révéler</span>
                          )}
                        </span>
                      </span>
                    </button>
                    {isObjectionCardRevealed && <figcaption>{game.activeObjectionCard.prompt}</figcaption>}
                  </figure>
                ) : (
                  <p className="market-message">Aucune carte disponible. Relancez une pioche pour continuer.</p>
                )}
              </div>
            )}

            {(game.pendingAction.tile.type !== 'market' &&
              !(
                game.trainingMode === 'objections' &&
                (game.pendingAction.tile.type === 'bubble' || game.pendingAction.tile.type === 'objection') &&
                !isObjectionCardRevealed
              ) &&
              !mentionsLegalesInAction) && (
              <div className="modal-actions">
                {game.pendingAction.tile.tileId === START_TILE_ID ? (
                  <button className="primary-button" onClick={handleDepartContinue}>
                    Continuer
                  </button>
                ) : game.pendingAction.tile.type === 'chance' ? (
                  isChanceAnswerRevealed ? (
                    <button
                      className="primary-button"
                      onClick={() => resolvePendingAction(chanceAnswerDecision === 'validated')}
                    >
                      Continuer
                    </button>
                  ) : (
                    <>
                      <button className="primary-button" onClick={handleValidatedAction} disabled={!game.activeChanceCard}>
                        Réponse validée
                      </button>
                      <button className="secondary-button" onClick={handleRejectedAction} disabled={!game.activeChanceCard}>
                        Réponse refusée
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <button className="primary-button" onClick={handleValidatedAction}>
                      Réponse validée
                    </button>
                    <button className="secondary-button" onClick={handleRejectedAction}>
                      Réponse refusée
                    </button>
                  </>
                )}
              </div>
            )}

            {mentionsLegalesInAction && (
              <div className="modal-actions">
                {!isMentionsLegalesModeratorView ? (
                  <button className="primary-button" onClick={() => setIsMentionsLegalesModeratorView(true)}>
                    Passer à la validation
                  </button>
                ) : (
                  <>
                    <button
                      className="primary-button"
                      onClick={handleValidatedAction}
                      disabled={remainingMentions.length > 0 && selectedLegalMentionId === null}
                    >
                      Réponse validée
                    </button>
                    <button className="secondary-button" onClick={handleRejectedAction}>
                      Réponse refusée
                    </button>
                  </>
                )}
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
