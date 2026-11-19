// Bộ helper làm sạch và phân loại nội dung dán (Paste Clipboard) cho trình soạn thảo Webmail

// Tự động tìm các đường dẫn URL dạng text thuần trong phần tử và bọc vào thẻ <a>
export const linkifyElement = (el: HTMLElement): void => {
  try {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.tagName.toLowerCase() !== 'a') {
        textNodes.push(node as Text);
      }
    }

    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    for (const textNode of textNodes) {
      const text = textNode.nodeValue || '';
      if (urlRegex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(
          urlRegex,
          '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #2563EB; text-decoration: underline;">$1</a>'
        );
        textNode.parentNode?.replaceChild(span, textNode);
      }
    }
  } catch (e) {
    console.error('Lỗi linkify:', e);
  }
};

// Chỉ coi plain text là dữ liệu bảng TSV khi có ít nhất 2 dòng chứa Tab thực sự
// và không phải là dòng bullet list của Outlook/Word ("•\t...", "-\t...")
export const isGenuineTsv = (text: string): boolean => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return false;

  const bulletTabPrefix = /^\s*[•●○▪▫◦\-*]\t/;
  const dataTabLines = lines.filter((l) => l.includes('\t') && !bulletTabPrefix.test(l));
  return dataTabLines.length >= 2;
};

// Chuyển đổi dữ liệu bảng tính phân tách bằng tab (TSV) thành bảng HTML sạch đẹp
export const tsvToHtmlTable = (tsvText: string): string => {
  const lines = tsvText.trim().split(/\r?\n/);
  if (lines.length === 0) return '';

  const rowsHtml = lines
    .map((line, rowIndex) => {
      const isHeader = rowIndex === 0;
      const cells = line.split('\t');
      const cellsHtml = cells
        .map((cellText) => {
          const tag = isHeader ? 'th' : 'td';
          const bg = isHeader ? '#F8FAFC' : '#FFFFFF';
          const weight = isHeader ? '600' : 'normal';
          const align = isHeader ? 'center' : 'left';

          let content = cellText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          content = content.replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #2563EB; text-decoration: underline;">$1</a>'
          );

          return `<${tag} style="border: 1px solid #CBD5E1; padding: 8px 12px; background-color: ${bg}; font-weight: ${weight}; text-align: ${align}; vertical-align: top; font-size: 13px; line-height: 1.5; word-break: break-word;">${content || '&nbsp;'}</${tag}>`;
        })
        .join('');

      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  return `<table style="border-collapse: collapse; width: 100%; max-width: 100%; border: 1px solid #CBD5E1; margin: 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #1E293B;"><tbody>${rowsHtml}</tbody></table>`;
};

// Kiểm tra xem HTML chỉ đơn thuần bọc ảnh duy nhất (trường hợp Copy Image từ trình duyệt)
export const isImageOnlyHtml = (rawHtml: string): boolean => {
  if (!rawHtml.trim()) return true;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const text = (doc.body.textContent || '').replace(/\u00a0/g, '').trim();
    const imgs = doc.body.querySelectorAll('img');
    return text.length === 0 && imgs.length > 0;
  } catch {
    return false;
  }
};

// Kiểm tra HTML có phải là bảng thuần (không có văn bản đoạn/danh sách bên ngoài thẻ table) hay không
export const isPureTableHtml = (rawHtml: string): boolean => {
  if (!rawHtml.trim()) return false;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('script, style, link, meta, xml').forEach((el) => el.remove());
    const tables = doc.body.querySelectorAll('table');
    if (tables.length === 0) return false;

    const clone = doc.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('table').forEach((t) => t.remove());
    const outsideText = (clone.textContent || '').replace(/\u00a0/g, '').trim();
    return outsideText.length === 0;
  } catch {
    return false;
  }
};

