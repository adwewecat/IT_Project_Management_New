import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Square,
  KeyRound,
  Lock,
  ShieldCheck,
  UserPlus,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TopScrollTable } from '../ui/TopScrollTable';
import { ssoManagementService } from '../../services/ssoManagementService';
import {
  SSOBulkActionType,
  SSOBulkRowProgress,
} from '../../types/ssoManagement';

interface SsoBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ActionOption {
  id: SSOBulkActionType;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'create',
    title: '1. Tạo Mới Tài Khoản',
    shortDesc: 'Failed Count = 0, Lockout End xóa trắng, Lockout Enabled = False, gán pass & quyền nếu có',
    icon: <UserPlus size={16} />,
    color: 'var(--color-primary)',
    badge: 'TẠO MỚI',
  },
  {
    id: 'update_pass',
    title: '2. Update Pass & Mở Khóa',
    shortDesc: 'Đổi pass theo file, Failed Count = 0, Lockout End xóa trắng, Lockout Enabled = False',
    icon: <KeyRound size={16} />,
    color: 'var(--color-primary)',
    badge: 'ĐỔI PASS',
  },
  {
    id: 'lock',
    title: '3. Khóa Tài Khoản',
    shortDesc: 'Lockout Enabled = TRUE, Failed Count = 4, Lockout End = Ngày giờ hiện tại',
    icon: <Lock size={16} />,
    color: 'var(--color-primary)',
    badge: 'KHÓA TK',
  },
  {
    id: 'update_permissions',
    title: '4. Update Quyền',
    shortDesc: 'Truy cập User & Clients, check các quyền được khai báo trong cột UPDATE QUYEN',
    icon: <ShieldCheck size={16} />,
    color: 'var(--color-primary)',
    badge: 'PHÂN QUYỀN',
  },
  {
    id: 'update_info',
    title: '5. Cập Nhật Thông Tin',
    shortDesc: 'Tìm user theo User Name / Email, cập nhật theo 3 cột: Email Mới, SĐT Mới, Loại TK Mới',
    icon: <FileText size={16} />,
    color: 'var(--color-primary)',
    badge: 'CẬP NHẬT',
  },
];

