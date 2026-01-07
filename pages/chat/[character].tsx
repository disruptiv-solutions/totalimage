import { useRouter } from 'next/router';
import { CharacterChatThread } from '../../components/chat/CharacterChatThread';

export default function Chat() {
  const router = useRouter();
  const { character } = router.query;

  const backgroundImage = character === 'Lois' ? '/loischat.png' : '/leelachat.png';
  const characterName = typeof character === 'string' ? character : '';

  return (
    <div className="relative w-full h-[calc(100vh-8rem)]">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          filter: 'blur(8px)',
          transform: 'scale(1.1)'
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 w-full max-w-3xl mx-auto h-full px-4 py-8 flex flex-col">
        <h1 className="text-2xl font-bold text-white mb-8">Chat with {character}</h1>
        {characterName ? <CharacterChatThread characterName={characterName} /> : null}
      </div>
    </div>
  );
}