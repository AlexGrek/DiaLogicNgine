import React, { useState } from 'react';
import { Dropdown } from 'rsuite';
import { KeyRound, LogOut, User } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

interface UserMenuProps {
  username: string;
  onLogout: () => void;
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ username, onLogout, className }) => {
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className={className}>
      <Dropdown
        noCaret
        placement="bottomEnd"
        title={
          <span className="user-menu-name">
            <User size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            <span data-testid="current-user">{username}</span>
          </span>
        }
      >
        <Dropdown.Item
          icon={<KeyRound size={14} style={{ marginRight: 8 }} />}
          onSelect={() => setPwOpen(true)}
          data-testid="change-password-menuitem"
        >
          Change password
        </Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item
          icon={<LogOut size={14} style={{ marginRight: 8 }} />}
          onSelect={onLogout}
          data-testid="logout-btn"
        >
          Log out
        </Dropdown.Item>
      </Dropdown>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
};

export default UserMenu;
