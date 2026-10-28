import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Plus,
  RefreshCw,
  CheckCheck,
  PenTool,
  Settings,
  Search,
  Paperclip,
  Inbox,
  Send,
  CornerUpLeft,
  CornerUpRight,
  ArrowRight,
  Download,
  Clock,
  ChevronLeft,
  FileText,
  FileArchive,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import { Button } from '../../components/ui/Button';
import {
  webmailService,
  WebmailMessageItem,
  WebmailMessageDetail,
  WebmailAttachment
} from '../../services/webmailService';
import { WebmailComposeModal } from './WebmailComposeModal';
import { WebmailSignatureModal } from './WebmailSignatureModal';
import { WebmailConfigModal } from './WebmailConfigModal';

type FilterTab = 'unread' | 'all' | 'sent';

export const WebmailPage: React.FC = () => {
  const { user } = useAuth();
  const isDungOrSuper = checkIsDungOrSuperAdmin(user);

  // Trạng thái dữ liệu
  const [activeTab, setActiveTab] = useState<FilterTab>('unread');
  const [messages, setMessages] = useState<WebmailMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trạng thái email đang chọn để đọc
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<WebmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Trạng thái mở Modals
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [signatureOpen, setSignatureOpen] = useState<boolean>(false);
  const [configOpen, setConfigOpen] = useState<boolean>(false);

  // Thông số khởi tạo cho Compose (Reply / Forward)
  const [composeInit, setComposeInit] = useState<{
    to?: string;
    cc?: string;
    subject?: string;
    bodyHtml?: string;
  }>({});

  // Mobile navigation state
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);

  // Iframe ref để tự động chỉnh chiều cao nội dung email
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load danh sách email khi chuyển tab hoặc vào trang
  useEffect(() => {
    setSelectedMessageId(null);
    setSelectedDetail(null);
    loadMessages(activeTab);
  }, [activeTab]);

  const loadMessages = async (filter: FilterTab) => {
    setLoadingList(true);
    try {
      // Unread: load all unread messages (backend loops all pages)
      // All: load maximum 50 most recent messages
      // Sent: load maximum 50 most recent sent messages
      const topLimit = filter === 'unread' ? 100 : 50;
      const data = await webmailService.getMessages(filter, searchQuery, topLimit, 0);
      setMessages(data.messages);
      setUnreadCount(data.unread_count);

      // Không tự động chọn thư đầu tiên để đảm bảo user chỉ đánh dấu đã đọc khi thực sự bấm vào thư xem
    } catch (err) {
      console.error('Lỗi khi tải danh sách email:', err);
    } finally {
      setLoadingList(false);
    }
  };

  // Chọn email để đọc chi tiết
  const handleSelectMessage = async (messageId: string) => {
    setSelectedMessageId(messageId);
    setLoadingDetail(true);
    setMobileShowDetail(true);

    try {
      const detail = await webmailService.getMessageDetail(messageId);
      setSelectedDetail(detail);

      // Cập nhật trạng thái đã đọc trong danh sách hiển thị
      setMessages((prev) => {
        const target = prev.find((m) => m.id === messageId);
        if (target && !target.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m));
      });
    } catch (err: any) {
      console.error('Lỗi tải chi tiết thư:', err);
      alert('Không thể tải nội dung email: ' + (err.response?.data?.detail || err.message || 'Lỗi không xác định'));
    } finally {
      setLoadingDetail(false);
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllRead = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đánh dấu TẤT CẢ email chưa đọc là ĐÃ ĐỌC?')) {
      return;
    }
    try {
      await webmailService.markAllAsRead();
      setUnreadCount(0);
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      if (activeTab === 'unread') {
        setMessages([]);
        setSelectedMessageId(null);
        setSelectedDetail(null);
      }
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả email:', err);
      alert('Không thể đánh dấu tất cả email là đã đọc.');
    }
  };

  // Đánh dấu thư đang chọn thành chưa đọc riêng cho tài khoản này
  const handleToggleUnread = async () => {
    if (!selectedMessageId) return;
    try {
      await webmailService.markAsRead(selectedMessageId, false);
      setUnreadCount((c) => c + 1);
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessageId ? { ...m, is_read: false } : m))
      );
      if (selectedDetail) {
        setSelectedDetail({ ...selectedDetail, is_read: false });
      }
    } catch (err) {
      console.error('Lỗi khi đánh dấu chưa đọc:', err);
      alert('Không thể cập nhật trạng thái chưa đọc.');
    }
  };

  // Trả lời thư (Reply)
  const handleReply = (replyAll = false) => {
    if (!selectedDetail) return;
    const to = selectedDetail.sender_email;
    let cc = '';
    if (replyAll && selectedDetail.cc_recipients?.length > 0) {
      cc = selectedDetail.cc_recipients.map((r) => r.email).join('; ');
    }

    const cleanSubj = selectedDetail.subject.startsWith('Re:')
      ? selectedDetail.subject
      : `Re: ${selectedDetail.subject}`;

    const quoteHtml = `
      <p><br></p>
      <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 16px 0;" />
      <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
        <b>Từ:</b> ${selectedDetail.sender_name} &lt;${selectedDetail.sender_email}&gt;<br/>
        <b>Ngày:</b> ${selectedDetail.received_time_vn}<br/>
        <b>Tới:</b> ${selectedDetail.to_recipients.map((r) => `${r.name || r.email} &lt;${r.email}&gt;`).join(', ')}<br/>
        <b>Chủ đề:</b> ${selectedDetail.subject}
      </div>
      <div style="margin-top: 10px; padding-left: 10px; border-left: 2px solid #cbd5e1;">
        ${selectedDetail.body_content}
      </div>
    `;

    setComposeInit({
      to,
      cc,
      subject: cleanSubj,
      bodyHtml: quoteHtml,
    });
    setComposeOpen(true);
  };

  // Chuyển tiếp thư (Forward)
  const handleForward = () => {
    if (!selectedDetail) return;
    const cleanSubj = selectedDetail.subject.startsWith('Fwd:')
      ? selectedDetail.subject
      : `Fwd: ${selectedDetail.subject}`;

    const quoteHtml = `
      <p><br></p>
      <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 16px 0;" />
      <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
        <b>---------- Thư được chuyển tiếp ----------</b><br/>
        <b>Từ:</b> ${selectedDetail.sender_name} &lt;${selectedDetail.sender_email}&gt;<br/>
        <b>Ngày:</b> ${selectedDetail.received_time_vn}<br/>
        <b>Chủ đề:</b> ${selectedDetail.subject}
      </div>
      <div style="margin-top: 10px;">
        ${selectedDetail.body_content}
      </div>
    `;

    setComposeInit({
      to: '',
      cc: '',
      subject: cleanSubj,
      bodyHtml: quoteHtml,
    });
    setComposeOpen(true);
  };

  // Tải file đính kèm
  const handleDownloadAttachment = (att: WebmailAttachment) => {
    if (!selectedMessageId) return;
    webmailService.downloadAttachment(selectedMessageId, att.id, att.name);
  };

  // Phân nhóm email theo mốc thời gian (Hôm nay, Hôm qua, Tuần này, Cũ hơn - phong cách Outlook)
  const groupedMessages = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups: { [key: string]: WebmailMessageItem[] } = {
      'Hôm nay': [],
      'Hôm qua': [],
      'Tuần này': [],
      'Cũ hơn': [],
    };

    const filtered = messages.filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q) ||
        m.sender_email.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q)
      );
    });

    for (const m of filtered) {
      if (!m.received_time_raw) {
        groups['Cũ hơn'].push(m);
        continue;
      }
      const mDate = new Date(m.received_time_raw);
      if (mDate >= today) {
        groups['Hôm nay'].push(m);
      } else if (mDate >= yesterday) {
        groups['Hôm qua'].push(m);
      } else if (mDate >= sevenDaysAgo) {
        groups['Tuần này'].push(m);
      } else {
        groups['Cũ hơn'].push(m);
      }
    }

    return groups;
  }, [messages, searchQuery]);

  // Điều chỉnh chiều cao của iframe theo nội dung HTML bên trong
  useEffect(() => {
    if (iframeRef.current && selectedDetail?.body_content) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  font-size: 13.5px;
                  line-height: 1.5;
                  color: #1e293b;
                  margin: 0;
                  padding: 10px;
                  word-break: break-word;
                }
                img { max-width: 100%; height: auto; }
                table { border-collapse: collapse; max-width: 100%; }
                a { color: #0284c7; text-decoration: underline; }
              </style>
            </head>
            <body>${selectedDetail.body_content}</body>
          </html>
        `);
        doc.close();

        // Tự co giãn chiều cao
        const adjustHeight = () => {
          if (iframeRef.current && doc.body) {
            iframeRef.current.style.height = `${Math.max(doc.body.scrollHeight + 30, 300)}px`;
          }
        };
        setTimeout(adjustHeight, 150);
      }
    }
  }, [selectedDetail]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return <ImageIcon size={16} style={{ color: '#0284C7' }} />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={16} style={{ color: '#16A34A' }} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <FileArchive size={16} style={{ color: '#D97706' }} />;
    return <FileText size={16} style={{ color: '#64748B' }} />;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* ================= 1. THANH CÔNG CỤ ĐỈNH (TOP TOOLBAR) ================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          flexShrink: 0,
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Tiêu đề & Thông tin tài khoản */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)',
            }}
          >
            <Mail size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Hệ Thống Webmail Tập Trung
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  color: '#D97706',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                }}
              >
                ss.it.application@ggg.com.vn
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Đọc thư &amp; soạn gửi email nội bộ trực tiếp trên nền tảng Web IT Project Management
            </div>
          </div>
        </div>

        {/* Các nút hành động chính */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Nút Soạn thư mới */}
          <Button
            variant="primary"
            onClick={() => {
              setComposeInit({});
              setComposeOpen(true);
            }}
            style={{
              backgroundColor: '#D97706',
              borderColor: '#B45309',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              padding: '7px 16px',
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)',
            }}
          >
            <Plus size={16} />
            <span>Soạn Thư Mới</span>
          </Button>

          {/* Làm mới */}
          <Button
            variant="outline"
            onClick={() => loadMessages(activeTab)}
            isLoading={loadingList}
            title="Làm mới danh sách thư"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loadingList ? 'spin' : ''} />
            <span>Làm Mới</span>
          </Button>

          {/* Đánh dấu tất cả đã đọc */}
          {activeTab !== 'sent' && (
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              title="Đánh dấu tất cả email chưa đọc là đã đọc"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCheck size={14} style={{ color: '#10B981' }} />
              <span>Đánh Dấu Tất Cả Đã Đọc</span>
            </Button>
          )}

          {/* Chữ ký của tôi */}
          <Button
            variant="outline"
            onClick={() => setSignatureOpen(true)}
            title="Cài đặt chữ ký cá nhân của bạn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PenTool size={14} style={{ color: '#0284C7' }} />
            <span>Chữ Ký Của Tôi</span>
          </Button>

          {/* Cấu hình hệ thống (Chỉ dung.nguyenanh và Super Admin) */}
          {isDungOrSuper && (
            <Button
              variant="outline"
              onClick={() => setConfigOpen(true)}
              title="Cấu hình hệ thống mail chung & phân quyền"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#D97706',
                color: '#D97706',
              }}
            >
              <Settings size={14} />
              <span>Cấu Hình Hệ Thống</span>
            </Button>
          )}
        </div>
      </div>

      {/* ================= 2. KHU VỰC CHÍNH (SPLIT PANE 2 CỘT) ================= */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* CỘT TRÁI: DANH SÁCH EMAIL (Ẩn trên mobile nếu đang xem chi tiết) */}
        <div
          style={{
            width: '420px',
            minWidth: '320px',
            borderRight: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            display: mobileShowDetail && window.innerWidth < 768 ? 'none' : 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Tab chọn: Chưa đọc / Tất cả / Đã gửi */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              padding: '8px 12px 0 12px',
              gap: '6px',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              style={getTabStyle(activeTab === 'unread')}
            >
              <Inbox size={14} />
              <span>Chưa Đọc</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    marginLeft: '4px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={getTabStyle(activeTab === 'all')}
            >
              <Mail size={14} />
              <span>Tất Cả Thư</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              style={getTabStyle(activeTab === 'sent')}
            >
              <Send size={14} />
              <span>Thư Đã Gửi</span>
            </button>
          </div>

          {/* Thanh tìm kiếm nhanh */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo người gửi, chủ đề, nội dung..."
                className="input-field"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 10px 6px 32px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Danh sách email cuộn độc lập */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '12.5px' }}>Đang tải danh sách email từ máy chủ...</div>
              </div>
            ) : Object.values(groupedMessages).every((items) => items.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                {activeTab === 'sent' ? (
                  <Send size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                ) : (
                  <Inbox size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                )}
                <div style={{ fontSize: '13px', marginTop: '6px' }}>
                  {activeTab === 'unread'
                    ? 'Hộp thư không có email nào chưa đọc.'
                    : activeTab === 'sent'
                    ? 'Chưa có thư đã gửi nào.'
                    : 'Không có email nào trong hộp thư.'}
                </div>
              </div>
            ) : (
              /* Danh sách thư phân nhóm ngày (Outlook style) */
              Object.entries(groupedMessages).map(([groupName, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupName}>
                    {/* Tiêu đề nhóm ngày */}
                    <div
                      style={{
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#D97706',
                        backgroundColor: 'var(--bg-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                    >
                      {groupName} ({items.length})
                    </div>

                    {/* Từng mục email trong nhóm */}
                    {items.map((m) => {
                      const isSelected = selectedMessageId === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleSelectMessage(m.id)}
                          style={{
                            padding: '11px 14px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            backgroundColor: isSelected
                              ? 'rgba(217, 119, 6, 0.08)'
                              : m.is_read || activeTab === 'sent'
                              ? 'var(--bg-card)'
                              : 'rgba(2, 132, 199, 0.05)',
                            borderLeft: isSelected
                              ? '3px solid #D97706'
                              : !m.is_read && activeTab !== 'sent'
                              ? '3px solid #0284C7'
                              : '3px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Dòng 1: Người gửi / Người nhận & Thời gian + Người gửi Webmail */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: activeTab === 'sent' ? '62%' : '75%' }}>
                              {!m.is_read && activeTab !== 'sent' && (
                                <span
                                  style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    backgroundColor: '#0284C7',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span
                                style={{
                                  fontWeight: m.is_read || activeTab === 'sent' ? 600 : 800,
                                  fontSize: '13px',
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m.sender_name}
                              </span>
                            </div>

                            {/* Cột phải: Thời gian & Nhãn người gửi (đối với Thư Đã Gửi) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {m.received_time_vn.split(' ')[1] || m.received_time_vn}
                              </span>
                              {activeTab === 'sent' && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: m.sent_by_user ? '#0284C7' : '#64748B',
                                    backgroundColor: m.sent_by_user ? 'rgba(2, 132, 199, 0.1)' : 'rgba(100, 116, 139, 0.08)',
                                    border: m.sent_by_user ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(100, 116, 139, 0.2)',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    maxWidth: '120px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={m.sent_by_user ? `Email này do tài khoản ${m.sent_by_user} gửi đi từ Webmail` : 'Gửi ngoài Webmail / từ Outlook'}
                                >
                                  {m.sent_by_user ? `👤 ${m.sent_by_user}` : 'Outlook'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dòng 2: Tiêu đề Subject */}
                          <div
                            style={{
                              fontWeight: m.is_read || activeTab === 'sent' ? 500 : 700,
                              fontSize: '12.5px',
                              color: m.is_read || activeTab === 'sent' ? 'var(--text-primary)' : '#0f172a',
                              marginBottom: '3px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.subject}
                          </div>

                          {/* Dòng 3: Preview tóm tắt & Icon đính kèm */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}
                            >
                              {m.preview || '(Không có nội dung xem trước)'}
                            </span>
                            {m.has_attachments && (
                              <Paperclip size={13} style={{ color: '#D97706', flexShrink: 0 }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG ĐỌC EMAIL CHI TIẾT (READING PANE) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: !mobileShowDetail && window.innerWidth < 768 ? 'none' : 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-card)',
            overflow: 'hidden',
          }}
        >
          {loadingDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <RefreshCw size={28} className="spin" style={{ marginBottom: '10px' }} />
              <div>Đang tải nội dung thư chi tiết...</div>
            </div>
          ) : !selectedDetail ? (
            /* Trạng thái chưa chọn thư */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                padding: '30px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <Inbox size={32} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Chọn Một Thư Để Đọc
              </div>
              <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                Nhấp vào danh sách email bên trái để xem đầy đủ nội dung, hình ảnh và tệp đính kèm.
              </div>
            </div>
          ) : (
            /* Nội dung email chi tiết */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Nút quay lại trên mobile */}
              <div
                style={{
                  display: window.innerWidth < 768 ? 'flex' : 'none',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0284C7',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Quay lại danh sách thư</span>
                </button>
              </div>

              {/* Thanh thao tác nhanh trên đỉnh email: Trả lời / Trả lời tất cả / Chuyển tiếp */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  flexShrink: 0,
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeTab !== 'sent' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleReply(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
                      >
                        <CornerUpLeft size={14} />
                        <span>Trả lời</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleReply(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
                      >
                        <CornerUpRight size={14} />
                        <span>Trả lời tất cả</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setComposeInit({
                          to: selectedDetail.to_recipients.map((r) => r.email).join('; '),
                          cc: selectedDetail.cc_recipients?.map((r) => r.email).join('; ') || '',
                          subject: selectedDetail.subject,
                          bodyHtml: selectedDetail.body_content,
                        });
                        setComposeOpen(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
                    >
                      <CornerUpRight size={14} />
                      <span>Gửi lại</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleForward}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
                  >
                    <ArrowRight size={14} />
                    <span>Chuyển tiếp</span>
                  </Button>

                  {activeTab !== 'sent' && (
                    <Button
                      variant="outline"
                      onClick={handleToggleUnread}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
                      title="Đánh dấu thư này là chưa đọc đối với tài khoản của bạn"
                    >
                      <Mail size={14} style={{ color: '#0284C7' }} />
                      <span>Đánh dấu chưa đọc</span>
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeTab === 'sent' && selectedDetail.sent_by_user && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0369A1',
                        backgroundColor: '#E0F2FE',
                        border: '1px solid #BAE6FD',
                        padding: '1px 7px',
                        borderRadius: '4px',
                      }}
                      title={`Tài khoản gửi đi: ${selectedDetail.sent_by_user}`}
                    >
                      👤 {selectedDetail.sent_by_user}
                    </span>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    <span>{activeTab === 'sent' ? 'Đã gửi: ' : 'Đã nhận: '}{selectedDetail.received_time_vn}</span>
                  </div>
                </div>
              </div>

              {/* Tiêu đề & Thông tin người gửi / người nhận */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                {/* Subject Tiêu đề lớn */}
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.3 }}>
                  {selectedDetail.subject}
                </div>

                {/* Sender Card */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: activeTab === 'sent' ? '#0284C7' : '#D97706',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                      flexShrink: 0,
                    }}
                  >
                    {activeTab === 'sent' ? 'B' : (selectedDetail.sender_name.charAt(0).toUpperCase() || 'U')}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {activeTab === 'sent'
                          ? `Từ: Bạn <${selectedDetail.sender_email || 'ss.it.application@ggg.com.vn'}>`
                          : selectedDetail.sender_name}
                      </span>
                      {activeTab !== 'sent' && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          &lt;{selectedDetail.sender_email}&gt;
                        </span>
                      )}
                      {activeTab === 'sent' && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: selectedDetail.sent_by_user ? '#0284C7' : '#64748B',
                            backgroundColor: selectedDetail.sent_by_user ? 'rgba(2, 132, 199, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: selectedDetail.sent_by_user ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid rgba(100, 116, 139, 0.25)',
                          }}
                        >
                          {selectedDetail.sent_by_user
                            ? `Email này do tài khoản [ ${selectedDetail.sent_by_user} ] gửi đi`
                            : 'Gửi trực tiếp từ Outlook'}
                        </span>
                      )}
                    </div>

                    {/* Dòng Tới: */}
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span style={{ fontWeight: 600 }}>Tới: </span>
                      {selectedDetail.to_recipients.map((r, i) => (
                        <span key={i} style={{ marginRight: '6px' }}>
                          {r.name || r.email}{i < selectedDetail.to_recipients.length - 1 ? '; ' : ''}
                        </span>
                      ))}
                    </div>

                    {/* Dòng CC nếu có */}
                    {selectedDetail.cc_recipients?.length > 0 && (
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <span style={{ fontWeight: 600 }}>Cc: </span>
                        {selectedDetail.cc_recipients.map((r, i) => (
                          <span key={i} style={{ marginRight: '6px' }}>
                            {r.name || r.email}{i < selectedDetail.cc_recipients.length - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Khối tệp đính kèm nếu email có file */}
                {selectedDetail.attachments?.length > 0 && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      <Paperclip size={14} style={{ color: '#D97706' }} />
                      <span>Tệp đính kèm ({selectedDetail.attachments.length}):</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedDetail.attachments.map((att) => (
                        <div
                          key={att.id}
                          onClick={() => handleDownloadAttachment(att)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                          title={`Tải xuống: ${att.name}`}
                        >
                          {getFileIcon(att.name)}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {att.name}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                              {(att.size / 1024).toFixed(0)} KB
                            </div>
                          </div>
                          <Download size={14} style={{ color: '#0284C7', marginLeft: '4px' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phần thân email cuộn độc lập */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <iframe
                  ref={iframeRef}
                  title="email-body"
                  style={{
                    width: '100%',
                    border: 'none',
                    minHeight: '400px',
                    display: 'block',
                  }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. CÁC MODALS POPUP ================= */}

      {/* Modal Soạn thư mới */}
      <WebmailComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        initialTo={composeInit.to}
        initialCc={composeInit.cc}
        initialSubject={composeInit.subject}
        initialBodyHtml={composeInit.bodyHtml}
        onEmailSent={() => {
          loadMessages(activeTab);
        }}
      />

      {/* Modal Cài đặt chữ ký của tôi */}
      <WebmailSignatureModal
        isOpen={signatureOpen}
        onClose={() => setSignatureOpen(false)}
      />

      {/* Modal Cấu hình hệ thống (dung.nguyenanh & Super Admin) */}
      <WebmailConfigModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
};

const getTabStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  border: 'none',
  background: 'none',
  borderBottom: active ? '2px solid #D97706' : '2px solid transparent',
  color: active ? '#D97706' : 'var(--text-secondary)',
  fontWeight: active ? 700 : 500,
  fontSize: '12.5px',
  cursor: 'pointer',
});
