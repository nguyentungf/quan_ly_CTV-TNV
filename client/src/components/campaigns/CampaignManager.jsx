import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Award,
  Users,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  UserPlus,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';
import ConfirmModal from '../common/ConfirmModal';

export default function CampaignManager() {
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Campaign for Detail / Attendance Drawer
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regGroupFilter, setRegGroupFilter] = useState('all');
  const [regTypeFilter, setRegTypeFilter] = useState('all');
  const [regSearch, setRegSearch] = useState('');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Group quick registration form state
  const [quickGroupType, setQuickGroupType] = useState('ctv');
  const [quickGroupNum, setQuickGroupNum] = useState(1);
  const [quickLeaderName, setQuickLeaderName] = useState('');
  const [quickRegisterLoading, setQuickRegisterLoading] = useState(false);

  // Form state for create / edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    eventDate: new Date().toISOString().split('T')[0],
    points: 10,
    targetType: 'all',
    status: 'dang_mo_dang_ky',
  });

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaigns({ status: statusFilter, search: searchTerm });
      if (res.success) {
        setCampaigns(res.data);
      }
    } catch (err) {
      addToast('Lỗi khi tải danh sách hoạt động', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (camp) => {
    setActiveCampaign(camp);
    loadRegistrations(camp.id);
  };

  const loadRegistrations = async (campId) => {
    setLoadingRegs(true);
    try {
      const res = await api.getCampaignRegistrations(campId, {
        group: regGroupFilter,
        memberType: regTypeFilter,
      });
      if (res.success) {
        setRegistrations(res.data);
      }
    } catch (err) {
      addToast('Lỗi khi tải danh sách đăng ký', 'error');
    } finally {
      setLoadingRegs(false);
    }
  };

  useEffect(() => {
    if (activeCampaign) {
      loadRegistrations(activeCampaign.id);
    }
  }, [regGroupFilter, regTypeFilter]);

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.eventDate) {
      addToast('Vui lòng nhập tên hoạt động và ngày tổ chức!', 'warning');
      return;
    }

    try {
      if (editingCampaign) {
        const res = await api.updateCampaign(editingCampaign.id, formData);
        if (res.success) {
          addToast('Cập nhật hoạt động thành công!', 'success');
          setShowEditModal(false);
          loadCampaigns();
          if (activeCampaign?.id === editingCampaign.id) {
            setActiveCampaign({ ...activeCampaign, ...formData });
          }
        }
      } else {
        const res = await api.createCampaign(formData);
        if (res.success) {
          addToast('Tạo hoạt động mới thành công!', 'success');
          setShowEditModal(false);
          loadCampaigns();
        }
      }
    } catch (err) {
      addToast('Lỗi khi lưu hoạt động', 'error');
    }
  };

  const handleDeleteCampaign = async (id) => {
    try {
      const res = await api.deleteCampaign(id);
      if (res.success) {
        addToast('Đã xóa hoạt động thành công', 'success');
        if (activeCampaign?.id === id) setActiveCampaign(null);
        loadCampaigns();
      }
    } catch (err) {
      addToast('Lỗi khi xóa hoạt động', 'error');
    }
  };

  // 1-Click Quick Group Registration for Group Leaders
  const handleQuickGroupRegister = async (e) => {
    e.preventDefault();
    if (!activeCampaign) return;

    setQuickRegisterLoading(true);
    try {
      const res = await api.registerCampaignGroup(activeCampaign.id, {
        memberType: quickGroupType,
        groupNum: Number(quickGroupNum),
        registeredBy: quickLeaderName.trim() || `Nhóm trưởng Nhóm ${quickGroupNum}`,
      });

      if (res.success) {
        addToast(res.message, 'success');
        loadRegistrations(activeCampaign.id);
        loadCampaigns();
      } else {
        addToast(res.message || 'Lỗi khi đăng ký theo nhóm', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setQuickRegisterLoading(false);
    }
  };

  // Mark attendance for an individual registration
  const handleMarkAttendance = async (regId, status) => {
    if (!activeCampaign) return;

    try {
      // Optimistic update
      setRegistrations((prev) =>
        prev.map((r) =>
          r.registration_id === regId
            ? {
                ...r,
                attendance_status: status,
                points_awarded: status === 'co_mat' ? activeCampaign.points : 0,
              }
            : r
        )
      );

      const res = await api.updateCampaignAttendance(activeCampaign.id, {
        registrationId: regId,
        attendanceStatus: status,
      });

      if (res.success) {
        addToast(res.message, 'success');
        loadCampaigns();
      } else {
        addToast(res.message || 'Lỗi cập nhật điểm danh', 'error');
        loadRegistrations(activeCampaign.id);
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
      loadRegistrations(activeCampaign.id);
    }
  };

  // Delete registration
  const handleDeleteRegistration = async (regId) => {
    if (!activeCampaign) return;
    if (window.confirm('Bạn có chắc chắn muốn hủy đăng ký của thành viên này khỏi hoạt động?')) {
      try {
        const res = await api.deleteCampaignRegistration(activeCampaign.id, regId);
        if (res.success) {
          addToast(res.message, 'success');
          loadRegistrations(activeCampaign.id);
          loadCampaigns();
        }
      } catch (err) {
        addToast('Lỗi khi hủy đăng ký', 'error');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'dang_mo_dang_ky':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Đang mở đăng ký
          </span>
        );
      case 'dang_tien_hanh':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Đang tiến hành
          </span>
        );
      case 'da_hoan_thanh':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Đã hoàn thành
          </span>
        );
      default:
        return null;
    }
  };

  const getTargetBadge = (target) => {
    switch (target) {
      case 'ctv':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">Chỉ CTV</span>;
      case 'tnv':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">Chỉ TNV</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">Toàn Đội (CTV & TNV)</span>;
    }
  };

  // Filtered registrations
  const filteredRegs = registrations.filter((r) => {
    if (!regSearch) return true;
    const s = regSearch.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.mssv?.toLowerCase().includes(s) ||
      r.class_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md">
        <div>
          <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-md">
            Phân Hệ Hoạt Động & Sự Kiện
          </span>
          <h2 className="text-xl font-extrabold mt-2 tracking-tight">
            Quản Lý Hoạt Động, Đăng Ký & Điểm Danh Sự Kiện
          </h2>
          <p className="text-xs text-emerald-100 max-w-2xl mt-1 leading-relaxed">
            Hỗ trợ Nhóm trưởng đăng ký hàng loạt 1-click cho cả nhóm, theo dõi danh sách đã và đang tiến hành,
            và điểm danh ghi nhận điểm hoạt động tự động vào hồ sơ nhân sự.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCampaign(null);
            setFormData({
              name: '',
              description: '',
              location: '',
              eventDate: new Date().toISOString().split('T')[0],
              points: 10,
              targetType: 'all',
              status: 'dang_mo_dang_ky',
            });
            setShowEditModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 shadow-md transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Tạo Hoạt Động Mới</span>
        </button>
      </div>

      {/* Main Content Layout: Activity List + Detail / Registration Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campaigns List (5 cols or full) */}
        <div className={`${activeCampaign ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCampaigns()}
                placeholder="Tìm kiếm theo tên hoạt động, địa điểm..."
                className="w-full text-xs border-none focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="dang_mo_dang_ky">Đang mở đăng ký</option>
                <option value="dang_tien_hanh">Đang tiến hành</option>
                <option value="da_hoan_thanh">Đã hoàn thành</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Chưa có hoạt động nào phù hợp với bộ lọc.
              </div>
            ) : (
              campaigns.map((camp) => {
                const isSelected = activeCampaign?.id === camp.id;
                return (
                  <div
                    key={camp.id}
                    onClick={() => handleOpenDetail(camp)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(camp.status)}
                          {getTargetBadge(camp.target_type || camp.targetType)}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {camp.name}
                        </h4>
                      </div>

                      {/* Points badge */}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        +{camp.points} điểm
                      </span>
                    </div>

                    {camp.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {camp.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{camp.event_date || camp.eventDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{camp.location || 'Chưa định'}</span>
                      </div>
                    </div>

                    {/* Stats footer */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        Đã đăng ký: <b>{camp.registered_count || 0}</b>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 font-semibold">
                          Có mặt: {camp.attended_count || 0}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Campaign Detail & Attendance Panel (7 cols) */}
        {activeCampaign ? (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(activeCampaign.status)}
                  {getTargetBadge(activeCampaign.target_type || activeCampaign.targetType)}
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{activeCampaign.points}đ / lượt có mặt
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {activeCampaign.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                  <span>📅 {activeCampaign.event_date || activeCampaign.eventDate}</span>
                  <span>📍 {activeCampaign.location || 'Chưa định'}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`/api/campaigns/${activeCampaign.id}/export-xlsx`}
                  download
                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                  title="Xuất file Excel điểm danh hoạt động này"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    setEditingCampaign(activeCampaign);
                    setFormData({
                      name: activeCampaign.name,
                      description: activeCampaign.description || '',
                      location: activeCampaign.location || '',
                      eventDate: activeCampaign.event_date || activeCampaign.eventDate,
                      points: activeCampaign.points || 10,
                      targetType: activeCampaign.target_type || activeCampaign.targetType || 'all',
                      status: activeCampaign.status || 'dang_mo_dang_ky',
                    });
                    setShowEditModal(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
                  title="Chỉnh sửa thông tin hoạt động"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(activeCampaign.id)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200"
                  title="Xóa hoạt động"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveCampaign(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SUPER CONVENIENT FOR GROUP LEADERS: 1-Click Group Registration */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-b border-emerald-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span>DÀNH CHO NHÓM TRƯỞNG: Đăng ký nhanh 1-Click cho toàn bộ nhóm</span>
              </div>

              <form onSubmit={handleQuickGroupRegister} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <div className="sm:col-span-3">
                  <select
                    value={quickGroupType}
                    onChange={(e) => {
                      setQuickGroupType(e.target.value);
                      setQuickGroupNum(1);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-semibold text-slate-700"
                  >
                    <option value="ctv">Cộng Tác Viên (CTV)</option>
                    <option value="tnv">Tình Nguyện Viên (TNV)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={quickGroupNum}
                    onChange={(e) => setQuickGroupNum(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-semibold text-slate-700"
                  >
                    {(quickGroupType === 'ctv' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4]).map((g) => (
                      <option key={g} value={g}>
                        Nhóm {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={quickLeaderName}
                    onChange={(e) => setQuickLeaderName(e.target.value)}
                    placeholder="Tên người đăng ký..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-slate-700"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={quickRegisterLoading}
                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all text-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{quickRegisterLoading ? 'Đang thêm...' : 'Đăng ký cả nhóm'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Registered Members Table & Attendance Actions */}
            <div className="p-4 space-y-3 flex-1 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800">
                    Danh Sách Thành Viên Đã Đăng Ký ({filteredRegs.length})
                  </h4>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    placeholder="Lọc tên, MSSV..."
                    className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 w-32 focus:outline-none"
                  />
                  <select
                    value={regTypeFilter}
                    onChange={(e) => setRegTypeFilter(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-lg bg-white"
                  >
                    <option value="all">Tất cả đối tượng</option>
                    <option value="ctv">Chỉ CTV</option>
                    <option value="tnv">Chỉ TNV</option>
                  </select>
                  <select
                    value={regGroupFilter}
                    onChange={(e) => setRegGroupFilter(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-lg bg-white"
                  >
                    <option value="all">Tất cả nhóm</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                      <option key={g} value={g}>
                        Nhóm {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl flex-1 max-h-[420px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 pl-3">STT</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">MSSV</th>
                      <th className="p-2.5 text-center">Lớp</th>
                      <th className="p-2.5 text-center">Đối tượng</th>
                      <th className="p-2.5 text-center">Nhóm</th>
                      <th className="p-2.5 text-center min-w-[170px]">Điểm danh hoạt động</th>
                      <th className="p-2.5 pr-3 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingRegs ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          Đang tải danh sách đăng ký...
                        </td>
                      </tr>
                    ) : filteredRegs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          Chưa có thành viên nào đăng ký tham gia.
                        </td>
                      </tr>
                    ) : (
                      filteredRegs.map((r, idx) => {
                        const isAttended = r.attendance_status === 'co_mat';
                        const isAbsent = r.attendance_status === 'vang';

                        return (
                          <tr key={r.registration_id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 pl-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800">
                              <div>{r.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                ĐK bởi: {r.registered_by}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{r.mssv}</td>
                            <td className="p-2.5 text-center font-mono text-slate-600">
                              {r.class_name || '-'}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.member_type === 'ctv'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {r.member_type?.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700">
                              Nhóm {r.group_num}
                            </td>

                            {/* Direct Attendance Action Buttons */}
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                                <button
                                  onClick={() => handleMarkAttendance(r.registration_id, 'co_mat')}
                                  title="Đánh dấu Có mặt (+ điểm tự động)"
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                                    isAttended
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  ✓ Có mặt
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(r.registration_id, 'vang')}
                                  title="Đánh dấu Vắng mặt"
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                                    isAbsent
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                >
                                  ✕ Vắng
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(r.registration_id, 'chua_diem_danh')}
                                  title="Đặt lại Chưa điểm danh"
                                  className={`px-1.5 py-1 rounded-md text-[10px] transition-all ${
                                    !isAttended && !isAbsent
                                      ? 'bg-slate-400 text-white font-bold'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  Chưa
                                </button>
                              </div>
                            </td>

                            <td className="p-2.5 pr-3 text-right">
                              <button
                                onClick={() => handleDeleteRegistration(r.registration_id)}
                                title="Hủy đăng ký"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-8 items-center justify-center text-center text-slate-400">
            <div>
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-sm">
                Chọn một hoạt động ở cột bên trái để quản lý đăng ký & điểm danh
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Hoặc bấm "Tạo Hoạt Động Mới" ở góc trên để bổ sung sự kiện
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal (Ultra-compact) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {editingCampaign ? 'Chỉnh Sửa Hoạt Động' : 'Tạo Hoạt Động Mới'}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-4 space-y-3 overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên hoạt động / sự kiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Trực bàn thông tin Tân sinh viên K69"
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Điểm cộng khi tham gia
                  </label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa điểm tổ chức</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="VD: Hội trường C2, Nhà thi đấu..."
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đối tượng tham gia</label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Toàn Đội (CTV & TNV)</option>
                    <option value="ctv">Chỉ Cộng Tác Viên</option>
                    <option value="tnv">Chỉ Tình Nguyện Viên</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="dang_mo_dang_ky">Đang mở đăng ký</option>
                    <option value="dang_tien_hanh">Đang tiến hành</option>
                    <option value="da_hoan_thanh">Đã hoàn thành</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả / Kế hoạch chi tiết</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nội dung công việc, phân công nhiệm vụ..."
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  {editingCampaign ? 'Lưu cập nhật' : 'Tạo hoạt động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Campaign Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        isDanger={true}
        title="Xóa Hoạt Động"
        message="Bạn có chắc chắn muốn xóa hoạt động này? Mọi dữ liệu đăng ký và điểm danh liên quan sẽ bị xóa vĩnh viễn."
        confirmText="Xóa Hoạt Động"
        cancelText="Hủy Bỏ"
        onConfirm={() => {
          if (deleteConfirmId) {
            handleDeleteCampaign(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}

