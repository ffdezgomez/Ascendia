import React from 'react';

// Placeholder type until we have real challenges
type ChallengeSummary = {
  id: string;
  title: string;
  daysLeft: number;
  participants: number;
  opponentName?: string;
  opponentAvatar?: string;
};

type ChallengesWidgetProps = {
  challenges: ChallengeSummary[];
};

export function ChallengesWidget({ challenges, className = '' }: ChallengesWidgetProps & { className?: string }) {
  return (
    <div className={`rounded-[26px] bg-zinc-900/75 p-6 backdrop-blur-xl ring-1 ring-inset ring-zinc-800/60 flex flex-col ${className}`}>


      {challenges.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3 text-2xl">
            🏆
          </div>
          <p className="text-sm text-zinc-400 mb-2">No hay retos activos</p>
          <button
            disabled
            className="text-xs font-medium bg-zinc-800/50 text-zinc-500 px-3 py-1.5 rounded-full cursor-not-allowed"
          >
            Crear reto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-zinc-200">{challenge.title}</h4>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full">
                  {challenge.daysLeft} días
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {challenge.opponentName ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">vs</span>
                    {challenge.opponentAvatar ? (
                      <img
                        src={challenge.opponentAvatar}
                        alt={challenge.opponentName}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-300">
                        {challenge.opponentName[0].toUpperCase()}
                      </span>
                    )}
                    <span className="text-zinc-300">{challenge.opponentName}</span>
                  </div>
                ) : (
                  <span>👥 {challenge.participants} participantes</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
