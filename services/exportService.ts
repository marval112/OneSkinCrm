/**
 * Converts an array of objects to an HTML table string.
 * This format can be opened by Excel.
 * @param data The array of objects to convert.
 * @returns The HTML table string.
 */
function convertToHTMLTable(data: any[]): string {
    if (!data || data.length === 0) {
        return '';
    }

    const headers = Object.keys(data[0]);
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
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
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
