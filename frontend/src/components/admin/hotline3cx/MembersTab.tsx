import React from 'react';
import {
  CheckCircle2,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  Hotline3cxMember,
  Hotline3cxMemberCreate,
} from '../../../types/hotline3cxAuto';
import { Button } from '../../ui/Button';

export interface MembersTabProps {
  members: Hotline3cxMember[];
  loadingMembers: boolean;
  savingMember: boolean;
  editingMemberId: number | null;
  editingMemberForm: Partial<Hotline3cxMember>;
  newMemberForm: Hotline3cxMemberCreate;
  onNewMemberFormChange: React.Dispatch<React.SetStateAction<Hotline3cxMemberCreate>>;
  onEditingMemberFormChange: React.Dispatch<React.SetStateAction<Partial<Hotline3cxMember>>>;
  onCreateMember: (e: React.FormEvent) => void;
  onStartEditMember: (m: Hotline3cxMember) => void;
  onCancelEditMember: () => void;
  onSaveEditMember: (id: number) => void;
  onDeleteMember: (id: number, name: string) => void;
  onToggleMemberActive: (m: Hotline3cxMember) => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  loadingMembers,
  savingMember,
  editingMemberId,
  editingMemberForm,
  newMemberForm,
  onNewMemberFormChange,
  onEditingMemberFormChange,
  onCreateMember,
  onStartEditMember,
  onCancelEditMember,
  onSaveEditMember,
  onDeleteMember,
  onToggleMemberActive,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Form thêm mới thành viên */}
      <form
        onSubmit={onCreateMember}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--bg-primary)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Line 3CX (Ext) *
          </label>
          <input
            type="text"
            placeholder="VD: 8740"
            value={newMemberForm.ext_line}
            onChange={(e) =>
              onNewMemberFormChange((prev) => ({ ...prev, ext_line: e.target.value }))
            }
            style={{
              width: '110px',
              padding: '6px 8px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '180px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Họ và Tên Nhân Sự *
          </label>
          <input
            type="text"
            placeholder="VD: NGUYEN VAN A"
            value={newMemberForm.full_name}
            onChange={(e) =>
              onNewMemberFormChange((prev) => ({ ...prev, full_name: e.target.value }))
            }
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '160px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Phòng Ban
          </label>
          <input
            type="text"
            placeholder="HCM IT DEPT"
            value={newMemberForm.department}
            onChange={(e) =>
              onNewMemberFormChange((prev) => ({ ...prev, department: e.target.value }))
            }
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '80px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Thứ Tự
          </label>
          <input
            type="number"
            value={newMemberForm.sort_order}
            onChange={(e) =>
              onNewMemberFormChange((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
            }
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '16px' }}>
          <Button
            type="submit"
            variant="primary"
            disabled={savingMember}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {savingMember ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Plus size={14} />
            )}
            <span>Thêm Thành Viên</span>
          </Button>
        </div>
      </form>

      {/* Bảng danh sách thành viên */}
      <div
        style={{
          maxHeight: '52vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        {loadingMembers ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '40px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
            }}
          >
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Đang tải danh sách nhân sự...</span>
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-color)',
                }}
              >
                <th style={{ padding: '10px 12px', width: '80px', fontWeight: 700 }}>
                  Thứ Tự
                </th>
                <th style={{ padding: '10px 12px', width: '120px', fontWeight: 700 }}>
                  Số Máy Nhánh
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Họ và Tên</th>
                <th style={{ padding: '10px 12px', width: '180px', fontWeight: 700 }}>
                  Phòng Ban
                </th>
                <th style={{ padding: '10px 12px', width: '130px', fontWeight: 700 }}>
                  Trạng Thái
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    width: '120px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isEditing = editingMemberId === m.id;
                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      opacity: m.is_active ? 1 : 0.6,
                    }}
                  >
                    {/* Thứ tự */}
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editingMemberForm.sort_order ?? m.sort_order}
                          onChange={(e) =>
                            onEditingMemberFormChange((prev) => ({
                              ...prev,
                              sort_order: Number(e.target.value),
                            }))
                          }
                          style={{
                            width: '60px',
                            padding: '4px 6px',
                            fontSize: '11.5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{m.sort_order}</span>
                      )}
                    </td>

                    {/* Máy nhánh */}
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingMemberForm.ext_line ?? m.ext_line}
                          onChange={(e) =>
                            onEditingMemberFormChange((prev) => ({
                              ...prev,
                              ext_line: e.target.value,
                            }))
                          }
                          style={{
                            width: '90px',
                            padding: '4px 6px',
                            fontSize: '11.5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#2563eb',
                          }}
                        >
                          {m.ext_line}
                        </span>
                      )}
                    </td>

                    {/* Họ tên */}
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingMemberForm.full_name ?? m.full_name}
                          onChange={(e) =>
                            onEditingMemberFormChange((prev) => ({
                              ...prev,
                              full_name: e.target.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            fontSize: '11.5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {m.full_name}
                        </span>
                      )}
                    </td>

                    {/* Phòng ban */}
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingMemberForm.department ?? m.department}
                          onChange={(e) =>
                            onEditingMemberFormChange((prev) => ({
                              ...prev,
                              department: e.target.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            fontSize: '11.5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {m.department || '—'}
                        </span>
                      )}
                    </td>

                    {/* Trạng thái hoạt động */}
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editingMemberForm.is_active ?? m.is_active}
                            onChange={(e) =>
                              onEditingMemberFormChange((prev) => ({
                                ...prev,
                                is_active: e.target.checked,
                              }))
                            }
                          />
                          <span style={{ fontSize: '11.5px' }}>Đang hoạt động</span>
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleMemberActive(m)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: m.is_active
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            color: m.is_active ? '#059669' : '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {m.is_active ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Hoạt động</span>
                            </>
                          ) : (
                            <>
                              <X size={12} />
                              <span>Tạm tắt</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Thao tác Sửa / Xóa */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => onSaveEditMember(m.id)}
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#2563eb',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEditMember}
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => onStartEditMember(m)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMember(m.id, m.full_name)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Xóa nhân sự"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
