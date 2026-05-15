import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputGroup, Loader, Modal, Panel, Stack, Tag } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import { GameDescription, createDefaultGame } from '../../game/GameDescription';
import {
  ProjectMeta,
  ProjectsPage,
  deleteProjectFromServer,
  listServerProjects,
  loadProjectFromServer,
  saveProjectToServer,
} from '../../api/projectsApi';

interface HomePageProps {
  onOpenProject: (game: GameDescription, name: string) => void;
}

interface ProjectCardProps {
  project: ProjectMeta;
  opening: boolean;
  anyBusy: boolean;
  deleting: boolean;
  onOpen: (name: string) => void;
  onDelete: (name: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  opening,
  anyBusy,
  deleting,
  onOpen,
  onDelete,
}) => {
  const displayName = project.displayName || project.name;
  const showId = project.displayName && project.displayName !== project.name;

  return (
    <Panel bordered className="home-project-card" data-testid="project-card">
      <Stack spacing={12} alignItems="flex-start">
        {project.mainImageUrl && (
          <img
            src={project.mainImageUrl}
            alt={displayName}
            className="home-project-thumb"
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Stack justifyContent="space-between" alignItems="flex-start">
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="home-project-name">{displayName}</span>
              {showId && (
                <span className="home-project-id">{project.name}</span>
              )}
              {project.authors && project.authors.length > 0 && (
                <span className="home-project-authors">
                  {project.authors.join(', ')}
                </span>
              )}
              {project.description && (
                <p className="home-project-description">{project.description}</p>
              )}
            </div>
            <Stack spacing={6} alignItems="center" style={{ flexShrink: 0, marginLeft: 8 }}>
              <Button
                size="sm"
                color="red"
                appearance="subtle"
                disabled={anyBusy}
                loading={deleting}
                onClick={() => onDelete(project.name)}
                data-testid="delete-project-btn"
              >
                Delete
              </Button>
              <Button
                appearance="primary"
                size="sm"
                loading={opening}
                disabled={anyBusy}
                onClick={() => onOpen(project.name)}
                data-testid="open-project-btn"
              >
                Open
              </Button>
            </Stack>
          </Stack>
          <Stack spacing={6} style={{ marginTop: 8 }}>
            {project.dialogCount !== undefined && (
              <Tag size="sm">{project.dialogCount} dialogs</Tag>
            )}
            {project.characterCount !== undefined && (
              <Tag size="sm">{project.characterCount} chars</Tag>
            )}
            {project.locationCount !== undefined && (
              <Tag size="sm">{project.locationCount} locs</Tag>
            )}
          </Stack>
        </div>
      </Stack>
    </Panel>
  );
};

const HomePage: React.FC<HomePageProps> = ({ onOpenProject }) => {
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
    <div className="home-page">
      <div className="home-hero">
        <p className="home-title">🇺🇦 DiaLogic Ngine</p>
        <p className="home-subtitle">Visual novel &amp; dialogue game editor</p>
      </div>

      <div className="home-content">
        <Panel bordered className="home-create-panel">
          <p className="home-section-label">New project</p>
          <InputGroup>
            <Input
              placeholder="Project name"
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
        </Panel>

        <div className="home-projects">
          <Stack
            justifyContent="space-between"
            alignItems="center"
            style={{ marginLeft: 8, marginRight: 8, marginBottom: 4 }}
          >
            <p className="home-section-label" style={{ margin: 0 }}>
              Saved projects
              {loadingList && <Loader size="xs" style={{ marginLeft: 8 }} />}
            </p>
            {totalPages > 1 && (
              <Stack spacing={8} alignItems="center">
                <Button
                  size="xs"
                  appearance="subtle"
                  disabled={page <= 1 || loadingList}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ←
                </Button>
                <span style={{ fontSize: '0.85em', color: '#888' }}>
                  {page} / {totalPages}
                </span>
                <Button
                  size="xs"
                  appearance="subtle"
                  disabled={page >= totalPages || loadingList}
                  onClick={() => setPage((p) => p + 1)}
                >
                  →
                </Button>
              </Stack>
            )}
          </Stack>

          {!loadingList && projects.length === 0 && (
            <Panel bordered className="home-empty">
              <p>No projects yet — create one above.</p>
            </Panel>
          )}

          <Stack direction="column" spacing={8}>
            {projects.map((proj) => (
              <ProjectCard
                key={proj.name}
                project={proj}
                opening={openingName === proj.name}
                anyBusy={anyBusy}
                deleting={deletingName === proj.name}
                onOpen={handleOpen}
                onDelete={setConfirmDelete}
              />
            ))}
          </Stack>
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
