import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle2, Edit3, X } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function TnvDisciplineBoard({
  disciplineData,
  onRefresh,
}) {
  const { addToast } = useToast();
  const [selectedMember, setSelectedMember] = useState(null);
  const [newLevel, setNewLevel] = useState('none');
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const { summary = { total: 0, level1: 0, level2: 0 }, data: warnedList = [] } = disciplineData || {};

  const handleOpenEdit = (m) => {
    setSelectedMember(m);
    setNewLevel(m.warning_level || 'none');
    setNewNote(m.warning_note || '');
  };

  const handleSaveWarning = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    setLoading(true);

    try {
      const res = await api.updateTnvWarning(selectedMember.id, newLevel, newNote);
      if (res.success) {
        addToast(`Đã cập nhật trạng thái kỷ luật cho ${selectedMember.full_name}!`, 'success');
        setSelectedMember(null);
        onRefresh();
      } else {
        addToast(res.message || 'Lỗi khi cập nhật kỷ luật', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      {/* Title & Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Bảng Theo Dõi Kỷ Luật Tình Nguyện Viên
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Giám sát các trường hợp điểm dưới mốc chuẩn hoặc vi phạm nội quy hoạt động
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2">
          {/* Thẻ Vàng */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <div className="w-3 h-4 rounded-xs bg-amber-400 border border-amber-600 shadow-xs"></div>
            <span>Cảnh cáo mức 1 (Thẻ Vàng):</span>
            <span className="px-1.5 py-0.5 bg-amber-200/80 rounded font-black text-amber-950">
              {summary.level1}
            </span>
          </div>

          {/* Thẻ Đỏ */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-pulse">
            <div className="w-3 h-4 rounded-xs bg-rose-600 border border-rose-800 shadow-xs"></div>
            <span>Cảnh cáo mức 2 (Thẻ Đỏ):</span>
            <span className="px-1.5 py-0.5 bg-rose-200/80 rounded font-black text-rose-950">
              {summary.level2}
            </span>
          </div>
        </div>
      </div>

      {/* Disciplinary Table */}
      {warnedList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Tất cả Tình Nguyện Viên đang hoạt động tốt!</p>
          <p className="text-xs text-slate-400 mt-1">Hiện không có trường hợp nào bị cảnh cáo thẻ vàng hay thẻ đỏ.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 pl-4">Mức kỷ luật</th>
                <th className="p-3">Họ và tên</th>
                <th className="p-3">MSSV</th>
                <th className="p-3">Nhóm</th>
                <th className="p-3">Điểm tích lũy</th>
                <th className="p-3">Lý do / Ghi chú kỷ luật</th>
                <th className="p-3 pr-4 text-right">Điều chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warnedList.map((m) => {
                const isLevel2 = m.warning_level === 'canh_cao_2';

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isLevel2
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'bg-amber-50/30 hover:bg-amber-50/60'
                    }`}
                  >
                    {/* Badge Mức Kỷ luật */}
                    <td className="p-3 pl-4">
                      {isLevel2 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black text-white bg-rose-600 shadow-xs border border-rose-700">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          Thẻ Đỏ (Cảnh cáo mức 2)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black text-amber-900 bg-amber-300 shadow-xs border border-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Thẻ Vàng (Cảnh cáo mức 1)
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-bold text-slate-900">
                      {m.full_name}
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      {m.mssv}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700">
                        Nhóm {m.group_num}
                      </span>
                    </td>

                    <td className="p-3 font-black text-slate-800">
                      {m.total_points}đ
                    </td>

                    <td className="p-3 text-slate-700 font-medium">
                      {m.warning_note || <i className="text-slate-400">Chưa có ghi chú</i>}
                    </td>

                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa mức</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Warning Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Điều Chỉnh Kỷ Luật: {selectedMember.full_name}
              </h4>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWarning} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn mức cảnh cáo:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="warningLevel"
                      value="none"
                      checked={newLevel === 'none'}
                      onChange={() => setNewLevel('none')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-emerald-700 block">Bình thường (Xóa cảnh cáo)</span>
                      <span className="text-[11px] text-slate-500">Thành viên tuân thủ đầy đủ kỷ luật và điểm số</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer">
                    <input
                      type="radio"
                      name="warningLevel"
                      value="canh_cao_1"
                      checked={newLevel === 'canh_cao_1'}
                      onChange={() => setNewLevel('canh_cao_1')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-amber-900 block">Cảnh cáo mức 1 (Thẻ Vàng)</span>
                      <span className="text-[11px] text-amber-700">Điểm dưới mốc chuẩn hoặc vi phạm lỗi nhẹ</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 cursor-pointer">
                    <input
                      type="radio"
                      name="warningLevel"
                      value="canh_cao_2"
                      checked={newLevel === 'canh_cao_2'}
                      onChange={() => setNewLevel('canh_cao_2')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-bold text-rose-900 block">Cảnh cáo mức 2 (Thẻ Đỏ)</span>
                      <span className="text-[11px] text-rose-700">Vi phạm nghiêm trọng, vắng ca nhiều lần</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lý do / Ghi chú kỷ luật:
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ghi rõ lý do cảnh cáo hoặc điều kiện khắc phục..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-white font-bold bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {loading ? 'Đang lưu...' : 'Lưu Trạng Thái'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

