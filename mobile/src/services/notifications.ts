import type { AppNotification } from '@/types';

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'proposal_accepted',
    title: 'Proposal Accepted!',
    body: 'StyleCo accepted your proposal for Summer Fashion Collection.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    isRead: false,
    actorName: 'StyleCo Brand',
  },
  {
    id: 'n2',
    type: 'new_campaign',
    title: 'New Campaign Match',
    body: 'A new Fashion campaign matches your interests.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
    actorName: 'TrendSetters',
  },
  {
    id: 'n3',
    type: 'new_message',
    title: 'New Message',
    body: 'StyleCo Brand: We loved your proposal!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isRead: true,
    actorName: 'StyleCo Brand',
  },
  {
    id: 'n4',
    type: 'proposal_received',
    title: 'New Proposal',
    body: 'Alex Rivera submitted a proposal for Summer Fashion Collection.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
    actorName: 'Alex Rivera',
  },
  {
    id: 'n5',
    type: 'payment_released',
    title: 'Payment Released',
    body: 'GymGear Co released $800 for your Fitness Campaign work.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    isRead: true,
    actorName: 'GymGear Co',
  },
];

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    await new Promise((r) => setTimeout(r, 200));
    return [...MOCK_NOTIFICATIONS].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  async markAsRead(id: string): Promise<void> {
    const n = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (n) n.isRead = true;
  },

  async markAllRead(): Promise<void> {
    MOCK_NOTIFICATIONS.forEach((n) => (n.isRead = true));
  },
};
