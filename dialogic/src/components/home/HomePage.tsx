import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputGroup, Loader, Modal } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  MapPin,
  MessageSquare,
  MousePointerClick,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { AuthUser } from '../../api/authApi';
import UserMenu from '../auth/UserMenu';
import { GameDescription, createDefaultGame } from '../../game/GameDescription';
import {
  ProjectMeta,
  ProjectsPage,
  deleteProjectFromServer,
  listServerProjects,
  loadProjectFromServer,
  saveProjectToServer,
} from '../../api/projectsApi';
import './HomePage.css';

interface HomePageProps {
  onOpenProject: (game: GameDescription, name: string) => void;
  currentUser: AuthUser;
  onLogout: () => void;
}

function formatLastModified(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ProjectCardProps {
  project: ProjectMeta;
  opening: boolean;
  anyBusy: boolean;
  deleting: boolean;
  onOpen: (name: string) => void;
  onPlay: (name: string) => void;
  onDelete: (name: string) => void;
}

const FEATURES = [
  { icon: MessageSquare, label: 'Dialog graphs' },
  { icon: Users, label: 'Characters' },
  { icon: MapPin, label: 'Locations' },
  { icon: Target, label: 'Quests' },
  { icon: MousePointerClick, label: 'Point & click' },
] as const;

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  opening,
  anyBusy,
  deleting,
  onOpen,
  onPlay,
  onDelete,
}) => {
  const displayName = project.displayName || project.name;
  const showId = project.displayName && project.displayName !== project.name;
  const lastModified = formatLastModified(project.lastModified);

  return (
    <article className="home-project-card" data-testid="project-card">
      <div className="home-project-card-media">
        {project.mainImageUrl ? (
          <img
            src={project.mainImageUrl}
            alt={displayName}
            className="home-project-thumb"
          />
        ) : (
          <div className="home-project-thumb-placeholder">
            <FolderOpen size={32} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="home-project-card-body">
        <div>
          <div className="home-project-name">{displayName}</div>
          {showId && <span className="home-project-id">{project.name}</span>}
          {project.authors && project.authors.length > 0 && (
            <span className="home-project-authors">
              {project.authors.join(', ')}
            </span>
          )}
          {project.description && (
            <p className="home-project-description">{project.description}</p>
          )}
        </div>

        <div className="home-project-stats">
          {project.dialogCount !== undefined && (
            <span className="home-project-stat">
              <MessageSquare />
              {project.dialogCount}
            </span>
          )}
          {project.characterCount !== undefined && (
            <span className="home-project-stat">
              <Users />
              {project.characterCount}
            </span>
          )}
          {project.locationCount !== undefined && (
            <span className="home-project-stat">
              <MapPin />
              {project.locationCount}
            </span>
          )}
          {lastModified && (
            <span className="home-project-modified">Updated {lastModified}</span>
          )}
        </div>

        <div className="home-project-actions">
          <Button
            size="sm"
            color="red"
            appearance="subtle"
            disabled={anyBusy}
            loading={deleting}
            onClick={() => onDelete(project.name)}
            data-testid="delete-project-btn"
          >
            <Trash2 size={14} style={{ marginRight: 4 }} />
            Delete
          </Button>
          <Button
            appearance="primary"
            size="sm"
            disabled={anyBusy}
            onClick={() => onPlay(project.name)}
            data-testid="play-project-btn"
            className="home-project-play-btn"
          >
            <Play size={14} style={{ marginRight: 4 }} />
            Play
          </Button>
          <Button
            appearance="primary"
            size="sm"
            loading={opening}
            disabled={anyBusy}
            onClick={() => onOpen(project.name)}
            data-testid="open-project-btn"
          >
            <BookOpen size={14} style={{ marginRight: 4 }} />
            Open
          </Button>
        </div>
      </div>
    </article>
  );
};

const HomePage: React.FC<HomePageProps> = ({ onOpenProject, currentUser, onLogout }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState<ProjectsPage | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [openingName, setOpeningName] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refreshList = useCallback((p: number) => {
    setLoadingList(true);
    listServerProjects(p)
      .then(setProjectsPage)
      .catch(() => setProjectsPage(null))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    refreshList(page);
  }, [refreshList, page]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const game = createDefaultGame();
      game.general.name = name;
      await saveProjectToServer(name, game);
      onOpenProject(game, name);
      navigate('/dialog');
    } catch {
      setCreating(false);
    }
  }, [newName, onOpenProject, navigate]);

  const handlePlay = useCallback(
    (name: string) => {
      navigate(`/play/${encodeURIComponent(name)}`);
    },
    [navigate]
  );

  const handleOpen = useCallback(
    async (name: string) => {
      setOpeningName(name);
      try {
        const game = await loadProjectFromServer(name);
        onOpenProject(game, name);
        navigate('/dialog');
      } catch {
        setOpeningName(null);
      }
    },
    [onOpenProject, navigate]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    const name = confirmDelete;
    setConfirmDelete(null);
    setDeletingName(name);
    try {
      await deleteProjectFromServer(name);
      const newPage = page > 1 && projectsPage?.projects.length === 1 ? page - 1 : page;
      setPage(newPage);
      refreshList(newPage);
    } finally {
      setDeletingName(null);
    }
  }, [confirmDelete, page, projectsPage, refreshList]);

  const projects = projectsPage?.projects ?? [];
  const total = projectsPage?.total ?? 0;
  const pageSize = projectsPage?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const anyBusy = openingName !== null || deletingName !== null;

  return (
    <div className="home-page" data-testid="home-page">
      <div className="home-orb home-orb--1" aria-hidden />
      <div className="home-orb home-orb--2" aria-hidden />
      <div className="home-orb home-orb--3" aria-hidden />

      <UserMenu
        className="home-userbar"
        username={currentUser.username}
        onLogout={onLogout}
      />

      <div className="home-inner">
        <header className="home-hero">
          <div className="home-badge">
            <Sparkles size={12} />
            Visual novel engine
          </div>
          <h1 className="home-title">🇺🇦 DiaLogic Ngine</h1>
          <p className="home-subtitle">
            Design branching stories, characters, and worlds — then play them instantly.
          </p>
          <div className="home-features">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span key={label} className="home-feature">
                <Icon />
                {label}
              </span>
            ))}
          </div>
        </header>

        <div className="home-content">
          <section className="home-glass home-create-panel">
            <div className="home-create-header">
              <div className="home-create-icon">
                <Plus size={20} />
              </div>
              <div>
                <p className="home-section-label">New project</p>
                <p className="home-section-title">Start from scratch</p>
              </div>
            </div>
            <InputGroup className="home-create-input">
              <Input
                placeholder="Give your story a name…"
                value={newName}
                onChange={setNewName}
                onPressEnter={handleCreate}
                disabled={creating}
                data-testid="new-project-input"
              />
              <InputGroup.Button
                appearance="primary"
                disabled={!newName.trim() || creating}
                onClick={handleCreate}
                data-testid="create-project-btn"
              >
                {creating ? <Loader size="xs" /> : 'Create'}
              </InputGroup.Button>
            </InputGroup>
          </section>

          <section className="home-projects">
            <div className="home-projects-header">
              <div className="home-projects-title">
                <h2>Saved projects</h2>
                {!loadingList && total > 0 && (
                  <span className="home-project-count">{total}</span>
                )}
                {loadingList && <Loader size="xs" />}
              </div>
              {totalPages > 1 && (
                <div className="home-pagination">
                  <button
                    type="button"
                    className="home-pagination-btn"
                    disabled={page <= 1 || loadingList}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="home-pagination-label">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="home-pagination-btn"
                    disabled={page >= totalPages || loadingList}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="home-project-grid">
              {!loadingList && projects.length === 0 && (
                <div className="home-empty">
                  <div className="home-empty-icon">
                    <FolderOpen size={24} />
                  </div>
                  <p>
                    No projects yet — <strong>create one above</strong> to get started.
                  </p>
                </div>
              )}

              {projects.map((proj) => (
                <ProjectCard
                  key={proj.name}
                  project={proj}
                  opening={openingName === proj.name}
                  anyBusy={anyBusy}
                  deleting={deletingName === proj.name}
                  onOpen={handleOpen}
                  onPlay={handlePlay}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={confirmDelete !== null}
        size="xs"
        onClose={() => setConfirmDelete(null)}
        data-testid="delete-confirm-modal"
      >
        <Modal.Header>
          <Modal.Title>Delete project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete <strong>{confirmDelete}</strong>? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setConfirmDelete(null)} appearance="subtle">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="red"
            appearance="primary"
            data-testid="confirm-delete-btn"
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const PAGE_SIZE = 10;

export default HomePage;
