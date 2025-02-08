import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import Navigation from '../components/layout/Navigation';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Define routes where navigation should be hidden
  const hideNavigation = [
    '/login',
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/404',
    '/500',
    '/subscription'  // Added subscription page to hidden navigation routes
  ].includes(router.pathname);

  return (
    <AuthProvider>
      <SubscriptionProvider>
        {!hideNavigation && <Navigation />}
        <Component {...pageProps} />
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default MyApp;