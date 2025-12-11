
import React, { useEffect, useState } from 'react';
import type { ToastMessage } from '../../types';

interface ToastProps extends ToastMessage {
  onClose: () => void;
}

const toastStyles = {
  success: {
    bg: 'bg-green-500',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  danger: {
    bg: 'bg-red-500',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  warning: {
    bg: 'bg-yellow-500',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  },
  info: {
    bg: 'bg-blue-500',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
};

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


function Toast({ message, type, action, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const styles = toastStyles[type];

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 4700);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white transition-transform transform ${styles.bg} ${visible ? 'translate-x-0' : 'translate-x-full'
        } ${action ? 'cursor-pointer hover:opacity-90' : ''}`}
      style={{ transitionDuration: '300ms' }}
      onClick={() => {
        if (action) {
          action.onClick();
          onClose();
        }
      }}
    >
      {styles.icon}
      <div className="mx-3">
        <p className="font-medium">{message}</p>
        {action?.label && (
          <p className="text-xs underline mt-1 opacity-90">{action.label}</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg hover:bg-black hover:bg-opacity-20"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default Toast;
