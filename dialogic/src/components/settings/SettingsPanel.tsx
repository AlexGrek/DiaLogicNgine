import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  IconButton,
  Input,
  Loader,
  Message,
  Panel,
  PanelGroup,
  Stack,
  Toggle,
} from 'rsuite';
import GearIcon from '@rsuite/icons/Gear';

// ---------------------------------------------------------------------------
// App-level preferences (stored in localStorage)
// ---------------------------------------------------------------------------

export interface AppSettings {
  compactSidebar: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_SETTINGS: AppSettings = {
  compactSidebar: false,
};

const STORAGE_KEY = 'dialogicngine_app_settings';

// eslint-disable-next-line react-refresh/only-export-components
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

// eslint-disable-next-line react-refresh/only-export-components
export function saveSettings(s: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// OffloadMQ connection panel
// ---------------------------------------------------------------------------

interface OffloadMqStatus {
  url: string;
  api_key_masked: string;
  configured: boolean;
}

const OffloadMqPanel: React.FC = () => {
  const [status, setStatus] = useState<OffloadMqStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetch('/api/v1/settings/offloadmq');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: OffloadMqStatus = await r.json();
      setStatus(data);
      setUrl(data.url);
    } catch (e) {
      setLoadError(String(e));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch('/api/v1/settings/offloadmq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, api_key: apiKey }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaveMsg({ type: 'success', text: 'Saved.' });
      setApiKey('');
      await fetchStatus();
    } catch (e) {
      setSaveMsg({ type: 'error', text: String(e) });
    } finally {
      setSaving(false);
    }
  }, [url, apiKey, fetchStatus]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await fetch('/api/v1/imggen/models');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const models: string[] = await r.json();
      setTestMsg({ type: 'success', text: `Connected. Models: ${models.join(', ') || '(none)'}` });
    } catch (e) {
      setTestMsg({ type: 'error', text: String(e) });
    } finally {
      setTesting(false);
    }
  }, []);

  if (loadError) {
    return <Message type="error">Failed to load config: {loadError}</Message>;
  }

  if (!status) {
    return <Loader content="Loading…" />;
  }

  return (
    <Stack direction="column" spacing={12} alignItems="stretch">
      <Stack justifyContent="space-between" alignItems="center">
        <span style={{ fontSize: 12, color: '#aaa' }}>Status</span>
        <span
          style={{
            fontSize: 12,
            color: status.configured ? '#4caf50' : '#f44336',
            fontWeight: 600,
          }}
        >
          {status.configured ? 'Configured' : 'Not configured'}
        </span>
      </Stack>

      <Form fluid>
        <Form.Group>
          <Form.ControlLabel>Server URL</Form.ControlLabel>
          <Input
            placeholder="https://offloadmq.example.com"
            value={url}
            onChange={setUrl}
          />
        </Form.Group>

        <Form.Group>
          <Form.ControlLabel>
            API Key
            {status.api_key_masked && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>
                current: {status.api_key_masked}
              </span>
            )}
          </Form.ControlLabel>
          <Input
            type="password"
            placeholder="Leave blank to keep existing"
            value={apiKey}
            onChange={setApiKey}
          />
        </Form.Group>
      </Form>

      <Stack spacing={8}>
        <Button
          appearance="primary"
          size="sm"
          loading={saving}
          onClick={handleSave}
          disabled={!url && !apiKey}
        >
          Save
        </Button>
        <Button
          appearance="ghost"
          size="sm"
          loading={testing}
          onClick={handleTest}
        >
          Test connection
        </Button>
      </Stack>

      {saveMsg && (
        <Message type={saveMsg.type} closable onClose={() => setSaveMsg(null)}>
          {saveMsg.text}
        </Message>
      )}
      {testMsg && (
        <Message type={testMsg.type} closable onClose={() => setTestMsg(null)}>
          {testMsg.text}
        </Message>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Settings panel (Drawer)
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose, settings, onSettingsChange }) => {
  const handleToggle = useCallback(
    (key: keyof AppSettings, value: boolean) => {
      const next = { ...settings, [key]: value };
      onSettingsChange(next);
      saveSettings(next);
    },
    [settings, onSettingsChange]
  );

  return (
    <Drawer open={open} onClose={onClose} size="xs" placement="right">
      <Drawer.Header>
        <Drawer.Title>Settings</Drawer.Title>
      </Drawer.Header>
      <Drawer.Body>
        <PanelGroup accordion bordered>
          <Panel header="OffloadMQ connection" defaultExpanded>
            <OffloadMqPanel />
          </Panel>
          <Panel header="Editor preferences">
            <Stack direction="column" spacing={12} alignItems="flex-start">
              <Stack justifyContent="space-between" style={{ width: '100%' }}>
                <span>Compact sidebar</span>
                <Toggle
                  checked={settings.compactSidebar}
                  onChange={(v) => handleToggle('compactSidebar', v)}
                />
              </Stack>
            </Stack>
          </Panel>
        </PanelGroup>
      </Drawer.Body>
    </Drawer>
  );
};

// ---------------------------------------------------------------------------
// Header button
// ---------------------------------------------------------------------------

export interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick }) => (
  <IconButton
    className="header-settings-btn"
    appearance="subtle"
    icon={<GearIcon />}
    size="sm"
    onClick={onClick}
    title="Settings"
  />
);

export default SettingsPanel;
