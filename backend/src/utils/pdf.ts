import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

export interface CertificatePdfParams {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issueDate: string;
  verificationUrl: string;
}

export const generateCertificatePdf = async (params: CertificatePdfParams): Promise<Buffer> => {
  // Generate high resolution QR code image buffer
  const qrBuffer = await QRCode.toBuffer(params.verificationUrl, {
    margin: 1,
    width: 200,
    color: {
      dark: '#0A1322',
      light: '#FFFFFF',
    },
  });

  const logoPath = path.join(__dirname, '../assets/logo.png');
  const hasLogo = fs.existsSync(logoPath);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 0,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width;
      const height = doc.page.height;

      // 1. Premium Paper Background (Ivory/White #FCFDFF)
      doc.rect(0, 0, width, height).fill('#FCFDFF');

      // 2. Outer Deep Navy Border (#1A365D)
      const borderMargin = 22;
      doc.rect(borderMargin, borderMargin, width - (borderMargin * 2), height - (borderMargin * 2))
         .lineWidth(2.5)
         .stroke('#1A365D');

      // 3. Inner Double Fine-Line Border with Gold Tone
      const innerMargin = borderMargin + 8;
      const innerWidth = width - (innerMargin * 2);
      const innerHeight = height - (innerMargin * 2);
      doc.rect(innerMargin, innerMargin, innerWidth, innerHeight)
         .lineWidth(0.75)
         .stroke('#23426A');

      // Corner Gold Accents
      const cornerLen = 14;
      doc.moveTo(innerMargin, innerMargin + cornerLen).lineTo(innerMargin, innerMargin).lineTo(innerMargin + cornerLen, innerMargin).lineWidth(1.5).stroke('#C5A059');
      doc.moveTo(innerMargin + innerWidth - cornerLen, innerMargin).lineTo(innerMargin + innerWidth, innerMargin).lineTo(innerMargin + innerWidth, innerMargin + cornerLen).lineWidth(1.5).stroke('#C5A059');
      doc.moveTo(innerMargin, innerMargin + innerHeight - cornerLen).lineTo(innerMargin, innerMargin + innerHeight).lineTo(innerMargin + cornerLen, innerMargin + innerHeight).lineWidth(1.5).stroke('#C5A059');
      doc.moveTo(innerMargin + innerWidth - cornerLen, innerMargin + innerHeight).lineTo(innerMargin + innerWidth, innerMargin + innerHeight).lineTo(innerMargin + innerWidth, innerMargin + innerHeight - cornerLen).lineWidth(1.5).stroke('#C5A059');

      // Faint Watermark Emblem in Center
      if (hasLogo) {
        doc.save();
        doc.opacity(0.035);
        const waterMarkSize = 240;
        doc.image(logoPath, (width - waterMarkSize) / 2, (height - waterMarkSize) / 2 - 10, { width: waterMarkSize });
        doc.restore();
      }

      // =========================================================
      // HEADER: KHALIL ACADEMY OFFICIAL GRAND LOGO
      // =========================================================
      const contentX = innerMargin + 20;
      const contentWidth = innerWidth - 40;
      const sealCenterX = width / 2;

      let topOffset = innerMargin + 12;
      if (hasLogo) {
        const logoWidth = 120;
        doc.image(logoPath, (width - logoWidth) / 2, topOffset, { width: logoWidth });
        topOffset += 62;
      } else {
        doc.fillColor('#0E1E36')
           .fontSize(24)
           .font('Times-Bold')
           .text('KHALIL ACADEMY', contentX, topOffset + 10, { width: contentWidth, align: 'center', characterSpacing: 4 });
        topOffset += 40;
      }

      // Subtitle: CERTIFICATE OF COMPLETION
      doc.fillColor('#0E1E36')
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', contentX, topOffset, { width: contentWidth, align: 'center', characterSpacing: 3 });

      // =========================================================
      // MAIN CREDENTIAL TEXT
      // =========================================================
      // "This certificate is proudly conferred upon"
      doc.fillColor('#475569')
         .fontSize(11)
         .font('Times-Italic')
         .text('This certificate is proudly conferred upon', contentX, innerMargin + 104, { width: contentWidth, align: 'center' });

      // Recipient Name (Focal Point)
      doc.fillColor('#0E1E36')
         .fontSize(34)
         .font('Times-Bold')
         .text(params.studentName, contentX, innerMargin + 124, { width: contentWidth, align: 'center' });

      // Gold Underline beneath recipient name
      const nameLineWidth = 320;
      const nameLineX = (width - nameLineWidth) / 2;
      doc.moveTo(nameLineX, innerMargin + 166).lineTo(nameLineX + nameLineWidth, innerMargin + 166).lineWidth(1.5).stroke('#C5A059');

      // "for successfully completing and demonstrating mastery in"
      doc.fillColor('#475569')
         .fontSize(10.5)
         .font('Times-Italic')
         .text('for successfully completing and demonstrating mastery in', contentX, innerMargin + 178, { width: contentWidth, align: 'center' });

      // Course Title
      doc.fillColor('#0E1E36')
         .fontSize(22)
         .font('Times-Bold')
         .text(params.courseTitle, contentX, innerMargin + 198, { width: contentWidth, align: 'center' });

      // "Professional Specialization"
      doc.fillColor('#C5A059')
         .fontSize(8.5)
         .font('Helvetica-Bold')
         .text('PROFESSIONAL SPECIALIZATION', contentX, innerMargin + 226, { width: contentWidth, align: 'center', characterSpacing: 2 });

      // Formal Academic Statement
      doc.fillColor('#64748B')
         .fontSize(8)
         .font('Helvetica')
         .text(
           'This credential certifies that the recipient has satisfied all rigorous academic requirements, assessments, practical projects, and learning standards established by Khalil Academy.',
           contentX + 40,
           innerMargin + 244,
           { width: contentWidth - 80, align: 'center', lineGap: 2 }
         );

      // =========================================================
      // SIGNATURES & OFFICIAL SEAL
      // =========================================================
      const sigSectionY = innerMargin + 295;

      // Left Signature: Academic Director
      const sigLeftX = contentX + 30;
      doc.fillColor('#0E1E36').fontSize(16).font('Times-BoldItalic').text('Eng. Khalil A. Wali', sigLeftX, sigSectionY, { width: 170, align: 'center' });
      doc.moveTo(sigLeftX, sigSectionY + 20).lineTo(sigLeftX + 170, sigSectionY + 20).lineWidth(0.75).stroke('#94A3B8');
      doc.fillColor('#0E1E36').fontSize(8.5).font('Helvetica-Bold').text('Eng. Khalil A. Wali', sigLeftX, sigSectionY + 24, { width: 170, align: 'center' });
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Academic Director · Khalil Academy', sigLeftX, sigSectionY + 36, { width: 170, align: 'center' });

      // Center Institutional Seal
      const sealY = sigSectionY + 16;
      doc.circle(sealCenterX, sealY, 26).lineWidth(1.5).stroke('#C5A059');
      doc.circle(sealCenterX, sealY, 23).lineWidth(0.5).stroke('#0E1E36');
      if (hasLogo) {
        doc.image(logoPath, sealCenterX - 12, sealY - 14, { width: 24 });
        doc.fillColor('#0E1E36').fontSize(5).font('Helvetica-Bold').text('OFFICIAL SEAL', sealCenterX - 25, sealY + 11, { width: 50, align: 'center' });
      } else {
        doc.fillColor('#0E1E36').fontSize(5.5).font('Helvetica-Bold').text('KHALIL ACADEMY', sealCenterX - 25, sealY - 14, { width: 50, align: 'center' });
        doc.fillColor('#059669').fontSize(6).font('Helvetica-Bold').text('CERTIFIED', sealCenterX - 25, sealY - 2, { width: 50, align: 'center' });
        doc.fillColor('#64748B').fontSize(4.5).font('Helvetica').text('EST. 2024', sealCenterX - 25, sealY + 8, { width: 50, align: 'center' });
      }

      // Right Signature: Program Instructor
      const sigRightX = contentX + contentWidth - 200;
      doc.fillColor('#0E1E36').fontSize(16).font('Times-BoldItalic').text(params.instructorName || 'Academic Faculty', sigRightX, sigSectionY, { width: 170, align: 'center' });
      doc.moveTo(sigRightX, sigSectionY + 20).lineTo(sigRightX + 170, sigSectionY + 20).lineWidth(0.75).stroke('#94A3B8');
      doc.fillColor('#0E1E36').fontSize(8.5).font('Helvetica-Bold').text(params.instructorName || 'Academic Faculty', sigRightX, sigSectionY + 24, { width: 170, align: 'center' });
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Faculty Instructor · Khalil Academy', sigRightX, sigSectionY + 36, { width: 170, align: 'center' });

      // =========================================================
      // FOOTER: QR CODE, VERIFICATION URL, CERTIFICATE ID
      // =========================================================
      const footerY = innerMargin + innerHeight - 44;
      doc.moveTo(contentX, footerY - 8).lineTo(contentX + contentWidth, footerY - 8).lineWidth(0.5).stroke('#E2E8F0');

      // Left: Mini QR Code & Verification URL
      const qrY = footerY - 4;
      doc.image(qrBuffer, contentX + 10, qrY, { width: 34, height: 34 });
      doc.fillColor('#0E1E36').fontSize(7).font('Helvetica-Bold').text('ONLINE VERIFICATION', contentX + 50, qrY + 4);
      doc.fillColor('#1A365D').fontSize(6.5).font('Courier').text(params.verificationUrl, contentX + 50, qrY + 15, { width: 300 });

      // Center: Issue Date
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('ISSUE DATE', sealCenterX - 60, qrY + 4, { width: 120, align: 'center' });
      doc.fillColor('#0E1E36').fontSize(7.5).font('Helvetica-Bold').text(params.issueDate, sealCenterX - 60, qrY + 15, { width: 120, align: 'center' });

      // Right: Certificate ID
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('CERTIFICATE ID', contentX + contentWidth - 180, qrY + 4, { width: 170, align: 'right' });
      doc.fillColor('#0E1E36').fontSize(8).font('Courier-Bold').text(params.certificateNumber, contentX + contentWidth - 180, qrY + 15, { width: 170, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
