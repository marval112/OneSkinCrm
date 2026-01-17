/**
 * Converts an array of objects to an HTML table string.
 * This format can be opened by Excel.
 * @param data The array of objects to convert.
 * @returns The HTML table string.
 */
import { getBrandName, getBrandLogoUrl } from './brandingService';
function convertToHTMLTable(data: any[]): string {
    if (!data || data.length === 0) {
        return '<table><thead><tr><th>No data</th></tr></thead><tbody><tr><td></td></tr></tbody></table>';
    }

    // Build headers as union of all keys to avoid empty headers when first row has no own-keys
    const headerSet = new Set<string>();
    for (const row of data) {
        Object.keys(row || {}).forEach(k => headerSet.add(k));
    }
    const headers = Array.from(headerSet);
    if (headers.length === 0) {
        return '<table><thead><tr><th>No data</th></tr></thead><tbody><tr><td></td></tr></tbody></table>';
    }
    const headerRow = `<tr>${headers.map(h => `<th>${String(h)}</th>`).join('')}</tr>`;
    
    const rows = data.map(obj => {
        const rowData = headers.map(header => {
            let value = obj[header];
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            // Basic sanitization for HTML content
            const stringValue = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<td>${stringValue}</td>`;
        }).join('');
        return `<tr>${rowData}</tr>`;
    }).join('');

    return `<table><thead>${headerRow}</thead><tbody>${rows}</tbody></table>`;
}

/**
 * Triggers a browser download for an Excel (.xls) file from data.
 * @param data The array of objects to export.
 * @param filename The name of the downloaded file (without extension).
 */
export function exportToExcel(data: any[], filename: string): void {
    const tableHTML = convertToHTMLTable(data);
    const template = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Sheet1</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
          <meta charset="UTF-8"/>
        </head>
        <body>
          ${tableHTML}
        </body>
        </html>
    `;
    
    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Generates a PDF file from tabular data using jsPDF + autoTable (loaded via CDN).
 * Falls back gracefully if libraries cannot be loaded.
 */
export async function exportToPDF(data: any[], filename: string, options?: { includeCharts?: boolean }): Promise<void> {
    try {
        const hasData = Array.isArray(data) && data.length > 0;
        const headers = hasData ? Object.keys(data[0]) : [];
        const rows = hasData ? data.map((row: any) => headers.map(h => {
            const v = row[h];
            if (v === null || v === undefined) return '';
            return typeof v === 'object' ? JSON.stringify(v) : String(v);
        })) : [];

        // Load jsPDF (UMD) and autotable plugin at runtime
        const jsPdfMod: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
        await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
        const jsPDF = (jsPdfMod && (jsPdfMod.default?.jsPDF || jsPdfMod.jsPDF)) as any;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

        const brandName = getBrandName();
        const logoUrl = getBrandLogoUrl();
        let logoDataUrl: string | null = null;
        try { logoDataUrl = await loadImageAsDataUrl(logoUrl); } catch {}

        // Determine brand color from CSS variables or fallback
        const primaryColorHex = getCssVariable('--color-primary') || '#2563eb';
        const primaryRgb = hexToRgb(primaryColorHex) || { r: 37, g: 99, b: 235 };

        const headerHeight = 64;
        const footerHeight = 28;
        const title = (document?.title || 'Report');
        const dateStr = new Date().toLocaleString();
        const totalPagesExp = '{total_pages_count_string}';

        // Optional chart area
        const chartInfo = options?.includeCharts === false ? null : detectChart(headers, data);
        const chartHeight = chartInfo ? 180 : 0;

        (doc as any).autoTable({
            head: [headers.length ? headers : ['']],
            body: headers.length ? rows : [['No data']],
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b], textColor: 255 },
            margin: { top: headerHeight + 16 + (chartHeight ? chartHeight + 16 : 0), right: 30, bottom: footerHeight + 16, left: 30 },
            didDrawPage: (data: any) => {
                const pageWidth = (doc as any).internal.pageSize.getWidth();
                const pageHeight = (doc as any).internal.pageSize.getHeight();

                // Header bar
                (doc as any).setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
                (doc as any).rect(0, 0, pageWidth, headerHeight, 'F');

                // Logo left
                if (logoDataUrl) {
                    try { (doc as any).addImage(logoDataUrl, 'PNG', 24, 16, 96, 32); } catch {}
                }

                // Brand name and title on the right
                (doc as any).setTextColor(255, 255, 255);
                (doc as any).setFontSize(12);
                (doc as any).text(brandName, pageWidth - 24, 20, { align: 'right', baseline: 'top' });
                (doc as any).setFontSize(10);
                (doc as any).text(title, pageWidth - 24, 36, { align: 'right', baseline: 'top' });
                (doc as any).text(dateStr, pageWidth - 24, 50, { align: 'right', baseline: 'top' });

                // Chart rendering under header
                if (chartInfo) {
                    const x = 30;
                    const y = headerHeight + 16;
                    const w = pageWidth - 60;
                    const h = chartHeight;
                    try { drawChart(doc as any, chartInfo, x, y, w, h, primaryRgb); } catch {}
                }

                // Footer: brand (left), page X of Y (center), date (right)
                (doc as any).setTextColor(120, 120, 120);
                (doc as any).setFontSize(9);
                const pageStr = `Page ${data.pageNumber} of ${totalPagesExp}`;
                (doc as any).text(brandName, 30, pageHeight - 10);
                (doc as any).text(pageStr, pageWidth / 2, pageHeight - 10, { align: 'center' });
                (doc as any).text(dateStr, pageWidth - 30, pageHeight - 10, { align: 'right' });
            },
        });

        if ((doc as any).putTotalPages) {
            try { (doc as any).putTotalPages(totalPagesExp); } catch {}
        }

        doc.save(`${filename}.pdf`);
    } catch (e) {
        console.error('PDF export failed, falling back to CSV.', e);
        // Fallback to CSV so the user still gets a file
        exportToCSV(data || [], filename);
    }
}

// --- Helpers ---
function getCssVariable(varName: string): string | null {
    try {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
        return value ? value.trim() : null;
    } catch {
        return null;
    }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return { r, g, b };
    }
    if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return { r, g, b };
    }
    return null;
}

async function loadImageAsDataUrl(path: string): Promise<string> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load image: ${path}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
    });
}

