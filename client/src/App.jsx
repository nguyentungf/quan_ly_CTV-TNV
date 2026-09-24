import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { ToastProvider, useToast } from './components/common/Toast';
import { api } from './api';

// CTV Components
import CtvOverview from './components/ctv/CtvOverview';
import CtvMemberList from './components/ctv/CtvMemberList';
import CtvAttendanceMatrix from './components/ctv/CtvAttendanceMatrix';
import CtvMemberModal from './components/ctv/CtvMemberModal';
import CtvAttitudeActivityModal from './components/ctv/CtvAttitudeActivityModal';
import CtvMergeGroupModal from './components/ctv/CtvMergeGroupModal';

// TNV Components
import TnvOverview from './components/tnv/TnvOverview';
import TnvLeaderboard from './components/tnv/TnvLeaderboard';
import TnvDisciplineBoard from './components/tnv/TnvDisciplineBoard';
import TnvMemberList from './components/tnv/TnvMemberList';
import TnvAttendanceTracker from './components/tnv/TnvAttendanceTracker';
import TnvMemberModal from './components/tnv/TnvMemberModal';
import TnvActivityModal from './components/tnv/TnvActivityModal';

// Campaigns Component
import CampaignManager from './components/campaigns/CampaignManager';

// Common
import CsvImportModal from './components/common/CsvImportModal';
import { Users, HeartHandshake, CalendarCheck2, ShieldAlert, Award, Layers } from 'lucide-react';

