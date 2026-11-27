const LANGUAGE_BY_EXTENSION = new Map([
  [".ts", "TypeScript"], [".tsx", "TypeScript"], [".mts", "TypeScript"], [".cts", "TypeScript"],
  [".js", "JavaScript"], [".jsx", "JavaScript"], [".mjs", "JavaScript"], [".cjs", "JavaScript"],
  [".rs", "Rust"], [".swift", "Swift"], [".py", "Python"], [".rb", "Ruby"], [".go", "Go"],
  [".java", "Java"], [".kt", "Kotlin"], [".kts", "Kotlin"], [".cs", "C#"], [".php", "PHP"],
  [".c", "C"], [".h", "C"], [".cpp", "C++"], [".cc", "C++"], [".hpp", "C++"], [".m", "Objective-C"],
  [".html", "HTML"], [".htm", "HTML"], [".css", "CSS"], [".scss", "SCSS"], [".sass", "SCSS"], [".less", "Less"],
  [".vue", "Vue.js"], [".svelte", "Svelte"], [".lua", "Lua"], [".sh", "Bash"], [".bash", "Bash"], [".zsh", "Bash"],
  [".ps1", "PowerShell"], [".dart", "Dart"], [".sql", "SQL"], [".gd", "GDScript"],
]);

/**
 * Names the programming or markup language of a file from its extension.
 * Data and prose files (JSON, Markdown, lockfiles, images) have no language
 * here, so they never count as lines of code.
 *
 * @param {string} fileName - The file's name or path.
 * @returns {string | null} The language name as WakaTime spells it, or null when the file is not code.
 */
export const languageForFile = (fileName) => {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? null : (LANGUAGE_BY_EXTENSION.get(fileName.slice(dot).toLowerCase()) ?? null);
};
