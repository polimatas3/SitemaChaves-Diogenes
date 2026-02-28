import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from './AuthGate.tsx';
import PublicView from './PublicView.tsx';
import './index.css';

const isPublic = window.location.hash.startsWith('#/chaves');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPublic ? <PublicView /> : <AuthGate />}
  </StrictMode>,
);
