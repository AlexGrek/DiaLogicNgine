import { useEffect, useState } from 'react';
import { Button, Loader } from 'rsuite';
import { useNavigate, useParams } from 'react-router-dom';
import { loadProjectFromServer } from '../../api/projectsApi';
import { GameDescription } from '../../game/GameDescription';
import { ProjectImagesContext } from '../common/ProjectImagesContext';
import Player from '../player/Player';
import './PlayOnlyPage.css';

const PlayOnlyPage: React.FC = () => {
  const { projectName: encodedName } = useParams<{ projectName: string }>();
  const projectName = encodedName ? decodeURIComponent(encodedName) : '';
  const navigate = useNavigate();
  const [game, setGame] = useState<GameDescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectName) {
      setError('No project specified');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    loadProjectFromServer(projectName)
      .then(setGame)
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false));
  }, [projectName]);

  useEffect(() => {
    if (!game) return;
    const gameName = game.general?.name;
    document.title = gameName ? `${gameName} — Play` : 'Play — DiaLogic Ngine';
    return () => {
      document.title = 'DiaLogic Ngine';
    };
  }, [game]);

  const handleExit = () => navigate('/');

  if (loading) {
    return (
      <div className="play-only-page" data-testid="play-only-page">
        <Loader size="lg" content="Loading…" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="play-only-page play-only-page--error" data-testid="play-only-page">
        <p>{error ?? 'Project not found'}</p>
        <Button appearance="primary" onClick={handleExit}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="play-only-page" data-testid="play-only-page">
      <ProjectImagesContext.Provider value={projectName}>
        <Player game={game} playOnly onExit={handleExit} />
      </ProjectImagesContext.Provider>
    </div>
  );
};

export default PlayOnlyPage;
