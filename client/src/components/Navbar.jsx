import React from 'react';
import { Users, HeartHandshake, RefreshCw, ShieldCheck, Database, Sparkles } from 'lucide-react';
import { api } from '../api';
import { useToast } from './common/Toast';

export default function Navbar({ activeTab, setActiveTab, onRefresh, stats }) {
  const { addToast } = useToast();

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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                QUẢN LÝ NHÂN SỰ
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Hệ thống Quản lý Cộng Tác Viên & Tình Nguyện Viên
              </p>
            </div>
          </div>

          {/* Dual-Workspace Navigation Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/60">
            <button
              onClick={() => setActiveTab('ctv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
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
              onClick={() => setActiveTab('tnv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
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
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
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
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              title="Làm mới dữ liệu"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200/80"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetData}
              title="Khôi phục dữ liệu mẫu ban đầu"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Dữ liệu mẫu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

