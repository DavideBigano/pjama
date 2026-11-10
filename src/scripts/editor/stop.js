import { SHUTDOWN_HEADER } from '../../../.claude/skills/proj-map/editor/server/app.js';
import { getPort } from './port.js';

try {
    const port = getPort(process.argv.slice(2));
    const response = await fetch(`http://127.0.0.1:${port}/api/shutdown`, {
        method: 'POST',
        headers: { [SHUTDOWN_HEADER]: '1' },
    }).catch((error) => {
        // fetch rejects instead of resolving when the request never gets an answer. A refused connection means
        // nothing listens on the port; any other failure is a real error.
        if (error.cause?.code !== 'ECONNREFUSED') throw error;
        return null;
    });
    if (response === null) {
        console.log(`No projMap editor running on port ${port}`);
        process.exit();
    }
    if (!response.ok) {
        throw new Error(
            `Port ${port} is held by something other than the projMap editor`,
        );
    }
    console.log(`Stopped the projMap editor on port ${port}`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
