import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, IconButton, Loader, Panel, Stack, Tag } from 'rsuite';
import TrashIcon from '@rsuite/icons/Trash';
import ReloadIcon from '@rsuite/icons/Reload';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from '../../App';
import { resolveImageProject, projectImageApiBase } from '../common/projectImages';
import { countImageReferences, removeImageReferences } from '../../game/imageRefs';
import PillLikeTabs, { PillTab } from '../common/PillLikeTabs';
import ConfirmationDialog from '../ConfirmationDialog';
import type { PromptHistoryEntry } from '../ai/PromptHistory';

const WORKFLOW_LABELS: Record<string, string> = {
  dialog: 'Dialog generation',
  text: 'Text generation',
  image: 'Image generation',
};

const fmtTime = (ts: number): string => {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
};

type PendingImageAction =
  | { type: 'single'; filename: string }
  | { type: 'unused' }
  | { type: 'hard' };

const ResourcesMenu: React.FC = () => {
  const { game, updates, projectName, handleNotify } = useOutletContext<AppOutletContext>();
  const project = resolveImageProject(projectName);
  const apiBase = projectImageApiBase(project);

  // ── AI prompts state ──
  const [groups, setGroups] = useState<Record<string, PromptHistoryEntry[]>>({});
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [confirmClearPrompts, setConfirmClearPrompts] = useState(false);

  // ── Images state ──
  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImageAction | null>(null);

  const promptsBase = `/api/v1/prompts/${encodeURIComponent(project)}`;
  const thumbUrl = useCallback(
    (filename: string) => `${apiBase}/image_thumbs/${encodeURIComponent(filename)}`,
    [apiBase]
  );
  const deleteImage = useCallback(
    (filename: string) => fetch(`${apiBase}/images/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
    [apiBase]
  );

  // ── Reference counting ──
  const refCounts = useMemo(
    () => countImageReferences(game, images),
    [game, images]
  );
  const unusedImages = useMemo(
    () => images.filter(f => (refCounts[f] ?? 0) === 0),
    [images, refCounts]
  );

  // ── Loaders ──
  const refreshPrompts = useCallback(async () => {
    setLoadingPrompts(true);
    try {
      const r = await fetch(promptsBase);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json();
      setGroups(data && typeof data === 'object' ? data : {});
    } catch (e) {
      handleNotify('error', `Could not load prompts: ${e}`, null);
      setGroups({});
    } finally {
      setLoadingPrompts(false);
    }
  }, [promptsBase, handleNotify]);

  const refreshImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const r = await fetch(`${apiBase}/images`);
      const data = await r.json();
      setImages(Array.isArray(data.images) ? data.images : []);
    } catch {
      setImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, [apiBase]);

  useEffect(() => { refreshPrompts(); }, [refreshPrompts]);
  useEffect(() => { refreshImages(); }, [refreshImages]);

  // ── Prompt actions ──
  const clearAllPrompts = useCallback(async () => {
    setConfirmClearPrompts(false);
    try {
      const r = await fetch(promptsBase, { method: 'DELETE' });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      setGroups({});
      handleNotify('success', 'Deleted all stored prompts', null);
    } catch (e) {
      handleNotify('error', `Cleanup failed: ${e}`, null);
    }
  }, [promptsBase, handleNotify]);

  const deletePromptEntry = useCallback(async (workflow: string, ts: number) => {
    setGroups(prev => ({
      ...prev,
      [workflow]: (prev[workflow] ?? []).filter(e => e.ts !== ts),
    }));
    try {
      await fetch(`${promptsBase}/${encodeURIComponent(workflow)}/${ts}`, { method: 'DELETE' });
    } catch {
      refreshPrompts();
    }
  }, [promptsBase, refreshPrompts]);

  const workflows = useMemo(
    () => Object.keys(groups).filter(wf => (groups[wf] ?? []).length > 0).sort(),
    [groups]
  );
  const totalPrompts = useMemo(
    () => workflows.reduce((sum, wf) => sum + (groups[wf]?.length ?? 0), 0),
    [workflows, groups]
  );

  // ── Image actions ──
  /** Delete files from the server; when stripRefs, also remove their references from the game. */
  const deleteImages = useCallback(async (filenames: string[], stripRefs: boolean) => {
    if (filenames.length === 0) return;
    setBusy(true);
    let removedRefs = 0;
    try {
      for (const f of filenames) {
        removedRefs += refCounts[f] ?? 0;
        await deleteImage(f);
      }
      if (stripRefs && removedRefs > 0) {
        updates.handleGameUpdate(removeImageReferences(game, filenames));
      }
      const refMsg = stripRefs && removedRefs > 0 ? ` and removed ${removedRefs} reference(s) from the game` : '';
      handleNotify('success', `Deleted ${filenames.length} image(s)${refMsg}`, null);
    } catch (e) {
      handleNotify('error', `Delete failed: ${e}`, null);
    } finally {
      refreshImages();
      setBusy(false);
    }
  }, [deleteImage, refreshImages, refCounts, game, updates, handleNotify]);

  const confirmPending = useCallback(async () => {
    const action = pendingImage;
    setPendingImage(null);
    if (!action) return;
    if (action.type === 'single') await deleteImages([action.filename], true);
    else if (action.type === 'unused') await deleteImages(unusedImages, false);
    else if (action.type === 'hard') await deleteImages(images, true);
  }, [pendingImage, deleteImages, unusedImages, images]);

  const pendingText = (): { header: string; text: string } => {
    if (pendingImage?.type === 'single') {
      const n = refCounts[pendingImage.filename] ?? 0;
      return {
        header: `Delete "${pendingImage.filename}"?`,
        text: n > 0
          ? `This image is referenced ${n} time(s) in the game. Deleting it will remove those references from the game and cannot be undone.`
          : 'This image has no references. Delete it from the server?',
      };
    }
    if (pendingImage?.type === 'unused') {
      return {
        header: `Delete ${unusedImages.length} unused image(s)?`,
        text: 'This removes every image with zero references from the server. The game is not modified.',
      };
    }
    return {
      header: `Hard cleanup — delete ALL ${images.length} image(s)?`,
      text: '⚠️ This deletes every image, including ones still in use. It WILL break visuals in your game. References to deleted images will be removed from the game model. This cannot be undone.',
    };
  };

  const imagesTab = (
    <div className="saveload-content">
        <Panel bordered className="saveload-section">
          <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 10 }}>
            <p className="home-section-label" style={{ margin: 0 }}>
              Images
              {images.length > 0 && (
                <Tag size="sm" color="cyan" style={{ marginLeft: 8 }}>{images.length}</Tag>
              )}
              {unusedImages.length > 0 && (
                <Tag size="sm" color="orange" style={{ marginLeft: 6 }}>{unusedImages.length} unused</Tag>
              )}
            </p>
            <Stack spacing={8}>
              <Button size="xs" appearance="subtle" onClick={refreshImages} disabled={loadingImages || busy}>
                {loadingImages ? <Loader size="xs" /> : <ReloadIcon />}
              </Button>
              <Button
                size="xs"
                appearance="ghost"
                color="orange"
                disabled={busy || unusedImages.length === 0}
                onClick={() => setPendingImage({ type: 'unused' })}
              >
                Cleanup unused
              </Button>
              <Button
                size="xs"
                appearance="ghost"
                color="red"
                disabled={busy || images.length === 0}
                onClick={() => setPendingImage({ type: 'hard' })}
              >
                Hard cleanup
              </Button>
            </Stack>
          </Stack>

          <p style={{ color: '#888', fontSize: '0.85em', marginBottom: 12 }}>
            All uploaded &amp; generated images for project <strong>{project}</strong>. The
            reference count is how many times each image is used across the game.
          </p>

          {!loadingImages && images.length === 0 && (
            <p style={{ color: '#666', fontSize: '0.9em' }}>No images uploaded yet.</p>
          )}

          <div className="resource-image-grid">
            {images.map(filename => {
              const refs = refCounts[filename] ?? 0;
              return (
                <div key={filename} className={`resource-image-card${refs === 0 ? ' is-unused' : ''}`}>
                  <img
                    className="resource-image-thumb"
                    src={thumbUrl(filename)}
                    alt={filename}
                    loading="lazy"
                  />
                  <div className="resource-image-name" title={filename}>{filename}</div>
                  <div className="resource-image-footer">
                    <Tag size="sm" color={refs === 0 ? 'red' : 'green'}>
                      {refs === 0 ? 'unused' : `${refs} ref${refs === 1 ? '' : 's'}`}
                    </Tag>
                    <IconButton
                      size="xs"
                      appearance="subtle"
                      icon={<TrashIcon />}
                      title="Delete image"
                      disabled={busy}
                      onClick={() => setPendingImage({ type: 'single', filename })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
    </div>
  );

  const promptsTab = (
    <div className="saveload-content">
        <Panel bordered className="saveload-section">
          <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 10 }}>
            <p className="home-section-label" style={{ margin: 0 }}>
              AI prompts
              {totalPrompts > 0 && (
                <Tag size="sm" color="cyan" style={{ marginLeft: 8 }}>{totalPrompts}</Tag>
              )}
            </p>
            <Stack spacing={8}>
              <Button size="xs" appearance="subtle" onClick={refreshPrompts} disabled={loadingPrompts}>
                {loadingPrompts ? <Loader size="xs" /> : <ReloadIcon />}
              </Button>
              <IconButton
                size="xs"
                appearance="subtle"
                color="red"
                icon={<TrashIcon />}
                title="Delete all stored prompts"
                disabled={loadingPrompts || totalPrompts === 0}
                onClick={() => setConfirmClearPrompts(true)}
              >
                Cleanup
              </IconButton>
            </Stack>
          </Stack>

          <p style={{ color: '#888', fontSize: '0.85em', marginBottom: 12 }}>
            Past prompts used for AI generation, stored on the server.
          </p>

          {!loadingPrompts && totalPrompts === 0 && (
            <p style={{ color: '#666', fontSize: '0.9em' }}>No stored prompts yet.</p>
          )}

          {workflows.map(wf => (
            <div key={wf} style={{ marginBottom: 16 }}>
              <p className="home-section-label" style={{ fontSize: '0.85em', marginBottom: 6 }}>
                {WORKFLOW_LABELS[wf] ?? wf}
                <Tag size="sm" style={{ marginLeft: 8 }}>{groups[wf].length}</Tag>
              </p>
              <Stack direction="column" spacing={4} alignItems="stretch">
                {groups[wf].map(entry => (
                  <div key={entry.ts} className="resource-prompt-row">
                    <div className="resource-prompt-text">{entry.prompt}</div>
                    <div className="resource-prompt-meta">
                      <span>{fmtTime(entry.ts)}</span>
                      <IconButton
                        size="xs"
                        appearance="subtle"
                        icon={<TrashIcon />}
                        title="Delete this prompt"
                        onClick={() => deletePromptEntry(wf, entry.ts)}
                      />
                    </div>
                  </div>
                ))}
              </Stack>
            </div>
          ))}
        </Panel>
    </div>
  );

  const tabs: PillTab[] = [
    { header: 'Images', content: imagesTab },
    { header: 'AI prompts', content: promptsTab },
  ];

  return (
    <div className="saveload-page">
      <h2 className="center-header">Resources</h2>
      <PillLikeTabs tabs={tabs} />

      {confirmClearPrompts && (
        <ConfirmationDialog
          header="Delete all prompts?"
          text={`This permanently removes all ${totalPrompts} stored prompt(s) for "${project}" from the server.`}
          onConfirm={clearAllPrompts}
          onClose={() => setConfirmClearPrompts(false)}
        />
      )}

      {pendingImage && (
        <ConfirmationDialog
          header={pendingText().header}
          text={pendingText().text}
          onConfirm={confirmPending}
          onClose={() => setPendingImage(null)}
        />
      )}
    </div>
  );
};

export default ResourcesMenu;
