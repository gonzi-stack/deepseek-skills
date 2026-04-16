#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

// ─── ANSI Colors ────────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// ─── Constants ──────────────────────────────────────────────────────────────────

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const TARGET_DIR = process.cwd();
const VERSION = require(path.join(PACKAGE_ROOT, "package.json")).version;

const ITEMS_TO_COPY = ["AGENTS.md", ".agents"];

const SKILLS = [
  { id: "RSN", name: "deepseek-reasoning", desc: "Razonamiento y planificación" },
  { id: "CQL", name: "deepseek-code-quality", desc: "Estándares de calidad de código" },
  { id: "ARC", name: "deepseek-architect", desc: "Diseño arquitectónico y evolución" },
  { id: "CTX", name: "deepseek-context", desc: "Contexto de proyecto" },
  { id: "DBG", name: "deepseek-debug", desc: "Diagnóstico de bugs" },
  { id: "PRF", name: "deepseek-performance", desc: "Optimización de performance" },
  { id: "REV", name: "deepseek-review", desc: "Revisión de código" },
  { id: "TST", name: "deepseek-testing", desc: "Escritura de tests" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function log(msg = "") {
  console.log(msg);
}
function success(msg) {
  log(`  ${c.green}✓${c.reset} ${msg}`);
}
function warn(msg) {
  log(`  ${c.yellow}⚠${c.reset} ${msg}`);
}
function error(msg) {
  log(`  ${c.red}✗${c.reset} ${msg}`);
}
function info(msg) {
  log(`  ${c.cyan}ℹ${c.reset} ${msg}`);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return count;
}

function removeDirRecursive(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Banner ─────────────────────────────────────────────────────────────────────

function showBanner() {
  log();
  log(`  ${c.cyan}${c.bold}╔══════════════════════════════════════════════════╗${c.reset}`);
  log(`  ${c.cyan}${c.bold}║${c.reset}                                                  ${c.cyan}${c.bold}║${c.reset}`);
  log(`  ${c.cyan}${c.bold}║${c.reset}   ${c.bold}DeepSeek R1 Skills${c.reset}  ${c.dim}v${VERSION}${c.reset}                      ${c.cyan}${c.bold}║${c.reset}`);
  log(`  ${c.cyan}${c.bold}║${c.reset}   ${c.dim}8 skills de ingeniería senior${c.reset}                  ${c.cyan}${c.bold}║${c.reset}`);
  log(`  ${c.cyan}${c.bold}║${c.reset}                                                  ${c.cyan}${c.bold}║${c.reset}`);
  log(`  ${c.cyan}${c.bold}╚══════════════════════════════════════════════════╝${c.reset}`);
  log();
}

// ─── Help ───────────────────────────────────────────────────────────────────────

function showHelp() {
  showBanner();

  log(`  ${c.bold}USO${c.reset}`);
  log(`    ${c.cyan}npx deepseek-skills${c.reset}            Instalar en el directorio actual`);
  log(`    ${c.cyan}npx deepseek-skills --force${c.reset}    Sobrescribir archivos existentes`);
  log(`    ${c.cyan}npx deepseek-skills --help${c.reset}     Mostrar esta ayuda`);
  log();

  log(`  ${c.bold}QUÉ SE INSTALA${c.reset}`);
  log(`    ${c.green}AGENTS.md${c.reset}               Protocolo operativo con activación selectiva`);
  log(`    ${c.green}.agents/.skills/skills/${c.reset}  8 skills universales para DeepSeek R1`);
  log();

  log(`  ${c.bold}SKILLS INCLUIDAS${c.reset}`);
  for (const skill of SKILLS) {
    log(`    ${c.magenta}${skill.id}${c.reset}  ${skill.name.padEnd(26)} ${c.dim}${skill.desc}${c.reset}`);
  }
  log();

  log(`  ${c.bold}FUNCIONAMIENTO${c.reset}`);
  log(`    El AGENTS.md le indica a DeepSeek R1 cómo clasificar cada tarea`);
  log(`    y activar ${c.bold}solo las skills necesarias${c.reset} (2-3 de 8), optimizando`);
  log(`    el uso de tokens sin sacrificar la potencia de las skills.`);
  log();
}

// ─── List command ───────────────────────────────────────────────────────────────

function showList() {
  showBanner();

  log(`  ${c.bold}SKILLS DISPONIBLES${c.reset}`);
  log();

  for (const skill of SKILLS) {
    const skillPath = path.join(
      PACKAGE_ROOT,
      ".agents",
      ".skills",
      "skills",
      skill.name,
      "SKILL.md"
    );
    const exists = fs.existsSync(skillPath);
    const size = exists
      ? `${(fs.statSync(skillPath).size / 1024).toFixed(1)} KB`
      : "—";

    log(
      `    ${c.magenta}${skill.id}${c.reset}  ${skill.name.padEnd(26)} ${c.dim}${size.padStart(8)}${c.reset}  ${skill.desc}`
    );
  }

  log();
  log(`  ${c.dim}Total: ${SKILLS.length} skills${c.reset}`);
  log();
}

// ─── Init (main command) ────────────────────────────────────────────────────────

function runInit(force) {
  showBanner();

  info(`Directorio destino: ${c.bold}${TARGET_DIR}${c.reset}`);
  log();

  // ── Check for conflicts ──

  const conflicts = [];
  for (const item of ITEMS_TO_COPY) {
    const targetPath = path.join(TARGET_DIR, item);
    if (fs.existsSync(targetPath)) {
      conflicts.push(item);
    }
  }

  if (conflicts.length > 0 && !force) {
    warn("Los siguientes archivos ya existen en el directorio:");
    log();
    for (const conflict of conflicts) {
      log(`    ${c.dim}→${c.reset} ${conflict}`);
    }
    log();
    info(`Ejecutá con ${c.bold}--force${c.reset} para sobrescribirlos.`);
    log();
    process.exit(1);
  }

  if (conflicts.length > 0 && force) {
    warn("Sobrescribiendo archivos existentes...");
    log();

    for (const conflict of conflicts) {
      const targetPath = path.join(TARGET_DIR, conflict);
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        removeDirRecursive(targetPath);
      } else {
        fs.unlinkSync(targetPath);
      }
    }
  }

  // ── Copy AGENTS.md ──

  const agentsSrc = path.join(PACKAGE_ROOT, "AGENTS.md");
  const agentsDest = path.join(TARGET_DIR, "AGENTS.md");

  if (fs.existsSync(agentsSrc)) {
    fs.copyFileSync(agentsSrc, agentsDest);
    success("AGENTS.md — Protocolo operativo");
  } else {
    error("AGENTS.md no encontrado en el paquete");
    process.exit(1);
  }

  // ── Copy .agents/ directory ──

  const skillsSrc = path.join(PACKAGE_ROOT, ".agents");
  const skillsDest = path.join(TARGET_DIR, ".agents");

  if (fs.existsSync(skillsSrc)) {
    const fileCount = copyDirRecursive(skillsSrc, skillsDest);
    success(`.agents/ — ${fileCount} archivos (${SKILLS.length} skills)`);
  } else {
    error(".agents/ no encontrado en el paquete");
    process.exit(1);
  }

  // ── Summary ──

  log();
  log(`  ${c.green}${c.bold}══════════════════════════════════════════${c.reset}`);
  log(`  ${c.green}${c.bold}  ✓  Instalación completa${c.reset}`);
  log(`  ${c.green}${c.bold}══════════════════════════════════════════${c.reset}`);
  log();
  log(`  ${c.bold}Archivos instalados:${c.reset}`);
  log(`    ${c.cyan}AGENTS.md${c.reset}                   Directiva principal del agente`);
  log();

  for (const skill of SKILLS) {
    log(
      `    ${c.dim}.agents/.skills/skills/${c.reset}${c.cyan}${skill.name}${c.reset}`
    );
  }

  log();
  log(`  ${c.bold}Próximos pasos:${c.reset}`);
  log();
  log(`    ${c.white}1.${c.reset} Configurá DeepSeek R1 para que lea ${c.bold}AGENTS.md${c.reset}`);
  log(`       como instrucción del sistema o custom instructions.`);
  log();
  log(`    ${c.white}2.${c.reset} ${c.dim}(Opcional)${c.reset} Creá un ${c.bold}DEEPSEEK_CONTEXT.md${c.reset} en la raíz`);
  log(`       del proyecto con el stack y convenciones específicas.`);
  log(`       Usá la plantilla de la skill ${c.magenta}CTX${c.reset} como base.`);
  log();
  log(`    ${c.white}3.${c.reset} Agregá ${c.bold}.agents/${c.reset} a tu ${c.bold}.gitignore${c.reset} si no querés`);
  log(`       versionarlo, o commitealo para compartir con tu equipo.`);
  log();
}

// ─── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith("-"));
  const flags = args.filter((a) => a.startsWith("-"));

  if (flags.includes("--help") || flags.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  if (flags.includes("--version") || flags.includes("-v")) {
    log(`deepseek-skills v${VERSION}`);
    process.exit(0);
  }

  if (command === "list" || command === "ls") {
    showList();
    process.exit(0);
  }

  const force = flags.includes("--force") || flags.includes("-f");
  runInit(force);
}

main();
