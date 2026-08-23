import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures the exact rendered DOM element of the certificate and exports it to a high-resolution PDF.
 * Ensures all fonts, images, badges, QR codes, and styling match the website display with 100% fidelity.
 */
export const exportCertificateToPdf = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Certificate element not found on page.');
  }

  // 1. Ensure document fonts are fully loaded
  if (document.fonts) {
    await document.fonts.ready;
  }

  // 2. Wait for all images inside the element to finish loading
  const images = Array.from(element.getElementsByTagName('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  // 3. Render high DPI canvas from exact DOM element
  const canvas = await html2canvas(element, {
    scale: 2, // 2x scale for ultra crisp vector-like clarity
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#FCFDFE',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: element.offsetWidth,
    height: element.offsetHeight,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // 4. Create standard ISO A4 landscape PDF (297mm x 210mm) for pixel-perfect printing
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
};
