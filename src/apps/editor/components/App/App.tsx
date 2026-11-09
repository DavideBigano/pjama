import styles from './App.module.css';

/** Root of the editor: the shell every view renders into. */
export function App() {
    return (
        <main className={styles.app}>
            <h1>Pjama editor</h1>
        </main>
    );
}
