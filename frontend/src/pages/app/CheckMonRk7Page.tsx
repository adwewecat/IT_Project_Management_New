import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Store,
  Tag
} from 'lucide-react';
import {
  BrandItem,
  SapCheckResponse,
  SelectorCheckResponse,
  BrandMenuResponse
} from '../../types/checkMonRk7';
import { checkMonRk7Service } from '../../services/checkMonRk7Service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { copyToClipboard } from '../../utils/clipboard';

export const CheckMonRk7Page: React.FC = () => {
  // Tab: 'sap' | 'selector' | 'brand'
  const [activeTab, setActiveTab] = useState<'sap' | 'selector' | 'brand'>('sap');

  // Common State
  const [alertInfo, setAlertInfo] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Tab 1: Check SAP -> RK7 State
  const [sapInput, setSapInput] = useState<string>('');
  const [loadingSap, setLoadingSap] = useState<boolean>(false);
  const [sapResult, setSapResult] = useState<SapCheckResponse | null>(null);
  const [sapTableFilter, setSapTableFilter] = useState<string>('');

  // Tab 2: Check Selector State
  const [selectorInput, setSelectorInput] = useState<string>('');
  const [loadingSelector, setLoadingSelector] = useState<boolean>(false);
  const [selectorResult, setSelectorResult] = useState<SelectorCheckResponse | null>(null);
  const [selectorTableFilter, setSelectorTableFilter] = useState<string>('');

  // Tab 3: Brand Menu State
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false);
  const [selectedBrandGuid, setSelectedBrandGuid] = useState<string>('');
  const [brandMenu, setBrandMenu] = useState<BrandMenuResponse | null>(null);
  const [loadingMenu, setLoadingMenu] = useState<boolean>(false);
  const [selectedPosGroup, setSelectedPosGroup] = useState<string>('all');
  const [brandTableFilter, setBrandTableFilter] = useState<string>('');

  // Auto-dismiss alert
  useEffect(() => {
    if (alertInfo) {
      const timer = setTimeout(() => setAlertInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertInfo]);

  // Load brands on mount
  useEffect(() => {
    setLoadingBrands(true);
    checkMonRk7Service.getBrands()
      .then((data) => {
        setBrands(data);
        if (data.length > 0) {
          // Default to Gogi or first brand
          const gogi = data.find(b => b.name === 'GGHCM') || data[0];
          setSelectedBrandGuid(gogi.guid);
        }
      })
      .catch((err: any) => {
        setAlertInfo({
          type: 'error',
          message: err.response?.data?.detail || 'Không thể kết nối danh sách Brand từ máy chủ RK7.'
        });
      })
      .finally(() => setLoadingBrands(false));
  }, []);

  // --- TAB 1 HANDLERS ---
  const handleCheckSap = async () => {
    const rawLines = sapInput.split(/[\r\n,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      setAlertInfo({ type: 'error', message: 'Vui lòng nhập ít nhất 1 mã SAP cần kiểm tra.' });
      return;
    }
    setLoadingSap(true);
    try {
      const res = await checkMonRk7Service.checkSap(rawLines);
      setSapResult(res);
      setAlertInfo({
        type: 'success',
        message: `Đã kiểm tra xong ${res.total_input} mã SAP! Tìm thấy: ${res.found_count} mã, Chưa có trên RK7: ${res.missing_count} mã.`
      });
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi kiểm tra mã SAP trên RK7.'
      });
    } finally {
      setLoadingSap(false);
    }
  };

  const handleExportSap = async () => {
    const rawLines = sapInput.split(/[\r\n,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length === 0) return;
    try {
      await checkMonRk7Service.exportSapCheck(rawLines);
      setAlertInfo({ type: 'success', message: 'Đã xuất file Excel kết quả check SAP thành công!' });
    } catch {
      setAlertInfo({ type: 'error', message: 'Lỗi khi xuất file Excel.' });
    }
  };

  const copyMissingCodes = async (codes: string[]) => {
    const ok = await copyToClipboard(codes.join('\n'));
    if (ok) {
      setAlertInfo({ type: 'success', message: `Đã sao chép ${codes.length} mã SAP chưa có vào bộ nhớ tạm!` });
    }
  };

  const pasteSampleSap = () => {
    setSapInput('60001467\n60002549\n60003033\n60000151\n99999999');
  };

  // Filtered Tab 1 items
  const filteredSapItems = useMemo(() => {
    if (!sapResult) return [];
    if (!sapTableFilter.trim()) return sapResult.items;
    const q = sapTableFilter.toLowerCase();
    return sapResult.items.filter(item =>
      item.sap_code.toLowerCase().includes(q) ||
      (item.ten_mon && item.ten_mon.toLowerCase().includes(q)) ||
      (item.nhom_menu && item.nhom_menu.toLowerCase().includes(q)) ||
      (item.rk7_code && String(item.rk7_code).includes(q))
    );
  }, [sapResult, sapTableFilter]);

  // --- TAB 2 HANDLERS ---
  const handleCheckSelector = async () => {
    const rawLines = selectorInput.split(/[\r\n,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      setAlertInfo({ type: 'error', message: 'Vui lòng nhập ít nhất 1 mã SAP cần kiểm tra.' });
      return;
    }
    setLoadingSelector(true);
    try {
      const res = await checkMonRk7Service.checkSelector(rawLines);
      setSelectorResult(res);
      setAlertInfo({
        type: 'success',
        message: `Đã kiểm tra xong ${res.total_input} mã! Đã gắn Selector POS: ${res.found_count} mã, Chưa gắn POS: ${res.missing_count} mã.`
      });
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi kiểm tra phân nhóm Selector trên RK7.'
      });
    } finally {
      setLoadingSelector(false);
    }
  };

  const handleExportSelector = async () => {
    const rawLines = selectorInput.split(/[\r\n,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length === 0) return;
    try {
      await checkMonRk7Service.exportSelectorCheck(rawLines);
      setAlertInfo({ type: 'success', message: 'Đã xuất file Excel kết quả check Selector POS!' });
    } catch {
      setAlertInfo({ type: 'error', message: 'Lỗi khi xuất file Excel.' });
    }
  };

  // Filtered Tab 2 items
  const filteredSelectorItems = useMemo(() => {
    if (!selectorResult) return [];
    if (!selectorTableFilter.trim()) return selectorResult.items;
    const q = selectorTableFilter.toLowerCase();
    return selectorResult.items.filter(item =>
      (item.sap_code && item.sap_code.toLowerCase().includes(q)) ||
      (item.brand && item.brand.toLowerCase().includes(q)) ||
      (item.nhom_pos && item.nhom_pos.toLowerCase().includes(q)) ||
      (item.ten_mon && item.ten_mon.toLowerCase().includes(q)) ||
      (item.rk7_code && String(item.rk7_code).includes(q))
    );
  }, [selectorResult, selectorTableFilter]);

  // --- TAB 3 HANDLERS ---
  const handleLoadBrandMenu = async (guid?: string) => {
    const targetGuid = guid || selectedBrandGuid;
    if (!targetGuid) return;
    setLoadingMenu(true);
    setSelectedPosGroup('all');
    setBrandTableFilter('');
    try {
      const res = await checkMonRk7Service.getBrandMenu(targetGuid);
      setBrandMenu(res);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi tải thực đơn Brand.'
      });
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleExportBrandMenu = async () => {
    if (!brandMenu || !selectedBrandGuid) return;
    try {
      await checkMonRk7Service.exportBrandMenu(selectedBrandGuid, brandMenu.brand_name);
      setAlertInfo({ type: 'success', message: `Đã xuất file Excel thực đơn Brand ${brandMenu.brand_name}!` });
    } catch {
      setAlertInfo({ type: 'error', message: 'Lỗi khi xuất file Excel thực đơn.' });
    }
  };

  // Pos Groups available for selected brand menu
  const brandPosGroups = useMemo(() => {
    if (!brandMenu) return [];
    const set = new Set<string>();
    brandMenu.items.forEach(i => {
      if (i.nhom_pos) set.add(i.nhom_pos);
    });
    return Array.from(set).sort();
  }, [brandMenu]);

  // Filtered Tab 3 items
  const filteredBrandMenuItems = useMemo(() => {
    if (!brandMenu) return [];
    return brandMenu.items.filter(item => {
      if (selectedPosGroup !== 'all' && item.nhom_pos !== selectedPosGroup) {
        return false;
      }
      if (brandTableFilter.trim()) {
        const q = brandTableFilter.toLowerCase();
        const mSap = item.sap_code && item.sap_code.toLowerCase().includes(q);
        const mName = item.ten_mon && item.ten_mon.toLowerCase().includes(q);
        const mNhom = item.nhom_pos && item.nhom_pos.toLowerCase().includes(q);
        const mCode = item.rk7_code && String(item.rk7_code).includes(q);
        return mSap || mName || mNhom || mCode;
      }
      return true;
    });
  }, [brandMenu, selectedPosGroup, brandTableFilter]);

  return (
    <div style={{ width: '100%' }}>
      {/* Alert toast notification */}
      {alertInfo && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type={alertInfo.type} message={alertInfo.message} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Check Món RK7
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Kiểm tra đồng bộ dữ liệu món từ SAP xuống RK7, phân nhóm Selector POS và bảng giá theo từng Brand
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          fontSize: '12px',
          color: '#10b981',
          fontWeight: 600
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          Kết nối trực tiếp SQL RK7 DCorp ({brands.length} Brands)
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('sap')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'sap' ? '2px solid var(--color-primary, #3b82f6)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'sap' ? 'var(--color-primary, #3b82f6)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Search size={16} />
          1. Kiểm Tra SAP &rarr; RK7
        </button>

        <button
          onClick={() => setActiveTab('selector')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'selector' ? '2px solid var(--color-primary, #3b82f6)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'selector' ? 'var(--color-primary, #3b82f6)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} />
          2. Kiểm Tra Nhóm Selector POS
        </button>

        <button
          onClick={() => {
            setActiveTab('brand');
            if (!brandMenu && selectedBrandGuid) {
              handleLoadBrandMenu(selectedBrandGuid);
            }
          }}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'brand' ? '2px solid var(--color-primary, #3b82f6)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'brand' ? 'var(--color-primary, #3b82f6)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Store size={16} />
          3. Tra Cứu Thực Đơn Theo Brand
        </button>
      </div>

      {/* ========================================================
          TAB 1: KIỂM TRA SAP -> RK7 (ĐÃ ĐẨY XUỐNG CHƯA)
      ======================================================== */}
      {activeTab === 'sap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Nhập danh sách mã SAP cần kiểm tra
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Hệ thống sẽ đối soát với bảng MENUITEMS trên RK7 xem mã đã đồng bộ và đang ở trạng thái nào
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outline" size="sm" onClick={pasteSampleSap}>
                  Dán mã mẫu thử
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSapInput(''); setSapResult(null); }}>
                  Xóa trắng
                </Button>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Nhập hoặc dán các mã SAP vào đây (mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy, khoảng trắng)..."
              value={sapInput}
              onChange={(e) => setSapInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg, #fff)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                marginBottom: '14px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="primary"
                size="md"
                onClick={handleCheckSap}
                disabled={loadingSap || !sapInput.trim()}
              >
                {loadingSap ? (
                  <>
                    <RefreshCw size={15} style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Search size={15} style={{ marginRight: '6px' }} />
                    Kiểm Tra Ngay
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Results section */}
          {sapResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stat overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <Tag size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Tổng Mã SAP Nhập</span>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{sapResult.total_input}</h4>
                  </div>
                </Card>

                <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Đã Đẩy Xuống RK7</span>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{sapResult.found_count}</h4>
                  </div>
                </Card>

                <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <XCircle size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Chưa Có Trên RK7</span>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{sapResult.missing_count}</h4>
                  </div>
                </Card>
              </div>

              {/* Missing SAP Codes Alert Box */}
              {sapResult.missing_codes.length > 0 && (
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
                      <AlertTriangle size={16} />
                      <span>Phát hiện {sapResult.missing_codes.length} mã SAP chưa có trên RK7 (hoặc chưa được đẩy từ SAP xuống):</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyMissingCodes(sapResult.missing_codes)}
                      style={{ fontSize: '12px', padding: '3px 10px' }}
                    >
                      <Copy size={13} style={{ marginRight: '4px' }} />
                      Sao chép mã thiếu
                    </Button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sapResult.missing_codes.map(c => (
                      <span
                        key={c}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: 600
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Table */}
              <Card style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                      Chi Tiết Món Đã Đẩy Xuống RK7 ({filteredSapItems.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Lọc nhanh kết quả..."
                        value={sapTableFilter}
                        onChange={(e) => setSapTableFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg, #fff)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportSap}>
                      <FileSpreadsheet size={15} style={{ marginRight: '6px', color: '#10b981' }} />
                      Xuất File Excel
                    </Button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', width: '60px' }}>STT</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mã SAP</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên Món</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>RK7 IDENT</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>RK7 Code</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ĐVT</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nhóm Menu</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Trạng Thái</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Loại Item</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSapItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Không tìm thấy dòng dữ liệu nào khớp với điều kiện lọc
                          </td>
                        </tr>
                      ) : (
                        filteredSapItems.map((item, idx) => (
                          <tr
                            key={`${item.sap_code}-${item.rk7_ident}-${idx}`}
                            style={{ borderBottom: '1px solid var(--border-color)' }}
                          >
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                              {item.sap_code}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.ten_mon || '-'}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.rk7_ident ?? '-'}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f59e0b' }}>{item.rk7_code ?? '-'}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.don_vi_tinh || '-'}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.nhom_menu || '-'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: item.status_code === 'ĐÃ KÍCH HOẠT' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: item.status_code === 'ĐÃ KÍCH HOẠT' ? '#10b981' : '#ef4444'
                              }}>
                                {item.status_code || 'Không rõ'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{item.item_type || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: KIỂM TRA PHÂN NHÓM SELECTOR POS
      ======================================================== */}
      {activeTab === 'selector' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Nhập danh sách mã SAP kiểm tra phân nhóm Selector POS
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Xem món nằm ở màn hình Brand nào, nhóm POS nào và bảng giá bán đang được cấu hình ra sao
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outline" size="sm" onClick={() => setSelectorInput('60000151\n60001467\n60002549')}>
                  Dán mã mẫu
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectorInput(''); setSelectorResult(null); }}>
                  Xóa trắng
                </Button>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Nhập hoặc dán các mã SAP vào đây..."
              value={selectorInput}
              onChange={(e) => setSelectorInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg, #fff)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                marginBottom: '14px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="primary"
                size="md"
                onClick={handleCheckSelector}
                disabled={loadingSelector || !selectorInput.trim()}
              >
                {loadingSelector ? (
                  <>
                    <RefreshCw size={15} style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Layers size={15} style={{ marginRight: '6px' }} />
                    Kiểm Tra Selector POS
                  </>
                )}
              </Button>
            </div>
          </Card>

          {selectorResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <Tag size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Tổng Mã Nhập</span>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectorResult.total_input}</h4>
                  </div>
                </Card>

                <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Đã Gắn Vào Selector POS</span>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{selectorResult.found_count}</h4>
                  </div>
                </Card>

                <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <XCircle size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Chưa Gắn Selector</span>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{selectorResult.missing_count}</h4>
                  </div>
                </Card>
              </div>

              {/* Missing codes alert */}
              {selectorResult.missing_codes.length > 0 && (
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
                      <AlertTriangle size={16} />
                      <span>Có {selectorResult.missing_codes.length} mã SAP chưa có trong cấu hình Selector POS hoặc chưa gán bảng giá:</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyMissingCodes(selectorResult.missing_codes)}
                      style={{ fontSize: '12px', padding: '3px 10px' }}
                    >
                      <Copy size={13} style={{ marginRight: '4px' }} />
                      Sao chép mã chưa gắn
                    </Button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectorResult.missing_codes.map(c => (
                      <span
                        key={c}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: 600
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector Table */}
              <Card style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Chi Tiết Phân Nhóm POS ({filteredSelectorItems.length})
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Lọc nhanh kết quả..."
                        value={selectorTableFilter}
                        onChange={(e) => setSelectorTableFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg, #fff)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportSelector}>
                      <FileSpreadsheet size={15} style={{ marginRight: '6px', color: '#10b981' }} />
                      Xuất File Excel
                    </Button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', width: '50px' }}>STT</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mã SAP</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Brand</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nhóm POS</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên Món</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ĐVT</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>RK7 Code</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên Đơn Giá</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Giá Bán (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSelectorItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Không có kết quả nào phù hợp
                          </td>
                        </tr>
                      ) : (
                        filteredSelectorItems.map((item, idx) => (
                          <tr
                            key={`${item.sap_code}-${item.item_ident}-${idx}`}
                            style={{ borderBottom: '1px solid var(--border-color)' }}
                          >
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                              {item.sap_code}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                fontWeight: 600,
                                fontSize: '11px'
                              }}>
                                {item.brand}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-secondary)' }}>{item.nhom_pos}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.ten_mon}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.don_vi}</td>
                            <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 600 }}>{item.rk7_code}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>{item.ten_don_gia}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                              {item.gia ? item.gia.toLocaleString('vi-VN') + ' đ' : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: TRA CỨU THỰC ĐƠN THEO BRAND
      ======================================================== */}
      {activeTab === 'brand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Brand Selector Control */}
          <Card style={{ padding: '18px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  Chọn Brand RK7:
                </label>
                <select
                  value={selectedBrandGuid}
                  onChange={(e) => {
                    setSelectedBrandGuid(e.target.value);
                    handleLoadBrandMenu(e.target.value);
                  }}
                  style={{
                    flex: 1,
                    maxWidth: '380px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                  disabled={loadingBrands || loadingMenu}
                >
                  {brands.map(b => (
                    <option key={b.guid} value={b.guid}>
                      {b.display_name} ({b.total_items} món)
                    </option>
                  ))}
                </select>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleLoadBrandMenu()}
                  disabled={loadingMenu}
                >
                  {loadingMenu ? (
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    'Tải Thực Đơn'
                  )}
                </Button>
              </div>

              {brandMenu && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="outline" size="sm" onClick={handleExportBrandMenu}>
                    <FileSpreadsheet size={15} style={{ marginRight: '6px', color: '#10b981' }} />
                    Xuất File Excel Menu
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Menu Table & Filters */}
          {loadingMenu ? (
            <Card style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
              <p style={{ margin: 0 }}>Đang tải toàn bộ dữ liệu thực đơn và bảng giá của Brand...</p>
            </Card>
          ) : brandMenu ? (
            <Card style={{ overflow: 'hidden' }}>
              {/* Filter sub-bar */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Thực Đơn Brand: <span style={{ color: 'var(--color-primary, #3b82f6)' }}>{brandMenu.brand_name}</span>
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981'
                  }}>
                    {filteredBrandMenuItems.length} / {brandMenu.total_items} món
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Nhóm POS Filter */}
                  <select
                    value={selectedPosGroup}
                    onChange={(e) => setSelectedPosGroup(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">Tất cả Nhóm POS ({brandPosGroups.length} nhóm)</option>
                    {brandPosGroups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  {/* Text search */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Tìm món, mã SAP..."
                      value={brandTableFilter}
                      onChange={(e) => setBrandTableFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto', maxHeight: '65vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', width: '50px' }}>STT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mã SAP</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nhóm POS</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên Món</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ĐVT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>RK7 IDENT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>RK7 Code</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên Đơn Giá</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Giá Bán (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrandMenuItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Không có món nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredBrandMenuItems.map((item, idx) => (
                        <tr
                          key={`${item.sap_code}-${item.item_ident}-${idx}`}
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                            {item.sap_code || '-'}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-secondary)',
                              fontSize: '11px',
                              fontWeight: 500
                            }}>
                              {item.nhom_pos}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.ten_mon}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.don_vi}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{item.item_ident}</td>
                          <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 600 }}>{item.rk7_code}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>{item.ten_don_gia}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                            {item.gia ? item.gia.toLocaleString('vi-VN') + ' đ' : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Store size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{ margin: 0 }}>Vui lòng chọn Brand và nhấn "Tải Thực Đơn" để xem chi tiết</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