// --- Chart helpers ---
type RGB = { r: number; g: number; b: number };
type ChartInfo =
  | { kind: 'bar'; series: { label: string; value: number }[]; xKey: string; yKey: string }
  | { kind: 'pie'; series: { label: string; value: number }[]; xKey: string; yKey: string };

function detectChart(headers: string[], data: any[]): ChartInfo | null {
  if (!headers || headers.length === 0) return null;
  // Revenue summary: Month, Revenue
  if (headers.includes('Month') && headers.includes('Revenue')) {
    const series = data.map(row => ({ label: String(row['Month']), value: Number(row['Revenue'] || 0) }));
    return { kind: 'bar', series, xKey: 'Month', yKey: 'Revenue' };
  }
  // Deals: Stage, Value (aggregate if multiple rows)
  if (headers.includes('Stage') && headers.includes('Value')) {
    const agg = new Map<string, number>();
    for (const row of data) {
      const key = String(row['Stage']);
      const val = Number(row['Value'] || 0);
      agg.set(key, (agg.get(key) || 0) + val);
    }
    const series = Array.from(agg.entries()).map(([label, value]) => ({ label, value }));
    return { kind: 'pie', series, xKey: 'Stage', yKey: 'Value' };
  }
  return null;
}

function drawChart(doc: any, info: ChartInfo, x: number, y: number, w: number, h: number, primaryRgb: RGB) {
  if (info.kind === 'bar') {
    drawBarChart(doc, info.series, x, y, w, h, primaryRgb);
  } else {
    drawPieChart(doc, info.series, x, y, w, h);
  }
}

