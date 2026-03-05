import Image from "next/image";

const styles = {
  page: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    minHeight: "100dvh",
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
    width: 260,
    height: 260,
    overflow: "hidden",
    borderRadius: 3,
    marginBottom: "1.8rem",
    boxShadow: "0 4px 24px rgba(44, 62, 45, 0.08)",
    position: "relative",
  },
  brand: {
    fontFamily: "var(--font-serif-garamond), 'Cormorant Garamond', Georgia, serif",
    fontWeight: 400,
    fontSize: "1.1rem",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: "#2C3E2D",
    textAlign: "center",
  },
  divider: {
    width: 36,
    height: 2,
    backgroundColor: "#e8b630",
    borderRadius: 1,
    margin: "1.5rem 0",
  },
  contact: {
    fontFamily: "var(--font-sans), 'Inter', -apple-system, sans-serif",
    fontWeight: 400,
    fontSize: "0.78rem",
    letterSpacing: "0.12em",
  },
  contactLink: {
    color: "#6B7C6C",
    textDecoration: "none",
  },
};

export default function Homepage() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.imageWrapper}>
          <Image
            src="/images/waller-st.jpg"
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
