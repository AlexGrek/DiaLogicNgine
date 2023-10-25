export type NotificationType = "info" | "success" | "warning" | "error";

export class Notification {
    type: NotificationType
    text: string
    header: string | null

    constructor(type: NotificationType, text: string, header: string | null = null) {
        this.type = type
        this.text = text
        this.header = header
    }
}

export type NotifyCallback = (type: NotificationType, text: string, header?: string | null) => void
