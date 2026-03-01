import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './styles/globals.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId || clientId === 'FYLL_I_DITT_CLIENT_ID') {
  console.warn(
    '[CoachMatch] VITE_GOOGLE_CLIENT_ID saknas i .env. ' +
    'Google-inloggning fungerar inte förrän du fyller i ditt Client ID.'
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId ?? ''}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
