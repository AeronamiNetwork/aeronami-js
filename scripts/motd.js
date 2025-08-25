//!waitForInit

const Bukkit = org.bukkit.Bukkit;
const ChatColor = org.bukkit.ChatColor;

// Converts hex like "#F0FFFF" to Minecraft §x hex color format
function toMinecraftHexColor(hex) {
  hex = hex.replace('#', '');
  return '§x' + hex.split('').map(c => '§' + c).join('');
}

// Remove Minecraft color codes (§ + char)
function stripColorCodes(text) {
  return text.replace(/§[0-9a-fk-or]/gi, '');
}

// Remove <bold> and </bold> tags from string
function stripTags(text) {
  return text.replace(/<\/?bold>/gi, '');
}

// Parse MOTD string with hex colors and <bold> tags
function parseMotdString(input) {
  let output = input.replace(/<bold>/gi, ChatColor.BOLD.toString())
                    .replace(/<\/bold>/gi, ChatColor.RESET.toString());

  const hexPattern = /#([A-Fa-f0-9]{6})/g;
  output = output.replace(hexPattern, match => toMinecraftHexColor(match));

  return output + ChatColor.RESET;
}

// Approximate Minecraft chat width limit for MOTD
const MOTD_MAX_LENGTH = 59;

// Center text based on visible characters
function centerText(text) {
  const visibleText = stripColorCodes(stripTags(text));
  const visibleLength = visibleText.length;

  if (visibleLength >= MOTD_MAX_LENGTH) return text;

  const spacesToPrepend = Math.max(0, Math.floor((MOTD_MAX_LENGTH - visibleLength) / 2) - 3);
  return ' '.repeat(spacesToPrepend) + text;
}

// Define MOTDs per server (key = server name in Velocity)
const serverMotds = {
  "factions": [
    "#0605AD<bold>AERONAMI NETWORK #808080- #C21E56<bold>FACTIONS",
    "#87CEFAVisit the Store @ store.aeronami.net"
  ]
};

// Get this server's name (must match Velocity config)
const thisServerName = Bukkit.getServer().getServerName ? Bukkit.getServer().getServerName() : "default";

// Apply MOTD if defined for this server
function setMotd() {
  const motdLines = serverMotds[thisServerName];
  if (!motdLines) return; // No MOTD defined for this server

  const line1 = centerText(parseMotdString(motdLines[0]));
  const line2 = centerText(parseMotdString(motdLines[1]));

  const motd = line1 + "\n" + line2;
  Bukkit.getServer().setMotd(motd);
}

// Run immediately and on server load
setMotd();
registerEvent("org.bukkit.event.server.ServerLoadEvent", event => setMotd());
