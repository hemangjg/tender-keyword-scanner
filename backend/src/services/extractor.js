const path = require('path');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const mammoth = require('mammoth');

/** Rebuild text per page, keeping line breaks where the y-position changes. */
async function extractPdf(buffer) {
  const pages = [];
  const data = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent();
      let text = '';
      let lastY;
      for (const item of content.items) {
        if (lastY !== undefined && lastY !== item.transform[5]) text += '\n';
        text += item.str;
        lastY = item.transform[5];
      }
      pages.push(text);
      return text;
    },
  });
  return { pages, text: pages.join('\n'), pageCount: data.numpages };
}

async function extractDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return { pages: [value], text: value, pageCount: 1 };
}

/** Extract text from a PDF or DOCX buffer. Throws on unsupported type. */
async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return extractPdf(buffer);
  if (ext === '.docx') return extractDocx(buffer);
  throw new Error(`Unsupported file type: ${ext || 'unknown'} (only .pdf and .docx)`);
}

module.exports = { extractText };
