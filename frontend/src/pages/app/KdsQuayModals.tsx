import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  RotateCcw,
  UserPlus,
  UserMinus,
  Search,
  RefreshCw,
  Power,
  Copy,
  Check,
  X,
  ArrowRightLeft,
  Layers,
  History
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import {
  mongoService,
  KdsPlaceItem,
  KdsRoleUsersResponse,
  KdsItemDish,
  KdsLogItem,
  KdsDishHistoryResponse
} from '../../services/mongoService';

// ══════════════════════════════════════════════════════════════════════════
// 1. MODAL XÁC NHẬN XÓA QUẦY 2 BƯỚC (CHỮ TO CẢNH BÁO RÕ RÀNG)
// ══════════════════════════════════════════════════════════════════════════
interface KdsDeleteQuayModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  place: KdsPlaceItem | null;
  onDeleted: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsDeleteQuayModal: React.FC<KdsDeleteQuayModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  place,
  onDeleted,
  showToast
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !place) return null;

  const handleResetAndClose = () => {
    setStep(1);
    setConfirmInput('');
    setIsDeleting(false);
    onClose();
  };

  const isConfirmedText =
    confirmInput.trim().toUpperCase() === 'XOA' ||
    confirmInput.trim().toUpperCase() === 'XÓA';

  const executeDelete = async () => {
    if (!isConfirmedText) return;
    setIsDeleting(true);
    try {
      const res = await mongoService.deleteKdsPlace(host, place.id, port);
      showToast(res.message, 'success');
      handleResetAndClose();
      onDeleted();
    } catch (err: any) {
      showToast(
        'Lỗi khi xóa quầy: ' + (err.response?.data?.detail || err.message),
        'error'
      );
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={
        step === 1
          ? '⚠️ CẢNH BÁO XÓA QUẦY BẾP (BƯỚC 1/2)'
          : '🛑 XÁC NHẬN CUỐI CÙNG ĐỂ XÓA VĨNH VIỄN (BƯỚC 2/2)'
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleResetAndClose}>
                Hủy bỏ (Không xóa)
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                leftIcon={<ArrowRight size={18} />}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '10px 18px',
                  boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.4)'
                }}
              >
                Tiếp tục đến bước xác nhận cuối cùng (1/2) ➔
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isDeleting}
                leftIcon={<RotateCcw size={16} />}
              >
                Quay lại bước 1
              </Button>
              <Button
                variant="primary"
                onClick={executeDelete}
                disabled={!isConfirmedText || isDeleting}
                isLoading={isDeleting}
                leftIcon={<Trash2 size={18} />}
                style={{
                  backgroundColor: isConfirmedText ? '#991B1B' : '#F87171',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '10px 22px',
                  cursor: isConfirmedText ? 'pointer' : 'not-allowed',
                  boxShadow: isConfirmedText ? '0 4px 12px rgba(153, 27, 27, 0.5)' : 'none'
                }}
              >
                🚨 TÔI XÁC NHẬN - XÓA VĨNH VIỄN NGAY
              </Button>
            </>
          )}
        </div>
      }
    >
      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 0' }}>
          {/* Header cảnh báo lớn */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              border: '2px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <AlertTriangle size={36} color="#DC2626" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>
                Cảnh báo nguy hiểm: Bạn đang chuẩn bị xóa quầy bếp
              </div>
              <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>
                Hành động này sẽ thay đổi trực tiếp cấu hình MongoDB của nhà hàng!
              </div>
            </div>
          </div>

          {/* Thông tin quầy cần xóa */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A'
            }}
          >
            <div style={{ fontSize: '13px', color: '#92400E', marginBottom: '6px' }}>
              Quầy được chỉ định xóa:
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#B45309' }}>
              {place.name} <span style={{ fontSize: '15px', fontWeight: 600, color: '#6B7280' }}>(ID: #{place.id})</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#4B5563', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>Mã quầy: <strong>{place.place_code || 'Không có'}</strong></span>
              <span>Máy in/Driver: <strong>{place.driver_name || place.printer || 'Chưa gán'}</strong></span>
              <span>Số món đang gán: <strong style={{ color: '#DC2626' }}>{place.dish_count} món</strong></span>
            </div>
          </div>

          {/* Chi tiết hậu quả xóa */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#334155'
            }}
          >
            <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '8px', fontSize: '14px' }}>
              📋 Những dữ liệu sẽ được hệ thống xử lý tự động khi xóa:
            </div>
            <ul style={{ margin: 0, paddingLeft: '22px' }}>
              <li>
                Xóa quầy khỏi bảng cấu hình <strong>CONFIG_KDS.places</strong>
              </li>
              <li>
                Gỡ quầy khỏi trạm quản lý của <strong>Food control</strong> (role: 2) trong bảng ACCOUNT
              </li>
              <li>
                <strong>Xóa tài khoản đăng nhập trạm KDS</strong> (role: 3) tương ứng của quầy này
              </li>
              <li>
                Tự động <strong>gỡ quầy khỏi tất cả {place.dish_count} món ăn</strong> đang gán trong <strong>CONFIG_COOKING</strong>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '6px 0' }}>
          {/* Cảnh báo cấp 2 siêu lớn */}
          <div
            style={{
              padding: '18px 22px',
              borderRadius: '12px',
              backgroundColor: '#7F1D1D',
              border: '2px solid #EF4444',
              color: '#FFFFFF',
              textAlign: 'center'
            }}
          >
            <AlertOctagon size={48} color="#FECACA" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.5px' }}>
              XÁC NHẬN LẦN 2 (BƯỚC CUỐI CÙNG)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '6px', color: '#FEE2E2' }}>
              BẠN CÓ THỰC SỰ CHẮC CHẮN MUỐN XÓA VĨNH VIỄN QUẦY "{place.name.toUpperCase()}"?
            </div>
            <div style={{ fontSize: '13px', marginTop: '6px', color: '#FCA5A5' }}>
              Dữ liệu sau khi xóa sẽ KHÔNG THỂ KHÔI PHỤC lại được!
            </div>
          </div>

          {/* Ô nhập xác thực XOA */}
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <label
              style={{
                display: 'block',
                fontSize: '15px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '10px'
              }}
            >
              Vui lòng gõ chữ <span style={{ color: '#DC2626', fontSize: '18px', fontWeight: 900 }}>XOA</span> vào ô bên dưới để mở khóa nút xóa:
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Gõ chữ XOA vào đây..."
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              style={{
                width: '260px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: isConfirmedText ? '2px solid #059669' : '2px solid #DC2626',
                backgroundColor: isConfirmedText ? '#ECFDF5' : '#FFF5F5',
                color: isConfirmedText ? '#065F46' : '#991B1B',
                fontSize: '18px',
                fontWeight: 800,
                textAlign: 'center',
                letterSpacing: '2px',
                outline: 'none'
              }}
            />
            {isConfirmedText && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '13px',
                  marginTop: '8px'
                }}
              >
                <CheckCircle2 size={16} /> Đã nhập chính xác! Nút xóa bên dưới đã sẵn sàng.
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 2. MODAL THÊM QUẦY VÀ ACCOUNT (CÁCH LY STATE ĐỂ GÕ HOÀN TOÀN MƯỢT MÀ)
// ══════════════════════════════════════════════════════════════════════════
interface KdsAddQuayModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  availablePrinters: string[];
  hasFoodControl?: boolean;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsAddQuayModal: React.FC<KdsAddQuayModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  availablePrinters,
  hasFoodControl = false,
  onSuccess,
  showToast
}) => {
  const [placeName, setPlaceName] = useState<string>('');
  const [placeCode, setPlaceCode] = useState<string>('');
  const [printer, setPrinter] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [password, setPassword] = useState<string>('1');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setPlaceName('');
    setPlaceCode('');
    setPrinter('');
    setAccountName('');
    setAccountId('');
    setPassword('1');
    setIsSaving(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!placeName.trim()) {
      showToast('Vui lòng nhập tên quầy bếp!', 'error');
      return;
    }
    if (!printer.trim()) {
      showToast('Vui lòng nhập hoặc chọn tên máy in / driver name!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await mongoService.createKdsPlace({
        host,
        port,
        place_name: placeName.trim(),
        place_code: placeCode.trim() || undefined,
        printer: printer.trim(),
        account_name: accountName.trim() || undefined,
        account_id: accountId.trim() || undefined,
        password: password.trim() || '1'
      });
      showToast(res.message, 'success');
      handleResetAndClose();
      onSuccess();
    } catch (err: any) {
      showToast(
        'Lỗi khi tạo quầy KDS: ' + (err.response?.data?.detail || err.message),
        'error'
      );
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="➕ Thêm Quầy Bếp (Place) & Tài Khoản KDS Mới"
      maxWidth="640px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="outline" onClick={handleResetAndClose} disabled={isSaving}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSaving}
            leftIcon={<PlusCircle size={16} />}
            style={{ backgroundColor: '#059669', color: '#fff', fontWeight: 600 }}
          >
            Xác nhận tạo quầy &amp; tài khoản
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Trạng thái Food Control bên trong popup */}
        {hasFoodControl ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              fontSize: '12px',
              color: '#92400E',
              fontWeight: 700
            }}
          >
            <span>🛡️ ✓ Nhà hàng này ĐÃ CÓ quầy và tài khoản Food Control (Trạm tổng điều phối).</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: '12px',
              color: '#1E40AF',
              fontWeight: 600
            }}
          >
            <span>ℹ️ Nhà hàng chưa có Food Control. Quầy mới sẽ được tạo như trạm bếp thông thường.</span>
          </div>
        )}

        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            fontSize: '12px',
            color: '#065F46'
          }}
        >
          💡 Hệ thống sẽ tự động thêm quầy vào bảng <strong>CONFIG_KDS.places</strong>, đồng bộ vào danh sách trạm của <strong>Food control</strong>, và tạo tài khoản đăng nhập tương ứng trong bảng <strong>ACCOUNT</strong> với quyền bếp (role: 3).
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
            Tên Quầy Bếp (VD: BEP NUONG, BEP LAU, QUẦY BAR...): <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Nhập tên quầy bếp..."
            value={placeName}
            onChange={(e) => {
              const val = e.target.value;
              setPlaceName(val);
              if (!placeCode) setPlaceCode(val.toUpperCase().replace(/\s+/g, ' '));
              if (!accountName) setAccountName(val.toUpperCase());
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Mã Quầy (Place Code):
            </label>
            <input
              type="text"
              placeholder="VD: BEP NUONG, BEP_BAR"
              value={placeCode}
              onChange={(e) => setPlaceCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Tên Máy In / Driver Name: <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              list="add-printer-suggestions"
              placeholder="VD: BEP NONG, BEP LANH, IN BAR..."
              value={printer}
              onChange={(e) => setPrinter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600
              }}
            />
            <datalist id="add-printer-suggestions">
              {availablePrinters.map((prn, pIdx) => (
                <option key={pIdx} value={prn} />
              ))}
            </datalist>
            {availablePrinters.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gợi ý:</span>
                {availablePrinters.map((prn, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setPrinter(prn)}
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid #FCD34D',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      cursor: 'pointer'
                    }}
                  >
                    {prn}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck size={15} color="#2563EB" />
            Thông Tin Tài Khoản Đăng Nhập KDS (ACCOUNT)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Tên Hiển Thị (accName):
              </label>
              <input
                type="text"
                placeholder="VD: BEP NUONG"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Mã Đăng Nhập (accId):
              </label>
              <input
                type="text"
                placeholder="Tự sinh nếu để trống (vd: 107)"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Mật Khẩu (pass):
              </label>
              <input
                type="text"
                placeholder="Mặc định: 1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 3. MODAL QUẢN LÝ QUẦY & MÁY IN / DRIVER NAME & NÚT XÓA QUẦY
// ══════════════════════════════════════════════════════════════════════════
interface KdsQuayListModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  places: KdsPlaceItem[];
  printers: string[];
  onOpenAddQuay: () => void;
  onRefresh: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsQuayListModal: React.FC<KdsQuayListModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  places,
  printers,
  onOpenAddQuay,
  onRefresh,
  showToast
}) => {
  const [editingQuayId, setEditingQuayId] = useState<number | null>(null);
  const [editPrinterVal, setEditPrinterVal] = useState<string>('');
  const [isSavingPrinter, setIsSavingPrinter] = useState<boolean>(false);

  // State đổi tên quầy (tự động đổi mã quầy & các liên kết)
  const [editingNamePlaceId, setEditingNamePlaceId] = useState<number | null>(null);
  const [editPlaceNameVal, setEditPlaceNameVal] = useState<string>('');
  const [isSavingPlaceName, setIsSavingPlaceName] = useState<boolean>(false);

  // Quầy được chọn để xóa (mở modal xóa 2 bước)
  const [deleteTargetPlace, setDeleteTargetPlace] = useState<KdsPlaceItem | null>(null);

  // State đang toggle quầy khỏi/vào Food Control
  const [togglingFcId, setTogglingFcId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleToggleFoodControl = async (pl: KdsPlaceItem) => {
    const currentInFc = !!pl.is_in_food_control;
    const action = currentInFc ? 'exclude' : 'include';
    setTogglingFcId(pl.id);
    try {
      const res = await mongoService.toggleKdsFoodControl(host, pl.id, action, port);
      showToast(res.message, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(
        'Lỗi khi cập nhật Food Control: ' + (err.response?.data?.detail || err.message),
        'error'
      );
    } finally {
      setTogglingFcId(null);
    }
  };

  const handleStartEditPrinter = (pl: KdsPlaceItem) => {
    setEditingQuayId(pl.id);
    setEditPrinterVal(pl.driver_name || pl.printer || '');
  };

  const handleCancelEditPrinter = () => {
    setEditingQuayId(null);
    setEditPrinterVal('');
  };

  const handleSavePrinter = async (placeId: number) => {
    if (!editPrinterVal.trim()) {
      showToast('Vui lòng nhập tên máy in / driver name!', 'error');
      return;
    }

    setIsSavingPrinter(true);
    try {
      const res = await mongoService.updateKdsPlacePrinter({
        host,
        port,
        place_id: placeId,
        printer: editPrinterVal.trim()
      });
      showToast(res.message, 'success');
      setEditingQuayId(null);
      setEditPrinterVal('');
      onRefresh();
    } catch (err: any) {
      showToast(
        'Lỗi khi cập nhật máy in / driver name: ' + (err.response?.data?.detail || err.message),
        'error'
      );
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const handleStartEditName = (pl: KdsPlaceItem) => {
    setEditingNamePlaceId(pl.id);
    setEditPlaceNameVal(pl.name);
  };

  const handleCancelEditName = () => {
    setEditingNamePlaceId(null);
    setEditPlaceNameVal('');
  };

  const handleSavePlaceName = async (placeId: number) => {
    if (!editPlaceNameVal.trim()) {
      showToast('Vui lòng nhập tên quầy!', 'error');
      return;
    }

    setIsSavingPlaceName(true);
    try {
      const res = await mongoService.renameKdsPlace({
        host,
        port,
        place_id: placeId,
        new_name: editPlaceNameVal.trim()
      });
      showToast(res.message, 'success');
      setEditingNamePlaceId(null);
      setEditPlaceNameVal('');
      onRefresh();
    } catch (err: any) {
      showToast(
        'Lỗi khi đổi tên quầy: ' + (err.response?.data?.detail || err.message),
        'error'
      );
    } finally {
      setIsSavingPlaceName(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`🖨️ Cấu Hình Quầy Bếp & Driver Máy In KDS (${places.length} quầy)`}
        maxWidth="1050px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenAddQuay();
              }}
              leftIcon={<PlusCircle size={14} />}
              style={{ backgroundColor: '#059669', color: '#fff', fontWeight: 600 }}
            >
              + Thêm Quầy Bếp &amp; Tài Khoản
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '560px', overflowY: 'auto' }}>
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: '12px',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Printer size={15} color="#2563EB" />
            <span>
              Bạn có thể <strong>đổi Tên Quầy</strong> (hệ thống tự động đổi Mã Quầy và đồng bộ các tài khoản/cấu hình liên quan) hoặc <strong>chỉnh sửa Driver Name máy in</strong> bằng cách nhấn vào biểu tượng <strong>Bút Chì</strong>. Để gỡ bỏ quầy, hãy nhấn nút <strong>Xóa Quầy</strong> (yêu cầu xác nhận kỹ 2 bước).
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', width: '55px' }}>ID</th>
                <th style={{ padding: '8px 12px' }}>Tên Quầy (Place)</th>
                <th style={{ padding: '8px 12px' }}>Mã Quầy</th>
                <th style={{ padding: '8px 10px', width: '65px', textAlign: 'center' }}>Số Món</th>
                <th style={{ padding: '8px 12px', minWidth: '180px' }}>Máy In / Driver Name</th>
                <th style={{ padding: '8px 12px', minWidth: '190px', textAlign: 'center' }}>Chế Độ Ra Món (Done Mode)</th>
                <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {places.map((pl) => {
                const isFoodControl = pl.id === 0;
                const isEditing = editingQuayId === pl.id;
                const isEditingName = editingNamePlaceId === pl.id;
                const currentDriver = pl.driver_name || pl.printer || '';

                return (
                  <tr
                    key={pl.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isFoodControl ? '#F0FDF4' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: isFoodControl ? '#059669' : 'var(--text-muted)' }}>
                      #{pl.id}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isEditingName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editPlaceNameVal}
                            onChange={(e) => setEditPlaceNameVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePlaceName(pl.id);
                              if (e.key === 'Escape') handleCancelEditName();
                            }}
                            autoFocus
                            placeholder="Nhập tên quầy mới..."
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid #2563EB',
                              fontSize: '12px',
                              fontWeight: 700,
                              outline: 'none',
                              width: '140px'
                            }}
                          />
                          <button
                            type="button"
                            disabled={isSavingPlaceName}
                            onClick={() => handleSavePlaceName(pl.id)}
                            title="Lưu tên quầy và tự cập nhật mã quầy"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#059669',
                              color: '#fff',
                              border: 'none',
                              cursor: isSavingPlaceName ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            {isSavingPlaceName ? '...' : <Check size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditName}
                            title="Hủy bỏ"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280',
                              border: '1px solid #D1D5DB',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '11px'
                            }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{pl.name}</span>
                          {!isFoodControl && (
                            <button
                              type="button"
                              onClick={() => handleStartEditName(pl)}
                              title="Đổi tên quầy (tự động cập nhật mã quầy và các liên kết)"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#2563EB',
                                padding: '2px 4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: '4px'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isFoodControl && (
                            <span
                              style={{
                                marginLeft: '4px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D'
                              }}
                            >
                              Food Control (Tổng)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {pl.place_code || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: pl.dish_count > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {pl.dish_count}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            list="printer-suggestions-modal"
                            value={editPrinterVal}
                            onChange={(e) => setEditPrinterVal(e.target.value)}
                            placeholder="Nhập tên driver máy in..."
                            autoFocus
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #3B82F6',
                              fontSize: '12px',
                              width: '140px',
                              fontWeight: 600
                            }}
                          />
                          <datalist id="printer-suggestions-modal">
                            {printers.map((prn, pIdx) => (
                              <option key={pIdx} value={prn} />
                            ))}
                          </datalist>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSavePrinter(pl.id)}
                            isLoading={isSavingPrinter}
                            style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#059669' }}
                          >
                            Lưu Driver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditPrinter}
                            style={{ fontSize: '11px', padding: '3px 6px' }}
                          >
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {currentDriver ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A'
                              }}
                            >
                              <Printer size={12} color="#D97706" />
                              {currentDriver}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Chưa gán máy in
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditPrinter(pl)}
                            title="Chỉnh sửa Driver Name máy in"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#2563EB',
                              padding: '3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: '4px'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {isFoodControl ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC'
                            }}
                          >
                            👑 Trạm Bếp Tổng
                          </span>
                          <span style={{ fontSize: '10px', color: '#166534', fontStyle: 'italic' }}>
                            Điều phối / Hoàn tất tổng
                          </span>
                        </div>
                      ) : pl.is_in_food_control ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0'
                            }}
                            title="Bếp phụ bấm Done -> Bếp trưởng kiểm tra Food Control bấm Done lần 2 mới biến mất hoàn tất"
                          >
                            <CheckCircle2 size={12} color="#059669" /> ⚡ 2 Bước (Qua FC)
                          </span>
                          <span style={{ fontSize: '10px', color: '#047857' }}>
                            Quầy Done ➔ FC Done mới mất
                          </span>
                          <button
                            type="button"
                            disabled={togglingFcId === pl.id}
                            onClick={() => handleToggleFoodControl(pl)}
                            title="Chuyển sang chế độ Bếp đơn (1 bước): Bếp phụ bấm Done là món hoàn tất biến mất ngay"
                            style={{
                              marginTop: '2px',
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #FCD34D',
                              backgroundColor: '#FFFBEB',
                              color: '#B45309',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {togglingFcId === pl.id ? 'Đang chuyển...' : 'Chuyển Bếp Đơn (1 Bước)'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#F3F4F6',
                              color: '#4B5563',
                              border: '1px solid #E5E7EB'
                            }}
                            title="Quầy hoạt động độc lập: Bếp phụ bấm Done là hoàn tất và biến mất ngay lập tức"
                          >
                            🟢 1 Bước (Bếp Đơn)
                          </span>
                          <span style={{ fontSize: '10px', color: '#6B7280' }}>
                            Quầy Done là hoàn tất luôn
                          </span>
                          <button
                            type="button"
                            disabled={togglingFcId === pl.id}
                            onClick={() => handleToggleFoodControl(pl)}
                            title="Chuyển sang chế độ 2 bước: Liên kết với Bếp tổng Food Control để duyệt ra món"
                            style={{
                              marginTop: '2px',
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #86EFAC',
                              backgroundColor: '#F0FDF4',
                              color: '#15803D',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            {togglingFcId === pl.id ? 'Đang chuyển...' : '⚡ Chuyển 2 Bước (Qua FC)'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {isFoodControl ? (
                        <span
                          title="Không thể xóa quầy gốc Food Control"
                          style={{
                            fontSize: '11px',
                            color: '#9CA3AF',
                            cursor: 'not-allowed'
                          }}
                        >
                          Cố định
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetPlace(pl)}
                          title={`Xóa quầy ${pl.name}`}
                          style={{
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            fontWeight: 600,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 size={13} />
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* MODAL XÁC NHẬN XÓA 2 BƯỚC VỚI CHỮ TO CẢNH BÁO */}
      {deleteTargetPlace && (
        <KdsDeleteQuayModal
          isOpen={!!deleteTargetPlace}
          onClose={() => setDeleteTargetPlace(null)}
          host={host}
          port={port}
          place={deleteTargetPlace}
          onDeleted={() => {
            setDeleteTargetPlace(null);
            onRefresh();
          }}
          showToast={showToast}
        />
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 4. MODAL PHÂN QUYỀN USER CẤU HÌNH IN / KDS (ROLE_SETUP_CONFIG_COOKING & ROLE_SETUP_SHOW_HIDE_ITEM)
// ══════════════════════════════════════════════════════════════════════════
export interface KdsRoleUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  restaurantCode?: string;
  paramCode?: string;
  title?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsRoleUserModal: React.FC<KdsRoleUserModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  restaurantCode,
  paramCode = 'ROLE_SETUP_CONFIG_COOKING',
  title,
  showToast
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [roleData, setRoleData] = useState<KdsRoleUsersResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [actionLoadingCode, setActionLoadingCode] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);
  const [togglingMasterStatus, setTogglingMasterStatus] = useState<boolean>(false);
  const [showRawValue, setShowRawValue] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedUserCodes, setSelectedUserCodes] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  const isShowHideRole = paramCode === 'ROLE_SETUP_SHOW_HIDE_ITEM';

  const fetchRoleUsers = async () => {
    if (!host) return;
    setLoading(true);
    try {
      const data = await mongoService.getKdsRoleUsers(host, port, restaurantCode, undefined, paramCode);
      setRoleData(data);
    } catch (err: any) {
      showToast(`Lỗi khi tải danh sách quyền ${paramCode}: ` + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoleUsers();
      setSearchTerm('');
      setManualCode('');
      setShowRawValue(false);
      setSelectedUserCodes([]);
    }
  }, [isOpen, host, port, paramCode]);

  if (!isOpen) return null;

  const handleAddUser = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập mã user / mã nhân viên cần thêm!', 'error');
      return;
    }
    const codes = trimmed.split(/[\s,;\n]+/).map((c) => c.trim()).filter((c) => c && c !== '0');
    if (codes.length === 0) return;

    setActionLoadingCode('MANUAL');
    try {
      let updated: KdsRoleUsersResponse;
      if (codes.length === 1) {
        updated = await mongoService.addKdsRoleUser(host, codes[0], port, paramCode);
        showToast(`Đã thêm mã '${codes[0]}' vào quyền ${paramCode} thành công!`, 'success');
      } else {
        updated = await mongoService.addKdsRoleUsersBatch(host, codes, port, paramCode);
        showToast(`Đã thêm ${codes.length} mã nhân viên vào quyền ${paramCode} thành công!`, 'success');
      }
      setRoleData(updated);
      setManualCode('');
    } catch (err: any) {
      showToast('Lỗi khi thêm user: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoadingCode(null);
    }
  };

  const handleBatchAddSelected = async () => {
    if (selectedUserCodes.length === 0) return;
    setBatchLoading(true);
    try {
      const updated = await mongoService.addKdsRoleUsersBatch(host, selectedUserCodes, port, paramCode);
      setRoleData(updated);
      showToast(`Đã cấp quyền thành công cho ${selectedUserCodes.length} nhân viên đã chọn!`, 'success');
      setSelectedUserCodes([]);
    } catch (err: any) {
      showToast('Lỗi khi cấp quyền hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchRemoveSelected = async () => {
    if (selectedUserCodes.length === 0) return;
    const roleNameDisplay = isShowHideRole ? 'ẩn/hiện món' : 'cấu hình KDS';
    if (!window.confirm(`Bạn có chắc muốn THU HỒI quyền ${roleNameDisplay} của ${selectedUserCodes.length} nhân viên đã chọn không?`)) {
      return;
    }
    setBatchLoading(true);
    try {
      const updated = await mongoService.removeKdsRoleUsersBatch(host, selectedUserCodes, port, paramCode);
      if (updated) setRoleData(updated);
      else await fetchRoleUsers();
      showToast(`Đã thu hồi quyền thành công của ${selectedUserCodes.length} nhân viên!`, 'success');
      setSelectedUserCodes([]);
    } catch (err: any) {
      showToast('Lỗi khi thu hồi quyền hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleRemoveUser = async (code: string) => {
    const roleNameDisplay = isShowHideRole ? 'ẩn/hiện món' : 'cấu hình KDS';
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA quyền ${roleNameDisplay} của user '${code}' không?`)) {
      return;
    }
    setActionLoadingCode(code);
    try {
      const updated = await mongoService.removeKdsRoleUser(host, code, port, paramCode);
      setRoleData(updated);
      showToast(`Đã thu hồi quyền ${roleNameDisplay} của mã '${code}'!`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi thu hồi quyền: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoadingCode(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!roleData) return;
    const currentStatus = roleData.status ?? (isShowHideRole ? 0 : 1);
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'BẬT' : 'TẮT';
    if (!window.confirm(`Bạn có chắc muốn ${actionText} tham số cấu hình ${paramCode} (status = ${newStatus}) không?`)) {
      return;
    }
    setTogglingStatus(true);
    try {
      const res = await mongoService.toggleKdsRoleStatus(host, newStatus, port, paramCode);
      setRoleData(res);
      showToast(`Đã ${actionText} tham số cấu hình thành công!`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi đổi trạng thái cấu hình: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleCopyRaw = () => {
    if (roleData?.raw_value) {
      navigator.clipboard.writeText(roleData.raw_value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Đã sao chép chuỗi value vào clipboard!', 'info');
    }
  };

  const handleToggleMasterStatus = async () => {
    if (!roleData) return;
    const currentStatus = roleData.show_kds_status ?? 1;
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'BẬT HOÀN TOÀN' : 'TẮT HOÀN TOÀN';
    const confirmMsg = newStatus === 1
      ? `Bạn có chắc chắn muốn BẬT HOÀN TOÀN KDS cho nhà hàng này không?\n\n- Tham số: SHOW_KDS (G_ORDER.APP_PARAM)\n- Sẽ cập nhật: status = 1, value = 1`
      : `⚠️ CẢNH BÁO QUAN TRỌNG:\nBạn có chắc chắn muốn TẮT HOÀN TOÀN KDS cho nhà hàng này không?\n\n- Toàn bộ thiết bị KDS & luồng đẩy món xuống bếp sẽ NGỪNG hoạt động!\n- Tham số: SHOW_KDS (G_ORDER.APP_PARAM) sẽ chuyển sang status = 0, value = 0`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setTogglingMasterStatus(true);
    try {
      const res = await mongoService.toggleKdsMasterStatus(host, newStatus, port);
      setRoleData((prev) => (prev ? { ...prev, show_kds_status: res.status, show_kds_enabled: res.is_enabled } : null));
      showToast(res.message || `Đã ${actionText} tham số SHOW_KDS thành công!`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi đổi trạng thái SHOW_KDS: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setTogglingMasterStatus(false);
    }
  };

  const isEnabled = roleData ? (roleData.status === 1 || roleData.is_enabled) : (!isShowHideRole);
  const isMasterKdsEnabled = roleData ? (roleData.show_kds_status === 1 || roleData.show_kds_enabled) : true;

  const restaurantUsers = (roleData?.restaurant_users || []).filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      u.user_code.toLowerCase().includes(term) ||
      (u.employee_name && u.employee_name.toLowerCase().includes(term))
    );
  });

  const handleToggleSelectUser = (code: string) => {
    setSelectedUserCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleCodes = restaurantUsers.map((u) => u.user_code);
    const allSelected = visibleCodes.length > 0 && visibleCodes.every((c) => selectedUserCodes.includes(c));
    if (allSelected) {
      setSelectedUserCodes((prev) => prev.filter((c) => !visibleCodes.includes(c)));
    } else {
      setSelectedUserCodes((prev) => Array.from(new Set([...prev, ...visibleCodes])));
    }
  };

  const modalTitle = title || (
    isShowHideRole
      ? 'Cấu Hình Phân Quyền Ẩn / Hiện Món (ROLE_SETUP_SHOW_HIDE_ITEM)'
      : 'Cấu Hình Phân Quyền & Bật / Tắt KDS Toàn Nhà Hàng'
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="880px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        {/* Card Master: Trạng Thái Hoạt Động Toàn Hệ Thống KDS (SHOW_KDS) - Chỉ hiển thị khi cấu hình KDS */}
        {!isShowHideRole && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: isMasterKdsEnabled ? '#F0FDF4' : '#FEF2F2',
              border: `1.5px solid ${isMasterKdsEnabled ? '#86EFAC' : '#FCA5A5'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#38BDF8',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace'
                  }}
                >
                  SHOW_KDS
                </span>
                <span
                  style={{
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Loại: FUNCTION
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isMasterKdsEnabled ? '#15803D' : '#DC2626'
                  }}
                >
                  {isMasterKdsEnabled ? '• KDS Toàn Nhà Hàng Đang BẬT (status: 1)' : '• KDS Toàn Nhà Hàng Đang TẮT HOÀN TOÀN (status: 0)'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                Tham số tổng quyết định toàn bộ thiết bị KDS &amp; GPOS tại nhà hàng có hiển thị/nhận order bếp KDS hay không.
              </div>
            </div>

            <button
              type="button"
              disabled={togglingMasterStatus}
              onClick={handleToggleMasterStatus}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: isMasterKdsEnabled ? '#DC2626' : '#16A34A',
                color: '#FFFFFF',
                border: `1px solid ${isMasterKdsEnabled ? '#B91C1C' : '#15803D'}`,
                cursor: togglingMasterStatus ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isMasterKdsEnabled ? '#B91C1C' : '#15803D';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isMasterKdsEnabled ? '#DC2626' : '#16A34A';
              }}
            >
              {togglingMasterStatus ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Power size={13} />
              )}
              <span>{isMasterKdsEnabled ? 'Tắt Hoàn Toàn KDS' : 'Bật Hoàn Toàn KDS'}</span>
            </button>
          </div>
        )}

        {/* Card Chi tiết Tham Số Phân Quyền & Trạng Thái Bật/Tắt */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: isEnabled ? '#F0FDF4' : '#F8FAFC',
            border: `1.5px solid ${isEnabled ? '#86EFAC' : '#CBD5E1'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  backgroundColor: isShowHideRole ? '#D97706' : '#EA580C',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.3px'
                }}
              >
                {roleData?.param_code || paramCode}
              </span>
              <span
                style={{
                  border: isShowHideRole ? '1px solid #FCD34D' : '1px solid #38BDF8',
                  color: isShowHideRole ? '#B45309' : '#0284C7',
                  backgroundColor: isShowHideRole ? '#FFFBEB' : '#F0F9FF',
                  fontWeight: 700,
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                Loại: {roleData?.param_type || (isShowHideRole ? 'FUNCTION' : 'CONFIG')}
              </span>
            </div>

            {/* Trạng thái Bật / Tắt + Nút Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  backgroundColor: isEnabled ? '#DCFCE7' : '#E2E8F0',
                  color: isEnabled ? '#15803D' : '#64748B',
                  border: `1px solid ${isEnabled ? '#86EFAC' : '#CBD5E1'}`
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isEnabled ? '#22C55E' : '#94A3B8'
                  }}
                />
                {isEnabled ? 'Đang BẬT (status: 1)' : 'Đang TẮT (status: 0)'}
              </span>

              <button
                type="button"
                disabled={togglingStatus}
                onClick={handleToggleStatus}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: isEnabled ? '#DC2626' : '#16A34A',
                  color: '#FFFFFF',
                  border: `1px solid ${isEnabled ? '#B91C1C' : '#15803D'}`,
                  cursor: togglingStatus ? 'not-allowed' : 'pointer',
                  opacity: togglingStatus ? 0.7 : 1,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isEnabled ? '#B91C1C' : '#15803D';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isEnabled ? '#DC2626' : '#16A34A';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
              >
                {togglingStatus ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Power size={13} />
                )}
                <span>{isEnabled ? 'Tắt Kiểm Tra Quyền' : 'Bật Kiểm Tra Quyền'}</span>
              </button>
            </div>
          </div>

          {/* Banner giải thích quy tắc hoạt động */}
          <div
            style={{
              fontSize: '11.5px',
              color: '#475569',
              backgroundColor: '#F8FAFC',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              lineHeight: '1.45'
            }}
          >
            {isShowHideRole ? (
              <span>
                💡 <strong>Quy tắc hoạt động:</strong> Khi <strong>BẬT (status: 1)</strong>, chỉ những nhân viên có mã trong danh sách mới được phép thực hiện chức năng Ẩn/Hiện món trên POS/CO/SO. Khi <strong>TẮT (status: 0)</strong>, hệ thống không kiểm tra quyền (mặc định tất cả nhân viên đều có quyền).
              </span>
            ) : (
              <span>
                💡 <strong>Quy tắc hoạt động:</strong> Khi <strong>BẬT (status: 1)</strong>, chỉ những user có mã được cấu hình mới có quyền truy cập vào màn hình cấu hình in / bếp KDS. Khi <strong>TẮT (status: 0)</strong>, tính năng kiểm tra quyền bị vô hiệu hóa.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: '#475569', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              Tổng số user đang được cấp quyền trong hệ thống:{' '}
              <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                {roleData?.total_users || 0} user
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowRawValue(!showRawValue)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284C7',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {showRawValue ? 'Ẩn chuỗi value' : 'Xem chuỗi value thô'}
              </button>
            </div>
          </div>

          {/* Khối hiển thị raw value (thu gọn) */}
          {showRawValue && roleData?.raw_value && (
            <div
              style={{
                marginTop: '4px',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#0F172A',
                color: '#F8FAFC',
                fontSize: '11px',
                fontFamily: 'monospace',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#94A3B8' }}>Chuỗi value thực tế trong DB G_ORDER:</span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    color: '#38BDF8',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={12} color="#4ADE80" /> : <Copy size={12} />}
                  {copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
              <div
                style={{
                  maxHeight: '80px',
                  overflowY: 'auto',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}
              >
                {roleData.raw_value}
              </div>
            </div>
          )}
        </div>

        {/* Ô Nhập Thêm Mã User Vào Quyền */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>
            {isShowHideRole ? 'Thêm mã user vào quyền ẩn/hiện món:' : 'Thêm mã user vào quyền cấu hình KDS:'}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddUser(manualCode);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
          >
            <input
              type="text"
              placeholder={isShowHideRole ? "Nhập mã user cần cấp quyền ẩn/hiện món (VD: 30001, 14373...)" : "Nhập mã user cần cấp quyền (VD: 30001, 14373, 40...)"}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600
              }}
            />
            <Button
              type="submit"
              size="sm"
              style={{ backgroundColor: isShowHideRole ? '#D97706' : '#0284C7', color: '#fff', fontWeight: 700 }}
              isLoading={actionLoadingCode === manualCode && manualCode !== ''}
              leftIcon={<UserPlus size={14} />}
            >
              + Thêm Vào Quyền
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fetchRoleUsers()}
              isLoading={loading}
              leftIcon={<RefreshCw size={13} />}
            >
              Làm Mới
            </Button>
          </form>
        </div>

        {/* Danh Sách User Của Nhà Hàng Hiện Có */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              Danh sách nhân viên nhà hàng hiện có ({restaurantUsers.length} nhân viên):
            </div>

            <div style={{ position: 'relative', width: '220px', minWidth: '180px', flex: '1 1 auto', maxWidth: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '8px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm theo mã NV hoặc tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 10px 5px 30px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px'
                }}
              />
            </div>
          </div>

          {/* Thanh công cụ thao tác hàng loạt khi có user được chọn */}
          {selectedUserCodes.length > 0 && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #93C5FD',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Đã chọn: <strong style={{ color: '#1D4ED8', fontSize: '13px' }}>{selectedUserCodes.length}</strong> nhân viên</span>
                <button
                  type="button"
                  onClick={() => setSelectedUserCodes([])}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#64748B',
                    fontSize: '11.5px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '0 4px'
                  }}
                >
                  (Bỏ chọn tất cả)
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="sm"
                  style={{ backgroundColor: '#16A34A', color: '#fff', fontSize: '11.5px', fontWeight: 700 }}
                  isLoading={batchLoading}
                  onClick={handleBatchAddSelected}
                  leftIcon={<UserPlus size={13} />}
                >
                  + Cấp Quyền Cho {selectedUserCodes.length} NV Đã Chọn
                </Button>
                <Button
                  size="sm"
                  style={{ backgroundColor: '#DC2626', color: '#fff', fontSize: '11.5px', fontWeight: 700 }}
                  isLoading={batchLoading}
                  onClick={handleBatchRemoveSelected}
                  leftIcon={<UserMinus size={13} />}
                >
                  - Thu Hồi Quyền {selectedUserCodes.length} NV Đã Chọn
                </Button>
              </div>
            </div>
          )}

          <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0284C7' }} />
                Đang tải thông tin nhân viên nhà hàng...
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '9px 10px', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={
                          restaurantUsers.length > 0 &&
                          restaurantUsers.every((u) => selectedUserCodes.includes(u.user_code))
                        }
                        onChange={handleSelectAllVisible}
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                        title="Chọn tất cả nhân viên đang hiển thị"
                      />
                    </th>
                    <th style={{ padding: '9px 14px', width: '130px' }}>Mã NV (Code)</th>
                    <th style={{ padding: '9px 14px' }}>Họ Và Tên</th>
                    <th style={{ padding: '9px 14px', width: '160px' }}>{isShowHideRole ? 'Quyền Ẩn/Hiện Món' : 'Quyền Cấu Hình'}</th>
                    <th style={{ padding: '9px 14px', width: '130px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurantUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        Không tìm thấy nhân viên nào của nhà hàng
                      </td>
                    </tr>
                  ) : (
                    restaurantUsers.map((u, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: selectedUserCodes.includes(u.user_code) ? '#F0F9FF' : undefined
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedUserCodes.includes(u.user_code)}
                            onChange={() => handleToggleSelectUser(u.user_code)}
                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#1E293B',
                              fontSize: '12px'
                            }}
                          >
                            {u.user_code}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.employee_name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {u.is_in_role ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                fontWeight: 700,
                                fontSize: '11.5px',
                                border: '1px solid #86EFAC'
                              }}
                            >
                              ✅ Đã có quyền
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#F1F5F9',
                                color: '#64748B',
                                fontWeight: 600,
                                fontSize: '11.5px'
                              }}
                            >
                              Chưa có quyền
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {u.is_in_role ? (
                            <button
                              type="button"
                              disabled={actionLoadingCode === u.user_code}
                              onClick={() => handleRemoveUser(u.user_code)}
                              title={isShowHideRole ? "Thu hồi quyền ẩn/hiện món của user này" : "Xóa quyền cấu hình KDS của user này"}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#DC2626';
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.borderColor = '#B91C1C';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#FEF2F2';
                                e.currentTarget.style.color = '#DC2626';
                                e.currentTarget.style.borderColor = '#FCA5A5';
                              }}
                            >
                              <UserMinus size={12} />
                              {actionLoadingCode === u.user_code ? '...' : 'Thu hồi'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoadingCode === u.user_code}
                              onClick={() => handleAddUser(u.user_code)}
                              title={isShowHideRole ? "Thêm user này vào danh sách quyền ẩn/hiện món" : "Thêm user này vào danh sách quyền"}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid #86EFAC',
                                backgroundColor: '#F0FDF4',
                                color: '#15803D',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#16A34A';
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.borderColor = '#15803D';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F0FDF4';
                                e.currentTarget.style.color = '#15803D';
                                e.currentTarget.style.borderColor = '#86EFAC';
                              }}
                            >
                              <UserPlus size={12} />
                              {actionLoadingCode === u.user_code ? '...' : '+ Thêm quyền'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MODAL TẠO BỔ SUNG QUẦY & ACCOUNT FOOD CONTROL (ROLE: 2)
// ══════════════════════════════════════════════════════════════════════════
export interface ModalCreateFoodControlProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  restaurantName?: string;
  defaultPrinters?: string[];
  existingPlacesCount?: number;
  onSuccess: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ModalCreateFoodControl: React.FC<ModalCreateFoodControlProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  restaurantName,
  defaultPrinters = [],
  existingPlacesCount = 0,
  onSuccess,
  onToast
}) => {
  const [accountName, setAccountName] = useState('Food control');
  const [accountId, setAccountId] = useState('101');
  const [password, setPassword] = useState('1');
  const [placeName, setPlaceName] = useState('Food control');
  const [placeCode, setPlaceCode] = useState('FOOD_CONTROL');
  const [printer, setPrinter] = useState(defaultPrinters[0] || 'KDS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccountName('Food control');
      setAccountId('101');
      setPassword('1');
      setPlaceName('Food control');
      setPlaceCode('FOOD_CONTROL');
      setPrinter(defaultPrinters[0] || 'KDS');
      setIsSubmitting(false);
    }
  }, [isOpen, defaultPrinters]);

  const handleSubmit = async () => {
    if (!accountName.trim() || !accountId.trim()) {
      onToast('Vui lòng nhập tên tài khoản và mã tài khoản Food Control!', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await mongoService.createKdsFoodControl({
        host,
        port,
        account_name: accountName.trim(),
        account_id: accountId.trim(),
        password: password.trim() || '1',
        place_name: placeName.trim() || 'Food control',
        place_code: placeCode.trim() || 'FOOD_CONTROL',
        printer: printer.trim() || 'KDS'
      });
      onToast(res.message || 'Đã tạo quầy & account Food Control thành công!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onToast(
        'Lỗi khi tạo Food Control: ' + (err.response?.data?.detail || err.message),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🛡️ Tạo Bổ Sung Quầy & Account Food Control (Role: 2)"
      maxWidth="620px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            style={{ backgroundColor: '#D97706', borderColor: '#B45309', color: '#fff', fontWeight: 700 }}
          >
            ✓ Xác nhận tạo Food Control
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            fontSize: '12px',
            color: '#92400E',
            lineHeight: '1.5'
          }}
        >
          <strong>💡 Giới thiệu tính năng:</strong>
          <div style={{ marginTop: '4px' }}>
            Nhà hàng {restaurantName ? <strong>[{restaurantName}]</strong> : 'này'} hiện <strong>chưa có quầy / tài khoản Food Control</strong> (Trạm bếp trưởng điều phối tổng).
            Hệ thống sẽ tự động cấu hình:
          </div>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>Tạo quầy <strong>{placeName}</strong> trong <code>CONFIG_KDS.places</code> (Place Code: {placeCode})</li>
            <li>Tạo tài khoản <strong>{accountName}</strong> (Mã: <strong>{accountId}</strong>, Mật khẩu: <strong>{password}</strong>) trong <code>ACCOUNT</code> với quyền <strong>Role: 2</strong> (Bếp Trưởng/Tổng).</li>
            <li>Gán toàn bộ <strong>{existingPlacesCount} quầy con hiện có</strong> vào trạm quản lý của Food Control (<code>listPlace</code>).</li>
            <li>Đồng bộ các quầy con (Role: 3) kết nối <code>placeParent: "{accountId}"</code> để điều phối tiến độ.</li>
          </ul>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Tên Quầy (CONFIG_KDS):
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mã Quầy (Place Code):
            </label>
            <input
              type="text"
              value={placeCode}
              onChange={(e) => setPlaceCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Tên Account (Bếp tổng):
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mã Account (accId):
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mật khẩu đăng nhập:
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Máy In / Driver KDS Quầy:
          </label>
          <input
            type="text"
            value={printer}
            onChange={(e) => setPrinter(e.target.value)}
            placeholder="KDS"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '13px'
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 7. MODAL CHUYỂN MÓN GIỮA CÁC QUẦY BẾP (TOÀN BỘ HOẶC CHỌN LỌC)
// ══════════════════════════════════════════════════════════════════════════
interface KdsTransferQuayModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  places: KdsPlaceItem[];
  preselectedFromPlaceId?: number | null;
  initialFromPlaceId?: number | null;
  selectedDishCodes?: string[];
  preselectedDishCodes?: string[];
  dishItems?: KdsItemDish[];
  allDishes?: KdsItemDish[];
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsTransferQuayModal: React.FC<KdsTransferQuayModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  places,
  preselectedFromPlaceId,
  initialFromPlaceId,
  selectedDishCodes,
  preselectedDishCodes,
  dishItems,
  allDishes,
  onSuccess,
  showToast
}) => {
  const effectiveFromPlaceId = preselectedFromPlaceId ?? initialFromPlaceId ?? null;
  const effectiveDishCodes = selectedDishCodes ?? preselectedDishCodes ?? [];
  const effectiveDishes = dishItems ?? allDishes ?? [];

  const [fromPlaceId, setFromPlaceId] = useState<number | null>(effectiveFromPlaceId);
  const [toPlaceId, setToPlaceId] = useState<number | null>(null);
  const [keepSource, setKeepSource] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  useEffect(() => {
    if (effectiveFromPlaceId) {
      setFromPlaceId(effectiveFromPlaceId);
    } else if (places.length > 0 && !fromPlaceId) {
      setFromPlaceId(places[0].id);
    }
    // Gợi ý quầy đích là quầy khác quầy nguồn
    if (places.length > 1) {
      const other = places.find((p) => p.id !== (effectiveFromPlaceId || places[0].id));
      if (other) setToPlaceId(other.id);
    }
  }, [effectiveFromPlaceId, places, isOpen]);

  if (!isOpen) return null;

  const isSelective = effectiveDishCodes.length > 0;
  const fromPlace = places.find((p) => p.id === fromPlaceId);
  const toPlace = places.find((p) => p.id === toPlaceId);

  // Lấy tên các món đang chọn (nếu có)
  const selectedDishes = effectiveDishes.filter((d) => effectiveDishCodes.includes(d.menu_item_code));

  const handleExecuteTransfer = async () => {
    if (!fromPlaceId) {
      showToast('Vui lòng chọn quầy bếp nguồn!', 'error');
      return;
    }
    if (!toPlaceId) {
      showToast('Vui lòng chọn quầy bếp đích để chuyển đến!', 'error');
      return;
    }
    if (fromPlaceId === toPlaceId) {
      showToast('Quầy bếp đích phải khác với quầy bếp nguồn!', 'error');
      return;
    }

    const actionText = isSelective
      ? `chuyển ${effectiveDishCodes.length} món đã chọn`
      : `chuyển TOÀN BỘ món (${fromPlace?.dish_count || 0} món)`;

    const confirmMsg = `Bạn có chắc chắn muốn ${actionText} từ "${fromPlace?.name || fromPlaceId}" sang "${toPlace?.name || toPlaceId}" không?\n\n- Tùy chọn: ${keepSource ? 'Thêm quầy mới (Giữ cả quầy cũ)' : 'Chuyển hẳn (Rút khỏi quầy cũ, gán sang quầy mới)'}`;
    if (!window.confirm(confirmMsg)) return;

    setIsTransferring(true);
    try {
      const res = await mongoService.transferKdsDishesQuay({
        host,
        port,
        from_place_id: fromPlaceId,
        to_place_id: toPlaceId,
        menu_item_codes: isSelective ? effectiveDishCodes : undefined,
        keep_source: keepSource
      });
      showToast(res.message, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(
        'Lỗi khi chuyển quầy món: ' + (err.response?.data?.detail || err.message),
        'error'
      );
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔄 Chuyển Món Giữa Các Quầy Bếp (KDS)"
      maxWidth="620px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="outline" onClick={onClose} disabled={isTransferring}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleExecuteTransfer}
            isLoading={isTransferring}
            leftIcon={<ArrowRightLeft size={16} />}
            style={{ backgroundColor: '#2563EB', borderColor: '#2563EB', color: '#fff', fontWeight: 600 }}
          >
            {isSelective
              ? `Xác Nhận Chuyển (${effectiveDishCodes.length} Món)`
              : `Chuyển Toàn Bộ Món`}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner chế độ chuyển */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: isSelective ? '#EFF6FF' : '#FEF3C7',
            border: isSelective ? '1px solid #BFDBFE' : '1px solid #FCD34D',
            fontSize: '13px',
            color: isSelective ? '#1E40AF' : '#92400E',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <Layers size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong>
              {isSelective
                ? `Đang chuyển ${effectiveDishCodes.length} món ăn được tick chọn`
                : `Chuyển TOÀN BỘ món ăn của quầy nguồn`}
            </strong>
            <div style={{ fontSize: '12px', marginTop: '3px', opacity: 0.9 }}>
              {isSelective
                ? 'Hệ thống sẽ cập nhật cấu hình CONFIG_COOKING cho danh sách các món bạn đã tick chọn.'
                : 'Tất cả các món ăn đang thuộc quầy nguồn sẽ được chuyển sang quầy đích được chọn bên dưới.'}
            </div>
          </div>
        </div>

        {/* Danh sách món chọn tóm tắt (nếu chuyển chọn lọc) */}
        {isSelective && selectedDishes.length > 0 && (
          <div
            style={{
              maxHeight: '130px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            {selectedDishes.map((d) => (
              <span
                key={d.menu_item_code}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: 'var(--text-primary)'
                }}
              >
                <strong>{d.menu_item_code}</strong>: {d.menu_item_name}
              </span>
            ))}
          </div>
        )}

        {/* Hai ô chọn quầy: Nguồn & Đích */}
        <div className="kds-transfer-grid" style={{ gap: '10px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#B45309', marginBottom: '6px' }}>
              Quầy Bếp Nguồn (Từ):
            </label>
            <select
              value={fromPlaceId || ''}
              onChange={(e) => setFromPlaceId(Number(e.target.value))}
              disabled={isSelective && !!preselectedFromPlaceId}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1.5px solid #FCD34D',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.dish_count} món) - ID: {p.id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '22px' }}>
            <ArrowRight size={22} style={{ color: '#2563EB' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1D4ED8', marginBottom: '6px' }}>
              Quầy Bếp Đích (Sang):
            </label>
            <select
              value={toPlaceId || ''}
              onChange={(e) => setToPlaceId(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1.5px solid #93C5FD',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <option value="">-- Chọn quầy đích --</option>
              {places
                .filter((p) => p.id !== fromPlaceId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.dish_count} món) - ID: {p.id}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Tùy chọn chuyển hẳn vs giữ nguồn */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Phương Thức Chuyển:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="radio"
                name="keepSourceOption"
                checked={!keepSource}
                onChange={() => setKeepSource(false)}
              />
              <span>
                <strong>Chuyển hẳn</strong> (Gỡ khỏi quầy cũ, chỉ hiển thị ở quầy mới - Khuyên dùng)
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="radio"
                name="keepSourceOption"
                checked={keepSource}
                onChange={() => setKeepSource(true)}
              />
              <span>
                <strong>Nhân bản thêm quầy mới</strong> (Món sẽ xuất hiện ở cả quầy cũ lẫn quầy mới)
              </span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 8. MODAL TRA CỨU LOGS KDS (ORDER TỪ SO/CO VÀO BẾP & GIỜ BẤM DONE MÓN)
// ══════════════════════════════════════════════════════════════════════════
interface KdsLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  restaurantName?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsLogsModal: React.FC<KdsLogsModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  restaurantName = '',
  showToast
}) => {
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterFromTime, setFilterFromTime] = useState<string>('');
  const [filterToTime, setFilterToTime] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [logs, setLogs] = useState<KdsLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasQueried, setHasQueried] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [historyTarget, setHistoryTarget] = useState<{
    itemCode: string;
    sapCode?: string;
    dishName?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && host) {
      handleSearch();
    }
  }, [isOpen, host]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!host) {
      showToast('Chưa xác định IP MongoDB của nhà hàng!', 'error');
      return;
    }
    setLoading(true);
    setHasQueried(true);
    try {
      const res = await mongoService.getKdsLogs({
        host,
        port,
        date: filterDate,
        table: filterTable.trim() || undefined,
        query: filterQuery.trim() || undefined,
        from_time: filterFromTime.trim() || undefined,
        to_time: filterToTime.trim() || undefined,
        limit: 400
      });
      setLogs(res.logs || []);
      showToast(res.message || `Đã tải ${res.logs?.length || 0} bản ghi nhật ký KDS.`, 'success');
    } catch (err: any) {
      showToast(
        'Lỗi khi tra cứu Logs KDS: ' + (err.response?.data?.detail || err.message),
        'error'
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTextReport = () => {
    if (logs.length === 0) return;
    let text = `BÁO CÁO NHẬT KÝ RA MÓN KDS (${restaurantName || host} - Ngày: ${filterDate})\n`;
    text += `Tra cứu lúc: ${new Date().toLocaleString('vi-VN')}\n`;
    text += `------------------------------------------------------------------------------------------------------------------------\n`;
    text += `BÀN | TÊN MÓN | SAP | QUẦY | GIỜ ORDER (CO/SO) | GIỜ DONE (KDS) | LỆNH IN / MÁY IN | THỰC TẾ | CHUẨN | TRẠNG THÁI\n`;
    text += `------------------------------------------------------------------------------------------------------------------------\n`;
    logs.forEach((l) => {
      const printInfo = l.print_status === 'PRINTED'
        ? `[ĐÃ IN -> ${l.printer_name}]`
        : l.print_status === 'DISABLED'
        ? `[TẮT IN (${l.printer_name || 'KDS'})]`
        : l.print_status === 'NO_PRINTER'
        ? '[CHƯA GÁN MÁY IN]'
        : '[CHỜ DONE]';
      text += `${l.table_name} | ${l.dish_name} | ${l.sap_code} | ${l.place_name} | ${l.order_time} | ${l.done_time} | ${printInfo} | ${l.actual_minutes}p | ${l.config_minutes}p | ${l.status_label}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    showToast('Đã sao chép toàn bộ bảng đối soát logs KDS vào Clipboard!', 'success');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📋 Tra Cứu Nhật Ký KDS (Thời Gian Order & Bấm Done Món)"
      maxWidth="1200px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Tổng số: <strong>{logs.length}</strong> bản ghi | Host: <code>{host}:{port}</code>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTextReport}
              disabled={logs.length === 0}
              leftIcon={copiedAll ? <Check size={14} color="#059669" /> : <Copy size={14} />}
            >
              {copiedAll ? 'Đã sao chép!' : 'Sao chép kết quả gửi NH'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Hướng dẫn nghiệp vụ */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            fontSize: '12px',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            💡 Dữ liệu trích xuất từ <strong>G_KITCHEN.LOG_DISH_FINISH_ITEM</strong> và <strong>G_ORDER.ORDER_DELIVERY_LOG</strong>. Dùng để đối soát thời gian order, thời điểm nhân viên bếp thực tế bấm <strong>DONE</strong> món trên KDS, và máy in nhận lệnh in hoàn thành.
          </div>
        </div>

        {/* Bộ lọc tìm kiếm */}
        <div
          className="kds-logs-filter-grid"
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Ngày Kiểm Tra: <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Từ Giờ:
            </label>
            <input
              type="text"
              placeholder="VD: 10:00"
              value={filterFromTime}
              onChange={(e) => setFilterFromTime(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Đến Giờ:
            </label>
            <input
              type="text"
              placeholder="VD: 12:30"
              value={filterToTime}
              onChange={(e) => setFilterToTime(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Bàn Ăn:
            </label>
            <input
              type="text"
              placeholder="VD: B14, 05..."
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Món Ăn / Mã SAP / RK7:
            </label>
            <input
              type="text"
              placeholder="VD: 60022506, Truffle, Wagyu..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSearch}
              isLoading={loading}
              leftIcon={<Search size={14} />}
              style={{ backgroundColor: '#059669', borderColor: '#059669', color: '#fff', fontWeight: 700 }}
            >
              Tra Cứu
            </Button>
            {filterQuery.trim() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHistoryTarget({
                    itemCode: filterQuery.trim(),
                    sapCode: filterQuery.trim(),
                    dishName: filterQuery.trim()
                  });
                }}
                leftIcon={<History size={14} />}
                style={{ borderColor: '#0284C7', color: '#0369A1', fontWeight: 700, backgroundColor: '#F0F9FF' }}
                title="Soi toàn diện lịch sử và đối soát fallback KDS cho món này"
              >
                Soi Món Này
              </Button>
            )}
          </div>
        </div>

        {/* Bảng danh sách nhật ký */}
        <div
          style={{
            maxHeight: '440px',
            overflowY: 'auto',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <table style={{ width: '100%', minWidth: '1160px', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', color: '#475569', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '70px' }}>Bàn</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', minWidth: '170px' }}>Món Ăn</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '90px' }}>Mã SAP</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', minWidth: '140px' }}>Quầy Bếp (Thời Điểm Order)</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '135px' }}>Giờ Order (CO/SO)</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '135px' }}>Giờ Done (KDS)</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '155px' }}>Lệnh In / Máy In KDS</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '80px' }}>Thực Tế</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '80px' }}>Chuẩn</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '110px' }}>Trạng Thái</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '80px' }}>Tài Khoản</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '95px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                    Đang tra cứu dữ liệu nhật ký KDS từ MongoDB...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF' }}>
                    {hasQueried ? 'Không tìm thấy bản ghi nào phù hợp với bộ lọc trong ngày đã chọn.' : 'Vui lòng nhấn nút Tra Cứu để tải dữ liệu.'}
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  const isDelayed = item.delay_minutes > 0;
                  return (
                    <tr
                      key={`${item.id}_${idx}`}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        backgroundColor: isDelayed ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                      }}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#1E293B' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#E2E8F0',
                            fontFamily: 'monospace'
                          }}
                        >
                          {item.table_name || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0F172A' }}>
                        <div>{item.dish_name}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Mã RK7: {item.menu_item_code}</div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', color: '#475569' }}>
                        {item.sap_code || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>
                        {item.is_unassigned ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                              border: '1px solid #FECACA',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                            title="Lúc order món chưa được gán quầy cụ thể (placeIds rỗng), KDS tự động fallback vào nhóm bếp chung"
                          >
                            ⚠️ {item.place_name}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            {item.place_name}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1E40AF', fontFamily: 'monospace', fontSize: '11px' }}>
                        {item.order_time}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#047857', fontFamily: 'monospace', fontSize: '11px' }}>
                        {item.done_time}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {item.print_status === 'PRINTED' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #BBF7D0'
                              }}
                              title={item.print_message || ''}
                            >
                              <Printer size={12} />
                              {item.printer_name || 'Máy in'}
                            </span>
                            <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                              ✓ Đã phát lệnh in
                            </span>
                          </div>
                        ) : item.print_status === 'DISABLED' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A'
                              }}
                              title={item.print_message || 'Tắt in KDS'}
                            >
                              ⛔ Tắt in KDS
                            </span>
                            {item.printer_name && (
                              <span style={{ fontSize: '10px', color: '#92400E' }}>
                                ({item.printer_name})
                              </span>
                            )}
                          </div>
                        ) : item.print_status === 'NO_PRINTER' ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: '#64748B',
                              backgroundColor: '#F1F5F9',
                              border: '1px solid #E2E8F0'
                            }}
                            title="Quầy này chưa được cấu hình máy in trong CONFIG_KDS"
                          >
                            ⚠️ Chưa gán máy in
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              color: '#94A3B8'
                            }}
                          >
                            ⏳ Chờ Done món
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: isDelayed ? '#DC2626' : '#059669' }}>
                        {item.actual_minutes > 0 ? `${item.actual_minutes}p` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>
                        {item.config_minutes > 0 ? `${item.config_minutes}p` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isDelayed ? '#FEE2E2' : '#DCFCE7',
                            color: isDelayed ? '#DC2626' : '#15803D',
                            border: isDelayed ? '1px solid #FECACA' : '1px solid #BBF7D0'
                          }}
                        >
                          {item.status_label}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
                        {item.account_name || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setHistoryTarget({
                            itemCode: item.menu_item_code,
                            sapCode: item.sap_code,
                            dishName: item.dish_name
                          })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #0284C7',
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Soi toàn diện lịch sử order, trạng thái cấu hình và đối soát fallback KDS"
                        >
                          <History size={12} />
                          Soi Món
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CON: SOI LỊCH SỬ MÓN & ĐỐI SOÁT BẾP KDS */}
      {historyTarget && (
        <KdsDishHistoryModal
          isOpen={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
          host={host}
          port={port}
          restaurantName={restaurantName}
          itemCode={historyTarget.itemCode}
          sapCode={historyTarget.sapCode}
          dishName={historyTarget.dishName}
          showToast={showToast}
        />
      )}
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 9. MODAL SOI LỊCH SỬ MÓN KDS & ĐỐI SOÁT BẾP (SMART TIMELINE & ANALYSIS)
// ══════════════════════════════════════════════════════════════════════════
export interface KdsDishHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  restaurantName?: string;
  itemCode: string;
  sapCode?: string;
  dishName?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsDishHistoryModal: React.FC<KdsDishHistoryModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  restaurantName = '',
  itemCode,
  sapCode = '',
  dishName = '',
  showToast
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<KdsDishHistoryResponse | null>(null);
  const [copiedAnalysis, setCopiedAnalysis] = useState<boolean>(false);
  const [copiedTimeline, setCopiedTimeline] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && host && itemCode) {
      loadHistory();
    }
  }, [isOpen, host, itemCode, sapCode]);

  if (!isOpen) return null;

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await mongoService.getKdsDishHistory({
        host,
        port,
        item_code: itemCode,
        sap_code: sapCode || undefined,
        dish_name: dishName || undefined
      });
      setData(res);
      showToast(res.message || `Đã tải lịch sử món ${itemCode}.`, 'success');
    } catch (err: any) {
      showToast(
        'Lỗi khi soi lịch sử món KDS: ' + (err.response?.data?.detail || err.message),
        'error'
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!data) return;
    let content = `=== BẰNG CHỨNG ĐỐI SOÁT & GIẢI TRÌNH KDS: ${data.dish_name} ===\n`;
    content += `Mã RK7: ${data.item_code} | Mã SAP: ${data.sap_code || '—'}\n`;
    content += `Nhà hàng: ${restaurantName || host} | Kiểm tra lúc: ${new Date().toLocaleString('vi-VN')}\n`;
    content += `------------------------------------------------------------------------------------\n\n`;
    content += data.smart_analysis;
    navigator.clipboard.writeText(content);
    setCopiedAnalysis(true);
    showToast('Đã sao chép văn bản giải trình đối soát KDS vào Clipboard!', 'success');
    setTimeout(() => setCopiedAnalysis(false), 2500);
  };

  const handleCopyTimeline = () => {
    if (!data || data.timeline.length === 0) return;
    let text = `LỊCH SỬ CHI TIẾT RA MÓN KDS: ${data.dish_name} (${restaurantName || host})\n`;
    text += `BÀN | GIỜ ORDER | GIỜ DONE | QUẦY ORDER | THỰC TẾ | CHUẨN | TRẠNG THÁI\n`;
    text += `------------------------------------------------------------------------------------\n`;
    data.timeline.forEach((t) => {
      text += `${t.table_name} | ${t.order_time} | ${t.done_time} | ${t.place_name} | ${t.actual_minutes}p | ${t.config_minutes}p | ${t.status_label}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedTimeline(true);
    showToast('Đã sao chép bảng lịch sử ra món vào Clipboard!', 'success');
    setTimeout(() => setCopiedTimeline(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔍 Soi Lịch Sử & Đối Soát Bếp KDS: ${dishName || data?.dish_name || 'Món ăn'} (RK7: ${itemCode}${sapCode ? ` | SAP: ${sapCode}` : ''})`}
      maxWidth="1100px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Ghi nhận <strong>{data?.total_timeline_orders || 0}</strong> lần order | Host: <code>{host}:{port}</code>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAnalysis}
              disabled={!data || !data.smart_analysis}
              leftIcon={copiedAnalysis ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              style={{ borderColor: '#0284C7', color: '#0369A1', fontWeight: 600 }}
            >
              {copiedAnalysis ? 'Đã sao chép giải trình!' : '📋 Copy Giải Trình Gửi NH'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTimeline}
              disabled={!data || data.timeline.length === 0}
              leftIcon={copiedTimeline ? <Check size={14} color="#059669" /> : <Copy size={14} />}
            >
              {copiedTimeline ? 'Đã sao chép!' : 'Sao Chép Timeline'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#6B7280' }}>
            <RefreshCw size={24} className="animate-spin" style={{ display: 'inline', marginRight: '10px' }} />
            Đang phân tích đối soát dữ liệu lịch sử KDS từ máy trạm nhà hàng ({host})...
          </div>
        ) : !data ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
            Không tìm thấy dữ liệu hoặc có lỗi xảy ra khi truy vấn MongoDB.
          </div>
        ) : (
          <>
            {/* 3 Thẻ tóm tắt thông tin hiện tại */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Thẻ 1: Cấu hình Bếp KDS */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: data.is_in_config_cooking ? '#F0FDF4' : '#FEF2F2',
                  border: data.is_in_config_cooking ? '1px solid #BBF7D0' : '1px solid #FECACA'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: data.is_in_config_cooking ? '#15803D' : '#DC2626', marginBottom: '4px' }}>
                  ⚙️ CẤU HÌNH BẾP (CONFIG_COOKING)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                  {data.is_in_config_cooking ? '✓ Đang có trong CONFIG_COOKING' : '❌ Chưa cấu hình / Đã bị xóa'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  Quầy hiện tại: <strong>{data.current_place_names?.length ? data.current_place_names.join(', ') : 'Chưa gán quầy (placeIds: [])'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  Nhóm KDS: <strong>{data.current_group_name || 'Không có'}</strong> | Chuẩn: <strong>{data.current_config_minutes}p</strong>
                </div>
              </div>

              {/* Thẻ 2: Kênh bán */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  📱 KÊNH BÁN (QR-ORDER / CO / SO)
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: data.is_hidden ? '#FEE2E2' : '#DCFCE7',
                      color: data.is_hidden ? '#DC2626' : '#15803D'
                    }}
                  >
                    {data.is_hidden ? '👁️ Đang ẨN trên Menu' : '✓ Hiển thị bình thường'}
                  </span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: data.is_out_of_stock ? '#FEF3C7' : '#DCFCE7',
                      color: data.is_out_of_stock ? '#B45309' : '#15803D'
                    }}
                  >
                    {data.is_out_of_stock ? '📦 BÁO HẾT MÓN (Out of Dish)' : '✓ Còn hàng'}
                  </span>
                </div>
              </div>

              {/* Thẻ 3: Tổng lượt order */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', marginBottom: '4px' }}>
                  📊 THỐNG KÊ LỊCH SỬ RA MÓN
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E3A8A' }}>
                  {data.total_timeline_orders} <span style={{ fontSize: '12px', fontWeight: 500 }}>lần order</span>
                </div>
                <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>
                  Dữ liệu đối soát từ <code>G_KITCHEN.LOG_DISH_FINISH_ITEM</code>
                </div>
              </div>
            </div>

            {/* Hộp Giải Trình & Đối Soát Kỹ Thuật (Smart Analysis Box) */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: '#F0F9FF',
                border: '1.5px solid #0284C7',
                color: '#0C4A6E'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1' }}>
                  💡 KẾT LUẬN ĐỐI SOÁT & GIẢI TRÌNH KỸ THUẬT CHO NHÀ HÀNG
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAnalysis}
                  leftIcon={copiedAnalysis ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  style={{ backgroundColor: '#fff', fontSize: '11px', borderColor: '#0284C7', color: '#0369A1' }}
                >
                  {copiedAnalysis ? 'Đã sao chép!' : 'Sao chép giải trình'}
                </Button>
              </div>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  lineHeight: 1.65,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: '1px solid #BAE6FD'
                }}
              >
                {data.smart_analysis}
              </div>
            </div>

            {/* Bảng Dòng Thời Gian Ra Món (Timeline Table) */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                📜 DÒNG THỜI GIAN CÁC LẦN RA MÓN (LOG_DISH_FINISH_ITEM):
              </div>
              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', color: '#475569', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '75px' }}>Bàn</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>Giờ Order (CO/SO)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>Giờ Done (KDS)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '160px' }}>Quầy Khi Order</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Máy In</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px' }}>Thực Tế</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '75px' }}>Chuẩn</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '110px' }}>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.timeline.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>
                          Chưa có bản ghi order nào của món này trong ngày.
                        </td>
                      </tr>
                    ) : (
                      data.timeline.map((item, idx) => {
                        const isDelayed = item.delay_minutes > 0;
                        const isUnassigned = !item.place_ids || item.place_ids.length === 0;
                        return (
                          <tr
                            key={`${item.id}_${idx}`}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              backgroundColor: isDelayed ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E2E8F0', fontFamily: 'monospace' }}>
                                {item.table_name}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1E40AF', fontFamily: 'monospace', fontSize: '11px' }}>
                              {item.order_time}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#047857', fontFamily: 'monospace', fontSize: '11px' }}>
                              {item.done_time}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {isUnassigned ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#FEF2F2',
                                    color: '#B91C1C',
                                    border: '1px solid #FECACA',
                                    fontSize: '11px',
                                    fontWeight: 700
                                  }}
                                  title="placeIds: [] lúc order -> KDS fallback về nhóm bếp chung"
                                >
                                  ⚠️ {item.place_name}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#F1F5F9',
                                    fontSize: '11px',
                                    fontWeight: 600
                                  }}
                                >
                                  {item.place_name}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                              {item.printer_name || '—'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: isDelayed ? '#DC2626' : '#059669' }}>
                              {item.actual_minutes > 0 ? `${item.actual_minutes}p` : '—'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>
                              {item.config_minutes > 0 ? `${item.config_minutes}p` : '—'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: isDelayed ? '#FEE2E2' : '#DCFCE7',
                                  color: isDelayed ? '#DC2626' : '#15803D',
                                  border: isDelayed ? '1px solid #FECACA' : '1px solid #BBF7D0'
                                }}
                              >
                                {item.status_label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

