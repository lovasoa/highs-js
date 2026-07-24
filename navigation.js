/* ── Example Navigation ── */

const navItems = [...document.querySelectorAll('#tabs a[href^="#"]')];
const navTargets = navItems
  .map((item) => document.querySelector(item.getAttribute("href")))
  .filter(Boolean);
const navItemByTarget = new Map(navItems.map((item) => [item.hash.slice(1), item]));
const nav = document.getElementById("tabs");
let currentSectionId;

function updateProgress(current) {
  if (!current || !nav) return;
  const navBounds = nav.getBoundingClientRect();
  const itemCenter = (item) => {
    const bounds = item.getBoundingClientRect();
    return bounds.top - navBounds.top + nav.scrollTop + bounds.height / 2;
  };
  const currentIndex = navItems.indexOf(current);
  const currentBounds = current.getBoundingClientRect();
  const progress = current.classList.contains("nav-item-child")
    ? currentBounds.top - navBounds.top + nav.scrollTop
    : itemCenter(current);
  navItems.forEach((item, index) => {
    item.dataset.progress = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
  });
  nav.querySelectorAll(".nav-group").forEach((group) => {
    const indexes = [...group.querySelectorAll(".nav-item")].map((item) => navItems.indexOf(item));
    const label = group.querySelector(".nav-group-label");
    if (label) {
      label.dataset.progress = currentIndex > Math.max(...indexes)
        ? "complete"
        : indexes.includes(currentIndex) ? "current" : "upcoming";
    }
  });
  nav.style.setProperty("--nav-start", `${itemCenter(navItems[0])}px`);
  nav.style.setProperty("--nav-end", `${itemCenter(navItems.at(-1))}px`);
  nav.style.setProperty("--nav-progress", `${progress}px`);
}

function setCurrentSection(id) {
  if (id === currentSectionId) {
    updateProgress(navItemByTarget.get(id));
    return;
  }
  currentSectionId = id;
  for (const [targetId, item] of navItemByTarget) {
    if (targetId === id) item.setAttribute("aria-current", "location");
    else item.removeAttribute("aria-current");
  }
  const current = navItemByTarget.get(id);
  updateProgress(current);
  if (current && nav && nav.scrollHeight > nav.clientHeight) {
    const top = current.offsetTop - nav.clientHeight / 2 + current.offsetHeight / 2;
    nav.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }
}

function updateCurrentSection() {
  const activationLine = Math.min(220, window.innerHeight * 0.28);
  const passed = navTargets.filter((target) => target.getBoundingClientRect().top <= activationLine);
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  const current = atBottom ? navTargets.at(-1) : passed.at(-1) || navTargets[0];
  if (current) setCurrentSection(current.id);
}

let scrollFrame;
window.addEventListener("scroll", () => {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(updateCurrentSection);
}, { passive: true });
window.addEventListener("resize", () => {
  updateCurrentSection();
  updateProgress(navItemByTarget.get(currentSectionId));
});
navItems.forEach((item) => item.addEventListener("click", () => setCurrentSection(item.hash.slice(1))));
updateCurrentSection();
