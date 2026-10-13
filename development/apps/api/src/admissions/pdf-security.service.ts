import { Injectable } from '@nestjs/common';
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRef,
  PDFContext,
  PDFObject,
} from 'pdf-lib';

export interface ValidationResult {
  safe: boolean;
  issues: string[];
  details: {
    hasJavaScript: boolean;
    hasLaunchAction: boolean;
    hasEmbeddedFiles: boolean;
    hasExecutableForms: boolean;
    hasEncrypt: boolean;
    hasOpenAction: boolean;
    hasAdditionalActions: boolean;
  };
}

// Type for dict-like PDF objects (PDFDict, resolved PDFRef, etc.)
type DictLike = {
  get(key: PDFName): PDFObject | undefined;
  has(key: PDFName): boolean;
  delete(key: PDFName): void;
  set(key: PDFName, value: PDFObject): void;
  keys(): IterableIterator<PDFName> | PDFName[];
  values(): IterableIterator<PDFObject> | PDFObject[];
  entries(): IterableIterator<[PDFName, PDFObject]> | [PDFName, PDFObject][];
};

// Simple type guards that check for methods we need at runtime
function hasGetMethod(obj: unknown): obj is { get(key: PDFName): PDFObject | undefined; has(key: PDFName): boolean; delete(key: PDFName): void; set(key: PDFName, value: PDFObject): void; keys(): IterableIterator<PDFName>; values(): IterableIterator<PDFObject>; entries(): IterableIterator<[PDFName, PDFObject]> } {
  return obj !== null && typeof obj === 'object' && 'get' in obj && typeof (obj as Record<string, unknown>).get === 'function';
}

function isRef(obj: unknown): obj is PDFRef {
  return obj !== null && typeof obj === 'object' && 'objectNumber' in obj;
}

function isArray(obj: unknown): obj is { array: PDFRef[] } {
  return obj !== null && typeof obj === 'object' && 'array' in obj;
}

function getArray(obj: unknown): PDFRef[] {
  if (isArray(obj)) {
    return obj.array as PDFRef[];
  }
  return [];
}

function getStringValue(obj: unknown): string {
  if (obj !== null && typeof obj === 'object' && 'value' in obj) {
    return String((obj as { value: unknown }).value);
  }
  return '';
}

function getEncodedName(obj: unknown): string {
  if (obj !== null && typeof obj === 'object' && 'encodedName' in obj) {
    return String((obj as { encodedName: unknown }).encodedName);
  }
  return '';
}

@Injectable()
export class PdfSecurityService {
  private readonly MAX_DEPTH = 20;
  private readonly MAX_OBJECTS = 10000;

  async validatePdfStructure(buffer: Uint8Array): Promise<ValidationResult> {
    const issues: string[] = [];
    const details: ValidationResult['details'] = {
      hasJavaScript: false,
      hasLaunchAction: false,
      hasEmbeddedFiles: false,
      hasExecutableForms: false,
      hasEncrypt: false,
      hasOpenAction: false,
      hasAdditionalActions: false,
    };

    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    } catch (error) {
      issues.push(`PDF parse error: ${error instanceof Error ? error.message : 'unknown'}`);
      return { safe: false, issues, details };
    }

    // Guard against malformed PDFs where catalog is missing
    if (!doc.catalog) {
      issues.push('PDF missing catalog');
      return { safe: false, issues, details };
    }

    // Check for encryption in trailer
    if (doc.context.trailerInfo.Encrypt) {
      details.hasEncrypt = true;
      issues.push('PDF is encrypted (Encrypt dictionary in trailer)');
    }

    // Check catalog for dangerous entries
    const catalog = doc.catalog;
    this.checkCatalog(catalog, doc.context, issues, details);

    // Check for embedded files via Name tree (EmbeddedFiles)
    this.checkEmbeddedFiles(catalog, doc.context, issues, details);

    // Check AcroForm for executable forms
    this.checkAcroForm(catalog, doc.context, issues, details);

    // Check page tree for annotations with actions
    const pagesRef = catalog.get(PDFName.of('Pages'));
    if (pagesRef && isRef(pagesRef)) {
      const pages = doc.context.lookup(pagesRef);
      if (hasGetMethod(pages)) {
        this.checkPageTree(pages, doc.context, issues, details);
      }
    }

