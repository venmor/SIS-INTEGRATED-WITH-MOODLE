import { PDFDocument, PDFName, PDFDict, PDFArray, PDFContext, PDFRef } from 'pdf-lib';
import { readFileSync } from 'fs';

async function validatePdfStructure(buffer) {
  const issues = [];
  const details = {
    hasJavaScript: false,
    hasLaunchAction: false,
    hasEmbeddedFiles: false,
    hasExecutableForms: false,
    hasEncrypt: false,
    hasOpenAction: false,
    hasAdditionalActions: false,
  };

  let doc;
  try {
    doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (error) {
    issues.push(`PDF parse error: ${error instanceof Error ? error.message : 'unknown'}`);
    return { safe: false, issues, details };
  }

  console.log('PDF loaded successfully');
  console.log('Trailer Encrypt:', doc.context.trailerInfo.Encrypt);

  // Check for encryption in trailer
  if (doc.context.trailerInfo.Encrypt) {
    details.hasEncrypt = true;
    issues.push('PDF is encrypted (Encrypt dictionary in trailer)');
  }

  // Check catalog for dangerous entries
  const catalog = doc.catalog.dict;
  console.log('Catalog keys:', Array.from(catalog.keys()).map(k => k.encodedName));
  await checkCatalog(catalog, doc.context, issues, details);

  // Check page tree for annotations with actions
  const pagesRef = catalog.get(PDFName.of('Pages'));
  if (pagesRef) {
    const pages = doc.context.lookup(pagesRef);
    if (pages?.dict) {
      console.log('Pages dict keys:', Array.from(pages.dict.keys()).map(k => k.encodedName));
      await checkPageTree(pages, doc.context, issues, details);
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    details,
  };
}

async function checkCatalog(catalog, context, issues, details) {
  // Check for /OpenAction
  const openActionRef = catalog.get(PDFName.of('OpenAction'));
  if (openActionRef) {
    details.hasOpenAction = true;
    const action = context.lookup(openActionRef);
    if (action?.dict) {
      await checkActionDict(action, context, issues, details, 'OpenAction');
    }
  }

  // Check for /AA (Additional Actions)
  const additionalActionsRef = catalog.get(PDFName.of('AA'));
  if (additionalActionsRef) {
    details.hasAdditionalActions = true;
    const aaDict = context.lookup(additionalActionsRef);
    if (aaDict?.dict) {
      for (const [key, value] of aaDict.dict.entries()) {
        if (value) {
          const action = context.lookup(value);
          if (action?.dict) {
            await checkActionDict(action, context, issues, details, `AA/${key.encodedName}`);
          }
        }
      }
    }
  }

  // Check for /Names tree (includes EmbeddedFiles)
  const namesRef = catalog.get(PDFName.of('Names'));
  if (namesRef) {
    const namesDict = context.lookup(namesRef);
    if (namesDict?.dict) {
      const embeddedFilesRef = namesDict.dict.get(PDFName.of('EmbeddedFiles'));
      if (embeddedFilesRef) {
        details.hasEmbeddedFiles = true;
        issues.push('PDF contains embedded files (/Names/EmbeddedFiles)');
      }
    }
  }
}

async function checkPageTree(pages, context, issues, details) {
  const kids = pages.dict.get(PDFName.of('Kids'));
  console.log('Kids:', kids);
  if (kids && kids.array) {
    for (const kidRef of kids.array) {
      const kid = context.lookup(kidRef);
      console.log('Kid type:', kid?.constructor?.name);
      if (kid?.dict) {
        console.log('Kid dict keys:', Array.from(kid.dict.keys()).map(k => k.encodedName));

        // Check page-level Additional Actions (AA)
        const pageAA = kid.dict.get(PDFName.of('AA'));
        console.log('Page AA ref:', pageAA);
        if (pageAA) {
          const aaDict = context.lookup(pageAA);
          console.log('Page AA dict:', aaDict);
          if (aaDict?.dict) {
            console.log('Page AA keys:', Array.from(aaDict.dict.keys()).map(k => k.encodedName));
            for (const [key, value] of aaDict.dict.entries()) {
              console.log('  Processing AA key:', key.encodedName, 'value:', value);
              if (value) {
                const action = context.lookup(value);
                console.log('  Action:', action);
                if (action?.dict) {
                  await checkActionDict(action, context, issues, details, `Page AA/${key.encodedName}`);
                }
              }
            }
          }
        }

        // Check page annotations
        const annots = kid.dict.get(PDFName.of('Annots'));
        if (annots && annots.array) {
          for (const annotRef of annots.array) {
            const annot = context.lookup(annotRef);
            if (annot?.dict) {
              await checkAnnotation(annot, context, issues, details);
            }
          }
        }

        // Recursively check child pages
        const subKids = kid.dict.get(PDFName.of('Kids'));
        if (subKids && subKids.array) {
          await checkPageTree(kid, context, issues, details);
        }
      }
    }
  }
}

async function checkAnnotation(annot, context, issues, details) {
  // Check for action (A) in annotation
  const actionRef = annot.dict.get(PDFName.of('A'));
  if (actionRef) {
    const action = context.lookup(actionRef);
    if (action?.dict) {
      await checkActionDict(action, context, issues, details, 'Annotation/A');
    }
  }

  // Check for additional actions (AA) in annotation
  const aaRef = annot.dict.get(PDFName.of('AA'));
  if (aaRef) {
    const aaDict = context.lookup(aaRef);
    if (aaDict?.dict) {
      for (const [key, value] of aaDict.dict.entries()) {
        if (value) {
          const action = context.lookup(value);
          if (action?.dict) {
            await checkActionDict(action, context, issues, details, `Annotation/AA/${key.encodedName}`);
          }
        }
      }
    }
  }
}

async function checkActionDict(action, context, issues, details, location) {
  console.log(`Checking action at ${location}:`, Array.from(action.dict.keys()).map(k => k.encodedName));
  const subtype = action.dict.get(PDFName.of('S'));
  if (!subtype) return;

  const subtypeName = subtype instanceof PDFName ? subtype.encodedName : String(subtype);
  console.log('  Subtype:', subtypeName);

  // Check for JavaScript action
  if (subtypeName === '/JavaScript') {
    details.hasJavaScript = true;
    issues.push(`JavaScript action found at ${location}`);
    const js = action.dict.get(PDFName.of('JS'));
    if (js) {
      const jsContent = context.lookup(js);
      if (jsContent) {
        issues.push(`  JS content: ${String(jsContent).substring(0, 200)}`);
      }
    }
  }

  // Check for JS (alternative name)
  if (subtypeName === '/JS') {
    details.hasJavaScript = true;
    issues.push(`JavaScript action (JS) found at ${location}`);
  }

  // Check for Launch action
  if (subtypeName === '/Launch') {
    details.hasLaunchAction = true;
    issues.push(`Launch action found at ${location}`);
    const file = action.dict.get(PDFName.of('F'));
    if (file) {
      const fileContent = context.lookup(file);
      if (fileContent) {
        issues.push(`  Launch target: ${String(fileContent).substring(0, 200)}`);
      }
    }
  }
}

async function main() {
  // Test JavaScript PDF
  console.log('=== Testing pdf-with-javascript.pdf ===');
  const bytes1 = readFileSync('packages/test-fixtures/documents/adversarial/pdf-with-javascript.pdf');
  const result1 = await validatePdfStructure(bytes1);
  console.log('Result:', JSON.stringify(result1, null, 2));

  console.log('\n=== Testing pdf-with-launch-action.pdf ===');
  const bytes2 = readFileSync('packages/test-fixtures/documents/adversarial/pdf-with-launch-action.pdf');
  const result2 = await validatePdfStructure(bytes2);
  console.log('Result:', JSON.stringify(result2, null, 2));
}

main().catch(console.error);