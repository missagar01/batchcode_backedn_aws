const oracledb = require("oracledb");
const fs = require("fs");
const path = require("path");

function exists(p) {
  try {
    if (!p || !fs.existsSync(p)) return false;

    // Check if it's a directory and has the actual library file
    const stats = fs.statSync(p);
    if (stats.isDirectory()) {
      const libFile = process.platform === "win32" ? "oci.dll" : "libclntsh.so";
      const libPath = path.join(p, libFile);
      if (fs.existsSync(libPath)) {
        const libStats = fs.statSync(libPath);
        // If file exists but is 0 bytes, it's corrupted
        if (libStats.size > 0) return true;
        console.warn(`⚠️ Oracle library found at ${libPath} but it is empty (0 bytes).`);
      }
      return false;
    }
    return stats.size > 0;
  } catch {
    return false;
  }
}

function pickFirstExisting(list) {
  return list.find(exists);
}

let oracleEnabled = false;

function initOracleClient() {
  // Prevent double init
  if (global.__oracleClientInitialised) {
    return;
  }
  global.__oracleClientInitialised = true;

  // 1. Check manual disable switch
  if (process.env.ENABLE_ORACLE === 'false') {
    console.warn("🚫 Oracle disabled by config (ENABLE_ORACLE=false)");
    oracleEnabled = false;
    return;
  }

  const envDir = process.env.ORACLE_CLIENT_LIB_DIR || process.env.ORACLE_CLIENT;

  // If envDir exists -> use it. If it doesn't exist -> ignore it safely.
  const envCandidate = exists(envDir) ? envDir : null;

  const linuxDirs = [
    "/opt/oracle/instantclient_23_26",
    "/opt/oracle/instantclient_23_9",
    "/opt/oracle/instantclient_23_8",
    "/opt/oracle/instantclient_21_13",
    "/opt/oracle/instantclient_21_12",
    "/opt/oracle/instantclient_19_21",
    "/opt/oracle/instantclient_18_5",
    "/opt/oracle/instantclient_12_2",
    "/usr/lib/oracle/instantclient",
    "/usr/lib/oracle",
  ];

  const windowsDirs = [
    "C:\\oracle\\instantclient_23_26",
    "C:\\oracle\\instantclient_23_9",
    "C:\\oracle\\instantclient_23_8",
    "C:\\oracle\\instantclient_21_13",
  ];

  const candidates =
    process.platform === "win32"
      ? [envCandidate, ...windowsDirs, ...linuxDirs]
      : [envCandidate, ...linuxDirs, ...windowsDirs];

  const libDir = pickFirstExisting(candidates);

  console.log("🔍 Oracle Instant Client libDir:", libDir || "(not found)");

  // If not found -> we CANNOT use Thin mode for this DB, so we must DISABLE Oracle
  if (!libDir) {
    console.error("❌ Oracle Thick client not available (libs not found) → DISABLING Oracle");
    oracleEnabled = false;
    return;
  }

  // Thick init
  try {
    oracledb.initOracleClient({ libDir });
    console.log("✅ Oracle Thick mode initialised:", libDir);
    console.log("🧩 node-oracledb:", oracledb.versionString);
    oracleEnabled = true; // SUCCESS!
  } catch (err) {
    // If already initialised, ignore
    if (String(err).includes("already been initialized")) {
      console.log("ℹ️ Oracle client already initialised.");
      oracleEnabled = true; // Assume success if already done
      return;
    }

    // Check for DPI-1047 (Library loading error)
    if (String(err).includes("DPI-1047")) {
      console.error("❌ Oracle Client Library Load Error (DPI-1047) → DISABLING Oracle");
      console.error("   This usually means `libaio1` is missing on Linux.");
      console.error("   Try running: `sudo apt-get install libaio1`");
      console.error(`   Library Path attempted: ${libDir}`);
      oracleEnabled = false;
      return;
    }

    console.error("❌ Oracle init failed details:", err);
    // Don't throw, just disable
    oracleEnabled = false;
  }
}



function isOracleEnabled() {
  return oracleEnabled;
}

module.exports = { initOracleClient, isOracleEnabled };
