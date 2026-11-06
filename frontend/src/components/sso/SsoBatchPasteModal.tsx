import React, { useState, useRef } from 'react';
import {
  KeyRound,
  Lock,
  Play,
  Square,
  RefreshCw,
  Copy,
  Check,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TopScrollTable } from '../ui/TopScrollTable';
import { ssoManagementService } from '../../services/ssoManagementService';
import {
  SSOQuickRowProgress,
  SSOBatchExportItem,
} from '../../types/ssoManagement';

interface SsoBatchPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAction?: 'change_pass' | 'lock';
  onSuccess?: () => void;
}

export const SsoBatchPasteModal: React.FC<SsoBatchPasteModalProps> = ({
  isOpen,
  onClose,
  initialAction = 'change_pass',
  onSuccess,
}) => {
  const [action, setAction] = useState<'change_pass' | 'lock'>(initialAction);
  const [rawText, setRawText] = useState<string>('');
  const [rows, setRows] = useState<SSOQuickRowProgress[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  const stopRequestedRef = useRef<boolean>(false);

  // Khi modal mở hoặc đổi initialAction, đồng bộ action
  React.useEffect(() => {
    if (isOpen) {
      setAction(initialAction);
    }
  }, [isOpen, initialAction]);

  // Phân tích danh sách từ khóa từ khung văn bản
  const parseQueries = (text: string): string[] => {
    const rawList = text.split(/[\r\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
    // Giữ nguyên thứ tự và loại bỏ trùng lặp liên tiếp
    const uniqueList: string[] = [];
    for (const item of rawList) {
      if (!uniqueList.includes(item)) {
        uniqueList.push(item);
      }
    }
    return uniqueList;
  };

  const parsedList = parseQueries(rawText);

  // Xóa danh sách
  const handleClear = () => {
    if (isRunning) return;
    setRawText('');
    setRows([]);
  };

  // Dán mẫu ví dụ
  const handlePasteSample = () => {
    if (isRunning) return;
    const sample = '000016\ndung.nguyenanh\ntest@gmail.com\n0908119345';
    setRawText(sample);
  };

  // Sao chép 1 mật khẩu
  const handleCopySinglePass = (id: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPassId(id);
    setTimeout(() => setCopiedPassId(null), 2000);
  };

  // Sao chép toàn bộ danh sách kết quả (Username & Pass)
  const handleCopyAll = () => {
    const successRows = rows.filter((r) => r.status === 'success');
    if (successRows.length === 0) return;

    let content = '';
    if (action === 'change_pass') {
      content = 'DANH SÁCH TÀI KHOẢN & MẬT KHẨU MỚI (SSO/IAM):\n' +
        successRows
          .map((r, i) => `${i + 1}. User: ${r.user_name || r.query} | Pass: ${r.new_password || '—'} | Email: ${r.email || '—'}`)
          .join('\n');
    } else {
      content = 'DANH SÁCH TÀI KHOẢN ĐÃ KHÓA (SSO/IAM):\n' +
        successRows
          .map((r, i) => `${i + 1}. User: ${r.user_name || r.query} | Email: ${r.email || '—'} | SĐT: ${r.phone_number || '—'}`)
          .join('\n');
    }

    navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Xuất file Excel báo cáo kết quả
  const handleExportExcel = async () => {
    if (rows.length === 0 || exportingExcel) return;
    try {
      setExportingExcel(true);
      const exportItems: SSOBatchExportItem[] = rows.map((r) => ({
        query: r.query,
        user_name: r.user_name || '',
        email: r.email || '',
        phone_number: r.phone_number || '',
        new_password: r.new_password || '',
        status: r.status === 'success' ? 'success' : 'error',
        message: r.message || (r.status === 'success' ? 'Thành công' : 'Lỗi'),
      }));
      await ssoManagementService.exportBatchResults(action, exportItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Lỗi xuất file Excel: ' + msg);
    } finally {
      setExportingExcel(false);
    }
  };

  // Bắt đầu xử lý hàng loạt
  const handleStartProcess = async (onlyFailed = false) => {
    let targetRows: SSOQuickRowProgress[] = [];

    if (onlyFailed) {
      targetRows = rows.filter((r) => r.status === 'error');
    } else {
      const queries = parseQueries(rawText);
      if (queries.length === 0) return;
      targetRows = queries.map((q, idx) => ({
        id: `quick-${idx}-${q}`,
        query: q,
        status: 'idle',
      }));
      setRows(targetRows);
    }

    if (targetRows.length === 0) return;

    setIsRunning(true);
    stopRequestedRef.current = false;

    for (let i = 0; i < targetRows.length; i++) {
      if (stopRequestedRef.current) break;

      const currentItem = targetRows[i];

      // Đổi trạng thái sang processing
      setRows((prev) =>
        prev.map((r) =>
          r.id === currentItem.id
            ? { ...r, status: 'processing', message: 'Đang kết nối IAM...' }
            : r
        )
      );

      try {
        const res = await ssoManagementService.quickProcessItem({
          action,
          query: currentItem.query,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.id === currentItem.id
              ? {
                  ...r,
                  user_name: res.user_name || r.user_name,
                  email: res.email || r.email,
                  phone_number: res.phone_number || r.phone_number,
                  new_password: res.new_password,
                  status: res.success ? 'success' : 'error',
                  message: res.message || (res.success ? 'Thành công' : 'Lỗi không xác định'),
                  detail: res.detail,
                }
              : r
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setRows((prev) =>
          prev.map((r) =>
            r.id === currentItem.id
              ? {
                  ...r,
                  status: 'error',
                  message: 'Lỗi thực thi: ' + msg,
                }
              : r
          )
        );
      }
    }

    setIsRunning(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  // Dừng tiến trình
  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  // Thống kê
  const totalCount = rows.length;
  const successCount = rows.filter((r) => r.status === 'success').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const processedCount = rows.filter((r) => r.status === 'success' || r.status === 'error').length;
  const percent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isRunning) onClose();
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {action === 'change_pass' ? (
            <KeyRound size={20} style={{ color: 'var(--text-primary)' }} />
          ) : (
            <Lock size={20} style={{ color: 'var(--text-primary)' }} />
          )}
          <span>
            Tính Năng Mở Rộng ({action === 'change_pass' ? '1. Đổi Mật Khẩu Hàng Loạt' : '2. Khóa Tài Khoản Hàng Loạt'})
          </span>
        </div>
      }
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '82vh', overflowY: 'auto' }}>
        {/* Thanh chọn Tab tác vụ */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => !isRunning && setAction('change_pass')}
            disabled={isRunning}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: action === 'change_pass' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
              backgroundColor: action === 'change_pass' ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: action === 'change_pass' ? 700 : 500,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <KeyRound size={16} />
            <span>1. Đổi Mật Khẩu Hàng Loạt (Random Pass &ge; 9 ký tự)</span>
          </button>

          <button
            type="button"
            onClick={() => !isRunning && setAction('lock')}
            disabled={isRunning}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: action === 'lock' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
              backgroundColor: action === 'lock' ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: action === 'lock' ? 700 : 500,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Lock size={16} />
            <span>2. Khóa Tài Khoản Hàng Loạt (Lockout = True, Failed = 4)</span>
          </button>
        </div>

        {/* Khung Textarea Dán Danh Sách */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              DÁN DANH SÁCH TÀI KHOẢN (USER NAME, EMAIL HOẶC SỐ ĐIỆN THOẠI):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteSample}
                disabled={isRunning}
                style={{ fontSize: '12px' }}
              >
                <FileText size={13} />
                <span>Mẫu ví dụ</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isRunning || !rawText}
                style={{ fontSize: '12px' }}
              >
                <Trash2 size={13} />
                <span>Xóa trắng</span>
              </Button>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isRunning}
            rows={5}
            placeholder={`Dán danh sách username, email hoặc số điện thoại vào đây...\nVí dụ:\ndung.nguyenanh\n000016\ntest@gmail.com\n0908119345\n\n(Hỗ trợ dán từ Excel, phân cách bằng phím Enter, dấu phẩy hoặc chấm phẩy)`}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <div>
              Đã nhận diện: <strong>{parsedList.length}</strong> tài khoản
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              * Hệ thống tự động phân tách theo dòng, dấu phẩy (,) hoặc chấm phẩy (;)
            </div>
          </div>
        </div>

        {/* Thanh Tiến Độ Thực Hiện */}
        {totalCount > 0 && (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span>Tiến độ: <strong>{processedCount}/{totalCount}</strong> tài khoản ({percent}%)</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Thành công: {successCount}</span>
                {errorCount > 0 && <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Lỗi: {errorCount}</span>}
              </div>
              {isRunning && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <RefreshCw size={13} className="spin" /> Đang xử lý qua IAM...
                </span>
              )}
            </div>

            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: errorCount > 0 && successCount === 0 ? 'var(--color-error)' : 'var(--color-primary)',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Bảng Dữ Liệu Kết Quả */}
        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                KẾT QUẢ XỬ LÝ CHI TIẾT ({rows.length} tài khoản):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {action === 'change_pass' && successCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAll}
                    style={{ fontSize: '12px' }}
                    title="Sao chép toàn bộ danh sách tài khoản kèm mật khẩu mới"
                  >
                    {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedAll ? 'Đã sao chép toàn bộ!' : '📋 Copy Toàn Bộ Pass'}</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  style={{ fontSize: '12px' }}
                  title="Tải kết quả về máy dưới định dạng Excel (.xlsx)"
                >
                  {exportingExcel ? <RefreshCw size={13} className="spin" /> : <Download size={13} />}
                  <span>Tải File Excel (.xlsx)</span>
                </Button>
              </div>
            </div>

            <TopScrollTable maxHeight="340px">
              <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ width: '45px', padding: '8px 10px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '100px', padding: '8px 10px', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ width: '150px', padding: '8px 10px' }}>Từ Khóa Nhập</th>
                    <th style={{ width: '140px', padding: '8px 10px' }}>UserName IAM</th>
                    <th style={{ width: '170px', padding: '8px 10px' }}>Email IAM</th>
                    {action === 'change_pass' && (
                      <th style={{ width: '160px', padding: '8px 10px' }}>Mật Khẩu Mới</th>
                    )}
                    <th style={{ padding: '8px 10px' }}>Chi Tiết / Phản Hồi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isProcessing = row.status === 'processing';
                    const isSuccess = row.status === 'success';
                    const isError = row.status === 'error';

                    const rowBg = isProcessing
                      ? 'var(--bg-hover)'
                      : isSuccess
                      ? 'var(--color-success-bg)'
                      : isError
                      ? 'var(--color-error-bg)'
                      : 'transparent';

                    return (
                      <tr
                        key={row.id}
                        style={{
                          backgroundColor: rowBg,
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {isProcessing && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              <RefreshCw size={13} className="spin" /> Đang chạy
                            </span>
                          )}
                          {isSuccess && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: 700 }}>
                              <CheckCircle2 size={14} /> Xong
                            </span>
                          )}
                          {isError && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-error)', fontWeight: 700 }}>
                              <XCircle size={14} /> Lỗi
                            </span>
                          )}
                          {row.status === 'idle' && (
                            <span style={{ color: 'var(--text-muted)' }}>Chờ chạy</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.query}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                          {row.user_name || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {row.email || '—'}
                        </td>
                        {action === 'change_pass' && (
                          <td style={{ padding: '8px 10px' }}>
                            {row.new_password ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <code
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {row.new_password}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopySinglePass(row.id, row.new_password!)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: copiedPassId === row.id ? 'var(--color-success)' : 'var(--text-muted)',
                                    padding: '2px',
                                  }}
                                  title="Sao chép mật khẩu"
                                >
                                  {copiedPassId === row.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        <td
                          style={{
                            padding: '8px 10px',
                            color: isError ? 'var(--color-error)' : isSuccess ? 'var(--color-success-text)' : 'var(--text-secondary)',
                          }}
                        >
                          {row.message || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TopScrollTable>
          </div>
        )}

        {/* Chân trang hành động */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRunning}
          >
            Đóng
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isRunning && (
              <Button
                variant="danger"
                onClick={handleStop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Square size={14} />
                <span>Dừng Lại</span>
              </Button>
            )}

            {!isRunning && errorCount > 0 && (
              <Button
                variant="outline"
                onClick={() => handleStartProcess(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                <span>Thử Lại Dòng Lỗi ({errorCount})</span>
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => handleStartProcess(false)}
              disabled={isRunning || parsedList.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
              }}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Đang Xử Lý ({processedCount}/{totalCount})...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>
                    Bắt Đầu {action === 'change_pass' ? 'Đổi Pass' : 'Khóa TK'} ({parsedList.length} User)
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

