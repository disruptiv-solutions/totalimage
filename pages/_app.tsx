// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Component {...pageProps} />
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default MyApp;