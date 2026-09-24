import React, { useState, useEffect } from 'react';
import { X, GitMerge, ArrowRight, AlertTriangle, ShieldCheck, History, Users } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function CtvMergeGroupModal({
  isOpen,
  onClose,
  groups = [],
  onSuccess,
}) {
  const { addToast } = useToast();
  const [sourceGroup, setSourceGroup] = useState(4); // Nhóm B (bị gộp)
  const [targetGroup, setTargetGroup] = useState(1); // Nhóm A (nhóm nhận)
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen]);

  const loadAuditLogs = async () => {
    try {
      const res = await api.getCtvMergeLogs();
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const srcInfo = groups.find((g) => g.groupNum === Number(sourceGroup));
  const tgtInfo = groups.find((g) => g.groupNum === Number(targetGroup));

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (Number(sourceGroup) === Number(targetGroup)) {
      addToast('Không thể gộp nhóm vào chính nó!', 'warning');
      return;
    }
    if (Number(sourceGroup) < Number(targetGroup)) {
      addToast(`Quy tắc: Nhóm số lớn hơn (Nhóm ${sourceGroup}) phải gộp vào nhóm số nhỏ hơn (Nhóm ${targetGroup})!`, 'warning');
      return;
    }
    if (!srcInfo || srcInfo.memberCount === 0) {
      addToast(`Nhóm ${sourceGroup} hiện không có thành viên nào để gộp!`, 'warning');
      return;
    }
    setShowConfirm(true);
  };

  const handleExecuteMerge = async () => {
    setLoading(true);
    try {
      const res = await api.mergeCtvGroups(sourceGroup, targetGroup, notes);
      if (res.success) {
        addToast(res.message, 'success', 5000);
        setShowConfirm(false);
        onSuccess();
        loadAuditLogs();
        setNotes('');
      } else {
        addToast(res.message || 'Lỗi khi gộp nhóm', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ khi gộp nhóm', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tính Năng Gộp Nhóm Cộng Tác Viên</h3>
              <p className="text-xs text-slate-500">Tự động tích hợp thành viên & điều chỉnh chức vụ nhóm trưởng</p>
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Rule Box */}
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-purple-950">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Quy tắc gộp nhóm tự động (A &lt; B):
            </div>
            <ul className="list-disc list-inside space-y-1 text-purple-800 leading-relaxed">
              <li>Nhóm B (số lớn hơn) sẽ được sáp nhập vào Nhóm A (số nhỏ hơn).</li>
              <li><b>Nhóm trưởng của Nhóm B</b> sẽ tự động hạ cấp xuống làm <b>Nhóm phó của Nhóm A</b>.</li>
              <li>Toàn bộ thành viên còn lại của Nhóm B sẽ chuyển sang Nhóm A.</li>
              <li>Hệ thống lưu lại vết kiểm toán (Audit Log) đầy đủ để tra cứu.</li>
            </ul>
          </div>

          {/* Form Selection */}
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Nhóm sáp nhập (Nhóm B - Bị gộp):
                </label>
                <select
                  value={sourceGroup}
                  onChange={(e) => setSourceGroup(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-semibold"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((g) => (
                    <option key={g} value={g}>
                      Nhóm {g} ({groups.find((x) => x.groupNum === g)?.memberCount || 0} thành viên)
                    </option>
                  ))}
                </select>
                {srcInfo && (
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Trưởng nhóm: <span className="font-semibold text-slate-700">{srcInfo.leaderName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Nhóm tiếp nhận (Nhóm A - Giữ lại):
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((g) => (
                    <option key={g} value={g} disabled={g >= sourceGroup}>
                      Nhóm {g} {g >= sourceGroup ? '(Không hợp lệ: A phải < B)' : `(${groups.find((x) => x.groupNum === g)?.memberCount || 0} TV)`}
                    </option>
                  ))}
                </select>
                {tgtInfo && (
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Trưởng nhóm: <span className="font-semibold text-slate-700">{tgtInfo.leaderName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Visual Merge Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="text-center">
                <span className="font-black text-slate-800 text-sm block">Nhóm {sourceGroup}</span>
                <span className="text-slate-500">{srcInfo?.memberCount || 0} thành viên</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-purple-600 font-bold">
                <span className="text-[10px] uppercase">Gộp vào</span>
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="font-black text-slate-800 text-sm block">Nhóm {targetGroup}</span>
                <span className="text-slate-500">
                  Dự kiến: {(tgtInfo?.memberCount || 0) + (srcInfo?.memberCount || 0)} thành viên
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do / Ghi chú sáp nhập (tùy chọn):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Tối ưu nhân sự sau đợt tổng kết tháng 9..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 transition-all"
              >
                <GitMerge className="w-4 h-4" />
                <span>Tiến hành Gộp Nhóm</span>
              </button>
            </div>
          </form>

          {/* Audit Logs Table */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
              <History className="w-4 h-4 text-slate-500" />
              Lịch sử gộp nhóm (Audit Log):
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có lịch sử gộp nhóm nào.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Thời gian</th>
                      <th className="p-2.5">Gộp</th>
                      <th className="p-2.5">Nhóm phó mới</th>
                      <th className="p-2.5">Số lượng</th>
                      <th className="p-2.5">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at || log.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-2.5 font-bold text-purple-700">
                          Nhóm {log.source_group || log.sourceGroup} &rarr; Nhóm {log.target_group || log.targetGroup}
                        </td>
                        <td className="p-2.5 text-slate-800 font-medium">
                          {log.demoted_leader_name || log.demotedLeaderName}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {log.merged_count || log.mergedCount} TV
                        </td>
                        <td className="p-2.5 text-slate-500 max-w-xs truncate" title={log.note}>
                          {log.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-50">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Xác Nhận Gộp Nhóm</h4>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn sáp nhập <b>Nhóm {sourceGroup}</b> vào <b>Nhóm {targetGroup}</b>?
            </p>

            <div className="p-3 bg-amber-50/60 rounded-xl text-xs text-amber-900 space-y-1 border border-amber-200/60">
              <p>• <b>{srcInfo?.leaderName}</b> (Trưởng Nhóm {sourceGroup}) sẽ chuyển thành <b>Nhóm phó</b> Nhóm {targetGroup}.</p>
              <p>• <b>{srcInfo?.memberCount || 0} thành viên</b> sẽ được chuyển sinh hoạt sang Nhóm {targetGroup}.</p>
              <p>• Hành động này sẽ được ghi vào nhật ký kiểm toán và cập nhật toàn bộ bảng điểm danh.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteMerge}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 transition-all"
              >
                {loading ? 'Đang gộp...' : 'Đồng ý Sáp nhập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

