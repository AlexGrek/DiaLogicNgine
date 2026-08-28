import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputGroup, Loader } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  LibraryBig,
  LogIn,
  MapPin,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { AuthUser } from '../../api/authApi';
import UserMenu from '../auth/UserMenu';
import {
  ProjectMeta,
  ProjectsPage,
  listPublishedGames,
  projectCoverUrl,
} from '../../api/projectsApi';
import './GalleryPage.css';

interface GalleryPageProps {
  /** null for anonymous visitors — the gallery works either way. */
  currentUser: AuthUser | null;
  onLogout: () => void;
}

function formatPublished(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface GameCardProps {
  game: ProjectMeta;
  onPlay: (name: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  const title = game.displayName || game.name;
  const cover = projectCoverUrl(game.name, game.mainImageUrl);
  const published = formatPublished(game.publishedAt);

  return (
    <article
      className="gallery-card"
      data-testid="published-game-card"
      onClick={() => onPlay(game.name)}
    >
      <div className="gallery-card-media">
        {cover ? (
          <img src={cover} alt="" className="gallery-card-cover" loading="lazy" />
        ) : (
          <div className="gallery-card-cover-placeholder">
            <Gamepad2 size={34} strokeWidth={1.4} />
          </div>
        )}
        <div className="gallery-card-media-overlay">
          <span className="gallery-card-play-hint">
            <Play size={14} />
            Play now
          </span>
        </div>
      </div>

      <div className="gallery-card-body">
        <div>
          <h3 className="gallery-card-title">{title}</h3>
          {game.authors && game.authors.length > 0 && (
            <span className="gallery-card-authors">by {game.authors.join(', ')}</span>
          )}
          {game.description && (
            <p className="gallery-card-description">{game.description}</p>
          )}
        </div>

        <div className="gallery-card-stats">
          {game.dialogCount !== undefined && game.dialogCount !== null && (
            <span className="gallery-card-stat" title="Dialogs">
              <MessageSquare />
              {game.dialogCount}
            </span>
          )}
          {game.characterCount !== undefined && game.characterCount !== null && (
            <span className="gallery-card-stat" title="Characters">
              <Users />
              {game.characterCount}
            </span>
          )}
          {game.locationCount !== undefined && game.locationCount !== null && (
            <span className="gallery-card-stat" title="Locations">
              <MapPin />
              {game.locationCount}
            </span>
          )}
          {published && <span className="gallery-card-date">{published}</span>}
        </div>

        <Button
          appearance="primary"
          block
          className="gallery-card-play-btn"
          data-testid="play-game-btn"
          onClick={(e) => {
            e.stopPropagation(); // the whole card is clickable too
            onPlay(game.name);
          }}
        >
          <Play size={14} style={{ marginRight: 6 }} />
          Play
        </Button>
      </div>
    </article>
  );
};

const GalleryPage: React.FC<GalleryPageProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [gamesPage, setGamesPage] = useState<ProjectsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Debounce typing so a search doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublishedGames(page, search)
      .then((res) => {
        if (cancelled) return;
        setGamesPage(res);
        setFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setGamesPage(null);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  const handlePlay = useCallback(
    (name: string) => navigate(`/play/${encodeURIComponent(name)}`),
    [navigate]
  );

  const games = gamesPage?.projects ?? [];
  const total = gamesPage?.total ?? 0;
  const pageSize = gamesPage?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="gallery-page" data-testid="gallery-page">
      <div className="gallery-orb gallery-orb--1" aria-hidden />
      <div className="gallery-orb gallery-orb--2" aria-hidden />

      <header className="gallery-topbar">
        <span className="gallery-brand">🇺🇦 DiaLogic Ngine</span>
        <div className="gallery-topbar-actions">
          {currentUser ? (
            <>
              <Button
                appearance="ghost"
                size="sm"
                className="gallery-topbar-btn"
                onClick={() => navigate('/')}
                data-testid="gallery-my-projects-btn"
              >
                <LibraryBig size={14} style={{ marginRight: 6 }} />
                My projects
              </Button>
              <UserMenu username={currentUser.username} onLogout={onLogout} />
            </>
          ) : (
            <Button
              appearance="primary"
              size="sm"
              className="gallery-signin-btn"
              onClick={() => navigate('/login')}
              data-testid="gallery-signin-btn"
            >
              <LogIn size={14} style={{ marginRight: 6 }} />
              Sign in to create
            </Button>
          )}
        </div>
      </header>

      <div className="gallery-inner">
        <section className="gallery-hero">
          <div className="gallery-badge">
            <Sparkles size={12} />
            No account needed
          </div>
          <h1 className="gallery-title">Play published games</h1>
          <p className="gallery-subtitle">
            Interactive stories built with DiaLogic Ngine. Pick one and start playing —
            registration is only needed to make your own.
          </p>

          <InputGroup className="gallery-search" inside>
            <InputGroup.Addon>
              <Search size={14} />
            </InputGroup.Addon>
            <Input
              placeholder="Search games…"
              value={searchInput}
              onChange={setSearchInput}
              data-testid="gallery-search"
            />
          </InputGroup>
        </section>

        <section className="gallery-list">
          <div className="gallery-list-header">
            <div className="gallery-list-title">
              <h2>{search ? 'Search results' : 'Published games'}</h2>
              {!loading && total > 0 && <span className="gallery-count">{total}</span>}
              {loading && <Loader size="xs" />}
            </div>
            {totalPages > 1 && (
              <div className="gallery-pagination">
                <button
                  type="button"
                  className="gallery-pagination-btn"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="gallery-pagination-label">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="gallery-pagination-btn"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="gallery-grid">
            {!loading && games.length === 0 && (
              <div className="gallery-empty" data-testid="gallery-empty">
                <div className="gallery-empty-icon">
                  <Gamepad2 size={24} />
                </div>
                {failed ? (
                  <p>Could not reach the server. Try again in a moment.</p>
                ) : search ? (
                  <p>
                    No published game matches <strong>{search}</strong>.
                  </p>
                ) : (
                  <p>
                    No games published yet — <strong>sign in</strong> to build and publish
                    the first one.
                  </p>
                )}
              </div>
            )}

            {games.map((game) => (
              <GameCard key={game.name} game={game} onPlay={handlePlay} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GalleryPage;
