import React from 'react';
import { Trophy, Medal, Award, Flame, Crown, Sparkles } from 'lucide-react';

export default function TnvLeaderboard({ leaderboard = [], maxScore = 100 }) {
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return {
          title: 'Hạng 1 - Quán quân',
          badgeClass: 'bg-amber-400 text-amber-950 ring-2 ring-amber-300 shadow-md shadow-amber-400/30',
          icon: Trophy,
          iconColor: 'text-amber-500',
          cardBorder: 'border-amber-300 bg-gradient-to-r from-amber-50/60 to-orange-50/40',
        };
      case 2:
        return {
          title: 'Hạng 2 - Á quân 1',
          badgeClass: 'bg-slate-300 text-slate-900 ring-2 ring-slate-200',
          icon: Medal,
          iconColor: 'text-slate-400',
          cardBorder: 'border-slate-300 bg-slate-50/60',
        };
      case 3:
        return {
          title: 'Hạng 3 - Á quân 2',
          badgeClass: 'bg-amber-600 text-white ring-2 ring-amber-500',
          icon: Medal,
          iconColor: 'text-amber-600',
          cardBorder: 'border-amber-200 bg-amber-50/30',
        };
      case 4:
        return {
          title: 'Hạng 4',
          badgeClass: 'bg-blue-100 text-blue-800',
          icon: Award,
          iconColor: 'text-blue-500',
          cardBorder: 'border-slate-200 bg-white',
        };
      case 5:
        return {
          title: 'Hạng 5',
          badgeClass: 'bg-blue-100 text-blue-800',
          icon: Award,
          iconColor: 'text-blue-500',
          cardBorder: 'border-slate-200 bg-white',
        };
      default:
        return {
          title: `Hạng ${rank}`,
          badgeClass: 'bg-slate-100 text-slate-700',
          icon: Award,
          iconColor: 'text-slate-400',
          cardBorder: 'border-slate-200 bg-white',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Bảng Vinh Danh Top 5 Tình Nguyện Viên
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi nhận những cá nhân có điểm cống hiến tình nguyện cao nhất toàn đội
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Điểm mốc Top 1: {maxScore}đ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {leaderboard.map((m) => {
          const config = getRankBadge(m.rank);
          const Icon = config.icon;

          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-2xl border ${config.cardBorder} flex flex-col justify-between relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            >
              {/* Rank Header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${config.badgeClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                  Hạng {m.rank}
                </span>

                <span className="text-[11px] font-bold text-slate-500">
                  Nhóm {m.group_num}
                </span>
              </div>

              {/* Member Info */}
              <div className="my-1">
                <div className="text-xs font-black text-slate-900 truncate" title={m.full_name}>
                  {m.full_name}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  MSSV: {m.mssv}
                </div>
              </div>

              {/* Score and Benchmark Progress */}
              <div className="mt-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Tích lũy:</span>
                  <span className="text-sm font-black text-slate-900">{m.total_points}đ</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.rank === 1
                        ? 'bg-amber-500'
                        : m.rank === 2
                        ? 'bg-slate-500'
                        : m.rank === 3
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${m.benchmarkRate}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 text-right block mt-1">
                  Đạt {m.benchmarkRate}% mốc cao nhất
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

