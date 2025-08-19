// notifications removed for delivery scope
import { t } from "@/locales/Translations.js";
import { actionIcons } from "@/utils/Constants.js";
import { navigate } from "@/main.js";

export function mapNotification(payload) {
  console.log("Mapping notification payload:", payload);
  switch (payload.type) {
    case "newMessage": {
      return {
        title: t("notification.title.newMessage"),
        message: t("notification.msg.newMessage", { name: payload.name }),
        time: payload.time,
        type: payload.type,
        action: { icon: actionIcons.message, label: t("notification.action.newMessage") },
        actionFn: () => {},
      };
    }
    case "matchFound":
      return {
        title: t("notification.title.matchFound"),
        message: t("notification.msg.matchFound", { name: payload.name }),
        time: payload.time,
        type: payload.type,
        action: {
          icon: actionIcons.game,
          label: t("notification.action.joinMatch"),
        },
        actionFn: () => alert("Joining match!"),
      };
    case "friendRequest":
      return {
        title: t("notification.title.friendRequest"),
        message: t("notification.msg.friendRequest", { name: payload.name }),
        time: payload.time,
        type: payload.type,
        action: {
          icon: actionIcons.accept,
          label: t("notification.action.accept"),
        },
        actionFn: () => navigate(`/profile/${payload.name}`),
      };
    case "gameInvite":
      return {
        title: t("notification.title.gameInvite"),
        message: payload.difficulty
          ? `${payload.name} invited you to play (${payload.difficulty})`
          : t("notification.msg.gameInvite", { name: payload.name }),
        time: payload.time,
        type: payload.type,
        action: { icon: actionIcons.accept, label: t("notification.action.acceptInvite"), actionKey: "joinMatch" },
        actionFn: () => {},
      };
    case "chatPm":
      return {
        title: "Private message",
        message: `${payload.from} → ${payload.to}: ${payload.text}`,
        time: payload.time,
        type: payload.type,
        action: { icon: actionIcons.message, label: "Open chat" },
        actionFn: () => {},
      };
    case "chatInviteAccepted":
      return { title: "Invite accepted", message: `${payload.name} accepted your invite`, time: payload.time, type: payload.type };
    case "chatInviteDeclined":
      return { title: "Invite declined", message: `${payload.name} declined your invite`, time: payload.time, type: payload.type };
    case "autoWin":
      return { title: "Opponent left", message: `Auto win awarded`, time: payload.time, type: payload.type };
    case "matchEnded":
      return { title: "Match ended", message: `${payload.winner} won (${payload.reason})`, time: payload.time, type: payload.type };
    case "newPlayerOnline":
      return {
        title: t("notification.title.newPlayerOnline"),
        message: t("notification.msg.newPlayerOnline", { name: payload.name }),
        time: payload.time,
        type: payload.type,
        action: {
          icon: actionIcons.user,
          label: t("notification.action.viewProfile"),
        },
        actionFn: () => alert(`Viewing profile! ${payload.name}`),
      };
    case "newTournament":
      return {
        title: t("notification.title.newTournament"),
        message: t("notification.msg.newTournament"),
        time: payload.time,
        type: payload.type,
        action: {
          icon: actionIcons.trophy,
          label: t("notification.action.newTournament"),
        },
        actionFn: () => alert("Viewing tournament!"),
      };
  }
}

export function getWelcomeNotification(username) {
  return {
    title: t("notification.title.welcome"),
    message: t("notification.msg.welcome", { user: username }),
    action: {
      icon: actionIcons.avatar,
      label: t("notification.action.welcome"),
    },
    actionFn: () => {
      navigate(`/profile/${username}`);
    },
    welcome: true,
  };
}