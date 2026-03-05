import { COLORS } from "../../constants/theme";

const PDF_SERIF = "Georgia, serif";
const PDF_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const styles = `
  :root {
    --green900: ${COLORS.green900};
    --green700: ${COLORS.green700};
    --green600: ${COLORS.green600};
    --cream50: ${COLORS.cream50};
    --cream100: ${COLORS.cream100};
    --text900: ${COLORS.text900};
    --text700: ${COLORS.text700};
    --text500: ${COLORS.text500};
    --text400: ${COLORS.text400};
    --border: ${COLORS.border};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${PDF_SANS};
    color: var(--text700);
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
  }
  @page {
    margin: 48px 126px 72px 126px;
  }
  .page {
    background: #ffffff;
  }
  .section {
    padding-bottom: 20px;
    page-break-after: always;
  }
  .section:last-of-type {
    page-break-after: auto;
  }
  .section-header {
    margin-bottom: 20px;
  }
  .brand {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--green600);
    margin-bottom: 10px;
  }
  h2 {
    font-family: ${PDF_SERIF};
    font-size: 22px;
    font-weight: 600;
    color: var(--text900);
    margin: 0 0 4px 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .divider {
    width: 28px;
    height: 2px;
    background: var(--green600);
    border-radius: 1px;
    margin-top: 12px;
  }
  h3 {
    font-family: ${PDF_SERIF};
    font-size: 14px;
    font-weight: 600;
    color: var(--text900);
    margin: 20px 0 20px 0;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  .section > div:last-child h2 {
    font-family: ${PDF_SERIF};
    font-size: 14px;
    font-weight: 600;
    color: var(--text900);
    margin: 20px 0 20px 0;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  h4 {
    font-family: ${PDF_SANS};
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--green600);
    margin: 14px 0 8px 0;
  }
  .step-label {
    font-family: ${PDF_SANS};
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--green600);
    margin-bottom: 8px;
  }
  p {
    font-size: 11px;
    line-height: 1.6;
    margin: 0 0 10px 0;
  }
  .callout {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--cream100);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 10px 12px;
    margin-bottom: 16px;
  }
  .callout-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }
  .callout p {
    margin: 0;
    font-size: 10px;
    color: var(--text700);
    line-height: 1.5;
  }
  .memo-summary {
    border-left: 3px solid var(--green600);
    padding-left: 14px;
    margin-bottom: 14px;
  }
  .memo-tldr p {
    text-indent: 20px;
  }
  .signature {
    margin-top: 20px;
    font-size: 11px;
    color: var(--text500);
    line-height: 1.5;
  }
  .table {
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    background: #ffffff;
    margin-bottom: 12px;
  }
  .table-header {
    padding: 8px 12px;
    background: #f5f5f5;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text500);
  }
  .table-columns {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr 1.1fr 0.8fr;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text400);
  }
  .table-row {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr 1.1fr 0.8fr;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 10px;
    align-items: center;
  }
  .table-row span {
    text-align: right;
  }
  .table-row span:first-child {
    text-align: left;
    color: var(--text900);
  }
  .table-row:nth-child(even) {
    background: #fafafa;
  }
  .table-row .accent {
    color: var(--green700);
    font-weight: 600;
  }
  .table-row .muted {
    color: var(--text500);
  }
  .subhead {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--green700);
    margin: 14px 0 8px 0;
  }
  .bullet-list {
    margin: 0 0 10px 16px;
    padding: 0;
    font-size: 11px;
    line-height: 1.6;
  }
  .bullet-list li {
    margin-bottom: 4px;
  }
  .terms-summary p {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text900);
  }
  .science-section {
    margin-bottom: 12px;
  }
  .science-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--border);
    border-radius: 4px;
    margin: 12px 0;
  }
  .science-table th {
    text-align: left;
    font-size: 9px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--text900);
    font-weight: 600;
  }
  .science-table td {
    font-size: 9px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    line-height: 1.4;
  }
  .note {
    font-size: 9px;
    color: var(--text400);
    margin-top: 6px;
    line-height: 1.4;
  }
`;

export default function PdfPacket({ sections, dealTitle }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style>{styles}</style>
      </head>
      <body>
        <div className="page">
          {sections.map((section, idx) => (
            <section key={`${section.title}-${idx}`} className="section">
              <div className="section-header">
                <div className="brand">Puget Sound Therapeutics</div>
                <h2>{section.title}</h2>
                {idx === 0 && dealTitle ? (
                  <p style={{ fontSize: 10, color: COLORS.text500, margin: "4px 0 0 0" }}>{dealTitle}</p>
                ) : null}
                <div className="divider" />
              </div>
              <div dangerouslySetInnerHTML={{ __html: section.bodyHtml }} />
            </section>
          ))}
        </div>
      </body>
    </html>
  );
}
