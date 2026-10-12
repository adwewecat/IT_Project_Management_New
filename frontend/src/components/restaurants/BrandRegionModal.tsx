import React, { useState, useEffect } from 'react';
import { Layers, MapPin, Plus, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { BrandItem, RegionItem } from '../../types/restaurant';
import {
  getBrands,
  createBrand,
  getRegions,
  createRegion,
} from '../../services/restaurantService';

interface BrandRegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  initialTab?: 'brand' | 'region';
}

export const BrandRegionModal: React.FC<BrandRegionModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  initialTab = 'brand',
}) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'region'>(initialTab);

  // Data lists
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search inside tables
  const [brandSearch, setBrandSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');

  // Form states - Brand
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCode, setNewBrandCode] = useState('');
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);

  // Form states - Region
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionCode, setNewRegionCode] = useState('');
  const [newRegionPlate, setNewRegionPlate] = useState('');
  const [isSubmittingRegion, setIsSubmittingRegion] = useState(false);

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const [brandData, regionData] = await Promise.all([getBrands(), getRegions()]);
      setBrands(brandData || []);
      setRegions(regionData || []);
    } catch (err) {
      console.error('Failed to load brand/region data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Handle Add Brand
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      setErrorMsg('Vui lòng nhập tên thương hiệu.');
      return;
    }

    setIsSubmittingBrand(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const created = await createBrand({
        tenbrand: newBrandName.trim(),
        mabrand: newBrandCode.trim() || undefined,
      });
      setSuccessMsg(`Đã thêm thương hiệu "${created.tenbrand}" thành công!`);
      setNewBrandName('');
      setNewBrandCode('');
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Thêm thương hiệu thất bại.');
    } finally {
      setIsSubmittingBrand(false);
    }
  };

  // Handle Add Region
  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim()) {
      setErrorMsg('Vui lòng nhập tên khu vực / tỉnh thành.');
      return;
    }

    setIsSubmittingRegion(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const created = await createRegion({
        ten_tinhthanh: newRegionName.trim(),
        ma_tinhthanh: newRegionCode.trim() || undefined,
        bienso: newRegionPlate.trim() || undefined,
      });
      setSuccessMsg(`Đã thêm khu vực "${created.ten_tinhthanh}" thành công!`);
      setNewRegionName('');
      setNewRegionCode('');
      setNewRegionPlate('');
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Thêm khu vực thất bại.');
    } finally {
      setIsSubmittingRegion(false);
    }
  };

  // Filtered lists
  const filteredBrands = brands.filter((b) =>
    (b.tenbrand || '').toLowerCase().includes(brandSearch.toLowerCase()) ||
    (b.mabrand || '').toLowerCase().includes(brandSearch.toLowerCase())
  );

  const filteredRegions = regions.filter((r) =>
    (r.ten_tinhthanh || '').toLowerCase().includes(regionSearch.toLowerCase()) ||
    (r.ma_tinhthanh || '').toLowerCase().includes(regionSearch.toLowerCase()) ||
    (r.bienso || '').toLowerCase().includes(regionSearch.toLowerCase())
  );

  const tabButtonStyle = (tab: 'brand' | 'region'): React.CSSProperties => {
    const isActive = activeTab === tab;
    return {
      padding: '8px 18px',
      fontSize: '14px',
      fontWeight: isActive ? 600 : 500,
      color: isActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
      backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
      border: 'none',
      borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all var(--transition-fast)',
    };
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '16px',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quản Lý Danh Mục: Thương Hiệu & Khu Vực"
      maxWidth="820px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '16px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            style={tabButtonStyle('brand')}
            onClick={() => {
              setActiveTab('brand');
              setSuccessMsg(null);
              setErrorMsg(null);
            }}
          >
            <Layers size={16} /> Thương Hiệu ({brands.length})
          </button>
          <button
            type="button"
            style={tabButtonStyle('region')}
            onClick={() => {
              setActiveTab('region');
              setSuccessMsg(null);
              setErrorMsg(null);
            }}
          >
            <MapPin size={16} /> Khu Vực & Tỉnh Thành ({regions.length})
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div style={{ marginBottom: '12px' }}>
            <Alert type="success" message={successMsg} />
          </div>
        )}
        {errorMsg && (
          <div style={{ marginBottom: '12px' }}>
            <Alert type="error" message={errorMsg} />
          </div>
        )}

        {/* TAB 1: THƯƠNG HIỆU */}
        {activeTab === 'brand' && (
          <div>
            {/* Form Thêm Brand */}
            <div style={cardStyle}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={15} /> Thêm Thương Hiệu Mới
              </div>

              <form onSubmit={handleAddBrand}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 140px',
                    gap: '12px',
                    alignItems: 'flex-end',
                  }}
                >
                  <Input
                    label="Tên Thương Hiệu *"
                    placeholder="Ví dụ: K-Pub Special, Pizza 4P..."
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                  />
                  <Input
                    label="Mã Thương Hiệu (tùy chọn)"
                    placeholder="Ví dụ: kpub_special"
                    value={newBrandCode}
                    onChange={(e) => setNewBrandCode(e.target.value)}
                  />
                  <div>
                    <Button
                      variant="primary"
                      leftIcon={<Plus size={15} />}
                      onClick={handleAddBrand}
                      isLoading={isSubmittingBrand}
                      style={{ width: '100%', height: '40px' }}
                    >
                      Thêm Brand
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Bảng Danh Sách Brand */}
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Danh sách thương hiệu hiện có ({filteredBrands.length}/{brands.length})
                </span>
                <div style={{ width: '220px' }}>
                  <Input
                    placeholder="Tìm nhanh thương hiệu..."
                    leftIcon={<Search size={14} />}
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    style={{ height: '34px' }}
                  />
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <th style={{ padding: '8px 12px', width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Tên Thương Hiệu</th>
                      <th style={{ padding: '8px 12px', width: '150px' }}>Mã Brand</th>
                      <th style={{ padding: '8px 12px', width: '100px', textAlign: 'center' }}>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Đang tải danh sách thương hiệu...
                        </td>
                      </tr>
                    ) : filteredBrands.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Không tìm thấy thương hiệu nào.
                        </td>
                      </tr>
                    ) : (
                      filteredBrands.map((b, idx) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {b.tenbrand}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {b.mabrand || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <Badge variant={b.active ? 'success' : 'neutral'}>
                              {b.active ? 'Hoạt động' : 'Tắt'}
                            </Badge>
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

        {/* TAB 2: KHU VỰC (REGION) */}
        {activeTab === 'region' && (
          <div>
            {/* Form Thêm Region */}
            <div style={cardStyle}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={15} /> Thêm Khu Vực / Tỉnh Thành Mới
              </div>

              <form onSubmit={handleAddRegion}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 100px 140px',
                    gap: '12px',
                    alignItems: 'flex-end',
                  }}
                >
                  <Input
                    label="Tên Khu Vực / Tỉnh Thành *"
                    placeholder="Ví dụ: TP. Thủ Đức, Phú Quốc..."
                    value={newRegionName}
                    onChange={(e) => setNewRegionName(e.target.value)}
                  />
                  <Input
                    label="Mã Tỉnh/Thành"
                    placeholder="Ví dụ: TD"
                    value={newRegionCode}
                    onChange={(e) => setNewRegionCode(e.target.value)}
                  />
                  <Input
                    label="Biển Số Xe"
                    placeholder="Ví dụ: 50"
                    value={newRegionPlate}
                    onChange={(e) => setNewRegionPlate(e.target.value)}
                  />
                  <div>
                    <Button
                      variant="primary"
                      leftIcon={<Plus size={15} />}
                      onClick={handleAddRegion}
                      isLoading={isSubmittingRegion}
                      style={{ width: '100%', height: '40px' }}
                    >
                      Thêm Khu Vực
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Bảng Danh Sách Region */}
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Danh sách khu vực hiện có ({filteredRegions.length}/{regions.length})
                </span>
                <div style={{ width: '220px' }}>
                  <Input
                    placeholder="Tìm nhanh khu vực..."
                    leftIcon={<Search size={14} />}
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                    style={{ height: '34px' }}
                  />
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <th style={{ padding: '8px 12px', width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Tên Tỉnh / Thành / Khu Vực</th>
                      <th style={{ padding: '8px 12px', width: '120px' }}>Mã</th>
                      <th style={{ padding: '8px 12px', width: '100px' }}>Biển Số</th>
                      <th style={{ padding: '8px 12px', width: '100px', textAlign: 'center' }}>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Đang tải danh sách khu vực...
                        </td>
                      </tr>
                    ) : filteredRegions.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Không tìm thấy khu vực nào.
                        </td>
                      </tr>
                    ) : (
                      filteredRegions.map((r, idx) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {r.ten_tinhthanh}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {r.ma_tinhthanh || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                            {r.bienso || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <Badge variant={r.active ? 'success' : 'neutral'}>
                              {r.active ? 'Hoạt động' : 'Tắt'}
                            </Badge>
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
      </div>
    </Modal>
  );
};
