"use strict";
const AnuraFDSymbol = Symbol.for("AnuraFD");
class AnuraFSOperations {
}
/**
 * Generic class for a filesystem provider
 * This should be extended by the various filesystem providers
 */
class AFSProvider extends AnuraFSOperations {
}
class AFSShell {
    env = new Proxy({}, {
        get: (target, prop) => {
            if (prop === "set") {
                return (key, value) => {
                    target[key] = value;
                };
            }
            if (prop === "get") {
                return (key) => target[key];
            }
            if (prop in target) {
                return target[prop];
            }
            return undefined;
        },
        set: (target, prop, value) => {
            if (prop === "set" || prop === "get") {
                return false;
            }
            target[prop] = value;
            return true;
        },
    });
    #relativeToAbsolute(path) {
        if (path.startsWith("/")) {
            return path;
        }
        return (this.env.PWD + "/" + path).replace(/\/+/g, "/");
    }
    cat(files, callback) {
        let contents = "";
        let remaining = files.length;
        files.forEach((file) => {
            anura.fs.readFile(this.#relativeToAbsolute(file), (err, data) => {
                if (err) {
                    callback(err, contents);
                    return;
                }
                contents += data.toString() + "\n";
                remaining--;
                if (remaining === 0) {
                    callback(null, contents.replace(/\n$/, ""));
                }
            });
        });
    }
    // This differs from the Filer version, because here we can use the anura.files API to open the file
    // instead of evaluating the contents as js. The behaviour of the Filer version can be replicated by
    // registering a file provider that evaluates the contents as js.
    exec(path) {
        anura.files.open(this.#relativeToAbsolute(path));
    }
    find(path, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        callback ||= () => { };
        options ||= {};
        function walk(dir, done) {
            const results = [];
            anura.fs.readdir(dir, (err, list) => {
                if (err) {
                    done(err, results);
                    return;
                }
                let pending = list.length;
                if (!pending) {
                    done(null, results);
                    return;
                }
                list.forEach((file) => {
                    file = dir + "/" + file;
                    anura.fs.stat(file, (err, stat) => {
                        if (err) {
                            done(err, results);
                            return;
                        }
                        if (stat.isDirectory()) {
                            walk(file, (err, res) => {
                                results.push(...res);
                                pending--;
                                if (!pending) {
                                    done(null, results);
                                }
                            });
                        }
                        else {
                            results.push(file);
                            pending--;
                            if (!pending) {
                                done(null, results);
                            }
                        }
                    });
                });
            });
        }
        walk(this.#relativeToAbsolute(path), (err, results) => {
            if (err) {
                callback(err, []);
                return;
            }
            if (options.regex) {
                results = results.filter((file) => options.regex.test(file));
            }
            if (options.name) {
                results = results.filter((file) => file.includes(options.name));
            }
            if (options.path) {
                results = results.filter((file) => file.includes(options.path));
            }
            if (options.exec) {
                results.forEach((file) => options.exec(file));
            }
            else {
                callback(null, results);
            }
        });
    }
    ls(dir, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        callback ||= () => { };
        options ||= {};
        const entries = [];
        if (options.recursive) {
            this.find(dir, (err, files) => {
                if (err) {
                    callback(err, []);
                    return;
                }
                callback(null, files);
            });
        }
        else {
            anura.fs.readdir(this.#relativeToAbsolute(dir), (err, files) => {
                if (err) {
                    callback(err, []);
                    return;
                }
                if (files.length === 0) {
                    callback(null, []);
                    return;
                }
                let pending = files.length;
                files.forEach((file) => {
                    anura.fs.stat(this.#relativeToAbsolute(dir) + "/" + file, (err, stats) => {
                        if (err) {
                            callback(err, []);
                            return;
                        }
                        entries.push(stats);
                        pending--;
                        if (!pending) {
                            callback(null, entries);
                        }
                    });
                });
            });
        }
    }
    mkdirp(path, callback) {
        const parts = this.#relativeToAbsolute(path).split("/");
        callback ||= () => { };
        parts.reduce((acc, part) => {
            acc += "/" + part;
            anura.fs.mkdir(acc, (err) => {
                if (err) {
                    callback(err);
                    return;
                }
            });
            return acc;
        });
        callback(null);
    }
    rm(path, options, callback) {
        path = this.#relativeToAbsolute(path);
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        callback ||= () => { };
        options ||= {};
        function walk(dir, done) {
            anura.fs.readdir(dir, (err, list) => {
                if (err) {
                    done(err);
                    return;
                }
                let pending = list.length;
                if (!pending) {
                    anura.fs.rmdir(dir, done);
                    return;
                }
                list.forEach((file) => {
                    file = dir + "/" + file;
                    anura.fs.stat(file, (err, stats) => {
                        if (err) {
                            done(err);
                            return;
                        }
                        if (stats.isDirectory()) {
                            walk(file, (err) => {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                pending--;
                                if (!pending) {
                                    anura.fs.rmdir(dir, done);
                                }
                            });
                        }
                        else {
                            anura.fs.unlink(file, (err) => {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                pending--;
                                if (!pending) {
                                    anura.fs.rmdir(dir, done);
                                }
                            });
                        }
                    });
                });
            });
        }
        anura.fs.stat(path, (err, stats) => {
            if (err) {
                callback(err);
                return;
            }
            if (!stats.isDirectory()) {
                anura.fs.unlink(path, callback);
                return;
            }
            if (options.recursive) {
                walk(path, callback);
            }
            else {
                anura.fs.readdir(path, (err, files) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (files.length > 0) {
                        callback(new Error("Directory not empty! Pass { recursive: true } instead to remove it and all its contents."));
                        return;
                    }
                });
            }
        });
    }
    tempDir(callback) {
        callback ||= () => { };
        const tmp = this.env.TMP;
        anura.fs.mkdir(tmp, () => {
            callback(null, tmp);
        });
    }
    touch(path, options, callback) {
        path = this.#relativeToAbsolute(path);
        if (typeof options === "function") {
            callback = options;
            options = {
                updateOnly: false,
                date: Date.now(),
            };
        }
        callback ||= () => { };
        options ||= {
            updateOnly: false,
            date: Date.now(),
        };
        function createFile() {
            anura.fs.writeFile(path, "", callback);
        }
        function updateTimes() {
            anura.fs.utimes(path, options.date, options.date, callback);
        }
        anura.fs.stat(path, (err) => {
            if (err) {
                if (options.updateOnly) {
                    callback(new Error("File does not exist and updateOnly is true"));
                    return;
                }
                else {
                    createFile();
                }
            }
            else {
                updateTimes();
            }
        });
    }
    cd(dir) {
        this.env.PWD = this.#relativeToAbsolute(dir);
    }
    pwd() {
        return this.env.PWD;
    }
    promises = {
        cat: async (files) => {
            let contents = "";
            for (const file of files) {
                contents += (await anura.fs.promises.readFile(this.#relativeToAbsolute(file))).toString();
            }
            return contents;
        },
        exec: async (path) => {
            anura.files.open(this.#relativeToAbsolute(path));
        },
        find: (path, options) => {
            return new Promise((resolve, reject) => {
                this.find(path, options, (err, files) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(files);
                });
            });
        },
        ls: (dir, options) => {
            return new Promise((resolve, reject) => {
                this.ls(dir, options, (err, entries) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(entries);
                });
            });
        },
        mkdirp: (path) => {
            return new Promise((resolve, reject) => {
                this.mkdirp(path, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
        rm: (path, options) => {
            return new Promise((resolve, reject) => {
                this.rm(path, options, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
        touch: (path, options) => {
            return new Promise((resolve, reject) => {
                this.touch(path, options, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
    };
    constructor(options) {
        options ||= {
            env: {
                PWD: "/",
                TMP: "/tmp",
            },
        };
        if (options?.env) {
            Object.entries(options.env).forEach(([key, value]) => {
                this.env.set(key, value);
            });
        }
    }
}
/**
 * Anura File System API
 *
 * This is fully compatible with Filer's filesystem API and,
 * by extension, most of the Node.js filesystem API. This is
 * a drop-in replacement for the legacy Filer API and should
 * be used in place of the Filer API in all new code.
 *
 * This API has the added benefit of type safety and a the ability
 * to register multiple filesystem providers. This allows for the
 * creation of virtual filesystems and the ability to mount filesystems
 * at arbitrary paths.
 */
class AnuraFilesystem {
    providers = new Map();
    providerCache = {};
    whatwgfs = {
        fs: undefined,
        getFolder: async () => {
            // @ts-ignore
            return await this.whatwgfs.fs.getOriginPrivateDirectory(
            // @ts-ignore
            import("/libs/nfsadapter/adapters/anuraadapter.js"));
        },
        fileOrDirectoryFromPath: async (path) => {
            try {
                return await this.whatwgfs.directoryHandleFromPath(path);
            }
            catch (e1) {
                try {
                    return await this.whatwgfs.fileHandleFromPath(path);
                }
                catch (e2) {
                    throw e1 + e2;
                }
            }
        },
        directoryHandleFromPath: async (path) => {
            const pathParts = path.split("/");
            // prettier-ignore
            let workingPath = (await anura.fs.whatwgfs.getFolder());
            for (const dir of pathParts) {
                if (dir !== "")
                    workingPath = await workingPath.getDirectoryHandle(dir);
            }
            return workingPath;
        },
        fileHandleFromPath: async (givenPath) => {
            let path = givenPath.split("/");
            const file = path.pop();
            path = path.join("/");
            // prettier-ignore
            const workingPath = (await anura.fs.whatwgfs.directoryHandleFromPath(path));
            return await workingPath.getFileHandle(file);
        },
        showDirectoryPicker: async (options) => {
            const picker = await anura.import("anura.filepicker");
            const path = await picker.selectFolder();
            return await this.whatwgfs.directoryHandleFromPath(path);
        },
        showOpenFilePicker: async (options) => {
            const picker = await anura.import("anura.filepicker");
            const path = await picker.selectFile();
            return await this.whatwgfs.fileHandleFromPath(path);
        },
    };
    // Note: Intentionally aliasing the property to a class instead of an instance
    static Shell = AFSShell;
    Shell = AFSShell;
    constructor(providers) {
        providers.forEach((provider) => {
            this.providers.set(provider.domain, provider);
        });
        // These paths must be TS ignore'd since they are in build/
        (async () => {
            // @ts-ignore
            const fs = await import("/libs/nfsadapter/nfsadapter.js");
            // @ts-ignore
            this.whatwgfs.FileSystemDirectoryHandle =
                fs.FileSystemDirectoryHandle;
            // @ts-ignore
            this.whatwgfs.FileSystemFileHandle = fs.FileSystemFileHandle;
            // @ts-ignore
            this.whatwgfs.FileSystemHandle = fs.FileSystemHandle;
            this.whatwgfs.fs = fs;
        })();
    }
    clearCache() {
        this.providerCache = {};
    }
    installProvider(provider) {
        this.providers.set(provider.domain, provider);
        this.clearCache();
    }
    processPath(path) {
        if (!path.startsWith("/")) {
            throw new Error("Path must be absolute");
        }
        path = path.replace(/^\/+/, "/");
        let provider = this.providerCache[path];
        if (provider) {
            return provider;
        }
        if (this.providers.has(path)) {
            path += "/";
        }
        const parts = path.split("/");
        parts.shift();
        parts.pop();
        while (!provider && parts.length > 0) {
            const checkPath = "/" + parts.join("/");
            provider = this.providers.get(checkPath);
            parts.pop();
        }
        if (!provider) {
            provider = this.providers.get("/");
        }
        this.providerCache[path] = provider;
        return provider;
    }
    processFD(fd) {
        return this.processPath(fd[AnuraFDSymbol]);
    }
    rename(oldPath, newPath, callback) {
        this.processPath(oldPath).rename(oldPath, newPath, callback);
    }
    ftruncate(fd, len, callback) {
        this.processFD(fd).ftruncate(fd, len, callback);
    }
    truncate(path, len, callback) {
        this.processPath(path).truncate(path, len, callback);
    }
    stat(path, callback) {
        this.processPath(path).stat(path, callback);
    }
    fstat(fd, callback) {
        this.processFD(fd).fstat(fd, callback);
    }
    lstat(path, callback) {
        this.processPath(path).lstat(path, callback);
    }
    /** @deprecated fs.exists() is an anachronism and exists only for historical reasons. */
    exists(path, callback) {
        this.processPath(path).exists(path, callback);
    }
    link(srcPath, dstPath, callback) {
        this.processPath(srcPath).link(srcPath, dstPath, callback);
    }
    symlink(path, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processPath(rest[0]).symlink(path, ...rest);
    }
    readlink(path, callback) {
        this.processPath(path).readlink(path, callback);
    }
    unlink(path, callback) {
        this.processPath(path).unlink(path, callback);
    }
    rmdir(path, callback) {
        this.processPath(path).rmdir(path, callback);
    }
    mkdir(path, ...rest) {
        this.processPath(path).mkdir(path, ...rest);
    }
    access(path, ...rest) {
        this.processPath(path).access(path, ...rest);
    }
    mkdtemp(...args) {
        // Temp directories should remain in the root filesystem for now
        // @ts-ignore - Overloaded methods are scary
        this.processPath(path).mkdtemp(...args);
    }
    readdir(path, ...rest) {
        this.processPath(path).readdir(path, ...rest);
    }
    close(fd, callback) {
        this.processFD(fd).close(fd, callback);
    }
    open(path, flags, mode, callback) {
        if (typeof mode === "number") {
            this.processPath(path).open(path, flags, mode, callback);
        }
        else {
            this.processPath(path).open(path, flags, mode);
        }
    }
    utimes(path, atime, mtime, callback) {
        this.processPath(path).utimes(path, atime, mtime, callback);
    }
    futimes(fd, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processFD(fd).futimes(fd, ...rest);
    }
    chown(path, uid, gid, callback) {
        this.processPath(path).chown(path, uid, gid, callback);
    }
    fchown(fd, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processFD(fd).fchown(fd, ...rest);
    }
    chmod(path, mode, callback) {
        this.processPath(path).chmod(path, mode, callback);
    }
    fchmod(fd, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processFD(fd).fchmod(fd, ...rest);
    }
    fsync(fd, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processFD(fd).fsync(fd, ...rest);
    }
    write(fd, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processFD(fd).write(fd, ...rest);
    }
    read(fd, ...rest) {
        // @ts-ignore - Overloaded methods are scary
        this.processFD(fd).read(fd, ...rest);
    }
    readFile(path, callback) {
        this.processPath(path).readFile(path, callback);
    }
    writeFile(path, data, ...rest) {
        if (data instanceof Uint8Array && !(data instanceof Filer.Buffer)) {
            data = Filer.Buffer.from(data);
        }
        this.processPath(path).writeFile(path, data, ...rest);
    }
    appendFile(path, data, callback) {
        if (data instanceof Uint8Array && !(data instanceof Filer.Buffer)) {
            data = Filer.Buffer.from(data);
        }
        this.processPath(path).appendFile(path, data, callback);
    }
    // @ts-ignore - This is still being implemented.
    promises = {
        appendFile: (path, data, options) => {
            if (data instanceof Uint8Array && !(data instanceof Filer.Buffer)) {
                data = Filer.Buffer.from(data);
            }
            return this.processPath(path).promises.appendFile(path, data, options);
        },
        access: (path, mode) => this.processPath(path).promises.access(path, mode),
        chown: (path, uid, gid) => this.processPath(path).promises.chown(path, uid, gid),
        chmod: (path, mode) => this.processPath(path).promises.chmod(path, mode),
        link: (srcPath, dstPath) => this.processPath(srcPath).promises.link(srcPath, dstPath),
        lstat: (path) => this.processPath(path).promises.lstat(path),
        mkdir: (path, mode) => this.processPath(path).promises.mkdir(path, mode),
        mkdtemp: (prefix, options) => this.processPath(prefix).promises.mkdtemp(prefix, options),
        open: async (path, flags, mode) => this.processPath(path).promises.open(path, flags, mode),
        readdir: (path, options) => this.processPath(path).promises.readdir(path, options),
        readFile: (path) => this.processPath(path).promises.readFile(path),
        readlink: (path) => this.processPath(path).promises.readlink(path),
        rename: (oldPath, newPath) => this.processPath(oldPath).promises.rename(oldPath, newPath),
        rmdir: (path) => this.processPath(path).promises.rmdir(path),
        stat: (path) => this.processPath(path).promises.stat(path),
        symlink: (srcPath, dstPath, type) => this.processPath(dstPath).promises.symlink(srcPath, dstPath, type),
        truncate: (path, len) => this.processPath(path).promises.truncate(path, len),
        unlink: (path) => this.processPath(path).promises.unlink(path),
        utimes: (path, atime, mtime) => this.processPath(path).promises.utimes(path, atime, mtime),
        writeFile: (path, data, options) => {
            if (data instanceof Uint8Array && !(data instanceof Filer.Buffer)) {
                data = Filer.Buffer.from(data);
            }
            this.processPath(path).promises.writeFile(path, data, options);
        },
    };
}
//# sourceMappingURL=Filesystem.js.map