import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function TnvAttendanceTracker({ selectedGroup }) {
  const { addToast } = useToast();
  const [data, setData] = useState({ events: [], tracker: [] });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadTracker();
  }, [selectedGroup]);

  const loadTracker = async () => {
    setLoading(true);
    try {
      const res = await api.getTnvAttendanceTracker({ group: selectedGroup });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      addToast('Lỗi khi tải bảng điểm danh TNV', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInit19Weeks = async () => {
    if (window.confirm('Hệ thống sẽ tự động tạo đủ 19 tuần trực / họp cho TNV trong học kỳ này (nếu chưa có). Bạn có muốn tiếp tục?')) {
      setInitLoading(true);
      try {
        const res = await api.initTnv19Weeks();
        if (res.success) {
          addToast(res.message, 'success');
          loadTracker();
        } else {
          addToast(res.message || 'Lỗi khi khởi tạo 19 tuần trực TNV', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối máy chủ', 'error');
      } finally {
        setInitLoading(false);
      }
    }
  };

  const handleStatusChange = async (memberId, eventId, newStatus) => {
    try {
      // Optimistic update
      setData((prev) => {
        const nextTracker = prev.tracker.map((row) => {
          if (row.member.id === memberId) {
            const nextAtt = { ...row.attendance, [eventId]: newStatus };
            let attendedCount = 0;
            for (const ev of prev.events) {
              if (nextAtt[ev.id] === 'co_mat') attendedCount++;
            }
            const totalSessions = prev.events.length;
            const percent = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;
            return {
              ...row,
              attendance: nextAtt,
              attendedCount,
              attendancePercent: percent
            };
          }
          return row;
        });
        return { ...prev, tracker: nextTracker };
      });

      await api.updateTnvAttendance(memberId, eventId, newStatus);
    } catch (err) {
      addToast('Lỗi cập nhật điểm danh TNV', 'error');
      loadTracker();
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) {
      addToast('Vui lòng nhập tên ca trực / tuần trực!', 'warning');
      return;
    }

    try {
      const res = await api.createTnvEvent({ name: newEventName, eventDate: newEventDate });
      if (res.success) {
        addToast('Đã thêm ca trực mới thành công!', 'success');
        setShowAddEventModal(false);
        setNewEventName('');
        loadTracker();
      }
    } catch (err) {
      addToast('Lỗi khi thêm ca trực', 'error');
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa cột ca trực "${eventName}" không?`)) {
      try {
        const res = await api.deleteTnvEvent(eventId);
        if (res.success) {
          addToast('Đã xóa ca trực', 'success');
          loadTracker();
        }
      } catch (err) {
        addToast('Lỗi khi xóa ca trực', 'error');
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">
              Bảng Điểm Danh Ca Trực Co Giãn (Elastic Tracker)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200/60">
              {data.events.length} ca/tuần trực
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dễ dàng thêm các ca trực sự kiện hoặc tuần trực theo kế hoạch, tính ngay số buổi có mặt
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInit19Weeks}
            disabled={initLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
            title="Tự động tạo đủ 19 tuần trực cho học kỳ"
          >
            <Zap className="w-3.5 h-3.5 text-rose-600" />
            <span>{initLoading ? 'Đang tạo...' : 'Khởi tạo 19 tuần trực'}</span>
          </button>

          <button
            onClick={() => setShowAddEventModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tuần / Ca Trực</span>
          </button>
        </div>
      </div>

      {/* Elastic Matrix Table */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3.5 sticky left-0 z-20 bg-slate-50 min-w-[200px] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                Tình Nguyện Viên
              </th>
              <th className="p-3.5 text-center min-w-[120px] border-r border-slate-200">
                Tổng buổi có mặt
              </th>
              {data.events.map((ev) => (
                <th
                  key={ev.id}
                  className="p-3 text-center min-w-[140px] border-r border-slate-200 group relative hover:bg-slate-100 transition-colors"
                >
                  <div className="font-bold text-slate-800 truncate" title={ev.name}>
                    {ev.name}
                  </div>
                  <div className="text-[10px] font-normal text-slate-500">
                    {new Date(ev.event_date || ev.eventDate).toLocaleDateString('vi-VN')}
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.name)}
                    title="Xóa cột ca trực này"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.tracker.length === 0 ? (
              <tr>
                <td colSpan={data.events.length + 2} className="p-8 text-center text-slate-400">
                  Chưa có dữ liệu tình nguyện viên.
                </td>
              </tr>
            ) : (
              data.tracker.map((row) => {
                const m = row.member;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Sticky Name Col */}
                    <td className="p-3 sticky left-0 z-10 bg-white hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="font-bold text-slate-900 truncate" title={m.full_name}>
                        {m.full_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-rose-600">Nhóm {m.group_num}</span>
                        <span>·</span>
                        <span>{m.role}</span>
                        <span>·</span>
                        <span>{m.mssv}</span>
                      </div>
                    </td>

                    {/* Attended Count & Percentage */}
                    <td className="p-3 text-center border-r border-slate-200">
                      <div className="inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs shadow-xs">
                        <span>{row.attendedCount} / {row.totalSessions} buổi</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">({row.attendancePercent}%)</span>
                      </div>
                    </td>

                    {/* Dynamic Event Cells */}
                    {data.events.map((ev) => {
                      const curStatus = row.attendance[ev.id] || 'vang';
                      return (
                        <td key={ev.id} className="p-2.5 text-center border-r border-slate-100">
                          <select
                            value={curStatus}
                            onChange={(e) => handleStatusChange(m.id, ev.id, e.target.value)}
                            className={`w-full text-center px-2 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer focus:ring-2 focus:ring-rose-400 focus:outline-none ${
                              curStatus === 'co_mat'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            <option value="co_mat">✓ Có mặt</option>
                            <option value="vang">✕ Vắng mặt</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm Ca Trực Mới */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                Thêm Tuần / Ca Trực Mới
              </h4>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên tuần / ca trực:
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="VD: Tuần 5 - Trực cổng trường..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày trực:
                </label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-white font-bold bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  Tạo Ca Trực
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