function drawBarChart(doc: any, series: { label: string; value: number }[], x: number, y: number, w: number, h: number, primary: RGB) {
  const padding = 24;
  const axisY = y + h - padding;
  const axisX = x + padding;
  const chartW = w - padding * 2;
  const chartH = h - padding * 2;
  const maxVal = Math.max(1, ...series.map(s => s.value));
  const barW = Math.max(8, Math.min(60, chartW / Math.max(1, series.length) * 0.7));
  const gap = (chartW - barW * series.length) / Math.max(1, series.length + 1);

  // Axes
  doc.setDrawColor(180, 180, 180);
  doc.line(axisX, axisY, axisX + chartW, axisY);

  // Bars
  let cursor = axisX + gap;
  for (const s of series) {
    const bh = (s.value / maxVal) * (chartH - 10);
    const by = axisY - bh;
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(cursor, by, barW, bh, 'F');
    // Labels (x)
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(8);
    doc.text(String(s.label), cursor + barW / 2, axisY + 10, { align: 'center', baseline: 'top' });
    cursor += barW + gap;
  }
}

function drawPieChart(doc: any, series: { label: string; value: number }[], x: number, y: number, w: number, h: number) {
  const radius = Math.min(w, h) / 2 - 10;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const total = series.reduce((a, b) => a + (b.value || 0), 0) || 1;
  let startAngle = 0;
  const colors = [
    [37, 99, 235], [59, 130, 246], [96, 165, 250], [99, 102, 241], [147, 197, 253],
    [14, 165, 233], [99, 163, 117], [234, 179, 8]
  ];
  let idx = 0;
  for (const s of series) {
    const fraction = (s.value || 0) / total;
    const endAngle = startAngle + fraction * Math.PI * 2;
    const color = colors[idx % colors.length] as [number, number, number];
    drawPieSlice(doc, cx, cy, radius, startAngle, endAngle, color);
    startAngle = endAngle;
    idx++;
  }
  // Legend (right side)
  doc.setFontSize(9);
  let ly = y + 8;
  idx = 0;
  for (const s of series) {
    const color = colors[idx % colors.length] as [number, number, number];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x + w - 140, ly - 8, 10, 10, 'F');
    doc.setTextColor(60, 60, 60);
    const pct = total ? Math.round((s.value / total) * 100) : 0;
    doc.text(`${s.label} (${pct}%)`, x + w - 124, ly);
    ly += 14;
    idx++;
  }
}

function drawPieSlice(doc: any, cx: number, cy: number, r: number, start: number, end: number, color: [number, number, number]) {
  // Approximate pie slice by drawing path with many small segments
  const steps = 24;
  const angleStep = (end - start) / steps;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.lines([], 0, 0); // ensure path reset
  let path: [number, number][] = [];
  path.push([cx, cy]);
  for (let i = 0; i <= steps; i++) {
    const a = start + i * angleStep;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    path.push([px, py]);
  }
  // jsPDF lacks polygon fill API directly via arrays; approximate using triangles fan
  for (let i = 1; i < path.length - 1; i++) {
    doc.triangle(path[0][0], path[0][1], path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], 'F');
  }
}

/**
 * Triggers a browser download for a CSV (.csv) file from data.
 * @param data The array of objects to export.
 * @param filename The name of the downloaded file (without extension).
 */
