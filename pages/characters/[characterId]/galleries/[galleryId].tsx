import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { db } from '../../../../lib/firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, Calendar, Camera, ChevronLeft, ChevronRight, Grid, Image as ImageIcon } from 'lucide-react';
import { CharacterProfilePanel } from '../../../../components/characters/CharacterProfilePanel';
import { usePanelState } from '../../../../hooks/usePanelState';

type CharacterData = {
  id: string;
  name: string;
  galleryCount: number;
  profileImageUrl: string | null;
};

type ImageData = {
  id: string;
  url: string;
  name: string;
  createdAt: Date;
  size?: number;
  type?: string;
};

type GalleryData = {
  id: string;
  name: string;
  createdAt: Date;
  images: ImageData[];
};

const CharacterGalleryPage: React.FC = () => {
  const router = useRouter();
  const characterId = typeof router.query.characterId === 'string' ? router.query.characterId : undefined;
  const galleryId = typeof router.query.galleryId === 'string' ? router.query.galleryId : undefined;

  const { leftCollapsed, rightCollapsed, toggleLeft, toggleRight } = usePanelState();
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [gallery, setGallery] = useState<GalleryData | null>(null);
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

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch character info
        const characterRef = doc(db, 'users', adminUid, 'galleries', characterId);
        const characterSnap = await getDoc(characterRef);
        if (!characterSnap.exists()) {
          setError('Character not found');
          return;
        }

        // Fetch galleries list (sets) for profile image + count
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

        // Fetch selected gallery (set) info
        const setRef = doc(db, 'users', adminUid, 'galleries', characterId, 'sets', galleryId);
        const setSnap = await getDoc(setRef);
        if (!setSnap.exists()) {
          setError('Gallery not found');
          return;
        }
        const setInfo = setSnap.data();

        setGallery({
          id: galleryId,
          name: setInfo.name,
          createdAt: setInfo.createdAt?.toDate() || new Date(),
          images: [],
        });

        // Subscribe to images
        const imagesRef = collection(db, 'users', adminUid, 'galleries', characterId, 'sets', galleryId, 'images');
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

          setGallery((prev) => (prev ? { ...prev, images } : prev));
          setSelectedImageIndex((prev) => (images.length === 0 ? 0 : Math.min(prev, images.length - 1)));
        });
      } catch (err) {
        console.error('Error loading character gallery:', err);
        setError('Failed to load gallery');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    return () => {
      if (unsubscribeImages) unsubscribeImages();
    };
  }, [adminUid, characterId, galleryId]);

  useEffect(() => {
    if (!fullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gallery) return;
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev === 0 ? gallery.images.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev === gallery.images.length - 1 ? 0 : prev + 1));
        return;
      }
      if (e.key === 'Escape') {
        setFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen, gallery]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  const handlePrevImage = () => {
    if (!gallery || gallery.images.length === 0) return;
    setSelectedImageIndex((prev) => (prev === 0 ? gallery.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!gallery || gallery.images.length === 0) return;
    setSelectedImageIndex((prev) => (prev === gallery.images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.changedTouches[0].screenX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || !gallery || gallery.images.length === 0) return;
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    if (diff > threshold) handleNextImage();
    if (diff < -threshold) handlePrevImage();
    setTouchStartX(null);
  };

  if (!loading && (error || !character || !gallery)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
        <div className="bg-neutral-900 p-6 rounded-lg border border-red-500/20 w-full max-w-md text-center">
          <h3 className="text-red-500 font-semibold mb-2 text-lg">Error</h3>
          <p className="text-red-400">{error || 'Gallery not found'}</p>
          <Link
            href={characterId ? `/characters/${characterId}` : '/characters'}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            aria-label="Back to galleries"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Galleries
          </Link>
        </div>
      </div>
    );
  }

  const characterName = character?.name ?? 'Loading...';
  const galleryCount = character?.galleryCount ?? 0;
  const profileImageUrl = character?.profileImageUrl ?? null;

  return (
    <div className="min-h-screen bg-black w-full max-w-full overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-8 w-full">
        <div className={`grid grid-cols-1 gap-8 xl:gap-10 transition-all duration-300 w-full ${
          leftCollapsed ? 'lg:grid-cols-[64px_1fr]' : 'lg:grid-cols-[360px_1fr]'
        }`}>
          <CharacterProfilePanel
            characterName={characterName}
            characterId={characterId ?? '/characters'}
            profileImageUrl={profileImageUrl}
            galleryCount={galleryCount}
            activeTab="galleries"
            isLoading={loading || !character}
            collapsed={leftCollapsed}
            onToggleCollapse={toggleLeft}
          />

          <section className="relative">
            {/* Right Panel Toggle Button - Desktop Only */}
            {!rightCollapsed && (
              <button
                onClick={toggleRight}
                className="hidden lg:flex absolute -left-3 top-6 z-10 items-center justify-center w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                aria-label="Hide right panel"
                title="Hide right panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {rightCollapsed && (
              <button
                onClick={toggleRight}
                className="hidden lg:flex fixed right-4 top-24 z-20 items-center justify-center w-10 h-10 bg-neutral-800 border border-neutral-700 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] shadow-lg"
                aria-label="Show right panel"
                title="Show right panel"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {rightCollapsed && (
              <div className="hidden lg:flex items-center justify-center min-h-[60vh] text-neutral-500">
                <p>Right panel collapsed</p>
              </div>
            )}
            {!rightCollapsed && (
            <div className={`mb-6 transition-opacity duration-200 ${loading || !gallery ? 'opacity-60' : 'opacity-100'}`}>
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
                <span className="text-neutral-300">{gallery?.name ?? 'Loading...'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">
                    {gallery?.name ?? 'Loading...'}
                  </h2>
                  <div className="flex items-center text-neutral-400 mt-1 text-base sm:text-lg">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span>
                      {gallery?.createdAt ? formatDate(gallery.createdAt) : 'Loading...'} •{' '}
                      {(gallery?.images?.length ?? 0)} image{(gallery?.images?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
                    className="p-2 text-white hover:text-[#4CAF50] transition-colors duration-200 rounded-md border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                    aria-label={viewMode === 'grid' ? 'Switch to slideshow view' : 'Switch to grid view'}
                    title={viewMode === 'grid' ? 'Switch to slideshow view' : 'Switch to grid view'}
                    disabled={loading || !gallery || (gallery.images?.length ?? 0) === 0}
                  >
                    <Grid className="w-5 h-5" />
                  </button>

                  <Link
                    href={characterId ? `/characters/${characterId}` : '/characters'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                    aria-label="Back to galleries"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Galleries
                  </Link>
                </div>
              </div>
            </div>

            {loading || !gallery ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden"
                  >
                    <div className="w-full aspect-[1/1] bg-neutral-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : gallery.images.length === 0 ? (
              <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
                <ImageIcon className="mx-auto h-12 w-12 text-[#4CAF50]" />
                <h3 className="mt-4 text-xl font-medium text-white">No Images Yet</h3>
                <p className="mt-2 text-neutral-400">This gallery is empty.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {gallery.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className="relative group cursor-pointer rounded-lg overflow-hidden border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setFullscreen(true);
                    }}
                    aria-label={`Open image ${image.name}`}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-white font-medium text-sm">View Fullscreen</span>
                    </div>
                  </button>
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
                    src={gallery.images[selectedImageIndex].url}
                    alt={gallery.images[selectedImageIndex].name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute top-1/2 left-2 transform -translate-y-1/2 p-3 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute top-1/2 right-2 transform -translate-y-1/2 p-3 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                  aria-label="Next image"
                >
                  →
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  {selectedImageIndex + 1} / {gallery.images.length}
                </div>
              </div>
            )}

            {fullscreen && gallery && gallery.images.length > 0 && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black"
                onClick={() => setFullscreen(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-4 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none hidden sm:block"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <div className="max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={gallery.images[selectedImageIndex].url}
                    alt={gallery.images[selectedImageIndex].name}
                    className="mx-auto object-contain max-h-screen max-w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-4 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors duration-200 focus:outline-none hidden sm:block"
                  aria-label="Next image"
                >
                  →
                </button>
                <div className="block sm:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  {selectedImageIndex + 1} / {gallery.images.length}
                </div>
              </div>
            )}
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CharacterGalleryPage;

