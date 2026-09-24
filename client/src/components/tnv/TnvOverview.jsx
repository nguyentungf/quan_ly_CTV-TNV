import React from 'react';
import { Crown, Users, Award, ShieldAlert, HeartHandshake, UserCheck } from 'lucide-react';

export default function TnvOverview({ groups = [], selectedGroup, onSelectGroup }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Cấu Trúc 4 Nhóm Tình Nguyện Viên</h2>
          <p className="text-xs text-slate-500">Làm nổi bật Nhóm trưởng và Nhóm phó phụ trách từng nhóm</p>
        </div>
        {selectedGroup !== 'all' && (
          <button
            onClick={() => onSelectGroup('all')}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
          >
            Xem tất cả nhóm
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {groups.map((g) => {
          const isSelected = selectedGroup === String(g.groupNum);
          return (
            <div
              key={g.groupNum}
              onClick={() => onSelectGroup(isSelected ? 'all' : String(g.groupNum))}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20 ring-2 ring-rose-300'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 shadow-xs'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
                }`}>
                  Nhóm {g.groupNum}
                </span>

                <div className="flex items-center gap-2">
                  {g.warningCount > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                    }`}>
                      <ShieldAlert className="w-3 h-3" />
                      {g.warningCount} kỷ luật
                    </span>
                  )}
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    isSelected ? 'text-rose-100' : 'text-slate-500'
                  }`}>
                    <Users className="w-3.5 h-3.5" />
                    {g.memberCount} TV
                  </span>
                </div>
              </div>

              {/* Leader & Deputy Highlight */}
              <div className="space-y-2 mt-2">
                {/* Leader */}
                <div className={`p-2.5 rounded-xl border ${
                  isSelected ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                    isSelected ? 'text-amber-200' : 'text-amber-600'
                  }`}>
                    <Crown className="w-3.5 h-3.5" />
                    <span>Nhóm trưởng</span>
                  </div>
                  <p className={`text-xs font-black truncate mt-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {g.leaderName}
                  </p>
                </div>

                {/* Deputy */}
                <div className={`p-2.5 rounded-xl border ${
                  isSelected ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                    isSelected ? 'text-rose-200' : 'text-indigo-600'
                  }`}>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Nhóm phó</span>
                  </div>
                  <p className={`text-xs font-bold truncate mt-0.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {g.deputyName}
                  </p>
                </div>
              </div>

              {/* Stats Footer */}
              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-xs font-medium ${
                isSelected ? 'border-white/20 text-rose-100' : 'border-slate-100 text-slate-500'
              }`}>
                <span>Tổng điểm nhóm:</span>
                <span className="font-black text-sm">{g.totalPoints}đ</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

