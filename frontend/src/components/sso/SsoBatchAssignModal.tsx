import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Play,
  Square,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
  CheckSquare,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TopScrollTable } from '../ui/TopScrollTable';
import { ssoManagementService } from '../../services/ssoManagementService';
import {
  SSOQuickRowProgress,
  SSOBatchExportItem,
} from '../../types/ssoManagement';

// Danh sách 4 quyền mặc định NCC (Đối Tác)
export const DEFAULT_NCC_CLIENTS_LIST = [
  'Hệ thống GChecklist',
  'PoPortal_Hệ thống đặt hàng Hồ Chí Minh',
  'Hệ thống E-Bidding',
  'SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete',
];

// Danh sách 14 quyền mặc định GGG (Nội Bộ)
export const DEFAULT_GGG_CLIENTS_LIST = [
  'Chatbot cho hệ thống GPMS và G-Office (Phân quyền người dùng)',
  'Client Gương Thần API (Phân quyền người dùng)',
  'Client Gương Thần App (Phân quyền người dùng)',
  'Hệ thống G-Office ( Phân quyền người dùng)',
  'Hệ thống Quick Ticket',
  'Hệ thống GChecklist',
  'GStars_App_RM_PROD - Client dự án Gstars APP cho RM - PROD',
  'GStars_Web_RM_PROD - Webadmin dự án GStars App RM - PROD',
  'G Survey hệ thống khảo sát',
  'Hệ thống G-PMS',
  'Gstar Mobile App Client - Donot delete',
  'GHERO_Hệ thống Ghero',
  'ggg_sso_pim_created_date_19102021',
  'SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete',
];

// Danh sách tổng hợp toàn bộ các client phổ biến trên hệ thống IAM
export const ALL_KNOWN_CLIENTS = Array.from(
  new Set([
    ...DEFAULT_NCC_CLIENTS_LIST,
    ...DEFAULT_GGG_CLIENTS_LIST,
    'Hệ thống CMS Golden Gate (Phân quyền người dùng)',
    'Hệ thống giám sát và vận hành (Incident Platform)',
    'Client Gương Thần Job (Đồng bộ dữ liệu đánh giá)',
    'Sales Force (Phân quyền người dùng)',
    'CMS AI (Quản lý bot)',
    'devops_client_prod',
    'Gmonitor Miền Nam',
    'Gmonitor Miền Bắc',
    'res_promo_client_id_2_prod',
    'Test hiệu năng G-Office',
  ])
);

