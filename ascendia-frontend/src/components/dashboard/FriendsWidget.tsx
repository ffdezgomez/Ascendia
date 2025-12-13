import React from 'react';
import { Link } from 'react-router-dom';
import { FriendAvatar } from '../FriendAvatar';
import type { FriendSummary } from '../../types/friends';

type FriendsWidgetProps = {
  friends: FriendSummary[];
};

export function FriendsWidget({ friends, className = '' }: FriendsWidgetProps & { className?: string }) {
  return (
    <div className={`rounded-[26px] bg-zinc-900/75 p-6 backdrop-blur-xl ring-1 ring-inset ring-zinc-800/60 flex flex-col ${className}`}>


      {friends.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <div className="h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3 text-2xl">
            👋
          </div>
          <p className="text-sm text-zinc-400 mb-2">Aún no tienes amigos</p>
          <Link
            to="/friends"
            className="text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full transition"
          >
            Buscar amigos
          </Link>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/friends/${friend.username}`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition group"
            >
              <FriendAvatar username={friend.username} avatar={friend.avatar} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition">
                  {friend.username}
                </p>
                <p className="text-[11px] text-zinc-500">Ver perfil</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
