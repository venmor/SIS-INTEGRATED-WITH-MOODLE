import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFRef } from 'pdf-lib';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'packages/test-fixtures/documents/adversarial');

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function createPdfWithJavaScript() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Add JavaScript action to page open
  const jsAction = doc.context.obj({
    S: PDFName.of('JavaScript'),
    JS: PDFString.of('app.alert("Malicious JavaScript executed!");'),
  });

  // Add to page's AA (Additional Actions) - OnOpen
  const aaDict = doc.context.obj({
    O: jsAction, // O = OnOpen
  });

  page.node.dict.set(PDFName.of('AA'), aaDict);

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, 'pdf-with-javascript.pdf'), bytes);
  console.log('Created pdf-with-javascript.pdf');
}

async function createPdfWithLaunchAction() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Add Launch action
  const launchAction = doc.context.obj({
    S: PDFName.of('Launch'),
    F: PDFString.of('/bin/bash'),
    Win: doc.context.obj({
      F: PDFString.of('cmd.exe'),
      P: PDFString.of('/c calc.exe'),
    }),
  });

  // Add to page's AA - OnOpen
  const aaDict = doc.context.obj({
    O: launchAction,
  });

  page.node.dict.set(PDFName.of('AA'), aaDict);

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, 'pdf-with-launch-action.pdf'), bytes);
  console.log('Created pdf-with-launch-action.pdf');
}

async function createPdfWithEmbeddedFile() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Create embedded file stream
  const maliciousContent = 'MZ malicious executable content';
  const embeddedStream = doc.context.flateStream(new TextEncoder().encode(maliciousContent));

  // Create Filespec for embedded file
  const filespec = doc.context.obj({
    Type: PDFName.of('Filespec'),
    F: PDFString.of('malware.exe'),
    EF: doc.context.obj({
      F: embeddedStream,
    }),
  });

  // Create EmbeddedFiles name tree
  const embeddedFilesNames = doc.context.obj({
    Names: doc.context.obj([
      PDFString.of('malware.exe'),
      filespec,
    ]),
  });

  const embeddedFilesDict = doc.context.obj({
    Type: PDFName.of('Names'),
    EmbeddedFiles: embeddedFilesNames,
  });

  // Add to catalog Names
  const catalog = doc.catalog.dict;
  catalog.set(PDFName.of('Names'), embeddedFilesDict);

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, 'pdf-with-embedded-file.pdf'), bytes);
  console.log('Created pdf-with-embedded-file.pdf');
}

async function createPdfWithExecutableForms() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Create AcroForm with a field that has JavaScript action
  const field = doc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Widget'),
    FT: PDFName.of('Btn'),
    T: PDFString.of('maliciousButton'),
    Ff: 65536, // Pushbutton
    AA: doc.context.obj({
      U: doc.context.obj({ // U = Up (mouse up)
        S: PDFName.of('JavaScript'),
        JS: PDFString.of('app.alert("Form JavaScript executed!");'),
      }),
    }),
    Rect: doc.context.obj([100, 700, 200, 750]),
  });

  // Create AcroForm
  const acroForm = doc.context.obj({
    Type: PDFName.of('AcroForm'),
    Fields: doc.context.obj([field]),
    NeedAppearances: true,
  });

  doc.catalog.dict.set(PDFName.of('AcroForm'), acroForm);

  // Add annotation to page
  page.node.dict.set(PDFName.of('Annots'), doc.context.obj([field]));

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, 'pdf-with-executable-forms.pdf'), bytes);
  console.log('Created pdf-with-executable-forms.pdf');
}

async function createPolyglotFile() {
  // Create a file that's both a valid PDF and a ZIP
  // This is a simple polyglot - a PDF with a ZIP appended
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  
  // Add some content
  page.drawText('Polyglot PDF/ZIP', { x: 50, y: 700, size: 24 });

  const pdfBytes = await doc.save();
  
  // Append a minimal ZIP structure (local file header + central directory + end of central directory)
  // This is a simplified polyglot - in reality you'd need proper ZIP structure
  const zipHeader = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, // Local file header signature
    0x0a, 0x00, // Version needed to extract
    0x00, 0x00, // General purpose bit flag
    0x00, 0x00, // Compression method (store)
    0x00, 0x00, 0x00, 0x00, // Last mod file time/date
    0x00, 0x00, 0x00, 0x00, // CRC-32
    0x00, 0x00, 0x00, 0x00, // Compressed size
    0x00, 0x00, 0x00, 0x00, // Uncompressed size
    0x00, 0x00, // File name length
    0x00, 0x00, // Extra field length
  ]);

  const polyglotBytes = Buffer.concat([Buffer.from(pdfBytes), zipHeader]);
  writeFileSync(join(OUTPUT_DIR, 'polyglot-file.pdf'), polyglotBytes);
  console.log('Created polyglot-file.pdf');
}

async function createCleanPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText('Clean PDF Document', { x: 50, y: 700, size: 24 });
  page.drawText('This PDF has no malicious content.', { x: 50, y: 650, size: 12 });

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, 'clean-test.pdf'), bytes);
  console.log('Created clean-test.pdf');
}

async function main() {
  await createPdfWithJavaScript();
  await createPdfWithLaunchAction();
  await createPdfWithEmbeddedFile();
  await createPdfWithExecutableForms();
  await createPolyglotFile();
  await createCleanPdf();
  console.log('All test fixtures created successfully!');
}

main().catch(console.error);