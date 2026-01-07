# TotalToons34

A Next.js application for character galleries and AI chat interactions.

## Features

- Character gallery browsing with image sets
- AI-powered character chat conversations
- User authentication and subscription management
- Admin panel for content management
- Image generation and gallery management

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Payments**: Stripe
- **AI**: OpenAI (via OpenRouter)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
OPENROUTER_API_KEY=...
NEXT_PUBLIC_ADMIN_UID=...
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Project Structure

- `/pages` - Next.js pages and API routes
- `/components` - React components
- `/lib` - Utility libraries (Firebase, Stripe, etc.)
- `/contexts` - React context providers
- `/hooks` - Custom React hooks
- `/public` - Static assets

## License

Private repository - All rights reserved
