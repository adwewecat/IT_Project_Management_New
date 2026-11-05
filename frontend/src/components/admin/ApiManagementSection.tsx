import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Code,
  KeyRound,
  Activity,
  AlertTriangle,
  FileText,
  Clock
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { copyToClipboard } from '../../utils/clipboard';
import {
  managedApiService,
  ManagedAPIItem,
  ManagedAPICreatePayload,
  ManagedAPIUpdatePayload,
  ManagedAPILogItem
} from '../../services/managedApiService';

export const ApiManagementSection: React.FC = () => {
  const [apis, setApis] = useState<ManagedAPIItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Modal Thêm / Sửa
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingApi, setEditingApi] = useState<ManagedAPIItem | null>(null);
  const [formData, setFormData] = useState<ManagedAPICreatePayload>({
    api_code: '',
    api_name: '',
    endpoint_path: '',
    alias_path: '',
    method: 'GET',
    description: '',
    is_enabled: true,
    require_api_key: false,
    api_key: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal Chạy thử (Live Test)
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testingApi, setTestingApi] = useState<ManagedAPIItem | null>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    statusText: string;
    responseTimeMs: number;
    data: any;
  } | null>(null);

  // Modal Xem Nhật Ký Truy Vấn 24h & Bắt Spam
  const [logsModalOpen, setLogsModalOpen] = useState<boolean>(false);
  const [selectedApiForLogs, setSelectedApiForLogs] = useState<ManagedAPIItem | null>(null);
  const [apiLogs, setApiLogs] = useState<ManagedAPILogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [totalLogs24h, setTotalLogs24h] = useState<number>(0);

  // Tự động nhận diện Base URL API theo đúng origin và port thực tế của web/proxy (vd: http://14.161.33.122:5001)
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchApis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await managedApiService.getApis();
      setApis(res.items || []);
    } catch (err) {
      console.error('Lỗi tải danh sách API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  // Sao chép link
  const handleCopy = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Toggle Bật / Tắt API
  const handleToggle = async (apiItem: ManagedAPIItem) => {
    setTogglingId(apiItem.id);
    const newStatus = !apiItem.is_enabled;
    try {
      const updated = await managedApiService.toggleApi(apiItem.id, newStatus);
      setApis((prev) => prev.map((item) => (item.id === apiItem.id ? { ...item, ...updated } : item)));
    } catch (err) {
      alert('Không thể thay đổi trạng thái API. Vui lòng thử lại!');
    } finally {
      setTogglingId(null);
    }
  };

  // Mở modal thêm mới
  const handleOpenCreate = () => {
    setEditingApi(null);
    setFormData({
      api_code: '',
      api_name: '',
      endpoint_path: '',
      alias_path: '',
      method: 'GET',
      description: '',
      is_enabled: true,
      require_api_key: false,
      api_key: ''
    });
    setFormModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (apiItem: ManagedAPIItem) => {
    setEditingApi(apiItem);
    setFormData({
      api_code: apiItem.api_code,
      api_name: apiItem.api_name,
      endpoint_path: apiItem.endpoint_path,
      alias_path: apiItem.alias_path || '',
      method: apiItem.method || 'GET',
      description: apiItem.description || '',
      is_enabled: apiItem.is_enabled,
      require_api_key: apiItem.require_api_key,
      api_key: apiItem.api_key || ''
    });
    setFormModalOpen(true);
  };

  // Lưu Form Thêm / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.api_name.trim() || !formData.endpoint_path.trim()) {
      alert('Vui lòng nhập tên API và đường dẫn endpoint.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingApi) {
        const updatePayload: ManagedAPIUpdatePayload = {
          api_name: formData.api_name,
          endpoint_path: formData.endpoint_path,
          alias_path: formData.alias_path || undefined,
          method: formData.method,
          description: formData.description || undefined,
          is_enabled: formData.is_enabled,
          require_api_key: formData.require_api_key,
          api_key: formData.api_key || undefined
        };
        const updated = await managedApiService.updateApi(editingApi.id, updatePayload);
        setApis((prev) => prev.map((item) => (item.id === editingApi.id ? { ...item, ...updated } : item)));
      } else {
        if (!formData.api_code.trim()) {
          formData.api_code = formData.api_name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .slice(0, 50);
        }
        const created = await managedApiService.createApi(formData);
        setApis((prev) => [...prev, created]);
      }
      setFormModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi lưu thông tin API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa API
  const handleDelete = async (apiItem: ManagedAPIItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa cấu hình API "${apiItem.api_name}"?`)) {
      return;
    }
    try {
      await managedApiService.deleteApi(apiItem.id);
      setApis((prev) => prev.filter((item) => item.id !== apiItem.id));
    } catch (err) {
      alert('Không thể xóa API này.');
    }
  };

  // Chạy thử API (Live Test)
  const handleTestApi = async (apiItem: ManagedAPIItem) => {
    setTestingApi(apiItem);
    setTestResult(null);
    setTestModalOpen(true);
    setTestLoading(true);

    const testUrl = `${apiBaseUrl}${apiItem.endpoint_path}`;
    const startTime = performance.now();
    try {
      const response = await fetch(testUrl, {
        method: apiItem.method || 'GET',
        headers: apiItem.require_api_key && apiItem.api_key ? { 'X-API-KEY': apiItem.api_key } : {}
      });
      const duration = Math.round(performance.now() - startTime);
      let data: any;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        responseTimeMs: duration,
        data
      });
      // Tự động làm mới danh sách để cập nhật số lượt request
      fetchApis();
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setTestResult({
        status: 0,
        statusText: 'Network Error / Blocked',
        responseTimeMs: duration,
        data: { error: err.message || 'Không thể kết nối đến API' }
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Mở modal xem logs 24h
  const handleOpenLogs = async (apiItem: ManagedAPIItem) => {
    setSelectedApiForLogs(apiItem);
    setLogsModalOpen(true);
    await loadApiLogs(apiItem.api_code);
  };

  const loadApiLogs = async (apiCode: string) => {
    setLogsLoading(true);
    try {
      const res = await managedApiService.getApiLogs(apiCode, 50, 24);
      setApiLogs(res.items || []);
      setTotalLogs24h(res.total_in_24h || 0);
    } catch (err) {
      console.error('Lỗi nạp nhật ký API:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Quản Lý API */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '18px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
          >
            <Globe size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Cổng Quản Lý API & Giám Sát Lưu Lượng 24h
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Quản lý tập trung các liên kết API mở ra bên ngoài, theo dõi số lượt request 24h, bắt spam và điều khiển BẬT/TẮT tức thì
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />}
            onClick={fetchApis}
            disabled={loading}
          >
            Làm Mới
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={handleOpenCreate}
            style={{ fontWeight: 600 }}
          >
            + Thêm API Mới
          </Button>
        </div>
      </div>

      {/* Danh Sách API */}
      {loading ? (
        <div
          style={{
            backgroundColor: 'var(--bg-card, #fff)',
            padding: '50px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
          <p style={{ margin: 0, fontSize: '13px' }}>Đang tải danh sách API...</p>
        </div>
      ) : apis.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-card, #fff)',
            padding: '50px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          <Code size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Chưa có API nào trong danh sách</p>
          <p style={{ margin: '4px 0 12px 0', fontSize: '12px' }}>Bấm nút "Thêm API Mới" bên trên để tạo cấu hình API đầu tiên.</p>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={handleOpenCreate}>
            Thêm Cấu Hình API
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {apis.map((item) => {
            const isToggling = togglingId === item.id;
            const fullPrimaryUrl = `${apiBaseUrl}${item.endpoint_path}`;
            const fullAliasUrl = item.alias_path ? `${apiBaseUrl}${item.alias_path}` : null;
            const requests24h = item.requests_24h || 0;
            const isHigh = item.is_high_traffic || requests24h >= 500;

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-card, #fff)',
                  borderRadius: '12px',
                  border: item.is_enabled ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  borderLeft: item.is_enabled ? '5px solid #10b981' : '5px solid #94a3b8'
                }}
              >
                {/* Header Dòng API: Tên, Method, Trạng Thái & Switch Bật/Tắt */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: item.method === 'GET' ? '#dcfce7' : '#dbeafe',
                        color: item.method === 'GET' ? '#15803d' : '#1d4ed8'
                      }}
                    >
                      {item.method}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {item.api_name}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {item.api_code}
                    </span>
                    {item.require_api_key && (
                      <span
                        style={{
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}
                      >
                        <KeyRound size={12} /> Yêu cầu API Key
                      </span>
                    )}
                  </div>

                  {/* Switch BẬT / TẮT trực quan */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: item.is_enabled ? '#16a34a' : '#64748b'
                      }}
                    >
                      {item.is_enabled ? '● ĐANG BẬT' : '○ ĐANG TẮT'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={isToggling}
                      title={item.is_enabled ? 'Bấm để Tắt API này (chặn truy cập)' : 'Bấm để Mở/Bật lại API này'}
                      style={{
                        width: '48px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: item.is_enabled ? '#10b981' : '#cbd5e1',
                        border: 'none',
                        cursor: isToggling ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        padding: '2px',
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          transform: item.is_enabled ? 'translateX(24px)' : 'translateX(0px)',
                          transition: 'transform 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          color: item.is_enabled ? '#10b981' : '#94a3b8'
                        }}
                      >
                        {isToggling ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> : item.is_enabled ? '✓' : '✕'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mô tả */}
                {item.description && (
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                )}

                {/* Thanh Đo Lường Lượt Request 24h & Cảnh Báo Spam */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    backgroundColor: isHigh ? '#fef2f2' : 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '8px',
                    border: isHigh ? '1px solid #fecaca' : '1px solid rgba(59, 130, 246, 0.15)',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={15} color={isHigh ? '#ef4444' : '#2563eb'} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Lưu lượng 24h qua:
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: isHigh ? '#fee2e2' : requests24h > 0 ? '#dcfce7' : '#f1f5f9',
                        color: isHigh ? '#b91c1c' : requests24h > 0 ? '#15803d' : '#64748b',
                        border: isHigh ? '1px solid #f87171' : '1px solid transparent'
                      }}
                    >
                      {requests24h} lượt request
                    </span>
                    {isHigh && (
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={13} /> Cảnh báo tần suất cao / Nguy cơ spam!
                      </span>
                    )}
                  </div>

                  <span style={{ color: 'var(--border-color)' }}>|</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Clock size={13} />
                    <span>Lần gọi gần nhất:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.last_requested_at ? new Date(item.last_requested_at).toLocaleString('vi-VN') : 'Chưa có'}
                    </span>
                    {item.last_client_ip && (
                      <span style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>
                        (IP: {item.last_client_ip})
                      </span>
                    )}
                  </div>

                  <span style={{ color: 'var(--border-color)' }}>|</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Tổng lũy kế:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{item.total_requests || 0} lượt</strong>
                  </div>

                  <div style={{ marginLeft: 'auto' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<FileText size={13} color="#2563eb" />}
                      onClick={() => handleOpenLogs(item)}
                      style={{ fontSize: '11.5px', padding: '3px 10px' }}
                      title="Xem danh sách chi tiết các lượt gọi, IP và độ trễ phản hồi trong 24h"
                    >
                      Xem Nhật Ký 24h
                    </Button>
                  </div>
                </div>

                {/* Cụm Link API */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Link chính */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', minWidth: '85px' }}>
                      Link Chính:
                    </span>
                    <code
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}
                    >
                      {fullPrimaryUrl}
                    </code>

                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={copiedKey === `primary-${item.id}` ? <Check size={13} /> : <Copy size={13} />}
                      onClick={() => handleCopy(fullPrimaryUrl, `primary-${item.id}`)}
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      {copiedKey === `primary-${item.id}` ? 'Đã chép' : 'Sao chép'}
                    </Button>

                    <a href={fullPrimaryUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" title="Mở link trực tiếp trên tab mới" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        <ExternalLink size={13} />
                      </Button>
                    </a>
                  </div>

                  {/* Link Alias (nếu có) */}
                  {fullAliasUrl && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', minWidth: '85px' }}>
                        Link Alias:
                      </span>
                      <code
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all'
                        }}
                      >
                        {fullAliasUrl}
                      </code>

                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={copiedKey === `alias-${item.id}` ? <Check size={13} /> : <Copy size={13} />}
                        onClick={() => handleCopy(fullAliasUrl, `alias-${item.id}`)}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {copiedKey === `alias-${item.id}` ? 'Đã chép' : 'Sao chép'}
                      </Button>

                      <a href={fullAliasUrl} target="_blank" rel="noreferrer">
                        <Button variant="secondary" size="sm" title="Mở alias trên tab mới" style={{ fontSize: '11px', padding: '3px 8px' }}>
                          <ExternalLink size={13} />
                        </Button>
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer Dòng: Các Thao Tác Chạy Thử, Chỉnh Sửa, Xóa */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>
                      Cập nhật: {item.updated_at ? new Date(item.updated_at).toLocaleString('vi-VN') : '—'}
                    </span>
                    {item.created_by && <span>• Người tạo: {item.created_by}</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Play size={13} style={{ color: '#0284c7' }} />}
                      onClick={() => handleTestApi(item)}
                      style={{ fontSize: '11.5px', padding: '3px 10px' }}
                      title="Gọi kiểm tra phản hồi API trực tiếp"
                    >
                      Kiểm Tra / Chạy Thử
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Edit2 size={13} />}
                      onClick={() => handleOpenEdit(item)}
                      style={{ fontSize: '11.5px', padding: '3px 10px' }}
                      title="Chỉnh sửa thông tin API"
                    >
                      Sửa
                    </Button>
                    {item.api_code !== 'ncc_restaurants' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Trash2 size={13} style={{ color: '#ef4444' }} />}
                        onClick={() => handleDelete(item)}
                        style={{ fontSize: '11.5px', padding: '3px 10px', color: '#ef4444' }}
                        title="Xóa cấu hình API này"
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Xem Nhật Ký Truy Vấn 24h & Bắt Spam */}
      {logsModalOpen && selectedApiForLogs && (
        <Modal
          isOpen={logsModalOpen}
          onClose={() => setLogsModalOpen(false)}
          title={`📋 Nhật Ký Truy Vấn 24h - ${selectedApiForLogs.api_name}`}
          maxWidth="900px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh' }}>
            {/* Thanh thông tin tổng quan modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                fontSize: '12.5px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <strong>Mã API:</strong> <code style={{ backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>{selectedApiForLogs.api_code}</code>
                <span style={{ margin: '0 8px' }}>•</span>
                <strong>Lượt gọi trong 24h:</strong> <span style={{ color: totalLogs24h >= 500 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{totalLogs24h} lượt</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={13} style={{ animation: logsLoading ? 'spin 1s linear infinite' : 'none' }} />}
                onClick={() => loadApiLogs(selectedApiForLogs.api_code)}
                disabled={logsLoading}
              >
                Làm Mới Logs
              </Button>
            </div>

            {/* Bảng danh sách nhật ký (Sticky header, independent scroll) */}
            <div
              style={{
                flex: 1,
                minHeight: '250px',
                maxHeight: '450px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr
                    style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'var(--bg-secondary)',
                      zIndex: 10,
                      borderBottom: '2px solid var(--border-color)'
                    }}
                  >
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Thời Gian</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>IP Người Gọi</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Đường Dẫn Endpoint</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>Mã HTTP</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Độ Trễ</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Ứng Dụng / User-Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', marginBottom: '6px' }} />
                        <div>Đang tải dữ liệu nhật ký...</div>
                      </td>
                    </tr>
                  ) : apiLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa ghi nhận lượt request nào trong 24 giờ qua.
                      </td>
                    </tr>
                  ) : (
                    apiLogs.map((log) => {
                      const isOk = log.status_code === 200;
                      const isBlocked = log.status_code === 503;
                      const isAuthErr = log.status_code === 401;

                      return (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isBlocked ? '#fffbeb' : isAuthErr ? '#fef2f2' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                            {new Date(log.requested_at).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 600 }}>
                            {log.client_ip || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#0284c7' }}>
                            {log.endpoint_called || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isOk ? '#dcfce7' : isBlocked ? '#fef3c7' : '#fee2e2',
                                color: isOk ? '#15803d' : isBlocked ? '#b45309' : '#b91c1c'
                              }}
                            >
                              {log.status_code} {isOk ? 'OK' : isBlocked ? 'Bị Khóa' : 'Lỗi'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {log.response_time_ms !== null && log.response_time_ms !== undefined ? `${log.response_time_ms} ms` : '—'}
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'var(--text-secondary)',
                              fontSize: '11px'
                            }}
                            title={log.user_agent || ''}
                          >
                            {log.user_agent || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Chú thích & Cảnh báo spam */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span>* Hiển thị tối đa 50 lượt gọi gần nhất trong vòng 24 giờ.</span>
              <Button variant="secondary" size="sm" onClick={() => setLogsModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Chạy Thử API (Live Test) */}
      {testModalOpen && testingApi && (
        <Modal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          title={`⚡ Kiểm Tra Phản Hồi API: ${testingApi.api_name}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* URL gọi */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            >
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#15803d'
                }}
              >
                {testingApi.method}
              </span>
              <code style={{ fontSize: '12px', flex: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {apiBaseUrl}{testingApi.endpoint_path}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestApi(testingApi)}
                disabled={testLoading}
                leftIcon={<RefreshCw size={12} style={{ animation: testLoading ? 'spin 1s linear infinite' : 'none' }} />}
              >
                Gọi Lại
              </Button>
            </div>

            {/* Trạng thái phản hồi */}
            {testLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Đang gửi request và đợi phản hồi...</p>
              </div>
            ) : testResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor:
                        testResult.status === 200
                          ? '#dcfce7'
                          : testResult.status === 503
                          ? '#fef3c7'
                          : '#fee2e2',
                      color:
                        testResult.status === 200
                          ? '#15803d'
                          : testResult.status === 503
                          ? '#b45309'
                          : '#b91c1c'
                    }}
                  >
                    {testResult.status === 200 ? (
                      <CheckCircle size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    <span>
                      Mã HTTP: {testResult.status} {testResult.statusText}
                    </span>
                  </div>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Thời gian phản hồi: <strong>{testResult.responseTimeMs} ms</strong>
                  </span>
                </div>

                {/* Kết quả JSON */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.5
                  }}
                >
                  {typeof testResult.data === 'object'
                    ? JSON.stringify(testResult.data, null, 2)
                    : String(testResult.data)}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <Button variant="secondary" onClick={() => setTestModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Thêm / Chỉnh Sửa API */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={editingApi ? `Chỉnh Sửa API: ${editingApi.api_name}` : 'Thêm Cấu Hình API Mới'}
          maxWidth="600px"
        >
          <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                Tên API <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.api_name}
                onChange={(e) => setFormData({ ...formData, api_name: e.target.value })}
                placeholder="VD: API Danh Sách Nhà Hàng Cho Đối Tác"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                  Mã API (Slug)
                </label>
                <input
                  type="text"
                  value={formData.api_code}
                  onChange={(e) => setFormData({ ...formData, api_code: e.target.value })}
                  placeholder="VD: ncc_restaurants (tự động tạo nếu để trống)"
                  disabled={!!editingApi}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: editingApi ? 'var(--bg-secondary)' : 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                  Phương Thức HTTP
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="GET">GET (Truy xuất dữ liệu)</option>
                  <option value="POST">POST (Gửi dữ liệu)</option>
                  <option value="PUT">PUT (Cập nhật)</option>
                  <option value="DELETE">DELETE (Xóa)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                Đường Dẫn Endpoint Chính <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.endpoint_path}
                onChange={(e) => setFormData({ ...formData, endpoint_path: e.target.value })}
                placeholder="VD: /api/v1/restaurants/ncc"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                Đường Dẫn Alias (Bí Danh / Tùy Chọn)
              </label>
              <input
                type="text"
                value={formData.alias_path || ''}
                onChange={(e) => setFormData({ ...formData, alias_path: e.target.value })}
                placeholder="VD: /api/v1/partner/restaurants"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                Mô Tả & Ghi Chú
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chức năng, quy định và thông số kỹ thuật của API..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="is_enabled_check"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="is_enabled_check" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Kích hoạt API ngay sau khi lưu (Bật)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" onClick={() => setFormModalOpen(false)} disabled={isSubmitting}>
                Hủy Bỏ
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : editingApi ? 'Cập Nhật' : 'Thêm Mới'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
