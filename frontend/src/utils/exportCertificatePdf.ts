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
    scale: 3, // 3x scale for crisp printing and zooming
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // 4. Create landscape PDF matching exact dimensions and aspect ratio of certificate element
  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [imgWidth, imgHeight],
    compress: true,
  });

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
};
