import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, Camera } from 'lucide-react';
import { CharacterProfilePanel } from '../../../components/characters/CharacterProfilePanel';
import { CharacterChatThread } from '../../../components/chat/CharacterChatThread';

type CharacterData = {
  id: string;
  name: string;
  galleryCount: number;
  profileImageUrl: string | null;
};

const CharacterChatPage: React.FC = () => {
  const router = useRouter();
  const characterId = typeof router.query.characterId === 'string' ? router.query.characterId : undefined;

  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  useEffect(() => {
    if (!characterId) return;

    const fetchCharacter = async () => {
      try {
        setLoading(true);
        setError('');

        const characterRef = doc(db, 'users', adminUid, 'galleries', characterId);
        const characterSnap = await getDoc(characterRef);
        if (!characterSnap.exists()) {
          setError('Character not found');
          return;
        }

        const setsRef = collection(db, 'users', adminUid, 'galleries', characterId, 'sets');
        const setsQuery = query(setsRef, orderBy('createdAt', 'desc'));
        const setsSnap = await getDocs(setsQuery);
        const profileImageUrl =
          setsSnap.docs.map((d) => d.data()?.coverPhoto).find((u) => Boolean(u)) || null;

        setCharacter({
          id: characterId,
          name: characterSnap.data().name,
          galleryCount: setsSnap.size,
          profileImageUrl,
        });
      } catch (err) {
        console.error('Error fetching character:', err);
        setError('Failed to load character');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [adminUid, characterId]);

  if (!loading && (error || !character)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
        <div className="bg-neutral-900 p-6 rounded-lg border border-red-500/20 w-full max-w-md text-center">
          <h3 className="text-red-500 font-semibold mb-2 text-lg">Error</h3>
          <p className="text-red-400">{error || 'Character not found'}</p>
          <Link
            href={characterId ? `/characters/${characterId}` : '/characters'}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            aria-label="Back to galleries"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  const characterName = character?.name ?? 'Loading...';
  const galleryCount = character?.galleryCount ?? 0;
  const profileImageUrl = character?.profileImageUrl ?? null;

  return (
    <div className="h-full flex flex-col bg-black w-full max-w-full overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-8 w-full flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 gap-8 xl:gap-10 transition-all duration-300 w-full lg:grid-cols-[360px_1fr] flex-1 min-h-0">
          <CharacterProfilePanel
            characterName={characterName}
            characterId={characterId ?? '/characters'}
            profileImageUrl={profileImageUrl}
            galleryCount={galleryCount}
            activeTab="chat"
            isLoading={loading || !character}
          />

          <section className="flex flex-col min-h-0 relative">
            <div className={`mb-6 transition-opacity duration-200 flex-shrink-0 ${loading || !character ? 'opacity-60' : 'opacity-100'}`}>
              <div className="text-sm text-neutral-400 mb-2">
                <Link href="/characters" className="hover:text-[#4CAF50] transition-colors duration-200">
                  Characters
                </Link>
                {' / '}
                <Link
                  href={characterId ? `/characters/${characterId}` : '/characters'}
                  className="hover:text-[#4CAF50] transition-colors duration-200"
                >
                  {characterName}
                </Link>
                {' / '}
                <span className="text-neutral-300">Chat</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">Chat</h2>
                  <p className="text-neutral-400 mt-1">Message with {characterName}.</p>
                </div>
              </div>
            </div>

            {loading || !character ? (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex-1 flex flex-col">
                <div className="h-6 w-40 bg-neutral-800 rounded animate-pulse mb-4" />
                <div className="flex-1 bg-neutral-800 rounded animate-pulse mb-4" />
                <div className="h-12 bg-neutral-800 rounded animate-pulse" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <CharacterChatThread characterName={characterName} />
              </div>
            )}
          </section>
        </div>
      </div>

      {loading && (
        <div className="sr-only" aria-live="polite">
          <Camera className="w-4 h-4" />
          Loading chat
        </div>
      )}
    </div>
  );
};

export default CharacterChatPage;

