import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = process.cwd()
const SKIP_DIRS = new Set([".git", "node_modules", "logs", ".theseus", "__pycache__", "data"])

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github" && entry.name !== ".plans") continue
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(join(dir, entry.name), files)
    } else {
      files.push(join(dir, entry.name))
    }
  }
  return files
}

function relative(path) {
  return path.slice(ROOT.length + 1)
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: ROOT })
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed`)
}

function checkJson(files) {
  for (const file of files.filter((path) => extname(path) === ".json")) {
    JSON.parse(readFileSync(file, "utf8"))
  }
}

function checkMarkdownFences(files) {
  for (const file of files.filter((path) => extname(path) === ".md")) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/)
    let fence = null
    for (const [index, line] of lines.entries()) {
      const match = /^(?<marker>`{3,}|~{3,})/.exec(line)
      if (!match) continue
      const marker = match.groups.marker
      if (!fence) {
        fence = { marker, line: index + 1 }
      } else if (marker[0] === fence.marker[0] && marker.length >= fence.marker.length) {
        fence = null
      }
    }
    assert.equal(fence, null, `${relative(file)} has an unclosed code fence`)
  }
}

function checkFrontmatter(files) {
  for (const file of files.filter((path) => extname(path) === ".md")) {
    const content = readFileSync(file, "utf8")
    if (!content.startsWith("---\n")) continue
    const closing = content.indexOf("\n---", 4)
    assert.ok(closing > 0, `${relative(file)} has unclosed frontmatter`)
  }
}

function checkPluginDependencies() {
  const config = JSON.parse(readFileSync(join(ROOT, "opencode.json"), "utf8"))
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  for (const plugin of config.plugin || []) {
    if (typeof plugin !== "string") continue
    if (plugin.startsWith(".") || plugin.startsWith("/") || plugin.includes("@latest")) continue
    assert.ok(deps[plugin], `opencode.json plugin '${plugin}' is not listed in package.json dependencies`)
  }
}

const files = walk(ROOT).filter((file) => statSync(file).isFile())
checkJson(files)
checkMarkdownFences(files)
checkFrontmatter(files)
checkPluginDependencies()

run("python3", ["-m", "py_compile", ...files.filter((path) => path.startsWith(join(ROOT, "rag/scripts")) && extname(path) === ".py")])
run("npm", ["ls", "auto-delegate", "--depth=0"])
run("node", ["--input-type=module", "-e", "console.log(import.meta.resolve('auto-delegate'))"])
run("node", ["--test", ...files.filter((path) => path.startsWith(join(ROOT, "tests")) && path.endsWith(".test.mjs"))])

console.log("verify: ok")
