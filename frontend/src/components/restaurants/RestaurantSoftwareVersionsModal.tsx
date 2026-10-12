import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tag,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Upload,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  X,
  RefreshCw,
  Plus,
  Layers,
  Copy,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SoftwareVersionItem } from '../../types/pmBo';
import { pmBoService } from '../../services/pmBoService';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsAdmin } from '../../utils/authUtils';

interface RestaurantSoftwareVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SyncDateModalState {
  isOpen: boolean;
  sourceSoftwareName?: string;
  sourceDate: string; // YYYY-MM-DD
  sourceId?: number;
  selectedAppNames: string[];
}

// 5 phần mềm cốt lõi mặc định
const CORE_SOFTWARES = [
  {
    key: 'KDS',
    label: 'KDS',
    subTitle: 'Kitchen Display System',
    badgeColor: '#6366F1',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  {
    key: 'CO',
    label: 'CO',
    subTitle: 'Central Order',
    badgeColor: '#0EA5E9',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    key: 'SO',
    label: 'SO',
    subTitle: 'Smart Order',
    badgeColor: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    key: 'GPOS-CO-SO',
    label: 'GPOS-CO-SO',
    subTitle: 'Liên Thông GPOS & CO/SO',
    badgeColor: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  {
    key: 'GPOS-KDS',
    altKey: 'GPOS KDS',
    label: 'GPOS KDS',
    subTitle: 'Đồng Bộ GPOS & KDS Bếp',
    badgeColor: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
];

export const RestaurantSoftwareVersionsModal: React.FC<RestaurantSoftwareVersionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const canEdit = checkIsAdmin(user);

  const [versions, setVersions] = useState<SoftwareVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trạng thái Form: thêm mới hoặc chỉnh sửa
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<SoftwareVersionItem | null>(null);

  // Trường nhập liệu trong Form
  const [formSoftwareName, setFormSoftwareName] = useState<string>('');
  const [formVersion, setFormVersion] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formImage, setFormImage] = useState<string>('');
  const [formSyncAllDates, setFormSyncAllDates] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Xem ảnh phóng to (Lightbox)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Trạng thái modal sao chép ngày hàng loạt
  const [syncModal, setSyncModal] = useState<SyncDateModalState | null>(null);
  const [isSyncingDates, setIsSyncingDates] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách phiên bản từ API
  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await pmBoService.getSoftwareVersions();
      setVersions(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Không thể tải danh sách phiên bản phần mềm.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
      setFormMode(null);
      setEditingItem(null);
      setPreviewImageUrl(null);
      setSyncModal(null);
      setSyncSuccessMsg(null);
      setFormSyncAllDates(false);
    }
  }, [isOpen, loadVersions]);

  // Mở form thêm mới phần mềm
  const handleStartCreate = () => {
    setFormMode('create');
    setEditingItem(null);
    setFormSoftwareName('');
    setFormVersion('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormImage('');
    setFormError(null);
    setFormSyncAllDates(false);
  };

  // Mở form chỉnh sửa 1 phần mềm
  const handleStartEdit = (name: string, item: SoftwareVersionItem | null) => {
    setFormMode('edit');
    setEditingItem(item);
    setFormSoftwareName(name);
    setFormVersion(item?.phien_ban || '');
    setFormDate(item?.ngay_update ? item.ngay_update.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormImage(item?.hinh_anh || '');
    setFormError(null);
    setFormSyncAllDates(false);
  };

  const handleCancelForm = () => {
    setFormMode(null);
    setEditingItem(null);
    setFormError(null);
    setFormSyncAllDates(false);
  };

  // Xóa phần mềm tùy chỉnh (chỉ cho phép xóa các phần mềm không thuộc core 5)
  const handleDeleteCustom = async (item: SoftwareVersionItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phần mềm "${item.phan_mem}" khỏi danh sách theo dõi?`)) {
      return;
    }
    try {
      await pmBoService.deleteSoftwareVersion(item.id);
      await loadVersions();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Không thể xóa phần mềm.');
    }
  };

  // Upload hình ảnh từ file
  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Vui lòng chỉ tải lên tệp tin hình ảnh (PNG, JPG, WEBP...).');
      return;
    }
    setIsUploadingImage(true);
    setFormError(null);
    try {
      const res = await pmBoService.uploadVersionImage(file);
      setFormImage(res.url);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Không thể tải ảnh lên máy chủ.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Hỗ trợ dán ảnh từ clipboard (Ctrl + V)
  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadFile(file);
          break;
        }
      }
    }
  };

  // Lưu thông tin (Thêm mới hoặc Cập nhật)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = formSoftwareName.trim();

    if (!finalName) {
      setFormError('Vui lòng nhập tên phần mềm!');
      return;
    }
    if (!formVersion.trim()) {
      setFormError('Vui lòng nhập phiên bản (Version)!');
      return;
    }
    if (!formDate) {
      setFormError('Vui lòng chọn ngày update!');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      phan_mem: finalName,
      phien_ban: formVersion.trim(),
      ngay_update: `${formDate}T00:00:00`,
      hinh_anh: formImage.trim() || undefined,
      sync_all_dates: formSyncAllDates,
    };

    try {
      if (formMode === 'edit' && editingItem) {
        await pmBoService.updateSoftwareVersion(editingItem.id, payload);
      } else {
        await pmBoService.createSoftwareVersion(payload as any);
      }
      await loadVersions();
      if (formSyncAllDates) {
        setSyncSuccessMsg(`Đã cập nhật ${finalName} và sao chép ngày ${formatDateDisplay(formDate)} cho tất cả các phần mềm thành công!`);
        setTimeout(() => setSyncSuccessMsg(null), 4500);
      } else {
        setSyncSuccessMsg(`Đã lưu phiên bản cho phần mềm ${finalName} thành công!`);
        setTimeout(() => setSyncSuccessMsg(null), 3000);
      }
      setFormMode(null);
      setEditingItem(null);
      setFormSyncAllDates(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Lỗi khi lưu thông tin phiên bản phần mềm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Danh sách các phần mềm phụ bổ sung (ngoài 5 core softwares)
  const coreKeys = CORE_SOFTWARES.flatMap((c) => [c.key.toLowerCase(), (c.altKey || '').toLowerCase()]);
  const customVersions = versions.filter(
    (v) => !coreKeys.includes(v.phan_mem.trim().toLowerCase())
  );

  // Danh sách toàn bộ các phần mềm trong hệ thống (gồm 5 core + các phần mềm bổ sung)
  const allAvailableApps = [
    ...CORE_SOFTWARES.map((c) => {
      const item = versions.find(
        (v) =>
          v.phan_mem.trim().toLowerCase() === c.key.toLowerCase() ||
          (c.altKey && v.phan_mem.trim().toLowerCase() === c.altKey.toLowerCase())
      );
      return {
        key: c.key,
        name: c.label,
        subTitle: c.subTitle,
        badgeColor: c.badgeColor,
        bgColor: c.bgColor,
        borderColor: c.borderColor,
        currentDate: item?.ngay_update,
        id: item?.id,
      };
    }),
    ...customVersions.map((cust) => ({
      key: `custom_${cust.id}`,
      name: cust.phan_mem,
      subTitle: cust.phien_ban ? `Phiên bản: ${cust.phien_ban}` : undefined,
      badgeColor: '#334155',
      bgColor: '#F1F5F9',
      borderColor: '#CBD5E1',
      currentDate: cust.ngay_update,
      id: cust.id,
    })),
  ];

  // Mở modal sao chép ngày từ 1 dòng cụ thể
  const handleOpenRowCopyDate = (name: string, dateStr?: string | null, id?: number) => {
    const initialDate = dateStr ? dateStr.slice(0, 10) : new Date().toISOString().slice(0, 10);
    // Mặc định chọn tất cả các app để người dùng có thể bỏ chọn một số app hoặc chọn từng cái
    const allNames = allAvailableApps.map((a) => a.name);
    setSyncModal({
      isOpen: true,
      sourceSoftwareName: name,
      sourceDate: initialDate,
      sourceId: id,
      selectedAppNames: allNames,
    });
  };

  // Mở modal đồng bộ ngày từ Toolbar
  const handleOpenToolbarSyncDate = () => {
    const firstValid = versions.find((v) => v.ngay_update)?.ngay_update?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const allNames = allAvailableApps.map((a) => a.name);
    setSyncModal({
      isOpen: true,
      sourceSoftwareName: undefined,
      sourceDate: firstValid,
      selectedAppNames: allNames,
    });
  };

  // Thực thi sao chép ngày cho các app đã chọn
  const handleExecuteSyncDate = async () => {
    if (!syncModal || !syncModal.sourceDate) return;
    if (syncModal.selectedAppNames.length === 0) {
      alert('Vui lòng chọn ít nhất 1 phần mềm để áp dụng ngày cập nhật!');
      return;
    }
    setIsSyncingDates(true);
    try {
      const selectedNames = syncModal.selectedAppNames;
      const targetIds = allAvailableApps
        .filter((a) => selectedNames.includes(a.name) && a.id)
        .map((a) => a.id as number);

      const updatedList = await pmBoService.syncSoftwareVersionDates({
        ngay_update: `${syncModal.sourceDate}T00:00:00`,
        source_software: syncModal.sourceSoftwareName,
        target_names: selectedNames,
        target_ids: targetIds,
      });
      setVersions(updatedList);
      const displayDate = formatDateDisplay(syncModal.sourceDate);
      const sourceTxt = syncModal.sourceSoftwareName ? ` từ ${syncModal.sourceSoftwareName}` : '';
      setSyncSuccessMsg(
        `Đã sao chép ngày ${displayDate}${sourceTxt} cho ${selectedNames.length} phần mềm (${selectedNames.join(', ')}) thành công!`
      );
      setSyncModal(null);
      setTimeout(() => setSyncSuccessMsg(null), 4500);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Không thể sao chép ngày cập nhật.');
    } finally {
      setIsSyncingDates(false);
    }
  };

  // Format ngày hiển thị DD/MM/YYYY
  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="890px"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                border: '1.5px solid #F59E0B',
                color: '#B45309',
                fontSize: '16px',
                fontWeight: 900,
              }}
            >
              !
            </span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Phiên Bản Phần Mềm Hệ Thống (KDS, CO, SO, GPOS...)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Theo dõi phiên bản chuẩn, ngày cập nhật và hình ảnh minh họa
              </div>
            </div>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {canEdit ? (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  ⚡ Quyền Quản trị viên (Admin & Super Admin): Bạn có thể cập nhật phiên bản, thêm phần mềm mới và tải lên hình ảnh.
                </span>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>
                  🔒 Chế độ xem: Chỉ Quản trị viên (Admin & Super Admin) mới có quyền cập nhật.
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #F87171',
                borderRadius: '6px',
                color: '#B91C1C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Banner thông báo sao chép ngày thành công */}
          {syncSuccessMsg && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '6px',
                color: '#065F46',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={17} style={{ color: '#059669', flexShrink: 0 }} />
                <span>{syncSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncSuccessMsg(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#065F46', padding: '2px' }}
                title="Đóng thông báo"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Thanh công cụ: Nút + Thêm Phần Mềm & Sao Chép Ngày */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <Layers size={16} style={{ color: 'var(--color-primary, #F5B800)' }} />
              <span>DANH SÁCH PHẦN MỀM VẬN HÀNH:</span>
            </div>

            {canEdit && !formMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Copy size={13} style={{ color: '#0284C7' }} />}
                  onClick={handleOpenToolbarSyncDate}
                  title="Sao chép / đồng bộ ngày cập nhật chung cho tất cả các phần mềm cùng một lúc"
                  style={{
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontWeight: 700,
                  }}
                >
                  Sao Chép Ngày Cho Tất Cả App
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={15} />}
                  onClick={handleStartCreate}
                  title="Bổ sung thêm phần mềm khác vào danh sách theo dõi"
                >
                  + Thêm Phần Mềm
                </Button>
              </div>
            )}
          </div>

          {/* Form Thêm Mới hoặc Chỉnh Sửa */}
          {formMode && (
            <div
              onPaste={handlePasteImage}
              style={{
                backgroundColor: '#F8FAFC',
                border: formMode === 'create' ? '2px solid #10B981' : '2px solid #3B82F6',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {formMode === 'create' ? (
                    <>
                      <Plus size={18} style={{ color: '#059669' }} />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#065F46' }}>
                        + Thêm Mới Phần Mềm Theo Dõi
                      </span>
                    </>
                  ) : (
                    <>
                      <Edit3 size={18} style={{ color: '#2563EB' }} />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                        Cập Nhật Phiên Bản Cho: <span style={{ color: '#2563EB' }}>{formSoftwareName}</span>
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Hủy thao tác"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    color: '#DC2626',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: formMode === 'create' ? '1fr 1fr 1fr' : '1.2fr 1fr', gap: '12px' }}>
                  {/* Tên phần mềm (chỉ nhập khi tạo mới, hoặc sửa) */}
                  {formMode === 'create' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={14} style={{ color: '#059669' }} />
                        <span>Tên Phần Mềm</span>
                        <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formSoftwareName}
                        onChange={(e) => setFormSoftwareName(e.target.value)}
                        placeholder="Ví dụ: PIM, TABLET, GPOS 2.0..."
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: 700,
                          backgroundColor: '#FFFFFF',
                        }}
                        required
                        autoFocus
                      />
                    </div>
                  ) : null}

                  {/* Phiên bản */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} style={{ color: '#2563EB' }} />
                      <span>Phiên Bản (Version)</span>
                      <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      placeholder="Ví dụ: v1.4.49, v2.4.155..."
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: '#FFFFFF',
                      }}
                      required
                    />
                  </div>

                  {/* Ngày Update & Checkbox Sao Chép Ngày */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} style={{ color: '#2563EB' }} />
                      <span>Ngày Update</span>
                      <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                      }}
                      required
                    />
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '3px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: formSyncAllDates ? '#1D4ED8' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: formSyncAllDates ? '#EFF6FF' : 'transparent',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: formSyncAllDates ? '1px solid #BFDBFE' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      title="Tự động áp dụng ngày này cho tất cả các phần mềm còn lại khi bạn bấm Lưu"
                    >
                      <input
                        type="checkbox"
                        checked={formSyncAllDates}
                        onChange={(e) => setFormSyncAllDates(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: '#2563EB', width: '14px', height: '14px' }}
                      />
                      <span>Sao chép ngày này cho các app còn lại</span>
                    </label>
                  </div>
                </div>

                {/* Khu vực Upload Hình Ảnh */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={14} style={{ color: '#2563EB' }} />
                    <span>Hình Ảnh Minh Họa / Screenshot</span>
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748B' }}>(Hỗ trợ dán trực tiếp Ctrl + V hoặc chọn file)</span>
                  </label>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Ô preview ảnh nếu đã có */}
                    {formImage ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '120px',
                          height: '90px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={formImage}
                          alt="Minh họa phiên bản"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setPreviewImageUrl(formImage)}
                          title="Bấm để phóng to ảnh"
                        />
                        <button
                          type="button"
                          onClick={() => setFormImage('')}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(220, 38, 38, 0.9)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Xóa hình ảnh này"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : null}

                    {/* Nút Upload / Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFile(file);
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Upload size={14} />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? 'Đang Tải Ảnh...' : formImage ? 'Thay Đổi Ảnh' : 'Chọn Ảnh Từ Máy / Dán Ctrl+V'}
                      </Button>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Dán trực tiếp ảnh chụp màn hình bằng <b>Ctrl + V</b> tại đây
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nút hành động Lưu / Hủy */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <Button variant="secondary" type="button" onClick={handleCancelForm} disabled={isSubmitting}>
                    Hủy Bỏ
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    leftIcon={<CheckCircle2 size={16} />}
                  >
                    {isSubmitting ? 'Đang Lưu...' : formMode === 'create' ? 'Tạo Phần Mềm' : 'Lưu Thay Đổi'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Bảng Danh Sách Phần Mềm (Đã bỏ cột NỘI DUNG CẬP NHẬT & NGƯỜI UPDATE) */}
          <div
            style={{
              overflowX: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #E2E8F0)',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                    borderBottom: '2px solid var(--border-color, #E2E8F0)',
                    color: 'var(--text-secondary, #475569)',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '220px' }}>PHẦN MỀM</th>
                  <th style={{ padding: '12px 14px', width: '130px' }}>VERSION</th>
                  <th style={{ padding: '12px 14px', width: '210px' }}>NGÀY UPDATE</th>
                  <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>HÌNH ẢNH</th>
                  {canEdit && <th style={{ padding: '12px 14px', width: '110px', textAlign: 'center' }}>THAO TÁC</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '8px' }} />
                      <div>Đang tải thông tin phiên bản phần mềm...</div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* 1. Nhóm 5 phần mềm cốt lõi */}
                    {CORE_SOFTWARES.map((target) => {
                      const item = versions.find(
                        (v) =>
                          v.phan_mem.trim().toLowerCase() === target.key.toLowerCase() ||
                          (target.altKey && v.phan_mem.trim().toLowerCase() === target.altKey.toLowerCase())
                      ) || null;

                      const isSelected = formMode === 'edit' && formSoftwareName === target.label;

                      return (
                        <tr
                          key={target.key}
                          style={{
                            borderBottom: '1px solid var(--border-color, #F1F5F9)',
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Tên phần mềm */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    backgroundColor: target.bgColor,
                                    color: target.badgeColor,
                                    border: `1px solid ${target.borderColor}`,
                                  }}
                                >
                                  {target.label}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{target.subTitle}</span>
                            </div>
                          </td>

                          {/* Phiên bản (Version) */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            {item?.phien_ban ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  fontFamily: 'monospace',
                                  backgroundColor: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  color: '#B45309',
                                }}
                              >
                                {item.phien_ban}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
                                Chưa cấu hình
                              </span>
                            )}
                          </td>

                          {/* Ngày Update */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {item?.ngay_update ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                  <span>{formatDateDisplay(item.ngay_update)}</span>
                                </div>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRowCopyDate(target.label, item.ngay_update, item?.id)}
                                    style={{
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      border: '1px solid #BAE6FD',
                                      backgroundColor: '#F0F9FF',
                                      color: '#0284C7',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#E0F2FE';
                                      e.currentTarget.style.borderColor = '#7DD3FC';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#F0F9FF';
                                      e.currentTarget.style.borderColor = '#BAE6FD';
                                    }}
                                    title={`Sao chép ngày ${formatDateDisplay(item.ngay_update)} từ ${target.label} cho các app còn lại`}
                                  >
                                    <Copy size={11} />
                                    <span>Sao chép</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Hình ảnh */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                            {item?.hinh_anh ? (
                              <div
                                onClick={() => setPreviewImageUrl(item.hinh_anh!)}
                                style={{
                                  position: 'relative',
                                  display: 'inline-block',
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid #CBD5E1',
                                  cursor: 'pointer',
                                  backgroundColor: '#F8FAFC',
                                }}
                                title="Bấm để xem ảnh phóng to"
                              >
                                <img
                                  src={item.hinh_anh}
                                  alt={`Ảnh ${target.label}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    color: '#FFFFFF',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                                >
                                  <Maximize2 size={15} />
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          {/* Thao tác (Chỉ Admin / Super Admin) */}
                          {canEdit && (
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<Edit3 size={13} />}
                                onClick={() => handleStartEdit(target.label, item)}
                                title={`Chỉnh sửa phiên bản ${target.label}`}
                              >
                                Sửa
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* 2. Nhóm các phần mềm bổ sung tùy chỉnh nếu có */}
                    {customVersions.map((cust) => {
                      const isSelected = formMode === 'edit' && editingItem?.id === cust.id;

                      return (
                        <tr
                          key={`custom_${cust.id}`}
                          style={{
                            borderBottom: '1px solid var(--border-color, #F1F5F9)',
                            backgroundColor: isSelected ? '#EFF6FF' : '#FAFAFA',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Tên phần mềm */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    backgroundColor: '#F1F5F9',
                                    color: '#334155',
                                    border: '1px solid #CBD5E1',
                                  }}
                                >
                                  {cust.phan_mem}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Phần mềm bổ sung</span>
                            </div>
                          </td>

                          {/* Phiên bản (Version) */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                color: '#B45309',
                              }}
                            >
                              {cust.phien_ban}
                            </span>
                          </td>

                          {/* Ngày Update */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {cust.ngay_update ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                  <span>{formatDateDisplay(cust.ngay_update)}</span>
                                </div>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRowCopyDate(cust.phan_mem, cust.ngay_update, cust.id)}
                                    style={{
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      border: '1px solid #BAE6FD',
                                      backgroundColor: '#F0F9FF',
                                      color: '#0284C7',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#E0F2FE';
                                      e.currentTarget.style.borderColor = '#7DD3FC';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#F0F9FF';
                                      e.currentTarget.style.borderColor = '#BAE6FD';
                                    }}
                                    title={`Sao chép ngày ${formatDateDisplay(cust.ngay_update)} từ ${cust.phan_mem} cho các app còn lại`}
                                  >
                                    <Copy size={11} />
                                    <span>Sao chép</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Hình ảnh */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                            {cust.hinh_anh ? (
                              <div
                                onClick={() => setPreviewImageUrl(cust.hinh_anh!)}
                                style={{
                                  position: 'relative',
                                  display: 'inline-block',
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid #CBD5E1',
                                  cursor: 'pointer',
                                  backgroundColor: '#F8FAFC',
                                }}
                                title="Bấm để xem ảnh phóng to"
                              >
                                <img
                                  src={cust.hinh_anh}
                                  alt={`Ảnh ${cust.phan_mem}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    color: '#FFFFFF',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                                >
                                  <Maximize2 size={15} />
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          {/* Thao tác (Sửa & Xóa) */}
                          {canEdit && (
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Edit3 size={13} />}
                                  onClick={() => handleStartEdit(cust.phan_mem, cust)}
                                  title={`Chỉnh sửa phiên bản ${cust.phan_mem}`}
                                >
                                  Sửa
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustom(cust)}
                                  style={{
                                    backgroundColor: '#FEE2E2',
                                    border: '1px solid #FCA5A5',
                                    color: '#DC2626',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={`Xóa phần mềm ${cust.phan_mem}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Modal Phóng To Hình Ảnh (Lightbox) */}
      {previewImageUrl && (
        <Modal
          isOpen={!!previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
          maxWidth="900px"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={18} style={{ color: '#2563EB' }} />
              <span>Xem Hình Ảnh Phiên Bản Chi Tiết</span>
            </div>
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setPreviewImageUrl(null)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0F172A',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '75vh',
              overflow: 'auto',
            }}
          >
            <img
              src={previewImageUrl}
              alt="Hình ảnh chi tiết"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </Modal>
      )}

      {/* Modal Xác Nhận Sao Chép Ngày Cho Các App Còn Lại */}
      {syncModal && (
        <Modal
          isOpen={syncModal.isOpen}
          onClose={() => {
            if (!isSyncingDates) setSyncModal(null);
          }}
          maxWidth="560px"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#E0F2FE',
                  border: '1.5px solid #0284C7',
                  color: '#0284C7',
                }}
              >
                <Copy size={16} />
              </span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Sao Chép Ngày Cho Các Phần Mềm Còn Lại
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Áp dụng đồng bộ ngày cập nhật mà không phải nhập từng phần mềm
                </div>
              </div>
            </div>
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button
                variant="secondary"
                onClick={() => setSyncModal(null)}
                disabled={isSyncingDates}
              >
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteSyncDate}
                disabled={isSyncingDates || !syncModal.sourceDate || syncModal.selectedAppNames.length === 0}
                leftIcon={<CheckCircle2 size={16} />}
              >
                {isSyncingDates
                  ? 'Đang Sao Chép...'
                  : `⚡ Xác Nhận Sao Chép (${syncModal.selectedAppNames.length} app)`}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0369A1' }}>
                <Calendar size={15} style={{ color: '#0284C7' }} />
                <span>
                  {syncModal.sourceSoftwareName
                    ? `Sao chép ngày từ: ${syncModal.sourceSoftwareName}`
                    : 'Đồng bộ ngày cập nhật chung'}
                </span>
              </div>
              <div style={{ color: '#0C4A6E', fontSize: '12.5px', lineHeight: '1.5' }}>
                Hệ thống sẽ cập nhật ngày này cho <b>các phần mềm được chọn bên dưới</b> (đang chọn {syncModal.selectedAppNames.length}/{allAvailableApps.length} phần mềm). Các phần mềm không được chọn sẽ giữ nguyên ngày cập nhật hiện tại.
              </div>
            </div>

            {/* Ô chọn / điều chỉnh ngày update */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ color: '#0284C7' }} />
                <span>Ngày Update Sẽ Áp Dụng:</span>
                <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={syncModal.sourceDate}
                onChange={(e) => setSyncModal({ ...syncModal, sourceDate: e.target.value })}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #0284C7',
                  fontSize: '14px',
                  fontWeight: 700,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
                required
              />
            </div>

            {/* Danh sách các phần mềm có thể chọn / bỏ chọn */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Chọn các phần mềm sẽ áp dụng ngày {formatDateDisplay(syncModal.sourceDate)}:
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: syncModal.selectedAppNames.length > 0 ? '#DCFCE7' : '#FEE2E2',
                      color: syncModal.selectedAppNames.length > 0 ? '#166534' : '#991B1B',
                      border: syncModal.selectedAppNames.length > 0 ? '1px solid #86EFAC' : '1px solid #FCA5A5',
                    }}
                  >
                    {syncModal.selectedAppNames.length}/{allAvailableApps.length} phần mềm
                  </span>
                </div>

                {/* Nút thao tác nhanh Chọn tất cả / Bỏ chọn */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setSyncModal({
                        ...syncModal,
                        selectedAppNames: allAvailableApps.map((a) => a.name),
                      })
                    }
                    style={{
                      fontSize: '11.5px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #BAE6FD',
                      backgroundColor: '#F0F9FF',
                      color: '#0284C7',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Chọn tất cả các phần mềm"
                  >
                    ✓ Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSyncModal({
                        ...syncModal,
                        selectedAppNames: [],
                      })
                    }
                    style={{
                      fontSize: '11.5px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      color: '#64748B',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Bỏ chọn tất cả phần mềm"
                  >
                    ✕ Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              {/* Grid danh sách các checkbox chọn phần mềm */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '8px',
                  maxHeight: '230px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {allAvailableApps.map((app) => {
                  const isChecked = syncModal.selectedAppNames.includes(app.name);
                  return (
                    <div
                      key={app.key}
                      onClick={() => {
                        const next = isChecked
                          ? syncModal.selectedAppNames.filter((n) => n !== app.name)
                          : [...syncModal.selectedAppNames, app.name];
                        setSyncModal({ ...syncModal, selectedAppNames: next });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isChecked ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                        backgroundColor: isChecked ? '#F0F9FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                        boxShadow: isChecked ? '0 1px 3px rgba(2, 132, 199, 0.15)' : 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Đã xử lý tại onClick của thẻ cha
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#0284C7',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: app.bgColor,
                            color: app.badgeColor,
                            border: `1px solid ${app.borderColor}`,
                            width: 'fit-content',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {app.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            color: isChecked ? '#0369A1' : '#64748B',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {app.currentDate ? `Hiện tại: ${formatDateDisplay(app.currentDate)}` : 'Chưa có ngày'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {syncModal.selectedAppNames.length === 0 && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#DC2626',
                    fontWeight: 600,
                    padding: '6px 10px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '6px',
                    border: '1px solid #FECACA',
                  }}
                >
                  ⚠️ Vui lòng chọn ít nhất 1 phần mềm để tiến hành sao chép ngày.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
