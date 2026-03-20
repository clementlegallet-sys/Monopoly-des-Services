import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import boardReferenceImage from '../plateau-reference-bordures-epaisses.png';
import annotatedBoardImage from '../plateau_annoté_final_T0_T22.png';
import boardRegistryJson from '../board_registry_final_T0_T22.json';
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
};

type Tile = TileBlueprint & { action: TileActionDefinition };

type Player = {
  id: string;
  name: string;
  position: string;
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

type Point = {
  x: number;
  y: number;
};

type TilePresentation = {
  title: string;
  description: string;
  typeLabel: string;
  identityLabel?: string;
};

type TileInteractionDebugState = {
  tileId: string;
  label: string;
  type: TileType;
  source: 'inspection' | 'destination';
};

type RegistryEntry = {
  label: string;
  type: RegistryTileType;
};

const STORAGE_KEY = 'monopoly-des-services-state';
const INITIAL_CLIENTS = 2;
const INITIAL_BANK = 40;
const SALE_VALUES = [2, 3, 5] as const;
const PLAYER_TOKEN_COLORS = ['#d9473f', '#2b6fdd', '#f59e0b', '#0f9d74'];
const ENABLE_TILE_DEBUG = true;
const TILE_DEBUG_FLASH_DURATION_MS = 950;
const TECHNICAL_SOURCE_OF_TRUTH = {
  image: annotatedBoardImage,
  registry: boardRegistryJson as Record<string, RegistryEntry>,
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

const BUBBLE_TILE_IDS = ['T8', 'T12', 'T16', 'T19', 'T22'] as const;

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

const TILE_LAYOUT: Record<string, Omit<TileBlueprint, 'label' | 'type' | 'description'>> = {
  T0: {
    order: 0,
    tileId: 'T0',
    adjacency: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    shape: {
      points: '39.6,37.5 55.9,37.2 60.8,48.8 56.0,61.4 44.4,61.7 39.2,49.0',
      tokenAnchor: { x: 49.9, y: 49.3 },
    },
  },
  T1: {
    order: 1,
    tileId: 'T1',
    adjacency: ['T0', 'T6', 'T7', 'T8', 'T2', 'T20'],
    shape: {
      points: '42.7,16.1 55.8,16.1 56.2,37.2 43.0,37.3',
      tokenAnchor: { x: 49.5, y: 26.4 },
    },
  },
  T2: {
    order: 2,
    tileId: 'T2',
    adjacency: ['T0', 'T1', 'T8', 'T9', 'T10', 'T3'],
    shape: {
      points: '56.2,37.2 70.6,28.6 79.0,41.5 67.8,49.8 60.0,49.8',
      tokenAnchor: { x: 67.0, y: 38.0 },
    },
  },
  T3: {
    order: 3,
    tileId: 'T3',
    adjacency: ['T0', 'T2', 'T11', 'T22', 'T21', 'T4'],
    shape: {
      points: '56.0,61.5 67.8,49.8 73.2,69.2 60.8,82.2 56.8,82.3',
      tokenAnchor: { x: 64.2, y: 58.9 },
    },
  },
  T4: {
    order: 4,
    tileId: 'T4',
    adjacency: ['T0', 'T3', 'T21', 'T13', 'T12', 'T5'],
    shape: {
      points: '43.0,61.5 56.0,61.5 56.8,82.3 39.4,82.2',
      tokenAnchor: { x: 50.0, y: 71.4 },
    },
  },
  T5: {
    order: 5,
    tileId: 'T5',
    adjacency: ['T0', 'T4', 'T12', 'T14', 'T15', 'T6'],
    shape: {
      points: '21.2,50.1 39.2,37.8 43.0,61.5 27.0,69.1',
      tokenAnchor: { x: 31.7, y: 58.8 },
    },
  },
  T6: {
    order: 6,
    tileId: 'T6',
    adjacency: ['T0', 'T5', 'T17', 'T18', 'T19', 'T20', 'T1'],
    shape: {
      points: '32.8,16.1 42.7,16.1 43.0,37.3 39.0,37.7 24.2,26.4',
      tokenAnchor: { x: 33.2, y: 28.7 },
    },
  },
  T7: {
    order: 7,
    tileId: 'T7',
    color: 'blue',
    serviceId: 'protection-facture',
    adjacency: ['T1', 'T20', 'T8'],
    shape: {
      points: '40.4,0.0 59.2,0.0 55.8,16.1 42.7,16.1',
      tokenAnchor: { x: 49.7, y: 8.3 },
    },
  },
  T8: {
    order: 8,
    tileId: 'T8',
    adjacency: ['T1', 'T2', 'T7', 'T9'],
    shape: {
      points: '60.5,2.3 67.1,2.4 71.8,4.7 74.1,9.1 74.0,13.2 70.4,16.0 64.6,15.5 60.5,12.0 58.9,7.3',
      tokenAnchor: { x: 66.7, y: 8.1 },
    },
  },
  T9: {
    order: 9,
    tileId: 'T9',
    adjacency: ['T2', 'T8', 'T10'],
    shape: {
      points: '81.4,0.1 99.7,49.0 78.5,49.6 70.4,20.9',
      tokenAnchor: { x: 81.9, y: 29.1 },
    },
  },
  T10: {
    order: 10,
    tileId: 'T10',
    adjacency: ['T2', 'T9', 'T11'],
    shape: {
      points: '85.2,51.3 92.9,51.3 92.9,60.6 85.2,60.6',
      tokenAnchor: { x: 89.1, y: 56.0 },
    },
  },
  T11: {
    order: 11,
    tileId: 'T11',
    color: 'orange',
    serviceId: 'izi-confort',
    adjacency: ['T3', 'T10', 'T22'],
    shape: {
      points: '72.8,58.9 87.2,65.2 94.0,85.0 81.4,74.3',
      tokenAnchor: { x: 82.0, y: 68.5 },
    },
  },
  T12: {
    order: 12,
    tileId: 'T12',
    adjacency: ['T4', 'T5', 'T13', 'T14'],
    shape: {
      points: '34.3,85.7 37.4,83.6 39.9,84.5 40.9,87.4 40.3,92.0 38.0,95.7 36.0,98.6 33.1,99.2 31.5,96.0 31.8,90.4',
      tokenAnchor: { x: 36.1, y: 91.2 },
    },
  },
  T13: {
    order: 13,
    tileId: 'T13',
    color: 'blue',
    serviceId: 'assistance-depannage',
    adjacency: ['T4', 'T12', 'T21'],
    shape: {
      points: '40.0,82.8 60.7,82.8 61.0,100.0 39.0,100.0',
      tokenAnchor: { x: 50.0, y: 91.4 },
    },
  },
  T14: {
    order: 14,
    tileId: 'T14',
    adjacency: ['T5', 'T12', 'T15'],
    shape: {
      points: '19.0,80.0 27.8,80.0 27.8,88.7 19.0,88.7',
      tokenAnchor: { x: 23.4, y: 84.4 },
    },
  },
  T15: {
    order: 15,
    tileId: 'T15',
    color: 'green',
    serviceId: 'izi-by-edf',
    adjacency: ['T5', 'T14', 'T16'],
    shape: {
      points: '0.0,65.6 9.8,65.0 27.0,69.1 13.0,84.9 4.4,74.8',
      tokenAnchor: { x: 14.5, y: 74.2 },
    },
  },
  T16: {
    order: 16,
    tileId: 'T16',
    adjacency: ['T5', 'T15', 'T17'],
    shape: {
      points: '2.4,55.6 4.8,52.1 10.8,51.7 15.7,52.8 17.7,55.6 17.2,59.6 10.9,60.0 4.2,59.4',
      tokenAnchor: { x: 10.7, y: 55.9 },
    },
  },
  T17: {
    order: 17,
    tileId: 'T17',
    adjacency: ['T6', 'T16', 'T18'],
    shape: {
      points: '7.0,38.6 13.0,38.6 13.0,47.0 7.0,47.0',
      tokenAnchor: { x: 10.0, y: 42.8 },
    },
  },
  T18: {
    order: 18,
    tileId: 'T18',
    color: 'green',
    serviceId: 'thermostat-connecte-sowee',
    adjacency: ['T6', 'T17', 'T19'],
    shape: {
      points: '0.0,33.6 5.8,33.6 24.2,26.4 21.2,50.1 0.0,50.0',
      tokenAnchor: { x: 10.0, y: 44.0 },
    },
  },
  T19: {
    order: 19,
    tileId: 'T19',
    adjacency: ['T6', 'T18', 'T20'],
    shape: {
      points: '16.0,8.8 20.8,9.1 24.6,11.3 27.5,14.6 29.3,18.2 29.2,20.9 25.4,20.9 20.8,18.0 17.6,14.7 15.0,11.3',
      tokenAnchor: { x: 21.3, y: 15.1 },
    },
  },
  T20: {
    order: 20,
    tileId: 'T20',
    adjacency: ['T1', 'T6', 'T7', 'T19'],
    shape: {
      points: '29.7,2.0 37.7,2.0 37.7,10.7 29.7,10.7',
      tokenAnchor: { x: 33.7, y: 6.4 },
    },
  },
  T21: {
    order: 21,
    tileId: 'T21',
    adjacency: ['T3', 'T4', 'T13', 'T22'],
    shape: {
      points: '62.8,89.8 70.8,89.8 70.8,98.5 62.8,98.5',
      tokenAnchor: { x: 66.8, y: 94.1 },
    },
  },
  T22: {
    order: 22,
    tileId: 'T22',
    adjacency: ['T3', 'T11', 'T21'],
    shape: {
      points: '69.7,81.8 73.6,80.4 77.6,80.2 80.3,81.4 81.8,83.7 80.8,86.3 77.5,88.2 73.5,88.3 70.3,86.9 68.8,84.4',
      tokenAnchor: { x: 75.2, y: 84.2 },
    },
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
  const registryEntry = TECHNICAL_SOURCE_OF_TRUTH.registry[tileId];
  const layout = TILE_LAYOUT[tileId];

  if (!registryEntry) {
    throw new Error(`Tile registry entry missing for ${tileId}.`);
  }

  if (!layout) {
    throw new Error(`Tile layout missing for ${tileId}.`);
  }

  const tile: TileBlueprint = {
    ...layout,
    label: registryEntry.label,
    type: TILE_TYPE_BY_REGISTRY_TYPE[registryEntry.type],
    description: TILE_DESCRIPTIONS[tileId] ?? registryEntry.label,
    color: TILE_SERVICE_METADATA[tileId]?.color ?? layout.color,
    serviceId: TILE_SERVICE_METADATA[tileId]?.serviceId ?? layout.serviceId,
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
  points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });

const serializePolygonPoints = (points: Point[]): string =>
  points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

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
    const registryEntry = TECHNICAL_SOURCE_OF_TRUTH.registry[tileId];
    const tile = tiles.find((candidate) => candidate.tileId === tileId);

    if (!registryEntry) {
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

    if (tile.label !== registryEntry.label) {
      issues.push(`Libellé attendu pour ${tileId} : ${registryEntry.label}.`);
    }

    if (tile.type !== TILE_TYPE_BY_REGISTRY_TYPE[registryEntry.type]) {
      issues.push(`Type attendu pour ${tileId} : ${registryEntry.type}.`);
    }

    if (!tile.shape.points.trim()) {
      issues.push(`Case ${tileId} sans forme SVG.`);
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
  if (tile.type === 'bubble') {
    return {
      title: tile.label,
      description:
        trainingMode === 'objections'
          ? 'Case bulle en mode Objections : affiche et déclenche une objection.'
          : 'Case bulle en mode Arguments de vente : affiche et déclenche un BAC.',
      typeLabel: tileTypeLabels[tile.type],
      identityLabel: trainingMode === 'objections' ? 'Objection' : 'BAC',
    };
  }

  if (tile.type === 'objection') {
    return {
      title: tile.label,
      description: 'Tirez une carte Objection et répondez avec la méthode AREF.',
      typeLabel: tileTypeLabels[tile.type],
      identityLabel: 'Objection',
    };
  }

  return {
    title: tile.label,
    description: tile.description,
    typeLabel: tileTypeLabels[tile.type],
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

const getPlayerInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || '?';

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
          position: normalizeStoredTileId(player.position),
          rollsTaken: player.rollsTaken ?? 0,
        })) as Player[],
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
  const [inspectedTileId, setInspectedTileId] = useState<string | null>(null);
  const [isTileDebugEnabled, setIsTileDebugEnabled] = useState(false);
  const [tileDebugState, setTileDebugState] = useState<TileInteractionDebugState | null>(null);
  const [debugFlashTileId, setDebugFlashTileId] = useState<string | null>(null);
  const rollIntervalRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<number | null>(null);
  const debugFlashTimeoutRef = useRef<number | null>(null);

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
      if (debugFlashTimeoutRef.current) {
        window.clearTimeout(debugFlashTimeoutRef.current);
      }
    },
    [],
  );

  const currentPlayer = game.players[game.currentPlayerIndex] ?? null;
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
  const focusTilePresentation = getTilePresentation(focusTile, game.trainingMode);
  const reachableTileIds = game.pendingMovement?.reachableTileIds ?? [];
  const isChoosingDestination = Boolean(game.pendingMovement);

  const logTileInteraction = (tile: Tile, source: 'inspection' | 'destination') => {
    if (!ENABLE_TILE_DEBUG) {
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

    if (isTileDebugEnabled) {
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
      const originTile = BOARD_BY_TILE_ID.get(currentPlayer.position);
      if (originTile) {
        inspectTile(originTile);
      }
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
        ? `${player.name} choisit ${tilePresentation?.title ?? tile.label} comme destination après un ${pendingMovement.roll}. Carte tirée : « ${triggeredObjectionCard.title} ».`
        : `${player.name} choisit ${tilePresentation?.title ?? tile.label} comme destination après un ${pendingMovement.roll}.`;

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
    const occupants = game.players.filter((player) => player.position === tile.tileId);
    const tilePresentation = getTilePresentation(tile, game.trainingMode);
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
                {ENABLE_TILE_DEBUG && (
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
                            key={`${tile.tileId}-${player.id}`}
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
                            {tile.type === 'bubble' && (
                              <text
                                aria-hidden="true"
                                className="board-space-objection-label"
                                x={labelAnchor.x}
                                y={labelAnchor.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {tilePresentation.identityLabel}
                              </text>
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

                  <aside className="board-focus-card" aria-live="polite">
                    <p className="eyebrow board-focus-eyebrow">Lecture du plateau</p>
                    <div className="board-focus-main">
                      <div className="board-focus-copy">
                        <p className="board-focus-tile-id">tileId · {focusTile.tileId}</p>
                        <h3>{focusTilePresentation.title}</h3>
                        <p>{focusTilePresentation.description}</p>
                        <p className="board-focus-action">
                          {getResolvedActionSummary(focusTile, game.trainingMode)}
                        </p>
                      </div>
                      <div className="board-focus-meta">
                        <span className="status-chip">{focusTilePresentation.typeLabel}</span>
                        {focusTile.color && <span className="tile-family">Famille {colorLabels[focusTile.color]}</span>}
                      </div>
                    </div>
                  </aside>

                  {ENABLE_TILE_DEBUG && isTileDebugEnabled && tileDebugState && (
                    <aside className="board-debug-card" aria-live="polite">
                      <p className="eyebrow board-debug-eyebrow">Debug clic</p>
                      <div className="board-debug-main">
                        <p className="board-debug-source">Source · {tileDebugState.source}</p>
                        <p className="board-debug-line">tileId · {tileDebugState.tileId}</p>
                        <p className="board-debug-line">label · {tileDebugState.label}</p>
                        <p className="board-debug-line">type · {tileTypeLabels[tileDebugState.type]}</p>
                      </div>
                    </aside>
                  )}
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
                      Départ : tileId {game.pendingMovement.originTileId} · {game.pendingMovement.roll} déplacement
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
                        {getPlayerInitials(player.name)}
                      </span>
                      <div>
                        <h3>{player.name}</h3>
                        <p>tileId {player.position}</p>
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
            <h2>{pendingActionTilePresentation?.title ?? game.pendingAction.tile.label}</h2>
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
