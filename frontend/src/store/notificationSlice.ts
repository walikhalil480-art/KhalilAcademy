import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../types';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<{ notifications: Notification[]; unreadCount: number }>) => {
      state.items = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
    },
    markAllRead: (state) => {
      state.items.forEach((n) => (n.isRead = true));
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
