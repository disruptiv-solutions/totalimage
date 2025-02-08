import { useEffect, useState, useCallback } from 'react';
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

interface Gallery {
  id: string;
  name: string;
  setCount: number;
  createdAt: Date;
  sets: Set[];
  allImages: ImageData[];
}

interface GalleryWithCarousel extends Gallery {
  currentImageIndex: number;
}

const SLIDE_INTERVAL = 5000; // 5 seconds between slides

const GalleriesPage: React.FC = () => {
  const [galleries, setGalleries] = useState<GalleryWithCarousel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  // Function to update a single gallery's image index
  const updateGalleryImage = useCallback((galleryId: string) => {
    setGalleries(prev =>
      prev.map(gallery => {
        if (gallery.id === galleryId) {
          const currentIndex = gallery.currentImageIndex;
          const imageCount = gallery.allImages.length;

          if (imageCount <= 1) return gallery;

          let newIndex;
          do {
            newIndex = Math.floor(Math.random() * imageCount);
          } while (newIndex === currentIndex && imageCount > 1);

          return { ...gallery, currentImageIndex: newIndex };
        }
        return gallery;
      })
    );
  }, []);

  useEffect(() => {
    const intervals = galleries.map(gallery => {
      if (gallery.allImages.length <= 1) return null;

      return setInterval(() => {
        updateGalleryImage(gallery.id);
      }, SLIDE_INTERVAL);
    });

    return () => {
      intervals.forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [galleries, updateGalleryImage]);

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const galleriesRef = collection(db, 'users', adminUid, 'galleries');
        const galleriesQuery = query(galleriesRef, orderBy('createdAt', 'desc'));
        const galleriesSnap = await getDocs(galleriesQuery);

        const galleriesData: GalleryWithCarousel[] = [];

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
            currentImageIndex: 0,
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

  const handleGalleryClick = (galleryId: string) => {
    setSelectedGallery(selectedGallery === galleryId ? null : galleryId);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Photo Galleries</h1>
            <p className="text-neutral-400 text-lg">
              {galleries.length} gallery{galleries.length !== 1 ? 'ies' : 'y'} available
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
            <h3 className="text-xl font-semibold text-white mb-2">No Galleries Yet</h3>
            <p className="text-neutral-400">
              Your photo galleries will appear here once created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries.map(gallery => {
              const currentImage = gallery.allImages[gallery.currentImageIndex];
              return (
                <div
                  key={gallery.id}
                  className={`bg-neutral-900 rounded-xl overflow-hidden transform transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-800 cursor-pointer border border-neutral-800 ${
                    selectedGallery === gallery.id ? 'ring-2 ring-[#4CAF50]' : ''
                  }`}
                  onClick={() => handleGalleryClick(gallery.id)}
                >
                  <div className="relative">
                    {gallery.allImages.length > 0 ? (
                      <div className="aspect-w-16 aspect-h-9">
                        <img
                          key={currentImage.id}
                          src={currentImage.url}
                          alt={currentImage.name}
                          className="w-full h-48 object-cover transition-opacity duration-500"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-neutral-800 flex items-center justify-center">
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

                  {selectedGallery === gallery.id && (
                    <div className="p-4 bg-neutral-800 border-t border-neutral-700">
                      <h3 className="font-medium text-white mb-3">Sets in this Gallery</h3>
                      <div className="space-y-4">
                        {gallery.sets.map(set => (
                          <Link
                            key={set.id}
                            href={`/galleries/${gallery.id}/sets/${set.id}`}
                            className="block p-3 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-white">{set.name}</span>
                              <span className="text-sm text-neutral-400">
                                {set.imageCount} image{set.imageCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center mt-2 space-x-1">
                              {set.images.slice(0, 3).map(image => (
                                <img
                                  key={image.id}
                                  src={image.url}
                                  alt={image.name}
                                  className="w-12 h-12 object-cover rounded border border-neutral-700"
                                />
                              ))}
                              {set.imageCount > 3 && (
                                <div className="w-12 h-12 flex items-center justify-center bg-neutral-800 rounded border border-neutral-700 text-xs text-neutral-400">
                                  +{set.imageCount - 3}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                              Created {formatDate(set.createdAt)}
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-between items-center text-sm">
                        <span className="text-neutral-400">{gallery.setCount} sets in this gallery</span>
                        <Link
                          href={`/galleries/${gallery.id}`}
                          className="text-[#4CAF50] hover:text-[#45a049] font-medium inline-flex items-center group transition-colors duration-200"
                          onClick={e => e.stopPropagation()}
                        >
                          View Gallery 
                          <span className="transform group-hover:translate-x-1 transition-transform ml-1">→</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleriesPage;