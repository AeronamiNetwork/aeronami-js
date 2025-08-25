//!waitForInit

(function() {
    var Bukkit = org.bukkit.Bukkit;
    var Component = Java.type("net.kyori.adventure.text.Component");
    var TextColor = Java.type("net.kyori.adventure.text.format.TextColor");
    var TextDecoration = Java.type("net.kyori.adventure.text.format.TextDecoration");
    var Title = Java.type("net.kyori.adventure.title.Title");
    var TitleTimes = Java.type("net.kyori.adventure.title.Title$Times");
    var Duration = Java.type("java.time.Duration");

    // --- Parse text with multiple hex colors, bold, and gradients ---
    function parseAdventureTitle(msg) {
        if (!msg) return Component.text("");

        var stack = []; // formatting context stack
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
                    currentColor = popped.lastColor; // restore last color before gradient
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

    // --- Send title to a player ---
    function sendWelcomeTitle(player) {
        var rawTitle = "<#23A0FC><bold>AERONAMI<#23A0FC></bold><gradient:#23A0FC:#BD1B5E><bold>NETWORK</bold></gradient><#808080> - <#C21E56><bold>FACTIONS</bold>";
        var titleComponent = parseAdventureTitle(rawTitle);

        var times = TitleTimes.of(
            Duration.ofMillis(500),
            Duration.ofMillis(2000),
            Duration.ofMillis(500)
        );

        var title = Title.title(titleComponent, Component.text(""), times);
        player.showTitle(title);
    }

    // --- Send to all online players immediately ---
    Bukkit.getOnlinePlayers().forEach(function(player) {
        sendWelcomeTitle(player);
    });

    // --- Send on player join ---
    registerEvent("org.bukkit.event.player.PlayerJoinEvent", function(event) {
        sendWelcomeTitle(event.getPlayer());
    });

    log.info("Welcome Title with multiple gradients loaded successfully.");
})();
