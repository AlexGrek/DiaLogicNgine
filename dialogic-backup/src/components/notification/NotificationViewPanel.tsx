import './NotificationViewPanel.css'
import React from 'react';
import { Notification, NotificationType } from '../../UiNotifications';
import NotificationItem from './NotificationItem';

interface NotificationViewPanelProps {
    notifications: Notification[];
}

const NotificationViewPanel: React.FC<NotificationViewPanelProps> = ({ notifications }) => {
    const genHeader = (type: NotificationType) => {
        switch (type) {
            case "error":
                return "Error";
            case "info":
                return null
            case "success":
                return "Success";
            case "warning":
                return "Warning";
        }
    }

    const renderNotifications = (list: Notification[]) => {
        return list.map((value, index) => {
            const header = value.header ? value.header : genHeader(value.type)
            return (
                <NotificationItem type={value.type} text={value.text} key={index} header={header}></NotificationItem>
            )
        })
    }

    return (
        <div className="notification-panel">
            {renderNotifications(notifications)}
        </div>
    );
};

export default NotificationViewPanel;
