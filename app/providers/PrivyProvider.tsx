'use client';

import { PrivyProvider as PrivyProviderLib } from '@privy-io/react-auth';
import { ReactNode } from 'react';

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

console.log('🔑 Privy App ID loaded:', appId ? `${appId.slice(0, 8)}...` : 'MISSING!');

if (!appId) {
  console.error('⚠️ NEXT_PUBLIC_PRIVY_APP_ID is not set! Please add it to your .env file');
}

export function PrivyProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProviderLib
      appId={appId}
      config={{
        // Customize Privy's appearance to match your app
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        // Configure login methods
        loginMethods: ['email', 'wallet'],
      }}
    >
      {children}
    </PrivyProviderLib>
  );
}
