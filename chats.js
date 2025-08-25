//!waitForInit
//!PlaceholderAPI

(function() {
    // -------------------- Imports --------------------
    const Bukkit = org.bukkit.Bukkit;
    const MiniMessage = Java.type("net.kyori.adventure.text.minimessage.MiniMessage");
    const mm = MiniMessage.miniMessage();
    const JavaList = Java.type("java.util.ArrayList");

    const STAFF_PERMISSION = "chat.staffchat";
    const DONOR_PERMISSION = "chat.donorchat";

    // --- Helpers ---
    function canUseHex(player) { return player.hasPermission("chat.color"); }
    function canUseFormat(player) { return player.hasPermission("chat.format"); }

    function stripDisallowedFormatting(msg, player) {
        if (!canUseHex(player)) {
            msg = msg.replace(/<#[0-9A-Fa-f]{6}>/g, "");
            msg = msg.replace(/<gradient:[^>]+>.*?<\/gradient>/gi, "");
        }
        if (!canUseFormat(player)) {
            msg = msg.replace(/<bold>/gi,"").replace(/<\/bold>/gi,"");
            msg = msg.replace(/<italic>/gi,"").replace(/<\/italic>/gi,"");
            msg = msg.replace(/<underlined>/gi,"").replace(/<\/underlined>/gi,"");
            msg = msg.replace(/<strikethrough>/gi,"").replace(/<\/strikethrough>/gi,"");
            msg = msg.replace(/<obfuscated>/gi,"").replace(/<\/obfuscated>/gi,"");
        }
        return msg;
    }

    function hexifyLegacy(msg) {
        return msg.replace(/§x(§[0-9A-Fa-f]){6}/gi, match => {
            const hex = match.replace(/§/g,"").slice(1);
            return `<#${hex}>`;
        });
    }

    function ampersandToMini(msg) {
        if (!msg) return "";
        msg = msg.replace(/&([0-9a-f])/gi, (m,c) => {
            const map = {
                '0':'000000','1':'0000AA','2':'00AA00','3':'00AAAA','4':'AA0000','5':'AA00AA','6':'FFAA00','7':'AAAAAA',
                '8':'555555','9':'5555FF','a':'55FF55','b':'55FFFF','c':'FF5555','d':'FF55FF','e':'FFFF55','f':'FFFFFF'
            };
            return `<#${map[c.toLowerCase()]}>`;
        });
        msg = msg.replace(/&l/gi,"<bold>");
        msg = msg.replace(/&o/gi,"<italic>");
        msg = msg.replace(/&n/gi,"<underlined>");
        msg = msg.replace(/&m/gi,"<strikethrough>");
        msg = msg.replace(/&k/gi,"<obfuscated>");
        msg = msg.replace(/&r/gi,"");
        return msg;
    }

    function legacyToMiniMessage(msg) {
        if (!msg) return "";
        msg = hexifyLegacy(msg);
        msg = msg.replace(/§([0-9a-f])/gi, (m,c) => {
            const map = {
                '0':'000000','1':'0000AA','2':'00AA00','3':'00AAAA','4':'AA0000','5':'AA00AA','6':'FFAA00','7':'AAAAAA',
                '8':'555555','9':'5555FF','a':'55FF55','b':'55FFFF','c':'FF5555','d':'FF55FF','e':'FFFF55','f':'FFFFFF'
            };
            return `<#${map[c.toLowerCase()]}>`;
        });
        msg = msg.replace(/§l/gi,"<bold>");
        msg = msg.replace(/§o/gi,"<italic>");
        msg = msg.replace(/§n/gi,"<underlined>");
        msg = msg.replace(/§m/gi,"<strikethrough>");
        msg = msg.replace(/§k/gi,"<obfuscated>");
        msg = msg.replace(/§r/gi,"");
        return msg;
    }

    function parseMiniNickname(msg) {
        return ampersandToMini(legacyToMiniMessage(msg));
    }

    function getPlayerPrefix(player) {
        let raw = PlaceholderAPI.parseString(player, "%luckperms_prefix%");
        return parseMiniNickname(raw);
    }

    function getPlayerNick(player) {
        let raw = PlaceholderAPI.parseString(player, "%essentials_nickname%");
        if (!raw || raw.startsWith("%")) raw = player.getName();
        return parseMiniNickname(raw);
    }

    // --- Build messages ---
    function buildMessage(sender, rawMessage) {
        const prefix = getPlayerPrefix(sender);
        const nick = getPlayerNick(sender);

        let converted = legacyToMiniMessage(rawMessage);
        converted = ampersandToMini(converted);
        converted = stripDisallowedFormatting(converted, sender);

        const formattedName = mm.deserialize(prefix + nick);
        const separator = mm.deserialize(" <gray>»</gray> ");
        const messagePart = mm.deserialize("<white>" + converted + "</white>");

        return formattedName.append(separator).append(messagePart);
    }

    function buildStaffMessage(sender, message) {
        let name;
        if (!sender.getName || sender.getName() === "CONSOLE") {
            name = "<#23A0FC><bold>AERONAMI CONSOLE</bold>";
        } else {
            name = getPlayerPrefix(sender) + getPlayerNick(sender);
        }

        const formattedName = mm.deserialize(name);
        const staffTag = mm.deserialize("<#FDDC5C><bold>STAFF CHAT</bold></#FDDC5C> ");
        const separator = mm.deserialize(" <gray>»</gray> ");
        const messagePart = mm.deserialize("<#FDDC5C>" + message + "</#FDDC5C>");

        return staffTag.append(formattedName).append(separator).append(messagePart);
    }

    function buildDonorMessage(sender, message) {
        let name;
        if (!sender.getName || sender.getName() === "CONSOLE") {
            name = "<#23A0FC><bold>AERONAMI CONSOLE</bold>";
        } else {
            name = getPlayerPrefix(sender) + getPlayerNick(sender);
        }

        const formattedName = mm.deserialize(name);
        const donorTag = mm.deserialize("<#FFFFC5><bold>DONOR CHAT</bold></#FFFFC5> ");
        const separator = mm.deserialize(" <gray>»</gray> ");
        const messagePart = mm.deserialize("<#FFFFC5>" + message + "</#FFFFC5>");

        return donorTag.append(formattedName).append(separator).append(messagePart);
    }

    function sendStaffMessage(sender, message) {
        const formatted = buildStaffMessage(sender, message);
        Bukkit.getOnlinePlayers().forEach(p => {
            if (p.hasPermission(STAFF_PERMISSION)) p.sendMessage(formatted);
        });
        Bukkit.getConsoleSender().sendMessage(formatted);
    }

    function sendDonorMessage(sender, message) {
        const formatted = buildDonorMessage(sender, message);
        Bukkit.getOnlinePlayers().forEach(p => {
            if (p.hasPermission(DONOR_PERMISSION)) p.sendMessage(formatted);
        });
        Bukkit.getConsoleSender().sendMessage(formatted);
    }

    // --- Commands ---
    addCommand("staffc", {
        onCommand: function(sender, args) {
            if (!sender.hasPermission(STAFF_PERMISSION)) return sender.sendMessage("§cNo permission.");
            const msgArgs = Java.from(args);
            if (!msgArgs.length) return sender.sendMessage("§eUsage: /staffc <message>");
            sendStaffMessage(sender, msgArgs.join(" "));
        },
        onTabComplete: function(sender, args) { return new JavaList(); }
    });

    addCommand("donorc", {
        onCommand: function(sender, args) {
            if (!sender.hasPermission(DONOR_PERMISSION)) return sender.sendMessage("§cNo permission.");
            const msgArgs = Java.from(args);
            if (!msgArgs.length) return sender.sendMessage("§eUsage: /donorc <message>");
            sendDonorMessage(sender, msgArgs.join(" "));
        },
        onTabComplete: function(sender, args) { return new JavaList(); }
    });

    // --- Chat event ---
    registerEvent("org.bukkit.event.player.AsyncPlayerChatEvent", function(event) {
        const player = event.getPlayer();
        const message = event.getMessage() || "";

        if (player.hasPermission(STAFF_PERMISSION) && message.startsWith("@")) {
            event.setCancelled(true);
            sendStaffMessage(player, message.substring(1).trim());
            return;
        }

        if (player.hasPermission(DONOR_PERMISSION) && message.startsWith("!")) {
            event.setCancelled(true);
            sendDonorMessage(player, message.substring(1).trim());
            return;
        }

        // Normal chat
        event.setCancelled(true);
        const formatted = buildMessage(player, message);
        Bukkit.getOnlinePlayers().forEach(p => p.sendMessage(formatted));
        Bukkit.getConsoleSender().sendMessage(formatted);
    });

    log.info("✅ Custom Chat, Staff Chat (@) & Donor Chat (!) fully loaded with & formatting support!");
})();
