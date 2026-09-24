import React, { useState, useEffect } from 'react';
import { X, Award, Sparkles, History, CheckCircle, Plus } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../common/Toast';

export default function TnvActivityModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [tab, setTab] = useState('add'); // 'add' | 'history'
  const [loading, setLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);

  const [presetCategory, setPresetCategory] = useState('Hỗ trợ tuyển sinh');
  const [customTitle, setCustomTitle] = useState('');
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState('');

  const categories = [
    { title: 'Hỗ trợ tuyển sinh', points: 10, desc: 'Tư vấn, hướng dẫn thí sinh và phụ huynh' },
    { title: 'Trực văn phòng', points: 5, desc: 'Trực xử lý giấy tờ và tiếp tân văn phòng' },
    { title: 'Chiến dịch cao điểm', points: 20, desc: 'Tham gia các đợt chiến dịch tình nguyện tập trung' },
    { title: 'Hỗ trợ sự kiện & Gala', points: 15, desc: 'Điều phối khán phòng, hậu cần âm thanh ánh sáng' },
    { title: 'Tập huấn kỹ năng tình nguyện', points: 10, desc: 'Hoàn thành các buổi đào tạo chuyên môn' },
  ];

  useEffect(() => {
    if (member && isOpen) {
      loadHistory();
    }
  }, [member, isOpen]);

  const loadHistory = async () => {
    if (!member) return;
    try {
      const res = await api.getTnvActivities(member.id);
      if (res.success) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !member) return null;

  const handleSelectPreset = (c) => {
    setPresetCategory(c.title);
    setPoints(c.points);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const category = customTitle.trim() || presetCategory;
      const res = await api.recordTnvActivity({
        memberId: member.id,
        category,
        points,
        note,
      });

      if (res.success) {
        addToast(res.message, 'success');
        onSuccess();
        loadHistory();
        setCustomTitle('');
        setNote('');
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
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
                Nhóm {member.group_num}
              </span>
              <h3 className="text-base font-bold text-slate-800">{member.full_name}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MSSV: <span className="font-semibold text-slate-700">{member.mssv}</span> · Điểm tích lũy: <b className="text-rose-600">{member.total_points}đ</b>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setTab('add')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'add'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ghi nhận Hoạt động Tình nguyện
          </button>
          <button
            onClick={() => setTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1 ${
              tab === 'history'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử hoạt động ({historyLogs.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {tab === 'add' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn hạng mục tình nguyện mẫu:
                </label>
                <div className="space-y-2">
                  {categories.map((c) => {
                    const isSelected = presetCategory === c.title;
                    return (
                      <div
                        key={c.title}
                        onClick={() => handleSelectPreset(c)}
                        className={`p-2.5 px-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">{c.title}</span>
                          <span className="text-[11px] text-slate-400">{c.desc}</span>
                        </div>
                        <span className="font-black text-xs text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                          +{c.points}đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc nhập tên hoạt động khác:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="VD: Tham gia dọn dẹp vệ sinh khuôn viên trường..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Điểm cộng (+):
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold text-rose-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Minh chứng / Ghi chú:
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Link minh chứng hoặc tên người phụ trách..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 transition-all"
                >
                  {loading ? 'Đang lưu...' : 'Ghi Nhận & Cộng Điểm'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {historyLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có lịch sử hoạt động cho tình nguyện viên này.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">{log.category}</span>
                      {log.note && <p className="text-slate-500 mt-0.5">{log.note}</p>}
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(log.created_at || log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <span className="font-black text-sm text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-lg">
                      +{log.points}đ
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

