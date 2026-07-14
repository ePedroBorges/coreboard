import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";

const enabledKey = (userId: string) => `vistaNotificationsEnabled:${userId}`;
const baseNotificationId = 120000;

export function areNotificationsSupported() {
  return Capacitor.isNativePlatform() || (typeof window !== "undefined" && "Notification" in window);
}

export function readNotificationsEnabled(userId?: string) {
  if (!userId || typeof window === "undefined") return false;
  return window.localStorage.getItem(enabledKey(userId)) === "true";
}

export function writeNotificationsEnabled(userId: string | undefined, enabled: boolean) {
  if (!userId || typeof window === "undefined") return;
  window.localStorage.setItem(enabledKey(userId), String(enabled));
}

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === "granted";
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  }

  return false;
}

export async function scheduleTaskNotifications(tasks: WeeklyTask[], userId?: string) {
  if (!userId || !readNotificationsEnabled(userId)) return;

  const pendingTasks = tasks
    .filter((task) => task.status === "pending" && !!task.task_date)
    .sort((a, b) => a.task_date.localeCompare(b.task_date))
    .slice(0, 20);

  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({
      notifications: Array.from({ length: 20 }, (_, index) => ({ id: baseNotificationId + index })),
    });

    if (pendingTasks.length === 0) return;

    await LocalNotifications.schedule({
      notifications: pendingTasks.map((task, index) => ({
        id: baseNotificationId + index,
        title: "Tarefa pendente",
        body: task.title,
        schedule: { at: notificationDateForTask(task.task_date) },
      })),
    });
    return;
  }
}

export async function showWebNotificationPreview() {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Notificacoes ativadas", {
    body: "Voce recebera lembretes das tarefas pendentes.",
  });
}

function notificationDateForTask(taskDate: string) {
  const parsed = parseISO(taskDate);
  const target = new Date(parsed);
  target.setHours(9, 0, 0, 0);

  const fallback = new Date(Date.now() + 60 * 1000);
  if (isBefore(target, fallback)) return fallback;

  if (format(startOfDay(target), "yyyy-MM-dd") === format(startOfDay(new Date()), "yyyy-MM-dd")) {
    return fallback;
  }

  return target;
}
