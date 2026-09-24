import React, { useState } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  Edit2,
  Trash2,
  Award,
  Crown,
  UserCheck,
  Phone,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Percent,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function TnvMemberList({
  members = [],
  maxScore = 100,
  searchTerm,
  setSearchTerm,
  selectedGroup,
  setSelectedGroup,
  selectedWarning,
  setSelectedWarning,
  selectedStatus,
  setSelectedStatus,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onRecordActivity,
  onOpenImportModal,
  onEditWarning,
  onReload,
}) {
  const { addToast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(null); // 'status' | 'group' | 'points' | 'warning' | 'delete' | null
  const [bulkPayload, setBulkPayload] = useState({
    status: 'Đang hoạt động',
    groupNum: 1,
    pointsDelta: 5,
    category: 'Chiến dịch tập thể',
    note: 'Cộng điểm hàng loạt',
    warningLevel: 'none',
    warningNote: '',
  });
  const [bulkLoading, setBulkLoading] = useState(false);

  const memberToDelete = members.find((m) => m.id === deleteConfirmId);

  // Checkbox handlers
  const allIds = members.map((m) => m.id);
  const isAllSelected = members.length > 0 && selectedIds.length === members.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < members.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk action executor
  const handleExecuteBulkAction = async () => {
    if (!showBulkModal || selectedIds.length === 0) return;
    setBulkLoading(true);

    try {
      let action = '';
      let payload = {};

      if (showBulkModal === 'status') {
        action = 'change_status';
        payload = { status: bulkPayload.status };
      } else if (showBulkModal === 'group') {
        action = 'change_group';
        payload = { groupNum: bulkPayload.groupNum };
      } else if (showBulkModal === 'points') {
        action = 'adjust_points';
        payload = {
          pointsDelta: bulkPayload.pointsDelta,
          category: bulkPayload.category,
          note: bulkPayload.note,
        };
      } else if (showBulkModal === 'warning') {
        action = 'bulk_warning';
        payload = {
          warningLevel: bulkPayload.warningLevel,
          warningNote: bulkPayload.warningNote,
        };
      } else if (showBulkModal === 'delete') {
        action = 'delete';
      }

      const res = await api.bulkActionTnv(action, selectedIds, payload);
      if (res.success) {
        addToast(res.message, 'success');
        setSelectedIds([]);
        setShowBulkModal(null);
        if (onReload) onReload();
      } else {
        addToast(res.message || 'Lỗi thao tác hàng loạt TNV', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
      {/* Action Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Danh Sách Tình Nguyện Viên & Tiến Độ</span>
              {selectedIds.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold animate-pulse">
                  Đã chọn {selectedIds.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hiển thị <b>{members.length}</b> TNV · Điểm Top 1 đối sánh: <b className="text-rose-600">{maxScore}đ</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nhập file */}
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Nhập Excel / CSV</span>
            </button>

            {/* Xuất file Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Danh Sách</span>
                <ChevronDown className="w-3 h-3 text-emerald-600" />
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-fade-in"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <a
                    href="/api/tnv/export-xlsx"
                    download="Danh_sach_TNV_Dang_hoat_dong.xlsx"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất file Excel (.xlsx)</span>
                  </a>
                  <a
                    href="/api/tnv/export-csv"
                    download="Danh_sach_TNV_Dang_hoat_dong.csv"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <Download className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xuất file CSV (.csv)</span>
                  </a>
                </div>
              )}
            </div>

            {/* Thêm TNV Mới */}
            <button
              onClick={onAddMember}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm TNV Mới</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm MSSV, Họ tên, Lớp, SĐT..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/60"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả Nhóm (1 - 4)</option>
              {[1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  Nhóm {g}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedWarning}
              onChange={(e) => setSelectedWarning(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả Kỷ luật</option>
              <option value="none">Bình thường</option>
              <option value="canh_cao_1">Thẻ vàng (Mức 1)</option>
              <option value="canh_cao_2">Thẻ đỏ (Mức 2)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Tạm dừng">Tạm dừng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-fade-in border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="bg-rose-500 px-2 py-0.5 rounded-full text-white text-[11px] font-bold">
              {selectedIds.length} TNV
            </span>
            <span>đang được chọn. Thao tác hàng loạt:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowBulkModal('status')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
            >
              Đổi trạng thái
            </button>
            <button
              onClick={() => setShowBulkModal('group')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
            >
              Chuyển nhóm
            </button>
            <button
              onClick={() => setShowBulkModal('points')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Cộng / Trừ điểm
            </button>
            <button
              onClick={() => setShowBulkModal('warning')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              Kỷ luật Thẻ
            </button>
            <button
              onClick={() => setShowBulkModal('delete')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            >
              Xóa hàng loạt
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors ml-1"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <th className="p-3.5 pl-4 text-center w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => el && (el.indeterminate = isIndeterminate)}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </th>
              <th className="p-3.5">MSSV</th>
              <th className="p-3.5">Họ và tên</th>
              <th className="p-3.5 text-center">Giới tính</th>
              <th className="p-3.5">Lớp</th>
              <th className="p-3.5 text-center">Nhóm</th>
              <th className="p-3.5">Chức vụ</th>
              <th className="p-3.5 text-center">Điểm</th>
              <th className="p-3.5 min-w-[170px]">Tiến độ Top 1</th>
              <th className="p-3.5 text-center">Kỷ luật</th>
              <th className="p-3.5 text-center">Trạng thái</th>
              <th className="p-3.5 pr-5 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400">
                  Không tìm thấy Tình Nguyện Viên nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isLeader = m.role === 'Nhóm trưởng';
                const isDeputy = m.role === 'Nhóm phó';
                const rate = m.benchmarkRate || 0;
                const isSelected = selectedIds.includes(m.id);

                let progressColor = 'bg-blue-600';
                if (rate >= 90) progressColor = 'bg-gradient-to-r from-amber-500 to-orange-500';
                else if (rate >= 60) progressColor = 'bg-emerald-500';
                else if (rate < 30) progressColor = 'bg-rose-500';

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors group ${
                      isSelected ? 'bg-rose-50/70 hover:bg-rose-50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 pl-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(m.id)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>

                    {/* MSSV */}
                    <td className="p-3.5 font-mono font-bold text-slate-700">
                      {m.mssv}
                    </td>

                    {/* Họ và tên */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{m.full_name}</span>
                        {isLeader && (
                          <span title="Nhóm trưởng" className="p-0.5 rounded bg-amber-100 text-amber-700">
                            <Crown className="w-3 h-3" />
                          </span>
                        )}
                        {isDeputy && (
                          <span title="Nhóm phó" className="p-0.5 rounded bg-rose-100 text-rose-700">
                            <UserCheck className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      {m.phone && <div className="text-[11px] text-slate-400 mt-0.5">{m.phone}</div>}
                    </td>

                    {/* Giới tính */}
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        m.gender === 'Nữ' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.gender || 'Nam'}
                      </span>
                    </td>

                    {/* Lớp */}
                    <td className="p-3.5 font-mono text-slate-600 font-medium">
                      {m.class_name || '-'}
                    </td>

                    {/* Nhóm */}
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-xs bg-rose-50 text-rose-800 border border-rose-200">
                        Nhóm {m.group_num}
                      </span>
                    </td>

                    {/* Chức vụ */}
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isLeader
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isDeputy
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.role}
                      </span>
                    </td>

                    {/* Điểm tích lũy */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-lg font-black text-xs text-rose-950 bg-rose-50 border border-rose-100">
                        {m.total_points}đ
                      </span>
                    </td>

                    {/* Tiến độ % Top 1 */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600">{rate}%</span>
                          <span className="text-slate-400 font-normal">({m.total_points}/{maxScore}đ)</span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Kỷ luật */}
                    <td className="p-3.5 text-center">
                      {m.warning_level === 'canh_cao_2' ? (
                        <button
                          onClick={() => onEditWarning(m)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black text-rose-900 bg-rose-100 border border-rose-300 hover:bg-rose-200 transition-colors"
                          title={m.warning_note || 'Thẻ Đỏ'}
                        >
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>Thẻ Đỏ</span>
                        </button>
                      ) : m.warning_level === 'canh_cao_1' ? (
                        <button
                          onClick={() => onEditWarning(m)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 transition-colors"
                          title={m.warning_note || 'Thẻ Vàng'}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Thẻ Vàng</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Bình thường</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        m.status === 'Đang hoạt động'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Đang hoạt động' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {m.status}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onRecordActivity(m)}
                          title="Ghi nhận hoạt động tình nguyện & Cộng điểm"
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                        >
                          <Award className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditMember(m)}
                          title="Chỉnh sửa thông tin"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(m.id)}
                          title="Xóa TNV"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Single Member Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        isDanger={true}
        title="Xóa Tình Nguyện Viên"
        message={`Bạn có chắc chắn muốn xóa thành viên ${memberToDelete?.full_name} (${memberToDelete?.mssv})?`}
        confirmText="Xóa TNV"
        cancelText="Hủy Bỏ"
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteMember(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Bulk Action Sub-Modals (Gọn gàng không cần cuộn) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                {showBulkModal === 'status' && `Đổi trạng thái (${selectedIds.length} TNV)`}
                {showBulkModal === 'group' && `Chuyển nhóm (${selectedIds.length} TNV)`}
                {showBulkModal === 'points' && `Cộng/Trừ điểm (${selectedIds.length} TNV)`}
                {showBulkModal === 'warning' && `Áp dụng kỷ luật (${selectedIds.length} TNV)`}
                {showBulkModal === 'delete' && `Xóa hàng loạt (${selectedIds.length} TNV)`}
              </h4>
              <button
                onClick={() => setShowBulkModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-slate-600">
              {showBulkModal === 'status' && (
                <div>
                  <label className="block font-semibold mb-1">Chọn trạng thái mới:</label>
                  <select
                    value={bulkPayload.status}
                    onChange={(e) => setBulkPayload({ ...bulkPayload, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="Đang hoạt động">Đang hoạt động</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </div>
              )}

              {showBulkModal === 'group' && (
                <div>
                  <label className="block font-semibold mb-1">Chọn nhóm đích (1 - 4):</label>
                  <select
                    value={bulkPayload.groupNum}
                    onChange={(e) => setBulkPayload({ ...bulkPayload, groupNum: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    {[1, 2, 3, 4].map((g) => (
                      <option key={g} value={g}>
                        Nhóm {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showBulkModal === 'points' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-semibold mb-1">Số điểm thay đổi (+ hoặc -):</label>
                    <input
                      type="number"
                      value={bulkPayload.pointsDelta}
                      onChange={(e) => setBulkPayload({ ...bulkPayload, pointsDelta: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Hạng mục hoạt động:</label>
                    <input
                      type="text"
                      value={bulkPayload.category}
                      onChange={(e) => setBulkPayload({ ...bulkPayload, category: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {showBulkModal === 'warning' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-semibold mb-1">Mức kỷ luật:</label>
                    <select
                      value={bulkPayload.warningLevel}
                      onChange={(e) => setBulkPayload({ ...bulkPayload, warningLevel: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="none">Bình thường (Xóa cảnh cáo)</option>
                      <option value="canh_cao_1">Thẻ Vàng (Cảnh cáo mức 1)</option>
                      <option value="canh_cao_2">Thẻ Đỏ (Cảnh cáo mức 2)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Ghi chú vi phạm:</label>
                    <input
                      type="text"
                      value={bulkPayload.warningNote}
                      onChange={(e) => setBulkPayload({ ...bulkPayload, warningNote: e.target.value })}
                      placeholder="VD: Vắng không phép ca trực..."
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {showBulkModal === 'delete' && (
                <p className="text-rose-600 font-medium leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn <b>{selectedIds.length}</b> TNV đã chọn không? Thao tác này không thể hoàn tác!
                </p>
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={handleExecuteBulkAction}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white ${
                  showBulkModal === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {bulkLoading ? 'Đang xử lý...' : 'Xác nhận thực hiện'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
