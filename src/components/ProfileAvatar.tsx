import { useState, useEffect } from 'react';
import { User } from 'lucide-react';

export default function ProfileAvatar({ url, name, size = 32 }: { url?: string; name?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [url]);

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name || 'Profile'}
        className="rounded-full object-cover border border-border/50"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = name?.charAt(0).toUpperCase() || '?';
  const colors = ['bg-red-400', 'bg-green-400', 'bg-blue-400', 'bg-amber-400', 'bg-purple-400', 'bg-pink-400', 'bg-cyan-400', 'bg-indigo-400'];
  const color = colors[(name?.length || 0) % colors.length];

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold text-xs ${color}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}
