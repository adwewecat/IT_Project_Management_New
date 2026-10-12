import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Headphones,
  Layers,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LichTrucItem } from '../../types/hotline';
import { hotlineService } from '../../services/hotlineService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import {
  checkIsAdmin,
  checkIsInventoryRole,
  checkIsHelpdeskRole,
  checkIsAppRole,
} from '../../utils/authUtils';

export const HotlineSchedulePage: React.FC = () => {
  const { user } = useAuth();

  // Role and permission checks
  const isAdmin = checkIsAdmin(user);
  const isInventory = checkIsInventoryRole(user);

  // Specific role visibility:
  // - Helpdesk: chỉ xem được Helpdesk
  // - App: chỉ xem được IT App
  // - Inventory & Admin: xem được CẢ HAI nhóm
  const canViewHelpdesk = isAdmin || isInventory || checkIsHelpdeskRole(user);
  const canViewApp = isAdmin || isInventory || checkIsAppRole(user);

  const defaultTeam: 'HELP' | 'APP' = canViewHelpdesk ? 'HELP' : 'APP';

  const currentMonthNum = new Date().getMonth() + 1;

  // Month data
  const [helpdeskMonths, setHelpdeskMonths] = useState<string[]>([]);
  const [appMonths, setAppMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fullscreen Viewer Modal state
  const [viewer, setViewer] = useState<{
    isOpen: boolean;
    team: 'HELP' | 'APP';
    month: string;
    item: LichTrucItem | null;
    zoom: number;
    rotation: number;
    isLoadingMonth: boolean;
  }>({
    isOpen: false,
    team: defaultTeam,
    month: String(currentMonthNum),
    item: null,
    zoom: 1,
    rotation: 0,
    isLoadingMonth: false,
  });

  // Admin Upload Modal state (hỗ trợ nhiều ảnh)
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    team: 'HELP' | 'APP';
    thang: string;
    previews: string[];
  }>({
    isOpen: false,
    team: defaultTeam,
    thang: String(currentMonthNum),
    previews: [],
  });

  // Multi-image viewer state
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [layoutDirection, setLayoutDirection] = useState<'column' | 'row'>('column');

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    team: 'HELP' | 'APP';
    thang: string;
  }>({
    isOpen: false,
    team: defaultTeam,
    thang: String(currentMonthNum),
  });

  // Load initial available months for both teams
  const loadAvailableData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await hotlineService.getSchedule(String(currentMonthNum));
      if (data.helpdesk_months) {
        setHelpdeskMonths(data.helpdesk_months);
      }
      if (data.app_months) {
        setAppMonths(data.app_months);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải danh sách lịch trực hotline.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentMonthNum]);

  useEffect(() => {
    loadAvailableData();
  }, [loadAvailableData]);

  // Fetch and display specific month & team inside Fullscreen Viewer
  const fetchAndOpenViewer = async (team: 'HELP' | 'APP', month: string) => {
    if (team === 'HELP' && !canViewHelpdesk) {
      setAlert({
        type: 'error',
        message: 'Tài khoản của bạn chỉ có quyền xem lịch trực IT App, không có quyền xem Helpdesk.',
      });
      return;
    }
    if (team === 'APP' && !canViewApp) {
      setAlert({
        type: 'error',
        message: 'Tài khoản của bạn chỉ có quyền xem lịch trực Helpdesk, không có quyền xem IT App.',
      });
      return;
    }

    setActiveImageIndex(0);
    setViewer((prev) => ({
      ...prev,
      isOpen: true,
      team,
      month,
      isLoadingMonth: true,
      zoom: 1,
      rotation: 0,
    }));

    try {
      const data = await hotlineService.getSchedule(month);
      const targetItem = team === 'HELP' ? data.helpdesk : data.app;
      
      const imgs = targetItem?.image_urls && targetItem.image_urls.length > 0
        ? targetItem.image_urls
        : targetItem?.image_url ? [targetItem.image_url] : [];
      
      // Mặc định: nếu có từ 2 ảnh trở lên thì hiển thị chung trên 1 khung hình
      if (imgs.length > 1) {
        setViewMode('all');
      } else {
        setViewMode('single');
      }

      setViewer((prev) => ({
        ...prev,
        item: targetItem || null,
        isLoadingMonth: false,
      }));

      // Update months cache if changed
      if (data.helpdesk_months) setHelpdeskMonths(data.helpdesk_months);
      if (data.app_months) setAppMonths(data.app_months);
    } catch (err: any) {
      setViewer((prev) => ({ ...prev, isLoadingMonth: false }));
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải hình ảnh lịch trực của tháng này.',
      });
    }
  };

  // Switch month inside Fullscreen viewer
  const handleViewerSwitchMonth = (newMonth: string) => {
    fetchAndOpenViewer(viewer.team, newMonth);
  };

  // Switch team inside Fullscreen viewer
  const handleViewerSwitchTeam = (newTeam: 'HELP' | 'APP') => {
    fetchAndOpenViewer(newTeam, viewer.month);
  };

  // Prev / Next month in viewer
  const handlePrevMonth = () => {
    const currentM = parseInt(viewer.month, 10);
    const prevM = currentM > 1 ? currentM - 1 : 12;
    fetchAndOpenViewer(viewer.team, String(prevM));
  };

  const handleNextMonth = () => {
    const currentM = parseInt(viewer.month, 10);
    const nextM = currentM < 12 ? currentM + 1 : 1;
    fetchAndOpenViewer(viewer.team, String(nextM));
  };

  // Close viewer
  const handleCloseViewer = () => {
    setViewer((prev) => ({ ...prev, isOpen: false, zoom: 1, rotation: 0 }));
  };

  // Handle keyboard navigation (ESC to close, Left/Right for month)
  useEffect(() => {
    if (!viewer.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseViewer();
      } else if (e.key === 'ArrowLeft') {
        handlePrevMonth();
      } else if (e.key === 'ArrowRight') {
        handleNextMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewer.isOpen, viewer.month, viewer.team]);

  // Download helper
  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Upload Modal (hỗ trợ truyền danh sách ảnh hiện có nếu đang chỉnh sửa)
  const handleOpenUpload = (team: 'HELP' | 'APP', month: string, initialPreviews?: string[]) => {
    setUploadModal({
      isOpen: true,
      team,
      thang: month,
      previews: initialPreviews && initialPreviews.length > 0 ? [...initialPreviews] : [],
    });
  };

  // Helper đọc và thêm các file ảnh vào danh sách previews (hỗ trợ nhiều ảnh)
  const addFilesToPreviews = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setAlert({ type: 'error', message: 'Vui lòng chọn hoặc dán tệp hình ảnh (PNG, JPG, WEBP).' });
      return;
    }

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadModal((prev) => ({
            ...prev,
            previews: [...prev.previews, event.target!.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // File picker handler (hỗ trợ chọn nhiều file cùng lúc)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFilesToPreviews(Array.from(files));
    e.target.value = '';
  };

  // Paste handler for upload modal (hỗ trợ dán nhiều ảnh hoặc dán liên tiếp)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      addFilesToPreviews(files);
    }
  };

  // Window paste listener khi upload modal đang mở (cho phép Ctrl+V ở bất kỳ đâu trên màn hình modal)
  useEffect(() => {
    if (!uploadModal.isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFilesToPreviews(files);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [uploadModal.isOpen]);

  // Xóa 1 ảnh khỏi danh sách previews
  const handleRemovePreviewImage = (indexToRemove: number) => {
    setUploadModal((prev) => ({
      ...prev,
      previews: prev.previews.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Di chuyển thứ tự ảnh lên/xuống
  const handleMovePreviewImage = (fromIdx: number, toIdx: number) => {
    setUploadModal((prev) => {
      if (toIdx < 0 || toIdx >= prev.previews.length) return prev;
      const copy = [...prev.previews];
      const item = copy.splice(fromIdx, 1)[0];
      copy.splice(toIdx, 0, item);
      return { ...prev, previews: copy };
    });
  };

  // Save Upload (hỗ trợ nhiều ảnh)
  const handleSaveUpload = async () => {
    if (!uploadModal.previews || uploadModal.previews.length === 0) {
      setAlert({ type: 'error', message: 'Vui lòng chọn hoặc dán ít nhất 1 hình ảnh lịch trực.' });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await hotlineService.uploadImage({
        thang: uploadModal.thang,
        team: uploadModal.team,
        images_data: uploadModal.previews,
        image_data: uploadModal.previews[0],
      });

      if (updated.helpdesk_months) setHelpdeskMonths(updated.helpdesk_months);
      if (updated.app_months) setAppMonths(updated.app_months);

      // If viewer is currently showing this month & team, refresh viewer immediately
      if (viewer.isOpen && viewer.team === uploadModal.team && viewer.month === uploadModal.thang) {
        const item = uploadModal.team === 'HELP' ? updated.helpdesk : updated.app;
        setViewer((prev) => ({ ...prev, item: item || null }));
        setActiveImageIndex(0);
      }

      const savedCount = uploadModal.previews.length;
      setUploadModal({ isOpen: false, team: defaultTeam, thang: uploadModal.thang, previews: [] });
      setAlert({
        type: 'success',
        message: `Đã lưu thành công ${savedCount} hình ảnh lịch trực ${uploadModal.team === 'HELP' ? 'Helpdesk' : 'IT App'} Tháng ${uploadModal.thang}!`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Lưu hình ảnh thất bại. Vui lòng thử lại.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    setIsSaving(true);
    try {
      await hotlineService.deleteSchedule(deleteModal.thang, deleteModal.team);
      setDeleteModal({ isOpen: false, team: 'HELP', thang: deleteModal.thang });

      // Refresh months
      await loadAvailableData();

      // If viewer is open on this item, reset item
      if (viewer.isOpen && viewer.team === deleteModal.team && viewer.month === deleteModal.thang) {
        setViewer((prev) => ({ ...prev, item: null }));
      }

      setAlert({
        type: 'success',
        message: `Đã xóa lịch trực ${deleteModal.team === 'HELP' ? 'Helpdesk' : 'IT App'} Tháng ${deleteModal.thang}.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Xóa lịch trực thất bại.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to render a month row for a specific team
  const renderTeamMonthRow = (
    teamKey: 'HELP' | 'APP',
    title: string,
    subtitle: string,
    badgeColor: string,
    icon: React.ReactNode,
    availableList: string[]
  ) => {
    return (
      <Card
        style={{
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        padding="md"
      >
        {/* Row Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: badgeColor + '18',
                color: badgeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: badgeColor + '20',
                    color: badgeColor,
                  }}
                >
                  {availableList.length} tháng có lịch
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenUpload(teamKey, String(currentMonthNum))}
            >
              <Upload size={15} style={{ marginRight: '6px' }} />
              Tải Lên Lịch Trực Mới
            </Button>
          )}
        </div>

        {/* 12 Months Grid Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '10px',
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const mStr = String(m);
            const isCurrent = m === currentMonthNum;
            const hasData = availableList.includes(mStr);

            return (
              <button
                key={m}
                type="button"
                onClick={() => fetchAndOpenViewer(teamKey, mStr)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '12px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: hasData
                    ? `1.5px solid ${badgeColor}`
                    : '1px dashed var(--border-color)',
                  backgroundColor: hasData ? badgeColor + '0d' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                  if (hasData) {
                    e.currentTarget.style.backgroundColor = badgeColor + '18';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.backgroundColor = hasData ? badgeColor + '0d' : 'var(--bg-secondary)';
                }}
                title={`Bấm để xem lịch trực ${title} Tháng ${m}`}
              >
                {/* Current Month Tag */}
                {isCurrent && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      fontSize: '8px',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      fontWeight: 700,
                      lineHeight: '1.2',
                    }}
                  >
                    Hiện tại
                  </span>
                )}

                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: hasData ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Tháng {m}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {hasData ? (
                    <>
                      <CheckCircle size={12} style={{ color: badgeColor }} />
                      <span style={{ fontSize: '11px', color: badgeColor, fontWeight: 600 }}>
                        Xem Lịch
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Chưa có ảnh
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Alert Notification */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Main Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Lịch Trực Hotline
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Bấm trực tiếp vào tháng bất kỳ bên dưới để mở xem hình ảnh lịch trực phóng to toàn màn hình
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAvailableData}
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} style={{ marginRight: '6px' }} />
          Làm Mới
        </Button>
      </div>

      {/* DÒNG 1: LỊCH TRỰC HELPDESK (Chỉ hiển thị cho Helpdesk, Inventory, Admin) */}
      {canViewHelpdesk && renderTeamMonthRow(
        'HELP',
        'Lịch Trực Helpdesk',
        'Lịch phân công trực hotline hỗ trợ nhà hàng của đội ngũ Helpdesk',
        '#0284c7',
        <Headphones size={22} />,
        helpdeskMonths
      )}

      {/* DÒNG 2: LỊCH TRỰC IT APP (Chỉ hiển thị cho IT App, Inventory, Admin) */}
      {canViewApp && renderTeamMonthRow(
        'APP',
        'Lịch Trực IT App',
        'Lịch phân công trực hotline hỗ trợ phân hệ ứng dụng & dữ liệu của đội ngũ IT App',
        '#16a34a',
        <Layers size={22} />,
        appMonths
      )}

      {!canViewHelpdesk && !canViewApp && (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Bạn không có quyền xem lịch trực hotline.</p>
        </Card>
      )}

      {/* ================= MODAL FULLSCREEN HIỂN THỊ LỊCH TRỰC TOÀN MÀN HÌNH ================= */}
      {viewer.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(10, 15, 25, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Top Navigation & Control Header */}
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(20, 26, 38, 0.98)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              color: '#ffffff',
            }}
          >
            {/* Title & Team Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: viewer.team === 'HELP' ? '#0284c7' : '#16a34a',
                    color: '#ffffff',
                  }}
                >
                  {viewer.team === 'HELP' ? 'HELPDESK' : 'IT APP'}
                </span>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                  Lịch Trực {viewer.team === 'HELP' ? 'Helpdesk' : 'IT App'} - Tháng {viewer.month}
                </h2>
              </div>

              {/* Quick switch between Helpdesk & IT App (Chỉ hiển thị khi có quyền xem cả 2 nhóm: Admin & Inventory) */}
              {canViewHelpdesk && canViewApp && (
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '2px',
                    gap: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleViewerSwitchTeam('HELP')}
                    style={{
                      border: 'none',
                      backgroundColor: viewer.team === 'HELP' ? '#0284c7' : 'transparent',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: viewer.team === 'HELP' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    Helpdesk
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewerSwitchTeam('APP')}
                    style={{
                      border: 'none',
                      backgroundColor: viewer.team === 'APP' ? '#16a34a' : 'transparent',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: viewer.team === 'APP' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    IT App
                  </button>
                </div>
              )}

              {viewer.item?.user_insert && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  Cập nhật bởi: <strong>{viewer.item.user_insert}</strong>
                  {viewer.item.ngay_insert && ` (${new Date(viewer.item.ngay_insert).toLocaleDateString('vi-VN')})`}
                </span>
              )}
            </div>

            {/* Quick Month Bar inside Viewer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Tháng trước (Phím mũi tên trái)"
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ display: 'flex', gap: '3px' }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const mStr = String(m);
                  const isSelected = viewer.month === mStr;
                  const hasData = (viewer.team === 'HELP' ? helpdeskMonths : appMonths).includes(mStr);

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleViewerSwitchMonth(mStr)}
                      style={{
                        border: isSelected ? '1px solid #ffffff' : 'none',
                        backgroundColor: isSelected
                          ? (viewer.team === 'HELP' ? '#0284c7' : '#16a34a')
                          : hasData
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#ffffff' : hasData ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      T{m}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Tháng sau (Phím mũi tên phải)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Tools & Close Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Multi-image Controls (Hiển thị khi có từ 2 ảnh trở lên) */}
              {(() => {
                const currentImages: string[] = viewer.item?.image_urls && viewer.item.image_urls.length > 0
                  ? viewer.item.image_urls
                  : viewer.item?.image_url
                  ? [viewer.item.image_url]
                  : [];
                const hasMultiple = currentImages.length > 1;
                const safeIdx = Math.min(activeImageIndex, Math.max(0, currentImages.length - 1));

                return (
                  <>
                    {hasMultiple && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          padding: '3px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        {/* Nút Xem Chung 1 Khung Hình */}
                        <button
                          type="button"
                          onClick={() => setViewMode('all')}
                          style={{
                            border: 'none',
                            backgroundColor: viewMode === 'all' ? 'var(--color-primary)' : 'transparent',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Hiển thị tất cả hình ảnh cùng lúc trong 1 khung hình"
                        >
                          <LayoutGrid size={14} />
                          <span>Chung 1 Khung Hình ({currentImages.length})</span>
                        </button>

                        {/* Nút đổi chiều Xếp Dọc / Xếp Ngang khi ở chế độ Chung 1 khung hình với 2 ảnh */}
                        {viewMode === 'all' && currentImages.length === 2 && (
                          <button
                            type="button"
                            onClick={() => setLayoutDirection((d) => (d === 'column' ? 'row' : 'column'))}
                            style={{
                              border: '1px solid rgba(255,255,255,0.25)',
                              backgroundColor: 'rgba(255,255,255,0.12)',
                              color: '#ffffff',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title={layoutDirection === 'column' ? 'Chuyển sang xếp 2 ảnh hàng ngang' : 'Chuyển sang xếp 2 ảnh hàng dọc'}
                          >
                            <span>{layoutDirection === 'column' ? '↕ Xếp Dọc' : '↔ Xếp Ngang'}</span>
                          </button>
                        )}

                        {/* Nút Xem Từng Trang */}
                        <button
                          type="button"
                          onClick={() => setViewMode('single')}
                          style={{
                            border: 'none',
                            backgroundColor: viewMode === 'single' ? 'var(--color-primary)' : 'transparent',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Xem phóng to từng trang riêng biệt"
                        >
                          <Layers size={14} />
                          <span>Từng Trang</span>
                        </button>

                        {/* Page Selector (chỉ hiện khi xem Từng Trang) */}
                        {viewMode === 'single' && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginLeft: '2px',
                              paddingLeft: '6px',
                              borderLeft: '1px solid rgba(255,255,255,0.15)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1))}
                              style={{
                                background: 'rgba(255,255,255,0.12)',
                                border: 'none',
                                color: '#ffffff',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Trang trước (Phím mũi tên trái)"
                            >
                              <ChevronLeft size={14} />
                            </button>

                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', padding: '0 4px', whiteSpace: 'nowrap' }}>
                              {safeIdx + 1} / {currentImages.length}
                            </span>

                            <button
                              type="button"
                              onClick={() => setActiveImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0))}
                              style={{
                                background: 'rgba(255,255,255,0.12)',
                                border: 'none',
                                color: '#ffffff',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Trang tiếp theo (Phím mũi tên phải)"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Zoom In */}
                    <button
                      type="button"
                      onClick={() => setViewer((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 3) }))}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                      }}
                      title="Phóng to"
                    >
                      <ZoomIn size={15} />
                      <span>{Math.round(viewer.zoom * 100)}%</span>
                    </button>

                    {/* Zoom Out */}
                    <button
                      type="button"
                      onClick={() => setViewer((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.25, 0.5) }))}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                      }}
                      title="Thu nhỏ"
                    >
                      <ZoomOut size={15} />
                    </button>

                    {/* Rotate */}
                    <button
                      type="button"
                      onClick={() => setViewer((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                      }}
                      title="Xoay hình ảnh"
                    >
                      <RotateCw size={15} />
                    </button>

                    {/* Download */}
                    {currentImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (viewMode === 'all') {
                            currentImages.forEach((img, i) => {
                              handleDownload(img, `Lich_Truc_${viewer.team}_Thang_${viewer.month}_Trang_${i + 1}.png`);
                            });
                          } else {
                            const cur = currentImages[safeIdx] || currentImages[0];
                            handleDownload(cur, `Lich_Truc_${viewer.team}_Thang_${viewer.month}_Trang_${safeIdx + 1}.png`);
                          }
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}
                        title={viewMode === 'all' ? 'Tải về tất cả các trang ảnh' : 'Tải trang ảnh hiện tại về máy'}
                      >
                        <Download size={15} />
                        <span>{viewMode === 'all' ? `Tải Về (${currentImages.length})` : 'Tải Về'}</span>
                      </button>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenUpload(viewer.team, viewer.month, currentImages)}
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '6px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Upload size={14} />
                          <span>{currentImages.length > 0 ? `Đổi/Thêm Ảnh (${currentImages.length})` : 'Thêm Ảnh'}</span>
                        </button>

                        {currentImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDeleteModal({ isOpen: true, team: viewer.team, thang: viewer.month })}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#ef4444',
                              padding: '6px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                            }}
                            title="Xóa tất cả hình ảnh lịch trực tháng này"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </>
                );
              })()}

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseViewer}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginLeft: '6px',
                }}
                title="Đóng (ESC)"
              >
                <X size={16} />
                <span>Đóng</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {viewer.isLoadingMonth ? (
              <div style={{ textAlign: 'center', color: '#ffffff' }}>
                <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                <p style={{ margin: 0, fontSize: '15px' }}>Đang tải lịch trực Tháng {viewer.month}...</p>
              </div>
            ) : (() => {
              const currentImages: string[] = viewer.item?.image_urls && viewer.item.image_urls.length > 0
                ? viewer.item.image_urls
                : viewer.item?.image_url
                ? [viewer.item.image_url]
                : [];
              const safeIdx = Math.min(activeImageIndex, Math.max(0, currentImages.length - 1));
              const hasMultiple = currentImages.length > 1;

              if (currentImages.length > 0) {
                if (viewMode === 'all') {
                  const isTwoImages = currentImages.length === 2;
                  return (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: isTwoImages && layoutDirection === 'row' ? 'row' : 'column',
                        gap: isTwoImages ? '8px' : '16px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: viewer.zoom === 1 ? '100%' : 'auto',
                        maxWidth: viewer.zoom === 1 ? '100%' : 'none',
                        transform: `scale(${viewer.zoom}) rotate(${viewer.rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out',
                        boxSizing: 'border-box',
                      }}
                    >
                      {currentImages.map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            maxWidth: isTwoImages && layoutDirection === 'row' ? '49.5%' : '100%',
                            maxHeight: viewer.zoom === 1
                              ? (isTwoImages
                                  ? (layoutDirection === 'row' ? 'calc(100vh - 84px)' : 'calc(50vh - 46px)')
                                  : (currentImages.length > 2 ? 'calc(33vh - 28px)' : '85vh'))
                              : 'none',
                            flex: isTwoImages && layoutDirection === 'row' ? '1 1 50%' : '0 1 auto',
                            boxSizing: 'border-box',
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Lịch trực ${viewer.team} Tháng ${viewer.month} - Trang ${imgIdx + 1}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: viewer.zoom === 1
                                ? (isTwoImages
                                    ? (layoutDirection === 'row' ? 'calc(100vh - 84px)' : 'calc(50vh - 46px)')
                                    : (currentImages.length > 2 ? 'calc(33vh - 28px)' : '85vh'))
                                : 'none',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.55)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              cursor: 'zoom-in',
                            }}
                            onClick={() => {
                              setActiveImageIndex(imgIdx);
                              setViewMode('single');
                            }}
                            title="Nhấp để phóng to riêng trang này"
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '8px',
                              backgroundColor: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              pointerEvents: 'none',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            Trang {imgIdx + 1} / {currentImages.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Hiển thị ảnh đơn (kèm chevron chuyển ảnh nhanh nếu có nhiều ảnh)
                const activeImg = currentImages[safeIdx] || currentImages[0];
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minWidth: '100%',
                      minHeight: '100%',
                      position: 'relative',
                    }}
                  >
                    {/* Left / Right Chevron buttons for multi-image */}
                    {hasMultiple && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1))}
                          style={{
                            position: 'fixed',
                            left: '24px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(20, 26, 38, 0.75)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.95)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.75)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                          }}
                          title="Trang ảnh trước"
                        >
                          <ChevronLeft size={26} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0))}
                          style={{
                            position: 'fixed',
                            right: '24px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(20, 26, 38, 0.75)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.95)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.75)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                          }}
                          title="Trang ảnh tiếp theo"
                        >
                          <ChevronRight size={26} />
                        </button>
                      </>
                    )}

                    <img
                      src={activeImg}
                      alt={`Lịch trực ${viewer.team} Tháng ${viewer.month} - Trang ${safeIdx + 1}`}
                      style={{
                        maxWidth: viewer.zoom === 1 ? '96%' : 'none',
                        maxHeight: viewer.zoom === 1 ? '88vh' : 'none',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
                        transform: `scale(${viewer.zoom}) rotate(${viewer.rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out',
                      }}
                    />
                  </div>
                );
              }

              if (viewer.item?.noidung && !viewer.item.is_image) {
                /* Fallback HTML table */
                return (
                  <div
                    style={{
                      maxWidth: '96%',
                      maxHeight: '88vh',
                      overflow: 'auto',
                      backgroundColor: '#ffffff',
                      padding: '20px',
                      borderRadius: '8px',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: viewer.item.noidung }} />
                  </div>
                );
              }

              /* Empty State */
              return (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                    maxWidth: '460px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '40px 32px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    <ImageIcon size={32} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                      Chưa Có Lịch Trực Tháng {viewer.month}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Nhóm {viewer.team === 'HELP' ? 'Helpdesk' : 'IT App'} chưa có hình ảnh phân công lịch trực cho Tháng {viewer.month}.
                    </p>
                  </div>

                  {isAdmin && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenUpload(viewer.team, viewer.month, [])}
                    >
                      <Upload size={15} style={{ marginRight: '6px' }} />
                      Thêm Hình Ảnh Ngay
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN UPLOAD / PASTE ================= */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal((prev) => ({ ...prev, isOpen: false, previews: [] }))}
        title={`Tải Lên Lịch Trực ${uploadModal.team === 'HELP' ? 'Helpdesk' : 'IT App'} - Tháng ${uploadModal.thang}`}
        maxWidth="760px"
        zIndex={10001}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="outline"
              onClick={() => setUploadModal((prev) => ({ ...prev, isOpen: false, previews: [] }))}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveUpload}
              disabled={uploadModal.previews.length === 0 || isSaving}
            >
              {isSaving
                ? 'Đang Lưu...'
                : uploadModal.previews.length > 1
                ? `Lưu Lịch Trực (${uploadModal.previews.length} ảnh)`
                : 'Lưu Lịch Trực'}
            </Button>
          </div>
        }
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          onPaste={handlePaste}
          tabIndex={0}
        >
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Áp Dụng Cho Tháng:
              </label>
              <select
                value={uploadModal.thang}
                onChange={(e) => setUploadModal((prev) => ({ ...prev, thang: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Nhóm Trực:
              </label>
              <select
                value={uploadModal.team}
                onChange={(e) => setUploadModal((prev) => ({ ...prev, team: e.target.value as 'HELP' | 'APP' }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              >
                <option value="HELP">Helpdesk</option>
                <option value="APP">IT App</option>
              </select>
            </div>
          </div>

          {/* Previews List (Hiển thị tất cả ảnh đã chọn hoặc paste) */}
          {uploadModal.previews.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Danh sách ảnh đã thêm ({uploadModal.previews.length} ảnh):</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    (Có thể dán thêm hoặc sắp xếp lại)
                  </span>
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setUploadModal((prev) => ({ ...prev, previews: [] }))}
                  style={{ padding: '2px 8px', fontSize: '12px' }}
                >
                  Xóa tất cả
                </Button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {uploadModal.previews.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary-text)',
                        }}
                      >
                        Trang {idx + 1}
                      </span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMovePreviewImage(idx, idx - 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              color: 'var(--text-secondary)',
                            }}
                            title="Di chuyển lên trước"
                          >
                            <ChevronLeft size={14} />
                          </button>
                        )}
                        {idx < uploadModal.previews.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMovePreviewImage(idx, idx + 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              color: 'var(--text-secondary)',
                            }}
                            title="Di chuyển ra sau"
                          >
                            <ChevronRight size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePreviewImage(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            color: '#ef4444',
                          }}
                          title="Xóa ảnh này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        height: '110px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={img}
                        alt={`Trang ${idx + 1}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paste & Drop Zone */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              {uploadModal.previews.length > 0 ? 'Thêm hình ảnh khác vào danh sách:' : 'Hình Ảnh Lịch Trực:'}
            </label>
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '22px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onClick={() => document.getElementById('hotline-image-input-modal')?.click()}
            >
              <input
                id="hotline-image-input-modal"
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={22} />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Bấm để chọn file ảnh hoặc kéo thả vào đây (chọn được nhiều file cùng lúc)
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Hỗ trợ PNG, JPG, WEBP. Hoặc <strong style={{ color: 'var(--color-primary)' }}>nhấn Ctrl+V ở bất kỳ đâu</strong> để dán ảnh chụp màn hình trực tiếp. Có thể dán nhiều ảnh liên tiếp!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        title="Xác Nhận Xóa Lịch Trực"
        maxWidth="460px"
        zIndex={10001}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="outline"
              onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={isSaving}
            >
              {isSaving ? 'Đang Xóa...' : 'Xác Nhận Xóa'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Bạn có chắc chắn muốn xóa lịch trực của nhóm {deleteModal.team === 'HELP' ? 'Helpdesk' : 'IT App'} trong Tháng {deleteModal.thang}?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Hình ảnh lịch trực của tháng này sẽ được gỡ khỏi hệ thống hiển thị.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
