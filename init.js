//!waitForInit

const Bukkit = org.bukkit.Bukkit;
const File = java.io.File;
const FileReader = java.io.FileReader;
const BufferedReader = java.io.BufferedReader;
const Paths = java.nio.file.Paths;
const FileSystems = java.nio.file.FileSystems;
const StandardWatchEventKinds = java.nio.file.StandardWatchEventKinds;
const Executors = java.util.concurrent.Executors;

const scriptsFolder = new File("aeronami-js/scripts");

// --- Registry to track active scripts ---
const scriptRegistry = {};

// Ensure folder exists
if (!scriptsFolder.exists()) {
    scriptsFolder.mkdirs();
    Bukkit.getLogger().info("[InitLoader] Created scripts folder at: " + scriptsFolder.getAbsolutePath());
}

// Read file content
function readFile(file) {
    const reader = new BufferedReader(new FileReader(file));
    let content = "";
    let line;
    while ((line = reader.readLine()) !== null) {
        content += line + "\n";
    }
    reader.close();
    return content;
}

// Unregister events/commands from old script
function unloadScript(name) {
    if (!scriptRegistry[name]) return;

    const reg = scriptRegistry[name];

    // Unregister event listeners
    if (reg.listeners) {
        for (let i = 0; i < reg.listeners.length; i++) {
            org.bukkit.event.HandlerList.unregisterAll(reg.listeners[i]);
        }
    }

    // Unregister commands (if OpenJS provides unregister)
    if (reg.commands) {
        for (let i = 0; i < reg.commands.length; i++) {
            try {
                Bukkit.getCommandMap().getCommand(reg.commands[i]).unregister(Bukkit.getCommandMap());
            } catch (e) {
                Bukkit.getLogger().warning("[InitLoader] Failed to unregister command " + reg.commands[i] + ": " + e);
            }
        }
    }

    Bukkit.getLogger().info("[InitLoader] Unloaded script: " + name);
    delete scriptRegistry[name];
}

// Load (or reload) a script
function loadScript(file) {
    const name = file.getName();

    try {
        unloadScript(name); // clear old version

        const content = readFile(file);

        // Provide isolated context
        const listeners = [];
        const commands = [];

        // --- AUTO-WRAP: intercept Bukkit API calls ---
        const _events = events;
        const _registerCommand = registerCommand;

        const wrappedEvents = new Proxy(_events, {
            get(target, prop) {
                const original = target[prop];
                return function() {
                    const l = original.apply(target, arguments);
                    listeners.push(l);
                    return l;
                };
            }
        });

        function wrappedRegisterCommand(name, executor) {
            commands.push(name);
            return _registerCommand(name, executor);
        }

        // Run inside isolated scope
        (function(__filename, events, registerCommand) {
            eval(content);
        })(name, wrappedEvents, wrappedRegisterCommand);

        scriptRegistry[name] = { listeners: listeners, commands: commands };

        Bukkit.getLogger().info("[InitLoader] Loaded script: " + name);
    } catch (err) {
        Bukkit.getLogger().warning("[InitLoader] Error loading " + name + ": " + err);
    }
}

// Load all .js scripts initially
function loadAllScripts() {
    const files = scriptsFolder.listFiles();
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
        if (files[i].isFile() && files[i].getName().endsWith(".js")) {
            loadScript(files[i]);
        }
    }
}

// Initial load
loadAllScripts();

// --- WatchService for hot reload ---
(function startWatcher() {
    try {
        const watchService = FileSystems.getDefault().newWatchService();
        const path = Paths.get(scriptsFolder.getAbsolutePath());
        path.register(watchService,
            StandardWatchEventKinds.ENTRY_CREATE,
            StandardWatchEventKinds.ENTRY_MODIFY,
            StandardWatchEventKinds.ENTRY_DELETE
        );

        const executor = Executors.newSingleThreadExecutor();
        executor.submit(function() {
            while (true) {
                const key = watchService.take(); // wait for event
                const events = key.pollEvents();

                for (let i = 0; i < events.size(); i++) {
                    const event = events.get(i);
                    const kind = event.kind();
                    const fileName = event.context().toString();

                    if (fileName.endsWith(".js")) {
                        const file = new File(scriptsFolder, fileName);

                        if (kind == StandardWatchEventKinds.ENTRY_CREATE) {
                            Bukkit.getLogger().info("[InitLoader] Detected new script: " + fileName);
                            loadScript(file);
                        } else if (kind == StandardWatchEventKinds.ENTRY_MODIFY) {
                            Bukkit.getLogger().info("[InitLoader] Reloading modified script: " + fileName);
                            loadScript(file);
                        } else if (kind == StandardWatchEventKinds.ENTRY_DELETE) {
                            Bukkit.getLogger().info("[InitLoader] Script deleted: " + fileName);
                            unloadScript(fileName);
                        }
                    }
                }

                key.reset();
            }
        });
        Bukkit.getLogger().info("[InitLoader] Watching scripts folder for changes...");
    } catch (err) {
        Bukkit.getLogger().warning("[InitLoader] Watcher failed: " + err);
    }
})();
