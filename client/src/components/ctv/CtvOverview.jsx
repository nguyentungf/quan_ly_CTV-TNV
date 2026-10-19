import React from 'react';
import { Crown, Users, UserCheck, ShieldCheck, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CtvOverview({
  groups = [],
  selectedGroup,
  onSelectGroup,
  onOpenAssignLeader,
}) {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Cấu Trúc 8 Nhóm Cộng Tác Viên</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              TNV phụ trách độc lập
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Bấm vào từng nhóm để lọc danh sách. Lãnh đạo nhóm là Tình nguyện viên (TNV) phụ trách độc lập.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && onOpenAssignLeader && (
            <button
              onClick={() => onOpenAssignLeader(1)}
              className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <UserCog className="w-3.5 h-3.5 text-amber-600" />
              Phân công TNV phụ trách
            </button>
          )}

          {selectedGroup !== 'all' && (
            <button
              onClick={() => onSelectGroup('all')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Xem tất cả nhóm
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {groups.map((g) => {
          const isSelected = selectedGroup === String(g.groupNum);
          const hasTnvLeader = Boolean(g.leaderTnvId);
          const hasTnvDeputy = Boolean(g.deputyTnvId);

          return (
            <div
              key={g.groupNum}
              onClick={() => onSelectGroup(isSelected ? 'all' : String(g.groupNum))}
              className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 shadow-xs'
              }`}
            >
              {/* Group Number & Member Count Badge */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-black tracking-tight px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    Nhóm {g.groupNum}
                  </span>
                  <span
                    className={`text-[11px] font-bold flex items-center gap-1 ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    {g.memberCount}
                  </span>
                </div>

                {/* Group Leader Highlight */}
                <div className="mt-1">
                  <div
                    className={`text-[10px] uppercase font-bold flex items-center justify-between ${
                      isSelected ? 'text-blue-100' : 'text-amber-600'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      <span>Nhóm trưởng</span>
                    </span>
                    {hasTnvLeader && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                        title="Tình nguyện viên phụ trách"
                      >
                        TNV
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs font-bold truncate mt-0.5 ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}
                    title={g.leaderName}
                  >
                    {g.leaderName}
                  </p>
                </div>

                {/* Deputy leader if exists */}
                {g.deputyName && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-100/40">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] truncate block ${
                          isSelected ? 'text-blue-200' : 'text-slate-500'
                        }`}
                        title={g.deputyName}
                      >
                        Phó: <b className={isSelected ? 'text-white' : 'text-slate-700'}>{g.deputyName}</b>
                      </span>
                      {hasTnvDeputy && (
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-bold shrink-0 ml-1 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          TNV
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin quick assign button on hover / card footer */}
              {isAdmin && onOpenAssignLeader && (
                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAssignLeader(g.groupNum);
                    }}
                    className={`w-full py-1 text-[10px] font-bold rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    Phân công
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