export function exportToCSV(data: any[], filename: string): void {
    if (!data || data.length === 0) {
        const emptyBlob = new Blob([''], { type: 'text/csv;charset=utf-8;' });
        const emptyUrl = URL.createObjectURL(emptyBlob);
        const emptyLink = document.createElement('a');
        emptyLink.setAttribute('href', emptyUrl);
        emptyLink.setAttribute('download', `${filename}.csv`);
        emptyLink.style.visibility = 'hidden';
        document.body.appendChild(emptyLink);
        emptyLink.click();
        document.body.removeChild(emptyLink);
        return;
    }

    const headers = Object.keys(data[0]);
    const escapeCsv = (value: any): string => {
        if (value === null || value === undefined) return '';
        let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        // Escape double quotes by doubling them
        stringValue = stringValue.replace(/"/g, '""');
        // Wrap fields containing commas, quotes, or newlines in quotes
        if (/[",\n]/.test(stringValue)) {
            stringValue = `"${stringValue}"`;
        }
        return stringValue;
    };

    const headerRow = headers.join(',');
    const rows = data.map(row => headers.map(h => escapeCsv(row[h])).join(',')).join('\n');
    const csvContent = `${headerRow}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Non-UI generators (for delivery) ---
export function generateCSVBlob(data: any[]): Blob {
    const headers = data && data.length ? Object.keys(data[0]) : [];
    const escapeCsv = (value: any): string => {
        if (value === null || value === undefined) return '';
        let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        stringValue = stringValue.replace(/"/g, '""');
        if (/[",\n]/.test(stringValue)) stringValue = `"${stringValue}"`;
        return stringValue;
    };
    const headerRow = headers.join(',');
    const rows = data && data.length ? data.map(row => headers.map(h => escapeCsv(row[h])).join(',')).join('\n') : '';
    const csvContent = headers.length ? `${headerRow}\n${rows}` : '';
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

export async function generatePDFBlob(data: any[], options?: { includeCharts?: boolean }): Promise<Blob> {
    const hasData = Array.isArray(data) && data.length > 0;
    const headers = hasData ? Object.keys(data[0]) : [];
    const rows = hasData ? data.map((row: any) => headers.map(h => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        return typeof v === 'object' ? JSON.stringify(v) : String(v);
    })) : [];

    const jsPdfMod: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
    const jsPDF = (jsPdfMod && (jsPdfMod.default?.jsPDF || jsPdfMod.jsPDF)) as any;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const brandName = getBrandName();
    const logoUrl = getBrandLogoUrl();
    let logoDataUrl: string | null = null;
    try { logoDataUrl = await loadImageAsDataUrl(logoUrl); } catch {}
    const primaryColorHex = getCssVariable('--color-primary') || '#2563eb';
    const primaryRgb = hexToRgb(primaryColorHex) || { r: 37, g: 99, b: 235 };
    const headerHeight = 64;
    const footerHeight = 28;
    const title = (document?.title || 'Report');
    const dateStr = new Date().toLocaleString();
    const totalPagesExp = '{total_pages_count_string}';
    const chartInfo = options?.includeCharts === false ? null : detectChart(headers, data);
    const chartHeight = chartInfo ? 180 : 0;

    (doc as any).autoTable({
        head: [headers.length ? headers : ['']],
        body: headers.length ? rows : [['No data']],
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b], textColor: 255 },
        margin: { top: headerHeight + 16 + (chartHeight ? chartHeight + 16 : 0), right: 30, bottom: footerHeight + 16, left: 30 },
        didDrawPage: (dataAuto: any) => {
            const pageWidth = (doc as any).internal.pageSize.getWidth();
            const pageHeight = (doc as any).internal.pageSize.getHeight();
            (doc as any).setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
            (doc as any).rect(0, 0, pageWidth, headerHeight, 'F');
            if (logoDataUrl) { try { (doc as any).addImage(logoDataUrl, 'PNG', 24, 16, 96, 32); } catch {}
            }
            (doc as any).setTextColor(255, 255, 255);
            (doc as any).setFontSize(12);
            (doc as any).text(brandName, pageWidth - 24, 20, { align: 'right', baseline: 'top' });
            (doc as any).setFontSize(10);
            (doc as any).text(title, pageWidth - 24, 36, { align: 'right', baseline: 'top' });
            (doc as any).text(dateStr, pageWidth - 24, 50, { align: 'right', baseline: 'top' });

            if (chartInfo) {
                const x = 30, y = headerHeight + 16, w = pageWidth - 60, h = chartHeight;
                try { drawChart(doc as any, chartInfo, x, y, w, h, primaryRgb); } catch {}
            }
            (doc as any).setTextColor(120, 120, 120);
            (doc as any).setFontSize(9);
            const pageStr = `Page ${dataAuto.pageNumber} of ${totalPagesExp}`;
            (doc as any).text(brandName, 30, pageHeight - 10);
            (doc as any).text(pageStr, pageWidth / 2, pageHeight - 10, { align: 'center' });
            (doc as any).text(dateStr, pageWidth - 30, pageHeight - 10, { align: 'right' });
        },
    });
    if ((doc as any).putTotalPages) { try { (doc as any).putTotalPages(totalPagesExp); } catch {} }
    return (doc as any).output('blob');
}
