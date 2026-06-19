import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Message, Modal } from 'rsuite';
import { changePassword } from '../../api/authApi';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reset form whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      setError(null);
      setBusy(false);
      setDone(false);
    }
  }, [open]);

  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const canSubmit =
    !busy &&
    oldPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword === confirm;

  const handleSubmit = useCallback(async () => {
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changePassword(oldPassword, newPassword);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  }, [oldPassword, newPassword, confirm]);

  return (
    <Modal open={open} onClose={onClose} size="xs" data-testid="change-password-modal">
      <Modal.Header>
        <Modal.Title>Change password</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {done ? (
          <Message type="success" showIcon data-testid="change-password-success">
            Password changed successfully.
          </Message>
        ) : (
          <>
            {error && (
              <Message type="error" showIcon style={{ marginBottom: 16 }}>
                {error}
              </Message>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                Current password
              </label>
              <Input
                type="password"
                value={oldPassword}
                onChange={setOldPassword}
                disabled={busy}
                data-testid="change-password-old"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                New password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                disabled={busy}
                data-testid="change-password-new"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                Confirm new password
              </label>
              <Input
                type="password"
                value={confirm}
                onChange={setConfirm}
                disabled={busy}
                onPressEnter={canSubmit ? handleSubmit : undefined}
                data-testid="change-password-confirm"
              />
              {mismatch && (
                <p
                  style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}
                  data-testid="change-password-mismatch"
                >
                  Passwords do not match.
                </p>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {done ? (
          <Button appearance="primary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button appearance="subtle" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSubmit}
              loading={busy}
              disabled={!canSubmit}
              data-testid="change-password-submit"
            >
              Change password
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ChangePasswordModal;
