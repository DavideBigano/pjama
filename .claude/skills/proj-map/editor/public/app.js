import { createApi } from "./lib/api.js";
import { createDocument } from "./lib/document.js";
import { escapeHtml } from "./lib/format.js";
import { formatRoute, parseRoute } from "./lib/route.js";
import { refreshIcons } from "./ui/dom.js";
import { createGraphView } from "./ui/graph-view.js";
import { createListView } from "./ui/list-view.js";
import { createSearch } from "./ui/search.js";
import { createTopbar } from "./ui/topbar.js";

/** Shows a blocking error in place of the editor (e.g. the file isn't valid JSON). */
function showFatalError(message) {
	document.getElementById("fatal").hidden = false;
	document.getElementById("fatal").innerHTML = `<h2>Can't open the map</h2><pre>${escapeHtml(message)}</pre><p>Fix the file and reload this page.</p>`;
	for (const id of ["viewList", "viewGraph"]) document.getElementById(id).hidden = true;
}

/** Loads the map, wires the top bar and both tabs, and follows the location hash. */
async function start() {
	const api = createApi();
	let loaded;
	try { loaded = await api.load(); } catch (error) { return showFatalError(error.message); }
	const doc = createDocument(loaded);
	const pathEl = document.getElementById("mapPath");
	pathEl.textContent = loaded.shownPath;
	pathEl.title = loaded.path;

	const openItem = id => { location.hash = formatRoute({ view: "list", id }); };
	// any id pill outside pickers and menus opens that item's page
	document.addEventListener("click", event => {
		const pillEl = event.target.closest("[data-pill]");
		if (!pillEl || event.target.closest(".x, .pop, .tb-menu, .overlay, [contenteditable]") || !doc.index[pillEl.dataset.pill]) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		openItem(pillEl.dataset.pill);
	}, true);

	const views = {};
	const topbar = createTopbar({
		doc,
		api,
		onOpenSpec: (ownerId, specId) => { location.hash = formatRoute({ view: "list", id: ownerId, card: specId }); },
		onReloaded: () => Object.values(views).forEach(view => view.reset()),
	});
	views.list = createListView({ doc, onChange: topbar.refresh });
	views.graph = createGraphView({ doc, onChange: topbar.refresh, saveLayout: layout => api.saveLayout(layout).catch(() => {}) });

	const showRoute = () => {
		const route = parseRoute(location.hash);
		document.getElementById("viewList").hidden = route.view !== "list";
		document.getElementById("viewGraph").hidden = route.view !== "graph";
		document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("on", tab.dataset.view === route.view));
		views[route.view].show(route);
		topbar.refresh();
	};
	createSearch({ doc, onOpen: openItem });
	addEventListener("hashchange", showRoute);
	showRoute();
	refreshIcons();
}

start();
