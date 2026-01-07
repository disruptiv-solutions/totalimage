import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, FolderOpen, MessageCircle } from 'lucide-react';

type CharacterProfilePanelProps = {
  characterName: string;
  characterId: string;
  profileImageUrl: string | null;
  galleryCount: number;
  activeTab?: 'galleries' | 'chat';
  isLoading?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export const CharacterProfilePanel = ({
  characterName,
  characterId,
  profileImageUrl,
  galleryCount,
  activeTab = 'galleries',
  isLoading = false,
  collapsed = false,
  onToggleCollapse,
}: CharacterProfilePanelProps) => {
  return (
    <aside className={`lg:sticky lg:top-24 h-fit transition-all duration-300 w-full ${collapsed ? 'lg:w-16' : 'lg:w-[360px]'}`} aria-busy={isLoading}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative w-full max-w-full">
        {/* Collapse Toggle Button - Desktop Only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-6 z-10 items-center justify-center w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        {collapsed ? (
          // Collapsed View - Icon Only
          <div className="flex flex-col items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-8 bg-neutral-800 rounded-full animate-pulse" />
            ) : profileImageUrl ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-700">
                <img src={profileImageUrl} alt={characterName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-neutral-600" />
              </div>
            )}
            <div className="w-full border-t border-neutral-800" />
            <Link
              href={`/characters/${characterId}`}
              className={`p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
                activeTab === 'galleries'
                  ? 'bg-[#4CAF50]/10 text-[#4CAF50]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              aria-label="Show galleries"
              title="Galleries"
            >
              <FolderOpen className="w-5 h-5" />
            </Link>
            <Link
              href={`/characters/${characterId}/chat`}
              className={`p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
                activeTab === 'chat'
                  ? 'bg-[#4CAF50] text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              aria-label={`Chat with ${characterName}`}
              title="Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          // Expanded View
          <>
        <div className="flex items-center justify-between gap-4">
          {isLoading ? (
            <div className="h-7 w-40 bg-neutral-800 rounded-md animate-pulse" />
          ) : (
            <h1 className="text-2xl font-black tracking-tighter text-white">{characterName}</h1>
          )}
          <Link
            href="/characters"
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            aria-label="Back to characters"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Characters</span>
          </Link>
        </div>

        <div className="mt-4 text-sm text-neutral-400">
          {isLoading ? <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" /> : `${galleryCount} galleries`}
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 h-72 animate-pulse" />
          ) : profileImageUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-black">
              <div className="aspect-w-4 aspect-h-5">
                <img
                  src={profileImageUrl}
                  alt={`${characterName} profile image`}
                  className="w-full h-72 object-cover object-top"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 h-72 flex items-center justify-center">
              <FolderOpen className="w-12 h-12 text-neutral-700" />
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="text-xs font-semibold text-neutral-400 mb-2">Browse</div>
          <Link
            href={`/characters/${characterId}`}
            className={`block w-full px-4 py-3 rounded-xl border text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
              activeTab === 'galleries'
                ? 'bg-[#4CAF50]/10 border-[#4CAF50]/40 text-white'
                : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
            }`}
            aria-label="Show galleries"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Galleries</span>
              <span className="text-xs text-neutral-400">{galleryCount}</span>
            </div>
          </Link>

          {isLoading ? (
            <div className="mt-3 h-12 w-full bg-neutral-800 rounded-xl animate-pulse" />
          ) : (
            <Link
              href={`/characters/${characterId}/chat`}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
                activeTab === 'chat'
                  ? 'bg-[#4CAF50] border-[#4CAF50] text-white hover:bg-[#45a049]'
                  : 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700'
              }`}
              aria-label={`Chat with ${characterName}`}
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </Link>
          )}
        </div>
          </>
        )}
      </div>
    </aside>
  );
};