interface SsoBatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SsoBatchAssignModal: React.FC<SsoBatchAssignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Mặc định chọn 4 quyền NCC
  const [selectedClients, setSelectedClients] = useState<string[]>(DEFAULT_NCC_CLIENTS_LIST);
  const [rawText, setRawText] = useState<string>('');
  const [rows, setRows] = useState<SSOQuickRowProgress[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  const stopRequestedRef = useRef<boolean>(false);

  // Phân tích danh sách từ khóa từ khung văn bản
  const parseQueries = (text: string): string[] => {
    const rawList = text.split(/[\r\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
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

  // Toggle chọn 1 client
  const handleToggleClient = (clientName: string) => {
    if (isRunning) return;
    setSelectedClients((prev) =>
      prev.includes(clientName)
        ? prev.filter((c) => c !== clientName)
        : [...prev, clientName]
    );
  };

  // Chọn preset 4 quyền NCC
  const handleSelectNccPreset = () => {
    if (isRunning) return;
    setSelectedClients(DEFAULT_NCC_CLIENTS_LIST);
  };

  // Chọn preset 14 quyền GGG
  const handleSelectGggPreset = () => {
    if (isRunning) return;
    setSelectedClients(DEFAULT_GGG_CLIENTS_LIST);
  };

  // Toggle Chọn tất cả / Bỏ chọn tất cả
  const handleToggleSelectAllClients = () => {
    if (isRunning) return;
    if (selectedClients.length === ALL_KNOWN_CLIENTS.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients([...ALL_KNOWN_CLIENTS]);
    }
  };

  // Xuất file Excel báo cáo kết quả
  const handleExportExcel = async () => {
    if (rows.length === 0 || exportingExcel) return;
    try {
      setExportingExcel(true);
      const exportItems: SSOBatchExportItem[] = rows.map((r) => ({
        query: r.query,
        match_type: r.match_type || '',
        user_name: r.user_name || '',
        email: r.email || '',
        phone_number: r.phone_number || '',
        assigned_clients: r.assigned_clients ? r.assigned_clients.join(', ') : '',
        status: r.status === 'success' ? 'success' : 'error',
        message: r.message || (r.status === 'success' ? 'Thành công' : 'Lỗi'),
      }));
      await ssoManagementService.exportBatchResults('assign_permissions', exportItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Lỗi xuất file Excel: ' + msg);
    } finally {
      setExportingExcel(false);
    }
  };

  // Bắt đầu xử lý phân quyền hàng loạt
  const handleStartProcess = async (onlyFailed = false) => {
    if (selectedClients.length === 0) {
      alert('Vui lòng chọn ít nhất 1 quyền client cần phân quyền.');
      return;
    }

    let targetRows: SSOQuickRowProgress[] = [];

    if (onlyFailed) {
      targetRows = rows.filter((r) => r.status === 'error');
    } else {
      const queries = parseQueries(rawText);
      if (queries.length === 0) return;
      targetRows = queries.map((q, idx) => ({
        id: `assign-${idx}-${q}`,
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

      setRows((prev) =>
        prev.map((r) =>
          r.id === currentItem.id
            ? { ...r, status: 'processing', message: 'Đang mở User & Clients trên IAM...' }
            : r
        )
      );

      try {
        const res = await ssoManagementService.quickProcessItem({
          action: 'assign_permissions',
          query: currentItem.query,
          clients: selectedClients,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.id === currentItem.id
              ? {
                  ...r,
                  user_name: res.user_name || r.user_name,
                  email: res.email || r.email,
                  phone_number: res.phone_number || r.phone_number,
                  match_type: res.match_type || r.match_type,
                  assigned_clients: res.assigned_clients,
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

  const handleStop = () => {
    stopRequestedRef.current = true;
  };

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
          <ShieldCheck size={20} style={{ color: 'var(--text-primary)' }} />
          <span>Phân Quyền User & Clients (Hàng Loạt)</span>
        </div>
      }
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '82vh', overflowY: 'auto' }}>
        {/* Khối 1: Các Quyền Mặc Định Cần Phân */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                1. CÁC QUYỀN MẶC ĐỊNH CẦN PHÂN:
              </span>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--color-primary)',
                }}
              >
                Đã chọn: {selectedClients.length}/{ALL_KNOWN_CLIENTS.length} quyền
              </span>
            </div>

            {/* Presets & Chọn tất cả */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNccPreset}
                disabled={isRunning}
                style={{ fontSize: '11.5px', padding: '4px 8px' }}
                title="Chọn nhanh 4 quyền chuẩn cho Đối Tác / Nhà Cung Cấp"
              >
                <CheckSquare size={13} />
                <span>⚡ 4 Quyền Mặc Định NCC</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectGggPreset}
                disabled={isRunning}
                style={{ fontSize: '11.5px', padding: '4px 8px' }}
                title="Chọn nhanh 14 quyền chuẩn cho Nhân viên nội bộ GGG"
              >
                <CheckSquare size={13} />
                <span>⚡ 14 Quyền Mặc Định GGG</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAllClients}
                disabled={isRunning}
                style={{ fontSize: '11.5px', padding: '4px 8px' }}
              >
                <RotateCcw size={13} />
                <span>{selectedClients.length === ALL_KNOWN_CLIENTS.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}</span>
              </Button>
            </div>
          </div>

          {/* Lưới danh sách các quyền Client */}
          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              padding: '8px 12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '6px',
            }}
          >
            {ALL_KNOWN_CLIENTS.map((client) => {
              const isChecked = selectedClients.includes(client);
              const isNcc = DEFAULT_NCC_CLIENTS_LIST.includes(client);
              return (
                <label
                  key={client}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isChecked ? 'var(--bg-primary)' : 'transparent',
                    border: isChecked ? '1px solid var(--color-primary)' : '1px solid transparent',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    lineHeight: 1.3,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleClient(client)}
                    disabled={isRunning}
                    style={{ cursor: isRunning ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, color: 'var(--text-primary)' }}>
                    {client}
                  </span>
                  {isNcc && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-primary-light)',
                        border: '1px solid var(--color-primary)',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      NCC
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Khối 2: Danh Sách User Cần Phân Quyền */}
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
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              2. DANH SÁCH USER CẦN PHÂN QUYỀN (USER NAME, EMAIL HOẶC SỐ ĐIỆN THOẠI):
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
            rows={4}
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

        {/* Khối 3: Tiến Độ Thực Hiện */}
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
                  <RefreshCw size={13} className="spin" /> Đang cập nhật quyền trên IAM...
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

        {/* Khối 4: Bảng Kết Quả Thực Thi */}
        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  KẾT QUẢ PHÂN QUYỀN CHI TIẾT:
                </div>
                {/* Bộ lọc trạng thái nhanh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      fontWeight: filterStatus === 'all' ? 700 : 500,
                      border: filterStatus === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      backgroundColor: filterStatus === 'all' ? 'var(--color-primary)' : 'transparent',
                      color: filterStatus === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Tất cả ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('success')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      fontWeight: filterStatus === 'success' ? 700 : 500,
                      border: filterStatus === 'success' ? '1px solid var(--color-success)' : '1px solid var(--border-color)',
                      backgroundColor: filterStatus === 'success' ? 'var(--color-success-bg)' : 'transparent',
                      color: filterStatus === 'success' ? 'var(--color-success)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Thành công ({successCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('error')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      fontWeight: filterStatus === 'error' ? 700 : 500,
                      border: filterStatus === 'error' ? '1px solid var(--color-error)' : '1px solid var(--border-color)',
                      backgroundColor: filterStatus === 'error' ? 'var(--color-error-bg)' : 'transparent',
                      color: filterStatus === 'error' ? 'var(--color-error)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Cần kiểm tra ({errorCount})
                  </button>
                </div>
              </div>
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

            <TopScrollTable maxHeight="300px">
              <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ width: '45px', padding: '8px 10px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '95px', padding: '8px 10px', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ width: '140px', padding: '8px 10px' }}>Từ Khóa Nhập</th>
                    <th style={{ width: '135px', padding: '8px 10px' }}>Kiểu So Khớp</th>
                    <th style={{ width: '130px', padding: '8px 10px' }}>UserName IAM</th>
                    <th style={{ width: '160px', padding: '8px 10px' }}>Email IAM</th>
                    <th style={{ width: '140px', padding: '8px 10px' }}>Quyền Đã Phân</th>
                    <th style={{ padding: '8px 10px' }}>Chi Tiết / Phản Hồi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) => {
                      if (filterStatus === 'success') return r.status === 'success';
                      if (filterStatus === 'error') return r.status === 'error';
                      return true;
                    })
                    .map((row, idx) => {
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

                      const isAmbiguousError = row.message?.includes('tài khoản tương tự') || row.message?.includes('Không tìm thấy tài khoản nào khớp chính xác');

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
                          <td style={{ padding: '8px 10px' }}>
                            {row.match_type ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '11px',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: isSuccess ? 'var(--color-success)' : 'var(--color-error)',
                                  fontWeight: 600,
                                }}
                              >
                                {row.match_type}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                            {row.user_name || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.email || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.assigned_clients && row.assigned_clients.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {row.assigned_clients.length} quyền
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td
                            style={{
                              padding: '8px 10px',
                              color: isError ? 'var(--color-error)' : isSuccess ? 'var(--color-success-text)' : 'var(--text-secondary)',
                            }}
                          >
                            {isAmbiguousError ? (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <AlertTriangle size={15} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>{row.message}</span>
                              </div>
                            ) : (
                              row.message || '—'
                            )}
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
              disabled={isRunning || parsedList.length === 0 || selectedClients.length === 0}
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
                  <span>Đang Phân Quyền ({processedCount}/{totalCount})...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>
                    Bắt Đầu Phân Quyền ({parsedList.length} User - {selectedClients.length} Quyền)
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

