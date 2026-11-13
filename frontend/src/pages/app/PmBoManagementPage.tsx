import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Briefcase,
  Code,
  Tag,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  Sparkles,
  Info,
  Printer,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PMSoftwareItem, SoftwareVersionItem, BrandPrintStandardItem } from '../../types/pmBo';
import { pmBoService } from '../../services/pmBoService';
import { PmSoftwareModal } from '../../components/pm-bo/PmSoftwareModal';
import { SoftwareVersionModal } from '../../components/pm-bo/SoftwareVersionModal';
import { BrandPrintStandardModal } from '../../components/pm-bo/BrandPrintStandardModal';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

export const PmBoManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'softwares' | 'versions' | 'print'>('softwares');

  // Tab 1 state: Softwares & PM
  const [softwares, setSoftwares] = useState<PMSoftwareItem[]>([]);
  const [softwareSearch, setSoftwareSearch] = useState('');
  const [loadingSoftwares, setLoadingSoftwares] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<PMSoftwareItem | null>(null);
  const [isSoftwareModalOpen, setIsSoftwareModalOpen] = useState(false);

  // Tab 2 state: Versions
  const [versions, setVersions] = useState<SoftwareVersionItem[]>([]);
  const [versionSearch, setVersionSearch] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SoftwareVersionItem | null>(null);
  const [defaultVersionSoftware, setDefaultVersionSoftware] = useState<string>('KDS');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Tab 3 state: Brand Print Standards
  const [printStandards, setPrintStandards] = useState<BrandPrintStandardItem[]>([]);
  const [printSearch, setPrintSearch] = useState('');
  const [printTypeFilter, setPrintTypeFilter] = useState('ALL');
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState<BrandPrintStandardItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Lightbox for previewing print images
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // =========================================================================
  // Load data
  // =========================================================================
  const loadSoftwares = useCallback(async () => {
    setLoadingSoftwares(true);
    try {
      const data = await pmBoService.getPmSoftwares(softwareSearch);
      setSoftwares(data);
    } catch (err) {
      console.error('Failed to load PM softwares:', err);
    } finally {
      setLoadingSoftwares(false);
    }
  }, [softwareSearch]);

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const data = await pmBoService.getSoftwareVersions(versionSearch);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load software versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  }, [versionSearch]);

  const loadPrintStandards = useCallback(async () => {
    setLoadingPrint(true);
    try {
      const data = await pmBoService.getBrandPrintStandards(printSearch, printTypeFilter);
      setPrintStandards(data);
    } catch (err) {
      console.error('Failed to load print standards:', err);
    } finally {
      setLoadingPrint(false);
    }
  }, [printSearch, printTypeFilter]);

  useEffect(() => {
    if (activeTab === 'softwares') {
      loadSoftwares();
    } else if (activeTab === 'versions') {
      loadVersions();
    } else {
      loadPrintStandards();
    }
  }, [activeTab, loadSoftwares, loadVersions, loadPrintStandards]);

  // =========================================================================
  // Handlers Tab 1: PM Softwares
  // =========================================================================
  const handleOpenAddSoftware = () => {
    setSelectedSoftware(null);
    setIsSoftwareModalOpen(true);
  };

  const handleOpenEditSoftware = (item: PMSoftwareItem) => {
    setSelectedSoftware(item);
    setIsSoftwareModalOpen(true);
  };

  const handleDeleteSoftware = async (item: PMSoftwareItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phần mềm "${item.project_name}" khỏi danh sách?`)) {
      return;
    }
    try {
      await pmBoService.deletePmSoftware(item.id);
      loadSoftwares();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa phần mềm. Vui lòng thử lại!');
    }
  };

  // =========================================================================
  // Handlers Tab 2: Versions
  // =========================================================================
  const handleOpenAddVersion = (softwareName?: string) => {
    setSelectedVersion(null);
    setDefaultVersionSoftware(softwareName || 'KDS');
    setIsVersionModalOpen(true);
  };

  const handleOpenEditVersion = (item: SoftwareVersionItem) => {
    setSelectedVersion(item);
    setIsVersionModalOpen(true);
  };

  const handleDeleteVersion = async (item: SoftwareVersionItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phiên bản của "${item.phan_mem}"?`)) {
      return;
    }
    try {
      await pmBoService.deleteSoftwareVersion(item.id);
      loadVersions();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa phiên bản phần mềm. Vui lòng thử lại!');
    }
  };

  // =========================================================================
  // Handlers Tab 3: Brand Print Standards
  // =========================================================================
  const handleOpenAddPrint = () => {
    setSelectedPrintItem(null);
    setIsPrintModalOpen(true);
  };

  const handleOpenEditPrint = (item: BrandPrintStandardItem) => {
    setSelectedPrintItem(item);
    setIsPrintModalOpen(true);
  };

  const handleDeletePrint = async (item: BrandPrintStandardItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chuẩn hóa in của Brand "${item.brand_name}"?`)) {
      return;
    }
    try {
      await pmBoService.deleteBrandPrintStandard(item.id);
      loadPrintStandards();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa chuẩn hóa in. Vui lòng thử lại!');
    }
  };

  // 5 key software targets
  const KEY_SOFTWARES = ['KDS', 'CO', 'SO', 'GPOS-CO-SO', 'GPOS-KDS'];

  // Map latest version for key softwares
  const keyVersionMap: Record<string, SoftwareVersionItem | undefined> = {};
  KEY_SOFTWARES.forEach((name) => {
    keyVersionMap[name] = versions.find((v) => v.phan_mem.toLowerCase() === name.toLowerCase());
  });

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md, 6px)',
              backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
              color: 'var(--color-primary-hover, #DDA600)',
              border: '1px solid var(--color-primary, #F5B800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Quản Lý PM / BO & Phiên Bản Phần Mềm
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Theo dõi danh mục phần mềm, PM phụ trách, phiên bản KDS / CO / SO và chuẩn hóa in từng Brand
            </p>
          </div>
        </div>

        {/* Tab Buttons (3 Tabs) */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-secondary, #F8F9FA)',
            padding: '3px',
            borderRadius: 'var(--radius-lg, 8px)',
            gap: '4px',
            border: '1px solid var(--border-color, #E5E7EB)',
          }}
        >
          {/* Tab 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('softwares')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md, 6px)',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'softwares' ? 'var(--color-primary, #F5B800)' : 'transparent',
              color: activeTab === 'softwares' ? '#111827' : 'var(--text-secondary)',
              boxShadow: activeTab === 'softwares' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'softwares') {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'softwares') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Briefcase size={15} />
            <span>Phần Mềm & PM Phụ Trách</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'softwares' ? 'rgba(0,0,0,0.12)' : 'var(--bg-secondary)',
                color: activeTab === 'softwares' ? '#111827' : 'var(--text-primary)',
                border: activeTab === 'softwares' ? 'none' : '1px solid var(--border-color)',
                fontWeight: 800,
              }}
            >
              {softwares.length}
            </span>
          </button>

          {/* Tab 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md, 6px)',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'versions' ? 'var(--color-primary, #F5B800)' : 'transparent',
              color: activeTab === 'versions' ? '#111827' : 'var(--text-secondary)',
              boxShadow: activeTab === 'versions' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'versions') {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'versions') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Tag size={15} />
            <span>Phiên Bản (KDS / CO / SO...)</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'versions' ? 'rgba(0,0,0,0.12)' : 'var(--bg-secondary)',
                color: activeTab === 'versions' ? '#111827' : 'var(--text-primary)',
                border: activeTab === 'versions' ? 'none' : '1px solid var(--border-color)',
                fontWeight: 800,
              }}
            >
              {versions.length}
            </span>
          </button>

          {/* Tab 3: Chuẩn Hóa In Từng Brand */}
          <button
            type="button"
            onClick={() => setActiveTab('print')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md, 6px)',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'print' ? 'var(--color-primary, #F5B800)' : 'transparent',
              color: activeTab === 'print' ? '#111827' : 'var(--text-secondary)',
              boxShadow: activeTab === 'print' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'print') {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'print') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Printer size={15} />
            <span>Chuẩn Hóa In Từng Brand</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'print' ? 'rgba(0,0,0,0.12)' : 'var(--bg-secondary)',
                color: activeTab === 'print' ? '#111827' : 'var(--text-primary)',
                border: activeTab === 'print' ? 'none' : '1px solid var(--border-color)',
                fontWeight: 800,
              }}
            >
              {printStandards.length}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: PHẦN MỀM & PM PHỤ TRÁCH */}
      {/* ===================================================================== */}
      {activeTab === 'softwares' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action & Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--bg-card)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ position: 'relative', width: '380px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={softwareSearch}
                onChange={(e) => setSoftwareSearch(e.target.value)}
                placeholder="Tìm tên phần mềm, tên PM, số điện thoại, email..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-color-dark, #D1D5DB)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadSoftwares}
                leftIcon={<RefreshCw size={14} className={loadingSoftwares ? 'animate-spin' : ''} />}
              >
                Làm Mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddSoftware}
                leftIcon={<Plus size={15} />}
              >
                Thêm Phần Mềm & PM
              </Button>
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary, #F8F9FA)', borderBottom: '2px solid var(--border-color, #E5E7EB)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '12px 14px', minWidth: '220px' }}>TÊN PHẦN MỀM PHỤ TRÁCH</th>
                    <th style={{ padding: '12px 14px', minWidth: '180px' }}>PM QUẢN LÝ</th>
                    <th style={{ padding: '12px 14px', minWidth: '140px' }}>SỐ ĐIỆN THOẠI</th>
                    <th style={{ padding: '12px 14px', minWidth: '200px' }}>EMAIL LIÊN HỆ</th>
                    <th style={{ padding: '12px 14px', width: '130px' }}>NGÀY TRIỂN KHAI</th>
                    <th style={{ padding: '12px 14px', minWidth: '180px' }}>GHI CHÚ</th>
                    <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSoftwares ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Đang tải danh sách phần mềm...</div>
                      </td>
                    </tr>
                  ) : softwares.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Info size={28} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                        <div style={{ fontWeight: 600 }}>Không tìm thấy phần mềm nào</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Bấm nút "+ Thêm Phần Mềm & PM" ở trên để tạo mới
                        </div>
                      </td>
                    </tr>
                  ) : (
                    softwares.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-color, #E5E7EB)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F8F9FA)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {index + 1}
                        </td>

                        {/* Tên phần mềm */}
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--bg-secondary, #F8F9FA)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm, 4px)',
                              border: '1px solid var(--border-color, #E5E7EB)',
                            }}
                          >
                            <Code size={14} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
                            <span>{item.project_name}</span>
                          </span>
                        </td>

                        {/* PM quản lý */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                                color: 'var(--color-primary-text, #111827)',
                                border: '1px solid var(--color-primary, #F5B800)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                              }}
                            >
                              {(item.pm_name || item.pm_project || 'PM').slice(0, 1).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.pm_name || (item.pm_project ? item.pm_project.split('/')[0] : '—')}
                            </span>
                          </div>
                        </td>

                        {/* Số điện thoại */}
                        <td style={{ padding: '12px 14px' }}>
                          {item.pm_phone ? (
                            <a
                              href={`tel:${item.pm_phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--color-success-text, #166534)',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                backgroundColor: 'var(--color-success-bg, #F0FDF4)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--color-success-border, #86EFAC)',
                              }}
                            >
                              <Phone size={12} />
                              <span>{item.pm_phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Email */}
                        <td style={{ padding: '12px 14px' }}>
                          {item.pm_email ? (
                            <a
                              href={`mailto:${item.pm_email}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '12px',
                              }}
                            >
                              <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                              <span>{item.pm_email}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Ngày triển khai */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {item.ngay_trienkhai ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                              <span>{formatDateDDMMYYYY(item.ngay_trienkhai, '—')}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Ghi chú */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.note_them || '—'}
                        </td>

                        {/* Thao tác */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSoftware(item)}
                              title="Sửa thông tin"
                              style={{
                                border: '1px solid var(--border-color, #CBD5E1)',
                                background: '#FFFFFF',
                                borderRadius: '4px',
                                padding: '5px',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSoftware(item)}
                              title="Xóa phần mềm"
                              style={{
                                border: '1px solid var(--border-color, #CBD5E1)',
                                background: '#FFFFFF',
                                borderRadius: '4px',
                                padding: '5px',
                                cursor: 'pointer',
                                color: 'var(--color-error, #DC2626)',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PHIÊN BẢN PHẦN MỀM (KDS / CO / SO / GPOS-CO-SO / GPOS-KDS...) */}
      {/* ===================================================================== */}
      {activeTab === 'versions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Highlight Cards for Key Softwares */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <Sparkles size={16} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
              <span>CÁC PHẦN MỀM TRỌNG ĐIỂM VẬN HÀNH NHÀ HÀNG:</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {KEY_SOFTWARES.map((name) => {
                const item = keyVersionMap[name];
                return (
                  <div
                    key={name}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color, #E5E7EB)',
                      borderRadius: 'var(--radius-lg, 8px)',
                      padding: '14px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{name}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddVersion(name)}
                        title={`Cập nhật phiên bản mới cho ${name}`}
                        style={{
                          border: '1px solid var(--border-color, #CBD5E1)',
                          background: 'var(--bg-secondary, #F8F9FA)',
                          color: 'var(--text-primary)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Update
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: item ? '#92400E' : 'var(--text-muted)',
                          backgroundColor: item ? 'var(--color-primary-subtle, #FFFBEA)' : 'var(--bg-secondary, #F8F9FA)',
                          border: item ? '1px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color, #E5E7EB)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {item?.phien_ban || 'Chưa cấu hình'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <Calendar size={12} />
                      <span>Ngày update: <strong>{formatDateDDMMYYYY(item?.ngay_update, '—')}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action & Search Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--bg-card)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ position: 'relative', width: '380px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={versionSearch}
                onChange={(e) => setVersionSearch(e.target.value)}
                placeholder="Tìm phần mềm, version, ghi chú update..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-color-dark, #D1D5DB)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadVersions}
                leftIcon={<RefreshCw size={14} className={loadingVersions ? 'animate-spin' : ''} />}
              >
                Làm Mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenAddVersion()}
                leftIcon={<Plus size={15} />}
              >
                Thêm / Cập Nhật Phiên Bản
              </Button>
            </div>
          </div>

          {/* Versions Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary, #F8F9FA)', borderBottom: '2px solid var(--border-color, #E5E7EB)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '12px 14px', width: '170px' }}>PHẦN MỀM</th>
                    <th style={{ padding: '12px 14px', width: '150px' }}>PHIÊN BẢN (VERSION)</th>
                    <th style={{ padding: '12px 14px', width: '140px' }}>NGÀY UPDATE</th>
                    <th style={{ padding: '12px 14px', minWidth: '260px' }}>NỘI DUNG CẬP NHẬT / CHANGELOG</th>
                    <th style={{ padding: '12px 14px', width: '140px' }}>NGƯỜI CẬP NHẬT</th>
                    <th style={{ padding: '12px 14px', minWidth: '160px' }}>GHI CHÚ</th>
                    <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVersions ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Đang tải danh sách phiên bản phần mềm...</div>
                      </td>
                    </tr>
                  ) : versions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Info size={28} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                        <div style={{ fontWeight: 600 }}>Chưa có bản ghi phiên bản nào</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Bấm nút "+ Thêm / Cập Nhật Phiên Bản" ở trên để ghi nhận phiên bản mới
                        </div>
                      </td>
                    </tr>
                  ) : (
                    versions.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-color, #E5E7EB)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F8F9FA)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {index + 1}
                        </td>

                        {/* Phần mềm */}
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--bg-secondary, #F8F9FA)',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #CBD5E1)',
                            }}
                          >
                            <Code size={14} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
                            <span>{item.phan_mem}</span>
                          </span>
                        </td>

                        {/* Phiên bản (Version) */}
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#92400E',
                              backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-primary, #F5B800)',
                            }}
                          >
                            <Tag size={13} />
                            <span>{item.phien_ban}</span>
                          </span>
                        </td>

                        {/* Ngày Update */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {item.ngay_update ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
                              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                              <span>{formatDateDDMMYYYY(item.ngay_update, '—')}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Nội dung update / Changelog */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {item.noi_dung_update ? (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{item.noi_dung_update}</div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Người cập nhật */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.nguoi_update || '—'}
                        </td>

                        {/* Ghi chú */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.ghi_chu || '—'}
                        </td>

                        {/* Thao tác */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditVersion(item)}
                              title="Sửa thông tin phiên bản"
                              style={{
                                border: '1px solid var(--border-color, #CBD5E1)',
                                background: '#FFFFFF',
                                borderRadius: '4px',
                                padding: '5px',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVersion(item)}
                              title="Xóa phiên bản"
                              style={{
                                border: '1px solid var(--border-color, #CBD5E1)',
                                background: '#FFFFFF',
                                borderRadius: '4px',
                                padding: '5px',
                                cursor: 'pointer',
                                color: 'var(--color-error, #DC2626)',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: CHUẨN HÓA IN TỪNG BRAND (DCORP RK7 & KDS) */}
      {/* ===================================================================== */}
      {activeTab === 'print' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action & Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--bg-card)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={printSearch}
                  onChange={(e) => setPrintSearch(e.target.value)}
                  placeholder="Tìm Brand, tiêu đề, ghi chú in..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--border-color-dark, #D1D5DB)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <select
                value={printTypeFilter}
                onChange={(e) => setPrintTypeFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-color-dark, #D1D5DB)',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">-- Tất Cả Dịch Vụ In --</option>
                <option value="Chuẩn hóa in Dcorp (RK7)">Chuẩn hóa in Dcorp (RK7)</option>
                <option value="Chuẩn hóa in KDS">Chuẩn hóa in KDS</option>
                <option value="Cả hai (Dcorp RK7 & KDS)">Cả hai (Dcorp RK7 & KDS)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadPrintStandards}
                leftIcon={<RefreshCw size={14} className={loadingPrint ? 'animate-spin' : ''} />}
              >
                Làm Mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddPrint}
                leftIcon={<Plus size={15} />}
              >
                Thêm Chuẩn Hóa In Brand
              </Button>
            </div>
          </div>

          {/* Standards Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary, #F8F9FA)', borderBottom: '2px solid var(--border-color, #E5E7EB)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '12px 14px', width: '180px' }}>BRAND (THƯƠNG HIỆU)</th>
                    <th style={{ padding: '12px 14px', width: '220px' }}>DỊCH VỤ CHUẨN HÓA IN</th>
                    <th style={{ padding: '12px 14px', minWidth: '220px' }}>TIÊU ĐỀ QUY CHUẨN</th>
                    <th style={{ padding: '12px 14px', minWidth: '280px' }}>GHI CHÚ CẤU HÌNH / THIẾT LẬP</th>
                    <th style={{ padding: '12px 14px', width: '160px' }}>HÌNH ẢNH MINH HỌA</th>
                    <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPrint ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Đang tải chuẩn hóa in các Brand...</div>
                      </td>
                    </tr>
                  ) : printStandards.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Printer size={28} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                        <div style={{ fontWeight: 600 }}>Chưa có quy chuẩn in nào được ghi nhận</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Bấm nút "+ Thêm Chuẩn Hóa In Brand" ở trên để tạo ghi chú chuẩn hóa in Dcorp RK7 / KDS
                        </div>
                      </td>
                    </tr>
                  ) : (
                    printStandards.map((item, index) => {
                      let itemImages: string[] = [];
                      if (item.images) {
                        try {
                          itemImages = JSON.parse(item.images);
                        } catch {
                          itemImages = [item.images];
                        }
                      }

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--border-color, #E5E7EB)',
                            transition: 'background-color var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F8F9FA)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {index + 1}
                          </td>

                          {/* Brand */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 800,
                                color: '#92400E',
                                backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid var(--color-primary, #F5B800)',
                              }}
                            >
                              <Tag size={13} />
                              <span>{item.brand_name}</span>
                            </span>
                          </td>

                          {/* Dịch vụ in */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-secondary, #F8F9FA)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color, #CBD5E1)',
                              }}
                            >
                              <Printer size={13} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
                              <span>{item.loai_in}</span>
                            </span>
                          </td>

                          {/* Tiêu đề */}
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.tieu_de || '—'}
                          </td>

                          {/* Ghi chú */}
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {item.ghi_chu ? (
                              <div style={{ whiteSpace: 'pre-wrap' }}>{item.ghi_chu}</div>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Hình ảnh */}
                          <td style={{ padding: '12px 14px' }}>
                            {itemImages.length > 0 ? (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {itemImages.map((imgUrl, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    onClick={() => setPreviewImage(imgUrl)}
                                    title="Bấm để phóng to ảnh"
                                    style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      border: '1px solid var(--border-color, #CBD5E1)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <img src={imgUrl} alt="print-standard" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Không có ảnh</span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPrint(item)}
                                title="Sửa chuẩn hóa in"
                                style={{
                                  border: '1px solid var(--border-color, #CBD5E1)',
                                  background: '#FFFFFF',
                                  borderRadius: '4px',
                                  padding: '5px',
                                  cursor: 'pointer',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePrint(item)}
                                title="Xóa chuẩn hóa in"
                                style={{
                                  border: '1px solid var(--border-color, #CBD5E1)',
                                  background: '#FFFFFF',
                                  borderRadius: '4px',
                                  padding: '5px',
                                  cursor: 'pointer',
                                  color: 'var(--color-error, #DC2626)',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
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

      {/* Modals */}
      <PmSoftwareModal
        isOpen={isSoftwareModalOpen}
        onClose={() => setIsSoftwareModalOpen(false)}
        onSuccess={loadSoftwares}
        editItem={selectedSoftware}
      />

      <SoftwareVersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onSuccess={loadVersions}
        editItem={selectedVersion}
        defaultSoftware={defaultVersionSoftware}
      />

      <BrandPrintStandardModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onSuccess={loadPrintStandards}
        editItem={selectedPrintItem}
      />

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            padding: '20px',
          }}
        >
          <img
            src={previewImage}
            alt="full-preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}
    </div>
  );
};
