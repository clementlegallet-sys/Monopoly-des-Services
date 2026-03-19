import { useEffect, useMemo, useState } from 'react';

import chanceSheet from '../PLANCHE A 1.2.png';
import objectionExamples from '../EXEMPLES OBJECTIONS.png';
import objectionFaces from '../CARTES OBJECTIONS FACE.png';
import boardReference from '../PLATEAU DE JEU .png';
import clientTokensSheet from '../JETONS CLIENTS.png';
import servicePiecesSheet from '../PIECES SERVICES.png';

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

type ServicePiece = {
  id: string;
  name: string;
  color: ServiceColor;
  description: string;
  artPosition: string;
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
};

type PendingAction = {
  tile: Tile;
  playerId: string;
  roll: number;
};

type GamePhase = 'welcome' | 'setup' | 'playing' | 'finished';

type GameState = {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  centralBank: number;
  history: string[];
  pendingAction: PendingAction | null;
  lastRoll: number | null;
  winnerId: string | null;
};

const STORAGE_KEY = 'monopoly-des-services-state';
const INITIAL_CLIENTS = 2;
const INITIAL_BANK = 40;
const SALE_VALUES = [2, 3, 5] as const;

const servicePieces: ServicePiece[] = [
  {
    id: 'assistance-depannage',
    name: 'Assistance Dépannage',
    color: 'blue',
    description: 'Aide rapide en cas de problème ou de panne à domicile.',
    artPosition: '100% 100%',
  },
  {
    id: 'protection-facture',
    name: 'Protection Facture',
    color: 'blue',
    description: 'Sécurise le budget en cas de hausse imprévue ou d’imprévu.',
    artPosition: '0% 0%',
  },
  {
    id: 'izi-by-edf',
    name: 'IZI by EDF',
    color: 'green',
    description: 'Accompagnement travaux et rénovation énergétique.',
    artPosition: '50% 100%',
  },
  {
    id: 'thermostat-connecte-sowee',
    name: 'Thermostat connecté Sowee',
    color: 'green',
    description: 'Pilotage malin du chauffage et suivi des consommations.',
    artPosition: '0% 100%',
  },
  {
    id: 'izi-confort',
    name: 'IZI Confort',
    color: 'orange',
    description: 'Solutions de confort thermique pour le foyer.',
    artPosition: '100% 0%',
  },
  {
    id: 'homiris',
    name: 'Homiris',
    color: 'orange',
    description: 'Protection du domicile avec télésurveillance.',
    artPosition: '50% 0%',
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

const tileAccents: Record<TileType, string> = {
  start: 'Maison mère',
  chance: 'Culture Vente',
  service: 'Pièce service',
  question: 'Découverte',
  story: 'Usage',
  market: 'Échange',
  pitch: 'BAC',
  objection: 'AREF',
};

const tilePositions: Record<number, string> = {
  0: '3 / 3',
  1: '1 / 4',
  2: '1 / 3',
  3: '1 / 2',
  4: '2 / 1',
  5: '3 / 1',
  6: '4 / 1',
  7: '5 / 2',
  8: '5 / 3',
  9: '5 / 4',
  10: '4 / 5',
  11: '3 / 5',
  12: '2 / 5',
};

const marketSpokes = [
  { className: 'market-spoke market-spoke-top', label: 'Place du Marché' },
  { className: 'market-spoke market-spoke-right', label: 'Place du Marché' },
  { className: 'market-spoke market-spoke-bottom', label: 'Place du Marché' },
  { className: 'market-spoke market-spoke-left', label: 'Place du Marché' },
];

const playerPalette = ['#f97316', '#14b8a6', '#8b5cf6', '#ef4444'];

const createInitialState = (): GameState => ({
  phase: 'welcome',
  players: [],
  currentPlayerIndex: 0,
  centralBank: INITIAL_BANK,
  history: ['Bienvenue dans Monopoly des Services.'],
  pendingAction: null,
  lastRoll: null,
  winnerId: null,
});

const uid = () => Math.random().toString(36).slice(2, 10);

const getService = (serviceId?: string) =>
  servicePieces.find((piece) => piece.id === serviceId) ?? null;

const appendHistoryEntry = (history: string[], message: string) => [message, ...history].slice(0, 12);

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

const getTileThemeClass = (tile: Tile) => {
  if (tile.type === 'service' && tile.color) {
    return `tile-service-${tile.color}`;
  }

  if (tile.color) {
    return `tile-${tile.type}-${tile.color}`;
  }

  return `tile-${tile.type}`;
};

const getTileIllustration = (tile: Tile) => {
  if (tile.type === 'chance') {
    return chanceSheet;
  }

  if (tile.type === 'objection') {
    return objectionFaces;
  }

  if (tile.type === 'service' && tile.serviceId) {
    return servicePiecesSheet;
  }

  if (tile.type === 'market') {
    return boardReference;
  }

  return objectionExamples;
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
      return JSON.parse(savedGame) as GameState;
    } catch {
      return createInitialState();
    }
  });
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [saleValue, setSaleValue] = useState<number>(SALE_VALUES[0]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  const currentPlayer = game.players[game.currentPlayerIndex] ?? null;

  const completeSets = useMemo(() => getCompleteSets(game.players), [game.players]);

  const startSetup = () => {
    setGame((currentGame) => ({
      ...currentGame,
      phase: 'setup',
      history: ['Configuration des joueurs en cours.'],
    }));
  };

  const resetGame = () => {
    setPlayerNames(['', '']);
    setSelectedPieceId('');
    setSaleValue(SALE_VALUES[0]);
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

    const players = names.map<Player>((name) => ({
      id: uid(),
      name,
      position: 0,
      clients: INITIAL_CLIENTS,
      pieces: [],
    }));

    setGame({
      phase: 'playing',
      players,
      currentPlayerIndex: 0,
      centralBank: INITIAL_BANK,
      history: [`La partie commence. ${players[0].name} ouvre le jeu.`],
      pendingAction: null,
      lastRoll: null,
      winnerId: null,
    });
  };

  const rollDie = () => {
    if (!currentPlayer || game.pendingAction || game.phase === 'finished') {
      return;
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    const nextPosition = (currentPlayer.position + roll) % board.length;
    const tile = board[nextPosition];

    setGame((currentGame) => ({
      ...currentGame,
      players: currentGame.players.map((player) =>
        player.id === currentPlayer.id ? { ...player, position: nextPosition } : player,
      ),
      lastRoll: roll,
      pendingAction: {
        tile,
        playerId: currentPlayer.id,
        roll,
      },
      history: appendHistoryEntry(
        currentGame.history,
        `${currentPlayer.name} lance un ${roll} et arrive sur ${tile.title}.`,
      ),
    }));
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
      pendingAction: null,
      currentPlayerIndex: (state.currentPlayerIndex + 1) % players.length,
    };
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
        return { ...currentGame, pendingAction: null };
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
      setSaleValue(SALE_VALUES[0]);
      return resolveTurn(currentGame, players, currentGame.centralBank - awarded, message);
    });
  };

  const winner = game.players.find((player) => player.id === game.winnerId) ?? null;
  const pendingTile = game.pendingAction?.tile ?? null;

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-copy-wrap">
          <div className="brand-row">
            <div className="brand-mark">EDF</div>
            <p className="eyebrow">Plateau de formation · React + TypeScript + Vite</p>
          </div>
          <h1>Monopoly des Services</h1>
          <p className="hero-copy">
            Une version numérique au style plateau de jeu, inspirée du matériel original, pour piloter
            les tours, les clients, les pièces service et les validations animateur sans modifier la
            logique existante.
          </p>
          <div className="hero-highlights">
            <span>Plateau hexagonal revisité</span>
            <span>Cartes et pièces inspirées des planches</span>
            <span>Suivi local des scores et enseignes</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-reference">
            <img src={boardReference} alt="Référence visuelle du plateau Monopoly des Services" />
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={game.phase === 'welcome' ? startSetup : resetGame}>
              {game.phase === 'welcome' ? 'Commencer la partie' : 'Réinitialiser la partie'}
            </button>
            {game.phase !== 'welcome' && (
              <button className="secondary-button" onClick={resetGame}>
                Nouvelle partie
              </button>
            )}
          </div>
        </div>
      </header>

      {game.phase === 'setup' && (
        <section className="panel paper-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Mise en place</p>
              <h2>Paramétrage des joueurs</h2>
              <p>Ajoutez de 2 à 4 joueurs. Chaque joueur démarre avec 2 clients et un pion sur Départ.</p>
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
              <label className="field player-field" key={`player-${index}`}>
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

          <div className="setup-footer">
            <div className="reference-strip">
              <img src={servicePiecesSheet} alt="Référence des pièces service" />
              <img src={clientTokensSheet} alt="Référence des jetons clients" />
            </div>
            <button className="primary-button" onClick={launchGame}>
              Lancer la partie
            </button>
          </div>
        </section>
      )}

      {(game.phase === 'playing' || game.phase === 'finished') && (
        <main className="dashboard">
          <section className="board-column">
            <section className="panel board-panel">
              <div className="panel-header board-header">
                <div>
                  <p className="section-kicker">Plateau de jeu</p>
                  <h2>Version numérique du Monopoly des Services</h2>
                  <p>Le parcours reste piloté par la logique actuelle, avec une mise en scène plus proche du plateau original.</p>
                </div>
                <div className="board-header-meta">
                  <div className="status-pill warm">Banque centrale : {game.centralBank} clients</div>
                  <div className="status-pill">Dernier dé : {game.lastRoll ?? '-'}</div>
                </div>
              </div>

              <div className="board-frame">
                <div className="board-surface">
                  {marketSpokes.map((spoke) => (
                    <div key={spoke.className} className={spoke.className}>
                      <span>{spoke.label}</span>
                    </div>
                  ))}

                  <div className="board-center">
                    <span className="center-badge">Départ</span>
                    <h3>Monopoly des Services</h3>
                    <p>Point de départ · Place centrale · Ambiance plateau</p>
                    <div className="center-logo">edf</div>
                    <div className="center-players">
                      {game.players.map((player, index) => (
                        <span
                          key={player.id}
                          className="center-player-dot"
                          style={{ background: playerPalette[index % playerPalette.length] }}
                          title={player.name}
                        />
                      ))}
                    </div>
                  </div>

                  {board.map((tile) => {
                    const occupants = game.players.filter((player) => player.position === tile.id);
                    const service = getService(tile.serviceId);

                    return (
                      <article
                        className={`tile ${getTileThemeClass(tile)} ${pendingTile?.id === tile.id ? 'tile-active' : ''}`}
                        key={tile.id}
                        style={{ gridArea: tilePositions[tile.id] }}
                      >
                        <div className="tile-header">
                          <span className="tile-index">Case {tile.id}</span>
                          <span className="tile-accent">{tileAccents[tile.type]}</span>
                        </div>
                        <div className="tile-body">
                          <h3>{tileTypeLabels[tile.type]}</h3>
                          {service && <p className="tile-service-name">{service.name}</p>}
                          <p>{tile.description}</p>
                        </div>
                        <div className="tile-footer">
                          {tile.color && <span className={`color-pill color-pill-${tile.color}`}>{colorLabels[tile.color]}</span>}
                          {occupants.length > 0 ? (
                            <div className="occupants">
                              {occupants.map((player) => {
                                const playerIndex = game.players.findIndex((candidate) => candidate.id === player.id);
                                return (
                                  <span
                                    key={player.id}
                                    className="player-token"
                                    style={{ background: playerPalette[playerIndex % playerPalette.length] }}
                                    title={player.name}
                                  >
                                    {player.name.slice(0, 2).toUpperCase()}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="tile-empty">Libre</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="panel paper-panel deck-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="section-kicker">Références visuelles</p>
                  <h2>Cartes, objections et jetons</h2>
                </div>
              </div>
              <div className="deck-grid">
                <article className="deck-card deck-card-chance">
                  <div className="deck-card-image"><img src={chanceSheet} alt="Planche de cartes Chance" /></div>
                  <div>
                    <h3>Chance</h3>
                    <p>Fond bleu clair, cartouches pédagogiques et esprit quiz visuel.</p>
                  </div>
                </article>
                <article className="deck-card deck-card-objection">
                  <div className="deck-card-image"><img src={objectionFaces} alt="Faces des cartes objection" /></div>
                  <div>
                    <h3>Objection</h3>
                    <p>Carte rose pastel avec lettrage fort, cohérente avec la méthode AREF.</p>
                  </div>
                </article>
                <article className="deck-card deck-card-clients">
                  <div className="deck-card-image"><img src={clientTokensSheet} alt="Jetons clients" /></div>
                  <div>
                    <h3>Jetons clients</h3>
                    <p>Référence utilisée pour donner un rendu plus jeu de société aux scores.</p>
                  </div>
                </article>
              </div>
            </section>
          </section>

          <aside className="sidebar">
            <section className="panel turn-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="section-kicker">Tour actuel</p>
                  <h2>{currentPlayer ? currentPlayer.name : 'En attente'}</h2>
                  <p>
                    {currentPlayer
                      ? `Faites avancer ${currentPlayer.name}, puis validez ou refusez l'action de la case.`
                      : 'Lancez une partie pour démarrer.'}
                  </p>
                </div>
              </div>
              <div className="turn-controls">
                <button
                  className="primary-button roll-button"
                  onClick={rollDie}
                  disabled={Boolean(game.pendingAction) || game.phase === 'finished'}
                >
                  🎲 Lancer le dé
                </button>
                <div className="turn-note">
                  <span>Case ciblée</span>
                  <strong>{pendingTile ? pendingTile.title : 'En attente du lancer'}</strong>
                </div>
              </div>
            </section>

            <section className="panel score-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="section-kicker">Score automatique</p>
                  <h2>Clients et enseignes</h2>
                </div>
              </div>
              <div className="score-list">
                {game.players.map((player, index) => (
                  <article className="score-card" key={player.id}>
                    <div className="score-topline">
                      <div className="score-player">
                        <span
                          className="score-player-badge"
                          style={{ background: playerPalette[index % playerPalette.length] }}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h3>{player.name}</h3>
                          <p>Position : case {player.position}</p>
                        </div>
                      </div>
                      <div className="client-count">{player.clients} clients</div>
                    </div>

                    <div className="client-strip" aria-label={`Jetons clients de ${player.name}`}>
                      {Array.from({ length: Math.min(player.clients, 8) }).map((_, tokenIndex) => (
                        <span
                          key={`${player.id}-client-${tokenIndex}`}
                          className="client-token"
                          style={{ backgroundImage: `url(${clientTokensSheet})` }}
                        />
                      ))}
                      {player.clients > 8 && <span className="client-extra">+{player.clients - 8}</span>}
                    </div>

                    <div className="set-summary">
                      <span>Pièces : {player.pieces.length}</span>
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

            <section className="panel service-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="section-kicker">Pièces service</p>
                  <h2>Collection des offres</h2>
                </div>
              </div>
              <div className="service-list">
                {servicePieces.map((piece) => {
                  const owners = game.players.filter((player) => player.pieces.includes(piece.id));

                  return (
                    <article className={`service-card service-card-${piece.color}`} key={piece.id}>
                      <div className="piece-art">
                        <div
                          className="piece-art-image"
                          style={{
                            backgroundImage: `url(${servicePiecesSheet})`,
                            backgroundPosition: piece.artPosition,
                          }}
                        />
                      </div>
                      <div className="service-copy">
                        <h3>{piece.name}</h3>
                        <p>{piece.description}</p>
                        <div className="service-meta">
                          <span className={`color-pill color-pill-${piece.color}`}>{colorLabels[piece.color]}</span>
                          <span>{owners.length ? `Possédée par ${owners.map((owner) => owner.name).join(', ')}` : 'Non remportée'}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="panel history-panel">
              <div className="panel-header compact-header">
                <div>
                  <p className="section-kicker">Historique</p>
                  <h2>Derniers événements</h2>
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
          <section className={`modal-card modal-${game.pendingAction.tile.type}`}>
            <div className="modal-media">
              <img src={getTileIllustration(game.pendingAction.tile)} alt={`Illustration de ${game.pendingAction.tile.title}`} />
            </div>
            <div className="modal-content">
              <p className="eyebrow">Résolution de case</p>
              <h2>{game.pendingAction.tile.title}</h2>
              <p className="modal-lead">{game.pendingAction.tile.description}</p>
              {game.pendingAction.tile.color && (
                <span className={`color-pill color-pill-${game.pendingAction.tile.color}`}>
                  Famille {colorLabels[game.pendingAction.tile.color]}
                </span>
              )}

              {game.pendingAction.tile.type === 'market' && currentPlayer && (
                <div className="market-box">
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
                    L’échange entre joueurs reste animé oralement. La vente à la banque est suivie automatiquement ici.
                  </p>
                  <div className="modal-actions">
                    <button className="primary-button" onClick={handleMarketSale} disabled={currentPlayer.pieces.length === 0}>
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
            </div>
          </section>
        </div>
      )}

      {game.phase === 'finished' && (
        <div className="modal-backdrop">
          <section className="modal-card modal-finished">
            <div className="modal-content full-width">
              <p className="eyebrow">Fin de partie</p>
              <h2>{winner ? `${winner.name} remporte la partie !` : 'Partie terminée'}</h2>
              <p className="modal-lead">
                La banque de clients est vide. Comparez les scores, observez les enseignes complètes et relancez une nouvelle partie si nécessaire.
              </p>
              <button className="primary-button" onClick={resetGame}>
                Rejouer
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default App;
