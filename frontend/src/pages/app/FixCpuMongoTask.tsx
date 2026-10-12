import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  CheckSquare,
  Square,
  Building2,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RestaurantItem } from '../../types/restaurant';
import { UserInfo } from '../../types/auth';
import { checkIsSuperAdmin } from '../../utils/authUtils';
import {
  mongoService,
  MongoFixCpuRestaurantResult,
  MongoFixCpuResponse
} from '../../services/mongoService';

interface FixCpuMongoTaskProps {
  restaurants: RestaurantItem[];
  user: UserInfo | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  selectedRestaurant?: RestaurantItem | null;
  defaultEmail?: string;
}

export const FixCpuMongoTask: React.FC<FixCpuMongoTaskProps> = ({
  restaurants,
  user,
  showToast,
  selectedRestaurant,
  defaultEmail: defaultEmailProp
}) => {
  // Quyền Super Admin hoặc dung.nguyenanh
  const isPrivileged = useMemo(() => {
    if (!user) return false;
    const username = (user.username || '').toLowerCase().trim();
    return checkIsSuperAdmin(user) || username === 'dung.nguyenanh';
  }, [user]);

  // Danh sách nhà hàng hợp lệ: Chỉ ON hoặc NEW (loại bỏ OFF)
  const validRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const st = (r.trangthai || '').toUpperCase().trim();
      return st !== 'OFF';
    });
  }, [restaurants]);

  // Cấu hình email mặc định (chỉ user đặc quyền thấy)
  const [defaultEmail, setDefaultEmail] = useState<string>('dung.nguyenanh@ggg.com.vn');

  // Bộ lọc tìm kiếm & trạng thái
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON' | 'NEW' | 'SELECTED'>('ALL');

  // Danh sách ID nhà hàng được chọn (checkboxes)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Trạng thái thực thi
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executingSingleId, setExecutingSingleId] = useState<number | null>(null);
  const [resultsMap, setResultsMap] = useState<Record<number, MongoFixCpuRestaurantResult>>({});
  const [lastSummary, setLastSummary] = useState<MongoFixCpuResponse | null>(null);
  const [expandedRestId, setExpandedRestId] = useState<number | null>(null);

  // Tải cấu hình email nếu là Super Admin / Dung
  useEffect(() => {
    if (isPrivileged) {
      mongoService
        .getFixCpuConfig()
        .then((res) => {
          if (res.default_email) {
            setDefaultEmail(res.default_email);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi tải cấu hình email fix cpu:', err);
        });
    }
  }, [isPrivileged]);

  // Nếu người dùng đang chọn 1 nhà hàng cụ thể từ dropdown trên cùng, tự động tích chọn NH đó
  useEffect(() => {
    if (selectedRestaurant && validRestaurants.some((r) => r.id === selectedRestaurant.id)) {
      setSelectedIds((prev) => {
        if (!prev.includes(selectedRestaurant.id)) {
          return [...prev, selectedRestaurant.id];
        }
        return prev;
      });
    }
  }, [selectedRestaurant, validRestaurants]);

  // Danh sách nhà hàng sau khi lọc (Tự động đưa nhà hàng đã chọn lên đầu)
  const filteredRestaurants = useMemo(() => {
    let list = validRestaurants;
    if (statusFilter === 'SELECTED') {
      list = list.filter((r) => selectedIds.includes(r.id));
    } else if (statusFilter !== 'ALL') {
      list = list.filter((r) => (r.trangthai || 'ON').toUpperCase().trim() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const sap = (r.sap || '').toLowerCase();
        const res = (r.res || '').toLowerCase();
        const ip = (r.ip || '').toLowerCase();
        return sap.includes(q) || res.includes(q) || ip.includes(q);
      });
    }

    // Đưa nhà hàng đã chọn lên đầu để người dùng nhìn thấy ngay
    if (selectedIds.length > 0) {
      list = [...list].sort((a, b) => {
        const aSel = selectedIds.includes(a.id) ? 1 : 0;
        const bSel = selectedIds.includes(b.id) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel;
        return (a.sap || '').localeCompare(b.sap || '');
      });
    }

    return list;
  }, [validRestaurants, statusFilter, searchQuery, selectedIds]);

  // Toggle chọn 1 nhà hàng
  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Chọn tất cả nhà hàng đang hiển thị
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredRestaurants.map((r) => r.id);
    const isAllSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Thực thi xử lý Full CPU (Hàng loạt hoặc 1 NH)
  const handleExecute = async (targetIds?: number[]) => {
    const idsToRun = targetIds || selectedIds;
    if (idsToRun.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 Nhà Hàng để thực hiện xử lý.', 'error');
      return;
    }

    const isSingle = idsToRun.length === 1;
    setIsExecuting(true);
    if (isSingle) {
      setExecutingSingleId(idsToRun[0]);
    }

    const targetRest = isSingle ? validRestaurants.find((r) => r.id === idsToRun[0]) : null;
    const restLabel = targetRest ? `[${targetRest.sap || targetRest.id}] ${targetRest.res}` : `${idsToRun.length} nhà hàng`;
    showToast(`⚡ Đang bắt đầu quét MongoDB, tạo Index và dọn log cũ cho ${restLabel}...`, 'info');

    try {
      const userMail = user?.email || (user?.username ? `${user.username}@ggg.com.vn` : undefined);
      const res = await mongoService.executeFixCpu({
        restaurant_ids: idsToRun,
        default_email: isPrivileged ? (defaultEmailProp || defaultEmail).trim() : undefined,
        user_email: userMail,
        send_email: true
      });

      // Cập nhật kết quả vào Map
      setResultsMap((prev) => {
        const next = { ...prev };
        for (const item of res.results) {
          next[item.restaurant_id] = item;
        }
        return next;
      });

      setLastSummary(res);

      if (res.email_sent) {
        showToast(
          `Hoàn tất xử lý ${res.total_restaurants} nhà hàng (${res.success_count} thành công, ${res.failed_count} offline). Đã gửi email báo cáo!`,
          'success'
        );
      } else {
        showToast(
          `Đã xử lý xong ${res.total_restaurants} nhà hàng (${res.success_count} thành công, ${res.failed_count} offline).`,
          'info'
        );
      }
    } catch (err: any) {
      console.error('Lỗi khi thực thi Fix CPU:', err);
      showToast('Lỗi khi thực thi: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsExecuting(false);
      setExecutingSingleId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Last Summary Metric Cards (nếu vừa chạy xong) */}
      {lastSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Tổng Nhà Hàng Xử Lý
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {lastSummary.total_restaurants}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color="#4B5563" />
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                  Thành Công (Đã Index)
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#065F46', marginTop: '4px' }}>
                  {lastSummary.success_count}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#059669" />
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase' }}>
                  Offline / Thất Bại
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#991B1B', marginTop: '4px' }}>
                  {lastSummary.failed_count}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="#DC2626" />
              </div>
            </div>
          </Card>

          {lastSummary.total_cleaned_logs !== undefined && lastSummary.total_cleaned_logs > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                    Log Cũ Đã Dọn Dẹp
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
                    {lastSummary.total_cleaned_logs.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#78350F', marginTop: '2px' }}>
                    Chỉ giữ 2 tháng gần nhất
                  </div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} color="#D97706" />
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#4338CA', textTransform: 'uppercase' }}>
                  Trạng Thái Báo Cáo Mail
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: lastSummary.email_sent ? '#065F46' : '#B91C1C', marginTop: '6px' }}>
                  {lastSummary.email_sent ? '✅ Đã gửi mail thành công' : '⚠️ ' + (lastSummary.email_error || 'Chưa gửi mail')}
                </div>
                {lastSummary.recipients && lastSummary.recipients.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {lastSummary.recipients.join(', ')}
                  </div>
                )}
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={20} color="#4F46E5" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Toolbar: Search, Status Filter, Selection Actions & Execute Button */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '400px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Tìm mã SAP, tên nhà hàng, dải IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #E5E7EB)',
                  outline: 'none',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  color: 'var(--text-primary, #111827)'
                }}
              />
            </div>

            {/* Filter by Status: ALL, ON, NEW */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Lọc:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  borderRadius: '5px',
                  fontWeight: statusFilter === 'ALL' ? 700 : 500,
                  backgroundColor: statusFilter === 'ALL' ? '#3B82F6' : 'var(--bg-secondary, #F3F4F6)',
                  color: statusFilter === 'ALL' ? '#FFFFFF' : 'var(--text-primary, #374151)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Tất cả ({validRestaurants.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ON')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  borderRadius: '5px',
                  fontWeight: statusFilter === 'ON' ? 700 : 500,
                  backgroundColor: statusFilter === 'ON' ? '#10B981' : 'var(--bg-secondary, #F3F4F6)',
                  color: statusFilter === 'ON' ? '#FFFFFF' : 'var(--text-primary, #374151)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Chỉ ON ({validRestaurants.filter((r) => (r.trangthai || 'ON').toUpperCase() === 'ON').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NEW')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  borderRadius: '5px',
                  fontWeight: statusFilter === 'NEW' ? 700 : 500,
                  backgroundColor: statusFilter === 'NEW' ? '#8B5CF6' : 'var(--bg-secondary, #F3F4F6)',
                  color: statusFilter === 'NEW' ? '#FFFFFF' : 'var(--text-primary, #374151)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Chỉ NEW ({validRestaurants.filter((r) => (r.trangthai || '').toUpperCase() === 'NEW').length})
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('SELECTED')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    borderRadius: '5px',
                    fontWeight: statusFilter === 'SELECTED' ? 700 : 600,
                    backgroundColor: statusFilter === 'SELECTED' ? '#DC2626' : '#FEE2E2',
                    color: statusFilter === 'SELECTED' ? '#FFFFFF' : '#991B1B',
                    border: '1px solid #FCA5A5',
                    cursor: 'pointer'
                  }}
                >
                  Đã chọn ({selectedIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Action Row: Select all, Deselect, Counter & Run Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color, #E5E7EB)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Button variant="outline" size="sm" onClick={handleSelectAllFiltered}>
                <CheckSquare size={14} style={{ marginRight: '6px' }} />
                Chọn tất cả ({filteredRestaurants.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedIds.length === 0}>
                <Square size={14} style={{ marginRight: '6px' }} />
                Bỏ chọn
              </Button>
              <span style={{ fontSize: '13px', fontWeight: 700, color: selectedIds.length > 0 ? '#DC2626' : 'var(--text-secondary)' }}>
                {selectedIds.length === 1 ? (
                  <>
                    Đã chọn:{' '}
                    <b style={{ color: '#B91C1C' }}>
                      [{validRestaurants.find((r) => r.id === selectedIds[0])?.sap || ''}]{' '}
                      {validRestaurants.find((r) => r.id === selectedIds[0])?.res}
                    </b>
                  </>
                ) : (
                  `Đã chọn: ${selectedIds.length} / ${filteredRestaurants.length} nhà hàng`
                )}
              </span>
            </div>

            {/* Execute Button */}
            <Button
              variant="danger"
              size="md"
              onClick={() => handleExecute()}
              isLoading={isExecuting}
              disabled={isExecuting || selectedIds.length === 0}
              style={{
                backgroundColor: selectedIds.length > 0 ? '#DC2626' : undefined,
                backgroundImage: selectedIds.length > 0 ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' : undefined,
                borderColor: selectedIds.length > 0 ? '#B91C1C' : undefined,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13.5px',
                padding: '8px 22px',
                boxShadow: selectedIds.length > 0 ? '0 4px 14px rgba(220, 38, 38, 0.45)' : undefined,
                cursor: selectedIds.length > 0 && !isExecuting ? 'pointer' : 'not-allowed'
              }}
            >
              <Zap size={16} color="#FFFFFF" fill="#FDE047" style={{ marginRight: '6px' }} />
              <span style={{ color: '#FFFFFF', fontWeight: 800 }}>
                {isExecuting
                  ? 'Đang Quét, Tạo Index & Dọn Log...'
                  : selectedIds.length === 1
                  ? `Thực Thi Xử Lý Full CPU (${validRestaurants.find((r) => r.id === selectedIds[0])?.res || '1 Nhà Hàng'})`
                  : `Thực Thi Xử Lý Full CPU (${selectedIds.length} Nhà Hàng)`}
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {/* In-Progress Notification Banner */}
      {isExecuting && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: '#FEF3C7',
            border: '2px solid #F59E0B',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
          }}
        >
          <RefreshCw size={22} color="#D97706" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#92400E' }}>
              ⚡ Hệ thống đang quét kết nối IP, tạo Index & dọn dẹp log cũ MongoDB (&gt; 2 tháng)...
            </div>
            <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
              Đang tối ưu cho{' '}
              <b>
                {selectedIds.length === 1
                  ? `[${validRestaurants.find((r) => r.id === selectedIds[0])?.sap || ''}] ${validRestaurants.find((r) => r.id === selectedIds[0])?.res || '1 Nhà Hàng'}`
                  : `${selectedIds.length} nhà hàng`}
              </b>
              . Do các bảng log cũ có thể chứa hàng triệu bản ghi, hệ thống đang xóa theo từng đợt an toàn để không làm ảnh hưởng máy POS. Xin vui lòng không đóng trang!
            </div>
          </div>
        </div>
      )}

      {/* 4. Table of Restaurants & Real-time Execution Results */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary, #F9FAFB)', borderBottom: '2px solid var(--border-color, #E5E7EB)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      filteredRestaurants.length > 0 &&
                      filteredRestaurants.every((r) => selectedIds.includes(r.id))
                    }
                    onChange={handleSelectAllFiltered}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#DC2626' }}
                  />
                </th>
                <th style={{ padding: '10px 12px', width: '80px' }}>Mã SAP</th>
                <th style={{ padding: '10px 12px', minWidth: '180px' }}>Tên Nhà Hàng</th>
                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ padding: '10px 12px', minWidth: '170px' }}>Dải Mạng IP (.11, .12, .41)</th>
                <th style={{ padding: '10px 12px', minWidth: '220px' }}>Kết Quả Xử Lý Index MongoDB</th>
                <th style={{ padding: '10px 12px', width: '120px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Không tìm thấy nhà hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((r, idx) => {
                  const isChecked = selectedIds.includes(r.id);
                  const result = resultsMap[r.id];
                  const isRunningThis = executingSingleId === r.id || (isExecuting && selectedIds.includes(r.id));
                  const isExpanded = expandedRestId === r.id;

                  const targetIp = r.ip || r.ip_wan || '';
                  const parts = targetIp.split('.');
                  const subnet = parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}.` : targetIp;

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => toggleSelectOne(r.id)}
                        style={{
                          backgroundColor: isChecked ? '#FEF2F2' : idx % 2 === 0 ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-secondary, #F9FAFB)',
                          borderBottom: '1px solid var(--border-color, #E5E7EB)',
                          transition: 'background-color 0.15s ease',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isChecked) e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F3F4F6)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.backgroundColor =
                              idx % 2 === 0 ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-secondary, #F9FAFB)';
                          }
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelectOne(r.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#DC2626' }}
                          />
                        </td>

                        {/* SAP Code */}
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.sap || '---'}
                        </td>

                        {/* Restaurant Name */}
                        <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {r.res}
                        </td>

                        {/* Status (ON / NEW) */}
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {(r.trangthai || 'ON').toUpperCase() === 'ON' ? (
                            <span style={{ backgroundColor: '#DEF7EC', color: '#03543F', border: '1px solid #31C48D', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                              ON
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                              NEW
                            </span>
                          )}
                        </td>

                        {/* Subnet & Candidate IPs */}
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div>
                            <b>Subnet:</b> {subnet || 'N/A'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>
                            IP: {subnet}11, {subnet}12, {subnet}41
                          </div>
                        </td>

                        {/* Results Column */}
                        <td style={{ padding: '10px 12px' }}>
                          {isRunningThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: 600 }}>
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Đang quét .11, .12, .41 & tạo Index...</span>
                            </div>
                          ) : result ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {result.status === 'SUCCESS' ? (
                                  <Badge variant="success">
                                    ✅ ĐÃ TỐI ƯU ({result.processed_ips.length} IP)
                                  </Badge>
                                ) : result.status === 'OFFLINE' ? (
                                  <Badge variant="warning">
                                    ⚠️ OFFLINE / ĐÓNG PORT
                                  </Badge>
                                ) : (
                                  <Badge variant="danger">
                                    ❌ THẤT BẠI
                                  </Badge>
                                )}
                                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {result.message}
                                </span>
                              </div>

                              {/* Cleaned logs badge if any */}
                              {result.total_cleaned_logs !== undefined && result.total_cleaned_logs > 0 && (
                                <div style={{ fontSize: '11.5px', color: '#B45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Trash2 size={12} color="#D97706" />
                                  <span>Đã dọn dẹp {result.total_cleaned_logs.toLocaleString()} log cũ (&gt;2 tháng)</span>
                                </div>
                              )}

                              {/* IP mini-summary */}
                              {result.processed_ips.length > 0 && (
                                <div style={{ fontSize: '11.5px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>Máy MongoDB hoạt động: <b>{result.processed_ips.join(', ')}</b></span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedRestId(isExpanded ? null : r.id);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#2563EB',
                                      cursor: 'pointer',
                                      fontSize: '11.5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: 0
                                    }}
                                  >
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {isExpanded ? 'Ẩn' : 'Chi tiết'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Chưa thực thi</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecute([r.id]);
                            }}
                            isLoading={isRunningThis}
                            disabled={isExecuting || isRunningThis}
                            style={{ fontSize: '11.5px', padding: '4px 8px' }}
                          >
                            <Zap size={12} style={{ marginRight: '4px' }} />
                            Xử lý NH này
                          </Button>
                        </td>
                      </tr>

                      {/* Collapsible Row: Chi tiết các IP của nhà hàng */}
                      {isExpanded && result && (
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <td colSpan={7} style={{ padding: '12px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                📋 Chi tiết kết quả kiểm tra từng IP máy trạm của nhà hàng {r.res}:
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                                {result.ip_results.map((ip_res) => (
                                  <div
                                    key={ip_res.ip}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: '6px',
                                      backgroundColor: ip_res.connected ? '#ECFDF5' : '#F3F4F6',
                                      border: `1px solid ${ip_res.connected ? '#A7F3D0' : '#E5E7EB'}`
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 700, fontSize: '12.5px', color: ip_res.connected ? '#065F46' : '#6B7280' }}>
                                        {ip_res.ip}:27017
                                      </span>
                                      <Badge variant={ip_res.connected ? 'success' : 'neutral'}>
                                        {ip_res.connected ? 'KẾT NỐI OK' : 'KHÔNG KẾT NỐI'}
                                      </Badge>
                                    </div>
                                    {ip_res.connected ? (
                                      <div style={{ fontSize: '11.5px', color: '#047857', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <div>Tạo mới: <b>{ip_res.created_indexes.length} index</b> ({ip_res.created_indexes.join(', ') || '0'})</div>
                                        <div>Đã có sẵn: <b>{ip_res.existing_indexes.length} index</b> ({ip_res.existing_indexes.join(', ') || '0'})</div>
                                        {ip_res.total_cleaned_logs !== undefined && ip_res.total_cleaned_logs > 0 && (
                                          <div style={{ color: '#B45309', fontWeight: 600 }}>
                                            🗑️ Dọn dẹp log (&gt;2 tháng): <b>{ip_res.total_cleaned_logs.toLocaleString()}</b> docs
                                            {ip_res.cleaned_logs && Object.keys(ip_res.cleaned_logs).length > 0 && (
                                              <span style={{ fontSize: '10.5px', color: '#78350F', display: 'block', marginLeft: '6px', fontWeight: 400 }}>
                                                {Object.entries(ip_res.cleaned_logs).map(([table, count]) => `${table}: ${count.toLocaleString()}`).join(', ')}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        <div>Thời gian: <b>{ip_res.duration_seconds}s</b></div>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                        {ip_res.error_message || 'Port đóng hoặc timeout'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
