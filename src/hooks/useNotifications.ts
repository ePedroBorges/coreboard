import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";
import {
  areNotificationsSupported,
  readNotificationsEnabled,
  requestNotificationPermission,
  scheduleTaskNotifications,
  showWebNotificationPreview,
  writeNotificationsEnabled,
} from "@/lib/notifications";

export interface NotificationControls {
  enabled: boolean;
  supported: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
}

export function useNotifications(userId: string | undefined, tasks: WeeklyTask[]): NotificationControls {
  const [enabled, setEnabled] = useState(false);
  const supported = useMemo(() => areNotificationsSupported(), []);

  useEffect(() => {
    let active = true;
    void readNotificationsEnabled(userId).then((stored) => {
      if (active) setEnabled(stored);
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;
    void scheduleTaskNotifications(tasks, userId);
  }, [enabled, tasks, userId]);

  const setNotificationsEnabled = useCallback(async (nextEnabled: boolean) => {
    if (!userId) return false;

    if (!nextEnabled) {
      await writeNotificationsEnabled(userId, false);
      setEnabled(false);
      toast.success("Notificacoes desativadas.");
      return true;
    }

    if (!supported) {
      toast.error("Notificacoes nao estao disponiveis neste dispositivo.");
      return false;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      toast.error("Permissao de notificacao negada.");
      return false;
    }

    await writeNotificationsEnabled(userId, true);
    setEnabled(true);
    await scheduleTaskNotifications(tasks, userId);
    await showWebNotificationPreview();
    toast.success("Notificacoes ativadas.");
    return true;
  }, [supported, tasks, userId]);

  return {
    enabled,
    supported,
    setNotificationsEnabled,
  };
}
