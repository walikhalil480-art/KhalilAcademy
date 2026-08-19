import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

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
      const borderMargin = 24;
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

      // =========================================================
      // HEADER: KHALIL ACADEMY & CERTIFICATE OF COMPLETION
      // =========================================================
      const contentX = innerMargin + 20;
      const contentWidth = innerWidth - 40;

      // Academy Crest Seal (Top Center)
      const sealCenterX = width / 2;
      const sealCenterY = innerMargin + 32;
      doc.circle(sealCenterX, sealCenterY, 16).lineWidth(1.5).stroke('#1A365D');
      doc.circle(sealCenterX, sealCenterY, 13).lineWidth(0.75).stroke('#C5A059');
      doc.fillColor('#1A365D').fontSize(11).font('Helvetica-Bold').text('🎓', sealCenterX - 7, sealCenterY - 7);

      // Academy Name
      doc.fillColor('#1A365D')
         .fontSize(22)
         .font('Times-Bold')
         .text('KHALIL ACADEMY', contentX, innerMargin + 54, { width: contentWidth, align: 'center', characterSpacing: 4 });

      // Subtitle Pill: CERTIFICATE OF COMPLETION
      doc.fillColor('#4FD1C5')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', contentX, innerMargin + 82, { width: contentWidth, align: 'center', characterSpacing: 3 });

      // =========================================================
      // MAIN CREDENTIAL TEXT
      // =========================================================
      // "This certificate is proudly presented to"
      doc.fillColor('#475569')
         .fontSize(12)
         .font('Times-Italic')
         .text('This certificate is proudly presented to', contentX, innerMargin + 110, { width: contentWidth, align: 'center' });

      // Recipient Name (Focal Point)
      doc.fillColor('#0A1322')
         .fontSize(32)
         .font('Times-Bold')
         .text(params.studentName, contentX, innerMargin + 130, { width: contentWidth, align: 'center' });

      // Gold Underline beneath recipient name
      const nameLineWidth = 280;
      const nameLineX = (width - nameLineWidth) / 2;
      doc.moveTo(nameLineX, innerMargin + 170).lineTo(nameLineX + nameLineWidth, innerMargin + 170).lineWidth(1).stroke('#C5A059');

      // "for successfully completing the comprehensive program"
      doc.fillColor('#475569')
         .fontSize(11)
         .font('Times-Italic')
         .text('for successfully completing the comprehensive program', contentX, innerMargin + 182, { width: contentWidth, align: 'center' });

      // Course Title
      doc.fillColor('#1A365D')
         .fontSize(21)
         .font('Times-Bold')
         .text(params.courseTitle, contentX, innerMargin + 202, { width: contentWidth, align: 'center' });

      // "Professional Certificate"
      doc.fillColor('#1A365D')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('PROFESSIONAL CERTIFICATE', contentX, innerMargin + 230, { width: contentWidth, align: 'center', characterSpacing: 2 });

      // Formal Academic Statement
      doc.fillColor('#64748B')
         .fontSize(8.5)
         .font('Helvetica')
         .text(
           'This certificate recognizes the successful completion of the required coursework, practical exercises, assessments, and learning objectives prescribed by Khalil Academy.',
           contentX + 50,
           innerMargin + 250,
           { width: contentWidth - 100, align: 'center', lineGap: 2 }
         );

      // =========================================================
      // METADATA BOX (4 Columns)
      // =========================================================
      const metaBoxY = innerMargin + 288;
      const metaBoxWidth = contentWidth - 40;
      const metaBoxX = contentX + 20;
      const metaBoxHeight = 36;

      doc.rect(metaBoxX, metaBoxY, metaBoxWidth, metaBoxHeight).fillAndStroke('#FAFBFD', '#E2E8F0');

      const colWidth = metaBoxWidth / 4;
      // Col 1: Recipient
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('RECIPIENT', metaBoxX + 8, metaBoxY + 6, { width: colWidth - 16, align: 'center' });
      doc.fillColor('#0A1322').fontSize(8).font('Helvetica-Bold').text(params.studentName, metaBoxX + 8, metaBoxY + 18, { width: colWidth - 16, align: 'center', ellipsis: true });
      doc.moveTo(metaBoxX + colWidth, metaBoxY + 4).lineTo(metaBoxX + colWidth, metaBoxY + metaBoxHeight - 4).lineWidth(0.5).stroke('#E2E8F0');

      // Col 2: Credential
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('CREDENTIAL TYPE', metaBoxX + colWidth + 8, metaBoxY + 6, { width: colWidth - 16, align: 'center' });
      doc.fillColor('#0A1322').fontSize(8).font('Helvetica-Bold').text('Professional Certificate', metaBoxX + colWidth + 8, metaBoxY + 18, { width: colWidth - 16, align: 'center' });
      doc.moveTo(metaBoxX + (colWidth * 2), metaBoxY + 4).lineTo(metaBoxX + (colWidth * 2), metaBoxY + metaBoxHeight - 4).lineWidth(0.5).stroke('#E2E8F0');

      // Col 3: Completion Date
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('COMPLETION DATE', metaBoxX + (colWidth * 2) + 8, metaBoxY + 6, { width: colWidth - 16, align: 'center' });
      doc.fillColor('#0A1322').fontSize(8).font('Helvetica-Bold').text(params.issueDate, metaBoxX + (colWidth * 2) + 8, metaBoxY + 18, { width: colWidth - 16, align: 'center' });
      doc.moveTo(metaBoxX + (colWidth * 3), metaBoxY + 4).lineTo(metaBoxX + (colWidth * 3), metaBoxY + metaBoxHeight - 4).lineWidth(0.5).stroke('#E2E8F0');

      // Col 4: Status
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('CREDENTIAL STATUS', metaBoxX + (colWidth * 3) + 8, metaBoxY + 6, { width: colWidth - 16, align: 'center' });
      doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text('Verified ✓', metaBoxX + (colWidth * 3) + 8, metaBoxY + 18, { width: colWidth - 16, align: 'center' });

      // =========================================================
      // SIGNATURES & OFFICIAL SEAL
      // =========================================================
      const sigSectionY = innerMargin + 342;

      // Left Signature: Academic Director
      const sigLeftX = contentX + 30;
      doc.fillColor('#1A365D').fontSize(14).font('Times-BoldItalic').text('Eng. Khalil A. Wali', sigLeftX, sigSectionY, { width: 170, align: 'center' });
      doc.moveTo(sigLeftX, sigSectionY + 18).lineTo(sigLeftX + 170, sigSectionY + 18).lineWidth(0.75).stroke('#94A3B8');
      doc.fillColor('#0A1322').fontSize(9).font('Helvetica-Bold').text('Academic Director', sigLeftX, sigSectionY + 22, { width: 170, align: 'center' });
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Khalil Academy', sigLeftX, sigSectionY + 34, { width: 170, align: 'center' });

      // Center Institutional Seal
      const sealY = sigSectionY + 14;
      doc.circle(sealCenterX, sealY, 24).lineWidth(1.5).stroke('#C5A059');
      doc.circle(sealCenterX, sealY, 21).lineWidth(0.5).stroke('#1A365D');
      doc.fillColor('#1A365D').fontSize(5.5).font('Helvetica-Bold').text('KHALIL ACADEMY', sealCenterX - 25, sealY - 14, { width: 50, align: 'center' });
      doc.fillColor('#059669').fontSize(6).font('Helvetica-Bold').text('CERTIFIED', sealCenterX - 25, sealY - 2, { width: 50, align: 'center' });
      doc.fillColor('#64748B').fontSize(4.5).font('Helvetica').text('EST. 2024', sealCenterX - 25, sealY + 8, { width: 50, align: 'center' });

      // Right Signature: Program Instructor
      const sigRightX = contentX + contentWidth - 200;
      doc.fillColor('#1A365D').fontSize(14).font('Times-BoldItalic').text(params.instructorName || 'Academic Faculty', sigRightX, sigSectionY, { width: 170, align: 'center' });
      doc.moveTo(sigRightX, sigSectionY + 18).lineTo(sigRightX + 170, sigSectionY + 18).lineWidth(0.75).stroke('#94A3B8');
      doc.fillColor('#0A1322').fontSize(9).font('Helvetica-Bold').text(params.instructorName || 'Academic Faculty', sigRightX, sigSectionY + 22, { width: 170, align: 'center' });
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Program Instructor · Khalil Academy', sigRightX, sigSectionY + 34, { width: 170, align: 'center' });

      // =========================================================
      // FOOTER: QR CODE, VERIFICATION URL, CERTIFICATE ID
      // =========================================================
      const footerY = innerMargin + innerHeight - 50;
      doc.moveTo(contentX, footerY - 8).lineTo(contentX + contentWidth, footerY - 8).lineWidth(0.5).stroke('#E2E8F0');

      // Left: Mini QR Code & Verification URL
      const qrY = footerY - 4;
      doc.image(qrBuffer, contentX + 10, qrY, { width: 38, height: 38 });
      doc.fillColor('#0A1322').fontSize(7).font('Helvetica-Bold').text('VERIFY CREDENTIAL', contentX + 54, qrY + 4);
      doc.fillColor('#1A365D').fontSize(7).font('Courier').text(params.verificationUrl, contentX + 54, qrY + 15, { width: 350 });

      // Right: Certificate ID
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold').text('CERTIFICATE ID', contentX + contentWidth - 180, qrY + 4, { width: 170, align: 'right' });
      doc.fillColor('#0A1322').fontSize(8.5).font('Courier-Bold').text(params.certificateNumber, contentX + contentWidth - 180, qrY + 15, { width: 170, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
