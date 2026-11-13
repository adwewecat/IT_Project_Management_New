import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Layers,
  Settings,
  User,
  Eye,
  Filter,
  ClipboardCheck,
  FileSpreadsheet,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Folder,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateInput } from '../../components/ui/DateInput';
import {
  ChecklistRun,
  ChecklistTemplate,
} from '../../types/workChecklist';
import { workChecklistService } from '../../services/workChecklistService';
import { CreateChecklistRunModal } from '../../components/work-checklists/CreateChecklistRunModal';
import { ChecklistRunDetailModal } from '../../components/work-checklists/ChecklistRunDetailModal';
import { ChecklistTemplateModal } from '../../components/work-checklists/ChecklistTemplateModal';
import { ChecklistTemplateItemsModal } from '../../components/work-checklists/ChecklistTemplateItemsModal';
import { checkIsAdmin } from '../../utils/authUtils';

export const WorkChecklistPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user);

  // Mặc định hiển thị tab Checklist Mẫu (3 Cấp)
  const [activeTab, setActiveTab] = useState<'templates' | 'runs'>('templates');

  // --- Runs state ---
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [totalRuns, setTotalRuns] = useState(0);

  // Filters
  const [runsSearch, setRunsSearch] = useState('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<number>(0);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Đang thực hiện');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // --- Templates state ---
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesSearch, setTemplatesSearch] = useState('');

  // Multi-select & Tree expansion for Templates
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<number>>(new Set());
  const [expandedTemplates, setExpandedTemplates] = useState<Record<number, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Import Excel Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Modals state ---
  const [isCreateRunOpen, setIsCreateRunOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [isRunDetailOpen, setIsRunDetailOpen] = useState(false);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);

  const [selectedTemplateForItems, setSelectedTemplateForItems] = useState<ChecklistTemplate | null>(null);
  const [isTemplateItemsOpen, setIsTemplateItemsOpen] = useState(false);

  // Tải danh sách sườn (cho dropdown và quản lý sườn)
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await workChecklistService.getTemplates(templatesSearch);
      setTemplates(data);
    } catch (err) {
      console.error('Lỗi tải danh sách sườn:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Tải danh sách đợt test
  const loadRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await workChecklistService.getRuns({
        search: runsSearch,
        template_id: selectedTemplateFilter || undefined,
        status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        page_size: 50,
      });
      setRuns(res.items);
      setTotalRuns(res.total);
    } catch (err) {
      console.error('Lỗi tải danh sách đợt checklist:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [templatesSearch]);

  useEffect(() => {
    loadRuns();
  }, [runsSearch, selectedTemplateFilter, selectedStatusFilter, fromDate, toDate, page]);

  const handleOpenRunDetail = (runId: number) => {
    setActiveRunId(runId);
    setIsRunDetailOpen(true);
  };

  const handleDeleteRun = async (runId: number) => {
    if (!isAdmin) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa đợt checklist test này?')) return;
    try {
      await workChecklistService.deleteRun(runId);
      loadRuns();
    } catch (err) {
      alert('Không thể xóa đợt checklist.');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!isAdmin) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa sườn checklist này?')) return;
    try {
      await workChecklistService.deleteTemplate(templateId);
      loadTemplates();
    } catch (err) {
      alert('Không thể xóa sườn checklist.');
    }
  };

  const handleOpenManageItems = (tmpl: ChecklistTemplate) => {
    setSelectedTemplateForItems(tmpl);
    setIsTemplateItemsOpen(true);
  };

  // Auto-expand templates on load or search
  useEffect(() => {
    if (templates.length > 0) {
      const expT: Record<number, boolean> = {};
      templates.forEach(t => { expT[t.id] = true; });
      setExpandedTemplates(expT);
    }
  }, [templates]);

  // Selection handlers for templates
  const handleToggleSelectTemplate = (id: number) => {
    setSelectedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllTemplates = () => {
    if (selectedTemplateIds.size === templates.length) {
      setSelectedTemplateIds(new Set());
    } else {
      setSelectedTemplateIds(new Set(templates.map(t => t.id)));
    }
  };

  const handleToggleExpandTemplate = (id: number) => {
    setExpandedTemplates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleExpandGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const handleExpandAll = () => {
    const expT: Record<number, boolean> = {};
    const expG: Record<string, boolean> = {};
    templates.forEach(t => {
      expT[t.id] = true;
      (t.items || []).forEach(it => {
        if (it.nhom) expG[`${t.id}_${it.nhom.trim()}`] = true;
      });
    });
    setExpandedTemplates(expT);
    setExpandedGroups(expG);
  };

  const handleCollapseAll = () => {
    setExpandedTemplates({});
    const expG: Record<string, boolean> = {};
    templates.forEach(t => {
      (t.items || []).forEach(it => {
        if (it.nhom) expG[`${t.id}_${it.nhom.trim()}`] = false;
      });
    });
    setExpandedGroups(expG);
  };

  const handleDownloadSample = async () => {
    try {
      const blob = await workChecklistService.downloadSampleTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mau_Checklist_Mau_3_Cap.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể tải file mẫu Excel.');
    }
  };

  const handleExportTemplates = async () => {
    try {
      const ids = selectedTemplateIds.size > 0 ? Array.from(selectedTemplateIds) : undefined;
      const blob = await workChecklistService.exportTemplatesExcel(ids);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = ids ? `_${ids.length}_mau` : '_tat_ca';
      a.download = `Danh_Sach_Checklist_Mau${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi khi xuất file Excel danh sách mẫu checklist.');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportMessage({ type: 'error', text: 'Vui lòng chọn file Excel để tải lên!' });
      return;
    }
    setIsImporting(true);
    setImportMessage(null);
    try {
      const res = await workChecklistService.importTemplatesExcel(importFile);
      setImportMessage({ type: 'success', text: res.message });
      setImportFile(null);
      await loadTemplates();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportMessage(null);
      }, 1500);
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Lỗi khi nhập file Excel checklist!',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateRunSuccess = (newRunId: number) => {
    loadRuns();
    handleOpenRunDetail(newRunId);
  };

  const handleExportRunsExcel = async () => {
    setIsExporting(true);
    try {
      await workChecklistService.exportRunsExcel({
        search: runsSearch,
        template_id: selectedTemplateFilter || undefined,
        status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
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
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Checklist Các Công Việc
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Quản lý các đợt checklist công việc vận hành, hạ tầng, kiểm thử hệ thống và phân công cho nhân sự
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'templates' ? (
            <>
              {/* Tải file mẫu 3 cột */}
              <Button
                variant="secondary"
                onClick={handleDownloadSample}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#fff',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                }}
                title="Tải file Excel mẫu gồm đúng 3 cột: Mẹ, Cấp 2, Cấp 3"
              >
                <Download size={15} style={{ color: '#2563EB' }} />
                <span>Tải Mẫu Excel</span>
              </Button>

              {/* Import Excel 3 cột */}
              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setImportFile(null);
                    setImportMessage(null);
                    setIsImportModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#fff',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                  }}
                  title="Nhập hàng loạt checklist mẫu từ file Excel 3 cột"
                >
                  <Upload size={15} style={{ color: '#D97706' }} />
                  <span>Import Excel</span>
                </Button>
              )}

              {/* Xuất Excel danh sách mẫu */}
              <Button
                variant="secondary"
                onClick={handleExportTemplates}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#fff',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                }}
                title={selectedTemplateIds.size > 0 ? `Xuất ${selectedTemplateIds.size} mẫu đã chọn` : 'Xuất toàn bộ các mẫu checklist ra Excel'}
              >
                <FileSpreadsheet size={15} style={{ color: '#16A34A' }} />
                <span>{selectedTemplateIds.size > 0 ? `Xuất Excel (${selectedTemplateIds.size})` : 'Xuất Excel'}</span>
              </Button>

              {/* Thêm Sườn Mới - Admin */}
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsTemplateModalOpen(true);
                  }}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#111827',
                    fontWeight: 700,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(245, 184, 0, 0.35)',
                  }}
                >
                  <Plus size={16} />
                  <span>+ Thêm Mẫu Mới</span>
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Nút Xuất Excel Thống Kê Runs */}
              <Button
                variant="secondary"
                onClick={handleExportRunsExcel}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#fff',
                  border: '1px solid #D1D5DB',
                }}
              >
                <FileSpreadsheet size={16} style={{ color: '#16A34A' }} />
                <span>{isExporting ? 'Đang Xuất Excel...' : 'Xuất File Excel'}</span>
              </Button>

              {/* Nút Tạo Đợt Checklist Mới - Admin */}
              {isAdmin && (
                <Button
                  onClick={() => setIsCreateRunOpen(true)}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#111827',
                    fontWeight: 700,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(245, 184, 0, 0.35)',
                  }}
                >
                  <Plus size={16} />
                  <span>+ Tạo Đợt Checklist Mới</span>
                </Button>
              )}
            </>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              if (activeTab === 'runs') loadRuns();
              else loadTemplates();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} />
            <span>Làm Mới</span>
          </Button>
        </div>
      </div>

      {/* Tabs Chuyển đổi: Checklist Mẫu (3 Cấp) & Đợt Kiểm Tra */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--border-color)',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'templates' ? 700 : 500,
            color: activeTab === 'templates' ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'templates' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <Layers size={16} style={{ color: activeTab === 'templates' ? 'var(--color-primary-hover)' : 'inherit' }} />
          <span>Checklist Mẫu - Cây 3 Cấp ({templates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('runs')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'runs' ? 700 : 500,
            color: activeTab === 'runs' ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'runs' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <ListChecks size={16} style={{ color: activeTab === 'runs' ? 'var(--color-primary-hover)' : 'inherit' }} />
          <span>Đợt Kiểm Thử & Thực Hiện ({totalRuns})</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: DANH SÁCH ĐỢT CHECKLIST (RUNS)
          ======================================================== */}
      {activeTab === 'runs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bộ Lọc & Tìm Kiếm & Lọc Thời Gian */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                value={runsSearch}
                onChange={(e) => setRunsSearch(e.target.value)}
                placeholder="Tìm tên đợt, version note, tester..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filter Khoảng Thời Gian */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: '12.5px', color: '#4B5563', fontWeight: 500 }}>Từ:</span>
              <DateInput
                value={fromDate}
                onChange={setFromDate}
                compact
                containerStyle={{ width: '136px' }}
                style={{ height: '32px', fontSize: '12.5px' }}
              />
              <span style={{ fontSize: '12.5px', color: '#4B5563', fontWeight: 500 }}>Đến:</span>
              <DateInput
                value={toDate}
                onChange={setToDate}
                compact
                containerStyle={{ width: '136px' }}
                style={{ height: '32px', fontSize: '12.5px' }}
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#DC2626',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Xóa lọc ngày
                </button>
              )}
            </div>

            {/* Filter Sườn */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} style={{ color: '#6B7280' }} />
              <select
                value={selectedTemplateFilter}
                onChange={(e) => setSelectedTemplateFilter(Number(e.target.value))}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none',
                }}
              >
                <option value={0}>Tất cả sườn</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ten_suon}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Trạng thái */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} style={{ color: '#6B7280' }} />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none',
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đang thực hiện">Đang thực hiện</option>
                <option value="Hoàn thành">Hoàn thành</option>
              </select>
            </div>
          </div>

          {/* Bảng Danh Sách Đợt Checklist */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '12.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px', width: '50px' }}>STT</th>
                    <th style={{ padding: '12px 14px' }}>Tên Đợt Checklist</th>
                    <th style={{ padding: '12px 14px' }}>Sườn Áp Dụng</th>
                    <th style={{ padding: '12px 14px' }}>Version Note</th>
                    <th style={{ padding: '12px 14px' }}>Người Phụ Trách (User App)</th>
                    <th style={{ padding: '12px 14px', minWidth: '140px' }}>Hạn Chót & SLA</th>
                    <th style={{ padding: '12px 14px', minWidth: '150px' }}>Tiến Độ Kiểm Thử</th>
                    <th style={{ padding: '12px 14px' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '140px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRuns ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--color-primary)' }} />
                        <div>Đang tải danh sách đợt checklist...</div>
                      </td>
                    </tr>
                  ) : runs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        Không có đợt checklist nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    runs.map((r, idx) => {
                      const isDone = r.progress_percent === 100 || r.trang_thai === 'Hoàn thành';
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid #F3F4F6',
                            backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleOpenRunDetail(r.id)}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#FAFAFA')}
                        >
                          <td style={{ padding: '12px 14px', color: '#9CA3AF', fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          {/* Tên Đợt */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {r.ten_dot}
                            </div>
                            {r.ghi_chu && (
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {r.ghi_chu}
                              </div>
                            )}
                          </td>

                          {/* Sườn áp dụng */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {r.ten_suon}
                            </span>
                          </td>

                          {/* Version Note */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-primary-subtle)',
                                border: '1px solid var(--color-primary)',
                                color: '#111827',
                                fontWeight: 700,
                                fontSize: '12.5px',
                              }}
                            >
                              {r.version_note || '—'}
                            </span>
                          </td>

                          {/* Người thực hiện (User App) */}
                          <td style={{ padding: '12px 14px', color: '#374151' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={13} style={{ color: '#9CA3AF' }} />
                              <span style={{ fontWeight: 600 }}>{r.nguoi_thuc_hien || '—'}</span>
                            </div>
                          </td>

                          {/* Hạn Chót & SLA */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span
                                  style={{
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    backgroundColor:
                                      r.sla_status === 'OVERDUE' || r.sla_status === 'COMPLETED_LATE'
                                        ? '#FEF2F2'
                                        : r.sla_status === 'WARNING'
                                        ? '#FFFBEA'
                                        : '#F0FDF4',
                                    border:
                                      r.sla_status === 'OVERDUE' || r.sla_status === 'COMPLETED_LATE'
                                        ? '1px solid #FCA5A5'
                                        : r.sla_status === 'WARNING'
                                        ? '1px solid #FCD34D'
                                        : '1px solid #86EFAC',
                                    color:
                                      r.sla_status === 'OVERDUE' || r.sla_status === 'COMPLETED_LATE'
                                        ? '#DC2626'
                                        : r.sla_status === 'WARNING'
                                        ? '#D97706'
                                        : '#16A34A',
                                  }}
                                >
                                  <Clock size={11} />
                                  {r.sla_text || `${r.sla_days || 5} ngày`}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                                {r.han_chot_sla ? (
                                  <span>Hạn: {new Date(r.han_chot_sla).toLocaleDateString('vi-VN')} ({r.sla_days || 5}d)</span>
                                ) : (
                                  <span>SLA: {r.sla_days || 5} ngày</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Tiến độ */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                              <span style={{ fontWeight: 700, color: isDone ? '#16A34A' : 'var(--text-primary)' }}>
                                {r.passed_items}/{r.total_items} mục ({r.progress_percent}%)
                              </span>
                              {r.failed_items > 0 && (
                                <span style={{ color: '#DC2626', fontWeight: 600 }}>{r.failed_items} lỗi</span>
                              )}
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${r.progress_percent}%`,
                                  height: '100%',
                                  backgroundColor: isDone ? '#16A34A' : 'var(--color-primary)',
                                }}
                              />
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                backgroundColor: isDone ? '#F0FDF4' : '#F3F4F6',
                                border: isDone ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                                color: isDone ? '#166534' : '#4B5563',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              ● {r.trang_thai}
                            </span>
                          </td>

                          {/* Thao tác */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenRunDetail(r.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                }}
                              >
                                <Eye size={13} />
                                <span>Checklist</span>
                              </Button>

                              {/* Nút Xóa đợt - CHỈ ADMIN */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRun(r.id)}
                                  style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                  }}
                                  title="Xóa đợt checklist (Admin)"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 1 (MẶC ĐỊNH): QUẢN LÝ CHECKLIST MẪU - CÂY 3 CẤP
          ======================================================== */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action & Search Bar */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              {/* Ô tìm kiếm */}
              <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={templatesSearch}
                  onChange={(e) => setTemplatesSearch(e.target.value)}
                  placeholder="Tìm sườn theo tên, danh mục..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Nút Chọn tất cả */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSelectAllTemplates}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #D1D5DB',
                }}
              >
                {selectedTemplateIds.size === templates.length && templates.length > 0 ? (
                  <CheckSquare size={14} style={{ color: '#2563EB' }} />
                ) : (
                  <Square size={14} style={{ color: '#6B7280' }} />
                )}
                <span>
                  {selectedTemplateIds.size === templates.length && templates.length > 0
                    ? `Bỏ chọn tất cả (${templates.length})`
                    : `Chọn tất cả (${selectedTemplateIds.size}/${templates.length})`}
                </span>
              </Button>

              {/* Nút Mở rộng / Thu gọn toàn bộ cây */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="Mở bung toàn bộ các cấp sườn và nhóm"
                >
                  Mở rộng tất cả
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="Thu gọn cây hiển thị"
                >
                  Thu gọn
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 600 }}>
                {templates.length} mẫu sườn | {templates.reduce((acc, t) => acc + (t.total_items || 0), 0)} việc con
              </span>

              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsTemplateModalOpen(true);
                  }}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#111827',
                    fontWeight: 700,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <Plus size={15} />
                  <span>+ Thêm Sườn Mới</span>
                </Button>
              )}
            </div>
          </div>

          {/* CÂY PHÂN CẤP 3 CẤP (Level 1: Checklist Mẹ -> Level 2: Nhóm Cấp 1 -> Level 3: Danh sách việc) */}
          {loadingTemplates ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--color-primary)' }} />
              <div>Đang tải danh sách sườn checklist...</div>
            </div>
          ) : templates.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #D1D5DB' }}>
              Chưa có sườn checklist nào. Hãy bấm <strong>+ Thêm Sườn Mới</strong> hoặc <strong>Import Excel</strong> để bắt đầu!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map((tmpl) => {
                const items = tmpl.items || [];
                const isExpanded = !!expandedTemplates[tmpl.id];
                const isSelected = selectedTemplateIds.has(tmpl.id);

                // Phân loại mục con thành: Các nhóm (Cấp 2) và Các mục không thuộc nhóm (trực tiếp Cấp 1 -> Cấp 3)
                const groupsMap: { [group: string]: typeof items } = {};
                const directItems: typeof items = [];

                items.forEach((it) => {
                  const grp = it.nhom ? it.nhom.trim() : '';
                  if (grp) {
                    if (!groupsMap[grp]) groupsMap[grp] = [];
                    groupsMap[grp].push(it);
                  } else {
                    directItems.push(it);
                  }
                });

                const groupNames = Object.keys(groupsMap);

                return (
                  <div
                    key={tmpl.id}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #2563EB' : '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* ===== CẤP 1: CHECKLIST MẸ (Tên sườn) ===== */}
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: isSelected ? '#EFF6FF' : '#F9FAFB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
                      }}
                    >
                      {/* Left: Checkbox + Toggle + Title + Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectTemplate(tmpl.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }}
                          title="Chọn mẫu để xuất Excel"
                        />

                        <button
                          type="button"
                          onClick={() => handleToggleExpandTemplate(tmpl.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#4B5563',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-primary-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#92400E',
                            flexShrink: 0,
                          }}
                        >
                          <Layers size={16} />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#111827',
                                wordBreak: 'break-word',
                              }}
                            >
                              {tmpl.ten_suon}
                            </span>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '1px 7px',
                                borderRadius: '10px',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                              }}
                            >
                              {tmpl.danh_muc || 'Vận hành'}
                            </span>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '8px',
                                backgroundColor: '#F3F4F6',
                                color: '#4B5563',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Clock size={10} />
                              <span>SLA {tmpl.sla_days || 5}d</span>
                            </span>

                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                padding: '1px 8px',
                                borderRadius: '12px',
                                backgroundColor: items.length > 0 ? '#ECFDF5' : '#F3F4F6',
                                color: items.length > 0 ? '#065F46' : '#6B7280',
                              }}
                            >
                              {items.length} mục việc
                            </span>

                            {groupNames.length > 0 && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#6B7280',
                                }}
                              >
                                ({groupNames.length} nhóm)
                              </span>
                            )}
                          </div>

                          {tmpl.mo_ta && (
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tmpl.mo_ta}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <Button
                          size="sm"
                          onClick={() => handleOpenManageItems(tmpl)}
                          style={{
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: '#92400E',
                            border: '1px solid var(--color-primary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                          }}
                        >
                          {isAdmin ? <Settings size={13} /> : <Eye size={13} />}
                          <span>{isAdmin ? `Cấu hình mục con (${items.length})` : `Xem mục con (${items.length})`}</span>
                        </Button>

                        {isAdmin && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplate(tmpl);
                                setIsTemplateModalOpen(true);
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#4B5563',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                              title="Sửa thông tin sườn"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#DC2626',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                              title="Xóa sườn"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ===== CÂY CHI TIẾT (CẤP 2 & CẤP 3) ===== */}
                    {isExpanded && (
                      <div style={{ padding: '12px 16px 14px 34px', backgroundColor: '#FFFFFF' }}>
                        {items.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                            Sườn này chưa có công việc con nào.
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenManageItems(tmpl)}
                                style={{
                                  marginLeft: '8px',
                                  color: '#2563EB',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                }}
                              >
                                + Bấm vào đây để thêm mục con
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* NHÓM CẤP 2: Có phân nhóm */}
                            {groupNames.map((groupName) => {
                              const groupKey = `${tmpl.id}_${groupName}`;
                              const isGroupExpanded = expandedGroups[groupKey] !== false;
                              const groupItems = groupsMap[groupName];

                              return (
                                <div
                                  key={groupKey}
                                  style={{
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    backgroundColor: '#FAFAFA',
                                  }}
                                >
                                  {/* CẤP 2 Header */}
                                  <div
                                    onClick={() => handleToggleExpandGroup(groupKey)}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: '#F3F4F6',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      userSelect: 'none',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {isGroupExpanded ? <ChevronDown size={14} color="#4B5563" /> : <ChevronRight size={14} color="#4B5563" />}
                                      <Folder size={15} style={{ color: '#D97706' }} />
                                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                                        {groupName}
                                      </span>
                                    </div>

                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '1px 7px',
                                        borderRadius: '10px',
                                        backgroundColor: '#E5E7EB',
                                        color: '#374151',
                                      }}
                                    >
                                      {groupItems.length} việc
                                    </span>
                                  </div>

                                  {/* CẤP 3: Danh sách việc con bên trong Nhóm Cấp 2 */}
                                  {isGroupExpanded && (
                                    <div style={{ padding: '4px 8px 6px 16px', backgroundColor: '#FFFFFF' }}>
                                      {groupItems.map((it, idx) => (
                                        <div
                                          key={it.id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            borderBottom: idx < groupItems.length - 1 ? '1px dashed #F3F4F6' : 'none',
                                            fontSize: '13px',
                                            gap: '10px',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: '11px', color: '#9CA3AF', width: '24px', flexShrink: 0 }}>
                                              #{it.stt || idx + 1}
                                            </span>
                                            <FileText size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
                                            <span style={{ fontWeight: 500, color: '#1F2937', wordBreak: 'break-word' }}>
                                              {it.tieu_de}
                                            </span>
                                            {it.huong_dan && (
                                              <span
                                                style={{
                                                  fontSize: '11.5px',
                                                  color: '#6B7280',
                                                  fontStyle: 'italic',
                                                  marginLeft: '4px',
                                                }}
                                              >
                                                ({it.huong_dan})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* CẤP 1 ➔ CẤP 3 TRỰC TIẾP (Khi nhóm để trống hoặc không có Cấp 2) */}
                            {directItems.length > 0 && (
                              <div
                                style={{
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  backgroundColor: '#FFFFFF',
                                }}
                              >
                                {groupNames.length > 0 && (
                                  <div
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#F9FAFB',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#6B7280',
                                      borderBottom: '1px solid #E5E7EB',
                                    }}
                                  >
                                    Mục việc trực tiếp (Không phân nhóm) - {directItems.length} việc:
                                  </div>
                                )}

                                <div style={{ padding: '4px 8px 6px 16px' }}>
                                  {directItems.map((it, idx) => (
                                    <div
                                      key={it.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px',
                                        borderBottom: idx < directItems.length - 1 ? '1px dashed #F3F4F6' : 'none',
                                        fontSize: '13px',
                                        gap: '10px',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: '11px', color: '#9CA3AF', width: '24px', flexShrink: 0 }}>
                                          #{it.stt || idx + 1}
                                        </span>
                                        <FileText size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 500, color: '#1F2937', wordBreak: 'break-word' }}>
                                          {it.tieu_de}
                                        </span>
                                        {it.huong_dan && (
                                          <span
                                            style={{
                                              fontSize: '11.5px',
                                              color: '#6B7280',
                                              fontStyle: 'italic',
                                              marginLeft: '4px',
                                            }}
                                          >
                                            ({it.huong_dan})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Tạo Đợt Checklist Mới */}
      <CreateChecklistRunModal
        isOpen={isCreateRunOpen}
        onClose={() => setIsCreateRunOpen(false)}
        onSuccess={handleCreateRunSuccess}
        templates={templates}
      />

      {/* Modal Chi Tiết Thực Hiện Checklist */}
      <ChecklistRunDetailModal
        isOpen={isRunDetailOpen}
        runId={activeRunId}
        onClose={() => setIsRunDetailOpen(false)}
        onRefresh={loadRuns}
      />

      {/* Modal Thêm / Sửa Sườn Checklist */}
      <ChecklistTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSuccess={loadTemplates}
        editItem={editingTemplate}
      />

      {/* Modal Cấu Hình Các Mục Con Của Sườn */}
      <ChecklistTemplateItemsModal
        isOpen={isTemplateItemsOpen}
        template={selectedTemplateForItems}
        onClose={() => setIsTemplateItemsOpen(false)}
        onRefresh={loadTemplates}
        isAdmin={isAdmin}
      />

      {/* Modal Import Excel 3 Cột (Mẹ, Cấp 2, Cấp 3) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsImportModalOpen(false);
            setImportMessage(null);
          }
        }}
        title="Nhập Checklist Mẫu Từ File Excel (3 Cột)"
        maxWidth="540px"
      >
        <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hướng dẫn cấu trúc 3 cột */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#1E40AF',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileSpreadsheet size={16} />
              <span>Quy định định dạng Excel (3 cột chuẩn):</span>
            </div>
            <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
              <li><strong>Cột A (Mẹ):</strong> Tên checklist mẹ / sườn quy trình.</li>
              <li><strong>Cột B (Cấp 2):</strong> Tên nhóm phân loại (nếu để trống, việc sẽ nối trực tiếp Cấp 1 ➔ Cấp 3).</li>
              <li><strong>Cột C (Cấp 3):</strong> Tiêu đề việc con cần thực hiện.</li>
            </ul>
          </div>

          {/* Link tải mẫu */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleDownloadSample}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12.5px',
                color: '#2563EB',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              <Download size={14} />
              <span>Tải file Excel mẫu 3 cột (.xlsx)</span>
            </button>
          </div>

          {/* Upload file box */}
          <div
            style={{
              border: '2px dashed #D1D5DB',
              borderRadius: '8px',
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: '#F9FAFB',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('excel-file-input')?.click()}
          >
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImportFile(e.target.files[0]);
                  setImportMessage(null);
                }
              }}
              style={{ display: 'none' }}
            />
            <Upload size={32} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#374151' }}>
              {importFile ? importFile.name : 'Bấm vào đây để chọn file Excel (.xlsx, .xls)'}
            </div>
            {importFile ? (
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>
                Kích thước: {(importFile.size / 1024).toFixed(1)} KB - Đã sẵn sàng nhập
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                Hỗ trợ định dạng Microsoft Excel (.xlsx, .xls)
              </div>
            )}
          </div>

          {/* Thông báo kết quả */}
          {importMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: importMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: importMessage.type === 'success' ? '#065F46' : '#991B1B',
                border: `1px solid ${importMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {importMessage.text}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportMessage(null);
              }}
              disabled={isImporting}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              disabled={!importFile || isImporting}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#111827',
                fontWeight: 700,
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang nhập dữ liệu...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Bắt Đầu Nhập</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

