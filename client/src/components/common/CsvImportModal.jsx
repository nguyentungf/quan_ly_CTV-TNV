import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, X, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { useToast } from './Toast';

export default function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  type = 'ctv', // 'ctv' | 'tnv'
}) {
  const { addToast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const isCtv = type === 'ctv';
  const title = isCtv ? 'Nhập danh sách Cộng Tác Viên (Excel / CSV)' : 'Nhập danh sách Tình Nguyện Viên (Excel / CSV)';
  const sampleXlsxUrl = isCtv ? '/api/ctv/sample-xlsx' : '/api/tnv/sample-xlsx';
  const sampleCsvUrl = isCtv ? '/api/ctv/sample-csv' : '/api/tnv/sample-csv';
  const sampleXlsxFilename = isCtv ? 'Mau_danh_sach_CTV.xlsx' : 'Mau_danh_sach_TNV.xlsx';
  const sampleCsvFilename = isCtv ? 'Mau_danh_sach_CTV.csv' : 'Mau_danh_sach_TNV.csv';

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const name = selected.name.toLowerCase();
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
        addToast('Vui lòng chọn tệp định dạng Excel (.xlsx, .xls) hoặc .csv!', 'warning');
        return;
      }
      setFile(selected);
      setErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      addToast('Vui lòng chọn tệp Excel hoặc CSV trước khi nhập!', 'warning');
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = isCtv ? '/api/ctv/import-file' : '/api/tnv/import-file';
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        addToast(data.message || 'Lỗi khi nhập file', 'error');
        if (data.errors) setErrors(data.errors);
      }
    } catch (err) {
      addToast('Lỗi kết nối tới máy chủ khi nhập dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hỗ trợ cả định dạng Excel (.xlsx) và CSV chuẩn ảnh mẫu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Tải tệp mẫu chuẩn */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Tải tệp mẫu chuẩn (theo đúng ảnh bảng tính):
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={sampleXlsxUrl}
                download={sampleXlsxFilename}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200/80 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Tải mẫu Excel (.xlsx)
              </a>
              <a
                href={sampleCsvUrl}
                download={sampleCsvFilename}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200/80 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Tải mẫu CSV (.csv)
              </a>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className={`p-3 rounded-full mb-2 ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {file ? <CheckCircle className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB · Nhấn để chọn tệp khác
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Kéo thả tệp Excel (.xlsx) hoặc CSV vào đây</p>
                  <p className="text-xs text-slate-400 mt-1">Hệ thống tự động nhận dạng các cột theo mẫu chuẩn</p>
                </div>
              )}
            </div>
          </div>

          {/* Cấu trúc cột theo ảnh */}
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
            <p className="font-bold text-slate-700">Cấu trúc các cột chuẩn (khớp theo ảnh bảng tính):</p>
            <div className="flex flex-wrap gap-1 text-[11px]">
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Nhóm trưởng</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">STT</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-emerald-800 font-bold">Nhóm</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-blue-800 font-bold">Họ và tên</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-blue-800 font-bold">MSSV</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Giới tính</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Số điện thoại</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Lớp</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Email</span>
            </div>
            <p className="text-[11px] text-slate-500 italic mt-1">
              * Tự động thêm mới nếu MSSV chưa có, hoặc cập nhật thông tin nếu MSSV đã tồn tại.
            </p>
          </div>

          {/* Lỗi cảnh báo nếu có */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4" />
                Một số dòng gặp cảnh báo:
              </div>
              <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200/80 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!file || loading}
            onClick={handleUpload}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${
              !file || loading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {loading ? 'Đang xử lý...' : 'Bắt đầu Nhập dữ liệu'}
          </button>
        </div>
      </div>
    </div>
  );
}
