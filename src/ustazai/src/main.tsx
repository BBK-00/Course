import { StrictMode, Suspense } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p role="status" className="p-8 text-center font-semibold">Құрал жүктелуде…</p>}>
      <App />
    </Suspense>
  </StrictMode>,
);