// Làm sạch và chuẩn hóa bảng HTML từ Excel / Google Sheets
export const sanitizeSpreadsheetHtml = (rawHtml: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    const classBgMap = new Map<string, string>();
    const classAlignMap = new Map<string, string>();
    const classWeightMap = new Map<string, string>();

    doc.querySelectorAll('style').forEach((styleTag) => {
      const cssText = styleTag.textContent || '';
      const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = ruleRegex.exec(cssText)) !== null) {
        const className = match[1];
        const rules = match[2];

        const bgMatch = rules.match(/background(?:-color)?\s*:\s*([^;]+)/i);
        if (bgMatch && bgMatch[1]) {
          const bgVal = bgMatch[1].trim();
          if (bgVal !== 'none' && bgVal !== 'transparent' && bgVal !== 'auto') {
            classBgMap.set(className, bgVal);
          }
        }

        const alignMatch = rules.match(/text-align\s*:\s*([^;]+)/i);
        if (alignMatch && alignMatch[1]) {
          classAlignMap.set(className, alignMatch[1].trim());
        }

        const weightMatch = rules.match(/font-weight\s*:\s*([^;]+)/i);
        if (weightMatch && weightMatch[1]) {
          classWeightMap.set(className, weightMatch[1].trim());
        }
      }
    });

    doc.querySelectorAll('script, style, link, meta, xml').forEach((el) => el.remove());

    const tables = doc.querySelectorAll('table');
    if (tables.length === 0) return '';

    tables.forEach((table) => {
      table.removeAttribute('width');
      table.removeAttribute('height');
      table.removeAttribute('border');
      table.removeAttribute('cellspacing');
      table.removeAttribute('cellpadding');

      table.setAttribute(
        'style',
        'border-collapse: collapse; width: 100%; max-width: 100%; border: 1px solid #CBD5E1; margin: 12px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #1E293B;'
      );

      table.querySelectorAll('col, colgroup').forEach((col) => {
        col.removeAttribute('style');
        col.removeAttribute('width');
      });

      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        row.removeAttribute('height');
        row.removeAttribute('style');

        const isHeaderRow = rowIndex === 0 || row.parentElement?.tagName.toLowerCase() === 'thead';
        const cells = row.querySelectorAll('th, td');

        cells.forEach((cell) => {
          const el = cell as HTMLElement;

          let cellBg = el.style.backgroundColor || el.getAttribute('bgcolor') || '';
          if (!cellBg || cellBg === 'transparent' || cellBg === 'rgba(0, 0, 0, 0)') {
            for (const cls of Array.from(el.classList)) {
              if (classBgMap.has(cls)) {
                cellBg = classBgMap.get(cls)!;
                break;
              }
            }
          }

          if (!cellBg || cellBg === 'transparent' || cellBg === 'rgba(0, 0, 0, 0)') {
            cellBg = isHeaderRow ? '#F8FAFC' : '#FFFFFF';
          }

          let textAlign = el.style.textAlign || '';
          if (!textAlign) {
            for (const cls of Array.from(el.classList)) {
              if (classAlignMap.has(cls)) {
                textAlign = classAlignMap.get(cls)!;
                break;
              }
            }
          }
          if (!textAlign) {
            textAlign = isHeaderRow ? 'center' : 'left';
          }

          let fontWeight = el.style.fontWeight || '';
          if (!fontWeight) {
            for (const cls of Array.from(el.classList)) {
              if (classWeightMap.has(cls)) {
                fontWeight = classWeightMap.get(cls)!;
                break;
              }
            }
          }
          if (!fontWeight) {
            fontWeight = isHeaderRow ? '600' : 'normal';
          }

          el.removeAttribute('width');
          el.removeAttribute('height');
          el.removeAttribute('class');
          el.setAttribute(
            'style',
            `border: 1px solid #CBD5E1; padding: 8px 12px; background-color: ${cellBg}; text-align: ${textAlign}; font-weight: ${fontWeight}; vertical-align: top; font-size: 13px; line-height: 1.5; word-break: break-word;`
          );

          el.querySelectorAll('p, div').forEach((block) => {
            (block as HTMLElement).style.margin = '0 0 4px 0';
            (block as HTMLElement).style.lineHeight = '1.5';
          });

          linkifyElement(el);
        });
      });
    });

    return Array.from(tables)
      .map((t) => t.outerHTML)
      .join('<p><br></p>');
  } catch (err) {
    console.error('Lỗi khi làm sạch HTML bảng:', err);
    return '';
  }
};

