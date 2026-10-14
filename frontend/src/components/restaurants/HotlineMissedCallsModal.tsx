import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall,
  PhoneMissed,
  CheckCheck,
  Check,
  RefreshCw,
  Monitor,
  Clock,
  PhoneIncoming,
  History,
  Hash,
  Search,
  Star,
  Shield,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { HotlinePermissionsModal } from './HotlinePermissionsModal';
import { useHotline } from '../../contexts/HotlineContext';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import { hotlineService } from '../../services/hotlineService';
import { HotlineMissedCallItem } from '../../types/hotline';

interface HotlineMissedCallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVnc: (restaurantName: string, ipPrefix: string) => void;
  onCountChange?: (newCount: number) => void;
  onFilterRestaurant?: (searchTerm: string) => void;
}

export const HotlineMissedCallsModal: React.FC<HotlineMissedCallsModalProps> = ({
  isOpen,
  onClose,
  onOpenVnc,
  onCountChange,
  onFilterRestaurant,
}) => {
  const { openGuideModal } = useHotline();
  const { user } = useAuth();
  const isSuperAdmin = checkIsDungOrSuperAdmin(user);

  // Tab state: 'missed' | 'answered'
  const [activeTab, setActiveTab] = useState<'missed' | 'answered'>('missed');

  // Lọc theo Agent hiện tại hay tất cả Agent (Super Admin có thể xem tất cả)
  const [showAllAgents, setShowAllAgents] = useState<boolean>(false);

  // Data states
  const [missedCalls, setMissedCalls] = useState<HotlineMissedCallItem[]>([]);
  const [answeredCalls, setAnsweredCalls] = useState<HotlineMissedCallItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResolvingAll, setIsResolvingAll] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // State mở modal phân quyền hotline
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState<boolean>(false);

  // Search filter inside modal
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Fetch Missed Calls (Tab 1)
  const fetchMissedCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await hotlineService.getMissedCalls(true, 100, user?.username, showAllAgents);
      const items = res.items || [];
      setMissedCalls(items);
      if (onCountChange) {
        onCountChange(items.length);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách cuộc gọi nhỡ:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, showAllAgents, onCountChange]);

  // Fetch Answered Calls (Tab 2)
  const fetchAnsweredCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await hotlineService.getAnsweredCalls(100, user?.username, showAllAgents);
      setAnsweredCalls(res.items || []);
    } catch (err) {
      console.error('Lỗi tải lịch sử cuộc gọi đã nghe:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, showAllAgents]);

  const refreshCurrentTab = useCallback(() => {
    if (activeTab === 'missed') {
      fetchMissedCalls();
    } else {
      fetchAnsweredCalls();
    }
  }, [activeTab, fetchMissedCalls, fetchAnsweredCalls]);

  // Tự động tải dữ liệu khi mở modal và tự động làm mới mỗi 3s khi đang mở
  useEffect(() => {
    if (!isOpen) return;
    fetchMissedCalls();
    fetchAnsweredCalls();

    const interval = setInterval(() => {
      if (activeTab === 'missed') {
        fetchMissedCalls();
      } else {
        fetchAnsweredCalls();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, activeTab, fetchMissedCalls, fetchAnsweredCalls]);

  // Xử lý Done từng dòng
  const handleResolveSingle = async (callId: number) => {
    setResolvingId(callId);
    try {
      await hotlineService.resolveMissedCall(callId);
      // Cập nhật state danh sách cuộc gọi nhỡ
      setMissedCalls((prev) => {
        const next = prev.filter((item) => item.id !== callId);
        if (onCountChange) {
          onCountChange(next.length);
        }
        return next;
      });
      // Tải lại lịch sử đã nghe để cập nhật cuộc gọi đã xử lý
      fetchAnsweredCalls();
    } catch (err) {
      console.error('Lỗi khi đánh dấu Done cuộc gọi:', err);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    } finally {
      setResolvingId(null);
    }
  };

  // Xử lý Done hàng loạt (Check All)
  const handleResolveAll = async () => {
    if (missedCalls.length === 0) return;
    if (!window.confirm(`Xác nhận đánh dấu ĐÃ GỌI LẠI (Done) cho toàn bộ ${missedCalls.length} cuộc gọi nhỡ?`)) {
      return;
    }
    setIsResolvingAll(true);
    try {
      await hotlineService.resolveAllMissedCalls();
      setMissedCalls([]);
      if (onCountChange) onCountChange(0);
      fetchAnsweredCalls();
    } catch (err) {
      console.error('Lỗi khi đóng hàng loạt:', err);
      alert('Không thể đóng hàng loạt. Vui lòng thử lại.');
    } finally {
      setIsResolvingAll(false);
    }
  };

  // Filter items
  const filterItem = (it: HotlineMissedCallItem) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.trim().toLowerCase();
    return (
      (it.ext && it.ext.toLowerCase().includes(q)) ||
      (it.restaurant_name && it.restaurant_name.toLowerCase().includes(q)) ||
      (it.restaurant_sap && it.restaurant_sap.toLowerCase().includes(q)) ||
      (it.restaurant_rk7 && it.restaurant_rk7.toLowerCase().includes(q)) ||
      (it.restaurant_ip && it.restaurant_ip.toLowerCase().includes(q)) ||
      (it.caller_raw_text && it.caller_raw_text.toLowerCase().includes(q))
    );
  };

  const filteredMissedCalls = missedCalls.filter(filterItem);
  const filteredAnsweredCalls = answeredCalls.filter(filterItem);
  const unresolvedCount = missedCalls.length;

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '28px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: activeTab === 'missed' ? '#FEF2F2' : '#ECFDF5',
                color: activeTab === 'missed' ? '#EF4444' : '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {activeTab === 'missed' ? <PhoneMissed size={20} /> : <PhoneIncoming size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Quản Lý Cuộc Gọi Hotline 3CX
                </span>
                <button
                  type="button"
                  onClick={openGuideModal}
                  title="Xem hướng dẫn cài đặt ứng dụng tổng đài 3CX (PWA)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF9C3',
                    border: '1px solid #FDE047',
                    color: '#854D0E',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Star size={12} style={{ color: '#EAB308', fill: '#FACC15' }} />
                  <span>Cài 3CX PWA</span>
                </button>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                Theo dõi cuộc gọi nhỡ cần gọi lại và lịch sử các cuộc gọi tới đã tiếp nhận (3 ngày gần nhất)
              </div>
            </div>
          </div>
        </div>
      }
      maxWidth="900px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              onClick={refreshCurrentTab}
              disabled={isLoading}
            >
              Làm mới
            </Button>
            <button
              type="button"
              onClick={openGuideModal}
              style={{
                fontSize: '12px',
                color: '#854D0E',
                background: '#FEF9C3',
                border: '1px solid #FDE047',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontWeight: 600,
              }}
              title="Xem hướng dẫn cài đặt ứng dụng tổng đài 3CX (PWA)"
            >
              <Star size={13} style={{ color: '#EAB308', fill: '#FACC15' }} /> Hướng dẫn cài 3CX (PWA)
            </button>

            {checkIsDungOrSuperAdmin(user) && (
              <button
                type="button"
                onClick={() => setIsPermissionsModalOpen(true)}
                style={{
                  fontSize: '12px',
                  color: '#1E40AF',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
                title="Cài đặt nhóm quyền và danh sách nhân viên được phép trực Hotline 3CX"
              >
                <Shield size={13} style={{ color: '#2563EB' }} /> Phân Quyền Trực Hotline
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab === 'missed' && unresolvedCount > 0 && (
              <Button
                variant="primary"
                leftIcon={<CheckCheck size={16} />}
                onClick={handleResolveAll}
                isLoading={isResolvingAll}
                style={{ backgroundColor: '#10B981', borderColor: '#10B981', fontWeight: 600 }}
                title="Đánh dấu đã gọi lại cho tất cả các cuộc gọi nhỡ"
              >
                Done Hàng Loạt ({unresolvedCount})
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* THANH TAB ĐIỀU HƯỚNG: 2 TAB */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid var(--border-color)',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Tab 1: Cuộc gọi nhỡ */}
            <button
              type="button"
              onClick={() => setActiveTab('missed')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'missed' ? '2.5px solid #EF4444' : '2.5px solid transparent',
                marginBottom: '-2px',
                color: activeTab === 'missed' ? '#DC2626' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: activeTab === 'missed' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <PhoneMissed size={16} />
              <span>Cuộc Gọi Nhỡ</span>
              {unresolvedCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    padding: '1px 7px',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {unresolvedCount}
                </span>
              )}
            </button>

            {/* Tab 2: Lịch sử cuộc gọi tới đã nghe */}
            <button
              type="button"
              onClick={() => setActiveTab('answered')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'answered' ? '2.5px solid #10B981' : '2.5px solid transparent',
                marginBottom: '-2px',
                color: activeTab === 'answered' ? '#059669' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: activeTab === 'answered' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <History size={16} />
              <span>Lịch Sử Cuộc Gọi Tới Đã Nghe</span>
              <span
                style={{
                  backgroundColor: '#E5E7EB',
                  color: '#4B5563',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '12px',
                  padding: '1px 7px',
                }}
              >
                {answeredCalls.length}
              </span>
            </button>
          </div>

          {/* Bộ lọc Agent & Ô tìm kiếm nhanh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', flexWrap: 'wrap' }}>
            {isSuperAdmin ? (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  padding: '2px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAllAgents(false)}
                  style={{
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: !showAllAgents ? 700 : 500,
                    cursor: 'pointer',
                    backgroundColor: !showAllAgents ? '#2563EB' : 'transparent',
                    color: !showAllAgents ? '#FFFFFF' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Chỉ hiển thị cuộc gọi gán cho tài khoản của bạn"
                >
                  👤 Của tôi ({user?.username})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllAgents(true)}
                  style={{
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: showAllAgents ? 700 : 500,
                    cursor: 'pointer',
                    backgroundColor: showAllAgents ? '#2563EB' : 'transparent',
                    color: showAllAgents ? '#FFFFFF' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Xem toàn bộ cuộc gọi của tất cả các Agent trên hệ thống"
                >
                  🌐 Tất cả Agent
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
                title="Dữ liệu hiển thị riêng cho tài khoản của bạn, không dùng chung với các nhân viên khác"
              >
                <span>👤 Agent: {user?.username || 'Của tôi'}</span>
              </div>
            )}

            {/* Ô tìm kiếm nhanh trong bảng */}
            <div style={{ position: 'relative', width: '180px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '9px',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Lọc số line, tên NH..."
                style={{
                  width: '100%',
                  padding: '5px 10px 5px 28px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════════
            NỘI DUNG TAB 1: CUỘC GỌI NHỠ (CÓ NÚT DONE TỪNG DÒNG & HÀNG LOẠT)
            ════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'missed' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: '#FEF2F2',
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '12.5px',
                color: '#991B1B',
              }}
            >
              <span>
                Danh sách cuộc gọi nhỡ cần gọi lại trong 3 ngày gần nhất. Nhấn nút <strong>Done</strong> sau khi đã liên hệ lại thành công.
              </span>
              {unresolvedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResolveAll}
                  disabled={isResolvingAll}
                  style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCheck size={13} /> Done Hàng Loạt
                </button>
              )}
            </div>

            {filteredMissedCalls.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ color: '#10B981', marginBottom: '8px' }}>
                  <CheckCheck size={36} style={{ margin: '0 auto' }} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Không có cuộc gọi nhỡ nào cần xử lý
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Tất cả các cuộc gọi đã được liên hệ lại hoặc không có cuộc gọi nhỡ mới.
                </div>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '440px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: '155px' }}>
                        Thời Gian
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: '100px' }}>
                        Số Line
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Nhà Hàng
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: '110px' }}>
                        Trạng Thái
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '160px' }}>
                        Thao Tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissedCalls.map((call) => {
                      const isRowResolving = resolvingId === call.id;
                      const hasIp = !!call.restaurant_ip;
                      const formattedTitle = `${call.restaurant_sap ? call.restaurant_sap + ' ' : ''}${call.restaurant_name} (RK7: ${call.restaurant_rk7 || '—'}) ${call.restaurant_ip || ''}`.trim();

                      return (
                        <tr
                          key={call.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: '#FFFBFB',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Thời gian */}
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontSize: '12.5px', fontWeight: 500 }}>
                              <Clock size={13} style={{ color: '#9CA3AF' }} />
                              {call.created_at}
                            </div>
                          </td>

                          {/* Số line EXT */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                fontSize: '12px',
                              }}
                            >
                              <Hash size={11} />
                              {call.ext}
                            </span>
                          </td>

                          {/* Nhà hàng */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {call.restaurant_sap && (
                                <span style={{ color: '#2563EB', marginRight: '2px' }}>[{call.restaurant_sap}]</span>
                              )}
                              <span>{call.restaurant_name}</span>
                              {call.restaurant_id && onFilterRestaurant && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const kw = call.restaurant_sap || call.restaurant_name || '';
                                    if (kw) {
                                      onFilterRestaurant(kw);
                                      onClose();
                                    }
                                  }}
                                  title="Tìm kiếm nhanh nhà hàng này trên danh sách"
                                  style={{
                                    padding: '1px 6px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#2563EB',
                                    border: '1px solid #BFDBFE',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <Search size={11} /> Tìm trên web
                                </button>
                              )}
                              {!call.restaurant_id && (
                                (() => {
                                  const text = `${call.caller_raw_text || ''} ${call.restaurant_name || ''} ${call.ext || ''}`.toLowerCase();
                                  const isInternal = ['it dept', 'its', 'it support', 'helpdesk', 'tram', 'dung', 'bao', 'nội bộ', 'hcm its', 'hn its', 'hr dept', 'acc dept'].some(k => text.includes(k));
                                  return isInternal ? (
                                    <span
                                      style={{
                                        marginLeft: '6px',
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#EEF2FF',
                                        color: '#4338CA',
                                        fontWeight: 700,
                                        border: '1px solid #C7D2FE',
                                      }}
                                    >
                                      🏢 Cuộc gọi nội bộ
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        marginLeft: '6px',
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#FEF3C7',
                                        color: '#B45309',
                                        fontWeight: 700,
                                        border: '1px solid #FDE68A',
                                      }}
                                    >
                                      ⚠️ Không nằm trong danh sách NH
                                    </span>
                                  );
                                })()
                              )}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {call.restaurant_rk7 && `RK7: ${call.restaurant_rk7}`}
                              {call.restaurant_ip && ` • IP: ${call.restaurant_ip}`}
                              {call.caller_raw_text && ` • Caller: ${call.caller_raw_text}`}
                            </div>
                          </td>

                          {/* Trạng thái & Phụ trách */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: call.call_status === 'BUSY' ? '#FFEDD5' : '#FEE2E2',
                                  color: call.call_status === 'BUSY' ? '#C2410C' : '#DC2626',
                                  width: 'fit-content',
                                }}
                              >
                                {call.call_status === 'BUSY' ? 'Bận Máy' : 'Cuộc Gọi Nhỡ'}
                              </span>
                              {call.duty_user && (
                                <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                                  👤 {call.duty_user}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Thao tác */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {/* Nút Done từng dòng */}
                              <button
                                type="button"
                                onClick={() => handleResolveSingle(call.id)}
                                disabled={isRowResolving}
                                title="Đánh dấu đã gọi lại cho nhà hàng"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#10B981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease',
                                }}
                              >
                                <Check size={13} />
                                {isRowResolving ? '...' : 'Done'}
                              </button>

                              {/* Nút kết nối VNC/KDS nhanh */}
                              {hasIp && (
                                <button
                                  type="button"
                                  onClick={() => onOpenVnc(formattedTitle, call.ip_prefix || '')}
                                  title="Mở bảng Kết Nối Từ Xa VNC/KDS"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#2563EB',
                                    border: '1px solid #BFDBFE',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Monitor size={13} />
                                  VNC
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════
            NỘI DUNG TAB 2: LỊCH SỬ CÁC CUỘC GỌI TỚI ĐÃ NGHE (CÓ THỜI GIAN, LINE NGOÀI DANH MỤC)
            ════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'answered' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: '#ECFDF5',
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '12.5px',
                color: '#065F46',
              }}
            >
              <span>
                Lịch sử các cuộc gọi tới đã tiếp nhận/nghe máy trong 3 ngày gần nhất. Các line không tìm thấy trong danh bạ nhà hàng được tự động lưu tại đây.
              </span>
              <span style={{ fontWeight: 600 }}>Tổng: {filteredAnsweredCalls.length} cuộc gọi</span>
            </div>

            {filteredAnsweredCalls.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ color: '#6B7280', marginBottom: '8px' }}>
                  <History size={36} style={{ margin: '0 auto' }} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Chưa có lịch sử cuộc gọi nào
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Khi có cuộc gọi đến được nghe hoặc kết nối, thông tin sẽ được ghi nhận tại đây.
                </div>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '440px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: '155px' }}>
                        Thời Gian
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: '100px' }}>
                        Số Line
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Nhà Hàng / Thông Tin Cuộc Gọi
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: '120px' }}>
                        Trạng Thái
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '110px' }}>
                        Thao Tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnsweredCalls.map((call) => {
                      const isUnlisted = !call.restaurant_id;
                      const hasIp = !!call.restaurant_ip;
                      const formattedTitle = `${call.restaurant_sap ? call.restaurant_sap + ' ' : ''}${call.restaurant_name} (RK7: ${call.restaurant_rk7 || '—'}) ${call.restaurant_ip || ''}`.trim();

                      return (
                        <tr
                          key={call.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isUnlisted ? '#F9FAFB' : '#F0FDF4',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Thời gian */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontSize: '12.5px', fontWeight: 500 }}>
                              <Clock size={13} style={{ color: '#10B981' }} />
                              {call.created_at}
                            </div>
                          </td>

                          {/* Số line EXT */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: isUnlisted ? '#E5E7EB' : '#D1FAE5',
                                color: isUnlisted ? '#374151' : '#065F46',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                fontSize: '12px',
                              }}
                            >
                              <Hash size={11} />
                              {call.ext}
                            </span>
                          </td>

                          {/* Nhà hàng / Thông tin cuộc gọi */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            {isUnlisted ? (
                              <div>
                                {(() => {
                                  const text = `${call.caller_raw_text || ''} ${call.restaurant_name || ''} ${call.ext || ''}`.toLowerCase();
                                  const isInternal = ['it dept', 'its', 'it support', 'helpdesk', 'tram', 'dung', 'bao', 'nội bộ', 'hcm its', 'hn its', 'hr dept', 'acc dept'].some(k => text.includes(k));
                                  return isInternal ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '1px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#EEF2FF',
                                        color: '#4338CA',
                                        marginRight: '6px',
                                        border: '1px solid #C7D2FE',
                                      }}
                                    >
                                      🏢 Cuộc gọi nội bộ
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '1px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#FEF3C7',
                                        color: '#B45309',
                                        marginRight: '6px',
                                        border: '1px solid #FDE68A',
                                      }}
                                    >
                                      ⚠️ Không nằm trong danh sách NH
                                    </span>
                                  );
                                })()}
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {call.caller_raw_text || `Máy nhánh ${call.ext}`}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  {call.restaurant_sap && (
                                    <span style={{ color: '#059669', marginRight: '2px' }}>[{call.restaurant_sap}]</span>
                                  )}
                                  <span>{call.restaurant_name}</span>
                                  {onFilterRestaurant && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const kw = call.restaurant_sap || call.restaurant_name || '';
                                        if (kw) {
                                          onFilterRestaurant(kw);
                                          onClose();
                                        }
                                      }}
                                      title="Tìm kiếm nhanh nhà hàng này trên danh sách"
                                      style={{
                                        padding: '1px 6px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                        backgroundColor: '#ECFDF5',
                                        color: '#059669',
                                        border: '1px solid #A7F3D0',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <Search size={11} /> Tìm trên web
                                    </button>
                                  )}
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {call.restaurant_rk7 && `RK7: ${call.restaurant_rk7}`}
                                  {call.restaurant_ip && ` • IP: ${call.restaurant_ip}`}
                                  {call.caller_raw_text && ` • Caller: ${call.caller_raw_text}`}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Trạng thái & Người tiếp nhận */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  backgroundColor: isUnlisted ? '#F3F4F6' : '#D1FAE5',
                                  color: isUnlisted ? '#4B5563' : '#065F46',
                                  width: 'fit-content',
                                }}
                              >
                                <PhoneCall size={12} />
                                {isUnlisted ? 'Đã Ghi Nhận' : 'Đã Nghe'}
                              </span>
                              {(call.duty_user || call.resolved_by) && (
                                <span style={{ fontSize: '11px', color: '#4B5563', fontWeight: 500 }}>
                                  👤 {call.duty_user || call.resolved_by}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Thao tác */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                            {hasIp ? (
                              <button
                                type="button"
                                onClick={() => onOpenVnc(formattedTitle, call.ip_prefix || '')}
                                title="Mở bảng Kết Nối Từ Xa VNC/KDS"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#2563EB',
                                  border: '1px solid #BFDBFE',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                <Monitor size={13} />
                                Kết Nối
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>

    {/* Modal Phân Quyền Trực Hotline 3CX (Dành riêng cho Super Admin / dung.nguyenanh) */}
    <HotlinePermissionsModal
      isOpen={isPermissionsModalOpen}
      onClose={() => setIsPermissionsModalOpen(false)}
    />
  </>
  );
};
