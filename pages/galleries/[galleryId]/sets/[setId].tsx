import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { db } from '../../../../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  Camera,
  ArrowLeft,
  Calendar,
  Grid,
  Image as ImageIcon
} from 'lucide-react';

interface ImageData {
  id: string;
  url: string;
  name: string;
  createdAt: Date;
  size?: number;
  type?: string;
}

interface SetData {
  id: string;
  name: string;
  imageCount: number;
  createdAt: Date;
  images: ImageData[];
  galleryName: string;
}

const SetDetailPage: React.FC = () => {
  const router = useRouter();
  // New canonical route: /characters/[characterId]/galleries/[galleryId]
  // Legacy route: /galleries/[galleryId]/sets/[setId] (where galleryId is the characterId)
  const routeCharacterId = typeof router.query.characterId === 'string' ? router.query.characterId : undefined;
  const legacyCharacterId = typeof router.query.galleryId === 'string' ? router.query.galleryId : undefined;
  const characterId = routeCharacterId ?? legacyCharacterId;

  const routeSetId = typeof router.query.setId === 'string' ? router.query.setId : undefined;
  const routeGalleryId = typeof router.query.galleryId === 'string' ? router.query.galleryId : undefined;
  const galleryId = routeSetId ?? (routeCharacterId ? routeGalleryId : undefined);
  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  useEffect(() => {
    if (!characterId || !galleryId) return;

    let unsubscribeImages: (() => void) | null = null;

    const fetchSet = async () => {
      setLoading(true);
      try {
        // Fetch character information
        const galleryRef = doc(db, 'users', adminUid, 'galleries', characterId);
        const gallerySnap = await getDoc(galleryRef);
        if (!gallerySnap.exists()) {
          setError('Character not found');
          return;
        }
        const galleryName = gallerySnap.data().name;

        // Fetch gallery (set) information
        const setRef = doc(
          db,
          'users',
          adminUid,
          'galleries',
          characterId,
          'sets',
          galleryId
        );
        const setSnap = await getDoc(setRef);
        if (!setSnap.exists()) {
          setError('Gallery not found');
          return;
        }
        const setInfo = setSnap.data();

        // Set initial set data (with an empty images array)
        setSetData({
          id: galleryId,
          name: setInfo.name,
          imageCount: 0,
          createdAt: setInfo.createdAt?.toDate() || new Date(),
          images: [],
          galleryName,
        });

        // Listen for real-time updates on the images subcollection
        const imagesRef = collection(
          db,
          'users',
          adminUid,
          'galleries',
          characterId,
          'sets',
          galleryId,
          'images'
        );
        const imagesQuery = query(imagesRef, orderBy('uploadedAt', 'desc'));
        unsubscribeImages = onSnapshot(imagesQuery, (imagesSnap) => {
          const images: ImageData[] = imagesSnap.docs.map((imgDoc) => {
            const data = imgDoc.data();
            return {
              id: imgDoc.id,
              url: data.url,
              name: data.name,
              createdAt: data.uploadedAt?.toDate() || new Date(),
              size: data.size,
              type: data.type,
            };
          });
          setSetData((prev) => (prev ? { ...prev, images, imageCount: images.length } : null));
        });
      } catch (err) {
        console.error('Error fetching set:', err);
        setError('Failed to load set');
      } finally {
        setLoading(false);
      }
    };

    fetchSet();

    return () => {
      if (unsubscribeImages) {
        unsubscribeImages();
      }
    };
  }, [characterId, galleryId, adminUid]);


  useEffect(() => {
    if (fullscreen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
          handlePrevImage();
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        } else if (e.key === 'Escape') {
          setFullscreen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [fullscreen]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  const handlePrevImage = () => {
    if (!setData) return;
    setSelectedImageIndex((prev) => (prev === 0 ? setData.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!setData) return;
    setSelectedImageIndex((prev) => (prev === setData.images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.changedTouches[0].screenX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || !setData) return;
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    if (diff > threshold) {
      handleNextImage();
    } else if (diff < -threshold) {
      handlePrevImage();
    }
    setTouchStartX(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <Camera className="w-12 h-12 text-[#4CAF50] animate-bounce mb-4" />
        <div className="text-white font-semibold text-lg">Loading images...</div>
      </div>
    );
  }

  // Error state
  if (error || !setData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
        <div className="bg-neutral-900 p-6 rounded-lg border border-red-500/20 w-full max-w-md text-center">
          <h3 className="text-red-500 font-semibold mb-2 text-lg">Error</h3>
          <p className="text-red-400">{error || 'Gallery not found'}</p>
          <Link
            href={characterId ? `/characters/${characterId}` : '/characters'}
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors duration-200 inline-block"
          >
            Back to Galleries
          </Link>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="text-sm text-neutral-400 mb-1">
            <Link href="/characters" className="hover:text-[#4CAF50] transition-colors duration-200">
              Characters
            </Link>
            {' / '}
            <Link
              href={`/characters/${characterId}`}
              className="hover:text-[#4CAF50] transition-colors duration-200"
            >
              {setData.galleryName}
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                {setData.name}
              </h1>
              <div className="flex items-center text-neutral-400 mt-1 text-lg">
                <Calendar className="w-5 h-5 mr-2" />
                <span>
                  {formatDate(setData.createdAt)} • {setData.imageCount} image
                  {setData.imageCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 mt-4 sm:mt-0">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
                className="p-2 text-white hover:text-[#4CAF50] transition-colors duration-200 rounded-md border border-neutral-700"
                title={viewMode === 'grid' ? 'Switch to slideshow view' : 'Switch to grid view'}
              >
                <Grid className="w-5 h-5" />
              </button>
              <Link
                href={`/characters/${characterId}`}
                className="group flex items-center px-5 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                Back to Galleries
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {setData.images.map((image, index) => (
              <div
                key={image.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-neutral-800"
                onClick={() => {
                  setSelectedImageIndex(index);
                  setFullscreen(true);
                }}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-white font-medium text-sm">View Fullscreen</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-full h-[60vh] flex items-center justify-center">
              <img
                src={setData.images[selectedImageIndex].url}
                alt={setData.images[selectedImageIndex].name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <button
              onClick={handlePrevImage}
              className="absolute top-1/2 left-2 transform -translate-y-1/2 p-3 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none"
            >
              ←
            </button>
            <button
              onClick={handleNextImage}
              className="absolute top-1/2 right-2 transform -translate-y-1/2 p-3 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none"
            >
              →
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
              {selectedImageIndex + 1} / {setData.images.length}
            </div>
          </div>
        )}

        {/* Fullscreen Modal */}
        {fullscreen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            onClick={() => setFullscreen(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevImage();
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-4 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none hidden sm:block"
            >
              ←
            </button>
            <div className="max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
              <img
                src={setData.images[selectedImageIndex].url}
                alt={setData.images[selectedImageIndex].name}
                className="mx-auto object-contain max-h-screen max-w-full"
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage();
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-4 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none hidden sm:block"
            >
              →
            </button>
            <div className="block sm:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
              {selectedImageIndex + 1} / {setData.images.length}
            </div>
          </div>
        )}

        {/* Empty State */}
        {setData.images.length === 0 && (
          <div className="mt-8 text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
            <ImageIcon className="mx-auto h-12 w-12 text-[#4CAF50]" />
            <h3 className="mt-4 text-xl font-medium text-white">No Images Yet</h3>
            <p className="mt-2 text-neutral-400">
              This set is empty. Upload some images to get started.
            </p>
            <Link
              href={`/admin/upload`}
              className="mt-6 inline-flex items-center px-5 py-2.5 bg-[#4CAF50] text-white rounded-md hover:bg-[#45a049] transition-colors duration-200"
            >
              Upload Images
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetDetailPage;