    return {
      safe: issues.length === 0,
      issues,
      details,
    };
  }

  private getDictEntry(dict: DictLike, key: PDFName): PDFObject | undefined {
    return dict.get(key);
  }

  // Type for dict-like objects (PDFDict, PDFRef resolved, etc.)
  private checkCatalog(
    catalog: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
  ): void {
    console.log('[DEBUG] checkCatalog called');
    // Check for /OpenAction
    const openActionRef = this.getDictEntry(catalog, PDFName.of('OpenAction'));
    console.log('[DEBUG] openActionRef:', openActionRef);
    if (openActionRef) {
      let actionRef = openActionRef;
      if (!isRef(openActionRef)) {
        // If it's already a dict, use it directly
        actionRef = openActionRef;
      }
      if (actionRef && (isRef(actionRef) || hasGetMethod(actionRef))) {
        details.hasOpenAction = true;
        let action: PDFObject | PDFRef = actionRef;
        if (isRef(actionRef)) {
          action = context.lookup(actionRef)!;
        }
        if (hasGetMethod(action)) {
          this.checkActionDict(action, context, issues, details, 'OpenAction');
        }
      }
    }

    // Check for /AA (Additional Actions)
    const additionalActionsRef = this.getDictEntry(catalog, PDFName.of('AA'));
    console.log('[DEBUG] additionalActionsRef:', additionalActionsRef);
    if (additionalActionsRef) {
      let aaDictRef = additionalActionsRef;
      if (!isRef(additionalActionsRef)) {
        aaDictRef = additionalActionsRef;
      }
      if (aaDictRef && (isRef(aaDictRef) || hasGetMethod(aaDictRef))) {
        details.hasAdditionalActions = true;
        let aaDict: PDFObject | PDFRef = aaDictRef;
        if (isRef(aaDictRef)) {
          aaDict = context.lookup(aaDictRef)!;
        } else {
          aaDict = aaDictRef;
        }
        if (hasGetMethod(aaDict)) {
          for (const [key, value] of aaDict.entries()) {
            let actionValue: PDFObject | PDFRef = value;
            if (isRef(value)) {
              actionValue = context.lookup(value)!;
            }
            if (hasGetMethod(actionValue)) {
              this.checkActionDict(actionValue, context, issues, details, `AA/${getEncodedName(key)}`);
            }
          }
        }
      }
    }

    // Check for /Names tree (includes EmbeddedFiles)
    const namesRef = this.getDictEntry(catalog, PDFName.of('Names'));
    console.log('[DEBUG] namesRef:', namesRef);
    if (namesRef) {
      let namesDictRef = namesRef;
      if (!isRef(namesRef)) {
        // If it's already a dict, use it directly
        namesDictRef = namesRef;
      }
      if (namesDictRef && (isRef(namesDictRef) || hasGetMethod(namesDictRef))) {
        let namesDict: PDFObject | PDFRef = namesDictRef;
        if (isRef(namesDictRef)) {
          namesDict = context.lookup(namesDictRef)!;
        } else {
          namesDict = namesDictRef;
        }
        if (hasGetMethod(namesDict)) {
          const embeddedFilesRef = namesDict.get(PDFName.of('EmbeddedFiles'));
          console.log('[DEBUG] embeddedFilesRef:', embeddedFilesRef);
          if (embeddedFilesRef && (isRef(embeddedFilesRef) || hasGetMethod(embeddedFilesRef))) {
            details.hasEmbeddedFiles = true;
            issues.push('PDF contains embedded files (/Names/EmbeddedFiles)');
          }
        }
      }
    }

    // Check for /AF (Associated Files)
    const afRef = this.getDictEntry(catalog, PDFName.of('AF'));
    console.log('[DEBUG] afRef:', afRef);
    if (afRef && isRef(afRef)) {
      details.hasEmbeddedFiles = true;
      issues.push('PDF contains associated files (/AF)');
    }
  }

  private checkPageTree(
    pages: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
  ): void {
    console.log('[DEBUG] checkPageTree called');
    const kids = pages.get(PDFName.of('Kids'));
    const kidsArray = getArray(kids);
    console.log('[DEBUG] kidsArray length:', kidsArray.length);
    if (kidsArray.length > 0) {
      for (const kidRef of kidsArray) {
        const kid = context.lookup(kidRef);
        console.log('[DEBUG] kid:', kid?.constructor?.name, 'hasGetMethod:', hasGetMethod(kid));
        if (hasGetMethod(kid)) {
          // Check page-level Additional Actions (AA)
          const pageAA = kid.get(PDFName.of('AA'));
          console.log('[DEBUG] pageAA:', pageAA);
          if (pageAA) {
            let aaDict: PDFObject | PDFRef = pageAA;
            // If it's a reference, resolve it
            if (isRef(pageAA)) {
              aaDict = context.lookup(pageAA)!;
            }
            console.log('[DEBUG] aaDict:', aaDict?.constructor?.name, 'hasGetMethod:', hasGetMethod(aaDict));
            console.log('[DEBUG] aaDict type:', typeof aaDict, 'aaDict:', aaDict);
            if (hasGetMethod(aaDict)) {
              console.log('[DEBUG] aaDict.entries():', typeof aaDict.entries === 'function');
              let entryCount = 0;
              for (const [key, value] of aaDict.entries()) {
                entryCount++;
                console.log('[DEBUG] aaDict entry:', getEncodedName(key), 'value:', value);
                let actionValue: PDFObject | PDFRef = value;
                // If it's a reference, resolve it
                if (isRef(value)) {
                  actionValue = context.lookup(value)!;
                }
                console.log('[DEBUG] aaDict entry:', getEncodedName(key), 'actionValue:', actionValue);
                if (hasGetMethod(actionValue)) {
                  this.checkActionDict(actionValue, context, issues, details, `Page AA/${getEncodedName(key)}`);
                }
              }
              console.log('[DEBUG] Total entries processed:', entryCount);
            } else {
              console.log('[DEBUG] hasGetMethod(aaDict) returned FALSE');
            }
          }

          // Check page annotations
          const annots = kid.get(PDFName.of('Annots'));
          const annotsArray = getArray(annots);
          if (annotsArray.length > 0) {
            for (const annotRef of annotsArray) {
              const annot = context.lookup(annotRef)!;
              if (hasGetMethod(annot)) {
                this.checkAnnotation(annot, context, issues, details);
              }
            }
          }

          // Recursively check child pages
          const subKids = kid.get(PDFName.of('Kids'));
          const subKidsArray = getArray(subKids);
          if (subKidsArray.length > 0) {
            this.checkPageTree(kid, context, issues, details);
          }
        }
      }
    }
  }

  private checkAnnotation(
    annot: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
  ): void {
    // Check for action (A) in annotation
    const actionRef = annot.get(PDFName.of('A'));
    if (actionRef && isRef(actionRef)) {
      const action = context.lookup(actionRef)!;
      if (hasGetMethod(action)) {
        this.checkActionDict(action, context, issues, details, 'Annotation/A');
      }
    }

    // Check for additional actions (AA) in annotation
    const aaRef = annot.get(PDFName.of('AA'));
    if (aaRef && isRef(aaRef)) {
      const aaDict = context.lookup(aaRef)!;
      if (hasGetMethod(aaDict)) {
        for (const [key, value] of aaDict.entries()) {
          if (value && isRef(value)) {
            const action = context.lookup(value)!;
            if (hasGetMethod(action)) {
              this.checkActionDict(action, context, issues, details, `Annotation/AA/${getEncodedName(key)}`);
            }
          }
        }
      }
    }
  }

  private checkActionDict(
    action: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
    location: string,
  ): void {
    console.log('[DEBUG] checkActionDict called at', location);
    const subtype = action.get(PDFName.of('S'));
    console.log('[DEBUG] subtype:', subtype);
    if (!subtype) return;

    const subtypeName = getEncodedName(subtype);
    console.log('[DEBUG] subtypeName:', subtypeName);
    if (!subtypeName) return;

    // Check for JavaScript action
    if (subtypeName === '/JavaScript') {
      details.hasJavaScript = true;
      issues.push(`JavaScript action found at ${location}`);
      const js = action.get(PDFName.of('JS'));
      if (js && isRef(js)) {
        const jsContent = context.lookup(js);
        if (jsContent) {
          issues.push(`  JS content: ${getStringValue(jsContent).substring(0, 200)}`);
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
      const file = action.get(PDFName.of('F'));
      if (file && isRef(file)) {
        const fileContent = context.lookup(file);
        if (fileContent) {
          issues.push(`  Launch target: ${getStringValue(fileContent).substring(0, 200)}`);
        }
      }
      const win = action.get(PDFName.of('Win'));
      if (win && isRef(win)) {
        const winContent = context.lookup(win);
        if (winContent) {
          issues.push(`  Win params: ${getStringValue(winContent).substring(0, 200)}`);
        }
      }
      const mac = action.get(PDFName.of('Mac'));
      if (mac && isRef(mac)) {
        const macContent = context.lookup(mac);
        if (macContent) {
          issues.push(`  Mac params: ${getStringValue(macContent).substring(0, 200)}`);
        }
      }
    }

    // Check for URI action that could be malicious (optional - log but don't block)
    if (subtypeName === '/URI') {
      const uri = action.get(PDFName.of('URI'));
      if (uri && isRef(uri)) {
        const uriContent = context.lookup(uri);
        if (uriContent) {
          issues.push(`URI action at ${location}: ${getStringValue(uriContent).substring(0, 200)}`);
        }
      }
    }

    // Check for SubmitForm action that could exfiltrate data
    if (subtypeName === '/SubmitForm') {
      issues.push(`SubmitForm action at ${location} (potential data exfiltration)`);
    }

    // Check for GoToR (remote go-to) that could reference external PDFs
    if (subtypeName === '/GoToR') {
      issues.push(`GoToR (remote go-to) action at ${location}`);
    }
  }

  private checkEmbeddedFiles(
    catalog: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
  ): void {
    // Already checked in catalog via /Names/EmbeddedFiles
    // Also check for /AF (Associated Files) in catalog or pages
    const afRef = this.getDictEntry(catalog, PDFName.of('AF'));
    if (afRef && isRef(afRef)) {
      details.hasEmbeddedFiles = true;
      issues.push('PDF contains associated files (/AF)');
    }
  }

  private checkAcroForm(
    catalog: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
  ): void {
    console.log('[DEBUG] checkAcroForm called');
    const acroFormRef = this.getDictEntry(catalog, PDFName.of('AcroForm'));
    console.log('[DEBUG] acroFormRef:', acroFormRef);
    if (!acroFormRef) return;

    let acroForm: PDFObject | PDFRef = acroFormRef;
    // If it's a reference, resolve it
    if (isRef(acroFormRef)) {
      acroForm = context.lookup(acroFormRef)!;
    }
    console.log('[DEBUG] acroForm:', acroForm?.constructor?.name, 'hasGetMethod:', hasGetMethod(acroForm));
    if (!hasGetMethod(acroForm)) return;

    // Check for NeedAppearances (can be used to hide malicious content)
    const needAppearances = acroForm.get(PDFName.of('NeedAppearances'));
    if (needAppearances) {
      issues.push('AcroForm has NeedAppearances flag');
    }

    // Check for fields with actions
    const fieldsRef = acroForm.get(PDFName.of('Fields'));
    const fieldsArray = getArray(fieldsRef);
    if (fieldsArray.length > 0) {
      for (const fieldRef of fieldsArray) {
        const field = context.lookup(fieldRef)!;
        if (hasGetMethod(field)) {
          this.checkField(field, context, issues, details);
        }
      }
    }

    // Check for XFA (XML Forms Architecture) - can contain JavaScript
    const xfaRef = acroForm.get(PDFName.of('XFA'));
    console.log('[DEBUG] xfaRef:', xfaRef);
    if (xfaRef) {
      let xfa: PDFObject | PDFRef = xfaRef;
      if (isRef(xfaRef)) {
        xfa = context.lookup(xfaRef)!;
      }
      if (xfa) {
        const xfaStr = String(xfa);
        if (xfaStr.includes('<script') || xfaStr.includes('javascript:')) {
          details.hasExecutableForms = true;
          issues.push('XFA form contains JavaScript');
        }
      }
    }

    // Check for DR (Default Resources) with JavaScript
    const drRef = acroForm.get(PDFName.of('DR'));
    console.log('[DEBUG] drRef:', drRef);
    if (drRef) {
      let dr: PDFObject | PDFRef = drRef;
      if (isRef(drRef)) {
        dr = context.lookup(drRef)!;
      }
      if (hasGetMethod(dr)) {
        const jsRef = dr.get(PDFName.of('JavaScript'));
        console.log('[DEBUG] jsRef:', jsRef);
        if (jsRef) {
          let js: PDFObject | PDFRef = jsRef;
          if (isRef(jsRef)) {
            js = context.lookup(jsRef)!;
          }
          if (js) {
            details.hasJavaScript = true;
            details.hasExecutableForms = true;
            issues.push('AcroForm DR contains JavaScript');
          }
        }
      }
    }
  }

  private checkField(
    field: DictLike,
    context: PDFContext,
    issues: string[],
    details: ValidationResult['details'],
  ): void {
    console.log('[DEBUG] checkField called');
    // Check for field actions (AA - Additional Actions)
    const aaRef = field.get(PDFName.of('AA'));
    console.log('[DEBUG] field aaRef:', aaRef);
    if (aaRef) {
      let aaDictRef = aaRef;
      if (!isRef(aaRef)) {
        aaDictRef = aaRef;
      }
      if (aaDictRef && (isRef(aaDictRef) || hasGetMethod(aaDictRef))) {
        let aaDict: PDFObject | PDFRef = aaDictRef;
        if (isRef(aaDictRef)) {
          aaDict = context.lookup(aaDictRef)!;
        } else {
          aaDict = aaDictRef;
        }
        if (hasGetMethod(aaDict)) {
          for (const [key, value] of aaDict.entries()) {
            let actionValue = value;
            if (isRef(value)) {
              actionValue = context.lookup(value)!;
            } else {
              actionValue = value;
            }
            if (hasGetMethod(actionValue)) {
              this.checkActionDict(actionValue, context, issues, details, `Field/AA/${getEncodedName(key)}`);
              details.hasExecutableForms = true;
            }
          }
        }
      }
    }

    // Check for field action (A)
    const aRef = field.get(PDFName.of('A'));
    console.log('[DEBUG] field aRef:', aRef);
    if (aRef) {
      let actionRef: PDFObject | PDFRef = aRef;
      if (!isRef(aRef)) {
        actionRef = aRef;
      }
      if (actionRef && (isRef(actionRef) || hasGetMethod(actionRef))) {
        let action: PDFObject | PDFRef = actionRef;
        if (isRef(actionRef)) {
          action = context.lookup(actionRef)!;
        } else {
          action = actionRef;
        }
        if (hasGetMethod(action)) {
          this.checkActionDict(action, context, issues, details, 'Field/A');
          details.hasExecutableForms = true;
        }
      }
    }

    // Check for JavaScript in field format/validation/calculate
    const formatRef = field.get(PDFName.of('F'));
    if (formatRef) {
      let format: PDFObject | PDFRef = formatRef;
      if (isRef(formatRef)) {
        format = context.lookup(formatRef)!;
      }
      if (format) {
        const formatStr = String(format);
        if (formatStr.includes('javascript:') || formatStr.includes('app.')) {
          details.hasJavaScript = true;
          details.hasExecutableForms = true;
          issues.push('Field format contains JavaScript');
        }
      }
    }

    const validateRef = field.get(PDFName.of('V'));
    if (validateRef) {
      let validate: PDFObject | PDFRef = validateRef;
      if (isRef(validateRef)) {
        validate = context.lookup(validateRef)!;
      }
      if (validate) {
        const validateStr = String(validate);
        if (validateStr.includes('javascript:') || validateStr.includes('app.')) {
          details.hasJavaScript = true;
          details.hasExecutableForms = true;
          issues.push('Field validation contains JavaScript');
        }
      }
    }
  }

  async sanitizePdf(buffer: Uint8Array): Promise<Uint8Array> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    // Remove metadata (Info dictionary)
    const infoRef = doc.context.trailerInfo.Info;
    if (infoRef && isRef(infoRef)) {
      doc.context.delete(infoRef);
      doc.context.trailerInfo.Info = undefined;
    }

    // Remove Metadata stream from catalog
    const catalog = doc.catalog;
    const metadataRef = catalog.get(PDFName.of('Metadata'));
    if (metadataRef && isRef(metadataRef)) {
      doc.context.delete(metadataRef);
      catalog.delete(PDFName.of('Metadata'));
    }

    // Remove OpenAction
    const openActionRef = catalog.get(PDFName.of('OpenAction'));
    if (openActionRef && isRef(openActionRef)) {
      doc.context.delete(openActionRef);
      catalog.delete(PDFName.of('OpenAction'));
    }

    // Remove AA (Additional Actions)
    const aaRef = catalog.get(PDFName.of('AA'));
    if (aaRef && isRef(aaRef)) {
      doc.context.delete(aaRef);
      catalog.delete(PDFName.of('AA'));
    }

    // Remove Names tree (including EmbeddedFiles)
    const namesRef = catalog.get(PDFName.of('Names'));
    if (namesRef && isRef(namesRef)) {
      const namesDict = doc.context.lookup(namesRef);
      if (hasGetMethod(namesDict)) {
        const embeddedFilesRef = namesDict.get(PDFName.of('EmbeddedFiles'));
        if (embeddedFilesRef && isRef(embeddedFilesRef)) {
          doc.context.delete(embeddedFilesRef);
        }
      }
      doc.context.delete(namesRef);
      catalog.delete(PDFName.of('Names'));
    }

    // Remove AF (Associated Files)
    const afRef = catalog.get(PDFName.of('AF'));
    if (afRef && isRef(afRef)) {
      doc.context.delete(afRef);
      catalog.delete(PDFName.of('AF'));
    }

    // Flatten forms - remove AcroForm entirely
    const acroFormRef = catalog.get(PDFName.of('AcroForm'));
    if (acroFormRef && isRef(acroFormRef)) {
      doc.context.delete(acroFormRef);
      catalog.delete(PDFName.of('AcroForm'));
    }

    // Remove page-level annotations with actions
    const pagesRef = catalog.get(PDFName.of('Pages'));
    if (pagesRef && isRef(pagesRef)) {
      const pages = doc.context.lookup(pagesRef);
      if (hasGetMethod(pages)) {
        this.sanitizePageTree(pages, doc.context);
      }
    }

    // Remove encryption dictionary if present
    const encryptRef = doc.context.trailerInfo.Encrypt;
    if (encryptRef && isRef(encryptRef)) {
      doc.context.delete(encryptRef);
      doc.context.trailerInfo.Encrypt = undefined;
    }

    // Save sanitized PDF
    const sanitizedBytes = await doc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });

    return new Uint8Array(sanitizedBytes);
  }

  private sanitizePageTree(
    pages: DictLike,
    context: PDFContext,
  ): void {
    const kids = pages.get(PDFName.of('Kids'));
    const kidsArray = getArray(kids);
    if (kidsArray.length > 0) {
      for (const kidRef of kidsArray) {
        const kid = context.lookup(kidRef)!;
        if (hasGetMethod(kid)) {
          // Remove page-level AA
          const pageAA = kid.get(PDFName.of('AA'));
          if (pageAA) {
            let aaRef: PDFObject | PDFRef = pageAA;
            if (!isRef(pageAA)) {
              aaRef = pageAA;
            }
            if (aaRef && isRef(aaRef)) {
              context.delete(aaRef);
            }
            kid.delete(PDFName.of('AA'));
          }

          // Remove annotations with actions
          const annots = kid.get(PDFName.of('Annots'));
          const annotsArray = getArray(annots);
          if (annotsArray.length > 0) {
            const safeAnnots: PDFRef[] = [];
            for (const annotRef of annotsArray) {
              const annot = context.lookup(annotRef)!;
              if (hasGetMethod(annot)) {
                // Keep annotations without actions
                const hasAction = annot.has(PDFName.of('A')) || annot.has(PDFName.of('AA'));
                if (!hasAction) {
                  safeAnnots.push(annotRef);
                }
              }
            }
            if (safeAnnots.length > 0) {
              kid.set(PDFName.of('Annots'), context.obj(safeAnnots));
            } else {
              kid.delete(PDFName.of('Annots'));
            }
          }

          // Recursively sanitize child pages
          const subKids = kid.get(PDFName.of('Kids'));
          const subKidsArray = getArray(subKids);
          if (subKidsArray.length > 0) {
            this.sanitizePageTree(kid, context);
          }
        }
      }
    }
  }
}