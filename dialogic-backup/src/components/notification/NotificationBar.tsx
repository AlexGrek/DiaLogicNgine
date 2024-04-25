import './NotificationViewPanel.css'
import React, { useEffect, useState } from 'react';
import { Notification, NotificationType } from '../../UiNotifications';
import { Tag } from 'rsuite';
import './NotificationBar.css'
import { asColor } from '../../Utils';

interface NotificationBarProps {
    notification?: Notification | null;
}

const NotificationBar: React.FC<NotificationBarProps> = ({ notification }) => {
    const [notificationCounter, setNotificationCounter] = useState<number>(0);
    useEffect(() => {
        setNotificationCounter(notificationCounter + 1)
    }, [notification]);

    const genHeader = (type: NotificationType) => {
        switch (type) {
            case "error":
                return "error";
            case "info":
                return "info"
            case "success":
                return "ok";
            case "warning":
                return "warning";
        }
    }

    const renderNotifications = (value: Notification) => {
            const header = value.header ? value.header : genHeader(value.type)
            const classNameToAdd = `notification-appearing notification-${value.type}`
            let color = undefined
            if (value.type === "error") {
                color = asColor("red")
            }
            if (value.type === "success") {
                color = asColor("green")
            }
            return (
                <p key={notificationCounter} className={classNameToAdd}><span className="notification-dissapearing"><Tag color={color}>{header}</Tag><span className='notification-text'>{value.text}</span></span></p>
            )
    }

    return (
        notification ? renderNotifications(notification) : <p/>
    );
};

export default NotificationBar;
