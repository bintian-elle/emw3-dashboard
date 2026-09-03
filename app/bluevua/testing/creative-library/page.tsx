import { RiGalleryLine } from "@remixicon/react";
import { TestingSectionPlaceholder } from "../section-placeholder";

export default function CreativeLibraryPage() {
  return <TestingSectionPlaceholder eyebrow="CREATIVE LIBRARY" title="Creative Assets" description="Browse tested copy, images, and videos with their channel, format, content tags, test group, and performance." icon={RiGalleryLine} items={["Copy","Images","Videos"]} />;
}
