import React, { useState } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  GitMerge,
  Edit2,
  Trash2,
  Award,
  Crown,
  Phone,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Users,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function CtvMemberList({
  members = [],
  searchTerm,
  setSearchTerm,
  selectedGroup,
  setSelectedGroup,
  selectedStatus,
  setSelectedStatus,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onRateMember,
  onOpenMergeModal,
  onOpenImportModal,
  onReload,
}) {
  const { addToast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(null); // 'status' | 'group' | 'points' | 'delete' | null
  const [bulkPayload, setBulkPayload] = useState({
    status: 'Đang hoạt động',
    groupNum: 1,
    pointsType: 'activity',
    pointsDelta: 5,
    pointsTitle: 'Điểm thưởng hoạt động',
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
          type: bulkPayload.pointsType,
          pointsDelta: bulkPayload.pointsDelta,
          title: bulkPayload.pointsTitle,
        };
      } else if (showBulkModal === 'delete') {
        action = 'delete';
      }

      const res = await api.bulkActionCtv(action, selectedIds, payload);
      if (res.success) {
        addToast(res.message, 'success');
        setSelectedIds([]);
        setShowBulkModal(null);
        if (onReload) onReload();
      } else {
        addToast(res.message || 'Lỗi thực hiện thao tác hàng loạt', 'error');
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
              <span>Danh Sách Nhân Sự Cộng Tác Viên</span>
              {selectedIds.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold animate-pulse">
                  Đã chọn {selectedIds.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hiển thị <b>{members.length}</b> CTV theo bộ lọc hiện tại
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Gộp Nhóm */}
            <button
              onClick={onOpenMergeModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors shadow-2xs"
            >
              <GitMerge className="w-3.5 h-3.5 text-purple-600" />
              <span>Gộp Nhóm</span>
            </button>

            {/* Nhập file Excel/CSV */}
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Nhập Excel / CSV</span>
            </button>

            {/* Xuất file Dropdown (Excel / CSV) */}
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
                    href="/api/ctv/export-xlsx"
                    download="Danh_sach_CTV_Dang_hoat_dong.xlsx"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất file Excel (.xlsx)</span>
                  </a>
                  <a
                    href="/api/ctv/export-csv"
                    download="Danh_sach_CTV_Dang_hoat_dong.csv"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xuất file CSV (.csv)</span>
                  </a>
                </div>
              )}
            </div>

            {/* Thêm Mới */}
            <button
              onClick={onAddMember}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm CTV Mới</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm MSSV, Họ tên, Lớp, Số điện thoại..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/60"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả Nhóm (1 - 8)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                <option key={g} value={g}>
                  Nhóm {g}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Tạm dừng">Tạm dừng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar (Hiển thị khi có nhân sự được chọn) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-fade-in border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="bg-blue-500 px-2 py-0.5 rounded-full text-white text-[11px] font-bold">
              {selectedIds.length} CTV
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
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="p-3.5">MSSV</th>
              <th className="p-3.5">Họ và tên</th>
              <th className="p-3.5 text-center">Giới tính</th>
              <th className="p-3.5">Lớp</th>
              <th className="p-3.5 text-center">Nhóm</th>
              <th className="p-3.5">Chức vụ</th>
              <th className="p-3.5">Số điện thoại</th>
              <th className="p-3.5 text-center">Điểm TĐ</th>
              <th className="p-3.5 text-center">Điểm HĐ</th>
              <th className="p-3.5 text-center">Tổng điểm</th>
              <th className="p-3.5 text-center">Trạng thái</th>
              <th className="p-3.5 pr-5 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400">
                  Không tìm thấy Cộng Tác Viên nào phù hợp với điều kiện tìm kiếm.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isLeader = m.role === 'Nhóm trưởng';
                const isDeputy = m.role === 'Nhóm phó';
                const isSelected = selectedIds.includes(m.id);

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors group ${
                      isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 pl-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(m.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                      </div>
                      {m.email && <div className="text-[11px] text-slate-400 mt-0.5">{m.email}</div>}
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
                      <span className="inline-block px-2 py-0.5 rounded-full font-black text-xs bg-blue-50 text-blue-800 border border-blue-200">
                        Nhóm {m.group_num}
                      </span>
                    </td>

                    {/* Chức vụ */}
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isLeader
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isDeputy
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.role}
                      </span>
                    </td>

                    {/* Số điện thoại */}
                    <td className="p-3.5 text-slate-600 font-mono">
                      {m.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {m.phone}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Điểm thái độ */}
                    <td className="p-3.5 text-center">
                      <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                        m.attitude_points > 0
                          ? 'text-emerald-700 bg-emerald-50'
                          : m.attitude_points < 0
                          ? 'text-rose-700 bg-rose-50'
                          : 'text-slate-500'
                      }`}>
                        {m.attitude_points > 0 ? `+${m.attitude_points}` : m.attitude_points}đ
                      </span>
                    </td>

                    {/* Điểm hoạt động */}
                    <td className="p-3.5 text-center font-bold text-blue-700">
                      +{m.activity_points}đ
                    </td>

                    {/* Tổng điểm */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-lg font-black text-xs text-indigo-900 bg-indigo-50 border border-indigo-100">
                        {m.total_points}đ
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        m.status === 'Đang hoạt động'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Đang hoạt động' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {m.status}
                      </span>
                    </td>

                    {/* Thao tác cá nhân */}
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onRateMember(m)}
                          title="Đánh giá thái độ & Ghi nhận hoạt động"
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
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
                          title="Xóa CTV"
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
        title="Xóa Cộng Tác Viên"
        message={`Bạn có chắc chắn muốn xóa thành viên ${memberToDelete?.full_name} (${memberToDelete?.mssv})? Điểm số và dữ liệu liên quan sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa Thành Viên"
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
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                {showBulkModal === 'status' && `Đổi trạng thái (${selectedIds.length} CTV)`}
                {showBulkModal === 'group' && `Chuyển nhóm (${selectedIds.length} CTV)`}
                {showBulkModal === 'points' && `Cộng/Trừ điểm (${selectedIds.length} CTV)`}
                {showBulkModal === 'delete' && `Xóa hàng loạt (${selectedIds.length} CTV)`}
              </h4>
              <button
                onClick={() => setShowBulkModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 text-xs text-slate-600">
              {showBulkModal === 'status' && (
                <div>
                  <label className="block font-semibold mb-1">Chọn trạng thái mới:</label>
                  <select
                    value={bulkPayload.status}
                    onChange={(e) => setBulkPayload({ ...bulkPayload, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Đang hoạt động">Đang hoạt động</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </div>
              )}

              {showBulkModal === 'group' && (
                <div>
                  <label className="block font-semibold mb-1">Chọn nhóm đích (1 - 8):</label>
                  <select
                    value={bulkPayload.groupNum}
                    onChange={(e) => setBulkPayload({ ...bulkPayload, groupNum: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
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
                    <label className="block font-semibold mb-1">Loại điểm:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="ptype"
                          checked={bulkPayload.pointsType === 'activity'}
                          onChange={() => setBulkPayload({ ...bulkPayload, pointsType: 'activity' })}
                        />
                        <span>Điểm hoạt động</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="ptype"
                          checked={bulkPayload.pointsType === 'attitude'}
                          onChange={() => setBulkPayload({ ...bulkPayload, pointsType: 'attitude' })}
                        />
                        <span>Điểm thái độ</span>
                      </label>
                    </div>
                  </div>

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
                    <label className="block font-semibold mb-1">Lý do / Nội dung:</label>
                    <input
                      type="text"
                      value={bulkPayload.pointsTitle}
                      onChange={(e) => setBulkPayload({ ...bulkPayload, pointsTitle: e.target.value })}
                      placeholder="VD: Thưởng tham gia chiến dịch"
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {showBulkModal === 'delete' && (
                <p className="text-rose-600 font-medium leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn <b>{selectedIds.length}</b> CTV đã chọn không? Thao tác này không thể hoàn tác!
                </p>
              )}
            </div>

            {/* Modal Footer */}
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
                    : 'bg-blue-600 hover:bg-blue-700'
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
