/**
 * Worker entrypoint. One image, many worker types:
 * WORKER_TYPE=agent-runner|ingest|sync|billing selects which queues this
 * process consumes. BullMQ consumers land here in the queue milestone.
 */
const workerType = process.env.WORKER_TYPE ?? 'all';

console.warn(`[workers] starting (type=${workerType}) — queue consumers arrive in a later milestone`);

// Keep the process alive so compose/dev orchestration behaves like prod will.
setInterval(() => {}, 60_000);
