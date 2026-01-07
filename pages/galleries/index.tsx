import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Camera, ArrowLeft, Calendar, FolderOpen } from 'lucide-react';

interface ImageData {
  id: string;
  url: string;
  name: string;
}

interface Set {
  id: string;
  name: string;
  imageCount: number;
  createdAt: Date;
  images: ImageData[];
}

export interface Gallery {
  id: string;
  name: string;
  setCount: number;
  createdAt: Date;
  sets: Set[];
  allImages: ImageData[];
}

const SLIDE_INTERVAL = 5000; // base interval in ms

interface GalleryCardProps {
  gallery: Gallery;
  formatDate: (date: Date) => string;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ gallery, formatDate }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [displayImageIndex, setDisplayImageIndex] = useState<number>(0);
  const [fadeOpacity, setFadeOpacity] = useState<number>(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleNextImage = useCallback(() => {
    if (gallery.allImages.length <= 1) return;
    const delay = SLIDE_INTERVAL + Math.random() * 2000; // add random delay up to 2 seconds
    timerRef.current = setTimeout(() => {
      setCurrentImageIndex((prevIndex) => {
        const imageCount = gallery.allImages.length;
        if (imageCount <= 1) return prevIndex;
        let newIndex = prevIndex;
        do {
          newIndex = Math.floor(Math.random() * imageCount);
        } while (newIndex === prevIndex && imageCount > 1);
        return newIndex;
      });
      scheduleNextImage();
    }, delay);
  }, [gallery.allImages.length]);

  useEffect(() => {
    if (gallery.allImages.length <= 1) return;
    const initialDelay = Math.random() * SLIDE_INTERVAL;
    timerRef.current = setTimeout(() => {
      setCurrentImageIndex((prevIndex) => {
        const imageCount = gallery.allImages.length;
        if (imageCount <= 1) return prevIndex;
        let newIndex = prevIndex;
        do {
          newIndex = Math.floor(Math.random() * imageCount);
        } while (newIndex === prevIndex && imageCount > 1);
        return newIndex;
      });
      scheduleNextImage();
    }, initialDelay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [gallery.allImages.length, scheduleNextImage]);

  // Handle smooth fade transition when image index changes
  useEffect(() => {
    if (currentImageIndex !== displayImageIndex && gallery.allImages.length > 1) {
      // Start fade out
      setFadeOpacity(0);
      // After fade out completes, switch image and fade in
      fadeTimerRef.current = setTimeout(() => {
        setDisplayImageIndex(currentImageIndex);
        // Trigger fade in
        requestAnimationFrame(() => {
          setFadeOpacity(1);
        });
      }, 400); // Half of transition duration for fade out
      return () => {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      };
    }
  }, [currentImageIndex, displayImageIndex, gallery.allImages.length]);

  const displayImage = gallery.allImages[displayImageIndex];

  return (
    <Link
      href={`/characters/${gallery.id}`}
      className="block bg-neutral-900 rounded-xl overflow-hidden transform transition-transform duration-300 hover:-translate-y-1 hover:bg-neutral-800 cursor-pointer border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
      aria-label={`View character ${gallery.name}`}
    >
      <div className="relative">
        {gallery.allImages.length > 0 ? (
          <div className="aspect-w-1 aspect-h-1 relative">
            <img
              key={displayImage.id}
              src={displayImage.url}
              alt={displayImage.name}
              className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-800 ease-in-out"
              style={{ opacity: fadeOpacity }}
            />
          </div>
        ) : (
          <div className="aspect-w-1 aspect-h-1 bg-neutral-800 flex items-center justify-center">
            <FolderOpen className="w-12 h-12 text-neutral-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-xl font-semibold text-white mb-1">{gallery.name}</h2>
          <div className="flex items-center text-neutral-400 text-sm">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDate(gallery.createdAt)}
          </div>
        </div>
      </div>
    </Link>
  );
};

const GalleriesPage: React.FC = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const galleriesRef = collection(db, 'users', adminUid, 'galleries');
        const galleriesQuery = query(galleriesRef, orderBy('createdAt', 'desc'));
        const galleriesSnap = await getDocs(galleriesQuery);

        const galleriesData: Gallery[] = [];

        for (const galleryDoc of galleriesSnap.docs) {
          const galleryData = galleryDoc.data();
          const galleryId = galleryDoc.id;

          const setsRef = collection(db, 'users', adminUid, 'galleries', galleryId, 'sets');
          const setsSnap = await getDocs(setsRef);

          const setsPromises = setsSnap.docs.map(async setDoc => {
            const imagesRef = collection(
              db,
              'users',
              adminUid,
              'galleries',
              galleryId,
              'sets',
              setDoc.id,
              'images'
            );
            const imagesSnap = await getDocs(imagesRef);
            const images = imagesSnap.docs.map(imgDoc => ({
              id: imgDoc.id,
              url: imgDoc.data().url,
              name: imgDoc.data().name,
            }));

            return {
              id: setDoc.id,
              name: setDoc.data().name,
              imageCount: images.length,
              createdAt: setDoc.data().createdAt?.toDate() || new Date(),
              images,
            };
          });

          const sets = await Promise.all(setsPromises);
          const allImages = sets.flatMap(set => set.images);

          galleriesData.push({
            id: galleryId,
            name: galleryData.name,
            setCount: sets.length,
            createdAt: galleryData.createdAt?.toDate() || new Date(),
            sets,
            allImages,
          });
        }

        setGalleries(galleriesData);
      } catch (err) {
        console.error('Error fetching galleries:', err);
        setError('Failed to load galleries');
      } finally {
        setLoading(false);
      }
    };

    fetchGalleries();
  }, [adminUid]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <Camera className="w-12 h-12 text-[#4CAF50] animate-bounce mb-4" />
        <div className="text-white font-semibold text-lg">Loading your galleries...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="bg-neutral-900 p-6 rounded-lg border border-red-500/20">
          <h3 className="text-red-500 font-semibold mb-2 text-lg">Unable to Load Galleries</h3>
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Characters</h1>
            <p className="text-neutral-400 text-lg">
              {galleries.length} character{galleries.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <Link
            href="/"
            className="group flex items-center px-5 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            Home
          </Link>
        </div>

        {galleries.length === 0 ? (
          <div className="bg-neutral-900 rounded-xl p-8 text-center border border-neutral-800">
            <Camera className="w-16 h-16 text-[#4CAF50] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Characters Yet</h3>
            <p className="text-neutral-400">
              Your characters will appear here once created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries.map(gallery => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleriesPage;
