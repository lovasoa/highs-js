for (const link of document.querySelectorAll("[data-api-link]")) {
  link.href = new URL(link.dataset.apiLink, document.baseURI).href;
}

const exampleCode = document.querySelector("#facility-example + pre code");
if (exampleCode) {
  const apiLinks = new Map([
    ["loadHighs", "functions/default.html"],
    ["createModel", "types/Highs.html"],
    ["set", "interfaces/OptionStore.html#set"],
    ["run", "interfaces/Model.html#run"],
    ["getSolution", "interfaces/Model.html#getsolution"],
    ["getColName", "interfaces/Model.html#getcolname"],
    ["getObjectiveValue", "interfaces/Model.html#getobjectivevalue"],
    ["get", "interfaces/InfoStore.html#get"],
    ["getDimensions", "interfaces/Model.html#getdimensions"],
    ["exportModel", "interfaces/Model.html#exportmodel"],
    ["changeColCost", "interfaces/Model.html#changecolcost"],
    ["dispose", "interfaces/Model.html#dispose"],
    ["mipLogging", "interfaces/HighsConstants.html"],
  ]);
  const pattern = new RegExp(`\\b(${[...apiLinks.keys()].sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
  const walker = document.createTreeWalker(exampleCode, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    const matches = [...node.data.matchAll(pattern)];
    if (!matches.length) continue;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of matches) {
      fragment.append(node.data.slice(offset, match.index));
      const link = document.createElement("a");
      link.className = "api-code-link";
      link.href = new URL(apiLinks.get(match[0]), document.baseURI).href;
      link.textContent = match[0];
      fragment.append(link);
      offset = match.index + match[0].length;
    }
    fragment.append(node.data.slice(offset));
    node.replaceWith(fragment);
  }
}
