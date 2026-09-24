import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Shield, Users, Eye, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth();
  const [tab, setTab] = useState('guest'); // 'guest' | 'leader' | 'admin'

  // Form Nhóm trưởng
  const [leaderType, setLeaderType] = useState('ctv'); // 'ctv' | 'tnv'
  const [groupNum, setGroupNum] = useState(1);
  const [leaderPassword, setLeaderPassword] = useState('');

  // Form Admin
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login({ loginType: 'guest' });
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!leaderPassword.trim()) {
      setError('Vui lòng nhập mật khẩu của nhóm!');
      return;
    }
    setLoading(true);
    try {
      const res = await login({
        loginType: 'leader',
        targetType: leaderType,
        groupNum: Number(groupNum),
        password: leaderPassword.trim(),
      });
      if (!res.success) {
        setError(res.message || 'Mật khẩu không chính xác!');
      }
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!adminPassword.trim()) {
      setError('Vui lòng nhập mật khẩu Ban Quản Trị!');
      return;
    }
    setLoading(true);
    try {
      const res = await login({
        loginType: 'admin',
        password: adminPassword.trim(),
      });
      if (!res.success) {
        setError(res.message || 'Mật khẩu Admin không chính xác!');
      }
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md sm:max-w-lg overflow-hidden flex flex-col max-h-[92vh] transition-all transform scale-100">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Xác Thực & Phân Quyền</h3>
              <p className="text-xs text-blue-100/90 font-medium">Hệ thống Quản lý CTV & TNV</p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Navigation Bar (Dạng Navigation Thanh Điều Hướng Đa Vai Trò) */}
        <nav className="flex border-b border-slate-200 bg-slate-50/90 p-1 sm:p-1.5 gap-1 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { setTab('guest'); setError(''); }}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
              tab === 'guest'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 font-bold ring-1 ring-blue-500/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <Eye className={`w-4 h-4 shrink-0 ${tab === 'guest' ? 'text-blue-600' : 'text-slate-400'}`} />
            <div className="text-center sm:text-left leading-tight">
              <span className="block whitespace-nowrap">Khách Xem</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:block">Chỉ xem dữ liệu</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setTab('leader'); setError(''); }}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
              tab === 'leader'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/90 font-bold ring-1 ring-indigo-500/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 ${tab === 'leader' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <div className="text-center sm:text-left leading-tight">
              <span className="block whitespace-nowrap">Nhóm Trưởng</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:block">Quản lý nhóm</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setTab('admin'); setError(''); }}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
              tab === 'admin'
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200/90 font-bold ring-1 ring-purple-500/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <Shield className={`w-4 h-4 shrink-0 ${tab === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
            <div className="text-center sm:text-left leading-tight">
              <span className="block whitespace-nowrap">Quản Trị BCN</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:block">Toàn quyền Admin</span>
            </div>
          </button>
        </nav>

        {/* Body Form */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CHẾ ĐỘ XEM (KHÁCH) */}
          {tab === 'guest' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                <Eye className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">Chế Độ Xem (Dành Cho Thành Viên & Khách)</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Xem toàn bộ danh sách thành viên, bảng điểm danh 19 tuần, tiến độ hoạt động và Top 5 vinh danh. Không cần mật khẩu.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Xem điểm thi đua và lịch họp/trực
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Xuất file báo cáo Excel/CSV
                </div>
                <div className="flex items-center gap-2 text-rose-600">
                  <Lock className="w-4 h-4" /> Không thể thêm, sửa, xóa, hoặc điểm danh
                </div>
              </div>

              <button
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {loading ? 'Đang vào...' : 'Vào Xem Thông Tin Ngay'}
              </button>
            </div>
          )}

          {/* TAB 2: NHÓM TRƯỞNG */}
          {tab === 'leader' && (
            <form onSubmit={handleLeaderLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Đối tượng quản lý:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setLeaderType('ctv'); setGroupNum(1); }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      leaderType === 'ctv'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cộng Tác Viên (8 Nhóm)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLeaderType('tnv'); setGroupNum(1); }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      leaderType === 'tnv'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tình Nguyện Viên (4 Nhóm)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Chọn nhóm của bạn:
                </label>
                <select
                  value={groupNum}
                  onChange={(e) => setGroupNum(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {Array.from({ length: leaderType === 'ctv' ? 8 : 4 }, (_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Nhóm {idx + 1} ({leaderType.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  3. Mật khẩu nhóm:
                </label>
                <input
                  type="password"
                  placeholder={`Nhập mật khẩu Nhóm ${groupNum}...`}
                  value={leaderPassword}
                  onChange={(e) => setLeaderPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  💡 Mật khẩu mặc định: <span className="font-mono text-indigo-600 font-medium">{leaderType}{groupNum}@123</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? 'Đang xác thực...' : `Đăng Nhập Nhóm trưởng Nhóm ${groupNum}`}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BAN QUẢN TRỊ (ADMIN) */}
          {tab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="text-center py-1">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Quyền Hạn Toàn Bộ Hệ Thống (Master)</h4>
                <p className="text-xs text-slate-500 mt-0.5">Dành cho Trưởng ban / Ban Chủ Nhiệm Đoàn Hội</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu Quản trị viên (Admin):
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu Admin..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  💡 Mật khẩu mặc định: <span className="font-mono text-purple-600 font-medium">admin123</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? 'Đang xác thực...' : 'Đăng Nhập Ban Quản Trị'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

