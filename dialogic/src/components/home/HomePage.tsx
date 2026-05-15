import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputGroup, Loader, Panel, Stack } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import { GameDescription, createDefaultGame } from '../../game/GameDescription';
import { listServerProjects, loadProjectFromServer, saveProjectToServer } from '../../api/projectsApi';

interface HomePageProps {
  onOpenProject: (game: GameDescription, name: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onOpenProject }) => {
  const navigate = useNavigate();
  const [serverProjects, setServerProjects] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [openingName, setOpeningName] = useState<string | null>(null);

  const refreshList = useCallback(() => {
    setLoadingList(true);
    listServerProjects()
      .then(setServerProjects)
      .catch(() => setServerProjects([]))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => { refreshList(); }, [refreshList]);

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

  const handleOpen = useCallback(async (name: string) => {
    setOpeningName(name);
    try {
      const game = await loadProjectFromServer(name);
      onOpenProject(game, name);
      navigate('/dialog');
    } catch {
      setOpeningName(null);
    }
  }, [onOpenProject, navigate]);

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
            />
            <InputGroup.Button
              appearance="primary"
              disabled={!newName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? <Loader size="xs" /> : 'Create'}
            </InputGroup.Button>
          </InputGroup>
        </Panel>

        <div className="home-projects">
          <p className="home-section-label">
            Saved projects
            {loadingList && <Loader size="xs" style={{ marginLeft: 8 }} />}
          </p>
          {!loadingList && serverProjects.length === 0 && (
            <Panel bordered className="home-empty">
              <p>No projects yet — create one above.</p>
            </Panel>
          )}
          <Stack direction="column" spacing={8}>
            {serverProjects.map((name) => (
              <Panel key={name} bordered className="home-project-card">
                <Stack justifyContent="space-between" alignItems="center">
                  <span className="home-project-name">{name}</span>
                  <Button
                    appearance="primary"
                    size="sm"
                    loading={openingName === name}
                    disabled={openingName !== null}
                    onClick={() => handleOpen(name)}
                  >
                    Open
                  </Button>
                </Stack>
              </Panel>
            ))}
          </Stack>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
