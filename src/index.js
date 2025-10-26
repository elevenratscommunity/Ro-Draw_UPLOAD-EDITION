import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // ملف الـ CSS الرئيسي
import App from './App';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';

// دي الطريقة الجديدة في React 18
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FirebaseProvider>
      <UIProvider> {/* <-- طلّع ده هنا */}
        <AuthProvider> {/* <-- دخّل ده جواه */}
          <App />
        </AuthProvider>
      </UIProvider>
    </FirebaseProvider>
  </React.StrictMode>
);