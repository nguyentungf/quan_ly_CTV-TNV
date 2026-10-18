import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  Users,
  CheckCircle,
  Save,
  Lock,
  Unlock,
  X,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  Info,
  Crown
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from './Toast';
import { useAuth } from '../../context/AuthContext';

export default function EvaluationManagerModal({
  isOpen,
  onClose,
  initialMemberType = 'ctv'
}) {
  const { addToast } = useToast();
  const { user, isAdmin, isLeader } = useAuth();

  const [period, setPeriod] = useState('midterm'); // 'midterm' | 'final'
  const [memberType, setMemberType] = useState(initialMemberType); // 'ctv' | 'tnv'
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [evalList, setEvalList] = useState([]);
  const [rubric, setRubric] = useState({
    attendanceWeight: 30,
    activityWeight: 50,
    qualitativeWeight: 20,
    thresholdExcellent: 85,
    thresholdGood: 70,
    thresholdFair: 50
  });
  const [isAllLocked, setIsAllLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftInputs, setDraftInputs] = useState({}); // { [memberId]: { qualitativeScore, notes } }

  // Khởi tạo nhóm theo quyền của người dùng nếu là Nhóm trưởng
  useEffect(() => {
    if (isLeader && user?.targetType && user?.groupNum) {
      setMemberType(user.targetType);
      setSelectedGroup(String(user.groupNum));
    } else {
      setMemberType(initialMemberType);
    }
  }, [isOpen, isLeader, user, initialMemberType]);

  useEffect(() => {
    if (isOpen) {
      loadEvaluationData();
    }
  }, [isOpen, period, memberType, selectedGroup]);

  const loadEvaluationData = async () => {
    setLoading(true);
    try {
      const res = await api.getEvaluationSummary({
        period,
        memberType,
        group: selectedGroup
      });
      if (res.success) {
        setEvalList(res.data);
        if (res.rubric) setRubric(res.rubric);
        setIsAllLocked(Boolean(res.isAllLocked));

        // Khởi tạo draftInputs từ dữ liệu trả về
        const initialDrafts = {};
        for (const item of res.data) {
          initialDrafts[item.member.id] = {
            qualitativeScore: item.qualitativeScore || 0,
            notes: item.notes || ''
          };
        }
        setDraftInputs(initialDrafts);
      } else {
        addToast(res.message || 'Lỗi tải danh sách đánh giá', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCtv = memberType === 'ctv';
  const maxGroups = isCtv ? 8 : 4;

  const handleInputChange = (memberId, field, value) => {
    setDraftInputs(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value
      }
    }));
  };

  // Tính toán lại điểm tức thời trên UI
  const calculateCurrentRow = (item) => {
    const draft = draftInputs[item.member.id] || { qualitativeScore: 0, notes: '' };
    const qScore = Math.max(-rubric.qualitativeWeight, Math.min(rubric.qualitativeWeight, Number(draft.qualitativeScore || 0)));
    const totalScore = item.attendanceScore + item.activityScore + qScore;

    let rank = 'Khá';
    if (totalScore >= rubric.thresholdExcellent) rank = 'Xuất sắc';
    else if (totalScore >= rubric.thresholdGood) rank = 'Tốt';
    else if (totalScore >= rubric.thresholdFair) rank = 'Khá';
    else rank = 'Cần cải thiện';

    if (!isCtv) {
      if (item.warningLevel === 'canh_cao_2') {
        rank = 'Kỷ luật (Thẻ Đỏ)';
      } else if (item.warningLevel === 'canh_cao_1') {
        if (rank === 'Xuất sắc') rank = 'Tốt';
        else if (rank === 'Tốt') rank = 'Khá';
        else rank = 'Cần cải thiện';
      }
    }

    return { qScore, totalScore, rank, notes: draft.notes };
  };

  // 1. Lưu bản nháp (Nhóm trưởng / Admin)
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payloadEvals = evalList.map(item => {
        const current = calculateCurrentRow(item);
        return {
          memberId: item.member.id,
          qualitativeScore: current.qScore,
          notes: current.notes,
          attendanceScore: item.attendanceScore,
          activityScore: item.activityScore,
          rankGrade: current.rank
        };
      });

      const res = await api.saveEvaluationDraft({
        period,
        memberType,
        evaluations: payloadEvals
      });

      if (res.success) {
        addToast(res.message, 'success');
        loadEvaluationData();
      } else {
        addToast(res.message || 'Lỗi khi lưu bản nháp', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 2. Chốt Đánh Giá & Khóa Sổ (Chỉ Admin)
  const handleFinalize = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn CHỐT VÀ KHÓA SỔ đánh giá ${period === 'midterm' ? 'Nửa kỳ' : 'Toàn kỳ'} cho ${memberType.toUpperCase()} không? Sau khi chốt, Nhóm trưởng sẽ không thể chỉnh sửa điểm.`)) {
      return;
    }

    // Tự động lưu nháp trước khi chốt
    await handleSaveDraft();

    try {
      const res = await api.finalizeEvaluation({
        period,
        memberType,
        groupNum: selectedGroup
      });
      if (res.success) {
        addToast(res.message, 'success');
        loadEvaluationData();
      } else {
        addToast(res.message || 'Lỗi chốt đánh giá', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  // 3. Mở Khóa Sổ (Chỉ Admin)
  const handleUnlock = async () => {
    try {
      const res = await api.unlockEvaluation({
        period,
        memberType,
        groupNum: selectedGroup
      });
      if (res.success) {
        addToast(res.message, 'success');
        loadEvaluationData();
      } else {
        addToast(res.message || 'Lỗi mở khóa sổ', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Thống kê phân bổ xếp loại
  const statsSummary = evalList.reduce((acc, item) => {
    const { rank } = calculateCurrentRow(item);
    acc[rank] = (acc[rank] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Đánh Giá & Xếp Loại {period === 'midterm' ? 'Nửa Kỳ (Tuần 1 - 10)' : 'Toàn Kỳ (Tuần 1 - 19)'}
                </h3>
                {isAllLocked ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <Lock className="w-3 h-3" />
                    Đã Khóa Sổ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Bản Nháp
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Quy trình 2 bước: Nhóm trưởng chấm điểm định tính & nhận xét &rarr; Admin chốt sổ
              </p>
            </div>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/10 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setPeriod('midterm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'midterm'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              Đánh Giá Nửa Kỳ
            </button>
            <button
              type="button"
              onClick={() => setPeriod('final')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'final'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              Đánh Giá Toàn Kỳ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Đối tượng (CTV vs TNV) */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/80">
              <button
                type="button"
                disabled={isLeader && user?.targetType === 'tnv'}
                onClick={() => setMemberType('ctv')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  memberType === 'ctv'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cộng Tác Viên (8 Nhóm)
              </button>
              <button
                type="button"
                disabled={isLeader && user?.targetType === 'ctv'}
                onClick={() => setMemberType('tnv')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  memberType === 'tnv'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tình Nguyện Viên (4 Nhóm)
              </button>
            </div>

            {/* Lọc Nhóm */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="font-bold text-slate-700">Lọc Nhóm:</span>
              <select
                value={selectedGroup}
                disabled={isLeader}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 outline-hidden"
              >
                {!isLeader && <option value="all">Tất cả các nhóm</option>}
                {Array.from({ length: maxGroups }, (_, i) => i + 1).map(g => (
                  <option key={g} value={String(g)}>Nhóm {g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tóm tắt thống kê danh hiệu */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
              Xuất sắc: {statsSummary['Xuất sắc'] || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">
              Tốt: {statsSummary['Tốt'] || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">
              Khá: {statsSummary['Khá'] || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">
              Cần cải thiện: {statsSummary['Cần cải thiện'] || 0}
            </span>
            {statsSummary['Kỷ luật (Thẻ Đỏ)'] > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white">
                Thẻ Đỏ: {statsSummary['Kỷ luật (Thẻ Đỏ)']}
              </span>
            )}
          </div>
        </div>

        {/* Thang điểm quy chuẩn banner */}
        <div className="px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100 text-[11px] text-indigo-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <b>Cấu trúc điểm:</b> Chuyên cần (tối đa {rubric.attendanceWeight}đ) + Hoạt động (tối đa {rubric.activityWeight}đ) + Định tính (tối đa &plusmn;{rubric.qualitativeWeight}đ).
            </span>
          </div>
          <div className="text-slate-600">
            Ngưỡng điểm: <b>&ge;{rubric.thresholdExcellent}đ</b> (Xuất sắc) · <b>&ge;{rubric.thresholdGood}đ</b> (Tốt) · <b>&ge;{rubric.thresholdFair}đ</b> (Khá)
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Đang tổng hợp điểm chuyên cần và hoạt động theo mốc...
            </div>
          ) : evalList.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Không tìm thấy thành viên nào theo bộ lọc đã chọn.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Nhóm</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">MSSV</th>
                    <th className="py-2.5 px-3 text-center">Chuyên cần ({rubric.attendanceWeight}đ)</th>
                    <th className="py-2.5 px-3 text-center">Hoạt động ({rubric.activityWeight}đ)</th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">Định tính (&plusmn;{rubric.qualitativeWeight}đ)</th>
                    <th className="py-2.5 px-3 text-center min-w-[200px]">Nhận xét & Đóng góp</th>
                    <th className="py-2.5 px-3 text-center font-extrabold">Tổng điểm</th>
                    <th className="py-2.5 px-3 text-center">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evalList.map((item, idx) => {
                    const { qScore, totalScore, rank, notes } = calculateCurrentRow(item);
                    const isRowLocked = isAllLocked || item.isLocked;

                    return (
                      <tr key={item.member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          Nhóm {item.member.group_num}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{item.member.full_name}</span>
                            {item.member.role === 'Nhóm trưởng' && (
                              <Crown className="w-3.5 h-3.5 text-amber-500" title="Nhóm trưởng" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{item.member.mssv}</td>
                        
                        {/* Chuyên cần */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-extrabold text-blue-700 text-sm">{item.attendanceScore}</span>
                          <span className="text-[10px] text-slate-400 block">
                            ({item.attendedCount}/{item.totalEvents} buổi)
                          </span>
                        </td>

                        {/* Hoạt động */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-extrabold text-emerald-700 text-sm">{item.activityScore}</span>
                        </td>

                        {/* Nhập điểm định tính */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min={-rubric.qualitativeWeight}
                            max={rubric.qualitativeWeight}
                            disabled={isRowLocked && !isAdmin}
                            value={draftInputs[item.member.id]?.qualitativeScore ?? 0}
                            onChange={(e) => handleInputChange(item.member.id, 'qualitativeScore', e.target.value)}
                            className="w-16 px-2 py-1 text-center font-bold text-purple-900 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500 outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>

                        {/* Nhận xét */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Nhận xét thái độ, đóng góp..."
                            disabled={isRowLocked && !isAdmin}
                            value={draftInputs[item.member.id]?.notes ?? ''}
                            onChange={(e) => handleInputChange(item.member.id, 'notes', e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500 outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>

                        {/* Tổng điểm */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-base font-black text-slate-900">{totalScore}</span>
                        </td>

                        {/* Xếp loại badge */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-2xs ${
                            rank === 'Xuất sắc'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rank === 'Tốt'
                              ? 'bg-blue-100 text-blue-800'
                              : rank === 'Khá'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rank}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 gap-3">
          <div className="text-xs text-slate-500">
            {isAllLocked ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <Lock className="w-4 h-4" />
                Dữ liệu đánh giá kỳ này đã được Ban Quản Trị chốt khóa sổ.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <Info className="w-4 h-4 text-slate-400" />
                Nhóm trưởng chấm điểm định tính xong vui lòng bấm <b>Lưu Bản Nháp</b>.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {/* Lưu bản nháp */}
            {(!isAllLocked || isAdmin) && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu Bản Nháp'}</span>
              </button>
            )}

            {/* Admin Chốt sổ hoặc Mở khóa */}
            {isAdmin && (
              isAllLocked ? (
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Mở Khóa Sổ</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-sm shadow-purple-200 transition-all cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Chốt Đánh Giá & Khóa Sổ</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

