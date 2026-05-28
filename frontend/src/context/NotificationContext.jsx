import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Alert } from "../components/ui";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((type, message, duration = 4000) => {
    console.log("notify called with type:", type, "message:", message);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setNotifications((prev) => [...prev, { id, type, message }]);

    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const value = useMemo(
    () => ({ notify, removeNotification }),
    [notify, removeNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
            className="pointer-events-auto shadow-lg"
          >
            {notification.message}
          </Alert>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
