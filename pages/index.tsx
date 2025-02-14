import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { Camera, Star, ImagePlus, Clock, Image, FolderOpen } from 'lucide-react';
import { useGalleryCounts } from '../hooks/useGalleryCounts';

function Home() {
  const { user, loading: authLoading } = useAuth();
  const galleries = useGalleryCounts();

  const totalGalleries = galleries.length;
  const totalSets = galleries.reduce((acc, gal) => acc + gal.setCount, 0);
  const totalImages = galleries.reduce(
    (acc, gal) => acc + gal.sets.reduce((setAcc, set) => setAcc + set.imageCount, 0),
    0
  );

  const recentSets = galleries
    .flatMap(gallery =>
      gallery.sets.map(set => ({
        ...set,
        galleryId: gallery.id,
        galleryName: gallery.name,
      }))
    )
    .sort((a, b) => {
      const dateA = a.createdAt || new Date();
      const dateB = b.createdAt || new Date();
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 3);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-[#4CAF50]/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#4CAF50] animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6">
              Total<span className="text-white">Toons</span><span className="text-[#4CAF50]">34</span>
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto">
              Exclusive access to TotalToons34's premium digital art collection
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-3 bg-[#4CAF50] text-white text-lg font-semibold rounded-full hover:bg-[#45a049] transition-colors duration-200"
              >
                Sign Up
              </Link>
              <Link
                href="/signin"
                className="px-8 py-3 bg-neutral-900 text-white text-lg font-semibold rounded-full hover:bg-neutral-800 transition-colors duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 transform hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-xl flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-[#4CAF50]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Exclusive Content</h3>
              <p className="text-neutral-400">
                Get instant access to TotalToons34's complete collection of premium digital art
              </p>
            </div>

            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 transform hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-xl flex items-center justify-center mb-6">
                <ImagePlus className="w-6 h-6 text-[#4CAF50]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Regular Updates</h3>
              <p className="text-neutral-400">
                New artwork added weekly. Be the first to see fresh content
              </p>
            </div>

            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 transform hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-[#4CAF50]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Early Access</h3>
              <p className="text-neutral-400">
                Preview new galleries before they're publicly released
              </p>
            </div>
          </div>

          <div className="mt-24 bg-neutral-900 rounded-3xl border border-neutral-800 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-black text-[#4CAF50] mb-2">{totalImages}+</div>
                <div className="text-neutral-400">Artworks</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-[#4CAF50] mb-2">{totalGalleries}+</div>
                <div className="text-neutral-400">Galleries</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-[#4CAF50] mb-2">Weekly</div>
                <div className="text-neutral-400">Updates</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
          <div className="px-8 py-10">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                Welcome back
              </h1>
              <Link
                href="/galleries"
                className="px-6 py-2 bg-[#4CAF50] text-white text-lg font-semibold rounded-lg hover:bg-[#45a049] transition-colors duration-200"
              >
                View Galleries
              </Link>
            </div>
            <p className="text-neutral-400 text-lg mb-8">
              Your personal gallery collection awaits
            </p>

            <div className="flex flex-wrap gap-8">
              <div className="flex items-center">
                <FolderOpen className="w-5 h-5 text-[#4CAF50] mr-2" />
                <span className="text-lg font-bold text-[#4CAF50] mr-2">{totalGalleries}</span>
                <span className="text-neutral-400">Galleries</span>
              </div>
              <div className="flex items-center">
                <ImagePlus className="w-5 h-5 text-[#4CAF50] mr-2" />
                <span className="text-lg font-bold text-[#4CAF50] mr-2">{totalSets}</span>
                <span className="text-neutral-400">Sets</span>
              </div>
              <div className="flex items-center">
                <Image className="w-5 h-5 text-[#4CAF50] mr-2" />
                <span className="text-lg font-bold text-[#4CAF50] mr-2">{totalImages}</span>
                <span className="text-neutral-400">Images</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Chat with Characters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            <Link href="/chat/Lois" className="group">
              <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-[#4CAF50]/50 transition-all duration-200">
                <div className="aspect-[3/4] bg-neutral-800">
                  <img
                    src="/loischat.png"
                    alt="Chat with Lois"
                    className="w-full h-full object-cover object-top"
                    style={{
                      maxHeight: '400px'
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Chat with Lois</h3>
                  <p className="text-neutral-400">Have a conversation with Lois</p>
                </div>
              </div>
            </Link>

            <Link href="/chat/Leela" className="group">
              <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-[#4CAF50]/50 transition-all duration-200">
                <div className="aspect-[3/4] bg-neutral-800">
                  <img
                    src="/leelachat.png"
                    alt="Chat with Leela"
                    className="w-full h-full object-cover object-top"
                    style={{
                      maxHeight: '400px'
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Chat with Leela</h3>
                  <p className="text-neutral-400">Have a conversation with Leela</p>
                </div>
              </div>
            </Link>
          </div>
        

          <h2 className="text-2xl font-bold text-white mb-6">Recent Updates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSets.map((set) => (
              <Link
                key={set.id}
                href={`/galleries/${set.galleryId}/sets/${set.id}`}
                className="group cursor-pointer rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-[#4CAF50]/50 transition-all duration-200 flex flex-col"
              >
                <div className="relative w-full pt-[56.25%] overflow-hidden">
                  {set.coverPhoto && (
                    <img
                      src={set.coverPhoto}
                      alt={set.name}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="p-4 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{set.name}</h3>
                    <p className="text-sm text-neutral-400">{set.imageCount} images</p>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    From {set.galleryName}
                  </div>
                </div>
              </Link>
            ))}

            <Link
              href="/galleries"
              className="group cursor-pointer rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-[#4CAF50]/50 transition-all duration-200 flex flex-col"
            >
              <div className="relative w-full pt-[56.25%] bg-neutral-800/50">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="w-16 h-16 bg-[#4CAF50]/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#4CAF50]/20 transition-colors duration-200">
                    <Camera className="w-8 h-8 text-[#4CAF50]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white text-center mb-2">
                    Browse All Galleries
                  </h3>
                  <p className="text-sm text-neutral-400 text-center">
                    Explore {totalGalleries} galleries with {totalSets} sets
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 hover:border-[#4CAF50]/50 transition-colors duration-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#4CAF50]/10 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-[#4CAF50]" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-white">
                Collection Overview
              </h3>
            </div>
            <p className="text-neutral-400">
              Your collection contains {totalGalleries} galleries with {totalSets} sets and {totalImages} images.
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 hover:border-[#4CAF50]/50 transition-colors duration-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#4CAF50]/10 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-[#4CAF50]" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-white">
                Premium Member</h3>
                  </div>
                  <p className="text-neutral-400">
                    Full access to all galleries and weekly updates.
                  </p>
                </div>
                </div>
                </div>
                </div>
                );
                }

                export default Home;