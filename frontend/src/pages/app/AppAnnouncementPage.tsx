import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  Pin,
  Tag,
  Calendar,
  User,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  Filter,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { AppNotificationItem } from '../../types/appNotification';
import { appNotificationService } from '../../services/appNotificationService';
import { AppNotificationModal } from '../../components/notifications/AppNotificationModal';
import { AppNotificationDetailModal } from '../../components/notifications/AppNotificationDetailModal';
import {
  checkIsDungOrSuperAdmin,
  checkIsAppRole,
} from '../../utils/authUtils';
import { useModalStack } from '../../utils/modalStack';

export const AppAnnouncementPage: React.FC = () => {
  const { user } = useAuth();

  // Xác định quyền hạn:
  const isDungOrSuperAdmin = checkIsDungOrSuperAdmin(user);
  const isAppRole = checkIsAppRole(user);

  // Chỉ quyền app, dung.nguyenanh và super admin mới thấy màn hình này
  const hasAccess = isAppRole || isDungOrSuperAdmin;
  // Chỉ dung.nguyenanh hoặc super admin mới được thêm/sửa/xóa thông báo
  const canManage = isDungOrSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppNotificationItem | null>(null);

  const [detailItem, setDetailItem] = useState<AppNotificationItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const lightboxZIndex = useModalStack(Boolean(lightboxImg), () => setLightboxImg(null));

  const loadData = async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const data = await appNotificationService.getNotifications({
        search: searchTerm,
        category: selectedCategory,
        priority: selectedPriority,
        pinned_only: pinnedOnly,
      });
      setNotifications(data.items);
      setCategories(data.categories);
    } catch (err) {
      console.error('Lỗi tải danh sách thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedPriority, pinnedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AppNotificationItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (item: AppNotificationItem) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo lưu ý này?')) return;
    try {
      await appNotificationService.deleteNotification(id);
      loadData();
      if (detailItem?.id === id) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Không thể xóa thông báo.');
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      await appNotificationService.togglePin(id);
      loadData();
      if (detailItem?.id === id) {
        setDetailItem((prev) => (prev ? { ...prev, is_pinned: !prev.is_pinned } : null));
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Không thể thay đổi trạng thái ghim.');
    }
  };

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return `${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dStr;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Khẩn cấp':
        return {
          bg: '#FEF2F2',
          text: '#B91C1C',
          border: '#FCA5A5',
          label: '🔴 Khẩn cấp',
        };
      case 'Quan trọng':
        return {
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FCD34D',
          label: '🟡 Quan trọng',
        };
      default:
        return {
          bg: '#F3F4F6',
          text: '#4B5563',
          border: '#E5E7EB',
          label: '⚪ Bình thường',
        };
    }
  };

  // Nếu người dùng không có quyền truy cập
  if (!hasAccess) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            padding: '30px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            color: '#991B1B',
          }}
        >
          <ShieldAlert size={48} style={{ color: '#DC2626', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Không Có Quyền Truy Cập</h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#7F1D1D' }}>
            Màn hình Bảng Thông Báo & Lưu Ý chỉ dành riêng cho các tài khoản thuộc nhóm <strong>Quyền App</strong>,
            người dùng <strong>dung.nguyenanh</strong> và <strong>Quản trị viên</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header Page */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary-hover)',
              }}
            >
              <Bell size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Bảng Thông Báo & Lưu Ý Nghiệp Vụ
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Tổng hợp các quy định, hướng dẫn cấu hình và lưu ý vận hành quan trọng dành cho Team App
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm Mới</span>
          </Button>

          {/* Nút thêm mới chỉ hiển thị cho dung.nguyenanh hoặc Super Admin */}
          {canManage && (
            <Button
              onClick={handleOpenAdd}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#111827',
                fontWeight: 600,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(245, 184, 0, 0.35)',
              }}
            >
              <Plus size={16} />
              <span>+ Thêm Thông Báo / Lưu Ý</span>
            </Button>
          )}
        </div>
      </div>



      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Form tìm kiếm */}
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 280px', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung, người tạo..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <Button type="submit" variant="secondary" style={{ whiteSpace: 'nowrap' }}>
            Tìm
          </Button>
        </form>

        {/* Lọc danh mục */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tag size={15} style={{ color: '#6B7280' }} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13.5px',
              backgroundColor: '#fff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc mức độ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={15} style={{ color: '#6B7280' }} />
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13.5px',
              backgroundColor: '#fff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Tất cả mức độ</option>
            <option value="Khẩn cấp">🔴 Khẩn cấp</option>
            <option value="Quan trọng">🟡 Quan trọng</option>
            <option value="Bình thường">⚪ Bình thường</option>
          </select>
        </div>

        {/* Nút bật/tắt chỉ xem đã ghim */}
        <button
          type="button"
          onClick={() => setPinnedOnly((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: pinnedOnly ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
            color: pinnedOnly ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            border: pinnedOnly ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
            transition: 'all 0.15s ease',
          }}
        >
          <Pin size={14} style={{ color: pinnedOnly ? 'var(--color-primary-text)' : 'var(--text-muted)', transform: 'rotate(45deg)' }} />
          <span>Chỉ xem đã ghim</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <div>Đang tải bảng thông báo & lưu ý...</div>
        </div>
      )}

      {/* Danh sách thông báo dạng Card Grid */}
      {!loading && notifications.length === 0 && (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
          }}
        >
          <Bell size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Không tìm thấy thông báo hoặc lưu ý nào
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
            {searchTerm || selectedCategory !== 'all' || selectedPriority !== 'all' || pinnedOnly
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để xem các lưu ý khác.'
              : 'Hiện chưa có thông báo lưu ý nào được ghi nhận trên hệ thống.'}
          </p>
          {canManage && (
            <Button
              onClick={handleOpenAdd}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#111827',
                fontWeight: 600,
                border: 'none',
              }}
            >
              + Tạo Thông Báo Đầu Tiên
            </Button>
          )}
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '16px',
          }}
        >
          {notifications.map((item) => {
            const pStyle = getPriorityBadge(item.muc_do);
            const images = Array.isArray(item.images) ? item.images : [];

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: item.is_pinned ? '2px solid var(--color-primary)' : '1px solid #E5E7EB',
                  boxShadow: item.is_pinned
                    ? '0 4px 14px rgba(245, 184, 0, 0.15)'
                    : '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Dải vàng trên đầu nếu ghim */}
                {item.is_pinned && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#111827',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Pin size={11} style={{ transform: 'rotate(45deg)' }} />
                    <span>LƯU Ý ĐÃ GHIM TRỌNG TÂM</span>
                  </div>
                )}

                <div style={{ padding: '16px 16px 12px 16px', flex: 1 }}>
                  {/* Category & Priority Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#F3F4F6',
                        color: '#4B5563',
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      <Tag size={11} />
                      <span>{item.danh_muc}</span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: pStyle.bg,
                        border: `1px solid ${pStyle.border}`,
                        color: pStyle.text,
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      {pStyle.label}
                    </span>
                  </div>

                  {/* Tiêu đề */}
                  <h3
                    onClick={() => handleOpenDetail(item)}
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: '0 0 8px 0',
                      lineHeight: 1.4,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  >
                    {item.tieu_de}
                  </h3>

                  {/* Tóm tắt nội dung */}
                  <p
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.55,
                      color: 'var(--text-secondary)',
                      margin: '0 0 12px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {item.noi_dung}
                  </p>

                  {/* Thumbnail ảnh preview (nếu có) */}
                  {images.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          overflowX: 'auto',
                          paddingBottom: '4px',
                        }}
                      >
                        {images.slice(0, 4).map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setLightboxImg(imgUrl)}
                            style={{
                              position: 'relative',
                              width: '65px',
                              height: '50px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #E5E7EB',
                              flexShrink: 0,
                              cursor: 'pointer',
                            }}
                            title="Bấm để xem ảnh phóng to"
                          >
                            <img
                              src={imgUrl}
                              alt="Thumbnail"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {imgIdx === 3 && images.length > 4 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                +{images.length - 4}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta: Người tạo, Thời gian */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#9CA3AF',
                      borderTop: '1px solid #F3F4F6',
                      paddingTop: '8px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6B7280' }}>
                      <User size={13} />
                      <span>{item.nguoi_tao || 'Admin'}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      <span>{formatDate(item.ngay_tao)}</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    padding: '8px 16px',
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(item)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--color-primary-hover)',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Eye size={14} />
                    <span>Xem chi tiết</span>
                  </button>

                  {/* Công cụ quản trị chỉ dành cho dung.nguyenanh hoặc Super Admin */}
                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item.id)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: item.is_pinned ? '#B45309' : '#9CA3AF',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title={item.is_pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                      >
                        <Pin size={15} style={{ transform: 'rotate(45deg)' }} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#4B5563',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Xóa thông báo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Sửa Thông Báo */}
      <AppNotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        editItem={editingItem}
      />

      {/* Modal Chi Tiết Thông Báo */}
      <AppNotificationDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={detailItem}
        canManage={canManage}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
      />

      {/* Lightbox Phóng To Ảnh */}
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
            alt="Phóng to"
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
    </div>
  );
};
