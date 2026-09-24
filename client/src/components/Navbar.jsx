import React from 'react';
import {
  Users,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  Database,
  Sparkles,
  Lock,
  LogOut,
  Key,
  Shield,
  Crown,
  Eye,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { useToast } from './common/Toast';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onRefresh, stats }) {
  const { addToast } = useToast();
  const {
    user,
    isAdmin,
    isGuest,
    isLeader,
    openLoginModal,
    openPasswordModal,
    logout
  } = useAuth();

  const handleResetData = async () => {
    if (window.confirm('Bạn có chắc chắn muốn nạp lại dữ liệu mẫu tiếng Việt ban đầu không? Mọi thay đổi hiện tại sẽ được làm mới.')) {
      try {
        const res = await api.resetSeed();
        if (res.success) {
          addToast('Đã nạp lại dữ liệu mẫu thành công!', 'success');
          onRefresh();
        }
      } catch (err) {
        addToast('Lỗi khi nạp lại dữ liệu', 'error');
      }
    }
  };

  const handleLogout = () => {
    logout();
    addToast('Đã chuyển về chế độ Khách (Chỉ xem)', 'info');
    onRefresh();
  };

  return (
    <>
      {/* ==================================================== */}
      {/* 1. TOP STICKY HEADER (Tối ưu hóa cả Desktop & Mobile) */}
      {/* ==================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo & App Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                  QUẢN LÝ NHÂN SỰ
                </h1>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 hidden sm:block">
                  Hệ thống Quản lý Cộng Tác Viên & Tình Nguyện Viên
                </p>
                <p className="text-[10px] font-semibold text-blue-600 sm:hidden">
                  CTV & Tình Nguyện Viên
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Ẩn trên điện thoại để chống tràn viền) */}
            <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab('ctv')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  activeTab === 'ctv'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Cộng Tác Viên (CTV)</span>
                {stats?.ctvCount !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeTab === 'ctv' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {stats.ctvCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tnv')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  activeTab === 'tnv'
                    ? 'bg-white text-rose-700 shadow-sm shadow-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Tình Nguyện Viên (TNV)</span>
                {stats?.tnvCount !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeTab === 'tnv' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {stats.tnvCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  activeTab === 'campaigns'
                    ? 'bg-white text-emerald-700 shadow-sm shadow-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Hoạt Động & Sự Kiện</span>
                {stats?.campaignCount !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeTab === 'campaigns' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {stats.campaignCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Quick Actions & Role Info (Thu gọn thông minh trên điện thoại) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Guest State */}
              {isGuest && (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all cursor-pointer"
                  title="Nhấn để chọn vai trò đăng nhập"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đăng Nhập</span>
                </button>
              )}

              {/* Leader State */}
              {isLeader && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={openLoginModal}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                    title="Bấm để đổi vai trò / nhóm quản lý"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      NT Nhóm {user.groupNum} ({user.targetType?.toUpperCase()})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    title="Đăng xuất về chế độ Khách"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Admin State */}
              {isAdmin && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={openLoginModal}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-black text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                    title="Vai trò: Ban Chủ Nhiệm (Admin)"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={openPasswordModal}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-purple-700 bg-purple-100/80 hover:bg-purple-200 border border-purple-300 transition-colors shadow-2xs cursor-pointer"
                    title="Xem và cấp lại mật khẩu cho các nhóm"
                  >
                    <Key className="w-3.5 h-3.5 text-purple-600" />
                    <span>Cấp Lại MK</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    title="Đăng xuất về chế độ Khách"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Nút Làm Mới */}
              <button
                type="button"
                onClick={onRefresh}
                title="Làm mới dữ liệu toàn hệ thống"
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200/80 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetData}
                  title="Khôi phục dữ liệu mẫu ban đầu"
                  className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nạp lại mẫu</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. MOBILE BOTTOM NAVIGATION (Thanh Điều Hướng Di Động) */}
      {/* ==================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around">
        {/* Tab 1: CTV */}
        <button
          type="button"
          onClick={() => setActiveTab('ctv')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'ctv'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'ctv' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">Cộng Tác Viên</span>
          {stats?.ctvCount !== undefined && (
            <span className="absolute top-0.5 right-3 text-[9px] px-1 rounded-full font-bold bg-blue-100 text-blue-700">
              {stats.ctvCount}
            </span>
          )}
        </button>

        {/* Tab 2: TNV */}
        <button
          type="button"
          onClick={() => setActiveTab('tnv')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'tnv'
              ? 'text-rose-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'tnv' ? 'bg-rose-50 text-rose-600' : ''}`}>
            <HeartHandshake className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">Tình Nguyện Viên</span>
          {stats?.tnvCount !== undefined && (
            <span className="absolute top-0.5 right-3 text-[9px] px-1 rounded-full font-bold bg-rose-100 text-rose-700">
              {stats.tnvCount}
            </span>
          )}
        </button>

        {/* Tab 3: Hoạt Động */}
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'campaigns'
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'campaigns' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">Hoạt Động</span>
          {stats?.campaignCount !== undefined && (
            <span className="absolute top-0.5 right-3 text-[9px] px-1 rounded-full font-bold bg-emerald-100 text-emerald-700">
              {stats.campaignCount}
            </span>
          )}
        </button>

        {/* Tab 4: Vai Trò / Đăng Nhập */}
        <button
          type="button"
          onClick={openLoginModal}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer relative"
          title="Chọn vai trò / Đăng nhập"
        >
          <div className="p-1 rounded-lg bg-slate-100 text-slate-700">
            {isAdmin ? (
              <Shield className="w-4 h-4 text-purple-600" />
            ) : isLeader ? (
              <Crown className="w-4 h-4 text-amber-500" />
            ) : (
              <Eye className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-semibold text-slate-700 truncate max-w-[70px]">
            {isGuest ? 'Vai Trò' : isAdmin ? 'Admin' : `Nhóm ${user.groupNum}`}
          </span>
        </button>
      </nav>
    </>
  );
}
