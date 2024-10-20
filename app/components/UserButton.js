'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UserButton({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const avatarSrc = user.avatar || '/images/default-avatar.png';

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login'); // This now uses the new App Router
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Image
          src={avatarSrc}
          alt={user.name}
          width={30}
          height={30}
          className="rounded-full _rounded-full"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-10">
          <button
            onClick={handleLogout}
            className="block w-full z-1000 text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
