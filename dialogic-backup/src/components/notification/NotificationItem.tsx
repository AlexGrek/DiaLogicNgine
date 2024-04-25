import React from 'react';
import { Notification } from 'rsuite';
import { NotificationType } from '../../UiNotifications';

interface NotificationItemProps {
    type: NotificationType;
    text: string;
    header: string | null;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ type, text, header }) => {
    return (
        <Notification closable type={type} header={header}>
            <p>{text}</p>
        </Notification>
    );
};

export default NotificationItem;

