import Image from "next/image";

const styles = {
  page: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1.5rem",
    height: "100dvh",
    overflow: "hidden",
    boxSizing: "border-box",
    backgroundColor: "#FAFAF7",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 600,
    width: "100%",
  },
  imageWrapper: {
    width: 240,
    height: 240,
    overflow: "hidden",
    borderRadius: 3,
    marginBottom: "0.9rem",
    boxShadow: "0 4px 24px rgba(59, 74, 64, 0.08)",
    position: "relative",
  },
  brand: {
    fontFamily: "var(--font-serif-garamond), 'Cormorant Garamond', Georgia, serif",
    fontWeight: 400,
    fontSize: "1.1rem",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: "#33403a",
    textAlign: "center",
    margin: 0,
  },
  divider: {
    width: 36,
    height: 2,
    backgroundColor: "#c4a355",
    borderRadius: 1,
    margin: "0.75rem 0",
  },
  contact: {
    fontFamily: "var(--font-sans), 'Inter', -apple-system, sans-serif",
    fontWeight: 400,
    fontSize: "0.78rem",
    letterSpacing: "0.12em",
  },
  contactLink: {
    color: "#c4a355",
    textDecoration: "none",
  },
};

export default function Homepage() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.imageWrapper}>
          <Image
            src="/images/waller-st-2.jpg"
            alt="Waller St Ventures"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        <h1 style={styles.brand}>Waller St Ventures</h1>

        <div style={styles.divider} />

        <div style={styles.contact}>
          <a href="mailto:hello@wallerstreetventures.com" style={styles.contactLink}>
            hello@wallerstreetventures.com
          </a>
        </div>
      </div>
    </div>
  );
}
