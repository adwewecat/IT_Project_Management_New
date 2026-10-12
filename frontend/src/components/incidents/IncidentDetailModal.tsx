import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Send,
  UserCheck,
  Lock,
  Globe,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IncidentItem, IncidentAssignee } from '../../types/incident';
import { incidentService } from '../../services/incidentService';
import { useAuth } from '../../contexts/AuthContext';
import { SearchableStaffSelect } from '../common/SearchableStaffSelect';
import { useModalStack } from '../../utils/modalStack';

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentItem | null;
  onUpdated?: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  isOpen,
  onClose,
  incident,
  onUpdated,
}) => {
  const { user } = useAuth();

  // Role check
  const rawRoles = user?.roles || (user?.phanquyen ? user.phanquyen.split(',').map((s) => s.trim().toLowerCase()) : []);
  const isSuperAdmin = !!user?.is_super_admin || user?.username?.toLowerCase() === 'admin' || user?.phanquyen === '0';
  const isAdmin = isSuperAdmin || rawRoles.includes('admin') || rawRoles.includes('1') || user?.phanquyen === '1' || user?.username?.toLowerCase() === 'dung.nguyenanh';

  const [assignees, setAssignees] = useState<IncidentAssignee[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [newProgressNote, setNewProgressNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imageZIndex = useModalStack(Boolean(selectedImage), () => setSelectedImage(null));

  useEffect(() => {
    if (isOpen && isAdmin) {
      incidentService
        .getAssignees()
        .then((data) => setAssignees(data))
        .catch((err) => console.error('Failed to load assignees', err));
    }
    if (incident) {
      setSelectedAssignee(incident.assigned_to || '');
    }
  }, [isOpen, incident, isAdmin]);

  if (!incident) return null;

  // Phân tích hình ảnh và files
  let imageList: string[] = [];
  let fileList: string[] = [];
  try {
    if (incident.images) {
      imageList = typeof incident.images === 'string' && incident.images.startsWith('[')
        ? JSON.parse(incident.images)
        : [incident.images];
    }
    if (incident.files) {
      fileList = typeof incident.files === 'string' && incident.files.startsWith('[')
        ? JSON.parse(incident.files)
        : [incident.files];
    }
  } catch (e) {
    console.error('Error parsing attachments', e);
  }

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    setLoading(true);
    try {
      const target = assignees.find((a) => a.username === selectedAssignee);
      await incidentService.assignIncident(
        incident.id,
        selectedAssignee,
        target?.full_name || selectedAssignee
      );
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể phân công nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgress = async () => {
    if (!newProgressNote.trim()) return;
    setLoading(true);
    try {
      await incidentService.addProgressNote(incident.id, newProgressNote.trim());
      setNewProgressNote('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể thêm ghi chú tiến độ.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = !incident.trangthai;
    const confirmMsg = nextStatus
      ? 'Bạn có chắc chắn muốn xác nhận sự vụ này ĐÃ HOÀN THÀNH?'
      : 'Bạn có chắc chắn muốn MỞ LẠI sự vụ này?';
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await incidentService.updateStatus(incident.id, nextStatus);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể cập nhật trạng thái.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (val?: string | null) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return val;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Chi Tiết Sự Vụ #${incident.id}`}
        maxWidth="820px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <Button
                variant={incident.trangthai ? 'secondary' : 'primary'}
                onClick={handleToggleStatus}
                disabled={loading}
                leftIcon={incident.trangthai ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                style={{
                  backgroundColor: incident.trangthai ? '#64748B' : '#10B981',
                  borderColor: incident.trangthai ? '#64748B' : '#10B981',
                  color: '#FFFFFF',
                }}
              >
                {incident.trangthai ? 'Mở Lại Sự Vụ' : 'Xác Nhận Hoàn Thành'}
              </Button>
            </div>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Card */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Nhà Hàng Ghi Nhận
                </span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {incident.restaurant_name || 'Không xác định'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {incident.is_private ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    <Lock size={12} /> Riêng tư
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <Globe size={12} /> Công khai
                  </span>
                )}
                <Badge variant={incident.trangthai ? 'success' : 'warning'}>
                  {incident.trangthai ? 'Đã Hoàn Thành' : 'Chưa Hoàn Thành'}
                </Badge>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>Ghi nhận: <strong>{formatDate(incident.date_insert)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                <span>Người note: <strong>{incident.user_insert || '—'}</strong></span>
              </div>
              {incident.date_loi && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} />
                  <span>Ngày lỗi: <strong>{formatDate(incident.date_loi).split(' ')[0]}</strong></span>
                </div>
              )}
              {incident.resolved_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                  <CheckCircle2 size={14} />
                  <span>Xong lúc: <strong>{formatDate(incident.resolved_at)}</strong> ({incident.resolved_by})</span>
                </div>
              )}
            </div>
          </div>

          {/* Phân Công Xử Lý */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} />
              <span>Phân Công Nhân Sự Xử Lý</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                >
                  <UserCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {incident.assigned_name || incident.assigned_to || 'Chưa phân công'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {incident.assign_type === 'INDIVIDUAL' ? 'Cá nhân tự nhận xử lý' : 'Leader phân công'}
                  </div>
                </div>
              </div>

              {/* Admin / Super Admin có quyền gán lại */}
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', minWidth: '280px' }}>
                  <div style={{ flex: 1 }}>
                    <SearchableStaffSelect
                      placeholder="-- Chọn nhân viên gán việc --"
                      staffList={assignees}
                      value={selectedAssignee}
                      onChange={(u) => setSelectedAssignee(u)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAssign}
                    disabled={loading || !selectedAssignee || selectedAssignee === incident.assigned_to}
                    style={{ height: '34px', marginBottom: '1px' }}
                  >
                    Gán Việc
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Nội Dung Sự Vụ */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
              Nội Dung Ghi Nhận
            </div>
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {incident.noidung}
            </div>
          </div>

          {/* Hình Ảnh & File Đính Kèm */}
          {(imageList.length > 0 || fileList.length > 0) && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={15} />
                <span>Hình Ảnh & Tệp Tin Đính Kèm ({imageList.length + fileList.length})</span>
              </div>

              {/* Album hình ảnh */}
              {imageList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: fileList.length > 0 ? '12px' : 0 }}>
                  {imageList.map((imgUrl, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedImage(imgUrl)}
                      style={{
                        position: 'relative',
                        width: '110px',
                        height: '110px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Ảnh sự vụ ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Tệp tin */}
              {fileList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fileList.map((fUrl, idx) => {
                    const filename = fUrl.split('/').pop() || `Tệp đính kèm ${idx + 1}`;
                    return (
                      <a
                        key={idx}
                        href={fUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <FileText size={16} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {filename}
                        </span>
                        <ExternalLink size={14} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lịch Sử Tiến Độ & Ghi Chú Thêm */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={15} />
              <span>Nhật Ký Tiến Độ & Ghi Chú</span>
            </div>

            {/* Khung hiển thị log tiến độ */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: '12px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                marginBottom: '12px',
              }}
            >
              {incident.progress_notes || 'Chưa có ghi chú tiến độ nào.'}
            </div>

            {/* Thêm ghi chú mới */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newProgressNote}
                onChange={(e) => setNewProgressNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddProgress();
                }}
                placeholder="Nhập cập nhật tiến độ (ví dụ: Đã remote kiểm tra, đang chờ đổi phần cứng...)"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
              <Button
                variant="primary"
                onClick={handleAddProgress}
                disabled={loading || !newProgressNote.trim()}
                leftIcon={<Send size={14} />}
              >
                Gửi Note
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox phóng to ảnh */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: imageZIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={selectedImage}
            alt="Phóng to"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </>
  );
};
