import WebsiteHome from "@/components/website-home";
import { generateHomeMetadata } from "@/lib/site/seo";

export const metadata = generateHomeMetadata("en");

export default function WebsiteHomePage() {
  return <WebsiteHome locale="en" />;
}
