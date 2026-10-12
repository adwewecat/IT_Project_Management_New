import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Upload,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  UserCheck,
  Users,
  Lock,
  Globe,
  Image as ImageIcon,
  ClipboardPaste,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RestaurantItem } from '../../types/restaurant';
import { incidentService } from '../../services/incidentService';
import { useAuth } from '../../contexts/AuthContext';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant?: RestaurantItem | null;
  onSuccess?: () => void;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [requesterName, setRequesterName] = useState('');
  const [noidung, setNoidung] = useState('');
  const [assignType, setAssignType] = useState<'LEADER' | 'INDIVIDUAL'>('LEADER');
  // Khi Leader phân công -> Công khai (false); Khi Cá nhân tự gán -> Mặc định Riêng tư (true)
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [dateLoi, setDateLoi] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setRequesterName('');
      setNoidung('');
      setAssignType('LEADER');
      setIsPrivate(false);
      setDateLoi(new Date().toISOString().split('T')[0]);
      setPastedImages([]);
      setSelectedFiles([]);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleAssignTypeChange = (newType: 'LEADER' | 'INDIVIDUAL') => {
    setAssignType(newType);
    if (newType === 'LEADER') {
      setIsPrivate(false);
    } else {
      setIsPrivate(true);
    }
  };

  // Format tên nhà hàng chuẩn: Mã Sap + Tên NH + Mã RK7 + (IP)
  const formatRestaurantName = (): string => {
    if (!restaurant) return '';
    const parts: string[] = [];
    if (restaurant.sap) parts.push(String(restaurant.sap).trim());
    if (restaurant.res) parts.push(String(restaurant.res).trim());
    if (restaurant.rk7) parts.push(String(restaurant.rk7).trim());
    let res = parts.join(' ');
    if (restaurant.ip && String(restaurant.ip).trim()) {
      const ipClean = String(restaurant.ip).trim();
      res += ipClean.startsWith('(') ? ` ${ipClean}` : ` (${ipClean})`;
    }
    return res.trim();
  };

  const fullRestaurantName = formatRestaurantName();

  // Xử lý dán hình ảnh từ Clipboard (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation();
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImgs: File[] = [];
    const seenSizes = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file && !seenSizes.has(file.size)) {
          seenSizes.add(file.size);
          const ext = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `paste_${Date.now()}_${newImgs.length}.${ext}`, { type: file.type });
          newImgs.push(newFile);
        }
      }
    }
    if (newImgs.length > 0) {
      setPastedImages((prev) => [...prev, ...newImgs]);
      e.preventDefault();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemovePastedImage = (index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurant && !requesterName.trim()) {
      setErrorMsg('Vui lòng nhập người hoặc bộ phận yêu cầu!');
      return;
    }

    if (!noidung.trim()) {
      setErrorMsg('Vui lòng nhập nội dung chi tiết sự vụ cần ghi nhận!');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      let imagePaths: string[] = [];
      let otherFilePaths: string[] = [];

      const allUploadFiles = [...pastedImages, ...selectedFiles];

      if (allUploadFiles.length > 0) {
        const uploadedUrls = await incidentService.uploadFiles(allUploadFiles);
        uploadedUrls.forEach((url) => {
          const lower = url.toLowerCase();
          if (
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.gif') ||
            lower.endsWith('.webp')
          ) {
            imagePaths.push(url);
          } else {
            otherFilePaths.push(url);
          }
        });
      }

      const finalRestaurantName = restaurant
        ? fullRestaurantName
        : `[Xử lý ngoài] ${requesterName.trim()}`;

      await incidentService.createIncident({
        restaurant_id: restaurant ? restaurant.id : null,
        restaurant_name: finalRestaurantName,
        sap_code: restaurant?.sap ? String(restaurant.sap) : undefined,
        rk7_code: restaurant?.rk7 ? String(restaurant.rk7) : undefined,
        ip_address: restaurant?.ip ? String(restaurant.ip) : undefined,
        noidung: noidung.trim(),
        assign_type: assignType,
        is_private: isPrivate,
        date_loi: dateLoi ? `${dateLoi}T00:00:00` : undefined,
        images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : undefined,
        files: otherFilePaths.length > 0 ? JSON.stringify(otherFilePaths) : undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      const rawDetail = err.response?.data?.detail;
      if (status === 403) {
        setErrorMsg(
          typeof rawDetail === 'string' && rawDetail.trim()
            ? rawDetail
            : 'Bạn không có quyền thực hiện chức năng này (Yêu cầu quyền IT Application hoặc Quản trị viên).'
        );
      } else if (status === 401) {
        setErrorMsg('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (typeof rawDetail === 'string' && rawDetail.trim()) {
        setErrorMsg(rawDetail);
      } else {
        setErrorMsg(err.message || 'Có lỗi xảy ra khi ghi nhận sự vụ. Vui lòng thử lại!');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={restaurant ? 'Ghi Nhận Sự Vụ Nhà Hàng' : 'Thêm Mới Sự Vụ / Xử Lý Việc Ngoài'}
      maxWidth="720px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Hủy Bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={uploading}
            leftIcon={<CheckCircle2 size={16} />}
          >
            {uploading ? 'Đang Lưu...' : 'Lưu Ghi Nhận'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #F87171',
              borderRadius: 'var(--radius-md)',
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

        {/* Thông tin nhà hàng HOẶC Người yêu cầu */}
        {restaurant ? (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              Nhà Hàng Ghi Nhận
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {fullRestaurantName}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Người / Bộ Phận Yêu Cầu <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Nhập tên người yêu cầu hoặc bộ phận xử lý ngoài (Ví dụ: BGĐ, Kế toán, Anh Tuấn...)"
              style={{
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
              required
            />
          </div>
        )}

        {/* Chọn ngày phát sinh lỗi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} />
            <span>Thời Gian Phát Sinh Lỗi</span>
          </label>
          <input
            type="date"
            value={dateLoi}
            onChange={(e) => setDateLoi(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              maxWidth: '220px',
            }}
          />
        </div>

        {/* Phương thức phân công xử lý (2 Radio buttons) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Hình Thức Phân Công Xử Lý:
          </label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: assignType === 'LEADER' ? 600 : 400,
                color: assignType === 'LEADER' ? 'var(--color-primary)' : 'var(--text-primary)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: assignType === 'LEADER' ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                border: assignType === 'LEADER' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="assignType"
                value="LEADER"
                checked={assignType === 'LEADER'}
                onChange={() => handleAssignTypeChange('LEADER')}
                style={{ cursor: 'pointer' }}
              />
              <Users size={16} />
              <span>1. Leader Phân Công Xử Lý</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: assignType === 'INDIVIDUAL' ? 600 : 400,
                color: assignType === 'INDIVIDUAL' ? 'var(--color-primary)' : 'var(--text-primary)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: assignType === 'INDIVIDUAL' ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                border: assignType === 'INDIVIDUAL' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="assignType"
                value="INDIVIDUAL"
                checked={assignType === 'INDIVIDUAL'}
                onChange={() => handleAssignTypeChange('INDIVIDUAL')}
                style={{ cursor: 'pointer' }}
              />
              <UserCheck size={16} />
              <span>2. Cá Nhân Xử Lý (Tự Gán Cho Tôi)</span>
            </label>
          </div>
          {assignType === 'INDIVIDUAL' && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '4px' }}>
              * Sự vụ sẽ được tự động gán cho tài khoản của bạn: <strong>{user?.full_name || user?.username}</strong>
            </span>
          )}
        </div>

        {/* Chế độ quyền riêng tư (Tự động liên kết với hình thức phân công) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Chế Độ Quyền Riêng Tư:
          </label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: assignType === 'LEADER' ? 'not-allowed' : 'pointer',
                opacity: assignType === 'LEADER' ? 0.45 : 1,
                fontSize: '13px',
                fontWeight: isPrivate ? 600 : 400,
                color: isPrivate ? '#B45309' : 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isPrivate ? '#FEF3C7' : 'var(--bg-secondary)',
                border: isPrivate ? '1px solid #F59E0B' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
              title={assignType === 'LEADER' ? 'Khi giao Leader phân công, sự vụ tự động ở chế độ Công khai để Leader tiếp nhận' : ''}
            >
              <input
                type="radio"
                name="isPrivate"
                checked={isPrivate === true}
                disabled={assignType === 'LEADER'}
                onChange={() => setIsPrivate(true)}
                style={{ cursor: assignType === 'LEADER' ? 'not-allowed' : 'pointer' }}
              />
              <Lock size={15} color="#D97706" />
              <span>Riêng tư</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: !isPrivate ? 600 : 400,
                color: !isPrivate ? 'var(--color-primary)' : 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: !isPrivate ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                border: !isPrivate ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="isPrivate"
                checked={isPrivate === false}
                onChange={() => setIsPrivate(false)}
                style={{ cursor: 'pointer' }}
              />
              <Globe size={15} />
              <span>Công khai</span>
            </label>
          </div>
          {assignType === 'LEADER' && (
            <span style={{ fontSize: '11px', color: '#059669', fontStyle: 'italic', marginLeft: '2px' }}>
              * Khi giao Leader phân công, sự vụ tự động ở chế độ <strong>Công khai</strong> để Leader thấy và điều phối.
            </span>
          )}
        </div>

        {/* Nội dung sự vụ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Nội Dung Chi Tiết Sự Vụ <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            rows={4}
            value={noidung}
            onChange={(e) => setNoidung(e.target.value)}
            placeholder="Mô tả cụ thể hiện tượng lỗi, thiết bị bị ảnh hưởng, thời điểm xảy ra, hướng xử lý ban đầu... (Có thể dán Ctrl+V ảnh trực tiếp khi đang gõ)"
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
            required
          />
        </div>

        {/* 1. Ô Dán hình ảnh trực tiếp (Ctrl + V) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardPaste size={15} color="var(--color-primary)" />
            <span>Dán Hình Ảnh Trực Tiếp (Ctrl + V):</span>
          </label>
          <div
            tabIndex={0}
            style={{
              border: '2px dashed var(--color-primary)',
              backgroundColor: 'var(--color-primary-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              textAlign: 'center',
              cursor: 'text',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-primary-hover)', fontSize: '13px', fontWeight: 600 }}>
              <ImageIcon size={18} />
              <span>Chụp ảnh màn hình và bấm Ctrl + V vào đây để dán ảnh</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '4px' }}>
              Hỗ trợ chụp nhanh từ Snipping Tool, PrintScreen, Zalo, Web...
            </div>
          </div>

          {/* Danh sách ảnh dán */}
          {pastedImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
              {pastedImages.map((file, idx) => {
                const objectUrl = URL.createObjectURL(file);
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-primary)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      width: '100px',
                      height: '80px',
                    }}
                  >
                    <img
                      src={objectUrl}
                      alt={`Pasted ${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePastedImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#FFFFFF',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Xóa ảnh"
                    >
                      <X size={12} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 4px',
                        textAlign: 'center',
                      }}
                    >
                      Ảnh {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Đính kèm tài liệu / tệp tin khác */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={15} />
            <span>Đính Kèm Tệp Tin / Tài Liệu Khác (PDF, Excel, Word...):</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <Upload size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Nhấn để chọn file tài liệu hoặc hình ảnh từ máy tính
            </span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </label>

          {/* Danh sách tệp đã chọn */}
          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
              {selectedFiles.map((file, idx) => {
                const isImg = file.type.startsWith('image/');
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    {isImg ? <FileText size={14} color="#10B981" /> : <FileText size={14} color="var(--color-primary)" />}
                    <span
                      style={{
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
