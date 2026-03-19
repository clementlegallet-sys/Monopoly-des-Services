import { useEffect, useMemo, useState } from 'react';

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

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">React + TypeScript + Vite</p>
          <h1>Monopoly des Services</h1>
          <p className="hero-copy">
            Une adaptation locale du jeu pour animer les services EDF, suivre les clients et gérer les
            pièces de service sans backend.
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
        <section className="panel">
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
          <button className="primary-button" onClick={launchGame}>
            Lancer la partie
          </button>
        </section>
      )}

      {(game.phase === 'playing' || game.phase === 'finished') && (
        <main className="dashboard">
          <section className="panel board-panel">
            <div className="panel-header">
              <div>
                <h2>Plateau de jeu</h2>
                <p>Déplacez les joueurs, validez les réponses et suivez la banque centrale de clients.</p>
              </div>
              <div className="status-pill">Banque centrale : {game.centralBank} clients</div>
            </div>
            <div className="board-grid">
              {board.map((tile) => {
                const occupants = game.players.filter((player) => player.position === tile.id);

                return (
                  <article className={`tile tile-${tile.type}`} key={tile.id}>
                    <div className="tile-topline">Case {tile.id}</div>
                    <h3>{tileTypeLabels[tile.type]}</h3>
                    <p>{tile.description}</p>
                    {tile.color && <span className="tile-tag">Couleur : {colorLabels[tile.color]}</span>}
                    {tile.serviceId && <span className="tile-tag">{getService(tile.serviceId)?.name}</span>}
                    <div className="occupants">
                      {occupants.length > 0 ? occupants.map((player) => <span key={player.id}>{player.name}</span>) : <span>Libre</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="sidebar">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Tour actuel</h2>
                  <p>{currentPlayer ? `${currentPlayer.name} doit jouer.` : 'En attente.'}</p>
                </div>
                <div className="status-pill">Dernier dé : {game.lastRoll ?? '-'}</div>
              </div>
              <button className="primary-button" onClick={rollDie} disabled={Boolean(game.pendingAction) || game.phase === 'finished'}>
                Lancer le dé
              </button>
            </section>

            <section className="panel">
              <h2>Score automatique</h2>
              <div className="score-list">
                {game.players.map((player) => (
                  <article className="score-card" key={player.id}>
                    <div>
                      <h3>{player.name}</h3>
                      <p>{player.clients} clients</p>
                    </div>
                    <div>
                      <p>Pièces : {player.pieces.length}</p>
                      <p>
                        Enseignes :{' '}
                        {completeSets[player.id]?.length
                          ? completeSets[player.id].map((color) => colorLabels[color]).join(', ')
                          : 'Aucune'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Pièces service</h2>
              <div className="service-list">
                {servicePieces.map((piece) => (
                  <article className="service-card" key={piece.id}>
                    <h3>{piece.name}</h3>
                    <p>{piece.description}</p>
                    <span className="tile-tag">Couleur : {colorLabels[piece.color]}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel history-panel">
              <h2>Historique</h2>
              <ul>
                {game.history.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          </section>
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
