import React from 'react';
import { useUI } from '../../contexts/UIContext';

export default function Notification() {
    const { notification } = useUI();
    const { message, type, visible } = notification;

    if (!visible) return null;

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div 
            id="notification" 
            className={`fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 ${bgColor}`}
        >
            {message}
        </div>
    );
}