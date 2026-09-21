import { Worker } from "node:worker_threads";
export class BoundedWorkerPool {
    #workerUrl;
    #size;
    #slots = [];
    #queue = [];
    #nextId = 1;
    #closed = false;
    constructor(workerUrl, size = 2) {
        if (!Number.isSafeInteger(size) || size < 1 || size > 16)
            throw new Error("El pool necesita entre 1 y 16 workers.");
        this.#workerUrl = workerUrl;
        this.#size = size;
    }
    run(input, options = {}) {
        if (this.#closed)
            return Promise.reject(new Error("El pool de workers está cerrado."));
        const timeoutMs = options.timeoutMs ?? 30_000;
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
            return Promise.reject(new Error("Timeout de worker inválido."));
        if (options.signal?.aborted)
            return Promise.reject(abortError());
        return new Promise((resolve, reject) => {
            this.#queue.push({ id: this.#nextId++, input, resolve, reject, timeoutMs, ...(options.signal === undefined ? {} : { signal: options.signal }) });
            this.#dispatch();
        });
    }
    async close() {
        this.#closed = true;
        for (const queued of this.#queue.splice(0))
            queued.reject(new Error("El pool se cerró antes de ejecutar la tarea."));
        const workers = this.#slots.splice(0);
        for (const slot of workers) {
            this.#clearTask(slot);
            await slot.worker.terminate();
        }
    }
    #dispatch() {
        if (this.#closed)
            return;
        while (this.#slots.length < this.#size)
            this.#slots.push(this.#createSlot());
        for (const slot of this.#slots) {
            if (slot.task !== null)
                continue;
            const task = this.#queue.shift();
            if (!task)
                return;
            if (task.signal?.aborted) {
                task.reject(abortError());
                continue;
            }
            slot.task = task;
            slot.abortListener = () => { void this.#failAndReplace(slot, abortError()); };
            task.signal?.addEventListener("abort", slot.abortListener, { once: true });
            slot.timer = setTimeout(() => { void this.#failAndReplace(slot, new Error(`Timeout de worker tras ${task.timeoutMs} ms.`)); }, task.timeoutMs);
            slot.worker.postMessage({ id: task.id, input: task.input });
        }
    }
    #createSlot() {
        const worker = new Worker(this.#workerUrl);
        const slot = { worker, task: null, timer: null, abortListener: null };
        worker.on("message", (reply) => {
            const task = slot.task;
            if (!task || reply.id !== task.id)
                return;
            this.#clearTask(slot);
            if (reply.ok)
                task.resolve(reply.value);
            else
                task.reject(new Error(reply.error ?? "El worker falló sin diagnóstico."));
            this.#dispatch();
        });
        worker.on("error", (error) => { void this.#failAndReplace(slot, error); });
        worker.on("exit", (code) => { if (!this.#closed && code !== 0)
            void this.#failAndReplace(slot, new Error(`Worker finalizó con código ${code}.`)); });
        return slot;
    }
    async #failAndReplace(slot, error) {
        const index = this.#slots.indexOf(slot);
        if (index < 0)
            return;
        const task = slot.task;
        this.#clearTask(slot);
        this.#slots.splice(index, 1);
        await slot.worker.terminate().catch(() => undefined);
        task?.reject(error);
        this.#dispatch();
    }
    #clearTask(slot) {
        const task = slot.task;
        if (slot.timer !== null)
            clearTimeout(slot.timer);
        if (task?.signal && slot.abortListener)
            task.signal.removeEventListener("abort", slot.abortListener);
        slot.task = null;
        slot.timer = null;
        slot.abortListener = null;
    }
}
function abortError() {
    const error = new Error("Trabajo de parser cancelado.");
    error.name = "AbortError";
    return error;
}
//# sourceMappingURL=worker_pool.js.map