import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CalendarX,
  Users,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Zap,
  Bell,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function TeamHealthWidget({
  type = 'ctv', // 'ctv' | 'tnv'
  groupNum = 1,
  members = [],
  onNavigateToAttendance,
  onNavigateToCampaigns,
  onNavigateToDiscipline
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Lọc các thành viên thuộc nhóm hiện tại
  const groupMembers = useMemo(() => {
    return members.filter((m) => Number(m.group_num) === Number(groupNum));
  }, [members, groupNum]);

  // 1. Phân tích thành viên có nguy cơ kỷ luật / điểm thấp
  const lowPointMembers = useMemo(() => {
    return groupMembers.filter((m) => {
      const total = Number(m.total_points) || 0;
      if (type === 'tnv') {
        return total < 50 || m.warning_level === 'yellow' || m.warning_level === 'red';
      } else {
        const att = Number(m.attitude_points) || 0;
        return total < 30 || att < 0;
      }
    });
  }, [groupMembers, type]);

  // 2. Phân tích thành viên có trạng thái cần chú ý
  const inactiveMembers = useMemo(() => {
    return groupMembers.filter((m) => m.status === 'Tạm dừng' || m.status === 'Đã thôi việc');
  }, [groupMembers]);

  // Tổng số vấn đề cần xử lý
  const totalAlerts = lowPointMembers.length + inactiveMembers.length;

  if (groupMembers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Bảng Nhắc Việc & Sức Khỏe Nhóm {groupNum} ({type.toUpperCase()})
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                totalAlerts > 0
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {totalAlerts > 0 ? `${totalAlerts} lưu ý` : 'An toàn 100%'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Tự động quét thành viên điểm thấp, nguy cơ cảnh cáo và các hoạt động cần hoàn thiện
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          {onNavigateToAttendance && (
            <button
              type="button"
              onClick={onNavigateToAttendance}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-indigo-300" />
              <span>Điểm danh tuần</span>
            </button>
          )}

          {totalAlerts > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Chips Grid */}
      <div className="p-3 bg-slate-50 border-b border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Sĩ số nhóm</span>
            <span className="text-sm font-extrabold text-slate-800">{groupMembers.length} bạn</span>
          </div>
          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Điểm TB nhóm</span>
            <span className="text-sm font-extrabold text-slate-800">
              {groupMembers.length > 0
                ? (groupMembers.reduce((acc, m) => acc + (Number(m.total_points) || 0), 0) / groupMembers.length).toFixed(1)
                : 0}đ
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Điểm thấp / Cảnh báo</span>
            <span className={`text-sm font-extrabold ${lowPointMembers.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowPointMembers.length} bạn
            </span>
          </div>
          <AlertTriangle className={`w-4 h-4 shrink-0 ${lowPointMembers.length > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Tạm dừng / Nghỉ</span>
            <span className={`text-sm font-extrabold ${inactiveMembers.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {inactiveMembers.length} bạn
            </span>
          </div>
          <TrendingDown className={`w-4 h-4 shrink-0 ${inactiveMembers.length > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
        </div>
      </div>

      {/* Expandable Alert List */}
      {isExpanded && totalAlerts > 0 && (
        <div className="p-3.5 space-y-2.5 animate-fade-in text-xs bg-white">
          <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>Danh sách thành viên cần Nhóm trưởng động viên & nhắc nhở:</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {lowPointMembers.map((m) => (
              <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <div>
                    <span className="font-bold text-slate-800">{m.full_name}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5 font-mono">({m.mssv})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600">
                    Tổng điểm: <b className="text-amber-700 font-extrabold">{m.total_points || 0}đ</b>
                  </span>
                  {m.warning_level && m.warning_level !== 'none' && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      m.warning_level === 'red' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.warning_level === 'red' ? 'Thẻ Đỏ' : 'Thẻ Vàng'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {inactiveMembers.map((m) => (
              <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                  <div>
                    <span className="font-bold text-slate-800">{m.full_name}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5 font-mono">({m.mssv})</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
