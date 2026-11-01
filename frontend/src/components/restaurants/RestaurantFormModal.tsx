import React, { useState, useEffect } from 'react';
import { Store, Network, Wifi, MapPin, Save, Lock, Check, Shield, ShieldAlert, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchableSelect } from '../ui/SearchableSelect';
import { DateInput, parseAndValidateDate } from '../ui/DateInput';
import { Alert } from '../ui/Alert';
import { RestaurantItem } from '../../types/restaurant';
import { useAuth } from '../../contexts/AuthContext';
import { createRestaurant, updateRestaurant } from '../../services/restaurantService';

/**
 * Sinh mã tạm ngẫu nhiên theo định dạng người dùng yêu cầu: 9987axz112 (cần bổ sung mã đúng)
 * Cấu trúc: 4 chữ số + 3 chữ thường + 3 chữ số (tổng 10 ký tự) + ' (cần bổ sung mã đúng)'
 */
export const generateTempPendingCode = (): string => {
  const digits = '0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  const part2 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  return `${part1}${part2}${part3} (cần bổ sung mã đúng)`;
};

interface RestaurantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: RestaurantItem | null; // null => create mode
  regionOptions: string[];
  brandOptions: string[];
  onSaved: () => void;
}

export const RestaurantFormModal: React.FC<RestaurantFormModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  regionOptions,
  brandOptions,
  onSaved,
}) => {
  const { user } = useAuth();
  const isEditMode = !!restaurant;

  const isSuperAdmin = !!user?.is_super_admin || user?.username?.toLowerCase() === 'admin' || user?.phanquyen === '0';
  const isAdmin = user?.phanquyen === '1' || isSuperAdmin;

  // Mapping field names to possible update permission keys (including aliases and legacy groups)
  const FIELD_PERMISSION_MAP: Record<string, string[]> = {
    email: ['update_email', 'update_email_nh'],
    ip: ['update_ip', 'update_ip_lan'],
    ip_wan: ['update_ip_wan', 'update_ipwan'],
    note: ['update_note', 'update_note_nh'],
    user_ftth: ['update_user_ftth', 'update_ftth'],
    pass_ftth: ['update_pass_ftth', 'update_ftth'],
    thanhtoan_ftth: ['update_thanhtoan_ftth', 'update_ftth'],
    ngay_online_ftth: ['update_ngay_online_ftth', 'update_ftth'],
    pass_ou_ko_sys: ['update_pass_ou_ko_sys', 'update_sys'],
    sys_sales: ['update_sys_sales', 'update_sys'],
    ext: ['update_ext', 'update_ext_rsc'],
    pass_mail: ['update_pass_mail'],
    trangthai: ['update_trangthai'],
  };

  const canEditField = (fieldName: string): boolean => {
    // Trường 'status' (Xóa mềm / Ẩn nhà hàng) CHỈ Super Admin mới thấy và sửa
    if (fieldName === 'status') return isSuperAdmin;
    if (isAdmin) return true;
    if (!user?.permissions) return false;

    const aliases = FIELD_PERMISSION_MAP[fieldName] || [`update_${fieldName}`];
    return aliases.some((key) => !!user.permissions[key]);
  };

  const renderFieldLabel = (title: string, fieldName: string, required: boolean = false) => {
    const editable = canEditField(fieldName);
    const isCodeField = !isEditMode && (fieldName === 'sap' || fieldName === 'coscenter' || fieldName === 'rk7');
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>
            {title} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
          </span>
          {isCodeField && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleChange(fieldName, generateTempPendingCode());
              }}
              style={{
                fontSize: '11px',
                color: '#b45309',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '4px',
                padding: '1px 6px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                lineHeight: 1.2,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fde68a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fef3c7';
              }}
              title="Nhấp để tự tạo ngay một mã tạm ngẫu nhiên kèm '(cần bổ sung mã đúng)'"
            >
              <Sparkles size={11} color="#d97706" /> Tạo mã tạm
            </button>
          )}
        </span>
        {!editable ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid #fca5a5',
              marginLeft: '8px',
            }}
            title="Tài khoản của bạn không có quyền chỉnh sửa trường này (Chỉ xem)"
          >
            <Lock size={10} /> Chỉ đọc
          </span>
        ) : (
          !isAdmin && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#16a34a',
                backgroundColor: '#dcfce7',
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid #86efac',
                marginLeft: '8px',
              }}
              title="Bạn được phép chỉnh sửa trường này"
            >
              <Check size={10} /> Được sửa
            </span>
          )
        )}
      </span>
    );
  };

  const [activeTab, setActiveTab] = useState<'main' | 'contact' | 'network' | 'telecom'>('main');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        res: restaurant.res || '',
        sap: restaurant.sap || '',
        coscenter: restaurant.coscenter || '',
        rk7: restaurant.rk7 || '',
        sap_old: restaurant.sap_old || '',
        oracale: restaurant.oracale || '',
        don_gia: restaurant.don_gia || '',
        address: restaurant.address || '',
        region: restaurant.region || '',
        brand: restaurant.brand || '',
        sdt_nh: restaurant.sdt_nh || '',
        email: restaurant.email || '',
        trangthai: restaurant.trangthai || 'ON',
        status: restaurant.status || '',
        ngay_khaitruong: restaurant.ngay_khaitruong ? String(restaurant.ngay_khaitruong).split(' ')[0] : '',
        ip: restaurant.ip || '',
        ip_wan: restaurant.ip_wan || '',
        teamview_pc: restaurant.teamview_pc || '',
        teamview_pos11: restaurant.teamview_pos11 || '',
        teamview_pos12: restaurant.teamview_pos12 || '',
        rustdesk_pos11: restaurant.rustdesk_pos11 || '',
        rustdesk_pos12: restaurant.rustdesk_pos12 || '',
        user_ftth: restaurant.user_ftth || '',
        pass_ftth: restaurant.pass_ftth || '',
        thanhtoan_ftth: restaurant.thanhtoan_ftth || '',
        ngay_online_ftth: restaurant.ngay_online_ftth ? String(restaurant.ngay_online_ftth).split(' ')[0] : '',
        dk_truyenthong: restaurant.dk_truyenthong || '',
        pass_mail: restaurant.pass_mail || '',
        pass_ou_ko_sys: restaurant.pass_ou_ko_sys || '',
        ext: restaurant.ext || '',
        sys_sales: restaurant.sys_sales || '',
        note: restaurant.note || '',
      });
    } else {
      setFormData({
        res: '',
        sap: '',
        coscenter: '',
        rk7: '',
        sap_old: '',
        oracale: '',
        don_gia: '',
        address: '',
        region: regionOptions[0] || '',
        brand: brandOptions[0] || '',
        sdt_nh: '',
        email: '',
        trangthai: 'ON',
        status: '',
        ngay_khaitruong: '',
        ip: '',
        ip_wan: '',
        teamview_pc: '',
        teamview_pos11: '',
        teamview_pos12: '',
        rustdesk_pos11: '',
        rustdesk_pos12: '',
        user_ftth: '',
        pass_ftth: '',
        thanhtoan_ftth: '',
        ngay_online_ftth: '',
        dk_truyenthong: '',
        pass_mail: '',
        pass_ou_ko_sys: '',
        ext: '',
        sys_sales: '',
        note: '',
      });
    }
    setErrors({});
    setServerError(null);
    setActiveTab('main');
  }, [restaurant, isOpen]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.res || !formData.res.trim()) {
      errs.res = 'Tên nhà hàng là bắt buộc';
    }

    // Kiểm tra tính hợp lệ của Ngày Khai Trương nếu có nhập
    if (formData.ngay_khaitruong && String(formData.ngay_khaitruong).trim()) {
      const check = parseAndValidateDate(formData.ngay_khaitruong);
      if (!check.isValid) {
        errs.ngay_khaitruong = check.error || 'Sai định dạng ngày';
      }
    }

    // Kiểm tra tính hợp lệ của Ngày Online FTTH nếu có nhập
    if (formData.ngay_online_ftth && String(formData.ngay_online_ftth).trim()) {
      const check = parseAndValidateDate(formData.ngay_online_ftth);
      if (!check.isValid) {
        errs.ngay_online_ftth = check.error || 'Sai định dạng ngày';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Tự động chuyển tab đến trường bị lỗi để người dùng dễ sửa
      if (!formData.res || !formData.res.trim()) {
        setActiveTab('main');
      } else if (formData.ngay_khaitruong && !parseAndValidateDate(formData.ngay_khaitruong).isValid) {
        setActiveTab('contact');
      } else if (formData.ngay_online_ftth && !parseAndValidateDate(formData.ngay_online_ftth).isValid) {
        setActiveTab('telecom');
      }
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const payload = { ...formData };
    if (!isSuperAdmin) {
      delete payload.status;
    }

    // Khi thêm mới nhà hàng: nếu các trường Mã SAP, Cost Center, Mã RK7 bị để trống,
    // tự động gán mã tạm ngẫu nhiên kèm '(cần bổ sung mã đúng)' theo yêu cầu người dùng
    if (!isEditMode) {
      if (!payload.sap || !String(payload.sap).trim()) {
        payload.sap = generateTempPendingCode();
      } else {
        payload.sap = String(payload.sap).trim();
      }

      if (!payload.coscenter || !String(payload.coscenter).trim()) {
        payload.coscenter = generateTempPendingCode();
      } else {
        payload.coscenter = String(payload.coscenter).trim();
      }

      if (!payload.rk7 || !String(payload.rk7).trim()) {
        payload.rk7 = generateTempPendingCode();
      } else {
        payload.rk7 = String(payload.rk7).trim();
      }
    }

    // Chuẩn hóa định dạng ngày gửi lên server (YYYY-MM-DD hoặc null)
    if (payload.ngay_khaitruong && String(payload.ngay_khaitruong).trim()) {
      const check = parseAndValidateDate(payload.ngay_khaitruong);
      payload.ngay_khaitruong = check.isValid && check.normalized ? check.normalized : payload.ngay_khaitruong.trim();
    } else {
      payload.ngay_khaitruong = null;
    }

    if (payload.ngay_online_ftth && String(payload.ngay_online_ftth).trim()) {
      const check = parseAndValidateDate(payload.ngay_online_ftth);
      payload.ngay_online_ftth = check.isValid && check.normalized ? check.normalized : payload.ngay_online_ftth.trim();
    } else {
      payload.ngay_online_ftth = null;
    }

    try {
      if (isEditMode && restaurant) {
        await updateRestaurant(restaurant.id, payload);
      } else {
        await createRestaurant(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin nhà hàng. Vui lòng thử lại.';
      setServerError(detail);

      // Bắt lỗi trùng lặp và highlight trực tiếp vào trường tương ứng
      if (detail.includes('Mã SAP')) {
        setErrors((prev) => ({ ...prev, sap: detail }));
        setActiveTab('main');
      } else if (detail.includes('Mã RK7')) {
        setErrors((prev) => ({ ...prev, rk7: detail }));
        setActiveTab('main');
      } else if (detail.includes('Email')) {
        setErrors((prev) => ({ ...prev, email: detail }));
        setActiveTab('contact');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabButtonStyle = (tab: 'main' | 'contact' | 'network' | 'telecom'): React.CSSProperties => {
    const isActive = activeTab === tab;
    return {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: isActive ? 600 : 500,
      color: isActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
      backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
      border: 'none',
      borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all var(--transition-fast)',
    };
  };

  const formGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Chỉnh Sửa Nhà Hàng: ${restaurant?.res || ''}` : 'Thêm Mới Nhà Hàng'}
      maxWidth="860px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {isEditMode ? 'Lưu Thay Đổi' : 'Thêm Nhà Hàng'}
          </Button>
        </div>
      }
    >
      <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {serverError && (
          <div style={{ marginBottom: '16px' }}>
            <Alert type="error" message={serverError} />
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '16px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            style={tabButtonStyle('main')}
            onClick={() => setActiveTab('main')}
          >
            <Store size={15} /> Thông Tin Chính
          </button>
          <button
            type="button"
            style={tabButtonStyle('contact')}
            onClick={() => setActiveTab('contact')}
          >
            <MapPin size={15} /> Địa Điểm & Liên Hệ
          </button>
          <button
            type="button"
            style={tabButtonStyle('network')}
            onClick={() => setActiveTab('network')}
          >
            <Network size={15} /> Mạng & Remote
          </button>
          <button
            type="button"
            style={tabButtonStyle('telecom')}
            onClick={() => setActiveTab('telecom')}
          >
            <Wifi size={15} /> FTTH & Tiện Ích
          </button>
        </div>

        {!isAdmin && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              fontSize: '12px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <Shield size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <span>
              <strong>Phân quyền cập nhật:</strong> Các ô có huy hiệu <span style={{ color: '#dc2626', fontWeight: 700 }}>🔒 Chỉ đọc</span> là trường bạn không có quyền sửa. Các ô có huy hiệu <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Được sửa</span> là trường bạn được phép cập nhật.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* TAB 1: THÔNG TIN CHÍNH */}
          {activeTab === 'main' && (
            <div style={formGridStyle}>
              {!isEditMode && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: '12px',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    lineHeight: '1.4',
                  }}
                >
                  <Sparkles size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>
                    <strong>Mẹo tạo mã tự động:</strong> Khi thêm mới nhà hàng chưa có license, bạn có thể <strong>để trống</strong> ô <em>Mã SAP</em>, <em>Cost Center</em> hoặc <em>Mã RK7</em> (hoặc bấm nút <strong>Tạo mã tạm</strong>). Hệ thống sẽ tự động gán mã ngẫu nhiên kèm <code>(cần bổ sung mã đúng)</code> để tránh trùng và dễ cập nhật sau khi đối tác cấp license.
                  </span>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <Input
                  label={renderFieldLabel('Tên Nhà Hàng', 'res', true)}
                  value={formData.res || ''}
                  onChange={(e) => handleChange('res', e.target.value)}
                  error={errors.res}
                  placeholder="Ví dụ: Kichi Kichi Vincom Center..."
                  disabled={!canEditField('res')}
                />
              </div>
              <Input
                label={renderFieldLabel('Mã SAP', 'sap')}
                value={formData.sap || ''}
                onChange={(e) => handleChange('sap', e.target.value)}
                placeholder={isEditMode ? "Ví dụ: NH001" : "Ví dụ: NH001 (để trống tự tạo mã tạm)"}
                error={errors.sap}
                disabled={!canEditField('sap')}
              />
              <Input
                label={renderFieldLabel('Cost Center', 'coscenter')}
                value={formData.coscenter || ''}
                onChange={(e) => handleChange('coscenter', e.target.value)}
                placeholder={isEditMode ? "Ví dụ: CC1001" : "Ví dụ: CC1001 (để trống tự tạo mã tạm)"}
                disabled={!canEditField('coscenter')}
              />
              <Input
                label={renderFieldLabel('Mã RK7', 'rk7')}
                value={formData.rk7 || ''}
                onChange={(e) => handleChange('rk7', e.target.value)}
                placeholder={isEditMode ? "Ví dụ: RK001" : "Ví dụ: RK001 (để trống tự tạo mã tạm)"}
                error={errors.rk7}
                disabled={!canEditField('rk7')}
              />
              <Select
                label={renderFieldLabel('Trạng Thái Hoạt Động', 'trangthai')}
                value={formData.trangthai || 'ON'}
                onChange={(e) => handleChange('trangthai', e.target.value)}
                options={[
                  { value: 'ON', label: 'Hoạt động (ON)' },
                  { value: 'OFF', label: 'Ngừng hoạt động (OFF)' },
                  { value: 'NEW', label: 'Nhà hàng mới (NEW)' },
                ]}
                disabled={!canEditField('trangthai')}
              />
              <SearchableSelect
                label={renderFieldLabel('Khu Vực', 'region')}
                value={formData.region || ''}
                placeholder="-- Chọn Khu Vực --"
                searchPlaceholder="Tìm kiếm khu vực..."
                onChange={(val) => handleChange('region', val)}
                options={regionOptions.map((r) => ({ value: r, label: r }))}
                disabled={!canEditField('region')}
              />
              <SearchableSelect
                label={renderFieldLabel('Thương Hiệu (Brand)', 'brand')}
                value={formData.brand || ''}
                placeholder="-- Chọn Thương Hiệu --"
                searchPlaceholder="Tìm kiếm thương hiệu..."
                onChange={(val) => handleChange('brand', val)}
                options={brandOptions.map((b) => ({ value: b, label: b }))}
                disabled={!canEditField('brand')}
              />
              <Input
                label={renderFieldLabel('Đơn Giá', 'don_gia')}
                value={formData.don_gia || ''}
                onChange={(e) => handleChange('don_gia', e.target.value)}
                placeholder="Ví dụ: 199000"
                disabled={!canEditField('don_gia')}
              />

              {/* Chi Tiết Trạng Thái (Status) - Chỉ Super Admin thấy và cập nhật */}
              {isSuperAdmin && (
                <div style={{ gridColumn: '1 / -1', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    <ShieldAlert size={16} />
                    <span>Chi Tiết Trạng Thái / Đánh Dấu Xóa Mềm</span>
                  </div>
                  <Select
                    value={formData.status || 'ON'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    options={[
                      { value: 'ON', label: 'Hoạt động bình thường (ON)' },
                      { value: 'NEW', label: 'Nhà hàng mới (NEW)' },
                      { value: 'OFF', label: 'Ẩn khỏi web / Đánh dấu đã xóa (OFF)' },
                    ]}
                  />
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#b91c1c', lineHeight: 1.4 }}>
                    ⚠️ Khi chọn <strong>OFF</strong>, nhà hàng sẽ bị ẩn khỏi danh sách và toàn bộ giao diện web đối với mọi người dùng.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ĐỊA ĐIỂM & LIÊN HỆ */}
          {activeTab === 'contact' && (
            <div style={formGridStyle}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Input
                  label={renderFieldLabel('Địa Chỉ Chi Tiết', 'address')}
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Địa chỉ nhà hàng..."
                  disabled={!canEditField('address')}
                />
              </div>
              <Input
                label={renderFieldLabel('Số Điện Thoại NH', 'sdt_nh')}
                value={formData.sdt_nh || ''}
                onChange={(e) => handleChange('sdt_nh', e.target.value)}
                placeholder="Ví dụ: 028 1234 5678"
                disabled={!canEditField('sdt_nh')}
              />
              <Input
                label={renderFieldLabel('Email Nhà Hàng', 'email')}
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="nhahang@ggg.com.vn"
                error={errors.email}
                disabled={!canEditField('email')}
              />
              <DateInput
                label={renderFieldLabel('Ngày Khai Trương', 'ngay_khaitruong')}
                value={formData.ngay_khaitruong || ''}
                onChange={(val) => handleChange('ngay_khaitruong', val)}
                placeholder="YYYY-MM-DD hoặc DD/MM/YYYY"
                error={errors.ngay_khaitruong}
                disabled={!canEditField('ngay_khaitruong')}
              />
              <Input
                label={renderFieldLabel('Mã SAP Cũ', 'sap_old')}
                value={formData.sap_old || ''}
                onChange={(e) => handleChange('sap_old', e.target.value)}
                disabled={!canEditField('sap_old')}
              />
              <Input
                label={renderFieldLabel('Mã Oracle', 'oracale')}
                value={formData.oracale || ''}
                onChange={(e) => handleChange('oracale', e.target.value)}
                disabled={!canEditField('oracale')}
              />
            </div>
          )}

          {/* TAB 3: MẠNG & ĐIỀU KHIỂN TỪ XA */}
          {activeTab === 'network' && (
            <div style={formGridStyle}>
              <Input
                label={renderFieldLabel('IP LAN', 'ip')}
                value={formData.ip || ''}
                onChange={(e) => handleChange('ip', e.target.value)}
                placeholder="Ví dụ: 10.8.x.x"
                disabled={!canEditField('ip')}
              />
              <Input
                label={renderFieldLabel('IP WAN', 'ip_wan')}
                value={formData.ip_wan || ''}
                onChange={(e) => handleChange('ip_wan', e.target.value)}
                placeholder="Ví dụ: 113.161.x.x"
                disabled={!canEditField('ip_wan')}
              />
              <Input
                label={renderFieldLabel('TeamViewer PC', 'teamview_pc')}
                value={formData.teamview_pc || ''}
                onChange={(e) => handleChange('teamview_pc', e.target.value)}
                disabled={!canEditField('teamview_pc')}
              />
              <Input
                label={renderFieldLabel('TeamViewer POS 1.1', 'teamview_pos11')}
                value={formData.teamview_pos11 || ''}
                onChange={(e) => handleChange('teamview_pos11', e.target.value)}
                disabled={!canEditField('teamview_pos11')}
              />
              <Input
                label={renderFieldLabel('TeamViewer POS 1.2', 'teamview_pos12')}
                value={formData.teamview_pos12 || ''}
                onChange={(e) => handleChange('teamview_pos12', e.target.value)}
                disabled={!canEditField('teamview_pos12')}
              />
              <Input
                label={renderFieldLabel('RustDesk POS 1.1', 'rustdesk_pos11')}
                value={formData.rustdesk_pos11 || ''}
                onChange={(e) => handleChange('rustdesk_pos11', e.target.value)}
                disabled={!canEditField('rustdesk_pos11')}
              />
              <Input
                label={renderFieldLabel('RustDesk POS 1.2', 'rustdesk_pos12')}
                value={formData.rustdesk_pos12 || ''}
                onChange={(e) => handleChange('rustdesk_pos12', e.target.value)}
                disabled={!canEditField('rustdesk_pos12')}
              />
            </div>
          )}

          {/* TAB 4: FTTH & TIỆN ÍCH */}
          {activeTab === 'telecom' && (
            <div style={formGridStyle}>
              <Input
                label={renderFieldLabel('Tài Khoản FTTH', 'user_ftth')}
                value={formData.user_ftth || ''}
                onChange={(e) => handleChange('user_ftth', e.target.value)}
                disabled={!canEditField('user_ftth')}
              />
              <Input
                label={renderFieldLabel('Mật Khẩu FTTH', 'pass_ftth')}
                value={formData.pass_ftth || ''}
                onChange={(e) => handleChange('pass_ftth', e.target.value)}
                disabled={!canEditField('pass_ftth')}
              />
              <DateInput
                label={renderFieldLabel('Ngày Online FTTH', 'ngay_online_ftth')}
                value={formData.ngay_online_ftth || ''}
                onChange={(val) => handleChange('ngay_online_ftth', val)}
                placeholder="YYYY-MM-DD hoặc DD/MM/YYYY"
                error={errors.ngay_online_ftth}
                disabled={!canEditField('ngay_online_ftth')}
              />
              <Input
                label={renderFieldLabel('Hình Thức Thanh Toán FTTH', 'thanhtoan_ftth')}
                value={formData.thanhtoan_ftth || ''}
                onChange={(e) => handleChange('thanhtoan_ftth', e.target.value)}
                disabled={!canEditField('thanhtoan_ftth')}
              />
              <Input
                label={renderFieldLabel('ĐK Truyền Thông', 'dk_truyenthong')}
                value={formData.dk_truyenthong || ''}
                onChange={(e) => handleChange('dk_truyenthong', e.target.value)}
                disabled={!canEditField('dk_truyenthong')}
              />
              <Input
                label={renderFieldLabel('Mật Khẩu Mail Nhà Hàng', 'pass_mail')}
                value={formData.pass_mail || ''}
                onChange={(e) => handleChange('pass_mail', e.target.value)}
                disabled={!canEditField('pass_mail')}
              />
              <Input
                label={renderFieldLabel('Mật Khẩu OU (Không sys)', 'pass_ou_ko_sys')}
                value={formData.pass_ou_ko_sys || ''}
                onChange={(e) => handleChange('pass_ou_ko_sys', e.target.value)}
                disabled={!canEditField('pass_ou_ko_sys')}
              />
              <Input
                label={renderFieldLabel('Số Máy Lẻ (EXT)', 'ext')}
                value={formData.ext || ''}
                onChange={(e) => handleChange('ext', e.target.value)}
                disabled={!canEditField('ext')}
              />
              <Input
                label={renderFieldLabel('Sys Sales', 'sys_sales')}
                value={formData.sys_sales || ''}
                onChange={(e) => handleChange('sys_sales', e.target.value)}
                disabled={!canEditField('sys_sales')}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                  {renderFieldLabel('Ghi Chú', 'note')}
                </label>
                <textarea
                  value={formData.note || ''}
                  onChange={(e) => handleChange('note', e.target.value)}
                  rows={3}
                  disabled={!canEditField('note')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: !canEditField('note') ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary)',
                    color: !canEditField('note') ? 'var(--text-secondary, #64748b)' : 'var(--text-primary)',
                    border: !canEditField('note') ? '1px dashed var(--border-color, #cbd5e1)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    cursor: !canEditField('note') ? 'not-allowed' : 'text',
                    opacity: !canEditField('note') ? 0.8 : 1,
                  }}
                  placeholder="Ghi chú thêm về nhà hàng..."
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};
