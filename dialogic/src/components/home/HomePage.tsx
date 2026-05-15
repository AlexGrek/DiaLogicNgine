import React, { useState } from 'react';
import { Button, Panel, Stack } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import { SaveLoadManager } from '../../SaveLoadManager';
import { GameDescription } from '../../game/GameDescription';
import { KeyValuePair } from '../../Utils';

interface HomePageProps {
  onOpenProject: (game: GameDescription) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onOpenProject }) => {
  const navigate = useNavigate();
  const [projects] = useState<KeyValuePair<string, GameDescription>[]>(
    () => new SaveLoadManager().listGameDescr()
  );

  const handleOpen = (name: string) => {
    const game = new SaveLoadManager().loadGameDescr(name);
    if (game) {
      onOpenProject(game);
      navigate('/dialog');
    }
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <p className="home-title">🇺🇦 DiaLogic Ngine</p>
        <p className="home-subtitle">Visual novel &amp; dialogue game editor</p>
      </div>
      <div className="home-content">
        <Button
          appearance="primary"
          size="lg"
          className="home-new-btn"
          onClick={() => navigate('/dialog')}
        >
          + New Project
        </Button>

        {projects.length > 0 && (
          <div className="home-projects">
            <p className="home-section-label">Saved projects</p>
            <Stack direction="column" spacing={8}>
              {projects.map((p) => (
                <Panel key={p.key} bordered className="home-project-card">
                  <Stack justifyContent="space-between" alignItems="center">
                    <div>
                      <span className="home-project-name">{p.key}</span>
                      {p.value.general?.name && p.value.general.name !== p.key && (
                        <span className="home-project-title">{p.value.general.name}</span>
                      )}
                    </div>
                    <Button appearance="primary" onClick={() => handleOpen(p.key)}>
                      Open
                    </Button>
                  </Stack>
                </Panel>
              ))}
            </Stack>
          </div>
        )}

        {projects.length === 0 && (
          <Panel bordered className="home-empty">
            <p>No saved projects yet. Create a new one to get started.</p>
          </Panel>
        )}
      </div>
    </div>
  );
};

export default HomePage;
