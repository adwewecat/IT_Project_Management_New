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
  KeyRound
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { copyToClipboard } from '../../utils/clipboard';
import {
  managedApiService,
  ManagedAPIItem,
  ManagedAPICreatePayload,
  ManagedAPIUpdatePayload
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

  // Tính host hiện tại
  const backendHost = window.location.hostname || 'localhost';
  const apiBaseUrl = `${window.location.protocol}//${backendHost}:8000`;

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
      setApis((prev) => prev.map((item) => (item.id === apiItem.id ? updated : item)));
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
        setApis((prev) => prev.map((item) => (item.id === editingApi.id ? updated : item)));
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
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Globe size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Cổng Quản Lý API & Điều Khiển Bật / Tắt (API Gateway)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Quản lý tập trung các liên kết API đối ngoại, tra cứu nhanh, kiểm tra trạng thái và chủ động Bật/Tắt API khi cần thiết.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={fetchApis} isLoading={loading}>
            Làm Mới
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={handleOpenCreate}>
            Thêm API Mới
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
                        title="Xóa API này"
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

      {/* Modal Thêm Mới / Chỉnh Sửa API */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingApi ? '✏️ Chỉnh Sửa Cấu Hình API' : '➕ Thêm Cấu Hình API Mới'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Tên API <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: API Thông Tin Nhà Hàng Cho NCC"
              value={formData.api_name}
              onChange={(e) => setFormData({ ...formData, api_name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                Mã Định Danh (Slug) {!editingApi && <span style={{ fontSize: '11px', color: '#94a3b8' }}>(để trống sẽ tự sinh)</span>}
              </label>
              <input
                type="text"
                disabled={Boolean(editingApi)}
                placeholder="ví dụ: ncc_restaurants"
                value={formData.api_code}
                onChange={(e) => setFormData({ ...formData, api_code: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: editingApi ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            <div style={{ width: '130px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                Phương Thức
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Đường Dẫn Endpoint Chính <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ví dụ: /api/v1/restaurants/ncc"
              value={formData.endpoint_path}
              onChange={(e) => setFormData({ ...formData, endpoint_path: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Đường Dẫn Phụ (Alias) <span style={{ fontSize: '11px', color: '#94a3b8' }}>(Tùy chọn)</span>
            </label>
            <input
              type="text"
              placeholder="ví dụ: /api/v1/partner/restaurants"
              value={formData.alias_path || ''}
              onChange={(e) => setFormData({ ...formData, alias_path: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Mô Tả Chức Năng
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả chức năng, các tham số hỗ trợ và hướng dẫn cho đối tác..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Cấu hình trạng thái & bảo mật */}
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              />
              <span>Cho phép kích hoạt API ngay (BẬT)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.require_api_key}
                onChange={(e) => setFormData({ ...formData, require_api_key: e.target.checked })}
              />
              <span>Yêu cầu khóa API Key khi truy cập (Header X-API-KEY)</span>
            </label>

            {formData.require_api_key && (
              <div style={{ marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Nhập khóa API Key bí mật..."
                  value={formData.api_key || ''}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="secondary" onClick={() => setFormModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingApi ? 'Cập Nhật' : 'Tạo API'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Chạy Thử API (Live Test Modal) */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title={`⚡ Kiểm Tra Phản Hồi API: ${testingApi?.api_name || ''}`}
        maxWidth="750px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
          {/* Header Thông Tin Gọi */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8'
                }}
              >
                {testingApi?.method || 'GET'}
              </span>
              <code style={{ fontSize: '12.5px', fontFamily: 'monospace' }}>
                {apiBaseUrl}{testingApi?.endpoint_path}
              </code>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={13} />}
              onClick={() => testingApi && handleTestApi(testingApi)}
              isLoading={testLoading}
            >
              Gọi Lại
            </Button>
          </div>

          {/* Kết Quả Phản Hồi */}
          {testLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <p style={{ margin: 0 }}>Đang gửi yêu cầu và đợi phản hồi từ server...</p>
            </div>
          ) : testResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Badge Status & Thời Gian */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                    backgroundColor: testResult.status === 200 ? '#dcfce7' : '#fee2e2',
                    color: testResult.status === 200 ? '#15803d' : '#b91c1c'
                  }}
                >
                  {testResult.status === 200 ? <CheckCircle size={15} /> : <XCircle size={15} />}
                  <span>Mã HTTP: {testResult.status} {testResult.statusText}</span>
                </div>

                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Thời gian phản hồi: <strong>{testResult.responseTimeMs} ms</strong>
                </span>

                {testingApi && !testingApi.is_enabled && (
                  <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                    (API đang bị KHÓA theo cấu hình Toggle)
                  </span>
                )}
              </div>

              {/* JSON Box */}
              <div
                style={{
                  maxHeight: '320px',
                  overflowY: 'auto',
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  lineHeight: 1.5
                }}
              >
                <pre style={{ margin: 0 }}>
                  {typeof testResult.data === 'object'
                    ? JSON.stringify(testResult.data, null, 2)
                    : String(testResult.data)}
                </pre>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Button variant="secondary" onClick={() => setTestModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
