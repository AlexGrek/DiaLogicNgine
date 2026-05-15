import React, { useCallback, useEffect, useState } from 'react';
import { Button, Divider, Input, InputGroup, Loader, Panel, Stack, Tag } from 'rsuite';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from '../../App';
import { ENGINE_VERSION, GameDescription } from '../../game/GameDescription';
import { loadJsonStringAndPatch } from '../../game/Patches';
import { listServerProjects, loadProjectFromServer, saveProjectToServer } from '../../api/projectsApi';
import { SaveLoadManager } from '../../SaveLoadManager';
import DownloadAsJson from './saveload/DownloadAsJson';
import UploadJson from './saveload/UploadJson';

const SaveLoadMenu: React.FC = () => {
  const { game, setGame, handleNotify, projectName, setProjectName } = useOutletContext<AppOutletContext>();

  const [serverProjects, setServerProjects] = useState<string[]>([]);
  const [localProjects, setLocalProjects] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingName, setOpeningName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(projectName);

  useEffect(() => { setNameInput(projectName); }, [projectName]);

  const refreshList = useCallback(() => {
    setLoadingList(true);
    setLocalProjects(new SaveLoadManager().listGameNames());
    listServerProjects()
      .then(setServerProjects)
      .catch(() => setServerProjects([]))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => { refreshList(); }, [refreshList]);

  const handleSave = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) return;
    setSaving(true);
    try {
      await saveProjectToServer(name, game);
      setProjectName(name);
      handleNotify('success', `Saved "${name}"`, null);
      refreshList();
    } catch (e) {
      handleNotify('error', `Save failed: ${e}`, null);
    } finally {
      setSaving(false);
    }
  }, [nameInput, game, setProjectName, handleNotify, refreshList]);

  const handleLoad = useCallback(async (name: string) => {
    setOpeningName(name);
    try {
      const loaded = await loadProjectFromServer(name);
      setGame(loaded);
      setProjectName(name);
      setNameInput(name);
      handleNotify('success', `Loaded "${name}"`, null);
    } catch (e) {
      handleNotify('error', `Load failed: ${e}`, null);
    } finally {
      setOpeningName(null);
    }
  }, [setGame, setProjectName, handleNotify]);

  const handleLoadLocal = useCallback((name: string) => {
    const descr = new SaveLoadManager().loadGameDescr(name);
    if (!descr) return;
    try {
      const loaded: GameDescription = loadJsonStringAndPatch(JSON.stringify(descr), ENGINE_VERSION);
      setGame(loaded);
      setProjectName(name);
      setNameInput(name);
      handleNotify('success', `Loaded "${name}" from local storage`, null);
    } catch (e) {
      handleNotify('error', `Local load failed: ${e}`, null);
    }
  }, [setGame, setProjectName, handleNotify]);

  const handleJsonUpload = useCallback((text: string) => {
    try {
      const parsed: GameDescription = loadJsonStringAndPatch(text, ENGINE_VERSION);
      if (!('dialogs' in parsed && 'facts' in parsed)) {
        handleNotify('error', 'Invalid game JSON', null);
        return;
      }
      setGame(parsed);
      handleNotify('success', 'Imported from JSON file', null);
    } catch (e) {
      handleNotify('error', `JSON parse error: ${e}`, null);
    }
  }, [setGame, handleNotify]);

  return (
    <div className="saveload-page">
      <h2 className="center-header">Save / Load</h2>

      <div className="saveload-content">
        {/* Current project */}
        <Panel bordered className="saveload-section">
          <p className="home-section-label">Current project</p>
          <Stack spacing={8} alignItems="flex-end">
            <InputGroup style={{ flex: 1 }}>
              <InputGroup.Addon>Name</InputGroup.Addon>
              <Input
                value={nameInput}
                onChange={setNameInput}
                onPressEnter={handleSave}
                placeholder="Enter project name…"
              />
            </InputGroup>
            <Button
              appearance="primary"
              disabled={!nameInput.trim() || saving}
              loading={saving}
              onClick={handleSave}
            >
              Save to server
            </Button>
          </Stack>
        </Panel>

        {/* Server projects */}
        <Panel bordered className="saveload-section">
          <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 10 }}>
            <p className="home-section-label" style={{ margin: 0 }}>Server projects</p>
            <Button size="xs" appearance="subtle" onClick={refreshList} disabled={loadingList}>
              {loadingList ? <Loader size="xs" /> : 'Refresh'}
            </Button>
          </Stack>

          {!loadingList && serverProjects.length === 0 && (
            <p style={{ color: '#666', fontSize: '0.9em' }}>No projects saved on server yet.</p>
          )}

          <Stack direction="column" spacing={6}>
            {serverProjects.map((name) => (
              <div key={name} className="saveload-project-row">
                <span className="saveload-project-name">
                  {name}
                  {name === projectName && (
                    <Tag size="sm" color="cyan" style={{ marginLeft: 8 }}>current</Tag>
                  )}
                </span>
                <Button
                  size="sm"
                  appearance="ghost"
                  loading={openingName === name}
                  disabled={openingName !== null}
                  onClick={() => handleLoad(name)}
                >
                  Load
                </Button>
              </div>
            ))}
          </Stack>
        </Panel>

        {/* Local storage (read-only, backwards compat) */}
        {localProjects.length > 0 && (
          <Panel bordered className="saveload-section">
            <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 10 }}>
              <p className="home-section-label" style={{ margin: 0 }}>Local saves</p>
              <Tag size="sm" color="yellow">read-only</Tag>
            </Stack>
            <Stack direction="column" spacing={6}>
              {localProjects.map((name) => (
                <div key={name} className="saveload-project-row">
                  <span className="saveload-project-name">{name}</span>
                  <Button
                    size="sm"
                    appearance="ghost"
                    disabled={openingName !== null}
                    onClick={() => handleLoadLocal(name)}
                  >
                    Load
                  </Button>
                </div>
              ))}
            </Stack>
          </Panel>
        )}

        {/* Import / Export */}
        <Panel bordered className="saveload-section">
          <p className="home-section-label">Import / Export JSON</p>
          <Stack spacing={12} alignItems="center">
            <DownloadAsJson data={game} filename={`${nameInput || 'game'}.json`} />
            <Divider vertical />
            <UploadJson onUpload={handleJsonUpload} />
          </Stack>
        </Panel>
      </div>
    </div>
  );
};

export default SaveLoadMenu;
