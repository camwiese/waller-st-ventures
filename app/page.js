import MarketingHomepage from "../components/MarketingHomepage";
import PstHomepage, { metadata as pstMetadata } from "./pst/page";
import { ROUTES } from "../lib/routes";

export const metadata = ROUTES.ROOT === "/" ? pstMetadata : {};

export default async function Homepage(props) {
  if (ROUTES.ROOT === "/") {
    return <PstHomepage {...props} />;
  }

  return <MarketingHomepage />;
}
