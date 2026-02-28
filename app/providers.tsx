'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ToastProvider } from './dashboard/hooks/useToast';
import ToastContainer from './dashboard/components/shared/ToastContainer';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </SessionProvider>
  );
}
