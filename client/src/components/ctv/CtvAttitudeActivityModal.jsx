import React, { useState, useEffect } from 'react';
import { X, Award, Smile, Frown, AlertOctagon, Sparkles, History, PlusCircle, CheckCircle } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function CtvAttitudeActivityModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [tab, setTab] = useState('attitude'); // 'attitude' | 'activity' | 'history'
  const [loading, setLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);

  // Form state
  const [attitudePreset, setAttitudePreset] = useState('Tích cực');
  const [customAttitudeTitle, setCustomAttitudeTitle] = useState('');
  const [attitudeDelta, setAttitudeDelta] = useState(5);
  const [attitudeNote, setAttitudeNote] = useState('');

  const [activityPreset, setActivityPreset] = useState('Chiến dịch tuyển sinh');
  const [customActivityTitle, setCustomActivityTitle] = useState('');
  const [activityDelta, setActivityDelta] = useState(15);
  const [activityNote, setActivityNote] = useState('');

  useEffect(() => {
    if (member && isOpen) {
      loadHistory();
    }
  }, [member, isOpen]);

  const loadHistory = async () => {
    if (!member) return;
    try {
      const res = await api.getCtvPointLogs(member.id);
      if (res.success) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !member) return null;

  const attitudePresets = [
    { title: 'Tích cực', points: 5, icon: Smile, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { title: 'Nhiệt tình hỗ trợ', points: 3, icon: Sparkles, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { title: 'Thụ động trong ca trực', points: -2, icon: Frown, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { title: 'Vi phạm kỷ luật', points: -5, icon: AlertOctagon, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  const activityPresets = [
    { title: 'Chiến dịch tuyển sinh', points: 15 },
    { title: 'Trực bàn thông tin tân sinh viên', points: 10 },
    { title: 'Hỗ trợ tổ chức sự kiện gala', points: 12 },
    { title: 'Trực văn phòng đoàn hội', points: 5 },
    { title: 'Tham gia tập huấn kỹ năng mềm', points: 8 },
  ];

  const handleAttitudeSelect = (p) => {
    setAttitudePreset(p.title);
    setAttitudeDelta(p.points);
  };

  const handleActivitySelect = (a) => {
    setActivityPreset(a.title);
    setActivityDelta(a.points);
  };

  const handleSubmitAttitude = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const title = customAttitudeTitle.trim() || attitudePreset;
      const res = await api.rateCtvAttitudeActivity({
        memberId: member.id,
        type: 'attitude',
        title,
        pointsDelta: attitudeDelta,
        note: attitudeNote,
      });

      if (res.success) {
        addToast(`Đã ghi nhận điểm thái độ (${attitudeDelta > 0 ? '+' : ''}${attitudeDelta}đ) cho ${member.full_name}!`, 'success');
        onSuccess();
        loadHistory();
        setCustomAttitudeTitle('');
        setAttitudeNote('');
      } else {
        addToast(res.message || 'Lỗi khi chấm điểm', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const title = customActivityTitle.trim() || activityPreset;
      const res = await api.rateCtvAttitudeActivity({
        memberId: member.id,
        type: 'activity',
        title,
        pointsDelta: activityDelta,
        note: activityNote,
      });

      if (res.success) {
        addToast(`Đã ghi nhận hoạt động (${activityDelta > 0 ? '+' : ''}${activityDelta}đ) cho ${member.full_name}!`, 'success');
        onSuccess();
        loadHistory();
        setCustomActivityTitle('');
        setActivityNote('');
      } else {
        addToast(res.message || 'Lỗi khi ghi nhận hoạt động', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                Nhóm {member.group_num}
              </span>
              <h3 className="text-base font-bold text-slate-800">{member.full_name}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MSSV: <span className="font-semibold text-slate-700">{member.mssv}</span> · Chức vụ: {member.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Score summary pill */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Điểm thái độ: </span>
            <span className={`font-bold ${member.attitude_points >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {member.attitude_points > 0 ? `+${member.attitude_points}` : member.attitude_points}đ
            </span>
          </div>
          <div>
            <span className="text-slate-500">Điểm hoạt động: </span>
            <span className="font-bold text-emerald-600">+{member.activity_points}đ</span>
          </div>
          <div className="p-1 px-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <span className="text-indigo-600 font-medium">Tổng điểm: </span>
            <span className="font-black text-indigo-700 text-sm">{member.total_points}đ</span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setTab('attitude')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'attitude'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Đánh giá Thái độ (+/-)
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'activity'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ghi nhận Hoạt động
          </button>
          <button
            onClick={() => setTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1 ${
              tab === 'history'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử ({historyLogs.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {tab === 'attitude' && (
            <form onSubmit={handleSubmitAttitude} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn mức độ thái độ làm việc:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {attitudePresets.map((p) => {
                    const Icon = p.icon;
                    const isSelected = attitudePreset === p.title;
                    return (
                      <div
                        key={p.title}
                        onClick={() => handleAttitudeSelect(p)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${p.color.split(' ')[0]}`} />
                          <span className="text-xs font-semibold text-slate-800">{p.title}</span>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.points > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                          {p.points > 0 ? `+${p.points}` : p.points}đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc nhập tiêu đề đánh giá tùy chỉnh:
                </label>
                <input
                  type="text"
                  value={customAttitudeTitle}
                  onChange={(e) => setCustomAttitudeTitle(e.target.value)}
                  placeholder="VD: Đi muộn buổi họp giao ban nhưng báo trước..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Điểm cộng/trừ:
                  </label>
                  <input
                    type="number"
                    value={attitudeDelta}
                    onChange={(e) => setAttitudeDelta(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú chi tiết:
                  </label>
                  <input
                    type="text"
                    value={attitudeNote}
                    onChange={(e) => setAttitudeNote(e.target.value)}
                    placeholder="Lý do cụ thể..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  {loading ? 'Đang cập nhật...' : 'Lưu Điểm Thái Độ'}
                </button>
              </div>
            </form>
          )}

          {tab === 'activity' && (
            <form onSubmit={handleSubmitActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn hoạt động/nhiệm vụ mẫu:
                </label>
                <div className="space-y-1.5">
                  {activityPresets.map((a) => {
                    const isSelected = activityPreset === a.title;
                    return (
                      <div
                        key={a.title}
                        onClick={() => handleActivitySelect(a)}
                        className={`p-2.5 px-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="font-semibold text-slate-800">{a.title}</span>
                        <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          +{a.points}đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc tên hoạt động tùy chỉnh:
                </label>
                <input
                  type="text"
                  value={customActivityTitle}
                  onChange={(e) => setCustomActivityTitle(e.target.value)}
                  placeholder="VD: Hỗ trợ phát cơm từ thiện..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Điểm hoạt động (+):
                  </label>
                  <input
                    type="number"
                    value={activityDelta}
                    onChange={(e) => setActivityDelta(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú hoạt động:
                  </label>
                  <input
                    type="text"
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder="Minh chứng / Ghi chú..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                >
                  {loading ? 'Đang lưu...' : 'Ghi Nhận Hoạt Động'}
                </button>
              </div>
            </form>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {historyLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có lịch sử chấm điểm cho thành viên này.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'attitude' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.type === 'attitude' ? 'Thái độ' : 'Hoạt động'}
                        </span>
                        <span className="font-bold text-slate-800">{log.title}</span>
                      </div>
                      {log.note && <p className="text-slate-500 mt-1">{log.note}</p>}
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(log.created_at || log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <span className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                      log.points_delta > 0 ? 'text-emerald-700 bg-emerald-100/60' : 'text-rose-700 bg-rose-100/60'
                    }`}>
                      {log.points_delta > 0 ? `+${log.points_delta}` : log.points_delta}đ
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

