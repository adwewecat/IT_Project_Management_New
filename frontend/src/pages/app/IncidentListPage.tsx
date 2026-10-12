import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Search,
  Calendar,
  User,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  Lock,
  Globe,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { IncidentItem, IncidentAssignee } from '../../types/incident';
import { incidentService } from '../../services/incidentService';
import { IncidentDetailModal } from '../../components/incidents/IncidentDetailModal';
import { CreateIncidentModal } from '../../components/incidents/CreateIncidentModal';
import { SystemOutageListTab } from '../../components/incidents/SystemOutageListTab';

export const IncidentListPage: React.FC = () => {

  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'system_outages'>('pending');
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [uncompletedCount, setUncompletedCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isCreateGeneralOpen, setIsCreateGeneralOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterUserInsert, setFilterUserInsert] = useState('ALL');
  const [filterAssignedTo, setFilterAssignedTo] = useState('ALL');

  // Assignee / User list for filters
  const [assignees, setAssignees] = useState<IncidentAssignee[]>([]);

  // Selected incident for detail modal
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load assignees list once
  useEffect(() => {
    incidentService
      .getAssignees()
      .then((data) => setAssignees(data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch incidents
  const loadIncidents = async () => {
    if (activeTab === 'system_outages') return;
    setLoading(true);
    try {
      const data = await incidentService.getIncidents({
        tab: activeTab === 'completed' ? 'completed' : 'pending',
        search: searchTerm.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        user_insert: filterUserInsert !== 'ALL' ? filterUserInsert : undefined,
        assigned_to: filterAssignedTo !== 'ALL' ? filterAssignedTo : undefined,
        limit: activeTab === 'completed' ? 200 : 300,
      });
      setIncidents(data.items);
      setUncompletedCount(data.uncompleted_count);
      setCompletedCount(data.completed_count);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'system_outages') {
      loadIncidents();
    }
  }, [activeTab, fromDate, toDate, filterUserInsert, filterAssignedTo]);

  // Handle Search Debounce / Enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadIncidents();
  };

  const handleOpenDetail = (item: IncidentItem) => {
    setSelectedIncident(item);
    setIsDetailOpen(true);
  };

  const handleIncidentUpdated = () => {
    loadIncidents();
    if (selectedIncident) {
      incidentService.getIncidentDetail(selectedIncident.id).then((fresh) => {
        setSelectedIncident(fresh);
      });
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
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <AlertTriangle size={24} style={{ color: '#EF4444' }} />
            <span>Báo Cáo Sự Vụ Nhà Hàng</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Theo dõi, phân công và xử lý các sự vụ, sự cố vận hành thường xuyên tại các nhà hàng
          </p>
        </div>

        {activeTab !== 'system_outages' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateGeneralOpen(true)}
              leftIcon={<Plus size={15} />}
            >
              Thêm Sự Vụ / Việc Ngoài
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadIncidents}
              disabled={loading}
              leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            >
              Làm Mới
            </Button>
          </div>
        )}
      </div>

      {/* 3 Tabs: Chưa Xong, Đã Xong, Lỗi Toàn Hệ Thống / Lỗi Diện Rộng */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-color)',
          marginBottom: '16px',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'pending' ? 700 : 500,
            color: activeTab === 'pending' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pending' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <Clock size={16} />
          <span>Sự Vụ Chưa Xong</span>
          <span
            style={{
              backgroundColor: activeTab === 'pending' ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'pending' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {uncompletedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'completed' ? 700 : 500,
            color: activeTab === 'completed' ? '#10B981' : 'var(--text-secondary)',
            borderBottom: activeTab === 'completed' ? '3px solid #10B981' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <CheckCircle2 size={16} />
          <span>Đã Xong (Tối Đa 200 Lỗi Gần Nhất)</span>
          <span
            style={{
              backgroundColor: activeTab === 'completed' ? '#10B981' : 'var(--bg-secondary)',
              color: activeTab === 'completed' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {completedCount > 200 ? '200+' : completedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system_outages')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'system_outages' ? 700 : 500,
            color: activeTab === 'system_outages' ? '#DC2626' : 'var(--text-secondary)',
            borderBottom: activeTab === 'system_outages' ? '3px solid #DC2626' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <AlertOctagon size={16} />
          <span>Lỗi Toàn Hệ Thống / Lỗi Diện Rộng</span>
        </button>
      </div>

      {activeTab === 'system_outages' ? (
        <SystemOutageListTab />
      ) : (
        <>

      {/* Filter Toolbar */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nhanh có dấu hoặc không dấu (Mã SAP, Tên NH, IP, nội dung lỗi...)"
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Tìm Kiếm
          </Button>
        </form>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Lọc theo ngày */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Từ ngày:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Lọc người note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Người note:</span>
            <select
              value={filterUserInsert}
              onChange={(e) => setFilterUserInsert(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            >
              <option value="ALL">Tất cả người note</option>
              {assignees.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.full_name} ({a.username})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc người xử lý */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Người xử lý:</span>
            <select
              value={filterAssignedTo}
              onChange={(e) => setFilterAssignedTo(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            >
              <option value="ALL">Tất cả người xử lý</option>
              {assignees.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.full_name} ({a.username})
                </option>
              ))}
            </select>
          </div>

          {(fromDate || toDate || filterUserInsert !== 'ALL' || filterAssignedTo !== 'ALL' || searchTerm) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFromDate('');
                setToDate('');
                setFilterUserInsert('ALL');
                setFilterAssignedTo('ALL');
              }}
            >
              Xóa Bộ Lọc
            </Button>
          )}
        </div>
      </div>

      {/* Table Data */}
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '12px 14px', width: '60px' }}>ID</th>
                <th style={{ padding: '12px 14px', width: '100px' }}>Quyền Xem</th>
                <th style={{ padding: '12px 14px', minWidth: '240px' }}>Nhà Hàng / Người Yêu Cầu</th>
                <th style={{ padding: '12px 14px', minWidth: '280px' }}>Nội Dung Sự Vụ</th>
                <th style={{ padding: '12px 14px', minWidth: '150px' }}>Người Xử Lý</th>
                <th style={{ padding: '12px 14px', minWidth: '120px' }}>Người Note</th>
                <th style={{ padding: '12px 14px', width: '140px' }}>Ngày Ghi Nhận</th>
                <th style={{ padding: '12px 14px', width: '130px' }}>Trạng Thái</th>
                <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Đang tải danh sách sự vụ...</span>
                    </div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có sự vụ nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                incidents.map((item) => {
                  let hasImages = false;
                  let hasFiles = false;
                  try {
                    if (item.images && item.images.length > 2) hasImages = true;
                    if (item.files && item.files.length > 2) hasFiles = true;
                  } catch {}

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleOpenDetail(item)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        #{item.id}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {item.is_private ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Lock size={11} /> Riêng tư
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: '#F3F4F6',
                              color: '#4B5563',
                              border: '1px solid #E5E7EB',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Globe size={11} /> Công khai
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          {item.restaurant_name || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div
                          style={{
                            maxWidth: '360px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary)',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.noidung}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {hasImages && (
                            <span style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <ImageIcon size={12} /> Có ảnh
                            </span>
                          )}
                          {hasFiles && (
                            <span style={{ fontSize: '11px', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <FileText size={12} /> Có file
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.assigned_name || item.assigned_to || (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa phân công</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.assign_type === 'INDIVIDUAL' ? 'Cá nhân' : 'Leader gán'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {item.user_insert || '—'}
                      </td>

                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {formatDate(item.date_insert)}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <Badge variant={item.trangthai ? 'success' : 'warning'}>
                          {item.trangthai ? 'Đã Xong' : 'Chưa Xong'}
                        </Badge>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item);
                          }}
                          leftIcon={<Eye size={14} />}
                        >
                          Xem
                        </Button>
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

      {/* Modal chi tiết sự vụ */}
      <IncidentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        incident={selectedIncident}
        onUpdated={handleIncidentUpdated}
      />

      {/* Modal tạo sự vụ việc ngoài */}
      <CreateIncidentModal
        isOpen={isCreateGeneralOpen}
        onClose={() => setIsCreateGeneralOpen(false)}
        restaurant={null}
        onSuccess={loadIncidents}
      />
    </div>
  );
};
