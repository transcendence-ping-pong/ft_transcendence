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
  | "achievement"
  | "chatHelp"
  | "chatList"
  | "chatPm"
  | "chatInvite"
  | "chatInviteAccepted"
  | "chatInviteDeclined"
  | "autoWin"
  | "matchEnded";

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
  userId?: string;
  level?: number;
  action?: NotificationAction;
  // optional metadata used by custom mappings
  users?: string[];
  from?: string;
  to?: string;
  text?: string;
  difficulty?: string;
  scoreLeft?: number;
  scoreRight?: number;
  winner?: string;
  reason?: string;
  time?: number;
}

type NotificationHandler = (notif: NotificationPayload) => void;

class NotificationService {
  private handlers: NotificationHandler[] = [];
  private queue: NotificationPayload[] = [];

  constructor() {
    websocketService.onMessage((data) => {
      if (data && data.type && this.isNotificationType(data.type)) {
        this.handlers.forEach((cb) => cb(data));
      }
    });
  }

  listen(cb: NotificationHandler) {
    this.handlers.push(cb);
    // flush queued notifications to this new listener
    if (this.queue.length) {
      this.queue.forEach(n => cb(n));
    }
    this.queue = [];
  }

  emit(notif: NotificationPayload) {
    if (this.handlers.length === 0) {
      this.queue.push(notif);
    } else {
      this.handlers.forEach((cb) => cb(notif));
    }
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
      "achievement",
      "chatHelp",
      "chatList",
      "chatPm",
      "chatInvite",
      "chatInviteAccepted",
      "chatInviteDeclined",
      "autoWin",
      "matchEnded"
    ].includes(type);
  }
}

export const notificationService = new NotificationService();