// Lọc bỏ thuộc tính CSS rác của Microsoft Office/Dark Mode, chỉ giữ style định dạng sạch
const sanitizeInlineStyleString = (styleAttr: string): string => {
  if (!styleAttr) return '';
  const kept: string[] = [];
  const darkBgRegex = /^(#1[0-9a-f]{5}|#0[0-9a-f]{5}|#2[0-9a-f]{5}|rgb\(\s*[0-3]?\d\s*,\s*[0-3]?\d\s*,\s*[0-3]?\d\s*\))$/i;
  const lightTextRegex = /^(#fff|#ffffff|#f8fafc|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i;

  for (const decl of styleAttr.split(';')) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (!prop || !val) continue;

    // Bỏ toàn bộ thuộc tính mso-* của Microsoft Word/Outlook
    if (prop.startsWith('mso-')) continue;
    // Chỉ giữ các thuộc tính định dạng văn bản & bảng cần thiết
    if (
      ![
        'color',
        'background',
        'background-color',
        'font-weight',
        'font-style',
        'text-decoration',
        'text-align',
        'font-size',
        'line-height',
        'border',
        'border-collapse',
        'padding',
        'vertical-align',
      ].includes(prop)
    ) {
      continue;
    }

    if ((prop === 'background' || prop === 'background-color') && darkBgRegex.test(val)) {
      continue;
    }
    if (prop === 'color' && lightTextRegex.test(val)) {
      continue;
    }

    kept.push(`${prop}: ${val}`);
  }
  return kept.join('; ');
};

// Làm sạch HTML văn bản phong phú dán từ Outlook / Word / Webmail / Teams:
// - Giữ nguyên đoạn văn, dòng trống (<o:p>), in đậm/nghiêng/gạch chân, màu highlight vàng, liên kết, danh sách bullet
// - Không biến đoạn text có bullet tab thành bảng viền đen
// - Giữ cả text xung quanh bảng (nếu email vừa có lời chào vừa có bảng)
export const sanitizeRichEmailHtml = (rawHtml: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // 1. Xóa các thẻ script, style, link, meta, xml
    doc.querySelectorAll('script, style, link, meta, xml').forEach((el) => el.remove());

    // 2. Xóa các comment có điều kiện Office (<!--[if ...]--> ... <!--[endif]-->)
    const commentWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT, null);
    const comments: Comment[] = [];
    let cNode: Node | null;
    while ((cNode = commentWalker.nextNode())) {
      comments.push(cNode as Comment);
    }
    comments.forEach((c) => c.parentNode?.removeChild(c));

    // 3. Xóa các thẻ namespace Office VML/Word rác (v:*, w:*, m:*), xử lý riêng o:p để giữ dòng trống
    const allEls = Array.from(doc.body.querySelectorAll('*'));
    for (const el of allEls) {
      const tagLower = el.tagName.toLowerCase();
      if (tagLower === 'o:p') {
        const parent = el.parentElement;
        const innerText = (el.textContent || '').replace(/\u00a0/g, '').trim();
        if (!innerText && parent) {
          // Kiểm tra xem thẻ cha có còn nội dung nào khác không -> nếu trống thì thay bằng <br> để giữ dòng trống
          const clone = parent.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('o\\:p').forEach((x) => x.remove());
          const siblingText = (clone.textContent || '').replace(/\u00a0/g, '').trim();
          if (!siblingText && !clone.querySelector('img, table, br')) {
            el.replaceWith(doc.createElement('br'));
            continue;
          }
        }
        // Ngược lại chỉ tháo vỏ o:p giữ nội dung bên trong
        const frag = doc.createDocumentFragment();
        while (el.firstChild) {
          frag.appendChild(el.firstChild);
        }
        el.replaceWith(frag);
      } else if (tagLower.includes(':')) {
        el.remove();
      }
    }

    // 4. Chuẩn hóa đoạn văn, danh sách bullet từ Outlook/Word và inline style
    Array.from(doc.body.querySelectorAll('*')).forEach((node) => {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') || '').toLowerCase();
      const rawStyleBeforeClean = (el.getAttribute('style') || '').toLowerCase();
      const isListParagraph = cls.includes('msolistparagraph');
      const isMsoNormal = cls.includes('msonormal');

      const cleanedStyle = sanitizeInlineStyleString(el.getAttribute('style') || '');
      if (cleanedStyle) {
        el.setAttribute('style', cleanedStyle);
      } else {
        el.removeAttribute('style');
      }
      el.removeAttribute('class');

      // Nếu là span bullet của font Symbol/Wingdings ("·") từ Word/Outlook -> đổi sang ký tự bullet chuẩn "• "
      if (tag === 'span') {
        const isBulletFont =
          rawStyleBeforeClean.includes('symbol') || rawStyleBeforeClean.includes('wingdings');
        const txt = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
        if (
          (isBulletFont || el.closest('p')?.getAttribute('style')?.includes('margin-left')) &&
          (txt === '·' || txt === '')
        ) {
          el.textContent = '•\u00a0\u00a0';
        }
      }

      if (isListParagraph) {
        el.style.margin = '0 0 4px 20px';
        el.style.lineHeight = '1.5';
      } else if (isMsoNormal || tag === 'p') {
        el.style.margin = '0 0 6px 0';
        el.style.lineHeight = '1.5';
      } else if (tag === 'ul' || tag === 'ol') {
        el.style.margin = '4px 0 8px 0';
        el.style.paddingLeft = '24px';
        el.style.lineHeight = '1.5';
      } else if (tag === 'li') {
        el.style.margin = '0 0 3px 0';
      } else if (tag === 'img') {
        el.style.maxWidth = '100%';
        el.style.height = 'auto';
      } else if (tag === 'table') {
        const borderAttr = el.getAttribute('border');
        const hasVisibleBorder =
          (borderAttr !== null && borderAttr !== '0' && borderAttr !== '') ||
          el.querySelectorAll('th').length > 0 ||
          Array.from(el.querySelectorAll('td, th')).some((cell) => {
            const b = (cell as HTMLElement).style.border;
            return b && !/none|0px/i.test(b);
          });

        el.removeAttribute('width');
        el.removeAttribute('height');
        el.style.borderCollapse = 'collapse';
        el.style.maxWidth = '100%';
        el.style.margin = '8px 0';

        if (hasVisibleBorder) {
          el.querySelectorAll('th, td').forEach((cell) => {
            const cEl = cell as HTMLElement;
            cEl.removeAttribute('width');
            cEl.removeAttribute('height');
            if (!cEl.style.border) cEl.style.border = '1px solid #CBD5E1';
            if (!cEl.style.padding) cEl.style.padding = '6px 10px';
            cEl.style.verticalAlign = 'top';
          });
        } else {
          el.querySelectorAll('th, td').forEach((cell) => {
            const cEl = cell as HTMLElement;
            cEl.removeAttribute('width');
            cEl.removeAttribute('height');
          });
        }
      }
    });

    linkifyElement(doc.body);
    return doc.body.innerHTML;
  } catch (err) {
    console.error('Lỗi khi làm sạch HTML văn bản dán:', err);
    return '';
  }
};