function DashboardContent() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('ctv'); // 'ctv' | 'tnv' | 'campaigns'
  const [ctvSubTab, setCtvSubTab] = useState('members'); // 'members' | 'attendance'
  const [tnvSubTab, setTnvSubTab] = useState('members'); // 'members' | 'attendance' | 'discipline'
  const [campaignCount, setCampaignCount] = useState(0);

  // CTV State
  const [ctvMembers, setCtvMembers] = useState([]);
  const [ctvGroups, setCtvGroups] = useState([]);
  const [ctvSearch, setCtvSearch] = useState('');
  const [ctvGroupFilter, setCtvGroupFilter] = useState('all');
  const [ctvStatusFilter, setCtvStatusFilter] = useState('all');

  // TNV State
  const [tnvMembers, setTnvMembers] = useState([]);
  const [tnvGroups, setTnvGroups] = useState([]);
  const [tnvLeaderboard, setTnvLeaderboard] = useState([]);
  const [tnvMaxScore, setTnvMaxScore] = useState(100);
  const [tnvDiscipline, setTnvDiscipline] = useState({ summary: { total: 0, level1: 0, level2: 0 }, data: [] });
  const [tnvSearch, setTnvSearch] = useState('');
  const [tnvGroupFilter, setTnvGroupFilter] = useState('all');
  const [tnvWarningFilter, setTnvWarningFilter] = useState('all');
  const [tnvStatusFilter, setTnvStatusFilter] = useState('all');

  // Modals State
  const [showCtvMemberModal, setShowCtvMemberModal] = useState(false);
  const [editingCtvMember, setEditingCtvMember] = useState(null);
  const [ratingCtvMember, setRatingCtvMember] = useState(null);
  const [showCtvMergeModal, setShowCtvMergeModal] = useState(false);

  const [showTnvMemberModal, setShowTnvMemberModal] = useState(false);
  const [editingTnvMember, setEditingTnvMember] = useState(null);
  const [recordingTnvMember, setRecordingTnvMember] = useState(null);

  const [importModalType, setImportModalType] = useState(null); // 'ctv' | 'tnv' | null

  // Initial load
  useEffect(() => {
    loadCtvData();
    loadTnvData();
    loadCampaignCount();
  }, []);

  // Reload CTV when filters change
  useEffect(() => {
    loadCtvMembers();
  }, [ctvSearch, ctvGroupFilter, ctvStatusFilter]);

  // Reload TNV when filters change
  useEffect(() => {
    loadTnvMembers();
  }, [tnvSearch, tnvGroupFilter, tnvWarningFilter, tnvStatusFilter]);

  const loadCampaignCount = async () => {
    try {
      const res = await api.getCampaigns();
      if (res.success) setCampaignCount(res.data.length);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCtvData = async () => {
    await Promise.all([loadCtvMembers(), loadCtvGroupsSummary()]);
  };

  const loadCtvMembers = async () => {
    try {
      const res = await api.getCtvMembers({
        search: ctvSearch,
        group: ctvGroupFilter,
        status: ctvStatusFilter,
      });
      if (res.success) setCtvMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCtvGroupsSummary = async () => {
    try {
      const res = await api.getCtvGroupsSummary();
      if (res.success) setCtvGroups(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTnvData = async () => {
    await Promise.all([
      loadTnvMembers(),
      loadTnvGroupsSummary(),
      loadTnvLeaderboard(),
      loadTnvDiscipline(),
    ]);
  };

  const loadTnvMembers = async () => {
    try {
      const res = await api.getTnvMembers({
        search: tnvSearch,
        group: tnvGroupFilter,
        warning: tnvWarningFilter,
        status: tnvStatusFilter,
      });
      if (res.success) {
        setTnvMembers(res.data);
        if (res.maxScore) setTnvMaxScore(res.maxScore);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTnvGroupsSummary = async () => {
    try {
      const res = await api.getTnvGroupsSummary();
      if (res.success) setTnvGroups(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTnvLeaderboard = async () => {
    try {
      const res = await api.getTnvLeaderboard();
      if (res.success) {
        setTnvLeaderboard(res.data);
        if (res.maxScore) setTnvMaxScore(res.maxScore);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTnvDiscipline = async () => {
    try {
      const res = await api.getTnvDisciplineBoard();
      if (res.success) setTnvDiscipline(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCtv = async (id) => {
    try {
      const res = await api.deleteCtvMember(id);
      if (res.success) {
        addToast('Đã xóa Cộng Tác Viên thành công', 'success');
        loadCtvData();
      }
    } catch (err) {
      addToast('Lỗi khi xóa CTV', 'error');
    }
  };

  const handleDeleteTnv = async (id) => {
    try {
      const res = await api.deleteTnvMember(id);
      if (res.success) {
        addToast('Đã xóa Tình Nguyện Viên thành công', 'success');
        loadTnvData();
      }
    } catch (err) {
      addToast('Lỗi khi xóa TNV', 'error');
    }
  };

  const handleRefreshAll = () => {
    loadCtvData();
    loadTnvData();
    loadCampaignCount();
    addToast('Đã đồng bộ và làm mới dữ liệu toàn hệ thống', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefreshAll}
        stats={{
          ctvCount: ctvMembers.length,
          tnvCount: tnvMembers.length,
          campaignCount: campaignCount,
        }}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ==================================================== */}
        {/* WORKSPACE 1: CỘNG TÁC VIÊN (CTV)                     */}
        {/* ==================================================== */}
        {activeTab === 'ctv' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Description */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-md">
              <div>
                <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-md">
                  Phân Hệ Quản Lý 1
                </span>
                <h2 className="text-xl font-extrabold mt-2 tracking-tight">
                  Quản Lý Đội Ngũ Cộng Tác Viên (CTV)
                </h2>
                <p className="text-xs text-blue-100 max-w-2xl mt-1 leading-relaxed">
                  Cơ chế phân cấp 8 nhóm với nhóm trưởng chỉ huy, chấm điểm thái độ & hoạt động thời gian thực,
                  bảng điểm danh ma trận co giãn và tính năng gộp nhóm tự động chuyển giao chức vụ.
                </p>
              </div>

              {/* Sub-navigation pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 self-start sm:self-center">
                <button
                  onClick={() => setCtvSubTab('members')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    ctvSubTab === 'members'
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Danh sách thành viên</span>
                </button>

                <button
                  onClick={() => setCtvSubTab('attendance')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    ctvSubTab === 'attendance'
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <CalendarCheck2 className="w-3.5 h-3.5" />
                  <span>Điểm danh co giãn</span>
                </button>
              </div>
            </div>

            {/* 8 Group Cards Overview */}
            <CtvOverview
              groups={ctvGroups}
              selectedGroup={ctvGroupFilter}
              onSelectGroup={(g) => setCtvGroupFilter(g)}
            />

            {/* Sub-view: Member List or Elastic Attendance Matrix */}
            {ctvSubTab === 'members' ? (
              <CtvMemberList
                members={ctvMembers}
                searchTerm={ctvSearch}
                setSearchTerm={setCtvSearch}
                selectedGroup={ctvGroupFilter}
                setSelectedGroup={setCtvGroupFilter}
                selectedStatus={ctvStatusFilter}
                setSelectedStatus={setCtvStatusFilter}
                onAddMember={() => {
                  setEditingCtvMember(null);
                  setShowCtvMemberModal(true);
                }}
                onEditMember={(m) => {
                  setEditingCtvMember(m);
                  setShowCtvMemberModal(true);
                }}
                onDeleteMember={handleDeleteCtv}
                onRateMember={(m) => setRatingCtvMember(m)}
                onOpenMergeModal={() => setShowCtvMergeModal(true)}
                onOpenImportModal={() => setImportModalType('ctv')}
                onReload={loadCtvData}
              />
            ) : (
              <CtvAttendanceMatrix selectedGroup={ctvGroupFilter} />
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* WORKSPACE 2: TÌNH NGUYỆN VIÊN (TNV)                   */}
        {/* ==================================================== */}
        {activeTab === 'tnv' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Description */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white shadow-md">
              <div>
                <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-md">
                  Phân Hệ Quản Lý 2
                </span>
                <h2 className="text-xl font-extrabold mt-2 tracking-tight">
                  Quản Lý Đội Ngũ Tình Nguyện Viên (TNV)
                </h2>
                <p className="text-xs text-rose-100 max-w-2xl mt-1 leading-relaxed">
                  Cơ cấu 4 nhóm nòng cốt, bảng vinh danh Top 5, thanh tiến độ so sánh % điểm với Top 1,
                  bảng theo dõi kỷ luật Thẻ Vàng (Cảnh cáo mức 1) & Thẻ Đỏ (Cảnh cáo mức 2) và điểm danh theo tuần/ca trực.
                </p>
              </div>

              {/* Sub-navigation pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 self-start sm:self-center">
                <button
                  onClick={() => setTnvSubTab('members')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tnvSubTab === 'members'
                      ? 'bg-white text-rose-800 shadow-sm'
                      : 'text-rose-100 hover:bg-white/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Danh sách & Tiến độ</span>
                </button>

                <button
                  onClick={() => setTnvSubTab('attendance')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tnvSubTab === 'attendance'
                      ? 'bg-white text-rose-800 shadow-sm'
                      : 'text-rose-100 hover:bg-white/10'
                  }`}
                >
                  <CalendarCheck2 className="w-3.5 h-3.5" />
                  <span>Điểm danh ca trực</span>
                </button>

                <button
                  onClick={() => setTnvSubTab('discipline')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tnvSubTab === 'discipline'
                      ? 'bg-white text-rose-800 shadow-sm'
                      : 'text-rose-100 hover:bg-white/10'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Bảng kỷ luật ({tnvDiscipline.summary?.total || 0})</span>
                </button>
              </div>
            </div>

            {/* 4 Group Cards Overview */}
            <TnvOverview
              groups={tnvGroups}
              selectedGroup={tnvGroupFilter}
              onSelectGroup={(g) => setTnvGroupFilter(g)}
            />

            {/* Top 5 Leaderboard Widget */}
            <TnvLeaderboard leaderboard={tnvLeaderboard} maxScore={tnvMaxScore} />

            {/* Disciplinary Board (always visible if tab is discipline, or summary alert) */}
            {tnvSubTab === 'discipline' && (
              <TnvDisciplineBoard
                disciplineData={tnvDiscipline}
                onRefresh={loadTnvData}
              />
            )}

            {/* Sub-view: Member List or Elastic Attendance Tracker */}
            {tnvSubTab === 'members' && (
              <TnvMemberList
                members={tnvMembers}
                maxScore={tnvMaxScore}
                searchTerm={tnvSearch}
                setSearchTerm={setTnvSearch}
                selectedGroup={tnvGroupFilter}
                setSelectedGroup={setTnvGroupFilter}
                selectedWarning={tnvWarningFilter}
                setSelectedWarning={setTnvWarningFilter}
                selectedStatus={tnvStatusFilter}
                setSelectedStatus={setTnvStatusFilter}
                onAddMember={() => {
                  setEditingTnvMember(null);
                  setShowTnvMemberModal(true);
                }}
                onEditMember={(m) => {
                  setEditingTnvMember(m);
                  setShowTnvMemberModal(true);
                }}
                onDeleteMember={handleDeleteTnv}
                onRecordActivity={(m) => setRecordingTnvMember(m)}
                onOpenImportModal={() => setImportModalType('tnv')}
                onEditWarning={(m) => {
                  setTnvSubTab('discipline');
                }}
                onReload={loadTnvData}
              />
            )}

            {tnvSubTab === 'attendance' && (
              <TnvAttendanceTracker selectedGroup={tnvGroupFilter} />
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* WORKSPACE 3: HOẠT ĐỘNG & SỰ KIỆN (CAMPAIGNS)         */}
        {/* ==================================================== */}
        {activeTab === 'campaigns' && (
          <CampaignManager />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        <p className="font-semibold text-slate-700">
          HỆ THỐNG QUẢN LÝ NHÂN SỰ CỘNG TÁC VIÊN & TÌNH NGUYỆN VIÊN
        </p>
        <p className="mt-1 text-slate-400">
          Xây dựng với Node.js, Express, SQLite, Drizzle ORM, Vite, React & Tailwind CSS · 100% Tiếng Việt
        </p>
      </footer>

      {/* ==================================================== */}
      {/* MODALS SECTION                                       */}
      {/* ==================================================== */}

      {/* CTV Member Modal */}
      <CtvMemberModal
        isOpen={showCtvMemberModal}
        editingMember={editingCtvMember}
        onClose={() => {
          setShowCtvMemberModal(false);
          setEditingCtvMember(null);
        }}
        onSuccess={loadCtvData}
      />

      {/* CTV Attitude / Activity Rating Modal */}
      <CtvAttitudeActivityModal
        isOpen={!!ratingCtvMember}
        member={ratingCtvMember}
        onClose={() => setRatingCtvMember(null)}
        onSuccess={loadCtvData}
      />

      {/* CTV Merge Groups Modal */}
      <CtvMergeGroupModal
        isOpen={showCtvMergeModal}
        groups={ctvGroups}
        onClose={() => setShowCtvMergeModal(false)}
        onSuccess={loadCtvData}
      />

      {/* TNV Member Modal */}
      <TnvMemberModal
        isOpen={showTnvMemberModal}
        editingMember={editingTnvMember}
        onClose={() => {
          setShowTnvMemberModal(false);
          setEditingTnvMember(null);
        }}
        onSuccess={loadTnvData}
      />

      {/* TNV Activity Modal */}
      <TnvActivityModal
        isOpen={!!recordingTnvMember}
        member={recordingTnvMember}
        onClose={() => setRecordingTnvMember(null)}
        onSuccess={loadTnvData}
      />

      {/* Common CSV Import Modal */}
      <CsvImportModal
        isOpen={!!importModalType}
        type={importModalType || 'ctv'}
        onClose={() => setImportModalType(null)}
        onSuccess={() => {
          if (importModalType === 'ctv') loadCtvData();
          else loadTnvData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}

