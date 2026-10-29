import Image from "next/image";
import Link from "next/link";
import styles from "./site-home-logo.module.css";

/** The company mark is stored locally and links to the site-wide home page. */
export function SiteHomeLogo() {
  return <Link href="/" className={styles.link} aria-label="EMW3 · Home">
    <Image src="/brand/emw3-logo.gif" width={600} height={140} alt="" unoptimized className={styles.image}/>
    <span className={styles.static} aria-hidden="true">EMW3</span>
  </Link>;
}
