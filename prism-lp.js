if (window.Prism) {
  window.Prism.languages.lp = {
    comment: /\\[^\n]*/,
    keyword: /^\s*(?:Maximize|Minimize|Subject To|Such That|Bounds|Generals?|Binar(?:y|ies)|Integers|End)\s*$/im,
    label: { pattern: /^[ \t]*[A-Za-z_][\w.]*:/m, alias: "property" },
    operator: /<=|>=|=/,
    number: /[+-]?\b\d+(?:\.\d+)?\b|\b(?:inf|infinity)\b/i,
    boolean: /\bfree\b/i,
    variable: /\b[A-Za-z_][\w.]*\b/,
  };
}
