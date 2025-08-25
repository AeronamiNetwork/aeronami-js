//!waitForInit

(function() {
    var Bukkit = org.bukkit.Bukkit;
    var Component = Java.type("net.kyori.adventure.text.Component");
    var TextColor = Java.type("net.kyori.adventure.text.format.TextColor");
    var TextDecoration = Java.type("net.kyori.adventure.text.format.TextDecoration");

    // --- Adventure parser supporting hex, bold, gradient ---
    function parseAdventure(msg) {
        if (!msg) return Component.text("");

        var stack = [];
        var components = [];
        var regex = /(<bold>|<\/bold>|<gradient:#[0-9A-Fa-f]{6}:#[0-9A-Fa-f]{6}>|<\/gradient>|#[0-9A-Fa-f]{6}|[^#<]+)/g;
        var parts = msg.match(regex) || [];

        var bold = false;
        var currentColor = TextColor.color(0xFFFFFF);
        var gradient = null;
        var lastColor = currentColor;

        parts.forEach(function(part) {
            if (part === "<bold>") {
                bold = true;
            } else if (part === "</bold>") {
                bold = false;
            } else if (part.startsWith("<gradient:")) {
                var m = part.match(/<gradient:#([0-9A-Fa-f]{6}):#([0-9A-Fa-f]{6})>/);
                if (m) {
                    gradient = { start: TextColor.color(parseInt(m[1], 16)), end: TextColor.color(parseInt(m[2], 16)) };
                    stack.push({ bold: bold, gradient: gradient, lastColor: lastColor });
                }
            } else if (part === "</gradient>") {
                var popped = stack.pop();
                if (popped) {
                    bold = popped.bold;
                    gradient = null;
                    currentColor = popped.lastColor;
                }
            } else if (part.startsWith("#")) {
                currentColor = TextColor.color(parseInt(part.substring(1), 16));
                lastColor = currentColor;
            } else {
                var comp = Component.text(part);
                if (gradient) {
                    var chars = part.split("");
                    var gradComponents = chars.map(function(c, i) {
                        var ratio = i / Math.max(chars.length - 1, 1);
                        var r = Math.round(gradient.start.red() * (1 - ratio) + gradient.end.red() * ratio);
                        var g = Math.round(gradient.start.green() * (1 - ratio) + gradient.end.green() * ratio);
                        var b = Math.round(gradient.start.blue() * (1 - ratio) + gradient.end.blue() * ratio);
                        var color = TextColor.color((r << 16) | (g << 8) | b);
                        var chComp = Component.text(c).color(color);
                        if (bold) chComp = chComp.decorate(TextDecoration.BOLD);
                        return chComp;
                    });
                    comp = gradComponents.reduce(function(a, b) { return a.append(b); }, Component.text(""));
                } else {
                    comp = comp.color(currentColor);
                    if (bold) comp = comp.decorate(TextDecoration.BOLD);
                }
                components.push(comp);
            }
        });

        return components.reduce(function(acc, curr) { return acc.append(curr); }, Component.text(""));
    }

    // --- Intercept /say command ---
    registerEvent("org.bukkit.event.server.ServerCommandEvent", function(event) {
        var cmd = event.getCommand().trim();
        if (!cmd.toLowerCase().startsWith("say ")) return;

        event.setCancelled(true); // Cancel default /say broadcast

        var message = cmd.substring(4).trim();
        if (!message) return;

        // Build custom message
        var formatted = "<#23A0FC><bold>AERONAMI</bold><gradient:#23A0FC:#BD1B5E><bold> NETWORK</bold></gradient> #808080» #CBC3E3" + message;
        var component = parseAdventure(formatted);

        // Send to all players
        Bukkit.getOnlinePlayers().forEach(function(p) {
            p.sendMessage(component);
        });

        // Also log to console
        Bukkit.getConsoleSender().sendMessage(component);
    });

    log.info("Custom /say override loaded successfully.");
})();
