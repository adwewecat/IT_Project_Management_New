import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  List,
  ListOrdered,
  Link2,
  Table as TableIcon,
  RotateCcw,
  AlertTriangle,
  FileText,
  FileArchive,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { webmailService } from '../../services/webmailService';

interface WebmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialCc?: string;
  initialSubject?: string;
  initialBodyHtml?: string;
  onEmailSent?: () => void;
}

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4MB

export const WebmailComposeModal: React.FC<WebmailComposeModalProps> = ({
  isOpen,
  onClose,
  initialTo = '',
  initialCc = '',
  initialSubject = '',
  initialBodyHtml = '',
  onEmailSent,
}) => {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState(initialCc);
  const [subject, setSubject] = useState(initialSubject);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCc, setShowCc] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load chữ ký & cấu hình CC mặc định khi mở modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setTo(initialTo);
      setSubject(initialSubject);
      setFiles([]);

      // Khởi tạo CC mặc định nếu chưa truyền initialCc
      if (initialCc) {
        setCc(initialCc);
      } else {
        webmailService.getConfig().then((cfg) => {
          if (cfg.default_cc) {
            setCc(cfg.default_cc);
          } else {
            setCc('hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;');
          }
        }).catch(() => {
          setCc('hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;');
        });
      }

      // Tải chữ ký cá nhân hóa của user đang đăng nhập
      webmailService.getSignature().then((sig) => {
        const sigHtml = sig.signature_html || '';

        setTimeout(() => {
          if (editorRef.current) {
            const signatureBlock = sigHtml
              ? `<div class="email-signature-container" style="margin-top: 20px; margin-bottom: 20px;">${sigHtml}</div>`
              : '';

            if (initialBodyHtml) {
              // Trường hợp Reply/Forward: Chữ ký BẮT BUỘC nằm Ở TRÊN phần nội dung cũ!
              // Cấu trúc: [Dòng gõ phản hồi của user] -> [Chữ ký] -> [Khối email cũ]
              editorRef.current.innerHTML = `<p><br></p>${signatureBlock}<div class="quoted-original-email">${initialBodyHtml}</div>`;
            } else {
              // Trường hợp Soạn thư mới hoàn toàn:
              editorRef.current.innerHTML = `<p><br></p>${signatureBlock}`;
            }
            editorRef.current.focus();
          }
        }, 50);
      }).catch((e) => {
        console.error('Không thể nạp chữ ký:', e);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = initialBodyHtml
              ? `<p><br></p><div class="quoted-original-email">${initialBodyHtml}</div>`
              : '<p><br></p>';
            editorRef.current.focus();
          }
        }, 50);
      });
    }
  }, [isOpen, initialTo, initialCc, initialSubject, initialBodyHtml]);

  // Các hàm định dạng văn bản mở rộng (Rich Text Toolbar)
  const formatText = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleHighlight = (color: string) => {
    document.execCommand('hiliteColor', false, color);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleTextColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url && url !== 'https://') {
      document.execCommand('createLink', false, url);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; margin: 8px 0;">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Tiêu đề 1</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Tiêu đề 2</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Tiêu đề 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Dữ liệu 1</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Dữ liệu 2</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Dữ liệu 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">&nbsp;</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">&nbsp;</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">&nbsp;</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
  };

  // Xử lý chọn tệp đính kèm với kiểm tra kích thước tối đa 4MB
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setErrorMessage('');

    // Tính tổng dung lượng hiện tại
    const currentTotal = files.reduce((acc, f) => acc + f.size, 0);
    const addedTotal = newFiles.reduce((acc, f) => acc + f.size, 0);

    // Kiểm tra từng file
    for (const f of newFiles) {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        setErrorMessage(`Tệp "${f.name}" có dung lượng ${(f.size / (1024 * 1024)).toFixed(2)}MB vượt quá giới hạn 4MB cho phép.`);
        return;
      }
    }

    if (currentTotal + addedTotal > MAX_ATTACHMENT_BYTES) {
      setErrorMessage(`Tổng dung lượng các tệp đính kèm (${((currentTotal + addedTotal) / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn tối đa 4MB.`);
      return;
    }

    setFiles([...files, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return <ImageIcon size={14} style={{ color: '#0284C7' }} />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={14} style={{ color: '#16A34A' }} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <FileArchive size={14} style={{ color: '#D97706' }} />;
    return <FileText size={14} style={{ color: '#64748B' }} />;
  };

  // Xử lý dán hình ảnh (clipboard screenshot) trực tiếp vào nội dung thư
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const base64 = loadEvt.target?.result as string;
          if (base64) {
            document.execCommand('insertImage', false, base64);
          }
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // Xử lý chọn và chèn file ảnh từ máy tính vào nội dung thư
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64 = loadEvt.target?.result as string;
      if (base64) {
        if (editorRef.current) {
          editorRef.current.focus();
        }
        document.execCommand('insertImage', false, base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    const toClean = to.trim();
    if (!toClean) {
      setErrorMessage('Vui lòng nhập ít nhất một địa chỉ email nhận (To).');
      return;
    }

    // Kiểm tra định dạng các địa chỉ email To và Cc
    const parseEmails = (str: string) => str.replace(/;/g, ',').split(',').map((s) => s.trim()).filter(Boolean);
    const toList = parseEmails(toClean);
    const ccList = parseEmails(cc.trim());

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const t of toList) {
      if (!emailRegex.test(t)) {
        setErrorMessage(`Địa chỉ email người nhận (To) '${t}' không đúng định dạng. Vui lòng kiểm tra lại.`);
        return;
      }
    }
    for (const c of ccList) {
      if (!emailRegex.test(c)) {
        setErrorMessage(`Địa chỉ email bản sao (Cc) '${c}' không đúng định dạng. Vui lòng kiểm tra lại.`);
        return;
      }
    }

    const editorHtml = editorRef.current?.innerHTML || '';
    if (!editorHtml || editorHtml === '<p><br></p>') {
      setErrorMessage('Vui lòng nhập nội dung thư.');
      return;
    }

    setSending(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('to', toClean);
      formData.append('cc', cc.trim());
      formData.append('subject', subject.trim() || '(Không có chủ đề)');
      formData.append('body_html', editorHtml);

      files.forEach((f) => {
        formData.append('files', f);
      });

      await webmailService.sendEmail(formData);
      if (onEmailSent) onEmailSent();
      onClose();
    } catch (err: any) {
      let msg = 'Lỗi khi gửi email.';
      const status = err.response?.status;
      if (status === 401) {
        msg = 'Phiên làm việc của bạn đã hết hạn (Mã 401). Vui lòng đăng xuất ra và đăng nhập lại hệ thống để tiếp tục gửi email!';
      } else if (status === 413) {
        msg = 'Dung lượng tệp hoặc nội dung email vượt quá giới hạn cho phép của máy chủ web (Mã 413). Vui lòng giảm kích thước tệp!';
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (typeof err.response?.data === 'string' && err.response.data.trim()) {
        const raw = err.response.data;
        const titleMatch = raw.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          msg = `Lỗi máy chủ (${status || 500}): ${titleMatch[1]}`;
        } else {
          msg = `Lỗi máy chủ (${status || 500}): ${raw.replace(/<[^>]+>/g, ' ').slice(0, 200).trim()}`;
        }
      } else if (err.message) {
        msg = `Lỗi gửi mail: ${err.message}. Nếu sự cố tiếp diễn, vui lòng thử đăng xuất ra và đăng nhập lại.`;
      }
      setErrorMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="920px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Soạn Email Trực Tiếp Trên Web
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Gửi từ tài khoản dùng chung <span style={{ fontWeight: 600, color: '#D97706' }}>ss.it.application@ggg.com.vn</span>
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Paperclip size={14} />
            <span>
              {files.length} tệp đính kèm ({((totalBytes) / (1024 * 1024)).toFixed(2)}MB / tối đa 4.0MB)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              isLoading={sending}
              style={{
                backgroundColor: '#D97706',
                borderColor: '#B45309',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                padding: '8px 20px',
              }}
            >
              <Send size={15} />
              <span>Gửi Email Ngay</span>
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
        {errorMessage && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dòng To */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '60px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
            To :
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Nhập địa chỉ email người nhận (phân cách bởi dấu ; hoặc dấu ,)"
              className="input-field"
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '13px' }}
              autoFocus
            />
          </div>
          {!showCc && (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              Hiện CC
            </button>
          )}
        </div>

        {/* Dòng CC: Mặc định prefilled theo yêu cầu người dùng */}
        {showCc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '60px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
              Cc :
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Mặc định: hcm.it.appsupport@ggg.com.vn ; tuan.pham@ggg.com.vn ; (có thể thêm hoặc xóa)"
                className="input-field"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 10px',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              />
            </div>
          </div>
        )}

        {/* Dòng Subject */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '60px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
            Subject :
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Tiêu đề email..."
              className="input-field"
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '13px', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Thanh công cụ định dạng mở rộng (Rich Text Toolbar phong cách Outlook) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px 6px 0 0',
            padding: '5px 8px',
            borderBottom: 'none',
          }}
        >
          {/* Nút Đính kèm file */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm tệp (tối đa 4MB)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid #D97706',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              color: '#D97706',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              marginRight: '6px',
            }}
          >
            <Paperclip size={14} />
            <span>Đính kèm tệp</span>
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          {/* Định dạng cơ bản */}
          <button
            type="button"
            onClick={() => formatText('bold')}
            title="In đậm (Bold)"
            style={toolbarBtnStyle}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('italic')}
            title="In nghiêng (Italic)"
            style={toolbarBtnStyle}
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('underline')}
            title="Gạch chân (Underline)"
            style={toolbarBtnStyle}
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('strikeThrough')}
            title="Gạch ngang chữ"
            style={toolbarBtnStyle}
          >
            <Strikethrough size={14} />
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          {/* Highlight Màu nền */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span title="Highlight vàng" style={{ cursor: 'pointer' }} onClick={() => handleHighlight('#fef08a')}>
              <Highlighter size={14} style={{ color: '#CA8A04' }} />
            </span>
            <span
              onClick={() => handleHighlight('#fef08a')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#fef08a', cursor: 'pointer', border: '1px solid #eab308' }}
              title="Vàng"
            />
            <span
              onClick={() => handleHighlight('#bbf7d0')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#bbf7d0', cursor: 'pointer', border: '1px solid #22c55e' }}
              title="Xanh lá"
            />
            <span
              onClick={() => handleHighlight('#bae6fd')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#bae6fd', cursor: 'pointer', border: '1px solid #0284c7' }}
              title="Xanh dương"
            />
            <span
              onClick={() => handleHighlight('#fbcfe8')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#fbcfe8', cursor: 'pointer', border: '1px solid #db2777' }}
              title="Hồng"
            />
            <span
              onClick={() => handleHighlight('transparent')}
              style={{ fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '2px' }}
              title="Xóa highlight"
            >
              ✕
            </span>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          {/* Màu chữ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Palette size={14} style={{ color: '#D97706' }} />
            <span
              onClick={() => handleTextColor('#DC2626')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#DC2626', cursor: 'pointer' }}
              title="Đỏ"
            />
            <span
              onClick={() => handleTextColor('#2563EB')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#2563EB', cursor: 'pointer' }}
              title="Xanh"
            />
            <span
              onClick={() => handleTextColor('#D97706')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#D97706', cursor: 'pointer' }}
              title="Vàng Golden Gate"
            />
            <span
              onClick={() => handleTextColor('#111827')}
              style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#111827', cursor: 'pointer' }}
              title="Đen"
            />
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          {/* Danh sách & Bảng & Link */}
          <button
            type="button"
            onClick={() => formatText('insertUnorderedList')}
            title="Danh sách gạch đầu dòng"
            style={toolbarBtnStyle}
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('insertOrderedList')}
            title="Danh sách đánh số"
            style={toolbarBtnStyle}
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            onClick={handleInsertTable}
            title="Chèn bảng dữ liệu"
            style={toolbarBtnStyle}
          >
            <TableIcon size={14} />
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            title="Chèn liên kết URL"
            style={toolbarBtnStyle}
          >
            <Link2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            title="Chèn ảnh vào nội dung thư"
            style={toolbarBtnStyle}
          >
            <ImageIcon size={14} />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageFileChange}
          />
          <button
            type="button"
            onClick={() => formatText('removeFormat')}
            title="Xóa định dạng"
            style={toolbarBtnStyle}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Khung Soạn Thảo Chính (Body) */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '0 0 6px 6px',
            backgroundColor: '#FFFFFF',
            color: '#111827',
            minHeight: '260px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '14px',
            boxSizing: 'border-box',
            fontSize: '13.5px',
            lineHeight: 1.5,
          }}
        >
          {/* Vùng gõ nội dung email */}
          <div
            ref={editorRef}
            contentEditable
            onPaste={handleEditorPaste}
            style={{
              outline: 'none',
              minHeight: '160px',
            }}
          />


        </div>

        {/* Danh sách tệp đính kèm đã chọn */}
        {files.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>
              Tệp đính kèm ({files.length}):
            </div>
            {files.map((f, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '12px',
                }}
              >
                {getFileIcon(f.name)}
                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  ({(f.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#EF4444',
                    padding: '0 2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Xóa tệp này"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 6px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
