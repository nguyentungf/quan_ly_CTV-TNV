import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  UserCheck,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';
import ConfirmModal from '../common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

export default function CampaignManager() {
  const { addToast } = useToast();
  const { user, isAdmin, isGuest, isLeader, canEditGroup, openLoginModal } = useAuth();
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

  // Check Confirm TNV state
  const [activeDetailTab, setActiveDetailTab] = useState('registrations'); // 'registrations' | 'confirmations'
  const [confirmations, setConfirmations] = useState([]);
  const [loadingConf, setLoadingConf] = useState(false);
  const [confirmSummary, setConfirmSummary] = useState({ totalCount: 0, confirmedCount: 0, unconfirmedCount: 0, penalizedCount: 0 });
  const [confGroupFilter, setConfGroupFilter] = useState('all');
  const [confSearch, setConfSearch] = useState('');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [selectedConfMemberIds, setSelectedConfMemberIds] = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    if (showEditModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showEditModal]);

  // Group registration & member selection state
  const [quickGroupType, setQuickGroupType] = useState('ctv');
  const [quickGroupNum, setQuickGroupNum] = useState(1);
  const [quickLeaderName, setQuickLeaderName] = useState('');
  const [quickRegisterLoading, setQuickRegisterLoading] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [memberShifts, setMemberShifts] = useState({}); // { [memberId]: shiftId }
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [regShiftFilter, setRegShiftFilter] = useState('all');

  // Bulk attendance selection state
  const [selectedRegIds, setSelectedRegIds] = useState([]);
  const [bulkAttLoading, setBulkAttLoading] = useState(false);

  // Form state for create / edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    eventDate: new Date().toISOString().split('T')[0],
    points: 10,
    requiredParticipants: 0,
    targetType: 'all',
    status: 'dang_mo_dang_ky',
    shifts: [],
    requireConfirm: false,
  });

  // Helper lấy danh sách kíp từ chiến dịch
  const getCampaignShifts = (camp) => {
    if (!camp || !camp.shifts) return [];
    try {
      const parsed = typeof camp.shifts === 'string' ? JSON.parse(camp.shifts) : camp.shifts;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  // Đồng bộ thông tin nhóm nếu người dùng là Nhóm trưởng
  useEffect(() => {
    if (isLeader && user?.targetType && user?.groupNum) {
      setQuickGroupType(user.targetType);
      setQuickGroupNum(Number(user.groupNum));
      setQuickLeaderName(user.displayName || `Nhóm trưởng Nhóm ${user.groupNum}`);
      if (user.targetType === 'tnv') {
        setConfGroupFilter(String(user.groupNum));
      }
    }
  }, [isLeader, user]);

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
    setSelectedRegIds([]);
    setActiveDetailTab('registrations');
    loadRegistrations(camp.id);
    if (Number(camp.require_confirm ?? camp.requireConfirm) === 1) {
      loadConfirmations(camp.id);
    }
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

  const loadConfirmations = async (campId, group, search) => {
    if (!campId) return;
    setLoadingConf(true);
    try {
      const g = group !== undefined ? group : confGroupFilter;
      const s = search !== undefined ? search : confSearch;
      const res = await api.getCampaignConfirmations(campId, {
        group: g,
        search: s,
      });
      if (res.success) {
        setConfirmations(res.data || []);
        setConfirmSummary(res.summary || {
          totalCount: 0,
          confirmedCount: 0,
          unconfirmedCount: 0,
          penalizedCount: 0,
        });
      }
    } catch (err) {
      addToast('Lỗi khi tải danh sách check confirm TNV', 'error');
    } finally {
      setLoadingConf(false);
    }
  };

  const handleToggleConfirm = async (member) => {
    if (!activeCampaign) return;
    const canEdit = isAdmin || (isLeader && user?.targetType === 'tnv' && Number(user?.groupNum) === Number(member.group_num));
    if (!canEdit) {
      addToast(`Bạn không có quyền xác nhận cho thành viên Nhóm ${member.group_num}!`, 'warning');
      return;
    }

    const nextStatus = Number(member.is_confirmed) === 1 ? 0 : 1;

    // Optimistic update
    setConfirmations((prev) =>
      prev.map((m) =>
        m.member_id === member.member_id
          ? {
              ...m,
              is_confirmed: nextStatus,
              confirmed_by: nextStatus === 1 ? (user?.displayName || 'Nhóm trưởng') : '',
              confirmed_at: nextStatus === 1 ? new Date().toISOString() : '',
            }
          : m
      )
    );

    setConfirmSummary((prev) => ({
      ...prev,
      confirmedCount: nextStatus === 1 ? prev.confirmedCount + 1 : Math.max(0, prev.confirmedCount - 1),
      unconfirmedCount: nextStatus === 1 ? Math.max(0, prev.unconfirmedCount - 1) : prev.unconfirmedCount + 1,
    }));

    try {
      const res = await api.toggleCampaignConfirmation(activeCampaign.id, {
        memberId: member.member_id,
        isConfirmed: nextStatus === 1,
      });
      if (res.success) {
        addToast(res.message, 'success');
        loadConfirmations(activeCampaign.id);
      } else {
        addToast(res.message || 'Lỗi cập nhật xác nhận', 'error');
        loadConfirmations(activeCampaign.id);
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
      loadConfirmations(activeCampaign.id);
    }
  };

  const handleFinalizeConfirm = async () => {
    if (!activeCampaign) return;
    const targetGroup = isLeader && user?.targetType === 'tnv'
      ? user.groupNum
      : (confGroupFilter !== 'all' ? confGroupFilter : 'all');

    setFinalizing(true);
    try {
      const res = await api.finalizeCampaignConfirmations(activeCampaign.id, {
        groupNum: targetGroup,
      });
      if (res.success) {
        addToast(res.message, 'success');
        setShowFinalizeModal(false);
        loadConfirmations(activeCampaign.id);
        loadCampaigns();
      } else {
        addToast(res.message || 'Lỗi khi chốt danh sách xác nhận', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  // Reset selection khi đổi chiến dịch, nhóm lọc hoặc từ khóa tìm kiếm
  useEffect(() => {
    setSelectedConfMemberIds([]);
  }, [activeCampaign?.id, confGroupFilter, confSearch]);

  // Lấy danh sách thành viên mà người dùng hiện tại có quyền thao tác (Admin hoặc Leader nhóm đó)
  const getSelectableConfMembers = () => {
    return confirmations.filter(
      (m) => isAdmin || (isLeader && user?.targetType === 'tnv' && Number(user?.groupNum) === Number(m.group_num))
    );
  };

  // Thao tác nhiều (Batch Toggle) cho các ID được chọn
  const handleBatchToggleConfirm = async (memberIds, isConfirmed) => {
    if (!activeCampaign || !memberIds || memberIds.length === 0) return;
    setBatchProcessing(true);
    try {
      const res = await api.batchToggleCampaignConfirmations(activeCampaign.id, {
        memberIds,
        isConfirmed,
      });
      if (res.success) {
        addToast(
          res.message || (isConfirmed ? `Đã xác nhận cho ${memberIds.length} thành viên` : `Đã hủy xác nhận cho ${memberIds.length} thành viên`),
          'success'
        );
        setSelectedConfMemberIds([]);
        loadConfirmations(activeCampaign.id);
      } else {
        addToast(res.message || 'Lỗi thao tác hàng loạt', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  // Thao tác tất cả (All Toggle) cho toàn bộ danh sách đang lọc
  const handleAllToggleConfirm = async (isConfirmed, unconfirmedOnly = false) => {
    if (!activeCampaign) return;
    const targetGroup = isLeader && user?.targetType === 'tnv'
      ? user.groupNum
      : (confGroupFilter !== 'all' ? confGroupFilter : 'all');

    const actionText = isConfirmed 
      ? (unconfirmedOnly ? 'xác nhận ĐÃ CONFIRM cho TẤT CẢ các bạn CHƯA confirm' : 'xác nhận ĐÃ CONFIRM cho TẤT CẢ thành viên')
      : 'HỦY XÁC NHẬN (đưa về Chưa confirm) cho TẤT CẢ thành viên';

    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} trong phạm vi đang xem không?`)) {
      return;
    }

    setBatchProcessing(true);
    try {
      const res = await api.batchToggleCampaignConfirmations(activeCampaign.id, {
        all: true,
        groupNum: targetGroup,
        isConfirmed,
        unconfirmedOnly,
      });
      if (res.success) {
        addToast(res.message || 'Thao tác tất cả thành công!', 'success');
        setSelectedConfMemberIds([]);
        loadConfirmations(activeCampaign.id);
      } else {
        addToast(res.message || 'Lỗi thao tác tất cả', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  // Tiện ích Chọn nhanh: Chọn tất cả hiển thị
  const handleSelectAllConfVisible = () => {
    const selectable = getSelectableConfMembers();
    setSelectedConfMemberIds(selectable.map((m) => m.member_id));
  };

  // Tiện ích Chọn nhanh: Chọn tất cả chưa confirm
  const handleSelectAllUnconfirmed = () => {
    const selectable = getSelectableConfMembers();
    const unconfirmed = selectable.filter((m) => Number(m.is_confirmed) !== 1);
    if (unconfirmed.length === 0) {
      addToast('Tất cả thành viên trong danh sách hiện tại đều đã confirm!', 'info');
      return;
    }
    setSelectedConfMemberIds(unconfirmed.map((m) => m.member_id));
  };

  // Tiện ích Chọn nhanh: Chọn tất cả đã confirm
  const handleSelectAllConfirmed = () => {
    const selectable = getSelectableConfMembers();
    const confirmed = selectable.filter((m) => Number(m.is_confirmed) === 1);
    if (confirmed.length === 0) {
      addToast('Chưa có thành viên nào được confirm trong danh sách này!', 'info');
      return;
    }
    setSelectedConfMemberIds(confirmed.map((m) => m.member_id));
  };

  useEffect(() => {
    if (activeCampaign) {
      loadRegistrations(activeCampaign.id);
    }
  }, [regGroupFilter, regTypeFilter]);

  // Load danh sách thành viên của nhóm để chọn từng thành viên
  const loadGroupMembers = async (type, groupNum) => {
    setLoadingMembers(true);
    try {
      const res = type === 'ctv'
        ? await api.getCtvMembers({ group: groupNum })
        : await api.getTnvMembers({ group: groupNum });
      if (res.success) {
        const members = res.data || [];
        setAvailableMembers(members);
        // Mặc định chọn tất cả
        const allIds = new Set(members.map((m) => m.id));
        setSelectedMemberIds(allIds);

        // Khởi tạo kíp mặc định nếu hoạt động có kíp
        const shifts = getCampaignShifts(activeCampaign);
        const defaultShiftId = shifts.length > 0 ? shifts[0].id : '';
        const initialShiftMap = {};
        members.forEach((m) => {
          initialShiftMap[m.id] = defaultShiftId;
        });
        setMemberShifts(initialShiftMap);
        setBulkShiftId(defaultShiftId);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeCampaign) {
      loadGroupMembers(quickGroupType, quickGroupNum);
    }
  }, [activeCampaign?.id, quickGroupType, quickGroupNum]);

  // Thao tác chọn từng thành viên
  const handleToggleSelectMember = (memberId) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleSelectAllMembers = () => {
    setSelectedMemberIds(new Set(availableMembers.map((m) => m.id)));
  };

  const handleDeselectAllMembers = () => {
    setSelectedMemberIds(new Set());
  };

  const handleMemberShiftChange = (memberId, shiftId) => {
    setMemberShifts((prev) => ({
      ...prev,
      [memberId]: shiftId,
    }));
  };

  const handleApplyBulkShift = (shiftId) => {
    setBulkShiftId(shiftId);
    setMemberShifts((prev) => {
      const next = { ...prev };
      availableMembers.forEach((m) => {
        if (selectedMemberIds.has(m.id)) {
          next[m.id] = shiftId;
        }
      });
      return next;
    });
  };

  // Thao tác Kíp trong modal Admin
  const handleAddShift = () => {
    const nextIdx = (formData.shifts || []).length + 1;
    setFormData((prev) => ({
      ...prev,
      shifts: [
        ...(prev.shifts || []),
        { id: `shift_${Date.now()}_${nextIdx}`, name: `Kíp ${nextIdx}`, time: '' },
      ],
    }));
  };

  const handleUpdateShift = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.shifts || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, shifts: updated };
    });
  };

  const handleRemoveShift = (index) => {
    setFormData((prev) => {
      const updated = (prev.shifts || []).filter((_, i) => i !== index);
      return { ...prev, shifts: updated };
    });
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.eventDate) {
      addToast('Vui lòng nhập tên hoạt động và ngày tổ chức!', 'warning');
      return;
    }

    const payload = {
      ...formData,
      points: Number(formData.points) || 0,
      requiredParticipants: Math.max(0, parseInt(formData.requiredParticipants, 10) || 0),
      requireConfirm: formData.requireConfirm ? 1 : 0,
    };

    try {
      if (editingCampaign) {
        const res = await api.updateCampaign(editingCampaign.id, payload);
        if (res.success) {
          addToast('Cập nhật hoạt động thành công!', 'success');
          setShowEditModal(false);
          loadCampaigns();
          if (activeCampaign?.id === editingCampaign.id) {
            setActiveCampaign((prev) => ({
              ...prev,
              ...payload,
              required_participants: payload.requiredParticipants,
              require_confirm: payload.requireConfirm,
            }));
          }
        }
      } else {
        const res = await api.createCampaign(payload);
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

  // Đăng ký cho các thành viên được chọn (kèm phân Kíp nếu có)
  const handleQuickGroupRegister = async (e) => {
    e.preventDefault();
    if (!activeCampaign) return;

    if (selectedMemberIds.size === 0) {
      addToast('Vui lòng chọn ít nhất 1 thành viên để đăng ký!', 'warning');
      return;
    }

    const shifts = getCampaignShifts(activeCampaign);
    const selectedMembersPayload = Array.from(selectedMemberIds).map((id) => {
      const shiftId = memberShifts[id] || (shifts[0]?.id || null);
      const shiftObj = shifts.find((s) => s.id === shiftId);
      return {
        memberId: id,
        shiftId: shiftObj?.id || null,
        shiftName: shiftObj?.name || null,
      };
    });

    setQuickRegisterLoading(true);
    try {
      const res = await api.registerCampaignGroup(activeCampaign.id, {
        memberType: quickGroupType,
        groupNum: Number(quickGroupNum),
        registeredBy: quickLeaderName.trim() || `Nhóm trưởng Nhóm ${quickGroupNum}`,
        selectedMembers: selectedMembersPayload,
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
        }
      } catch (err) {
        addToast('Lỗi khi hủy đăng ký', 'error');
      }
    }
  };

  // Bulk attendance selection & action handlers
  const handleToggleSelectReg = (id) => {
    setSelectedRegIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRegs = () => {
    const selectable = filteredRegs
      .filter((r) => canEditGroup(r.member_type, r.group_num))
      .map((r) => r.registration_id);
    if (selectable.length > 0 && selectable.every((id) => selectedRegIds.includes(id))) {
      setSelectedRegIds([]);
    } else {
      setSelectedRegIds(selectable);
    }
  };

  const handleBulkAttendance = async (status) => {
    if (!activeCampaign || selectedRegIds.length === 0) return;
    setBulkAttLoading(true);
    try {
      const res = await api.bulkUpdateCampaignAttendance(activeCampaign.id, selectedRegIds, status);
      if (res.success) {
        addToast(res.message, 'success');
        setSelectedRegIds([]);
        loadRegistrations(activeCampaign.id);
        loadCampaigns();
      } else {
        addToast(res.message || 'Lỗi điểm danh hàng loạt', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setBulkAttLoading(false);
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
    if (regShiftFilter !== 'all') {
      if (r.shift_id !== regShiftFilter && r.shift_name !== regShiftFilter) return false;
    }
    if (!regSearch) return true;
    const s = regSearch.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.mssv?.toLowerCase().includes(s) ||
      r.class_name?.toLowerCase().includes(s) ||
      (r.shift_name && r.shift_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in min-w-0">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md overflow-hidden">
        <div>
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-0.5 sm:py-1 rounded-md">
            Phân Hệ Hoạt Động & Sự Kiện
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold mt-1.5 sm:mt-2 tracking-tight">
            Quản Lý Hoạt Động, Đăng Ký & Điểm Danh Sự Kiện
          </h2>
          <p className="text-xs text-emerald-100 max-w-2xl mt-1 leading-relaxed hidden sm:block">
            Hỗ trợ Nhóm trưởng đăng ký hàng loạt 1-click cho cả nhóm, theo dõi danh sách đã và đang tiến hành,
            và điểm danh ghi nhận điểm hoạt động tự động vào hồ sơ nhân sự.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingCampaign(null);
              setFormData({
                name: '',
                description: '',
                location: '',
                eventDate: new Date().toISOString().split('T')[0],
                points: 10,
                requiredParticipants: 0,
                targetType: 'all',
                status: 'dang_mo_dang_ky',
                shifts: [],
                requireConfirm: false,
              });
              setShowEditModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 shadow-md transition-all self-start sm:self-center cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Tạo Hoạt Động Mới</span>
          </button>
        )}
      </div>

      {/* Main Content Layout: Activity List + Detail / Registration Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
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
                const shifts = getCampaignShifts(camp);
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(camp.status)}
                          {getTargetBadge(camp.target_type || camp.targetType)}
                          {Number(camp.require_confirm ?? camp.requireConfirm) === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              Check Confirm
                            </span>
                          )}
                          {shifts.length > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {shifts.length} kíp
                            </span>
                          )}
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
                        Đã ĐK: <b>{camp.registered_count || 0}</b>
                        {Number(camp.required_participants) > 0 && (
                          <span className="text-slate-500 font-medium">/ <b>{camp.required_participants}</b></span>
                        )}
                      </span>

                      <div className="flex items-center gap-2">
                        {Number(camp.required_participants) > 0 && (
                          (camp.missing_count ?? Math.max(0, camp.required_participants - (camp.registered_count || 0))) > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Thiếu {camp.missing_count ?? (camp.required_participants - (camp.registered_count || 0))}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đủ quân số
                            </span>
                          )
                        )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(activeCampaign.status)}
                  {getTargetBadge(activeCampaign.target_type || activeCampaign.targetType)}
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{activeCampaign.points}đ / lượt có mặt
                  </span>
                  {Number(activeCampaign.required_participants) > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                      (activeCampaign.missing_count ?? Math.max(0, activeCampaign.required_participants - (activeCampaign.registered_count || 0))) > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Chỉ tiêu: {activeCampaign.registered_count || 0} / {activeCampaign.required_participants}
                      {(activeCampaign.missing_count ?? Math.max(0, activeCampaign.required_participants - (activeCampaign.registered_count || 0))) > 0
                        ? ` (Thiếu ${activeCampaign.missing_count ?? (activeCampaign.required_participants - (activeCampaign.registered_count || 0))})`
                        : ' (Đủ quân số)'}
                    </span>
                  )}
                  {Number(activeCampaign.require_confirm ?? activeCampaign.requireConfirm) === 1 && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      Check Confirm (-20đ)
                    </span>
                  )}
                  {(() => {
                    const shifts = getCampaignShifts(activeCampaign);
                    if (shifts.length > 0) {
                      return (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          {shifts.length} Kíp ({shifts.map((s) => s.name).join(', ')})
                        </span>
                      );
                    }
                    return null;
                  })()}
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
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const cleanName = (activeCampaign.name || 'hoat_dong').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
                      await api.downloadFile(
                        `/api/campaigns/${activeCampaign.id}/export-xlsx`,
                        `Diem_danh_${cleanName}.xlsx`
                      );
                      addToast('Xuất file điểm danh hoạt động thành công!', 'success');
                    } catch (err) {
                      addToast(err.message || 'Lỗi khi xuất file Excel', 'error');
                    }
                  }}
                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer"
                  title="Xuất file Excel điểm danh hoạt động này (phân theo Kíp)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setEditingCampaign(activeCampaign);
                        setFormData({
                          name: activeCampaign.name,
                          description: activeCampaign.description || '',
                          location: activeCampaign.location || '',
                          eventDate: activeCampaign.event_date || activeCampaign.eventDate,
                          points: activeCampaign.points || 10,
                          requiredParticipants: activeCampaign.required_participants || activeCampaign.requiredParticipants || 0,
                          targetType: activeCampaign.target_type || activeCampaign.targetType || 'all',
                          status: activeCampaign.status || 'dang_mo_dang_ky',
                          shifts: getCampaignShifts(activeCampaign),
                          requireConfirm: Number(activeCampaign.require_confirm ?? activeCampaign.requireConfirm) === 1,
                        });
                        setShowEditModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
                      title="Chỉnh sửa thông tin hoạt động & Kíp"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(activeCampaign.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200 cursor-pointer"
                      title="Xóa hoạt động"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveCampaign(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation if require_confirm is enabled */}
            {Number(activeCampaign.require_confirm ?? activeCampaign.requireConfirm) === 1 && (
              <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2.5 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('registrations')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeDetailTab === 'registrations'
                      ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Đăng Ký & Điểm Danh ({filteredRegs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDetailTab('confirmations');
                    loadConfirmations(activeCampaign.id);
                  }}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeDetailTab === 'confirmations'
                      ? 'bg-white text-rose-700 border-rose-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Check Confirm TNV (-20đ)</span>
                  {confirmSummary.unconfirmedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                      {confirmSummary.unconfirmedCount} chưa
                    </span>
                  )}
                </button>
              </div>
            )}

            {activeDetailTab === 'confirmations' && Number(activeCampaign.require_confirm ?? activeCampaign.requireConfirm) === 1 ? (
              <div className="p-4 space-y-4 flex-1 flex flex-col">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">Tổng TNV hoạt động</span>
                    <span className="text-lg font-black text-slate-800">{confirmSummary.totalCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] font-semibold text-emerald-700 block">Đã Confirm</span>
                    <span className="text-lg font-black text-emerald-700">{confirmSummary.confirmedCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[11px] font-semibold text-amber-700 block">Chưa Confirm</span>
                    <span className="text-lg font-black text-amber-700">{confirmSummary.unconfirmedCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[11px] font-semibold text-rose-700 block">Đã phạt (-20đ)</span>
                    <span className="text-lg font-black text-rose-700">{confirmSummary.penalizedCount}</span>
                  </div>
                </div>

                {/* Filter & Finalize Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={confSearch}
                      onChange={(e) => setConfSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadConfirmations(activeCampaign.id, confGroupFilter, confSearch)}
                      placeholder="Tìm MSSV, tên TNV..."
                      className="text-xs bg-transparent border-none focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={confGroupFilter}
                      disabled={isLeader && user?.targetType === 'tnv'}
                      onChange={(e) => {
                        setConfGroupFilter(e.target.value);
                        loadConfirmations(activeCampaign.id, e.target.value, confSearch);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                    >
                      {isAdmin && <option value="all">Tất cả các nhóm TNV</option>}
                      {[1, 2, 3, 4].map((g) => (
                        <option key={g} value={g}>
                          Nhóm {g}
                        </option>
                      ))}
                    </select>

                    {/* Finalize Button */}
                    {(isAdmin || (isLeader && user?.targetType === 'tnv')) && (
                      <button
                        type="button"
                        onClick={() => setShowFinalizeModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all cursor-pointer"
                        title="Chốt danh sách xác nhận và tự động phạt -20 điểm đối với các thành viên không confirm"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Chốt danh sách xác nhận (-20đ)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Thanh công cụ Chọn nhanh & Thao tác tất cả (All Actions & Quick Selectors) */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                      Chọn nhanh:
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllConfVisible}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs"
                      title="Chọn tất cả thành viên có quyền quản lý trong danh sách này"
                    >
                      Chọn tất cả ({getSelectableConfMembers().length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllUnconfirmed}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                      title="Chọn nhanh toàn bộ các bạn chưa được confirm"
                    >
                      <span>Chọn chưa confirm</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                        {getSelectableConfMembers().filter((m) => Number(m.is_confirmed) !== 1).length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllConfirmed}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                      title="Chọn nhanh toàn bộ các bạn đã confirm"
                    >
                      <span>Chọn đã confirm</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                        {getSelectableConfMembers().filter((m) => Number(m.is_confirmed) === 1).length}
                      </span>
                    </button>
                  </div>

                  {/* Thao tác tất cả (All Actions) */}
                  {(isAdmin || (isLeader && user?.targetType === 'tnv')) && (
                    <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Thao tác tất cả:
                      </span>
                      <button
                        type="button"
                        disabled={batchProcessing}
                        onClick={() => handleAllToggleConfirm(true, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        title="Xác nhận ĐÃ CONFIRM cho toàn bộ các bạn chưa confirm trong danh sách này"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Xác nhận tất cả chưa confirm</span>
                      </button>
                      <button
                        type="button"
                        disabled={batchProcessing}
                        onClick={() => handleAllToggleConfirm(false, false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-[11px] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        title="Hủy xác nhận (đưa về Chưa confirm) cho toàn bộ thành viên trong danh sách này"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                        <span>Hủy xác nhận tất cả</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Thanh công cụ Thao tác nhiều khi đã chọn (Bulk Action Floating Bar) */}
                {selectedConfMemberIds.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-2 border-indigo-300 text-indigo-950 shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-indigo-600 text-white text-xs font-black">
                        {selectedConfMemberIds.length}
                      </span>
                      <span className="text-xs font-black text-indigo-900">
                        Đang chọn {selectedConfMemberIds.length} thành viên
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedConfMemberIds([])}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline font-semibold ml-1 cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={batchProcessing}
                        onClick={() => handleBatchToggleConfirm(selectedConfMemberIds, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title="Đánh dấu ĐÃ CONFIRM cho các thành viên đang được chọn"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Xác nhận đã confirm ({selectedConfMemberIds.length})</span>
                      </button>

                      <button
                        type="button"
                        disabled={batchProcessing}
                        onClick={() => handleBatchToggleConfirm(selectedConfMemberIds, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title="Đưa về CHƯA CONFIRM cho các thành viên đang được chọn"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Hủy xác nhận ({selectedConfMemberIds.length})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Table of Members with Multi-select Checkbox */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl flex-1 max-h-[440px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-10 font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        {/* Cột Checkbox Chọn tất cả (Select All) */}
                        <th className="p-2.5 pl-3 w-10 text-center">
                          <input
                            type="checkbox"
                            ref={(el) => {
                              if (el) {
                                const selectable = getSelectableConfMembers();
                                const isAll = selectable.length > 0 && selectable.every((m) => selectedConfMemberIds.includes(m.member_id));
                                const isSome = selectedConfMemberIds.length > 0 && !isAll;
                                el.indeterminate = isSome;
                              }
                            }}
                            checked={
                              getSelectableConfMembers().length > 0 &&
                              getSelectableConfMembers().every((m) => selectedConfMemberIds.includes(m.member_id)) &&
                              selectedConfMemberIds.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSelectAllConfVisible();
                              } else {
                                setSelectedConfMemberIds([]);
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                            title="Chọn tất cả / Bỏ chọn tất cả"
                          />
                        </th>
                        <th className="p-2.5 w-10">STT</th>
                        <th className="p-2.5">MSSV</th>
                        <th className="p-2.5">Họ và tên</th>
                        <th className="p-2.5 text-center">Lớp</th>
                        <th className="p-2.5 text-center">Nhóm</th>
                        <th className="p-2.5 text-center">Chức vụ</th>
                        <th className="p-2.5 text-center min-w-[130px]">Xác nhận tham gia</th>
                        <th className="p-2.5">Người xác nhận</th>
                        <th className="p-2.5 text-center pr-3">Trạng thái chốt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingConf ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400">
                            Đang tải danh sách xác nhận TNV...
                          </td>
                        </tr>
                      ) : confirmations.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400">
                            Không tìm thấy thành viên TNV nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        confirmations.map((m, idx) => {
                          const isConfirmed = Number(m.is_confirmed) === 1;
                          const isPenalized = Number(m.is_penalized) === 1;
                          const canEditThisMember = isAdmin || (isLeader && user?.targetType === 'tnv' && Number(user?.groupNum) === Number(m.group_num));
                          const isRowSelected = selectedConfMemberIds.includes(m.member_id);

                          return (
                            <tr
                              key={m.member_id}
                              className={`transition-colors ${
                                isRowSelected 
                                  ? 'bg-indigo-50/70 hover:bg-indigo-100/60' 
                                  : isConfirmed 
                                    ? 'bg-emerald-50/30 hover:bg-emerald-50/60' 
                                    : isPenalized 
                                      ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                                      : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Checkbox từng dòng (Row Select) */}
                              <td className="p-2.5 pl-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isRowSelected}
                                  disabled={!canEditThisMember}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedConfMemberIds((prev) => [...prev, m.member_id]);
                                    } else {
                                      setSelectedConfMemberIds((prev) => prev.filter((id) => id !== m.member_id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                                  title={canEditThisMember ? 'Chọn thành viên này' : 'Bạn không có quyền quản lý thành viên này'}
                                />
                              </td>
                              <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-mono font-semibold text-slate-700">{m.mssv}</td>
                              <td className="p-2.5 font-bold text-slate-900">
                                <div>{m.full_name}</div>
                                {m.phone && <div className="text-[10px] text-slate-400 font-mono">{m.phone}</div>}
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-600">{m.class_name || '-'}</td>
                              <td className="p-2.5 text-center font-bold text-slate-700">Nhóm {m.group_num}</td>
                              <td className="p-2.5 text-center font-medium">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {m.role || 'Thành viên'}
                                </span>
                              </td>

                              {/* Ô TICK ĐÃ CONFIRM TỪNG NGƯỜI */}
                              <td className="p-2.5 text-center">
                                {canEditThisMember ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleConfirm(m)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                      isConfirmed
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs hover:bg-emerald-700'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-600'
                                    }`}
                                    title={isConfirmed ? 'Bấm để hủy xác nhận' : 'Bấm để xác nhận Đã Confirm'}
                                  >
                                    {isConfirmed ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>Đã confirm</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="w-3.5 h-3.5 rounded border border-slate-400 inline-block"></span>
                                        <span>Chưa confirm</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                      isConfirmed
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}
                                  >
                                    {isConfirmed ? '✓ Đã confirm' : 'Chưa confirm'}
                                  </span>
                                )}
                              </td>

                              <td className="p-2.5 text-slate-600 text-[11px]">
                                {m.confirmed_by ? (
                                  <div>
                                    <span className="font-semibold text-slate-800">{m.confirmed_by}</span>
                                    {m.confirmed_at && (
                                      <div className="text-[10px] text-slate-400">
                                        {new Date(m.confirmed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                        {new Date(m.confirmed_at).toLocaleDateString('vi-VN')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              <td className="p-2.5 text-center pr-3">
                                {isPenalized ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    Đã phạt -20đ
                                  </span>
                                ) : isConfirmed ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Hợp lệ
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Chưa chốt</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* DÀNH CHO NHÓM TRƯỞNG & BCN: Đăng ký thành viên chọn lọc & Phân Kíp */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-b border-emerald-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Đăng ký tham gia cho thành viên trong nhóm</span>
                </div>
                {getCampaignShifts(activeCampaign).length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Hoạt động có phân Kíp trực
                  </span>
                )}
              </div>

              {isGuest ? (
                <div className="p-3 bg-white/90 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Đăng nhập với vai trò <b>Nhóm trưởng</b> hoặc <b>Ban Chủ Nhiệm</b> để đăng ký danh sách nhóm tham gia hoạt động này.</span>
                  </div>
                  <button
                    onClick={openLoginModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Đăng Nhập</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleQuickGroupRegister} className="space-y-2.5 text-xs">
                  {/* Nhóm & Người Đăng Ký */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-4">
                      {isLeader ? (
                        <input
                          type="text"
                          readOnly
                          value={quickGroupType === 'ctv' ? 'Cộng Tác Viên (CTV)' : 'Tình Nguyện Viên (TNV)'}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-700 cursor-not-allowed"
                        />
                      ) : (
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
                      )}
                    </div>

                    <div className="sm:col-span-3">
                      {isLeader ? (
                        <input
                          type="text"
                          readOnly
                          value={`Nhóm ${quickGroupNum}`}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-700 cursor-not-allowed"
                        />
                      ) : (
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
                      )}
                    </div>

                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={quickLeaderName}
                        onChange={(e) => setQuickLeaderName(e.target.value)}
                        placeholder="Tên người đăng ký..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Danh Sách Thành Viên & Chọn Từng Người */}
                  {loadingMembers ? (
                    <div className="p-3 text-center text-slate-500 bg-white/70 rounded-xl border border-emerald-100">
                      Đang tải danh sách thành viên nhóm {quickGroupNum}...
                    </div>
                  ) : availableMembers.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 bg-white/70 rounded-xl border border-emerald-100">
                      Chưa có thành viên nào trong nhóm này.
                    </div>
                  ) : (
                    <div className="bg-white/90 border border-emerald-200 rounded-xl p-2.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllMembers}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                          >
                            Chọn tất cả
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllMembers}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                          <span className="text-[11px] font-semibold text-slate-600">
                            Đã chọn: <b className="text-emerald-700">{selectedMemberIds.size}</b>/{availableMembers.length}
                          </span>
                        </div>

                        {/* Gán nhanh Kíp cho toàn bộ thành viên đang chọn */}
                        {getCampaignShifts(activeCampaign).length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-600 hidden sm:inline">Gán nhanh Kíp:</span>
                            <select
                              value={bulkShiftId}
                              onChange={(e) => handleApplyBulkShift(e.target.value)}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 focus:outline-none"
                            >
                              <option value="">-- Chọn Kíp áp dụng --</option>
                              {getCampaignShifts(activeCampaign).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.time ? `(${s.time})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Danh sách cuộn chọn từng thành viên */}
                      <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                        {availableMembers.map((m) => {
                          const isChecked = selectedMemberIds.has(m.id);
                          const shifts = getCampaignShifts(activeCampaign);
                          const curShiftId = memberShifts[m.id] || (shifts[0]?.id || '');

                          return (
                            <div
                              key={m.id}
                              className={`pt-1.5 first:pt-0 flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors ${
                                isChecked ? 'bg-emerald-50/60' : 'hover:bg-slate-50 opacity-70'
                              }`}
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelectMember(m.id)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                />
                                <div className="truncate">
                                  <span className="font-bold text-slate-800 text-xs">{m.full_name}</span>
                                  <span className="text-[11px] text-slate-500 ml-1.5 font-mono">
                                    ({m.mssv} {m.class_name ? `· ${m.class_name}` : ''})
                                  </span>
                                </div>
                              </label>

                              {/* Dropdown chọn Kíp riêng cho thành viên */}
                              {shifts.length > 0 && (
                                <div className="shrink-0">
                                  <select
                                    disabled={!isChecked}
                                    value={curShiftId}
                                    onChange={(e) => handleMemberShiftChange(m.id, e.target.value)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                                      isChecked
                                        ? 'bg-white border-amber-300 text-amber-900'
                                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {shifts.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Nút Submit Đăng Ký */}
                      <div className="pt-2 border-t border-emerald-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {selectedMemberIds.size === 0
                            ? 'Vui lòng tích chọn ít nhất 1 thành viên.'
                            : `Sẽ đăng ký cho ${selectedMemberIds.size} thành viên được chọn.`}
                        </span>
                        <button
                          type="submit"
                          disabled={quickRegisterLoading || selectedMemberIds.size === 0}
                          className="inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 shadow-sm transition-all text-xs cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>
                            {quickRegisterLoading
                              ? 'Đang gửi...'
                              : `Đăng ký (${selectedMemberIds.size} thành viên)`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
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
                  {getCampaignShifts(activeCampaign).length > 0 && (
                    <select
                      value={regShiftFilter}
                      onChange={(e) => setRegShiftFilter(e.target.value)}
                      className="px-2 py-1 text-xs border rounded-lg bg-amber-50 text-amber-900 border-amber-300 font-medium"
                    >
                      <option value="all">Tất cả Kíp</option>
                      {getCampaignShifts(activeCampaign).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Floating Bulk Attendance Action Bar */}
              {selectedRegIds.length > 0 && (
                <div className="p-2.5 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-md animate-fade-in border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                      {selectedRegIds.length}
                    </span>
                    <span className="font-medium text-slate-200">thành viên đang chọn. Điểm danh hàng loạt:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      disabled={bulkAttLoading}
                      onClick={() => handleBulkAttendance('co_mat')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold transition-colors cursor-pointer text-xs flex items-center gap-1"
                    >
                      <span>✓ Có mặt (+{activeCampaign.points}đ)</span>
                    </button>
                    <button
                      type="button"
                      disabled={bulkAttLoading}
                      onClick={() => handleBulkAttendance('vang')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white font-bold transition-colors cursor-pointer text-xs flex items-center gap-1"
                    >
                      <span>✕ Vắng mặt</span>
                    </button>
                    <button
                      type="button"
                      disabled={bulkAttLoading}
                      onClick={() => handleBulkAttendance('chua_diem_danh')}
                      className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-200 transition-colors cursor-pointer text-xs"
                    >
                      <span>Đặt lại: Chưa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRegIds([])}
                      className="text-slate-400 hover:text-white px-2 py-1 text-[11px] underline cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl flex-1 max-h-[420px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 pl-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredRegs.filter((r) => canEditGroup(r.member_type, r.group_num)).length > 0 &&
                            filteredRegs
                              .filter((r) => canEditGroup(r.member_type, r.group_num))
                              .every((r) => selectedRegIds.includes(r.registration_id))
                          }
                          onChange={handleSelectAllRegs}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          title="Chọn tất cả thành viên có quyền sửa"
                        />
                      </th>
                      <th className="p-2.5">STT</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">MSSV</th>
                      <th className="p-2.5 text-center">Lớp</th>
                      <th className="p-2.5 text-center">Đối tượng</th>
                      <th className="p-2.5 text-center">Nhóm</th>
                      <th className="p-2.5 text-center">Kíp / Ca</th>
                      <th className="p-2.5 text-center min-w-[170px]">Điểm danh hoạt động</th>
                      <th className="p-2.5 pr-3 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingRegs ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          Đang tải danh sách đăng ký...
                        </td>
                      </tr>
                    ) : filteredRegs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          Chưa có thành viên nào đăng ký tham gia.
                        </td>
                      </tr>
                    ) : (
                      filteredRegs.map((r, idx) => {
                        const isAttended = r.attendance_status === 'co_mat';
                        const isAbsent = r.attendance_status === 'vang';
                        const isSelectedRow = selectedRegIds.includes(r.registration_id);

                        return (
                          <tr key={r.registration_id} className={`hover:bg-slate-50 transition-colors ${isSelectedRow ? 'bg-emerald-50/50' : ''}`}>
                            <td className="p-2.5 pl-3">
                              {canEditGroup(r.member_type, r.group_num) ? (
                                <input
                                  type="checkbox"
                                  checked={isSelectedRow}
                                  onChange={() => handleToggleSelectReg(r.registration_id)}
                                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
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
                            <td className="p-2.5 text-center font-medium">
                              {r.shift_name ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  {r.shift_name}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">-</span>
                              )}
                            </td>

                            {/* Direct Attendance Action Buttons */}
                            <td className="p-2.5 text-center">
                              {canEditGroup(r.member_type, r.group_num) ? (
                                <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                                  <button
                                    onClick={() => handleMarkAttendance(r.registration_id, 'co_mat')}
                                    title="Đánh dấu Có mặt (+ điểm tự động)"
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
                                    className={`px-1.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                                      !isAttended && !isAbsent
                                        ? 'bg-slate-400 text-white font-bold'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                  >
                                    Chưa
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                    isAttended
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : isAbsent
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}
                                >
                                  {isAttended ? '✓ Có mặt' : isAbsent ? '✕ Vắng' : 'Chưa điểm danh'}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 pr-3 text-right">
                              {canEditGroup(r.member_type, r.group_num) ? (
                                <button
                                  onClick={() => handleDeleteRegistration(r.registration_id)}
                                  title="Hủy đăng ký"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
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
      {showEditModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col my-auto">
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

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chỉ tiêu cần tuyển (Số lượng)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.requiredParticipants ?? 0}
                    onChange={(e) => setFormData({ ...formData, requiredParticipants: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    placeholder="0: Không giới hạn"
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">0: Không giới hạn quân số</span>
                </div>
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

              {/* Cấu hình Check Confirm */}
              <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="requireConfirmCheckbox"
                  checked={!!formData.requireConfirm}
                  onChange={(e) => setFormData({ ...formData, requireConfirm: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-300 cursor-pointer"
                />
                <label htmlFor="requireConfirmCheckbox" className="cursor-pointer select-none">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Bật yêu cầu Check Confirm (Tất cả TNV phải xác nhận)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Khi bật, hệ thống sẽ mở bảng Check Confirm. Thành viên TNV không xác nhận khi chốt danh sách sẽ tự động bị trừ 20 điểm (-20đ).
                  </span>
                </label>
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

              {/* Cấu hình Kíp / Ca hoạt động */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-700">
                      Phân chia Kíp / Ca hoạt động (Tùy chọn)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Nếu hoạt động chia nhiều ca trực, thêm các Kíp tại đây
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddShift}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Thêm Kíp
                  </button>
                </div>

                {(!formData.shifts || formData.shifts.length === 0) ? (
                  <div className="p-2.5 text-center text-[11px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Chưa thiết lập kíp (Áp dụng chung cho cả buổi). Bấm "+ Thêm Kíp" nếu cần chia ca.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {formData.shifts.map((shift, idx) => (
                      <div key={shift.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          value={shift.name || ''}
                          onChange={(e) => handleUpdateShift(idx, 'name', e.target.value)}
                          placeholder={`VD: Kíp ${idx + 1}`}
                          className="w-1/2 px-2 py-1 bg-white border rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                        <input
                          type="text"
                          value={shift.time || ''}
                          onChange={(e) => handleUpdateShift(idx, 'time', e.target.value)}
                          placeholder="VD: 07:30 - 11:30"
                          className="w-1/2 px-2 py-1 bg-white border rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveShift(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa kíp này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
        </div>,
        document.body
      )}

      {/* Delete Campaign Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        isDanger={true}
        title="Xóa Hoạt Động"
        message="Bạn có chắc chắn muốn xóa hoạt động này? Toàn bộ danh sách đăng ký và điểm danh sẽ bị xóa, và toàn bộ điểm số đã cộng trước đó sẽ được hệ thống tự động hoàn tác/thu hồi an toàn cho nhân sự."
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

      {/* Finalize Confirmations Modal */}
      <ConfirmModal
        isOpen={showFinalizeModal}
        isDanger={true}
        title="Chốt Danh Sách Xác Nhận & Trừ Điểm Kỷ Luật"
        message={`Bạn đang chuẩn bị chốt danh sách xác nhận cho ${
          isLeader && user?.targetType === 'tnv'
            ? `Nhóm ${user.groupNum}`
            : (confGroupFilter !== 'all' ? `Nhóm ${confGroupFilter}` : 'TẤT CẢ CÁC NHÓM TNV')
        }.\n\nCẢNH BÁO: TẤT CẢ các thành viên TNV CHƯA ĐƯỢC TICK "Đã confirm" sẽ tự động bị TRỪ 20 ĐIỂM (-20đ) vào hồ sơ cá nhân và ghi log kỷ luật.\n\nBạn có chắc chắn muốn chốt danh sách xác nhận ngay bây giờ?`}
        confirmText={finalizing ? 'Đang xử lý...' : 'Chốt & Trừ 20 điểm'}
        cancelText="Hủy bỏ"
        onConfirm={handleFinalizeConfirm}
        onCancel={() => setShowFinalizeModal(false)}
      />
    </div>
  );
}

