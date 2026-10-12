import React, { useState } from 'react';
import {
  Bell,
  Pin,
  Calendar,
  User,
  Tag,
  Edit2,
  Trash2,
  X,
  Maximize2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AppNotificationItem } from '../../types/appNotification';
import { useModalStack } from '../../utils/modalStack';

interface AppNotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AppNotificationItem | null;
  canManage: boolean;
  onEdit: (item: AppNotificationItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number) => void;
}

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'Khẩn cấp':
      return { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' };
    case 'Quan trọng':
      return { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' };
    default:
      return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
  }
};

export const AppNotificationDetailModal: React.FC<AppNotificationDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  canManage,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const lightboxZIndex = useModalStack(Boolean(lightboxImg), () => setLightboxImg(null));

  if (!item) return null;

  const priorityStyle = getPriorityStyle(item.muc_do);
  const images = Array.isArray(item.images) ? item.images : [];

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return dStr;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} style={{ color: 'var(--color-primary)' }} />
            <span>Chi Tiết Thông Báo / Lưu Ý Nghiệp Vụ</span>
          </div>
        }
        maxWidth="800px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: item.is_pinned ? 'var(--color-primary-subtle)' : '#F9FAFB',
              border: item.is_pinned ? '1.5px solid var(--color-primary)' : '1px solid #E5E7EB',
            }}
          >
            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {item.is_pinned && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    color: '#92400E',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <Pin size={12} style={{ transform: 'rotate(45deg)' }} /> Đã Ghim
                </span>
              )}

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: priorityStyle.bg,
                  border: `1px solid ${priorityStyle.border}`,
                  color: priorityStyle.color,
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                ● {item.muc_do}
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <Tag size={12} /> {item.danh_muc}
              </span>
            </div>

            {/* Tiêu đề */}
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              {item.tieu_de}
            </h2>

            {/* Meta info: Author, Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#6B7280', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={14} style={{ color: '#9CA3AF' }} />
                <span>Người tạo: <strong style={{ color: '#374151' }}>{item.nguoi_tao || 'Admin'}</strong></span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} style={{ color: '#9CA3AF' }} />
                <span>Đăng lúc: {formatDate(item.ngay_tao)}</span>
              </span>
              {item.nguoi_update && item.nguoi_update !== item.nguoi_tao && (
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                  (Cập nhật bởi: {item.nguoi_update})
                </span>
              )}
            </div>
          </div>

          {/* Content Body */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              fontSize: '14px',
              lineHeight: 1.65,
              color: '#1F2937',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {item.noi_dung}
          </div>

          {/* Attached Images Gallery */}
          {images.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Hình Ảnh Minh Họa & Hướng Dẫn ({images.length} ảnh):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '10px',
                }}
              >
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxImg(imgUrl)}
                    style={{
                      position: 'relative',
                      height: '110px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #D1D5DB',
                      cursor: 'pointer',
                      backgroundColor: '#F3F4F6',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title="Bấm để xem ảnh phóng to"
                  >
                    <img
                      src={imgUrl}
                      alt={`Minh họa ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Maximize2 size={10} />
                      <span>Xem</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onTogglePin(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <Pin size={14} style={{ color: item.is_pinned ? 'var(--color-primary-hover)' : '#6B7280' }} />
                    <span>{item.is_pinned ? 'Bỏ Ghim' : 'Ghim Lên Đầu'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onClose();
                      onEdit(item);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Sửa</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa thông báo lưu ý này?')) {
                        onDelete(item.id);
                        onClose();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: '#DC2626',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Xóa</span>
                  </Button>
                </>
              )}
            </div>

            <Button type="button" variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox phóng to ảnh */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: lightboxZIndex,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <button
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImg}
            alt="Enlarged view"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
