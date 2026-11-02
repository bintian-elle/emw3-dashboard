import styles from "../workspace-entry.module.css";

export function AccessForm({ returnTo }: { returnTo: string }) {
  return <div style={{ marginTop: "1.5rem" }}><a className={styles.button} href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>Sign in with Google</a></div>;
}
