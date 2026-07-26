/* ── Example Navigation ── */

const nav = document.getElementById("tabs");
const navItems = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
const navTargets = navItems
  .map((item) => document.querySelector(item.getAttribute("href")))
  .filter(Boolean);
const navItemByTarget = new Map(navItems.map((item) => [item.hash.slice(1), item]));
const track = nav && document.createElementNS("http://www.w3.org/2000/svg", "svg");
if (track) {
  track.classList.add("nav-track");
  track.setAttribute("aria-hidden", "true");
  nav.prepend(track);
}
let currentSectionId;
let trackLayout;

function addTrackPath(className, pathData) {
  if (!track || !pathData) return;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.classList.add(className);
  path.setAttribute("d", pathData);
  track.append(path);
  return path;
}

function renderTrack() {
  if (!nav || !track) return;
  const navBounds = nav.getBoundingClientRect();
  const relativeBounds = (element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left - navBounds.left + nav.scrollLeft,
      top: bounds.top - navBounds.top + nav.scrollTop,
      right: bounds.right - navBounds.left + nav.scrollLeft,
      bottom: bounds.bottom - navBounds.top + nav.scrollTop,
      width: bounds.width,
      height: bounds.height,
    };
  };
  const roots = [...nav.querySelectorAll(".nav-marker")];
  if (!roots.length) return;

  const firstMarker = relativeBounds(roots[0]);
  const axis = firstMarker.left + firstMarker.width / 2;
  const start = firstMarker.top + firstMarker.height / 2;

  const connector = (item) => {
    const itemBox = relativeBounds(item);
    const copyBox = relativeBounds(item.querySelector(".nav-copy"));
    return {
      y: itemBox.top + itemBox.height / 2,
      end: copyBox.left - 8,
    };
  };

  track.replaceChildren();
  track.setAttribute("width", 0);
  track.setAttribute("height", 0);
  track.style.width = "0";
  track.style.height = "0";
  const trackWidth = nav.scrollWidth;
  const trackHeight = nav.scrollHeight;
  track.removeAttribute("viewBox");
  track.setAttribute("width", trackWidth);
  track.setAttribute("height", trackHeight);
  track.style.width = `${trackWidth}px`;
  track.style.height = `${trackHeight}px`;

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
  gradient.id = "nav-track-active-gradient";
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("r", 16);
  for (const [offset, color] of [["0", "#ef9ba3"], ["0.55", "#df707b"], ["1", "#d45e6a"]]) {
    const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    gradient.append(stop);
  }
  defs.append(gradient);
  track.append(defs);

  let route = `M ${axis} ${start}`;
  let returnPath = "";
  const checkpointPaths = [];
  for (const item of navItems) {
    if (returnPath) {
      route += returnPath;
      returnPath = "";
    }
    const itemBox = relativeBounds(item);
    const itemCenter = itemBox.top + itemBox.height / 2;
    if (item.classList.contains("nav-item-child")) {
      const { end: connectorEnd } = connector(item);
      const turnRadius = Math.min(8, connectorEnd - axis);
      route += [
        ` V ${itemCenter - turnRadius}`,
        ` Q ${axis} ${itemCenter} ${axis + turnRadius} ${itemCenter}`,
        ` H ${connectorEnd}`,
      ].join("");
      returnPath = [
        ` H ${axis + turnRadius}`,
        ` Q ${axis} ${itemCenter} ${axis} ${itemCenter + turnRadius}`,
      ].join("");
    } else {
      route += ` V ${itemCenter}`;
    }
    checkpointPaths.push(route);
  }
  addTrackPath("nav-track-base", route);
  const progressPath = addTrackPath("nav-track-active", route);
  progressPath.style.stroke = "url(#nav-track-active-gradient)";
  const drop = document.createElementNS("http://www.w3.org/2000/svg", "path");
  drop.classList.add("nav-track-drop");
  drop.setAttribute("d", [
    "M -1 -2",
    "C -1 2.5 -1.8 5.2 -2.35 7.2",
    "C -2.55 9.3 -1.35 11 0 11",
    "C 1.35 11 2.55 9.3 2.35 7.2",
    "C 1.8 5.2 1 2.5 1 -2",
    "Z",
  ].join(" "));
  track.append(drop);
  const checkpointLengths = checkpointPaths.map((pathData) => {
    const measuringPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    measuringPath.setAttribute("d", pathData);
    track.append(measuringPath);
    const length = measuringPath.getTotalLength();
    measuringPath.remove();
    return length;
  });
  trackLayout = {
    checkpointLengths,
    drop,
    gradient,
    path: progressPath,
    totalLength: progressPath.getTotalLength(),
  };
}

function updateProgress() {
  if (!trackLayout) return;
  const activationLine = Math.min(220, window.innerHeight * 0.28);
  const scrollPosition = window.scrollY + activationLine;
  const targetPositions = navTargets.map((target) => (
    target.getBoundingClientRect().top + window.scrollY
  ));
  const { checkpointLengths, drop, gradient, path, totalLength } = trackLayout;
  let visibleLength = checkpointLengths[0];

  for (let index = 0; index < targetPositions.length - 1; index += 1) {
    const from = targetPositions[index];
    const to = targetPositions[index + 1];
    if (scrollPosition < from) break;
    if (scrollPosition >= to) {
      visibleLength = checkpointLengths[index + 1];
      continue;
    }
    const ratio = (scrollPosition - from) / (to - from);
    visibleLength = checkpointLengths[index]
      + ratio * (checkpointLengths[index + 1] - checkpointLengths[index]);
    break;
  }
  if (scrollPosition >= targetPositions.at(-1)) visibleLength = totalLength;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    visibleLength = totalLength;
  }
  visibleLength = Math.max(0, visibleLength);
  path.style.strokeDasharray = `${visibleLength} ${totalLength}`;
  path.style.strokeDashoffset = "0";
  const endpoint = path.getPointAtLength(visibleLength);
  const previousPoint = path.getPointAtLength(Math.max(0, visibleLength - 1));
  const tangentX = endpoint.x - previousPoint.x;
  const tangentY = endpoint.y - previousPoint.y;
  const tangentLength = Math.hypot(tangentX, tangentY) || 1;
  const directionX = tangentX / tangentLength;
  const directionY = tangentY / tangentLength;
  const angle = Math.atan2(directionY, directionX) * 180 / Math.PI - 90;
  gradient.setAttribute("cx", endpoint.x);
  gradient.setAttribute("cy", endpoint.y);
  gradient.setAttribute("fx", endpoint.x);
  gradient.setAttribute("fy", endpoint.y);
  drop.setAttribute("transform", `translate(${endpoint.x} ${endpoint.y}) rotate(${angle})`);
}

function setCurrentSection(id) {
  if (id === currentSectionId) return;
  currentSectionId = id;
  for (const [targetId, item] of navItemByTarget) {
    if (targetId === id) item.setAttribute("aria-current", "location");
    else item.removeAttribute("aria-current");
  }
  const current = navItemByTarget.get(id);
  updateProgress();
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
  scrollFrame = requestAnimationFrame(() => {
    updateCurrentSection();
    updateProgress();
  });
}, { passive: true });
window.addEventListener("resize", () => {
  renderTrack();
  updateCurrentSection();
  updateProgress();
});
navItems.forEach((item) => item.addEventListener("click", () => setCurrentSection(item.hash.slice(1))));
renderTrack();
updateCurrentSection();
updateProgress();
