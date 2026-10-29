import {LoaderCircle} from 'lucide-react';
import styles from './channel-content.module.css';

export function TestingDataLoading({compact=false}:{compact?:boolean}) {
 return <section role="status" aria-live="polite" aria-busy="true" className={`${styles.card} ${compact?styles.loadingCompact:styles.loading}`}><LoaderCircle aria-hidden="true"/><span>Loading testing performance…</span></section>;
}
