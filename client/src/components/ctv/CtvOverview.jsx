import React from 'react';
import { Crown, Users, TrendingUp, UserCheck } from 'lucide-react';

export default function CtvOverview({ groups = [], selectedGroup, onSelectGroup }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Cấu Trúc 8 Nhóm Cộng Tác Viên</h2>
          <p className="text-xs text-slate-500">Bấm vào từng nhóm để lọc nhanh danh sách thành viên</p>
        </div>
        {selectedGroup !== 'all' && (
          <button
            onClick={() => onSelectGroup('all')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Xem tất cả nhóm
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {groups.map((g) => {
          const isSelected = selectedGroup === String(g.groupNum);
          return (
            <div
              key={g.groupNum}
              onClick={() => onSelectGroup(isSelected ? 'all' : String(g.groupNum))}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 shadow-xs'
              }`}
            >
              {/* Group Number Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black tracking-tight px-2 py-0.5 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                }`}>
                  Nhóm {g.groupNum}
                </span>
                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                  isSelected ? 'text-blue-100' : 'text-slate-500'
                }`}>
                  <Users className="w-3 h-3" />
                  {g.memberCount}
                </span>
              </div>

              {/* Group Leader Highlight */}
              <div className="mt-1">
                <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                  isSelected ? 'text-blue-100' : 'text-amber-600'
                }`}>
                  <Crown className="w-3 h-3" />
                  <span>Nhóm trưởng</span>
                </div>
                <p className={`text-xs font-bold truncate mt-0.5 ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`} title={g.leaderName}>
                  {g.leaderName}
                </p>
              </div>

              {/* Deputy leader if exists */}
              {g.deputyName && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-100/40">
                  <span className={`text-[10px] block ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    Nhóm phó: <b className={isSelected ? 'text-white' : 'text-slate-700'}>{g.deputyName}</b>
                  </span>
                </div>
              )}

              {/* Stats Footer */}
              <div className={`mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-medium ${
                isSelected ? 'border-white/20 text-blue-100' : 'border-slate-100 text-slate-500'
              }`}>
                <span>Điểm TB:</span>
                <span className="font-bold">{g.avgPoints}đ</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

