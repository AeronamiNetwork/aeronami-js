//!waitForInit

(function() {
    var Bukkit = org.bukkit.Bukkit;
    var Component = Java.type("net.kyori.adventure.text.Component");
    var TextColor = Java.type("net.kyori.adventure.text.format.TextColor");
    var TextDecoration = Java.type("net.kyori.adventure.text.format.TextDecoration");

    // --- Adventure parser supporting multiple gradients, bold, hex anywhere ---
    function parseAdventure(msg) {
        if (!msg) return Component.text("");

        var components = [];
        var bold = false;
        var currentColor = TextColor.color(0xFFFFFF);
        var gradient = null;

        // Regex matches:
        // <bold>, </bold>, <#HEX>, <gradient:#HEX:#HEX>, </gradient>, or normal text
        var regex = /(<bold>|<\/bold>|<gradient:#[0-9A-Fa-f]{6}:#[0-9A-Fa-f]{6}>|<\/gradient>|<#[0-9A-Fa-f]{6}>|[^<]+)/g;
        var parts = msg.match(regex) || [];

        parts.forEach(function(part) {
            if (part === "<bold>") {
                bold = true;
            } else if (part === "</bold>") {
                bold = false;
            } else if (part.startsWith("<#")) {
                currentColor = TextColor.color(parseInt(part.substring(2, 8), 16));
            } else if (part.startsWith("<gradient:")) {
                var m = part.match(/<gradient:#([0-9A-Fa-f]{6}):#([0-9A-Fa-f]{6})>/);
                if (m) {
                    gradient = {
                        start: TextColor.color(parseInt(m[1], 16)),
                        end: TextColor.color(parseInt(m[2], 16))
                    };
                }
            } else if (part === "</gradient>") {
                gradient = null;
            } else {
                var comp;
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
                    comp = Component.text(part).color(currentColor);
                    if (bold) comp = comp.decorate(TextDecoration.BOLD);
                }
                components.push(comp);
            }
        });

        return components.reduce(function(a, b) { return a.append(b); }, Component.text(""));
    }

    // --- Announce function ---
    function announce(message) {
        if (!message) return;

        // Prefix with your stylized server name
        var prefix = "<#23A0FC><bold>AERONAMI</bold><gradient:#23A0FC:#BD1B5E><bold> NETWORK</bold></gradient> #808080» #CBC3E3";
        var formatted = prefix + message;
        var component = parseAdventure(formatted);

        Bukkit.getOnlinePlayers().forEach(function(p) {
            p.sendMessage(component);
        });
        Bukkit.getConsoleSender().sendMessage(component);
    }

    // --- Register /announce command ---
    addCommand("announce", {
        onCommand: function(sender, args) {
            var jsArgs = Java.from(args);
            if (!jsArgs || jsArgs.length === 0) {
                sender.sendMessage("§cUsage: /announce <message>");
                return;
            }
            var msg = jsArgs.join(" ");
            announce(msg);
        },
        onTabComplete: function(sender, args) {
            return toJavaList([]);
        }
    });

    log.info("Custom /announce command with full gradient support loaded successfully.");
})();
