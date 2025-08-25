//!waitForInit
//!PlaceholderAPI

(function() {
    const Component = Java.type("net.kyori.adventure.text.Component");
    const TextColor = Java.type("net.kyori.adventure.text.format.TextColor");
    const TextDecoration = Java.type("net.kyori.adventure.text.format.TextDecoration");
    const ClickEvent = Java.type("net.kyori.adventure.text.event.ClickEvent");

    // --- Parse hex, gradient, bold ---
    function parseAdventure(msg) {
        if (!msg) return Component.text("");

        let bold = false;
        let currentColor = TextColor.color(0xFFFFFF);
        let gradient = null;
        const components = [];

        const regex = /(<bold>|<\/bold>|<gradient:#[0-9A-Fa-f]{6}:#[0-9A-Fa-f]{6}>|<\/gradient>|<#[0-9A-Fa-f]{6}>|[^<]+)/g;
        const parts = msg.match(regex) || [];

        parts.forEach(part => {
            if (part === "<bold>") bold = true;
            else if (part === "</bold>") bold = false;
            else if (part.startsWith("<#") && !part.startsWith("<gradient:")) {
                currentColor = TextColor.color(parseInt(part.substring(2, 8), 16));
            }
            else if (part.startsWith("<gradient:")) {
                const m = part.match(/<gradient:#([0-9A-Fa-f]{6}):#([0-9A-Fa-f]{6})>/);
                if (m) gradient = {
                    start: TextColor.color(parseInt(m[1], 16)),
                    end: TextColor.color(parseInt(m[2], 16))
                };
            }
            else if (part === "</gradient>") gradient = null;
            else {
                let comp;
                const chars = part.split("");
                if (gradient) {
                    const gradComponents = chars.map((c, i) => {
                        const ratio = i / Math.max(chars.length - 1, 1);
                        const r = Math.round(gradient.start.red() * (1 - ratio) + gradient.end.red() * ratio);
                        const g = Math.round(gradient.start.green() * (1 - ratio) + gradient.end.green() * ratio);
                        const b = Math.round(gradient.start.blue() * (1 - ratio) + gradient.end.blue() * ratio);
                        let color = TextColor.color((r << 16) | (g << 8) | b);
                        let chComp = Component.text(c).color(color);
                        if (bold) chComp = chComp.decorate(TextDecoration.BOLD);
                        return chComp;
                    });
                    comp = gradComponents.reduce((a, b) => a.append(b), Component.text(""));
                } else {
                    comp = Component.text(part).color(currentColor);
                    if (bold) comp = comp.decorate(TextDecoration.BOLD);
                }
                components.push(comp);
            }
        });

        return components.reduce((a, b) => a.append(b), Component.text(""));
    }

    // --- Register /discord command ---
    addCommand("discord", {
        onCommand: function(sender, args) {
            if (!sender.getPlayer) return; // only for players
            const player = sender;

            // Raw message with clickable link part
            const rawMsg = "<#23A0FC><bold>AERONAMI</bold><gradient:#23A0FC:#BD1B5E><bold> NETWORK></bold></gradient> <#808080>» ";
            const msgComp = parseAdventure(rawMsg);

            // Clickable link
            const linkComp = Component.text("https://discord.aeronami.net")
                .color(TextColor.color(0xCBC3E3))
                .clickEvent(ClickEvent.clickEvent(ClickEvent.Action.OPEN_URL, "https://discord.aeronami.net"));

            // Combine components and send to player
            player.sendMessage(msgComp.append(linkComp));
        },
        onTabComplete: function(sender, args) {
            return toJavaList([]);
        }
    });

    log.info("/discord command loaded successfully with clickable link!");
})();
