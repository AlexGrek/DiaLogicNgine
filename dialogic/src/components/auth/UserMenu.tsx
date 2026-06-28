import React, { useRef, useState } from 'react';
import { Popover, Whisper } from 'rsuite';
import type { WhisperInstance } from 'rsuite';
import { KeyRound, LogOut, User } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

interface UserMenuProps {
  username: string;
  onLogout: () => void;
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ username, onLogout, className }) => {
  const [pwOpen, setPwOpen] = useState(false);
  const triggerRef = useRef<WhisperInstance>(null);

  const close = () => triggerRef.current?.close();

  return (
    <div className={className}>
      <Whisper
        ref={triggerRef}
        placement="bottomEnd"
        trigger="click"
        speaker={
          <Popover className="user-menu-popover" full>
            <ul className="user-menu-list">
              <li
                className="user-menu-item"
                data-testid="change-password-menuitem"
                onClick={() => {
                  setPwOpen(true);
                  close();
                }}
              >
                <KeyRound size={14} style={{ marginRight: 8 }} />
                Change password
              </li>
              <li
                className="user-menu-item"
                data-testid="logout-btn"
                onClick={() => {
                  onLogout();
                  close();
                }}
              >
                <LogOut size={14} style={{ marginRight: 8 }} />
                Log out
              </li>
            </ul>
          </Popover>
        }
      >
        <button type="button" className="user-menu-name">
          <User size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          <span data-testid="current-user">{username}</span>
        </button>
      </Whisper>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
};

export default UserMenu;