export const SsoBulkImportModal: React.FC<SsoBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedAction, setSelectedAction] = useState<SSOBulkActionType>('create');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<boolean>(false);
  const [rows, setRows] = useState<SSOBulkRowProgress[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopRequestedRef = useRef<boolean>(false);

  // Tải file template mẫu
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await ssoManagementService.downloadBulkTemplate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Lỗi tải file mẫu: ' + msg);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Chọn và phân tích file Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.xlsx') && !selectedFile.name.toLowerCase().endsWith('.xls')) {
      alert('Vui lòng chọn file định dạng Excel (.xlsx hoặc .xls)');
      return;
    }

    try {
      setUploading(true);
      setFile(selectedFile);
      const res = await ssoManagementService.parseExcel(selectedFile);
      const progressRows: SSOBulkRowProgress[] = res.rows.map((r, idx) => ({
        ...r,
        id: `row-${idx}-${r.user_name || r.email || idx}`,
        status: 'idle',
      }));
      setRows(progressRows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Lỗi khi đọc file Excel: ' + msg);
      setFile(null);
      setRows([]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Bắt đầu thực hiện xử lý tuần tự từng user
  const handleStartProcess = async (onlyFailed = false) => {
    if (rows.length === 0 || isRunning) return;

    setIsRunning(true);
    stopRequestedRef.current = false;

    const rowsToProcess = onlyFailed
      ? rows.map((r, i) => ({ row: r, index: i })).filter((item) => item.row.status === 'error')
      : rows.map((r, i) => ({ row: r, index: i }));

    for (const item of rowsToProcess) {
      if (stopRequestedRef.current) {
        break;
      }

      // Đổi trạng thái sang processing
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === item.index ? { ...r, status: 'processing', resultMessage: 'Đang xử lý qua IAM...' } : r
        )
      );

      try {
        const res = await ssoManagementService.processBulkItem({
          action: selectedAction,
          user_name: item.row.user_name,
          email: item.row.email,
          user_type: item.row.user_type,
          phone_number: item.row.phone_number,
          pass_word: item.row.pass_word,
          trang_thai: item.row.trang_thai,
          update_quyen: item.row.update_quyen,
          new_email: item.row.new_email,
          new_phone: item.row.new_phone,
          new_user_type: item.row.new_user_type,
        });

        setRows((prev) =>
          prev.map((r, idx) =>
            idx === item.index
              ? {
                  ...r,
                  user_name: res.user_name || r.user_name,
                  email: res.email || r.email,
                  status: res.success ? 'success' : 'error',
                  resultMessage: res.message || (res.success ? 'Thành công' : 'Lỗi không xác định'),
                  newPassword: res.new_password,
                  assignedClients: res.assigned_clients,
                }
              : r
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === item.index
              ? {
                  ...r,
                  status: 'error',
                  resultMessage: 'Lỗi mạng / phản hồi: ' + msg,
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

  const handleStopProcess = () => {
    stopRequestedRef.current = true;
  };

  // Sao chép pass
  const handleCopyPass = (id: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Tính toán thống kê
  const totalCount = rows.length;
  const successCount = rows.filter((r) => r.status === 'success').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const processedCount = rows.filter((r) => r.status === 'success' || r.status === 'error').length;
  const percent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isRunning) {
          onClose();
        }
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={20} style={{ color: 'var(--text-primary)' }} />
          <span>Import Xử Lý Hàng Loạt User IAM / SSO</span>
        </div>
      }
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Banner hướng dẫn & Nút tải template */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <strong>Quy chuẩn Import:</strong> Tất cả 5 tác vụ đều sử dụng <strong>chung 1 mẫu Excel 10 cột</strong>.
            Cột <strong>User Name</strong> hoặc <strong>Email</strong> chỉ cần có ít nhất 1 trong 2 cột để tìm kiếm user.
            Riêng tác vụ <strong>5. Cập Nhật Thông Tin</strong> sẽ lấy thông tin cập nhật từ 3 cột mới ở cuối (<strong>Email Mới</strong>, <strong>SĐT Mới</strong>, <strong>Loại TK Mới</strong>).
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {downloadingTemplate ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            <span>Tải File Excel Mẫu (.xlsx)</span>
          </Button>
        </div>

        {/* 5 Thẻ Chọn Tác Vụ */}
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            CHỌN 1 TRONG 5 TÁC VỤ CẦN THỰC HIỆN:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '10px',
            }}
          >
            {ACTION_OPTIONS.map((opt) => {
              const isSelected = selectedAction === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => !isRunning && setSelectedAction(opt.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-card)',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px' }}>
                      {opt.icon}
                      <span>{opt.badge}</span>
                    </div>
                    <input
                      type="radio"
                      name="sso_action"
                      checked={isSelected}
                      onChange={() => setSelectedAction(opt.id)}
                      disabled={isRunning}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    {opt.shortDesc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Khu vực Chọn / Upload File Excel */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '8px',
            border: '1px dashed var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
              disabled={isRunning || uploading}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRunning || uploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              {uploading ? <RefreshCw size={15} className="spin" /> : <Upload size={15} />}
              <span>{file ? 'Chọn File Khác...' : 'Chọn File Excel (.xlsx, .xls)'}</span>
            </Button>
            {file && (
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                Đã nạp file: <strong>{file.name}</strong> ({rows.length} dòng dữ liệu)
              </div>
            )}
          </div>

          {/* Progress / Status Counters */}
          {rows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px' }}>
              <span>Tổng số: <strong>{totalCount}</strong></span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Thành công: {successCount}</span>
              {errorCount > 0 && <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Lỗi: {errorCount}</span>}
            </div>
          )}
        </div>

        {/* Progress Bar khi đang xử lý */}
        {totalCount > 0 && processedCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Tiến độ thực hiện: {processedCount}/{totalCount} user</span>
              <span>{percent}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: errorCount > 0 && successCount === 0 ? 'var(--color-error)' : 'var(--color-primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Bảng Dữ Liệu Xem Trước & Kết Quả */}
        {rows.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                DANH SÁCH USER TỪ FILE ({rows.length} dòng):
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                * Cột áp dụng theo tác vụ <strong>{ACTION_OPTIONS.find((a) => a.id === selectedAction)?.badge}</strong>
              </div>
            </div>

            <TopScrollTable maxHeight="340px">
              <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ width: '45px', padding: '8px 10px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '100px', padding: '8px 10px', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ width: '130px', padding: '8px 10px' }}>User Name</th>
                    <th style={{ width: '150px', padding: '8px 10px' }}>Email</th>
                    <th style={{ width: '50px', padding: '8px 10px', textAlign: 'center' }}>Loại</th>
                    <th style={{ width: '105px', padding: '8px 10px' }}>Số Điện Thoại</th>
                    <th style={{ width: '110px', padding: '8px 10px' }}>Pass</th>
                    <th style={{ width: '150px', padding: '8px 10px' }}>Update Quyền</th>
                    <th
                      style={{
                        width: '150px',
                        padding: '8px 10px',
                        backgroundColor: selectedAction === 'update_info' ? 'var(--color-primary-light)' : 'inherit',
                        color: selectedAction === 'update_info' ? 'var(--text-primary)' : 'inherit',
                        fontWeight: selectedAction === 'update_info' ? 700 : 'inherit',
                      }}
                    >
                      Email Mới {selectedAction === 'update_info' && '⭐'}
                    </th>
                    <th
                      style={{
                        width: '105px',
                        padding: '8px 10px',
                        backgroundColor: selectedAction === 'update_info' ? 'var(--color-primary-light)' : 'inherit',
                        color: selectedAction === 'update_info' ? 'var(--text-primary)' : 'inherit',
                        fontWeight: selectedAction === 'update_info' ? 700 : 'inherit',
                      }}
                    >
                      SĐT Mới {selectedAction === 'update_info' && '⭐'}
                    </th>
                    <th
                      style={{
                        width: '80px',
                        padding: '8px 10px',
                        textAlign: 'center',
                        backgroundColor: selectedAction === 'update_info' ? 'var(--color-primary-light)' : 'inherit',
                        color: selectedAction === 'update_info' ? 'var(--text-primary)' : 'inherit',
                        fontWeight: selectedAction === 'update_info' ? 700 : 'inherit',
                      }}
                    >
                      Loại Mới {selectedAction === 'update_info' && '⭐'}
                    </th>
                    <th style={{ minWidth: '220px', padding: '8px 10px' }}>Chi Tiết / Kết Quả</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isProcessing = row.status === 'processing';
                    const isSuccess = row.status === 'success';
                    const isError = row.status === 'error';

                    const rowBg = isProcessing
                      ? 'var(--color-primary-light)'
                      : isSuccess
                      ? '#F0FDF4'
                      : isError
                      ? '#FEF2F2'
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
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          {isProcessing && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontWeight: 600 }}>
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
                        <td style={{ padding: '7px 10px', fontWeight: 700, fontFamily: 'monospace' }}>
                          {row.user_name || (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400, fontSize: '11px' }}>
                              (Tìm theo email)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 10px', color: row.email ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {row.email || (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400, fontSize: '11px' }}>
                              (Tìm theo user)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          {row.user_type || '0'}
                        </td>
                        <td style={{ padding: '7px 10px', fontFamily: 'monospace' }}>
                          {row.phone_number || '—'}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          {row.newPassword ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <code style={{ fontSize: '11.5px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '1px 5px', borderRadius: '4px' }}>
                                {row.newPassword}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopyPass(row.id, row.newPassword!)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: copiedId === row.id ? 'var(--color-success)' : 'var(--text-muted)',
                                }}
                                title="Sao chép mật khẩu"
                              >
                                {copiedId === row.id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : (
                            row.pass_word || '—'
                          )}
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.update_quyen}>
                          {row.update_quyen || '—'}
                        </td>
                        <td
                          style={{
                            padding: '7px 10px',
                            backgroundColor: selectedAction === 'update_info' && row.new_email ? 'var(--color-primary-light)' : 'inherit',
                            fontWeight: selectedAction === 'update_info' && row.new_email ? 600 : 400,
                          }}
                        >
                          {row.new_email || '—'}
                        </td>
                        <td
                          style={{
                            padding: '7px 10px',
                            fontFamily: 'monospace',
                            backgroundColor: selectedAction === 'update_info' && row.new_phone ? 'var(--color-primary-light)' : 'inherit',
                            fontWeight: selectedAction === 'update_info' && row.new_phone ? 600 : 400,
                          }}
                        >
                          {row.new_phone || '—'}
                        </td>
                        <td
                          style={{
                            padding: '7px 10px',
                            textAlign: 'center',
                            backgroundColor: selectedAction === 'update_info' && row.new_user_type ? 'var(--color-primary-light)' : 'inherit',
                            fontWeight: selectedAction === 'update_info' && row.new_user_type ? 600 : 400,
                          }}
                        >
                          {row.new_user_type || '—'}
                        </td>
                        <td style={{ padding: '7px 10px', color: isError ? 'var(--color-error)' : isSuccess ? 'var(--color-success-text)' : 'var(--text-secondary)' }}>
                          {row.resultMessage || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TopScrollTable>
          </div>
        )}

        {/* Thông báo chưa chọn file */}
        {rows.length === 0 && (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <FileSpreadsheet size={40} style={{ color: 'var(--border-color)' }} />
            <div style={{ fontSize: '13px' }}>
              Vui lòng tải file Excel mẫu (.xlsx) ở trên, điền danh sách user rồi bấm <strong>Chọn File Excel</strong> để nạp dữ liệu.
            </div>
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
                variant="outline"
                onClick={handleStopProcess}
                style={{
                  borderColor: 'var(--color-error)',
                  color: 'var(--color-error)',
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
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={14} />
                <span>Thử Lại Các Dòng Lỗi ({errorCount})</span>
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => handleStartProcess(false)}
              disabled={isRunning || rows.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
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
                  <span>Bắt Đầu Xử Lý ({rows.length} User)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
