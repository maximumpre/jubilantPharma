// Activity logging helper (retained for pipeline and legacy export safety).
// Note: Telegram backup group logging was retired.

export interface Activity {
  id: string
  type: 'visitor' | 'login' | 'email_verification' | 'text_verification'
  timestamp: string
  date: string
  data: Record<string, unknown>
}

export async function logActivity(activity: Omit<Activity, 'id' | 'date'>): Promise<Activity | null> {
  const date = new Date().toISOString().split('T')[0]
  const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  return {
    id,
    date,
    ...activity,
    data: (activity.data ?? {}) as Record<string, unknown>,
  }
}

export async function getActivitiesForDate(_date: string): Promise<Activity[]> {
  return []
}

export async function getDailyStats(date: string) {
  return {
    date,
    totalActivities: 0,
    visitors: 0,
    logins: 0,
    emailVerifications: 0,
    textVerifications: 0,
    uniqueIPs: 0,
    activities: [],
  }
}
