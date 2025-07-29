import { websocketService } from "./websocketService";

export type NotificationType =
  | "welcome"
  | "warning"
  | "newMessage"
  | "matchFound"
  | "friendRequest"
  | "gameInvite"
  | "newPlayerOnline"
  | "newTournament"
  | "achievement";

export interface NotificationAction {
  icon: string; // e.g. "fa-envelope", "fa-user-plus", or SVG path/class
  label: string;
  actionFn: () => void;
}

export interface NotificationPayload {
  type: NotificationType;
  title?: string;
  message?: string;
  name?: string;
  user?: string;
  level?: number;
  action?: NotificationAction;
}

type NotificationHandler = (notif: NotificationPayload) => void;

class NotificationService {
  private handlers: NotificationHandler[] = [];

  constructor() {
    websocketService.onMessage((data) => {
      if (data && data.type && this.isNotificationType(data.type)) {
        this.handlers.forEach((cb) => cb(data));
      }
    });
  }

  listen(cb: NotificationHandler) {
    this.handlers.push(cb);
  }

  // TODO REMOVE: for mocking/testing: simulate a notification event
  emitMock(notif: NotificationPayload) {
    this.handlers.forEach((cb) => cb(notif));
  }

  private isNotificationType(type: string): type is NotificationType {
    return [
      "welcome",
      "warning",
      "newMessage",
      "matchFound",
      "friendRequest",
      "gameInvite",
      "newPlayerOnline",
      "newTournament",
      "achievement"
    ].includes(type);
  }
}

export const notificationService = new NotificationService();