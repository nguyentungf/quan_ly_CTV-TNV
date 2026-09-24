import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { X, Key, Shield, Copy, Check, RotateCcw, Save, AlertCircle, Sparkles } from 'lucide-react';

export default function PasswordManagerModal() {
  const { isPasswordModalOpen, closePasswordModal, isAdmin } = useAuth();
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Trạng thái chỉnh sửa trực tiếp từng dòng
  const [editingId, setEditingId] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const loadPasswords = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getPasswords();
      if (res.success) {
        setPasswords(res.data || []);
      } else {
        setError(res.message || 'Lỗi tải mật khẩu');
      }
    } catch (err) {
      setError(err.message || 'Lỗi tải mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPasswordModalOpen && isAdmin) {
      loadPasswords();
    }
  }, [isPasswordModalOpen, isAdmin]);

  if (!isPasswordModalOpen || !isAdmin) return null;

  const handleSavePassword = async (item) => {
    if (!newPasswordVal.trim()) {
      alert('Vui lòng nhập mật khẩu mới!');
      return;
    }
    try {
      const res = await api.resetPassword({
        targetType: item.target_type,
        groupNum: item.group_num,
        newPassword: newPasswordVal.trim(),
      });
      if (res.success) {
        setSuccessMsg(res.message);
        setEditingId(null);
        setNewPasswordVal('');
        await loadPasswords();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(res.message || 'Lỗi cập nhật mật khẩu');
      }
    } catch (e) {
      alert(e.message || 'Lỗi cập nhật mật khẩu');
    }
  };

  const handleCopy = (item) => {
    const text = `🔑 THÔNG TIN ĐĂNG NHẬP HỆ THỐNG:\n- Vai trò: ${item.display_name}\n- Mật khẩu: ${item.password}\n👉 Đăng nhập tại website quản lý CTV & TNV.`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResetAllDefault = async () => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục toàn bộ mật khẩu về mặc định (admin123, ctv{g}@123, tnv{g}@123)?')) {
      return;
    }
    try {
      const res = await api.resetAllDefaultPasswords();
      if (res.success) {
        setSuccessMsg('Đã đặt lại toàn bộ mật khẩu về mặc định thành công!');
        await loadPasswords();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const ctvList = passwords.filter((p) => p.target_type === 'ctv');
  const tnvList = passwords.filter((p) => p.target_type === 'tnv');
  const adminItem = passwords.find((p) => p.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 px-6 py-4 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cấp Lại & Quản Lý Mật Khẩu</h3>
              <p className="text-xs text-purple-200">Dành riêng cho Ban Chủ Nhiệm (Admin)</p>
            </div>
          </div>
          <button
            onClick={closePasswordModal}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo */}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Nội dung bảng mật khẩu cuộn được */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {/* MẬT KHẨU ADMIN */}
          {adminItem && (
            <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                    Mật Khẩu Ban Quản Trị (Master Admin)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-100">
                <span className="text-xs font-medium text-slate-500 min-w-[120px]">Mật khẩu hiện tại:</span>
                {editingId === adminItem.id ? (
                  <div className="flex items-center gap-2 flex-grow">
                    <input
                      type="text"
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
                      placeholder="Nhập mật khẩu Admin mới..."
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono flex-grow"
                    />
                    <button
                      onClick={() => handleSavePassword(adminItem)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1.5 text-slate-500 text-xs hover:bg-slate-100 rounded-lg"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-grow">
                    <span className="font-mono text-sm font-bold text-purple-900 bg-purple-100/60 px-3 py-1 rounded-lg">
                      {adminItem.password}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(adminItem.id);
                          setNewPasswordVal(adminItem.password);
                        }}
                        className="text-xs text-purple-700 hover:text-purple-900 font-semibold px-2.5 py-1 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        Đổi mật khẩu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8 NHÓM CỘNG TÁC VIÊN */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Mật Khẩu 8 Nhóm Trưởng Cộng Tác Viên (CTV)
              </h4>
              <span className="text-[11px] text-slate-400">Bấm "Cấp lại" hoặc "Sao chép" gửi Zalo</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {ctvList.map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-50/80 flex items-center justify-between text-xs transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg min-w-[70px] text-center">
                      Nhóm {item.group_num}
                    </span>
                    <span className="font-medium text-slate-700">{item.display_name}</span>
                  </div>

                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPasswordVal}
                        onChange={(e) => setNewPasswordVal(e.target.value)}
                        placeholder="Mật khẩu mới..."
                        className="px-2.5 py-1 text-xs bg-white border border-blue-300 rounded-lg font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => handleSavePassword(item)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        title="Lưu mật khẩu mới"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.password}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setNewPasswordVal(item.password);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 hover:bg-blue-50 rounded-lg"
                      >
                        Cấp lại
                      </button>
                      <button
                        onClick={() => handleCopy(item)}
                        className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-indigo-600 px-2 py-1 hover:bg-slate-100 rounded-lg border border-slate-200"
                        title="Sao chép để gửi cho Nhóm trưởng"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy gửi Zalo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4 NHÓM TÌNH NGUYỆN VIÊN */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Mật Khẩu 4 Nhóm Trưởng Tình Nguyện Viên (TNV)
              </h4>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {tnvList.map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-50/80 flex items-center justify-between text-xs transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg min-w-[70px] text-center">
                      Nhóm {item.group_num}
                    </span>
                    <span className="font-medium text-slate-700">{item.display_name}</span>
                  </div>

                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPasswordVal}
                        onChange={(e) => setNewPasswordVal(e.target.value)}
                        placeholder="Mật khẩu mới..."
                        className="px-2.5 py-1 text-xs bg-white border border-emerald-300 rounded-lg font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => handleSavePassword(item)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                        title="Lưu mật khẩu mới"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.password}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setNewPasswordVal(item.password);
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold px-2 py-1 hover:bg-emerald-50 rounded-lg"
                      >
                        Cấp lại
                      </button>
                      <button
                        onClick={() => handleCopy(item)}
                        className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-indigo-600 px-2 py-1 hover:bg-slate-100 rounded-lg border border-slate-200"
                        title="Sao chép để gửi cho Nhóm trưởng"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy gửi Zalo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleResetAllDefault}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-medium px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục tất cả về mặc định
          </button>
          <button
            onClick={closePasswordModal}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
