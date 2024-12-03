"use strict";
class Processes {
    processesDiv = (h("div", { id: "processes" }));
    constructor() {
        document.body.appendChild(this.processesDiv);
    }
    get procs() {
        return this.state.procs;
    }
    set procs(value) {
        this.state.procs = value;
    }
    state = $state({
        procs: $state([]),
    });
    remove(pid) {
        delete this.state.procs[pid];
        // eslint-disable-next-line no-self-assign
        this.state.procs = this.state.procs;
    }
    register(proc) {
        this.state.procs.push(new WeakRef(proc));
        // eslint-disable-next-line no-self-assign
        this.state.procs = this.state.procs;
    }
    create(script, type = "common") {
        const proc = new IframeProcess(script, type, this.procs.length);
        this.register(proc);
        return proc;
    }
    async execute(path) {
        const data = await anura.fs.promises.readFile(path);
        // Read the file until the first newline
        let i = 0;
        while (data[i] !== 10 && i < data.length) {
            i++;
        }
        const shebang = new TextDecoder().decode(data.slice(0, i));
        const options = {
            lang: "module",
        };
        if (shebang.startsWith("#!")) {
            const [_, opt] = shebang.split(" ");
            if (opt) {
                Object.assign(options, JSON.parse(opt));
            }
        }
        const payload = data.slice(i + 1);
        if (["common", "module"].includes(options.lang)) {
            const script = new TextDecoder().decode(payload);
            const proc = this.create(script, options.lang);
            return proc;
        }
        throw new Error("Invalid shebang");
    }
}
class Process {
    stdout;
    stderr;
    stdin;
    kill() {
        anura.processes.remove(this.pid);
    }
}
class IframeProcess extends Process {
    pid;
    script;
    title = "Process";
    frame;
    constructor(script, type = "common", pid) {
        super();
        this.pid = pid;
        this.title = `Process ${pid}`;
        this.frame = (h("iframe", { id: `proc-${pid}`, style: "display: none;", srcdoc: `<!DOCTYPE html>
<html>
    <head>
        <script ${type === "module" ? 'type="module"' : ""}>
        ${script}
        </script>
    </head>
</html>` }));
        anura.processes.processesDiv.appendChild(this.frame);
        Object.assign(this.frame.contentWindow, {
            anura,
            AliceWM,
            ExternalApp,
            LocalFS,
            print: (message) => {
                this.window.postMessage({
                    type: "stdout",
                    message,
                });
            },
            println: (message) => {
                this.window.postMessage({
                    type: "stdout",
                    message: message + "\n",
                });
            },
            printerr: (message) => {
                this.window.postMessage({
                    type: "stderr",
                    message,
                });
            },
            printlnerr: (message) => {
                this.window.postMessage({
                    type: "stderr",
                    message: message + "\n",
                });
            },
            read: () => {
                return new Promise((resolve) => {
                    this.window.addEventListener("message", (e) => {
                        if (e.data.type === "stdin") {
                            resolve(e.data.message);
                        }
                    }, { once: true });
                });
            },
            readln: () => {
                return new Promise((resolve) => {
                    // Read until a newline
                    let buffer = "";
                    const listener = (e) => {
                        if (e.data.type === "stdin") {
                            buffer += e.data.message;
                            if (buffer.includes("\n")) {
                                resolve(buffer);
                                this.window.removeEventListener("message", listener);
                            }
                        }
                    };
                    this.window.addEventListener("message", listener);
                });
            },
            env: {
                process: this,
            },
        });
        this.stdin = new WritableStream({
            write: (message) => {
                this.window.postMessage({
                    type: "stdin",
                    message,
                });
            },
        });
        this.stderr = new ReadableStream({
            start: (controller) => {
                this.window.addEventListener("error", (e) => {
                    controller.enqueue(e.error);
                });
                this.window.addEventListener("message", (e) => {
                    if (e.data.type === "stderr") {
                        controller.enqueue(e.data.message);
                    }
                });
            },
        });
        this.stdout = new ReadableStream({
            start: (controller) => {
                this.window.addEventListener("message", (e) => {
                    if (e.data.type === "stdout") {
                        controller.enqueue(e.data.message);
                    }
                });
            },
        });
    }
    kill() {
        this.frame.remove();
        super.kill();
    }
    get alive() {
        return this.frame.isConnected;
    }
    get window() {
        return this.frame.contentWindow;
    }
    get document() {
        return this.frame.contentDocument;
    }
}
//# sourceMappingURL=Processes.js.map