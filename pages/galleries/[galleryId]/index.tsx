import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Camera, ArrowLeft, FolderOpen } from 'lucide-react';

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
  const { galleryId } = router.query;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  useEffect(() => {
    const fetchGallery = async () => {
      if (!galleryId) return;

      try {
        setLoading(true);

        // Get the gallery document
        const galleryRef = doc(db, 'users', adminUid, 'galleries', galleryId as string);
        const gallerySnap = await getDoc(galleryRef);
        if (!gallerySnap.exists()) {
          setError('Gallery not found');
          return;
        }
        const galleryData = gallerySnap.data();

        // Get all sets in the gallery
        const setsRef = collection(db, 'users', adminUid, 'galleries', galleryId as string, 'sets');
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
              galleryId as string,
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
          id: galleryId as string,
          name: galleryData.name,
          setCount: sets.length,
          createdAt: galleryData.createdAt?.toDate() || new Date(),
          sets,
        });
      } catch (err) {
        console.error('Error fetching gallery:', err);
        setError('Failed to load gallery');
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [galleryId, adminUid]);

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
        <div className="text-white font-semibold text-lg">Loading gallery...</div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="bg-neutral-900 p-6 rounded-lg border border-red-500/20">
          <h3 className="text-red-500 font-semibold mb-2 text-lg">Error</h3>
          <p className="text-red-400">{error || 'Gallery not found'}</p>
          <Link
            href="/galleries"
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors duration-200 inline-block"
          >
            Galleries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">{gallery.name}</h1>
            <div className="text-neutral-400 text-lg">{gallery.setCount} sets</div>
          </div>
          <Link
            href="/galleries"
            className="group flex items-center px-5 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            Galleries
          </Link>
        </div>

        {/* Sets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.sets.map((set) => (
            <Link
              key={set.id}
              href={`/galleries/${gallery.id}/sets/${set.id}`}
              className="bg-neutral-900 rounded-xl overflow-hidden transform transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-800 group border border-neutral-800"
            >
              <div className="relative">
                {set.coverPhoto ? (
                  <div className="aspect-w-16 aspect-h-9 overflow-hidden">
                    <img
                      src={set.coverPhoto}
                      alt={set.name}
                      className="w-full h-48 object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-neutral-800 flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-neutral-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-100 group-hover:from-black/90 transition-all duration-200" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-xl font-semibold text-white mb-1">{set.name}</h2>
                  <div className="flex items-center justify-between text-neutral-400 text-sm">
                    <span>{set.imageCount} images</span>
                    <span>Created {formatDate(set.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {gallery.sets.length === 0 && (
          <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
            <FolderOpen className="mx-auto h-12 w-12 text-[#4CAF50]" />
            <h3 className="mt-2 text-lg font-medium text-white">No Sets Yet</h3>
            <p className="mt-1 text-neutral-400">
              Get started by creating a new set in this gallery.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryDetailPage;
