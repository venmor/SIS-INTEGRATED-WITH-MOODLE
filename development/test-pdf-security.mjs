import { PDFDocument, PDFName } from 'pdf-lib';
import { readFileSync } from 'fs';

const files = [
  'packages/test-fixtures/documents/adversarial/pdf-with-javascript.pdf',
  'packages/test-fixtures/documents/adversarial/pdf-with-launch-action.pdf',
  'packages/test-fixtures/documents/adversarial/pdf-with-embedded-file.pdf',
  'packages/test-fixtures/documents/adversarial/pdf-with-executable-forms.pdf',
  'packages/test-fixtures/documents/adversarial/polyglot-file.pdf',
  'packages/test-fixtures/documents/adversarial/clean-test.pdf',
  'packages/test-fixtures/documents/fictional-result.pdf',
];

for (const file of files) {
  const buf = readFileSync(file);
  console.log('\n===', file, '===');
  console.log('First 5 bytes:', buf.subarray(0, 5).toString());
  
  try {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const catalog = doc.catalog.dict;
    console.log('Catalog keys:', Array.from(catalog.keys()).map(k => k.encodedName));
    
    const checkAction = (dict, prefix) => {
      if (!dict?.dict) return;
      for (const [k, v] of dict.dict.entries()) {
        if (k.encodedName === '/S') {
          const action = doc.context.lookup(v);
          if (action?.dict) {
            const s = action.dict.get(PDFName.of('S'));
            if (s) console.log(prefix, 'Action:', s.encodedName);
          }
        }
      }
    };
    
    // Check page annotations
    const pagesRef = catalog.get(PDFName.of('Pages'));
    if (pagesRef) {
      const pages = doc.context.lookup(pagesRef);
      if (pages?.dict) {
        const kids = pages.dict.get(PDFName.of('Kids'));
        if (kids?.array) {
          for (const kidRef of kids.array) {
            const kid = doc.context.lookup(kidRef);
            if (kid?.dict) {
              const annots = kid.dict.get(PDFName.of('Annots'));
              if (annots?.array) {
                for (const annotRef of annots.array) {
                  const annot = doc.context.lookup(annotRef);
                  if (annot?.dict) {
                    console.log('Annotation:', Array.from(annot.dict.keys()).map(k => k.encodedName));
                    checkAction(annot, '  Annot');
                  }
                }
              }
              const aa = kid.dict.get(PDFName.of('AA'));
              if (aa) {
                const aaDict = doc.context.lookup(aa);
                if (aaDict?.dict) {
                  console.log('Page AA:', Array.from(aaDict.dict.keys()).map(k => k.encodedName));
                  for (const [k, v] of aaDict.dict.entries()) {
                    checkAction({dict: doc.context.lookup(v)}, '  Page AA/' + k.encodedName);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Check catalog AA
    const catAA = catalog.get(PDFName.of('AA'));
    if (catAA) {
      const aaDict = doc.context.lookup(catAA);
      if (aaDict?.dict) {
        console.log('Catalog AA:', Array.from(aaDict.dict.keys()).map(k => k.encodedName));
      }
    }
    
    // Check catalog OpenAction
    const openAction = catalog.get(PDFName.of('OpenAction'));
    if (openAction) {
      console.log('OpenAction present');
    }
    
    // Check Names/EmbeddedFiles
    const names = catalog.get(PDFName.of('Names'));
    if (names) {
      const namesDict = doc.context.lookup(names);
      if (namesDict?.dict) {
        console.log('Names keys:', Array.from(namesDict.dict.keys()).map(k => k.encodedName));
      }
    }
    
    // Check AcroForm
    const acroForm = catalog.get(PDFName.of('AcroForm'));
    if (acroForm) {
      const af = doc.context.lookup(acroForm);
      if (af?.dict) {
        console.log('AcroForm keys:', Array.from(af.dict.keys()).map(k => k.encodedName));
        const fields = af.dict.get(PDFName.of('Fields'));
        if (fields?.array) {
          for (const fRef of fields.array) {
            const f = doc.context.lookup(fRef);
            if (f?.dict) {
              console.log('  Field:', Array.from(f.dict.keys()).map(k => k.encodedName));
              const faa = f.dict.get(PDFName.of('AA'));
              if (faa) {
                const faaDict = doc.context.lookup(faa);
                if (faaDict?.dict) {
                  console.log('  Field AA:', Array.from(faaDict.dict.keys()).map(k => k.encodedName));
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}