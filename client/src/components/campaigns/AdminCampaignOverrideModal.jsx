import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Clock,
  X,
  Check,
  Zap,
  User,
  Hash,
  Layers,
  Calendar,
  Info
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export default function AdminCampaignOverrideModal({
  isOpen,
  onClose,
  campaign,
  registration,
  onSuccess
}) {
  const { addToast } = useToast();
  useLockBodyScroll(isOpen);

  // 'bonus' | 'penalty' | 'manual'
  const [overrideMode, setOverrideMode] = useState('bonus');
  const [bonusPoints, setBonusPoints] = useState(5);
  const [penaltyPoints, setPenaltyPoints] = useState(5);
  const [manualPoints, setManualPoints] = useState(10);
  const [attendanceStatus, setAttendanceStatus] = useState('co_mat');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const basePoints = Number(campaign?.points) || 10;
  const currentAwarded = Number(registration?.points_awarded) || 0;

  useEffect(() => {
    if (registration) {
      setAttendanceStatus(registration.attendance_status || 'co_mat');
      const currentOverride = Number(registration.admin_override_points) || 0;
      if (currentOverride > 0) {
        setOverrideMode('bonus');
        setBonusPoints(currentOverride);
      } else if (currentOverride < 0) {
        setOverrideMode('penalty');
        setPenaltyPoints(Math.abs(currentOverride));
      } else {
        setOverrideMode('bonus');
        setBonusPoints(5);
      }
      setManualPoints(Number(registration.points_awarded) || basePoints);
      setReason(registration.admin_override_reason || '');
    }
  }, [registration, basePoints]);

  if (!isOpen || !registration || !campaign) return null;

  // Tính toán điểm cuối cùng dự kiến
  let calculatedFinalPoints = basePoints;
  if (attendanceStatus !== 'co_mat') {
    calculatedFinalPoints = 0;
  } else if (overrideMode === 'bonus') {
    calculatedFinalPoints = basePoints + (Number(bonusPoints) || 0);
  } else if (overrideMode === 'penalty') {
    calculatedFinalPoints = Math.max(0, basePoints - (Number(penaltyPoints) || 0));
  } else if (overrideMode === 'manual') {
    calculatedFinalPoints = Number(manualPoints) || 0;
  }

  const deltaPoints = calculatedFinalPoints - currentAwarded;

  const presetReasons = [
    { label: '🌟 Trưởng kíp xuất sắc', text: 'Trưởng kíp hoàn thành xuất sắc nhiệm vụ', mode: 'bonus', points: 5 },
    { label: '🔥 Hỗ trợ tăng cường giờ', text: 'Nhiệt tình xung kích hỗ trợ thêm giờ trực', mode: 'bonus', points: 5 },
    { label: '⏰ Đến muộn quá 30p', text: 'Đến muộn hơn 30 phút so với giờ triệu tập', mode: 'penalty', points: 5 },
    { label: '⚠️ Bỏ ca giữa chừng', text: 'Rời ca trực sớm không xin phép Ban Chỉ Huy', mode: 'penalty', points: 10 },
    { label: '⚙️ Xử lý đặc cách BTC', text: 'Ban Tổ Chức đặc cách duyệt theo đề xuất', mode: 'manual', points: basePoints }
  ];

  const handleApplyPreset = (preset) => {
    setReason(preset.text);
    if (preset.mode === 'bonus') {
      setOverrideMode('bonus');
      setBonusPoints(preset.points);
    } else if (preset.mode === 'penalty') {
      setOverrideMode('penalty');
      setPenaltyPoints(preset.points);
    } else if (preset.mode === 'manual') {
      setOverrideMode('manual');
      setManualPoints(preset.points);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      addToast('Vui lòng nhập lý do can thiệp đặc cách', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.overrideCampaignAttendance(campaign.id, {
        registrationId: registration.registration_id || registration.id,
        attendanceStatus,
        finalPoints: calculatedFinalPoints,
        reason: reason.trim()
      });

      if (res.success) {
        addToast(res.message || 'Cập nhật điều chỉnh đặc cách thành công!', 'success');
        onSuccess?.();
        onClose();
      } else {
        addToast(res.message || 'Lỗi khi cập nhật đặc cách', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-amber-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Can Thiệp & Đặc Cách Điểm (Admin)</h3>
              <p className="text-[11px] text-purple-100">Quyền hạn tối cao điều chỉnh điểm danh & thưởng/phạt sự kiện</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Member & Campaign Information Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                {registration.full_name}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-indigo-100 text-indigo-800">
                {registration.member_type?.toUpperCase()} · Nhóm {registration.group_num}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
              <div>MSSV: <span className="font-semibold text-slate-800">{registration.mssv || '---'}</span></div>
              <div>Kíp: <span className="font-semibold text-slate-800">{registration.shift_name || 'Mặc định'}</span></div>
              <div>Điểm chuẩn sự kiện: <span className="font-bold text-emerald-600">{basePoints}đ</span></div>
              <div>Đã cộng trước đó: <span className="font-bold text-purple-600">{currentAwarded}đ</span></div>
            </div>
          </div>

          {/* Trạng thái điểm danh */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Trạng thái tham gia</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAttendanceStatus('co_mat')}
                className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${
                  attendanceStatus === 'co_mat'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ✓ Có mặt
              </button>
              <button
                type="button"
                onClick={() => setAttendanceStatus('vang')}
                className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${
                  attendanceStatus === 'vang'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ✕ Vắng mặt
              </button>
              <button
                type="button"
                onClick={() => setAttendanceStatus('chua_diem_danh')}
                className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${
                  attendanceStatus === 'chua_diem_danh'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ⏳ Chưa điểm danh
              </button>
            </div>
          </div>

          {/* Lựa chọn Hình thức Điều chỉnh (Chỉ hiển thị khi Có mặt) */}
          {attendanceStatus === 'co_mat' && (
            <div className="space-y-3 pt-1">
              <label className="block font-bold text-slate-700">Chế độ điều chỉnh điểm</label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOverrideMode('bonus')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    overrideMode === 'bonus'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌟 Thưởng thêm (+)
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideMode('penalty')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    overrideMode === 'penalty'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚠️ Phạt trừ điểm (-)
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    overrideMode === 'manual'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✏️ Nhập điểm trực tiếp
                </button>
              </div>

              {/* Mode Input Details */}
              {overrideMode === 'bonus' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-900 font-semibold">Điểm thưởng thêm:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={bonusPoints}
                        onChange={(e) => setBonusPoints(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 px-2 py-1 text-center font-bold text-emerald-800 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-emerald-800">điểm</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Tổng điểm nhận được: <span className="font-extrabold">{basePoints} + {bonusPoints} = {basePoints + Number(bonusPoints)} điểm</span>.
                  </p>
                </div>
              )}

              {overrideMode === 'penalty' && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-900 font-semibold">Khấu trừ kỷ luật:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max={basePoints}
                        value={penaltyPoints}
                        onChange={(e) => setPenaltyPoints(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 px-2 py-1 text-center font-bold text-rose-800 bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <span className="font-bold text-rose-800">điểm</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Tổng điểm còn lại: <span className="font-extrabold">{basePoints} - {penaltyPoints} = {Math.max(0, basePoints - Number(penaltyPoints))} điểm</span>.
                  </p>
                </div>
              )}

              {overrideMode === 'manual' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-900 font-semibold">Tổng điểm chốt nhận:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={manualPoints}
                        onChange={(e) => setManualPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-2 py-1 text-center font-bold text-purple-900 bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="font-bold text-purple-800">điểm</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mẫu lý do nhanh */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Gợi ý lý do nhanh (1-click)</label>
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ô nhập lý do chi tiết */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Lý do điều chỉnh đặc cách <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do cụ thể để lưu vết vào hồ sơ nhân sự (VD: Trưởng kíp hỗ trợ xuất sắc...)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Tổng kết thay đổi & Xem trước */}
          <div className="p-3 bg-gradient-to-r from-slate-100 to-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">Điểm ghi nhận vào hồ sơ:</span>
              <span className="text-base font-extrabold text-slate-900">{calculatedFinalPoints} điểm</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Biến động điểm thực tế:</span>
              <span className={`text-sm font-extrabold ${deltaPoints > 0 ? 'text-emerald-600' : deltaPoints < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {deltaPoints > 0 ? `+${deltaPoints}đ` : `${deltaPoints}đ`}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>Đang cập nhật...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Xác nhận lưu đặc cách
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
