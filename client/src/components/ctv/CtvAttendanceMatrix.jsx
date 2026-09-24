import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, Clock, FileCheck, XCircle, AlertCircle, Percent, Zap } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

export default function CtvAttendanceMatrix({ selectedGroup }) {
  const { addToast } = useToast();
  const { isAdmin, canEditGroup } = useAuth();
  const [data, setData] = useState({ events: [], matrix: [] });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadMatrix();
  }, [selectedGroup]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.getCtvAttendanceMatrix({ group: selectedGroup });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      addToast('Lỗi khi tải ma trận điểm danh', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInit19Weeks = async () => {
    if (window.confirm('Hệ thống sẽ tự động tạo đủ 19 tuần họp cho học kỳ này (nếu chưa có). Bạn có muốn tiếp tục?')) {
      setInitLoading(true);
      try {
        const res = await api.initCtv19Weeks();
        if (res.success) {
          addToast(res.message, 'success');
          loadMatrix();
        } else {
          addToast(res.message || 'Lỗi khi khởi tạo 19 tuần', 'error');
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
        const nextMatrix = prev.matrix.map((row) => {
          if (row.member.id === memberId) {
            const nextAtt = { ...row.attendance, [eventId]: newStatus };
            // Recompute attendance rate
            const weightMap = { co_mat: 100, di_muon: 50, co_phep: 0, vang_khong_phep: -50 };
            let totalWeight = 0;
            let count = 0;
            for (const ev of prev.events) {
              const st = nextAtt[ev.id] || 'vang_khong_phep';
              totalWeight += weightMap[st] !== undefined ? weightMap[st] : 0;
              count++;
            }
            const rate = count > 0 ? Math.max(0, Math.min(100, Math.round(totalWeight / count))) : 0;
            return { ...row, attendance: nextAtt, attendanceRate: rate };
          }
          return row;
        });
        return { ...prev, matrix: nextMatrix };
      });

      await api.updateCtvAttendance(memberId, eventId, newStatus);
    } catch (err) {
      addToast('Lỗi cập nhật điểm danh', 'error');
      loadMatrix();
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) {
      addToast('Vui lòng nhập tên ngày/sự kiện điểm danh!', 'warning');
      return;
    }

    try {
      const res = await api.createCtvEvent({ name: newEventName, eventDate: newEventDate });
      if (res.success) {
        addToast('Đã thêm ngày điểm danh mới thành công!', 'success');
        setShowAddEventModal(false);
        setNewEventName('');
        loadMatrix();
      }
    } catch (err) {
      addToast('Lỗi khi thêm ngày điểm danh', 'error');
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa cột ngày điểm danh "${eventName}" không?`)) {
      try {
        const res = await api.deleteCtvEvent(eventId);
        if (res.success) {
          addToast('Đã xóa ngày điểm danh', 'success');
          loadMatrix();
        }
      } catch (err) {
        addToast('Lỗi khi xóa ngày điểm danh', 'error');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'co_mat':
        return { text: 'Có mặt (100%)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'di_muon':
        return { text: 'Đi muộn (50%)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'co_phep':
        return { text: 'Có phép (0%)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'vang_khong_phep':
        return { text: 'Vắng (-50%)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { text: 'Chưa điểm danh', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">
              Bảng Điểm Danh Co Giãn (Elastic Roll-Call)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
              {data.events.length} cột ngày
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bảng co giãn mượt mà theo màn hình, cập nhật tỷ lệ điểm danh (%) tức thời
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status legend */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Có mặt (100%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Đi muộn (50%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Có phép (0%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Vắng (-50%)</span>
          </div>

          {isAdmin && (
            <button
              onClick={handleInit19Weeks}
              disabled={initLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
              title="Tự động tạo đủ 19 tuần họp cho học kỳ"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>{initLoading ? 'Đang tạo...' : 'Khởi tạo 19 tuần họp'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowAddEventModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Ngày / Sự kiện</span>
            </button>
          )}
        </div>
      </div>

      {/* Elastic Matrix Table */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              {/* Sticky Left Column for Member Info */}
              <th className="p-3.5 sticky left-0 z-20 bg-slate-50 min-w-[200px] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                Cộng Tác Viên
              </th>
              <th className="p-3.5 text-center min-w-[100px] border-r border-slate-200">
                Tỷ lệ chuyên cần
              </th>
              {/* Dynamic Elastic Event Columns */}
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
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.name)}
                      title="Xóa cột ngày này"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.matrix.length === 0 ? (
              <tr>
                <td colSpan={data.events.length + 2} className="p-8 text-center text-slate-400">
                  Chưa có dữ liệu thành viên trong bộ lọc này.
                </td>
              </tr>
            ) : (
              data.matrix.map((row) => {
                const m = row.member;
                const rate = row.attendanceRate;
                const canEdit = canEditGroup('ctv', m.group_num);

                let rateColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                if (rate < 50) rateColor = 'text-rose-700 bg-rose-50 border-rose-200';
                else if (rate < 80) rateColor = 'text-amber-700 bg-amber-50 border-amber-200';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Member Column (Sticky) */}
                    <td className="p-3 sticky left-0 z-10 bg-white hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="font-bold text-slate-900 truncate" title={m.full_name}>
                        {m.full_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-blue-600">Nhóm {m.group_num}</span>
                        <span>·</span>
                        <span>{m.role}</span>
                        <span>·</span>
                        <span>{m.mssv}</span>
                      </div>
                    </td>

                    {/* Attendance Rate */}
                    <td className="p-3 text-center border-r border-slate-200">
                      <div className="inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-lg border text-xs shadow-xs" style={{ minWidth: '60px', justifyContent: 'center' }}>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${rateColor}`}>
                          {rate}%
                        </span>
                      </div>
                    </td>

                    {/* Dynamic Event Cells */}
                    {data.events.map((ev) => {
                      const curStatus = row.attendance[ev.id] || 'vang_khong_phep';
                      return (
                        <td key={ev.id} className="p-2.5 text-center border-r border-slate-100">
                          {canEdit ? (
                            <select
                              value={curStatus}
                              onChange={(e) => handleStatusChange(m.id, ev.id, e.target.value)}
                              className={`w-full text-center px-2 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                                curStatus === 'co_mat'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : curStatus === 'di_muon'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : curStatus === 'co_phep'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              <option value="co_mat">Có mặt (100%)</option>
                              <option value="di_muon">Đi muộn (50%)</option>
                              <option value="co_phep">Có phép (0%)</option>
                              <option value="vang_khong_phep">Vắng (-50%)</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-block w-full py-1 px-1.5 rounded-lg text-[11px] font-bold border text-center ${
                                curStatus === 'co_mat'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : curStatus === 'di_muon'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : curStatus === 'co_phep'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {curStatus === 'co_mat'
                                ? 'Có mặt'
                                : curStatus === 'di_muon'
                                ? 'Đi muộn'
                                : curStatus === 'co_phep'
                                ? 'Có phép'
                                : 'Vắng'}
                            </span>
                          )}
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

      {/* Modal Thêm Ngày Điểm Danh Mới */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Thêm Ngày Điểm Danh Mới
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
                  Tên sự kiện / Buổi trực:
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="VD: Trực tuần 5, Lễ vinh danh..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày diễn ra:
                </label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="px-4 py-1.5 rounded-lg text-white font-bold bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Tạo Cột Ngày
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

