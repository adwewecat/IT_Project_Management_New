import React, { useState, useRef } from 'react';
import {
  Upload,
  Square,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TopScrollTable } from '../ui/TopScrollTable';
import {
  agentMultitaskV2Service,
  SftpFileItem,
  BatchPushFileItemResult
} from '../../services/agentMultitaskV2Service';

interface BatchPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: SftpFileItem | null;
  sftpFiles: SftpFileItem[];
  defaultTargetFolder?: string;
  onSuccess?: () => void;
}

export const BatchPushModal: React.FC<BatchPushModalProps> = ({
  isOpen,
  onClose,
  selectedFile,
  sftpFiles,
  defaultTargetFolder = 'D:\\GPOS-Setup',
  onSuccess
}) => {
  const [currentFile, setCurrentFile] = useState<string>(selectedFile?.filename || '');
  const [targetFolder, setTargetFolder] = useState<string>(defaultTargetFolder);
  const [forceUnlock, setForceUnlock] = useState<boolean>(true);
  const [autoExtract, setAutoExtract] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const [results, setResults] = useState<BatchPushFileItemResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [currentBatchTotal, setCurrentBatchTotal] = useState<number>(0);

  const stopRequestedRef = useRef<boolean>(false);

  // Cập nhật file khi modal mở hoặc selectedFile thay đổi
  React.useEffect(() => {
    if (isOpen) {
      if (selectedFile?.filename) {
        setCurrentFile(selectedFile.filename);
      } else if (sftpFiles.length > 0 && !currentFile) {
        setCurrentFile(sftpFiles[0].filename);
      }
      if (defaultTargetFolder) {
        setTargetFolder(defaultTargetFolder);
      }
    }
  }, [isOpen, selectedFile, sftpFiles, defaultTargetFolder, currentFile]);

  // Phân tích danh sách IP trạm/nhà hàng từ khung văn bản paste
  const parseTargetIps = (text: string): string[] => {
    const rawList = text.split(/[\r\n,;\t\s]+/).map((s) => s.trim()).filter(Boolean);
    const uniqueList: string[] = [];
    for (const item of rawList) {
      // Nhận diện địa chỉ IP dạng x.x.x.x
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(item)) {
        if (!uniqueList.includes(item)) {
          uniqueList.push(item);
        }
      }
    }
    return uniqueList;
  };

  const parsedIps = parseTargetIps(rawText);

  // Xóa trắng văn bản
  const handleClear = () => {
    if (isRunning) return;
    setRawText('');
    setResults([]);
    setProcessedCount(0);
    setCurrentBatchTotal(0);
  };

  // Dán mẫu ví dụ
  const handlePasteSample = () => {
    if (isRunning) return;
    const sample = '10.8.222.12\n10.8.222.41\n10.8.160.11, 10.8.45.1\n10.8.130.11';
    setRawText(sample);
  };

  // Bắt đầu truyền file hàng loạt
  const handleStartProcess = async (onlyFailed = false) => {
    if (!currentFile) {
      alert('Vui lòng chọn 1 file từ Kho SFTP để truyền.');
      return;
    }

    let targetIps: string[] = [];
    if (onlyFailed) {
      targetIps = results.filter((r) => !r.success).map((r) => r.target_ip);
    } else {
      targetIps = parseTargetIps(rawText);
    }

    if (targetIps.length === 0) {
      alert('Vui lòng nhập ít nhất 1 địa chỉ IP hợp lệ.');
      return;
    }

    setIsRunning(true);
    stopRequestedRef.current = false;
    setCurrentBatchTotal(targetIps.length);
    setProcessedCount(0);

    // Chuẩn bị danh sách kết quả khởi tạo
    if (!onlyFailed) {
      setResults(
        targetIps.map((ip) => ({
          target_ip: ip,
          restaurant_name: '',
          success: false,
          delivery_channel: 'Đang chờ...',
          size_bytes: 0,
          elapsed_ms: 0,
          message: 'Đang xếp hàng truyền file...'
        }))
      );
    }

    try {
      // Chia thành các mẻ nhỏ (chunk 5 trạm) để cập nhật tiến độ real-time trên giao diện
      const chunkSize = 5;
      const allResults: BatchPushFileItemResult[] = onlyFailed ? [...results] : [];

      for (let i = 0; i < targetIps.length; i += chunkSize) {
        if (stopRequestedRef.current) break;

        const chunk = targetIps.slice(i, i + chunkSize);
        const res = await agentMultitaskV2Service.batchPushFile({
          target_ips: chunk,
          filename: currentFile,
          target_folder: targetFolder,
          overwrite: true,
          force_unlock: forceUnlock,
          auto_extract: autoExtract
        });

        // Cập nhật từng dòng kết quả
        res.results.forEach((item) => {
          if (onlyFailed) {
            const idx = allResults.findIndex((r) => r.target_ip === item.target_ip);
            if (idx !== -1) allResults[idx] = item;
          } else {
            allResults.push(item);
          }
        });

        setResults([...allResults]);
        setProcessedCount(Math.min(i + chunk.length, targetIps.length));
      }

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Lỗi trong quá trình truyền hàng loạt: ' + msg);
    } finally {
      setIsRunning(false);
    }
  };

  // Dừng quá trình
  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsRunning(false);
  };

  // Xuất file Excel báo cáo kết quả
  const handleExportExcel = () => {
    if (results.length === 0) return;
    const headers = [
      'STT',
      'IP Trạm',
      'Nhà Hàng',
      'Trạng Thái',
      'Kênh Truyền',
      'Dung Lượng (Bytes)',
      'Thời Gian (ms)',
      'Chi Tiết / Phản Hồi'
    ];
    const csvRows = [headers.join(',')];
    results.forEach((r, i) => {
      csvRows.push(
        [
          i + 1,
          `"${r.target_ip}"`,
          `"${(r.restaurant_name || '').replace(/"/g, '""')}"`,
          `"${r.success ? 'Thành công' : 'Lỗi'}"`,
          `"${r.delivery_channel || ''}"`,
          r.size_bytes || 0,
          r.elapsed_ms || 0,
          `"${(r.message || '').replace(/"/g, '""')}"`
        ].join(',')
      );
    });
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ket_Qua_Truyen_Hang_Loat_${currentFile}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success && r.delivery_channel !== 'Đang chờ...').length;
  const progressPercent =
    currentBatchTotal > 0 ? Math.round((processedCount / currentBatchTotal) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isRunning) onClose();
      }}
      title="⚡ Truyền File Hàng Loạt Xuống Nhà Hàng (Paste Danh Sách IP)"
      maxWidth="1050px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '82vh' }}>
        {/* KHỐI CẤU HÌNH TRUYỀN FILE */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#FEF9C3',
            border: '1px solid #FDE047',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Chọn file từ SFTP */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#854D0E', marginBottom: '4px' }}>
                📦 File SFTP Cần Truyền:
              </label>
              <select
                value={currentFile}
                onChange={(e) => setCurrentFile(e.target.value)}
                disabled={isRunning}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #F5B800',
                  backgroundColor: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}
              >
                {sftpFiles.map((f) => (
                  <option key={f.filename} value={f.filename}>
                    {f.filename} ({f.size_formatted})
                  </option>
                ))}
              </select>
            </div>

            {/* Thư mục đích */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#854D0E', marginBottom: '4px' }}>
                📁 Thư Mục Đích Dưới Nhà Hàng:
              </label>
              <input
                type="text"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                disabled={isRunning}
                placeholder="D:\GPOS-Setup"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #F5B800',
                  backgroundColor: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Các tùy chọn chép đè Hot-Swap */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceUnlock}
                onChange={(e) => setForceUnlock(e.target.checked)}
                disabled={isRunning}
              />
              <span style={{ color: '#b45309' }}>🔥 Chép đè ngay cả file đang chạy (Hot-Swap Overwrite)</span>
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoExtract}
                onChange={(e) => setAutoExtract(e.target.checked)}
                disabled={isRunning}
              />
              <span>📦 Tự động giải nén (nếu là .zip, .rar)</span>
            </label>
          </div>
        </div>

        {/* KHUNG DÁN DANH SÁCH IP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
              📋 DÁN DANH SÁCH IP TRẠM HOẶC IP NHÀ HÀNG:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePasteSample}
                disabled={isRunning}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  cursor: isRunning ? 'not-allowed' : 'pointer'
                }}
              >
                <FileText size={12} />
                Mẫu ví dụ
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={isRunning}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  cursor: isRunning ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash2 size={12} />
                Xóa trắng
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isRunning}
            placeholder={`Dán danh sách IP máy trạm hoặc IP nhà hàng vào đây...
Ví dụ:
10.8.222.12
10.8.222.41
10.8.160.11, 10.8.45.1
10.8.130.11`}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1.5px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: '12.5px',
              lineHeight: 1.5,
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
            <span>
              Đã nhận diện: <strong style={{ color: '#0f172a' }}>{parsedIps.length}</strong> trạm IP hợp lệ
            </span>
            <span>* Phân tách linh hoạt theo dòng mới (Enter), dấu phẩy (,), chấm phẩy (;) hoặc Excel Copy/Paste</span>
          </div>
        </div>

        {/* TIẾN ĐỘ THỰC HIỆN */}
        {isRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
              <span>Đang truyền tới các trạm... ({processedCount}/{currentBatchTotal})</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#F5B800',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* BẢNG KẾT QUẢ THỰC HIỆN */}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>KẾT QUẢ TRUYỀN FILE ({results.length} trạm):</span>
                <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  Thành công: {successCount}
                </span>
                <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  Thất bại: {failedCount}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={results.length === 0}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  <Download size={12} style={{ marginRight: '4px' }} />
                  Tải Excel Kết Quả (.csv)
                </Button>

                {failedCount > 0 && !isRunning && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartProcess(true)}
                    style={{ fontSize: '11px', padding: '3px 8px', borderColor: '#f87171', color: '#b91c1c' }}
                  >
                    <RefreshCw size={12} style={{ marginRight: '4px' }} />
                    Thử Lại Các Trạm Lỗi ({failedCount})
                  </Button>
                )}
              </div>
            </div>

            {/* BẢNG DỮ LIỆU FULL-VIEWPORT CÓ TOP SCROLL */}
            <div style={{ flex: 1, minHeight: '160px', maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <TopScrollTable>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <tr>
                      <th style={{ padding: '6px 8px', width: '40px', textAlign: 'center', fontWeight: 700 }}>#</th>
                      <th style={{ padding: '6px 8px', width: '120px', textAlign: 'left', fontWeight: 700 }}>IP Trạm</th>
                      <th style={{ padding: '6px 8px', width: '160px', textAlign: 'left', fontWeight: 700 }}>Nhà Hàng</th>
                      <th style={{ padding: '6px 8px', width: '110px', textAlign: 'center', fontWeight: 700 }}>Trạng Thái</th>
                      <th style={{ padding: '6px 8px', width: '120px', textAlign: 'left', fontWeight: 700 }}>Kênh Truyền</th>
                      <th style={{ padding: '6px 8px', width: '80px', textAlign: 'right', fontWeight: 700 }}>Thời Gian</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>Chi Tiết / Phản Hồi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr key={`${r.target_ip}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700 }}>{r.target_ip}</td>
                        <td style={{ padding: '5px 8px', color: '#0f172a' }}>{r.restaurant_name || '—'}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          {r.success ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#16a34a', fontWeight: 700 }}>
                              <CheckCircle2 size={13} /> Thành công
                            </span>
                          ) : r.delivery_channel === 'Đang chờ...' ? (
                            <span style={{ color: '#64748b', fontSize: '11px' }}>Đang chờ...</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#dc2626', fontWeight: 700 }}>
                              <XCircle size={13} /> Thất bại
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '5px 8px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: r.delivery_channel === 'SQL_DIRECT' ? '#e0f2fe' : r.delivery_channel === 'LAN_RELAY' ? '#fef3c7' : '#f1f5f9',
                              color: r.delivery_channel === 'SQL_DIRECT' ? '#0369a1' : r.delivery_channel === 'LAN_RELAY' ? '#92400e' : '#475569',
                              fontWeight: 600
                            }}
                          >
                            {r.delivery_channel === 'SQL_DIRECT' ? 'SQL Trực Tiếp' : r.delivery_channel === 'LAN_RELAY' ? 'Cầu Nối LAN' : r.delivery_channel}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>
                          {r.elapsed_ms > 0 ? `${r.elapsed_ms}ms` : '—'}
                        </td>
                        <td style={{ padding: '5px 8px', color: r.success ? '#166534' : '#b91c1c' }}>
                          {r.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TopScrollTable>
            </div>
          </div>
        )}

        {/* NÚT THAO TÁC CUỐI MODAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          <Button variant="outline" onClick={onClose} disabled={isRunning}>
            Đóng
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isRunning ? (
              <Button variant="danger" onClick={handleStop} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Square size={14} /> Dừng Truyền
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => handleStartProcess(false)}
                disabled={parsedIps.length === 0 || !currentFile}
                style={{
                  backgroundColor: '#F5B800',
                  color: '#000000',
                  borderColor: '#D9A300',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Upload size={14} />
                Bắt Đầu Truyền Hàng Loạt ({parsedIps.length} Trạm)
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
