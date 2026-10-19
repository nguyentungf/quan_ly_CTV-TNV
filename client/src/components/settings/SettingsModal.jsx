import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Sliders, Award, CheckCircle, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';

const DEFAULT_RUBRIC = {
  attendanceWeight: 30,
  activityWeight: 50,
  qualitativeWeight: 20,
  thresholdExcellent: 85,
  thresholdGood: 70,
  thresholdFair: 50
};

export default function SettingsModal({ isOpen, onClose, onSuccess }) {
  const { addToast } = useToast();
  const [rubric, setRubric] = useState(DEFAULT_RUBRIC);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRubric();
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const loadRubric = async () => {
    setLoading(true);
    try {
      const res = await api.getEvaluationRubric();
      if (res.success && res.data) {
        setRubric(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalWeight = Number(rubric.attendanceWeight || 0) + Number(rubric.activityWeight || 0) + Number(rubric.qualitativeWeight || 0);

  const handleResetDefault = () => {
    setRubric(DEFAULT_RUBRIC);
    addToast('Đã khôi phục các giá trị thang điểm về mặc định ban đầu', 'info');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (totalWeight <= 0) {
      addToast('Tổng trọng số thang điểm phải lớn hơn 0!', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateEvaluationRubric(rubric);
      if (res.success) {
        addToast('Đã lưu cấu hình thang điểm hệ thống thành công!', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        addToast(res.message || 'Lỗi khi lưu cấu hình', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                Cài Đặt Hệ Thống & Thang Điểm Đánh Giá
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tùy biến trọng số điểm và ngưỡng xếp loại danh hiệu Nửa kỳ & Toàn kỳ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1: Trọng số thang điểm */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>1. Cơ Cấu Trọng Số Thang Điểm</span>
              </h4>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                totalWeight === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                Tổng: {totalWeight} điểm {totalWeight === 100 ? '(Chuẩn 100%)' : ''}
              </span>
            </div>

            {totalWeight !== 100 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Khuyến nghị tổng 3 trọng số nên bằng 100 điểm để chuẩn hóa xếp loại.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Điểm chuyên cần */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Điểm Chuyên Cần
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rubric.attendanceWeight}
                    onChange={(e) => setRubric({ ...rubric, attendanceWeight: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden bg-white"
                  />
                  <span className="text-xs text-slate-500 font-semibold">đ</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Điểm danh họp / ca trực tuần</p>
              </div>

              {/* Điểm hoạt động */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Điểm Hoạt Động
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rubric.activityWeight}
                    onChange={(e) => setRubric({ ...rubric, activityWeight: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden bg-white"
                  />
                  <span className="text-xs text-slate-500 font-semibold">đ</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Chiến dịch & hoạt động hỗ trợ</p>
              </div>

              {/* Điểm định tính */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Đánh Giá Định Tính
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={rubric.qualitativeWeight}
                    onChange={(e) => setRubric({ ...rubric, qualitativeWeight: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden bg-white"
                  />
                  <span className="text-xs text-slate-500 font-semibold">đ</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Nhóm trưởng & BCN chấm thêm</p>
              </div>
            </div>
          </div>

          {/* Section 2: Ngưỡng điểm xếp loại */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>2. Ngưỡng Điểm Xếp Loại Danh Hiệu</span>
            </h4>

            <div className="space-y-2.5">
              {/* Xuất sắc */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-xs font-extrabold text-emerald-900">Danh hiệu Xuất Sắc:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Tổng điểm &ge;</span>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={rubric.thresholdExcellent}
                    onChange={(e) => setRubric({ ...rubric, thresholdExcellent: Number(e.target.value) })}
                    className="w-20 px-2.5 py-1 rounded-lg border border-emerald-300 text-xs font-bold text-emerald-900 bg-white text-center"
                  />
                  <span className="text-xs text-slate-500">điểm</span>
                </div>
              </div>

              {/* Tốt */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-xs font-extrabold text-blue-900">Danh hiệu Tốt:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Tổng điểm &ge;</span>
                  <input
                    type="number"
                    min="30"
                    max="90"
                    value={rubric.thresholdGood}
                    onChange={(e) => setRubric({ ...rubric, thresholdGood: Number(e.target.value) })}
                    className="w-20 px-2.5 py-1 rounded-lg border border-blue-300 text-xs font-bold text-blue-900 bg-white text-center"
                  />
                  <span className="text-xs text-slate-500">điểm</span>
                </div>
              </div>

              {/* Khá */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="text-xs font-extrabold text-indigo-900">Danh hiệu Khá:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Tổng điểm &ge;</span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={rubric.thresholdFair}
                    onChange={(e) => setRubric({ ...rubric, thresholdFair: Number(e.target.value) })}
                    className="w-20 px-2.5 py-1 rounded-lg border border-indigo-300 text-xs font-bold text-indigo-900 bg-white text-center"
                  />
                  <span className="text-xs text-slate-500">điểm</span>
                </div>
              </div>

              {/* Cần cải thiện */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span className="text-xs font-extrabold text-rose-900">Cần Cải Thiện:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-700 font-semibold">
                    Dưới {rubric.thresholdFair} điểm hoặc bị Kỷ luật
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 shadow-sm shadow-purple-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

