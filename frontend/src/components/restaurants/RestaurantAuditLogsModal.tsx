import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Download,
  RefreshCw,
  Search,
  User,
  Filter,
  RotateCcw,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DateInput, parseAndValidateDate } from '../ui/DateInput';
import { Badge } from '../ui/Badge';
import { RestaurantAuditLogItem } from '../../types/restaurant';
import { getRestaurantLogs, exportRestaurantLogsExcel } from '../../services/restaurantService';

interface RestaurantAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RestaurantAuditLogsModal: React.FC<RestaurantAuditLogsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<RestaurantAuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [actionType, setActionType] = useState<string>('');
  const [userThuchien, setUserThuchien] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Chuẩn hóa ngày nếu có nhập
      const fromNorm = fromDate.trim() ? parseAndValidateDate(fromDate).normalized || fromDate.trim() : undefined;
      const toNorm = toDate.trim() ? parseAndValidateDate(toDate).normalized || toDate.trim() : undefined;

      const res = await getRestaurantLogs({
        from_date: fromNorm,
        to_date: toNorm,
        action_type: actionType || undefined,
        user_thuchien: userThuchien.trim() || undefined,
        search: searchText.trim() || undefined,
      });

      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, actionType, userThuchien, searchText]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setActionType('');
    setUserThuchien('');
    setSearchText('');
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const fromNorm = fromDate.trim() ? parseAndValidateDate(fromDate).normalized || fromDate.trim() : undefined;
      const toNorm = toDate.trim() ? parseAndValidateDate(toDate).normalized || toDate.trim() : undefined;

      const blob = await exportRestaurantLogsExcel({
        from_date: fromNorm,
        to_date: toNorm,
        action_type: actionType || undefined,
        user_thuchien: userThuchien.trim() || undefined,
        search: searchText.trim() || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Bao_Cao_Logs_Nha_Hang_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Xuất file Excel thất bại.');
    } finally {
      setIsExporting(false);
    }
  };

  const getActionBadge = (action: string | null | undefined) => {
    const act = (action || '').toLowerCase();
    if (act.includes('thêm') || act.includes('tạo') || act.includes('create') || act.includes('thêm m?i')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#166534',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', flexShrink: 0 }} />
          Thêm mới
        </span>
      );
    }
    if (act.includes('cập nhật') || act.includes('sửa') || act.includes('update') || act.includes('c?p nh?t')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#1e40af',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
          Cập nhật
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary, #64748b)',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
        {action || 'Khác'}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1100px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ClipboardList size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>
                Báo Cáo Logs Nhà Hàng
              </span>
              <Badge variant="primary">{logs.length} / {total} bản ghi</Badge>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
              Theo dõi lịch sử thay đổi thông tin nhà hàng (Mặc định hiển thị 200 dòng gần nhất. Chọn ngày để lọc thêm)
            </p>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#047857' }}>
            <ShieldCheck size={16} />
            <span>Chính sách bảo mật: Mật khẩu luôn được mã hóa/che giấu, tuyệt đối không lưu vết mật khẩu thô trong logs.</span>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '76vh' }}>
        {/* Filter Bar */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              alignItems: 'flex-end',
            }}
          >
            {/* Từ ngày */}
            <DateInput
              label="Từ Ngày"
              value={fromDate}
              onChange={setFromDate}
              placeholder="YYYY-MM-DD"
            />

            {/* Đến ngày */}
            <DateInput
              label="Đến Ngày"
              value={toDate}
              onChange={setToDate}
              placeholder="YYYY-MM-DD"
            />

            {/* Loại thao tác */}
            <Select
              label="Hành Động"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              options={[
                { value: '', label: 'Tất Cả Hành Động' },
                { value: 'Thêm mới nhà hàng', label: '➕ Thêm mới nhà hàng' },
                { value: 'Cập nhật nhà hàng', label: '✏️ Cập nhật nhà hàng' },
              ]}
            />

            {/* Người thực hiện */}
            <Input
              label="Người Thực Hiện"
              value={userThuchien}
              onChange={(e) => setUserThuchien(e.target.value)}
              placeholder="Username..."
              leftIcon={<User size={15} />}
            />

            {/* Tìm kiếm nội dung */}
            <Input
              label="Tìm Kiếm Nội Dung"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tên nhà hàng, SAP, ID..."
              leftIcon={<Search size={15} />}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="primary"
                leftIcon={<Filter size={15} />}
                onClick={fetchLogs}
                isLoading={isLoading}
              >
                Lọc Dữ Liệu
              </Button>
              <Button
                variant="secondary"
                leftIcon={<RotateCcw size={15} />}
                onClick={handleResetFilters}
              >
                Đặt Lại
              </Button>
            </div>

            <Button
              variant="secondary"
              leftIcon={<Download size={15} />}
              onClick={handleExportExcel}
              isLoading={isExporting}
              title="Xuất kết quả logs hiện tại ra file Excel .xlsx"
            >
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Table View */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  borderBottom: '2px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-secondary, #475569)',
                  fontSize: '12px',
                  fontWeight: 700,
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                }}
              >
                <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>Mã Log</th>
                <th style={{ padding: '10px 12px', width: '160px' }}>Thời Gian</th>
                <th style={{ padding: '10px 12px', width: '130px' }}>Người Thực Hiện</th>
                <th style={{ padding: '10px 12px', width: '120px' }}>Hành Động</th>
                <th style={{ padding: '10px 12px' }}>Chi Tiết Nội Dung Thay Đổi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Đang tải danh sách nhật ký thay đổi...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ClipboardList size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy bản ghi nhật ký nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #fafafa)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      #{log.id}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} color="#94a3b8" />
                        <span>{log.ngay_insert || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {log.user_thuchien || 'Hệ thống'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {getActionBadge(log.chucnang)}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        lineHeight: 1.4,
                        color: 'var(--text-primary)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {log.noidung}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
