import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, ShieldAlert, CheckCircle2, UserCheck, Search, Trash2, Users } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export default function CtvAssignLeaderModal({
  isOpen,
  onClose,
  initialGroup = 1,
  groups = [],
  onSuccess,
}) {
  const { addToast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState(initialGroup || 1);
  const [selectedRole, setSelectedRole] = useState('leader'); // 'leader' | 'deputy'
  const [tnvList, setTnvList] = useState([]);
  const [selectedTnvId, setSelectedTnvId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(initialGroup || 1);
      setSelectedRole('leader');
      setSelectedTnvId(null);
      setSearchTerm('');
      setNote('');
      loadTnvList();
    }
  }, [isOpen, initialGroup]);

  const loadTnvList = async () => {
    setLoading(true);
    try {
      const res = await api.getPotentialTnvLeaders();
      if (res && res.success) {
        setTnvList(res.data || []);
      } else {
        addToast(res?.message || 'Không thể tải danh sách TNV', 'error');
      }
    } catch (err) {
      addToast('Lỗi khi tải danh sách TNV tiềm năng', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentGroupInfo = groups.find((g) => g.groupNum === Number(selectedGroup));
  const currentLeaderName = currentGroupInfo?.leaderName;
  const currentLeaderMssv = currentGroupInfo?.leaderMssv;
  const currentLeaderTnvId = currentGroupInfo?.leaderTnvId;
  const currentDeputyName = currentGroupInfo?.deputyName;
  const currentDeputyMssv = currentGroupInfo?.deputyMssv;
  const currentDeputyTnvId = currentGroupInfo?.deputyTnvId;

  const currentActiveTnvId = selectedRole === 'leader' ? currentLeaderTnvId : currentDeputyTnvId;
  const currentActiveName = selectedRole === 'leader' ? currentLeaderName : currentDeputyName;
  const currentActiveMssv = selectedRole === 'leader' ? currentLeaderMssv : currentDeputyMssv;

  const filteredTnv = tnvList.filter((t) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      t.full_name?.toLowerCase().includes(s) ||
      t.mssv?.toLowerCase().includes(s) ||
      t.phone?.toLowerCase().includes(s)
    );
  });

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTnvId) {
      addToast('Vui lòng chọn 1 Tình nguyện viên để phân công!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.assignCtvLeader({
        groupNum: Number(selectedGroup),
        tnvId: Number(selectedTnvId),
        role: selectedRole,
        note: note ? note.trim() : '',
      });

      if (res && res.success) {
        addToast(res.message || 'Phân công thành công!', 'success');
        onSuccess();
        onClose();
      } else {
        addToast(res?.message || 'Lỗi khi phân công', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCurrent = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy phân công ${selectedRole === 'leader' ? 'Nhóm trưởng' : 'Nhóm phó'} hiện tại của Nhóm ${selectedGroup}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.removeCtvLeader(Number(selectedGroup), selectedRole);
      if (res && res.success) {
        addToast(res.message || 'Đã hủy phân công thành công!', 'success');
        onSuccess();
        onClose();
      } else {
        addToast(res?.message || 'Lỗi khi hủy phân công', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-amber-50/60 to-blue-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Phân Công Tình Nguyện Viên Phụ Trách Nhóm CTV
              </h3>
              <p className="text-xs text-slate-500">
                TNV phụ trách độc lập vai trò Nhóm trưởng/Nhóm phó, không nằm trong danh sách CTV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Rules & Info */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Quy định phụ trách nhóm:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              <li>Mỗi Tình nguyện viên chỉ được phụ trách <b>tối đa 1 nhóm CTV</b> (không kiêm nhiệm).</li>
              <li>Khi gộp nhóm, Nhóm trưởng nhóm số lớn hơn sẽ tự động chuyển thành Nhóm phó nhóm nhận.</li>
            </ul>
          </div>

          {/* Group and Role Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nhóm CTV cần phân công:
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(Number(e.target.value));
                  setSelectedTnvId(null);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                  <option key={g} value={g}>
                    Nhóm {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vai trò phụ trách:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('leader');
                    setSelectedTnvId(null);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    selectedRole === 'leader'
                      ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-1 ring-amber-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  Nhóm trưởng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('deputy');
                    setSelectedTnvId(null);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    selectedRole === 'deputy'
                      ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-1 ring-blue-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  Nhóm phó
                </button>
              </div>
            </div>
          </div>

          {/* Current Assignment Status Box */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                {selectedRole === 'leader' ? 'Nhóm trưởng hiện tại' : 'Nhóm phó hiện tại'}:
              </span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {currentActiveName && currentActiveName !== 'Chưa phân công' ? (
                  <span className="flex items-center gap-1.5 text-slate-900">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    {currentActiveName} {currentActiveMssv && `(${currentActiveMssv})`}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal italic">Chưa phân công</span>
                )}
              </p>
            </div>

            {currentActiveName && currentActiveName !== 'Chưa phân công' && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleRemoveCurrent}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors"
                title="Hủy người phụ trách này về trạng thái Chưa phân công"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hủy phân công
              </button>
            )}
          </div>

          {/* TNV List Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Chọn Tình nguyện viên thay thế / phân công:
              </label>
              <span className="text-[11px] text-slate-500">
                {tnvList.length} TNV hoạt động
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, MSSV hoặc SĐT của TNV..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Scrollable TNV Selection List */}
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Đang tải danh sách Tình nguyện viên...
                </div>
              ) : filteredTnv.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Không tìm thấy Tình nguyện viên nào phù hợp
                </div>
              ) : (
                filteredTnv.map((t) => {
                  const isCurrentThisRole = t.id === currentActiveTnvId;
                  const isAssignedOther =
                    t.ctv_assigned_group &&
                    (t.ctv_assigned_group !== Number(selectedGroup) ||
                      t.ctv_assigned_role !== selectedRole);
                  const isSelected = selectedTnvId === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isAssignedOther) return;
                        setSelectedTnvId(t.id);
                      }}
                      className={`p-2.5 sm:p-3 flex items-center justify-between text-xs transition-colors ${
                        isAssignedOther
                          ? 'bg-slate-50/80 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50/80 border-l-4 border-l-blue-600 cursor-pointer'
                          : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="selectedTnv"
                          checked={isSelected}
                          disabled={isAssignedOther}
                          onChange={() => setSelectedTnvId(t.id)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {t.full_name}
                            <span className="text-[11px] font-normal text-slate-500">({t.mssv})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Nhóm TNV: <b>Nhóm {t.tnv_group_num}</b></span>
                            {t.phone && <span>• SĐT: {t.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        {isCurrentThisRole ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Đang phụ trách
                          </span>
                        ) : isAssignedOther ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600" title="Không được kiêm nhiệm nhiều nhóm">
                            Đã ở Nhóm {t.ctv_assigned_group} ({t.ctv_assigned_role === 'leader' ? 'Trưởng' : 'Phó'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            Khả dụng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú phân công (tùy chọn):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Phụ trách hỗ trợ chiến dịch hè 2026..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!selectedTnvId || submitting}
            onClick={handleAssign}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Đang lưu...' : 'Xác nhận phân công'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

