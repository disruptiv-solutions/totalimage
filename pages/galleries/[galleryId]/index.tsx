import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Camera, FolderOpen } from 'lucide-react';
import { CharacterProfilePanel } from '../../../components/characters/CharacterProfilePanel';

interface SetData {
  id: string;
  name: string;
  imageCount: number;
  createdAt: Date;
  coverPhoto?: string;
  createdBy: string;
}

interface Gallery {
  id: string;
  name: string;
  setCount: number;
  createdAt: Date;
  sets: SetData[];
}

const GalleryDetailPage: React.FC = () => {
  const router = useRouter();
  const routeGalleryId = typeof router.query.galleryId === 'string' ? router.query.galleryId : undefined;
  const routeCharacterId = typeof router.query.characterId === 'string' ? router.query.characterId : undefined;
  const characterId = routeGalleryId ?? routeCharacterId;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  useEffect(() => {
    const fetchGallery = async () => {
      if (!characterId) return;

      try {
        setLoading(true);

        // Get the character (gallery) document
        const galleryRef = doc(db, 'users', adminUid, 'galleries', characterId);
        const gallerySnap = await getDoc(galleryRef);
        if (!gallerySnap.exists()) {
          setError('Character not found');
          return;
        }
        const galleryData = gallerySnap.data();

        // Get all galleries (sets) for this character
        const setsRef = collection(db, 'users', adminUid, 'galleries', characterId, 'sets');
        const setsQuery = query(setsRef, orderBy('createdAt', 'desc'));
        const setsSnap = await getDocs(setsQuery);

        // For each set, query the images subcollection to count images.
        const sets: SetData[] = await Promise.all(
          setsSnap.docs.map(async (setDoc) => {
            const setData = setDoc.data();
            const imagesRef = collection(
              db,
              'users',
              adminUid,
              'galleries',
              characterId,
              'sets',
              setDoc.id,
              'images'
            );
            const imagesSnap = await getDocs(imagesRef);
            return {
              id: setDoc.id,
              name: setData.name,
              imageCount: imagesSnap.size,
              createdAt: setData.createdAt?.toDate() || new Date(),
              coverPhoto: setData.coverPhoto,
              createdBy: setData.createdBy,
            };
          })
        );

        setGallery({
          id: characterId,
          name: galleryData.name,
          setCount: sets.length,
          createdAt: galleryData.createdAt?.toDate() || new Date(),
          sets,
        });
      } catch (err) {
        console.error('Error fetching character:', err);
        setError('Failed to load character');
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [characterId, adminUid]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <Camera className="w-12 h-12 text-[#4CAF50] animate-bounce mb-4" />
        <div className="text-white font-semibold text-lg">Loading character...</div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="bg-neutral-900 p-6 rounded-lg border border-red-500/20">
          <h3 className="text-red-500 font-semibold mb-2 text-lg">Error</h3>
          <p className="text-red-400">{error || 'Character not found'}</p>
          <Link
            href="/characters"
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors duration-200 inline-block"
          >
            Characters
          </Link>
        </div>
      </div>
    );
  }

  const profileImageUrl =
    gallery.sets.find((set) => Boolean(set.coverPhoto))?.coverPhoto || null;

  return (
    <div className="min-h-screen bg-black w-full max-w-full overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-8 w-full">
        <div className="grid grid-cols-1 gap-8 xl:gap-10 transition-all duration-300 w-full lg:grid-cols-[360px_1fr] lg:items-start">
          {/* Left Profile Panel */}
          <CharacterProfilePanel
            characterName={gallery.name}
            characterId={gallery.id}
            profileImageUrl={profileImageUrl}
            galleryCount={gallery.setCount}
            activeTab="galleries"
          />

          {/* Main Content */}
          <section className="relative lg:min-h-0">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Galleries</h2>
                <p className="text-neutral-400 mt-1">Choose a gallery to view its images.</p>
              </div>
            </div>

            {gallery.sets.length === 0 ? (
              <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
                <FolderOpen className="mx-auto h-12 w-12 text-[#4CAF50]" />
                <h3 className="mt-4 text-lg font-medium text-white">No Galleries Yet</h3>
                <p className="mt-2 text-neutral-400">This character doesn’t have any galleries yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 xl:gap-7">
                {gallery.sets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/characters/${gallery.id}/galleries/${set.id}`}
                    className="bg-neutral-900 rounded-xl overflow-hidden transform transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-800 group border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                    aria-label={`Open gallery ${set.name}`}
                  >
                    <div className="relative">
                      {set.coverPhoto ? (
                        <div className="aspect-w-1 aspect-h-1 overflow-hidden">
                          <img
                            src={set.coverPhoto}
                            alt={set.name}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <div className="aspect-w-1 aspect-h-1 bg-neutral-800 flex items-center justify-center">
                          <FolderOpen className="w-12 h-12 text-neutral-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-100 group-hover:from-black/90 transition-all duration-200" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{set.name}</h3>
                        <div className="flex items-center justify-between text-neutral-400 text-sm">
                          <span>{set.imageCount} images</span>
                          <span>Created {formatDate(set.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default GalleryDetailPage;
