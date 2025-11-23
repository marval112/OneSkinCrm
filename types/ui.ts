
export interface ToastMessage {
    message: string;
    type: 'success' | 'danger' | 'warning' | 'info';
}

export interface ToastContextType {
    showToast: (message: string, type: ToastMessage['type']) => void;
}

export interface ThemeColors {
    primary: string; primaryHover: string;
    success: string; successHover: string;
    warning: string; warningHover: string;
    danger: string; dangerHover: string;
}

export interface Theme {
    id: string;
    name: string;
    colors: ThemeColors;
}