export type PasteResolution =
  | { action: 'ATTACH_FILES' }
  | { action: 'INSERT_IMAGES' }
  | { action: 'INSERT_HTML'; html: string }
  | { action: 'INSERT_TEXT'; text: string }
  | { action: 'NATIVE' };

export const resolveEditorPaste = ({
  htmlData,
  textData,
  imageFilesCount,
  nonImageFilesCount,
}: {
  htmlData: string;
  textData: string;
  imageFilesCount: number;
  nonImageFilesCount: number;
}): PasteResolution => {
  const hasTableHtml = /<table[\s>]/i.test(htmlData) || /<(tr|td|th)[\s>]/i.test(htmlData);
  const hasSpreadsheetMarker =
    /office:excel|ProgId="Excel\.Sheet"|urn:schemas-microsoft-com:office:excel|google-sheets-html-origin/i.test(
      htmlData
    );

  // 1. Copy file từ Windows Explorer (không phải text/bảng) -> đính kèm tệp
  if (nonImageFilesCount > 0 && !hasSpreadsheetMarker && !hasTableHtml) {
    return { action: 'ATTACH_FILES' };
  }

  // 2. Copy vùng bảng tính từ Excel / Google Sheets hoặc bảng HTML thuần hoặc plain TSV nhiều dòng
  const isPureSpreadsheet =
    hasSpreadsheetMarker ||
    (hasTableHtml && isPureTableHtml(htmlData)) ||
    (!htmlData.trim() && isGenuineTsv(textData));

  if (isPureSpreadsheet) {
    let cleanTableHtml = '';
    if (hasTableHtml || hasSpreadsheetMarker) {
      cleanTableHtml = sanitizeSpreadsheetHtml(htmlData);
    }
    if (!cleanTableHtml && isGenuineTsv(textData)) {
      cleanTableHtml = tsvToHtmlTable(textData);
    }
    if (cleanTableHtml) {
      return { action: 'INSERT_HTML', html: `${cleanTableHtml}<p><br></p>` };
    }
    if (textData) {
      return { action: 'INSERT_TEXT', text: textData };
    }
  }

  // 3. Dán ảnh thuần (chụp màn hình Win+Shift+S, PrtScn, Copy Image)
  if (imageFilesCount > 0 && !textData.trim() && isImageOnlyHtml(htmlData)) {
    return { action: 'INSERT_IMAGES' };
  }

  // 4. Dán nội dung email/văn bản có định dạng từ Outlook / Word / Web (kể cả có bullet "•\t" hoặc mixed table)
  if (htmlData.trim()) {
    const cleanRich = sanitizeRichEmailHtml(htmlData);
    if (cleanRich) {
      return { action: 'INSERT_HTML', html: cleanRich };
    }
  }

  // 5. Văn bản thuần tự nhiên -> để trình duyệt dán mặc định
  return { action: 'NATIVE' };
};
