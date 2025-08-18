import { notificationService, type NotificationPayload } from "./notificationService";

export function startMockNotifications() {
  setInterval(() => {
    const mockTypes = [
      {
        type: "matchFound",
        time: new Date().toLocaleTimeString(),
      },
      {
        type: "friendRequest",
        name: "Pesto",
        time: new Date().toLocaleTimeString()
      },
      {
        type: "friendRequest",
        name: "shinckel3",
        userId: "3",
        time: new Date().toLocaleTimeString()
      },
      {
        type: "gameInvite",
        name: "Super Papaya",
        time: new Date().toLocaleTimeString(),
      },
      {
        type: "newPlayerOnline",
        name: "Pong Killer",
        time: new Date().toLocaleTimeString(),
      },
      {
        type: "newTournament",
        time: new Date().toLocaleTimeString(),
      }
    ];
    const notif = mockTypes[Math.floor(Math.random() * mockTypes.length)];
    notificationService.emitMock(notif as NotificationPayload);
  }, 4000);
}

