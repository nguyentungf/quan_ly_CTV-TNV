import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, Sparkles, History, CheckCircle, Plus, Edit2, Trash2, Check, RotateCcw } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export default function TnvActivityModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { canEditGroup } = useAuth();
  const [tab, setTab] = useState('add'); // 'add' | 'history'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [currentTotalPoints, setCurrentTotalPoints] = useState(0);

  // State cho chỉnh sửa thủ công dòng hoạt động
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({ category: '', points: 0, note: '' });

  const [presetCategory, setPresetCategory] = useState('Hỗ trợ tuyển sinh');
  const [customTitle, setCustomTitle] = useState('');
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState('');

  const canEdit = member ? canEditGroup('tnv', member.group_num) : false;

  const categories = [
    { title: 'Hỗ trợ tuyển sinh', points: 10, desc: 'Tư vấn, hướng dẫn thí sinh và phụ huynh' },
    { title: 'Trực văn phòng', points: 5, desc: 'Trực xử lý giấy tờ và tiếp tân văn phòng' },
    { title: 'Chiến dịch cao điểm', points: 20, desc: 'Tham gia các đợt chiến dịch tình nguyện tập trung' },
    { title: 'Hỗ trợ sự kiện & Gala', points: 15, desc: 'Điều phối khán phòng, hậu cần âm thanh ánh sáng' },
    { title: 'Tập huấn kỹ năng tình nguyện', points: 10, desc: 'Hoàn thành các buổi đào tạo chuyên môn' },
  ];

  useEffect(() => {
    if (member && isOpen) {
      setCurrentTotalPoints(member.total_points || 0);
      setEditingLogId(null);
      loadHistory();
    }
  }, [member, isOpen]);

  const loadHistory = async () => {
    if (!member) return;
    try {
      const res = await api.getTnvActivities(member.id);
      if (res.success) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useLockBodyScroll(isOpen && member);

  if (!isOpen || !member) return null;

  const handleSelectPreset = (c) => {
    setPresetCategory(c.title);
    setPoints(c.points);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const category = customTitle.trim() || presetCategory;
      const res = await api.recordTnvActivity({
        memberId: member.id,
        category,
        points,
        note,
      });

      if (res.success) {
        addToast(res.message, 'success');
        if (res.newTotal !== undefined) {
          setCurrentTotalPoints(res.newTotal);
        }
        if (onSuccess) onSuccess();
        loadHistory();
        setCustomTitle('');
        setNote('');
      } else {
        addToast(res.message || 'Lỗi khi ghi nhận hoạt động', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (log) => {
    setEditingLogId(log.id);
    setEditForm({
      category: log.category || '',
      points: log.points !== undefined ? log.points : 0,
      note: log.note || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
  };

  const handleSaveEdit = async (logId) => {
    if (isNaN(Number(editForm.points))) {
      addToast('Điểm số phải là số hợp lệ', 'error');
      return;
    }
    setActionLoading(logId);
    try {
      const res = await api.updateTnvActivity(logId, {
        category: editForm.category,
        points: Number(editForm.points),
        note: editForm.note
      });
      if (res.success) {
        addToast(res.message, 'success');
        setEditingLogId(null);
        if (res.newTotal !== undefined) {
          setCurrentTotalPoints(res.newTotal);
        }
        await loadHistory();
        if (onSuccess) onSuccess();
      } else {
        addToast(res.message || 'Lỗi cập nhật hoạt động', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteActivity = async (log) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa bản ghi "${log.category}" (${log.points > 0 ? '+' : ''}${log.points}đ)?\nĐiểm tích lũy của TNV sẽ tự động được cập nhật lại.`
    );
    if (!confirmDelete) return;

    setActionLoading(log.id);
    try {
      const res = await api.deleteTnvActivity(log.id);
      if (res.success) {
        addToast(res.message, 'success');
        if (res.newTotal !== undefined) {
          setCurrentTotalPoints(res.newTotal);
        }
        await loadHistory();
        if (onSuccess) onSuccess();
      } else {
        addToast(res.message || 'Lỗi xóa hoạt động', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
                Nhóm {member.group_num}
              </span>
              <h3 className="text-base font-bold text-slate-800">{member.full_name}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MSSV: <span className="font-semibold text-slate-700">{member.mssv}</span> · Điểm tích lũy: <b className="text-rose-600">{currentTotalPoints}đ</b>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setTab('add')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'add'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ghi nhận Hoạt động Tình nguyện
          </button>
          <button
            onClick={() => setTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1 ${
              tab === 'history'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử hoạt động ({historyLogs.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {tab === 'add' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn hạng mục tình nguyện mẫu:
                </label>
                <div className="space-y-2">
                  {categories.map((c) => {
                    const isSelected = presetCategory === c.title;
                    return (
                      <div
                        key={c.title}
                        onClick={() => handleSelectPreset(c)}
                        className={`p-2.5 px-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">{c.title}</span>
                          <span className="text-[11px] text-slate-400">{c.desc}</span>
                        </div>
                        <span className="font-black text-xs text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                          +{c.points}đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc nhập tên hoạt động khác:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="VD: Tham gia dọn dẹp vệ sinh khuôn viên trường..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Điểm cộng (+):
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold text-rose-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Minh chứng / Ghi chú:
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Link minh chứng hoặc tên người phụ trách..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 transition-all"
                >
                  {loading ? 'Đang lưu...' : 'Ghi Nhận & Cộng Điểm'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {historyLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có lịch sử hoạt động cho tình nguyện viên này.
                </div>
              ) : (
                historyLogs.map((log) => {
                  const isEditing = editingLogId === log.id;
                  const isActionBusy = actionLoading === log.id;

                  if (isEditing) {
                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border-2 border-rose-300 bg-rose-50/30 space-y-3 text-xs animate-fade-in"
                      >
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-rose-700">
                            <Edit2 className="w-3.5 h-3.5" />
                            Chỉnh sửa dòng hoạt động #{log.id}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.created_at || log.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Hạng mục hoạt động:</label>
                            <input
                              type="text"
                              value={editForm.category}
                              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                              placeholder="VD: Bảo lưu điểm CTV, Trực văn phòng..."
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Điểm (+/-):</label>
                            <input
                              type="number"
                              value={editForm.points}
                              onChange={(e) => setEditForm(prev => ({ ...prev, points: e.target.value }))}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold text-rose-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Ghi chú / Mô tả:</label>
                          <input
                            type="text"
                            value={editForm.note}
                            onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            placeholder="Ghi chú chi tiết hoặc lý do điều chỉnh..."
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={handleCancelEdit}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleSaveEdit(log.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isActionBusy ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-50/80 flex items-start justify-between gap-3 text-xs transition-colors ${
                        isActionBusy ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 block truncate">{log.category}</span>
                          {log.category === 'Bảo lưu điểm CTV' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                              Điểm bảo lưu
                            </span>
                          )}
                        </div>
                        {log.note && <p className="text-slate-500 mt-0.5 break-words">{log.note}</p>}
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {new Date(log.created_at || log.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-sm text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-lg">
                          {log.points > 0 ? `+${log.points}` : log.points}đ
                        </span>

                        {/* Nút Sửa & Xóa thủ công cho Admin / Nhóm trưởng */}
                        {canEdit && (
                          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleStartEdit(log)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Sửa bản ghi hoạt động này"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleDeleteActivity(log)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Xóa bản ghi hoạt động này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

