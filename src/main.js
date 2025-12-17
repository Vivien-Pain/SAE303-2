import "./global.css";
import { Router } from "./lib/router.js";
import {exportLocalStorageToJSON} from "./data/ExportJson.js";
import { RootLayout } from "./layouts/root/layout.js";
import { The404Page } from "./pages/404/page.js";
import { TreeSkill } from "./pages/Treeskill/page.js";

const router = new Router("app");

router.addLayout("/", RootLayout);
router.addRoute("/json", exportLocalStorageToJSON);
router.addRoute("/", TreeSkill);
router.addRoute("*", The404Page);

router.start();
