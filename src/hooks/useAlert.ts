import { useState } from 'react';

type AlertSeverity = 'success' | 'info' | 'warning' | 'error';

interface AlertState {
  open: boolean;
  message: string;
  severity: AlertSeverity;
  title?: string;
}

const useAlert = () => {
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'info',
    title: undefined,
  });

  const showAlert = (message: string, severity: AlertSeverity = 'info', title?: string) => {
    setAlert({
      open: true,
      message,
      severity,
      title,
    });
  };

  const showSuccess = (message: string, title?: string) => {
    showAlert(message, 'success', title);
  };

  const showError = (message: string, title?: string) => {
    showAlert(message, 'error', title);
  };

  const showWarning = (message: string, title?: string) => {
    showAlert(message, 'warning', title);
  };

  const showInfo = (message: string, title?: string) => {
    showAlert(message, 'info', title);
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  return {
    alert,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert,
  };
};

export default useAlert;