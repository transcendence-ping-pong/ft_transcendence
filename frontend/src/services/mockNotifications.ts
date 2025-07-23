import { notificationService, type NotificationPayload } from "./notificationService";
import { actionIcons } from "@/utils/Constants";

export function startMockNotifications() {
  setInterval(() => {
    const mockTypes = [
      {
        type: "matchFound",
        action: {
          icon: actionIcons.game,
          label: "Join Match",
          actionFn: () => alert("Joining match!")
        }
      },
      {
        type: "friendRequest",
        name: "Pesto",
        action: {
          icon: actionIcons.accept,
          label: "Accept",
          actionFn: () => alert("Friend request accepted!")
        }
      },
      {
        type: "friendRequest",
        name: "Pesto",
        action: {
          icon: actionIcons.accept,
          label: "Accept",
          actionFn: () => alert("Friend request accepted!")
        }
      },
      {
        type: "gameInvite",
        name: "Super Papaya",
        action: {
          icon: actionIcons.accept,
          label: "Accept Invite",
          actionFn: () => alert("Game invite accepted!")
        }
      },
      {
        type: "newPlayerOnline",
        name: "Pong Killer",
        action: {
          icon: actionIcons.user,
          label: "View Profile",
          actionFn: () => alert("Viewing profile!")
        }
      },
      {
        type: "newTournament",
        action: {
          icon: actionIcons.trophy,
          label: "View Tournament",
          actionFn: () => alert("Viewing tournament!")
        }
      }
    ];
    const notif = mockTypes[Math.floor(Math.random() * mockTypes.length)];
    notificationService.emitMock(notif as NotificationPayload);
  }, 4000);
}

