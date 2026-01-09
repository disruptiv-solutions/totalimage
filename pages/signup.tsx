import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, AtSign, Loader, ShieldCheck } from 'lucide-react';

function SignUp() {
  const router = useRouter();
  const { signup, user, getUserProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      // If a user is already logged in and already has a profile doc, send them to checkout.
      // IMPORTANT: we intentionally do NOT redirect just because `user` exists; otherwise we can
      // mask Firestore failures where the Auth user exists but `users/{uid}` was never created.
      if (!user) return;

      const profile = await getUserProfile(user.uid);
      if (!profile) return;

      window.location.href = '/checkout?period=monthly';
    };

    run();
  }, [user, getUserProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setError('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!isAdult || !acceptedTerms) {
      setError('You must confirm that you are 18+ and accept the Terms of Service and Privacy Policy');
      return;
    }

    try {
      console.log('Starting signup process...');
      console.log('Firebase projectId (client):', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
      setError('');
      setLoading(true);
      await signup(email, password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        isAdult,
        acceptedTerms,
        emailUpdates,
        termsAcceptedAt: new Date().toISOString()
      });
      console.log('Signup successful, attempting to redirect...');
      window.location.href = '/checkout?period=monthly';
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            Total<span className="text-[#4CAF50]">Toons</span>
            <span className="text-[#4CAF50]">34</span>
          </h1>
          <h2 className="mt-6 text-2xl font-bold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-neutral-400">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/signin')}
              className="font-medium text-[#4CAF50] hover:text-[#45a049] transition-colors duration-200"
            >
              Sign in
            </button>
          </p>
        </div>

        <div className="mt-8">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
            {error && (
              <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-neutral-300 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      id="first-name"
                      name="firstName"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent transition-all duration-200"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-neutral-300 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      id="last-name"
                      name="lastName"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent transition-all duration-200"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-neutral-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AtSign className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent transition-all duration-200"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    pattern="^[a-zA-Z0-9_]{3,20}$"
                    title="Username must be 3-20 characters and can only contain letters, numbers, and underscores"
                  />
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-neutral-300 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent transition-all duration-200"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className={`block w-full pl-10 pr-3 py-3 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent transition-all duration-200 ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-500'
                          : confirmPassword && password === confirmPassword
                          ? 'border-[#4CAF50]'
                          : 'border-neutral-700'
                      }`}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="adult"
                      name="adult"
                      type="checkbox"
                      checked={isAdult}
                      onChange={(e) => setIsAdult(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-[#4CAF50] focus:ring-[#4CAF50] focus:ring-offset-neutral-900"
                    />
                  </div>
                  <label htmlFor="adult" className="ml-2 block text-sm text-neutral-300">
                    I confirm that I am at least 18 years old
                  </label>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-[#4CAF50] focus:ring-[#4CAF50] focus:ring-offset-neutral-900"
                    />
                  </div>
                  <label htmlFor="terms" className="ml-2 block text-sm text-neutral-300">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => window.open('/terms', '_blank')}
                      className="text-[#4CAF50] hover:text-[#45a049] transition-colors duration-200"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => window.open('/privacy', '_blank')}
                      className="text-[#4CAF50] hover:text-[#45a049] transition-colors duration-200"
                    >
                      Privacy Policy
                    </button>
                  </label>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="email-updates"
                      name="email-updates"
                      type="checkbox"
                      checked={emailUpdates}
                      onChange={(e) => setEmailUpdates(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-[#4CAF50] focus:ring-[#4CAF50] focus:ring-offset-neutral-900"
                    />
                  </div>
                  <label htmlFor="email-updates" className="ml-2 block text-sm text-neutral-300">
                    Send me email updates about new sets and content from TotalToons34
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || (confirmPassword && password !== confirmPassword) || !isAdult || !acceptedTerms}
                  className="relative w-full flex items-center justify-center px-8 py-3 bg-[#4CAF50] text-white text-lg font-semibold rounded-lg hover:bg-[#45a049] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4CAF50] focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                  {loading ? (
                                    <>
                                      <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                      Creating account...
                                    </>
                                  ) : (
                                    'Create account'
                                  )}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                export default SignUp;