import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, IconButton, Loader, Panel, Stack, Tag } from 'rsuite';
import TrashIcon from '@rsuite/icons/Trash';
import ReloadIcon from '@rsuite/icons/Reload';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from '../../App';
import { resolveImageProject } from '../common/projectImages';
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

const ResourcesMenu: React.FC = () => {
  const { projectName, handleNotify } = useOutletContext<AppOutletContext>();
  const project = resolveImageProject(projectName);

  const [groups, setGroups] = useState<Record<string, PromptHistoryEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const base = `/api/v1/prompts/${encodeURIComponent(project)}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(base);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json();
      setGroups(data && typeof data === 'object' ? data : {});
    } catch (e) {
      handleNotify('error', `Could not load prompts: ${e}`, null);
      setGroups({});
    } finally {
      setLoading(false);
    }
  }, [base, handleNotify]);

  useEffect(() => { refresh(); }, [refresh]);

  const clearAll = useCallback(async () => {
    setConfirmClear(false);
    try {
      const r = await fetch(base, { method: 'DELETE' });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      setGroups({});
      handleNotify('success', 'Deleted all stored prompts', null);
    } catch (e) {
      handleNotify('error', `Cleanup failed: ${e}`, null);
    }
  }, [base, handleNotify]);

  const deleteEntry = useCallback(async (workflow: string, ts: number) => {
    setGroups(prev => ({
      ...prev,
      [workflow]: (prev[workflow] ?? []).filter(e => e.ts !== ts),
    }));
    try {
      await fetch(`${base}/${encodeURIComponent(workflow)}/${ts}`, { method: 'DELETE' });
    } catch {
      refresh();
    }
  }, [base, refresh]);

  const workflows = useMemo(
    () => Object.keys(groups).filter(wf => (groups[wf] ?? []).length > 0).sort(),
    [groups]
  );

  const totalCount = useMemo(
    () => workflows.reduce((sum, wf) => sum + (groups[wf]?.length ?? 0), 0),
    [workflows, groups]
  );

  return (
    <div className="saveload-page">
      <h2 className="center-header">Resources</h2>

      <div className="saveload-content">
        <Panel bordered className="saveload-section">
          <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 10 }}>
            <p className="home-section-label" style={{ margin: 0 }}>
              AI prompts
              {totalCount > 0 && (
                <Tag size="sm" color="cyan" style={{ marginLeft: 8 }}>{totalCount}</Tag>
              )}
            </p>
            <Stack spacing={8}>
              <Button size="xs" appearance="subtle" onClick={refresh} disabled={loading}>
                {loading ? <Loader size="xs" /> : <ReloadIcon />}
              </Button>
              <IconButton
                size="xs"
                appearance="subtle"
                color="red"
                icon={<TrashIcon />}
                title="Delete all stored prompts"
                disabled={loading || totalCount === 0}
                onClick={() => setConfirmClear(true)}
              >
                Cleanup
              </IconButton>
            </Stack>
          </Stack>

          <p style={{ color: '#888', fontSize: '0.85em', marginBottom: 12 }}>
            Past prompts used for AI generation in project <strong>{project}</strong>,
            stored on the server.
          </p>

          {!loading && totalCount === 0 && (
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
                        onClick={() => deleteEntry(wf, entry.ts)}
                      />
                    </div>
                  </div>
                ))}
              </Stack>
            </div>
          ))}
        </Panel>
      </div>

      {confirmClear && (
        <ConfirmationDialog
          header="Delete all prompts?"
          text={`This permanently removes all ${totalCount} stored prompt(s) for "${project}" from the server.`}
          onConfirm={clearAll}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
};

export default ResourcesMenu;
