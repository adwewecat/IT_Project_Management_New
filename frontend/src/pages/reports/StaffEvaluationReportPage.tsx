import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  Settings,
  CheckCircle2,
  AlertOctagon,
  Clock,
  TrendingUp,
  BarChart2,
  Users,
  User,
  RefreshCw,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { staffEvaluationService } from '../../services/staffEvaluationService';
import {
  EvaluationReportResponse,
  MonthTeamEvaluation,
} from '../../types/staffEvaluation';
import { IncidentAssignee } from '../../types/incident';

export const StaffEvaluationReportPage: React.FC = () => {
  const { user } = useAuth();

  // Quyền truy cập: super_admin hoặc username dung.nguyenanh
  const isSuperAdmin = !!user?.is_super_admin || user?.username?.toLowerCase() === 'admin' || user?.username?.toLowerCase() === 'administrator' || user?.phanquyen === '0';
  const isAllowed = isSuperAdmin || user?.username?.toLowerCase() === 'dung.nguyenanh';

  // Date state
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Report Data State
  const [reportData, setReportData] = useState<EvaluationReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Tabs
  const [reportTab, setReportTab] = useState<'team' | 'individual'>('team');
  const [teamComparisonTab, setTeamComparisonTab] = useState<'current' | 'prev1' | 'prev2'>('current');
  const [selectedStaffUser, setSelectedStaffUser] = useState<string>('ALL');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [configSearchTerm, setConfigSearchTerm] = useState<string>('');

  // Config Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configStaffList, setConfigStaffList] = useState<string[]>([]);
  const [allAssignees, setAllAssignees] = useState<IncidentAssignee[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Load report data
  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await staffEvaluationService.getReport(selectedMonth, selectedYear);
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      loadReport();
    }
  }, [selectedMonth, selectedYear, isAllowed]);

  // Load assignees for config modal
  const openConfigModal = async () => {
    try {
      const [configs, candidates] = await Promise.all([
        staffEvaluationService.getEvaluationConfig(),
        staffEvaluationService.getCandidates(),
      ]);
      setConfigStaffList(configs.map((c) => c.username));
      setAllAssignees(
        candidates.map((c) => ({
          username: c.username,
          full_name: c.full_name || c.username,
          is_app_team: true,
        }))
      );
      setConfigSearchTerm('');
      setIsConfigModalOpen(true);
    } catch (err) {
      alert('Không thể tải cấu hình nhân viên.');
    }
  };

  const handleSaveConfig = async () => {
    if (configStaffList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 nhân viên để đánh giá!');
      return;
    }
    setSavingConfig(true);
    try {
      await staffEvaluationService.saveEvaluationConfig(configStaffList);
      setIsConfigModalOpen(false);
      loadReport();
    } catch (err) {
      alert('Không thể lưu cấu hình.');
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleStaffInConfig = (username: string) => {
    setConfigStaffList((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleExportExcel = async () => {
    try {
      const blob = await staffEvaluationService.exportExcel(
        selectedMonth,
        selectedYear,
        selectedStaffUser
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoCao_DanhGia_TeamApp_${selectedMonth}_${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất file Excel.');
    }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) {
      return { label: 'Xuất Sắc', bg: '#D1FAE5', color: '#059669', border: '#A7F3D0' };
    }
    if (rate >= 80) {
      return { label: 'Đạt Chuẩn', bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' };
    }
    if (rate >= 70) {
      return { label: 'Cần Cải Thiện', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
    }
    return { label: 'Chưa Đạt', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
  };

  if (!isAllowed) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#EF4444', marginBottom: '8px' }}>Không có quyền truy cập</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Trang Báo Cáo Đánh Giá Nhân Viên chỉ dành riêng cho Quản trị viên hoặc user dung.nguyenanh.
        </p>
      </div>
    );
  }

  // Active Team evaluation data based on comparison tab
  const getActiveTeamData = (): MonthTeamEvaluation | undefined => {
    if (!reportData) return undefined;
    if (teamComparisonTab === 'prev1') return reportData.prev_month_1;
    if (teamComparisonTab === 'prev2') return reportData.prev_month_2;
    return reportData.current_month;
  };

  const activeTeamData = getActiveTeamData();

  // Render a visual progress bar chart
  const renderStackedBar = (correct: number, wrong: number, late: number, total: number, height = 12) => {
    if (total === 0) {
      return (
        <div style={{ height: `${height}px`, borderRadius: `${height / 2}px`, backgroundColor: 'var(--bg-secondary)', width: '100%' }} />
      );
    }
    const cPct = (correct / total) * 100;
    const wPct = (wrong / total) * 100;
    const lPct = (late / total) * 100;

    return (
      <div
        style={{
          display: 'flex',
          height: `${height}px`,
          borderRadius: `${height / 2}px`,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-secondary)',
          width: '100%',
        }}
      >
        {cPct > 0 && <div style={{ width: `${cPct}%`, backgroundColor: '#10B981' }} title={`Đúng: ${cPct.toFixed(1)}%`} />}
        {wPct > 0 && <div style={{ width: `${wPct}%`, backgroundColor: '#EF4444' }} title={`Sai: ${wPct.toFixed(1)}%`} />}
        {lPct > 0 && <div style={{ width: `${lPct}%`, backgroundColor: '#F59E0B' }} title={`Trễ: ${lPct.toFixed(1)}%`} />}
      </div>
    );
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
            <Award size={26} style={{ color: 'var(--color-primary)' }} />
            <span>Báo Cáo Đánh Giá Nhân Viên Team App</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Đánh giá hiệu suất và ghi nhận lỗi làm việc theo 5 tiêu chí: Memo, PIM, Setup NH mới, Lỗi vi phạm, Dự án
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={openConfigModal}
            leftIcon={<Settings size={15} />}
          >
            Cấu Hình Nhân Viên
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet size={15} />}
            style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
          >
            Xuất Excel Chi Tiết
          </Button>
        </div>
      </div>

      {/* Toolbar: Chọn Tháng / Năm & Lọc Nhân Viên */}
      <div
        style={{
          padding: '14px 16px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Tháng:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadReport}
            disabled={loading}
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Cập Nhật
          </Button>
        </div>

        {/* Lọc & Tìm kiếm nhân viên khi xem chi tiết */}
        {reportTab === 'individual' && reportData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Xem bạn:</span>
              <select
                value={selectedStaffUser}
                onChange={(e) => setSelectedStaffUser(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">Tất cả nhân viên ({reportData.evaluated_staff_list.length})</option>
                {reportData.evaluated_staff_list.map((s) => (
                  <option key={s.username} value={s.username}>
                    {s.full_name} ({s.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Ô tìm kiếm nhanh thành viên */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Tìm tên/username..."
                style={{
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  width: '130px',
                }}
              />
              {staffSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStaffSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    padding: '0 2px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Switch Tabs: BÁO CÁO 1 (TỔNG HỢP TEAM) vs BÁO CÁO 2 (CHI TIẾT TỪNG BẠN) */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-color)',
          marginBottom: '20px',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setReportTab('team')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: reportTab === 'team' ? 800 : 500,
            color: reportTab === 'team' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: reportTab === 'team' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={18} />
          <span>Báo Cáo 1: Tổng Hợp Cả Team</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('individual')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: reportTab === 'individual' ? 800 : 500,
            color: reportTab === 'individual' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: reportTab === 'individual' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <BarChart2 size={18} />
          <span>Báo Cáo 2: Chi Tiết Từng Nhân Viên</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div>Đang tính toán số liệu đánh giá từ Memo, PIM, Setup, Sai phạm, Dự án...</div>
        </div>
      ) : !reportData ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không có dữ liệu báo cáo.
        </div>
      ) : (
        <>
          {/* ================= BÁO CÁO 1: TỔNG HỢP CẢ TEAM ================= */}
          {reportTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tab so sánh 3 tháng theo thứ tự thời gian: Tháng M-2 -> Tháng M-1 -> Tháng M (ví dụ: Tháng 7 -> 8 -> 9) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md)',
                  width: 'fit-content',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTeamComparisonTab('prev2')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: teamComparisonTab === 'prev2' ? 'var(--bg-primary)' : 'transparent',
                    fontWeight: teamComparisonTab === 'prev2' ? 700 : 500,
                    color: teamComparisonTab === 'prev2' ? 'var(--color-primary)' : 'var(--text-secondary)',
                    boxShadow: teamComparisonTab === 'prev2' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {reportData.prev_month_2.label} (Tháng M-2)
                </button>
                <button
                  type="button"
                  onClick={() => setTeamComparisonTab('prev1')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: teamComparisonTab === 'prev1' ? 'var(--bg-primary)' : 'transparent',
                    fontWeight: teamComparisonTab === 'prev1' ? 700 : 500,
                    color: teamComparisonTab === 'prev1' ? 'var(--color-primary)' : 'var(--text-secondary)',
                    boxShadow: teamComparisonTab === 'prev1' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {reportData.prev_month_1.label} (Tháng M-1)
                </button>
                <button
                  type="button"
                  onClick={() => setTeamComparisonTab('current')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: teamComparisonTab === 'current' ? 'var(--bg-primary)' : 'transparent',
                    fontWeight: teamComparisonTab === 'current' ? 700 : 500,
                    color: teamComparisonTab === 'current' ? 'var(--color-primary)' : 'var(--text-secondary)',
                    boxShadow: teamComparisonTab === 'current' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {reportData.current_month.label} (Đang chọn)
                </button>
              </div>

              {/* 4 Thẻ KPI Tổng Hợp */}
              {activeTeamData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* Thẻ 1: Tổng việc */}
                  <div
                    style={{
                      padding: '18px 20px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Tổng Công Việc Giao Trong {activeTeamData.label}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {activeTeamData.total_tasks} <span style={{ fontSize: '14px', fontWeight: 500 }}>việc</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Cả team {reportData.evaluated_staff_list.length} nhân sự
                    </div>
                  </div>

                  {/* Thẻ 2: Việc Làm Đúng */}
                  <div
                    style={{
                      padding: '18px 20px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid #A7F3D0',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} />
                      <span>Việc Làm Đúng / Đạt</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                      {activeTeamData.correct_tasks}
                      <span style={{ fontSize: '16px', fontWeight: 700, marginLeft: '8px' }}>
                        ({activeTeamData.correct_rate}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                      Đạt chuẩn Memo, PIM, Checklist & Dự án
                    </div>
                  </div>

                  {/* Thẻ 3: Việc Làm Sai / Lỗi */}
                  <div
                    style={{
                      padding: '18px 20px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid #FECACA',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertOctagon size={16} />
                      <span>Việc Làm Sai / Không Đạt</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                      {activeTeamData.wrong_tasks}
                      <span style={{ fontSize: '16px', fontWeight: 700, marginLeft: '8px' }}>
                        ({activeTeamData.wrong_rate}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>
                      Memo lỗi/fail, Checklist fail, Vi phạm thao tác
                    </div>
                  </div>

                  {/* Thẻ 4: Việc Trễ Hạn */}
                  <div
                    style={{
                      padding: '18px 20px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid #FDE68A',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#D97706', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} />
                      <span>Việc Bị Trễ Hạn</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                      {activeTeamData.late_tasks}
                      <span style={{ fontSize: '16px', fontWeight: 700, marginLeft: '8px' }}>
                        ({activeTeamData.late_rate}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#D97706', marginTop: '6px' }}>
                      PIM quá 3 ngày, Dự án trễ deadline
                    </div>
                  </div>
                </div>
              )}

              {/* Biểu đồ So Sánh 3 Tháng (Tháng này + 2 Tháng Trước) */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Biểu Đồ Xu Hướng Chất Lượng Công Việc (So Sánh 3 Tháng Liên Tiếp)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[reportData.prev_month_2, reportData.prev_month_1, reportData.current_month].map((mItem, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {mItem.label}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Tổng: {mItem.total_tasks} việc
                        </span>
                      </div>

                      {renderStackedBar(mItem.correct_tasks, mItem.wrong_tasks, mItem.late_tasks, mItem.total_tasks)}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          ✓ Đúng: {mItem.correct_rate}% ({mItem.correct_tasks})
                        </span>
                        <span style={{ color: '#DC2626', fontWeight: 600 }}>
                          ✗ Sai: {mItem.wrong_rate}% ({mItem.wrong_tasks})
                        </span>
                        <span style={{ color: '#D97706', fontWeight: 600 }}>
                          ⏱ Trễ: {mItem.late_rate}% ({mItem.late_tasks})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bảng Xếp Hạng Team */}
              {activeTeamData && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '14px' }}>
                    Bảng Thống Kê Chi Tiết Cả Team ({activeTeamData.label})
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 14px' }}>Nhân Viên</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Memo (Đạt/Lỗi)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>PIM (Đạt/Trễ)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Setup NH (Đạt/Lỗi)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Lỗi Vi Phạm</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Dự Án (Đạt/Trễ)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Tổng Việc</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Tỷ Lệ Đúng</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Tỷ Lệ Lỗi / Trễ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTeamData.staff_summaries.map((s) => {
                          const d = s.details;
                          const errRate = Math.round((s.wrong_rate + s.late_rate) * 10) / 10;
                          return (
                            <tr key={s.username} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.full_name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.username}</div>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: '#059669', fontWeight: 600 }}>{d.memo_ok}</span> /{' '}
                                <span style={{ color: d.memo_fail > 0 ? '#DC2626' : 'var(--text-muted)', fontWeight: 600 }}>
                                  {d.memo_fail}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: '#059669', fontWeight: 600 }}>{d.pim_ok}</span> /{' '}
                                <span style={{ color: d.pim_fail > 0 ? '#D97706' : 'var(--text-muted)', fontWeight: 600 }}>
                                  {d.pim_fail}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: '#059669', fontWeight: 600 }}>{d.setup_ok}</span> /{' '}
                                <span style={{ color: d.setup_fail > 0 ? '#DC2626' : 'var(--text-muted)', fontWeight: 600 }}>
                                  {d.setup_fail}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: d.violation_count > 0 ? '#DC2626' : 'var(--text-muted)', fontWeight: 700 }}>
                                  {d.violation_count}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: '#059669', fontWeight: 600 }}>{d.project_ok}</span> /{' '}
                                <span style={{ color: d.project_late > 0 ? '#D97706' : 'var(--text-muted)', fontWeight: 600 }}>
                                  {d.project_late}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                                {s.total_tasks}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: '#059669', fontWeight: 700 }}>{s.correct_rate}%</span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ color: errRate > 0 ? '#DC2626' : '#10B981', fontWeight: 700 }}>
                                  {errRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= BÁO CÁO 2: CHI TIẾT TỪNG NHÂN VIÊN ================= */}
          {reportTab === 'individual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tiêu chí đánh giá hướng dẫn ngắn */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} />
                  <span>Quy chuẩn tính lỗi:</span>
                </div>
                <span>• <strong>Memo</strong>: Quá 4 ngày chưa đóng hoặc fail ➔ 1 lỗi</span>
                <span>• <strong>PIM</strong>: Quá 4 ngày chưa đóng ➔ 1 lỗi trễ</span>
                <span>• <strong>Setup NH</strong>: Checklist fail ➔ 1 lỗi</span>
                <span>• <strong>Lỗi vi phạm</strong>: Miss mail, xử lý trễ, sai việc ➔ 1 lỗi</span>
                <span>• <strong>Dự án</strong>: Trễ deadline ➔ 1 lỗi trễ</span>
              </div>

              {/* Nếu chọn xem 1 bạn nhân viên cụ thể -> Hiển thị Dashboard Ma Trận 3 Tháng Chi Tiết */}
              {selectedStaffUser !== 'ALL' && (() => {
                const staff = reportData.current_month.staff_summaries.find((s) => s.username === selectedStaffUser);
                if (!staff) return null;
                const p1 = reportData.prev_month_1.staff_summaries.find((x) => x.username === staff.username);
                const p2 = reportData.prev_month_2.staff_summaries.find((x) => x.username === staff.username);
                const currBadge = getPerformanceBadge(staff.correct_rate);

                // Trend vs prev_month_1
                const diffRate = p1 ? Math.round((staff.correct_rate - p1.correct_rate) * 10) / 10 : 0;
                const prevErr = p1 ? p1.wrong_tasks + p1.late_tasks : 0;
                const currErr = staff.wrong_tasks + staff.late_tasks;
                const diffErr = currErr - prevErr;

                return (
                  <div
                    style={{
                      padding: '24px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    {/* Header cá nhân */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '18px',
                          }}
                        >
                          {staff.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {staff.full_name}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Tài khoản: @{staff.username} • Đánh giá hiệu suất Team App
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            backgroundColor: currBadge.bg,
                            color: currBadge.color,
                            border: `1px solid ${currBadge.border}`,
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          Xếp Loại: {currBadge.label}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>
                            {staff.correct_rate}%
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Đúng {staff.correct_tasks}/{staff.total_tasks} việc
                            {p1 && (
                              <span style={{ marginLeft: '6px', color: diffErr <= 0 ? '#059669' : '#DC2626', fontWeight: 600 }}>
                                ({diffErr <= 0 ? `giảm ${Math.abs(diffErr)} lỗi` : `tăng ${diffErr} lỗi`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Biểu Đồ Tiến Trình 3 Cột (Tháng 7 -> Tháng 8 -> Tháng 9) */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={17} style={{ color: 'var(--color-primary)' }} />
                        <span>Biểu Đồ Tiến Trình Hiệu Suất 3 Tháng (Tháng 7 ➔ Tháng 8 ➔ Tháng 9)</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                          { data: p2, label: reportData.prev_month_2.label, tag: 'Tháng M-2' },
                          { data: p1, label: reportData.prev_month_1.label, tag: 'Tháng M-1' },
                          { data: staff, label: reportData.current_month.label, tag: 'Tháng M (Đang chọn)' },
                        ].map((col, idx) => {
                          const cData = col.data;
                          const badge = cData ? getPerformanceBadge(cData.correct_rate) : null;
                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '16px',
                                backgroundColor: idx === 2 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                border: idx === 2 ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                                  {col.label}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: idx === 2 ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                                    color: idx === 2 ? 'var(--color-primary)' : 'var(--text-muted)',
                                  }}
                                >
                                  {col.tag}
                                </span>
                              </div>

                              {cData ? (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 800, color: badge?.color }}>
                                      {cData.correct_rate}%
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      Tổng: {cData.total_tasks} việc
                                    </span>
                                  </div>

                                  {renderStackedBar(cData.correct_tasks, cData.wrong_tasks, cData.late_tasks, cData.total_tasks)}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                    <span style={{ color: '#059669', fontWeight: 600 }}>✓ {cData.correct_tasks} đúng</span>
                                    <span style={{ color: '#DC2626', fontWeight: 600 }}>✗ {cData.wrong_tasks} sai</span>
                                    <span style={{ color: '#D97706', fontWeight: 600 }}>⏱ {cData.late_tasks} trễ</span>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                                  Chưa có dữ liệu
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bảng Ma Trận Đối Chiếu Chi Tiết 5 Tiêu Chí Qua 3 Tháng */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                        Bảng Đối Chiếu Chi Tiết 5 Tiêu Chí Đánh Giá Qua 3 Tháng Liên Tiếp
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tiêu Chí Đánh Giá</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {reportData.prev_month_2.label} (Tháng M-2)
                              </th>
                              <th style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {reportData.prev_month_1.label} (Tháng M-1)
                              </th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                                {reportData.current_month.label} (Đang chọn)
                              </th>
                              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Xu Hướng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Dòng 1: Memo */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                1. Memo Xử Lý (Quá 4 ngày chưa đóng hoặc fail ➔ Lỗi)
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p2 ? `${p2.details.memo_ok} đạt / ${p2.details.memo_fail} lỗi` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 ? `${p1.details.memo_ok} đạt / ${p1.details.memo_fail} lỗi` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, backgroundColor: 'var(--color-primary-subtle)' }}>
                                {staff.details.memo_ok} đạt /{' '}
                                <span style={{ color: staff.details.memo_fail > 0 ? '#DC2626' : '#059669' }}>
                                  {staff.details.memo_fail} lỗi
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 && staff.details.memo_fail < p1.details.memo_fail ? (
                                  <span style={{ color: '#059669', fontWeight: 700 }}>Giảm lỗi ✓</span>
                                ) : p1 && staff.details.memo_fail > p1.details.memo_fail ? (
                                  <span style={{ color: '#DC2626', fontWeight: 700 }}>Tăng lỗi ✗</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>Ổn định</span>
                                )}
                              </td>
                            </tr>

                            {/* Dòng 2: PIM */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                2. Yêu Cầu PIM (Quá 4 ngày chưa đóng ➔ Trễ)
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p2 ? `${p2.details.pim_ok} đạt / ${p2.details.pim_fail} trễ` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 ? `${p1.details.pim_ok} đạt / ${p1.details.pim_fail} trễ` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, backgroundColor: 'var(--color-primary-subtle)' }}>
                                {staff.details.pim_ok} đạt /{' '}
                                <span style={{ color: staff.details.pim_fail > 0 ? '#D97706' : '#059669' }}>
                                  {staff.details.pim_fail} trễ
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 && staff.details.pim_fail < p1.details.pim_fail ? (
                                  <span style={{ color: '#059669', fontWeight: 700 }}>Giảm trễ ✓</span>
                                ) : p1 && staff.details.pim_fail > p1.details.pim_fail ? (
                                  <span style={{ color: '#D97706', fontWeight: 700 }}>Tăng trễ ✗</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>Ổn định</span>
                                )}
                              </td>
                            </tr>

                            {/* Dòng 3: Setup NH */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                3. Setup Nhà Hàng Mới (Checklist fail ➔ Lỗi)
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p2 ? `${p2.details.setup_ok} đạt / ${p2.details.setup_fail} fail` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 ? `${p1.details.setup_ok} đạt / ${p1.details.setup_fail} fail` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, backgroundColor: 'var(--color-primary-subtle)' }}>
                                {staff.details.setup_ok} đạt /{' '}
                                <span style={{ color: staff.details.setup_fail > 0 ? '#DC2626' : '#059669' }}>
                                  {staff.details.setup_fail} fail
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {staff.details.setup_fail === 0 ? (
                                  <span style={{ color: '#059669', fontWeight: 700 }}>Tốt ✓</span>
                                ) : (
                                  <span style={{ color: '#DC2626', fontWeight: 700 }}>Có fail ✗</span>
                                )}
                              </td>
                            </tr>

                            {/* Dòng 4: Lỗi vi phạm */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                4. Lỗi Vi Phạm Thao Tác (Miss mail, xử lý trễ, làm sai)
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p2 ? `${p2.details.violation_count} lần` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 ? `${p1.details.violation_count} lần` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, backgroundColor: 'var(--color-primary-subtle)' }}>
                                <span style={{ color: staff.details.violation_count > 0 ? '#DC2626' : '#059669' }}>
                                  {staff.details.violation_count} lần
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 && staff.details.violation_count < p1.details.violation_count ? (
                                  <span style={{ color: '#059669', fontWeight: 700 }}>Giảm vi phạm ✓</span>
                                ) : p1 && staff.details.violation_count > p1.details.violation_count ? (
                                  <span style={{ color: '#DC2626', fontWeight: 700 }}>Tăng vi phạm ✗</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>Ổn định</span>
                                )}
                              </td>
                            </tr>

                            {/* Dòng 5: Dự án */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                5. Dự Án Được Giao (Trễ deadline ➔ Lỗi trễ)
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p2 ? `${p2.details.project_ok} đúng / ${p2.details.project_late} trễ` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {p1 ? `${p1.details.project_ok} đúng / ${p1.details.project_late} trễ` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, backgroundColor: 'var(--color-primary-subtle)' }}>
                                {staff.details.project_ok} đúng /{' '}
                                <span style={{ color: staff.details.project_late > 0 ? '#D97706' : '#059669' }}>
                                  {staff.details.project_late} trễ
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {staff.details.project_late === 0 ? (
                                  <span style={{ color: '#059669', fontWeight: 700 }}>Đúng hạn ✓</span>
                                ) : (
                                  <span style={{ color: '#D97706', fontWeight: 700 }}>Trễ hạn ✗</span>
                                )}
                              </td>
                            </tr>

                            {/* Dòng Tổng việc */}
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700 }}>TỔNG CÔNG VIỆC THỰC HIỆN</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                                {p2 ? `${p2.total_tasks} việc` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                                {p1 ? `${p1.total_tasks} việc` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)' }}>
                                {staff.total_tasks} việc
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px' }}>
                                {p1 ? (staff.total_tasks >= p1.total_tasks ? `+${staff.total_tasks - p1.total_tasks} việc` : `${staff.total_tasks - p1.total_tasks} việc`) : '—'}
                              </td>
                            </tr>

                            {/* Dòng Tỷ lệ đúng */}
                            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                TỶ LỆ HOÀN THÀNH ĐÚNG CHUẨN (%)
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: p2 && p2.correct_rate >= 80 ? '#059669' : '#DC2626' }}>
                                {p2 ? `${p2.correct_rate}%` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: p1 && p1.correct_rate >= 80 ? '#059669' : '#DC2626' }}>
                                {p1 ? `${p1.correct_rate}%` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: '15px', color: staff.correct_rate >= 80 ? '#059669' : '#DC2626' }}>
                                {staff.correct_rate}%
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                                {p1 ? (
                                  diffRate > 0 ? (
                                    <span style={{ color: '#059669' }}>+{diffRate}% ↑</span>
                                  ) : diffRate < 0 ? (
                                    <span style={{ color: '#DC2626' }}>{diffRate}% ↓</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>0.0%</span>
                                  )
                                ) : '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Danh sách thẻ nhân viên (Layout nhỏ gọn 3 cột x 2 hàng, hiển thị trọn vẹn 6 người trên 1 màn hình) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                {reportData.current_month.staff_summaries
                  .filter((s) => selectedStaffUser === 'ALL' || s.username === selectedStaffUser)
                  .filter((s) => {
                    if (!staffSearchQuery.trim()) return true;
                    const q = staffSearchQuery.trim().toLowerCase();
                    return (
                      s.username.toLowerCase().includes(q) ||
                      (s.full_name && s.full_name.toLowerCase().includes(q))
                    );
                  })
                  .map((staff) => {
                    // Lấy thông tin 2 tháng trước theo đúng thứ tự thời gian: Tháng 7 (p2) -> Tháng 8 (p1) -> Tháng 9 (staff)
                    const p1 = reportData.prev_month_1.staff_summaries.find((x) => x.username === staff.username);
                    const p2 = reportData.prev_month_2.staff_summaries.find((x) => x.username === staff.username);
                    const d = staff.details;
                    const badge = getPerformanceBadge(staff.correct_rate);

                    // Trend vs prev_month_1
                    const diffRate = p1 ? Math.round((staff.correct_rate - p1.correct_rate) * 10) / 10 : 0;
                    const currErr = staff.wrong_tasks + staff.late_tasks;

                    return (
                      <div
                        key={staff.username}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {/* Header Card của nhân viên (Compact) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary-subtle)',
                                color: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '12px',
                                flexShrink: 0,
                              }}
                            >
                              {staff.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {staff.full_name}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                @{staff.username}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '8px',
                                backgroundColor: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                fontSize: '9px',
                                fontWeight: 700,
                              }}
                            >
                              {badge.label}
                            </span>
                            <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
                              <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                                {staff.correct_rate}%
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {staff.correct_tasks}/{staff.total_tasks} việc
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stacked bar chart (Compact) */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                            <span>Tháng {reportData.current_month.label}:</span>
                            <span style={{ fontWeight: 600, color: currErr > 0 ? '#DC2626' : '#059669' }}>
                              {currErr > 0 ? `${currErr} lỗi/trễ` : '100% chuẩn'}
                            </span>
                          </div>
                          {renderStackedBar(staff.correct_tasks, staff.wrong_tasks, staff.late_tasks, staff.total_tasks, 7)}
                        </div>

                        {/* Chi tiết 5 tiêu chí (Compact 2 cột) */}
                        <div
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '10.5px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '3px 6px',
                            lineHeight: 1.25,
                          }}
                        >
                          <div>
                            <strong>1. Memo:</strong> {d.memo_ok} đạt /{' '}
                            <span style={{ color: d.memo_fail > 0 ? '#DC2626' : 'inherit', fontWeight: d.memo_fail > 0 ? 700 : 400 }}>
                              {d.memo_fail} lỗi
                            </span>
                          </div>
                          <div>
                            <strong>2. PIM:</strong> {d.pim_ok} đạt /{' '}
                            <span style={{ color: d.pim_fail > 0 ? '#D97706' : 'inherit', fontWeight: d.pim_fail > 0 ? 700 : 400 }}>
                              {d.pim_fail} trễ
                            </span>
                          </div>
                          <div>
                            <strong>3. Setup:</strong> {d.setup_ok} đạt /{' '}
                            <span style={{ color: d.setup_fail > 0 ? '#DC2626' : 'inherit', fontWeight: d.setup_fail > 0 ? 700 : 400 }}>
                              {d.setup_fail} fail
                            </span>
                          </div>
                          <div>
                            <strong>4. Vi phạm:</strong>{' '}
                            <span style={{ color: d.violation_count > 0 ? '#DC2626' : 'inherit', fontWeight: d.violation_count > 0 ? 700 : 400 }}>
                              {d.violation_count} lần
                            </span>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <strong>5. Dự án:</strong> {d.project_ok} đạt /{' '}
                            <span style={{ color: d.project_late > 0 ? '#D97706' : 'inherit', fontWeight: d.project_late > 0 ? 700 : 400 }}>
                              {d.project_late} trễ
                            </span>
                          </div>
                        </div>

                        {/* So Sánh 3 Tháng (Tháng 7 ➔ 8 ➔ 9 Compact) */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                              3 Tháng (7 ➔ 8 ➔ 9):
                            </span>
                            {p1 && (
                              <span style={{ fontSize: '9.5px', fontWeight: 600, color: diffRate >= 0 ? '#059669' : '#DC2626' }}>
                                {diffRate >= 0 ? `+${diffRate}% ↑` : `${diffRate}% ↓`}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '9.5px' }}>
                            {/* Cột 1: M-2 */}
                            <div style={{ padding: '3px 4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: '8.5px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {reportData.prev_month_2.label}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '11px', color: p2 && p2.correct_rate >= 80 ? '#059669' : '#DC2626' }}>
                                {p2 ? `${p2.correct_rate}%` : '—'}
                              </div>
                              <div style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                                {p2 ? `${p2.total_tasks} việc` : '—'}
                              </div>
                            </div>

                            {/* Cột 2: M-1 */}
                            <div style={{ padding: '3px 4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: '8.5px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {reportData.prev_month_1.label}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '11px', color: p1 && p1.correct_rate >= 80 ? '#059669' : '#DC2626' }}>
                                {p1 ? `${p1.correct_rate}%` : '—'}
                              </div>
                              <div style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                                {p1 ? `${p1.total_tasks} việc` : '—'}
                              </div>
                            </div>

                            {/* Cột 3: M (Đang chọn) */}
                            <div
                              style={{
                                padding: '3px 4px',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--color-primary)',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '8.5px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {reportData.current_month.label}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '11px', color: staff.correct_rate >= 80 ? '#059669' : '#DC2626' }}>
                                {staff.correct_rate}%
                              </div>
                              <div style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                                {staff.total_tasks} việc
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Cấu hình danh sách nhân viên đánh giá */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Cấu Hình Danh Sách Nhân Viên Team App Cần Đánh Giá"
        maxWidth="600px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsConfigModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              {savingConfig ? 'Đang Lưu...' : 'Lưu Danh Sách'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Tích chọn những nhân viên team app mà bạn muốn đưa vào hệ thống tính điểm và báo cáo đánh giá định kỳ hàng tháng:
          </p>

          {/* Ô tìm kiếm nhanh thành viên */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={configSearchTerm}
              onChange={(e) => setConfigSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nhân viên theo tên hoặc username..."
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: '13px',
                color: 'var(--text-primary)',
                width: '100%',
              }}
            />
            {configSearchTerm && (
              <button
                type="button"
                onClick={() => setConfigSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {allAssignees
              .filter((staff) => {
                if (!configSearchTerm.trim()) return true;
                const t = configSearchTerm.trim().toLowerCase();
                return (
                  staff.username.toLowerCase().includes(t) ||
                  (staff.full_name && staff.full_name.toLowerCase().includes(t))
                );
              })
              .map((staff) => {
              const isChecked = configStaffList.includes(staff.username);
              return (
                <label
                  key={staff.username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isChecked ? 'var(--color-primary-subtle)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleStaffInConfig(staff.username)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {staff.full_name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      ({staff.username})
                    </span>
                  </div>
                  {staff.is_app_team && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#DBEAFE',
                        color: '#1D4ED8',
                        fontWeight: 600,
                      }}
                    >
                      Team App
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};
