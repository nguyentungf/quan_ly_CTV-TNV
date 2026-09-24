import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

export default function TnvMemberModal({
  isOpen,
  onClose,
  onSuccess,
  editingMember = null,
}) {
  const { addToast } = useToast();
  const { user, isLeader } = useAuth();
  const [formData, setFormData] = useState({
    mssv: '',
    fullName: '',
    groupNum: 1,
    role: 'Thành viên',
    gender: 'Nam',
    className: '',
    phone: '',
    email: '',
    status: 'Đang hoạt động',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingMember) {
      setFormData({
        mssv: editingMember.mssv || '',
        fullName: editingMember.full_name || editingMember.fullName || '',
        groupNum: editingMember.group_num || editingMember.groupNum || 1,
        role: editingMember.role || 'Thành viên',
        gender: editingMember.gender || 'Nam',
        className: editingMember.class_name || editingMember.className || '',
        phone: editingMember.phone || '',
        email: editingMember.email || '',
        status: editingMember.status || 'Đang hoạt động',
      });
    } else {
      const defaultGroup = (isLeader && user?.targetType === 'tnv' && user?.groupNum) ? Number(user.groupNum) : 1;
      setFormData({
        mssv: '',
        fullName: '',
        groupNum: defaultGroup,
        role: 'Thành viên',
        gender: 'Nam',
        className: '',
        phone: '',
        email: '',
        status: 'Đang hoạt động',
      });
    }
  }, [editingMember, isOpen, isLeader, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mssv.trim() || !formData.fullName.trim()) {
      addToast('Vui lòng điền MSSV và Họ và tên!', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (editingMember) {
        const res = await api.updateTnvMember(editingMember.id, formData);
        if (res.success) {
          addToast('Cập nhật thông tin TNV thành công!', 'success');
          onSuccess();
          onClose();
        } else {
          addToast(res.message || 'Lỗi khi cập nhật TNV', 'error');
        }
      } else {
        const res = await api.createTnvMember(formData);
        if (res.success) {
          addToast('Thêm mới TNV thành công!', 'success');
          onSuccess();
          onClose();
        } else {
          addToast(res.message || 'Lỗi khi thêm mới TNV', 'error');
        }
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {editingMember ? 'Chỉnh Sửa Thông Tin TNV' : 'Thêm Mới Tình Nguyện Viên'}
              </h3>
              <p className="text-xs text-slate-500">Thuộc 4 nhóm hoạt động nòng cốt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                MSSV / Mã định danh <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={!!editingMember}
                value={formData.mssv}
                onChange={(e) => setFormData({ ...formData, mssv: e.target.value })}
                placeholder="VD: 20235001"
                className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                  editingMember ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'border-slate-300'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="VD: Lê Khánh Huyền"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nhóm TNV (1 - 4) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.groupNum}
                disabled={isLeader}
                onChange={(e) => setFormData({ ...formData, groupNum: Number(e.target.value) })}
                className={`w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white ${
                  isLeader ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
                }`}
              >
                {[1, 2, 3, 4].map((g) => (
                  <option key={g} value={g}>
                    Nhóm {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chức vụ <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
              >
                <option value="Nhóm trưởng">Nhóm trưởng</option>
                <option value="Nhóm phó">Nhóm phó</option>
                <option value="Thành viên">Thành viên</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giới tính
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lớp sinh viên
              </label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="VD: ET1 - 04"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0981xxxxxx"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email trường / cá nhân
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="VD: huyen.lk@gmail.com"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Trạng thái hoạt động
            </label>
            <div className="flex items-center gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Đang hoạt động"
                  checked={formData.status === 'Đang hoạt động'}
                  onChange={() => setFormData({ ...formData, status: 'Đang hoạt động' })}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Đang hoạt động
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Tạm dừng"
                  checked={formData.status === 'Tạm dừng'}
                  onChange={() => setFormData({ ...formData, status: 'Tạm dừng' })}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Tạm dừng
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'Lưu thông tin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
